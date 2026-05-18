import * as THREE from 'three';
import { Body }            from './engine/Physics2D.js';
import { SaveSystem }      from './systems/SaveSystem.js';
import { CharacterSprite } from './CharacterSprite.js';

export class Player {
  constructor(scene, physics, x, y) {
    this.scene     = scene;
    this.phys      = physics;
    this.health    = 3 + (SaveSystem.getItem('extra_heart') || 0);
    this.maxHealth = this.health;
    this.invincible  = false;
    this.onLadder    = false;
    this.lastCheckId = null;
    this._lastDir    = 1;
    this._lastShot   = 0;
    this._weapon     = SaveSystem.getActiveWeapon() || 'default';
    this._shooting   = false;
    this._shootTimer = 0;
    this._aimX       = 1;
    this._aimY       = 0;
    this._walkT      = 0;
    this.bullets     = [];

    // Sistema de habilidade especial (carrega com kills)
    this._abilityCharge = 0;    // 0-100
    this._abilityMax    = 100;
    this._abilityReady  = false;
    this._abilityCooldown = 0;

    const speedBonus = (SaveSystem.getItem('speed') || 0) * 0.3;
    const jumpBonus  = (SaveSystem.getItem('jump')  || 0) * 0.25;
    this._speedMult  = 1 + speedBonus;
    this._jumpMult   = 1 + jumpBonus;

    // Bônus passivos por nível
    this._speedMult += SaveSystem.getPassiveBonus('speed');
    this._jumpMult  += SaveSystem.getPassiveBonus('jump');
    this.health    += SaveSystem.getPassiveBonus('maxhp');
    this.maxHealth += SaveSystem.getPassiveBonus('maxhp');
    this._damageMult = 1 + SaveSystem.getPassiveBonus('damage');

    // Physics body (top-left origin)
    this.body = new Body(x - 10, y - 20, 20, 40);
    physics.addBody(this.body);

    // Pixel art character sprite
    const skin = SaveSystem.getActiveSkin() || 'default';
    const name = SaveSystem.getPlayerName?.() || '';
    this.sprite = new CharacterSprite(scene.engine.scene, x, y, skin, name);
  }

  get x() { return this.body.x + this.body.w / 2; }
  get y() { return this.body.y + this.body.h / 2; }
  get flipX() { return this._lastDir < 0; }

  update(input, ladderBodies, dt = 0.016) {
    const b   = this.body;
    const g   = this.scene.physics.gravity;
    const spd = 180 * this._speedMult;

    this.onLadder = this._nearLadder(ladderBodies);

    // P1 usa exclusivamente WASD + Espaço (setas ficam livres para P2)
    let vx = 0;
    if (input.isDown('KeyA')) { vx = -spd; this._lastDir = -1; }
    if (input.isDown('KeyD')) { vx =  spd; this._lastDir =  1; }
    b.vx = vx;

    const aimUp   = input.isDown('KeyW');
    const aimDown = input.isDown('KeyS');

    if (this.onLadder) {
      b.allowGravity = false;
      b.vy = aimUp ? -120 : aimDown ? 120 : 0;
    } else {
      b.allowGravity = true;
      if (input.justDown('KeyW') && b.onGround) {
        b.vy = (g <= 400 ? -300 : -360) * this._jumpMult;
      }
    }

    // Aim direction
    if (aimUp)        this._aimY = -1;
    else if (aimDown) this._aimY = 1;
    else              this._aimY = 0;
    this._aimX = this._lastDir;

    // Shoot
    if (input.justDown('Space')) this._shoot();

    // Habilidade especial (tecla Q ou botão de habilidade)
    if (this._abilityCooldown > 0) this._abilityCooldown -= dt;
    if (input.justDown('KeyQ') && this._abilityReady) {
      this._useAbility();
    }

    // Shoot timer
    if (this._shooting) {
      this._shootTimer -= dt * 1000;
      if (this._shootTimer <= 0) this._shooting = false;
    }

    // Walk cycle
    if (b.onGround && Math.abs(b.vx) > 10) this._walkT += dt * 8;

    // Determine animation state
    let state = 'idle';
    if (!b.onGround && b.vy < 0)            state = 'jump';
    else if (!b.onGround && b.vy >= 0)       state = 'fall';
    else if (b.onGround && Math.abs(b.vx) > 10) {
      state = Math.sin(this._walkT) > 0 ? 'walk1' : 'walk2';
    }
    this.animState = state;

    // Update visual
    this.sprite.animate(this.x, this.y, this._lastDir, this._aimX, this._aimY, state, this._weapon);

    // Bullets
    this.bullets = this.bullets.filter(bl => {
      if (!bl.active) {
        this.scene.engine.remove(bl.mesh);
        this.phys.remove(bl.body);
        return false;
      }
      bl.mesh.position.set(bl.body.x + 5, -(bl.body.y + 5), 8);
      return true;
    });
  }

  _shoot() {
    const now = Date.now();
    if (now - this._lastShot < 360) return;
    this._lastShot = now;
    this._shooting  = true;
    this._shootTimer = 250;

    const ax = this._aimX, ay = this._aimY;
    const len = Math.sqrt(ax*ax + ay*ay) || 1;
    this._fireBullets(ax/len, ay/len);
  }

  _fireBullets(ax, ay) {
    const S = 620;
    const spawn = (dax, day, ox=0, oy=0) => {
      const bx = this.x + dax*22 + ox;
      const by = this.y + day*14 - 8 + oy;
      const bod = new Body(bx-5, by-5, 10, 10);
      bod.vx = dax*S; bod.vy = day*S; bod.allowGravity = false;
      this.phys.addBody(bod);
      const mesh = this.scene.engine.box(8, 8, 6, 0xffff44, bx, by, 8);
      mesh.material.emissive = new THREE.Color(0x554400);
      mesh.material.emissiveIntensity = 0.8;
      const bl = { body: bod, mesh, active: true };
      this.bullets.push(bl);
      setTimeout(() => { bl.active = false; }, 1800);
      return bl;
    };

    switch (this._weapon) {
      case 'double':
        spawn(ax, ay, 0, -4);
        spawn(ax, ay, 0,  4);
        break;
      case 'spread':
        spawn(ax, ay);
        spawn(ax*0.866 - ay*0.5, ay*0.866 + ax*0.5);
        spawn(ax*0.866 + ay*0.5, ay*0.866 - ax*0.5);
        break;
      case 'laser': {
        const bl = spawn(ax, ay);
        bl.mesh.scale.set(3.5, 0.6, 1);
        bl.mesh.material.color.set(0x00ffff);
        bl.mesh.material.emissive = new THREE.Color(0x004466);
        bl.mesh.material.emissiveIntensity = 1;
        break;
      }
      default:
        spawn(ax, ay);
    }
  }

  _nearLadder(bodies) {
    if (!bodies?.length) return false;
    return bodies.some(l =>
      Math.abs((l.x + l.w/2) - this.x) < 20 &&
      Math.abs((l.y + l.h/2) - this.y) < 55
    );
  }

  addKillCharge(amount = 20) {
    if (this._abilityReady) return;
    this._abilityCharge = Math.min(this._abilityMax, this._abilityCharge + amount);
    if (this._abilityCharge >= this._abilityMax) {
      this._abilityReady = true;
      this._abilityCharge = this._abilityMax;
      this.scene._showMsg('⚡ HABILIDADE PRONTA! (Q)', 2000);
    }
    this._updateAbilityHUD();
  }

  _useAbility() {
    if (!this._abilityReady || this._abilityCooldown > 0) return;
    this._abilityReady   = false;
    this._abilityCharge  = 0;
    this._abilityCooldown = 8;
    this._updateAbilityHUD();

    switch (this._weapon) {
      case 'standard':
        // Pistola: dispara 12 balas em círculo
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this._fireBulletsDir(Math.cos(a), Math.sin(a));
        }
        this.scene._showMsg('🔫 DISPARO CIRCULAR!', 1500);
        break;
      case 'double':
        // Dupla: salva temporária de velocidade +80% por 3s
        this._speedMult *= 1.8;
        setTimeout(() => { this._speedMult /= 1.8; }, 3000);
        this.scene._showMsg('💨 ACELERAÇÃO DUPLA! (3s)', 1500);
        break;
      case 'spread':
        // Espingarda: explosão AOE em volta do player
        if (this.scene.enemies) {
          this.scene.enemies.forEach(en => {
            if (!en.alive) return;
            const dx = en.x - this.x, dy = en.y - this.y;
            if (Math.sqrt(dx*dx + dy*dy) < 200) en.hit(200);
          });
          if (this.scene.boss?.alive) this.scene.boss.hit(200);
        }
        this.scene._showMsg('💥 EXPLOSÃO AOE!', 1500);
        break;
      case 'laser':
        // Laser: raio contínuo por 2s que atravessa tudo
        this._laserBeamActive = true;
        setTimeout(() => { this._laserBeamActive = false; }, 2000);
        this.scene._showMsg('⚡ SUPER LASER! (2s)', 1500);
        break;
      case 'rocket':
        // Foguete: 5 foguetes em sequência em direção ao inimigo mais próximo
        let closestEnemy = null, closestDist = 9999;
        this.scene.enemies?.forEach(en => {
          if (!en.alive) return;
          const d = Math.hypot(en.x - this.x, en.y - this.y);
          if (d < closestDist) { closestDist = d; closestEnemy = en; }
        });
        const targetX = closestEnemy ? closestEnemy.x : this.x + this._lastDir * 300;
        const targetY = closestEnemy ? closestEnemy.y : this.y;
        for (let i = 0; i < 5; i++) {
          setTimeout(() => { this._fireBulletsDir((targetX - this.x) / Math.hypot(targetX - this.x, targetY - this.y) || this._lastDir, (targetY - this.y) / Math.hypot(targetX - this.x, targetY - this.y) || 0); }, i * 150);
        }
        this.scene._showMsg('🚀 CHUVA DE FOGUETES!', 1500);
        break;
      case 'mjolnir':
        // Mjolnir: raio em todos os inimigos na tela
        this.scene.enemies?.forEach(en => { if (en.alive) this.scene._spawnLightning(en.x, en.y); });
        if (this.scene.boss?.alive) this.scene._spawnLightning(this.scene.boss.x, this.scene.boss.y);
        this.scene._showMsg('⚡ TROVÃO TOTAL!', 1500);
        break;
    }
  }

  _fireBulletsDir(ax, ay) {
    const len = Math.sqrt(ax*ax + ay*ay) || 1;
    this._fireBullets(ax/len, ay/len);
  }

  _updateAbilityHUD() {
    const el = document.getElementById('hud-ability');
    if (!el) return;
    const pct = this._abilityCharge / this._abilityMax;
    el.style.width = `${pct * 100}%`;
    el.style.background = this._abilityReady ? '#ffee00' : '#0088ff';
    const label = document.getElementById('hud-ability-label');
    if (label) label.textContent = this._abilityReady ? '⚡ Q' : `${Math.floor(pct * 100)}%`;
  }

  takeDamage() {
    if (this.invincible) return;
    this.health = Math.max(0, this.health - 1);
    this.invincible = true;
    this.scene.updateHUD();
    this.scene.fx?.flashScreen(0xff0000, 0.3, 0.15);
    this.scene.fx?.shake(6, 0.25);
    if (this.health <= 0) {
      this._respawn();
      this.health = this.maxHealth;
      this.scene.updateHUD();
    }
    // Flicker effect
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      this.sprite.setVisible(tick % 2 === 0);
    }, 120);
    setTimeout(() => {
      clearInterval(id);
      this.sprite.setVisible(true);
      this.invincible = false;
    }, 900);
  }

  _respawn() {
    const cfg = this.scene.currentConfig;
    let rx = cfg.spawn.x, ry = cfg.spawn.y;
    if (this.lastCheckId) {
      const cp = this.scene.checkpoints.find(c => c.id === this.lastCheckId);
      if (cp) { rx = cp.x; ry = cp.y - 60; }
    }
    this.body.x = rx - 10;
    this.body.y = ry - 20;
    this.body.vx = 0;
    this.body.vy = 0;
  }

  destroy() {
    this.sprite.destroy();
    this.bullets.forEach(bl => {
      this.scene.engine.remove(bl.mesh);
      this.phys.remove(bl.body);
    });
    this.phys.remove(this.body);
  }
}
