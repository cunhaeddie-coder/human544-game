// ── Boss Secreto: THE WALL ────────────────────────────────────────
// Não anda, não ataca — é uma parede/esmagador gigante que sobe do
// fundo do poço cada vez mais rápido. O jogador só precisa escalar
// as plataformas até o topo antes de ser esmagado.
// WASD move/pula · ESC sai

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const GRAVITY = 900;
const SPD = 200;
const JUMP_V = -440;
const GROUND_Y = 650;
const TOP_Y = 90;              // linha de chegada (vitória)
const CRUSH_TICK = 0.5;        // segundos entre cada tick de dano no esmagador
const CRUSH_DMG = 15;

export class WallBossScene {
  constructor(e, m, i){
    this.e = e; this.m = m; this.inp = i;
    this.physics = new Physics2D();
    this._state = 'playing';
    this._t = 0;
    this._crushCd = 0;
  }

  create(){
    this.physics.setGravity(GRAVITY);
    this.physics.setWorldBounds(40, 1240, 9999);
    const E = this.e;

    E.plane(1280, 720, 0x140a06, 640, 360, -400);
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text('BOSS SECRETO — THE WALL', 16, 0xff8844, 640, 22, 5);
    E.text('WASD move/pula · ESC sai', 9, 0x8899aa, 640, 700, 5);

    // paredes laterais do poço
    this.physics.addStatic(new Body(160, 60, 10, 660));
    this.physics.addStatic(new Body(1110, 60, 10, 660));
    for (let y = 60; y < 720; y += 40){
      E.box(10, 20, 4, 0x3a2418, 165, y, -3);
      E.box(10, 20, 4, 0x3a2418, 1115, y, -3);
    }

    // chão inicial
    this.physics.addStatic(new Body(160, GROUND_Y, 950, 20));
    E.box(950, 20, 10, 0x3a2418, 635, GROUND_Y + 10, -2);

    // plataformas de escalada
    this._platforms = [];
    const count = 11;
    for (let i = 0; i < count; i++){
      const y = GROUND_Y - 60 - i * 50;
      const x = i % 2 === 0 ? 560 : 720; // zigue-zague curto — cabe no alcance do pulo (~180px)
      this.physics.addStatic(new Body(x - 70, y, 140, 18));
      const mesh = E.box(140, 18, 10, 0x5a3a20, x, y + 9, -2);
      this._platforms.push(mesh);
    }

    // linha de chegada
    E.box(950, 6, 4, 0x44ee88, 635, TOP_Y, -1);
    E.text('CHEGADA', 12, 0x44ee88, 635, TOP_Y - 18, 5);

    // esmagador (sobe do fundo, bem devagar no início pra dar tempo de escalar)
    this._wallY = 1200;
    this._wallSpeed = 20;
    this._wallMesh = E.box(950, 40, 16, 0xff4444, 635, this._wallY, 3);
    this._wallMesh.material.emissive = new THREE.Color(0xff2200);
    this._wallMesh.material.emissiveIntensity = 0.5;

    // jogador
    this._playerBody = new Body(600 - 16, GROUND_Y - 48, 32, 48);
    this.physics.addBody(this._playerBody);
    this._playerSprite = E.box(32, 48, 20, 0x4488ff, 600, GROUND_Y - 24, 4);
    this._playerHP = 100; this._playerMaxHP = 100; this._playerDir = 1;

    this._buildHUD();
    this._showMsg('O ESMAGADOR ESTÁ SUBINDO — SUBA!', 2500);
  }

  _buildHUD(){
    const mk = css => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; };
    this._hpEl = mk('position:fixed;top:56px;left:12px;z-index:500;pointer-events:none;background:rgba(6,4,10,.6);' +
      'border-radius:6px;font-family:monospace;color:#fff;font-size:10px;padding:6px 10px;width:200px;');
    this._domEls = [this._hpEl];
  }

  _updateHUD(){
    const pct = Math.max(0, this._playerHP / this._playerMaxHP) * 100;
    this._hpEl.innerHTML = `VOCÊ<div style="height:8px;background:#0c0a14;border-radius:3px;overflow:hidden;margin-top:3px;">` +
      `<div style="height:100%;width:${pct}%;background:#4488ff;"></div></div>` +
      `<div style="margin-top:4px;color:#ff8844;">Esmagador a ${Math.max(0, Math.round(this._playerBody.cy - this._wallY))}px</div>`;
  }

  _showMsg(text, dur){
    if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; }
    this._msgSp = this.e.text(text, 15, 0xffee88, 640, 90, 50);
    if (dur > 0) setTimeout(() => { if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; } }, dur);
  }

  update(dt){
    if (this.inp.justDown('Escape')){ this.m.start('ModeScene'); return; }
    if (this._state !== 'playing'){
      if (this.inp.justDown('Enter')) this.m.start('ModeScene');
      return;
    }

    this._t += dt;
    this.physics.step(dt);

    const b = this._playerBody, inp = this.inp;
    let vx = 0;
    if (inp.left)  { vx = -SPD; this._playerDir = -1; }
    if (inp.right) { vx =  SPD; this._playerDir =  1; }
    b.vx = vx;
    if (inp.justDown('KeyW') && b.onGround) b.vy = JUMP_V;
    this._playerSprite.position.set(b.cx, -b.cy, 4);

    // Esmagador sobe e acelera aos poucos
    this._wallSpeed = 20 + Math.min(80, this._t * 0.8);
    this._wallY -= this._wallSpeed * dt;
    this._wallMesh.position.y = -(this._wallY);

    // Dano por contato
    if (this._crushCd > 0) this._crushCd -= dt;
    if (b.cy > this._wallY - 24 && this._crushCd <= 0){
      this._crushCd = CRUSH_TICK;
      this._playerHP -= CRUSH_DMG;
      if (this._playerHP <= 0) return this._lose();
    }

    if (b.cy <= TOP_Y + 20) return this._win();

    this._updateHUD();
  }

  _win(){
    this._state = 'won';
    SaveSystem.addMissionProgress('bosses', 1);
    SaveSystem.addHumanity(5);
    this._showMsg('VOCÊ ESCALOU A TEMPO! +5 HUMANIDADE — ENTER pra voltar', 0);
  }

  _lose(){
    this._state = 'lost';
    this._showMsg('ESMAGADO PELA PAREDE — ENTER pra voltar', 0);
  }

  destroy(){
    this._domEls?.forEach(el => el.remove());
    if (this._msgSp) this.e.remove(this._msgSp);
    this.physics.clear();
  }
}
