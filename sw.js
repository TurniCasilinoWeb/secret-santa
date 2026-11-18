// Rende l'app installabile e più veloce: tiene in memoria sul telefono foto, suoni e pagine.
// Le richieste allo script del foglio Google NON passano di qui: vanno sempre in rete.
// Se modifichi il sito, aumenta il numero di VERSIONE: così i telefoni scaricano i file nuovi.
const VERSIONE = 'secret-santa-3';

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // I suoni li gestisce direttamente il browser (Safari su iPhone li vuole così).
  if (/\.mp3$/.test(url.pathname)) return;

  // Pagine e codice: prima la rete (così vedi sempre l'ultima versione), la copia salvata se sei offline.
  if (e.request.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copia = r.clone(); caches.open(VERSIONE).then((c) => c.put(e.request, copia)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Foto, suoni e icone: la copia salvata se c'è (molto più veloce), altrimenti la rete.
  e.respondWith(
    caches.match(e.request).then((salvata) => salvata || fetch(e.request).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSIONE).then((c) => c.put(e.request, copia)); }
      return r;
    }))
  );
});
