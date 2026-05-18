import { SaveSystem }    from '../systems/SaveSystem.js';
import { MISSIONS_DATA } from '../systems/ShopData.js';

// 2-column layout, 5 rows
const CX = [320, 960]; // column centers
const CY0 = 140;       // first row center
const ROW_H = 118;
const CW = 560, CH = 100;
const BAR_W = 300;

export class MissionsScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._btns = [];
    this._clickHandler = null;
    this._moveHandler  = null;
  }

  create() {
    // Check + award completed missions before drawing
    this._checkMissions();

    const E = this.e;
    E.plane(1280, 720, 0x060618, 640, 360, -400);
    E.plane(1280, 48,  0x0d1122, 640, 24,  -390);
    E.text('MISSOES', 20, 0xffffff, 640, 24, 5);
    E.text(`Moedas: ${SaveSystem.getCoins()}`, 12, 0xffd700, 1140, 24, 5);

    MISSIONS_DATA.forEach((m, idx) => {
      const cx = CX[idx % 2];
      const cy = CY0 + Math.floor(idx / 2) * ROW_H;

      const done = SaveSystem.isMissionDone(m.id);
      const prog = m.stat === 'maxPhase'
        ? SaveSystem.getMaxPhase()
        : SaveSystem.getStat(m.stat);
      const pct = Math.min(1, prog / m.target);

      const bgCol = done ? 0x0d2210 : 0x111122;
      const bdCol = done ? 0x00cc66 : 0x223355;

      E.box(CW + 4, CH + 4, 2, bdCol, cx, cy, 1);
      E.box(CW,     CH,     3, bgCol, cx, cy, 2);

      // Name row (top of card)
      E.text(`${m.icon} ${m.name}`, 12, done ? 0x00e676 : 0xffffff, cx - 120, cy - 32, 8);
      E.text(m.desc, 9, 0x667788, cx - 120, cy - 18, 8);

      // Reward badge (top-right)
      E.text(`+${m.reward}`, 11, 0xffd700, cx + 220, cy - 28, 8);
      E.text('moedas', 8, 0xaa8800, cx + 220, cy - 14, 8);

      // Progress bar (bottom of card)
      const barCx = cx;
      E.box(BAR_W, 6, 2, 0x1a1a2e, barCx, cy + 18, 6);
      if (pct > 0.01) {
        const fw   = Math.max(2, BAR_W * pct);
        const fcx  = barCx - BAR_W / 2 + fw / 2;
        const fillC = done ? 0x00e676 : pct > 0.5 ? 0x4488ff : 0xff8800;
        E.box(fw, 6, 3, fillC, fcx, cy + 18, 7);
      }

      // Progress text
      const progStr = done
        ? 'COMPLETO'
        : `${Math.min(prog, m.target)}/${m.target}`;
      E.text(progStr, 9, done ? 0x00e676 : 0x4488ff, cx + 180, cy + 18, 8);
    });

    // Back button
    const bkBox = E.box(130, 32, 6, 0x221133, 80, 696, 5);
    E.text('← Voltar', 12, 0x8844aa, 80, 696, 15);
    this._btns.push({ gx:80, gy:696, w:130, h:32, box:bkBox, baseColor:0x221133,
      action: () => this.m.start('MenuScene') });

    this._setupMouse();
  }

  _checkMissions() {
    for (const m of MISSIONS_DATA) {
      if (SaveSystem.isMissionDone(m.id)) continue;
      const prog = m.stat === 'maxPhase'
        ? SaveSystem.getMaxPhase()
        : SaveSystem.getStat(m.stat);
      if (prog >= m.target) {
        SaveSystem.completeMission(m.id);
        SaveSystem.addCoins(m.reward);
      }
    }
  }

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
    if (this.inp.justDown('Escape')) this.m.start('MenuScene');
  }

  destroy() {
    const c = this.e.renderer.domElement;
    if (this._moveHandler)  c.removeEventListener('mousemove', this._moveHandler);
    if (this._clickHandler) c.removeEventListener('click',     this._clickHandler);
    c.style.cursor = 'default';
  }
}
