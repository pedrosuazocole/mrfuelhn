/**
 * SERVICE WORKER - MR. FUEL PWA
 * Cacheo básico para funcionamiento offline
 */

const CACHE_NAME = 'mrfuel-v1.0';
const CACHE_URLS = [
  '/',
  '/dashboard',
  '/css/style.css',
  '/js/main.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Archivos cacheados');
        return cache.addAll(CACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
          .catch(err => {
            console.warn('[SW] Algunos archivos no se pudieron cachear:', err);
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estrategia de cacheo: Network First, fallback a Cache
self.addEventListener('fetch', (event) => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requests de Chrome extensions y otras URLs externas
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, guardarla en cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Si no hay red, buscar en cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si no está en cache y es una navegación, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/dashboard');
            }
          });
      })
  );
});
