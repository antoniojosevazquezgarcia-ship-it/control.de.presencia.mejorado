const CACHE_NAME = 'cp-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/logo192.png',
  '/logo512.png',
  '/favicon.png'
];

// Instalar el Service Worker y almacenar en caché los recursos estáticos básicos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar el SW y limpiar las cachés antiguas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y servir desde caché si es posible
self.addEventListener('fetch', (e) => {
  // Solo interceptar peticiones de nuestro origen y de tipo GET para evitar fallos con Apps Script POST
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // Guardar en caché copias de nuevos recursos estáticos que vayamos pidiendo
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback offline silencioso
      });
    })
  );
});
