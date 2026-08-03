/* ============================================================
   backgroundSync.js — إعادة مزامنة تلقائية عند عودة الإنترنت
   ------------------------------------------------------------
   المشكلة: عند انقطاع الإنترنت أثناء الحفظ، تفشل عملية المزامنة
   مع Google Sheets بصمت (fire-and-forget) ولا تُعاد المحاولة إلا
   عند حدوث تعديل جديد لاحق من المستخدم.
   الحل: الاستماع لحدث "online" في المتصفح، وعند عودة الاتصال
   نعيد إرسال الحالة الكاملة الحالية (supervisors/institutes/
   plans/settings) تلقائيًا عبر APP.storage.syncToSheetsIfEnabled().
   بما أن هذه العملية ترسل "لقطة كاملة" لكل نوع بيانات (وليست
   عمليات تراكمية)، فإعادة إرسالها آمنة تمامًا ولا تُكرر أي شيء
   (idempotent) — فلا حاجة لتخزين طابور عمليات منفصل.
   ============================================================ */
window.APP = window.APP || {};

APP.backgroundSync = (function () {

  const MIN_INTERVAL_MS = 5000; // منع إعادة محاولات متلاحقة عند تذبذب الاتصال
  let lastAttemptAt = 0;
  let initialized = false;

  function retrySyncNow(reason) {
    const now = Date.now();
    if (now - lastAttemptAt < MIN_INTERVAL_MS) return; // تجاهل إن كانت آخر محاولة قريبة جدًا
    lastAttemptAt = now;

    if (!APP.sheetsSync || !APP.sheetsSync.isEnabled()) return;
    if (!navigator.onLine) return;

    try {
      APP.storage.syncToSheetsIfEnabled();
      if (window.APP.ui) {
        try { APP.ui.info && APP.ui.info('عاد الاتصال — جارٍ إعادة مزامنة بياناتك مع Google Sheets...'); } catch (e) {}
      }
    } catch (e) {
      console.warn('backgroundSync: تعذّرت إعادة المزامنة عند عودة الاتصال', e);
    }
  }

  function init() {
    if (initialized) return; // لا نسجّل المستمع أكثر من مرة
    initialized = true;

    window.addEventListener('online', () => retrySyncNow('online-event'));

    // احتياطي: لو رجع التبويب للظهور بعد أن كان مخفيًا وكان الاتصال متاحًا،
    // نحاول أيضًا (يغطي حالات لم يُطلق فيها حدث online بشكل موثوق)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        retrySyncNow('visibility-change');
      }
    });
  }

  return { init };
})();
