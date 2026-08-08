// ── Boss Secreto: GLITCH ──────────────────────────────────────────
// A arena "buga" de propósito: gravidade inverte, controles trocam,
// o chão pisca, a câmera vira de cabeça pra baixo, a velocidade muda —
// um efeito por vez, alternando durante a luta. O boss teleporta e
// atira. Arena própria e independente da campanha.
// WASD move/pula · Espaço atira · ESC sai

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const GRAVITY = 900;
const SPD = 200;
const JUMP_V = -420;
const TOP_Y = 70, BOTTOM_Y = 660;   // limites permanentes da arena (nunca somem)
const GROUND_Y = 600;               // chão principal (esse pisca durante o glitch)
const BULLET_SPD = 480;

const GLITCH_TYPES = ['gravity', 'controls', 'floor', 'camera', 'speed'];
const GLITCH_LABEL = {
  gravity:  '⚠ GRAVIDADE INVERTIDA',
  controls: '⚠ CONTROLES TROCADOS',
  floor:    '⚠ CHÃO INSTÁVEL',
  camera:   '⚠ CÂMERA INVERTIDA',
  speed:    '⚠ VELOCIDADE ALTERADA',
};

export class GlitchBossScene {
  constructor(e, m, i){
    this.e = e; this.m = m; this.inp = i;
    this.physics = new Physics2D();
    this._state = 'playing';
    this._t = 0;
    this._bullets = [];
    this._glitchTimer = 3;
    this._glitchActive = null; // { type, timer }
    this._speedMult = 1;
  }

  create(){
    this.physics.setGravity(GRAVITY);
    this.physics.setWorldBounds(60, 1220, 9999);
    const E = this.e;

    E.plane(1280, 720, 0x0a0a14, 640, 360, -400);
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text('BOSS SECRETO — GLITCH', 16, 0x44ffcc, 640, 22, 5);
    E.text('WASD move/pula · Espaço atira · ESC sai', 9, 0x8899aa, 640, 700, 5);

    // Limites permanentes (nunca desaparecem, mesmo com gravidade invertida)
    this.physics.addStatic(new Body(60, TOP_Y - 12, 1160, 10));
    this.physics.addStatic(new Body(60, BOTTOM_Y + 20, 1160, 10));
    E.box(1160, 10, 4, 0x222244, 640, TOP_Y - 7, -3);
    E.box(1160, 10, 4, 0x222244, 640, BOTTOM_Y + 25, -3);

    // Chão principal — esse é o que pisca no glitch "floor"
    this._groundBody = new Body(60, GROUND_Y, 1160, 20);
    this.physics.addStatic(this._groundBody);
    this._groundMesh = E.box(1160, 20, 10, 0x223344, 640, GROUND_Y + 10, -2);

    this._playerBody = new Body(260 - 16, GROUND_Y - 48, 32, 48);
    this.physics.addBody(this._playerBody);
    this._playerSprite = E.box(32, 48, 20, 0x4488ff, 260, GROUND_Y - 24, 4);
    this._playerHP = 100; this._playerMaxHP = 100; this._playerDir = 1;

    this._bossX = 1000; this._bossY = GROUND_Y - 40;
    this._bossSprite = E.box(46, 46, 20, 0x44ffcc, this._bossX, this._bossY, 4);
    this._bossSprite.material.emissive = new THREE.Color(0x22ffcc);
    this._bossSprite.material.emissiveIntensity = 0.5;
    this._bossHP = 350; this._bossMaxHP = 350; this._teleportTimer = 2;

    this._buildHUD();
    this._showMsg('GLITCH detectado. A realidade daqui é instável.', 2800);
  }

  _buildHUD(){
    const mk = css => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; };
    const base = 'position:fixed;top:56px;z-index:500;pointer-events:none;background:rgba(6,4,10,.6);' +
      'border-radius:6px;font-family:monospace;color:#fff;font-size:10px;padding:6px 10px;width:200px;';
    this._hpPlayerEl = mk(base + 'left:12px;');
    this._hpBossEl = mk(base + 'right:12px;text-align:right;');
    this._domEls = [this._hpPlayerEl, this._hpBossEl];
  }

  _updateHUD(){
    const pPct = Math.max(0, this._playerHP / this._playerMaxHP) * 100;
    const bPct = Math.max(0, this._bossHP / this._bossMaxHP) * 100;
    this._hpPlayerEl.innerHTML = `VOCÊ<div style="height:8px;background:#0c0a14;border-radius:3px;overflow:hidden;margin-top:3px;">` +
      `<div style="height:100%;width:${pPct}%;background:#4488ff;"></div></div>`;
    this._hpBossEl.innerHTML = `GLITCH<div style="height:8px;background:#0c0a14;border-radius:3px;overflow:hidden;margin-top:3px;">` +
      `<div style="height:100%;width:${bPct}%;background:#44ffcc;"></div></div>`;
  }

  _showMsg(text, dur){
    if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; }
    this._msgSp = this.e.text(text, 14, 0xffee88, 640, 90, 50);
    if (dur > 0) setTimeout(() => { if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; } }, dur);
  }

  // ── Sistema de glitch — um efeito por vez, com revert garantido ──
  _triggerGlitch(){
    const type = GLITCH_TYPES[(Math.random() * GLITCH_TYPES.length) | 0];
    this._glitchActive = { type, timer: 2.6 };
    this._showMsg(GLITCH_LABEL[type], 1600);
    if (type === 'gravity') this.physics.setGravity(-GRAVITY);
    else if (type === 'camera') this.e.setFlip(true);
    else if (type === 'floor') { this._groundBody.enabled = false; this._groundMesh.visible = false; }
    else if (type === 'speed') this._speedMult = Math.random() < 0.5 ? 0.45 : 1.9;
    // 'controls' é lido direto no update(), não precisa de setup aqui
  }

  _revertGlitch(){
    const type = this._glitchActive?.type;
    if (type === 'gravity') this.physics.setGravity(GRAVITY);
    else if (type === 'camera') this.e.setFlip(false);
    else if (type === 'floor') { this._groundBody.enabled = true; this._groundMesh.visible = true; }
    else if (type === 'speed') this._speedMult = 1;
    this._glitchActive = null;
  }

  _spawnBullet(x, y, dx, dy, owner){
    const color = owner === 'player' ? 0x88ccff : 0x44ffcc;
    const mesh = this.e.box(12, 12, 6, color, x, y, 5);
    this._bullets.push({ mesh, x, y, vx: dx * BULLET_SPD, vy: dy * BULLET_SPD, owner });
  }

  update(dt){
    if (this.inp.justDown('Escape')){ this._cleanupGlitch(); this.m.start('ModeScene'); return; }
    if (this._state !== 'playing'){
      if (this.inp.justDown('Enter')){ this._cleanupGlitch(); this.m.start('ModeScene'); }
      return;
    }

    this._t += dt;
    this.physics.step(dt);

    // Ciclo de glitch
    if (this._glitchActive){
      this._glitchActive.timer -= dt;
      if (this._glitchActive.timer <= 0) this._revertGlitch();
    } else {
      this._glitchTimer -= dt;
      if (this._glitchTimer <= 0){ this._glitchTimer = 4.5; this._triggerGlitch(); }
    }

    // Jogador
    const b = this._playerBody, inp = this.inp;
    const swapped = this._glitchActive?.type === 'controls';
    const leftHeld  = swapped ? inp.right : inp.left;
    const rightHeld = swapped ? inp.left  : inp.right;
    let vx = 0;
    if (leftHeld)  { vx = -SPD * this._speedMult; this._playerDir = -1; }
    if (rightHeld) { vx =  SPD * this._speedMult; this._playerDir =  1; }
    b.vx = vx;
    if (inp.justDown('KeyW') && b.onGround) b.vy = (this.physics.gravity < 0 ? 1 : -1) * Math.abs(JUMP_V);
    if (inp.justDown('Space')) this._spawnBullet(b.cx + this._playerDir * 20, b.cy - 6, this._playerDir, 0, 'player');
    this._playerSprite.position.set(b.cx, -b.cy, 4);

    // Boss — teleporta e atira em rajada na posição do jogador
    this._teleportTimer -= dt;
    if (this._teleportTimer <= 0){
      this._teleportTimer = 1.8;
      this._bossX = 200 + Math.random() * 880;
      this._bossY = TOP_Y + 40 + Math.random() * (BOTTOM_Y - TOP_Y - 80);
      const dx = b.cx - this._bossX, dy = b.cy - this._bossY, d = Math.hypot(dx, dy) || 1;
      for (let s = -1; s <= 1; s++){
        const a = Math.atan2(dy, dx) + s * 0.28;
        this._spawnBullet(this._bossX, this._bossY, Math.cos(a), Math.sin(a), 'boss');
      }
    }
    this._bossSprite.position.set(this._bossX, -this._bossY, 4);

    // Balas
    for (let i = this._bullets.length - 1; i >= 0; i--){
      const bl = this._bullets[i];
      bl.x += bl.vx * dt; bl.y += bl.vy * dt;
      bl.mesh.position.set(bl.x, -bl.y, 5);
      if (bl.x < 40 || bl.x > 1240 || bl.y < TOP_Y - 40 || bl.y > BOTTOM_Y + 40){
        this.e.remove(bl.mesh); this._bullets.splice(i, 1); continue;
      }
      if (bl.owner === 'player' && Math.hypot(bl.x - this._bossX, bl.y - this._bossY) < 30){
        this._bossHP -= 10;
        this.e.remove(bl.mesh); this._bullets.splice(i, 1);
        if (this._bossHP <= 0) return this._win();
      } else if (bl.owner === 'boss' && Math.hypot(bl.x - b.cx, bl.y - b.cy) < 26){
        this._playerHP -= 8;
        this.e.remove(bl.mesh); this._bullets.splice(i, 1);
        if (this._playerHP <= 0) return this._lose();
      }
    }

    this._updateHUD();
  }

  _win(){
    this._state = 'won';
    this._cleanupGlitch();
    SaveSystem.addMissionProgress('bosses', 1);
    SaveSystem.addHumanity(5);
    this._showMsg('GLITCH CORRIGIDO! +5 HUMANIDADE — ENTER pra voltar', 0);
  }

  _lose(){
    this._state = 'lost';
    this._cleanupGlitch();
    this._showMsg('VOCÊ FOI CORROMPIDO PELO GLITCH — ENTER pra voltar', 0);
  }

  // Garante que nenhum efeito (gravidade/câmera/chão) vaze pra próxima cena
  _cleanupGlitch(){
    if (this._glitchActive) this._revertGlitch();
    this.e.setFlip(false);
    this.physics.setGravity(GRAVITY);
  }

  destroy(){
    this._cleanupGlitch();
    this._bullets.forEach(bl => this.e.remove(bl.mesh));
    this._bullets = [];
    this._domEls?.forEach(el => el.remove());
    if (this._msgSp) this.e.remove(this._msgSp);
    this.physics.clear();
  }
}
