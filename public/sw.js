/*
 * Service worker do jogo.
 *
 * Estrategia por tipo de arquivo:
 * - navegacao (index.html): network-first, com o cache como rede de seguranca
 *   offline. Garante que um deploy novo aparece no primeiro carregamento.
 * - /assets/* (bundle com hash no nome): cache-first. O nome muda a cada build,
 *   entao nunca serve versao velha.
 * - resto (arte, icones, manifest): stale-while-revalidate. Abre instantaneo e
 *   atualiza em segundo plano.
 *
 * BUILD_ID e trocado no build (ver vite.config.ts): cada deploy limpa o cache
 * anterior sozinho.
 */
const BUILD_ID = '__BUILD_ID__';
const CACHE = `profundezas-${BUILD_ID}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  const copy = response.clone();
  caches.open(CACHE).then((c) => c.put(request, copy));
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Documento: rede primeiro.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => putInCache(req, res))
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match('./index.html') || caches.match('./'))
        )
    );
    return;
  }

  // Bundle com hash: o cache e sempre valido.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => putInCache(req, res)))
    );
    return;
  }

  // Arte e demais estaticos: serve do cache e revalida atras.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => putInCache(req, res))
        .catch(() => hit);
      return hit || network;
    })
  );
});
