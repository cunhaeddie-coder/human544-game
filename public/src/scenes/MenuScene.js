import { SaveSystem } from '../systems/SaveSystem.js';

export class MenuScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._t = 0; this._ok = false;
    this._btns = [];
    this._clickHandler = null;
    this._moveHandler  = null;
  }

  create() {
    const E = this.e;
    E.plane(1280, 720, 0x050520, 640, 360, -400);
    E.plane(1280, 220, 0x0d0a2e, 640, 580, -399);

    // Stars
    for (let i = 0; i < 120; i++) {
      const b = E.box(
        Math.random()<0.15 ? 3 : 1.5,
        Math.random()<0.15 ? 3 : 1.5,
        1, 0xffffff,
        Math.random()*1280, Math.random()*720,
        -300 + Math.random()*60
      );
      b.material.transparent = true;
      b.material.opacity = 0.15 + Math.random()*0.8;
    }

    // Title
    this._humanSp = E.text('HUMAN', 94, 0x4488ff, 640, 160, 20);
    this._numSp   = E.text('544',   118, 0xffc400, 640, 258, 20);
    E.text('MULTIPLAYER PLATFORMER  ·  2.5D  ·  v2.0', 13, 0x8899aa, 640, 330, 10);
    E.text('⚙ ETAPA A   5 Fases + Boss Robô',  13, 0x4488ff, 380, 376, 10);
    E.text('🐉 ETAPA B   5 Fases + Boss Dragão', 13, 0xff4444, 820, 376, 10);

    // Player name display
    const pname = SaveSystem.getPlayerName?.() || 'Jogador';
    this._nameLabel = E.text(`Jogador: ${pname}`, 13, 0x88aacc, 640, 420, 10);

    // Buttons
    this._btnPlay = this._makeBtn(640, 460, 280, 54, 0x223388, '▶  INICIAR JOGO', 22, 0xffffff,
      () => { if (!this._ok) { this._ok = true; this.m.start('ModeScene'); }});

    this._makeBtn(490, 540, 200, 38, 0x112244, '🛒  Loja', 15, 0x88ccff,
      () => { if (!this._ok) { this._ok = true; this.m.start('ShopScene'); }});

    this._makeBtn(790, 540, 200, 38, 0x112233, '📋  Missoes', 15, 0x88ffcc,
      () => { if (!this._ok) { this._ok = true; this.m.start('MissionsScene'); }});

    this._btnName = this._makeBtn(640, 608, 180, 32, 0x0d0d22, '✏  Mudar Nome', 12, 0x556677,
      () => this._changeName());

    E.text('A/D: Mover  |  W: Pular  |  ESPACO: Atirar  |  ENTER: Confirmar', 10, 0x2a3a4a, 640, 650, 10);

    // Mouse events
    this._setupMouse();
  }

  _makeBtn(gx, gy, w, h, boxColor, label, fontSize, textColor, action) {
    const box = this.e.box(w, h, 14, boxColor, gx, gy, 12);
    this.e.text(label, fontSize, textColor, gx, gy, 25);
    const btn = { gx, gy, w, h, box, action, baseColor: boxColor };
    this._btns.push(btn);
    return btn;
  }

  _changeName() {
    const cur = SaveSystem.getPlayerName?.() || 'Jogador';
    const name = window.prompt('Seu nome no jogo (máx 16 chars):', cur);
    if (name !== null && name.trim()) {
      const clean = name.trim().substring(0, 16);
      SaveSystem.setPlayerName?.(clean);
      this.m.start('MenuScene'); // reload to update name display
    }
  }

  _setupMouse() {
    const canvas = this.e.renderer.domElement;

    this._moveHandler = (e) => {
      const { gx, gy } = this._toGame(e);
      let hovering = false;
      this._btns.forEach(btn => {
        const hit = this._hit(gx, gy, btn);
        btn.box.material.color.set(hit ? this._lighten(btn.baseColor) : btn.baseColor);
        if (hit) hovering = true;
      });
      canvas.style.cursor = hovering ? 'pointer' : 'default';
    };

    this._clickHandler = (e) => {
      const { gx, gy } = this._toGame(e);
      this._btns.forEach(btn => {
        if (this._hit(gx, gy, btn)) btn.action();
      });
    };

    canvas.addEventListener('mousemove', this._moveHandler);
    canvas.addEventListener('click',     this._clickHandler);
  }

  _toGame(e) {
    const rect = this.e.renderer.domElement.getBoundingClientRect();
    const nx = (e.clientX - rect.left)  / rect.width;
    const ny = (e.clientY - rect.top)   / rect.height;
    return {
      gx: this.e._camX + (nx - 0.5) * 1280,
      gy: this.e._camY + (ny - 0.5) * 720,
    };
  }

  _hit(gx, gy, btn) {
    return Math.abs(gx - btn.gx) < btn.w / 2 && Math.abs(gy - btn.gy) < btn.h / 2;
  }

  _lighten(color) {
    const r = Math.min(((color>>16)&0xff)+40,255);
    const g = Math.min(((color>>8)&0xff)+40,255);
    const b = Math.min((color&0xff)+40,255);
    return (r<<16)|(g<<8)|b;
  }

  update(dt) {
    this._t += dt;
    const s = 1 + Math.sin(this._t * 4) * 0.03;
    if (this._btnPlay?.box) this._btnPlay.box.scale.set(s, s, 1);
    if (!this._ok && (this.inp.justDown('Enter') || this.inp.justDown('Space'))) {
      this._ok = true; this.m.start('ModeScene');
    }
  }

  destroy() {
    const canvas = this.e.renderer.domElement;
    if (this._moveHandler)  canvas.removeEventListener('mousemove', this._moveHandler);
    if (this._clickHandler) canvas.removeEventListener('click',     this._clickHandler);
    canvas.style.cursor = 'default';
  }
}
