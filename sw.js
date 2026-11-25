/* Bump the cache version when changing the packaged pages or assets. */
const cachePrefix = `salao-da-fortuna:${self.registration.scope}:`;
const version = `${cachePrefix}v2`;
const files = [
  './', 'index.html', 'vinte-e-um.html', 'roleta-do-tigre.html', 'tesouros-do-oceano.html',
  'manifest.webmanifest', 'css/style.css', 'css/casino.css', 'css/lobby.css', 'css/roulette.css', 'css/slots.css',
  'img/blackjack-table.png', 'img/roulette-table.png', 'img/ocean-preview.svg', 'img/fortuna-192.png', 'img/fortuna-512.png',
  'lib/three.global.js', 'js/art.js', 'js/casino-render.js', 'js/coins.js', 'js/common.js', 'js/game.js',
  'js/lobby.js', 'js/logic.js', 'js/quality.js', 'js/roulette.js', 'js/roulette-logic.js', 'js/sfx.js',
  'js/slots.js', 'js/slots-art.js', 'js/slots-audio.js', 'js/slots-logic.js', 'js/slots-scene.js', 'js/wallet.js', 'js/pwa.js'
];
const assets = new Set(files.map(file => new URL(file, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(version).then(cache => cache.addAll(
    [...assets].map(url => new Request(url, { cache: 'reload' }))
  )));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== version).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  if (!assets.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(version);
    return await cache.match(url.href) || fetch(event.request);
  })());
});
