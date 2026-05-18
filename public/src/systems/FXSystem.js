// FXSystem — partículas, screen shake, flash de hit, pop de coleta
import * as THREE from 'three';

export class FXSystem {
  constructor(engine) {
    this._engine   = engine;
    this._particles = [];
    this._shakeTime = 0;
    this._shakeAmp  = 0;
    this._origCamX  = 0;
    this._origCamY  = 0;
    this._flashMesh = null;
    this._t         = 0;
  }

  // ── Explosão de partículas coloridas ao matar inimigo ─────────
  spawnDeathBurst(x, y, color = 0xff4400, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle  = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed  = 80 + Math.random() * 140;
      const size   = 4 + Math.random() * 8;
      const life   = 0.4 + Math.random() * 0.4;
      const mesh   = this._engine.box(size, size, size, color, x, y, 12);
      mesh.material.emissive = new THREE.Color(color);
      mesh.material.emissiveIntensity = 0.8;
      this._particles.push({
        mesh, life, maxLife: life,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        x, y, gravity: 220,
      });
    }
  }

  // ── Pop de coleta (moeda/estrela) — expansão e fade ───────────
  spawnCollectPop(x, y, color = 0xffd700) {
    const mesh = this._engine.box(24, 24, 24, color, x, y, 15);
    mesh.material.transparent = true;
    mesh.material.emissive = new THREE.Color(color);
    mesh.material.emissiveIntensity = 1;
    this._particles.push({
      mesh, life: 0.4, maxLife: 0.4,
      vx: 0, vy: -80, x, y, gravity: 0,
      scale: true,
    });
  }

  // ── Flash branco de hit no inimigo ────────────────────────────
  spawnHitFlash(x, y) {
    const mesh = this._engine.box(20, 20, 10, 0xffffff, x, y, 14);
    mesh.material.transparent = true;
    mesh.material.emissive = new THREE.Color(0xffffff);
    mesh.material.emissiveIntensity = 1;
    this._particles.push({
      mesh, life: 0.15, maxLife: 0.15,
      vx: 0, vy: 0, x, y, gravity: 0,
    });
  }

  // ── Screen shake ───────────────────────────────────────────────
  shake(amplitude = 8, duration = 0.3) {
    this._shakeAmp  = amplitude;
    this._shakeTime = duration;
  }

  // ── Flash de tela (vermelho ao tomar dano) ────────────────────
  flashScreen(color = 0xff0000, alpha = 0.35, duration = 0.2) {
    if (this._flashMesh) this._engine.remove(this._flashMesh);
    this._flashMesh = this._engine.box(1400, 800, 2, color, 640, 360, 200);
    this._flashMesh.material.transparent = true;
    this._flashMesh.material.opacity = alpha;
    setTimeout(() => {
      if (this._flashMesh) { this._engine.remove(this._flashMesh); this._flashMesh = null; }
    }, duration * 1000);
  }

  // ── Pop de texto (+50, COMBO etc.) ───────────────────────────
  spawnTextPop(x, y, text, color = 0xffd700) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; pointer-events:none; z-index:400;
      font-family:monospace; font-weight:bold; font-size:18px;
      color:#${color.toString(16).padStart(6,'0')};
      text-shadow:0 0 6px rgba(0,0,0,0.8);
      transition:transform 0.7s ease-out, opacity 0.7s ease-out;
    `;
    el.textContent = text;

    // Converter coordenada de jogo para tela
    const canvas = this._engine.renderer.domElement;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = rect.width  / 1280;
    const scaleY = rect.height / 720;
    const sx = rect.left + (x - this._engine._camX + 640) * scaleX;
    const sy = rect.top  + (-((-y - this._engine._camY) + 360)) * scaleY;
    el.style.left = `${sx}px`;
    el.style.top  = `${sy}px`;

    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform   = 'translateY(-50px)';
      el.style.opacity     = '0';
    });
    setTimeout(() => el.remove(), 700);
  }

  // ── Update por frame ──────────────────────────────────────────
  update(dt) {
    this._t += dt;

    // Screen shake
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      const s = this._shakeAmp * (this._shakeTime > 0 ? 1 : 0);
      this._engine._camOffsetX = (Math.random() - 0.5) * s;
      this._engine._camOffsetY = (Math.random() - 0.5) * s;
    } else {
      this._engine._camOffsetX = 0;
      this._engine._camOffsetY = 0;
    }

    // Partículas
    this._particles = this._particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) { this._engine.remove(p.mesh); return false; }
      const pct = p.life / p.maxLife;

      p.vy += p.gravity * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.mesh.position.set(p.x, -p.y, 12);
      p.mesh.material.opacity = pct;
      if (p.scale) {
        const s = 1 + (1 - pct) * 2;
        p.mesh.scale.setScalar(s);
      }
      return true;
    });
  }

  destroy() {
    this._particles.forEach(p => this._engine.remove(p.mesh));
    this._particles = [];
    if (this._flashMesh) this._engine.remove(this._flashMesh);
  }
}
