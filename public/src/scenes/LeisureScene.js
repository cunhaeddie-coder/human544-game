// ── LeisureScene — Hub de mini-jogos (Three.js) ──────────────────

export class LeisureScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._btns = [];
    this._clickHandler = null;
    this._moveHandler  = null;
    this._toast = null;
    this._toastTimer = 0;
    this._page = 0;
  }

  create(data = {}) {
    this._page = data.page ?? 0;
    const E = this.e;
    E.plane(1280, 720, 0x060618, 640, 360, -400);
    E.plane(1280, 52,  0x0d0a22, 640, 26,  -390);
    E.text('MINI JOGOS', 22, 0xffffff, 640, 26, 5);

    const ALL_GAMES = [
      // Página 0
      { label:'SOBREVIVENCIA', desc:'Plataformas caem – ultimo de pe vence',       key:'survive',  col:0xff4757 },
      { label:'FUTEBOL',       desc:'2 jogadores, marque 5 gols',                  key:'football', col:0x00e676 },
      { label:'ALVOS',         desc:'Destrua o maximo de alvos em 30s',            key:'targets',  col:0xffc400 },
      { label:'CORRIDA',       desc:'Corrida de carros – 3 voltas (W/S A/D)',      key:'racing',   col:0x4488ff },
      { label:'SUMO',          desc:'Empurre o oponente, plataforma encolhe',      key:'sumo',     col:0xff8800 },
      { label:'CORRIDA MOEDAS',desc:'Colete mais moedas em 30s',                   key:'coinrush', col:0xffd700 },
      // Página 1
      { label:'DESVIE!',       desc:'Desvie de objetos caindo – ultimo de pe',     key:'dodge',    col:0xff2266 },
      { label:'REI DO MORRO',  desc:'Fique na zona central por 20s para vencer',   key:'kinghill', col:0x00cc88 },
      { label:'BOMBA!',        desc:'Passe a bomba antes que expluda',              key:'bomb',     col:0xff6600 },
      { label:'BREAKOUT',      desc:'Quebre todos os blocos com a bola',           key:'breakout', col:0x44aaff },
      { label:'SNAKE',         desc:'Classico cobra – coma e cresça',              key:'snake',    col:0x44dd44 },
      { label:'CHAO COLORIDO', desc:'Pise na cor certa antes do tempo acabar',     key:'colorfloor',col:0xcc44ff },
    ];

    const GAMES_PER_PAGE = 6;
    const start = this._page * GAMES_PER_PAGE;
    const pageGames = ALL_GAMES.slice(start, start + GAMES_PER_PAGE);

    pageGames.forEach((g, i) => {
      const col  = i % 2;
      const row  = Math.floor(i / 2);
      const cx   = 340 + col * 600;
      const cy   = 180 + row * 170;

      const border = E.box(508, 138, 2, g.col, cx, cy, 1);
      border.material.transparent = true;
      border.material.opacity = 0.6;
      E.box(504, 134, 4, 0x111122, cx, cy, 2);
      E.text(g.label, 16, g.col, cx, cy - 36, 8);
      E.text(g.desc,  9,  0x556677, cx, cy - 16, 8);

      const btnBox = E.box(180, 34, 6, 0x1a2233, cx, cy + 32, 6);
      E.text('JOGAR', 13, 0xffffff, cx, cy + 32, 12);

      this._btns.push({
        gx: cx, gy: cy + 32, w: 180, h: 34, box: btnBox, baseColor: 0x1a2233,
        action: () => this._launch(g.key),
      });
    });

    // Paginação
    const totalPages = Math.ceil(ALL_GAMES.length / GAMES_PER_PAGE);
    if (this._page > 0) {
      const prevBox = E.box(130, 34, 8, 0x223344, 120, 680, 5);
      E.text('◀ Anterior', 12, 0x88aacc, 120, 680, 15);
      this._btns.push({ gx:120, gy:680, w:130, h:34, box:prevBox, baseColor:0x223344, action:()=>this.m.start('LeisureScene',{page:this._page-1}) });
    }
    if (this._page < totalPages - 1) {
      const nextBox = E.box(130, 34, 8, 0x223344, 1160, 680, 5);
      E.text('Proxima ▶', 12, 0x88aacc, 1160, 680, 15);
      this._btns.push({ gx:1160, gy:680, w:130, h:34, box:nextBox, baseColor:0x223344, action:()=>this.m.start('LeisureScene',{page:this._page+1}) });
    }
    E.text(`${this._page+1}/${totalPages}`, 11, 0x445566, 640, 682, 5);

    // Back
    const bkBox = E.box(130, 34, 8, 0x221133, 640, 700, 5);
    E.text('← Voltar', 12, 0x8844aa, 640, 700, 15);
    this._btns.push({ gx:640, gy:700, w:130, h:34, box:bkBox, baseColor:0x221133, action:()=>this.m.start('ModeScene') });

    this._setupMouse();
  }

  _launch(key) {
    const MAP = {
      survive:   ['SurvivalScene',   { players: 2 }],
      football:  ['FootballScene',   {}],
      targets:   ['TargetsScene',    { players: 2 }],
      racing:    ['RacingScene',     { players: 2 }],
      sumo:      ['SumoScene',       {}],
      coinrush:  ['CoinRushScene',   { players: 2 }],
      dodge:     ['DodgeScene',      { players: 2 }],
      kinghill:  ['KingHillScene',   { players: 2 }],
      bomb:      ['BombScene',       {}],
      breakout:  ['BreakoutScene',   {}],
      snake:     ['SnakeScene',      {}],
      colorfloor:['ColorFloorScene', { players: 2 }],
    };
    const entry = MAP[key];
    if (entry) { this.m.start(entry[0], entry[1]); return; }
    if (this._toast) { this.e.remove(this._toast); this._toast = null; }
    this._toast = this.e.text('Em breve!', 22, 0xffc400, 640, 360, 50);
    this._toastTimer = 2.2;
  }

  _setupMouse() {
    const cv = this.e.renderer.domElement;
    this._moveHandler = ev => {
      const { gx, gy } = this._toGame(ev);
      let hov = false;
      this._btns.forEach(b => {
        const hit = this._hit(gx, gy, b);
        if (b.box?.material?.color) b.box.material.color.set(hit ? this._lighten(b.baseColor) : b.baseColor);
        if (hit) hov = true;
      });
      cv.style.cursor = hov ? 'pointer' : 'default';
    };
    this._clickHandler = ev => {
      const { gx, gy } = this._toGame(ev);
      this._btns.forEach(b => { if (this._hit(gx, gy, b)) b.action(); });
    };
    cv.addEventListener('mousemove', this._moveHandler);
    cv.addEventListener('click',     this._clickHandler);
  }

  _toGame(ev) {
    const r = this.e.renderer.domElement.getBoundingClientRect();
    return {
      gx: this.e._camX + ((ev.clientX - r.left) / r.width  - 0.5) * 1280,
      gy: this.e._camY + ((ev.clientY - r.top)  / r.height - 0.5) * 720,
    };
  }
  _hit(gx, gy, b) { return Math.abs(gx-b.gx) < b.w/2 && Math.abs(gy-b.gy) < b.h/2; }
  _lighten(c) {
    return (Math.min(((c>>16)&0xff)+35,255)<<16) |
           (Math.min(((c>>8 )&0xff)+35,255)<<8 ) |
            Math.min( (c     &0xff)+35,255);
  }

  update(dt) {
    if (this._toastTimer > 0) {
      this._toastTimer -= dt;
      if (this._toastTimer <= 0 && this._toast) { this.e.remove(this._toast); this._toast = null; }
    }
    if (this.inp.justDown('Escape')) this.m.start('ModeScene');
  }

  destroy() {
    const cv = this.e.renderer.domElement;
    if (this._moveHandler)  cv.removeEventListener('mousemove', this._moveHandler);
    if (this._clickHandler) cv.removeEventListener('click',     this._clickHandler);
    cv.style.cursor = 'default';
  }
}
