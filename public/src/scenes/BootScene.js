export class BootScene {
  constructor(e, m, i) { this.e = e; this.m = m; this._t = 0; }

  create() {
    const E = this.e;
    E.plane(1280, 720, 0x030510, 640, 360, -400);
    E.text('HUMAN', 68, 0x3377ff, 640, 320, 10);
    E.text('544',   80, 0xffc400, 640, 400, 10);
    E.text('carregando...', 13, 0x334466, 640, 480, 10);
    this._t = 1.2;
  }

  update(dt) { this._t -= dt; if (this._t <= 0) this.m.start('MenuScene'); }
  destroy() {}
}
