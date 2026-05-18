import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { LEVEL_CONFIGS }   from '../levels/LevelConfig.js';
import { SaveSystem }      from '../systems/SaveSystem.js';
import { Player }          from '../Player.js';
import { Enemy }           from '../Enemy.js';
import { BossRobot }       from '../enemies/BossRobot.js';
import { BossDragon }      from '../enemies/BossDragon.js';
import { BossPhoenix }     from '../enemies/BossPhoenix.js';
import { BossLich }        from '../enemies/BossLich.js';
import { BossGolem }       from '../enemies/BossGolem.js';
import { BossHydra }       from '../enemies/BossHydra.js';
import { BossVoid }        from '../enemies/BossVoid.js';
import { BossTitan }       from '../enemies/BossTitan.js';
import { BossOmega }       from '../enemies/BossOmega.js';
import { VenusPlant }      from '../enemies/VenusPlant.js';
import { getNetwork }      from '../Network.js';
import { LocalPlayer2 }   from '../LocalPlayer2.js';
import { PetSystem }      from '../PetSystem.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { TouchControls }  from '../engine/TouchControls.js';
import { FXSystem }       from '../systems/FXSystem.js';

const TW = 64, TH_GR = 32, TH_PL = 20, LAD_H = 64;

const PALETTES = {
  1:  { sky:0x87ceeb, ground:0x5a8a2e, plat:0x4a7a1e },
  2:  { sky:0x1a4d0a, ground:0x2d5c10, plat:0x3d7c18 },
  3:  { sky:0x0d1b3e, ground:0x334466, plat:0x445577 },
  4:  { sky:0xc8e8f5, ground:0x8899aa, plat:0xaabbcc },
  5:  { sky:0x050520, ground:0x334455, plat:0x445566 },
  6:  { sky:0x1a0d2e, ground:0x2d1a44, plat:0x3d2255 },
  7:  { sky:0x0d2005, ground:0x1a3a0a, plat:0x2a4a12 },
  8:  { sky:0x2d0a00, ground:0x661100, plat:0x882200 },
  9:  { sky:0x0a0d2e, ground:0x1a2244, plat:0x2a3355 },
  10: { sky:0x1a0505, ground:0x551100, plat:0x771800 },
  // Etapa C — Abismo
  11: { sky:0x0a0a1a, ground:0x1a1a2e, plat:0x2a2a44 },
  12: { sky:0x120818, ground:0x221030, plat:0x331848 },
  13: { sky:0x0a1a05, ground:0x1a3010, plat:0x2a4a18 },
  14: { sky:0x101018, ground:0x202030, plat:0x303048 },
  15: { sky:0x050520, ground:0x334455, plat:0x445577 },
  // Etapa D — Chamas
  16: { sky:0x2a0800, ground:0x661500, plat:0x882200 },
  17: { sky:0x350a00, ground:0x771800, plat:0x992800 },
  18: { sky:0x400c00, ground:0x881a00, plat:0xaa3000 },
  19: { sky:0x4a0e00, ground:0x991c00, plat:0xbb3500 },
  20: { sky:0x550f00, ground:0xaa1e00, plat:0xcc3800 },
  // Etapa E — Sombras
  21: { sky:0x080012, ground:0x14002a, plat:0x200044 },
  22: { sky:0x0a001a, ground:0x180034, plat:0x280050 },
  23: { sky:0x0c0022, ground:0x1c003e, plat:0x2c0060 },
  24: { sky:0x0e0028, ground:0x200048, plat:0x340070 },
  25: { sky:0x050520, ground:0x334455, plat:0x556688 },
  // Etapa F — Fim do Mundo
  26: { sky:0x000020, ground:0x000844, plat:0x001166 },
  27: { sky:0x000030, ground:0x001055, plat:0x001a80 },
  28: { sky:0x000040, ground:0x001466, plat:0x002299 },
  29: { sky:0x000000, ground:0x0a0a0a, plat:0x181818 },
  30: { sky:0x050000, ground:0x440000, plat:0x660000 },
  // Arco G — Dimensão Caótica (31-35)
  31: { sky:0x1a0030, ground:0x330055, plat:0x440077 },
  32: { sky:0x200035, ground:0x3a0060, plat:0x4d0082 },
  33: { sky:0x250038, ground:0x440065, plat:0x58008a },
  34: { sky:0x2a003c, ground:0x4d006a, plat:0x640090 },
  35: { sky:0x300040, ground:0x550070, plat:0x700096 },
  // Arco H — Vazio Eterno (36-40)
  36: { sky:0x000818, ground:0x001030, plat:0x001848 },
  37: { sky:0x000a1c, ground:0x001234, plat:0x001a4e },
  38: { sky:0x000c20, ground:0x001438, plat:0x001c54 },
  39: { sky:0x000e24, ground:0x00163c, plat:0x001e5a },
  40: { sky:0x001028, ground:0x001840, plat:0x002060 },
  // Arco I — Nexo das Máquinas (41-45)
  41: { sky:0x001010, ground:0x002020, plat:0x003030 },
  42: { sky:0x001414, ground:0x002828, plat:0x003c3c },
  43: { sky:0x001818, ground:0x002c2c, plat:0x004040 },
  44: { sky:0x001c1c, ground:0x003030, plat:0x004444 },
  45: { sky:0x002020, ground:0x003434, plat:0x004848 },
  // Arco J — O Fim (46-50)
  46: { sky:0x0a0000, ground:0x200000, plat:0x380000 },
  47: { sky:0x0e0000, ground:0x280000, plat:0x420000 },
  48: { sky:0x120000, ground:0x300000, plat:0x4c0000 },
  49: { sky:0x160000, ground:0x380000, plat:0x560000 },
  50: { sky:0x1a0000, ground:0x400000, plat:0x600000 },
};

export class GameScene {
  constructor(engine, manager, input) {
    this.engine   = engine;
    this.manager  = manager;
    this.input    = input;
    this.physics  = new Physics2D();
    this.player   = null;
    this.enemies  = [];
    this.coins    = [];
    this.stars    = [];
    this.checkpoints     = [];
    this.ladderBodies    = [];
    this.spikesBodies    = [];
    this.exitBody        = null;
    this.exitMesh        = null;
    this.enemyProjectiles= [];
    this._exiting        = false;
    this._exitLocked     = false;
    this.currentConfig   = null;
    this.levelNum        = 1;
    this.boss            = null;
    this.network         = null;
    this._remotePlayers  = {};
    this.player2         = null;
    this.pets            = null;
    this.touchControls   = null;
    this.fx              = null;
  }

  create(data = {}) {
    this._mode         = data.mode || null;
    this.levelNum      = data.level || 1;
    this.currentConfig = LEVEL_CONFIGS[this.levelNum];
    if (!this.currentConfig) { this.manager.start('MenuScene'); return; }
    const cfg = this.currentConfig;
    const pal = PALETTES[this.levelNum] || PALETTES[1];

    this.physics.setGravity(cfg.gravity || 550);
    // No bottom soft floor — falling below 600 triggers kill plane in update()
    this.physics.setWorldBounds(0, cfg.worldWidth, 9999);
    this.engine.setWorldBounds(0, cfg.worldWidth);

    this._buildBackground(cfg, pal);
    this._buildGround(cfg, pal);
    this._buildPlatforms(cfg, pal);
    this._buildLadders(cfg);
    this._buildHazards(cfg);
    this._buildCheckpoints(cfg);
    this._buildExit(cfg);
    this._buildCoins(cfg);
    this._buildStars(cfg);
    this._buildEnemies(cfg);

    // Boss
    if (cfg.boss === 'robot')   this.boss = new BossRobot(this, this.physics);
    if (cfg.boss === 'dragon')  this.boss = new BossDragon(this, this.physics);
    if (cfg.boss === 'phoenix') this.boss = new BossPhoenix(this, this.physics);
    if (cfg.boss === 'lich')    this.boss = new BossLich(this, this.physics);
    if (cfg.boss === 'golem')   this.boss = new BossGolem(this, this.physics);
    if (cfg.boss === 'hydra')   this.boss = new BossHydra(this, this.physics);
    if (cfg.boss === 'void')    this.boss = new BossVoid(this, this.physics);
    if (cfg.boss === 'titan')   this.boss = new BossTitan(this, this.physics);
    if (cfg.boss === 'omega')   this.boss = new BossOmega(this, this.physics);

    // Boss Raid: multiplica HP pelo número de jogadores
    if (data.mode === 'raid' && this.boss) {
      const mult = data.playerCount || 2;
      this.boss.hp    *= mult;
      this.boss.maxHp *= mult;
      this.boss._updBar?.();
      this._showMsg(`⚡ BOSS RAID — ${mult} jogadores | Boss HP: ${this.boss.maxHp}`, 5000);
    }

    // Venus Plants
    this._venusPlants = [];
    cfg.venusPlants?.forEach(vp => {
      this._venusPlants.push(new VenusPlant(this, this.physics, vp.x, vp.groundY || 508));
    });

    this.fx = new FXSystem(this.engine);
    this.player = new Player(this, this.physics, cfg.spawn.x, cfg.spawn.y);
    this.engine._camX = cfg.spawn.x;
    this.engine._camY = 270;
    this.updateHUD();
    this._showMsg(`${cfg.subtitle} - ${cfg.name}`, 3000);

    // Pets
    this.pets = new PetSystem(this.engine.scene, this.engine);
    this.pets.init(cfg.spawn.x, cfg.spawn.y);

    this._setupPause();

    // Controles touch para mobile
    this.touchControls = new TouchControls(this.input);
    this.touchControls.show();

    // Modo cooperativo local (mesmo teclado)
    if (data.mode === 'coop') {
      this.player2 = new LocalPlayer2(this, this.physics, cfg.spawn.x + 50, cfg.spawn.y);
    }

    if (data.mode === 'online') {
      getNetwork().then(net => {
        if (!net) { this._showMsg('Servidor offline — modo solo ativado', 3000); return; }
        this.network = net;
        net.bindScene(this);

        if (data.skipRoom) {
          const code = net.roomCode;
          if (code) {
            const roomHud = document.getElementById('hud-room');
            if (roomHud) roomHud.textContent = `Sala: ${code}`;
            Object.entries(net._players).forEach(([id, p]) => {
              if (id !== net.socket.id) this.addRemotePlayer(id, p);
            });
          }
        }

        // Kill sync — quando outro jogador mata um inimigo, remove localmente
        net.socket?.on('enemyKilled', d => {
          const en = this.enemies[d.id];
          if (en?.alive) {
            en.alive = false;
            this.fx?.spawnDeathBurst(en.x, en.y, en.def?.color ?? 0xff4400, 8);
          }
        });
      });
    }
  }

  // ── BUILDERS ──────────────────────────────────────────────

  _buildBackground(cfg, pal) {
    const W = cfg.worldWidth, E = this.engine;
    // Sky — fills full viewport height (720)
    E.plane(W + 400, 900, pal.sky, W/2, 270, -350);
    // Horizon ground fill (below ground tiles, just visual)
    E.plane(W + 400, 200, pal.ground, W/2, 570, -190);
    // Kill zone — thin red/dark strip just at Y=550-580 (barely peeks under ground)
    const lavaCol = this.levelNum >= 6 ? 0x220008 : 0xdd2200;
    E.plane(W + 400, 40, lavaCol, W/2, 548, -170, 0.9);

    if (cfg.deco?.clouds) {
      for (let i = 0; i < cfg.deco.clouds; i++) {
        const cx = 100 + Math.random() * (W - 200);
        const cy = 60 + Math.random() * 140;
        const cw = 90 + Math.random() * 110;
        E.plane(cw,        30, 0xffffff, cx,      cy,     -160, 0.88);
        E.plane(cw * 0.6,  24, 0xffffff, cx - 30, cy + 9, -159, 0.8);
        E.plane(cw * 0.6,  24, 0xffffff, cx + 30, cy + 9, -158, 0.8);
      }
    }
    if (cfg.deco?.trees) {
      for (let i = 0; i < cfg.deco.trees; i++) {
        const tx = 150 + (i / cfg.deco.trees) * (W - 300);
        const dark = this.levelNum >= 6;
        const trunkColor = dark ? 0x3d2244 : 0x7a5230;
        const topColor1  = dark ? 0x220d33 : 0x2d6b1a;
        const topColor2  = dark ? 0x1a0a28 : 0x1f5214;
        // Trunk: rooted at ground surface (Y=508), goes up
        E.box(12, 72, 8, trunkColor, tx, 472, -90);
        // Canopy: centered above trunk top
        E.box(64, 56, 12, topColor1, tx, 408, -89);
        E.box(48, 44, 12, topColor2, tx, 386, -88);
      }
    }
  }

  _buildGround(cfg, pal) {
    cfg.ground?.forEach(seg => {
      for (let i = 0; i < seg.tiles; i++) {
        const gx = seg.x + i * TW + TW / 2;
        this.engine.box(TW, TH_GR, 60, pal.ground, gx, 524, 0);
        this.engine.box(TW - 2, 5, 62, this._lighten(pal.ground), gx, 509, 1);
        const b = new Body(seg.x + i * TW, 508, TW, TH_GR);
        this.physics.addStatic(b);
      }
    });
  }

  _buildPlatforms(cfg, pal) {
    cfg.platforms?.forEach(p => {
      for (let i = 0; i < p.tiles; i++) {
        const gx = p.x + i * TW + TW / 2;
        this.engine.box(TW, TH_PL, 40, pal.plat, gx, p.surfaceY + TH_PL/2, 2);
        this.engine.box(TW - 2, 4, 42, this._lighten(pal.plat), gx, p.surfaceY, 3);
        const b = new Body(p.x + i * TW, p.surfaceY, TW, TH_PL);
        b.oneway = true;
        this.physics.addStatic(b);
      }
    });
  }

  _buildLadders(cfg) {
    cfg.ladders?.forEach(l => {
      const tiles = Math.ceil((l.fromY - l.toY) / LAD_H);
      for (let i = 0; i < tiles; i++) {
        const gy = l.fromY - i * LAD_H - LAD_H / 2;
        this.engine.box(10, LAD_H, 8, 0xaa7733, l.x, gy, 3);
        const b = new Body(l.x - 14, l.fromY - (i + 1) * LAD_H, 28, LAD_H);
        this.ladderBodies.push(b);
      }
    });
  }

  _buildHazards(cfg) {
    cfg.spikes?.forEach(s => {
      this.engine.box(48, 16, 18, 0xcc2222, s.x, s.y - 8, 2);
      this.spikesBodies.push(new Body(s.x - 24, s.y - 16, 48, 16));
    });
  }

  _buildCheckpoints(cfg) {
    cfg.checkpoints?.forEach(c => {
      const mesh = this.engine.box(14, 40, 14, 0x0088cc, c.x, c.surfaceY - 20, 5);
      mesh.material.emissive = new THREE.Color(0x003366);
      mesh.material.emissiveIntensity = 0.5;
      const b = new Body(c.x - 18, c.surfaceY - 46, 36, 46);
      this.checkpoints.push({ id: c.id, x: c.x, y: c.surfaceY, body: b, mesh, done: false });
    });
  }

  _buildExit(cfg) {
    if (!cfg.exit) return;
    this._exitLocked = !!cfg.boss;
    const col = this._exitLocked ? 0x444444 : 0x00ffaa;
    this.exitMesh = this.engine.box(32, 52, 18, col, cfg.exit.x, cfg.exit.surfaceY - 26, 5);
    this.exitMesh.material.emissive = new THREE.Color(this._exitLocked ? 0x000000 : 0x004433);
    this.exitMesh.material.emissiveIntensity = 0.5;
    this.exitBody = new Body(cfg.exit.x - 20, cfg.exit.surfaceY - 52, 40, 52);
  }

  _buildCoins(cfg) {
    cfg.coins?.forEach(c => {
      const mesh = this.engine.box(14, 14, 14, 0xffd700, c.x, c.y, 6);
      mesh.material.emissive = new THREE.Color(0x554400);
      mesh.material.emissiveIntensity = 0.6;
      this.coins.push({ body: new Body(c.x-7, c.y-7, 14, 14), mesh, startY: c.y });
    });
  }

  _buildStars(cfg) {
    cfg.stars?.forEach(s => {
      if (SaveSystem.isStarCollected(this.levelNum, s.id)) return;
      const mesh = this.engine.box(18, 18, 18, 0xffee00, s.x, s.y, 7);
      mesh.material.emissive = new THREE.Color(0x665500);
      mesh.material.emissiveIntensity = 0.8;
      this.stars.push({ id: s.id, body: new Body(s.x-9, s.y-9, 18, 18), mesh });
    });
  }

  _buildEnemies(cfg) {
    cfg.enemies?.forEach(e => {
      const ey = e.surfaceY ? e.surfaceY - 16 : (e.y || 400);
      this.enemies.push(new Enemy(this, this.physics, e.x, ey, e.type || 'slime', e.range || 120));
    });
  }

  // ── HUD ───────────────────────────────────────────────────

  updateHUD() {
    const h  = this.player?.health   ?? 0;
    const mh = this.player?.maxHealth ?? 3;
    const hEl = document.getElementById('hud-health');
    if (hEl) hEl.textContent = '❤'.repeat(h) + '❤️‍️'.repeat(0) + String.fromCodePoint(0x1F5A4).repeat(Math.max(0, mh - h));
    const cEl = document.getElementById('hud-coins');
    if (cEl) cEl.textContent = `Moedas: ${SaveSystem.getCoins()}`;
    const lEl = document.getElementById('hud-level');
    if (lEl) lEl.textContent = this.currentConfig?.subtitle ?? '';
    const xpEl = document.getElementById('hud-xp');
    const lvl  = SaveSystem.getPlayerLevel();
    const xp   = SaveSystem.getXP();
    const need  = lvl * 100;
    if (xpEl) xpEl.textContent = `LVL ${lvl}  XP ${xp}/${need}`;
  }

  _showMsg(text, dur = 2500) {
    const el = document.getElementById('hud-msg');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => { el.style.opacity = '0'; }, dur);
  }

  // ── PAUSA ─────────────────────────────────────────────────────
  _setupPause() {
    this._paused = false;
    window.togglePause = () => {
      this._paused = !this._paused;
      const overlay = document.getElementById('pause-overlay');
      if (overlay) overlay.classList.toggle('active', this._paused);
      if (this._paused) this.touchControls?.releaseAll();
      // Mostrar código da sala se online
      if (this._paused && this.network?.roomCode) {
        const roomEl = document.getElementById('pause-room');
        if (roomEl) roomEl.textContent = `Código da sala: ${this.network.roomCode}`;
        try {
          this.network.getRoomInfo?.().then(r => {
            const ipEl = document.getElementById('pause-ip');
            if (ipEl && r) ipEl.textContent = `Outro dispositivo: http://${r.ip}:${r.port}`;
          });
        } catch(e) {}
      }
    };
    window.pauseGoShop    = () => { this._closePause(); this.manager.start('ShopScene', { from:'GameScene', level:this.levelNum, mode:this._mode }); };
    window.pauseExitGame  = () => { this._closePause(); this.manager.start('MenuScene'); };
    window.pauseChangeSkin= () => {
      const skins = ['default','warrior','mage','rogue','gold'];
      const cur  = SaveSystem.getActiveSkin() || 'default';
      const next = skins[(skins.indexOf(cur) + 1) % skins.length];
      SaveSystem.setActiveSkin(next);
      // Rebuild player sprite with new skin on next scene load
      this._showMsg(`Skin: ${next}`, 2000);
    };
    // Botão pausa visível apenas no GameScene
    const btn = document.getElementById('pause-btn');
    if (btn) btn.style.display = 'block';
    // HUD de sala
    const roomHud = document.getElementById('hud-room');
    if (roomHud && this.network?.roomCode) roomHud.textContent = `Sala: ${this.network.roomCode}`;
  }

  _closePause() {
    this._paused = false;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ── ENEMY PROJECTILE ─────────────────────────────────────

  spawnEnemyProjectile(x, y, vx, vy) {
    const b = this.physics.addBody(new Body(x-5, y-5, 10, 10));
    b.vx = vx; b.vy = vy; b.allowGravity = false;
    const mesh = this.engine.box(10, 10, 10, 0xff4400, x, y, 7);
    mesh.material.emissive = new THREE.Color(0x441100);
    mesh.material.emissiveIntensity = 0.8;
    const pr = { body: b, mesh, active: true };
    this.enemyProjectiles.push(pr);
    setTimeout(() => { pr.active = false; }, 2500);
  }

  // ── MULTIPLAYER REMOTO ────────────────────────────────────────

  addRemotePlayer(id, data) {
    if (this._remotePlayers[id]) return;
    const skin   = data.skin || 'warrior';
    const name   = data.name || 'P2';
    const x      = data.x   || 100;
    const y      = data.y   || 400;
    const sprite = new CharacterSprite(this.engine.scene, x, y, skin, name);
    this._remotePlayers[id] = { sprite };
  }

  moveRemotePlayer(id, data) {
    const rp = this._remotePlayers[id];
    if (!rp) return;
    const dir = data.flip ? -1 : 1;
    rp.sprite.animate(data.x, data.y, dir, dir, 0, data.anim || 'idle', data.weapon || 'default');
  }

  removeRemotePlayer(id) {
    const rp = this._remotePlayers[id];
    if (!rp) return;
    rp.sprite.destroy();
    delete this._remotePlayers[id];
  }

  // ── MJOLNIR: raio + AOE ──────────────────────────────────────

  _spawnLightning(enemyX, enemyY) {
    // Raio visual: caixa alta e fina amarela
    const bolt = this.engine.box(8, 200, 4, 0xffee00, enemyX, enemyY - 100, 30);
    bolt.material.emissive = new THREE.Color(0x886600);
    bolt.material.emissiveIntensity = 1;
    // Flash secundário (núcleo branco)
    const core = this.engine.box(3, 200, 4, 0xffffff, enemyX, enemyY - 100, 31);
    core.material.emissive = new THREE.Color(0xffffff);
    core.material.emissiveIntensity = 1;
    // Remove após 300ms
    setTimeout(() => {
      this.engine.remove(bolt);
      this.engine.remove(core);
    }, 300);
    // AOE: todos os inimigos a 80px de raio recebem 100 de dano
    const AOE_RADIUS = 80;
    this.enemies.forEach(en => {
      if (!en.alive) return;
      const dx = en.x - enemyX, dy = en.y - enemyY;
      if (Math.sqrt(dx*dx + dy*dy) <= AOE_RADIUS) {
        en.hit(100);
      }
    });
    if (this.boss?.alive) {
      const dx = this.boss.x - enemyX, dy = this.boss.y - enemyY;
      if (Math.sqrt(dx*dx + dy*dy) <= AOE_RADIUS) this.boss.hit(100);
    }
  }

  _activateExit() {
    this._exitLocked = false;
    if (this.exitMesh) {
      this.exitMesh.material.color.set(0x00ffaa);
      this.exitMesh.material.emissive = new THREE.Color(0x004433);
    }
    this._showMsg('BOSS DERROTADO! Siga em frente!', 3000);
  }

  // ── UPDATE ────────────────────────────────────────────────

  update(dt) {
    if (!this.player || this._exiting) return;
    if (this._paused) return;
    if (this.input?.justDown('Escape')) { window.togglePause?.(); return; }
    const p = this.player;

    this.physics.step(dt);
    this.fx?.update(dt);
    p.update(this.input, this.ladderBodies);
    this.player2?.update(this.input, this.ladderBodies);
    this._venusPlants?.forEach(vp => { if (!vp.dead) vp.update(p, dt); });

    // Camera segue média entre P1 e P2 no coop, com zoom dinâmico
    const camX = this.player2 ? (p.x + this.player2.x) / 2 : p.x;
    const camY = this.player2 ? (p.y + this.player2.y) / 2 : p.y;
    this.engine.followTarget(camX, camY, 0.12);
    if (this.player2) {
      const dist = Math.abs(p.x - this.player2.x);
      // Zoom out quando jogadores ficam longe; câmera ortográfica ajusta frustum
      const targetZoom = dist > 500 ? Math.max(0.5, 1 - (dist - 500) / 1500) : 1;
      if (this.engine.camera?.isOrthographicCamera) {
        this.engine.camera.zoom += (targetZoom - this.engine.camera.zoom) * 0.05;
        this.engine.camera.updateProjectionMatrix();
      }
      // Aviso quando muito longe
      if (dist > 900 && !this._distWarn) {
        this._distWarn = true;
        this._showMsg('⚠ Jogadores muito distantes!', 1500);
      } else if (dist < 700) {
        this._distWarn = false;
      }
    }

    this.network?.sendMove({
      x: p.x, y: p.y,
      flip:   p.flipX,
      anim:   p.animState || 'idle',
      weapon: p._weapon   || 'default',
      skin:   SaveSystem.getActiveSkin() || 'default',
    });
    this.pets?.update(p, this.enemies, this.boss, dt, this);

    // ── Kill plane: cair para fora da tela = morte instantânea ──
    if (p.body.y > 600 && !p.invincible) {
      p.health = 1; // takeDamage vai reduzir para 0 e respawnar
      p.takeDamage();
      this._showMsg('Você caiu! Respawnando...', 1800);
    }

    const t = performance.now() / 1000;

    // Coins
    this.coins = this.coins.filter(c => {
      c.mesh.position.y  = -(c.startY + Math.sin(t * 2.5 + c.startY) * 6);
      c.mesh.rotation.y += dt * 2;
      if (this.physics.overlaps(p.body, c.body)) {
        this.engine.remove(c.mesh);
        SaveSystem.addCoins(5);
        this.fx?.spawnCollectPop(c.startY > 0 ? c.body.x + 7 : p.x, c.startY, 0xffd700);
        this.fx?.spawnTextPop(p.x, p.y - 30, '+5', 0xffd700);
        this.updateHUD();
        return false;
      }
      return true;
    });

    // Stars
    this.stars = this.stars.filter(s => {
      s.mesh.rotation.y += dt * 3;
      s.mesh.rotation.x += dt * 1.5;
      if (this.physics.overlaps(p.body, s.body)) {
        if (SaveSystem.collectStar(this.levelNum, s.id)) {
          SaveSystem.addCoins(50);
          this._showMsg('Estrela coletada! +50 moedas');
          this.fx?.spawnCollectPop(s.body.x + 9, s.body.y + 9, 0xffee00);
          this.fx?.spawnTextPop(p.x, p.y - 40, '★ +50', 0xffee00);
          this.updateHUD();
        }
        this.engine.remove(s.mesh);
        return false;
      }
      return true;
    });

    // Checkpoints — P1 e P2
    this.checkpoints.forEach(cp => {
      cp.mesh.rotation.y += dt * 1.5;
      const p1Hit = !cp.done && this.physics.overlaps(p.body, cp.body);
      const p2Hit = this.player2 && !cp.done && this.physics.overlaps(this.player2.body, cp.body);
      if (p1Hit || p2Hit) {
        p.lastCheckId = cp.id;
        if (this.player2) this.player2.lastCheckId = cp.id;
        cp.done = true;
        cp.mesh.material.color.set(0x00ff88);
        cp.mesh.material.emissive = new THREE.Color(0x00aa44);
        this._showMsg(`Checkpoint ${cp.id} salvo!`);
      }
    });

    // Spikes
    this.spikesBodies.forEach(sb => { if (this.physics.overlaps(p.body, sb)) p.takeDamage(); });

    // Exit — qualquer jogador (P1 ou P2) pode acionar a saída
    if (this.exitBody && !this._exitLocked) {
      const p1Exit = this.physics.overlaps(p.body, this.exitBody);
      const p2Exit = this.player2 && this.physics.overlaps(this.player2.body, this.exitBody);
      if (p1Exit || p2Exit) this._onExit();
    }
    if (this.exitMesh) this.exitMesh.rotation.y += dt * 2;

    // Spikes P2
    if (this.player2) {
      this.spikesBodies.forEach(sb => { if (this.physics.overlaps(this.player2.body, sb)) this.player2.takeDamage(); });
      if (this.player2.body.y > 600 && !this.player2.invincible) { this.player2.health=1; this.player2.takeDamage(); }
    }

    // Player bullets vs enemies + boss — P1 e P2
    const allBullets = [...p.bullets, ...(this.player2?.bullets || [])];
    allBullets.forEach(bl => {
      if (!bl.active) return;
      this.enemies.forEach(en => {
        if (!en.alive) return;
        if (!this.physics.overlaps(bl.body, en.body)) return;
        if (en.def?.shield) {
          bl.body.vx *= -1; en.shieldHp = (en.shieldHp ?? 3) - 1;
          if (en.shieldHp <= 0) { en.def = {...en.def, shield: false}; en.hit(50); }
        } else {
          en.hit(50);
          this.fx?.spawnHitFlash(en.x, en.y);
          if (p._weapon === 'mjolnir') this._spawnLightning(en.x, en.y);
          bl.active = false;
        }
        this.updateHUD();
      });
      // Bala acerta VenusPlant
      this._venusPlants?.forEach(vp => {
        if (vp.dead || !bl.active) return;
        const bx = bl.body.x + bl.body.w/2, by = bl.body.y + bl.body.h/2;
        if (Math.abs(bx - vp.x) < 26 && Math.abs(by - vp.y) < 70) {
          vp.takeDamage(1); bl.active = false;
        }
      });
      if (this.boss?.alive && this.physics.overlaps(bl.body, this.boss.body)) {
        this.boss.hit(50); bl.active = false;
      }
      this.boss?.ghosts?.forEach(g => {
        if (!g.alive) return;
        if (this.physics.overlaps(bl.body, g.body)) { this.boss.hitGhost(g, 50); bl.active = false; }
      });
    });

    // Boss update + contact damage — P1 e P2
    if (this.boss?.alive) {
      this.boss.update(p, dt);
      if (this.physics.overlaps(p.body, this.boss.body)) p.takeDamage();
      if (this.player2 && this.physics.overlaps(this.player2.body, this.boss.body)) this.player2.takeDamage();
      this.boss.ghosts?.forEach(g => {
        if (!g.alive) return;
        if (this.physics.overlaps(p.body, g.body)) p.takeDamage();
        if (this.player2 && this.physics.overlaps(this.player2.body, g.body)) this.player2.takeDamage();
      });
    }

    // Enemies — perseguem o jogador mais próximo; colidem com P1 e P2
    this.enemies.forEach(en => {
      if (!en.alive) return;
      // Atualiza com o jogador mais próximo como alvo
      const target = (this.player2 && Math.hypot(this.player2.x - en.x, this.player2.y - en.y) <
                      Math.hypot(p.x - en.x, p.y - en.y)) ? this.player2 : p;
      en.update(target, dt);
      if (this.physics.overlaps(p.body, en.body)) p.takeDamage();
      if (this.player2 && this.physics.overlaps(this.player2.body, en.body)) this.player2.takeDamage();
    });
    // XP, FX e carga de habilidade por inimigos mortos neste frame
    this.enemies.forEach((en, idx) => {
      if (!en.alive) {
        this.fx?.spawnDeathBurst(en.x, en.y, en.def?.color ?? 0xff4400, 12);
        this.fx?.shake(4, 0.18);
        this.fx?.spawnTextPop(en.x, en.y - 20, `+${en.def?.reward || 5}`, 0x44ff88);
        const prevLvl = SaveSystem.getPlayerLevel();
        const newLvl  = SaveSystem.addXP(15);
        if (newLvl > prevLvl) this._showMsg(`⬆ LEVEL UP! Nível ${newLvl}`, 3000);
        p.addKillCharge?.(20);
        // Sync kill para outros jogadores online
        this.network?.socket?.emit('enemyKilled', { id: en._netId ?? idx });
        this.updateHUD();
      }
    });
    this.enemies = this.enemies.filter(e => e.alive);

    // Enemy projectiles — acertam P1 e P2
    this.enemyProjectiles = this.enemyProjectiles.filter(pr => {
      if (!pr.active) { this.engine.remove(pr.mesh); this.physics.remove(pr.body); return false; }
      pr.mesh.position.set(pr.body.x + 5, -(pr.body.y + 5), 7);
      if (this.physics.overlaps(pr.body, p.body)) { p.takeDamage(); pr.active = false; }
      if (pr.active && this.player2 && this.physics.overlaps(pr.body, this.player2.body)) {
        this.player2.takeDamage(); pr.active = false;
      }
      return pr.active;
    });
  }

  _onExit() {
    if (this._exiting) return;
    this._exiting = true;
    SaveSystem.unlockPhase(this.levelNum + 1);
    const prevLvl = SaveSystem.getPlayerLevel();
    const newLvl  = SaveSystem.addXP(this.levelNum * 20);
    if (newLvl > prevLvl) this._showMsg(`⬆ LEVEL UP! Nível ${newLvl}`, 3000);
    const next = this.currentConfig.nextLevel;
    setTimeout(() => {
      next
        ? this.manager.start('GameScene', { level: next, mode: this._mode, skipRoom: true })
        : this.manager.start('MenuScene');
    }, 700);
  }

  _lighten(c) {
    return ((Math.min(((c>>16)&0xff)+40,255)<<16)|
            (Math.min(((c>>8)&0xff)+40,255)<<8)|
             Math.min((c&0xff)+40,255));
  }

  destroy() {
    this._closePause();
    const btn = document.getElementById('pause-btn');
    if (btn) btn.style.display = 'none';
    window.togglePause = null;
    window.pauseGoShop = null;
    window.pauseExitGame = null;
    this.touchControls?.destroy();
    this.touchControls = null;
    this.fx?.destroy();
    this.player?.destroy();
    this.player2?.destroy();
    this.pets?.destroy();
    this.enemies.forEach(e => e.destroy());
    this.boss?.destroy();
    this._venusPlants?.forEach(vp => vp.destroy());
    this.network?.destroy();
    Object.values(this._remotePlayers).forEach(rp => rp.sprite?.destroy());
    this._remotePlayers = {};
    this.physics.clear();
    ['hud-health','hud-coins','hud-level'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }
}
