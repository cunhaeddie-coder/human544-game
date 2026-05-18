// ── Desvio — Desvie de objetos caindo, último de pé vence ─────────
// P1: A/D  P2: J/L | Objetos caem do topo em velocidade crescente

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const FLOOR_Y   = 508;
const SPAWN_TOP = 50;

export class DodgeScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics  = new Physics2D();
    this._players = [];
    this._rocks   = [];
    this._t       = 0;
    this._nextRock = 0.8;
    this._speed    = 260;
    this._state    = 'playing';
    this._numPlayers = 2;
    this._scores  = [0,0]; // time survived
    this._lastSec = 0;
    this._timeSp  = null;
  }

  create(data = {}) {
    this._numPlayers = data.players ?? 2;
    const E = this.e;
    this.physics.setGravity(0);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    E.plane(1280, 720, 0x050510, 640, 360, -400);
    E.plane(1280, 44,  0x000000, 640, 22,  -390);
    E.text('DESVIE!', 18, 0xff4444, 640, 22, 5);
    E.text('P1: A/D', 9, 0x4488ff, 120, 22, 5);
    if (this._numPlayers >= 2) E.text('P2: J/L', 9, 0xff4444, 1160, 22, 5);

    // Chão
    E.box(1280, 20, 40, 0x334455, 640, FLOOR_Y+10, 0);
    this.physics.addStatic(new Body(0, FLOOR_Y, 1280, 20));

    // Stars bg
    for (let i = 0; i < 60; i++) {
      const b = E.box(2, 2, 1, 0xffffff, Math.random()*1280, Math.random()*720, -300);
      b.material.transparent = true;
      b.material.opacity = 0.3 + Math.random()*0.5;
    }

    // Players (apenas movimento horizontal, sem pulo)
    this._spawnPlayer(0, 300, FLOOR_Y-21, SaveSystem.getActiveSkin()||'default', 'P1');
    if (this._numPlayers >= 2) this._spawnPlayer(1, 980, FLOOR_Y-21, 'warrior', 'P2');

    this._timeSp = this.e.text('0s', 13, 0xffffff, 640, 22, 8);
    this._t = 0; this._state = 'playing';
    this._nextRock = 0.5;
    this._speed = 300;
    this._rocks = [];
    this._warnSp = null;
  }

  _spawnPlayer(idx, x, y, skin, label) {
    const body = new Body(x-14, y-21, 28, 42);
    body.allowGravity = false;
    this.physics.addBody(body);
    const sprite = new CharacterSprite(this.e.scene, x, y, skin, label);
    this._players[idx] = { idx, body, sprite, dir:idx===0?1:-1, alive:true };
  }

  _spawnRock() {
    const x = 60 + Math.random() * 1160;
    const size = 20 + Math.random() * 30;
    const col = [0xcc4444, 0xcc8844, 0x8844cc, 0x44cc88][Math.floor(Math.random()*4)];
    const body = new Body(x-size/2, SPAWN_TOP-size/2, size, size);
    body.vy = this._speed + Math.random()*80;
    body.allowGravity = false;
    this.physics.addBody(body);
    const mesh = this.e.box(size, size, size, col, x, SPAWN_TOP, 4);
    mesh.material.emissive = new THREE.Color(col);
    mesh.material.emissiveIntensity = 0.4;
    this._rocks.push({ body, mesh, active:true, size });
  }

  _movePlayer(p, idx, moveL, moveR, dt) {
    if (!p || !p.alive) return;
    const b = p.body, inp = this.inp;
    let vx = 0;
    if (inp.isDown(moveL)) { vx=-280; p.dir=-1; }
    if (inp.isDown(moveR)) { vx= 280; p.dir= 1; }
    b.vx = vx;
    // Clamp to screen
    if (b.x < 0)        { b.x = 0;        b.vx = 0; }
    if (b.right > 1280) { b.x = 1280-b.w; b.vx = 0; }
    p.sprite.animate(b.cx, b.cy, p.dir, p.dir, 0, Math.abs(b.vx)>10?'walk1':'idle', 'standard');
  }

  update(dt) {
    this._t += dt;
    this.physics.step(dt);

    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter') || this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }

    this._movePlayer(this._players[0], 0, 'KeyA', 'KeyD', dt);
    this._movePlayer(this._players[1], 1, 'KeyJ', 'KeyL', dt);

    // Spawn rocks
    this._nextRock -= dt;
    if (this._nextRock <= 0) {
      this._spawnRock();
      // Adiciona rocha extra a cada 20s
      if (this._t > 20) this._spawnRock();
      if (this._t > 40) this._spawnRock();
      this._nextRock = Math.max(0.15, 0.6 - this._t * 0.01);
      this._speed = Math.min(700, 300 + this._t * 8);
    }

    // Update rocks
    this._rocks = this._rocks.filter(r => {
      if (!r.active) { this.e.remove(r.mesh); this.physics.remove(r.body); return false; }
      r.mesh.position.set(r.body.cx, -r.body.cy, 4);
      r.mesh.rotation.z += dt * 2;

      if (r.body.y > FLOOR_Y+20) { r.active=false; return true; }

      this._players.forEach((p,i) => {
        if (!p?.alive) return;
        if (this.physics.overlaps(r.body, p.body)) {
          p.alive = false;
          this._scores[i] = Math.floor(this._t);
          p.sprite.setVisible(false);
          this.physics.remove(p.body);
          this._checkEnd();
        }
      });
      return true;
    });

    // Time display
    const sec = Math.floor(this._t);
    if (sec !== this._lastSec) {
      this._lastSec = sec;
      this.e.remove(this._timeSp);
      this._timeSp = this.e.text(`${sec}s`, 13, 0xffffff, 640, 22, 8);
    }

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  _checkEnd() {
    const alive = this._players.filter(p => p?.alive);
    const total = this._players.filter(Boolean).length;
    const bestTime = Math.max(...this._scores, Math.floor(this._t));
    SaveSystem.recordScore('dodge', bestTime * 10);
    if (total === 1 && alive.length === 0) {
      this._state = 'gameover';
      this.e.text(`Sobreviveu ${this._scores[0]}s!\nENTER para voltar`, 22, 0xffc400, 640, 300, 50);
    } else if (total === 2) {
      if (alive.length === 0) { this._state='gameover'; this.e.text(`EMPATE!\nENTER para voltar`, 22, 0xffc400, 640, 300, 50); }
      else if (alive.length === 1) { this._state='gameover'; const w=alive[0].idx===0?'P1':'P2'; this.e.text(`${w} SOBREVIVEU!\nENTER para voltar`, 22, 0xffc400, 640, 300, 50); }
    }
  }

  destroy() {
    this._players.forEach(p => p?.sprite?.destroy());
    this.physics.clear();
  }
}
