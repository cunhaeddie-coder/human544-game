// ── Racing — Corrida Retro Top-Down (rolagem infinita) ───────────
// Menu → Garagem (3 carros) → Corrida → Pausa/Game Over
// Setas/WASD dirigem, P pausa, ESC volta ao hub de minijogos.

import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem.js';

// ── Layout do mundo ────────────────────────────────────────────
const ROAD_X = 460, ROAD_W = 360, ROAD_RIGHT = ROAD_X + ROAD_W;
const LANES = 3, LANE_W = ROAD_W / LANES;
const PLAYER_Y = 600;
const CAR_W = 40, CAR_H = 64;
const CURVE_AMP = 70, CURVE_FREQ = 0.0014;
const LANE_PERIOD = 60, CURB_PERIOD = 46;

// ── Carros da garagem (afetam física real da corrida) ────────────
const CAR_TYPES = [
  { id:'red',   name:'Relâmpago', color:0xff6a5f, trim:0x3a0f0c,
    accel:230, brake:360, maxSpeed:480, lateral:640, lives:2,
    desc:'Veloz e ágil, mas qualquer batida dói.' },
  { id:'blue',  name:'Equalizer', color:0x6c7bf0, trim:0x0d1042,
    accel:175, brake:300, maxSpeed:400, lateral:520, lives:3,
    desc:'Equilíbrio entre velocidade e resistência.' },
  { id:'green', name:'Muralha',   color:0x3fae6b, trim:0x0a2a17,
    accel:130, brake:250, maxSpeed:320, lateral:420, lives:5,
    desc:'Lento, mas aguenta muito tranco.' },
];

// ── Utilitários ───────────────────────────────────────────────────
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function rand(min, max){ return min + Math.random() * (max - min); }
function choice(arr){ return arr[(Math.random() * arr.length) | 0]; }
function hexStr(n){ return '#' + n.toString(16).padStart(6, '0'); }
function laneCenter(i){ return ROAD_X + LANE_W * (i + 0.5); }
function rectsOverlap(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function carBox(x, y){
  const insetX = 6, insetY = 10;
  return { x: x - CAR_W / 2 + insetX, y: y - CAR_H / 2 + insetY, w: CAR_W - insetX * 2, h: CAR_H - insetY * 2 };
}
function btnStyle(bg, fg){
  return `font-family:monospace;font-weight:800;font-size:13px;letter-spacing:.5px;text-transform:uppercase;` +
    `padding:12px 22px;border-radius:7px;border:none;cursor:pointer;color:${fg || '#14111d'};background:${bg};` +
    `box-shadow:0 4px 0 rgba(0,0,0,.35),0 8px 14px rgba(0,0,0,.35);`;
}

// ── Arte em canvas (carro, coleta, faísca) ────────────────────────
function makeCarCanvas(bodyHex, trimHex){
  const c = document.createElement('canvas');
  c.width = 80; c.height = 128;
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.fillStyle = hexStr(bodyHex);
  ctx.fillRect(w * 0.12, 0, w * 0.76, h);
  ctx.fillStyle = hexStr(trimHex);
  ctx.fillRect(w * 0.12, 0, w * 0.76, h * 0.12);
  ctx.fillRect(w * 0.12, h * 0.86, w * 0.76, h * 0.14);
  ctx.fillStyle = 'rgba(20,22,35,.88)';
  ctx.fillRect(w * 0.20, h * 0.16, w * 0.60, h * 0.22);
  ctx.fillStyle = 'rgba(20,22,35,.6)';
  ctx.fillRect(w * 0.22, h * 0.44, w * 0.56, h * 0.16);
  ctx.fillStyle = '#fff6d8';
  ctx.fillRect(w * 0.14, h * 0.015, w * 0.16, h * 0.045);
  ctx.fillRect(w * 0.70, h * 0.015, w * 0.16, h * 0.045);
  ctx.fillStyle = '#ff6a5f';
  ctx.fillRect(w * 0.14, h * 0.94, w * 0.16, h * 0.045);
  ctx.fillRect(w * 0.70, h * 0.94, w * 0.16, h * 0.045);
  return c;
}
function makeCoinCanvas(){
  const c = document.createElement('canvas');
  c.width = c.height = 40;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(16, 14, 2, 20, 20, 18);
  grad.addColorStop(0, '#ffe08a'); grad.addColorStop(1, '#c98420');
  ctx.beginPath(); ctx.arc(20, 20, 17, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = '#7a4d10'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#7a4d10'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', 20, 21);
  return c;
}
function makeFuelCanvas(){
  const c = document.createElement('canvas');
  c.width = 32; c.height = 40;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6c7bf0'; ctx.fillRect(2, 10, 28, 28);
  ctx.fillStyle = '#f4f2fb'; ctx.fillRect(2, 10, 28, 7);
  ctx.fillStyle = '#0d1042'; ctx.fillRect(11, 2, 10, 9);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('F', 16, 26);
  return c;
}
function makeSparkCanvas(){
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(16, 8); ctx.lineTo(8, 16); ctx.lineTo(0, 8);
  ctx.closePath(); ctx.fill();
  return c;
}
function makeTreeCanvas(){
  const c = document.createElement('canvas');
  c.width = 44; c.height = 60;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a2416'; ctx.fillRect(19, 40, 6, 18);
  ctx.fillStyle = '#2f7a3f';
  ctx.beginPath(); ctx.moveTo(22, 2); ctx.lineTo(4, 38); ctx.lineTo(40, 38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d9750';
  ctx.beginPath(); ctx.moveTo(22, 16); ctx.lineTo(8, 46); ctx.lineTo(36, 46); ctx.closePath(); ctx.fill();
  return c;
}
function makePoleCanvas(){
  const c = document.createElement('canvas');
  c.width = 20; c.height = 60;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a8698'; ctx.fillRect(8, 10, 4, 50);
  ctx.fillStyle = '#ffb648'; ctx.fillRect(2, 2, 16, 10);
  return c;
}

export class RacingScene {
  constructor(e, m, i){
    this.e = e; this.m = m; this.inp = i;
    this._state = 'MENU'; // MENU | GARAGE | PLAYING | PAUSED | GAMEOVER
    this._selectedType = CAR_TYPES[1];
    this._overlay = null;
    this._domEls = [];
    this._carTex = new Map();
    this._treeTex = null; this._poleTex = null; this._coinTex = null; this._fuelTex = null; this._sparkTex = null;

    this._player = null;
    this._enemies = [];
    this._coins = [];
    this._fuelCans = [];
    this._decor = [];
    this._particles = [];
    this._laneDashes = [];
    this._curbSegs = [];
    this._trackMeshes = [];

    this._score = 0;
    this._distance = 0;
    this._scroll = 0;
    this._curveOffset = 0;
    this._enemyTimer = 0; this._coinTimer = 0; this._fuelTimer = 0; this._decorTimer = 0;
  }

  create(){
    this._buildTextures();
    this.e.plane(1280, 720, 0x120f1c, 640, 360, -400);
    this._showMenu();
  }

  // ── Texturas compartilhadas (construídas 1x, reusadas em toda a cena) ──
  _buildTextures(){
    CAR_TYPES.forEach(t => this._carTex.set(t.id, new THREE.CanvasTexture(makeCarCanvas(t.color, t.trim))));
    this._treeTex = new THREE.CanvasTexture(makeTreeCanvas());
    this._poleTex = new THREE.CanvasTexture(makePoleCanvas());
    this._coinTex = new THREE.CanvasTexture(makeCoinCanvas());
    this._fuelTex = new THREE.CanvasTexture(makeFuelCanvas());
    this._sparkTex = new THREE.CanvasTexture(makeSparkCanvas());
  }

  // ================================================================
  // MENUS (overlays de DOM, mesmo padrão de z-index:800 do Football)
  // ================================================================
  _clearOverlay(){ if (this._overlay){ this._overlay.remove(); this._overlay = null; } }

  _showMenu(){
    this._state = 'MENU';
    this._clearOverlay();
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(6,4,10,.92);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;gap:16px;text-align:center;padding:20px;`;
    ov.innerHTML = `
      <div style="font-size:30px;font-weight:900;letter-spacing:1px;color:#ffb648;text-shadow:0 3px 0 #ff6a5f,0 6px 12px rgba(0,0,0,.5);">PIXEL RACER</div>
      <div style="font-size:11px;letter-spacing:3px;color:#6c7bf0;">CORRIDA RETRO TOP-DOWN</div>
      <div style="font-size:11px;line-height:1.7;opacity:.75;max-width:340px;">Setas ou WASD pra dirigir · P pausa · ESC volta ao hub.<br>Colete moedas e galões de combustível, desvie do tráfego e não deixe o tanque secar.</div>
      <button id="rc-play" style="${btnStyle('#ffb648')}">▶ Jogar</button>
    `;
    document.body.appendChild(ov);
    this._overlay = ov;
    ov.querySelector('#rc-play').onclick = () => this._showGarage();
  }

  _showGarage(){
    this._state = 'GARAGE';
    this._clearOverlay();
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(6,4,10,.92);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;gap:16px;padding:20px;`;

    const title = document.createElement('div');
    title.style.cssText = 'font-size:20px;font-weight:900;color:#ffb648;';
    title.textContent = 'ESCOLHA SEU CARRO';
    ov.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:520px;';
    CAR_TYPES.forEach(t => {
      const selected = t.id === this._selectedType.id;
      const card = document.createElement('div');
      card.style.cssText = `width:150px;padding:12px;border-radius:10px;cursor:pointer;text-align:left;` +
        `background:#181626;border:2px solid ${selected ? '#ffb648' : '#332e47'};`;
      card.innerHTML = `
        <div style="width:100%;height:46px;border-radius:6px;margin-bottom:8px;background:${hexStr(t.color)};box-shadow:inset 0 -8px 10px rgba(0,0,0,.3);"></div>
        <div style="font-size:12px;font-weight:800;">${t.name}</div>
        <div style="font-size:9.5px;opacity:.7;margin:5px 0 8px;line-height:1.4;min-height:32px;">${t.desc}</div>
        <div style="font-size:8px;opacity:.8;margin-bottom:2px;">VELOCIDADE</div>
        <div style="height:5px;background:#0c0a14;border-radius:3px;overflow:hidden;margin-bottom:6px;"><div style="height:100%;width:${t.maxSpeed / 4.8}%;background:#6c7bf0;"></div></div>
        <div style="font-size:8px;opacity:.8;margin-bottom:2px;">VIDA</div>
        <div style="height:5px;background:#0c0a14;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${t.lives * 20}%;background:#ff6a5f;"></div></div>
      `;
      card.onclick = () => { this._selectedType = t; this._showGarage(); };
      grid.appendChild(card);
    });
    ov.appendChild(grid);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;';
    row.innerHTML = `<button id="rc-start" style="${btnStyle('#ffb648')}">🏁 Iniciar corrida</button>` +
      `<button id="rc-back" style="${btnStyle('#3a3648', '#eee9fb')}">← Voltar</button>`;
    ov.appendChild(row);

    document.body.appendChild(ov);
    this._overlay = ov;
    ov.querySelector('#rc-start').onclick = () => this._startRun();
    ov.querySelector('#rc-back').onclick = () => this._showMenu();
  }

  _showPause(){
    this._state = 'PAUSED';
    this._clearOverlay();
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(6,4,10,.85);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;gap:16px;`;
    ov.innerHTML = `
      <div style="font-size:24px;font-weight:900;color:#ffb648;">PAUSADO</div>
      <div style="display:flex;gap:10px;">
        <button id="rc-resume" style="${btnStyle('#ffb648')}">▶ Continuar</button>
        <button id="rc-quit" style="${btnStyle('#ff6a5f', '#3a0f0c')}">■ Sair pro menu</button>
      </div>
    `;
    document.body.appendChild(ov);
    this._overlay = ov;
    ov.querySelector('#rc-resume').onclick = () => this._resume();
    ov.querySelector('#rc-quit').onclick = () => { this._clearWorld(); this._showMenu(); };
  }

  _resume(){
    this._state = 'PLAYING';
    this._clearOverlay();
  }

  // ================================================================
  // CICLO DE UMA CORRIDA
  // ================================================================
  _startRun(){
    this._clearOverlay();
    this._buildWorld();
  }

  _buildWorld(){
    this._clearWorld();
    const E = this.e;
    const type = this._selectedType;

    // Jogador
    this._player = {
      type, x: laneCenter(1), speed: 0, lateralVel: 0,
      lives: type.lives, maxLives: type.lives, fuel: 100, coins: 0, invuln: 0,
      sprite: null, shadow: null,
    };
    const pSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._carTex.get(type.id), transparent: true }));
    pSprite.scale.set(CAR_W * 1.15, CAR_H * 1.15, 1);
    pSprite.position.set(this._player.x, -PLAYER_Y, 6);
    E.scene.add(pSprite);
    this._player.sprite = pSprite;
    this._player.shadow = this._makeShadow(this._player.x, PLAYER_Y, CAR_W * 0.6);

    // Cenário base (grama + asfalto)
    this._trackMeshes.push(E.plane(1280, 720, 0x1c3f22, 640, 360, -20));
    const roadMesh = E.plane(ROAD_W, 720, 0x333142, (ROAD_X + ROAD_RIGHT) / 2, 360, -18);
    roadMesh.userData.baseX = (ROAD_X + ROAD_RIGHT) / 2;
    this._trackMeshes.push(roadMesh);
    this._roadMesh = roadMesh;

    // Acostamento (segmentos alternados âmbar/branco, reciclados por scroll)
    this._curbSegs = [];
    for (const side of [-1, 1]){
      const x = side < 0 ? ROAD_X - 8 : ROAD_RIGHT + 8;
      for (let i = 0; i < 20; i++){
        const color = i % 2 === 0 ? 0xffb648 : 0xf4f2fb;
        const seg = E.box(12, CURB_PERIOD, 2, color, x, 0, -6);
        seg.userData = { baseX: x, baseY: -CURB_PERIOD + i * CURB_PERIOD };
        this._curbSegs.push(seg);
      }
    }

    // Faixas centrais tracejadas
    this._laneDashes = [];
    for (const lane of [1, 2]){
      const x = ROAD_X + LANE_W * lane;
      for (let i = 0; i < 16; i++){
        const dash = E.box(4, 34, 2, 0xf4f2fb, x, 0, -6);
        dash.userData = { baseX: x, baseY: -LANE_PERIOD + i * LANE_PERIOD };
        this._laneDashes.push(dash);
      }
    }

    // Cabeçalho (mesmo padrão visual dos outros minijogos)
    this._trackMeshes.push(E.plane(1280, 44, 0x000000, 640, 22, -2));
    this._trackMeshes.push(E.text('CORRIDA', 14, 0xffffff, 640, 22, 5));

    this._score = 0; this._distance = 0; this._scroll = 0; this._curveOffset = 0;
    this._enemyTimer = 1.2; this._coinTimer = 1.6; this._fuelTimer = 4.5; this._decorTimer = 0;
    this._enemies = []; this._coins = []; this._fuelCans = []; this._decor = []; this._particles = [];

    for (let y = 40; y < 720; y += 110) this._spawnDecorPair(y);

    this._buildHUD();
    this._state = 'PLAYING';
    this.e.canvas?.focus?.();
  }

  _makeShadow(x, y, r){
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(r, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
    );
    mesh.scale.set(1, 0.55, 1);
    mesh.position.set(x, -y, 3);
    this.e.scene.add(mesh);
    return mesh;
  }

  _spawnDecorPair(y){
    for (const side of [-1, 1]){
      const type = Math.random() < 0.7 ? 'tree' : 'pole';
      const baseX = side < 0 ? ROAD_X - rand(30, 60) : ROAD_RIGHT + rand(30, 60);
      const tex = type === 'tree' ? this._treeTex : this._poleTex;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      const scale = type === 'tree' ? 46 : 30;
      sprite.scale.set(scale * 0.75, scale, 1);
      sprite.position.set(baseX, -y, 1);
      this.e.scene.add(sprite);
      this._decor.push({ sprite, baseX, y });
    }
  }

  // ── Limpa tudo que pertence a uma corrida (mundo + HUD) ─────────
  _clearWorld(){
    this._enemies.forEach(en => { this.e.remove(en.sprite); this.e.remove(en.shadow); });
    this._enemies = [];
    this._coins.forEach(c => this.e.remove(c.sprite));
    this._coins = [];
    this._fuelCans.forEach(f => this.e.remove(f.sprite));
    this._fuelCans = [];
    this._decor.forEach(d => this.e.remove(d.sprite));
    this._decor = [];
    this._particles.forEach(p => this.e.remove(p.sprite));
    this._particles = [];
    this._laneDashes.forEach(m => this.e.remove(m));
    this._laneDashes = [];
    this._curbSegs.forEach(m => this.e.remove(m));
    this._curbSegs = [];
    this._trackMeshes.forEach(m => this.e.remove(m));
    this._trackMeshes = [];
    if (this._player){
      this.e.remove(this._player.sprite);
      this.e.remove(this._player.shadow);
      this._player = null;
    }
    this._removeHUD();
  }

  // ================================================================
  // FÍSICA E REGRAS DE CADA FRAME DE GAMEPLAY
  // ================================================================
  _updatePlaying(dt){
    const p = this._player;
    this._handleInput(p, dt);
    this._updatePlayerPos(p, dt);

    this._scroll += p.speed * dt;
    this._distance += p.speed * dt;
    this._curveOffset = Math.sin(this._distance * CURVE_FREQ) * CURVE_AMP;

    this._updateTrackStripes();
    this._updateSpawns(dt);
    this._updateDecor(dt, p.speed);
    this._updateEnemies(dt, p.speed);
    this._updatePickups(dt, p.speed);
    this._checkCollisions();
    this._updateParticles(dt);

    const drain = 1.1 + (Math.abs(p.speed) / p.type.maxSpeed) * 2.6;
    p.fuel = clamp(p.fuel - drain * dt, 0, 100);
    if (p.invuln > 0) p.invuln -= dt;
    this._score += Math.abs(p.speed) * dt * 0.09;

    if (p.fuel <= 0){ this._endRun('Pane seca!'); return; }

    p.sprite.position.set(p.x, -PLAYER_Y, 6);
    p.shadow.position.set(p.x, -PLAYER_Y, 3);
    const tilt = clamp(-p.lateralVel / p.type.lateral, -1, 1) * 0.3;
    p.sprite.material.rotation = tilt;
    p.sprite.visible = !(p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0);

    this._updateHUD();
  }

  _handleInput(p, dt){
    if (this.inp.up) p.speed += p.type.accel * dt;
    else if (this.inp.down) p.speed -= p.type.brake * dt;
    else {
      const fric = 95;
      if (p.speed > 0) p.speed = Math.max(0, p.speed - fric * dt);
      else if (p.speed < 0) p.speed = Math.min(0, p.speed + fric * dt);
    }
    p.speed = clamp(p.speed, -p.type.maxSpeed * 0.35, p.type.maxSpeed);

    let input = 0;
    if (this.inp.left) input -= 1;
    if (this.inp.right) input += 1;
    const speedFactor = Math.abs(p.speed) / p.type.maxSpeed;
    const lateralFriction = 8.5 - speedFactor * 5.5; // derrapa mais em alta velocidade
    p.lateralVel += input * p.type.lateral * dt;
    p.lateralVel *= Math.max(0, 1 - lateralFriction * dt);
    p.lateralVel = clamp(p.lateralVel, -p.type.lateral, p.type.lateral);
  }

  _updatePlayerPos(p, dt){
    p.x += p.lateralVel * dt;
    const margin = CAR_W / 2 + 4;
    const minX = ROAD_X - 26, maxX = ROAD_RIGHT + 26;
    if (p.x < minX + margin){ p.x = minX + margin; p.lateralVel *= -0.3; }
    if (p.x > maxX - margin){ p.x = maxX - margin; p.lateralVel *= -0.3; }

    const onRoad = p.x > ROAD_X + margin && p.x < ROAD_RIGHT - margin;
    if (!onRoad && Math.abs(p.speed) > 40) p.speed *= (1 - dt * 1.4); // acostamento freia
  }

  get _difficulty(){ return Math.floor(this._score / 1000); }

  _updateSpawns(dt){
    const lvl = this._difficulty;
    this._enemyTimer -= dt;
    if (this._enemyTimer <= 0){
      this._enemyTimer = Math.max(0.55, 1.7 - lvl * 0.1);
      this._spawnEnemy(lvl);
    }
    this._coinTimer -= dt;
    if (this._coinTimer <= 0){ this._coinTimer = rand(1.1, 2.2); this._spawnCoin(); }
    this._fuelTimer -= dt;
    if (this._fuelTimer <= 0){ this._fuelTimer = rand(6, 10); this._spawnFuel(); }
    this._decorTimer -= dt;
    if (this._decorTimer <= 0){ this._decorTimer = 0.55; this._spawnDecorPair(-50); }
  }

  _spawnEnemy(lvl){
    const lane = (Math.random() * LANES) | 0;
    const speed = rand(70, 170) + lvl * 8;
    const type = choice(CAR_TYPES);
    const x = laneCenter(lane);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._carTex.get(type.id), transparent: true }));
    sprite.scale.set(CAR_W * 1.1, CAR_H * 1.1, 1);
    sprite.position.set(x, 70, 6);
    this.e.scene.add(sprite);
    this._enemies.push({
      lane, x, y: -70, speed, sprite, shadow: this._makeShadow(x, -70, CAR_W * 0.55),
      laneChangeTimer: rand(2, 5), targetX: x,
    });
  }

  _spawnCoin(){
    const x = laneCenter((Math.random() * LANES) | 0);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._coinTex, transparent: true }));
    sprite.scale.set(26, 26, 1);
    sprite.position.set(x, 30, 6);
    this.e.scene.add(sprite);
    this._coins.push({ x, y: -30, sprite, r: 15, spin: 0 });
  }

  _spawnFuel(){
    const x = laneCenter((Math.random() * LANES) | 0);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._fuelTex, transparent: true }));
    sprite.scale.set(24, 30, 1);
    sprite.position.set(x, 30, 6);
    this.e.scene.add(sprite);
    this._fuelCans.push({ x, y: -30, sprite, r: 16 });
  }

  _updateTrackStripes(){
    const laneOff = this._scroll % LANE_PERIOD;
    for (const m of this._laneDashes){
      m.position.y = -(m.userData.baseY + laneOff);
      m.position.x = m.userData.baseX + this._curveOffset;
    }
    const curbOff = this._scroll % CURB_PERIOD;
    for (const m of this._curbSegs){
      m.position.y = -(m.userData.baseY + curbOff);
      m.position.x = m.userData.baseX + this._curveOffset * 0.8;
    }
    if (this._roadMesh) this._roadMesh.position.x = this._roadMesh.userData.baseX + this._curveOffset * 0.3;
  }

  _updateDecor(dt, speed){
    for (let i = this._decor.length - 1; i >= 0; i--){
      const d = this._decor[i];
      d.y += speed * dt;
      d.sprite.position.set(d.baseX + this._curveOffset * 0.5, -d.y, 1);
      if (d.y > 780){ this.e.remove(d.sprite); this._decor.splice(i, 1); }
    }
  }

  _updateEnemies(dt, playerSpeed){
    for (let i = this._enemies.length - 1; i >= 0; i--){
      const en = this._enemies[i];
      en.y += (playerSpeed - en.speed) * dt;

      en.laneChangeTimer -= dt;
      if (en.laneChangeTimer <= 0){
        en.laneChangeTimer = rand(2.5, 5.5);
        en.lane = clamp(en.lane + choice([-1, 1]), 0, LANES - 1);
        en.targetX = laneCenter(en.lane);
      }
      en.x += (en.targetX + this._curveOffset * 0.5 - en.x) * clamp(dt * 2.2, 0, 1);

      en.sprite.position.set(en.x, -en.y, 6);
      en.shadow.position.set(en.x, -en.y, 3);

      if (en.y > 800 || en.y < -180){
        this.e.remove(en.sprite); this.e.remove(en.shadow);
        this._enemies.splice(i, 1);
      }
    }
  }

  _updatePickups(dt, speed){
    for (let i = this._coins.length - 1; i >= 0; i--){
      const c = this._coins[i];
      c.y += speed * dt; c.spin += dt * 6;
      const squish = Math.max(0.25, Math.abs(Math.cos(c.spin)));
      c.sprite.scale.set(26 * squish, 26, 1);
      c.sprite.position.set(c.x, -c.y, 6);
      if (c.y > 780){ this.e.remove(c.sprite); this._coins.splice(i, 1); }
    }
    for (let i = this._fuelCans.length - 1; i >= 0; i--){
      const f = this._fuelCans[i];
      f.y += speed * dt;
      f.sprite.position.set(f.x, -f.y, 6);
      if (f.y > 780){ this.e.remove(f.sprite); this._fuelCans.splice(i, 1); }
    }
  }

  // ── Colisões (AABB refinada pro tráfego, raio pros coletáveis) ──
  _checkCollisions(){
    const p = this._player, pBox = carBox(p.x, PLAYER_Y);

    if (p.invuln <= 0){
      for (const en of this._enemies){
        if (rectsOverlap(pBox, carBox(en.x, en.y))){
          p.lives--; p.invuln = 1.4; p.speed *= 0.35;
          this._spawnBurst(p.x, PLAYER_Y - 14, 0xffb648, 16);
          this._spawnBurst(p.x, PLAYER_Y - 14, 0xff6a5f, 10);
          en.y = 9999; // remove o inimigo colidido nesta mesma varredura
          if (p.lives <= 0){ this._endRun('Colisão fatal!'); return; }
          break;
        }
      }
    }

    for (let i = this._coins.length - 1; i >= 0; i--){
      const c = this._coins[i];
      if (Math.hypot(c.x - p.x, c.y - PLAYER_Y) < c.r + 18){
        p.coins++; this._score += 60;
        this._spawnBurst(c.x, c.y, 0xffb648, 8);
        this.e.remove(c.sprite); this._coins.splice(i, 1);
      }
    }
    for (let i = this._fuelCans.length - 1; i >= 0; i--){
      const f = this._fuelCans[i];
      if (Math.hypot(f.x - p.x, f.y - PLAYER_Y) < f.r + 18){
        p.fuel = clamp(p.fuel + 34, 0, 100);
        this._spawnBurst(f.x, f.y, 0x6c7bf0, 8);
        this.e.remove(f.sprite); this._fuelCans.splice(i, 1);
      }
    }
  }

  // ── Partículas (faíscas de colisão / brilho de coleta) ───────────
  _spawnBurst(x, y, colorHex, count){
    for (let n = 0; n < count; n++){
      const a = rand(0, Math.PI * 2), sp = rand(60, 220);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._sparkTex, color: colorHex, transparent: true }));
      sprite.scale.set(9, 9, 1);
      sprite.position.set(x, -y, 7);
      this.e.scene.add(sprite);
      this._particles.push({ sprite, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.6), maxLife: 0.6 });
    }
  }

  _updateParticles(dt){
    for (let i = this._particles.length - 1; i >= 0; i--){
      const pt = this._particles[i];
      pt.sprite.position.x += pt.vx * dt;
      pt.sprite.position.y -= pt.vy * dt;
      pt.vx *= (1 - dt * 2.2); pt.vy *= (1 - dt * 2.2);
      pt.life -= dt;
      pt.sprite.material.opacity = Math.max(0, pt.life / pt.maxLife);
      if (pt.life <= 0){ this.e.remove(pt.sprite); this._particles.splice(i, 1); }
    }
  }

  // ================================================================
  // HUD (DOM — atualiza todo frame, mesmo padrão do HP/relógio do Minecraft)
  // ================================================================
  _buildHUD(){
    const mk = css => {
      const d = document.createElement('div');
      d.style.cssText = css;
      document.body.appendChild(d);
      this._domEls.push(d);
      return d;
    };
    const base = 'position:fixed;z-index:500;pointer-events:none;background:rgba(6,4,10,.6);' +
      'border-radius:6px;font-family:monospace;color:#fff;';
    this._hudFuel  = mk(base + 'top:56px;left:8px;padding:6px 10px;font-size:10px;min-width:120px;');
    this._hudLives = mk(base + 'top:98px;left:8px;padding:6px 10px;font-size:14px;');
    this._hudScore = mk(base + 'top:56px;right:8px;padding:6px 10px;font-size:11px;text-align:right;color:#ffb648;min-width:120px;');
    this._hudSpeed = mk(base + 'bottom:8px;right:8px;padding:6px 12px;font-size:20px;font-weight:bold;text-align:right;color:#6c7bf0;');
  }

  _removeHUD(){
    this._domEls.forEach(el => el.remove());
    this._domEls = [];
    this._hudFuel = this._hudLives = this._hudScore = this._hudSpeed = null;
  }

  _updateHUD(){
    if (!this._hudFuel) return;
    const p = this._player;
    const pct = p.fuel;
    const barColor = pct > 35 ? '#3fae6b' : pct > 15 ? '#ffb648' : '#ff6a5f';
    this._hudFuel.innerHTML = `FUEL<div style="height:6px;background:#0c0a14;border-radius:3px;overflow:hidden;margin-top:3px;">` +
      `<div style="height:100%;width:${pct}%;background:${barColor};"></div></div>`;
    this._hudLives.textContent = '❤'.repeat(Math.max(0, p.lives)) + '🖤'.repeat(p.maxLives - p.lives);
    this._hudScore.innerHTML = `MOEDAS ${p.coins}<br><b style="font-size:16px;">${String(Math.floor(this._score)).padStart(6, '0')}</b>`;
    const kmh = Math.round(Math.abs(p.speed) * 0.45);
    this._hudSpeed.textContent = `${kmh} KM/H${p.speed < -4 ? ' R' : ''}`;
  }

  // ── Fim de corrida ────────────────────────────────────────────
  _endRun(reason){
    this._state = 'GAMEOVER';
    SaveSystem.recordScore('racing', Math.floor(this._score));
    const finalScore = Math.floor(this._score), finalCoins = this._player.coins;
    this._removeHUD();

    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(6,4,10,.94);z-index:800;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;color:#fff;gap:12px;text-align:center;`;
    ov.innerHTML = `
      <div style="font-size:26px;font-weight:900;color:#ff6a5f;">GAME OVER</div>
      <div style="font-size:11px;letter-spacing:2px;color:#ffb648;">${reason}</div>
      <div style="font-size:11px;opacity:.7;">PONTUAÇÃO FINAL</div>
      <div style="font-size:32px;font-weight:900;color:#ffb648;">${finalScore}</div>
      <div style="font-size:11px;opacity:.8;">Moedas: ${finalCoins}</div>
      <div style="display:flex;gap:10px;">
        <button id="rc-retry" style="${btnStyle('#ffb648')}">↻ Jogar de novo</button>
        <button id="rc-menu" style="${btnStyle('#3a3648', '#eee9fb')}">Menu</button>
      </div>
    `;
    document.body.appendChild(ov);
    this._overlay = ov;
    ov.querySelector('#rc-retry').onclick = () => this._startRun();
    ov.querySelector('#rc-menu').onclick = () => { this._clearWorld(); this._showMenu(); };
  }

  // ================================================================
  update(dt){
    if (this.inp.justDown('Escape')){ this.m.start('LeisureScene'); return; }
    if (this.inp.justDown('KeyP')){
      if (this._state === 'PLAYING') return this._showPause();
      if (this._state === 'PAUSED') return this._resume();
    }
    if (this._state === 'PLAYING') this._updatePlaying(dt);
  }

  destroy(){
    this._clearWorld();
    this._clearOverlay();
    this._carTex.forEach(t => t.dispose());
    [this._treeTex, this._poleTex, this._coinTex, this._fuelTex, this._sparkTex].forEach(t => t?.dispose());
  }
}
