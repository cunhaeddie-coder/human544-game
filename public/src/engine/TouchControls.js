// TouchControls.js — D-pad virtual + botões de ação para mobile
// Usa os elementos HTML estáticos de index.html, injeta eventos no Input via injectKey()

export class TouchControls {
  constructor(input) {
    this._input  = input;
    this._el     = document.getElementById('touch-controls');
    this._active = new Map(); // touch identifier → códigos

    const map = {
      'tc-left':    ['KeyA'],
      'tc-right':   ['KeyD'],
      'tc-up':      ['KeyW'],
      'tc-down':    ['KeyS'],
      'tc-jump':    ['KeyW', 'ArrowUp'],
      'tc-shoot':   ['Space'],
      'tc-ability': ['KeyQ'],
    };

    Object.entries(map).forEach(([id, codes]) => {
      const btn = document.getElementById(id);
      if (btn) this._bind(btn, codes);
    });
  }

  _bind(btn, codes) {
    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = e.changedTouches?.[0]?.identifier ?? 'mouse';
      this._active.set(id + '_' + btn.id, codes);
      codes.forEach(c => this._input.injectKey(c, true));
      btn.classList.add('tc-pressed');
    };

    const release = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = e.changedTouches?.[0]?.identifier ?? 'mouse';
      const key = id + '_' + btn.id;
      const held = this._active.get(key) || codes;
      held.forEach(c => this._input.injectKey(c, false));
      this._active.delete(key);
      btn.classList.remove('tc-pressed');
    };

    btn.addEventListener('touchstart',  press,   { passive: false });
    btn.addEventListener('touchend',    release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup',   release);
    btn.addEventListener('mouseleave', release);
  }

  _isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  show() {
    if (!this._el) return;
    this._el.style.display = this._isTouchDevice() ? 'flex' : 'none';
  }

  hide() { if (this._el) this._el.style.display = 'none'; }

  releaseAll() {
    this._active.forEach(codes => codes.forEach(c => this._input.injectKey(c, false)));
    this._active.clear();
    this._el?.querySelectorAll('.tc-pressed').forEach(b => b.classList.remove('tc-pressed'));
  }

  destroy() {
    this.releaseAll();
    this.hide();
  }
}
