const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path    = require('path');
const os      = require('os');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// Remove o aviso do ngrok no browser ("You are about to visit...")
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Salas ─────────────────────────────────────────────────────────
// rooms: { code: { players:{id:{x,y,flip,anim,name}}, host } }
const rooms = {};

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join(''); }
  while (rooms[code]);
  return code;
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
const PORT = process.env.PORT || 3000;

// ── Detecção automática do ngrok ──────────────────────────────────
let NGROK_URL = null;

function detectNgrok() {
  const req = http.get('http://localhost:4040/api/tunnels', { timeout: 2000 }, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const tunnel = json.tunnels?.find(t => t.proto === 'https') || json.tunnels?.[0];
        if (tunnel?.public_url) {
          NGROK_URL = tunnel.public_url;
          console.log(`\n🌐 Ngrok detectado: ${NGROK_URL}\n`);
        }
      } catch(e) {}
    });
  });
  req.on('error', () => {}); // ngrok offline — sem problema
}

// Detecta ngrok na inicialização e a cada 30s
setTimeout(detectNgrok, 1500);
setInterval(detectNgrok, 30000);

// ── Conexão ───────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[+] ${socket.id}`);
  let currentRoom = null;

  // Criar sala
  socket.on('createRoom', ({ name }, cb) => {
    const code = genCode();
    rooms[code] = { players: {}, host: socket.id };
    rooms[code].players[socket.id] = { x:100, y:400, flip:false, anim:'idle', name: name||'Player' };
    socket.join(code);
    currentRoom = code;
    cb({ ok:true, code, players: rooms[code].players });
    console.log(`Sala criada: ${code} por ${socket.id}`);
  });

  // Entrar em sala
  socket.on('joinRoom', ({ code, name }, cb) => {
    const room = rooms[code];
    if (!room) { cb({ ok:false, error:'Sala não encontrada' }); return; }
    if (Object.keys(room.players).length >= 10) { cb({ ok:false, error:'Sala cheia (máx 10)' }); return; }
    room.players[socket.id] = { x:200, y:400, flip:false, anim:'idle', name: name||'Player' };
    socket.join(code);
    currentRoom = code;
    // Notifica outros
    socket.to(code).emit('playerJoined', { id:socket.id, ...room.players[socket.id] });
    cb({ ok:true, code, players: room.players });
    console.log(`${socket.id} entrou na sala ${code}`);
  });

  // Movimento
  socket.on('move', data => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const p = rooms[currentRoom].players[socket.id];
    if (!p) return;
    p.x = data.x; p.y = data.y; p.flip = data.flip; p.anim = data.anim;
    socket.to(currentRoom).emit('playerMoved', { id:socket.id, ...data });
  });

  // Checkpoint
  socket.on('checkpoint', data => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('playerCheckpoint', { id:socket.id, ...data });
  });

  // Host inicia o jogo — transmite para toda a sala
  socket.on('startGame', data => {
    if (!currentRoom || !rooms[currentRoom]) return;
    if (rooms[currentRoom].host !== socket.id) return;
    const level = data?.level || 1;
    const scene = data?.scene || 'GameScene';
    const mode  = data?.mode  || 'online';
    const playerCount = Object.keys(rooms[currentRoom]?.players || {}).length || 1;
    // Modo raid: inclui playerCount no broadcast para escalar HP do boss
    if (mode === 'raid') {
      io.to(currentRoom).emit('startGame', { level, scene, mode, code: currentRoom, playerCount });
    } else {
      io.to(currentRoom).emit('startGame', { level, scene, mode, code: currentRoom });
    }
    console.log(`Sala ${currentRoom} iniciou: ${scene} nível ${level} modo ${mode}`);
  });

  // Votação de mapa
  socket.on('voteMap', data => {
    if (!currentRoom || !rooms[currentRoom]) return;
    if (!rooms[currentRoom].votes) rooms[currentRoom].votes = {};
    rooms[currentRoom].votes[socket.id] = data.mapIdx;
    io.to(currentRoom).emit('votesUpdated', {
      votes:   rooms[currentRoom].votes,
      players: Object.keys(rooms[currentRoom].players || {}).length,
    });
  });

  // Host confirma mapa mais votado e inicia
  socket.on('startWithVote', data => {
    if (!currentRoom || !rooms[currentRoom]) return;
    if (rooms[currentRoom].host !== socket.id) return;
    const votes = rooms[currentRoom].votes || {};
    const tally = {};
    Object.values(votes).forEach(v => { tally[v] = (tally[v] || 0) + 1; });
    const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
    io.to(currentRoom).emit('startGame', { ...data, map: parseInt(winner), code: currentRoom });
    rooms[currentRoom].votes = {};
    console.log(`Sala ${currentRoom} iniciou com voto: ${data.scene} mapa ${winner}`);
  });

  // Chat rápido (emotes)
  socket.on('emote', data => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('playerEmote', { id:socket.id, emote: data.emote });
  });

  // Chat de texto — relay para a sala com nome do remetente
  socket.on('chatMsg', ({ text, name }) => {
    if (!currentRoom || !text) return;
    const safe = String(text).slice(0, 120).replace(/</g, '&lt;');
    io.to(currentRoom).emit('chatMsg', { name: name || 'Player', text: safe, id: socket.id });
  });

  // PVP online — relay de estado e balas entre 2 jogadores
  socket.on('pvpState', data => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('pvpState', data);
  });
  socket.on('pvpBullet', data => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('pvpBullet', data);
  });

  // Minecraft — bloco quebrado/colocado, relay para a sala
  socket.on('mcBlockChange', data => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('mcBlockChange', data);
  });

  // Kill sync — inimigo morreu, relay para todos na sala
  socket.on('enemyKilled', data => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('enemyKilled', { id: data.id });
  });

  // Coop switch — jogador pressionou um interruptor cooperativo
  socket.on('coopSwitch', data => {
    if (!currentRoom) return;
    if (!rooms[currentRoom]) return;
    if (!rooms[currentRoom].switches) rooms[currentRoom].switches = {};
    rooms[currentRoom].switches[data.switchId] = data.activated;
    io.to(currentRoom).emit('coopSwitchState', { switchId: data.switchId, activated: data.activated });
  });

  // Solicitar informações do servidor (IP local + URL ngrok)
  socket.on('getRoomCode', (_, cb) => {
    cb({
      code:     currentRoom || null,
      ip:       LOCAL_IP,
      port:     PORT,
      ngrokUrl: NGROK_URL || null,
    });
  });

  // Listar salas públicas
  socket.on('listRooms', (_, cb) => {
    const list = Object.entries(rooms).map(([code, r]) => ({
      code, players: Object.keys(r.players).length,
    }));
    cb(list);
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    if (!currentRoom || !rooms[currentRoom]) return;
    delete rooms[currentRoom].players[socket.id];
    io.to(currentRoom).emit('playerLeft', socket.id);
    if (Object.keys(rooms[currentRoom].players).length === 0) {
      delete rooms[currentRoom];
      console.log(`Sala ${currentRoom} fechada`);
    } else if (rooms[currentRoom].host === socket.id) {
      // Passa host para próximo player
      rooms[currentRoom].host = Object.keys(rooms[currentRoom].players)[0];
    }
    currentRoom = null;
  });
});

server.listen(PORT, () => {
  console.log(`\n🎮 HUMAN 544 Server`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${LOCAL_IP}:${PORT}`);
  console.log(`\n   Outros dispositivos na mesma rede podem jogar em:`);
  console.log(`   http://${LOCAL_IP}:${PORT}\n`);
});
