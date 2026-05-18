// ── Sobrevivência — Plataformas caem, último de pé vence ─────────
// P1: A/D mover  W pular
// P2: ←/→ mover  ↑ pular
// Funciona em solo (1 jogador) ou duelo (2 jogadores)

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const PW = 160, PT = 18, PD = 36; // largura, espessura, profundidade das plataformas

// Grade de plataformas — (cx, surfaceY)
// Gaps de ~110px entre fileiras; com pulo -500 e g=520, altura max ≈ 240px → seguro
const GRID = [
  // Fila alta (y=240)
  { x:110,  y:240 }, { x:330,  y:240 }, { x:550,  y:240 },
  { x:770,  y:240 }, { x:990,  y:240 }, { x:1180, y:240 },
  // Fila média (y=360, gap=120px da baixa)
  { x:220,  y:360 }, { x:440,  y:355 }, { x:660,  y:360 },
  { x:880,  y:355 }, { x:1100, y:360 },
  // Fila baixa (spawn, y=470)
  { x:110,  y:470 }, { x:330,  y:470 }, { x:550,  y:470 },
  { x:770,  y:470 }, { x:990,  y:470 }, { x:1180, y:470 },
];

export class SurvivalScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics    = new Physics2D();
    this._plats     = [];
    this._players   = [];
    this._state     = 'countdown'; // countdown | playing | gameover
    this._t         = 0;           // tempo de jogo
    this._countdown = 3;
    this._cdTimer   = 1.0;
    this._nextFall  = 0;
    this._fallInt   = 3.0;
    this._lastSec   = -1;
    this._timeSp    = null;
    this._msgSp     = null;
    this._cdSp      = null;
    this._numPlayers= 2;
  }

  create(data = {}) {
    this._numPlayers = data.players ?? 2;
    const E = this.e;

    this.physics.setGravity(520);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    // Fundo estrelado
    E.plane(1280, 720, 0x050510, 640, 360, -400);
    for (let i = 0; i < 90; i++) {
      const b = E.box(
        Math.random() < 0.15 ? 3 : 1.5,
        Math.random() < 0.15 ? 3 : 1.5,
        1, 0xffffff,
        Math.random() * 1280, Math.random() * 720, -300 + Math.random() * 60
      );
      b.material.transparent = true;
      b.material.opacity = 0.15 + Math.random() * 0.75;
    }

    // Header
    E.plane(1280, 44, 0x0d0a22, 640, 22, -390);
    E.text('SOBREVIVENCIA', 16, 0xff4757, 640, 22, 5);
    E.text('P1: A/D  W', 9, 0x4488ff, 120, 22, 5);
    if (this._numPlayers >= 2) E.text('P2: ←/→  ↑', 9, 0xff4444, 1160, 22, 5);

    // Void (abismo vermelho no fundo)
    E.plane(1280, 60, 0x330000, 640, 690, -100, 0.85);

    // Plataformas
    GRID.forEach((pos, idx) => {
      const surfY = pos.y;
      const body  = new Body(pos.x - PW/2, surfY, PW, PT);
      this.physics.addStatic(body);

      const mesh = E.box(PW, PT, PD, 0x223366, pos.x, surfY + PT/2, 0);
      mesh.material.emissive = new THREE.Color(0x112244);
      mesh.material.emissiveIntensity = 0.5;

      const top = E.box(PW - 2, 4, PD + 2, 0x3366cc, pos.x, surfY, 1);

      this._plats.push({
        idx, cx: pos.x, surfY,
        body, mesh, top,
        state: 'normal',
        warnTimer: 0,
        vy: 0,
        fy: surfY,
      });
    });

    // Jogadores
    this._spawnPlayer(0, 330, 425, 0x4488ff, 'P1');
    if (this._numPlayers >= 2) this._spawnPlayer(1, 990, 425, 0xff4444, 'P2');

    // Timer display
    this._timeSp = E.text('0s', 12, 0xffffff, 690, 22, 8);

    // Countdown
    this._cdSp = E.text(`${this._countdown}`, 72, 0xffc400, 640, 330, 50);
    this._state   = 'countdown';
    this._nextFall = 2.5;
  }

  _spawnPlayer(idx, x, y, color, label) {
    const body = new Body(x - 14, y - 42, 28, 42);
    this.physics.addBody(body);

    const mesh = this.e.box(28, 42, 18, color, x, y - 21, 5);
    mesh.material.emissive = new THREE.Color(color);
    mesh.material.emissiveIntensity = 0.3;

    const lbl = this.e.text(label, 11, color, x, y - 62, 8);

    this._players[idx] = { idx, body, mesh, lbl, color, alive: true };
  }

  // ── Lógica de queda ──────────────────────────────────────────

  _pickFalling() {
    const avail = this._plats.filter(p => p.state === 'normal');
    if (!avail.length) return;
    const target = avail[Math.floor(Math.random() * avail.length)];
    target.state     = 'warning';
    target.warnTimer = 1.5;
  }

  _updatePlats(dt) {
    this._plats.forEach(p => {
      if (p.state === 'warning') {
        p.warnTimer -= dt;

        // Flicker vermelho
        const flash = Math.sin(this._t * 22) > 0;
        p.mesh.material.color.set(flash ? 0xff2200 : 0x334488);
        p.mesh.material.emissive.set(flash ? 0x550000 : 0x112244);
        p.top.material.color.set(flash ? 0xff4400 : 0x3366cc);

        // Tremor lateral
        const shk = (Math.random() - 0.5) * 4;
        p.mesh.position.x = p.cx + shk;
        p.top.position.x  = p.cx + shk;

        if (p.warnTimer <= 0) {
          p.state = 'falling';
          p.vy    = 0;
          p.fy    = p.surfY;
          this.physics.remove(p.body);
          p.mesh.material.color.set(0x880000);
          p.mesh.material.emissive.set(0x330000);
        }

      } else if (p.state === 'falling') {
        p.vy += 900 * dt;
        p.fy += p.vy * dt;
        p.mesh.position.set(p.cx, -(p.fy + PT/2), 0);
        p.top.position.set(p.cx, -p.fy, 1);
        if (p.fy > 800) p.state = 'gone';
      }
    });
  }

  // ── Input jogadores ──────────────────────────────────────────

  _handlePlayer(p, moveL, moveR, jumpKey) {
    if (!p || !p.alive) return;
    const b = p.body, inp = this.inp;
    let vx = 0;
    if (inp.isDown(moveL)) vx = -220;
    if (inp.isDown(moveR)) vx =  220;
    b.vx = vx;
    if (inp.justDown(jumpKey) && b.onGround) b.vy = -500;

    p.mesh.position.set(b.cx, -b.cy, 5);
    p.lbl.position.set(b.cx, -(b.cy - 44), 8);

    // Morreu por queda
    if (b.y > 620 && p.alive) this._killPlayer(p);
  }

  _killPlayer(p) {
    p.alive = false;
    this.e.remove(p.mesh);
    this.e.remove(p.lbl);
    this._checkEnd();
  }

  _checkEnd() {
    const alive = this._players.filter(p => p?.alive);
    const total = this._players.filter(Boolean).length;

    if (total === 1) {
      // Solo: não há como "vencer" contra si mesmo, continua até cair
      if (alive.length === 0) this._gameOver(`VOCE SOBREVIVEU ${Math.floor(this._t)}s!`);
      return;
    }

    // Duelo
    if (alive.length === 0) {
      this._gameOver(`EMPATE!`);
    } else if (alive.length === 1) {
      const name = alive[0].idx === 0 ? 'P1' : 'P2';
      this._gameOver(`${name} VENCEU!`);
    }
  }

  _gameOver(msg) {
    this._state = 'gameover';
    if (this._msgSp) this.e.remove(this._msgSp);
    const survived = Math.floor(this._t);
    SaveSystem.recordScore('survival', survived * 10);
    const full = `${msg}\n${survived}s sobrevividos\n\nENTER / ESC para voltar`;
    this._msgSp = this.e.text(full, 20, 0xffc400, 640, 330, 50);
  }

  // ── Update principal ─────────────────────────────────────────

  update(dt) {
    // ── Countdown ─────────────────────────────────────────────
    if (this._state === 'countdown') {
      this._cdTimer -= dt;
      if (this._cdTimer <= 0) {
        this._countdown--;
        this._cdTimer = 1.0;
        this.e.remove(this._cdSp);
        if (this._countdown > 0) {
          this._cdSp = this.e.text(`${this._countdown}`, 72, 0xffc400, 640, 330, 50);
        } else {
          this._cdSp = this.e.text('VAI!', 60, 0x00e676, 640, 330, 50);
          setTimeout(() => { this.e.remove(this._cdSp); this._cdSp = null; }, 700);
          this._state = 'playing';
        }
      }
      // Física roda mas input ignorado no countdown
      this.physics.step(dt);
      this._players.forEach(p => {
        if (!p) return;
        p.mesh.position.set(p.body.cx, -p.body.cy, 5);
        p.lbl.position.set(p.body.cx, -(p.body.cy - 44), 8);
      });
      return;
    }

    // ── Game Over ─────────────────────────────────────────────
    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter') || this.inp.justDown('Escape')) {
        this.m.start('LeisureScene');
      }
      return;
    }

    // ── Playing ───────────────────────────────────────────────
    this._t += dt;
    this.physics.step(dt);

    // Atualiza timer (só quando o segundo muda)
    const sec = Math.floor(this._t);
    if (sec !== this._lastSec) {
      this._lastSec = sec;
      this.e.remove(this._timeSp);
      this._timeSp = this.e.text(`${sec}s`, 12, 0xffffff, 690, 22, 8);
    }

    // Spawn plataforma caindo
    this._nextFall -= dt;
    if (this._nextFall <= 0) {
      this._pickFalling();
      // Intervalo diminui agressivamente com o tempo (mín 0.3s)
      this._fallInt  = Math.max(0.3, 3.0 - this._t * 0.08);
      this._nextFall = this._fallInt;
    }

    this._updatePlats(dt);

    // Input jogadores
    this._handlePlayer(this._players[0], 'KeyA', 'KeyD', 'KeyW');
    this._handlePlayer(this._players[1], 'ArrowLeft', 'ArrowRight', 'ArrowUp');

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy() {
    this.physics.clear();
  }
}
