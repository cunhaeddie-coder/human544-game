// ── Alvos — Destrua o máximo de alvos em 30s ─────────────────────
// 1-2 jogadores | P1: WASD+Espaço  P2: IJKL+H | TAB=trocar mapa

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const MAPS = [
  {
    name: 'Tiro ao Alvo',
    sky: 0x0a1a2a, plat: 0x223355,
    platforms: [
      {x:0,y:508,w:20},{x:200,y:380,w:4},{x:600,y:300,w:4},{x:900,y:380,w:4},
    ],
    targetSpawns: [
      {x:260,y:355},{x:350,y:270},{x:680,y:275},{x:780,y:355},
      {x:970,y:355},{x:500,y:355},{x:140,y:480},{x:1100,y:480},
      {x:440,y:200},{x:840,y:200},
    ],
  },
  {
    name: 'Torre dos Alvos',
    sky: 0x1a0a2a, plat: 0x443355,
    platforms: [
      {x:0,y:508,w:20},{x:100,y:420,w:3},{x:400,y:340,w:3},
      {x:700,y:260,w:3},{x:950,y:340,w:3},{x:200,y:220,w:3},
    ],
    targetSpawns: [
      {x:160,y:395},{x:250,y:395},{x:460,y:315},{x:550,y:315},
      {x:760,y:235},{x:850,y:235},{x:1010,y:315},{x:1100,y:315},
      {x:260,y:195},{x:350,y:195},{x:640,y:480},{x:1000,y:480},
    ],
  },
];

const TARGET_HP   = 1;
const TIME_LIMIT  = 30;
const RESPAWN_T   = 2.5;

export class TargetsScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics   = new Physics2D();
    this._map      = 0;
    this._players  = [];
    this._targets  = [];
    this._bullets  = [];
    this._scores   = [0, 0];
    this._time     = TIME_LIMIT;
    this._state    = 'playing';
    this._timeSp   = null;
    this._scoreSp  = null;
    this._shotCd   = [0, 0];
    this._numPlayers = 1;
  }

  create(data = {}) {
    this._map = data.map ?? 0;
    this._numPlayers = data.players ?? 2;
    const map = MAPS[this._map];
    const E = this.e;

    this.physics.setGravity(560);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    E.plane(1280, 720, map.sky, 640, 360, -400);
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text(map.name, 14, 0xffc400, 640, 22, 5);
    E.text('Destrua os Alvos!', 10, 0x667788, 200, 22, 5);

    // Platforms
    map.platforms.forEach(p => {
      for (let i = 0; i < p.w; i++) {
        const gx = p.x + i*64 + 32;
        E.box(64, 20, 40, map.plat, gx, p.y+10, 0);
        E.box(62, 4, 42, 0x4477cc, gx, p.y, 1);
        const b = new Body(p.x + i*64, p.y, 64, 20);
        if (p.y < 508) b.oneway = true;
        this.physics.addStatic(b);
      }
    });

    // HUD
    this._timeSp  = E.text(`${TIME_LIMIT}s`, 16, 0xff4444, 640, 22, 8);
    this._scoreSp = E.text(this._numPlayers >= 2 ? 'P1: 0  P2: 0' : 'Pontos: 0', 13, 0xffffff, 980, 22, 8);

    // Targets
    map.targetSpawns.forEach((pos, i) => this._spawnTarget(pos.x, pos.y, i));

    // Players
    this._spawnPlayer(0, 200, 460, 'P1');
    if (this._numPlayers >= 2) this._spawnPlayer(1, 1000, 460, 'P2');

    this._time = TIME_LIMIT;
    this._scores = [0, 0];
    this._state = 'playing';
  }

  _spawnTarget(x, y, idx) {
    const colors = [0xff4444, 0xff8800, 0xffff00, 0x00ff88, 0xff00ff];
    const col = colors[idx % colors.length];
    const size = 22 + (idx % 3) * 8;
    const mesh = this.e.box(size, size, size, col, x, y, 3);
    mesh.material.emissive = new THREE.Color(col);
    mesh.material.emissiveIntensity = 0.5;
    const body = new Body(x - size/2, y - size/2, size, size);
    const points = Math.round(3 - idx % 3) || 1;
    this._targets.push({ x, y, size, mesh, body, points, respawnT: 0, alive: true, idx });
  }

  _spawnPlayer(idx, x, y, label) {
    const skin = idx === 0 ? (SaveSystem.getActiveSkin() || 'default') : 'warrior';
    const body = new Body(x - 14, y - 42, 28, 42);
    this.physics.addBody(body);
    const sprite = new CharacterSprite(this.e.scene, x, y, skin, label);
    this._players[idx] = { idx, body, sprite, dir: idx === 0 ? 1 : -1, _walkT: 0 };
  }

  _firePlayer(pidx) {
    const now = Date.now();
    if (now - this._shotCd[pidx] < 320) return;
    this._shotCd[pidx] = now;
    const p = this._players[pidx];
    if (!p) return;
    const bx = p.body.cx + p.dir * 20;
    const by = p.body.cy - 6;
    const body = new Body(bx-5, by-5, 10, 10);
    body.vx = p.dir * 700; body.vy = 0; body.allowGravity = false;
    this.physics.addBody(body);
    const col = pidx === 0 ? 0x4488ff : 0xff4444;
    const mesh = this.e.box(10, 10, 8, col, bx, by, 6);
    mesh.material.emissive = new THREE.Color(col);
    mesh.material.emissiveIntensity = 0.7;
    this._bullets.push({ body, mesh, owner: pidx, active: true });
    setTimeout(() => {
      const bl = this._bullets.find(b => b.body === body);
      if (bl) bl.active = false;
    }, 1600);
  }

  _handlePlayer(p, idx, moveL, moveR, jumpKey, shootKey, dt) {
    if (!p) return;
    const b = p.body, inp = this.inp;
    let vx = 0;
    if (inp.isDown(moveL)) { vx = -220; p.dir = -1; }
    if (inp.isDown(moveR)) { vx =  220; p.dir =  1; }
    b.vx = vx;
    if (inp.justDown(jumpKey) && b.onGround) b.vy = -430;
    if (inp.justDown(shootKey)) this._firePlayer(idx);

    if (b.onGround && Math.abs(b.vx) > 10) p._walkT += dt * 8;
    let state = 'idle';
    if (!b.onGround && b.vy < 0) state = 'jump';
    else if (!b.onGround) state = 'fall';
    else if (Math.abs(b.vx) > 10) state = Math.sin(p._walkT) > 0 ? 'walk1' : 'walk2';
    p.sprite.animate(b.cx, b.cy, p.dir, p.dir, 0, state, SaveSystem.getActiveWeapon() || 'standard');
  }

  _updateHUD() {
    this.e.remove(this._scoreSp);
    const txt = this._numPlayers >= 2
      ? `P1: ${this._scores[0]}  P2: ${this._scores[1]}`
      : `Pontos: ${this._scores[0]}`;
    this._scoreSp = this.e.text(txt, 13, 0xffffff, 980, 22, 8);

    this.e.remove(this._timeSp);
    const sec = Math.ceil(this._time);
    const col = sec <= 5 ? 0xff2200 : 0xff8800;
    this._timeSp = this.e.text(`${sec}s`, 16, col, 640, 22, 8);
  }

  update(dt) {
    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter') || this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }

    this._time -= dt;
    this.physics.step(dt);

    this._handlePlayer(this._players[0], 0, 'KeyA', 'KeyD', 'KeyW', 'Space', dt);
    this._handlePlayer(this._players[1], 1, 'KeyJ', 'KeyL', 'KeyI', 'KeyH', dt);

    // Bullets
    this._bullets = this._bullets.filter(bl => {
      if (!bl.active) { this.e.remove(bl.mesh); this.physics.remove(bl.body); return false; }
      bl.mesh.position.set(bl.body.cx, -bl.body.cy, 6);
      // Hit targets
      for (const tgt of this._targets) {
        if (!tgt.alive) continue;
        if (this.physics.overlaps(bl.body, tgt.body)) {
          // Hit!
          tgt.alive = false;
          tgt.respawnT = RESPAWN_T;
          this.e.remove(tgt.mesh);
          this._scores[bl.owner] += tgt.points;
          this._updateHUD();
          bl.active = false;
          this.e.remove(bl.mesh);
          this.physics.remove(bl.body);
          return false;
        }
      }
      if (bl.body.x < 0 || bl.body.x > 1280) {
        bl.active = false; this.e.remove(bl.mesh); this.physics.remove(bl.body); return false;
      }
      return true;
    });

    // Respawn targets + spin alive ones
    this._targets.forEach(tgt => {
      if (!tgt.alive) {
        tgt.respawnT -= dt;
        if (tgt.respawnT <= 0) {
          // Respawn
          const colors = [0xff4444, 0xff8800, 0xffff00, 0x00ff88, 0xff00ff];
          const col = colors[tgt.idx % colors.length];
          tgt.mesh = this.e.box(tgt.size, tgt.size, tgt.size, col, tgt.x, tgt.y, 3);
          tgt.mesh.material.emissive = new THREE.Color(col);
          tgt.mesh.material.emissiveIntensity = 0.5;
          tgt.alive = true;
        }
      } else {
        tgt.mesh.rotation.y += dt * 2;
        tgt.mesh.rotation.x += dt * 1.2;
      }
    });

    // Timer
    this._updateHUD();

    if (this._time <= 0) {
      this._time = 0;
      this._state = 'gameover';
      const best = Math.max(this._scores[0], this._scores[1]);
      SaveSystem.recordScore('targets', best);
      let msg;
      if (this._numPlayers >= 2) {
        const winner = this._scores[0] > this._scores[1] ? 'P1' : this._scores[1] > this._scores[0] ? 'P2' : 'EMPATE';
        msg = `${winner === 'EMPATE' ? 'EMPATE!' : winner + ' VENCEU!'}\nP1:${this._scores[0]} P2:${this._scores[1]}\nENTER para voltar`;
      } else {
        msg = `FIM!\nPontos: ${this._scores[0]}\nENTER para voltar`;
      }
      this.e.text(msg, 20, 0xffc400, 640, 330, 50);
    }

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
    if (this.inp.justDown('Tab')) this.m.start('TargetsScene', { map: (this._map+1) % MAPS.length, players: this._numPlayers });
  }

  destroy() {
    this._players.forEach(p => p?.sprite?.destroy());
    this.physics.clear();
  }
}
