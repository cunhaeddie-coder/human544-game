import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { Player } from '../Player.js';
import { Enemy }  from '../Enemy.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Audio } from '../systems/AudioSystem.js';

export class HordeScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.input = i;
    this.physics = new Physics2D();
    this._wave   = 0;
    this._kills  = 0;
    this._score  = 0;
    this._state  = 'playing';
    this._enemies = [];
    this._waveTimer = 5;  // 5s antes da primeira onda
    this._spawnCd   = 0;
    this._toSpawn   = 0;
    this._msgSp  = null;
    this._hudSp  = null;
    this.player  = null;
    this.boss    = null;
    this.enemyProjectiles = [];
    this.checkpoints = [];
    this.ladderBodies = [];
    this.spikesBodies = [];
    this._exiting = false;
    this.currentConfig = null;
  }

  // GameScene-compatible getters que Enemy e Player usam
  get engine()  { return this.e; }
  get enemies() { return this._enemies; }
  updateHUD()   { this._updateHudText(); }

  create() {
    const E = this.e;
    this.currentConfig = { worldWidth: 1280, spawn: {x:640, y:430} };
    this.physics.setGravity(550);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    // Arena
    E.plane(1280, 720, 0x020209, 640, 360, -400);
    // Estrelas
    for (let i = 0; i < 80; i++) {
      const s = E.box(1.5, 1.5, 1, 0xffffff, Math.random()*1280, Math.random()*400, -350);
      s.material.transparent = true; s.material.opacity = 0.3 + Math.random()*0.5;
    }
    // Chão principal
    const ground = new Body(40, 508, 1200, 32);
    this.physics.addStatic(ground);
    E.box(1200, 32, 60, 0x334455, 640, 524, 0);
    E.box(1200, 5, 62, 0x445566, 640, 509, 1);
    // Plataformas
    [[300,420,4],[640,320,3],[980,420,4],[200,330,2],[1080,330,2]].forEach(([x,y,t]) => {
      const pb = new Body(x, y, t*64, 20); pb.oneway = true;
      this.physics.addStatic(pb);
      E.box(t*64, 20, 40, 0x445566, x+t*32, y+10, 2);
    });
    // Paredes (invisíveis)
    this.physics.addStatic(new Body(-10, 0, 10, 720));
    this.physics.addStatic(new Body(1280, 0, 10, 720));

    this.player = new Player(this, this.physics, 640, 460);
    this.e._camX = 640; this.e._camY = 270;

    this._hudSp = E.text('ONDA 0 | Kills: 0 | Score: 0', 11, 0xaabbcc, 640, 30, 20);
    this._showMsg('MODO HORDA — Sobreviva!', 3000);
  }

  spawnEnemyProjectile(x, y, vx, vy) {
    const b = new Body(x-5, y-5, 10, 10);
    b.vx = vx; b.vy = vy; b.allowGravity = false;
    this.physics.addBody(b);
    const mesh = this.e.box(8, 8, 6, 0xff4400, x, y, 8);
    const pr = { body: b, mesh, active: true };
    this.enemyProjectiles.push(pr);
    setTimeout(() => { pr.active = false; }, 2500);
  }

  _startWave() {
    this._wave++;
    const count = this._wave * 3 + 2;
    this._toSpawn = count;
    this._spawnCd = 0;
    this._showMsg(`ONDA ${this._wave}!`, 2000);
    Audio.waveStart();
    this._updateHudText();
  }

  _spawnEnemy() {
    if (this._toSpawn <= 0) return;
    const types = this._wave <= 3 ? ['slime'] :
                  this._wave <= 6 ? ['slime','bat'] :
                  this._wave <= 10 ? ['slime','bat','shooter'] :
                  ['shield','shooter','bat','ghost'];
    const type = types[Math.floor(Math.random() * types.length)];
    const side = Math.random() < 0.5;
    const x = side ? 80 : 1200;
    const en = new Enemy(this, this.physics, x, 460, type, 300);
    en._netId = this._enemies.length;
    this._enemies.push(en);
    this._toSpawn--;
  }

  _updateHudText() {
    if (!this._hudSp) return;
    this.e.remove(this._hudSp);
    this._hudSp = this.e.text(
      `ONDA ${this._wave} | Kills: ${this._kills} | Score: ${this._score}`,
      11, 0xaabbcc, 640, 30, 20
    );
  }

  _showMsg(str, duration) {
    if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; }
    this._msgSp = this.e.text(str, 16, 0xffc400, 640, 360, 25);
    if (duration) setTimeout(() => {
      if (this._msgSp) { this.e.remove(this._msgSp); this._msgSp = null; }
    }, duration);
  }

  update(dt) {
    if (this._state !== 'playing') {
      if (this.input.justDown('Enter') || this.input.justDown('NumpadEnter')) {
        this.m.start('ModeScene');
      }
      return;
    }
    if (this.input.justDown('Escape')) { this.m.start('ModeScene'); return; }

    this.physics.step(dt);
    this.player.update(this.input, []);

    // Câmera fixa na arena
    this.e._camX = 640; this.e._camY = 270;

    // Timer da onda
    this._waveTimer -= dt;
    if (this._waveTimer <= 0 && this._toSpawn === 0 && this._enemies.length === 0) {
      this._waveTimer = 8;
      this._startWave();
    }

    // Spawn de inimigos
    this._spawnCd -= dt;
    if (this._toSpawn > 0 && this._spawnCd <= 0) {
      this._spawnEnemy();
      this._spawnCd = 0.6;
    }

    // Atualiza inimigos
    this._enemies.forEach(en => {
      if (!en.alive) return;
      en.update(this.player, dt);
      if (this.physics.overlaps(this.player.body, en.body)) this.player.takeDamage();
    });

    // Bullets vs inimigos
    this.player.bullets.forEach(bl => {
      if (!bl.active) return;
      this._enemies.forEach(en => {
        if (!en.alive) return;
        if (this.physics.overlaps(bl.body, en.body)) { en.hit(50); bl.active = false; Audio.enemyHit(); }
      });
    });

    // Remove mortos + carrega habilidade especial
    const before = this._enemies.length;
    this._enemies = this._enemies.filter(e => {
      if (!e.alive) {
        this.player.addKillCharge?.(20);
        return false;
      }
      return true;
    });
    const died = before - this._enemies.length;
    if (died > 0) {
      this._kills += died;
      this._score += died * 10 + this._wave * 5;
      Audio.enemyDie();
      this._updateHudText();
    }

    // Projéteis inimigos
    this.enemyProjectiles = this.enemyProjectiles.filter(pr => {
      if (!pr.active) { this.e.remove(pr.mesh); this.physics.remove(pr.body); return false; }
      pr.mesh.position.set(pr.body.x+5, -(pr.body.y+5), 7);
      if (this.physics.overlaps(pr.body, this.player.body)) { this.player.takeDamage(); pr.active = false; }
      return pr.active;
    });

    // Kill zone
    if (this.player.body.y > 600) { this.player.health = 1; this.player.takeDamage(); }

    // Game over
    if (this.player.health <= 0) {
      this._state = 'gameover';
      this._score += this._wave * 100;
      SaveSystem.recordScore('horde', this._score);
      this._showMsg(`GAME OVER\nOnda: ${this._wave} | Kills: ${this._kills} | Score: ${this._score}\nENTER=voltar`, 0);
    }
  }

  destroy() {
    this.player?.destroy();
    this._enemies.forEach(e => e.destroy?.());
    this.enemyProjectiles.forEach(pr => { this.e.remove(pr.mesh); this.physics.remove(pr.body); });
    this.physics.clear();
  }
}
