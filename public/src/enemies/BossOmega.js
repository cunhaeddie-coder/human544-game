// BossOmega — Fases 45 e 50 | Jefe final, 3 fases, clona, chuva total
import * as THREE from 'three';
import { Body } from '../engine/Physics2D.js';

export class BossOmega {
  constructor(scene, physics) {
    this.scene   = scene;
    this.physics = physics;
    this.hp      = 12000;
    this.maxHp   = 12000;
    this.alive   = true;
    this._t      = 0;
    this._phase  = 1;
    this._attackTimer = 0;
    this._beamTimer   = 0;
    this._clones      = [];
    this._angle       = 0;

    const cx = scene.currentConfig?.exit?.x - 400 || 800;
    const cy = 240;

    this.body = physics.addBody(new Body(cx - 36, cy - 36, 72, 72));
    this.body.allowGravity = false;

    this.mesh = scene.engine.box(72, 72, 50, 0xff0000, cx, cy, 6);
    this.mesh.material.emissive = new THREE.Color(0x440000);
    this.mesh.material.emissiveIntensity = 1;

    // Coroa de espinhos
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sx = cx + Math.cos(a) * 50, sy = cy + Math.sin(a) * 50;
      const spike = scene.engine.box(10, 24, 10, 0xcc0000, sx, sy, 5);
      spike.rotation.z = a;
      spike.material.emissive = new THREE.Color(0x330000);
      spike.material.emissiveIntensity = 0.8;
    }

    this._hpBg  = scene.engine.box(260, 12, 4, 0x333333, cx, cy - 80, 20);
    this._hpBar = scene.engine.box(258, 10, 5, 0xff0000, cx, cy - 80, 21);
    this._hpBar.material.emissive = new THREE.Color(0x440000);
    this._hpBar.material.emissiveIntensity = 0.8;
    this._cx = cx; this._cy = cy;

    const isPhase50 = scene.levelNum >= 50;
    scene._showMsg(isPhase50 ? 'BOSS FINAL: OMEGA!' : 'BOSS: Omega (Fase 45)', 5000);
  }

  get x() { return this.body.x + 36; }
  get y() { return this.body.y + 36; }

  hit(dmg) {
    if (!this.alive) return;
    this.hp -= dmg;
    this._updBar();

    // Muda de fase
    const pct = this.hp / this.maxHp;
    if (pct < 0.66 && this._phase === 1) { this._phase = 2; this._enterPhase2(); }
    if (pct < 0.33 && this._phase === 2) { this._phase = 3; this._enterPhase3(); }

    this.mesh.material.color.set(0xffffff);
    const col = this._phase === 3 ? 0x8800ff : this._phase === 2 ? 0xff6600 : 0xff0000;
    setTimeout(() => { if (this.mesh?.material) this.mesh.material.color.set(col); }, 120);
    if (this.hp <= 0) this._die();
  }

  _enterPhase2() {
    this.mesh.material.color.set(0xff6600);
    this.scene._showMsg('OMEGA FASE 2 — FÚRIA!', 3000);
    // Cria 2 clones descartáveis
    for (let i = 0; i < 2; i++) {
      const clone = this.scene.engine.box(48, 48, 30, 0xff6600, this._cx + (i===0?-200:200), this._cy, 5);
      clone.material.transparent = true; clone.material.opacity = 0.6;
      this._clones.push(clone);
    }
  }

  _enterPhase3() {
    this.mesh.material.color.set(0x8800ff);
    this.scene._showMsg('OMEGA FASE FINAL!', 3000);
    this._clones.forEach(c => this.scene.engine.remove(c));
    this._clones = [];
  }

  _die() {
    this.alive = false;
    this._clones.forEach(c => this.scene.engine.remove(c));
    this.scene._activateExit();
    [this.mesh, this._hpBar, this._hpBg].forEach(m => { if (m) this.scene.engine.remove(m); });
    this.physics.remove(this.body);
    this.scene._showMsg('OMEGA DERROTADO! Você zerou o jogo!', 6000);
  }

  _updBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.scale.x = pct;
    const col = this._phase === 3 ? 0x8800ff : this._phase === 2 ? 0xff6600 : 0xff0000;
    this._hpBar.material.color.set(col);
    this._hpBar.position.set(this.x - 129*(1-pct), -(this.y - 80), 21);
    this._hpBg.position.set(this.x, -(this.y - 80), 20);
  }

  update(player, dt) {
    if (!this.alive) return;
    this._t += dt;
    this._attackTimer -= dt;
    this._beamTimer   -= dt;
    this._angle       += dt * (0.8 + this._phase * 0.4);

    // Órbita ao redor do centro
    const radius = 120 + Math.sin(this._t * 0.5) * 60;
    const nx = this._cx + Math.cos(this._angle) * radius;
    const ny = this._cy + Math.sin(this._angle * 0.6) * 70;
    this.body.x = nx - 36;
    this.body.y = ny - 36;
    this.mesh.position.set(this.x, -this.y, 6);
    this.mesh.rotation.z += dt * 1.5;

    // Clones orbitam (fase 2)
    this._clones.forEach((c, i) => {
      const ca = this._angle + (i + 1) * Math.PI;
      c.position.set(
        this._cx + Math.cos(ca) * 160,
        -(this._cy + Math.sin(ca * 0.6) * 60),
        5
      );
    });
    this._updBar();

    // Ataques escalados por fase
    const fireInterval = this._phase === 3 ? 0.5 : this._phase === 2 ? 0.85 : 1.4;
    if (this._attackTimer <= 0) {
      this._attackTimer = fireInterval;
      const count = this._phase;
      for (let i = 0; i < count; i++) {
        const a = ((i / count) * Math.PI * 2) + this._t;
        this.scene.spawnEnemyProjectile(this.x, this.y, Math.cos(a) * 340, Math.sin(a) * 340);
      }
      // Direto no jogador
      const ddx = player.x - this.x, ddy = player.y - this.y;
      const d = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
      this.scene.spawnEnemyProjectile(this.x, this.y, (ddx/d)*380, (ddy/d)*380);
    }

    // Chuva vertical (fase 3)
    if (this._phase === 3 && this._beamTimer <= 0) {
      this._beamTimer = 1.2;
      for (let i = 0; i < 5; i++) {
        const px = player.x + (Math.random() - 0.5) * 500;
        this.scene.spawnEnemyProjectile(px, 0, 0, 420);
      }
    }
  }

  destroy() { if (this.alive) this._die(); }
}
