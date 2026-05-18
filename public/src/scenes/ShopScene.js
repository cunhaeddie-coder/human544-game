import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem.js';
import { SHOP_DATA }  from '../systems/ShopData.js';
import { SKINS }      from '../CharacterSprite.js';

const WEAPON_COL = { standard:0x888888, double:0x999999, spread:0x777777, laser:0x00ccff, rocket:0xff6600 };
const ITEM_COL   = { extra_heart:0xff4444, speed:0x00e676, jump:0x4488ff };

function skinCanvas(pal) {
  const S = 4;
  const cv = document.createElement('canvas');
  cv.width = 18*S; cv.height = 30*S;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const r = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x*S, y*S, w*S, h*S); };
  const p = pal;
  r(p.hair,3,1,11,2); r(p.hairD,4,0,10,1);
  r(p.skin,3,3,12,7); r(p.skinD,3,3,1,7); r(p.skinD,14,3,1,7);
  r(p.eyeW,10,5,3,2); r(p.eye,11,5,2,2); r(p.out,12,5,1,1); r(p.out,10,4,4,1);
  r(p.skin,7,10,4,2);
  r(p.shirt,4,12,10,8); r(p.shirtD,4,12,1,8); r(p.shirtD,13,12,1,8);
  r(p.belt,4,20,10,2);
  r(p.pants,4,22,5,6); r(p.pants,9,22,5,6);
  r(p.shoe,3,28,6,2); r(p.shoe,9,28,6,2);
  return cv;
}

// Layout constants (game coords 1280×720, y-down)
const COLS = [360, 640, 920]; // x centers of 3 columns
const ROW0 = 175;             // y center of first item row
const ROW_H = 148;            // row pitch
const CW = 250, CH = 116;     // card width/height

export class ShopScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._tab       = 'skins';
    this._btns      = [];       // active clickable buttons
    this._staticBtns= [];       // never cleared (back button)
    this._dynObjs   = [];       // cleared on tab switch
    this._clickHandler = null;
    this._moveHandler  = null;
  }

  create(data = {}) {
    const E = this.e;
    // Static background
    E.plane(1280, 720, 0x060618, 640, 360, -400);
    E.plane(1280, 48,  0x0d0a2e, 640, 24,  -390);
    E.text('LOJA', 20, 0xffffff, 640, 24, 5);

    // Back button (permanent)
    const bkBox = E.box(130, 32, 6, 0x221133, 80, 696, 5);
    E.text('← Voltar', 12, 0x8844aa, 80, 696, 15);
    this._staticBtns = [
      { gx:80, gy:696, w:130, h:32, box:bkBox, baseColor:0x221133,
        action: () => this.m.start(data.from || 'ModeScene',
          data.from === 'GameScene' ? { level: data.level, mode: data.mode } : {}) },
    ];

    this._setupMouse();
    this._rebuild();
  }

  // ── Full rebuild of dynamic area ──────────────────────────────
  _rebuild() {
    this._dynObjs.forEach(o => this.e.remove(o));
    this._dynObjs = [];
    this._btns    = [...this._staticBtns];

    const E = this.e;

    // Coin counter
    const coinSp = E.text(`Moedas: ${SaveSystem.getCoins()}`, 12, 0xffd700, 1140, 24, 5);
    this._dynObjs.push(coinSp);

    // Tab buttons
    const tabs = [
      { key:'skins',   label:'Skins'   },
      { key:'weapons', label:'Armas'   },
      { key:'items',   label:'Itens'   },
      { key:'pets',    label:'Pets'    },
    ];
    const TAB_GX = [280, 480, 680, 880];
    tabs.forEach((t, i) => {
      const gx = TAB_GX[i], gy = 72;
      const active = t.key === this._tab;
      const bc = active ? 0x223388 : 0x111133;
      const tc = active ? 0xffffff : 0x667788;
      const box = E.box(210, 32, 6, bc, gx, gy, 5);
      const lbl = E.text(t.label, 12, tc, gx, gy, 15);
      this._dynObjs.push(box, lbl);
      this._btns.push({ gx, gy, w:210, h:32, box, baseColor:bc,
        action: () => { this._tab = t.key; this._rebuild(); } });
    });

    // Item grid
    (SHOP_DATA[this._tab] || []).forEach((item, idx) => {
      const cx = COLS[idx % 3];
      const cy = ROW0 + Math.floor(idx / 3) * ROW_H;

      const owned  = this._isOwned(item);
      const active = this._isActive(item);
      const maxed  = this._tab === 'items' && SaveSystem.isItemMaxed(item.id, item.max ?? 3);
      const curLevel = this._tab === 'items' ? SaveSystem.getItem(item.id) : 0;
      const dynPrice = item.price * (curLevel + 1);
      const canBuy = !owned && !maxed && SaveSystem.getCoins() >= dynPrice;

      const bgCol = active ? 0x0d2210 : owned ? 0x0d1a2e : 0x111122;
      const bdCol = active ? 0x00cc66 : owned ? 0x3377cc : canBuy ? 0x334455 : 0x222233;

      const border = E.box(CW + 4, CH + 4, 3, bdCol, cx, cy, 1);
      const card   = E.box(CW,     CH,     4, bgCol, cx, cy, 2);
      const nameT  = E.text(item.name, 12, 0xeeeeff, cx + 28, cy - 38, 8);
      const descT  = E.text(item.desc,  9, 0x778899, cx + 28, cy - 22, 8);
      this._dynObjs.push(border, card, nameT, descT);

      // Visual preview (left side of card)
      const px = cx - CW/2 + 28, py = cy - 8;
      if (this._tab === 'skins') {
        const pal = SKINS[item.id] || SKINS.default;
        const tex = new THREE.CanvasTexture(skinCanvas(pal));
        tex.magFilter = tex.minFilter = THREE.NearestFilter;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        sp.scale.set(36, 48, 1);
        sp.position.set(px, -py, 6);
        this.e.scene.add(sp);
        this._dynObjs.push(sp);
      } else if (this._tab === 'weapons') {
        const col = WEAPON_COL[item.id] || 0x888888;
        const g = E.box(34, 10, 8, col, px, py + 4, 6);
        const b = E.box(14, 7, 8, col + 0x222222, px + 20, py + 4, 7);
        this._dynObjs.push(g, b);
      } else {
        const col = ITEM_COL[item.id] || 0xffffff;
        const ico = E.box(28, 28, 8, col, px, py, 6);
        ico.material.emissive = new THREE.Color(col);
        ico.material.emissiveIntensity = 0.4;
        this._dynObjs.push(ico);
      }

      // Status / price line
      let statusStr, statusCol;
      if (active)     { statusStr = 'Equipado';        statusCol = 0x00e676; }
      else if (owned) { statusStr = 'Adquirido';       statusCol = 0x4488ff; }
      else            { statusStr = `${dynPrice} moedas`; statusCol = 0xffd700; }
      const stT = E.text(statusStr, 9, statusCol, cx, cy - 6, 8);
      this._dynObjs.push(stT);

      // Stack / pets info
      if (this._tab === 'items') {
        const cnt  = SaveSystem.getItem(item.id);
        const max  = item.max ?? 3;
        const cntT = E.text(`Nivel: ${cnt}/${max}`, 9, cnt>=max?0x00e676:0x667788, cx, cy + 7, 8);
        this._dynObjs.push(cntT);
      }
      if (this._tab === 'pets') {
        const active3 = SaveSystem.getActivePets();
        const slotT = E.text(`Ativos: ${active3.length}/3`, 9, 0x667788, cx, cy + 7, 8);
        this._dynObjs.push(slotT);
        if (item.dmg) {
          const dmgT = E.text(`DMG:${item.dmg} R:${item.range}`, 9, 0xff8800, cx, cy - 6, 8);
          this._dynObjs.push(dmgT);
        }
      }

      // Action button
      let btnLabel, btnBgC, btnTxtC;
      if (this._tab === 'pets') {
        if (!owned)       { btnLabel='Comprar';               btnBgC=canBuy?0x1a2233:0x111122; btnTxtC=canBuy?0xffd700:0x444455; }
        else if (active)  { btnLabel='Remover';               btnBgC=0x2a1010; btnTxtC=0xff4444; }
        else              { btnLabel=SaveSystem.getActivePets().length<3?'Ativar':'Cheio(3)'; btnBgC=0x0d1a3e; btnTxtC=0x4488ff; }
      } else if (maxed)  { btnLabel='MAX';     btnBgC=0x0d3320; btnTxtC=0x00e676; }
      else if (active)   { btnLabel='Equipado';btnBgC=0x0d3320; btnTxtC=0x00e676; }
      else if (owned)    { btnLabel='Equipar'; btnBgC=0x0d1a3e; btnTxtC=0x4488ff; }
      else if (canBuy)   { btnLabel='Comprar'; btnBgC=0x1a2233; btnTxtC=0xffd700; }
      else               { btnLabel='Bloqueado';btnBgC=0x111122;btnTxtC=0x444455; }

      const btnBg = E.box(160, 26, 5, btnBgC, cx, cy + 42, 7);
      const btnT  = E.text(btnLabel, 10, btnTxtC, cx, cy + 42, 15);
      this._dynObjs.push(btnBg, btnT);

      const clickable = this._tab === 'pets'
        ? (owned || canBuy)
        : (!active && !maxed && (owned || canBuy));

      if (clickable) {
        const it = item;
        const priceAtBuy = dynPrice;
        this._btns.push({
          gx: cx, gy: cy + 42, w: 160, h: 26, box: btnBg, baseColor: btnBgC,
          action: () => {
            if (!owned) {
              if (!SaveSystem.spendCoins(priceAtBuy)) return;
              this._unlock(it);
            }
            this._equip(it);
            this._rebuild();
          },
        });
      }

      // Botão "Vender/Rebaixar" para itens com nível > 0
      if (this._tab === 'items' && curLevel > 0) {
        const sellBg = E.box(100, 26, 5, 0x331111, cx + 132, cy + 42, 7);
        const refund = Math.floor(item.price * curLevel * 0.5);
        const sellT  = E.text(`↓ +${refund}`, 10, 0xff5555, cx + 132, cy + 42, 15);
        this._dynObjs.push(sellBg, sellT);
        const it2 = item;
        this._btns.push({
          gx: cx + 132, gy: cy + 42, w: 100, h: 26, box: sellBg, baseColor: 0x331111,
          action: () => {
            const coins = SaveSystem.downgradeItem(it2.id, it2.price);
            SaveSystem.addCoins(coins);
            this._rebuild();
          },
        });
      }
    });
  }

  // ── State helpers ─────────────────────────────────────────────
  _isOwned(item) {
    if (this._tab === 'skins')   return SaveSystem.hasSkin(item.id);
    if (this._tab === 'weapons') return SaveSystem.hasWeapon(item.id);
    if (this._tab === 'pets')    return SaveSystem.hasPet(item.id);
    return false;
  }

  _isActive(item) {
    if (this._tab === 'skins')   return SaveSystem.getActiveSkin()   === item.id;
    if (this._tab === 'weapons') return SaveSystem.getActiveWeapon() === item.id;
    if (this._tab === 'pets')    return SaveSystem.isActivePet(item.id);
    return false;
  }

  _unlock(item) {
    if (this._tab === 'skins')   SaveSystem.unlockSkin(item.id);
    if (this._tab === 'weapons') SaveSystem.unlockWeapon(item.id);
    if (this._tab === 'items')   SaveSystem.addItem(item.id, item.max ?? 3);
    if (this._tab === 'pets')    SaveSystem.unlockPet(item.id);
  }

  _equip(item) {
    if (this._tab === 'skins')   SaveSystem.setActiveSkin(item.id);
    if (this._tab === 'weapons') SaveSystem.setActiveWeapon(item.id);
    if (this._tab === 'pets')    SaveSystem.toggleActivePet(item.id);
    // items: nada a equipar
  }

  // ── Mouse ─────────────────────────────────────────────────────
  _setupMouse() {
    const canvas = this.e.renderer.domElement;
    this._moveHandler = ev => {
      const { gx, gy } = this._toGame(ev);
      let hov = false;
      this._btns.forEach(btn => {
        const hit = this._hit(gx, gy, btn);
        if (btn.box?.material?.color)
          btn.box.material.color.set(hit ? this._lighten(btn.baseColor) : btn.baseColor);
        if (hit) hov = true;
      });
      canvas.style.cursor = hov ? 'pointer' : 'default';
    };
    this._clickHandler = ev => {
      const { gx, gy } = this._toGame(ev);
      this._btns.forEach(btn => { if (this._hit(gx, gy, btn)) btn.action(); });
    };
    canvas.addEventListener('mousemove', this._moveHandler);
    canvas.addEventListener('click',     this._clickHandler);
  }

  _toGame(ev) {
    const r = this.e.renderer.domElement.getBoundingClientRect();
    return {
      gx: this.e._camX + ((ev.clientX - r.left) / r.width  - 0.5) * 1280,
      gy: this.e._camY + ((ev.clientY - r.top)  / r.height - 0.5) * 720,
    };
  }

  _hit(gx, gy, b) { return Math.abs(gx - b.gx) < b.w / 2 && Math.abs(gy - b.gy) < b.h / 2; }

  _lighten(c) {
    return (Math.min(((c >> 16) & 0xff) + 35, 255) << 16) |
           (Math.min(((c >>  8) & 0xff) + 35, 255) <<  8) |
            Math.min( (c        & 0xff) + 35, 255);
  }

  update(dt) {
    if (this.inp.justDown('Escape')) this.m.start('ModeScene');
  }

  destroy() {
    const c = this.e.renderer.domElement;
    if (this._moveHandler)  c.removeEventListener('mousemove', this._moveHandler);
    if (this._clickHandler) c.removeEventListener('click',     this._clickHandler);
    c.style.cursor = 'default';
  }
}
