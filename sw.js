/*
============================================================
 Service Worker - خطة موجهي الضبعة
============================================================
الخصائص:
✔ يعمل بدون إنترنت (Offline First)
✔ تحديث تلقائي للإصدارات
✔ حذف الكاش القديم
✔ متوافق مع GitHub Pages
✔ متوافق مع Google Sheets
✔ Cache Versioning
============================================================
*/

importScripts("./js/config.js");

const CACHE_VERSION =
  (self.CONFIG && self.CONFIG.CACHE_VERSION) || "1.0.0";

const CACHE_NAME = `dabaa-supervisors-plan-v${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./favicon.ico",

  "./css/variables.css",
  "./css/style.css",
  "./css/sidebar.css",
  "./css/navbar.css",
  "./css/cards.css",
  "./css/buttons.css",
  "./css/tables.css",
  "./css/forms.css",
  "./css/dialogs.css",
  "./css/notifications.css",
  "./css/print.css",
  "./css/responsive.css",

  "./js/config.js",
  "./js/utils/helpers.js",
  "./js/utils/validation.js",

  "./js/services/storage.js",
  "./js/services/sheetsSync.js",
  "./js/services/search.js",
  "./js/services/statistics.js",
  "./js/services/printing.js",
  "./js/services/reports.js",
  "./js/services/importExport.js",

  "./js/modules/ui.js",
  "./js/modules/theme.js",
  "./js/modules/supervisors.js",
  "./js/modules/institutes.js",
  "./js/modules/planner.js",
  "./js/modules/router.js",

  "./js/app.js",

  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

/* ==========================================================
   INSTALL
========================================================== */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        console.error("[SW] Precache Error:", err);
      })
  );
});

/* ==========================================================
   ACTIVATE
========================================================== */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("dabaa-supervisors-plan-v") &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ==========================================================
   FETCH
========================================================== */

self.addEventListener("fetch", (event) => {
  const req = event.request;

  /* لا نتعامل إلا مع GET */
  if (req.method !== "GET") return;

  /* لا يتم تخزين Google Apps Script */
  if (
    req.url.includes("script.google.com") ||
    req.url.includes("script.googleusercontent.com")
  ) {
    return;
  }

  /* الطلبات الخارجية الأخرى */
  if (!req.url.startsWith(self.location.origin)) {
    return;
  }

  /* صفحات الموقع */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, clone);
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ||
            (await caches.match("./index.html")) ||
            (await caches.match("./offline.html"))
          );
        })
    );

    return;
  }

  /* الملفات الثابتة */

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, clone);
            });
          }

          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

/* ==========================================================
   MESSAGE
========================================================== */

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
