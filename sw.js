// ============================================================
// XKDG Bazi Calculator — Service Worker
// Strategia "set and forget": NETWORK FIRST
// ============================================================
//
// COSA FA:
//   • HTML / JS / CSS / manifest / JSON  → NETWORK FIRST
//       Il browser prova sempre prima la rete; usa la cache
//       SOLO se è offline. Quindi ogni volta che apri l'app
//       online, vedi l'ULTIMA versione pubblicata, qualsiasi
//       file sia cambiato.
//
//   • Immagini (svg/png/jpg/webp/ico)   → CACHE FIRST
//       Servite dalla cache se ci sono (veloce); altrimenti
//       scaricate e cacheate. Cambiano raramente.
//
//   • Offline → tutti i file usati almeno una volta restano
//       in cache, quindi l'app continua a funzionare senza rete.
//
//   • Aggiornamento → automatico al prossimo caricamento online.
//
// MANUTENZIONE: zero.
//   • Niente liste URLS da aggiornare quando aggiungi/togli file.
//   • Niente "?v=475" da bumpare nell'index.html.
//   • Niente "CACHE = 'xkdg-vXXX'" da incrementare qui sotto.
//   • Quando aggiungi/modifichi un file, fai push e basta.
//
// Se in futuro vuoi forzare TUTTI i dispositivi a buttare via
// la cache (es. dopo un bug grave), cambia il valore di CACHE
// sotto (qualsiasi stringa va bene). Al successivo accesso
// online di ogni studente, il vecchio cache viene cancellato
// e la tab viene ricaricata automaticamente.
//
// ============================================================

const CACHE = 'xkdg-app-v2';

// ── Install: niente precache, take over immediatamente ──────────
self.addEventListener('install', () => {
    self.skipWaiting();
});

// ── Activate: pulisce cache vecchie, claim, ricarica tab ───────
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
            .then(() => {
                // Avvisa le tab aperte: nuovo SW attivo, ricaricati
                return self.clients.matchAll({ type: 'window' }).then(tabs => {
                    tabs.forEach(tab => {
                        try { tab.navigate(tab.url); } catch(_){}
                    });
                });
            })
    );
});

// ── Fetch handler ───────────────────────────────────────────────
self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;

    let url;
    try { url = new URL(req.url); } catch(_){ return; }

    // Salta richieste cross-origin (es. lunar-javascript da CDN)
    if (url.origin !== self.location.origin) return;

    const isImage = /\.(svg|png|jpe?g|webp|gif|ico)$/i.test(url.pathname);

    if (isImage) {
        // ── CACHE FIRST per immagini ──
        e.respondWith(
            caches.match(req).then(hit => {
                if (hit) return hit;
                return fetch(req).then(res => {
                    if (res && res.ok){
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
                    }
                    return res;
                });
            })
        );
    } else {
        // ── NETWORK FIRST per HTML/JS/CSS/manifest/ecc. ──
        // cache:'no-store' obbliga il fetch a colpire SEMPRE la rete reale,
        // saltando anche la cache HTTP interna del browser: così, quando sei
        // online, è impossibile ricevere byte vecchi. Se offline, fetch fallisce
        // e si ricade sulla cache nostra (caches.match) per far funzionare l'app.
        e.respondWith(
            fetch(req, { cache: 'no-store' })
                .then(res => {
                    if (res && res.ok){
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
                    }
                    return res;
                })
                .catch(() => caches.match(req))
        );
    }
});
