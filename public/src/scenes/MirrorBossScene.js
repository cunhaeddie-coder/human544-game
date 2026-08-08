// ── Boss Secreto: MIRROR ──────────────────────────────────────────
// Ele copia seus movimentos com um atraso — pula quando você pulou,
// atira quando você atirou, na mesma direção. Arena fechada e
// independente da campanha (não usa Player.js/GameScene).
// WASD move/pula · Espaço atira · ESC sai

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const GRAVITY = 900;
const SPD = 200;
const JUMP_V = -420;
const DELAY = 0.55; // segundos de atraso do espelho
const GROUND_Y = 620;
const BULLET_SPD = 520;

export class MirrorBossScene {
  constructor(e, m, i){
    this.e = e; this.m = m; this.inp = i;
    this.physics = new Physics2D();
    this._state = 'playing';
    this._t = 0;
    this._history = [];
    this._bullets = [];
    this._msgSp = null;
  }

  create(){
    this.physics.setGravity(GRAVITY);
    this.physics.setWorldBounds(40, 1240, 9999);
    const E = this.e;

    E.plane(1280, 720, 0x0a0612, 640, 360, -400);
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text('BOSS SECRETO — MIRROR', 16, 0xff66ff, 640, 22, 5);
    E.text('WASD move/pula · Espaço atira · ESC sai', 9, 0x8899aa, 640, 700, 5);

    this.physics.addStatic(new Body(40, GROUND_Y, 1200, 20));
    E.box(1200, 20, 10, 0x221133, 640, GROUND_Y + 10, -2);
    // paredes
    this.physics.addStatic(new Body(30, 100, 10, GROUND_Y - 100));
    this.physics.addStatic(new Body(1240, 100, 10, GROUND_Y - 100));

    this._playerBody = new Body(200 - 16, GROUND_Y - 48, 32, 48);
    this.physics.addBody(this._playerBody);
    this._playerSprite = E.box(32, 48, 20, 0x4488ff, 200, GROUND_Y - 24, 4);
    this._playerHP = 100; this._playerMaxHP = 100; this._playerDir = 1;

    this._mirrorBody = new Body(1080 - 16, GROUND_Y - 48, 32, 48);
    this.physics.addBody(this._mirrorBody);
    this._mirrorSprite = E.box(32, 48, 20, 0xff44ff, 1080, GROUND_Y - 24, 4);
    this._mirrorSprite.material.emissive = new THREE.Color(0xff44ff);
    this._mirrorSprite.material.emissiveIntensity = 0.45;
    this._mirrorHP = 400; this._mirrorMaxHP = 400; this._mirrorDir = -1;

    this._buildHUD();
    this._showMsg('MIRROR desperta... ele copia cada movimento seu.', 3000);
  }

  _buildHUD(){
    const mk = css => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; };
    const base = 'position:fixed;top:56px;z-index:500;pointer-events:none;background:rgba(6,4,10,.6);' +
      'border-radius:6px;font-family:monospace;color:#fff;font-size:10px;padding:6px 10px;width:220px;';
    this._hpPlayerEl = mk(base + 'left:12px;');
    this._hpMirrorEl = mk(base + 'right:12px;text-align:right;');
    this._domEls = [this._hpPlayerEl, this._hpMirrorEl];
  }

  _updateHUD(){
    const pPct = Math.max(0, this._playerHP / this._playerMaxHP) * 100;
    const mPct = Math.max(0, this._mirrorHP / this._mirrorMaxHP) * 100;
    this._hpPlayerEl.innerHTML = `VOCÊ<div style="height:8px;background:#0c0a14;border-radius:3px;overflow:hidden;margin-top:3px;">` +
      `<div style="height:100%;width:${pPct}%;background:#4488ff;"></div></div>`;
    this._hpMirrorEl.innerHTML = `MIRROR<div style="height:8px;background:#0c0a14;border-radius:3px;overflow:hidden;margin-top:3px;">` +
      `<div style="height:100%;width:${mPct}%;background:#ff44ff;"></div></div>`;
  }

  _showMsg(text, dur){
    if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; }
    this._msgSp = this.e.text(text, 15, 0xffee88, 640, 90, 50);
    if (dur > 0) setTimeout(() => { if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; } }, dur);
  }

  _spawnBullet(x, y, dir, owner){
    const color = owner === 'player' ? 0x88ccff : 0xff88ff;
    const mesh = this.e.box(14, 6, 6, color, x, y, 5);
    this._bullets.push({ mesh, x, y, vx: dir * BULLET_SPD, owner });
  }

  update(dt){
    if (this.inp.justDown('Escape')){ this.m.start('ModeScene'); return; }
    if (this._state !== 'playing'){
      if (this.inp.justDown('Enter')) this.m.start('ModeScene');
      return;
    }

    this._t += dt;
    this.physics.step(dt);

    // ── Jogador ──────────────────────────────────────────────
    const b = this._playerBody, inp = this.inp;
    let vx = 0;
    if (inp.left)  { vx = -SPD; this._playerDir = -1; }
    if (inp.right) { vx =  SPD; this._playerDir =  1; }
    b.vx = vx;
    const jumpNow = inp.justDown('KeyW') && b.onGround;
    if (jumpNow) b.vy = JUMP_V;
    const shootNow = inp.justDown('Space');
    if (shootNow) this._spawnBullet(b.cx + this._playerDir * 20, b.cy - 6, this._playerDir, 'player');

    this._playerSprite.position.set(b.cx, -b.cy, 4);

    // Guarda histórico de ações pra o Mirror repetir depois
    this._history.push({ t: this._t, vx, dir: this._playerDir, jump: jumpNow, shoot: shootNow });
    while (this._history.length && this._t - this._history[0].t > DELAY + 0.5) this._history.shift();

    // ── Mirror — replay do histórico com atraso ────────────────
    const past = this._history.find(h => this._t - h.t >= DELAY && this._t - h.t < DELAY + dt * 2);
    const mb = this._mirrorBody;
    if (past){
      mb.vx = past.vx;
      this._mirrorDir = past.dir;
      if (past.jump && mb.onGround) mb.vy = JUMP_V;
      if (past.shoot) this._spawnBullet(mb.cx + this._mirrorDir * 20, mb.cy - 6, this._mirrorDir, 'mirror');
    } else {
      mb.vx = 0;
    }
    this._mirrorSprite.position.set(mb.cx, -mb.cy, 4);

    // ── Balas ────────────────────────────────────────────────
    for (let i = this._bullets.length - 1; i >= 0; i--){
      const bl = this._bullets[i];
      bl.x += bl.vx * dt;
      bl.mesh.position.x = bl.x;
      if (bl.x < 30 || bl.x > 1250){ this.e.remove(bl.mesh); this._bullets.splice(i, 1); continue; }

      if (bl.owner === 'player' && Math.abs(bl.x - mb.cx) < 24 && Math.abs(bl.y - mb.cy) < 30){
        this._mirrorHP -= 8;
        this.e.remove(bl.mesh); this._bullets.splice(i, 1);
        if (this._mirrorHP <= 0) return this._win();
      } else if (bl.owner === 'mirror' && Math.abs(bl.x - b.cx) < 24 && Math.abs(bl.y - b.cy) < 30){
        this._playerHP -= 6;
        this.e.remove(bl.mesh); this._bullets.splice(i, 1);
        if (this._playerHP <= 0) return this._lose();
      }
    }

    this._updateHUD();
  }

  _win(){
    this._state = 'won';
    SaveSystem.addMissionProgress('bosses', 1);
    SaveSystem.addHumanity(5);
    this._showMsg('MIRROR DERROTADO! +5 HUMANIDADE — ENTER pra voltar', 0);
  }

  _lose(){
    this._state = 'lost';
    this._showMsg('VOCÊ FOI DERROTADO PELO PRÓPRIO REFLEXO — ENTER pra voltar', 0);
  }

  destroy(){
    this._bullets.forEach(bl => this.e.remove(bl.mesh));
    this._bullets = [];
    this._domEls?.forEach(el => el.remove());
    if (this._msgSp) this.e.remove(this._msgSp);
    this.physics.clear();
  }
}
