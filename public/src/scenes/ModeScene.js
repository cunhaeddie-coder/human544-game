import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem.js';

export class ModeScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._sel = 0; this._t = 0; this._ok = false;
    this._btns = []; this._clickHandler = null; this._moveHandler = null;
  }

  create() {
    const E = this.e;
    E.plane(1280, 720, 0x050520, 640, 360, -400);
    E.plane(1280, 100, 0x0d0a2e, 640, 50, -399);
    E.text('ESCOLHA O MODO', 28, 0xffffff, 640, 100, 10);

    // Player name + change button
    const pname = SaveSystem.getPlayerName?.() || 'Jogador';
    E.text(`Olá, ${pname}`, 15, 0x88aacc, 640, 160, 10);

    this._modes = [
      { label:'⚔  SOLO',              desc:'Aventure-se sozinho',              col:0x4488ff, key:'solo'    },
      { label:'👥  COOP LOCAL',        desc:'P1:WASD+Espaço  P2:Setas+Enter',  col:0x00e676, key:'coop'   },
      { label:'🌐  ONLINE',            desc:'Criar sala ou entrar com código',  col:0x00ccff, key:'online' },
      { label:'🥊  PVP',              desc:'Batalha 1 vs 1 — mesmo teclado',   col:0xff4757, key:'pvp'    },
      { label:'🎮  LAZER',            desc:'Mini jogos rápidos',               col:0xaa44ff, key:'leisure'},
    ];

    this._modeBoxes = this._modes.map((mode, i) => {
      const y = 185 + i * 90;
      const box = E.box(560, 68, 18, 0x111133, 640, y, 10);
      box.material.transparent = true;
      E.text(mode.label, 22, mode.col, 550, y - 10, 25);
      E.text(mode.desc,  12, 0x556677, 550, y + 16, 25);
      const btn = { gx:640, gy:y, w:560, h:72, box, action:() => this._pick(i), baseColor:0x111133 };
      this._btns.push(btn);
      return box;
    });

    // Name change button
    const nbtn = { gx:1180, gy:50, w:170, h:40, box: E.box(170,40,12,0x112233,1180,50,12),
      action: () => this._changeName(), baseColor:0x112233 };
    E.text('✏ Mudar Nome', 13, 0x88aacc, 1180, 50, 25);
    this._btns.push(nbtn);

    // Back button
    const bbtn = { gx:80, gy:50, w:120, h:40, box: E.box(120,40,12,0x221133,80,50,12),
      action: () => this.m.start('MenuScene'), baseColor:0x221133 };
    E.text('← Voltar', 13, 0x8844aa, 80, 50, 25);
    this._btns.push(bbtn);

    // Loja + Missões + Ranking
    const shopBox = E.box(160, 38, 12, 0x1a1500, 290, 630, 10);
    E.text('Loja', 14, 0xffd700, 290, 630, 25);
    const missBox = E.box(160, 38, 12, 0x0d1a2e, 490, 630, 10);
    E.text('Missoes', 14, 0x4488ff, 490, 630, 25);
    const rankBox = E.box(160, 38, 12, 0x1a0d00, 690, 630, 10);
    E.text('Ranking', 14, 0xff8800, 690, 630, 25);

    // Botão Minecraft 3D
    const mcBox = E.box(200, 38, 12, 0x2d4a1e, 940, 630, 10);
    mcBox.material.transparent = true;
    E.text('⛏ Minecraft 3D', 14, 0x88dd44, 940, 630, 25);

    // Botão Horda
    const hordeBox = E.box(160, 38, 12, 0x2a0808, 115, 630, 10);
    hordeBox.material.transparent = true;
    E.text('💀 Horda', 14, 0xff3333, 115, 630, 25);

    this._btns.push(
      { gx:290, gy:630, w:160, h:38, box:shopBox,  baseColor:0x1a1500, action:()=>{ if(!this._ok){this._ok=true; this.m.start('ShopScene');} } },
      { gx:490, gy:630, w:160, h:38, box:missBox,  baseColor:0x0d1a2e, action:()=>{ if(!this._ok){this._ok=true; this.m.start('MissionsScene');} } },
      { gx:690, gy:630, w:160, h:38, box:rankBox,  baseColor:0x1a0d00, action:()=>{ if(!this._ok){this._ok=true; this.m.start('RankingScene');} } },
      { gx:940, gy:630, w:200, h:38, box:mcBox,    baseColor:0x2d4a1e, action:()=>{ if(!this._ok){this._ok=true; this.m.start('MinecraftScene');} } },
      { gx:115, gy:630, w:160, h:38, box:hordeBox, baseColor:0x2a0808, action:()=>{ if(!this._ok){this._ok=true; this.m.start('HordeScene');} } },
    );

    E.text('↑↓ ou Setas   ENTER: Confirmar   ESC: Voltar', 11, 0x2a3a4a, 640, 690, 10);

    this._highlight();
    this._setupMouse();
  }

  _pick(idx) {
    if (this._ok) return;
    this._ok = true;
    const key = this._modes[idx].key;
    if      (key === 'pvp')     this.m.start('PVPScene');
    else if (key === 'leisure') this.m.start('LeisureScene');
    else if (key === 'online')  this.m.start('OnlineScene');
    else                        this.m.start('GameScene', { level: 1, mode: key });
  }

  _changeName() {
    const cur = SaveSystem.getPlayerName?.() || 'Jogador';
    const name = window.prompt('Seu nome (máx 16 chars):', cur);
    if (name !== null && name.trim()) {
      SaveSystem.setPlayerName?.(name.trim().substring(0, 16));
      this.m.start('ModeScene');
    }
  }

  _highlight() {
    this._modeBoxes?.forEach((b, i) => {
      const sel = i === this._sel;
      b.material.color.set(sel ? 0x1a2244 : 0x111133);
      b.scale.set(sel ? 1.03 : 1, sel ? 1.03 : 1, 1);
    });
  }

  _setupMouse() {
    const canvas = this.e.renderer.domElement;
    this._moveHandler = (e) => {
      const { gx, gy } = this._toGame(e);
      let hov = false;
      this._btns.forEach(btn => {
        const hit = this._hit(gx, gy, btn);
        btn.box.material.color.set(hit ? this._lighten(btn.baseColor) : btn.baseColor);
        if (hit) hov = true;
      });
      canvas.style.cursor = hov ? 'pointer' : 'default';
    };
    this._clickHandler = (e) => {
      const { gx, gy } = this._toGame(e);
      this._btns.forEach(btn => { if (this._hit(gx, gy, btn)) btn.action(); });
    };
    canvas.addEventListener('mousemove', this._moveHandler);
    canvas.addEventListener('click', this._clickHandler);
  }

  _toGame(e) {
    const rect = this.e.renderer.domElement.getBoundingClientRect();
    return {
      gx: this.e._camX + ((e.clientX - rect.left)  / rect.width  - 0.5) * 1280,
      gy: this.e._camY + ((e.clientY - rect.top)   / rect.height - 0.5) * 720,
    };
  }

  _hit(gx, gy, btn) {
    return Math.abs(gx - btn.gx) < btn.w/2 && Math.abs(gy - btn.gy) < btn.h/2;
  }

  _lighten(c) {
    return (Math.min(((c>>16)&0xff)+35,255)<<16)|(Math.min(((c>>8)&0xff)+35,255)<<8)|Math.min((c&0xff)+35,255);
  }

  update(dt) {
    this._t += dt;
    const inp = this.inp;
    if (inp.justDown('ArrowUp')   || inp.justDown('KeyW')) { this._sel=(this._sel-1+4)%4; this._highlight(); }
    if (inp.justDown('ArrowDown') || inp.justDown('KeyS')) { this._sel=(this._sel+1)%4;   this._highlight(); }
    if (inp.justDown('Escape')) { this.m.start('MenuScene'); return; }
    if (!this._ok && inp.justDown('Enter')) this._pick(this._sel);
  }

  destroy() {
    const c = this.e.renderer.domElement;
    if (this._moveHandler)  c.removeEventListener('mousemove', this._moveHandler);
    if (this._clickHandler) c.removeEventListener('click',     this._clickHandler);
    c.style.cursor = 'default';
  }
}
