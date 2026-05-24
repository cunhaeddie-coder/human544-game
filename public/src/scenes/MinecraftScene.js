// MinecraftScene — Terraria-style 2D sandbox
// Clique esq = minerar | F/E = colocar | 1-9 = slot | R = crafting | Z = mine (mobile) | ESC = sair

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { getNetwork } from '../Network.js';
import { GW, GH } from '../engine/ThreeEngine.js';

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

const RECIPES = [
  { in:{ '5':4  }, out:{ id:12, qty:4 }, name:'Planks (4x Madeira)' },
  { in:{ '3':4  }, out:{ id:14, qty:4 }, name:'Tocha (4x Pedra)' },
  { in:{ '11':4 }, out:{ id:12, qty:4 }, name:'Planks (4x Tronco)' },
];

const WW = 120, WH = 72;
const SKY_H = 16;

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seedFromCode(code) {
  if (!code) return (Date.now() ^ 0xdeadbeef) >>> 0;
  let h = 5381;
  for (let i = 0; i < code.length; i++) h = (Math.imul(h, 33) + code.charCodeAt(i)) | 0;
  return h >>> 0;
}

// ── World generation ──────────────────────────────────────────────
function generateWorld(rnd = Math.random) {
  const w = new Uint8Array(WW * WH);
  const set = (x, y, v) => { if (x >= 0 && x < WW && y >= 0 && y < WH) w[y*WW+x] = v; };
  const get = (x, y)    => (x<0||x>=WW||y<0||y>=WH) ? 0 : w[y*WW+x];

  const hmap = [];
  let h = SKY_H + 3;
  for (let x = 0; x < WW; x++) {
    h += (rnd() - 0.5) * 2.2;
    h = Math.max(SKY_H + 1, Math.min(SKY_H + 12, h));
    hmap[x] = Math.floor(h);
  }

  for (let x = 0; x < WW; x++) {
    const surf = hmap[x];
    for (let y = 0; y < WH; y++) {
      if (y < surf) continue;
      const depth = y - surf;
      if (depth === 0) { w[y*WW+x] = 1; continue; }
      if (depth <= 3)  { w[y*WW+x] = 2; continue; }
      const r = rnd();
      if      (depth > 30 && r < 0.016) w[y*WW+x] = 10;
      else if (depth > 16 && r < 0.028) w[y*WW+x] = 9;
      else if (depth > 7  && r < 0.042) w[y*WW+x] = 8;
      else if (depth > 3  && r < 0.052) w[y*WW+x] = 7;
      else w[y*WW+x] = 3;
    }
  }

  for (let x = 8; x < WW - 8; x += 12 + Math.floor(rnd()*14)) {
    const surf = hmap[x];
    for (let dx = -2; dx <= 2; dx++)
      for (let dy = 0; dy <= 3; dy++)
        if (get(x+dx, surf+dy)) set(x+dx, surf+dy, 4);
  }

  for (let x = 3; x < WW - 3; x++) {
    if (get(x, hmap[x]) === 1 && rnd() < 0.08) {
      const th = 3 + Math.floor(rnd() * 3);
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
    this.physics    = new Physics2D();
    this._world     = null;
    this._meshes    = {};
    this._statics   = [];
    this._player    = null;
    this._charSprite= null;
    this._inv       = Array(9).fill(null).map(() => ({ id:0, qty:0 }));
    this._hotbar    = 0;
    this._mine      = null;
    this._placeCd   = 0;
    this._t         = 0;
    this._dir       = 1;
    this._walkT     = 0;
    this._hudEl     = null;
    this._msgEl     = null;
    this._craftEl   = null;
    this._showCraft = false;
    this._msgTimer  = null;
    // Mouse mining
    this._mouseDown   = false;
    this._mouseTarget = null;
    this._mh          = {};   // mouse handler refs for cleanup
    // Online
    this._net        = null;
    this._remPlayers = {};
    this._netCbs     = {};
  }

  // ── Create ─────────────────────────────────────────────────────
  async create(data = {}) {
    const E = this.e;

    ['hud-health','hud-coins','hud-level','hud-msg','ability-panel','hud-xp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const seed = seedFromCode(data.code);
    this._world = generateWorld(mulberry32(seed));

    this.physics.setGravity(650);
    this.physics.setWorldBounds(0, WW * B, 9999);
    E.setWorldBounds(0, WW * B);

    E.plane(WW * B + 400, SKY_H * B * 2, 0x5599ee, (WW*B)/2, (SKY_H*B)/2, -300);

    const spawnX = Math.floor(WW / 2);
    let spawnY = 0;
    for (let y = 0; y < WH; y++) {
      if (this._world[y * WW + spawnX] !== 0) { spawnY = y - 1; break; }
    }
    const spx = spawnX * B + B/2, spy = spawnY * B;

    const pbody = new Body(spx - 10, spy - 36, 20, 36);
    this.physics.addBody(pbody);

    const skinName = data.skin || 'default';
    this._charSprite = new CharacterSprite(E.scene, spx, spy - 18, skinName, data.name || '');
    this._player = { body: pbody };

    this._buildWorld();
    this._buildHUD();
    this._setupMouse();

    // Camera snap to spawn
    this.e._camX = Math.max(GW/2, Math.min(spx, WW*B - GW/2));
    this.e._camY = Math.max(GH/2, Math.min(spy - 18, WH*B - GH/2));
    this.e._updateCamera();

    if (data.mode === 'online') this._initOnline(data);
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
        this.physics.remove(this._statics[i]);
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

  // ── Mouse mining ───────────────────────────────────────────────
  _setupMouse() {
    const canvas = this.e.renderer.domElement;
    const onDown = (ev) => {
      if (ev.button === 0) { this._mouseDown = true; this._updateMouseTarget(ev); }
    };
    const onUp = (ev) => {
      if (ev.button === 0) this._mouseDown = false;
    };
    const onMove = (ev) => {
      if (this._mouseDown) this._updateMouseTarget(ev);
    };
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this._mh = { onDown, onUp, onMove };
  }

  _updateMouseTarget(ev) {
    const rect = this.e.renderer.domElement.getBoundingClientRect();
    const localX = (ev.clientX - rect.left) * (GW / rect.width);
    const localY = (ev.clientY - rect.top)  * (GH / rect.height);
    const worldX = localX + (this.e._camX - GW / 2);
    const worldY = localY + (this.e._camY - GH / 2);
    const wx = Math.floor(worldX / B), wy = Math.floor(worldY / B);
    this._mouseTarget = (wx >= 0 && wx < WW && wy >= 0 && wy < WH) ? { wx, wy } : null;
  }

  // ── Online ─────────────────────────────────────────────────────
  async _initOnline(data) {
    const net = await getNetwork();
    if (!net) { this._msg('Servidor offline — solo'); return; }
    this._net = net;
    const sock = net.socket;

    const onBlock = ({ wx, wy, id }) => this._applyRemoteBlock(wx, wy, id);
    const onMoved = ({ id, x, y, flip, anim }) => {
      if (id === sock.id) return;
      if (!this._remPlayers[id]) this._spawnRemote(id, x, y);
      else this._moveRemote(id, x, y, flip, anim);
    };
    const onJoined = ({ id, x, y, name }) => {
      if (id !== sock.id) this._spawnRemote(id, x, y, name);
    };
    const onLeft = (id) => this._removeRemote(id);

    sock.on('mcBlockChange', onBlock);
    sock.on('playerMoved',   onMoved);
    sock.on('playerJoined',  onJoined);
    sock.on('playerLeft',    onLeft);
    this._netCbs = { onBlock, onMoved, onJoined, onLeft };

    // Spawn existing players already in the room
    Object.entries(net._players).forEach(([id, p]) => {
      if (id !== sock.id) this._spawnRemote(id, p.x || 100, p.y || 300, p.name || '');
    });

    this._msg('Conectado — Minecraft Online');
  }

  _applyRemoteBlock(wx, wy, id) {
    if (wx < 0 || wx >= WW || wy < 0 || wy >= WH) return;
    const old = this._world[wy * WW + wx];
    this._world[wy * WW + wx] = id;
    if (old !== 0) { this._removeBlockMesh(wx, wy); this._removeStaticAt(wx, wy); }
    if (id  !== 0) { this._spawnBlockMesh(wx, wy, id); this._addStaticAt(wx, wy); }
  }

  _spawnRemote(id, x, y, name = '') {
    const sprite = new CharacterSprite(this.e.scene, x, y, 'rogue', name);
    this._remPlayers[id] = { sprite, x, y };
  }

  _moveRemote(id, x, y, flip, anim = 'idle') {
    const rp = this._remPlayers[id];
    if (!rp) return;
    rp.x = x; rp.y = y;
    rp.sprite.animate(x, y, flip ? -1 : 1, 0, 0, anim || 'idle', 'default');
  }

  _removeRemote(id) {
    const rp = this._remPlayers[id];
    if (!rp) return;
    rp.sprite.destroy();
    delete this._remPlayers[id];
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
      RECIPES.map((r, i) =>
        `<div onclick="window._mc_craft(${i})" style="padding:7px 0;border-bottom:1px solid #223344;cursor:pointer;font-size:12px">
          <b>[${i+1}]</b> ${r.name}</div>`
      ).join('') +
      `<div style="margin-top:10px;font-size:11px;color:#556677">R ou ESC para fechar</div>`;
    document.body.appendChild(this._craftEl);
    window._mc_craft = (i) => { if (RECIPES[i]) this._craft(RECIPES[i]); };

    this._updateHUD();
    this._msg('Clique esq=minerar  F=colocar  R=crafting  1-9=slot  Z=mine(mobile)  ESC=sair');
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
    if ((inp.isDown('KeyS') || inp.isDown('ArrowDown')) && !b.onGround) b.vy += 200 * dt;

    if (vx < 0) this._dir = -1;
    else if (vx > 0) this._dir = 1;

    // Walk animation alternation
    this._walkT += dt;
    let animState = 'idle';
    if (!b.onGround) {
      animState = b.vy < 0 ? 'jump' : 'fall';
    } else if (vx !== 0) {
      animState = this._walkT < 0.2 ? 'walk1' : 'walk2';
      if (this._walkT >= 0.4) this._walkT = 0;
    }

    // Kill plane
    if (b.y > WH * B + 100) { b.x = Math.floor(WW/2)*B; b.y = SKY_H*B - 40; b.vx = 0; b.vy = 0; }

    // Player sprite
    const cx = b.x + 10, cy = b.y + 18;
    this._charSprite.animate(cx, cy, this._dir, 0, 0, animState, 'default');

    // Camera — free vertical follow clamped to world bounds
    const tcx = Math.max(GW/2, Math.min(cx, WW*B - GW/2));
    const tcy = Math.max(GH/2, Math.min(cy, WH*B - GH/2));
    this.e._camX += (tcx - this.e._camX) * 0.14;
    this.e._camY += (tcy - this.e._camY) * 0.14;
    this.e._updateCamera();

    // ── Mining ──────────────────────────────────────────────────
    let mineTarget = null;

    if (this._mouseDown && this._mouseTarget) {
      const { wx, wy } = this._mouseTarget;
      // Limit range to 7 blocks (Manhattan distance)
      const pdx = Math.abs(wx - Math.floor(cx / B));
      const pdy = Math.abs(wy - Math.floor(cy / B));
      if (pdx + pdy <= 7) mineTarget = { wx, wy };
    } else if (inp.isDown('KeyZ')) {
      const tx = Math.floor((cx + this._dir * B * 1.4) / B);
      const ty = Math.floor(cy / B);
      for (const [wx, wy] of [[tx,ty],[tx,ty-1],[tx,ty+1]]) {
        if (wx >= 0 && wx < WW && wy >= 0 && wy < WH && this._world[wy*WW+wx] !== 0) {
          mineTarget = { wx, wy }; break;
        }
      }
    }

    if (mineTarget) {
      const { wx, wy } = mineTarget;
      const id = this._world[wy*WW+wx];
      if (id !== 0) {
        if (!this._mine || this._mine.wx !== wx || this._mine.wy !== wy) {
          this._mine = { wx, wy, progress:0, max: BLOCKS[id].hardness * 55 };
        }
        this._mine.progress += dt * 60;
        const m = this._meshes[`${wx}_${wy}`];
        if (m) { m.material.opacity = 1 - (this._mine.progress / this._mine.max) * 0.7; m.material.transparent = true; }

        if (this._mine.progress >= this._mine.max) {
          if (m) { m.material.opacity = 1; m.material.transparent = false; }
          this._world[wy*WW+wx] = 0;
          this._removeBlockMesh(wx, wy);
          this._removeStaticAt(wx, wy);
          this._addItem(id, 1);
          this._msg(`+1 ${BLOCKS[id]?.name || '?'}`);
          if (this._net) this._net.socket.emit('mcBlockChange', { wx, wy, id: 0 });
          this._mine = null;
        }
      } else {
        this._mine = null;
      }
    } else {
      if (this._mine) {
        const m = this._meshes[`${this._mine.wx}_${this._mine.wy}`];
        if (m) { m.material.opacity = 1; m.material.transparent = false; }
        this._mine = null;
      }
    }

    // ── Place block — F, E, or right-click ──────────────────────
    if ((inp.justDown('KeyF') || inp.justDown('KeyE')) && this._placeCd <= 0) {
      let placeWx, placeWy;
      if (this._mouseTarget) {
        placeWx = this._mouseTarget.wx;
        placeWy = this._mouseTarget.wy;
      } else {
        placeWx = Math.floor((cx + this._dir * B * 1.5) / B);
        placeWy = Math.floor(cy / B);
      }
      if (placeWx >= 0 && placeWx < WW && placeWy >= 0 && placeWy < WH && this._world[placeWy*WW+placeWx] === 0) {
        const slot = this._inv[this._hotbar];
        if (slot.qty > 0 && slot.id > 0) {
          this._world[placeWy*WW+placeWx] = slot.id;
          this._spawnBlockMesh(placeWx, placeWy, slot.id);
          this._addStaticAt(placeWx, placeWy);
          this._removeItem(slot.id, 1);
          this._placeCd = 0.22;
          if (this._net) this._net.socket.emit('mcBlockChange', { wx: placeWx, wy: placeWy, id: slot.id });
        }
      }
    }

    // Online position sync (throttled inside sendMove)
    if (this._net) {
      this._net.sendMove({ x: cx, y: cy, flip: this._dir < 0, anim: animState });
    }

    if (inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  // ── Destroy ────────────────────────────────────────────────────
  destroy() {
    // Mouse handlers
    const canvas = this.e.renderer.domElement;
    if (this._mh.onDown)  canvas.removeEventListener('mousedown', this._mh.onDown);
    if (this._mh.onMove)  canvas.removeEventListener('mousemove', this._mh.onMove);
    if (this._mh.onUp)    window.removeEventListener('mouseup',   this._mh.onUp);

    // Player sprite
    this._charSprite?.destroy();

    // Remote players
    Object.values(this._remPlayers).forEach(rp => rp.sprite.destroy());
    this._remPlayers = {};

    // Network listeners
    if (this._net) {
      const sock = this._net.socket;
      const { onBlock, onMoved, onJoined, onLeft } = this._netCbs;
      if (onBlock)  sock.off('mcBlockChange', onBlock);
      if (onMoved)  sock.off('playerMoved',   onMoved);
      if (onJoined) sock.off('playerJoined',  onJoined);
      if (onLeft)   sock.off('playerLeft',    onLeft);
    }

    // DOM
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
