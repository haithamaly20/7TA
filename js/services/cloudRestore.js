/* ============================================================
   cloudRestore.js — استرجاع تلقائي للبيانات من Google Sheets
   ------------------------------------------------------------
   يُستدعى مرة واحدة عند الإقلاع، بعد APP.storage.load() مباشرة.
   إذا كانت قاعدة البيانات المحلية فارغة (جهاز جديد / بيانات
   مفقودة) يحاول تحميل آخر نسخة من Google Sheets وإعادة بناء
   قاعدة البيانات المحلية منها. لا يفعل شيئًا إذا كانت هناك
   بيانات محلية بالفعل، أو إذا كانت المزامنة غير مفعّلة، أو إذا
   فشل الاتصال — في كل هذه الحالات يستمر التطبيق بشكل طبيعي.
   ============================================================ */
window.APP = window.APP || {};

APP.cloudRestore = (function () {

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
          newDB.supervisors.push(parsed);
          foundAny = true;
          break;
        case 'institutes':
          newDB.institutes.push(parsed);
          foundAny = true;
          break;
        case 'plans':
          // يُخزَّن ككائن الخطط بالكامل تحت سجل واحد (id: 'plans')
          Object.assign(newDB.plans, parsed);
          foundAny = true;
          break;
        case 'settings':
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
    APP.storage.replaceDB(newDB);

    if (window.APP.ui) {
      try { APP.ui.success && APP.ui.success('تم الاسترجاع', 'تم استرجاع بياناتك من Google Sheets بنجاح'); } catch (e) {}
    }

    return true;
  }

  return { restoreIfNeeded, isLocalDBEmpty, buildDBFromRows };
})();
