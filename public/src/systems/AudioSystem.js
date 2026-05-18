// AudioSystem — sons sintéticos via Web Audio API (sem arquivos externos)
// Todos os sons são gerados proceduralmente com osciladores

let _ctx = null;
function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume se suspenso (política de autoplay do navegador)
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(freq, type, vol, dur, attack = 0.01, decay = 0) {
  try {
    const c = ctx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    if (decay > 0) osc.frequency.exponentialRampToValueAtTime(freq * decay, c.currentTime + dur);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur + 0.05);
  } catch(e) {}
}

function noise(vol, dur) {
  try {
    const c = ctx();
    const bufSize = c.sampleRate * dur;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    src.connect(gain); gain.connect(c.destination);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.start(c.currentTime);
  } catch(e) {}
}

export const Audio = {
  // ── Ações do player ─────────────────────────────────────────
  jump()       { tone(220, 'square', 0.15, 0.18, 0.01, 1.8); },
  shoot()      { tone(880, 'square', 0.08, 0.08, 0.001, 0.4); },
  shootLaser() { tone(1200, 'sawtooth', 0.12, 0.12, 0.005, 0.3); },
  shootRocket(){ tone(180, 'sawtooth', 0.18, 0.22, 0.01, 0.5); tone(90, 'sine', 0.1, 0.25, 0.01, 0.4); },

  // ── Dano / morte ────────────────────────────────────────────
  playerHit()  {
    noise(0.3, 0.12);
    tone(180, 'sine', 0.2, 0.25, 0.005, 0.3);
  },
  enemyHit()   { tone(440, 'square', 0.07, 0.06, 0.001, 0.5); },
  enemyDie()   {
    tone(440, 'square', 0.12, 0.1, 0.001, 0.3);
    setTimeout(() => tone(220, 'square', 0.1, 0.15, 0.001, 0.2), 80);
    setTimeout(() => tone(110, 'square', 0.08, 0.2, 0.001, 0.1), 180);
  },
  bossDie()    {
    [0, 60, 120, 200, 300].forEach((ms, i) => {
      setTimeout(() => {
        tone(440 - i*60, 'sawtooth', 0.15, 0.2, 0.005, 0.3);
        noise(0.2, 0.15);
      }, ms);
    });
  },

  // ── Coleta ──────────────────────────────────────────────────
  coin()       {
    tone(880, 'sine', 0.12, 0.08, 0.001);
    setTimeout(() => tone(1320, 'sine', 0.1, 0.12, 0.001), 60);
  },
  star()       {
    [0, 80, 160, 240].forEach((ms, i) => {
      setTimeout(() => tone([523, 659, 784, 1047][i], 'sine', 0.14, 0.18, 0.005), ms);
    });
  },

  // ── Checkpoint / fase ───────────────────────────────────────
  checkpoint() {
    tone(523, 'sine', 0.1, 0.15, 0.01);
    setTimeout(() => tone(659, 'sine', 0.1, 0.2, 0.01), 100);
  },
  levelUp()    {
    [0, 100, 200, 320].forEach((ms, i) => {
      setTimeout(() => tone([392, 523, 659, 784][i], 'sine', 0.16, 0.25, 0.01), ms);
    });
  },
  phaseComplete() {
    [0,80,160,240,320,400].forEach((ms,i) => {
      setTimeout(() => tone([523,659,784,880,1047,1319][i],'sine',0.18,0.3,0.01), ms);
    });
  },

  // ── Habilidade especial ─────────────────────────────────────
  abilityReady() {
    tone(880, 'sine', 0.15, 0.1, 0.01);
    setTimeout(() => tone(1320, 'sine', 0.15, 0.2, 0.01), 100);
    setTimeout(() => tone(1760, 'sine', 0.12, 0.3, 0.01), 220);
  },
  abilityUse()   {
    tone(200, 'sawtooth', 0.2, 0.05, 0.001);
    setTimeout(() => tone(400, 'sawtooth', 0.18, 0.08, 0.001), 40);
    setTimeout(() => tone(800, 'sawtooth', 0.15, 0.12, 0.001), 90);
    setTimeout(() => tone(1600,'sawtooth', 0.12, 0.2, 0.001), 150);
  },

  // ── Boss ────────────────────────────────────────────────────
  bossAlert() {
    tone(110, 'sawtooth', 0.25, 0.6, 0.02, 0.8);
    setTimeout(() => tone(147, 'sawtooth', 0.2, 0.5, 0.02, 0.8), 500);
    setTimeout(() => { tone(165, 'sawtooth', 0.3, 0.8, 0.02, 0.7); noise(0.15, 0.4); }, 1000);
  },

  // ── Humor ───────────────────────────────────────────────────
  dance() {
    // Melodia animada "Baião do guerreiro"
    const notes = [523,659,784,659,523,392,523,659,784,880,784,659,523];
    notes.forEach((n, i) => setTimeout(() => tone(n, 'square', 0.13, 0.14, 0.005), i * 130));
  },
  taunt() {
    tone(440, 'sine', 0.12, 0.1, 0.01);
    setTimeout(() => tone(494, 'sine', 0.1, 0.08, 0.01), 120);
    setTimeout(() => tone(440, 'sine', 0.1, 0.06, 0.01), 230);
    setTimeout(() => tone(330, 'sine', 0.15, 0.22, 0.01), 340);
  },
  konami() {
    // Som de conquista épica
    [0,120,240,360,480].forEach((ms,i) => {
      setTimeout(() => tone([261,329,392,523,659][i], 'triangle', 0.2, 0.35, 0.01), ms);
    });
    setTimeout(() => {
      tone(784, 'triangle', 0.25, 0.6, 0.02);
      setTimeout(() => tone(1047, 'triangle', 0.22, 1.0, 0.02), 400);
    }, 700);
  },

  // ── Menu ────────────────────────────────────────────────────
  menuClick()  { tone(660, 'sine', 0.08, 0.07, 0.001); },
  menuBack()   { tone(330, 'sine', 0.08, 0.1, 0.001, 0.5); },
  waveStart()  {
    tone(220, 'sawtooth', 0.15, 0.2, 0.01, 1.2);
    setTimeout(() => tone(330, 'sawtooth', 0.15, 0.3, 0.01), 200);
  },
};
