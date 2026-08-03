/* ============================================================
   backupScheduler.js — نسخ احتياطية دورية تلقائية (يومية/أسبوعية/شهرية)
   ------------------------------------------------------------
   شبكة أمان إضافية مستقلة عن التصدير اليدوي (importExport.js)
   وعن المزامنة السحابية (cloudRestore.js). يحتفظ بلقطات كاملة
   لقاعدة البيانات داخل LocalStorage نفسه، بحيث يمكن التراجع
   لحالة سابقة حتى لو تعطّلت المزامنة أو حدث خطأ محلي، دون
   الحاجة لملف مُصدَّر يدويًا.
   ============================================================ */
window.APP = window.APP || {};

APP.backupScheduler = (function () {
  const STORE_KEY = 'dabaa_auto_backups_v1';

  const RULES = {
    daily:   { intervalMs: 24 * 60 * 60 * 1000,     keep: 7  },
    weekly:  { intervalMs: 7 * 24 * 60 * 60 * 1000,  keep: 8  },
    monthly: { intervalMs: 30 * 24 * 60 * 60 * 1000, keep: 12 }
  };

  const LABELS = { daily: 'يومية', weekly: 'أسبوعية', monthly: 'شهرية' };

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        daily: Array.isArray(parsed.daily) ? parsed.daily : [],
        weekly: Array.isArray(parsed.weekly) ? parsed.weekly : [],
        monthly: Array.isArray(parsed.monthly) ? parsed.monthly : []
      };
    } catch (e) {
      console.warn('backupScheduler: تعذّرت قراءة النسخ التلقائية المخزنة، سيبدأ سجل جديد', e);
      return { daily: [], weekly: [], monthly: [] };
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      return true;
    } catch (e) {
      console.warn('backupScheduler: تعذّر حفظ النسخ التلقائية (قد تكون مساحة LocalStorage ممتلئة)', e);
      return false;
    }
  }

  function isDBWorthBackingUp(db) {
    if (!db) return false;
    const hasSupervisors = Array.isArray(db.supervisors) && db.supervisors.length > 0;
    const hasInstitutes = Array.isArray(db.institutes) && db.institutes.length > 0;
    const hasPlans = db.plans && Object.keys(db.plans).length > 0;
    return hasSupervisors || hasInstitutes || hasPlans;
  }

  // فحص كل نوع (يومي/أسبوعي/شهري) وأخذ لقطة جديدة إن حان وقتها
  function runIfNeeded() {
    try {
      const db = APP.storage.getDB();
      if (!isDBWorthBackingUp(db)) return; // لا داعي لنسخ قاعدة بيانات فارغة

      const store = loadStore();
      const now = Date.now();
      let changed = false;

      Object.keys(RULES).forEach(type => {
        const rule = RULES[type];
        const list = store[type];
        const last = list.length ? list[list.length - 1] : null;
        const lastTime = last ? new Date(last.createdAt).getTime() : 0;

        if (!last || (now - lastTime) >= rule.intervalMs) {
          const snapshot = JSON.parse(JSON.stringify(db)); // نسخة معزولة تمامًا عن القاعدة الحية
          list.push({
            id: `${type}_${now}_${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date(now).toISOString(),
            data: snapshot
          });
          while (list.length > rule.keep) list.shift(); // إبقاء آخر عدد محدد فقط
          changed = true;
        }
      });

      if (changed) saveStore(store);
    } catch (e) {
      console.warn('backupScheduler: تعذّر تنفيذ فحص النسخ التلقائية', e);
    }
  }

  function listBackups() {
    return loadStore();
  }

  function findBackup(type, id) {
    const store = loadStore();
    const list = store[type] || [];
    return list.find(b => b.id === id) || null;
  }

  function restoreBackup(type, id) {
    const backup = findBackup(type, id);
    if (!backup) return false;
    APP.storage.replaceDB(JSON.parse(JSON.stringify(backup.data)));
    return true;
  }

  function deleteBackup(type, id) {
    const store = loadStore();
    if (!store[type]) return false;
    const before = store[type].length;
    store[type] = store[type].filter(b => b.id !== id);
    if (store[type].length === before) return false;
    saveStore(store);
    return true;
  }

  // ---------- عرض القائمة داخل صفحة "النسخ الاحتياطي" ----------
  function render() {
    const container = document.getElementById('autoBackupsList');
    if (!container) return; // الصفحة قد لا تكون محمّلة بعد

    const h = APP.helpers;
    const store = loadStore();
    const allEntries = []
      .concat(store.daily.map(b => Object.assign({ type: 'daily' }, b)))
      .concat(store.weekly.map(b => Object.assign({ type: 'weekly' }, b)))
      .concat(store.monthly.map(b => Object.assign({ type: 'monthly' }, b)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!allEntries.length) {
      container.innerHTML = `<div class="empty-state"><span>لا توجد نسخ تلقائية بعد — ستُنشأ أول نسخة تلقائيًا تدريجيًا مع استخدامك للنظام</span></div>`;
      return;
    }

    container.innerHTML = allEntries.slice(0, 15).map(entry => `
      <div class="mini-list-item" data-type="${entry.type}" data-id="${entry.id}" data-created="${entry.createdAt}">
        <span>
          <span class="badge gray">${LABELS[entry.type]}</span>
          ${h ? h.escapeHtml(h.formatDateTime(new Date(entry.createdAt))) : entry.createdAt}
        </span>
        <div class="table-actions">
          <button class="action-icon" title="استعادة هذه النسخة" data-act="restore">♻️</button>
          <button class="action-icon danger" title="حذف" data-act="delete">🗑</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-id]').forEach(row => {
      const type = row.dataset.type;
      const id = row.dataset.id;
      const createdAt = row.dataset.created;

      row.querySelector('[data-act="restore"]').addEventListener('click', () => {
        if (!APP.ui) return;
        APP.ui.confirmDialog({
          title: 'استعادة نسخة احتياطية',
          message: `سيتم استبدال جميع البيانات الحالية بمحتوى النسخة (${LABELS[type]}) المحفوظة في ${h ? h.formatDateTime(new Date(createdAt)) : createdAt}. هل أنت متأكد؟`,
          danger: true,
          confirmLabel: 'استعادة الآن',
          onConfirm: () => {
            const ok = restoreBackup(type, id);
            if (ok) {
              APP.ui.success('تمت الاستعادة', 'تم استرجاع البيانات من النسخة الاحتياطية المحددة');
              if (APP.app && APP.app.refreshAll) APP.app.refreshAll();
            } else {
              APP.ui.error('تعذّرت الاستعادة', 'لم يتم العثور على النسخة المطلوبة');
            }
          }
        });
      });

      row.querySelector('[data-act="delete"]').addEventListener('click', () => {
        if (!APP.ui) return;
        APP.ui.confirmDialog({
          title: 'حذف نسخة احتياطية',
          message: 'سيتم حذف هذه النسخة نهائيًا من السجل المحلي. هذا لا يؤثر على بياناتك الحالية.',
          danger: true,
          confirmLabel: 'حذف نهائيًا',
          onConfirm: () => {
            deleteBackup(type, id);
            render();
          }
        });
      });
    });
  }

  function init() {
    render();
  }

  return { runIfNeeded, listBackups, restoreBackup, deleteBackup, init, render };
})();
