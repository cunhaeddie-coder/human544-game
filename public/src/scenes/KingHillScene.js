// ── Rei do Morro — Fique na zona central por mais tempo ───────────
// P1: WASD  P2: IJKL | Primero a acumular 20s na zona vence

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const ZONE_X = 560, ZONE_W = 160, ZONE_Y = 400;
const WIN_TIME = 20;

export class KingHillScene {
  constructor(e, m, i) {
    this.e=e; this.m=m; this.inp=i;
    this.physics = new Physics2D();
    this._players = [];
    this._holdTime = [0,0];
    this._state = 'playing';
    this._t = 0;
    this._zoneMesh = null;
    this._barMeshes = [null,null];
    this._hudSp = null;
    this._numPlayers = 2;
  }

  create(data = {}) {
    this._numPlayers = data.players ?? 2;
    const E = this.e;
    this.physics.setGravity(580);
    this.physics.setWorldBounds(0, 1280, 9999);
    this.e.setWorldBounds(0, 1280);

    E.plane(1280, 720, 0x0a1a0a, 640, 360, -400);
    E.plane(1280, 44, 0x000000, 640, 22, -390);
    E.text('REI DO MORRO', 16, 0xffc400, 640, 22, 5);

    // Plataformas
    const plats = [
      {x:0,y:508,w:20},{x:240,y:420,w:3},{x:530,y:370,w:5},{x:900,y:420,w:3},
      {x:160,y:280,w:3},{x:700,y:280,w:3},{x:440,y:180,w:4},
    ];
    plats.forEach(p => {
      for (let i=0;i<p.w;i++) {
        const gx=p.x+i*64+32;
        E.box(64,20,40,0x224422,gx,p.y+10,0);
        E.box(62,4,42,0x336633,gx,p.y,1);
        const b=new Body(p.x+i*64,p.y,64,20);
        if(p.y<508) b.oneway=true;
        this.physics.addStatic(b);
      }
    });

    // Zona (destaque)
    this._zoneMesh = E.box(ZONE_W, 30, 10, 0x00cc44, ZONE_X + ZONE_W/2, ZONE_Y, -2);
    this._zoneMesh.material.transparent = true;
    this._zoneMesh.material.opacity = 0.45;
    E.text('ZONA', 10, 0x00ff66, ZONE_X + ZONE_W/2, ZONE_Y - 20, 5);

    // Barras de progresso (P1 esquerda, P2 direita)
    E.box(204, 14, 2, 0x1a2a1a, 130, 22, 5);
    E.box(204, 14, 2, 0x1a2a1a, 1150, 22, 5);
    this._barMeshes[0] = E.box(200, 10, 4, 0x4488ff, 130, 22, 6);
    this._barMeshes[1] = E.box(200, 10, 4, 0xff4444, 1150, 22, 6);
    this._barMeshes[0].scale.x = 0;
    this._barMeshes[1].scale.x = 0;
    this._hudSp = E.text('P1: 0s  P2: 0s', 11, 0xffffff, 640, 22, 8);

    this._spawnPlayer(0, 300, 460, SaveSystem.getActiveSkin()||'default', 'P1');
    if (this._numPlayers >= 2) this._spawnPlayer(1, 900, 460, 'warrior', 'P2');

    this._holdTime = [0,0];
    this._state = 'playing';
  }

  _spawnPlayer(idx, x, y, skin, label) {
    const body = new Body(x-14, y-42, 28, 42);
    this.physics.addBody(body);
    const sprite = new CharacterSprite(this.e.scene, x, y, skin, label);
    this._players[idx] = { idx, body, sprite, dir:idx===0?1:-1, _walkT:0 };
  }

  _inZone(p) {
    return p.body.cx >= ZONE_X && p.body.cx <= ZONE_X + ZONE_W && p.body.y >= ZONE_Y - 60;
  }

  _move(p, idx, ml, mr, jk, dt) {
    if (!p) return;
    const b=p.body, inp=this.inp;
    let vx=0;
    if(inp.isDown(ml)){vx=-220;p.dir=-1;}
    if(inp.isDown(mr)){vx= 220;p.dir= 1;}
    b.vx=vx;
    if(inp.justDown(jk)&&b.onGround) b.vy=-450;
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

    // Zone animation
    const flash = Math.sin(this._t*4)>0;
    this._zoneMesh.material.opacity = flash ? 0.55 : 0.35;

    // Hold time
    this._players.forEach((p,i) => {
      if (!p) return;
      if (this._inZone(p)) {
        this._holdTime[i] += dt;
        const pct = Math.min(1, this._holdTime[i]/WIN_TIME);
        this._barMeshes[i].scale.x = pct;
        if (this._holdTime[i] >= WIN_TIME) {
          this._state = 'gameover';
          const name = i===0?'P1':'P2';
          SaveSystem.recordScore('kinghill', Math.round(WIN_TIME * 100));
          this.e.text(`${name} É O REI!\nENTER para voltar`, 24, 0xffc400, 640, 300, 50);
        }
      }
    });

    // Update HUD
    this.e.remove(this._hudSp);
    this._hudSp = this.e.text(
      this._numPlayers>=2
        ? `P1: ${this._holdTime[0].toFixed(1)}s  P2: ${this._holdTime[1].toFixed(1)}s  | Meta: ${WIN_TIME}s`
        : `Tempo: ${this._holdTime[0].toFixed(1)}s / ${WIN_TIME}s`,
      11, 0xffffff, 640, 22, 8
    );

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy() {
    this._players.forEach(p=>p?.sprite?.destroy());
    this.physics.clear();
  }
}
