// CharacterSprite.js — Terraria-style pixel art characters
// All drawing done via canvas API — no external assets

import * as THREE from 'three';

const S = 5; // canvas pixels per game pixel (crispy pixel art)

// ── Color palettes ─────────────────────────────────────────────
export const SKINS = {
  default: { skin:'#f4c29a',skinD:'#d49060',hair:'#7a3e14',hairD:'#4e2808',
             eye:'#2d5aaa',eyeW:'#efefef',shirt:'#2255cc',shirtD:'#1a3d99',
             pants:'#7a5614',pantsD:'#5c3e0e',belt:'#221100',
             shoe:'#3a2814',shoeD:'#1e1408',out:'#110808' },
  warrior: { skin:'#c8885a',skinD:'#9a6038',hair:'#110a02',hairD:'#080400',
             eye:'#228844',eyeW:'#d0f0d0',shirt:'#cc2222',shirtD:'#991111',
             pants:'#3a3a3a',pantsD:'#1a1a1a',belt:'#cc8800',
             shoe:'#2a1808',shoeD:'#160c04',out:'#110808' },
  mage:    { skin:'#e8d0f0',skinD:'#c0a0d0',hair:'#aa22cc',hairD:'#771699',
             eye:'#cc88ff',eyeW:'#f8f0ff',shirt:'#5511aa',shirtD:'#3d0d7a',
             pants:'#2a1155',pantsD:'#1a0a3a',belt:'#cc88ff',
             shoe:'#1a0a33',shoeD:'#100622',out:'#110808' },
  rogue:   { skin:'#d4a060',skinD:'#aa7840',hair:'#1a1208',hairD:'#0e0c04',
             eye:'#cc4422',eyeW:'#ffe0d0',shirt:'#224422',shirtD:'#162c16',
             pants:'#2a2218',pantsD:'#1a1610',belt:'#554422',
             shoe:'#221410',shoeD:'#140c08',out:'#110808' },
  gold:    { skin:'#f4c29a',skinD:'#d49060',hair:'#ffd700',hairD:'#cc9900',
             eye:'#ff6600',eyeW:'#fff0cc',shirt:'#ffd700',shirtD:'#cc9900',
             pants:'#cc8800',pantsD:'#996600',belt:'#886600',
             shoe:'#553300',shoeD:'#331c00',out:'#110808' },
  princess:{ skin:'#ffeedd',skinD:'#e8c8a0',hair:'#ff88cc',hairD:'#cc5599',
             eye:'#ff44aa',eyeW:'#fff0f8',shirt:'#ff99cc',shirtD:'#cc6699',
             pants:'#ffbbdd',pantsD:'#dd88bb',belt:'#ffdd00',
             shoe:'#ff5599',shoeD:'#cc2266',out:'#330011' },
  ice_queen:{ skin:'#e8f0ff',skinD:'#c0d4f0',hair:'#e0f4ff',hairD:'#a0ccee',
              eye:'#00ccff',eyeW:'#f0f8ff',shirt:'#4488ff',shirtD:'#2255cc',
              pants:'#88ccff',pantsD:'#4488cc',belt:'#ffffff',
              shoe:'#2244aa',shoeD:'#112255',out:'#001133' },
};

// ── Low-level pixel drawing ─────────────────────────────────────
function px(ctx, col, x, y, w=1, h=1) {
  ctx.fillStyle = col;
  ctx.fillRect(x*S, y*S, w*S, h*S);
}

function makeCtx(gw, gh) {
  const c = document.createElement('canvas');
  c.width = gw*S; c.height = gh*S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function toTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

// ── Character body (head + torso + left arm + legs) ─────────────
// Canvas: 18 × 40 game pixels (facing right)
function drawCharBody(pal, state='idle', facingRight=true) {
  const { c, ctx } = makeCtx(18, 40);
  const p = pal;

  // Horizontal flip helper
  const f = facingRight ? (x, w) => x : (x, w) => 18 - x - w;
  function r(col, x, y, w, h) { px(ctx, col, f(x,w), y, w, h); }

  // ── HAIR ──────────────────────────
  r(p.hairD, 4, 0, 10, 1);
  r(p.hair,  3, 1, 11, 2);
  r(p.hair,  2, 3,  1, 5); // side bang
  r(p.hairD, 3, 3,  1, 5); // side shadow

  // ── HEAD ──────────────────────────
  r(p.skin,  3, 3, 12, 7); // face
  r(p.skinD, 3, 3,  1, 7); // left edge
  r(p.skinD,14, 3,  1, 7); // right edge (ear side)

  // Eyes (right-side of face)
  r(p.eyeW, 10, 5, 3, 2);
  r(p.eye,  11, 5, 2, 2);
  r(p.out,  12, 5, 1, 1); // pupil
  r(p.out,  10, 4, 4, 1); // eyebrow
  // Ear
  r(p.skin,  2, 5, 1, 3);
  r(p.skinD, 2, 5, 1, 1);
  // Nose + mouth
  r(p.skinD, 10, 8, 2, 1);
  r(p.out,    9, 9, 4, 1);
  r(p.skinD, 10, 9, 2, 1);

  // ── NECK ──────────────────────────
  r(p.skin,  7, 10, 4, 2);
  r(p.skinD, 9, 10, 2, 2);

  // ── LEFT ARM (sleeve + hand) ──────
  r(p.shirt,  0, 12, 4, 6);
  r(p.shirtD, 0, 12, 1, 6);
  r(p.shirtD, 0, 17, 4, 1);
  r(p.skin,   1, 18, 3, 4);
  r(p.skinD,  3, 18, 1, 4);

  // ── TORSO ─────────────────────────
  r(p.shirt,  4, 12, 10, 8);
  r(p.shirtD, 4, 12,  1, 8);
  r(p.shirtD,13, 12,  1, 8);
  r(p.shirtD, 4, 19, 10, 1);
  r(p.shirtD, 8, 13,  1, 6); // center seam

  // ── BELT ──────────────────────────
  r(p.belt,  4, 20, 10, 2);
  r(p.skinD, 8, 20,  2, 2); // buckle

  // ── LEGS (walk animation) ─────────
  const offsets = {
    idle:  [0,  0 ], walk1: [-3, 3 ],
    walk2: [3, -3 ], jump:  [-5, 4 ],
    fall:  [5,  5 ],
  };
  const [lL, lR] = offsets[state] || [0, 0];

  // Left leg
  const lLy = 22 + Math.min(Math.max(lL, -5), 5);
  r(p.pants,  4, lLy,     5, 8);
  r(p.pantsD, 4, lLy,     1, 8);
  r(p.pantsD, 8, lLy,     1, 8);
  r(p.shoe,   3, lLy + 8, 6, 4);
  r(p.shoeD,  7, lLy + 8, 2, 4);
  r(p.shoeD,  3, lLy +10, 6, 2);

  // Right leg
  const lRy = 22 + Math.min(Math.max(lR, -5), 5);
  r(p.pants,  9,  lRy,     5, 8);
  r(p.pantsD, 9,  lRy,     1, 8);
  r(p.pantsD,13,  lRy,     1, 8);
  r(p.shoe,   9,  lRy + 8, 6, 4);
  r(p.shoeD, 13,  lRy + 8, 2, 4);
  r(p.shoeD,  9,  lRy +10, 6, 2);

  return c;
}

// ── Weapon arm (right arm + weapon, rotates to aim) ────────────
// Canvas: 14 × 7 game pixels. Shoulder at left edge, weapon at right.
function drawWeaponArm(pal, weaponType='default', isShooting=false) {
  const { c, ctx } = makeCtx(14, 7);
  const p = pal;

  // Sleeve
  px(ctx, p.shirt,  0, 1, 4*S, 4*S);
  px(ctx, p.shirtD, 0, 1, 1*S, 4*S);
  px(ctx, p.shirtD, 0, 4*S, 4*S, 1*S);
  // Hand
  px(ctx, p.skin,  4*S, 1*S, 3*S, 4*S);
  px(ctx, p.skinD, 6*S, 1*S, 1*S, 4*S);

  // Weapon
  switch (weaponType) {
    case 'double':
      px(ctx, '#999', 7*S, 0,    6*S, 3*S);
      px(ctx, '#bbb', 7*S, 0,    6*S, 1*S);
      px(ctx, '#666', 7*S, 2*S,  5*S, 1*S);
      px(ctx, '#777', 6*S, S,    1*S, 4*S);
      px(ctx, '#555', 12*S,0,    2*S, 4*S);
      px(ctx, '#999', 12*S,0,    2*S, S);
      break;
    case 'laser':
      px(ctx, '#00ccff', 7*S, 0,    7*S, 3*S);
      px(ctx, '#0088cc', 7*S, 2*S,  6*S, 1*S);
      px(ctx, '#88eeff', 7*S, 0,    7*S, S);
      px(ctx, '#004466', 7*S, S,    S,   4*S);
      px(ctx, '#00ffff', 13*S, S,   S,   2*S);
      break;
    case 'spread':
      px(ctx, '#888', 7*S, 0,    7*S, 3*S);
      px(ctx, '#aaa', 7*S, 0,    7*S, S);
      px(ctx, '#666', 7*S, 2*S,  6*S, S);
      px(ctx, '#999', 13*S, 0,   S,   4*S);
      px(ctx, '#bbb', 13*S, S,   S,   2*S);
      break;
    case 'rocket':
      px(ctx, '#886622', 7*S, 0,    7*S, 4*S);
      px(ctx, '#aa8833', 7*S, 0,    7*S, S);
      px(ctx, '#664400', 7*S, 3*S,  6*S, S);
      px(ctx, '#ff6600', 13*S,S,    S,   2*S);
      px(ctx, '#553300', 8*S, S,    S,   4*S);
      break;
    case 'mjolnir': {
      // Cabo marrom
      px(ctx, '#7a4a1a', 7*S, 2*S,  3*S, 5*S);
      px(ctx, '#5a3210', 7*S, 2*S,  S,   5*S);
      // Fita do punho (dourada)
      px(ctx, '#ccaa00', 8*S, 5*S,  2*S, 2*S);
      // Cabeça do martelo (cinza azulado)
      px(ctx, '#7799bb', 7*S, 0,    6*S, 3*S);
      px(ctx, '#99bbdd', 7*S, 0,    6*S, S);
      px(ctx, '#4466aa', 7*S, 2*S,  6*S, S);
      px(ctx, '#bbddff', 8*S, 0,    2*S, S);
      // Runas (amarelo brilhante)
      px(ctx, '#ffee00', 9*S, S,    S,   S);
      px(ctx, '#ffee00', 11*S,S,    S,   S);
      break;
    }
    default: // pistol
      px(ctx, '#888', 7*S,  S,   6*S, 3*S);
      px(ctx, '#aaa', 7*S,  S,   6*S, S);
      px(ctx, '#666', 7*S,  3*S, 5*S, S);
      px(ctx, '#555', 8*S,  0,   4*S, S);
      px(ctx, '#777', 12*S, S,   S,   3*S);
      break;
  }

  return c;
}

// ── Enemy pixel art ────────────────────────────────────────────
const ENEMY_ART = {
  slime:       (c) => drawSlime(c),
  bee:         (c) => drawBee(c),
  mushroom:    (c) => drawMushroom(c),
  spider:      (c) => drawSpider(c),
  golem:       (c) => drawGolem(c),
  bat:         (c) => drawBat(c),
  wolf:        (c) => drawWolf(c),
  yeti:        (c) => drawYeti(c),
  drone:       (c) => drawDrone(c),
  shield_bot:  (c) => drawSimpleEnemy(c, null, '#6688aa','#4466aa','#00ffff','#224'),
  shadow:      (c) => drawShadow(c),
  witch:       (c) => drawWitch(c),
  toad:        (c) => drawToad(c),
  croc:        (c) => drawCroc(c),
  fire_slime:  (c) => drawFireSlime(c),
  fire_bat:    (c) => { drawBat(c); /* recolor */ },
  ice_golem:   (c) => drawIceGolem(c),
  frost_wolf:  (c) => drawWolf(c),
  dragon_guard:(c) => drawDragonGuard(c),
};

// ── Funções de desenho de inimigos (pixel art completa) ────────────

function drawSimpleEnemy(ctx, pal, bodyCol, bodyDark, eyeCol, outCol) {
  px(ctx, outCol,    0, 0, 10, 10);
  px(ctx, bodyCol,   1, 1,  8,  8);
  px(ctx, bodyDark,  1, 1,  2,  8);
  px(ctx, bodyDark,  1, 7,  8,  2);
  px(ctx, '#ffffff', 6, 3, 2, 2); px(ctx, eyeCol, 6, 3, 1, 1);
  px(ctx, '#ffffff', 3, 3, 2, 2); px(ctx, eyeCol, 4, 3, 1, 1);
  px(ctx, outCol,    3, 6, 4, 1);
}

function drawSlime(ctx) {
  px(ctx,'#111',0,2,10,8); px(ctx,'#44cc44',1,3,8,6);
  px(ctx,'#22aa22',1,3,2,6); px(ctx,'#22aa22',1,8,8,2);
  // Corpo arredondado
  px(ctx,'#66ee66',2,2,6,1); px(ctx,'#44cc44',1,2,8,1);
  px(ctx,'#66ee66',3,1,4,1);
  // Olhos brancos assustadores
  px(ctx,'#fff',3,4,2,2); px(ctx,'#000',4,4,1,2);
  px(ctx,'#fff',6,4,2,2); px(ctx,'#000',7,4,1,2);
  // Sorriso maligno
  px(ctx,'#000',3,7,1,1); px(ctx,'#000',5,7,1,1);
  px(ctx,'#000',4,8,2,1);
}

function drawMushroom(ctx) {
  // Chapéu vermelho manchado
  px(ctx,'#cc3300',2,0,6,4); px(ctx,'#aa2200',1,1,8,3);
  px(ctx,'#aa2200',2,0,6,1);
  px(ctx,'#ffffff',3,1,2,1); px(ctx,'#ffffff',6,2,1,1); // manchas
  // Rosto
  px(ctx,'#ffddcc',2,4,6,5); px(ctx,'#cc9966',2,4,1,5); px(ctx,'#cc9966',7,4,1,5);
  // Olhos furiosos
  px(ctx,'#fff',3,5,2,2); px(ctx,'#ff0000',3,5,1,1);
  px(ctx,'#fff',6,5,2,2); px(ctx,'#ff0000',7,5,1,1);
  px(ctx,'#111',3,4,3,1); px(ctx,'#111',5,4,3,1); // sobrancelhas
  // Boca aberta com dentes
  px(ctx,'#111',3,7,5,2); px(ctx,'#fff',3,7,1,1); px(ctx,'#fff',5,7,1,1); px(ctx,'#fff',7,7,1,1);
}

function drawSpider(ctx) {
  // Corpo
  px(ctx,'#110022',2,3,6,5); px(ctx,'#332244',3,4,4,3);
  // 8 pernas
  for(let i=0;i<4;i++){px(ctx,'#221133',0,3+i,2,1); px(ctx,'#221133',8,3+i,2,1);}
  // Olhos vermelhos (8 olhos!)
  for(let r=0;r<2;r++) for(let c=0;c<4;c++) {
    px(ctx,'#ff0000',2+c*2, 4+r, 1, 1);
  }
  // Quelíceras (presas)
  px(ctx,'#cc2200',3,8,1,2); px(ctx,'#cc2200',6,8,1,2);
}

function drawGolem(ctx) {
  px(ctx,'#111',0,0,10,10); px(ctx,'#668866',1,1,8,8);
  px(ctx,'#446644',1,1,2,8); px(ctx,'#446644',1,7,8,2);
  // Crack
  px(ctx,'#334433',4,1,1,5); px(ctx,'#334433',5,3,1,4);
  // Olhos brilhantes
  px(ctx,'#00ff44',2,3,2,2); px(ctx,'#00ff44',6,3,2,2);
  px(ctx,'#88ff88',2,3,1,1); px(ctx,'#88ff88',6,3,1,1);
  // Boca pedregosa
  px(ctx,'#111',2,7,2,1); px(ctx,'#111',5,7,1,1); px(ctx,'#111',7,7,2,1);
}

function drawBat(ctx) {
  px(ctx,'#550055',0,2,10,6); px(ctx,'#330033',1,3,8,4);
  // Asas com membranas
  px(ctx,'#660066',0,2,3,4); px(ctx,'#660066',7,2,3,4);
  px(ctx,'#440044',0,2,1,5); px(ctx,'#440044',9,2,1,5);
  // Orelhas
  px(ctx,'#880088',3,0,1,2); px(ctx,'#880088',6,0,1,2);
  // Olhos vermelhos
  px(ctx,'#ff00ff',3,3,2,1); px(ctx,'#ff00ff',5,3,2,1);
  // Presas
  px(ctx,'#fff',4,6,1,2); px(ctx,'#fff',6,6,1,2);
}

function drawWolf(ctx) {
  px(ctx,'#111',0,0,10,10); px(ctx,'#886644',1,1,8,8);
  px(ctx,'#664422',1,1,2,8); px(ctx,'#664422',1,7,8,2);
  // Focinho
  px(ctx,'#aa7755',2,5,6,4); px(ctx,'#dd9966',3,6,4,2);
  // Olhos amarelos
  px(ctx,'#ffdd00',2,3,2,2); px(ctx,'#ffdd00',6,3,2,2);
  px(ctx,'#000',2,3,1,1); px(ctx,'#000',6,3,1,1);
  // Orelhas
  px(ctx,'#886644',2,0,2,2); px(ctx,'#886644',6,0,2,2);
  // Dentes
  px(ctx,'#fff',3,8,1,2); px(ctx,'#fff',6,8,1,2);
}

function drawYeti(ctx) {
  // Pelagem branca azulada
  px(ctx,'#334',0,0,10,10); px(ctx,'#aaccff',1,1,8,8);
  px(ctx,'#8899cc',1,1,2,8); px(ctx,'#8899cc',1,7,8,2);
  // Pelagem extra
  px(ctx,'#cceeff',2,0,6,2); px(ctx,'#aaccff',1,2,1,4); px(ctx,'#aaccff',8,2,1,4);
  // Olhos vermelhos malucos
  px(ctx,'#ff2200',2,3,3,2); px(ctx,'#ff2200',5,3,3,2);
  px(ctx,'#ffff00',3,3,1,1); px(ctx,'#ffff00',6,3,1,1);
  // Bocão
  px(ctx,'#111',2,7,6,2); px(ctx,'#fff',3,7,1,1); px(ctx,'#fff',5,7,1,1); px(ctx,'#fff',7,7,1,1);
  px(ctx,'#fff',2,8,1,1); px(ctx,'#fff',8,8,1,1);
}

function drawShadow(ctx) {
  // Entidade de sombra — parcialmente translúcida
  px(ctx,'#110022',1,1,8,8); px(ctx,'#220033',2,2,6,6);
  // Forma nebulosa no topo
  px(ctx,'#330044',1,0,8,2); px(ctx,'#220033',0,1,10,1);
  // Olhos brilhando roxo
  px(ctx,'#ff00ff',2,3,2,3); px(ctx,'#ff00ff',6,3,2,3);
  px(ctx,'#ff88ff',2,3,1,1); px(ctx,'#ff88ff',6,3,1,1);
  // Garras
  px(ctx,'#441155',0,6,2,4); px(ctx,'#441155',8,6,2,4);
  px(ctx,'#551166',0,9,1,1); px(ctx,'#551166',2,9,1,1);
  px(ctx,'#551166',8,9,1,1); px(ctx,'#551166',9,9,1,1);
}

function drawWitch(ctx) {
  // Manto roxo
  px(ctx,'#111',0,0,10,10); px(ctx,'#6633aa',2,2,6,8);
  px(ctx,'#441188',2,2,2,8); px(ctx,'#441188',2,8,6,2);
  // Chapéu pontudo
  px(ctx,'#331166',4,0,2,2); px(ctx,'#5522aa',3,1,4,2); px(ctx,'#6633aa',2,2,6,1);
  // Rosto
  px(ctx,'#aaccaa',3,3,4,3);
  // Olhos brilhantes amarelos
  px(ctx,'#ffff00',3,4,2,1); px(ctx,'#ffff00',6,4,2,1);
  // Nariz longo
  px(ctx,'#88aa88',4,5,1,2);
  // Varinha
  px(ctx,'#ffffaa',8,2,1,5); px(ctx,'#ffff00',8,1,2,2);
}

function drawToad(ctx) {
  px(ctx,'#111',0,0,10,10); px(ctx,'#335533',1,1,8,8);
  px(ctx,'#224422',1,1,2,8); px(ctx,'#224422',1,7,8,2);
  // Barriga
  px(ctx,'#66aa66',3,4,4,5);
  // Olhos saltados
  px(ctx,'#336633',2,0,3,3); px(ctx,'#336633',5,0,3,3);
  px(ctx,'#ffff00',2,0,2,2); px(ctx,'#ffff00',6,0,2,2);
  px(ctx,'#000',2,0,1,1); px(ctx,'#000',7,0,1,1);
  // Boca grande
  px(ctx,'#111',1,7,8,2); px(ctx,'#ff4400',2,7,6,1);
}

function drawCroc(ctx) {
  px(ctx,'#111',0,0,10,10); px(ctx,'#225522',1,1,8,8);
  px(ctx,'#113311',1,1,2,8); px(ctx,'#113311',1,7,8,2);
  // Escamas
  for(let i=0;i<4;i++) { px(ctx,'#336633',1+i*2,3,1,1); px(ctx,'#336633',2+i*2,5,1,1); }
  // Olhos amarelos em cima
  px(ctx,'#ffff00',2,1,2,2); px(ctx,'#ffff00',6,1,2,2);
  px(ctx,'#000',2,1,1,1); px(ctx,'#000',7,1,1,1);
  // Focinho com dentes
  px(ctx,'#113311',2,7,6,3); px(ctx,'#fff',2,7,1,1); px(ctx,'#fff',4,7,1,1); px(ctx,'#fff',6,7,1,1);
  px(ctx,'#fff',3,9,1,1); px(ctx,'#fff',5,9,1,1); px(ctx,'#fff',7,9,1,1);
}

function drawFireSlime(ctx) {
  px(ctx,'#220',0,2,10,8); px(ctx,'#ff4400',1,3,8,6);
  px(ctx,'#cc2200',1,3,2,6); px(ctx,'#cc2200',1,8,8,2);
  // Chamas
  px(ctx,'#ff8800',3,1,4,3); px(ctx,'#ffff00',4,0,2,2);
  px(ctx,'#ff4400',2,1,2,2); px(ctx,'#ff4400',6,1,2,2);
  // Olhos brilhantes
  px(ctx,'#ffff00',3,4,2,2); px(ctx,'#000',3,4,1,1);
  px(ctx,'#ffff00',6,4,2,2); px(ctx,'#000',7,4,1,1);
}

function drawDragonGuard(ctx) {
  px(ctx,'#110000',0,0,10,10); px(ctx,'#882200',1,1,8,8);
  px(ctx,'#661100',1,1,2,8); px(ctx,'#661100',1,7,8,2);
  // Escamas
  px(ctx,'#aa3300',3,1,4,1); px(ctx,'#aa3300',2,3,6,1); px(ctx,'#aa3300',3,5,4,1);
  // Chifres
  px(ctx,'#cc5500',3,0,1,2); px(ctx,'#cc5500',6,0,1,2);
  // Olhos laranja
  px(ctx,'#ff8800',2,3,3,2); px(ctx,'#ff8800',5,3,3,2);
  px(ctx,'#ffff00',2,3,1,1); px(ctx,'#ffff00',7,3,1,1);
  // Boca com fogo
  px(ctx,'#111',2,7,6,2); px(ctx,'#ff6600',3,7,4,1);
}

function drawBee(ctx) {
  // Listras amarelo/preto
  ['#ffcc00','#222222','#ffcc00','#222222','#ffcc00'].forEach((c,i) => {
    px(ctx, c, 2, i*1.5|0, 8, 2);
  });
  // Asas transparentes
  px(ctx,'#ddeeff88',0,0,3,4); px(ctx,'#ddeeff88',8,0,3,4);
  // Olhos compostos
  px(ctx,'#ff0000',2,1,2,2); px(ctx,'#ff0000',6,1,2,2);
  // Ferrão
  px(ctx,'#ffdd00',4,8,2,2);
}

function drawDrone(ctx) {
  px(ctx,'#4444aa',0,2,10,4); px(ctx,'#6666cc',0,2,10,1); px(ctx,'#2222aa',0,5,10,1);
  px(ctx,'#44aaff',2,0,6,2);  px(ctx,'#ff4400',4,0,2,2);
  // Rotores melhores
  px(ctx,'#888',0,2,3,2); px(ctx,'#888',7,2,3,2);
  px(ctx,'#aaa',1,1,2,1); px(ctx,'#aaa',8,1,2,1);
  // Câmera
  px(ctx,'#00ccff',4,3,2,2); px(ctx,'#0088cc',4,4,2,1);
}

function drawIceGolem(ctx) {
  px(ctx,'#224',0,0,10,10); px(ctx,'#88bbdd',1,1,8,8);
  px(ctx,'#6699bb',1,1,2,8); px(ctx,'#6699bb',1,7,8,2);
  // Cristais de gelo
  px(ctx,'#aaffff',2,0,2,3); px(ctx,'#aaffff',6,0,2,3);
  px(ctx,'#ccffff',3,0,1,2); px(ctx,'#ccffff',7,0,1,2);
  // Olhos azuis congelados
  px(ctx,'#00ccff',2,3,3,3); px(ctx,'#00ccff',5,3,3,3);
  px(ctx,'#ffffff',2,3,1,1); px(ctx,'#ffffff',7,3,1,1);
  // Boca congelada
  px(ctx,'#aaddff',2,7,6,2); px(ctx,'#ffffff',3,7,1,1); px(ctx,'#ffffff',6,7,1,1);
}

export function createEnemySprite(scene, typeName, gx, gy, gw, gh) {
  const drawFn = ENEMY_ART[typeName] || ENEMY_ART.slime;
  const { c, ctx } = makeCtx(10, 10);
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx);
  const tex = toTex(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(gw, gh, 1);
  sp.position.set(gx, -gy, 5);
  scene.add(sp);
  return { sprite: sp, tex };
}

// ── CharacterSprite class ──────────────────────────────────────
export class CharacterSprite {
  constructor(scene, gx, gy, skinName='default', playerName='') {
    this.scene   = scene;
    this.pal     = SKINS[skinName] || SKINS.default;
    this.x       = gx;
    this.y       = gy;
    this.dir     = 1;
    this.weapon  = 'default';
    this._frameKey = '';
    this._prevWeapon = '';
    this._weaponTex  = null;

    // Pre-render all body frames (idle, walk1, walk2, jump, fall × 2 dirs)
    this._frames = {};
    ['idle','walk1','walk2','jump','fall'].forEach(st => {
      this._frames[st + 'R'] = toTex(drawCharBody(this.pal, st, true));
      this._frames[st + 'L'] = toTex(drawCharBody(this.pal, st, false));
    });

    // Body sprite (18×40 game units)
    this.body = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this._frames.idleR, transparent: true })
    );
    this.body.scale.set(18, 40, 1);
    this.body.position.set(gx, -gy, 10);
    scene.add(this.body);

    // Weapon arm (in a Group so it rotates around shoulder)
    this.armGroup = new THREE.Group();
    this._weaponTex = toTex(drawWeaponArm(this.pal, 'default'));
    this.armMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 7),
      new THREE.MeshBasicMaterial({ map: this._weaponTex, transparent: true, side: THREE.DoubleSide })
    );
    // Offset so the shoulder (left edge) is at group origin
    this.armMesh.position.set(7, 0, 0);
    this.armGroup.add(this.armMesh);
    scene.add(this.armGroup);

    // Name tag
    this.nameSprite = null;
    if (playerName) this.setName(playerName);

    this._update(gx, gy, 1, 0, 0, 'idle', 'default');
  }

  // Call every frame from Player.update()
  animate(x, y, dir, aimX, aimY, state, weapon) {
    this.x = x; this.y = y; this.dir = dir;

    // Swap body frame
    const key = state + (dir >= 0 ? 'R' : 'L');
    if (key !== this._frameKey) {
      this._frameKey = key;
      this.body.material.map = this._frames[key] || this._frames.idleR;
    }

    // Update weapon texture if changed
    if (weapon !== this._prevWeapon) {
      this._prevWeapon = weapon;
      this._weaponTex?.dispose();
      this._weaponTex = toTex(drawWeaponArm(this.pal, weapon));
      this.armMesh.material.map = this._weaponTex;
    }

    this._update(x, y, dir, aimX, aimY, state, weapon);
  }

  _update(x, y, dir, aimX, aimY, state, weapon) {
    // Body position (center of character)
    this.body.position.set(x, -y, 10);

    // Shoulder position
    const shoulderX = x + dir * 7;
    const shoulderY = y - 14;

    // Aim angle: atan2 in Three.js (y-up), so negate game aimY
    const angle = Math.atan2(-aimY, aimX);
    this.armGroup.position.set(shoulderX, -shoulderY, 12);
    this.armGroup.rotation.z = angle;

    // Flip arm mesh for left direction
    this.armMesh.scale.x = dir >= 0 ? 1 : -1;

    // Name tag
    if (this.nameSprite) {
      this.nameSprite.position.set(x, -(y - 30), 15);
    }
  }

  setName(name) {
    if (this.nameSprite) {
      this.nameSprite.material?.map?.dispose();
      this.nameSprite.material?.dispose();
      this.scene.remove(this.nameSprite);
    }
    if (!name) { this.nameSprite = null; return; }

    const canvas = document.createElement('canvas');
    canvas.width = 180; canvas.height = 26;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect?.(0, 0, 180, 26, 5) || ctx.rect(0, 0, 180, 26);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.substring(0, 16), 90, 13);

    const tex = new THREE.CanvasTexture(canvas);
    this.nameSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true })
    );
    this.nameSprite.scale.set(100, 18, 1);
    this.nameSprite.position.set(this.x, -(this.y - 30), 15);
    this.scene.add(this.nameSprite);
  }

  setVisible(v) {
    this.body.visible = v;
    this.armGroup.visible = v;
    if (this.nameSprite) this.nameSprite.visible = v;
  }

  destroy() {
    Object.values(this._frames).forEach(t => t?.dispose());
    this._weaponTex?.dispose();
    this.body.material?.dispose();
    this.scene.remove(this.body);
    this.armGroup.traverse(o => {
      o.material?.map?.dispose();
      o.material?.dispose();
    });
    this.scene.remove(this.armGroup);
    if (this.nameSprite) {
      this.nameSprite.material?.map?.dispose();
      this.nameSprite.material?.dispose();
      this.scene.remove(this.nameSprite);
    }
  }
}
