/* ============================================================
   cloudRestore.js — استرجاع تلقائي للبيانات من Google Sheets
   الإصدار 1.1.1
   ------------------------------------------------------------
   يُستدعى مرة واحدة عند الإقلاع، بعد APP.storage.load() مباشرة.
   إذا كانت قاعدة البيانات المحلية فارغة (جهاز جديد / بيانات
   مفقودة) يحاول تحميل آخر نسخة من Google Sheets وإعادة بناء
   قاعدة البيانات المحلية منها. لا يفعل شيئًا إذا كانت هناك
   بيانات محلية بالفعل، أو إذا كانت المزامنة غير مفعّلة، أو إذا
   فشل الاتصال — في كل هذه الحالات يستمر التطبيق بشكل طبيعي.
   الإصلاح 1.1.1: الدمج القادم من الشيت (syncFromCloud) يُحفظ
   محليًا بخيار {sync:false} لقطع الحلقة العكسية — ما سُحب من
   الشيت لا يُدفع إليه فورًا في نفس اللحظة.
   ============================================================ */
window.APP = window.APP || {};

APP.cloudRestore = (function () {

  const LAST_SYNC_KEY = 'dabaa_last_cloud_sync_at';

  // آخر وقت مزامنة ناجحة معروف (يُستخدم لطلب الصفوف الأحدث فقط من الخادم)
  function getLastSyncAt() {
    try { return localStorage.getItem(LAST_SYNC_KEY) || null; }
    catch (e) { return null; }
  }
  function setLastSyncAt(iso) {
    try { localStorage.setItem(LAST_SYNC_KEY, iso); }
    catch (e) { /* تجاهل بأمان إن فشل التخزين */ }
  }

  // أحدث updatedAt من بين مجموعة صفوف قادمة من Sheets (يُستخدم كمرجع زمني دقيق
  // بدل الاعتماد على ساعة الجهاز المحلي، لتقليل أثر فروق التوقيت بين الأجهزة)
  function maxUpdatedAt(rows) {
    let max = null;
    (rows || []).forEach(r => {
      if (!r || !r.updatedAt) return;
      if (!max || new Date(r.updatedAt) > new Date(max)) max = r.updatedAt;
    });
    return max;
  }

  // هل قاعدة البيانات المحلية فارغة فعليًا (بدون أي بيانات حقيقية)؟
  function isLocalDBEmpty(db) {
    if (!db) return true;
    const hasSupervisors = Array.isArray(db.supervisors) && db.supervisors.length > 0;
    const hasInstitutes = Array.isArray(db.institutes) && db.institutes.length > 0;
    const hasPlans = db.plans && Object.keys(db.plans).length > 0;
    return !hasSupervisors && !hasInstitutes && !hasPlans;
  }

  // تحويل حقل "data" القادم من الصف إلى كائن JS
  // (قد يصل كسلسلة JSON أو ككائن جاهز، حسب تنفيذ Apps Script)
  function parseRowData(raw) {
    if (raw == null) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('cloudRestore: تعذّر تحليل بيانات أحد الصفوف القادمة من Sheets', e);
      return null;
    }
  }

  // بناء قاعدة بيانات جديدة من الصفوف القادمة من Google Sheets
  function buildDBFromRows(rows) {
    const newDB = APP.storage.defaultDB();
    let foundAny = false;

    (rows || []).forEach(row => {
      const type = row && row.type;
      const parsed = parseRowData(row && row.data);
      if (!type || parsed == null) return;

      switch (type) {
        case 'supervisors':
        case 'supervisor':
          newDB.supervisors.push(parsed);
          foundAny = true;
          break;
        case 'institutes':
        case 'institute':
          newDB.institutes.push(parsed);
          foundAny = true;
          break;
        case 'plans':
        case 'plan':
          // يُخزَّن ككائن الخطط بالكامل تحت سجل واحد (id: 'plans')
          Object.assign(newDB.plans, parsed);
          foundAny = true;
          break;
        case 'settings':
        case 'setting':
          Object.assign(newDB.settings, parsed);
          foundAny = true;
          break;
        default:
          // نوع غير معروف: يُتجاهل بأمان
          break;
      }
    });

    return { newDB, foundAny };
  }

  // الدالة الرئيسية: تُستدعى عند الإقلاع
  async function restoreIfNeeded() {
    const currentDB = APP.storage.getDB();

    // 1) توجد بيانات محلية بالفعل → لا داعي للاسترجاع
    if (!isLocalDBEmpty(currentDB)) {
      return false;
    }

    // 2) المزامنة غير مفعّلة (لا يوجد SCRIPT_URL) → لا يمكن الاسترجاع
    if (!APP.sheetsSync || !APP.sheetsSync.isEnabled()) {
      return false;
    }

    if (window.APP.ui) {
      // إشعار بسيط اختياري أثناء المحاولة (لا يوقف الإقلاع إن لم تتوفر واجهة ui)
      try { APP.ui.info && APP.ui.info('جارٍ استرجاع البيانات من Google Sheets...'); } catch (e) {}
    }

    // 3) طلب البيانات من Google Sheets
    const res = await APP.sheetsSync.read();

    if (!res || !res.ok) {
      console.warn('cloudRestore: تعذّر الاتصال بـ Google Sheets، سيستمر التطبيق بقاعدة بيانات فارغة محليًا.', res && res.error);
      return false;
    }

    const rows = Array.isArray(res.data) ? res.data : [];
    if (!rows.length) {
      // لا توجد بيانات في الشيت أيضًا (أول تشغيل حقيقي للمشروع)
      return false;
    }

    // 4) بناء قاعدة بيانات جديدة من الصفوف
    const { newDB, foundAny } = buildDBFromRows(rows);
    if (!foundAny) {
      return false;
    }

    // 5) استبدال قاعدة البيانات المحلية بالكامل، ثم الحفظ محليًا
    APP.storage.replaceDB(newDB, {sync:false});

    // تسجيل مرجع زمني دقيق لآخر مزامنة، لاستخدامه لاحقًا في المزامنة التدريجية
    setLastSyncAt(maxUpdatedAt(rows) || new Date().toISOString());

    if (window.APP.ui) {
      try { APP.ui.success && APP.ui.success('تم الاسترجاع', 'تم استرجاع بياناتك من Google Sheets بنجاح'); } catch (e) {}
    }

    return true;
  }

  // ---------- المزامنة الذكية التدريجية (بعد الإقلاع، بغض النظر هل القاعدة فارغة أم لا) ----------
  // تسحب فقط الصفوف الأحدث من آخر مزامنة (Timestamp Comparison)، ثم تدمجها محليًا
  // عبر APP.storage.mergeDB (دمج بالـ id، وليس استبدالاً كاملاً) — بحيث لا تُفقد
  // أي تعديلات محلية حديثة لم تُدفع بعد إلى Sheets.
  async function syncFromCloud() {
    if (!APP.sheetsSync || !APP.sheetsSync.isEnabled()) return false;

    const since = getLastSyncAt();
    const res = since
      ? await APP.sheetsSync.readSince(since)
      : await APP.sheetsSync.read();

    if (!res || !res.ok) {
      console.warn('cloudRestore.syncFromCloud: تعذّر جلب التحديثات من Google Sheets', res && res.error);
      return false;
    }

    const rows = Array.isArray(res.data) ? res.data : [];
    if (!rows.length) {
      // لا يوجد جديد منذ آخر مزامنة — هذا طبيعي وليس خطأ
      return false;
    }

    const incoming = { supervisors: [], institutes: [], plans: {}, settings: {} };
    let foundAny = false;

    rows.forEach(row => {
      const type = row && row.type;
      const parsed = parseRowData(row && row.data);
      if (!type || parsed == null) return;

      switch (type) {
        case 'supervisors':
        case 'supervisor':
          incoming.supervisors.push(parsed);
          foundAny = true;
          break;
        case 'institutes':
        case 'institute':
          incoming.institutes.push(parsed);
          foundAny = true;
          break;
        case 'plans':
        case 'plan':
          Object.assign(incoming.plans, parsed);
          foundAny = true;
          break;
        case 'settings':
        case 'setting':
          Object.assign(incoming.settings, parsed);
          foundAny = true;
          break;
        default:
          break;
      }
    });

    if (foundAny) {
      // {sync:false}: قطع الحلقة العكسية — الدمج القادم من الشيت لا يُعيد
      // الدفع إليه فورًا. أي حفظ محلي لاحق يدفع الحالة الكاملة تلقائيًا.
      APP.storage.mergeDB(incoming, {sync:false});
    }

    setLastSyncAt(maxUpdatedAt(rows) || new Date().toISOString());
    return foundAny;
  }

  return { restoreIfNeeded, syncFromCloud, isLocalDBEmpty, buildDBFromRows };
})();
