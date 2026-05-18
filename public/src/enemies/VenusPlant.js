// VenusPlant.js — Planta carnívora fixa no chão
// Coordenadas: GW=1280, GH=720, y-down em game coords, y-up em Three.js
// groundY é a coordenada Y de jogo onde o chão está (ex: 508)

export class VenusPlant {
  constructor(gameScene, physics, x, groundY) {
    this._scene    = gameScene;
    this._physics  = physics;
    this._x        = x;
    this._groundY  = groundY;
    this._hp       = 3;
    this.dead      = false;

    // Estado: 'idle' | 'alert' | 'attack'
    this._state      = 'idle';
    this._stateTimer = 0;
    this._attackCD   = 0;        // cooldown restante em segundos
    this._t          = 0;        // tempo acumulado para oscilação

    // Abertura da boca: 0 = fechada, 1 = totalmente aberta
    this._mouthOpen  = 0;

    // Flag de dano na mordida (evitar dano múltiplo por ataque)
    this._hitDealt   = false;

    this._meshes = [];
    this._buildMesh();
  }

  // ── Construção visual ───────────────────────────────────────────
  _buildMesh() {
    const E   = this._scene.engine;
    const x   = this._x;
    const gy  = this._groundY;
    const gz  = 5;

    // Caule (verde escuro): centro em groundY - 30
    this._stemMesh = E.box(18, 60, 20, 0x1a5c1a, x, gy - 30, gz);
    this._meshes.push(this._stemMesh);

    // Cabeça (verde brilhante): centro em groundY - 70
    this._headMesh = E.box(44, 36, 22, 0x2d8c2d, x, gy - 70, gz);
    this._meshes.push(this._headMesh);

    // Mandíbula superior (vermelha por dentro, fixa)
    this._jawTopMesh = E.box(40, 12, 23, 0x8b0000, x, gy - 56, gz + 0.1);
    this._meshes.push(this._jawTopMesh);

    // Mandíbula inferior (abre/fecha)
    this._jawBotMesh = E.box(40, 12, 23, 0x8b0000, x, gy - 84, gz + 0.1);
    this._meshes.push(this._jawBotMesh);

    // Dentes superiores (3 boxes brancos pequenos)
    const toothOffsets = [-12, 0, 12];
    this._teethTop = toothOffsets.map(ox => {
      const m = E.box(6, 8, 24, 0xf0f0e0, x + ox, gy - 63, gz + 0.2);
      this._meshes.push(m);
      return m;
    });

    // Dentes inferiores (3 boxes brancos pequenos)
    this._teethBot = toothOffsets.map(ox => {
      const m = E.box(6, 8, 24, 0xf0f0e0, x + ox, gy - 77, gz + 0.2);
      this._meshes.push(m);
      return m;
    });

    // Olhos (2 pequenos boxes amarelos)
    this._eyeL = E.box(7, 7, 24, 0xffee00, x - 12, gy - 74, gz + 0.3);
    this._eyeR = E.box(7, 7, 24, 0xffee00, x + 12, gy - 74, gz + 0.3);
    this._meshes.push(this._eyeL, this._eyeR);
  }

  // ── Interface pública ───────────────────────────────────────────
  get health() { return this._hp; }
  get x()      { return this._x; }
  get y()      { return this._groundY - 60; }

  takeDamage(dmg = 1) {
    if (this.dead) return;
    this._hp -= dmg;
    if (this._hp <= 0) this._die();
  }

  // ── Update principal ────────────────────────────────────────────
  update(player, dt) {
    if (this.dead) return;

    this._t        += dt;
    this._attackCD  = Math.max(0, this._attackCD - dt);
    this._stateTimer += dt;

    // Distâncias ao jogador (game coords)
    const dx  = Math.abs(player.x - this._x);
    const dy  = Math.abs(player.y - this._groundY);   // groundY ≈ nível do chão

    // ── Máquina de estados ──────────────────────────────────────
    switch (this._state) {

      case 'idle':
        if (dx < 180) {
          this._setState('alert');
        } else {
          // Oscilação suave: boca abre e fecha lentamente
          this._mouthOpen = 0.18 + Math.sin(this._t * 1.2) * 0.18;
        }
        break;

      case 'alert':
        if (dx >= 180) {
          this._setState('idle');
          break;
        }
        // Boca abre rapidamente
        this._mouthOpen = Math.min(1, this._mouthOpen + dt * 4);

        // Vibração leve na cabeça
        if (this._headMesh) {
          const shake = (Math.random() - 0.5) * 2;
          this._headMesh.position.x = this._x + shake;
        }

        // Entra em ataque se jogador muito perto
        if (dx < 80 && dy < 200 && this._attackCD <= 0) {
          this._setState('attack');
        }
        break;

      case 'attack':
        // Animação de mordida: boca fecha rapidamente
        this._mouthOpen = Math.max(0, this._mouthOpen - dt * 8);

        // Dano no pico da mordida (quando quase fechada)
        if (!this._hitDealt && this._mouthOpen < 0.15) {
          this._hitDealt = true;
          const pdx = Math.abs(player.x - this._x);
          const pdy = Math.abs(player.y - this._groundY);
          if (pdx < 60 && pdy < 180) {
            player.takeDamage(1);
          }
        }

        // Após 0.6s reabre e volta a alert/idle
        if (this._stateTimer > 0.6) {
          this._attackCD = 1.8;
          this._hitDealt = false;
          this._setState(dx < 180 ? 'alert' : 'idle');
        }
        break;
    }

    this._applyAnimation();
  }

  // ── Animação dos meshes ─────────────────────────────────────────
  _applyAnimation() {
    const gy = this._groundY;

    // Mandíbula inferior: fecha (sobe) quando mouthOpen=0, abre (desce) quando =1
    // mouthOpen=0 → jawBot em gy-84 (boca fechada, dentes tocando)
    // mouthOpen=1 → jawBot em gy-96 (boca totalmente aberta)
    const jawBotGameY = (gy - 84) - this._mouthOpen * 12;
    if (this._jawBotMesh) {
      this._jawBotMesh.position.set(this._x, -jawBotGameY, this._jawBotMesh.position.z);
    }

    // Dentes inferiores acompanham a mandíbula
    const teethBotGameY = (gy - 77) - this._mouthOpen * 12;
    this._teethBot?.forEach(t => {
      if (t) t.position.set(t.position.x, -teethBotGameY, t.position.z);
    });

    // Olhos: piscam em alert/attack
    if (this._state === 'alert' || this._state === 'attack') {
      const blink = Math.sin(this._t * 12) > 0.7;
      const eyeColor = blink ? 0xff4400 : 0xffee00;
      if (this._eyeL?.material) this._eyeL.material.color.setHex(eyeColor);
      if (this._eyeR?.material) this._eyeR.material.color.setHex(eyeColor);
    } else {
      if (this._eyeL?.material) this._eyeL.material.color.setHex(0xffee00);
      if (this._eyeR?.material) this._eyeR.material.color.setHex(0xffee00);
    }

    // Cabeça levemente inclina durante ataque
    if (this._headMesh) {
      if (this._state === 'attack') {
        this._headMesh.rotation.z = Math.sin(this._t * 20) * 0.08;
      } else {
        this._headMesh.rotation.z *= 0.85; // retorna ao normal
      }
    }
  }

  // ── Mudança de estado ───────────────────────────────────────────
  _setState(newState) {
    this._state      = newState;
    this._stateTimer = 0;
    this._hitDealt   = false;
  }

  // ── Morte ───────────────────────────────────────────────────────
  _die() {
    this.dead = true;
    this.destroy();
  }

  destroy() {
    const E = this._scene.engine;
    this._meshes.forEach(m => { if (m) E.remove(m); });
    this._meshes = [];
    this._stemMesh = null;
    this._headMesh = null;
    this._jawTopMesh = null;
    this._jawBotMesh = null;
    this._teethTop = [];
    this._teethBot = [];
    this._eyeL = null;
    this._eyeR = null;
  }
}
