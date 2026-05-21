// XKDG Bazi Calculator — Service Worker
// Strategy:
//   - index.html + root: Network-first (always check for updates, fallback to cache)
//   - JS/CSS with ?v= query: Cache-first (version bump guarantees new URL = new fetch)
//   - Static assets (icons, images): Cache-first
//   - On activate: notify all open tabs to reload so users always see latest version

const CACHE = 'xkdg-v475';
const URLS = [
    './',
    './index.html',
    './styles.css',
    './app-bazi.js',
    './app-fengshui.js',
    './flying-stars.js',
    './qmdj-water-scanner.js',
    './cities.js',
    './version.js',
    './manifest.webmanifest',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    './icons/apple-touch-icon.svg',
    './icons/luopan.jpg'
];

// Files that should always be fetched from network first
function isNetworkFirst(url) {
    const u = new URL(url);
    return u.pathname.endsWith('/') ||
           u.pathname.endsWith('/index.html') ||
           u.pathname === '/';
}

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
            .then(() => {
                // Tell all open tabs to reload so they get the new version immediately
                return clients.matchAll({ type: 'window' }).then(tabs => {
                    tabs.forEach(tab => tab.navigate(tab.url));
                });
            })
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;

    // Only handle GET requests
    if (req.method !== 'GET') return;

    if (isNetworkFirst(req.url)) {
        // Network-first: try network, fall back to cache
        e.respondWith(
            fetch(req)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(req, clone));
                    return res;
                })
                .catch(() => caches.match(req))
        );
    } else {
        // Cache-first: serve from cache; if not found fetch and cache it
        e.respondWith(
            caches.match(req).then(cached => {
                if (cached) return cached;
                return fetch(req).then(res => {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(req, clone));
                    return res;
                });
            })
        );
    }
});
