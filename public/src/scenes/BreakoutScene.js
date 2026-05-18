// ── Breakout — Quebre todos os blocos ────────────────────────────
// 1 jogador | A/D move a raquete | 2 níveis

import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem.js';

const W=1280, H=720, PAD_W=140, PAD_H=16, BALL_R=12;
const LEVELS = [
  { rows:4, cols:10, colors:[0xff4444,0xff8800,0xffff00,0x00cc44] },
  { rows:6, cols:12, colors:[0xff2200,0xff6600,0xffcc00,0x00ff88,0x0088ff,0xaa00ff] },
];

export class BreakoutScene {
  constructor(e, m, i) {
    this.e=e; this.m=m; this.inp=i;
    this._pad = { x:W/2, y:H-60, mesh:null };
    this._ball = { x:W/2, y:H-90, vx:260, vy:-350, mesh:null };
    this._bricks = [];
    this._lives = 3;
    this._score = 0;
    this._level = 0;
    this._state = 'playing';
    this._scoreSp = null;
    this._livesSp = null;
    this._t = 0;
  }

  create(data = {}) {
    this._level = data.level ?? 0;
    const lvl = LEVELS[this._level];
    const E = this.e;

    E.plane(W, H, 0x050510, W/2, H/2, -400);
    E.plane(W, 44, 0x000000, W/2, 22, -390);
    E.text('BREAKOUT', 16, 0x4488ff, W/2, 22, 5);

    // Paredes
    E.box(10, H, 20, 0x334455, 5, H/2, 0);
    E.box(10, H, 20, 0x334455, W-5, H/2, 0);
    E.box(W, 10, 20, 0x334455, W/2, 5, 0);

    // Pad
    this._pad.x = W/2;
    this._pad.mesh = E.box(PAD_W, PAD_H, 20, 0x4488ff, W/2, H-60, 5);
    this._pad.mesh.material.emissive = new THREE.Color(0x112244);
    this._pad.mesh.material.emissiveIntensity = 0.5;

    // Ball
    this._ball.x=W/2; this._ball.y=H-90;
    this._ball.vx=260; this._ball.vy=-350;
    this._ball.mesh = E.box(BALL_R*2,BALL_R*2,BALL_R*2,0xffffff,W/2,H-90,6);
    this._ball.mesh.material.emissive = new THREE.Color(0x222222);
    this._ball.mesh.material.emissiveIntensity=0.5;

    // Bricks
    this._bricks = [];
    const brickW = (W-80) / lvl.cols;
    const brickH = 28;
    for (let r=0;r<lvl.rows;r++) {
      for (let c=0;c<lvl.cols;c++) {
        const bx = 40 + c*brickW + brickW/2;
        const by = 80 + r*(brickH+4) + brickH/2;
        const col = lvl.colors[r % lvl.colors.length];
        const mesh = E.box(brickW-4, brickH, 16, col, bx, by, 3);
        mesh.material.emissive = new THREE.Color(col);
        mesh.material.emissiveIntensity = 0.3;
        this._bricks.push({ x:bx, y:by, w:brickW-4, h:brickH, mesh, alive:true, col });
      }
    }

    this._lives=3; this._score=0; this._state='playing';
    this._scoreSp = E.text('Pontos: 0', 13, 0xffffff, 960, 22, 8);
    this._livesSp = E.text('❤❤❤', 14, 0xff4444, 120, 22, 8);
  }

  update(dt) {
    this._t += dt;
    if (this._state === 'gameover') {
      if (this.inp.justDown('Enter')||this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }
    if (this._state === 'win') {
      if (this.inp.justDown('Enter')||this.inp.justDown('Escape')) {
        const nextLvl = (this._level+1) % LEVELS.length;
        this.m.start('BreakoutScene', { level: nextLvl });
      }
      return;
    }

    // Move pad
    const spd = 380;
    if (this.inp.isDown('KeyA')||this.inp.isDown('ArrowLeft')) this._pad.x = Math.max(PAD_W/2+10, this._pad.x - spd*dt);
    if (this.inp.isDown('KeyD')||this.inp.isDown('ArrowRight')) this._pad.x = Math.min(W-PAD_W/2-10, this._pad.x + spd*dt);
    this._pad.mesh.position.set(this._pad.x, -(H-60), 5);

    // Move ball
    this._ball.x += this._ball.vx * dt;
    this._ball.y += this._ball.vy * dt;

    // Wall bounces
    if (this._ball.x < BALL_R+10) { this._ball.x=BALL_R+10; this._ball.vx=Math.abs(this._ball.vx); }
    if (this._ball.x > W-BALL_R-10) { this._ball.x=W-BALL_R-10; this._ball.vx=-Math.abs(this._ball.vx); }
    if (this._ball.y < BALL_R+10) { this._ball.y=BALL_R+10; this._ball.vy=Math.abs(this._ball.vy); }

    // Pad bounce
    const padLeft=this._pad.x-PAD_W/2, padRight=this._pad.x+PAD_W/2;
    const padTop=H-60-PAD_H/2;
    if (this._ball.vy>0 && this._ball.y+BALL_R>padTop && this._ball.y-BALL_R<padTop+PAD_H
        && this._ball.x>padLeft && this._ball.x<padRight) {
      this._ball.vy = -Math.abs(this._ball.vy);
      // Angle based on hit position
      const rel = (this._ball.x - this._pad.x) / (PAD_W/2);
      this._ball.vx = rel * 420;
      // Bola acelera 3% a cada rebatida no pad
      this._ball.vx *= 1.03;
      this._ball.vy *= 1.03;
      const spd2 = Math.sqrt(this._ball.vx**2+this._ball.vy**2);
      const maxSpd = 700;
      if (spd2 > maxSpd) { this._ball.vx*=maxSpd/spd2; this._ball.vy*=maxSpd/spd2; }
    }

    // Bottom = lose life
    if (this._ball.y > H+BALL_R+10) {
      this._lives--;
      this.e.remove(this._livesSp);
      this._livesSp = this.e.text('❤'.repeat(Math.max(0,this._lives)), 14, 0xff4444, 120, 22, 8);
      if (this._lives <= 0) {
        this._state = 'gameover';
        SaveSystem.recordScore('breakout', this._score);
        this.e.text(`GAME OVER\nPontos: ${this._score}\nENTER para voltar`, 22, 0xff4444, W/2, H/2, 50);
        return;
      }
      this._ball.x=this._pad.x; this._ball.y=H-90;
      this._ball.vx=260*(Math.random()>0.5?1:-1); this._ball.vy=-350;
    }

    // Brick collisions
    let broken = 0;
    this._bricks.forEach(b => {
      if (!b.alive) { broken++; return; }
      const dx=Math.abs(this._ball.x-b.x), dy=Math.abs(this._ball.y-b.y);
      if (dx < b.w/2+BALL_R && dy < b.h/2+BALL_R) {
        b.alive=false; this.e.remove(b.mesh);
        this._score += 10;
        this.e.remove(this._scoreSp);
        this._scoreSp = this.e.text(`Pontos: ${this._score}`, 13, 0xffffff, 960, 22, 8);
        if (dx/b.w*2 > dy/b.h*2) this._ball.vx *= -1;
        else this._ball.vy *= -1;
      }
    });

    if (broken === this._bricks.length) {
      this._state = 'win';
      SaveSystem.recordScore('breakout', this._score + this._lives * 50);
      this.e.text(`NIVEL COMPLETO!\nPontos: ${this._score}\nENTER=Proximo Nivel`, 22, 0x00e676, W/2, H/2, 50);
    }

    this._ball.mesh.position.set(this._ball.x, -this._ball.y, 6);
    this._ball.mesh.rotation.x += dt*4;
    this._ball.mesh.rotation.z += dt*3;

    if (this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy() {}
}
