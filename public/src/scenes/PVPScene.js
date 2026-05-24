// ── PVP — Batalha 1v1 local ou online ───────────────────────────────
// Local — P1: A/D W F  | P2: J/L I H
// Online — cada jogador controla P1 na sua máquina; posições são sincronizadas
// 3 rounds — 5 corações cada — melhor de 3

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { getNetwork } from '../Network.js';
import { CharacterSprite } from '../CharacterSprite.js';

export class PVPScene {
  constructor(e, m, i) {
    this.e = e; this.m = m; this.inp = i;
    this.physics     = new Physics2D();
    this._round      = 1;
    this._wins       = [0, 0];
    this._roundOver  = true;
    this._shotCd     = [0, 0];
    this._bullets    = [];
    this._p1 = null; this._p2 = null;
    this._heartMeshes = [[], []];
    this._roundLbl   = null;
    this._bannerObjs = [];
    this._t          = 0;
    // Online
    this._online     = false;
    this._isHost     = false;
    this._net        = null;
    this._sendTimer  = 0;
  }

  create(data = {}) {
    this._online = data.mode === 'online';
    if (this._online) { this._initOnline(); return; }
    const E = this.e, W = 1280, H = 720;
    this.physics.setGravity(600);
    this.physics.setWorldBounds(0, W, 9999);
    this.e.setWorldBounds(0, W);

    // Background
    E.plane(W, H, 0x0a0a1a, W/2, H/2, -400);
    E.plane(W, 44, 0x111133, W/2, 22, -390);

    // Controls hint
    E.text('P1: A/D W F', 9, 0x4466cc, 160, 22, 5);
    E.text('P2: J/L I H', 9, 0xcc4444, W - 160, 22, 5);

    // Arena platforms
    const layout = [
      { x:0,   y:508, w:20, oneway:false },
      { x:200, y:380, w:5,  oneway:true  },
      { x:480, y:300, w:4,  oneway:true  },
      { x:680, y:380, w:5,  oneway:true  },
    ];
    layout.forEach(p => {
      for (let i = 0; i < p.w; i++) {
        const gx = p.x + i*64 + 32;
        E.box(64, 20, 40, 0x223355, gx, p.y + 10, 0);
        E.box(62,  4, 42, 0x3355aa, gx, p.y, 1);
        const b = new Body(p.x + i*64, p.y, 64, 20);
        if (p.oneway) b.oneway = true;
        this.physics.addStatic(b);
      }
    });

    // Players
    this._p1 = this._makePlayer(200, 400, 0x4488ff, 'P1', 0);
    this._p2 = this._makePlayer(1060, 400, 0xff4444, 'P2', 1);

    // Hearts HUD
    this._buildHearts();

    // Round label
    this._roundLbl = E.text('ROUND 1 / 3', 14, 0xffffff, W/2, 22, 8);

    this._showBanner('ROUND 1 — LUTA!', 1800, () => { this._roundOver = false; });
  }

  // ── Online PVP ────────────────────────────────────────────────
  _initOnline() {
    const E = this.e;
    E.plane(1280, 720, 0x020408, 640, 360, -500);
    E.text('PVP ONLINE', 24, 0x4488ff, 640, 200, 10);
    E.text('Conectando...', 14, 0x446688, 640, 280, 10);
    getNetwork().then(net => {
      if (!net) {
        E.text('Servidor offline!', 16, 0xff4444, 640, 320, 10);
        setTimeout(() => this.m.start('ModeScene'), 2500);
        return;
      }
      this._net    = net;
      this._isHost = net.isHost?.() ?? true;
      this._buildArenaOnline();
      net.socket?.on('pvpState',  d => this._applyRemoteState(d));
      net.socket?.on('pvpBullet', d => this._spawnRemoteBullet(d));
    });
  }

  _buildArenaOnline() {
    const E = this.e, W = 1280, H = 720;
    this.physics.setGravity(600);
    this.physics.setWorldBounds(0, W, 9999);
    this.e.setWorldBounds(0, W);
    E.plane(W, H, 0x0a0a1a, W/2, H/2, -400);
    E.plane(W, 44, 0x111133, W/2, 22, -390);
    E.text('PVP ONLINE — Você: A/D W F', 9, 0x4466cc, 260, 22, 5);
    const layout = [
      { x:0, y:508, w:20, oneway:false }, { x:200, y:380, w:5, oneway:true },
      { x:480, y:300, w:4, oneway:true }, { x:680, y:380, w:5, oneway:true },
    ];
    layout.forEach(p => {
      for (let i = 0; i < p.w; i++) {
        const gx = p.x + i*64 + 32;
        E.box(64, 20, 40, 0x223355, gx, p.y+10, 0);
        E.box(62,  4, 42, 0x3355aa, gx, p.y, 1);
        const b = new Body(p.x + i*64, p.y, 64, 20);
        if (p.oneway) b.oneway = true;
        this.physics.addStatic(b);
      }
    });
    this._p1 = this._makePlayer(this._isHost ? 200 : 1060, 400, 0x4488ff, 'Você', 0);
    this._p2 = this._makePlayer(this._isHost ? 1060 : 200, 400, 0xff4444, 'Adv', 1);
    this._buildHearts();
    this._roundLbl = E.text('ROUND 1 / 3', 14, 0xffffff, W/2, 22, 8);
    this._showBanner('PVP ONLINE — LUTA!', 2000, () => { this._roundOver = false; });
  }

  _applyRemoteState(d) {
    if (!this._p2) return;
    this._p2.body.x = d.x - 14;
    this._p2.body.y = d.y - 21;
    this._p2.body.vx = d.vx || 0;
    this._p2.body.vy = d.vy || 0;
    if (d.hp !== undefined && d.hp !== this._p2.hp) {
      this._p2.hp = d.hp;
      this._refreshHearts(1);
      if (d.hp <= 0 && !this._roundOver) this._endRound(1);
    }
  }

  _spawnRemoteBullet(d) {
    const body = new Body(d.x - 5, d.y - 5, 10, 10);
    body.vx = d.vx; body.vy = 0; body.allowGravity = false;
    this.physics.addBody(body);
    const mesh = this.e.box(10, 10, 6, 0xff4444, d.x, d.y, 7);
    mesh.material.emissive = new THREE.Color(0xff4444);
    mesh.material.emissiveIntensity = 0.6;
    this._bullets.push({ body, mesh, owner: 1, active: true });
    setTimeout(() => { const bl = this._bullets.find(b => b.body === body); if (bl) bl.active = false; }, 2000);
  }

  _sendOnlineState() {
    if (!this._net?.socket || !this._p1 || this._roundOver) return;
    this._net.socket.volatile?.emit('pvpState', {
      x: this._p1.body.cx, y: this._p1.body.cy,
      vx: this._p1.body.vx, vy: this._p1.body.vy,
      hp: this._p1.hp,
    });
  }

  _fireOnline(p) {
    if (!this._net?.socket) return;
    this._net.socket.emit('pvpBullet', {
      x: p.body.cx + p.dir * 20,
      y: p.body.cy,
      vx: p.dir * 680,
    });
  }

  _makePlayer(x, y, color, label, idx) {
    const body = new Body(x - 14, y - 42, 28, 42);
    this.physics.addBody(body);
    const skinName = idx === 0 ? 'warrior' : 'rogue';
    const sprite = new CharacterSprite(this.e.scene, x, y - 21, skinName, label);
    return { body, sprite, hp: 5, maxHp: 5, color, invTimer: 0, dir: idx === 0 ? 1 : -1, idx };
  }

  _buildHearts() {
    const E = this.e;
    this._heartMeshes = [[], []];
    for (let i = 0; i < 5; i++) {
      const h1 = E.box(12, 12, 4, 0xff4444, 30 + i*20, 22, 8);
      h1.material.emissive = new THREE.Color(0x440000);
      h1.material.emissiveIntensity = 0.6;
      this._heartMeshes[0].push(h1);

      const h2 = E.box(12, 12, 4, 0xff4444, 1250 - i*20, 22, 8);
      h2.material.emissive = new THREE.Color(0x440000);
      h2.material.emissiveIntensity = 0.6;
      this._heartMeshes[1].push(h2);
    }
  }

  _refreshHearts(pidx) {
    const p = pidx === 0 ? this._p1 : this._p2;
    this._heartMeshes[pidx].forEach((h, i) => {
      h.material.color.set(i < p.hp ? 0xff4444 : 0x222233);
      h.material.emissive = new THREE.Color(i < p.hp ? 0x440000 : 0x000000);
    });
  }

  _fireBullet(p, cdIdx) {
    const now = Date.now();
    if (now - this._shotCd[cdIdx] < 400) return;
    this._shotCd[cdIdx] = now;
    const bx = p.body.cx + p.dir * 20;
    const by = p.body.cy;
    const body = new Body(bx - 5, by - 5, 10, 10);
    body.vx = p.dir * 680; body.vy = 0; body.allowGravity = false;
    this.physics.addBody(body);
    const mesh = this.e.box(10, 10, 6, p.color, bx, by, 7);
    mesh.material.emissive = new THREE.Color(p.color);
    mesh.material.emissiveIntensity = 0.6;
    this._bullets.push({ body, mesh, owner: cdIdx, active: true });
    setTimeout(() => {
      const bl = this._bullets.find(b => b.body === body);
      if (bl) bl.active = false;
    }, 2000);
    // Online: notifica o adversário
    if (this._online && cdIdx === 0) this._fireOnline(p);
  }

  _showBanner(text, dur, cb) {
    this._bannerObjs.forEach(o => this.e.remove(o));
    this._bannerObjs = [];
    const bg = this.e.box(700, 80, 20, 0x000000, 640, 360, 30);
    bg.material.transparent = true; bg.material.opacity = 0.82;
    const lbl = this.e.text(text, 22, 0xffffff, 640, 360, 35);
    this._bannerObjs.push(bg, lbl);
    setTimeout(() => {
      this._bannerObjs.forEach(o => this.e.remove(o));
      this._bannerObjs = [];
      cb?.();
    }, dur);
  }

  _endRound(loserIdx) {
    if (this._roundOver) return;
    this._roundOver = true;
    const winnerIdx = 1 - loserIdx;
    this._wins[winnerIdx]++;

    if (this._wins[0] >= 2 || this._wins[1] >= 2) {
      const name = this._wins[0] >= 2 ? 'JOGADOR 1' : 'JOGADOR 2';
      this._showBanner(`${name} VENCE!`, 3000, () => this.m.start('ModeScene'));
    } else {
      const score = `P1 ${this._wins[0]}  ×  ${this._wins[1]} P2`;
      this._showBanner(`P${winnerIdx+1} VENCEU!\n${score}`, 2200, () => {
        this._round++;
        this._resetRound();
        setTimeout(() => {
          this._showBanner(`ROUND ${this._round} — LUTA!`, 1800, () => { this._roundOver = false; });
        }, 80);
      });
    }
  }

  _resetRound() {
    [this._p1, this._p2].forEach((p, i) => {
      p.body.x = i === 0 ? 186 : 1046;
      p.body.y = 380;
      p.body.vx = 0; p.body.vy = 0;
      p.hp = 5; p.invTimer = 0;
      this._refreshHearts(i);
    });
    this._bullets.forEach(bl => { this.e.remove(bl.mesh); this.physics.remove(bl.body); });
    this._bullets = [];
    this.e.remove(this._roundLbl);
    this._roundLbl = this.e.text(`ROUND ${this._round} / 3`, 14, 0xffffff, 640, 22, 8);
  }

  _movePlayer(p, moveL, moveR, jumpKey, shootKey, cdIdx) {
    const b = p.body, inp = this.inp;
    let vx = 0;
    if (inp.isDown(moveL)) { vx = -220; p.dir = -1; }
    if (inp.isDown(moveR)) { vx =  220; p.dir =  1; }
    b.vx = vx;
    if (inp.justDown(jumpKey) && b.onGround) b.vy = -400;
    if (inp.justDown(shootKey)) this._fireBullet(p, cdIdx);
  }

  update(dt) {
    this._t += dt;
    this.physics.step(dt);

    if (!this._roundOver) {
      this._movePlayer(this._p1, 'KeyA', 'KeyD', 'KeyW', 'KeyF', 0);
      if (!this._online) {
        this._movePlayer(this._p2, 'KeyJ', 'KeyL', 'KeyI', 'KeyH', 1);
      } else {
        // Online: envia estado local a cada 33ms (~30fps)
        this._sendTimer -= dt;
        if (this._sendTimer <= 0) { this._sendTimer = 0.033; this._sendOnlineState(); }
      }
    }

    [this._p1, this._p2].forEach((p, idx) => {
      const cx = p.body.cx, cy = p.body.cy;
      const walkFrame = Math.floor(this._t * 7) % 2 === 0 ? 'walk1' : 'walk2';
      const animState = !p.body.onGround
        ? (p.body.vy < 0 ? 'jump' : 'fall')
        : (Math.abs(p.body.vx) > 10 ? walkFrame : 'idle');
      p.sprite.animate(cx, cy, p.dir, p.dir, 0, animState, 'default');

      if (p.invTimer > 0) {
        p.invTimer -= dt;
        const vis = Math.sin(this._t * 28) > 0;
        p.sprite.body.material.transparent = true;
        p.sprite.body.material.opacity = vis ? 1 : 0.2;
      } else {
        p.sprite.body.material.opacity = 1;
      }

      if (p.body.y > 600 && !this._roundOver) this._endRound(idx);
    });

    // Bullets
    this._bullets = this._bullets.filter(bl => {
      if (!bl.active) {
        this.e.remove(bl.mesh); this.physics.remove(bl.body);
        return false;
      }
      const victim   = bl.owner === 0 ? this._p2 : this._p1;
      const victimIdx = 1 - bl.owner;
      bl.mesh.position.set(bl.body.cx, -bl.body.cy, 7);

      if (victim.invTimer <= 0 && this.physics.overlaps(bl.body, victim.body)) {
        victim.hp = Math.max(0, victim.hp - 1);
        victim.invTimer = 1.6;
        this._refreshHearts(victimIdx);
        if (victim.hp <= 0 && !this._roundOver) this._endRound(victimIdx);
        bl.active = false;
        this.e.remove(bl.mesh); this.physics.remove(bl.body);
        return false;
      }

      if (bl.body.x < -60 || bl.body.x > 1340) {
        bl.active = false; this.e.remove(bl.mesh); this.physics.remove(bl.body);
        return false;
      }
      return true;
    });

    if (this.inp.justDown('Escape')) this.m.start('ModeScene');
  }

  destroy() {
    this._bullets.forEach(bl => { this.physics.remove(bl.body); });
    this._p1?.sprite?.destroy();
    this._p2?.sprite?.destroy();
    this.physics.clear();
  }
}
