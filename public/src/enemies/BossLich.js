// BossLich — Fase 20 | Flutua, invoca esqueletos, teleporta, escudo mágico
import * as THREE from 'three';
import { Body } from '../engine/Physics2D.js';

export class BossLich {
  constructor(scene, physics) {
    this.scene   = scene;
    this.physics = physics;
    this.hp      = 5000;
    this.maxHp   = 5000;
    this.alive   = true;
    this._t      = 0;
    this._teleTimer  = 0;
    this._summonTimer = 0;
    this._shieldTimer = 0;
    this._shielded    = false;
    this._shieldMesh  = null;
    this.minions      = [];

    const cx = scene.currentConfig?.exit?.x - 350 || 900;
    const cy = 220;
    this._cx = cx; this._cy = cy;

    this.body = physics.addBody(new Body(cx - 20, cy - 40, 40, 80));
    this.body.allowGravity = false;

    this.mesh = scene.engine.box(40, 80, 30, 0x220033, cx, cy, 6);
    this.mesh.material.emissive = new THREE.Color(0x110022);
    this.mesh.material.emissiveIntensity = 0.8;

    // Olhos brilhantes
    this._eyeL = scene.engine.box(8, 8, 4, 0x8800ff, cx - 10, cy - 20, 7);
    this._eyeR = scene.engine.box(8, 8, 4, 0x8800ff, cx + 10, cy - 20, 7);
    this._eyeL.material.emissive = new THREE.Color(0x440088);
    this._eyeR.material.emissive = new THREE.Color(0x440088);
    this._eyeL.material.emissiveIntensity = 1;
    this._eyeR.material.emissiveIntensity = 1;

    this._hpBg  = scene.engine.box(200, 10, 4, 0x333333, cx, cy - 60, 20);
    this._hpBar = scene.engine.box(198, 8,  5, 0x8800ff, cx, cy - 60, 21);

    scene._showMsg('BOSS: Lich das Sombras!', 4000);
  }

  get x() { return this.body.x + 20; }
  get y() { return this.body.y + 40; }

  hit(dmg) {
    if (!this.alive) return;
    if (this._shielded) {
      // Escudo absorve o golpe
      this._shieldTimer -= 1;
      if (this._shieldTimer <= 0) this._removeShield();
      this.mesh.material.color.set(0xffffff);
      setTimeout(() => { if (this.mesh?.material) this.mesh.material.color.set(0x220033); }, 80);
      return;
    }
    this.hp -= dmg;
    this._updBar();
    this.mesh.material.color.set(0xffffff);
    setTimeout(() => { if (this.mesh?.material) this.mesh.material.color.set(0x220033); }, 120);
    if (this.hp <= 0) this._die();
  }

  _removeShield() {
    this._shielded = false;
    if (this._shieldMesh) { this.scene.engine.remove(this._shieldMesh); this._shieldMesh = null; }
  }

  _activateShield() {
    this._shielded = true;
    this._shieldTimer = 8; // absorve 8 golpes
    this._shieldMesh = this.scene.engine.box(64, 96, 50, 0x6600cc, this.x, this.y, 4);
    this._shieldMesh.material.transparent = true;
    this._shieldMesh.material.opacity = 0.4;
    this._shieldMesh.material.emissive = new THREE.Color(0x440088);
    this._shieldMesh.material.emissiveIntensity = 0.8;
    setTimeout(() => { if (this._shielded) this._removeShield(); }, 6000);
  }

  _die() {
    this.alive = false;
    this.minions.forEach(m => { if (m.alive) m.alive = false; });
    this._removeShield();
    this.scene._activateExit();
    [this.mesh, this._eyeL, this._eyeR, this._hpBar, this._hpBg].forEach(m => {
      if (m) this.scene.engine.remove(m);
    });
    this.physics.remove(this.body);
    this.scene._showMsg('Lich derrotado!', 3000);
  }

  _updBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.scale.x = pct;
    this._hpBar.material.color.set(pct > 0.5 ? 0x8800ff : pct > 0.25 ? 0xcc00ff : 0xff00ff);
    this._hpBar.position.set(this.x - 99*(1-pct), -(this.y - 60), 21);
    this._hpBg.position.set(this.x, -(this.y - 60), 20);
  }

  update(player, dt) {
    if (!this.alive) return;
    this._t += dt;
    this._teleTimer   -= dt;
    this._summonTimer -= dt;

    // Hover senoidal
    const hoverY = this._cy + Math.sin(this._t * 1.5) * 40;
    this.body.x = this._cx - 20;
    this.body.y = hoverY - 40;
    this.mesh.position.set(this.x, -this.y, 6);
    this._eyeL.position.set(this.x - 10, -(this.y - 20), 7);
    this._eyeR.position.set(this.x + 10, -(this.y - 20), 7);
    if (this._shieldMesh) this._shieldMesh.position.set(this.x, -this.y, 4);
    this._updBar();

    // Raios de energia
    if (this._teleTimer <= 0) {
      this._teleTimer = this.hp < this.maxHp * 0.4 ? 1.2 : 2.0;
      const dx = player.x - this.x, dy = player.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      this.scene.spawnEnemyProjectile(this.x, this.y, (dx/d)*300, (dy/d)*300);
      // 2ª bala em 45° na fase enraivecida
      if (this.hp < this.maxHp * 0.5) {
        this.scene.spawnEnemyProjectile(this.x, this.y, (dx/d + 0.7)*220, (dy/d - 0.7)*220);
      }
    }

    // Escudo periódico
    if (!this._shielded && this._t > 0 && Math.floor(this._t) % 12 === 0 && Math.floor(this._t) !== Math.floor(this._t - dt)) {
      this._activateShield();
    }
  }

  destroy() { if (this.alive) this._die(); }
}
