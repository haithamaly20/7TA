/*
  Service Worker — خطة موجهي الضبعة
  ------------------------------------------------------------
  الاستراتيجية:
    - Cache First لكل الأصول الثابتة (HTML/CSS/JS/Icons) بعد أول زيارة.
    - عند فشل الشبكة لأي طلب تنقّل (navigation)، تُعرض offline.html.
    - Cache Versioning: يعتمد على CONFIG.CACHE_VERSION في js/config.js —
      أي تحديث لهذه القيمة يُنشئ كاش جديداً ويحذف الكاش القديم تلقائياً
      (Auto Update عند تحميل صفحة جديدة + استدعاء skipWaiting/clients.claim).
*/

// نفس مصدر الحقيقة الوحيد لرقم النسخة المستخدم في بقية التطبيق
importScripts('./js/config.js');

const CACHE_VERSION = (self.CONFIG && self.CONFIG.CACHE_VERSION) || '1.0.0';
const CACHE_NAME = `daba-plan-cache-v${CACHE_VERSION}`;

// جذر المشروع نسبي (relative) ليعمل تحت أي مسار فرعي على GitHub Pages
const SCOPE = self.registration.scope;

const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './favicon.ico',

  './css/variables.css',
  './css/style.css',
  './css/sidebar.css',
  './css/navbar.css',
  './css/cards.css',
  './css/buttons.css',
  './css/tables.css',
  './css/forms.css',
  './css/dialogs.css',
  './css/notifications.css',
  './css/print.css',
  './css/responsive.css',

  './js/config.js',
  './js/utils/helpers.js',
  './js/utils/validation.js',
  './js/services/storage.js',
  './js/services/sheetsSync.js',
  './js/services/search.js',
  './js/services/statistics.js',
  './js/services/printing.js',
  './js/services/reports.js',
  './js/services/importExport.js',
  './js/modules/ui.js',
  './js/modules/theme.js',
  './js/modules/supervisors.js',
  './js/modules/institutes.js',
  './js/modules/planner.js',
  './js/modules/router.js',
  './js/app.js',

  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// ---------------- Install: تحميل كل الأصول مسبقاً ----------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // Auto Update: لا ننتظر إغلاق كل التبويبات
      .catch((err) => console.error('[SW] فشل التخزين المسبق:', err))
  );
});

// ---------------- Activate: حذف الكاش القديم عند تغيّر النسخة ----------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('daba-plan-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ---------------- Fetch: Cache First + fallback للصفحة أوفلاين ----------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // نتعامل فقط مع طلبات GET من نفس الأصل (same-origin)
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }

  // طلبات التنقل بين الصفحات (فتح التطبيق نفسه)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then((cached) => cached || caches.match('./index.html'))
            .then((cached) => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  // باقي الأصول: Cache First مع تحديث الكاش في الخلفية عند توفر الشبكة
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // لا يوجد اتصال ولا كاش لهذا المورد الجديد

      return cached || networkFetch;
    })
  );
});

// ---------------- استقبال أمر تحديث فوري من الصفحة (زر "تحديث التطبيق") ----------------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
