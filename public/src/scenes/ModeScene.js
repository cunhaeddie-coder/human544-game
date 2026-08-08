// ── ModeScene → "Laboratório 544" ────────────────────────────────
// Hub narrativo: 4 portas por categoria em vez de lista solta de modos.
// Mantém a CHAVE DE CENA "ModeScene" (todo o resto do jogo já volta
// pra cá por esse nome) — só o conteúdo virou o Laboratório.

import { SaveSystem } from '../systems/SaveSystem.js';

export class ModeScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._view = 'doors';       // 'doors' | 'category'
    this._activeDoor = null;
    this._sel = 0;
    this._meshes = [];
    this._btns = [];            // todos os clicáveis (mouse)
    this._navBtns = [];         // só os primários (teclado ↑↓/Enter)
    this._clickHandler = null; this._moveHandler = null;
  }

  create() {
    const maxPhase = SaveSystem.getMaxPhase();
    this._doors = [
      { key:'testes', label:'🧪 CAMPO DE TESTES', desc:'Sobrevivência, cooperação e contenção', col:0x4488ff, locked:false,
        items: [
          { label:'⚔ Solo',       desc:'Aventure-se sozinho pela campanha', action:() => this.m.start('GameScene', { level:1, mode:'solo' }) },
          { label:'👥 Coop Local', desc:'P1:WASD+Espaço  P2:Setas+Enter',   action:() => this.m.start('GameScene', { level:1, mode:'coop' }) },
          { label:'💀 Contenção',  desc:'Modo Horda — ondas infinitas de experimentos', action:() => this.m.start('HordeScene') },
        ] },
      { key:'esportiva', label:'🏆 ÁREA ESPORTIVA', desc:'Testes de competição, força e reflexo', col:0x00e676, locked:false,
        items: [
          { label:'⚽ Futebol', desc:'Teste de competição — escolha sua seleção', action:() => this.m.start('FootballScene') },
          { label:'🏎 Corrida', desc:'Teste de reflexos — garagem e tráfego',      action:() => this.m.start('RacingScene') },
          { label:'🤼 Sumô',    desc:'Teste de força — empurre o oponente',        action:() => this.m.start('SumoScene') },
        ] },
      { key:'lab', label:'🔬 LABORATÓRIO', desc:'Testes cognitivos rápidos', col:0xffc400, locked:false,
        items: [
          { label:'🐍 Snake',         desc:'Teste cognitivo',  action:() => this.m.start('SnakeScene') },
          { label:'🧱 Breakout',      desc:'Teste de precisão', action:() => this.m.start('BreakoutScene') },
          { label:'🎯 Alvos',         desc:'Teste de mira',     action:() => this.m.start('TargetsScene', { players:2 }) },
          { label:'🎨 Piso Colorido', desc:'Teste de atenção',  action:() => this.m.start('ColorFloorScene', { players:2 }) },
        ] },
      { key:'proibida', label:'⛔ ÁREA PROIBIDA', desc:'Acesso restrito', col:0xff4757,
        locked: maxPhase < 3, unlockHint: 'Desbloqueia ao alcançar a Fase 3',
        items: [
          { label:'⛏ Minecraft 3D', desc:'Mundo experimental voxel', action:() => this.m.start('MinecraftScene') },
          { label:'🥊 PVP',          desc:'Teste entre humanos — 1 vs 1', action:() => this.m.start('PVPScene') },
          { label:'🌐 Online',       desc:'Salas, Boss Raid e minijogos online', action:() => this.m.start('OnlineScene') },
          { label:'🪞 MIRROR (secreto)', desc:'Boss que copia cada movimento seu', action:() => this.m.start('MirrorBossScene') },
          { label:'🧱 THE WALL (secreto)', desc:'Escale antes de ser esmagado', action:() => this.m.start('WallBossScene') },
        ] },
    ];
    this._view = 'doors'; this._activeDoor = null; this._sel = 0;
    this._render();
  }

  // ── Helpers que já registram o mesh pra limpeza no próximo render ──
  box(...a)  { const o = this.e.box(...a);  this._meshes.push(o); return o; }
  text(...a) { const o = this.e.text(...a); this._meshes.push(o); return o; }
  plane(...a){ const o = this.e.plane(...a); this._meshes.push(o); return o; }

  _clearVisuals() {
    this._meshes.forEach(m => this.e.remove(m));
    this._meshes = []; this._btns = []; this._navBtns = [];
  }

  _render() {
    this._teardownMouse();
    this._clearVisuals();
    if (this._view === 'doors') this._renderDoors();
    else this._renderCategory(this._activeDoor);
    this._highlightSel();
    this._setupMouse();
  }

  // ── Tela principal: 4 portas ──────────────────────────────────
  _renderDoors() {
    this.plane(1280, 720, 0x050520, 640, 360, -400);
    this.plane(1280, 100, 0x0d0a2e, 640, 50, -399);
    this.text('LABORATÓRIO 544', 26, 0xffffff, 640, 38, 10);
    const pname = SaveSystem.getPlayerName?.() || 'Jogador';
    const hum = SaveSystem.getHumanity(), humLabel = SaveSystem.getHumanityLabel(hum);
    this.text(`Sujeito: ${pname}  ·  HUMANITY: ${hum}% — ${humLabel}`, 12, 0x88aacc, 640, 72, 10);

    const cardW = 560, cardH = 178, gapX = 40, gapY = 26, startY = 210;
    this._doors.forEach((door, i) => {
      const col = i % 2, row = (i / 2) | 0;
      const cx = 640 + (col === 0 ? -1 : 1) * (cardW / 2 + gapX / 2);
      const cy = startY + row * (cardH + gapY);
      const locked = door.locked;
      const boxColor = locked ? 0x161620 : 0x111133;
      const bx = this.box(cardW, cardH, 14, boxColor, cx, cy, 10);
      bx.material.transparent = true;
      this.text(locked ? `🔒 ${door.label}` : door.label, 19, locked ? 0x555566 : door.col, cx, cy - 62, 25);
      this.text(locked ? door.unlockHint : door.desc, 11, 0x556677, cx, cy - 34, 25);
      if (!locked) {
        door.items.forEach((it, j) => this.text(it.label, 10, 0x7788aa, cx, cy - 4 + j * 16, 25));
      }
      const btn = {
        gx: cx, gy: cy, w: cardW, h: cardH, box: bx, baseColor: boxColor,
        action: locked
          ? () => { const c = bx.material.color.getHex(); bx.material.color.set(0xff3333); setTimeout(() => { if (bx.material) bx.material.color.set(c); }, 250); }
          : () => { this._view = 'category'; this._activeDoor = door; this._sel = 0; this._render(); },
      };
      this._btns.push(btn); this._navBtns.push(btn);
    });

    // Atalhos secundários (loja / missões / ranking / nome / voltar)
    const shopBox = this.box(160, 38, 12, 0x1a1500, 290, 660, 10);
    this.text('Loja', 14, 0xffd700, 290, 660, 25);
    const missBox = this.box(160, 38, 12, 0x0d1a2e, 490, 660, 10);
    this.text('Missões', 14, 0x4488ff, 490, 660, 25);
    const rankBox = this.box(160, 38, 12, 0x1a0d00, 690, 660, 10);
    this.text('Ranking', 14, 0xff8800, 690, 660, 25);
    const nameBox = this.box(160, 38, 12, 0x112233, 890, 660, 10);
    this.text('✏ Mudar Nome', 13, 0x88aacc, 890, 660, 25);
    const backBox = this.box(120, 38, 12, 0x221133, 90, 660, 10);
    this.text('← Sair', 13, 0x8844aa, 90, 660, 25);

    this._btns.push(
      { gx:290, gy:660, w:160, h:38, box:shopBox, baseColor:0x1a1500, action:() => this.m.start('ShopScene', { from:'ModeScene' }) },
      { gx:490, gy:660, w:160, h:38, box:missBox, baseColor:0x0d1a2e, action:() => this.m.start('MissionsScene') },
      { gx:690, gy:660, w:160, h:38, box:rankBox, baseColor:0x1a0d00, action:() => this.m.start('RankingScene') },
      { gx:890, gy:660, w:160, h:38, box:nameBox, baseColor:0x112233, action:() => this._changeName() },
      { gx:90,  gy:660, w:120, h:38, box:backBox, baseColor:0x221133, action:() => this.m.start('MenuScene') },
    );

    this.text('Setas/WASD navega   ENTER entra   ESC sai', 11, 0x2a3a4a, 640, 700, 10);
  }

  // ── Sub-painel de uma categoria ───────────────────────────────
  _renderCategory(door) {
    this.plane(1280, 720, 0x050520, 640, 360, -400);
    this.plane(1280, 100, 0x0d0a2e, 640, 50, -399);
    this.text(door.label, 24, door.col, 640, 38, 10);
    this.text(door.desc, 12, 0x8899aa, 640, 72, 10);

    door.items.forEach((it, i) => {
      const y = 160 + i * 90;
      const bx = this.box(560, 68, 14, 0x111133, 640, y, 10);
      bx.material.transparent = true;
      this.text(it.label, 19, door.col, 550, y - 10, 25);
      this.text(it.desc, 11, 0x556677, 550, y + 16, 25);
      const btn = { gx:640, gy:y, w:560, h:72, box:bx, baseColor:0x111133, action: it.action };
      this._btns.push(btn); this._navBtns.push(btn);
    });

    const backBox = this.box(260, 40, 12, 0x221133, 640, 160 + door.items.length * 90 + 20, 10);
    this.text('← Voltar ao Laboratório', 13, 0x8844aa, 640, 160 + door.items.length * 90 + 20, 25);
    this._btns.push({ gx:640, gy:160 + door.items.length * 90 + 20, w:260, h:40, box:backBox, baseColor:0x221133,
      action:() => { this._view = 'doors'; this._activeDoor = null; this._sel = 0; this._render(); } });
  }

  _changeName() {
    const cur = SaveSystem.getPlayerName?.() || 'Jogador';
    const name = window.prompt('Seu nome (máx 16 chars):', cur);
    if (name !== null && name.trim()) {
      SaveSystem.setPlayerName?.(name.trim().substring(0, 16));
      this._render();
    }
  }

  _highlightSel() {
    this._navBtns.forEach((b, i) => {
      const sel = i === this._sel;
      b.box.material.color.set(sel ? this._lighten(b.baseColor) : b.baseColor);
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

  _teardownMouse() {
    const c = this.e.renderer.domElement;
    if (this._moveHandler)  c.removeEventListener('mousemove', this._moveHandler);
    if (this._clickHandler) c.removeEventListener('click', this._clickHandler);
    this._moveHandler = null; this._clickHandler = null;
  }

  _toGame(e) {
    const rect = this.e.renderer.domElement.getBoundingClientRect();
    return {
      gx: this.e._camX + ((e.clientX - rect.left)  / rect.width  - 0.5) * 1280,
      gy: this.e._camY + ((e.clientY - rect.top)   / rect.height - 0.5) * 720,
    };
  }

  _hit(gx, gy, btn) {
    return Math.abs(gx - btn.gx) < btn.w / 2 && Math.abs(gy - btn.gy) < btn.h / 2;
  }

  _lighten(c) {
    return (Math.min(((c>>16)&0xff)+35,255)<<16)|(Math.min(((c>>8)&0xff)+35,255)<<8)|Math.min((c&0xff)+35,255);
  }

  update(dt) {
    const inp = this.inp;
    if (inp.justDown('Escape')) {
      if (this._view === 'category') { this._view = 'doors'; this._activeDoor = null; this._sel = 0; this._render(); return; }
      this.m.start('MenuScene'); return;
    }
    const n = this._navBtns.length;
    if (n === 0) return;
    if (inp.justDown('ArrowUp') || inp.justDown('KeyW'))   { this._sel = (this._sel - 1 + n) % n; this._highlightSel(); }
    if (inp.justDown('ArrowDown') || inp.justDown('KeyS')) { this._sel = (this._sel + 1) % n;     this._highlightSel(); }
    if (inp.justDown('Enter')) this._navBtns[this._sel].action();
  }

  destroy() {
    this._teardownMouse();
    this.e.renderer.domElement.style.cursor = 'default';
  }
}
