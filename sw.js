const CACHE_NAME = 'dabaa-plan-v4';
// ضع هنا اسم ملف HTML الفعلي للتطبيق إن لم يكن index.html
const ASSETS = ['./', './manifest.json'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.all(
                ASSETS.map(url =>
                    cache.add(url).catch(err => console.warn('SW skip:', url, err))
                )
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    // لا تخزّن طلبات Google Apps Script، فبياناتها يجب أن تكون دائماً من الشبكة
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            const network = fetch(event.request)
                .then(resp => {
                    if (resp && resp.ok) {
                        const copy = resp.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
                    }
                    return resp;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
