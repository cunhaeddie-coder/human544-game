export class SceneManager {
  constructor(engine, input) {
    this.engine  = engine;
    this.input   = input;
    this._reg    = {};
    this._current = null;
  }

  register(name, Cls) { this._reg[name] = Cls; }

  async start(name, data = {}) {
    this._current?.destroy?.();
    this.engine.clearScene();
    this.engine.resetCamera();
    const Cls = this._reg[name];
    if (!Cls) { console.error('Scene not found:', name); return; }
    this._current = new Cls(this.engine, this, this.input);
    await this._current.create(data);
  }

  update(dt) { this._current?.update?.(dt); }
}
