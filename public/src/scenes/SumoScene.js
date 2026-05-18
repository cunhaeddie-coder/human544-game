// ── Sumô — Empurre o oponente para fora da plataforma ────────────
// Plataforma circular que encolhe com o tempo | P1: A/D/W  P2: J/L/I

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class SumoScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics = new Physics2D();
    this._players = [];
    this._state = 'countdown';
    this._cd = 3; this._cdTimer = 1; this._cdSp = null;
    this._platR = 340; // raio inicial da plataforma (pixels)
    this._platMesh = null;
    this._t = 0;
    this._wins = [0, 0]; this._winSp = null;
    this._round = 1;
  }

  create(data = {}) {
    const E = this.e;
    this.physics.setGravity(700);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    E.plane(1280, 720, 0x0a0a1a, 640, 360, -400);
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text('SUMO', 18, 0xffc400, 640, 22, 5);
    E.text('P1: A/D W', 9, 0x4488ff, 120, 22, 5);
    E.text('P2: J/L I', 9, 0xff4444, 1160, 22, 5);

    this._winSp = E.text('P1: 0  P2: 0  | Round 1', 12, 0xffffff, 640, 22, 8);

    // Arena central
    this._platR = 300;
    this._platMesh = E.box(this._platR*2, 28, 60, 0x4a3a1a, 640, 508+14, 0);
    this._platMesh.material.emissive = new THREE.Color(0x221a08);
    this._platMesh.material.emissiveIntensity = 0.5;
    this._ground = new Body(640 - this._platR, 508, this._platR*2, 28);
    this.physics.addStatic(this._ground);

    // Decorações da arena
    E.box(this._platR*2, 6, 62, 0xcc8800, 640, 508, 1);

    // Players
    this._spawnPlayers();

    this._state = 'countdown';
    this._cdSp = E.text('3', 72, 0xffc400, 640, 300, 50);
  }

  _spawnPlayers() {
    this._players.forEach(p => { p?.sprite?.destroy(); this.physics.remove(p.body); });
    this._players = [];
    this._spawnPlayer(0, 500, 460, SaveSystem.getActiveSkin() || 'default', 'P1');
    this._spawnPlayer(1, 780, 460, 'warrior', 'P2');
  }

  _spawnPlayer(idx, x, y, skin, label) {
    const body = new Body(x-14, y-42, 28, 42);
    this.physics.addBody(body);
    const sprite = new CharacterSprite(this.e.scene, x, y, skin, label);
    this._players[idx] = { idx, body, sprite, dir: idx===0?1:-1, _walkT:0, alive:true };
  }

  _updateGround() {
    this.physics.remove(this._ground);
    this._ground = new Body(640 - this._platR, 508, this._platR*2, 28);
    this.physics.addStatic(this._ground);
    this._platMesh.scale.x = (this._platR*2) / ((this._platR+100)*2 / (this._platR+100));
    // Simpler: directly set mesh scale based on ratio
    const origW = 600; // initial platR*2
    this._platMesh.scale.x = (this._platR * 2) / origW;
  }

  _checkFall() {
    this._players.forEach((p, i) => {
      if (!p.alive) return;
      const cx = p.body.cx;
      if (cx < 640 - this._platR - 30 || cx > 640 + this._platR + 30 || p.body.y > 620) {
        p.alive = false;
        this.e.remove({ position: { set(){} } }); // dummy
        p.sprite.setVisible(false);
        this._wins[1-i]++;
        this._endRound();
      }
    });
  }

  _endRound() {
    this._state = 'roundover';
    const winner = this._players[0].alive ? 'P1' : 'P2';
    const score = `P1:${this._wins[0]} P2:${this._wins[1]}`;
    if (this._wins[0] >= 3 || this._wins[1] >= 3) {
      this._state = 'gameover';
      const winnerIdx = this._wins[0] >= 3 ? 0 : 1;
      SaveSystem.recordScore('sumo', this._wins[winnerIdx] * 100 + this._round * 10);
      const sp = this.e.text(`${winner} VENCEU!\n${score}\nENTER para voltar`, 22, 0xffc400, 640, 280, 50);
    } else {
      const sp = this.e.text(`${winner} venceu o round!\n${score}`, 18, 0xffc400, 640, 280, 50);
      setTimeout(() => {
        this.e.remove(sp);
        this._round++;
        this._platR = 300;
        this._updateGround();
        this._spawnPlayers();
        this.e.remove(this._winSp);
        this._winSp = this.e.text(`P1:${this._wins[0]}  P2:${this._wins[1]} | Round ${this._round}`, 12, 0xffffff, 640, 22, 8);
        this._state = 'countdown';
        this._cd = 2; this._cdTimer = 1;
        this._cdSp = this.e.text('2', 72, 0xffc400, 640, 300, 50);
      }, 2200);
    }
  }

  _movePlayer(p, idx, moveL, moveR, jumpKey, dt) {
    if (!p || !p.alive) return;
    const b = p.body, inp = this.inp;
    let vx = 0;
    if (inp.isDown(moveL)) { vx = -200; p.dir = -1; }
    if (inp.isDown(moveR)) { vx =  200; p.dir =  1; }
    b.vx = vx;
    if (inp.justDown(jumpKey) && b.onGround) b.vy = -420;
    if (b.onGround && Math.abs(b.vx) > 10) p._walkT += dt*8;
    let state = b.onGround ? (Math.abs(b.vx)>10 ? (Math.sin(p._walkT)>0?'walk1':'walk2') : 'idle') : (b.vy<0?'jump':'fall');
    p.sprite.animate(b.cx, b.cy, p.dir, p.dir, 0, state, 'standard');

    // Impulso ao colidir com outro player (sumô)
    const other = this._players[1-idx];
    if (other?.alive && this.physics.overlaps(b, other.body)) {
      const dir = Math.sign(other.body.cx - b.cx) || 1;
      other.body.vx += dir * 180 + vx * 0.4;
      other.body.vy -= 40;
    }
  }

  update(dt) {
    this._t += dt;
    this.physics.step(dt);

    if (this._state === 'countdown') {
      this._cdTimer -= dt;
      if (this._cdTimer <= 0) {
        this._cd--;  this._cdTimer = 1;
        this.e.remove(this._cdSp);
        if (this._cd > 0) this._cdSp = this.e.text(`${this._cd}`, 72, 0xffc400, 640, 300, 50);
        else { this._cdSp = this.e.text('LUTE!', 60, 0x00e676, 640, 300, 50); setTimeout(()=>{ this.e.remove(this._cdSp); this._cdSp=null; }, 700); this._state='playing'; }
      }
      this._players.forEach(p => p?.alive && p.sprite.animate(p.body.cx, p.body.cy, p.dir, p.dir, 0, 'idle', 'standard'));
      return;
    }

    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter') || this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }

    if (this._state !== 'playing') return;

    // Plataforma encolhe gradualmente
    if (this._platR > 80) {
      const shrinkRate = 10 + this._t * 0.5; // acelera com o tempo
      this._platR -= shrinkRate * dt;
      this._updateGround();
    }

    this._movePlayer(this._players[0], 0, 'KeyA', 'KeyD', 'KeyW', dt);
    this._movePlayer(this._players[1], 1, 'KeyJ', 'KeyL', 'KeyI', dt);

    this._checkFall();

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy() {
    this._players.forEach(p => p?.sprite?.destroy());
    this.physics.clear();
  }
}
