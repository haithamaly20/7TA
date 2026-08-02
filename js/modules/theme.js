/* ============================================================
   theme.js — تبديل الوضع الداكن/الفاتح (Dark/Light Mode)
   ------------------------------------------------------------
   - يُحفظ تفضيل المستخدم في مفتاح localStorage منفصل تماماً عن
     قاعدة بيانات النظام الرئيسية (dabaa_planner_db_v1) حتى لا
     يتأثر بإعادة الضبط (Factory Reset) أو بمزامنة Google Sheets.
   - الافتراضي عند أول زيارة: الوضع الداكن (كما كان التصميم الأصلي).
   - يُطبَّق التفضيل مبكراً جداً (سكربت صغير في <head>) لتفادي
     وميض المحتوى (FOUC) عند التحميل.
   ============================================================ */
window.APP = window.APP || {};

APP.theme = (function () {
  const THEME_KEY = 'dabaa_theme_pref';

  function get() {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function apply(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    updateToggleUI(t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* تجاهل: التصفح الخاص قد يمنع الكتابة */ }
  }

  function toggle() {
    apply(get() === 'light' ? 'dark' : 'light');
  }

  function updateToggleUI(t) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    btn.textContent = t === 'light' ? '🌙' : '☀️';
    btn.title = t === 'light' ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح';
  }

  function init() {
    // القيمة مطبَّقة أصلاً من سكربت <head> المبكر؛ هنا فقط نربط الزر وحالة الأيقونة
    updateToggleUI(get());
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.addEventListener('click', toggle);
  }

  return { get, apply, toggle, init };
})();
