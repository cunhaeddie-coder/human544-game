// MinecraftScene — Terraria-style 2D sandbox
// Clique esq = minerar | F/E = colocar | 1-9 = slot | R = crafting | Z = mine (mobile) | ESC = sair

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { getNetwork } from '../Network.js';
import { GW, GH } from '../engine/ThreeEngine.js';
import { TouchControls } from '../engine/TouchControls.js';

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
  15: { name:'Lã',      color:0xeeeeee, hardness:0.1 },
  16: { name:'Cama',    color:0xff5566, hardness:0.3 },
  17: { name:'Osso',    color:0xddddcc, hardness:0.1 },
};

const RECIPES = [
  { in:{ '5':4  },        out:{ id:12, qty:4 }, name:'Planks (4x Madeira)' },
  { in:{ '3':4  },        out:{ id:14, qty:4 }, name:'Tocha (4x Pedra)' },
  { in:{ '11':4 },        out:{ id:12, qty:4 }, name:'Planks (4x Tronco)' },
  { in:{ '15':3, '12':3}, out:{ id:16, qty:1 }, name:'Cama (3x Lã + 3x Planks)' },
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

  // Height map
  const hmap = [];
  let h = SKY_H + 3;
  for (let x = 0; x < WW; x++) {
    h += (rnd() - 0.5) * 2.2;
    h = Math.max(SKY_H + 1, Math.min(SKY_H + 12, h));
    hmap[x] = Math.floor(h);
  }

  // Layer fill — coal now only below depth 8 (was 3)
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
      else if (depth > 8  && r < 0.048) w[y*WW+x] = 7; // coal: depth>8, was depth>3
      else w[y*WW+x] = 3;
    }
  }

  // Sand biomes — continuous horizontal strips instead of isolated patches
  let sandLeft = 0;
  for (let x = 4; x < WW - 4; x++) {
    if (sandLeft <= 0) {
      if (rnd() < 0.065) sandLeft = 7 + Math.floor(rnd() * 16);
    }
    if (sandLeft > 0) {
      sandLeft--;
      const surf = hmap[x];
      for (let dy = 0; dy <= 3; dy++) set(x, surf + dy, 4); // replace grass+dirt → sand
    } else {
      rnd(); // keep RNG sequence stable
    }
  }

  // Caves — random-walk tunnels underground
  for (let c = 0; c < 8; c++) {
    let cx = 5 + Math.floor(rnd() * (WW - 10));
    let cy = hmap[Math.min(WW-1, Math.max(0, cx))] + 6 + Math.floor(rnd() * 14);
    const cLen = 28 + Math.floor(rnd() * 52);
    let angle  = rnd() * Math.PI * 2;
    for (let s = 0; s < cLen; s++) {
      angle += (rnd() - 0.5) * 1.1;
      cx += Math.cos(angle) * 1.5;
      cy += Math.sin(angle) * 0.65;
      const ix = Math.round(cx), iy = Math.round(cy);
      const minSurf = hmap[Math.min(WW-1, Math.max(0, ix))];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (iy + dy > minSurf + 2) set(ix + dx, iy + dy, 0);
    }
  }

  // Trees (only on grass, not sand)
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

// ── NPC pixel-art textures ────────────────────────────────────────
const _NPC_TEX = {};
function _npcTexture(type, variant) {
  const key = `${type}_${variant}`;
  if (_NPC_TEX[key]) return _NPC_TEX[key];
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');

  if (type === 'sheep') {
    cv.width = 64; cv.height = 48;
    // Body
    ctx.fillStyle = variant ? '#cc9966' : '#f0f0f0'; // sheared or wooled
    ctx.fillRect(16, 16, 40, 22);
    // Head
    ctx.fillStyle = variant ? '#bb8855' : '#e0e0e0';
    ctx.fillRect(4, 8, 20, 18);
    // Wool bumps on body (only when wooled)
    if (!variant) {
      ctx.fillStyle = '#ffffff';
      for (let bx = 18; bx < 54; bx += 9) ctx.fillRect(bx, 12, 8, 8);
    }
    // Legs
    ctx.fillStyle = '#998877';
    [[18,38],[28,38],[38,38],[48,38]].forEach(([x,y]) => ctx.fillRect(x,y,8,10));
    // Eye
    ctx.fillStyle = '#222';
    ctx.fillRect(7, 12, 4, 4);
  } else if (type === 'zombie') {
    cv.width = 40; cv.height = 64;
    // Head
    ctx.fillStyle = '#66cc66';
    ctx.fillRect(10, 0, 20, 18);
    // Body
    ctx.fillStyle = '#335533';
    ctx.fillRect(8, 18, 24, 22);
    // Arms (raised forward)
    ctx.fillStyle = '#66cc66';
    ctx.fillRect(0, 12, 8, 18);
    ctx.fillRect(32, 12, 8, 18);
    // Legs
    ctx.fillStyle = '#223322';
    ctx.fillRect(10, 40, 9, 24);
    ctx.fillRect(22, 40, 9, 24);
    // Eyes
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(13, 5, 5, 5);
    ctx.fillRect(23, 5, 5, 5);
  } else if (type === 'wolf') {
    cv.width = 64; cv.height = 48;
    // Body
    ctx.fillStyle = '#888888';
    ctx.fillRect(10, 14, 40, 20);
    // Head
    ctx.fillStyle = '#777777';
    ctx.fillRect(44, 8, 18, 18);
    // Snout
    ctx.fillStyle = '#666666';
    ctx.fillRect(58, 14, 6, 8);
    // Tail
    ctx.fillStyle = '#999999';
    ctx.fillRect(2, 6, 12, 12);
    // Legs
    ctx.fillStyle = '#777777';
    [[14,34],[24,34],[36,34],[46,34]].forEach(([x,y]) => ctx.fillRect(x,y,8,14));
    // Eye
    ctx.fillStyle = variant ? '#66aaff' : '#ffaa00';
    ctx.fillRect(50, 11, 6, 6);
    // Collar (tamed)
    if (variant) {
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(44, 22, 16, 4);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  _NPC_TEX[key] = tex;
  return tex;
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
    // Mobile
    this._isMobile     = false;
    this._mcActionsEl  = null;
    this._touchTargetH = null;
    this._touchControls= null;
    // NPCs
    this._npcs        = [];
    this._playerHp    = 10;
    this._playerMaxHp = 10;
    this._hitCooldown = 0;
    this._hpEl        = null;
    this._clockEl     = null;
    this._skyMesh     = null;
    this._dayT        = 0;
    this._isNight     = false;
    // Decorations
    this._decorMeshes = [];
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

    this._skyMesh = E.plane(WW * B + 400, SKY_H * B * 2, 0x5599ee, (WW*B)/2, (SKY_H*B)/2, -300);

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
    this._buildDecorations();
    this._spawnNPCs();
    this._buildHUD();
    this._setupMouse();
    this._setupMobileControls();

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

  // ── Mobile touch controls ─────────────────────────────────────
  _setupMobileControls() {
    if (!( ('ontouchstart' in window) || navigator.maxTouchPoints > 0 )) return;
    this._isMobile = true;

    // Instancia TouchControls — isso binda os eventos de toque no D-pad (tc-left/right/up/down)
    this._touchControls = new TouchControls(this.inp);
    // show() exibe o container; tc-actions fica oculto pois substituímos com botões próprios
    const tc = document.getElementById('touch-controls');
    if (tc) tc.style.display = 'flex';
    const tcA = document.getElementById('tc-actions');
    if (tcA) tcA.style.display = 'none';

    // Create Minecraft action panel (bottom-right)
    this._mcActionsEl = document.createElement('div');
    this._mcActionsEl.style.cssText =
      'position:fixed;bottom:18px;right:16px;display:flex;flex-direction:column;' +
      'align-items:flex-end;gap:8px;z-index:350;pointer-events:none;';

    const mkBtn = (label, bg, brd, col) => {
      const b = document.createElement('button');
      b.innerHTML = label;
      b.style.cssText =
        `width:66px;height:58px;border-radius:14px;border:2px solid ${brd};` +
        `font-size:24px;pointer-events:all;background:${bg};color:${col};` +
        'display:flex;align-items:center;justify-content:center;' +
        '-webkit-tap-highlight-color:transparent;user-select:none;touch-action:none;';
      return b;
    };

    // ⛏ MINE — hold to mine at targeted block (sets _mouseDown like left-click)
    const mineBtn = mkBtn('⛏', 'rgba(100,50,10,0.88)', 'rgba(210,130,40,0.9)', '#ffcc66');
    mineBtn.addEventListener('touchstart',  e => { e.preventDefault(); this._mouseDown = true;  }, { passive:false });
    mineBtn.addEventListener('touchend',    e => { e.preventDefault(); this._mouseDown = false; }, { passive:false });
    mineBtn.addEventListener('touchcancel', e => { e.preventDefault(); this._mouseDown = false; }, { passive:false });

    // 🧱 PLACE — tap to place selected block at targeted position
    const placeBtn = mkBtn('🧱', 'rgba(30,80,20,0.88)', 'rgba(80,190,40,0.9)', '#88dd44');
    placeBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.inp.injectKey('KeyF', true);
      requestAnimationFrame(() => this.inp.injectKey('KeyF', false));
    }, { passive:false });

    // 🤝 INTERACT — tap to interact with NPC (E key)
    const interactBtn = mkBtn('🤝', 'rgba(80,40,80,0.88)', 'rgba(180,80,180,0.9)', '#dd88ff');
    interactBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.inp.injectKey('KeyE', true);
      requestAnimationFrame(() => this.inp.injectKey('KeyE', false));
    }, { passive:false });

    // ⚒ CRAFT — tap to open/close crafting menu
    const craftBtn = mkBtn('⚒', 'rgba(20,40,80,0.88)', 'rgba(40,110,220,0.9)', '#66aaff');
    craftBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.inp.injectKey('KeyR', true);
      requestAnimationFrame(() => this.inp.injectKey('KeyR', false));
    }, { passive:false });

    // ▲ JUMP — separate from D-pad for right-thumb jump
    const jumpBtn = mkBtn('▲', 'rgba(20,60,20,0.88)', 'rgba(60,180,60,0.9)', '#88ff88');
    jumpBtn.style.fontSize = '18px';
    jumpBtn.style.fontWeight = 'bold';
    jumpBtn.addEventListener('touchstart',  e => { e.preventDefault(); this.inp.injectKey('Space', true);  }, { passive:false });
    jumpBtn.addEventListener('touchend',    e => { e.preventDefault(); this.inp.injectKey('Space', false); }, { passive:false });
    jumpBtn.addEventListener('touchcancel', e => { e.preventDefault(); this.inp.injectKey('Space', false); }, { passive:false });

    // Stack: craft (top) → interact → place → mine → jump (bottom)
    this._mcActionsEl.append(craftBtn, interactBtn, placeBtn, mineBtn, jumpBtn);
    document.body.appendChild(this._mcActionsEl);

    // Touch on canvas (outside buttons/D-pad) → update mine/place target
    const canvas = this.e.renderer.domElement;
    this._touchTargetH = (e) => {
      for (const t of e.touches) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el && (el.tagName === 'BUTTON' || el.closest('#touch-controls'))) continue;
        this._updateMouseTarget({ clientX: t.clientX, clientY: t.clientY });
        break;
      }
    };
    canvas.addEventListener('touchstart', this._touchTargetH, { passive:true });
    canvas.addEventListener('touchmove',  this._touchTargetH, { passive:true });
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

  // ── NPCs ───────────────────────────────────────────────────────
  _spawnNPCs() {
    const cx = Math.floor(WW / 2); // player spawn column
    // Find first solid Y for a given column, return NPC center above it
    const surfY = (wx) => {
      const col = Math.max(0, Math.min(WW - 1, wx));
      for (let wy = 0; wy < WH; wy++) {
        if (this._world[wy * WW + col] !== 0) return wy * B - 20;
      }
      return SKY_H * B - 20;
    };
    // Offsets from center so NPCs start visible near the player
    const sheepOff = [-12, -6, 8, 16, 22];
    for (const off of sheepOff) {
      const wx = cx + off;
      this._makeNpc('sheep', wx * B + B/2, surfY(wx));
    }
    const wolfOff = [-18, 14];
    for (const off of wolfOff) {
      const wx = cx + off;
      this._makeNpc('wolf', wx * B + B/2, surfY(wx));
    }
  }

  _makeNpc(type, x, y) {
    const cfg = {
      sheep:  { w:24, h:20, hp:4,  maxHp:4  },
      zombie: { w:16, h:32, hp:6,  maxHp:6  },
      wolf:   { w:24, h:20, hp:8,  maxHp:8  },
    }[type];
    const npc = {
      type, x, y, vx:0, vy:0, ...cfg,
      dir:1, onGround:false,
      wooled:   type === 'sheep',
      regrowT:  0,
      tamed:    false,
      boneCount:0,
      attackCd: 0,
      wanderT:  0,
      wanderDir:1,
      sprite: null,
    };
    npc.sprite = this._makeNpcSprite(type, npc);
    this._npcs.push(npc);
    return npc;
  }

  _makeNpcSprite(type, npc) {
    const variant = (type === 'sheep' && !npc.wooled) ? 1 : (type === 'wolf' && npc.tamed) ? 1 : 0;
    const tex = _npcTexture(type, variant);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sp  = new THREE.Sprite(mat);
    const sw  = type === 'zombie' ? 28 : 50;
    const sh  = type === 'zombie' ? 50 : 38;
    sp.scale.set(sw, sh, 1);
    sp.position.set(npc.x, -npc.y, 10); // z=10: in front of block geometry (blocks extend to z+8.8)
    this.e.scene.add(sp);
    return sp;
  }

  _refreshNpcSprite(npc) {
    if (npc.sprite) { this.e.scene.remove(npc.sprite); npc.sprite.material.dispose(); }
    npc.sprite = this._makeNpcSprite(npc.type, npc);
  }

  _removeNpc(npc) {
    if (npc.sprite) { this.e.scene.remove(npc.sprite); npc.sprite.material.dispose(); }
    const idx = this._npcs.indexOf(npc);
    if (idx >= 0) this._npcs.splice(idx, 1);
  }

  _resolveNpcGround(npc) {
    const left  = Math.floor((npc.x - npc.w/2) / B);
    const right  = Math.floor((npc.x + npc.w/2 - 1) / B);
    const bot    = Math.floor((npc.y + npc.h/2) / B);
    const top    = Math.floor((npc.y - npc.h/2) / B);
    npc.onGround = false;
    // Ground
    if (npc.vy >= 0) {
      for (let tx = left; tx <= right; tx++) {
        if (bot >= 0 && bot < WH && tx >= 0 && tx < WW && this._world[bot*WW+tx] !== 0) {
          npc.y = bot * B - npc.h/2;
          npc.vy = 0; npc.onGround = true; break;
        }
      }
    }
    // Ceiling
    if (npc.vy < 0) {
      for (let tx = left; tx <= right; tx++) {
        if (top >= 0 && top < WH && tx >= 0 && tx < WW && this._world[top*WW+tx] !== 0) {
          npc.y = (top + 1) * B + npc.h/2; npc.vy = 0; break;
        }
      }
    }
    // Wall → reverse and randomise wanderDir
    const sideX = npc.vx > 0 ? right : left;
    if (npc.vx !== 0 && sideX >= 0 && sideX < WW) {
      for (let ty = top; ty <= bot; ty++) {
        if (ty >= 0 && ty < WH && this._world[ty*WW+sideX] !== 0) {
          npc.vx = -npc.vx; npc.wanderDir = -npc.wanderDir; break;
        }
      }
    }
    // World edges
    const half = npc.w / 2;
    if (npc.x < half)       { npc.x = half;       npc.vx = Math.abs(npc.vx);  npc.wanderDir =  1; }
    if (npc.x > WW*B - half){ npc.x = WW*B - half; npc.vx = -Math.abs(npc.vx); npc.wanderDir = -1; }
  }

  _updateNPCs(dt, px, py) {
    // Day / night cycle — 120s day, 120s night
    this._dayT += dt;
    if (this._dayT >= 240) this._dayT = 0;
    const wasNight = this._isNight;
    this._isNight  = this._dayT >= 120;

    if (this._isNight && !wasNight) {
      this._spawnZombies();
      if (this._skyMesh) this._skyMesh.material.color.setHex(0x08082a);
      this._msg('🌙 Noite — cuidado com os zumbis!', 3000);
    } else if (!this._isNight && wasNight) {
      if (this._skyMesh) this._skyMesh.material.color.setHex(0x5599ee);
      this._msg('☀️ Amanheceu!', 2000);
      for (let i = this._npcs.length - 1; i >= 0; i--) {
        if (this._npcs[i].type === 'zombie') this._removeNpc(this._npcs[i]);
      }
    }

    this._hitCooldown = Math.max(0, this._hitCooldown - dt);
    this._updateClock();

    for (let i = this._npcs.length - 1; i >= 0; i--) {
      const npc = this._npcs[i];
      if (npc.hp <= 0) { this._onNpcDeath(npc); continue; }

      npc.vy += 650 * dt;
      npc.attackCd = Math.max(0, npc.attackCd - dt);

      if (npc.type === 'sheep')  this._aiSheep(npc, dt, px, py);
      else if (npc.type === 'zombie') this._aiZombie(npc, dt, px, py);
      else if (npc.type === 'wolf')   this._aiWolf(npc, dt, px, py);

      npc.x += npc.vx * dt;
      npc.y += npc.vy * dt;
      this._resolveNpcGround(npc);

      if (npc.y > WH * B + 100) { this._removeNpc(npc); continue; }

      // Sprite mirror + position (Y negated: game-coords → THREE.js)
      const sw = Math.abs(npc.sprite.scale.x);
      npc.sprite.scale.x = sw * (npc.dir < 0 ? -1 : 1);
      npc.sprite.position.set(npc.x, -npc.y, 10);
    }
  }

  _aiSheep(npc, dt, px, py) {
    const nearZ = this._npcs.find(z =>
      z.type === 'zombie' && Math.abs(z.x - npc.x) < 200 && Math.abs(z.y - npc.y) < 120);
    if (nearZ) {
      npc.dir = nearZ.x < npc.x ? 1 : -1;
      npc.vx  = npc.dir * 120;
    } else {
      npc.wanderT += dt;
      if (npc.wanderT > 2 + Math.random() * 3) {
        npc.wanderT = 0;
        npc.wanderDir = Math.random() < 0.5 ? -1 : 1;
        npc.vx = Math.random() < 0.3 ? 0 : npc.wanderDir * 55;
      }
      if (npc.vx !== 0) npc.dir = npc.vx < 0 ? -1 : 1;
    }
    if (!npc.wooled) {
      npc.regrowT += dt;
      if (npc.regrowT >= 15) { npc.wooled = true; npc.regrowT = 0; this._refreshNpcSprite(npc); }
    }
  }

  _aiZombie(npc, dt, px, py) {
    const dx = px - npc.x, dy = py - npc.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 420) {
      npc.dir = dx > 0 ? 1 : -1;
      npc.vx  = npc.dir * 80;
      // Jump over walls
      if (npc.onGround) {
        const frontX = Math.floor((npc.x + npc.dir * (npc.w/2 + 4)) / B);
        const midY   = Math.floor(npc.y / B);
        if (frontX >= 0 && frontX < WW && midY >= 0 && midY < WH && this._world[midY*WW+frontX] !== 0) {
          npc.vy = -310;
        }
      }
      // Damage player
      if (dist < 30 && npc.attackCd <= 0) { this._damagePlayer(1); npc.attackCd = 1.5; }
      // Damage tamed wolves that are nearby
      this._npcs.forEach(w => {
        if (w.type === 'wolf' && w.tamed && Math.abs(w.x - npc.x) < 30 && npc.attackCd <= 0) {
          w.hp -= 1; npc.attackCd = 1.5;
        }
      });
    } else {
      npc.wanderT += dt;
      if (npc.wanderT > 2) {
        npc.wanderT = 0; npc.wanderDir = -npc.wanderDir;
        npc.vx = npc.wanderDir * 50;
      }
      npc.dir = npc.vx < 0 ? -1 : 1;
    }
  }

  _aiWolf(npc, dt, px, py) {
    const dx = px - npc.x, dist = Math.hypot(px - npc.x, py - npc.y);
    if (!npc.tamed) {
      if (dist < 160) {
        npc.dir = px < npc.x ? 1 : -1;
        npc.vx  = npc.dir * 110;
      } else {
        npc.wanderT += dt;
        if (npc.wanderT > 3 + Math.random() * 2) {
          npc.wanderT = 0; npc.wanderDir = Math.random() < 0.5 ? -1 : 1;
          npc.vx = Math.random() < 0.35 ? 0 : npc.wanderDir * 55;
        }
        if (npc.vx !== 0) npc.dir = npc.vx < 0 ? -1 : 1;
      }
    } else {
      const target = this._npcs.find(z =>
        z.type === 'zombie' && Math.abs(z.x - npc.x) < 320 && Math.abs(z.y - npc.y) < 120);
      if (target) {
        npc.dir = target.x > npc.x ? 1 : -1;
        npc.vx  = npc.dir * 150;
        if (Math.abs(target.x - npc.x) < 30 && npc.attackCd <= 0) {
          target.hp -= 2; npc.attackCd = 0.9;
        }
      } else if (dist > 220) {
        npc.dir = dx > 0 ? 1 : -1;
        npc.vx  = npc.dir * 140;
      } else {
        npc.vx = 0;
        npc.dir = dx > 0 ? 1 : -1;
      }
    }
  }

  _onNpcDeath(npc) {
    if (npc.type === 'sheep')  this._addItem(15, npc.wooled ? 2 : 1);
    if (npc.type === 'zombie') this._addItem(17, 1);
    this._removeNpc(npc);
  }

  _spawnZombies() {
    const surfY = (wx) => {
      for (let wy = 0; wy < WH; wy++) if (this._world[wy*WW+wx] !== 0) return wy * B - 22;
      return SKY_H * B - 22;
    };
    for (let i = 0; i < 3; i++) {
      const wx = i < 2 ? 1 + i : WW - 2;
      this._makeNpc('zombie', wx * B + B/2, surfY(wx));
    }
  }

  _interactNPC(px, py) {
    const slot = this._inv[this._hotbar];
    for (const npc of this._npcs) {
      if (Math.abs(npc.x - px) > 70 || Math.abs(npc.y - py) > 60) continue;
      if (npc.type === 'sheep' && npc.wooled) {
        npc.wooled = false; npc.regrowT = 0;
        this._refreshNpcSprite(npc);
        this._addItem(15, 2);
        this._msg('Ovelha tosquiada! +2 Lã');
        return;
      }
      if (npc.type === 'wolf' && !npc.tamed && slot.id === 17 && slot.qty > 0) {
        this._removeItem(17, 1);
        npc.boneCount++;
        if (npc.boneCount >= 3) {
          npc.tamed = true;
          this._refreshNpcSprite(npc);
          this._msg('🐺 Lobo domado! Ele vai te proteger!');
        } else {
          this._msg(`Lobo: ${npc.boneCount}/3 ossos para domar`);
        }
        return;
      }
    }
  }

  _damagePlayer(amt) {
    if (this._hitCooldown > 0) return;
    this._playerHp = Math.max(0, this._playerHp - amt);
    this._hitCooldown = 0.8;
    this._updateHP();
    if (this._playerHp <= 0) {
      this._msg('💀 Você morreu! Ressurgindo...', 3000);
      const b = this._player.body;
      setTimeout(() => {
        if (!this._player) return;
        b.x = Math.floor(WW/2) * B; b.y = SKY_H * B - 60;
        b.vx = 0; b.vy = 0;
        this._playerHp = this._playerMaxHp;
        this._updateHP();
      }, 2000);
    }
  }

  _updateHP() {
    if (!this._hpEl) return;
    this._hpEl.innerHTML = Array.from({ length: this._playerMaxHp }, (_, i) =>
      `<span style="color:${i < this._playerHp ? '#ff4444' : '#444444'};font-size:15px">❤</span>`
    ).join('');
  }

  // ── Surface decorations (visual only, no collision) ────────────
  _buildDecorations() {
    for (let wx = 0; wx < WW; wx++) {
      // Find surface grass block
      let surf = -1;
      for (let wy = 0; wy < WH; wy++) {
        if (this._world[wy*WW+wx] !== 0) { surf = wy; break; }
      }
      if (surf < 0 || this._world[surf*WW+wx] !== 1) continue; // only on grass
      if (Math.random() > 0.22) continue;

      const gx = wx * B + B/2;
      const gy = surf * B; // top of grass block in game coords
      const r  = Math.random();

      if (r < 0.35) {
        // Flower: stem + head
        const headCol = Math.random() < 0.5 ? 0xff4499 : (Math.random() < 0.5 ? 0xffdd00 : 0xff7700);
        this._decorMeshes.push(
          this.e.box(3, 12, 3, 0x22aa22, gx, gy - 6, 10),
          this.e.box(11, 9, 3, headCol,  gx, gy - 15, 10)
        );
      } else if (r < 0.70) {
        // Grass tufts
        const col = 0x33bb33;
        this._decorMeshes.push(
          this.e.box(2, 13, 3, col, gx - 5, gy - 7, 10),
          this.e.box(2, 16, 3, col, gx,     gy - 8, 10),
          this.e.box(2, 13, 3, col, gx + 5, gy - 7, 10)
        );
      } else {
        // Mushroom: stem + cap
        this._decorMeshes.push(
          this.e.box(5, 9,  3, 0xddccaa, gx, gy - 5,  10),
          this.e.box(14, 7, 3, 0xcc3322, gx, gy - 13, 10)
        );
      }
    }
  }

  _updateClock() {
    if (!this._clockEl) return;
    const timeLeft = this._isNight
      ? Math.ceil(240 - this._dayT)
      : Math.ceil(120 - this._dayT);
    this._clockEl.textContent = this._isNight ? `🌙 ${timeLeft}s` : `☀️ ${timeLeft}s`;
  }

  // ── HUD ────────────────────────────────────────────────────────
  _buildHUD() {
    this._hudEl = document.createElement('div');
    this._hudEl.style.cssText = `position:fixed;bottom:8px;left:50%;transform:translateX(-50%);
      display:flex;gap:3px;z-index:500;pointer-events:all;font-family:monospace;`;
    document.body.appendChild(this._hudEl);
    window._mc_slot = (i) => { this._hotbar = i; this._updateHUD(); };

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

    this._hpEl = document.createElement('div');
    this._hpEl.style.cssText = 'position:fixed;top:8px;left:8px;z-index:502;pointer-events:none;' +
      'background:rgba(0,0,0,0.55);padding:4px 8px;border-radius:6px;color:#fff;';
    document.body.appendChild(this._hpEl);

    this._clockEl = document.createElement('div');
    this._clockEl.style.cssText = 'position:fixed;top:8px;right:8px;z-index:502;pointer-events:none;' +
      'background:rgba(0,0,0,0.55);padding:4px 10px;border-radius:6px;' +
      'font-family:monospace;font-size:15px;color:#fff;';
    document.body.appendChild(this._clockEl);

    this._updateHUD();
    this._updateHP();
    this._updateClock();
    this._msg('Clique esq=minerar  F=colocar  E=interagir  R=crafting  1-9=slot  ESC=sair');
  }

  _updateHUD() {
    if (!this._hudEl) return;
    this._hudEl.innerHTML = this._inv.map((s, i) => {
      const sel = i === this._hotbar;
      const def = BLOCKS[s.id];
      const col = def ? '#' + def.color.toString(16).padStart(6,'0') : 'transparent';
      return `<div onclick="window._mc_slot(${i})"
        style="width:42px;height:42px;background:${sel?'rgba(60,130,255,0.35)':'rgba(0,0,0,0.55)'};
        border:${sel?'2px solid #4488ff':'2px solid #334455'};border-radius:5px;cursor:pointer;
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

    if (this._mouseDown) {
      if (this._mouseTarget) {
        // Desktop/touch: target under cursor, range-checked
        const { wx, wy } = this._mouseTarget;
        const pdx = Math.abs(wx - Math.floor(cx / B));
        const pdy = Math.abs(wy - Math.floor(cy / B));
        if (pdx + pdy <= 7) mineTarget = { wx, wy };
      } else {
        // Mobile: ⛏ held without canvas target → mine block in front
        const tx = Math.floor((cx + this._dir * B * 1.4) / B);
        const ty = Math.floor(cy / B);
        for (const [wx, wy] of [[tx,ty],[tx,ty-1],[tx,ty+1]]) {
          if (wx >= 0 && wx < WW && wy >= 0 && wy < WH && this._world[wy*WW+wx] !== 0) {
            mineTarget = { wx, wy }; break;
          }
        }
      }
    } else if (inp.isDown('KeyZ')) {
      // Z key (keyboard fallback)
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

    // ── Place block — F key ──────────────────────────────────────
    if (inp.justDown('KeyF') && this._placeCd <= 0) {
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

    // Interact with NPC (E key)
    if (inp.justDown('KeyE')) this._interactNPC(cx, cy);

    // NPC update
    this._updateNPCs(dt, cx, cy);

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

    // Mobile cleanup
    if (this._isMobile) {
      this._touchControls?.destroy();   // libera listeners do D-pad
      const tc = document.getElementById('touch-controls');
      if (tc) tc.style.display = 'none';
      const tcA = document.getElementById('tc-actions');
      if (tcA) tcA.style.display = '';
      this._mcActionsEl?.remove();
      const canvas = this.e.renderer.domElement;
      if (this._touchTargetH) {
        canvas.removeEventListener('touchstart', this._touchTargetH);
        canvas.removeEventListener('touchmove',  this._touchTargetH);
      }
      // Release any held virtual keys
      this.inp.injectKey('Space', false);
      this.inp.injectKey('KeyF',  false);
      this.inp.injectKey('KeyR',  false);
      this.inp.injectKey('KeyE',  false);
    }

    // NPCs
    for (const npc of this._npcs) {
      if (npc.sprite) { this.e.scene.remove(npc.sprite); npc.sprite.material.dispose(); }
    }
    this._npcs = [];

    // Decorations
    this._decorMeshes.forEach(m => this.e.remove(m));
    this._decorMeshes = [];

    // DOM
    this._hudEl?.remove();
    this._msgEl?.remove();
    this._craftEl?.remove();
    this._hpEl?.remove();
    this._clockEl?.remove();
    window._mc_craft = null;
    window._mc_slot  = null;
    clearTimeout(this._msgTimer);

    // Reset sky
    if (this._skyMesh) this._skyMesh.material.color.setHex(0x5599ee);

    // Restore HUD
    ['hud-health','hud-coins','hud-level','hud-msg','ability-panel','hud-xp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });

    this.physics.clear();
  }
}
