// ── Bomba — Passe a bomba antes que expluda ────────────────────────
// Quem segurar a bomba quando ela explodir perde 1 vida (5 vidas)
// P1: A/D/W  P2: J/L/I | Toca no outro jogador para passar a bomba

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class BombScene {
  constructor(e, m, i) {
    this.e=e; this.m=m; this.inp=i;
    this.physics = new Physics2D();
    this._players = [];
    this._bombHolder = 0; // índice do player com a bomba
    this._bombTimer  = 3;
    this._bombTimerMax = 3;
    this._bombMesh   = null;
    this._hp = [5,5];
    this._heartMeshes = [[],[]];
    this._t = 0;
    this._state = 'playing';
    this._numPlayers = 2;
  }

  create(data = {}) {
    this._numPlayers = data.players ?? 2;
    const E = this.e;
    this.physics.setGravity(580);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    E.plane(1280, 720, 0x1a0a0a, 640, 360, -400);
    E.plane(1280, 44,  0x000000, 640, 22,  -390);
    E.text('BOMBA!', 20, 0xff4400, 640, 22, 5);

    // Plataformas
    [{x:0,y:508,w:20},{x:200,y:380,w:5},{x:700,y:380,w:5},{x:440,y:260,w:4}].forEach(p => {
      for (let i=0;i<p.w;i++) {
        const gx=p.x+i*64+32;
        E.box(64,20,40,0x332222,gx,p.y+10,0);
        E.box(62,4,42,0x663333,gx,p.y,1);
        const b=new Body(p.x+i*64,p.y,64,20);
        if(p.y<508) b.oneway=true;
        this.physics.addStatic(b);
      }
    });

    // Corações
    for (let i=0;i<5;i++) {
      const h1 = E.box(12,12,4,0xff4444,30+i*18,22,8);
      h1.material.emissive=new THREE.Color(0x440000); h1.material.emissiveIntensity=0.6;
      this._heartMeshes[0].push(h1);
      const h2 = E.box(12,12,4,0xff4444,1250-i*18,22,8);
      h2.material.emissive=new THREE.Color(0x440000); h2.material.emissiveIntensity=0.6;
      this._heartMeshes[1].push(h2);
    }

    // Players
    this._spawnPlayer(0, 400, 460, SaveSystem.getActiveSkin()||'default', 'P1');
    this._spawnPlayer(1, 880, 460, 'warrior', 'P2');

    // Bomba
    this._bombHolder = 0;
    this._bombTimer  = 4;
    this._bombMesh   = E.box(20, 20, 20, 0x111111, 0, 0, 9);
    this._bombMesh.material.emissive = new THREE.Color(0xff4400);
    this._bombMesh.material.emissiveIntensity = 0.8;

    this._hp = [5,5]; this._state = 'playing';
  }

  _spawnPlayer(idx, x, y, skin, label) {
    const body = new Body(x-14,y-42,28,42);
    this.physics.addBody(body);
    const sprite = new CharacterSprite(this.e.scene, x, y, skin, label);
    this._players[idx] = { idx, body, sprite, dir:idx===0?1:-1, _walkT:0 };
  }

  _refreshHearts(idx) {
    this._heartMeshes[idx].forEach((h,i) => {
      h.material.color.set(i < this._hp[idx] ? 0xff4444 : 0x222222);
      h.material.emissive = new THREE.Color(i < this._hp[idx] ? 0x440000 : 0x000000);
    });
  }

  _move(p, idx, ml, mr, jk, dt) {
    if (!p) return;
    const b=p.body, inp=this.inp;
    let vx=0;
    if(inp.isDown(ml)){vx=-220;p.dir=-1;}
    if(inp.isDown(mr)){vx= 220;p.dir= 1;}
    b.vx=vx;
    if(inp.justDown(jk)&&b.onGround) b.vy=-440;
    if(b.onGround&&Math.abs(b.vx)>10) p._walkT+=dt*8;
    const st=b.onGround?(Math.abs(b.vx)>10?(Math.sin(p._walkT)>0?'walk1':'walk2'):'idle'):(b.vy<0?'jump':'fall');
    p.sprite.animate(b.cx,b.cy,p.dir,p.dir,0,st,'standard');
  }

  update(dt) {
    this._t += dt;
    this.physics.step(dt);

    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter')||this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }

    this._move(this._players[0],0,'KeyA','KeyD','KeyW',dt);
    this._move(this._players[1],1,'KeyJ','KeyL','KeyI',dt);

    // Transferir bomba ao tocar
    const p0 = this._players[0], p1 = this._players[1];
    if (p0&&p1 && this.physics.overlaps(p0.body, p1.body)) {
      if (this._bombHolder === 0) this._bombHolder = 1;
      else this._bombHolder = 0;
    }

    // Posicionar bomba no holder
    const holder = this._players[this._bombHolder];
    if (holder) {
      this._bombMesh.position.set(holder.body.cx, -(holder.body.cy - 55), 9);
      // Flash quando perto de explodir
      const flash = this._bombTimer < 1.5 && Math.sin(this._t * 20) > 0;
      this._bombMesh.material.emissiveIntensity = flash ? 1.5 : 0.8;
      this._bombMesh.scale.setScalar(flash ? 1.3 : 1);
    }

    // Timer da bomba
    this._bombTimer -= dt;
    if (this._bombTimer <= 0) {
      // Explodir!
      this._hp[this._bombHolder] = Math.max(0, this._hp[this._bombHolder] - 1);
      this._refreshHearts(this._bombHolder);

      if (this._hp[this._bombHolder] <= 0) {
        this._state = 'gameover';
        const winner = this._bombHolder===0?'P2':'P1';
        const winnerIdx = this._bombHolder===0 ? 1 : 0;
        SaveSystem.recordScore('bomb', this._hp[winnerIdx] * 100 + Math.floor(this._t * 10));
        this.e.text(`${winner} VENCEU!\nENTER para voltar`, 24, 0xffc400, 640, 300, 50);
        return;
      }

      // Reset bomba
      this._bombHolder = 1 - this._bombHolder; // passa pro outro
      this._bombTimerMax = Math.max(1.0, this._bombTimerMax - 0.4);
      this._bombTimer = this._bombTimerMax;
    }

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy() {
    this._players.forEach(p=>p?.sprite?.destroy());
    this.physics.clear();
  }
}
