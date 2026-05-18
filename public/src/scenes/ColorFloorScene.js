// ── Chão Colorido — Pise na cor anunciada antes do tempo acabar ──
// 1-2 jogadores | P1: A/D  P2: J/L | Cada acerto = 1 ponto

import * as THREE from 'three';
import { Physics2D, Body } from '../engine/Physics2D.js';
import { CharacterSprite } from '../CharacterSprite.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const COLORS = [
  { name:'VERMELHO', col:0xff2222 },
  { name:'AZUL',     col:0x2244ff },
  { name:'VERDE',    col:0x22cc44 },
  { name:'AMARELO',  col:0xffdd00 },
  { name:'ROXO',     col:0xaa22ff },
  { name:'LARANJA',  col:0xff8800 },
];
const ROUNDS = 15;
const ROUND_TIME = 3.5;

export class ColorFloorScene {
  constructor(e,m,i){ this.e=e;this.m=m;this.inp=i; this.physics=new Physics2D(); }

  create(data={}) {
    this._numPlayers = data.players ?? 2;
    const E=this.e;
    this.physics.setGravity(600);
    this.physics.setWorldBounds(0,1280,9999);
    this.e.setWorldBounds(0,1280);

    E.plane(1280,720,0x0a0a1a,640,360,-400);
    E.plane(1280,44,0x000000,640,22,-390);
    E.text('CHAO COLORIDO',16,0xffc400,640,22,5);

    // 6 blocos coloridos no chão
    this._blocks=[];
    COLORS.forEach((c,i)=>{
      const bw=190, bx=95+i*210, by=508;
      E.box(bw,24,40,c.col,bx,by+12,0);
      E.text(c.name,8,0xffffff,bx,by-6,5);
      this.physics.addStatic(new Body(bx-bw/2,by,bw,24));
      this._blocks.push({bx,by,bw,col:c.col,name:c.name});
    });

    this._spawnPlayer(0,250,460,SaveSystem.getActiveSkin()||'default','P1');
    if(this._numPlayers>=2) this._spawnPlayer(1,1030,460,'warrior','P2');

    this._scores=[0,0];
    this._round=0;
    this._roundTimer=Math.max(1.4, ROUND_TIME - this._round * 0.1);  // reset inicial
    this._state='playing';
    this._callSp=null;
    this._scoreSp=null;
    this._timerSp=null;
    this._lastSec=-1;

    this._nextRound();
  }

  _spawnPlayer(idx,x,y,skin,label){
    const body=new Body(x-14,y-42,28,42);
    this.physics.addBody(body);
    const sprite=new CharacterSprite(this.e.scene,x,y,skin,label);
    this._players=(this._players||[]);
    this._players[idx]={idx,body,sprite,dir:idx===0?1:-1,_walkT:0};
  }

  _nextRound(){
    this._round++;
    if(this._round>ROUNDS){ this._endGame(); return; }
    // Escolher cor aleatória
    this._target=COLORS[Math.floor(Math.random()*COLORS.length)];
    this._roundTimer=Math.max(1.4, ROUND_TIME - this._round * 0.1);
    this._scored=[false,false];

    if(this._callSp) this.e.remove(this._callSp);
    this._callSp=this.e.text(`PISE NO ${this._target.name}!`,28,this._target.col,640,290,50);
    this._updateHUD();
  }

  _updateHUD(){
    if(this._scoreSp) this.e.remove(this._scoreSp);
    this._scoreSp=this.e.text(
      this._numPlayers>=2?`P1:${this._scores[0]}  P2:${this._scores[1]}  | Rd ${this._round}/${ROUNDS}`
        :`Pontos:${this._scores[0]}  Rd ${this._round}/${ROUNDS}`,
      11,0xffffff,640,22,8
    );
  }

  _playerOnColor(p){
    if(!p||!p.body.onGround) return null;
    const cx=p.body.cx;
    for(const b of this._blocks){
      if(Math.abs(cx-b.bx)<b.bw/2) return b;
    }
    return null;
  }

  _move(p,idx,ml,mr,dt){
    if(!p) return;
    const b=p.body,inp=this.inp;
    let vx=0;
    if(inp.isDown(ml)){vx=-240;p.dir=-1;}
    if(inp.isDown(mr)){vx= 240;p.dir= 1;}
    b.vx=vx;
    if(b.onGround&&Math.abs(b.vx)>10) p._walkT+=dt*8;
    const st=b.onGround?(Math.abs(b.vx)>10?(Math.sin(p._walkT)>0?'walk1':'walk2'):'idle'):'fall';
    p.sprite.animate(b.cx,b.cy,p.dir,p.dir,0,st,'standard');
  }

  _endGame(){
    this._state='gameover';
    if(this._callSp){this.e.remove(this._callSp);this._callSp=null;}
    SaveSystem.recordScore('colorfloor', Math.max(...(this._scores||[0])));
    let msg;
    if(this._numPlayers>=2){
      const w=this._scores[0]>this._scores[1]?'P1':this._scores[1]>this._scores[0]?'P2':'EMPATE';
      msg=`${w==='EMPATE'?'EMPATE!':w+' VENCEU!'}\nP1:${this._scores[0]} P2:${this._scores[1]}\nENTER para voltar`;
    } else {
      msg=`FIM!\nAcertos: ${this._scores[0]}/${ROUNDS}\nENTER para voltar`;
    }
    this.e.text(msg,22,0xffc400,640,310,50);
  }

  update(dt){
    this.physics.step(dt);
    if(this._state==='gameover'){
      if(this.inp.justDown('Enter')||this.inp.justDown('Escape')) this.m.start('LeisureScene');
      return;
    }
    this._move(this._players?.[0],0,'KeyA','KeyD',dt);
    this._move(this._players?.[1],1,'KeyJ','KeyL',dt);

    // Check who is on target color
    (this._players||[]).forEach((p,i)=>{
      if(!p||this._scored[i]) return;
      const block=this._playerOnColor(p);
      if(block&&block.name===this._target.name){
        this._scores[i]++;
        this._scored[i]=true;
        this._updateHUD();
      }
    });

    // Round timer
    this._roundTimer-=dt;
    const sec=Math.ceil(this._roundTimer);
    if(sec!==this._lastSec){
      this._lastSec=sec;
      if(this._timerSp) this.e.remove(this._timerSp);
      this._timerSp=this.e.text(`${Math.max(0,sec)}`,20,sec<=1?0xff2200:0xffffff,1200,22,8);
    }
    if(this._roundTimer<=0) this._nextRound();

    if(this.inp.justDown('Escape')) this.m.start('LeisureScene');
  }

  destroy(){
    (this._players||[]).forEach(p=>p?.sprite?.destroy());
    this.physics.clear();
  }
}
