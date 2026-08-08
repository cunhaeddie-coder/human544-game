export const SaveSystem = {
  KEY: 'human544_v1',
  _cache: null,

  _load() {
    if (!this._cache) {
      try { this._cache = JSON.parse(localStorage.getItem(this.KEY)) || {}; }
      catch(e) { this._cache = {}; }
    }
    return this._cache;
  },
  _flush() { localStorage.setItem(this.KEY, JSON.stringify(this._cache)); },

  get(key, def = null)  { return this._load()[key] ?? def; },
  set(key, val)         { this._load()[key] = val; this._flush(); },

  // ── Moedas ─────────────────────────────────────────────────
  getCoins()            { return this.get('coins', 0); },
  addCoins(n)           { const v = this.getCoins() + n; this.set('coins', v); return v; },
  spendCoins(n)         {
    const v = this.getCoins();
    if (v < n) return false;
    this.set('coins', v - n); return true;
  },

  // ── Jogador ────────────────────────────────────────────────
  getPlayerName()       { return this.get('playerName', 'Player'); },
  setPlayerName(n)      { this.set('playerName', n.substring(0, 15)); },

  // ── Estrelas ───────────────────────────────────────────────
  collectStar(phase, id) {
    const k = `star_${phase}_${id}`;
    if (this.get(k, false)) return false;
    this.set(k, true);
    this.addMissionProgress('stars', 1);
    return true;
  },
  isStarCollected(p, id) { return this.get(`star_${p}_${id}`, false); },
  totalStars() {
    let n = 0;
    for (let p = 1; p <= 10; p++)
      for (let s = 1; s <= 3; s++)
        if (this.get(`star_${p}_${s}`, false)) n++;
    return n;
  },

  // ── Skins ──────────────────────────────────────────────────
  getUnlockedSkins()    { return this.get('skins', ['default']); },
  hasSkin(id)           { return this.getUnlockedSkins().includes(id); },
  unlockSkin(id)        {
    const s = this.getUnlockedSkins();
    if (!s.includes(id)) { s.push(id); this.set('skins', s); }
  },
  getActiveSkin()       { return this.get('activeSkin', 'default'); },
  setActiveSkin(id)     { this.set('activeSkin', id); },

  // ── Pets ───────────────────────────────────────────────────
  getUnlockedPets()     { return this.get('pets', []); },
  hasPet(id)            { return this.getUnlockedPets().includes(id); },
  unlockPet(id)         {
    const p = this.getUnlockedPets();
    if (!p.includes(id)) { p.push(id); this.set('pets', p); }
  },
  getActivePets()       { return this.get('activePets', []); },
  isActivePet(id)       { return this.getActivePets().includes(id); },
  toggleActivePet(id)   {
    const active = this.getActivePets();
    if (active.includes(id)) { this.set('activePets', active.filter(x=>x!==id)); }
    else if (active.length < 3) { active.push(id); this.set('activePets', active); }
  },
  getActivePet()        { return this.getActivePets()[0] || null; },
  setActivePet(id)      { if (!this.isActivePet(id)) this.toggleActivePet(id); },

  // ── Armas ──────────────────────────────────────────────────
  getUnlockedWeapons()  { return this.get('weapons', ['standard']); },
  hasWeapon(id)         { return this.getUnlockedWeapons().includes(id); },
  unlockWeapon(id)      {
    const w = this.getUnlockedWeapons();
    if (!w.includes(id)) { w.push(id); this.set('weapons', w); }
  },
  getActiveWeapon()     { return this.get('activeWeapon', 'standard'); },
  setActiveWeapon(id)   { this.set('activeWeapon', id); },

  // ── Itens permanentes (cap=3) ─────────────────────────────
  getItem(id, def = 0)  { return this.get(`item_${id}`, def); },
  addItem(id, max = 3)  {
    const cur = this.getItem(id);
    if (cur >= max) return false;
    this.set(`item_${id}`, cur + 1);
    return true;
  },
  isItemMaxed(id, max = 3) { return this.getItem(id) >= max; },
  hasItem(id)           { return this.getItem(id) > 0; },
  downgradeItem(id, basePrice = 0) {
    const cur = this.getItem(id);
    if (cur <= 0) return 0;
    this.set(`item_${id}`, cur - 1);
    return Math.floor(basePrice * cur * 0.5);
  },

  // ── Progresso de fase ──────────────────────────────────────
  getMaxPhase()         { return this.get('maxPhase', 1); },
  unlockPhase(n)        { if (n > this.getMaxPhase()) this.set('maxPhase', n); },

  // ── Missões / Estatísticas ─────────────────────────────────
  getStat(id)           { return this.get(`stat_${id}`, 0); },
  addMissionProgress(id, n) {
    const v = this.getStat(id) + n;
    this.set(`stat_${id}`, v);
    return v;
  },
  isMissionDone(missionId) { return this.get(`mission_done_${missionId}`, false); },
  completeMission(missionId) { this.set(`mission_done_${missionId}`, true); },

  // ── XP e Level do Personagem ──────────────────────────────────
  getXP()          { return parseInt(localStorage.getItem('playerXP')  || '0'); },
  getPlayerLevel() { return parseInt(localStorage.getItem('playerLvl') || '1'); },
  addXP(amount) {
    let xp  = SaveSystem.getXP() + amount;
    let lvl = SaveSystem.getPlayerLevel();
    const xpToNext = () => lvl * 100;          // cada nível custa lvl*100 XP
    while (xp >= xpToNext()) { xp -= xpToNext(); lvl++; }
    localStorage.setItem('playerXP',  xp);
    localStorage.setItem('playerLvl', lvl);
    return lvl;                                 // retorna novo nível (para checar level-up)
  },
  getPassiveBonus(stat) {
    const lvl = SaveSystem.getPlayerLevel();
    // Cada nível dá bônus em stats passivos
    const bonuses = {
      speed:  Math.floor((lvl-1) / 3) * 0.05,  // +5% velocidade a cada 3 níveis
      jump:   Math.floor((lvl-1) / 4) * 0.05,  // +5% pulo a cada 4 níveis
      maxhp:  Math.floor((lvl-1) / 5),          // +1 HP máximo a cada 5 níveis
      damage: Math.floor((lvl-1) / 6) * 0.1,   // +10% dano a cada 6 níveis
    };
    return bonuses[stat] || 0;
  },

  // ── Ranking de Minijogos ───────────────────────────────────────
  recordScore(game, score) {
    const key  = 'rank_' + game;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push({ score, date: Date.now() });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 10)));
  },

  getTopScores(game) {
    return JSON.parse(localStorage.getItem('rank_' + game) || '[]');
  },

  getAllRankings() {
    const games = ['football','racing','survival','targets','sumo','coinrush','dodge','kinghill','bomb','breakout','snake','colorfloor'];
    return games
      .map(g => {
        const scores = SaveSystem.getTopScores(g);
        return { game: g, best: scores[0]?.score || 0 };
      })
      .filter(r => r.best > 0)
      .sort((a, b) => b.best - a.best);
  },
};
