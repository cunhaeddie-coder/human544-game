// BossTitan — Fase 40 | Mecânico gigante, fases de escudo, lasers rotativos, mísseis
import * as THREE from 'three';
import { Body } from '../engine/Physics2D.js';

export class BossTitan {
  constructor(scene, physics) {
    this.scene   = scene;
    this.physics = physics;
    this.hp      = 9000;
    this.maxHp   = 9000;
    this.alive   = true;
    this._t      = 0;
    this._laserTimer  = 0;
    this._missileTimer = 0;
    this._shieldPhase = true; // começa com escudo
    this._laserAngle  = 0;
    this._shieldHits  = 20;

    const cx = scene.currentConfig?.exit?.x - 350 || 850;
    const cy = 390;

    this.body = physics.addBody(new Body(cx - 50, cy - 100, 100, 100));
    this.body.allowGravity = true;

    this.mesh = scene.engine.box(100, 100, 60, 0x445566, cx, cy, 6);
    this.mesh.material.emissive = new THREE.Color(0x111822);
    this.mesh.material.emissiveIntensity = 0.5;

    // Detalhes mecânicos
    this._core = scene.engine.box(30, 30, 20, 0x00aaff, cx, cy, 7);
    this._core.material.emissive = new THREE.Color(0x002244);
    this._core.material.emissiveIntensity = 1;

    // Escudo hexagonal (precisa ser destruído antes de dano direto)
    this._shieldMesh = scene.engine.box(140, 140, 50, 0x0044aa, cx, cy, 5);
    this._shieldMesh.material.transparent = true;
    this._shieldMesh.material.opacity = 0.35;
    this._shieldMesh.material.emissive = new THREE.Color(0x001133);
    this._shieldMesh.material.emissiveIntensity = 0.8;

    this._hpBg  = scene.engine.box(240, 10, 4, 0x333333, cx, cy - 130, 20);
    this._hpBar = scene.engine.box(238, 8,  5, 0x00aaff, cx, cy - 130, 21);
    this._cx = cx; this._cy = cy;

    scene._showMsg('BOSS: Titã Mecânico! (destrua o escudo primeiro)', 5000);
  }

  get x() { return this.body.x + 50; }
  get y() { return this.body.y + 50; }

  hit(dmg) {
    if (!this.alive) return;
    if (this._shieldPhase) {
      this._shieldHits -= 1;
      this._shieldMesh.material.opacity = Math.max(0.05, this._shieldHits / 20 * 0.35);
      this.scene._showMsg(`Escudo: ${this._shieldHits} golpes restantes`, 600);
      if (this._shieldHits <= 0) {
        this._shieldPhase = false;
        this.scene.engine.remove(this._shieldMesh);
        this._shieldMesh = null;
        this.scene._showMsg('ESCUDO DESTRUÍDO! Ataque o núcleo!', 3000);
      }
      return;
    }
    this.hp -= dmg;
    this._updBar();
    this._core.material.color.set(0xffffff);
    setTimeout(() => { if (this._core?.material) this._core.material.color.set(0x00aaff); }, 120);
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    this.scene._activateExit();
    [this.mesh, this._core, this._shieldMesh, this._hpBar, this._hpBg].forEach(m => {
      if (m) this.scene.engine.remove(m);
    });
    this.physics.remove(this.body);
    this.scene._showMsg('Titã destruído!', 3000);
  }

  _updBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.scale.x = pct;
    this._hpBar.material.color.set(pct > 0.5 ? 0x00aaff : pct > 0.25 ? 0xffaa00 : 0xff2200);
    this._hpBar.position.set(this.x - 119*(1-pct), -(this.y - 130 + 50), 21);
    this._hpBg.position.set(this.x, -(this.y - 130 + 50), 20);
  }

  update(player, dt) {
    if (!this.alive) return;
    this._t += dt;
    this._laserTimer   -= dt;
    this._missileTimer -= dt;

    // Anda lentamente
    const dx = player.x - this.x;
    this.body.vx = Math.sign(dx) * (this._shieldPhase ? 30 : 60);

    this.mesh.position.set(this.x, -this.y, 6);
    this._core.position.set(this.x, -this.y, 7);
    if (this._shieldMesh) {
      this._shieldMesh.position.set(this.x, -this.y, 5);
      this._shieldMesh.rotation.z += dt * 1.2;
    }
    this._updBar();

    // Laser rotatório
    if (this._laserTimer <= 0) {
      this._laserTimer = this._shieldPhase ? 0.4 : 0.25;
      this._laserAngle += 0.35;
      const lx = Math.cos(this._laserAngle) * 380;
      const ly = Math.sin(this._laserAngle) * 380;
      this.scene.spawnEnemyProjectile(this.x, this.y, lx, ly);
    }

    // Mísseis (fase sem escudo)
    if (!this._shieldPhase && this._missileTimer <= 0) {
      this._missileTimer = 2;
      const ddx = player.x - this.x, ddy = player.y - this.y;
      const d = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
      for (let i = -1; i <= 1; i++) {
        const spread = i * 0.3;
        this.scene.spawnEnemyProjectile(this.x, this.y,
          (ddx/d + spread) * 350, (ddy/d) * 350
        );
      }
    }
  }

  destroy() { if (this.alive) this._die(); }
}
