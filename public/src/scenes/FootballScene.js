// ── Football — Futebol Top-Down ──────────────────────────────────
// P1: A/D mover X  W/S mover Y  (toca na bola para chutar)
// P2: J/L mover X  I/K mover Y
// Primeiro a fazer 5 gols vence | ESC=voltar

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const MAPS = [
  {
    name: 'Arena Clássica',
    sky: 0x1a3a1a, grass: 0x2a6a2a, line: 0x4a9a4a,
    obstacles: [],
  },
  {
    name: 'Campo com Muros',
    sky: 0x1a1a3a, grass: 0x223322, line: 0x336633,
    obstacles: [
      { x:380, y:340, w:20, h:120 },
      { x:900, y:340, w:20, h:120 },
    ],
  },
];

const BALL_R     = 20;
const GOAL_W     = 22, GOAL_H = 150;
const PLAYER_SPD = 200;
const KICK_FORCE = 700;
const PLAYER_R   = 22;
const PLAYER_FRICTION = 0.82; // decelera suavemente ao soltar teclas

export class FootballScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics = new Physics2D();
    this._map = 0;
    this._score = [0, 0];
    this._ball = null;
    this._players = [];
    this._state = 'playing';
    this._t = 0;
    this._msgSp = null;
    this._scoreSp = null;
    this._goalCd = 0;
    this._obstacles = [];
  }

  _showRoulette(maps, onDone) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;`;
    overlay.innerHTML = `<div style="font-size:22px;margin-bottom:20px;color:#ffc400">🎰 SORTEANDO MAPA...</div><div style="width:320px;height:56px;overflow:hidden;border:2px solid #4488ff;border-radius:8px;background:#0a0f20;"><div id="roulette-items" style="will-change:transform;"></div></div>`;
    document.body.appendChild(overlay);

    const chosen = Math.floor(Math.random() * maps.length);
    const itemH = 56;
    const items = [...maps, ...maps, ...maps, ...maps, maps[chosen]];
    const el = overlay.querySelector('#roulette-items');
    el.style.cssText = 'transition:none;';
    el.innerHTML = items.map(m => `<div style="height:${itemH}px;display:flex;align-items:center;justify-content:center;font-size:18px;letter-spacing:1px;">${m.name}</div>`).join('');

    let pos = 0;
    const target = (items.length - 1) * itemH;
    const start = Date.now();
    const duration = 2500;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      pos = ease * target;
      el.style.transform = `translateY(-${pos}px)`;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.style.transform = `translateY(-${target}px)`;
        setTimeout(() => { overlay.remove(); onDone(chosen); }, 400);
      }
    };
    requestAnimationFrame(tick);
  }

  create(data = {}) {
    if (data.map === undefined) {
      this._showRoulette(MAPS, chosen => this.create({ ...data, map: chosen }));
      return;
    }
    this._map = data.map;
    const map = MAPS[this._map];
    const E = this.e;

    this.physics.setGravity(0);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    // Background
    E.plane(1280, 720, map.sky, 640, 360, -400);

    // Field
    E.plane(1200, 500, map.grass, 640, 390, -10);
    // Center line
    E.box(4, 500, 2, map.line, 640, 390, -5);
    // Center circle
    for (let a = 0; a < 32; a++) {
      const ang = (a / 32) * Math.PI * 2;
      E.box(4, 4, 2, map.line,
        640 + Math.cos(ang) * 80, 390 + Math.sin(ang) * 60, -5);
    }

    // Header
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text(map.name, 14, 0xffffff, 640, 22, 5);
    E.text('P1: A/D W/S', 9, 0x4488ff, 120, 22, 5);
    E.text('P2: J/L I/K', 9, 0xff4444, 1160, 22, 5);
    this._scoreSp = E.text('0 - 0', 20, 0xffffff, 640, 22, 8);

    // Paredes do campo (sem chão/teto de gravidade)
    this.physics.addStatic(new Body(40, 140, 10, 500));   // parede esquerda
    this.physics.addStatic(new Body(1230, 140, 10, 500)); // parede direita
    this.physics.addStatic(new Body(40, 130, 1200, 10));  // parede topo
    this.physics.addStatic(new Body(40, 640, 1200, 10));  // parede fundo

    // Goal posts + areas
    this._buildGoal(E, 'left');
    this._buildGoal(E, 'right');

    // Obstacles (map 2)
    map.obstacles.forEach(o => {
      E.box(o.w, o.h, 40, 0x557755, o.x + o.w/2, o.y + o.h/2, 2);
      this.physics.addStatic(new Body(o.x, o.y, o.w, o.h));
      this._obstacles.push(o);
    });

    // Ball
    const bx = 640, by = 390;
    const ballBody = new Body(bx - BALL_R, by - BALL_R, BALL_R*2, BALL_R*2);
    ballBody.restitution = 0.75;
    this.physics.addBody(ballBody);
    const ballMesh = E.box(BALL_R*2, BALL_R*2, BALL_R*2, 0xffffff, bx, by, 4);
    ballMesh.material.emissive = new THREE.Color(0x222222);
    ballMesh.material.emissiveIntensity = 0.3;
    const pat = E.box(BALL_R*0.8, BALL_R*0.8, BALL_R*2+1, 0x111111, bx, by, 5);
    this._ball = { body: ballBody, mesh: ballMesh, pat, friction: 0.96 };

    // Players
    this._spawnPlayer(0, 300, 390, 0x4488ff);
    this._spawnPlayer(1, 980, 390, 0xff4444);

    this._state = 'playing';
    this._showMsg('APITO INICIAL!', 1500);
  }

  _buildGoal(E, side) {
    const isLeft = side === 'left';
    const gx = isLeft ? 50 : 1230;
    const postColor = 0xffffff;
    const netColor  = 0xaaaaaa;

    E.box(GOAL_W, 8, 30, postColor, gx, 320, 3);
    E.box(GOAL_W, 8, 30, postColor, gx, 320 + GOAL_H, 3);
    E.box(8, GOAL_H, 30, postColor, gx, 320 + GOAL_H/2, 3);

    for (let y = 0; y < 6; y++) {
      E.box(GOAL_W + 4, 2, 5, netColor, gx, 330 + y*22, 2);
    }
  }

  _spawnPlayer(idx, x, y, color) {
    const body = new Body(x - PLAYER_R, y - PLAYER_R, PLAYER_R*2, PLAYER_R*2);
    this.physics.addBody(body);

    // Corpo principal do jogador (dois círculos simulados com boxes escalonadas)
    const circle = this.e.box(PLAYER_R*2, PLAYER_R*2, PLAYER_R*2, color, x, y, 4);
    circle.material.emissive = new THREE.Color(color);
    circle.material.emissiveIntensity = 0.3;
    // Camisa / número
    const inner = this.e.box(PLAYER_R*0.9, PLAYER_R*0.9, PLAYER_R*2+1, 0xffffff, x, y, 5);
    inner.material.transparent = true; inner.material.opacity = 0.25;
    // Nariz de direção
    const nose = this.e.box(8, 8, 12, 0xffffff, x + (idx === 0 ? PLAYER_R : -PLAYER_R), y, 5);
    nose.material.emissive = new THREE.Color(0xffffff); nose.material.emissiveIntensity = 0.5;

    this._players[idx] = {
      idx, body, circle, inner, nose, color,
      dirX: idx === 0 ? 1 : -1, dirY: 0,
      moving: false,
    };
  }

  _movePlayer(p, leftKey, rightKey, upKey, downKey, dt) {
    const b = p.body, inp = this.inp;
    let vx = 0, vy = 0;
    p.moving = false;
    if (inp.isDown(leftKey))  { vx = -PLAYER_SPD; p.dirX = -1; p.dirY = 0; p.moving = true; }
    if (inp.isDown(rightKey)) { vx =  PLAYER_SPD; p.dirX =  1; p.dirY = 0; p.moving = true; }
    if (inp.isDown(upKey))    { vy = -PLAYER_SPD; p.dirY = -1; p.dirX = 0; p.moving = true; }
    if (inp.isDown(downKey))  { vy =  PLAYER_SPD; p.dirY =  1; p.dirX = 0; p.moving = true; }
    // Diagonal
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    if (p.moving) {
      b.vx = vx; b.vy = vy;
    } else {
      // Atrito suave — HaxBall-style deslize
      b.vx *= PLAYER_FRICTION;
      b.vy *= PLAYER_FRICTION;
    }

    // Sincronizar meshes
    p.circle.position.set(b.cx, -b.cy, 4);
    p.inner.position.set(b.cx, -b.cy, 5);
    p.nose.position.set(b.cx + p.dirX * PLAYER_R, -(b.cy + p.dirY * PLAYER_R), 5);

    // Colisão circular com a bola — separação e transferência de momentum
    const ball = this._ball;
    if (ball) {
      const dx = ball.body.cx - b.cx;
      const dy = ball.body.cy - b.cy;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const minDist = PLAYER_R + BALL_R;
      if (dist < minDist + 2) {
        // Separar para fora (circular push)
        const overlap = minDist + 2 - dist;
        const nx = dx / dist, ny = dy / dist;
        ball.body.x += nx * overlap;
        ball.body.y += ny * overlap;

        // Momentum transfer: velocidade do jogador contribui para o chute
        const playerSpd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
        const powerKick = inp.justDown('Space') || inp.justDown('KeyF') || inp.justDown('KeyH');
        const baseForce = powerKick ? KICK_FORCE * 1.8 : KICK_FORCE;
        const momentum  = Math.min(playerSpd * 1.2, 320); // contribuição da velocidade

        // Combina normal do contacto + direção do jogador + momentum
        const dirBlend = 0.55;
        const kx = (nx * (1 - dirBlend) + p.dirX * dirBlend) * baseForce + b.vx * 0.4 + momentum * nx;
        const ky = (ny * (1 - dirBlend) + p.dirY * dirBlend) * baseForce + b.vy * 0.4 + momentum * ny;
        // Aplica gradualmente para não teleportar a bola
        ball.body.vx = ball.body.vx * 0.15 + kx * 0.85;
        ball.body.vy = ball.body.vy * 0.15 + ky * 0.85;
      }
    }
  }

  _checkGoal() {
    const ball = this._ball;
    const bx = ball.body.cx;
    const by = ball.body.cy;
    if (bx < 70 && by > 320 && by < 460) { this._goal(1); return; }
    if (bx > 1210 && by > 320 && by < 460) { this._goal(0); return; }
  }

  _goal(scorer) {
    this._score[scorer]++;
    this.e.remove(this._scoreSp);
    this._scoreSp = this.e.text(`${this._score[0]} - ${this._score[1]}`, 20, 0xffffff, 640, 22, 8);
    const name = scorer === 0 ? 'P1' : 'P2';
    this._showMsg(`GOOOL! ${name}!`, 2000);
    this._goalCd = 2.2;

    if (this._score[scorer] >= 5) {
      this._state = 'gameover';
      const totalGoals = this._score[0] + this._score[1];
      SaveSystem.recordScore('football', this._score[scorer] * 100 + totalGoals);
      this._showMsg(`${name} VENCEU!\nENTER para voltar`, 0);
      return;
    }

    setTimeout(() => {
      this._ball.body.x = 640 - BALL_R;
      this._ball.body.y = 390 - BALL_R;
      this._ball.body.vx = 0;
      this._ball.body.vy = 0;
    }, 1800);
  }

  _showMsg(text, dur) {
    if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; }
    this._msgSp = this.e.text(text, 20, 0xffc400, 640, 340, 50);
    if (dur > 0) setTimeout(() => {
      if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; }
    }, dur);
  }

  update(dt) {
    this._t += dt;
    this.physics.step(dt);

    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter') || this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }

    if (this._goalCd > 0) {
      this._goalCd -= dt;
    } else {
      this._movePlayer(this._players[0], 'KeyA', 'KeyD', 'KeyW', 'KeyS', dt);
      this._movePlayer(this._players[1], 'KeyJ', 'KeyL', 'KeyI', 'KeyK', dt);
    }

    // Fricção da bola (top-down: desacelera por frame)
    const ball = this._ball;
    ball.body.vx *= ball.friction;
    ball.body.vy *= ball.friction;
    if (Math.abs(ball.body.vx) < 1) ball.body.vx = 0;
    if (Math.abs(ball.body.vy) < 1) ball.body.vy = 0;

    // Bounce nas paredes — restituição 0.82 (mais elástico que antes)
    const REST = 0.82;
    if (ball.body.x < 40)          { ball.body.x = 40; ball.body.vx = Math.abs(ball.body.vx) * REST; }
    if (ball.body.right > 1240)    { ball.body.x = 1240 - BALL_R*2; ball.body.vx = -Math.abs(ball.body.vx) * REST; }
    if (ball.body.y < 135)         { ball.body.y = 135; ball.body.vy = Math.abs(ball.body.vy) * REST; }
    if (ball.body.bottom > 645)    { ball.body.y = 645 - BALL_R*2; ball.body.vy = -Math.abs(ball.body.vy) * REST; }

    ball.mesh.position.set(ball.body.cx, -ball.body.cy, 4);
    ball.pat.position.set(ball.body.cx, -ball.body.cy, 5);

    if (this._goalCd <= 0) this._checkGoal();

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
    if (this.inp.justDown('Tab')) {
      this.m.start('FootballScene', { map: (this._map + 1) % MAPS.length });
    }
  }

  destroy() {
    this._players.forEach(p => {
      if (!p) return;
      this.e.remove(p.inner);
    });
    this.physics.clear();
  }
}
