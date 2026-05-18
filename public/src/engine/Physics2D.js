// Simple 2D AABB arcade physics — replaces Phaser.Physics.Arcade
// All coordinates: x/y = top-left corner, y increases downward (Phaser-style)

export class Body {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround   = false;
    this.allowGravity = true;
    this.oneway     = false; // platform passable from below
    this.enabled    = true;
    this.userData   = null;
  }
  get right()  { return this.x + this.w; }
  get bottom() { return this.y + this.h; }
  get cx()     { return this.x + this.w / 2; }
  get cy()     { return this.y + this.h / 2; }
  setSize(w, h, ox = 0, oy = 0) { this.w = w; this.h = h; }
}

export class Physics2D {
  constructor() {
    this.gravity = 600;
    this._bodies  = [];   // dynamic
    this._statics = [];   // ground + platforms
    this._bounds  = { left:0, right:9999, bottom:9999 };
  }

  setGravity(g)    { this.gravity = g; }
  // bottom = soft floor (bodies pushed back up) — kill plane handled in GameScene
  setWorldBounds(l, r, b) { this._bounds = { left:l, right:r, bottom: b ?? 9999 }; }

  addBody(b)   { this._bodies.push(b);  return b; }
  addStatic(b) { b.onGround = false; this._statics.push(b); return b; }

  remove(b) {
    this._bodies  = this._bodies.filter(x => x !== b);
    this._statics = this._statics.filter(x => x !== b);
  }

  clear() { this._bodies = []; this._statics = []; }

  step(dt) {
    for (const b of this._bodies) {
      if (!b.enabled) continue;
      if (b.allowGravity) b.vy += this.gravity * dt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // World horizontal bounds
      if (b.x < this._bounds.left)              { b.x = this._bounds.left; b.vx = 0; }
      if (b.right > this._bounds.right)         { b.x = this._bounds.right - b.w; b.vx = 0; }

      b.onGround = false;

      for (const s of this._statics) {
        if (!s.enabled) continue;
        if (!this._overlap(b, s)) continue;

        // One-way: only resolve if body was above the surface last frame
        if (s.oneway && (b.vy < 0 || b.y + b.h - b.vy * dt > s.y + 4)) continue;

        const ox = Math.min(b.right - s.x, s.right - b.x);
        const oy = Math.min(b.bottom - s.y, s.bottom - b.y);

        if (ox < oy) {
          b.x += b.cx < s.cx ? -(ox) : ox;
          b.vx = 0;
        } else {
          if (b.cy < s.cy) { b.y = s.y - b.h; b.vy = 0; b.onGround = true; }
          else             { b.y = s.bottom;   b.vy = 0; }
        }
      }

      // World bottom (kill plane)
      if (b.y > this._bounds.bottom) { b.y = this._bounds.bottom - b.h; b.vy = 0; b.onGround = true; }
    }
  }

  _overlap(a, b) {
    return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
  }

  overlaps(a, b) { return this._overlap(a, b); }

  findOverlap(body, list) { return list.find(s => s.enabled && this._overlap(body, s)); }
  anyOverlap(body, list)  { return list.some(s => s.enabled && this._overlap(body, s)); }
}
