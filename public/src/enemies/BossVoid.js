// BossVoid — Fase 35 | Entidade do vazio, teleporta, cria buracos negros, inverte gravidade
import * as THREE from 'three';
import { Body } from '../engine/Physics2D.js';

export class BossVoid {
  constructor(scene, physics) {
    this.scene   = scene;
    this.physics = physics;
    this.hp      = 7500;
    this.maxHp   = 7500;
    this.alive   = true;
    this._t      = 0;
    this._teleTimer   = 0;
    this._blackholeTimer = 0;
    this._gravTimer = 0;
    this._gravFlipped = false;

    const cx = scene.currentConfig?.exit?.x - 400 || 800;
    const cy = 250;

    this.body = physics.addBody(new Body(cx - 32, cy - 32, 64, 64));
    this.body.allowGravity = false;

    this.mesh = scene.engine.box(64, 64, 40, 0x080012, cx, cy, 6);
    this.mesh.material.emissive = new THREE.Color(0x220044);
    this.mesh.material.emissiveIntensity = 1;

    // Aura de vazio
    this._aura = scene.engine.box(96, 96, 30, 0x440088, cx, cy, 4);
    this._aura.material.transparent = true;
    this._aura.material.opacity = 0.25;
    this._aura.material.emissive = new THREE.Color(0x220044);
    this._aura.material.emissiveIntensity = 0.5;

    this._hpBg  = scene.engine.box(220, 10, 4, 0x333333, cx, cy - 70, 20);
    this._hpBar = scene.engine.box(218, 8,  5, 0x8800ff, cx, cy - 70, 21);

    scene._showMsg('BOSS: Entidade do Vazio!', 4000);
  }

  get x() { return this.body.x + 32; }
  get y() { return this.body.y + 32; }

  hit(dmg) {
    if (!this.alive) return;
    this.hp -= dmg;
    this._updBar();
    this.mesh.material.color.set(0xffffff);
    setTimeout(() => { if (this.mesh?.material) this.mesh.material.color.set(0x080012); }, 120);
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    // Restaura gravidade se estava invertida
    if (this._gravFlipped) {
      this.scene.physics.setGravity(Math.abs(this.scene.physics.gravity));
    }
    this.scene._activateExit();
    [this.mesh, this._aura, this._hpBar, this._hpBg].forEach(m => { if (m) this.scene.engine.remove(m); });
    this.physics.remove(this.body);
    this.scene._showMsg('Entidade do Vazio destruída!', 3000);
  }

  _updBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.scale.x = pct;
    this._hpBar.material.color.set(pct > 0.5 ? 0x8800ff : pct > 0.25 ? 0xcc00ff : 0xff00ff);
    this._hpBar.position.set(this.x - 109*(1-pct), -(this.y - 70), 21);
    this._hpBg.position.set(this.x, -(this.y - 70), 20);
  }

  update(player, dt) {
    if (!this.alive) return;
    this._t += dt;
    this._teleTimer -= dt;
    this._blackholeTimer -= dt;
    this._gravTimer -= dt;

    // Hover caótico
    this.body.x = this.x - 32 + Math.sin(this._t * 1.3) * 60;
    this.body.y = this.y - 32 + Math.cos(this._t * 0.9) * 40;
    this.mesh.position.set(this.x, -this.y, 6);
    this._aura.position.set(this.x, -this.y, 4);
    this._aura.rotation.z += dt * 1.5;
    this.mesh.rotation.z += dt * 2;
    this._updBar();

    // Teleporte
    if (this._teleTimer <= 0) {
      this._teleTimer = this.hp < this.maxHp * 0.4 ? 1.8 : 3;
      this.body.x = player.x + (Math.random() - 0.5) * 500 - 32;
      this.body.y = player.y - 200 - 32;
    }

    // Rajada de projéteis radiais
    if (this._blackholeTimer <= 0) {
      this._blackholeTimer = this.hp < this.maxHp * 0.5 ? 2 : 3.5;
      const count = this.hp < this.maxHp * 0.5 ? 8 : 5;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        this.scene.spawnEnemyProjectile(this.x, this.y, Math.cos(a) * 300, Math.sin(a) * 300);
      }
    }

    // Inversão de gravidade temporária (assusta o jogador)
    if (this._gravTimer <= 0 && this.hp < this.maxHp * 0.6) {
      this._gravTimer = 15;
      const cfg = this.scene.currentConfig;
      const origGrav = cfg?.gravity || 550;
      this._gravFlipped = true;
      this.scene.physics.setGravity(-origGrav * 0.7);
      this.scene._showMsg('GRAVIDADE INVERTIDA!', 2000);
      setTimeout(() => {
        if (!this.alive) return;
        this._gravFlipped = false;
        this.scene.physics.setGravity(origGrav);
        this.scene._showMsg('Gravidade restaurada.', 1500);
      }, 3000);
    }
  }

  destroy() { if (this.alive) this._die(); }
}
