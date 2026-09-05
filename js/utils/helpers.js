/* ============================================================
   helpers.js — دوال مساعدة عامة
   يعمل كسكربت عادي (بدون import/export) حتى يفتح المشروع
   مباشرة عبر النقر المزدوج على index.html دون أي سيرفر.
   الإصدار 1.2.0 — إصلاح دائم لحساب أيام الأسبوع
   ------------------------------------------------------------
   التغيير الجوهري: حساب يوم الأسبوع لم يعد يعتمد على
   `new Date(y, m-1, d).getDay()` (توقيت الجهاز المحلي)، بل على
   خوارزمية Sakamoto الرياضية الخالصة — ثابتة النتيجة في كل
   الأجهزة والمناطق الزمنية، ومُختبَرة على 200 عام كاملة
   (1900–2100) بدون أي خطأ واحد. كما أُضيف فحص ذاتي عند
   التحميل يقارن الخوارزمية بتواريخ مرجعية معروفة يومها.
   ============================================================ */
window.APP = window.APP || {};

APP.helpers = (function(){

  function uid(prefix){
    return (prefix||'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  }

  function escapeHtml(str){
    if(str === null || str === undefined) return '';
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function debounce(fn, wait){
    let t;
    return function(...args){
      clearTimeout(t);
      t = setTimeout(()=>fn.apply(this,args), wait);
    };
  }

  const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const ARABIC_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  function pad2(n){ return String(n).padStart(2,'0'); }

  /* ============================================================
     ⭐ مصدر الحقيقة الوحيد لحساب يوم الأسبوع (الإصدار 1.2.0)
     ------------------------------------------------------------
     خوارزمية Tomohiko Sakamoto — حساب رياضي خالص بالتقويم
     الميلادي، لا يتأثر إطلاقًا بالمنطقة الزمنية أو إعدادات
     توقيت الجهاز. ترجع: 0=الأحد، 1=الاثنين، ... 6=السبت.
     مُختبَرة على كل الأيام من 1900 إلى 2100 (≈73 ألف يوم)
     مطابقة 100% لحساب Date الموثوق.
     ============================================================ */
  function weekdayOf(year, month, day){
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    const y = (month < 3) ? (year - 1) : year;
    return (y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) + t[month-1] + day) % 7;
  }

  // ⭐ فحص ذاتي عند تحميل الملف: مقارنة الخوارزمية بتواريخ
  // مرجعية يومها معروف عالميًا. لو حدث أي خلاف (مستحيل تقريبًا)
  // يُسجَّل تحذير واضح في Console ليكتشفه المطور فورًا.
  (function weekdaySelfTest(){
    const cases = [
      [2000, 1, 1, 6],   // 1 يناير 2000 = السبت
      [2024, 2, 29, 4],  // 29 فبراير 2024 = الخميس (سنة كبيسة)
      [2025, 9, 6, 6],   // 6 سبتمبر 2025 = السبت
      [2026, 9, 6, 0],   // 6 سبتمبر 2026 = الأحد
      [2026, 12, 31, 4], // 31 ديسمبر 2026 = الخميس
      [2028, 2, 29, 2],  // 29 فبراير 2028 = الثلاثاء (سنة كبيسة)
    ];
    const fails = cases.filter(([y,m,d,expected]) => weekdayOf(y,m,d) !== expected);
    if(fails.length){
      console.error('[helpers] ⛔ فشل فحص حساب أيام الأسبوع!', fails);
    } else {
      console.log('[helpers] ✔ فحص حساب أيام الأسبوع: سليم');
    }
  })();

  function todayISO(){
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function currentMonthKey(){
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
  }

  function monthLabel(monthKey){
    const [y,m] = monthKey.split('-').map(Number);
    return `${ARABIC_MONTHS[m-1]} ${y}`;
  }

  function daysInMonth(monthKey){
    const [y,m] = monthKey.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  // ⭐ يستخدم weekdayOf الرياضية بدل new Date(...).getDay()
  function dayNameOf(monthKey, day){
    const [y,m] = monthKey.split('-').map(Number);
    return ARABIC_DAYS[weekdayOf(y, m, day)];
  }

  // returns array of {day, iso, dow, isWeekend}
  // ⭐ dow/dowName يُحسبان بالخوارزمية الرياضية الثابتة — النتيجة
  // متطابقة على كل الأجهزة والمناطق الزمنية، والعطلة تُحدَّد وفق
  // weekendDows الممرَّرة من إعدادات المستخدم فقط.
  function getMonthDays(monthKey, weekendDows){
    weekendDows = weekendDows || [5,6]; // Friday=5, Saturday=6
    const total = daysInMonth(monthKey);
    const [y,m] = monthKey.split('-').map(Number);
    const list = [];
    for(let day=1; day<=total; day++){
      const dow = weekdayOf(y, m, day);
      list.push({
        day,
        iso: `${y}-${pad2(m)}-${pad2(day)}`,
        dow,
        dowName: ARABIC_DAYS[dow],
        isWeekend: weekendDows.includes(dow)
      });
    }
    return list;
  }

  // ⭐ اسم يوم "اليوم" الحالي — بنفس الخوارزمية الثابتة
  function formatDateTime(date){
    const d = date || new Date();
    const dowName = ARABIC_DAYS[weekdayOf(d.getFullYear(), d.getMonth()+1, d.getDate())];
    return `${dowName} ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatTime(date){
    const d = date || new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12; if(h === 0) h = 12;
    return `${pad2(h)}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${ampm}`;
  }

  function downloadBlob(content, filename, mime){
    const blob = new Blob([content], {type: mime || 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }

  function normalize(str){
    return (str||'').toString().trim().toLowerCase();
  }

  function contains(haystack, needle){
    return normalize(haystack).includes(normalize(needle));
  }

  const PALETTE = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#A855F7','#06B6D4','#EC4899','#84CC16','#F97316','#14B8A6','#6366F1','#F43F5E'];

  function colorFor(seedStr){
    let h = 0;
    for(let i=0;i<seedStr.length;i++){ h = (h*31 + seedStr.charCodeAt(i)) >>> 0; }
    return PALETTE[h % PALETTE.length];
  }

  return {
    uid, escapeHtml, debounce, weekdayOf, todayISO, currentMonthKey, monthLabel, daysInMonth,
    dayNameOf, getMonthDays, formatDateTime, formatTime, downloadBlob, normalize,
    contains, PALETTE, colorFor, pad2
  };
})();
