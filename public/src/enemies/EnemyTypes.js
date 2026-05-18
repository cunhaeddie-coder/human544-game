// Three.js enemy definitions — color, size, stats, AI
export const ENEMY_DEFS = {
  // ── Etapa A ──────────────────────────────────────────────
  slime:       { hp:  80, speed:  80, reward:  5, ai:'patrol',      gravity:true,  color:0x44aa44, w:32, h:28, d:24 },
  bee:         { hp:  70, speed: 110, reward:  8, ai:'fly_patrol',  gravity:false, color:0xffaa00, w:28, h:22, d:20 },
  mushroom:    { hp: 140, speed:  70, reward: 10, ai:'jump_patrol', gravity:true,  color:0xaa4422, w:34, h:36, d:24 },
  spider:      { hp: 100, speed:  95, reward: 10, ai:'fly_patrol',  gravity:false, color:0x332244, w:30, h:26, d:20 },
  golem:       { hp: 350, speed:  45, reward: 20, ai:'patrol',      gravity:true,  color:0x668866, w:40, h:44, d:28 },
  bat:         { hp: 100, speed: 140, reward: 10, ai:'sine_fly',    gravity:false, color:0x550066, w:28, h:22, d:18 },
  wolf:        { hp: 140, speed: 210, reward: 15, ai:'charge',      gravity:true,  color:0x886644, w:36, h:30, d:22 },
  yeti:        { hp: 280, speed:  55, reward: 25, ai:'shooter',     gravity:true,  color:0xaaddff, w:40, h:46, d:28 },
  drone:       { hp: 200, speed: 120, reward: 20, ai:'follow',      gravity:false, color:0x4444aa, w:32, h:20, d:22 },
  shield_bot:  { hp: 300, speed:  70, reward: 30, ai:'patrol',      gravity:true,  color:0x6688aa, w:38, h:42, d:28, shield:true },
  // ── Etapa B ──────────────────────────────────────────────
  shadow:      { hp: 140, speed: 160, reward: 20, ai:'teleport',    gravity:false, color:0x220033, w:30, h:42, d:20 },
  witch:       { hp: 200, speed:  45, reward: 30, ai:'shooter',     gravity:true,  color:0x6633aa, w:28, h:44, d:22 },
  toad:        { hp: 140, speed:  95, reward: 15, ai:'jump_attack', gravity:true,  color:0x335533, w:36, h:32, d:24 },
  croc:        { hp: 280, speed: 250, reward: 25, ai:'charge',      gravity:true,  color:0x225522, w:42, h:30, d:26 },
  fire_slime:  { hp: 140, speed:  75, reward: 18, ai:'patrol',      gravity:true,  color:0xff4400, w:32, h:28, d:24, emissive:0x441100 },
  fire_bat:    { hp: 130, speed: 120, reward: 18, ai:'sine_fly',    gravity:false, color:0xff6600, w:28, h:22, d:18, emissive:0x441100 },
  ice_golem:   { hp: 480, speed:  50, reward: 35, ai:'shooter',     gravity:true,  color:0x88bbdd, w:42, h:46, d:30 },
  frost_wolf:  { hp: 200, speed: 240, reward: 30, ai:'charge',      gravity:true,  color:0x8899cc, w:36, h:30, d:22 },
  dragon_guard:{ hp: 550, speed: 170, reward: 40, ai:'patrol',      gravity:true,  color:0x882200, w:38, h:44, d:28, emissive:0x220800 },
  // ── Etapas C-J (geradas proceduralmente) ─────────────────
  ghost:       { hp: 100, speed: 100, reward: 15, ai:'follow',      gravity:false, color:0xaaaaff, w:28, h:36, d:20 },
  shooter:     { hp: 200, speed:  60, reward: 25, ai:'shooter',     gravity:true,  color:0xff8844, w:34, h:38, d:24 },
  shield:      { hp: 280, speed:  70, reward: 30, ai:'patrol',      gravity:true,  color:0x4466cc, w:38, h:42, d:28, shield:true },
  flier:       { hp: 160, speed: 130, reward: 20, ai:'follow',      gravity:false, color:0xcc44aa, w:32, h:28, d:20 },
};
