// Помощник приложения: с ним Chrome ставит ленту как приложение на Surface и планшет.
// Файлы всегда берёт из сети, без сети показывает offline.html. Своих роликов не хранит.
// Номер V равен версии в js/versions.js (тест). Удаляет только свои старые копии: адрес общий с другими приложениями.
const V = 'kaleido-0.3';
const KEEP = ['offline.html', 'base.css', 'img/znak.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(KEEP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kaleido-') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).catch(() => caches.match('offline.html')));
    return;
  }
  e.respondWith(fetch(r).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || Response.error())));
});
