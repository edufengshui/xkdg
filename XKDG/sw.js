// XKDG Bazi Calculator — Service Worker
// Cache-first strategy with runtime caching of new requests.

const CACHE = 'xkdg-v448';
const URLS = [
    './',
    './index.html',
    './styles.css',
    './app-bazi.js',
    './app-fengshui.js',
    './qmdj-water-scanner.js',
    './cities.js',
    './version.js',
    './manifest.webmanifest',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    './icons/apple-touch-icon.svg'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => clients.claim())
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return res;
        }))
    );
});
