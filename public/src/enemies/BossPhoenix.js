// BossPhoenix — Fase 15 | Voa em círculos, lança chuva de fogo, ressurge 1x
import * as THREE from 'three';
import { Body } from '../engine/Physics2D.js';

export class BossPhoenix {
  constructor(scene, physics) {
    this.scene   = scene;
    this.physics = physics;
    this.hp      = 4000;
    this.maxHp   = 4000;
    this.alive   = true;
    this._t      = 0;
    this._phase  = 1; // 1=normal, 2=enraivecido (<50% HP)
    this._reborn = false; // ressurge 1x ao chegar a 0
    this._fireTimer = 0;
    this._swoopTimer = 0;
    this._angle  = 0;
    this._centerX = scene.currentConfig?.exit?.x - 400 || 800;
    this._centerY = 260;

    // Body
    this.body = physics.addBody(new Body(this._centerX - 28, this._centerY - 28, 56, 56));
    this.body.allowGravity = false;

    // Mesh principal (fogo)
    this.mesh = scene.engine.box(56, 56, 40, 0xff6600, this._centerX, this._centerY, 6);
    this.mesh.material.emissive = new THREE.Color(0x441100);
    this.mesh.material.emissiveIntensity = 1;

    // Asas
    this._wingL = scene.engine.box(48, 20, 30, 0xff4400, this._centerX - 44, this._centerY, 5);
    this._wingR = scene.engine.box(48, 20, 30, 0xff4400, this._centerX + 44, this._centerY, 5);

    // HP bar
    this._hpBg  = scene.engine.box(200, 10, 4, 0x333333, this._centerX, this._centerY - 50, 20);
    this._hpBar = scene.engine.box(198, 8,  5, 0xff6600, this._centerX, this._centerY - 50, 21);
    this._hpBar.material.emissive = new THREE.Color(0x441100);
    this._hpBar.material.emissiveIntensity = 0.8;

    scene.engine.scene.add(this.mesh);
    scene._showMsg('BOSS: Fênix das Chamas!', 4000);
  }

  get x() { return this.body.x + 28; }
  get y() { return this.body.y + 28; }

  hit(dmg) {
    if (!this.alive) return;
    this.hp -= dmg;
    this._updBar();

    // Pisca vermelho
    this.mesh.material.color.set(0xffffff);
    setTimeout(() => { if (this.mesh?.material) this.mesh.material.color.set(this._phase === 2 ? 0xff2200 : 0xff6600); }, 120);

    if (this.hp <= 0) {
      if (!this._reborn) {
        // Ressurgimento: recupera 50% HP, fica vermelho
        this._reborn = true;
        this.hp = Math.floor(this.maxHp * 0.5);
        this._phase = 2;
        this.mesh.material.color.set(0xff2200);
        this._wingL.material.color.set(0xff0000);
        this._wingR.material.color.set(0xff0000);
        this.scene._showMsg('A Fênix RESSURGIU das cinzas!', 3000);
        this._updBar();
      } else {
        this._die();
      }
    }
  }

  _die() {
    this.alive = false;
    this.scene._activateExit();
    [this.mesh, this._wingL, this._wingR, this._hpBar, this._hpBg].forEach(m => {
      if (m) this.scene.engine.remove(m);
    });
    this.physics.remove(this.body);
    this.scene._showMsg('Fênix derrotada!', 3000);
  }

  _updBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.scale.x = pct;
    this._hpBar.material.color.set(pct > 0.5 ? 0xff6600 : pct > 0.25 ? 0xff3300 : 0xff0000);
    const ox = this.x - 99 * (1 - pct);
    this._hpBar.position.set(ox, -(this.y - 50), 21);
    this._hpBg.position.set(this.x, -(this.y - 50), 20);
  }

  update(player, dt) {
    if (!this.alive) return;
    this._t += dt;
    this._fireTimer -= dt;
    this._swoopTimer -= dt;
    const speed = this._phase === 2 ? 1.8 : 1.1;

    // Movimento circular
    this._angle += speed * dt;
    const rx = 180, ry = 80;
    const nx = this._centerX + Math.cos(this._angle) * rx;
    const ny = this._centerY + Math.sin(this._angle * 0.7) * ry;
    this.body.x = nx - 28;
    this.body.y = ny - 28;
    this.body.vx = 0; this.body.vy = 0;

    // Asas batem
    const wingFlap = Math.sin(this._t * 8) * 10;
    this._wingL.position.set(this.x - 44, -(this.y + wingFlap), 5);
    this._wingR.position.set(this.x + 44, -(this.y - wingFlap), 5);
    this.mesh.position.set(this.x, -this.y, 6);
    this.mesh.rotation.z = Math.sin(this._t * 3) * 0.15;
    this._updBar();

    // Chuva de fogo
    if (this._fireTimer <= 0) {
      const interval = this._phase === 2 ? 0.7 : 1.2;
      this._fireTimer = interval;
      const count = this._phase === 2 ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const fx = player.x + (Math.random() - 0.5) * 300;
        this.scene.spawnEnemyProjectile(fx, 50, 0, 380);
      }
    }

    // Mergulho no jogador (fase 2)
    if (this._phase === 2 && this._swoopTimer <= 0) {
      this._swoopTimer = 3.5;
      const dx = player.x - this.x, dy = player.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      this.body.vx = (dx/d) * 500;
      this.body.vy = (dy/d) * 500;
      setTimeout(() => { if (this.body) { this.body.vx = 0; this.body.vy = 0; } }, 400);
    }
  }

  destroy() { if (this.alive) this._die(); }
}
