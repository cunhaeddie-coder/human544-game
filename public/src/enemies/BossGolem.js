// BossGolem — Fase 25 | Colosso de pedra, soca o chão, lança rochas, invulnerável nos braços
import * as THREE from 'three';
import { Body } from '../engine/Physics2D.js';

export class BossGolem {
  constructor(scene, physics) {
    this.scene   = scene;
    this.physics = physics;
    this.hp      = 6500;
    this.maxHp   = 6500;
    this.alive   = true;
    this._t      = 0;
    this._slamTimer  = 0;
    this._rockTimer  = 0;
    this._walkDir    = 1;
    this._walkTimer  = 0;

    const cx = scene.currentConfig?.exit?.x - 300 || 950;
    const cy = 430;

    this.body = physics.addBody(new Body(cx - 40, cy - 90, 80, 90));
    this.body.allowGravity = true;

    // Corpo
    this.mesh = scene.engine.box(80, 90, 50, 0x667766, cx, cy, 6);
    this.mesh.material.emissive = new THREE.Color(0x223322);
    this.mesh.material.emissiveIntensity = 0.4;

    // Cabeça
    this._head = scene.engine.box(60, 50, 40, 0x778877, cx, cy - 72, 6);

    // Olhos vermelhos
    this._eyeL = scene.engine.box(12, 12, 4, 0xff2200, cx - 14, cy - 76, 7);
    this._eyeR = scene.engine.box(12, 12, 4, 0xff2200, cx + 14, cy - 76, 7);
    this._eyeL.material.emissive = new THREE.Color(0x440000);
    this._eyeR.material.emissive = new THREE.Color(0x440000);
    this._eyeL.material.emissiveIntensity = 1;
    this._eyeR.material.emissiveIntensity = 1;

    this._hpBg  = scene.engine.box(220, 10, 4, 0x333333, cx, cy - 120, 20);
    this._hpBar = scene.engine.box(218, 8,  5, 0x667766, cx, cy - 120, 21);

    scene._showMsg('BOSS: Golem Colossal!', 4000);
  }

  get x() { return this.body.x + 40; }
  get y() { return this.body.y + 45; }

  hit(dmg) {
    if (!this.alive) return;
    this.hp -= dmg;
    this._updBar();
    const col = this.hp < this.maxHp * 0.3 ? 0xff4400 : 0x667766;
    this.mesh.material.color.set(0xffffff);
    setTimeout(() => { if (this.mesh?.material) this.mesh.material.color.set(col); }, 130);
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    this.scene._activateExit();
    [this.mesh, this._head, this._eyeL, this._eyeR, this._hpBar, this._hpBg].forEach(m => {
      if (m) this.scene.engine.remove(m);
    });
    this.physics.remove(this.body);
    this.scene._showMsg('Golem destruído!', 3000);
  }

  _updBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.scale.x = pct;
    this._hpBar.material.color.set(pct > 0.5 ? 0x667766 : pct > 0.25 ? 0xaa6644 : 0xff4400);
    this._hpBar.position.set(this.x - 109*(1-pct), -(this.y - 120 + 45), 21);
    this._hpBg.position.set(this.x, -(this.y - 120 + 45), 20);
  }

  _syncMeshes() {
    this.mesh.position.set(this.x, -this.y, 6);
    this._head.position.set(this.x, -(this.y - 72), 6);
    this._eyeL.position.set(this.x - 14, -(this.y - 76), 7);
    this._eyeR.position.set(this.x + 14, -(this.y - 76), 7);
    this._updBar();
  }

  update(player, dt) {
    if (!this.alive) return;
    this._t += dt;
    this._slamTimer -= dt;
    this._rockTimer  -= dt;
    this._walkTimer  -= dt;

    // Andar em direção ao jogador
    const dx = player.x - this.x;
    const speed = this.hp < this.maxHp * 0.4 ? 85 : 55;
    this.body.vx = Math.sign(dx) * speed;

    // Slam: pula e cai com shockwave
    if (this._slamTimer <= 0 && this.body.onGround && Math.abs(dx) < 250) {
      this._slamTimer = this.hp < this.maxHp * 0.5 ? 3 : 5;
      this.body.vy = -500;
      // Shockwave ao aterrissar (spawna projéteis laterais)
      setTimeout(() => {
        if (!this.alive) return;
        for (let s = -1; s <= 1; s += 2) {
          this.scene.spawnEnemyProjectile(this.x, this.y, s * 350, -50);
        }
        this.scene._showMsg('SLAM!', 800);
      }, 500);
    }

    // Lança pedras em arco
    if (this._rockTimer <= 0) {
      this._rockTimer = this.hp < this.maxHp * 0.5 ? 2.5 : 4;
      const angle = Math.PI / 4 * (dx > 0 ? 1 : -1);
      this.scene.spawnEnemyProjectile(this.x, this.y - 60,
        Math.cos(angle) * 380, -Math.abs(Math.sin(angle)) * 380
      );
    }

    this._syncMeshes();
  }

  destroy() { if (this.alive) this._die(); }
}
