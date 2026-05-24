import * as THREE from 'three';
import { Body }       from '../engine/Physics2D.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const S = 3;
function px(ctx, col, x, y, w=1, h=1) {
  ctx.fillStyle = col; ctx.fillRect(x*S, y*S, w*S, h*S);
}

function drawRobot() {
  const c = document.createElement('canvas');
  c.width = 52*S; c.height = 80*S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Head
  px(ctx,'#888',10,0,32,20); px(ctx,'#aaa',10,0,32,2); px(ctx,'#555',10,18,32,2);
  px(ctx,'#555',10,0,2,20); px(ctx,'#222',42,0,2,20);
  // Visor eyes
  px(ctx,'#00ccff',14,6,8,8); px(ctx,'#00aacc',18,6,4,4);
  px(ctx,'#ff4400',30,6,8,8); px(ctx,'#cc2200',34,6,4,4);
  px(ctx,'#fff',16,7,3,3); px(ctx,'#fcc',32,7,3,3);
  // Antenna
  px(ctx,'#888',29,0,2,5); px(ctx,'#f00',28,0,4,3);
  // Body
  px(ctx,'#555',6,20,40,32); px(ctx,'#777',6,20,40,3); px(ctx,'#333',6,49,40,3);
  px(ctx,'#333',6,20,3,32); px(ctx,'#333',43,20,3,32);
  // Chest
  px(ctx,'#223',14,25,24,20); px(ctx,'#44f',16,27,8,6); px(ctx,'#0ff',18,29,4,3);
  px(ctx,'#f44',30,27,8,6);
  // Bolts
  ['#aaa'].forEach(c2=>{px(ctx,c2,8,22,3,3);px(ctx,c2,41,22,3,3);px(ctx,c2,8,46,3,3);px(ctx,c2,41,46,3,3);});
  // Arms
  px(ctx,'#666',0,22,6,34); px(ctx,'#888',0,22,6,3); px(ctx,'#333',0,22,3,34);
  px(ctx,'#444',0,52,8,4);
  px(ctx,'#666',46,22,6,34); px(ctx,'#888',46,22,6,3); px(ctx,'#444',49,22,3,34);
  px(ctx,'#555',44,50,10,6); px(ctx,'#f44',50,52,4,2);
  // Legs
  px(ctx,'#666',12,52,12,20); px(ctx,'#444',12,52,3,20); px(ctx,'#555',8,70,16,10);
  px(ctx,'#666',28,52,12,20); px(ctx,'#444',37,52,3,20); px(ctx,'#555',28,70,16,10);
  return c;
}

export class BossRobot {
  constructor(scene, physics) {
    this.scene = scene; this.physics = physics;
    this.alive = true; this.hp = 2500; this.maxHp = 2500;
    this._timer = 0; this._dir = -1; this._enraged = false;
    const cx = scene.currentConfig.worldWidth - 300, cy = 460;
    this.body = new Body(cx-26, cy-40, 52, 80);
    this.body.allowGravity = true;
    physics.addBody(this.body);
    const canvas = drawRobot();
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true }));
    this.sprite.scale.set(72, 110, 1);
    this.sprite.position.set(cx, -cy, 8);
    scene.engine.scene.add(this.sprite);
    this._buildBar();
  }
  get x() { return this.body.x + 26; }
  get y() { return this.body.y + 40; }
  _buildBar() {
    this._bar = document.createElement('div');
    Object.assign(this._bar.style,{position:'fixed',top:'68px',left:'50%',transform:'translateX(-50%)',
      width:'420px',padding:'6px 14px',background:'rgba(0,0,0,0.75)',border:'2px solid #ff4400',
      borderRadius:'8px',fontFamily:'monospace',color:'#fff',fontSize:'13px',textAlign:'center',
      zIndex:'100',pointerEvents:'none'});
    this._bar.innerHTML='<div style="font-weight:900;color:#ff4400;margin-bottom:4px;">⚙ BOSS ROBOT</div>'+
      '<div style="background:#333;border-radius:4px;height:14px;overflow:hidden;">'+
      '<div id="b-hp" style="background:linear-gradient(90deg,#ff4400,#ffcc00);height:100%;width:100%;transition:width 0.3s;"></div></div>';
    document.body.appendChild(this._bar);
  }
  _updBar() { const f=document.getElementById('b-hp'); if(f) f.style.width=Math.max(0,(this.hp/this.maxHp)*100)+'%'; }
  update(player, dt) {
    if (!this.alive) return;
    this._timer += dt;
    const px2 = player?.x??0, py2 = player?.y??0;

    // Enrage at 30% HP
    if (!this._enraged && this.hp < this.maxHp * 0.3) {
      this._enraged = true;
      this.scene._showMsg('⚠ ROBOT ENRAIVECIDO!', 3000);
      this.scene.fx?.flashScreen(0xff0000, 0.5, 0.4);
      this.sprite.material.color.set(0xff4400);
    }

    const spd  = this._enraged ? 200 : this.hp < this.maxHp*0.6 ? 120 : 75;
    const rate = this._enraged ? 0.55 : this.hp < this.maxHp*0.6 ? 1.1 : 2.0;
    this._dir = px2 > this.x ? 1 : -1;
    this.body.vx = this._dir * spd;

    if (this._timer > rate) {
      this._timer = 0;
      const dx=px2-this.x, dy=py2-this.y, d=Math.sqrt(dx*dx+dy*dy)||1;
      if (this._enraged) {
        // Triple + diagonal spread
        for (let s = -1; s <= 1; s++) {
          this.scene.spawnEnemyProjectile(this.x,this.y-10,(dx/d+s*0.35)*340,(dy/d)*340);
        }
      } else if (this.hp < this.maxHp*0.6) {
        this.scene.spawnEnemyProjectile(this.x,this.y-10,(dx/d)*310,(dy/d)*310);
        this.scene.spawnEnemyProjectile(this.x,this.y-10,(dx/d-0.25)*270,(dy/d)*270);
      } else {
        this.scene.spawnEnemyProjectile(this.x,this.y-10,(dx/d)*290,(dy/d)*290);
      }
    }
    this.sprite.position.set(this.x, -this.y, 8);
    this._updBar();
  }
  hit(dmg) {
    if (!this.alive) return;
    this.hp -= dmg; this._updBar();
    if (this.hp <= 0) this._die();
  }
  _die() {
    this.alive = false;
    this.sprite.material?.map?.dispose(); this.sprite.material?.dispose();
    this.scene.engine.scene.remove(this.sprite);
    this.physics.remove(this.body); this._bar?.remove();
    SaveSystem.addMissionProgress('bosses', 1);
    this.scene._activateExit?.();
    this.scene._showMsg('BOSS ROBOT DESTRUIDO! Siga em frente!', 4000);
  }
  destroy() { if (this.alive) this._die(); }
}
