import * as THREE from 'three';

export const GW = 1280, GH = 720; // game resolution (HD 16:9)

export class ThreeEngine {
  constructor() {
    this.THREE = THREE;
    this.scene    = new THREE.Scene();
    // OrthographicCamera: 1 unit = 1 game pixel, no perspective distortion
    // This preserves 2D gameplay while letting objects have 3D depth via Z
    this.camera   = new THREE.OrthographicCamera(-GW/2, GW/2, GH/2, -GH/2, 0.1, 3000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.clock    = new THREE.Clock();

    this.renderer.setSize(GW, GH);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far  = 3000;
    this.sun.shadow.camera.left = -800;
    this.sun.shadow.camera.right= 800;
    this.sun.shadow.camera.top  = 600;
    this.sun.shadow.camera.bottom = -600;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this._camX = GW / 2;   // game coords of camera center
    this._camY = GH / 2;   // center vertical (360 para canvas de 720px)
    this.worldLeft  = 0;
    this.worldRight = GW;
    this._updateCamera();

    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  // ── Coordinate helpers ───────────────────────────────────
  // Game: x right, y DOWN, origin top-left
  // Three: x right, y UP → threeY = -gameY
  gx(x) { return x; }
  gy(y) { return -y; }

  // ── Camera ───────────────────────────────────────────────
  // With OrthographicCamera: camera.position = (camX, -camY, 700)
  // The frustum shows game X: (camX - GW/2) to (camX + GW/2)
  //                  game Y: (camY - GH/2) to (camY + GH/2)
  _updateCamera() {
    this.camera.position.set(this._camX, -this._camY, 700);
    this.camera.lookAt(this._camX, -this._camY, 0);
    this.sun.position.set(this._camX + 400, -this._camY + 300, 700);
    this.sun.target.position.set(this._camX, -this._camY, 0);
    this.sun.target.updateMatrixWorld();
  }

  setWorldBounds(left, right) {
    this.worldLeft  = left;
    this.worldRight = right;
  }

  followTarget(gx, gy, lerp = 0.1) {
    const halfW = GW / 2;
    const cx = Math.max(this.worldLeft + halfW, Math.min(gx, this.worldRight - halfW));
    // Vertical: softly follow player, clamped so we don't go below ground
    const cy = Math.max(200, Math.min(gy, 350));
    this._camX += (cx - this._camX) * lerp;
    this._camY += (cy - this._camY) * lerp * 0.6;
    this._updateCamera();
  }

  resetCamera() {
    this._camX = GW / 2;
    this._camY = GH / 2;   // 360 — centro do canvas
    this._updateCamera();
  }

  // ── Scene management ─────────────────────────────────────
  clearScene() {
    const rem = [];
    this.scene.traverse(o => {
      if (o === this.scene || o === this.sun || o === this.sun.target) return;
      rem.push(o);
    });
    rem.forEach(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(m => { m.map?.dispose(); m.dispose(); });
      this.scene.remove(o);
    });
  }

  // ── Factory helpers ──────────────────────────────────────
  // All positions use GAME coords (y-down)

  box(w, h, depth, color, gx, gy, gz = 0) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, depth),
      new THREE.MeshStandardMaterial({ color })
    );
    m.position.set(gx, -gy, gz);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  plane(w, h, color, gx, gy, gz, opacity = 1) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color, side: THREE.DoubleSide,
        transparent: true,
        opacity: opacity,
        depthWrite: false,   // planos de UI não bloqueiam sprites de texto
      })
    );
    m.position.set(gx, -gy, gz);
    this.scene.add(m);
    return m;
  }

  // Canvas-texture sprite (for text rendering)
  text(str, fontSize, color, gx, gy, gz = 10) {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const fs     = fontSize * 2;
    ctx.font = `bold ${fs}px monospace`;
    const tw = ctx.measureText(str).width;
    canvas.width  = Math.ceil(tw) + 24;
    canvas.height = fs + 20;
    ctx.font = `bold ${fs}px monospace`;
    const hex = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;
    ctx.fillStyle = hex;
    ctx.textBaseline = 'top';
    ctx.fillText(str, 12, 10);
    const tex = new THREE.CanvasTexture(canvas);
    const sp  = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false,
    }));
    sp.scale.set(canvas.width / 2, canvas.height / 2, 1);
    sp.position.set(gx, -gy, gz);
    this.scene.add(sp);
    return sp;
  }

  remove(obj) {
    if (!obj) return;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) [].concat(obj.material).forEach(m => { m.map?.dispose(); m.dispose(); });
    this.scene.remove(obj);
  }

  // ── Loop ─────────────────────────────────────────────────
  start(updateFn) {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      updateFn(dt);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  _resize() {
    const r = Math.min(window.innerWidth / GW, window.innerHeight / GH);
    const s = this.renderer.domElement.style;
    s.width  = GW * r + 'px';
    s.height = GH * r + 'px';
    s.position  = 'fixed';
    s.left = s.top = '50%';
    s.transform = 'translate(-50%,-50%)';
    // Sync HUD div
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.width  = GW * r + 'px';
      hud.style.height = GH * r + 'px';
      hud.style.fontSize = r + 'em';
    }
  }
}
