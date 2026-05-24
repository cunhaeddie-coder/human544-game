// ── Corrida de Carros — Visão Superior ──────────────────────────
// Câmera ortográfica, gravidade=0, carros giram e se movem
// P1: W/S acelera/freia  A/D vira | P2: I/K  J/L | TAB=trocar mapa

import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem.js';

const GW = 1280, GH = 720;

// ── Carro pixel art (canvas) ─────────────────────────────────────
function carCanvas(bodyCol, detailCol) {
  const S = 3;
  const c = document.createElement('canvas');
  c.width = 14*S; c.height = 22*S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const r = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x*S, y*S, w*S, h*S); };
  // Wheels
  r('#222', 0,2,  3,4); r('#222', 11,2,  3,4);
  r('#222', 0,16, 3,4); r('#222', 11,16, 3,4);
  // Body
  r(bodyCol, 2,0, 10,22);
  // Hood/Trunk
  r(detailCol, 3,1, 8,4); r(detailCol, 3,17,8,4);
  // Windows
  r('#aaddff', 3,5, 8,5); r('#aaddff', 3,12,8,5);
  // Center stripe
  r(detailCol, 6,0, 2,22);
  // Headlights
  r('#ffff88', 3,0, 2,1); r('#ffff88', 9,0, 2,1);
  r('#ff4400', 3,21,2,1); r('#ff4400', 9,21,2,1);
  return c;
}

// ── Mapa: lista de segmentos de pista ────────────────────────────
// Cada mapa tem um circuito definido como polígono de pontos (checkpoints)
const MAPS = [
  {
    name: 'Oval Clássico',
    sky: 0x1a1a1a,
    track: [
      {x:80,y:100},{x:1200,y:100},{x:1240,y:200},
      {x:1240,y:520},{x:1200,y:620},{x:80,y:620},
      {x:40,y:520},{x:40,y:200},{x:80,y:100},
    ],
    trackW: 160,
    startPos: [{x:200,y:130,angle:0},{x:300,y:130,angle:0}],
  },
  {
    name: 'Cidade',
    sky: 0x0a0a1a,
    track: [
      {x:100,y:80},{x:640,y:80},{x:700,y:140},
      {x:700,y:300},{x:780,y:360},{x:1180,y:360},
      {x:1220,y:400},{x:1220,y:620},{x:1160,y:660},
      {x:140,y:660},{x:100,y:620},{x:100,y:80},
    ],
    trackW: 130,
    startPos: [{x:220,y:104,angle:0},{x:360,y:104,angle:0}],
  },
];

const LAPS_TO_WIN = 3;
const CAR_ACCEL   = 520;
const CAR_MAX_SPD = 480;
const CAR_STEER   = 1.8;    // was 2.4 — less spin-out
const CAR_DRAG    = 0.015;  // fraction lost per second (was 0.92/frame = ~90 unit/s cap; now ~500)

export class RacingScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this._map    = 0;
    this._cars   = [];
    this._state  = 'countdown';
    this._t      = 0;
    this._cd     = 3;
    this._cdTimer = 1;
    this._cdSp   = null;
    this._lapSp  = null;
    this._numPlayers = 1;
  }

  _showRoulette(maps, onDone) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;`;
    overlay.innerHTML = `<div style="font-size:22px;margin-bottom:20px;color:#ffc400">🎰 SORTEANDO PISTA...</div><div style="width:320px;height:56px;overflow:hidden;border:2px solid #4488ff;border-radius:8px;background:#0a0f20;"><div id="roulette-items" style="will-change:transform;"></div></div>`;
    document.body.appendChild(overlay);

    const chosen = Math.floor(Math.random() * maps.length);
    const itemH = 56;
    const items = [...maps, ...maps, ...maps, ...maps, maps[chosen]];
    const el = overlay.querySelector('#roulette-items');
    el.style.cssText = 'transition:none;';
    el.innerHTML = items.map(m => `<div style="height:${itemH}px;display:flex;align-items:center;justify-content:center;font-size:18px;letter-spacing:1px;">${m.name}</div>`).join('');

    const target = (items.length - 1) * itemH;
    const start = Date.now();
    const duration = 2500;

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const pos = ease * target;
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
    this._numPlayers = data.players ?? 2;
    const map = MAPS[this._map];
    const E = this.e;

    // Desativa gravidade usando camera top-down trick:
    // Mantemos o engine normal mas gravity=0 e z axis = depth
    this.e.setWorldBounds(0, GW);

    E.plane(GW, GH, map.sky, GW/2, GH/2, -400);
    E.plane(GW, GH, 0x1a1a1a, GW/2, GH/2, -380);

    // Header
    E.plane(GW, 44, 0x000000, GW/2, 22, -370);
    E.text(map.name, 14, 0xffc400, GW/2, 22, 5);
    E.text(`${LAPS_TO_WIN} voltas | W/S A/D  vs  I/K J/L`, 9, 0x667788, GW/2, 22+14, 5);

    // Desenhar pista (polígono → faixas de cor)
    this._drawTrack(map);

    // Criar carros
    this._cars = [];
    this._spawnCar(0, map.startPos[0], 0x4488ff, '#2255cc', 'P1');
    if (this._numPlayers >= 2) this._spawnCar(1, map.startPos[1], 0xff4444, '#cc2222', 'P2');
    else this._spawnAI(map.startPos[1] || map.startPos[0]);

    this._checkpoints = map.track.map((p, i) => ({
      x: p.x, y: p.y, r: map.trackW * 0.8,
    }));

    this._lapSp = E.text(
      this._numPlayers >= 2 ? 'P1: 0v  P2: 0v' : 'Volta: 0',
      13, 0xffffff, GW - 160, 22, 8
    );

    this._state = 'countdown';
    this._cd = 3;
    this._cdSp = E.text('3', 72, 0xffc400, GW/2, GH/2, 50);
  }

  _drawTrack(map) {
    const E = this.e;
    const pts = map.track;
    const tw = map.trackW;

    // Fundo da pista: cinza escuro (asfalto)
    // Desenhamos segmentos como boxes rotacionados
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i+1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const cx = (a.x + b.x)/2, cy = (a.y + b.y)/2;
      const angle = Math.atan2(dy, dx);

      const road = E.box(len + 4, tw, 10, 0x333333, cx, cy, -5);
      road.rotation.z = -angle;

      // Bordas brancas
      const borderL = E.box(len + 4, 6, 12, 0xffffff, cx, cy, -4);
      borderL.rotation.z = -angle;
      const borderR = E.box(len + 4, 6, 12, 0xffffff, cx, cy, -4);
      borderR.rotation.z = -angle;
      borderL.position.y += Math.cos(angle) * (tw/2 - 3);
      borderL.position.x -= Math.sin(angle) * (tw/2 - 3);
      borderR.position.y -= Math.cos(angle) * (tw/2 - 3);
      borderR.position.x += Math.sin(angle) * (tw/2 - 3);

      // Linha central tracejada
      if (Math.floor(i * 2) % 2 === 0) {
        const dash = E.box(Math.min(len*0.4, 40), 4, 12, 0xffff00, cx, cy, -3);
        dash.rotation.z = -angle;
      }
    }

    // Linha de largada
    const s = map.startPos[0];
    E.box(tw, 8, 15, 0xffffff, s.x, s.y + 20, -2);
    for (let i = 0; i < 8; i++) {
      const c = (i % 2 === 0) ? 0x000000 : 0xffffff;
      E.box(tw/8, 8, 16, c, s.x - tw/2 + (i + 0.5) * tw/8, s.y + 20, -1);
    }
  }

  _spawnCar(idx, pos, bodyCol, detailCol, label) {
    const tex = new THREE.CanvasTexture(carCanvas(bodyCol.toString(16).padStart(6,'0').replace(/^/,'#'), detailCol));
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    const geo = new THREE.PlaneGeometry(42, 66);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, -pos.y, 6);
    this.e.scene.add(mesh);

    const labelSp = this.e.text(label, 10, bodyCol, pos.x, pos.y - 40, 8);

    this._cars[idx] = {
      x: pos.x, y: pos.y,
      angle: pos.angle || -Math.PI/2,
      speed: 0,
      vx: 0, vy: 0,
      mesh, labelSp,
      lap: 0, nextCP: 0,
      isPlayer: true, idx,
      bodyCol,
    };
  }

  _spawnAI(pos) {
    // Simples AI car (carro fantasma apenas visual)
  }

  _spawnDrift(x, y) {
    const geo = new THREE.PlaneGeometry(6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.55 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, -y, 1);
    this.e.scene.add(mesh);
    let age = 0;
    const fade = () => {
      age += 16;
      mat.opacity = Math.max(0, 0.55 - age / 900);
      if (age < 900) setTimeout(fade, 16);
      else { this.e.scene.remove(mesh); geo.dispose(); mat.dispose(); }
    };
    setTimeout(fade, 16);
  }

  _driveCar(car, accelKey, brakeKey, leftKey, rightKey, dt) {
    const inp = this.inp;
    let accel = 0, steer = 0;
    if (inp.isDown(accelKey)) accel =  CAR_ACCEL;
    if (inp.isDown(brakeKey)) accel = -CAR_ACCEL * 0.6;
    if (inp.isDown(leftKey))  steer = -CAR_STEER;
    if (inp.isDown(rightKey)) steer =  CAR_STEER;

    car.speed += accel * dt;
    car.speed -= car.speed * CAR_DRAG * dt * 60; // frame-rate-independent drag
    car.speed = Math.max(-120, Math.min(CAR_MAX_SPD, car.speed));

    if (Math.abs(car.speed) > 10) car.angle += steer * dt * (car.speed / CAR_MAX_SPD);

    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    car.x = Math.max(60, Math.min(GW - 60, car.x));
    car.y = Math.max(60, Math.min(GH - 60, car.y));

    car.mesh.position.set(car.x, -car.y, 6);
    car.mesh.rotation.z = car.angle;
    car.labelSp.position.set(car.x, -(car.y - 44), 8);

    // Drift: rastro quando vira em alta velocidade
    if (Math.abs(steer) > 0 && car.speed > CAR_MAX_SPD * 0.55) {
      if (!car._driftTimer) car._driftTimer = 0;
      car._driftTimer -= dt;
      if (car._driftTimer <= 0) {
        car._driftTimer = 0.06;
        this._spawnDrift(car.x, car.y);
      }
    }
  }

  _checkLaps(car) {
    const cp = this._checkpoints[car.nextCP];
    if (!cp) return;
    const dx = car.x - cp.x, dy = car.y - cp.y;
    if (Math.sqrt(dx*dx + dy*dy) < cp.r) {
      car.nextCP = (car.nextCP + 1) % this._checkpoints.length;
      if (car.nextCP === 0) {
        car.lap++;
        if (car.lap >= LAPS_TO_WIN) this._winner(car.idx);
      }
    }
  }

  _winner(idx) {
    if (this._state === 'gameover') return;
    this._state = 'gameover';
    const name = idx === 0 ? 'P1' : 'P2';
    const raceTime = Math.floor(this._t);
    SaveSystem.recordScore('racing', LAPS_TO_WIN * 1000 - raceTime * 10);
    this.e.text(`${name} VENCEU!\n${LAPS_TO_WIN} voltas!\nENTER para voltar`, 22, 0xffc400, GW/2, GH/2 - 40, 50);
  }

  _updateLapHUD() {
    this.e.remove(this._lapSp);
    if (this._numPlayers >= 2) {
      const t = `P1: ${this._cars[0]?.lap||0}v  P2: ${this._cars[1]?.lap||0}v`;
      this._lapSp = this.e.text(t, 13, 0xffffff, GW - 160, 22, 8);
    } else {
      this._lapSp = this.e.text(`Volta: ${this._cars[0]?.lap||0}`, 13, 0xffffff, GW - 140, 22, 8);
    }
  }

  update(dt) {
    // Countdown
    if (this._state === 'countdown') {
      this._cdTimer -= dt;
      if (this._cdTimer <= 0) {
        this._cd--;
        this._cdTimer = 1;
        this.e.remove(this._cdSp);
        if (this._cd > 0) {
          this._cdSp = this.e.text(`${this._cd}`, 72, 0xffc400, GW/2, GH/2, 50);
        } else {
          this._cdSp = this.e.text('VAI!', 60, 0x00e676, GW/2, GH/2, 50);
          setTimeout(() => { this.e.remove(this._cdSp); this._cdSp = null; }, 700);
          this._state = 'playing';
        }
      }
      return;
    }

    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter') || this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }

    this._t += dt;

    // Drive
    if (this._cars[0]) this._driveCar(this._cars[0], 'KeyW', 'KeyS', 'KeyA', 'KeyD', dt);
    if (this._cars[1]) this._driveCar(this._cars[1], 'KeyI', 'KeyK', 'KeyJ', 'KeyL', dt);

    // Lap check
    this._cars.forEach(c => c && this._checkLaps(c));
    this._updateLapHUD();

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
    if (this.inp.justDown('Tab')) this.m.start('RacingScene', { map: (this._map+1) % MAPS.length, players: this._numPlayers });
  }

  destroy() {
    this._cars.forEach(c => {
      if (!c) return;
      c.mesh?.geometry?.dispose();
      c.mesh?.material?.map?.dispose();
      c.mesh?.material?.dispose();
      this.e.scene?.remove(c.mesh);
      this.e.remove(c.labelSp);
    });
  }
}
