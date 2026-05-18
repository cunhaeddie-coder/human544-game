import * as THREE from 'three';
import { Body }            from './engine/Physics2D.js';
import { ENEMY_DEFS }     from './enemies/EnemyTypes.js';
import { SaveSystem }     from './systems/SaveSystem.js';
import { createEnemySprite } from './CharacterSprite.js';

export class Enemy {
  constructor(scene, physics, x, y, typeName, range) {
    this.scene   = scene;
    this.phys    = physics;
    this.typeName = typeName;
    this.range   = range || 120;
    this.startX  = x;
    this.startY  = y;
    this.alive   = true;
    this._timer  = 0;
    this._dir    = 1;
    this._sineT  = 0;

    const def = ENEMY_DEFS[typeName] || ENEMY_DEFS.slime;
    this.def  = def;
    this.hp   = def.hp;
    this.maxHp = def.hp;

    this.body = physics.addBody(new Body(x - def.w/2, y - def.h/2, def.w, def.h));
    this.body.allowGravity = def.gravity;

    // Pixel art sprite
    const { sprite, tex } = createEnemySprite(scene.engine.scene, typeName, x, y, def.w, def.h);
    this.mesh = sprite;
    this._sprTex = tex;

    // HP bar (shown for hp > 100)
    this._hpMesh = null;
    if (this.maxHp > 100) this._buildHpBar();
  }

  get x() { return this.body.x + this.body.w / 2; }
  get y() { return this.body.y + this.body.h / 2; }

  update(player, dt) {
    if (!this.alive) return;
    this._timer += dt * 1000;

    const px = player?.x ?? 999999;
    const py = player?.y ?? 999999;
    const dx = px - this.x;
    const dist = Math.abs(dx);
    const aggro = dist < 420;

    switch (this.def.ai) {
      case 'patrol':       aggro ? this._followGround(dx) : this._patrol(); break;
      case 'fly_patrol':   aggro ? this._follow(px, py)   : this._patrol(); break;
      case 'sine_fly':     aggro ? this._follow(px, py)   : this._sineFly(); break;
      case 'follow':       this._follow(px, py); break;
      case 'charge':       this._charge(dx, dist); break;
      case 'shooter':      aggro ? this._followGround(dx) : this._patrol();
                           this._shoot(px, py); break;
      case 'jump_patrol':  aggro ? this._followGround(dx) : this._patrol();
                           this._jumpPeriodic(); break;
      case 'jump_attack':  this._jumpAttack(px, py, dist); break;
      case 'teleport':     this._teleport(px, py); break;
      default:             this._patrol();
    }

    this._syncMesh();
  }

  _patrol() {
    this.body.vx = this._dir * this.def.speed;
    if (Math.abs(this.x - this.startX) > this.range) this._dir *= -1;
  }

  _followGround(dx) {
    this.body.vx = Math.sign(dx) * this.def.speed * 1.9;
  }

  _follow(px, py) {
    const dx = px - this.x, dy = py - this.y;
    const d  = Math.sqrt(dx*dx + dy*dy) || 1;
    this.body.vx = (dx/d) * this.def.speed;
    this.body.vy = (dy/d) * this.def.speed;
  }

  _sineFly() {
    this._sineT += 0.04;
    this.body.vx = this._dir * this.def.speed;
    this.body.y  = this.startY - this.def.h/2 + Math.sin(this._sineT) * 40;
    if (Math.abs(this.x - this.startX) > this.range) this._dir *= -1;
  }

  _charge(dx, dist) {
    dist < 280 ? this._followGround(dx) : this._patrol();
  }

  _shoot(px, py) {
    if (this._timer < 1400) return;
    this._timer = 0;
    const dx = px - this.x, dy = py - this.y;
    const d  = Math.sqrt(dx*dx + dy*dy) || 1;
    this.scene.spawnEnemyProjectile(this.x, this.y, (dx/d)*320, (dy/d)*320);
  }

  _jumpPeriodic() {
    if (this._timer < 1200) return;
    this._timer = 0;
    if (this.body.onGround) this.body.vy = -380;
  }

  _jumpAttack(px, py, dist) {
    this._patrol();
    if (dist < 220 && this._timer > 1500 && this.body.onGround) {
      this._timer = 0;
      this.body.vx = Math.sign(px - this.x) * 250;
      this.body.vy = -420;
    }
  }

  _teleport(px, py) {
    if (this._timer < 1600) return;
    this._timer = 0;
    this.body.x = px + (Math.random() * 300 - 150) - this.def.w/2;
    this.body.y = py + (Math.random() * 160 - 80)  - this.def.h/2;
    // Flash effect
    this.mesh.material.opacity = 0.2;
    this.mesh.material.transparent = true;
    setTimeout(() => { if (this.mesh) { this.mesh.material.opacity = 1; } }, 300);
  }

  hit(dmg) {
    if (!this.alive) return false;
    if (this.def.shield) return false;
    this.hp -= (dmg || 50);
    this._updateHpBar();
    // Flash white
    const origCol = this.mesh.material.color.getHex?.() ?? 0xffffff;
    this.mesh.material.color?.set(0xffffff);
    setTimeout(() => { if (this.mesh?.material) this.mesh.material.color?.set(origCol); }, 120);
    if (this.hp <= 0) { this._die(); return true; }
    return false;
  }

  _die() {
    this.alive = false;
    this._sprTex?.dispose();
    this.mesh.material?.map?.dispose();
    this.mesh.material?.dispose();
    this.scene.engine.scene.remove(this.mesh);
    if (this._hpMesh) this.scene.engine.remove(this._hpMesh);
    if (this._hpBg)   this.scene.engine.remove(this._hpBg);
    this.phys.remove(this.body);
    SaveSystem.addCoins(this.def.reward || 5);
    SaveSystem.addMissionProgress('kills', 1);
    this.scene.updateHUD();
  }

  _buildHpBar() {
    this._hpBg   = this.scene.engine.box(42, 6, 2, 0x333333, this.x, this.y - this.def.h/2 - 8, 20);
    this._hpMesh = this.scene.engine.box(40, 4, 3, 0x00e676, this.x, this.y - this.def.h/2 - 8, 21);
  }

  _updateHpBar() {
    if (!this._hpMesh) return;
    const pct = Math.max(0, this.hp / this.maxHp);
    this._hpMesh.scale.x = pct;
    const color = pct > 0.5 ? 0x00e676 : pct > 0.25 ? 0xffc400 : 0xff4757;
    this._hpMesh.material.color.set(color);
    const ox = this.x - (40 * (1 - pct)) / 2;
    this._hpMesh.position.set(ox, -(this.y - this.def.h/2 - 8), 21);
    this._hpBg.position.set(this.x, -(this.y - this.def.h/2 - 8), 20);
  }

  _syncMesh() {
    // Sprite faces camera automatically (it's a Three.Sprite)
    this.mesh.position.set(this.x, -this.y, 5);
    if (this._hpMesh) this._updateHpBar();
  }

  destroy() {
    if (!this.alive) return;
    this._die();
  }
}
