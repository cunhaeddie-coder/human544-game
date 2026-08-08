// ── Encontro narrativo: HUMAN 545 ────────────────────────────────
// Vinheta de diálogo curta (sem combate) — primeira aparição do
// rival antes dele começar a aparecer de verdade nas fases/bosses.
// Clique ou ENTER avança · ESC pula

export class Rival545Scene {
  constructor(e, m, i){
    this.e = e; this.m = m; this.inp = i;
    this._idx = 0;
  }

  create(){
    this.e.plane(1280, 720, 0x0a0a14, 640, 360, -400);
    this.e.text('???', 40, 0x552244, 640, 260, 2);

    this._lines = [
      { speaker:'???', text:'Então é você. O 544.', col:'#ff6a5f' },
      { speaker:'544', text:'Quem é você?', col:'#4488ff' },
      { speaker:'???', text:'Alguém que devia ter sido descartado antes de você.', col:'#ff6a5f' },
      { speaker:'545', text:'Eles vão te testar até você quebrar. Comigo, quebraram.', col:'#ff6a5f' },
      { speaker:'545', text:'Continue se eles deixarem. Eu vou continuar observando.', col:'#ff6a5f' },
      { speaker:'545', text:'...a gente se vê de novo, 544.', col:'#ff6a5f' },
    ];
    this._buildBox();
    this._render();
  }

  _buildBox(){
    this._box = document.createElement('div');
    this._box.style.cssText = 'position:fixed;left:50%;bottom:60px;transform:translateX(-50%);width:800px;max-width:88vw;' +
      'background:rgba(6,4,10,.92);border:2px solid #332e47;border-radius:10px;padding:20px 26px;' +
      'font-family:monospace;color:#eee;z-index:800;cursor:pointer;';
    document.body.appendChild(this._box);
    this._box.onclick = () => this._advance();
  }

  _render(){
    const l = this._lines[this._idx];
    this._box.innerHTML = `<div style="font-weight:900;font-size:13px;margin-bottom:8px;color:${l.col};">${l.speaker}</div>` +
      `<div style="font-size:13px;line-height:1.6;">${l.text}</div>` +
      `<div style="margin-top:12px;font-size:9px;opacity:.5;text-align:right;">clique ou ENTER pra continuar (${this._idx + 1}/${this._lines.length})</div>`;
  }

  _advance(){
    this._idx++;
    if (this._idx >= this._lines.length){ this._end(); return; }
    this._render();
  }

  _end(){
    this._box?.remove(); this._box = null;
    this.m.start('ModeScene');
  }

  update(){
    if (this.inp.justDown('Enter') || this.inp.justDown('Space')) this._advance();
    if (this.inp.justDown('Escape')) this._end();
  }

  destroy(){
    this._box?.remove(); this._box = null;
  }
}
