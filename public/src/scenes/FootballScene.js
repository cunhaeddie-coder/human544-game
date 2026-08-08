// ── Football — Futebol Top-Down (visão de transmissão / "golazo") ───
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
];

// Seleções nacionais escolhíveis (cor da camisa / cor de detalhe)
const TEAMS = [
  { id:'bra', name:'Brasil',      flag:'🇧🇷', code:'BRA', shirt:'#ffcc00', trim:'#009c3b' },
  { id:'arg', name:'Argentina',   flag:'🇦🇷', code:'ARG', shirt:'#75aadb', trim:'#ffffff' },
  { id:'ger', name:'Alemanha',    flag:'🇩🇪', code:'GER', shirt:'#f5f5f5', trim:'#1a1a1a' },
  { id:'fra', name:'França',      flag:'🇫🇷', code:'FRA', shirt:'#1e3a8a', trim:'#ffffff' },
  { id:'por', name:'Portugal',    flag:'🇵🇹', code:'POR', shirt:'#c8102e', trim:'#046a38' },
  { id:'esp', name:'Espanha',     flag:'🇪🇸', code:'ESP', shirt:'#c8102e', trim:'#ffcc00' },
  { id:'ita', name:'Itália',      flag:'🇮🇹', code:'ITA', shirt:'#1565c0', trim:'#ffffff' },
  { id:'ned', name:'Holanda',     flag:'🇳🇱', code:'NED', shirt:'#ff6f00', trim:'#ffffff' },
  { id:'uru', name:'Uruguai',     flag:'🇺🇾', code:'URU', shirt:'#6ec8f2', trim:'#1a1a1a' },
  { id:'bel', name:'Bélgica',     flag:'🇧🇪', code:'BEL', shirt:'#c8102e', trim:'#1a1a1a' },
  { id:'cro', name:'Croácia',     flag:'🇭🇷', code:'CRO', shirt:'#c8102e', trim:'#ffffff' },
  { id:'jpn', name:'Japão',       flag:'🇯🇵', code:'JPN', shirt:'#0a3b8c', trim:'#ffffff' },
];

const BALL_R     = 20;
const GOAL_W     = 22, GOAL_H = 150;
const PLAYER_SPD = 200;
const KICK_FORCE = 700;
const PLAYER_R   = 22;
const PLAYER_FRICTION = 0.82; // decelera suavemente ao soltar teclas

// ── Canvas art helpers (sprites sempre de frente pra câmera) ────────
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  return `rgb(${r},${g},${b})`;
}

function readableTextColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

function makeJerseyCanvas(team, number) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S * 0.40;

  // Sombra de contato (parte de baixo do círculo, dá volume)
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.75, r * 0.75, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  // Camisa (gradiente radial pra dar volume esférico)
  const grad = ctx.createRadialGradient(cx, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, lighten(team.shirt, 0.4));
  grad.addColorStop(1, team.shirt);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = S * 0.055;
  ctx.strokeStyle = team.trim;
  ctx.stroke();

  // Gola em V
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.30, cy - r * 0.55);
  ctx.lineTo(cx, cy - r * 0.18);
  ctx.lineTo(cx + r * 0.30, cy - r * 0.55);
  ctx.strokeStyle = team.trim;
  ctx.lineWidth = S * 0.04;
  ctx.stroke();

  // Número da camisa
  ctx.fillStyle = readableTextColor(team.shirt);
  ctx.font = `bold ${Math.round(S * 0.34)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), cx, cy + S * 0.03);

  // Indicador de direção (nariz) — aponta "pra cima" no canvas;
  // a rotação em tempo real do sprite gira isso pra direção real.
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - S * 0.015);
  ctx.lineTo(cx - S * 0.06, cy - r + S * 0.10);
  ctx.lineTo(cx + S * 0.06, cy - r + S * 0.10);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  return c;
}

function drawPolygon(ctx, x, y, r, sides, rot) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + i * (Math.PI * 2 / sides);
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function makeBallCanvas() {
  const S = 96;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S * 0.46;

  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#d8d8d8');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#181818';
  drawPolygon(ctx, cx, cy, r * 0.30, 5, -Math.PI / 2);
  const ringR = r * 0.60;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5) + Math.PI / 5;
    drawPolygon(ctx, cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR, r * 0.21, 5, a);
  }
  return c;
}

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
    this._team0 = null;
    this._team1 = null;
    this._shadows = [];
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

  // Tela de escolha de seleção — clicável/tocável, consistente com o overlay da roleta de mapa.
  _showTeamSelect(playerLabel, accent, excludeId, onDone) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;padding:20px;`;

    const title = document.createElement('div');
    title.style.cssText = `font-size:24px;margin-bottom:18px;color:${accent};text-shadow:0 0 8px ${accent};`;
    title.textContent = `${playerLabel} — ESCOLHA SUA SELEÇÃO`;
    overlay.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:720px;';
    overlay.appendChild(grid);

    TEAMS.forEach(team => {
      const disabled = team.id === excludeId;
      const btn = document.createElement('button');
      btn.disabled = disabled;
      btn.style.cssText = `
        font-family:monospace;cursor:${disabled ? 'not-allowed' : 'pointer'};
        display:flex;flex-direction:column;align-items:center;gap:6px;
        padding:14px 8px;border-radius:10px;border:2px solid ${disabled ? '#333' : team.trim};
        background:${disabled ? '#141414' : `linear-gradient(160deg, ${lighten(team.shirt, 0.15)}, ${team.shirt})`};
        color:${disabled ? '#555' : readableTextColor(team.shirt)};
        opacity:${disabled ? 0.4 : 1};font-size:13px;font-weight:bold;
        transition:transform 0.1s;
      `;
      btn.innerHTML = `<span style="font-size:26px;">${team.flag}</span><span>${team.name}</span>`;
      if (!disabled) {
        btn.onmouseenter = () => btn.style.transform = 'scale(1.08)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        btn.onclick = () => { overlay.remove(); onDone(team); };
      }
      grid.appendChild(btn);
    });

    document.body.appendChild(overlay);
  }

  create(data = {}) {
    if (data.map === undefined) {
      if (MAPS.length === 1) { this.create({ ...data, map: 0 }); return; }
      this._showRoulette(MAPS, chosen => this.create({ ...data, map: chosen }));
      return;
    }
    if (data.team0 === undefined) {
      this._showTeamSelect('P1', '#4488ff', null, team => this.create({ ...data, team0: team.id }));
      return;
    }
    if (data.team1 === undefined) {
      this._showTeamSelect('P2', '#ff4444', data.team0, team => this.create({ ...data, team1: team.id }));
      return;
    }

    this._map = data.map;
    const map = MAPS[this._map];
    this._team0 = TEAMS.find(t => t.id === data.team0) || TEAMS[0];
    this._team1 = TEAMS.find(t => t.id === data.team1) || TEAMS[1];
    const E = this.e;

    // Câmera inclinada estilo transmissão ("golazo") — só nesta cena.
    E.setTilt(560, 360);

    this.physics.setGravity(0);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    // Background
    E.plane(1280, 720, map.sky, 640, 360, -400);

    // Field
    E.plane(1200, 500, map.grass, 640, 390, -10);
    // Listras de grama cortada (visual)
    for (let s = 0; s < 6; s++) {
      E.plane(1200, 500 / 6, s % 2 === 0 ? lighten2(map.grass) : map.grass, 640, 140 + s * (500 / 6), -9, 0.35);
    }
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
    E.text(`${this._team0.flag} ${this._team0.code} — A/D W/S`, 9, 0x4488ff, 130, 22, 5);
    E.text(`${this._team1.flag} ${this._team1.code} — J/L I/K`, 9, 0xff4444, 1150, 22, 5);
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

    // Ball (sprite bonito + sombra, sempre de frente pra câmera mesmo com tilt)
    const bx = 640, by = 390;
    const ballBody = new Body(bx - BALL_R, by - BALL_R, BALL_R*2, BALL_R*2);
    ballBody.restitution = 0.75;
    this.physics.addBody(ballBody);
    const ballShadow = this._makeShadow(bx, by, BALL_R * 1.1);
    const ballTex = new THREE.CanvasTexture(makeBallCanvas());
    const ballSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ballTex, transparent: true }));
    ballSprite.scale.set(BALL_R * 2.4, BALL_R * 2.4, 1);
    ballSprite.position.set(bx, -by, 6);
    this.e.scene.add(ballSprite);
    this._ball = { body: ballBody, sprite: ballSprite, shadow: ballShadow, friction: 0.96, spin: 0 };

    // Players
    this._spawnPlayer(0, 300, 390, this._team0);
    this._spawnPlayer(1, 980, 390, this._team1);

    this._state = 'playing';
    this._showMsg('APITO INICIAL!', 1500);
  }

  _makeShadow(x, y, r) {
    const geo = new THREE.CircleGeometry(r, 20);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, 0.6, 1);
    mesh.position.set(x, -y, 3);
    this.e.scene.add(mesh);
    this._shadows.push(mesh);
    return mesh;
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

  _spawnPlayer(idx, x, y, team) {
    const body = new Body(x - PLAYER_R, y - PLAYER_R, PLAYER_R*2, PLAYER_R*2);
    this.physics.addBody(body);

    const shadow = this._makeShadow(x, y, PLAYER_R * 1.15);
    const tex = new THREE.CanvasTexture(makeJerseyCanvas(team, idx + 1));
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(PLAYER_R * 2.6, PLAYER_R * 2.6, 1);
    sprite.position.set(x, -y, 6);
    this.e.scene.add(sprite);

    this._players[idx] = {
      idx, body, sprite, shadow, team,
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

    // Sincronizar sprite + sombra (sprite sempre de frente pra câmera, mesmo com tilt)
    p.sprite.position.set(b.cx, -b.cy, 6);
    p.sprite.material.rotation = Math.atan2(-p.dirX, -p.dirY);
    p.shadow.position.set(b.cx, -b.cy, 3);

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
    const team = scorer === 0 ? this._team0 : this._team1;
    this._showMsg(`GOOOL! ${team.flag} ${team.name}!`, 2000);
    this._goalCd = 2.2;

    if (this._score[scorer] >= 5) {
      this._state = 'gameover';
      const totalGoals = this._score[0] + this._score[1];
      SaveSystem.recordScore('football', this._score[scorer] * 100 + totalGoals);
      this._showMsg(`${team.flag} ${team.name} VENCEU!\nENTER para voltar`, 0);
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

    const spd = Math.hypot(ball.body.vx, ball.body.vy);
    ball.spin += spd * dt * 0.012;
    ball.sprite.position.set(ball.body.cx, -ball.body.cy, 6);
    ball.sprite.material.rotation = ball.spin;
    ball.shadow.position.set(ball.body.cx, -ball.body.cy, 3);

    if (this._goalCd <= 0) this._checkGoal();

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
    if (this.inp.justDown('Tab')) {
      this.m.start('FootballScene', {
        map: (this._map + 1) % MAPS.length,
        team0: this._team0.id,
        team1: this._team1.id,
      });
    }
  }

  destroy() {
    this._players.forEach(p => {
      if (!p) return;
      this.e.remove(p.sprite);
    });
    this._shadows.forEach(s => this.e.remove(s));
    this._shadows = [];
    if (this._ball) this.e.remove(this._ball.sprite);
    this.e.resetTilt();
    this.physics.clear();
  }
}

function lighten2(hex) {
  const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, r + 18); g = Math.min(255, g + 18); b = Math.min(255, b + 18);
  return (r << 16) | (g << 8) | b;
}
