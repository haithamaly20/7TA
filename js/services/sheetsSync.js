/* ============================================================
   sheetsSync.js — طبقة مزامنة اختيارية مع Google Sheets
   ------------------------------------------------------------
   - تُستخدم فقط إذا كان CONFIG.SCRIPT_URL غير فارغ.
   - LocalStorage يبقى مصدر الحقيقة أوفلاين دائماً؛ هذا الملف
     يزامن التغييرات في الخلفية فقط ولا يُستخدم كمصدر أساسي للبيانات.
   - جميع الاتصالات عبر Fetch API فقط، مع معالجة كاملة للأخطاء:
     انقطاع الإنترنت، انتهاء المهلة، فشل Apps Script.
   ============================================================ */
window.APP = window.APP || {};

APP.sheetsSync = (function () {
  const TIMEOUT_MS = 15000;

  function isEnabled() {
    return !!(window.CONFIG && CONFIG.SCRIPT_URL && CONFIG.SCRIPT_URL.trim());
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاتصال')), ms))
    ]);
  }

  async function request(method, params, body) {
    if (!isEnabled()) return { ok: false, error: 'غير مفعّل (SCRIPT_URL فارغ)', skipped: true };
    if (!navigator.onLine) return { ok: false, error: 'لا يوجد اتصال بالإنترنت' };

    try {
      let url = CONFIG.SCRIPT_URL;
      const opts = { method };

      if (method === 'GET') {
        const qs = new URLSearchParams(params || {}).toString();
        url += (url.includes('?') ? '&' : '?') + qs;
      } else {
        opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // يتفادى preflight CORS مع Apps Script
        opts.body = JSON.stringify(body || {});
      }

      const res = await withTimeout(fetch(url, opts), TIMEOUT_MS);
      if (!res.ok) {
        return { ok: false, error: `خطأ من الخادم (${res.status})` };
      }
      const json = await res.json();
      if (!json.ok) {
        return { ok: false, error: json.error || 'خطأ غير معروف من Google Apps Script' };
      }
      return { ok: true, data: json.data };
    } catch (err) {
      const msg = err && err.message === 'انتهت مهلة الاتصال'
        ? 'انتهت مهلة الاتصال بالخادم'
        : 'تعذر الاتصال بـ Google Sheets (تحقق من الإنترنت أو رابط Apps Script)';
      return { ok: false, error: msg };
    }
  }

  // ---------- عمليات CRUD ----------
  const read = () => request('GET', { action: 'read' });
  const search = (q) => request('GET', { action: 'search', q });
  const sort = (field, dir) => request('GET', { action: 'sort', field, dir });

  const add = (record) => request('POST', null, { action: 'add', record });
  const update = (id, record) => request('POST', null, { action: 'update', id, record });
  const remove = (id) => request('POST', null, { action: 'delete', id });

  // مزامنة دفعة كاملة لنوع معين (supervisors / institutes / plans / settings)
  const bulkSync = (type, records) => request('POST', null, { action: 'bulk_sync', type, records });

  // ---------- Hook: يُستدعى من storage.js بعد كل كتابة محلية ----------
  // fire-and-forget، لا يعطّل أي عملية محلية إن فشلت المزامنة
  function syncInBackground(type, records) {
    if (!isEnabled()) return;
    bulkSync(type, records).then((res) => {
      if (!res.ok && APP.ui) {
        APP.ui.warning('تعذّرت المزامنة مع Google Sheets', res.error);
      }
    });
  }

  return { isEnabled, read, search, sort, add, update, remove, bulkSync, syncInBackground };
})();
