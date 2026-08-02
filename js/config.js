/*
  إعدادات المشروع العامة.
  SCRIPT_URL: رابط Google Apps Script Web App (يُملأ لاحقاً عند تفعيل مزامنة Google Sheets).
  SHEET_NAME: اسم الشيت المستخدم للمزامنة.
  CACHE_VERSION: يُستخدم بواسطة Service Worker لإدارة نسخة الكاش (سيُفعّل في مرحلة PWA).
  ملاحظة: طالما SCRIPT_URL فارغ، يعمل النظام بالكامل محلياً عبر LocalStorage دون أي تغيير في السلوك.
*/
const CONFIG = {
  SCRIPT_URL: "",
  SHEET_NAME: "",
  CACHE_VERSION: "1.0.2"
};

// globalThis يعمل في كل من صفحة المتصفح (window) وService Worker (self) بدون تفرقة
globalThis.CONFIG = CONFIG;
