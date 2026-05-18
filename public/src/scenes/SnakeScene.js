// ── Snake — Clássico com aceleração ──────────────────────────────
// Setas para mover | coma frutas, não bata em si mesmo nem nas paredes

import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem.js';

export class SnakeScene {
  constructor(e, m, i) { this.e=e; this.m=m; this.inp=i; }

  create() {
    const E=this.e, CELL=32, COLS=38, ROWS=20;
    this._CELL=CELL; this._COLS=COLS; this._ROWS=ROWS;
    this._OX=40; this._OY=60; // offset

    E.plane(1280,720,0x050a05,640,360,-400);
    E.plane(1280,44,0x000000,640,22,-390);
    E.text('SNAKE',18,0x00cc44,640,22,5);

    // Grade
    E.box(COLS*CELL+4,ROWS*CELL+4,2,0x224422,this._OX+COLS*CELL/2,this._OY+ROWS*CELL/2,-5);
    E.box(COLS*CELL,ROWS*CELL,4,0x0a0f0a,this._OX+COLS*CELL/2,this._OY+ROWS*CELL/2,-4);

    this._snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    this._dir={x:1,y:0}; this._nextDir={x:1,y:0};
    this._meshes=[];
    this._food=null; this._foodMesh=null;
    this._score=0; this._state='playing';
    this._stepT=0; this._stepInterval=0.11; // começa mais rápido
    this._scoreSp=E.text('0',14,0x00e676,1100,22,8);

    this._buildSnake();
    this._spawnFood();
  }

  _cx(x){ return this._OX + x*this._CELL + this._CELL/2; }
  _cy(y){ return this._OY + y*this._CELL + this._CELL/2; }

  _buildSnake(){
    this._meshes.forEach(m=>this.e.remove(m)); this._meshes=[];
    this._snake.forEach((seg,i)=>{
      const col=i===0?0x00ff44:0x00aa33;
      const m=this.e.box(this._CELL-2,this._CELL-2,10,col,this._cx(seg.x),this._cy(seg.y),5);
      if(i===0){m.material.emissive=new THREE.Color(0x004400);m.material.emissiveIntensity=0.8;}
      this._meshes.push(m);
    });
  }

  _spawnFood(){
    let fx,fy;
    do { fx=Math.floor(Math.random()*this._COLS); fy=Math.floor(Math.random()*this._ROWS); }
    while(this._snake.some(s=>s.x===fx&&s.y===fy));
    this._food={x:fx,y:fy};
    if(this._foodMesh) this.e.remove(this._foodMesh);
    this._foodMesh=this.e.box(this._CELL-4,this._CELL-4,14,0xff4444,this._cx(fx),this._cy(fy),6);
    this._foodMesh.material.emissive=new THREE.Color(0x440000);
    this._foodMesh.material.emissiveIntensity=0.7;
  }

  update(dt){
    if(this._state==='gameover'){
      if(this.inp.justDown('Enter')||this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }
    // Input (sem reverter)
    if(this.inp.justDown('ArrowUp')   &&this._dir.y!==1)  this._nextDir={x:0,y:-1};
    if(this.inp.justDown('ArrowDown') &&this._dir.y!==-1) this._nextDir={x:0,y:1};
    if(this.inp.justDown('ArrowLeft') &&this._dir.x!==1)  this._nextDir={x:-1,y:0};
    if(this.inp.justDown('ArrowRight')&&this._dir.x!==-1) this._nextDir={x:1,y:0};

    this._stepT+=dt;
    if(this._stepT>=this._stepInterval){
      this._stepT=0;
      this._dir=this._nextDir;
      const head=this._snake[0];
      const nx=head.x+this._dir.x, ny=head.y+this._dir.y;
      // Wall
      if(nx<0||nx>=this._COLS||ny<0||ny>=this._ROWS||this._snake.slice(1).some(s=>s.x===nx&&s.y===ny)){
        this._state='gameover';
        SaveSystem.recordScore('snake', this._score);
        this.e.text(`GAME OVER\nPontos: ${this._score}\nENTER para voltar`,22,0xff4444,640,330,50);
        return;
      }
      const ate=this._food&&nx===this._food.x&&ny===this._food.y;
      this._snake.unshift({x:nx,y:ny});
      if(!ate) this._snake.pop();
      else{
        const bonus = Math.floor(this._snake.length / 5) + 1;
        this._score += 10 * bonus;
        this.e.remove(this._scoreSp);
        this._scoreSp=this.e.text(`${this._score}`,14,0x00e676,1100,22,8);
        this._spawnFood();
        this._stepInterval=Math.max(0.045,this._stepInterval-0.004);
      }
      this._buildSnake();
      if(this._foodMesh){ this._foodMesh.rotation.y+=0.15; }
    }
    if(this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }
  destroy(){}
}
