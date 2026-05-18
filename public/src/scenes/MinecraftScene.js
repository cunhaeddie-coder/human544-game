// ── MinecraftScene — Modo Minecraft 3D com blocos voxel ──────────────────
import * as THREE from 'three';

// Tipos de bloco
const AIR     = 0;
const GRASS   = 1;
const DIRT    = 2;
const STONE   = 3;
const WOOD    = 4;
const LEAF    = 5;
const WATER   = 6;
const COAL    = 7;
const IRON    = 8;
const GOLD    = 9;
const DIAMOND = 10;

const BLOCK_COLORS = {
  [GRASS]:   0x4a8c2a,
  [DIRT]:    0x8b5e3c,
  [STONE]:   0x888888,
  [WOOD]:    0x5c3d1e,
  [LEAF]:    0x2d6b1a,
  [WATER]:   0x1a4488,
  [COAL]:    0x222222,
  [IRON]:    0xaa8866,
  [GOLD]:    0xddaa00,
  [DIAMOND]: 0x00ddee,
};

const BLOCK_EMOJIS = {
  [GRASS]:   '🟩',
  [DIRT]:    '🟫',
  [STONE]:   '⬜',
  [WOOD]:    '🟤',
  [LEAF]:    '💚',
  [WATER]:   '🔵',
  [COAL]:    '⬛',
  [IRON]:    '🟧',
  [GOLD]:    '🟨',
  [DIAMOND]: '🔷',
};

const BLOCK_NAMES = {
  [GRASS]:   'Grama',
  [DIRT]:    'Terra',
  [STONE]:   'Pedra',
  [WOOD]:    'Madeira',
  [LEAF]:    'Folha',
  [WATER]:   'Agua',
  [COAL]:    'Carvao',
  [IRON]:    'Ferro',
  [GOLD]:    'Ouro',
  [DIAMOND]: 'Diamante',
};

const GRAVITY    = 18;
const JUMP_VEL   = 7;
const MOVE_SPEED = 4.5;
const REACH      = 5;

// Tamanho do mundo e chunks
const WORLD_W = 128;
const WORLD_D = 128;
const WORLD_H = 32;
const CHUNK_SIZE = 16;
const RENDER_DIST = 4; // chunks em cada direção

// Ciclo dia/noite: 300 segundos = 5 minutos
const DAY_CYCLE = 300;

export class MinecraftScene {
  constructor(engine, manager, input) {
    this.engine  = engine;
    this.manager = manager;
    this.input   = input;

    // Câmera perspectiva própria para 3D
    this._cam = new THREE.PerspectiveCamera(70, 1280 / 720, 0.1, 800);
    this._renderer = engine.renderer;

    // Posição e física do jogador
    this._pos    = new THREE.Vector3(64, 20, 64);
    this._vel    = new THREE.Vector3(0, 0, 0);
    this._onGround = false;

    // Orientação da câmera
    this._yaw   = 0;
    this._pitch = 0;

    // Controle de saída
    this._leaving = false;

    // Objetos Three.js na cena
    this._objects   = [];

    // Sistema de chunks: Map<key, THREE.Mesh>
    this._chunkMeshes = new Map();

    // HUD HTML
    this._hudEl = null;
    this._inventoryEl = null;
    this._inventoryOpen = false;

    // Raycaster
    this._raycaster = new THREE.Raycaster();

    // Handlers de mouse/pointer
    this._onMouseMove   = null;
    this._onMouseDown   = null;
    this._onPointerLock = null;
    this._pointerLocked = false;

    // Inventário: slot selecionado da hotbar
    this._hotbarIndex = 0;
    this._inventory = this._createInventory();
    this._hotbarSlots = null;

    // Iluminação específica para a cena Minecraft
    this._mcAmbient = null;
    this._mcSun     = null;

    // Animais
    this._animals = [];

    // Tempo e ciclo dia/noite
    this._time    = 0;
    this._dayTime = 0; // 0 = amanhecer, 0.5 = meia-noite

    // Modo sobrevivência
    this._survivalMode = true;
    this._hunger = 10;       // 0-10 corações
    this._hp     = 20;       // 0-20 pontos de vida
    this._hungerTimer  = 0;  // conta até 30s para tirar 1 fome
    this._damageTimer  = 0;  // conta até 5s para tirar HP por fome
    this._hungerEl     = null;

    // Zumbis (inimigos noturnos)
    this._zombies = [];
    this._zombieSpawnTimer = 0;
  }

  // ─────────────────────────────────────────────────────────────────────
  // CRIAÇÃO
  // ─────────────────────────────────────────────────────────────────────
  create() {
    // Guarda a câmera ortográfica original para restaurar no destroy
    this._originalCam = this.engine.camera;
    this.engine.camera = this._cam;

    // Fundo de céu
    this.engine.scene.background = new THREE.Color(0x87ceeb);

    // Iluminação dedicada à cena Minecraft
    this._mcAmbient = new THREE.AmbientLight(0xffffff, 0.8);
    this.engine.scene.add(this._mcAmbient);
    this._objects.push(this._mcAmbient);

    this._mcSun = new THREE.DirectionalLight(0xfff5cc, 1.2);
    this._mcSun.position.set(50, 80, 50);
    this._mcSun.castShadow = false;
    this.engine.scene.add(this._mcSun);
    this._objects.push(this._mcSun);

    // Gera o mundo
    this._generateWorld();

    // Posiciona o jogador
    const startH = this._getHeight(64, 64);
    this._pos.set(64, startH + 1.8, 64);

    // Constrói chunks iniciais ao redor do jogador
    this._rebuildNearbyChunks(this._pos.x, this._pos.z);

    // Camera inicial
    this._updateCamera();

    // HUD (inventário + hotbar + sobrevivência)
    this._createInventoryHUD();

    // Pointer lock
    this._setupPointerLock();

    // Spawna animais na superfície
    this._spawnAnimals();
  }

  // ─────────────────────────────────────────────────────────────────────
  // INVENTÁRIO
  // ─────────────────────────────────────────────────────────────────────
  _createInventory() {
    // Começa vazio em modo survival — o jogador coleta blocos quebrando
    const inv = [];
    for (let i = 0; i < 36; i++) inv.push({ type: AIR, qty: 0 });
    return inv;
  }

  _getHotbarSlot(i) {
    // Hotbar = slots 0-8
    return this._inventory[i];
  }

  _selectedType() {
    const slot = this._getHotbarSlot(this._hotbarIndex);
    return slot && slot.qty > 0 ? slot.type : AIR;
  }

  _addToInventory(type, qty = 1) {
    // Tenta empilhar em slot existente
    for (const slot of this._inventory) {
      if (slot.type === type && slot.qty < 64) {
        slot.qty = Math.min(64, slot.qty + qty);
        this._updateInventoryHUD();
        return;
      }
    }
    // Slot vazio
    for (const slot of this._inventory) {
      if (slot.qty === 0) {
        slot.type = type;
        slot.qty = qty;
        this._updateInventoryHUD();
        return;
      }
    }
  }

  _removeFromInventory(slotIndex, qty = 1) {
    const slot = this._inventory[slotIndex];
    if (slot && slot.qty > 0) {
      slot.qty -= qty;
      if (slot.qty <= 0) { slot.qty = 0; slot.type = AIR; }
      this._updateInventoryHUD();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // HUD — inventário, hotbar, sobrevivência
  // ─────────────────────────────────────────────────────────────────────
  _createInventoryHUD() {
    // Mira central
    const cross = document.createElement('div');
    cross.id = '_mc_cross';
    cross.style.cssText = `
      position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      font-size:28px; font-weight:bold; color:#fff;
      text-shadow:0 0 4px #000; line-height:1;
      pointer-events:none; z-index:200;
    `;
    cross.textContent = '+';
    document.body.appendChild(cross);
    this._crossEl = cross;

    // Instruções no topo
    const hint = document.createElement('div');
    hint.id = '_mc_hint';
    hint.style.cssText = `
      position:fixed; top:12px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.5); padding:5px 16px; border-radius:6px;
      font-size:13px; white-space:nowrap; color:#fff;
      font-family:monospace; pointer-events:none; z-index:200;
      text-shadow:1px 1px 2px #000;
    `;
    hint.textContent = 'ESC=Sair | WASD=Mover | Espaço=Pular | E=Inventário | 1-9=Hotbar | Clique Esq=Quebrar | Clique Dir=Colocar | Clique=Capturar mouse';
    document.body.appendChild(hint);
    this._hintEl = hint;

    // Coords
    const coords = document.createElement('div');
    coords.id = '_mc_coords';
    coords.style.cssText = `
      position:fixed; top:12px; left:12px;
      background:rgba(0,0,0,0.45); padding:4px 10px; border-radius:4px;
      font-size:12px; color:#fff; font-family:monospace;
      pointer-events:none; z-index:200;
      text-shadow:1px 1px 2px #000;
    `;
    document.body.appendChild(coords);
    this._coordsLabel = coords;

    // HUD principal (fundo da tela)
    const hud = document.createElement('div');
    hud.id = '_mc_hud';
    hud.style.cssText = `
      position:fixed; bottom:0; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; align-items:center;
      z-index:200; pointer-events:none; font-family:monospace;
      padding-bottom:6px;
    `;

    // Barra de HP e Fome
    const statBar = document.createElement('div');
    statBar.style.cssText = `
      display:flex; gap:16px; margin-bottom:4px;
      font-size:16px; text-shadow:1px 1px 2px #000;
      background:rgba(0,0,0,0.4); padding:3px 12px; border-radius:6px;
    `;
    this._hpEl     = document.createElement('span');
    this._hungerEl = document.createElement('span');
    this._hpEl.textContent     = this._renderHP();
    this._hungerEl.textContent = this._renderHunger();
    statBar.appendChild(this._hpEl);
    statBar.appendChild(this._hungerEl);
    hud.appendChild(statBar);

    // Hotbar (9 slots)
    const hotbar = document.createElement('div');
    hotbar.style.cssText = `
      display:flex; gap:3px;
      background:rgba(0,0,0,0.55); padding:5px; border-radius:6px;
    `;
    this._hotbarSlotEls = [];
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width:44px; height:44px; border:2px solid #666;
        background:#333; display:flex; align-items:center;
        justify-content:center; font-size:18px; color:#fff;
        border-radius:3px; position:relative; flex-direction:column;
        cursor:pointer;
      `;
      slot.dataset.slot = i;
      hotbar.appendChild(slot);
      this._hotbarSlotEls.push(slot);
    }
    hud.appendChild(hotbar);
    document.body.appendChild(hud);
    this._hudEl = hud;

    // Painel de inventário completo (oculto por padrão)
    const invPanel = document.createElement('div');
    invPanel.id = '_mc_inv';
    invPanel.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:rgba(30,20,10,0.95); border:2px solid #888; border-radius:8px;
      padding:16px; z-index:300; display:none; font-family:monospace; color:#fff;
      min-width:420px;
    `;
    const invTitle = document.createElement('div');
    invTitle.style.cssText = `font-size:18px; font-weight:bold; margin-bottom:10px; text-align:center;`;
    invTitle.textContent = 'Inventário (E para fechar)';
    invPanel.appendChild(invTitle);

    // Grid 4×9 (linhas 0-2 = main, linha 3 = hotbar)
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid; grid-template-columns:repeat(9,44px); gap:3px; margin-bottom:8px;`;
    this._invSlotEls = [];
    for (let i = 0; i < 36; i++) {
      const slotEl = document.createElement('div');
      slotEl.style.cssText = `
        width:44px; height:44px; border:2px solid #555;
        background:#444; display:flex; align-items:center;
        justify-content:center; font-size:18px; border-radius:3px;
        flex-direction:column; position:relative;
      `;
      grid.appendChild(slotEl);
      this._invSlotEls.push(slotEl);
    }
    invPanel.appendChild(grid);
    document.body.appendChild(invPanel);
    this._inventoryEl = invPanel;

    this._updateInventoryHUD();
  }

  _renderHP() {
    const full  = Math.floor(this._hp / 2);
    const half  = this._hp % 2;
    const empty = 10 - full - half;
    return '❤️'.repeat(full) + (half ? '💔' : '') + '🖤'.repeat(empty);
  }

  _renderHunger() {
    const full  = Math.floor(this._hunger);
    const empty = 10 - full;
    return '🍗'.repeat(full) + '🦴'.repeat(empty);
  }

  _updateInventoryHUD() {
    // Atualiza hotbar
    if (this._hotbarSlotEls) {
      for (let i = 0; i < 9; i++) {
        const slot   = this._inventory[i];
        const slotEl = this._hotbarSlotEls[i];
        if (!slotEl) continue;
        slotEl.innerHTML = '';
        if (slot && slot.qty > 0) {
          slotEl.innerHTML = `<span style="font-size:20px">${BLOCK_EMOJIS[slot.type] || '?'}</span><span style="font-size:9px;position:absolute;bottom:2px;right:4px;color:#ccc">${slot.qty}</span>`;
        }
        // Destaque do slot ativo
        slotEl.style.border = i === this._hotbarIndex ? '2px solid #fff' : '2px solid #666';
      }
    }
    // Atualiza painel completo
    if (this._invSlotEls) {
      for (let i = 0; i < 36; i++) {
        const slot   = this._inventory[i];
        const slotEl = this._invSlotEls[i];
        if (!slotEl) continue;
        slotEl.innerHTML = '';
        if (slot && slot.qty > 0) {
          slotEl.innerHTML = `<span style="font-size:20px">${BLOCK_EMOJIS[slot.type] || '?'}</span><span style="font-size:9px;position:absolute;bottom:2px;right:4px;color:#ccc">${slot.qty}</span>`;
        }
        slotEl.style.border = i === this._hotbarIndex ? '2px solid #fff' : '2px solid #555';
      }
    }
    // Atualiza HP e fome
    if (this._hpEl)     this._hpEl.textContent     = this._renderHP();
    if (this._hungerEl) this._hungerEl.textContent  = this._renderHunger();
  }

  _toggleInventory() {
    this._inventoryOpen = !this._inventoryOpen;
    if (this._inventoryEl) {
      this._inventoryEl.style.display = this._inventoryOpen ? 'block' : 'none';
    }
    // Libera/captura pointer lock conforme inventário
    if (this._inventoryOpen) {
      document.exitPointerLock?.();
    } else {
      this.engine.renderer.domElement.requestPointerLock?.();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GERAÇÃO DO MUNDO (128×128×32)
  // ─────────────────────────────────────────────────────────────────────
  _generateWorld() {
    const W = WORLD_W, D = WORLD_D, H = WORLD_H;
    this._world = new Uint8Array(W * D * H);
    this._W = W; this._D = D; this._H = H;

    // Noise simples multiplicado (sem lib externa)
    const noise = (x, z) => {
      return (
        Math.sin(x * 0.08) * 3 +
        Math.cos(z * 0.06) * 3 +
        Math.sin(x * 0.2 + z * 0.15) * 2.5 +
        Math.cos(x * 0.05 - z * 0.12) * 4 +
        Math.sin(x * 0.35 + z * 0.41) * 1.2 +
        Math.cos(x * 0.13 + z * 0.09) * 2
      );
    };

    for (let x = 0; x < W; x++) {
      for (let z = 0; z < D; z++) {
        const n = noise(x, z);
        // Altura base 10, variação ±7
        const h = Math.max(2, Math.min(H - 4, Math.floor(10 + n)));
        for (let y = 0; y < H; y++) {
          let type = AIR;
          if (y === h) {
            type = GRASS;
          } else if (y < h) {
            if (y < h - 3) {
              type = STONE;
            } else {
              type = DIRT;
            }
          }
            // Minérios por camada de profundidade (depth = h - y)
          const depth = h - y;
          if (type === STONE) {
            const r = Math.random();
            if (depth >= 2  && r < 0.055) type = COAL;
            else if (depth >= 4  && r < 0.025) type = IRON;
            else if (depth >= 7  && r < 0.012) type = GOLD;
            else if (depth >= 10 && r < 0.005) type = DIAMOND;
          }
          // Cavernas aleatórias (apenas em camadas mais profundas)
          if (depth >= 6 && Math.random() < 0.04) type = AIR;

          this._setBlock(x, y, z, type);
        }
        // Lagos de água em terreno baixo
        if (h <= 5) {
          for (let y = h + 1; y <= 5; y++) {
            this._setBlock(x, y, z, WATER);
          }
        }
      }
    }

    // Árvores espalhadas pelo mundo
    const treeCount = 200;
    for (let t = 0; t < treeCount; t++) {
      const tx   = 3 + Math.floor(Math.random() * (W - 6));
      const tz   = 3 + Math.floor(Math.random() * (D - 6));
      const base = this._getHeightSolid(tx, tz);
      if (this._getBlock(tx, base, tz) !== GRASS) continue;
      const trunkH = 3 + Math.floor(Math.random() * 3);
      for (let i = 1; i <= trunkH; i++) this._setBlock(tx, base + i, tz, WOOD);
      // Copa
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dy = trunkH - 1; dy <= trunkH + 2; dy++) {
            if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy - trunkH) < 5) {
              const lx = tx + dx, ly = base + dy, lz = tz + dz;
              if (this._getBlock(lx, ly, lz) === AIR) {
                this._setBlock(lx, ly, lz, LEAF);
              }
            }
          }
        }
      }
    }
  }

  _getHeightSolid(x, z) {
    for (let y = this._H - 1; y >= 0; y--) {
      const b = this._getBlock(x, y, z);
      if (b !== AIR && b !== WATER) return y;
    }
    return 0;
  }

  _idx(x, y, z) {
    if (x < 0 || x >= this._W || y < 0 || y >= this._H || z < 0 || z >= this._D) return -1;
    return x + y * this._W + z * this._W * this._H;
  }

  _setBlock(x, y, z, type) {
    const i = this._idx(x, y, z);
    if (i >= 0) this._world[i] = type;
  }

  _getBlock(x, y, z) {
    const i = this._idx(x, y, z);
    return i >= 0 ? this._world[i] : AIR;
  }

  _isSolid(x, y, z) {
    const b = this._getBlock(x, y, z);
    return b !== AIR && b !== WATER;
  }

  _getHeight(x, z) {
    for (let y = this._H - 1; y >= 0; y--) {
      if (this._getBlock(x, y, z) !== AIR) return y;
    }
    return 0;
  }

  // ─────────────────────────────────────────────────────────────────────
  // SISTEMA DE CHUNKS
  // ─────────────────────────────────────────────────────────────────────
  _getChunkKey(cx, cz) { return `${cx},${cz}`; }
  _chunkOf(x, z) {
    return {
      cx: Math.floor(x / CHUNK_SIZE),
      cz: Math.floor(z / CHUNK_SIZE),
    };
  }

  _rebuildNearbyChunks(playerX, playerZ) {
    const { cx: pcx, cz: pcz } = this._chunkOf(playerX, playerZ);
    const needed = new Set();

    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
      for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++) {
        const key = this._getChunkKey(pcx + dx, pcz + dz);
        needed.add(key);
      }
    }

    // Remove chunks distantes
    for (const [key, meshList] of this._chunkMeshes) {
      if (!needed.has(key)) {
        meshList.forEach(m => {
          this.engine.scene.remove(m);
          m.geometry.dispose();
          m.material.dispose();
        });
        this._chunkMeshes.delete(key);
      }
    }

    // Adiciona chunks novos
    for (const key of needed) {
      if (!this._chunkMeshes.has(key)) {
        const [cx, cz] = key.split(',').map(Number);
        this._buildChunkMesh(cx, cz);
      }
    }
  }

  _buildChunkMesh(cx, cz) {
    const x0 = cx * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const x1 = x0 + CHUNK_SIZE;
    const z1 = z0 + CHUNK_SIZE;

    // Acumula vértices por tipo de bloco
    const typeVerts  = {}; // type -> Float32Array buffer (positions)
    const typeNorms  = {}; // type -> Float32Array buffer (normals)
    const typeCounts = {}; // type -> count de quads

    const addFace = (type, vx, vy, vz, nx, ny, nz, faceVerts) => {
      if (!typeVerts[type]) {
        typeVerts[type]  = [];
        typeNorms[type]  = [];
        typeCounts[type] = 0;
      }
      for (const [fx, fy, fz] of faceVerts) {
        typeVerts[type].push(vx + fx, vy + fy, vz + fz);
        typeNorms[type].push(nx, ny, nz);
      }
      typeCounts[type]++;
    };

    // 6 faces de um cubo: [normal, 4 vértices do quad]
    // Face Y+ (topo)
    const FACES = [
      { n: [0, 1, 0],  verts: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], // topo
        nx: 0, ny: 0, nz: -1, dx: 0, dy: 1, dz: 0 },
      { n: [0,-1, 0],  verts: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]], // fundo
        nx: 0, ny: 0, nz:  1, dx: 0, dy:-1, dz: 0 },
      { n: [0, 0,-1],  verts: [[0,1,0],[0,0,0],[1,0,0],[1,1,0]], // norte
        nx: 0, ny: 0, nz:  0, dx: 0, dy: 0, dz:-1 },
      { n: [0, 0, 1],  verts: [[1,1,1],[1,0,1],[0,0,1],[0,1,1]], // sul
        nx: 0, ny: 0, nz:  0, dx: 0, dy: 0, dz: 1 },
      { n: [-1,0, 0],  verts: [[0,1,1],[0,0,1],[0,0,0],[0,1,0]], // oeste
        nx: 0, ny: 0, nz:  0, dx:-1, dy: 0, dz: 0 },
      { n: [ 1,0, 0],  verts: [[1,1,0],[1,0,0],[1,0,1],[1,1,1]], // leste
        nx: 0, ny: 0, nz:  0, dx: 1, dy: 0, dz: 0 },
    ];

    const faceNormals = [
      [0, 1, 0], [0,-1, 0], [0, 0,-1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]
    ];
    const faceDelta = [
      [0, 1, 0], [0,-1, 0], [0, 0,-1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]
    ];
    const faceVerts = [
      [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], // +Y
      [[0,0,1],[1,0,1],[1,0,0],[0,0,0]], // -Y
      [[0,1,0],[0,0,0],[1,0,0],[1,1,0]], // -Z
      [[1,1,1],[1,0,1],[0,0,1],[0,1,1]], // +Z
      [[0,1,1],[0,0,1],[0,0,0],[0,1,0]], // -X
      [[1,1,0],[1,0,0],[1,0,1],[1,1,1]], // +X
    ];

    for (let bx = x0; bx < x1; bx++) {
      for (let bz = z0; bz < z1; bz++) {
        for (let by = 0; by < this._H; by++) {
          const b = this._getBlock(bx, by, bz);
          if (b === AIR) continue;

          for (let f = 0; f < 6; f++) {
            const [ddx, ddy, ddz] = faceDelta[f];
            const nb = this._getBlock(bx + ddx, by + ddy, bz + ddz);
            // Mostra face se vizinho é AR ou ÁGUA (e o bloco atual não é ÁGUA)
            // Para ÁGUA, mostra face apenas se vizinho é AR
            const show = b === WATER
              ? nb === AIR
              : (nb === AIR || nb === WATER);
            if (!show) continue;

            const [fn0, fn1, fn2] = faceNormals[f];
            const fv = faceVerts[f];
            addFace(b, bx, by, bz, fn0, fn1, fn2, fv);
          }
        }
      }
    }

    const meshList = [];

    for (const [typeStr, verts] of Object.entries(typeVerts)) {
      const type  = parseInt(typeStr);
      const norms = typeNorms[type];
      const count = typeCounts[type]; // número de quads

      // Cada quad = 4 vértices → 2 triângulos (winding CCW para normais corretas)
      const indices = [];
      for (let q = 0; q < count; q++) {
        const base = q * 4;
        indices.push(base+2, base+1, base, base+3, base+2, base);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setAttribute('normal',   new THREE.Float32BufferAttribute(norms, 3));
      geo.setIndex(indices);

      const isWater = type === WATER;
      const mat = new THREE.MeshLambertMaterial({
        color:      BLOCK_COLORS[type],
        transparent: isWater,
        opacity:     isWater ? 0.65 : 1,
        depthWrite:  !isWater,
        side:        isWater ? THREE.DoubleSide : THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow    = false;
      mesh.receiveShadow = false;
      this.engine.scene.add(mesh);
      meshList.push(mesh);
    }

    const key = this._getChunkKey(cx, cz);
    this._chunkMeshes.set(key, meshList);
  }

  _rebuildChunkAt(x, z) {
    const { cx, cz } = this._chunkOf(x, z);
    const key = this._getChunkKey(cx, cz);
    // Remove mesh antigo
    if (this._chunkMeshes.has(key)) {
      const meshList = this._chunkMeshes.get(key);
      meshList.forEach(m => {
        this.engine.scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      this._chunkMeshes.delete(key);
    }
    this._buildChunkMesh(cx, cz);

    // Reconstruir chunks limítrofes se necessário
    const localX = x - cx * CHUNK_SIZE;
    const localZ = z - cz * CHUNK_SIZE;
    if (localX === 0)               this._rebuildChunkOnly(cx - 1, cz);
    if (localX === CHUNK_SIZE - 1)  this._rebuildChunkOnly(cx + 1, cz);
    if (localZ === 0)               this._rebuildChunkOnly(cx, cz - 1);
    if (localZ === CHUNK_SIZE - 1)  this._rebuildChunkOnly(cx, cz + 1);
  }

  _rebuildChunkOnly(cx, cz) {
    const key = this._getChunkKey(cx, cz);
    if (!this._chunkMeshes.has(key)) return;
    const meshList = this._chunkMeshes.get(key);
    meshList.forEach(m => {
      this.engine.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this._chunkMeshes.delete(key);
    this._buildChunkMesh(cx, cz);
  }

  // ─────────────────────────────────────────────────────────────────────
  // ANIMAIS (MOBS PASSIVOS)
  // ─────────────────────────────────────────────────────────────────────
  _spawnAnimals() {
    const animalDefs = [
      { name: 'vaca',   color: 0x8B4513, w: 0.8, h: 1.2, d: 0.6, speed: 1.5, count: 6 },
      { name: 'ovelha', color: 0xeeeeee, w: 0.7, h: 0.9, d: 0.6, speed: 1.8, count: 7 },
      { name: 'galinha',color: 0xffffff, w: 0.4, h: 0.5, d: 0.4, speed: 2.5, count: 8, erratic: true },
    ];

    for (const def of animalDefs) {
      for (let i = 0; i < def.count; i++) {
        const ax = 20 + Math.random() * (WORLD_W - 40);
        const az = 20 + Math.random() * (WORLD_D - 40);
        const ay = this._getHeightSolid(Math.floor(ax), Math.floor(az));
        if (ay <= 0) continue;
        if (this._getBlock(Math.floor(ax), ay, Math.floor(az)) !== GRASS) continue;

        const geo = new THREE.BoxGeometry(def.w, def.h, def.d);
        const mat = new THREE.MeshLambertMaterial({ color: def.color });
        // Galinha tem crista vermelha
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(ax, ay + def.h / 2, az);
        this.engine.scene.add(mesh);

        const animal = {
          mesh,
          type:   def.name,
          height: def.h,
          speed:  def.speed,
          dirX:   Math.random() - 0.5,
          dirZ:   Math.random() - 0.5,
          timer:  Math.random() * 2,
          erratic: !!def.erratic,
        };
        this._animals.push(animal);
      }
    }
  }

  _updateAnimals(dt) {
    const px = this._pos.x;
    const pz = this._pos.z;

    for (const animal of this._animals) {
      animal.timer -= dt;
      if (animal.timer <= 0) {
        const interval = animal.erratic
          ? 0.5 + Math.random() * 1.5
          : 1.5 + Math.random() * 2.5;
        animal.timer = interval;
        animal.dirX = (Math.random() - 0.5) * 2;
        animal.dirZ = (Math.random() - 0.5) * 2;
      }

      // Fuga do jogador
      const dx = animal.mesh.position.x - px;
      const dz = animal.mesh.position.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 4 && dist > 0.01) {
        animal.dirX = dx / dist;
        animal.dirZ = dz / dist;
        animal.timer = 0.5; // muda direção logo depois
      }

      // Normalizar direção
      const dlen = Math.sqrt(animal.dirX * animal.dirX + animal.dirZ * animal.dirZ);
      if (dlen > 0.01) {
        animal.dirX /= dlen;
        animal.dirZ /= dlen;
      }

      const spd = animal.speed * dt;
      const nx = animal.mesh.position.x + animal.dirX * spd;
      const nz = animal.mesh.position.z + animal.dirZ * spd;

      // Verificar limites do mundo
      if (nx < 1 || nx >= WORLD_W - 1 || nz < 1 || nz >= WORLD_D - 1) {
        animal.dirX = -animal.dirX;
        animal.dirZ = -animal.dirZ;
        continue;
      }

      // Verificar se há chão na nova posição
      const groundY = this._getHeightSolid(Math.floor(nx), Math.floor(nz));
      if (groundY >= 0 && Math.abs(groundY - (animal.mesh.position.y - animal.height / 2)) <= 1.5) {
        animal.mesh.position.x = nx;
        animal.mesh.position.z = nz;
        animal.mesh.position.y = groundY + animal.height / 2;
        // Rotaciona para a direção de movimento
        animal.mesh.rotation.y = Math.atan2(animal.dirX, animal.dirZ);
      } else {
        // Sem chão: muda direção
        animal.dirX = (Math.random() - 0.5) * 2;
        animal.dirZ = (Math.random() - 0.5) * 2;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // ZUMBIS (INIMIGOS NOTURNOS)
  // ─────────────────────────────────────────────────────────────────────
  _spawnZombie() {
    // Spawn longe do jogador, mas dentro do mundo
    const angle = Math.random() * Math.PI * 2;
    const dist  = 20 + Math.random() * 15;
    const ax    = Math.max(5, Math.min(WORLD_W - 5, this._pos.x + Math.cos(angle) * dist));
    const az    = Math.max(5, Math.min(WORLD_D - 5, this._pos.z + Math.sin(angle) * dist));
    const ay    = this._getHeightSolid(Math.floor(ax), Math.floor(az));
    if (ay <= 0) return;

    const geo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2d7a2d });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(ax, ay + 0.9, az);
    this.engine.scene.add(mesh);

    this._zombies.push({ mesh, hp: 10, speed: 1.8 });
  }

  _updateZombies(dt) {
    for (let i = this._zombies.length - 1; i >= 0; i--) {
      const z = this._zombies[i];
      // Move em direção ao jogador
      const dx = this._pos.x - z.mesh.position.x;
      const dz = this._pos.z - z.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.01) {
        const nx = z.mesh.position.x + (dx / dist) * z.speed * dt;
        const nz = z.mesh.position.z + (dz / dist) * z.speed * dt;
        const ay = this._getHeightSolid(Math.floor(nx), Math.floor(nz));
        z.mesh.position.x = nx;
        z.mesh.position.z = nz;
        if (ay >= 0) z.mesh.position.y = ay + 0.9;
        z.mesh.rotation.y = Math.atan2(dx, dz);
      }

      // Dano ao jogador se muito próximo
      if (dist < 1.2) {
        this._hp = Math.max(0, this._hp - 4 * dt);
        this._updateInventoryHUD();
      }

      // Remove zumbis que saíram muito do mundo ou durante o dia
      if (this._dayTime < 0.45 || this._dayTime > 0.95) {
        // É dia — zumbis "morrem"
        this.engine.scene.remove(z.mesh);
        z.mesh.geometry.dispose();
        z.mesh.material.dispose();
        this._zombies.splice(i, 1);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // CICLO DIA/NOITE
  // ─────────────────────────────────────────────────────────────────────
  _updateDayNight(dt) {
    this._dayTime = (this._dayTime + dt / DAY_CYCLE) % 1;
    const t = this._dayTime;

    // Interpolação de cor: 0 = amanhecer (laranja), 0.25 = dia (azul), 0.5 = anoitecer, 0.75 = noite
    let r, g, b;
    if (t < 0.25) {
      // Amanhecer → Dia
      const k = t / 0.25;
      r = lerp(1.0, 0.53, k);
      g = lerp(0.5, 0.81, k);
      b = lerp(0.2, 0.92, k);
    } else if (t < 0.5) {
      // Dia → Anoitecer
      const k = (t - 0.25) / 0.25;
      r = lerp(0.53, 0.8, k);
      g = lerp(0.81, 0.4, k);
      b = lerp(0.92, 0.2, k);
    } else if (t < 0.75) {
      // Anoitecer → Noite
      const k = (t - 0.5) / 0.25;
      r = lerp(0.8, 0.05, k);
      g = lerp(0.4, 0.05, k);
      b = lerp(0.2, 0.12, k);
    } else {
      // Noite → Amanhecer
      const k = (t - 0.75) / 0.25;
      r = lerp(0.05, 1.0, k);
      g = lerp(0.05, 0.5, k);
      b = lerp(0.12, 0.2, k);
    }
    this.engine.scene.background = new THREE.Color(r, g, b);

    // Luz ambiente diminui à noite
    const ambientIntensity = 0.15 + 0.65 * Math.max(0, Math.cos(t * Math.PI * 2) * 0.5 + 0.5);
    if (this._mcAmbient) this._mcAmbient.intensity = ambientIntensity;
    if (this._mcSun)     this._mcSun.intensity = Math.max(0, Math.cos(t * Math.PI * 2) * 0.8 + 0.4);

    // Spawn de zumbis à noite
    if (this._survivalMode && t > 0.5 && t < 0.95) {
      this._zombieSpawnTimer -= dt;
      if (this._zombieSpawnTimer <= 0) {
        this._zombieSpawnTimer = 20 + Math.random() * 20;
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) this._spawnZombie();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // SOBREVIVÊNCIA (fome + dano)
  // ─────────────────────────────────────────────────────────────────────
  _updateSurvival(dt) {
    if (!this._survivalMode) return;

    // Fome: -1 a cada 30s
    this._hungerTimer += dt;
    if (this._hungerTimer >= 30) {
      this._hungerTimer -= 30;
      this._hunger = Math.max(0, this._hunger - 1);
      this._updateInventoryHUD();
    }

    // Dano por fome: -0.5 HP a cada 5s quando fome = 0
    if (this._hunger <= 0) {
      this._damageTimer += dt;
      if (this._damageTimer >= 5) {
        this._damageTimer -= 5;
        this._hp = Math.max(0, this._hp - 1); // -0.5 HP = -1 ponto
        this._updateInventoryHUD();
      }
    } else {
      this._damageTimer = 0;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // POINTER LOCK
  // ─────────────────────────────────────────────────────────────────────
  _setupPointerLock() {
    const canvas = this.engine.renderer.domElement;

    this._onPointerLock = () => {
      this._pointerLocked = (document.pointerLockElement === canvas);
    };
    document.addEventListener('pointerlockchange', this._onPointerLock);

    this._onMouseMove = (e) => {
      if (!this._pointerLocked) return;
      this._yaw   += e.movementX * 0.002;
      this._pitch -= e.movementY * 0.002;
      this._pitch  = Math.max(-1.4, Math.min(1.4, this._pitch));
    };
    document.addEventListener('mousemove', this._onMouseMove);

    this._onMouseDown = (e) => {
      if (!this._pointerLocked) {
        if (!this._inventoryOpen) canvas.requestPointerLock();
        return;
      }
      if (e.button === 0) this._breakBlock();
      if (e.button === 2) this._placeBlock();
    };
    canvas.addEventListener('mousedown', this._onMouseDown);

    this._onContextMenu = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', this._onContextMenu);

    this._onKeyDown = (e) => {
      // Teclas numéricas 1-9 para hotbar
      for (let i = 1; i <= 9; i++) {
        if (e.code === `Digit${i}`) {
          this._hotbarIndex = i - 1;
          this._updateInventoryHUD();
          return;
        }
      }
      // E para abrir/fechar inventário
      if (e.code === 'KeyE') {
        this._toggleInventory();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  // ─────────────────────────────────────────────────────────────────────
  // CÂMERA
  // ─────────────────────────────────────────────────────────────────────
  _updateCamera() {
    this._cam.position.set(this._pos.x, this._pos.y + 0.6, this._pos.z);

    const cosP = Math.cos(this._pitch);
    const dx   = Math.sin(this._yaw) * cosP;
    const dy   = Math.sin(this._pitch);
    const dz   = Math.cos(this._yaw) * cosP;

    const target = new THREE.Vector3(
      this._cam.position.x + dx,
      this._cam.position.y + dy,
      this._cam.position.z + dz
    );
    this._cam.lookAt(target);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FÍSICA E MOVIMENTO
  // W = frente (na direção da câmera), S = trás, A = esquerda, D = direita
  // forward alinhado com _updateCamera: dx=sin(yaw), dz=cos(yaw)
  // ─────────────────────────────────────────────────────────────────────
  _updatePlayer(dt) {
    const inp = this.input;

    // Vetores de direção baseados no yaw da câmera
    // forward aponta para onde a câmera olha (mesmo vetor de _updateCamera)
    const forward = new THREE.Vector3( Math.sin(this._yaw), 0,  Math.cos(this._yaw));
    const right   = new THREE.Vector3( Math.cos(this._yaw), 0, -Math.sin(this._yaw));

    const vel = new THREE.Vector3();

    // Somente WASD — setas causavam confusão com os controles de câmera
    if (inp.isDown('KeyW')) vel.add(forward.clone().multiplyScalar(MOVE_SPEED));
    if (inp.isDown('KeyS')) vel.add(forward.clone().multiplyScalar(-MOVE_SPEED));
    if (inp.isDown('KeyA')) vel.sub(right.clone().multiplyScalar(MOVE_SPEED));
    if (inp.isDown('KeyD')) vel.add(right.clone().multiplyScalar(MOVE_SPEED));

    // Normaliza diagonal
    if (vel.x !== 0 || vel.z !== 0) {
      const hlen = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      vel.x = (vel.x / hlen) * MOVE_SPEED;
      vel.z = (vel.z / hlen) * MOVE_SPEED;
    }

    this._vel.x = vel.x;
    this._vel.z = vel.z;

    // Pulo
    if ((inp.justDown('Space')) && this._onGround) {
      this._vel.y = JUMP_VEL;
      this._onGround = false;
    }

    // Gravidade com limite de velocidade terminal (evita atravessar chão)
    this._vel.y -= GRAVITY * dt;
    if (this._vel.y < -20) this._vel.y = -20;

    this._moveAndCollide(dt);
  }

  _moveAndCollide(dt) {
    const pos = this._pos;

    // Move X
    pos.x += this._vel.x * dt;
    if (this._collidesWithWorld(pos)) {
      pos.x -= this._vel.x * dt;
      this._vel.x = 0;
    }

    // Move Z
    pos.z += this._vel.z * dt;
    if (this._collidesWithWorld(pos)) {
      pos.z -= this._vel.z * dt;
      this._vel.z = 0;
    }

    // Move Y
    pos.y += this._vel.y * dt;
    if (this._collidesWithWorld(pos)) {
      if (this._vel.y < 0) this._onGround = true;
      pos.y -= this._vel.y * dt;
      this._vel.y = 0;
    } else {
      this._onGround = false;
    }

    // Clampa dentro do mundo
    pos.x = Math.max(0.5, Math.min(this._W - 0.5, pos.x));
    pos.z = Math.max(0.5, Math.min(this._D - 0.5, pos.z));

    // Fell out of world
    if (pos.y < -2) {
      const sx = Math.floor(pos.x), sz = Math.floor(pos.z);
      pos.set(pos.x, this._getHeight(sx, sz) + 2, pos.z);
      this._vel.set(0, 0, 0);
    }
  }

  _collidesWithWorld(pos) {
    const hw = 0.28;
    const fy = pos.y - 0.9;
    const hy = pos.y + 0.9;

    for (let bx = Math.floor(pos.x - hw); bx <= Math.floor(pos.x + hw); bx++) {
      for (let by = Math.floor(fy); by <= Math.floor(hy); by++) {
        for (let bz = Math.floor(pos.z - hw); bz <= Math.floor(pos.z + hw); bz++) {
          if (this._isSolid(bx, by, bz)) return true;
        }
      }
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────
  // RAYCASTING
  // ─────────────────────────────────────────────────────────────────────
  _castRay() {
    const cosP = Math.cos(this._pitch);
    const dx   = Math.sin(this._yaw) * cosP;
    const dy   = Math.sin(this._pitch);
    const dz   = Math.cos(this._yaw) * cosP;

    const origin = new THREE.Vector3(this._pos.x, this._pos.y + 0.6, this._pos.z);
    const dir    = new THREE.Vector3(dx, dy, dz).normalize();

    const step = 0.05;
    const prev = new THREE.Vector3();

    for (let t = step; t < REACH; t += step) {
      const cur = origin.clone().addScaledVector(dir, t);
      const bx = Math.floor(cur.x);
      const by = Math.floor(cur.y);
      const bz = Math.floor(cur.z);

      if (this._isSolid(bx, by, bz)) {
        return {
          hit:  { x: bx, y: by, z: bz },
          prev: { x: Math.floor(prev.x), y: Math.floor(prev.y), z: Math.floor(prev.z) },
        };
      }
      prev.copy(cur);
    }
    return null;
  }

  _breakBlock() {
    const result = this._castRay();
    if (!result) return;
    const { x, y, z } = result.hit;
    const type = this._getBlock(x, y, z);
    this._setBlock(x, y, z, AIR);
    this._addToInventory(type, 1);
    this._rebuildChunkAt(x, z);
  }

  _placeBlock() {
    const result = this._castRay();
    if (!result) return;
    const { x, y, z } = result.prev;

    const px = Math.floor(this._pos.x);
    const py = Math.floor(this._pos.y);
    const pz = Math.floor(this._pos.z);
    if (x === px && (y === py || y === py - 1) && z === pz) return;

    const type = this._selectedType();
    if (type === AIR) return;

    // Verifica se tem no inventário
    const slotIdx = this._hotbarIndex;
    const slot = this._inventory[slotIdx];
    if (!slot || slot.qty <= 0) return;

    this._setBlock(x, y, z, type);
    this._removeFromInventory(slotIdx, 1);
    this._rebuildChunkAt(x, z);
  }

  // ─────────────────────────────────────────────────────────────────────
  // COORDS HUD
  // ─────────────────────────────────────────────────────────────────────
  _updateCoords() {
    if (!this._coordsLabel) return;
    const p = this._pos;
    const timeStr = this._dayTime < 0.5 ? 'Dia' : 'Noite';
    this._coordsLabel.textContent =
      `X:${p.x.toFixed(1)} Y:${p.y.toFixed(1)} Z:${p.z.toFixed(1)} | ${timeStr}`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // UPDATE PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────
  update(dt) {
    this._time += dt;

    // Sair com ESC
    if (this.input.justDown('Escape') && !this._leaving) {
      if (this._inventoryOpen) {
        this._toggleInventory();
        return;
      }
      this._leaving = true;
      document.exitPointerLock?.();
      this.manager.start('ModeScene');
      return;
    }

    this._updatePlayer(dt);
    this._updateCamera();
    this._updateCoords();

    // Reconstruir chunks ao redor do jogador (verificação periódica)
    if (Math.floor(this._time * 2) !== Math.floor((this._time - dt) * 2)) {
      this._rebuildNearbyChunks(this._pos.x, this._pos.z);
    }

    // Animais
    this._updateAnimals(dt);

    // Ciclo dia/noite
    this._updateDayNight(dt);

    // Sobrevivência
    this._updateSurvival(dt);

    // Zumbis
    if (this._survivalMode) this._updateZombies(dt);

    // Garante câmera 3D
    this.engine.camera = this._cam;
  }

  // ─────────────────────────────────────────────────────────────────────
  // DESTROY
  // ─────────────────────────────────────────────────────────────────────
  destroy() {
    document.exitPointerLock?.();

    if (this._onMouseMove)   document.removeEventListener('mousemove',         this._onMouseMove);
    if (this._onMouseDown)   this.engine.renderer.domElement.removeEventListener('mousedown', this._onMouseDown);
    if (this._onContextMenu) this.engine.renderer.domElement.removeEventListener('contextmenu', this._onContextMenu);
    if (this._onPointerLock) document.removeEventListener('pointerlockchange', this._onPointerLock);
    if (this._onKeyDown)     document.removeEventListener('keydown',           this._onKeyDown);
    if (this._resizeHandler) window.removeEventListener('resize',              this._resizeHandler);

    // Remove HUD elements
    const removeEl = (id) => { const el = document.getElementById(id); if (el) el.remove(); };
    removeEl('_mc_hud');
    removeEl('_mc_inv');
    removeEl('_mc_cross');
    removeEl('_mc_hint');
    removeEl('_mc_coords');

    this._hudEl        = null;
    this._inventoryEl  = null;
    this._crossEl      = null;
    this._hintEl       = null;
    this._coordsLabel  = null;

    // Remove chunks
    for (const [, meshList] of this._chunkMeshes) {
      meshList.forEach(m => {
        this.engine.scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
    }
    this._chunkMeshes.clear();

    // Remove animais
    for (const animal of this._animals) {
      this.engine.scene.remove(animal.mesh);
      animal.mesh.geometry.dispose();
      animal.mesh.material.dispose();
    }
    this._animals = [];

    // Remove zumbis
    for (const z of this._zombies) {
      this.engine.scene.remove(z.mesh);
      z.mesh.geometry.dispose();
      z.mesh.material.dispose();
    }
    this._zombies = [];

    // Remove iluminação
    this._objects.forEach(o => this.engine.scene.remove(o));
    this._objects = [];

    // Restaura fundo
    this.engine.scene.background = null;

    // Restaura câmera original
    this.engine.camera = this._originalCam;
  }
}

// Utilitário de interpolação linear
function lerp(a, b, t) { return a + (b - a) * t; }
