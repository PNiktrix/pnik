const CACHE_NAME = 'pniktrix-v2';

// Auto-detect base path (important for GitHub Pages subfolder)
const BASE_PATH = self.location.pathname.replace('sw.js', '');

const ASSETS_TO_CACHE = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'css/style.css',
    BASE_PATH + 'js/config.js',
    BASE_PATH + 'data/products.json'
];

// INSTALL
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// FETCH
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignore external requests
    if (url.origin !== location.origin) return;

    // IMAGE: Network-first (with cache fallback)
    if (request.destination === 'image') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, clone);
                    });
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // HTML & JS: Cache-first, fallback to network
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;

                return fetch(request)
                    .then(response => {
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, clone);
                        });

                        return response;
                    })
                    .catch(() => {
                        // fallback to correct index.html
                        return caches.match(BASE_PATH + 'index.html');
                    });
            })
        );
    }
});