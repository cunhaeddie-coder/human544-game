// RankingScene — Tabela de melhores pontuações dos minijogos
// Layout: fundo escuro, título, lista de jogos com best score, botão Voltar
// Usa E.text(), E.plane(), E.box() — igual às outras cenas

import { SaveSystem } from '../systems/SaveSystem.js';

const GAME_LABELS = {
  football:   'Futebol',
  racing:     'Corrida',
  survival:   'Survival',
  targets:    'Alvos',
  sumo:       'Sumo',
  coinrush:   'Corrida de Moedas',
  dodge:      'Esquiva',
  kinghill:   'Rei do Morro',
  bomb:       'Bomba',
  breakout:   'Breakout',
  snake:      'Snake',
  colorfloor: 'Piso Colorido',
};

// Rankings "meta" — usam stat que já é rastreado de verdade em algum
// lugar do jogo (não é decorativo). Ver LORE.txt Fase 8 pra categorias
// que ainda faltam ligar (Speedrunner, Genius, Chaos, 544 geral).
const META_RANKINGS = [
  { key:'survivor', icon:'🏆', label:'Survivor',  desc:'Fase mais avançada', get:() => SaveSystem.getMaxPhase(), fmt:v => `Fase ${v}` },
  { key:'killer',   icon:'💀', label:'Killer',    desc:'Inimigos derrotados', get:() => SaveSystem.getStat('kills'), fmt:v => `${v}` },
  { key:'collector',icon:'💰', label:'Collector', desc:'Moedas em caixa',    get:() => SaveSystem.getCoins(), fmt:v => `${v}` },
  { key:'human',    icon:'❤',  label:'Human',     desc:'Humanidade',        get:() => SaveSystem.getHumanity(), fmt:v => `${v}% — ${SaveSystem.getHumanityLabel(v)}` },
];

export class RankingScene {
  constructor(e, m, i) {
    this.e   = e;
    this.m   = m;
    this.inp = i;
    this._btns        = [];
    this._clickHandler = null;
    this._moveHandler  = null;
    this._tab = 'games'; // 'games' | 'meta'
  }

  create(data = {}) {
    this._tab = data.tab || 'games';
    this._btns = [];
    const E = this.e;

    // ── Fundo ──────────────────────────────────────────────────
    E.plane(1280, 720, 0x030510, 640, 360, -400);
    // Faixa de cabeçalho
    E.plane(1280, 72, 0x07091a, 640, 36, -390);
    // Linha decorativa
    E.plane(1280, 2, 0x2244aa, 640, 72, -380);

    // ── Título ─────────────────────────────────────────────────
    E.text('RANKING', 32, 0x4488ff, 640, 36, 10);

    // ── Botão Voltar ───────────────────────────────────────────
    const bkBox = E.box(140, 36, 12, 0x0a0f22, 80, 36, 10);
    E.text('← Voltar', 13, 0x5566aa, 80, 36, 20);
    this._btns.push({
      gx: 80, gy: 36, w: 140, h: 36,
      box: bkBox, baseColor: 0x0a0f22,
      action: () => this.m.start('ModeScene'),
    });

    // ── Abas ─────────────────────────────────────────────────────
    const tabs = [ { key:'games', label:'MINIJOGOS' }, { key:'meta', label:'LABORATÓRIO' } ];
    tabs.forEach((t, i) => {
      const tx = 1080 + i * 150;
      const active = this._tab === t.key;
      const tbox = E.box(140, 36, 12, active ? 0x1a2a55 : 0x0a0f22, tx, 36, 10);
      E.text(t.label, 11, active ? 0x88bbff : 0x445577, tx, 36, 20);
      this._btns.push({ gx: tx, gy: 36, w: 140, h: 36, box: tbox, baseColor: active ? 0x1a2a55 : 0x0a0f22,
        action: () => this.m.start('RankingScene', { tab: t.key }) });
    });

    if (this._tab === 'meta') this._renderMeta(E);
    else this._renderGames(E);

    // ── Dica de teclado ────────────────────────────────────────
    E.text('ESC: Voltar', 11, 0x1a2233, 640, 695, 10);

    this._setupMouse();
  }

  _renderMeta(E){
    E.plane(900, 30, 0x0d1230, 640, 110, -5);
    E.text('CATEGORIA', 14, 0x3366aa, 380, 110, 15);
    E.text('VALOR', 14, 0x3366aa, 800, 110, 15);
    E.plane(900, 1, 0x1a2a55, 640, 126, 8);

    const startY = 160, rowHeight = 70;
    META_RANKINGS.forEach((r, idx) => {
      const rowY = startY + idx * rowHeight;
      const bgCol = idx % 2 === 0 ? 0x070b1a : 0x090d20;
      E.plane(900, rowHeight - 6, bgCol, 640, rowY, -8);
      E.text(`${r.icon} ${r.label}`, 16, 0x88aacc, 340, rowY - 12, 15);
      E.text(r.desc, 10, 0x445577, 340, rowY + 12, 15);
      E.text(r.fmt(r.get()), 18, 0x44ee88, 800, rowY, 15);
    });
  }

  _renderGames(E){
    // ── Busca rankings ─────────────────────────────────────────
    const rankings = SaveSystem.getAllRankings();

    if (rankings.length === 0) {
      // Nenhuma pontuação registrada ainda
      E.plane(560, 120, 0x0a0e20, 640, 360, -10);
      E.text('Nenhuma pontuacao registrada ainda.', 16, 0x334466, 640, 340, 15);
      E.text('Jogue os minijogos para aparecer aqui!', 13, 0x223355, 640, 370, 15);
    } else {
      // ── Cabeçalho da tabela ───────────────────────────────
      E.plane(900, 30, 0x0d1230, 640, 110, -5);
      E.text('JOGO',        14, 0x3366aa, 380, 110, 15);
      E.text('MELHOR SCORE', 14, 0x3366aa, 760, 110, 15);
      // linha separadora
      E.plane(900, 1, 0x1a2a55, 640, 126, 8);

      // ── Linhas da tabela ─────────────────────────────────
      const startY     = 148;
      const rowHeight  = 46;
      const maxVisible = 12;
      const shown      = rankings.slice(0, maxVisible);

      shown.forEach((entry, idx) => {
        const rowY   = startY + idx * rowHeight;
        const isEven = idx % 2 === 0;
        const bgCol  = isEven ? 0x070b1a : 0x090d20;

        // Fundo alternado
        E.plane(900, rowHeight - 2, bgCol, 640, rowY, -8);

        // Posição (ranking)
        const posCol = idx === 0 ? 0xffd700 : idx === 1 ? 0xaaaaaa : idx === 2 ? 0xcd7f32 : 0x445577;
        E.text(`#${idx + 1}`, 14, posCol, 220, rowY, 15);

        // Nome do jogo
        const label = GAME_LABELS[entry.game] || entry.game;
        E.text(label, 15, 0x88aacc, 400, rowY, 15);

        // Score formatado
        const scoreStr = entry.best.toLocaleString('pt-BR');
        E.text(scoreStr, 15, 0x44ee88, 760, rowY, 15);

        // Linha separadora sutil
        if (idx < shown.length - 1) {
          E.plane(900, 1, 0x111833, 640, rowY + rowHeight / 2, 5);
        }
      });

      // Contador total
      const totalY = startY + shown.length * rowHeight + 16;
      E.text(
        `${rankings.length} jogo${rankings.length !== 1 ? 's' : ''} com pontuacao registrada`,
        11, 0x223344, 640, totalY, 15,
      );
    }
  }

  // ── Mouse ───────────────────────────────────────────────────────
  _setupMouse() {
    const canvas = this.e.renderer.domElement;

    this._moveHandler = (ev) => {
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

    this._clickHandler = (ev) => {
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

  _hit(gx, gy, btn) {
    return Math.abs(gx - btn.gx) < btn.w / 2 && Math.abs(gy - btn.gy) < btn.h / 2;
  }

  _lighten(c) {
    return (Math.min(((c >> 16) & 0xff) + 40, 255) << 16) |
           (Math.min(((c >>  8) & 0xff) + 40, 255) <<  8) |
            Math.min( (c        & 0xff) + 40, 255);
  }

  update() {
    if (this.inp.justDown('Escape')) this.m.start('ModeScene');
  }

  destroy() {
    const canvas = this.e.renderer.domElement;
    if (this._moveHandler)  canvas.removeEventListener('mousemove', this._moveHandler);
    if (this._clickHandler) canvas.removeEventListener('click',     this._clickHandler);
    canvas.style.cursor = 'default';
  }
}
