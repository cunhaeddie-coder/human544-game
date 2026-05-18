// Sistema de Pets — até 3 pets ativos, cada um ataca inimigos próximos
import * as THREE from 'three';
import { SaveSystem } from './systems/SaveSystem.js';

const PET_DEFS = {
  bird:    { color:0x44ccff, size:14, speed:180, dmg:20,  range:140, atkRate:1.2, emissive:0x113344 },
  fox:     { color:0xff8822, size:16, speed:160, dmg:35,  range:120, atkRate:1.8, emissive:0x441100 },
  dragon:  { color:0xcc2200, size:20, speed:140, dmg:70,  range:200, atkRate:2.5, emissive:0x440000 },
  bunny:   { color:0xf0f0f0, size:14, speed:220, dmg:8,   range:90,  atkRate:0.8, emissive:0x222222 },
  wolf:    { color:0x888888, size:18, speed:170, dmg:45,  range:150, atkRate:2.0, emissive:0x222222 },
  phoenix: { color:0xff6600, size:22, speed:150, dmg:90,  range:220, atkRate:3.0, emissive:0x441100 },
  turtle:  { color:0x336622, size:16, speed:100, dmg:15,  range:80,  atkRate:1.0, emissive:0x112200 },
  unicorn: { color:0xffd6f0, size:18, speed:165, dmg:30,  range:160, atkRate:1.5, emissive:0x441133 },
};

// ── Funções de desenho pixel art por pet ─────────────────────────

function _px(ctx, col, x, y, w, h, S) {
  ctx.fillStyle = col;
  ctx.fillRect(x*S, y*S, w*S, h*S);
}

function drawBirdPet(ctx, S) {
  // Corpo azul
  _px(ctx,'#44ccff',2,3,8,5,S);
  _px(ctx,'#22aadd',2,7,8,1,S);
  // Asa esquerda
  _px(ctx,'#88ddff',0,3,3,4,S);
  _px(ctx,'#44ccff',0,6,2,2,S);
  // Asa direita
  _px(ctx,'#88ddff',9,3,3,4,S);
  // Cabeça
  _px(ctx,'#44ccff',4,1,4,3,S);
  // Olho
  _px(ctx,'#ffffff',6,2,2,2,S);
  _px(ctx,'#000000',7,2,1,1,S);
  // Bico
  _px(ctx,'#ffcc00',8,3,2,1,S);
  // Cauda
  _px(ctx,'#1199cc',1,7,2,3,S);
  _px(ctx,'#1199cc',3,8,1,2,S);
}

function drawFoxPet(ctx, S) {
  // Corpo laranja
  _px(ctx,'#ff8822',2,3,9,5,S);
  _px(ctx,'#cc6611',2,7,9,1,S);
  // Barriga branca
  _px(ctx,'#ffeecc',4,5,5,3,S);
  // Cabeça
  _px(ctx,'#ff8822',3,1,6,3,S);
  // Orelhas pontudas
  _px(ctx,'#ff8822',2,0,2,2,S);
  _px(ctx,'#ff8822',8,0,2,2,S);
  _px(ctx,'#ff4444',3,0,1,1,S);
  _px(ctx,'#ff4444',8,0,1,1,S);
  // Focinho branco
  _px(ctx,'#ffeecc',5,3,4,2,S);
  // Olhos
  _px(ctx,'#000000',4,2,1,1,S);
  _px(ctx,'#000000',7,2,1,1,S);
  // Nariz
  _px(ctx,'#220000',6,4,2,1,S);
  // Cauda branca na ponta
  _px(ctx,'#ff8822',9,4,3,4,S);
  _px(ctx,'#ffeecc',10,7,2,2,S);
}

function drawDragonPet(ctx, S) {
  // Corpo vermelho
  _px(ctx,'#cc2200',2,3,10,5,S);
  _px(ctx,'#991800',2,7,10,1,S);
  // Escamas
  _px(ctx,'#ee3300',4,3,2,1,S);
  _px(ctx,'#ee3300',7,3,2,1,S);
  // Asas
  _px(ctx,'#882200',0,2,3,5,S);
  _px(ctx,'#ff4400',1,2,2,3,S);
  _px(ctx,'#882200',11,2,3,5,S);
  _px(ctx,'#ff4400',11,2,2,3,S);
  // Cabeça
  _px(ctx,'#cc2200',4,1,6,3,S);
  // Chifres
  _px(ctx,'#ffcc00',4,0,1,2,S);
  _px(ctx,'#ffcc00',9,0,1,2,S);
  // Olhos amarelos
  _px(ctx,'#ffff00',5,2,2,1,S);
  _px(ctx,'#ffff00',8,2,2,1,S);
  _px(ctx,'#000000',6,2,1,1,S);
  _px(ctx,'#000000',9,2,1,1,S);
  // Fogo pela boca
  _px(ctx,'#ff8800',10,3,3,1,S);
  _px(ctx,'#ffff00',11,3,2,1,S);
}

function drawBunnyPet(ctx, S) {
  // Orelhas longas
  _px(ctx,'#f0f0f0',3,0,2,4,S);
  _px(ctx,'#f0f0f0',8,0,2,4,S);
  _px(ctx,'#ffbbbb',4,0,1,3,S);
  _px(ctx,'#ffbbbb',9,0,1,3,S);
  // Corpo branco fofo
  _px(ctx,'#f0f0f0',2,4,9,5,S);
  _px(ctx,'#dddddd',2,8,9,1,S);
  // Barriga rosa clara
  _px(ctx,'#ffe0f0',4,6,5,3,S);
  // Cabeça
  _px(ctx,'#f0f0f0',3,3,7,3,S);
  // Olhos rosa
  _px(ctx,'#ff88aa',4,4,2,1,S);
  _px(ctx,'#ff88aa',7,4,2,1,S);
  _px(ctx,'#000000',5,4,1,1,S);
  _px(ctx,'#000000',8,4,1,1,S);
  // Nariz
  _px(ctx,'#ff6699',6,5,1,1,S);
  // Bochechas fofas
  _px(ctx,'#ffccdd',4,5,1,1,S);
  _px(ctx,'#ffccdd',8,5,1,1,S);
  // Rabo
  _px(ctx,'#f0f0f0',0,7,2,2,S);
}

function drawWolfPet(ctx, S) {
  // Corpo cinza
  _px(ctx,'#888888',2,4,10,5,S);
  _px(ctx,'#666666',2,8,10,1,S);
  // Barriga mais clara
  _px(ctx,'#bbbbbb',4,6,6,3,S);
  // Cabeça
  _px(ctx,'#888888',3,2,8,4,S);
  // Orelhas pontudas
  _px(ctx,'#888888',2,0,3,3,S);
  _px(ctx,'#888888',9,0,3,3,S);
  _px(ctx,'#ff8888',3,0,1,2,S);
  _px(ctx,'#ff8888',10,0,1,2,S);
  // Focinho
  _px(ctx,'#aaaaaa',5,5,4,2,S);
  _px(ctx,'#333333',6,6,2,1,S);
  // Olhos amarelos
  _px(ctx,'#ffdd00',4,3,2,2,S);
  _px(ctx,'#ffdd00',8,3,2,2,S);
  _px(ctx,'#000000',4,3,1,1,S);
  _px(ctx,'#000000',9,3,1,1,S);
  // Dentes
  _px(ctx,'#ffffff',5,7,1,1,S);
  _px(ctx,'#ffffff',8,7,1,1,S);
  // Cauda
  _px(ctx,'#888888',12,5,2,4,S);
  _px(ctx,'#bbbbbb',12,8,2,1,S);
}

function drawPhoenixPet(ctx, S) {
  // Asas de fogo
  _px(ctx,'#ff4400',0,1,5,7,S);
  _px(ctx,'#ff8800',1,1,4,5,S);
  _px(ctx,'#ffcc00',2,2,3,3,S);
  _px(ctx,'#ff4400',13,1,5,7,S);
  _px(ctx,'#ff8800',13,1,4,5,S);
  _px(ctx,'#ffcc00',13,2,3,3,S);
  // Corpo central
  _px(ctx,'#ff6600',4,3,10,6,S);
  _px(ctx,'#ff8800',5,4,8,4,S);
  _px(ctx,'#ffaa00',6,5,6,2,S);
  // Peito brilhante
  _px(ctx,'#ffdd00',7,5,4,2,S);
  // Cabeça
  _px(ctx,'#ff6600',5,1,8,4,S);
  // Crista flamejante
  _px(ctx,'#ff0000',5,0,2,2,S);
  _px(ctx,'#ff8800',7,0,3,1,S);
  _px(ctx,'#ffcc00',10,0,2,2,S);
  _px(ctx,'#ff4400',6,0,1,1,S);
  // Olhos brilhantes
  _px(ctx,'#ffffff',6,2,2,2,S);
  _px(ctx,'#ffff00',7,2,1,1,S);
  _px(ctx,'#ffffff',10,2,2,2,S);
  _px(ctx,'#ffff00',11,2,1,1,S);
  // Bico
  _px(ctx,'#ffcc00',12,3,2,1,S);
  // Cauda flamejante
  _px(ctx,'#ff4400',4,8,10,4,S);
  _px(ctx,'#ff8800',5,9,8,2,S);
  _px(ctx,'#ffff00',6,10,6,1,S);
  _px(ctx,'#ff0000',5,11,2,1,S);
  _px(ctx,'#ff0000',9,11,2,1,S);
}

function drawTurtlePet(ctx, S) {
  // Casco (escuro com padrão)
  _px(ctx,'#336622',1,2,12,7,S);
  _px(ctx,'#224411',1,8,12,1,S);
  // Padrão do casco (hexágonos simplificados)
  _px(ctx,'#448833',3,3,2,2,S);
  _px(ctx,'#448833',6,3,2,2,S);
  _px(ctx,'#448833',9,3,2,2,S);
  _px(ctx,'#448833',4,5,2,2,S);
  _px(ctx,'#448833',8,5,2,2,S);
  _px(ctx,'#448833',3,7,2,1,S);
  _px(ctx,'#448833',9,7,2,1,S);
  _px(ctx,'#55aa33',4,3,1,1,S);
  _px(ctx,'#55aa33',7,3,1,1,S);
  _px(ctx,'#55aa33',10,3,1,1,S);
  // Cabeça verde
  _px(ctx,'#55cc33',9,1,5,4,S);
  _px(ctx,'#44aa22',13,1,1,3,S);
  // Olhos
  _px(ctx,'#ffffff',10,2,2,1,S);
  _px(ctx,'#000000',11,2,1,1,S);
  // Nariz
  _px(ctx,'#33aa22',12,3,1,1,S);
  // Patas
  _px(ctx,'#55cc33',0,5,2,3,S);
  _px(ctx,'#55cc33',0,7,3,1,S);
  _px(ctx,'#55cc33',12,5,2,3,S);
  _px(ctx,'#55cc33',11,7,3,1,S);
  _px(ctx,'#55cc33',3,9,3,2,S);
  _px(ctx,'#55cc33',8,9,3,2,S);
}

function drawUnicornPet(ctx, S) {
  // Corpo branco/rosa
  _px(ctx,'#ffd6f0',2,3,10,6,S);
  _px(ctx,'#eec0e0',2,8,10,1,S);
  // Barriga levemente mais clara
  _px(ctx,'#fff0fa',4,5,6,3,S);
  // Juba e cauda arco-íris
  _px(ctx,'#ff88cc',0,3,3,5,S);
  _px(ctx,'#dd44aa',1,3,2,5,S);
  _px(ctx,'#ff88cc',12,3,3,5,S);
  _px(ctx,'#aa88ff',12,5,2,3,S);
  // Cabeça
  _px(ctx,'#ffd6f0',4,1,6,4,S);
  // Chifre mágico (dourado)
  _px(ctx,'#ffdd00',7,0,2,2,S);
  _px(ctx,'#ffee88',7,0,1,1,S);
  // Juba no pescoço
  _px(ctx,'#ff66bb',3,2,3,3,S);
  _px(ctx,'#cc44aa',3,3,2,2,S);
  // Olhos cor-de-rosa
  _px(ctx,'#ffffff',5,2,2,2,S);
  _px(ctx,'#ff44aa',6,2,1,1,S);
  _px(ctx,'#ffffff',8,2,2,2,S);
  _px(ctx,'#ff44aa',9,2,1,1,S);
  // Estrelinhas mágicas ao redor
  _px(ctx,'#ffff00',1,1,1,1,S);
  _px(ctx,'#ffff00',13,2,1,1,S);
  _px(ctx,'#ff88ff',0,7,1,1,S);
  // Patas elegantes
  _px(ctx,'#eec0e0',4,9,2,2,S);
  _px(ctx,'#eec0e0',8,9,2,2,S);
}

// ── Mapa de funções de desenho por id ────────────────────────────
const PET_DRAW_FNS = {
  bird:    (ctx, S) => drawBirdPet(ctx, S),
  fox:     (ctx, S) => drawFoxPet(ctx, S),
  dragon:  (ctx, S) => drawDragonPet(ctx, S),
  bunny:   (ctx, S) => drawBunnyPet(ctx, S),
  wolf:    (ctx, S) => drawWolfPet(ctx, S),
  phoenix: (ctx, S) => drawPhoenixPet(ctx, S),
  turtle:  (ctx, S) => drawTurtlePet(ctx, S),
  unicorn: (ctx, S) => drawUnicornPet(ctx, S),
};

// Cria canvas pixel art para o pet (usa função específica ou fallback genérico)
function petCanvas(id, def) {
  const S = 3;
  const size = def.size;
  const c = document.createElement('canvas');
  c.width = size*S; c.height = size*S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const drawFn = PET_DRAW_FNS[id];
  if (drawFn) {
    drawFn(ctx, S);
  } else {
    // Fallback genérico
    const col = '#' + def.color.toString(16).padStart(6, '0');
    ctx.fillStyle = col;
    ctx.fillRect(S, S, (size-2)*S, (size-2)*S);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((size-4)*S, 2*S, 2*S, 2*S);
    ctx.fillStyle = '#000000';
    ctx.fillRect((size-3)*S, 2*S, S, 2*S);
  }
  return c;
}

export class PetSystem {
  constructor(threeScene, engine) {
    this._scene  = threeScene;
    this._engine = engine;
    this._pets   = [];
    this._t      = 0;
  }

  init(playerX, playerY) {
    const activePets = SaveSystem.getActivePets();  // array de ids, max 3
    activePets.forEach((id, i) => {
      const def = PET_DEFS[id];
      if (!def) return;

      const offsetX = (i - 1) * 30;
      const x = playerX + offsetX;
      const y = playerY - 20;

      const tex = new THREE.CanvasTexture(petCanvas(id, def));
      tex.magFilter = tex.minFilter = THREE.NearestFilter;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true }));
      sp.scale.set(def.size*2.5, def.size*2.5, 1);
      sp.position.set(x, -y, 9);
      this._scene.add(sp);

      this._pets.push({
        id, def,
        x, y,
        sprite: sp,
        atkTimer: 0,
        healCooldown: 0,
        offsetX,
        offsetY: -30 - i*10,
      });
    });
  }

  update(player, enemies, boss, dt, gameScene) {
    this._t += dt;
    this._pets.forEach((pet, i) => {
      pet.atkTimer += dt;

      // Flutuar ao redor do player
      const targetX = player.x + pet.offsetX + Math.sin(this._t * 2 + i) * 12;
      const targetY = player.y + pet.offsetY + Math.cos(this._t * 1.5 + i) * 8;
      pet.x += (targetX - pet.x) * 8 * dt;
      pet.y += (targetY - pet.y) * 6 * dt;
      pet.sprite.position.set(pet.x, -pet.y, 9);
      pet.sprite.rotation.z = Math.sin(this._t * 3 + i) * 0.15;

      // Atacar inimigos (e boss) próximos
      if (pet.atkTimer >= pet.def.atkRate) {
        let target = null;
        let bestDist = pet.def.range;

        enemies.forEach(en => {
          if (!en.alive) return;
          const dx = en.x - pet.x, dy = en.y - pet.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < bestDist) { bestDist = d; target = en; }
        });

        if (!target && boss?.alive) {
          const dx = boss.x - pet.x, dy = boss.y - pet.y;
          if (Math.sqrt(dx*dx + dy*dy) < pet.def.range) target = boss;
        }

        if (target) {
          pet.atkTimer = 0;

          // Unicórnio: cura 1 HP a cada 5s (não a cada ataque)
          if (pet.id === 'unicorn') {
            pet.healCooldown -= dt;
            if (pet.healCooldown <= 0 && player.health < player.maxHealth) {
              player.health = Math.min(player.health + 1, player.maxHealth);
              pet.healCooldown = 5;
              gameScene.updateHUD?.();
              this._spawnAtkFx(player.x, player.y - 20, player.x, player.y - 40, 0xff88ff);
            }
          }

          // Phoenix: AOE — dano a todos os inimigos no alcance
          if (pet.id === 'phoenix') {
            enemies.forEach(en => {
              if (!en.alive) return;
              const dx = en.x - pet.x, dy = en.y - pet.y;
              if (Math.sqrt(dx*dx + dy*dy) <= pet.def.range) en.hit?.(pet.def.dmg);
            });
            if (boss?.alive) {
              const dx = boss.x - pet.x, dy = boss.y - pet.y;
              if (Math.sqrt(dx*dx + dy*dy) <= pet.def.range) boss.hit?.(pet.def.dmg);
            }
          } else {
            target.hit?.(pet.def.dmg);
          }

          SaveSystem.addMissionProgress('petKills', 1);
          gameScene.updateHUD?.();
          // Flash visual
          this._spawnAtkFx(pet.x, pet.y, target.x, target.y, pet.def.color);
        }
      }
    });
  }

  _spawnAtkFx(x1, y1, x2, y2, col) {
    const mid = this._engine.box(4, 4, 4, col, (x1+x2)/2, (y1+y2)/2, 10);
    mid.material.emissive = new THREE.Color(col);
    mid.material.emissiveIntensity = 1;
    setTimeout(() => this._engine.remove(mid), 200);
  }

  destroy() {
    this._pets.forEach(p => {
      p.sprite.material?.map?.dispose();
      p.sprite.material?.dispose();
      this._scene.remove(p.sprite);
    });
    this._pets = [];
  }
}
