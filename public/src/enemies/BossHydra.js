// BossHydra — Fase 30 | 3 cabeças, cada uma com HP independente, veneno no chão
import * as THREE from 'three';
import { Body } from '../engine/Physics2D.js';

export class BossHydra {
  constructor(scene, physics) {
    this.scene   = scene;
    this.physics = physics;
    this.alive   = true;
    this._t      = 0;
    this._poisonTimer = 0;
    this._heads  = [];

    const baseX = scene.currentConfig?.exit?.x - 400 || 800;
    const groundY = 430;

    // Corpo central
    this.body = physics.addBody(new Body(baseX - 50, groundY - 60, 100, 60));
    this.body.allowGravity = true;
    this.mesh = scene.engine.box(100, 60, 50, 0x225522, baseX, groundY, 6);
    this.mesh.material.emissive = new THREE.Color(0x001100);
    this.mesh.material.emissiveIntensity = 0.5;

    // 3 cabeças com HP independente
    const headPositions = [
      { ox: -60, oy: -80 },
      { ox:   0, oy: -110 },
      { ox:  60, oy: -80 },
    ];
    headPositions.forEach((pos, i) => {
      const hx = baseX + pos.ox, hy = groundY + pos.oy;
      const headBody = physics.addBody(new Body(hx - 22, hy - 22, 44, 44));
      headBody.allowGravity = false;
      const headMesh = scene.engine.box(44, 44, 40, 0x33aa33, hx, hy, 7);
      headMesh.material.emissive = new THREE.Color(0x004400);
      headMesh.material.emissiveIntensity = 0.6;
      const eyeMesh = scene.engine.box(10, 10, 4, 0xffaa00, hx, hy - 8, 8);
      eyeMesh.material.emissive = new THREE.Color(0x443300);
      eyeMesh.material.emissiveIntensity = 1;

      const hpBg  = scene.engine.box(60, 8, 4, 0x333333, hx, hy - 36, 20);
      const hpBar = scene.engine.box(58, 6, 5, 0x00ee44, hx, hy - 36, 21);

      this._heads.push({
        ox: pos.ox, oy: pos.oy,
        body: headBody, mesh: headMesh, eye: eyeMesh,
        hpBg, hpBar,
        hp: 1500, maxHp: 1500, alive: true,
        fireTimer: 1.5 + i * 0.6,
        sineT: i * Math.PI * 2 / 3,
      });
    });

    // HP total = soma das 3 cabeças
    this.hp    = 4500;
    this.maxHp = 4500;

    // HP bar geral
    this._hpBg  = scene.engine.box(220, 10, 4, 0x333333, baseX, groundY - 130, 20);
    this._hpBar = scene.engine.box(218, 8,  5, 0x00ee44, baseX, groundY - 130, 21);
    this._baseX = baseX;
    this._baseY = groundY;

    scene._showMsg('BOSS: Hidra Venenosa! (3 cabeças)', 4000);
  }

  get x() { return this.body.x + 50; }
  get y() { return this.body.y + 30; }

  hit(dmg) {
    // Distribui dano entre cabeças vivas
    const aliveHeads = this._heads.filter(h => h.alive);
    if (!aliveHeads.length) return;
    const target = aliveHeads[Math.floor(Math.random() * aliveHeads.length)];
    target.hp -= dmg;
    target.mesh.material.color.set(0xffffff);
    setTimeout(() => { if (target.mesh?.material) target.mesh.material.color.set(0x33aa33); }, 120);
    if (target.hp <= 0) this._killHead(target);
    this.hp = this._heads.reduce((s, h) => s + Math.max(0, h.hp), 0);
    this._updBar();
    if (this._heads.every(h => !h.alive)) this._die();
  }

  _killHead(head) {
    head.alive = false;
    [head.mesh, head.eye, head.hpBg, head.hpBar].forEach(m => { if (m) this.scene.engine.remove(m); });
    this.physics.remove(head.body);
    this.scene._showMsg('Uma cabeça destruída!', 1500);
  }

  _die() {
    this.alive = false;
    this.scene._activateExit();
    [this.mesh, this._hpBar, this._hpBg].forEach(m => { if (m) this.scene.engine.remove(m); });
    this.physics.remove(this.body);
    this.scene._showMsg('Hidra derrotada!', 3000);
  }

  _updBar() {
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpBar.scale.x = pct;
    this._hpBar.material.color.set(pct > 0.5 ? 0x00ee44 : pct > 0.25 ? 0xaaee00 : 0xff4400);
    this._hpBar.position.set(this._baseX - 109*(1-pct), -(this._baseY - 130), 21);
    this._hpBg.position.set(this._baseX, -(this._baseY - 130), 20);
  }

  update(player, dt) {
    if (!this.alive) return;
    this._t += dt;
    this._poisonTimer -= dt;

    // Corpo se move lentamente
    const dx = player.x - this.x;
    this.body.vx = Math.sign(dx) * 40;
    this.mesh.position.set(this.x, -this.y, 6);

    // Cabeças oscilam e atiram
    this._heads.forEach((h, i) => {
      if (!h.alive) return;
      h.sineT += dt * 2.5;
      h.fireTimer -= dt;
      const hx = this.x + h.ox + Math.sin(h.sineT) * 15;
      const hy = this.y + h.oy + Math.cos(h.sineT * 0.7) * 10;
      h.body.x = hx - 22; h.body.y = hy - 22;
      h.mesh.position.set(hx, -hy, 7);
      h.eye.position.set(hx, -(hy - 8), 8);

      const pct = h.hp / h.maxHp;
      h.hpBar.scale.x = pct;
      h.hpBar.material.color.set(pct > 0.5 ? 0x00ee44 : 0xff4400);
      h.hpBar.position.set(hx - 29*(1-pct), -(hy - 36), 21);
      h.hpBg.position.set(hx, -(hy - 36), 20);

      if (h.fireTimer <= 0) {
        const rate = this._heads.filter(x => x.alive).length === 1 ? 0.8 : 1.5;
        h.fireTimer = rate;
        const ddx = player.x - hx, ddy = player.y - hy;
        const d = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
        this.scene.spawnEnemyProjectile(hx, hy, (ddx/d)*280, (ddy/d)*280);
      }
    });

    // Veneno no chão periódico
    if (this._poisonTimer <= 0) {
      this._poisonTimer = 2.5;
      for (let i = 0; i < 3; i++) {
        const px = player.x + (Math.random() - 0.5) * 400;
        this.scene.spawnEnemyProjectile(this.x, this.y, (px - this.x) / 2, -100);
      }
    }
    this._updBar();
  }

  destroy() { if (this.alive) this._die(); }
}
