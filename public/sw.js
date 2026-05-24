const CACHE = 'human544-v3';

// Assets to pre-cache on install
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/src/main.js',
  '/src/scenes/MenuScene.js',
  '/src/scenes/GameScene.js',
  '/src/scenes/PVPScene.js',
  '/src/scenes/RacingScene.js',
  '/src/scenes/FootballScene.js',
  '/src/scenes/MinecraftScene.js',
  '/src/Player.js',
  '/src/Enemy.js',
  '/src/CharacterSprite.js',
  '/src/engine/ThreeEngine.js',
  '/src/engine/Physics2D.js',
  '/src/engine/TouchControls.js',
  '/src/systems/AudioSystem.js',
  '/src/systems/FXSystem.js',
  '/src/systems/ChatSystem.js',
  '/src/systems/SaveSystem.js',
  '/src/systems/NetworkSystem.js',
  '/src/enemies/BossRobot.js',
  '/src/enemies/BossDragon.js',
  '/src/enemies/BossLich.js',
  '/src/config/LevelConfig.js',
  '/src/config/EnemyTypes.js',
  // Three.js from CDN
  'https://unpkg.com/three@0.167.1/build/three.module.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Skip non-GET and socket.io requests (online play needs live connection)
  const url = e.request.url;
  if (e.request.method !== 'GET') return;
  if (url.includes('/socket.io/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful same-origin and CDN responses
        if (res.ok && (url.startsWith(self.location.origin) || url.includes('unpkg.com'))) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback: return index.html for navigation requests
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
