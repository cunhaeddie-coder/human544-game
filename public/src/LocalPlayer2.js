// Segundo jogador local — controles por Setas + Enter (atirar)
// Usa CharacterSprite com skin 'warrior', sem upgrades de SaveSystem

import * as THREE from 'three';
import { Body }            from './engine/Physics2D.js';
import { CharacterSprite } from './CharacterSprite.js';

export class LocalPlayer2 {
  constructor(scene, physics, x, y) {
    this.scene     = scene;
    this.phys      = physics;
    this.health    = 3;
    this.maxHealth = 3;
    this.invincible  = false;
    this.onLadder    = false;
    this.lastCheckId = null;
    this._lastDir    = -1;
    this._lastShot   = 0;
    this._aimX       = -1;
    this._aimY       = 0;
    this._walkT      = 0;
    this.bullets     = [];

    this.body = new Body(x - 10, y - 20, 20, 40);
    physics.addBody(this.body);
    this.sprite = new CharacterSprite(scene.engine.scene, x, y, 'warrior', 'P2');
  }

  get x() { return this.body.x + this.body.w / 2; }
  get y() { return this.body.y + this.body.h / 2; }

  update(input, ladderBodies) {
    const b   = this.body;
    const g   = this.scene.physics.gravity;

    let vx = 0;
    if (input.isDown('ArrowLeft'))  { vx = -180; this._lastDir = -1; }
    if (input.isDown('ArrowRight')) { vx =  180; this._lastDir =  1; }
    b.vx = vx;

    // Pulo com Cima
    if (input.justDown('ArrowUp') && b.onGround) {
      b.vy = (g <= 400 ? -300 : -360);
    }

    // Escada
    const nearLad = ladderBodies?.some(l =>
      Math.abs((l.x + l.w/2) - this.x) < 20 &&
      Math.abs((l.y + l.h/2) - this.y) < 55
    );
    if (nearLad) {
      b.allowGravity = false;
      b.vy = input.isDown('ArrowUp') ? -120 : input.isDown('ArrowDown') ? 120 : 0;
    } else {
      b.allowGravity = true;
    }

    this._aimX = this._lastDir;
    this._aimY = input.isDown('ArrowUp') ? -1 : input.isDown('ArrowDown') ? 1 : 0;

    if (input.justDown('Enter')) this._shoot();

    if (b.onGround && Math.abs(b.vx) > 10) this._walkT += 0.016 * 8;

    let state = 'idle';
    if (!b.onGround && b.vy < 0)  state = 'jump';
    else if (!b.onGround)          state = 'fall';
    else if (Math.abs(b.vx) > 10) state = Math.sin(this._walkT) > 0 ? 'walk1' : 'walk2';

    this.sprite.animate(this.x, this.y, this._lastDir, this._aimX, this._aimY, state, 'standard');

    this.bullets = this.bullets.filter(bl => {
      if (!bl.active) { this.scene.engine.remove(bl.mesh); this.phys.remove(bl.body); return false; }
      bl.mesh.position.set(bl.body.x + 5, -(bl.body.y + 5), 8);
      return true;
    });
  }

  _shoot() {
    const now = Date.now();
    if (now - this._lastShot < 360) return;
    this._lastShot = now;
    const ax = this._aimX, ay = this._aimY;
    const len = Math.sqrt(ax*ax + ay*ay) || 1;
    const bx = this.x + (ax/len)*22, by = this.y + (ay/len)*14 - 8;
    const bod = new Body(bx-5, by-5, 10, 10);
    bod.vx = (ax/len)*620; bod.vy = (ay/len)*620; bod.allowGravity = false;
    this.phys.addBody(bod);
    const mesh = this.scene.engine.box(8, 8, 6, 0xff8800, bx, by, 8);
    mesh.material.emissive = new THREE.Color(0x442200);
    mesh.material.emissiveIntensity = 0.8;
    const bl = { body:bod, mesh, active:true };
    this.bullets.push(bl);
    setTimeout(() => { bl.active = false; }, 1800);
  }

  takeDamage() {
    if (this.invincible) return;
    this.health = Math.max(0, this.health - 1);
    this.invincible = true;
    this.scene.updateHUD();
    if (this.health <= 0) {
      this._respawn();
      this.health = this.maxHealth;
      this.scene.updateHUD();
    }
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      this.sprite.setVisible(tick % 2 === 0);
    }, 120);
    setTimeout(() => { clearInterval(id); this.sprite.setVisible(true); this.invincible = false; }, 1600);
  }

  _respawn() {
    const cfg = this.scene.currentConfig;
    let rx = cfg.spawn.x + 40, ry = cfg.spawn.y;
    if (this.lastCheckId) {
      const cp = this.scene.checkpoints.find(c => c.id === this.lastCheckId);
      if (cp) { rx = cp.x; ry = cp.y - 60; }
    }
    this.body.x = rx - 10;
    this.body.y = ry - 20;
    this.body.vx = 0; this.body.vy = 0;
  }

  destroy() {
    this.sprite.destroy();
    this.bullets.forEach(bl => { this.scene.engine.remove(bl.mesh); this.phys.remove(bl.body); });
    this.phys.remove(this.body);
  }
}
