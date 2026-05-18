import * as THREE from 'three';
import { Body }       from '../engine/Physics2D.js';
import { SaveSystem } from '../systems/SaveSystem.js';

const S = 3;
function px(ctx, col, x, y, w=1, h=1) {
  ctx.fillStyle = col; ctx.fillRect(x*S, y*S, w*S, h*S);
}

function drawDragon() {
  const c = document.createElement('canvas');
  c.width = 100*S; c.height = 60*S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Body
  px(ctx,'#882200',20,15,60,30); px(ctx,'#aa3300',20,15,60,5); px(ctx,'#661100',20,40,60,5);
  px(ctx,'#551100',20,15,5,30); px(ctx,'#551100',75,15,5,30);
  // Belly
  px(ctx,'#cc6633',30,22,40,16); px(ctx,'#dd7744',32,24,36,12);
  // Head
  px(ctx,'#993300',60,8,30,22); px(ctx,'#bb4400',60,8,30,4); px(ctx,'#661100',60,26,30,4);
  // Snout
  px(ctx,'#884422',82,12,16,12); px(ctx,'#aa5533',84,14,12,8);
  // Nostrils
  px(ctx,'#441100',86,14,3,3); px(ctx,'#441100',92,14,3,3);
  // Eyes
  px(ctx,'#ffff00',64,10,8,8); px(ctx,'#ffaa00',66,11,5,5);
  px(ctx,'#000000',67,12,3,3); px(ctx,'#fff',70,12,2,2);
  // Horns
  px(ctx,'#663300',62,0,4,10); px(ctx,'#884400',64,0,2,8);
  px(ctx,'#663300',72,2,4,8);
  // Wings
  px(ctx,'#660011',0,5,25,35); px(ctx,'#880022',0,5,25,3); px(ctx,'#440000',0,37,25,3);
  px(ctx,'#222',5,8,15,24);  // wing membrane veins
  px(ctx,'#660011',75,5,25,35); px(ctx,'#880022',75,5,25,3);
  // Tail
  px(ctx,'#882200',10,38,20,10); px(ctx,'#661100',5,44,12,8); px(ctx,'#882200',0,48,8,5);
  // Fire breath indicator
  px(ctx,'#ff8800',90,18,10,6); px(ctx,'#ffff00',95,19,5,4); px(ctx,'#ffffff',98,20,2,2);
  return c;
}

function drawGhost() {
  const c = document.createElement('canvas');
  c.width = 24*S; c.height = 24*S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  px(ctx,'#661133',4,4,16,10); px(ctx,'#881144',4,4,16,3);
  px(ctx,'#661133',2,10,20,8); px(ctx,'#440022',2,18,20,4);
  px(ctx,'#440022',2,14,4,8); px(ctx,'#440022',10,14,4,8); px(ctx,'#440022',18,14,4,8);
  px(ctx,'#ffaaaa',7,7,4,3); px(ctx,'#fff',8,7,2,2);
  px(ctx,'#ffaaaa',13,7,4,3); px(ctx,'#fff',14,7,2,2);
  px(ctx,'#ff0044',9,11,6,2);
  return c;
}

export class BossDragon {
  constructor(scene, physics) {
    this.scene = scene; this.physics = physics;
    this.alive = true; this.hp = 3000; this.maxHp = 3000;
    this._timer = 0; this._dir = -1; this._sineT = 0;
    this.ghosts = [];
    const cx = scene.currentConfig.worldWidth - 350, cy = 300;
    this.body = new Body(cx-50, cy-30, 100, 60);
    this.body.allowGravity = false;
    physics.addBody(this.body);
    const tex = new THREE.CanvasTexture(drawDragon());
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true }));
    this.sprite.scale.set(140, 84, 1);
    this.sprite.position.set(cx, -cy, 8);
    scene.engine.scene.add(this.sprite);
    this._ghostTex = new THREE.CanvasTexture(drawGhost());
    this._ghostTex.magFilter = this._ghostTex.minFilter = THREE.NearestFilter;
    this._buildBar();
  }
  get x() { return this.body.x + 50; }
  get y() { return this.body.y + 30; }
  _buildBar() {
    this._bar = document.createElement('div');
    Object.assign(this._bar.style,{position:'fixed',top:'68px',left:'50%',transform:'translateX(-50%)',
      width:'420px',padding:'6px 14px',background:'rgba(0,0,0,0.75)',border:'2px solid #cc0044',
      borderRadius:'8px',fontFamily:'monospace',color:'#fff',fontSize:'13px',textAlign:'center',
      zIndex:'100',pointerEvents:'none'});
    this._bar.innerHTML='<div style="font-weight:900;color:#ff4466;margin-bottom:4px;">BOSS DRAGAO</div>'+
      '<div style="background:#333;border-radius:4px;height:14px;overflow:hidden;">'+
      '<div id="d-hp" style="background:linear-gradient(90deg,#cc0044,#ff6600);height:100%;width:100%;transition:width 0.3s;"></div></div>';
    document.body.appendChild(this._bar);
  }
  _updBar() { const f=document.getElementById('d-hp'); if(f) f.style.width=Math.max(0,(this.hp/this.maxHp)*100)+'%'; }
  update(player, dt) {
    if (!this.alive) return;
    this._timer += dt; this._sineT += dt;
    const px2=player?.x??0, py2=player?.y??0;
    const spd = this.hp < this.maxHp*0.5 ? 130 : 80;
    this.body.vx = this._dir * spd;
    this.body.vy = Math.sin(this._sineT*1.8) * 60;
    const cx2 = this.scene.currentConfig.worldWidth - 350;
    if (Math.abs(this.x - cx2) > 260) this._dir *= -1;
    this.body.y = Math.max(80, Math.min(this.body.y, 340));
    const rate = this.hp < this.maxHp*0.5 ? 1.0 : 1.8;
    if (this._timer > rate) {
      this._timer = 0;
      const dx=px2-this.x, dy=py2-this.y, d=Math.sqrt(dx*dx+dy*dy)||1;
      this.scene.spawnEnemyProjectile(this.x+40*this._dir, this.y, (dx/d)*260, (dy/d)*260);
      if (this.hp < this.maxHp*0.5) this._spawnGhost(px2, py2);
    }
    this.sprite.position.set(this.x, -this.y, 8);
    this.sprite.scale.x = this._dir >= 0 ? 140 : -140;
    this._updBar();
    // Update ghosts
    this.ghosts = this.ghosts.filter(g => {
      if (!g.alive) { this._removeGhost(g); return false; }
      const gdx=px2-g.x, gdy=py2-g.y, gd=Math.sqrt(gdx*gdx+gdy*gdy)||1;
      g.body.vx = (gdx/gd)*140; g.body.vy = (gdy/gd)*140;
      g.sprite.position.set(g.x, -g.y, 7);
      g._t = (g._t||0)+dt;
      g.sprite.material.opacity = 0.6 + Math.sin(g._t*5)*0.4;
      return true;
    });
  }
  _spawnGhost(tx, ty) {
    if (this.ghosts.length >= 4) return;
    const gx=this.x+(Math.random()-0.5)*120, gy=this.y+(Math.random()-0.5)*80;
    const body = new Body(gx-12, gy-12, 24, 24);
    body.allowGravity = false;
    this.physics.addBody(body);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:this._ghostTex, transparent:true }));
    sp.scale.set(36, 36, 1);
    sp.position.set(gx, -gy, 7);
    this.scene.engine.scene.add(sp);
    const g = { body, sprite:sp, alive:true, hp:80, _t:0 };
    g.x = gx; g.y = gy;
    Object.defineProperty(g,'x',{get:()=>g.body.x+12,set:v=>{g.body.x=v-12;}});
    Object.defineProperty(g,'y',{get:()=>g.body.y+12,set:v=>{g.body.y=v-12;}});
    this.ghosts.push(g);
  }
  _removeGhost(g) {
    g.sprite.material?.dispose(); this.scene.engine.scene.remove(g.sprite);
    this.physics.remove(g.body);
  }
  hitGhost(g, dmg) { g.hp -= dmg; if(g.hp<=0) g.alive=false; }
  hit(dmg) {
    if (!this.alive) return;
    this.hp -= dmg; this._updBar();
    if (this.hp <= 0) this._die();
  }
  _die() {
    this.alive = false;
    this.ghosts.forEach(g => { g.alive=false; this._removeGhost(g); });
    this.sprite.material?.map?.dispose(); this.sprite.material?.dispose();
    this.scene.engine.scene.remove(this.sprite);
    this._ghostTex?.dispose(); this.physics.remove(this.body); this._bar?.remove();
    SaveSystem.addMissionProgress('bosses', 1);
    this.scene._activateExit?.();
    this.scene._showMsg('DRAGAO DERROTADO! Voce venceu!', 5000);
  }
  destroy() { if (this.alive) this._die(); }
}
