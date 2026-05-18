// ── Corrida de Moedas — Colete mais moedas em 30s ─────────────────
// 1-2 jogadores | P1: WASD+Espaço  P2: IJKL+H

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const TIME  = 30;
const COINS_ON_MAP = 20;

const PLATFORM_LAYOUT = [
  {x:0,y:508,w:20},
  {x:160,y:400,w:4},{x:480,y:320,w:4},{x:760,y:400,w:4},
  {x:960,y:320,w:3},{x:200,y:220,w:4},{x:700,y:220,w:4},
  {x:1050,y:460,w:3},{x:380,y:460,w:3},
];

export class CoinRushScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics = new Physics2D();
    this._players = [];
    this._coins   = [];
    this._scores  = [0, 0];
    this._time    = TIME;
    this._state   = 'playing';
    this._timeSp  = null;
    this._scoreSp = null;
    this._numPlayers = 2;
    this._t = 0;
    this._lastSec = TIME + 1;
  }

  create(data = {}) {
    this._numPlayers = data.players ?? 2;
    const E = this.e;
    this.physics.setGravity(580);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    E.plane(1280, 720, 0x050a18, 640, 360, -400);
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text('CORRIDA DE MOEDAS', 16, 0xffd700, 640, 22, 5);

    PLATFORM_LAYOUT.forEach(p => {
      for (let i = 0; i < p.w; i++) {
        const gx = p.x + i*64 + 32;
        E.box(64, 20, 40, 0x223366, gx, p.y+10, 0);
        E.box(62, 4, 42, 0x3355aa, gx, p.y, 1);
        const b = new Body(p.x + i*64, p.y, 64, 20);
        if (p.y < 508) b.oneway = true;
        this.physics.addStatic(b);
      }
    });

    this._timeSp  = E.text(`${TIME}s`, 16, 0xffd700, 640, 22, 8);
    this._scoreSp = E.text(this._numPlayers>=2 ? 'P1:0  P2:0' : 'Moedas:0', 13, 0xffffff, 980, 22, 8);

    // Spawn coins
    this._coins = [];
    this._spawnCoins(COINS_ON_MAP);

    this._spawnPlayer(0, 200, 460, SaveSystem.getActiveSkin()||'default', 'P1');
    if (this._numPlayers >= 2) this._spawnPlayer(1, 1000, 460, 'warrior', 'P2');

    this._scores = [0, 0];
    this._time   = TIME;
    this._state  = 'playing';
  }

  _spawnCoins(n) {
    const positions = [
      {x:260,y:480},{x:330,y:480},{x:560,y:480},{x:640,y:480},{x:700,y:480},
      {x:220,y:375},{x:284,y:375},{x:540,y:295},{x:604,y:295},{x:820,y:375},
      {x:884,y:375},{x:1020,y:295},{x:1084,y:295},{x:264,y:195},{x:328,y:195},
      {x:760,y:195},{x:824,y:195},{x:1110,y:435},{x:1174,y:435},{x:440,y:435},
    ];
    for (let i = 0; i < Math.min(n, positions.length); i++) {
      const pos = positions[i];
      const mesh = this.e.box(14, 14, 14, 0xffd700, pos.x, pos.y, 5);
      mesh.material.emissive = new THREE.Color(0x664400);
      mesh.material.emissiveIntensity = 0.6;
      this._coins.push({ x:pos.x, y:pos.y, mesh, body: new Body(pos.x-7, pos.y-7, 14, 14), alive:true });
    }
  }

  _spawnPlayer(idx, x, y, skin, label) {
    const body = new Body(x-14, y-42, 28, 42);
    this.physics.addBody(body);
    const sprite = new CharacterSprite(this.e.scene, x, y, skin, label);
    this._players[idx] = { idx, body, sprite, dir: idx===0?1:-1, _walkT:0 };
  }

  _movePlayer(p, idx, moveL, moveR, jumpKey, dt) {
    if (!p) return;
    const b = p.body, inp = this.inp;
    let vx = 0;
    if (inp.isDown(moveL)) { vx=-230; p.dir=-1; }
    if (inp.isDown(moveR)) { vx= 230; p.dir= 1; }
    b.vx = vx;
    if (inp.justDown(jumpKey) && b.onGround) b.vy = -450;
    if (b.onGround && Math.abs(b.vx)>10) p._walkT += dt*8;
    let state = b.onGround ? (Math.abs(b.vx)>10?(Math.sin(p._walkT)>0?'walk1':'walk2'):'idle') : (b.vy<0?'jump':'fall');
    p.sprite.animate(b.cx, b.cy, p.dir, p.dir, 0, state, 'standard');

    // Coletar moedas
    this._coins.forEach(c => {
      if (!c.alive) return;
      if (this.physics.overlaps(b, c.body)) {
        c.alive = false;
        this.e.remove(c.mesh);
        this._scores[idx]++;
        this._updateHUD();
        // Respawn coin after 3s
        setTimeout(() => {
          if (this._state !== 'playing') return;
          c.mesh = this.e.box(14,14,14,0xffd700,c.x,c.y,5);
          c.mesh.material.emissive = new THREE.Color(0x664400);
          c.mesh.material.emissiveIntensity = 0.6;
          c.alive = true;
        }, 3000);
      }
    });
  }

  _updateHUD() {
    this.e.remove(this._scoreSp);
    this._scoreSp = this.e.text(
      this._numPlayers>=2 ? `P1:${this._scores[0]}  P2:${this._scores[1]}` : `Moedas:${this._scores[0]}`,
      13, 0xffffff, 980, 22, 8
    );
  }

  update(dt) {
    this._t += dt;
    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter') || this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }
    this._time -= dt;
    this.physics.step(dt);
    this._movePlayer(this._players[0], 0, 'KeyA','KeyD','KeyW', dt);
    this._movePlayer(this._players[1], 1, 'KeyJ','KeyL','KeyI', dt);

    this._coins.forEach(c => { if (c.alive) { c.mesh.rotation.y += dt*3; } });

    const sec = Math.ceil(this._time);
    if (sec !== this._lastSec) {
      this._lastSec = sec;
      this.e.remove(this._timeSp);
      this._timeSp = this.e.text(`${Math.max(0,sec)}s`, 16, sec<=5?0xff2200:0xffd700, 640, 22, 8);
    }

    if (this._time <= 0) {
      this._state = 'gameover';
      const best = Math.max(this._scores[0], this._scores[1]);
      SaveSystem.recordScore('coinrush', best);
      let msg;
      if (this._numPlayers >= 2) {
        const w = this._scores[0]>this._scores[1]?'P1':this._scores[1]>this._scores[0]?'P2':'EMPATE';
        msg = `${w==='EMPATE'?'EMPATE!':w+' VENCEU!'}\nP1:${this._scores[0]} P2:${this._scores[1]}\nENTER para voltar`;
      } else {
        msg = `FIM!\nMoedas: ${this._scores[0]}\nENTER para voltar`;
      }
      this.e.text(msg, 20, 0xffc400, 640, 310, 50);
    }
    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy() {
    this._players.forEach(p => p?.sprite?.destroy());
    this.physics.clear();
  }
}
