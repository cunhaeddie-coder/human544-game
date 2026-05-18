// Network.js — Multiplayer online com salas e código de acesso
// O import do socket.io é DINÂMICO para não quebrar quando offline

export class Network {
  constructor(socket) {
    this.socket     = socket;
    this.roomCode   = null;
    this.serverIP   = null;
    this._isHost    = false;   // flag interna booleana
    this._roomHost  = null;    // socket.id do host da sala
    this.myName     = 'Player';
    this._players   = {};      // id → { name, x, y }
    this._scene     = null;    // GameScene — para addRemotePlayer etc.
    this._lastSend  = 0;
  }

  /** Retorna true se este cliente é o host da sala atual */
  get isHost() {
    return () => !!(this.roomCode && this._isHost);
  }

  // ── Criação de sala ────────────────────────────────────────────
  createRoom(playerName = 'Player') {
    this.myName = playerName;
    return new Promise(resolve => {
      this.socket.emit('createRoom', { name: playerName }, res => {
        if (res.ok) {
          this.roomCode  = res.code;
          this._isHost   = true;
          this._roomHost = this.socket.id;
          this._players  = res.players || {};
        }
        resolve(res);
      });
    });
  }

  // ── Entrada em sala ────────────────────────────────────────────
  joinRoom(code, playerName = 'Player') {
    this.myName = playerName;
    return new Promise(resolve => {
      this.socket.emit('joinRoom',
        { code: code.trim().toUpperCase(), name: playerName },
        res => {
          if (res.ok) {
            this.roomCode  = res.code;
            this._isHost   = false;
            this._roomHost = null;
            this._players  = res.players || {};
          }
          resolve(res);
        }
      );
    });
  }

  // ── IP / info do servidor ─────────────────────────────────────
  getRoomInfo() {
    return new Promise(resolve => {
      this.socket.emit('getRoomCode', {}, res => {
        if (res) {
          this.serverIP  = res.ip;
          this.ngrokUrl  = res.ngrokUrl || null;
        }
        resolve(res || {});
      });
    });
  }

  // ── Eventos de sala (OnlineScene usa isso) ────────────────────
  //  callbacks: { onJoined(data), onLeft(id), onStartGame(data) }
  bindRoom(callbacks = {}) {
    this.socket.off('playerJoined');
    this.socket.off('playerLeft');
    this.socket.off('startGame');

    this.socket.on('playerJoined', data => {
      this._players[data.id] = data;
      callbacks.onJoined?.(data);
    });
    this.socket.on('playerLeft', id => {
      delete this._players[id];
      callbacks.onLeft?.(id);
    });
    this.socket.on('startGame', data => {
      callbacks.onStartGame?.(data);
    });
  }

  // ── Host inicia a partida ─────────────────────────────────────
  startGame(level = 1, scene = 'GameScene', mode = 'online') {
    this.socket.emit('startGame', { level, scene, mode });
  }

  // ── Votação de mapa ──────────────────────────────────────────
  voteMap(mapIdx) {
    this.socket.emit('voteMap', { mapIdx });
  }

  startWithVote(level, scene, mode) {
    this.socket.emit('startWithVote', { level, scene, mode });
  }

  onVotesUpdated(cb) {
    this.socket.off('votesUpdated');
    this.socket.on('votesUpdated', cb);
  }

  // ── Eventos de jogo (GameScene usa isso) ─────────────────────
  bindScene(scene) {
    this._scene = scene;
    this.socket.off('playerJoined');
    this.socket.off('playerLeft');
    this.socket.off('startGame');

    this.socket.on('playerJoined', data => {
      this._players[data.id] = data;
      this._scene?.addRemotePlayer?.(data.id, data);
    });
    this.socket.on('playerMoved', data => {
      this._scene?.moveRemotePlayer?.(data.id, data);
    });
    this.socket.on('playerLeft', id => {
      delete this._players[id];
      this._scene?.removeRemotePlayer?.(id);
    });
  }

  // ── Envio de posição (throttle 30fps) ────────────────────────
  sendMove(data) {
    const now = Date.now();
    if (now - this._lastSend < 33) return;
    this._lastSend = now;
    this.socket.emit('move', data);
  }

  sendCheckpoint(data) {
    this.socket.emit('checkpoint', data);
  }

  // ── Limpar listeners (ao sair do GameScene) ───────────────────
  destroy() {
    this.socket.off('playerJoined');
    this.socket.off('playerMoved');
    this.socket.off('playerLeft');
    this.socket.off('startGame');
    this.socket.off('votesUpdated');
    this._scene = null;
  }

  // ── Lista de jogadores na sala ────────────────────────────────
  getPlayers() { return Object.values(this._players); }
}

// ── Singleton lazy ─────────────────────────────────────────────
let _instance = null;

export async function getNetwork() {
  if (_instance) return _instance;
  try {
    const { io } = await import('/socket.io/socket.io.esm.min.js');
    const socket  = io({ reconnectionAttempts: 3, timeout: 5000 });
    _instance     = new Network(socket);
    return _instance;
  } catch (e) {
    console.warn('Servidor offline — multiplayer indisponível');
    return null;
  }
}

export function resetNetwork() {
  if (_instance) {
    try { _instance.socket.disconnect(); } catch(e) {}
  }
  _instance = null;
}
