// MinecraftScene — Terraria-style 2D sandbox
// WASD/Arrow = mover | Space/W = pular | Z = minerar (segurar) | F = colocar
// 1-9 = selecionar slot | R = crafting | ESC = sair

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';

// ── Blocos ──────────────────────────────────────────────────────
const B = 32; // pixels per block

const BLOCKS = {
  0:  null,
  1:  { name:'Grama',    color:0x4a9a1a, top:0x5cb820, hardness:0.5 },
  2:  { name:'Terra',    color:0x7a5230, hardness:0.5 },
  3:  { name:'Pedra',    color:0x888888, hardness:1.2 },
  4:  { name:'Areia',    color:0xe8d060, hardness:0.3 },
  5:  { name:'Madeira',  color:0x8b5e2c, hardness:0.8 },
  6:  { name:'Folhas',   color:0x226622, hardness:0.2 },
  7:  { name:'Carvão',   color:0x333333, hardness:1.5 },
  8:  { name:'Ferro',    color:0xcc9966, hardness:2.0 },
  9:  { name:'Ouro',     color:0xffd700, hardness:2.5 },
  10: { name:'Diamante', color:0x44ffff, hardness:4.0 },
  11: { name:'Tronco',   color:0x5c3d1a, hardness:0.8 },
  12: { name:'Planks',   color:0xc8a050, hardness:0.7 },
  13: { name:'Vidro',    color:0x88ccff, hardness:0.4 },
  14: { name:'Tocha',    color:0xff8800, hardness:0.1, light:true },
};

// Receitas de crafting
const RECIPES = [
  { in:{ '5':4  }, out:{ id:12, qty:4 }, name:'Planks (4x Madeira)' },
  { in:{ '3':4  }, out:{ id:14, qty:4 }, name:'Tocha (4x Pedra)' },
  { in:{ '11':4 }, out:{ id:12, qty:4 }, name:'Planks (4x Tronco)' },
];

const WW = 120, WH = 72;  // world in blocks
const SKY_H = 16;          // air rows above ground

// ── World generation ──────────────────────────────────────────────
function generateWorld() {
  const w = new Uint8Array(WW * WH);
  const set = (x, y, v) => { if (x >= 0 && x < WW && y >= 0 && y < WH) w[y*WW+x] = v; };
  const get = (x, y)    => (x<0||x>=WW||y<0||y>=WH) ? 0 : w[y*WW+x];

  // Height map
  const hmap = [];
  let h = SKY_H + 3;
  for (let x = 0; x < WW; x++) {
    h += (Math.random() - 0.5) * 2.2;
    h = Math.max(SKY_H + 1, Math.min(SKY_H + 12, h));
    hmap[x] = Math.floor(h);
  }

  // Fill terrain
  for (let x = 0; x < WW; x++) {
    const surf = hmap[x];
    for (let y = 0; y < WH; y++) {
      if (y < surf) continue;
      const depth = y - surf;
      if (depth === 0) { w[y*WW+x] = 1; continue; }
      if (depth <= 3)  { w[y*WW+x] = 2; continue; }
      const r = Math.random();
      if (depth > 30 && r < 0.016) w[y*WW+x] = 10; // diamond
      else if (depth > 16 && r < 0.028) w[y*WW+x] = 9;  // gold
      else if (depth > 7  && r < 0.042) w[y*WW+x] = 8;  // iron
      else if (depth > 3  && r < 0.052) w[y*WW+x] = 7;  // coal
      else w[y*WW+x] = y < WH - 3 ? 3 : 3;
    }
  }

  // Sand patches
  for (let x = 8; x < WW - 8; x += 12 + Math.floor(Math.random()*14)) {
    const surf = hmap[x];
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = 0; dy <= 3; dy++)
        if (get(x+dx,surf+dy)) set(x+dx, surf+dy, 4);
  }

  // Trees
  for (let x = 3; x < WW - 3; x++) {
    if (get(x, hmap[x]) === 1 && Math.random() < 0.08) {
      const th = 3 + Math.floor(Math.random() * 3);
      const surf = hmap[x];
      for (let dy = 1; dy <= th; dy++) set(x, surf - dy, 11);
      for (let dy = th-1; dy <= th+1; dy++)
        for (let dx = -2; dx <= 2; dx++)
          if (Math.abs(dx)+Math.abs(dy-th) <= 2) set(x+dx, surf-dy, 6);
    }
  }

  return w;
}

// ── Scene ─────────────────────────────────────────────────────────
export class MinecraftScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics   = new Physics2D();
    this._world    = null;
    this._meshes   = {};       // `wx_wy` → mesh
    this._statics  = [];       // Body[] for terrain
    this._player   = null;
    this._inv      = Array(9).fill(null).map(() => ({ id:0, qty:0 }));
    this._hotbar   = 0;
    this._mine     = null;     // { wx, wy, progress, max }
    this._placeCd  = 0;
    this._t        = 0;
    this._hintShown= false;
    this._hudEl    = null;
    this._msgEl    = null;
    this._craftEl  = null;
    this._showCraft= false;
  }

  create() {
    const E = this.e;

    // Hide game HUD
    ['hud-health','hud-coins','hud-level','hud-msg','ability-panel','hud-xp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    this._world = generateWorld();
    this.physics.setGravity(650);
    this.physics.setWorldBounds(0, WW * B, 9999);
    E.setWorldBounds(0, WW * B);

    // Sky background
    E.plane(WW * B + 400, SKY_H * B * 2, 0x5599ee, (WW*B)/2, (SKY_H*B)/2, -300);

    // Spawn player
    const spawnX = Math.floor(WW / 2);
    let spawnY = 0;
    for (let y = 0; y < WH; y++) {
      if (this._world[y * WW + spawnX] !== 0) { spawnY = y - 1; break; }
    }
    const px = spawnX * B + B/2, py = spawnY * B;

    const pbody = new Body(px - 10, py - 36, 20, 36);
    this.physics.addBody(pbody);
    const pmesh = E.box(20, 36, 18, 0x4488ff, px, py - 18, 10);
    pmesh.material.emissive = new THREE.Color(0x112244);
    pmesh.material.emissiveIntensity = 0.5;
    this._player = { body: pbody, mesh: pmesh };

    // Render terrain + build physics in one pass
    this._buildWorld();

    this._buildHUD();
    E.resetCamera();
    E._camX = px; E._camY = py;
  }

  // ── World ──────────────────────────────────────────────────────
  _buildWorld() {
    for (let y = 0; y < WH; y++) {
      for (let x = 0; x < WW; x++) {
        const id = this._world[y*WW+x];
        if (id === 0) continue;
        this._spawnBlockMesh(x, y, id);
        const b = new Body(x*B, y*B, B, B);
        b._wx = x; b._wy = y;
        this.physics.addStatic(b);
        this._statics.push(b);
      }
    }
  }

  _spawnBlockMesh(wx, wy, id) {
    const def = BLOCKS[id];
    if (!def) return;
    const gx = wx*B + B/2, gy = wy*B + B/2;
    const m = this.e.box(B - 1, B - 1, B*0.55, def.color, gx, gy, 0);
    if (id === 1 && this._world[(wy-1)*WW+wx] === 0) {
      m.material.emissive = new THREE.Color(def.top || def.color);
      m.material.emissiveIntensity = 0.35;
    }
    if (def.light) {
      m.material.emissive = new THREE.Color(0xff8800);
      m.material.emissiveIntensity = 1.2;
    }
    this._meshes[`${wx}_${wy}`] = m;
  }

  _removeBlockMesh(wx, wy) {
    const key = `${wx}_${wy}`;
    if (this._meshes[key]) { this.e.remove(this._meshes[key]); delete this._meshes[key]; }
  }

  _removeStaticAt(wx, wy) {
    for (let i = this._statics.length - 1; i >= 0; i--) {
      if (this._statics[i]._wx === wx && this._statics[i]._wy === wy) {
        this.physics.remove(this._statics[i]); // removes from physics._statics
        this._statics.splice(i, 1);
        break;
      }
    }
  }

  _addStaticAt(wx, wy) {
    const id = this._world[wy*WW+wx];
    if (!id) return;
    const b = new Body(wx*B, wy*B, B, B);
    b._wx = wx; b._wy = wy;
    this.physics.addStatic(b);
    this._statics.push(b);
  }

  // ── Inventory ──────────────────────────────────────────────────
  _addItem(id, qty = 1) {
    for (let i = 0; i < 9; i++) {
      if (this._inv[i].id === id && this._inv[i].qty > 0) { this._inv[i].qty += qty; this._updateHUD(); return; }
    }
    for (let i = 0; i < 9; i++) {
      if (this._inv[i].qty === 0) { this._inv[i] = { id, qty }; this._updateHUD(); return; }
    }
    this._msg('Inventário cheio!');
  }

  _removeItem(id, qty = 1) {
    for (let i = 0; i < 9; i++) {
      if (this._inv[i].id === id) {
        this._inv[i].qty -= qty;
        if (this._inv[i].qty <= 0) this._inv[i] = { id:0, qty:0 };
        this._updateHUD(); return true;
      }
    }
    return false;
  }

  _countItem(id) {
    return this._inv.reduce((s, sl) => s + (sl.id === id ? sl.qty : 0), 0);
  }

  _craft(recipe) {
    for (const [id, qty] of Object.entries(recipe.in)) {
      if (this._countItem(parseInt(id)) < qty) { this._msg(`Faltam materiais: ${recipe.name}`); return; }
    }
    for (const [id, qty] of Object.entries(recipe.in)) {
      let rem = qty;
      for (let i = 0; i < 9 && rem > 0; i++) {
        if (this._inv[i].id === parseInt(id)) {
          const take = Math.min(rem, this._inv[i].qty);
          this._inv[i].qty -= take; rem -= take;
          if (this._inv[i].qty === 0) this._inv[i] = { id:0, qty:0 };
        }
      }
    }
    this._addItem(recipe.out.id, recipe.out.qty);
    this._msg(`Criado: ${recipe.name} ×${recipe.out.qty}`);
  }

  // ── HUD ────────────────────────────────────────────────────────
  _buildHUD() {
    this._hudEl = document.createElement('div');
    this._hudEl.style.cssText = `position:fixed;bottom:8px;left:50%;transform:translateX(-50%);
      display:flex;gap:3px;z-index:500;pointer-events:none;font-family:monospace;`;
    document.body.appendChild(this._hudEl);

    this._msgEl = document.createElement('div');
    this._msgEl.style.cssText = `position:fixed;top:10px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.72);color:#eee;font-family:monospace;font-size:12px;
      padding:5px 14px;border-radius:6px;z-index:501;display:none;pointer-events:none;`;
    document.body.appendChild(this._msgEl);

    this._craftEl = document.createElement('div');
    this._craftEl.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:#0a0f1a;border:2px solid #446688;border-radius:10px;padding:20px 28px;
      z-index:600;display:none;font-family:monospace;color:#ddd;min-width:300px;pointer-events:all;`;
    this._craftEl.innerHTML = `<div style="font-size:16px;font-weight:bold;color:#88ccff;margin-bottom:12px">⚒ CRAFTING</div>` +
      RECIPES.map((r, i) => {
        const ing = Object.entries(r.in).map(([id, q]) => `${BLOCKS[+id]?.name||'?'} ×${q}`).join(' + ');
        return `<div onclick="window._mc_craft(${i})" style="padding:7px 0;border-bottom:1px solid #223344;cursor:pointer;font-size:12px">
          <b>[${i+1}]</b> ${r.name}</div>`;
      }).join('') +
      `<div style="margin-top:10px;font-size:11px;color:#556677">R ou ESC para fechar</div>`;
    document.body.appendChild(this._craftEl);
    window._mc_craft = (i) => { if (RECIPES[i]) this._craft(RECIPES[i]); };

    this._updateHUD();
    this._msg('WASD=mover  Z=minerar  F=colocar  R=crafting  1-9=slot  ESC=sair');
  }

  _updateHUD() {
    if (!this._hudEl) return;
    this._hudEl.innerHTML = this._inv.map((s, i) => {
      const sel = i === this._hotbar;
      const def = BLOCKS[s.id];
      const col = def ? '#' + def.color.toString(16).padStart(6,'0') : 'transparent';
      return `<div style="width:42px;height:42px;background:${sel?'rgba(60,130,255,0.35)':'rgba(0,0,0,0.55)'};
        border:${sel?'2px solid #4488ff':'2px solid #334455'};border-radius:5px;
        display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
        <div style="width:20px;height:20px;background:${s.qty?col:'transparent'};border-radius:3px;
          ${def?.light?'box-shadow:0 0 5px #ff8800;':''}"></div>
        ${s.qty>0?`<span style="font-size:9px;color:#ccc;position:absolute;bottom:2px;right:4px">${s.qty}</span>`:''}
      </div>`;
    }).join('');
  }

  _msg(text, dur = 3000) {
    if (!this._msgEl) return;
    this._msgEl.textContent = text;
    this._msgEl.style.display = 'block';
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => { if (this._msgEl) this._msgEl.style.display = 'none'; }, dur);
  }

  // ── Update ─────────────────────────────────────────────────────
  update(dt) {
    this._t += dt;
    this._placeCd = Math.max(0, this._placeCd - dt);
    this.physics.step(dt);

    const p = this._player, b = p.body, inp = this.inp;

    // Crafting menu
    if (inp.justDown('KeyR')) {
      this._showCraft = !this._showCraft;
      if (this._craftEl) this._craftEl.style.display = this._showCraft ? 'block' : 'none';
    }
    if (this._showCraft) {
      for (let i = 0; i < RECIPES.length; i++) {
        if (inp.justDown(`Digit${i+1}`)) this._craft(RECIPES[i]);
      }
      if (inp.justDown('Escape')) { this._showCraft = false; if (this._craftEl) this._craftEl.style.display = 'none'; }
      return;
    }

    // Hotbar
    for (let i = 1; i <= 9; i++) {
      if (inp.justDown(`Digit${i}`)) { this._hotbar = i - 1; this._updateHUD(); }
    }

    // Movement
    let vx = 0;
    if (inp.isDown('KeyA') || inp.isDown('ArrowLeft'))  vx = -200;
    if (inp.isDown('KeyD') || inp.isDown('ArrowRight')) vx =  200;
    b.vx = vx;
    if ((inp.justDown('KeyW') || inp.justDown('ArrowUp') || inp.justDown('Space')) && b.onGround) {
      b.vy = -380;
    }
    // Fast-fall
    if (inp.isDown('KeyS') || inp.isDown('ArrowDown')) {
      if (!b.onGround) b.vy += 200 * dt;
    }

    // Kill plane
    if (b.y > WH * B + 100) { b.x = Math.floor(WW/2)*B; b.y = SKY_H*B - 40; b.vx = 0; b.vy = 0; }

    // Player mesh sync
    const cx = b.x + 10, cy = b.y + 18;
    p.mesh.position.set(cx, -cy, 10);
    if (vx < 0) p.mesh.scale.x = -1;
    else if (vx > 0) p.mesh.scale.x = 1;

    // Camera
    this.e.followTarget(cx, cy, 0.14);

    // Mining — hold Z to mine block in front or direction
    const mineDown = inp.isDown('KeyZ');
    if (mineDown) {
      const dir = vx !== 0 ? Math.sign(vx) : 1;
      const tx = Math.floor((cx + dir * B * 1.4) / B);
      const ty = Math.floor(cy / B);
      // Try front first, then above, then below
      const candidates = [[tx,ty],[tx,ty-1],[tx,ty+1]];
      let found = false;
      for (const [wx,wy] of candidates) {
        const id = (wx>=0&&wx<WW&&wy>=0&&wy<WH) ? this._world[wy*WW+wx] : 0;
        if (id !== 0) {
          if (!this._mine || this._mine.wx !== wx || this._mine.wy !== wy) {
            this._mine = { wx, wy, progress:0, max: BLOCKS[id].hardness * 55 };
          }
          this._mine.progress += dt * 60;
          // Visual: fade the block
          const m = this._meshes[`${wx}_${wy}`];
          if (m) m.material.opacity = 1 - (this._mine.progress / this._mine.max) * 0.7;
          if (m) m.material.transparent = true;

          if (this._mine.progress >= this._mine.max) {
            if (m) { m.material.opacity = 1; m.material.transparent = false; }
            this._world[wy*WW+wx] = 0;
            this._removeBlockMesh(wx, wy);
            this._removeStaticAt(wx, wy);
            this._addItem(id, 1);
            this._msg(`+1 ${BLOCKS[id]?.name || '?'}`);
            this._mine = null;
          }
          found = true;
          break;
        }
      }
      if (!found) this._mine = null;
    } else {
      // Reset mining visual if stopped
      if (this._mine) {
        const m = this._meshes[`${this._mine.wx}_${this._mine.wy}`];
        if (m) { m.material.opacity = 1; m.material.transparent = false; }
        this._mine = null;
      }
    }

    // Place block — F or E
    if (inp.justDown('KeyF') || inp.justDown('KeyE')) {
      if (this._placeCd <= 0) {
        const dir = vx !== 0 ? Math.sign(vx) : 1;
        // Try adjacent positions
        const cx2 = cx + dir * B * 1.5;
        const cy2 = cy;
        const wx = Math.floor(cx2 / B);
        const wy = Math.floor(cy2 / B);
        if (wx >= 0 && wx < WW && wy >= 0 && wy < WH && this._world[wy*WW+wx] === 0) {
          const slot = this._inv[this._hotbar];
          if (slot.qty > 0 && slot.id > 0) {
            this._world[wy*WW+wx] = slot.id;
            this._spawnBlockMesh(wx, wy, slot.id);
            this._addStaticAt(wx, wy);
            this._removeItem(slot.id, 1);
            this._placeCd = 0.22;
          }
        }
      }
    }

    if (inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy() {
    this._hudEl?.remove();
    this._msgEl?.remove();
    this._craftEl?.remove();
    window._mc_craft = null;
    clearTimeout(this._msgTimer);
    // Restore HUD
    ['hud-health','hud-coins','hud-level','hud-msg','ability-panel','hud-xp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    this.physics.clear();
  }
}
