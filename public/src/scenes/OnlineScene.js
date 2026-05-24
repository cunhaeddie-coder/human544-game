// ── OnlineScene — Lobby Multiplayer Online ────────────────────────
import * as THREE from 'three';
import { getNetwork } from '../Network.js';
import { SaveSystem }  from '../systems/SaveSystem.js';

// Z-layers: fundos em Z=2-5, caixas em Z=8-10, texto em Z=20+
const Z_BG   = 2;
const Z_BOX  = 8;
const Z_TXT  = 22;

export class OnlineScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._net   = null;
    this._state = 'menu';
    this._navBtns = [];
    this._btnPool = [];
    this._dynObjs = [];
    this._clickH  = null;
    this._moveH   = null;
    // Overlay HTML
    this._overlay   = null;
    this._codeInput = null;
    this._errEl     = null;
    // Sprites atualizáveis
    this._listSp  = null;
    this._ipSp    = null;
    this._voteSp  = null;
    this._t       = 0;
  }

  // ── Criação ────────────────────────────────────────────────────
  create() {
    const E = this.e;

    // Fundo (permanente — não vai para _dynObjs)
    E.plane(1280, 720, 0x020409, 640, 360, -500);
    for (let i = 0; i < 120; i++) {
      const sz = Math.random() < 0.1 ? 2.5 : 1.2;
      const s  = E.box(sz, sz, 1, 0xffffff,
        Math.random()*1280, Math.random()*720, -380+Math.random()*50);
      s.material.transparent = true;
      s.material.opacity = 0.06 + Math.random() * 0.5;
    }

    // Header (permanente)
    E.plane(1280, 56, 0x060b18, 640, 28, Z_BG);
    E.plane(1280, 2,  0x1a3d7a, 640, 57, Z_BOX);     // linha azul
    E.text('MULTIPLAYER ONLINE', 20, 0x44aaff, 640, 28, Z_TXT);

    // Botão Voltar
    const bkBox = E.box(138, 34, 4, 0x0a0f1e, 80, 28, Z_BOX);
    E.text('← Voltar', 12, 0x5566aa, 80, 28, Z_TXT);
    this._addNav({ gx:80, gy:28, w:138, h:34, box:bkBox, bc:0x0a0f1e,
      action: () => this._back() });

    this._setupMouse();
    this._setupJoinOverlay();
    this._buildMenu();
  }

  // ── Menu principal ──────────────────────────────────────────────
  _buildMenu() {
    this._clearDyn();
    const E = this.e;

    // Subtítulo
    this._t2('Jogue com qualquer pessoa no mundo', 12, 0x3d5577, 640, 100);

    // ── Card CRIAR SALA (esquerda) ──────────────────────────────
    const cx1 = 320;
    // Borda do card
    E.plane(404, 264, 0x1a3d6a, cx1, 310, Z_BG+1);
    // Fundo do card
    E.plane(400, 260, 0x080f20, cx1, 310, Z_BG+2);
    this._dynObjs.push(
      // Linha de topo colorida
      E.plane(400, 4, 0x2255cc, cx1, 182, Z_BOX-1),
      // Ícone decorativo
      E.plane(64, 64, 0x0d2040, cx1, 220, Z_BOX-1),
    );
    this._t2('CRIAR SALA',         20, 0x55bbff, cx1, 296);
    this._t2('Gere um codigo e',    9, 0x2a4466, cx1, 332);
    this._t2('convide seus amigos', 9, 0x2a4466, cx1, 350);
    this._t2('+',                  28, 0x2255cc, cx1, 220);

    // Botão clicável sobreposto ao card
    const c1Box = E.box(400, 260, 4, 0x080f20, cx1, 310, Z_BOX);
    c1Box.material.transparent = true; c1Box.material.opacity = 0.01;
    this._dynObjs.push(c1Box);
    this._addDynBtn({ gx:cx1, gy:310, w:400, h:260, box:c1Box, bc:0x080f20,
      action: () => this._createRoom() });

    // ── Card ENTRAR EM SALA (direita) ───────────────────────────
    const cx2 = 960;
    E.plane(404, 264, 0x0d4030, cx2, 310, Z_BG+1);
    E.plane(400, 260, 0x050e0b, cx2, 310, Z_BG+2);
    this._dynObjs.push(
      E.plane(400, 4, 0x118855, cx2, 182, Z_BOX-1),
      E.plane(64, 64, 0x082a1e, cx2, 220, Z_BOX-1),
    );
    this._t2('ENTRAR EM SALA',     20, 0x44ee99, cx2, 296);
    this._t2('Digite o codigo',     9, 0x226644, cx2, 332);
    this._t2('de 6 caracteres',     9, 0x226644, cx2, 350);
    this._t2('→',                  28, 0x118855, cx2, 220);

    const c2Box = E.box(400, 260, 4, 0x050e0b, cx2, 310, Z_BOX);
    c2Box.material.transparent = true; c2Box.material.opacity = 0.01;
    this._dynObjs.push(c2Box);
    this._addDynBtn({ gx:cx2, gy:310, w:400, h:260, box:c2Box, bc:0x050e0b,
      action: () => this._openJoinOverlay() });

    // Nota inferior
    this._t2('Rede local: mesma rede Wi-Fi   |   Internet: use o link ngrok',
             10, 0x1a2a3a, 640, 630);
  }

  // ── Lobby Host ──────────────────────────────────────────────────
  _buildHostLobby(code) {
    this._clearDyn();
    const E = this.e;

    this._t2('Sala criada! Compartilhe o codigo abaixo:', 13, 0x4477aa, 640, 100);

    // Caixa do código — fundo escuro fino
    E.plane(440, 2,  0x1a3d7a, 640, 138, Z_BOX);
    E.plane(440, 100, 0x060d1e, 640, 196, Z_BG+2);
    E.plane(440, 2,  0x1a3d7a, 640, 248, Z_BOX);
    this._dynObjs.push(
      E.plane(440, 104, 0x0d1e3a, 640, 196, Z_BG+1),
    );
    // Código em letras grandes
    this._t2(code, 62, 0x44aaff, 640, 196);

    // Botão copiar
    const cpBox = E.box(200, 32, 4, 0x0a1628, 640, 268, Z_BOX);
    this._t2('📋 Copiar', 12, 0x5588bb, 640, 268);
    this._dynObjs.push(cpBox);
    this._addDynBtn({ gx:640, gy:268, w:200, h:32, box:cpBox, bc:0x0a1628,
      action: () => {
        navigator.clipboard?.writeText(code).catch(()=>{});
        this.e.remove(cpBox);
        const ok = E.box(200, 32, 4, 0x0a2010, 640, 268, Z_BOX);
        this._t2('✓ Copiado!', 12, 0x44ee88, 640, 268);
        this._dynObjs.push(ok);
        setTimeout(() => { this.e.remove(ok); }, 2000);
      }
    });

    // Separador
    E.plane(560, 1, 0x1a2a3a, 640, 300, Z_BOX);

    // Jogadores
    this._t2('Jogadores na sala:', 11, 0x334455, 640, 322);
    this._listSp = this._t2('aguardando...', 12, 0x334466, 640, 346);
    this._refreshPlayerList();

    // IP / Ngrok
    this._ipSp = this._t2('Buscando endereco...', 10, 0x1f2f3f, 640, 390);

    // Separador
    E.plane(560, 1, 0x1a2a3a, 640, 416, Z_BOX);

    // ── Escolha de modo ──────────────────────────────────────────
    this._t2('Escolha o modo:', 11, 0x334455, 640, 436);

    // Linha 1: CAMPANHA | LAZER | PVP
    const modes = [
      { label:'⚔  CAMPANHA', x:220, bc:0x0a1a10, hc:0x0d3020, tc:0x44ee88,
        action: () => { this._net.startGame(1, 'GameScene', 'online'); this._startGame({ level:1, scene:'GameScene', mode:'online' }); } },
      { label:'🎮  LAZER',   x:640, bc:0x0a0d20, hc:0x0d1a40, tc:0x55aaff,
        action: () => { this._state='choosingMinigame'; this._buildMinigameSelector(); } },
      { label:'🥊  PVP',     x:1060, bc:0x200a0a, hc:0x3d0d0d, tc:0xff6655,
        action: () => { this._net.startGame(0, 'PVPScene', 'online'); this._startGame({ level:0, scene:'PVPScene', mode:'online' }); } },
    ];
    modes.forEach(({ label, x, bc, hc, tc, action }) => {
      E.plane(244, 66, hc, x, 476, Z_BG+2);
      E.plane(240, 62, bc, x, 476, Z_BG+1);
      const btn = E.box(240, 62, 4, bc, x, 476, Z_BOX);
      btn.material.transparent = true; btn.material.opacity = 0.01;
      this._t2(label, 13, tc, x, 476);
      this._dynObjs.push(btn);
      this._addDynBtn({ gx:x, gy:476, w:240, h:62, box:btn, bc, action });
    });

    // Linha 2: BOSS RAID (largura total, destaque roxo)
    E.plane(564, 54, 0x3a1040, 640, 548, Z_BG+2);
    E.plane(560, 50, 0x200a20, 640, 548, Z_BG+1);
    const raidBtn = E.box(560, 50, 4, 0x200a20, 640, 548, Z_BOX);
    raidBtn.material.transparent = true; raidBtn.material.opacity = 0.01;
    this._t2('⚡  BOSS RAID', 14, 0xff66ff, 640, 548);
    this._dynObjs.push(raidBtn);
    this._addDynBtn({ gx:640, gy:548, w:560, h:50, box:raidBtn, bc:0x200a20,
      action: () => {
        this._net.startGame(1, 'GameScene', 'raid');
        this._startGame({ level:1, scene:'GameScene', mode:'raid' });
      }
    });

    // Botão cancelar
    const cnBox = E.box(160, 28, 4, 0x150505, 640, 614, Z_BOX);
    this._t2('Cancelar sala', 10, 0x663333, 640, 614);
    this._dynObjs.push(cnBox);
    this._addDynBtn({ gx:640, gy:614, w:160, h:28, box:cnBox, bc:0x150505,
      action: () => { this._state='menu'; this._buildMenu(); }
    });
  }

  // ── Lobby Waiting (cliente) ────────────────────────────────────
  _buildWaitingLobby(code) {
    this._clearDyn();
    const E = this.e;

    this._t2('Voce entrou na sala:', 13, 0x4477aa, 640, 100);

    // Código menor
    E.plane(280, 66, 0x060d1e, 640, 175, Z_BG+2);
    E.plane(284, 70, 0x0d1e3a, 640, 175, Z_BG+1);
    this._t2(code, 40, 0x44aaff, 640, 175);

    // Status
    E.plane(400, 64, 0x060f06, 640, 286, Z_BG+2);
    E.plane(404, 68, 0x0a2a0a, 640, 286, Z_BG+1);
    this._t2('Aguardando o host', 15, 0x44ee88, 640, 272);
    this._t2('iniciar o jogo...', 11, 0x227744, 640, 298);

    E.plane(560, 1, 0x1a2a3a, 640, 330, Z_BOX);
    this._t2('Jogadores na sala:', 11, 0x334455, 640, 352);
    this._listSp = this._t2('carregando...', 12, 0x334466, 640, 376);
    this._refreshPlayerList();

    // Sair
    const lvBox = E.box(160, 28, 4, 0x150505, 640, 580, Z_BOX);
    this._t2('Sair da sala', 11, 0x663333, 640, 580);
    this._dynObjs.push(lvBox);
    this._addDynBtn({ gx:640, gy:580, w:160, h:28, box:lvBox, bc:0x150505,
      action: () => { this._state='menu'; this._buildMenu(); }
    });
  }

  // ── Helpers UI ─────────────────────────────────────────────────

  /** Texto rastreado em _dynObjs, sempre no Z_TXT */
  _t2(str, size, color, x, y) {
    const sp = this.e.text(str, size, color, x, y, Z_TXT);
    this._dynObjs.push(sp);
    return sp;
  }

  // ── Ações de rede ──────────────────────────────────────────────

  async _createRoom() {
    this._clearDyn();
    this._t2('Conectando...', 16, 0x4488ff, 640, 360);

    const net = await getNetwork();
    if (!net) {
      this._clearDyn();
      this._t2('Servidor offline.', 18, 0xff5544, 640, 320);
      this._t2('Execute:  npm start', 12, 0x556677, 640, 360);
      const rb = this.e.box(200, 36, 4, 0x0d1020, 640, 430, Z_BOX);
      this._t2('Tentar novamente', 12, 0x4488ff, 640, 430);
      this._dynObjs.push(rb);
      this._addDynBtn({ gx:640, gy:430, w:200, h:36, box:rb, bc:0x0d1020,
        action: () => this._buildMenu() });
      return;
    }

    this._net = net;
    const res = await net.createRoom(SaveSystem.getPlayerName() || 'Player');
    if (!res.ok) {
      this._clearDyn();
      this._t2('Erro ao criar sala.', 16, 0xff5544, 640, 360);
      setTimeout(() => this._buildMenu(), 2500);
      return;
    }

    this._state = 'hosting';
    this._buildHostLobby(res.code);

    net.bindRoom({
      onJoined:    () => this._refreshPlayerList(),
      onLeft:      () => this._refreshPlayerList(),
      onStartGame: d  => this._startGame(d),
    });

    net.getRoomInfo().then(info => {
      if (!this._ipSp) return;
      this.e.remove(this._ipSp);
      this._dynObjs = this._dynObjs.filter(o => o !== this._ipSp);
      const url = info.ngrokUrl
        ? `Internet: ${info.ngrokUrl}`
        : `Rede local: http://${info.ip}:${info.port||3000}`;
      const col = info.ngrokUrl ? 0x337755 : 0x2a4466;
      this._ipSp = this._t2(url, 10, col, 640, 390);
    });
  }

  _refreshPlayerList() {
    if (!this._net || !this._listSp) return;
    this.e.remove(this._listSp);
    this._dynObjs = this._dynObjs.filter(o => o !== this._listSp);
    const players = this._net.getPlayers();
    const y = this._state === 'hosting' ? 346 : 376;
    const txt = players.length
      ? players.map(p => p.name || 'Jogador').join('   ·   ')
      : 'Aguardando jogadores...';
    const col = players.length ? 0x6688aa : 0x2a3a4a;
    this._listSp = this._t2(txt, 12, col, 640, y);
  }

  // ── Overlay HTML ────────────────────────────────────────────────
  _setupJoinOverlay() {
    this._overlay   = document.getElementById('join-overlay');
    this._codeInput = document.getElementById('join-code-input');
    this._errEl     = document.getElementById('join-error');

    const confirmBtn = document.getElementById('join-confirm-btn');
    const cancelBtn  = document.getElementById('join-cancel-btn');

    this._confirmH = () => this._doJoin();
    this._cancelH  = () => this._closeJoinOverlay();
    this._inputKH  = e => { if (e.key === 'Enter') this._doJoin(); };
    this._upperH   = () => {
      const p = this._codeInput.selectionStart;
      this._codeInput.value = this._codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
      this._codeInput.setSelectionRange(p, p);
    };

    confirmBtn.addEventListener('click',    this._confirmH);
    cancelBtn.addEventListener('click',     this._cancelH);
    this._codeInput.addEventListener('keydown', this._inputKH);
    this._codeInput.addEventListener('input',   this._upperH);
  }

  _openJoinOverlay() {
    this._codeInput.value = '';
    this._errEl.textContent = '';
    this._overlay.classList.add('active');
    this._codeInput.focus();
  }

  _closeJoinOverlay() {
    this._overlay?.classList.remove('active');
  }

  async _doJoin() {
    const code = this._codeInput.value.trim().toUpperCase();
    if (code.length < 4) { this._errEl.textContent = 'Codigo muito curto'; return; }

    const btn = document.getElementById('join-confirm-btn');
    this._errEl.textContent = 'Conectando...';
    btn.disabled = true;

    const net = await getNetwork();
    if (!net) { this._errEl.textContent = 'Servidor offline'; btn.disabled = false; return; }

    const res = await net.joinRoom(code, SaveSystem.getPlayerName() || 'Player');
    btn.disabled = false;

    if (!res.ok) { this._errEl.textContent = res.error || 'Sala nao encontrada'; return; }

    this._net = net;
    this._closeJoinOverlay();
    this._state = 'waiting';
    this._buildWaitingLobby(res.code);

    net.bindRoom({
      onJoined:    () => this._refreshPlayerList(),
      onLeft:      () => this._refreshPlayerList(),
      onStartGame: d  => this._startGame(d),
    });
  }

  // ── Seletor de Minigame ────────────────────────────────────────
  _buildMinigameSelector() {
    this._clearDyn();
    const E = this.e;
    this._t2('ESCOLHA O MINIGAME:', 18, 0xffcc00, 640, 80);

    const games = [
      { label: '⚽  Football', x: 200, bc: 0x0a1a05, hc: 0x0d3010, tc: 0x44ee88,
        action: () => this._buildVoteScreen(
          [{ name: 'Arena Clássica' }, { name: 'Campo com Muros' }],
          'FootballScene'
        )
      },
      { label: '⛏  Minecraft', x: 640, bc: 0x0a1a0a, hc: 0x163a16, tc: 0x88dd44,
        action: () => {
          this._net.socket.emit('startGame', { scene: 'MinecraftScene', mode: 'online' });
          this._startGame({ scene: 'MinecraftScene', mode: 'online' });
        }
      },
      { label: '🏎  Racing',   x: 1080, bc: 0x1a0a00, hc: 0x3a1800, tc: 0xffaa44,
        action: () => this._buildVoteScreen(
          [{ name: 'Oval Clássico' }, { name: 'Cidade' }],
          'RacingScene'
        )
      },
    ];

    games.forEach(({ label, x, bc, hc, tc, action }) => {
      E.plane(264, 264, hc, x, 310, Z_BG+2);
      E.plane(260, 260, bc, x, 310, Z_BG+1);
      const btn = E.box(260, 260, 4, bc, x, 310, Z_BOX);
      btn.material.transparent = true; btn.material.opacity = 0.01;
      this._t2(label, 14, tc, x, 310);
      this._dynObjs.push(btn);
      this._addDynBtn({ gx: x, gy: 310, w: 260, h: 260, box: btn, bc, action });
    });

    const bk = E.box(160, 30, 4, 0x150505, 640, 560, Z_BOX);
    this._t2('← Voltar', 11, 0x663333, 640, 560);
    this._dynObjs.push(bk);
    this._addDynBtn({ gx: 640, gy: 560, w: 160, h: 30, box: bk, bc: 0x150505,
      action: () => { this._state = 'hosting'; this._buildHostLobby(this._net.roomCode); }
    });
  }

  // ── Tela de Votação de Mapa ────────────────────────────────────
  _buildVoteScreen(maps, scene) {
    this._clearDyn();
    const E = this.e;
    this._t2('VOTE NO MAPA:', 18, 0xffcc00, 640, 80);

    maps.forEach((map, i) => {
      const gx = maps.length === 2 ? (i === 0 ? 350 : 930) : 300 + i * 300;
      const gy = 280;
      E.plane(284, 164, 0x112244, gx, gy, Z_BG+2);
      const btn = E.box(280, 160, 4, 0x0a1630, gx, gy, Z_BOX);
      btn.material.transparent = true; btn.material.opacity = 0.01;
      this._t2(map.name || `Mapa ${i+1}`, 14, 0xffffff, gx, gy - 20);
      this._dynObjs.push(btn);
      this._addDynBtn({ gx, gy, w: 280, h: 160, box: btn, bc: 0x0a1630,
        action: () => {
          this._net.voteMap(i);
          this._showMsg?.(`Você votou: ${map.name || `Mapa ${i+1}`}`, 1500);
        }
      });
    });

    this._voteSp = this._t2('Aguardando votos...', 12, 0x4488ff, 640, 430);

    this._net.onVotesUpdated(({ votes }) => {
      if (!this._voteSp) return;
      this.e.remove(this._voteSp);
      this._dynObjs = this._dynObjs.filter(o => o !== this._voteSp);
      const counts = {};
      Object.values(votes).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const txt = maps.map((m, i) => `${m.name || `Mapa${i}`}: ${counts[i] || 0}v`).join('  |  ');
      this._voteSp = this._t2(txt, 10, 0x4488ff, 640, 430);
    });

    // Só host confirma
    if (this._net.isHost?.()) {
      const cfm = E.box(260, 44, 4, 0x0a2010, 640, 520, Z_BOX);
      this._t2('✓ CONFIRMAR MAPA MAIS VOTADO', 11, 0x44ee88, 640, 520);
      this._dynObjs.push(cfm);
      this._addDynBtn({ gx: 640, gy: 520, w: 260, h: 44, box: cfm, bc: 0x0a2010,
        action: () => { this._net.startWithVote(0, scene, 'online'); }
      });
    } else {
      this._t2('Aguardando host confirmar...', 11, 0x445566, 640, 520);
    }

    const bk = E.box(160, 30, 4, 0x150505, 640, 590, Z_BOX);
    this._t2('← Voltar', 11, 0x663333, 640, 590);
    this._dynObjs.push(bk);
    this._addDynBtn({ gx: 640, gy: 590, w: 160, h: 30, box: bk, bc: 0x150505,
      action: () => { this._state = 'hosting'; this._buildHostLobby(this._net.roomCode); }
    });
  }

  _startGame(data = {}) {
    this._closeJoinOverlay();
    const scene = data.scene || 'GameScene';
    const level = data.level || 1;
    const code  = data.code || this._net?.roomCode || null;
    this.m.start(scene, { level, mode: data.mode || 'online', skipRoom: true, code });
  }

  _back() {
    if (this._state !== 'menu') { this._state = 'menu'; this._buildMenu(); }
    else { this._closeJoinOverlay(); this.m.start('ModeScene'); }
  }

  // ── Gestão de botões / objetos ──────────────────────────────────
  _addNav(btn) {
    btn.baseColor = btn.bc;
    this._navBtns.push(btn);
    this._btnPool.push(btn);
  }
  _addDynBtn(btn) {
    btn.baseColor = btn.bc;
    this._btnPool.push(btn);
  }
  _clearDyn() {
    this._dynObjs.forEach(o => this.e.remove(o));
    this._dynObjs = [];
    this._btnPool = [...this._navBtns];
    this._listSp = null;
    this._ipSp   = null;
    this._voteSp = null;
    // Limpa listener de votos ao trocar de tela
    this._net?.socket?.off('votesUpdated');
  }

  // ── Mouse ───────────────────────────────────────────────────────
  _setupMouse() {
    const cv = this.e.renderer.domElement;
    this._moveH = ev => {
      const { gx, gy } = this._toGame(ev);
      let hov = false;
      this._btnPool.forEach(b => {
        const hit = this._hit(gx, gy, b);
        if (b.box?.material?.color)
          b.box.material.color.set(hit ? this._lighten(b.baseColor) : b.baseColor);
        if (hit) hov = true;
      });
      cv.style.cursor = hov ? 'pointer' : 'default';
    };
    this._clickH = ev => {
      const { gx, gy } = this._toGame(ev);
      [...this._btnPool].forEach(b => { if (this._hit(gx, gy, b)) b.action(); });
    };
    cv.addEventListener('mousemove', this._moveH);
    cv.addEventListener('click',     this._clickH);
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
    return (Math.min(((c>>16)&0xff)+50,255)<<16) |
           (Math.min(((c>> 8)&0xff)+50,255)<< 8) |
            Math.min( (c     &0xff)+50,255);
  }

  update() { if (this.inp.justDown('Escape')) this._back(); }

  destroy() {
    const cv = this.e.renderer.domElement;
    if (this._moveH)  cv.removeEventListener('mousemove', this._moveH);
    if (this._clickH) cv.removeEventListener('click',     this._clickH);
    cv.style.cursor = 'default';
    this._closeJoinOverlay();
    const cb = document.getElementById('join-confirm-btn');
    const cc = document.getElementById('join-cancel-btn');
    cb?.removeEventListener('click',    this._confirmH);
    cc?.removeEventListener('click',    this._cancelH);
    this._codeInput?.removeEventListener('keydown', this._inputKH);
    this._codeInput?.removeEventListener('input',   this._upperH);
  }
}
