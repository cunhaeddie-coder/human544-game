export class Input {
  constructor() {
    this._held     = new Set();  // teclas físicas pressionadas
    this._virtual  = new Set();  // teclas virtuais (touch)
    this._justDown = new Set();
    this._justUp   = new Set();

    window.addEventListener('keydown', e => {
      if (!this._held.has(e.code)) {
        this._held.add(e.code);
        this._justDown.add(e.code);
      }
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
        e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this._held.delete(e.code);
      this._justUp.add(e.code);
    });
  }

  // Injetado pelos controles touch
  injectKey(code, pressed) {
    if (pressed) {
      if (!this._virtual.has(code) && !this._held.has(code)) {
        this._justDown.add(code); // dispara "just pressed" uma vez
      }
      this._virtual.add(code);
    } else {
      if (this._virtual.has(code)) {
        this._virtual.delete(code);
        if (!this._held.has(code)) this._justUp.add(code);
      }
    }
  }

  isDown(code)   { return this._held.has(code) || this._virtual.has(code); }
  justDown(code) { return this._justDown.has(code); }
  justUp(code)   { return this._justUp.has(code); }

  get left()     { return this.isDown('ArrowLeft')  || this.isDown('KeyA'); }
  get right()    { return this.isDown('ArrowRight') || this.isDown('KeyD'); }
  get up()       { return this.isDown('ArrowUp')    || this.isDown('KeyW'); }
  get down()     { return this.isDown('ArrowDown')  || this.isDown('KeyS'); }

  get jumpDown() { return this.justDown('ArrowUp') || this.justDown('KeyW'); }
  get shootDown(){ return this.justDown('Space'); }

  flush() { this._justDown.clear(); this._justUp.clear(); }
}
