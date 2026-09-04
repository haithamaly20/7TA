/* ============================================================
   helpers.js — دوال مساعدة عامة
   يعمل كسكربت عادي (بدون import/export) حتى يفتح المشروع
   مباشرة عبر النقر المزدوج على index.html دون أي سيرفر.
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

  function dayNameOf(monthKey, day){
    const [y,m] = monthKey.split('-').map(Number);
    const d = new Date(y, m-1, day);
    return ARABIC_DAYS[d.getDay()];
  }

  // returns array of {day, iso, dow, isWeekend}
  function getMonthDays(monthKey, weekendDows){
    weekendDows = weekendDows || [5,6]; // Friday=5, Saturday=6
    const total = daysInMonth(monthKey);
    const [y,m] = monthKey.split('-').map(Number);
    const list = [];
    for(let day=1; day<=total; day++){
      const d = new Date(y, m-1, day);
      const dow = d.getDay();
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

  function formatDateTime(date){
    const d = date || new Date();
    return `${ARABIC_DAYS[d.getDay()]} ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
    uid, escapeHtml, debounce, todayISO, currentMonthKey, monthLabel, daysInMonth,
    dayNameOf, getMonthDays, formatDateTime, formatTime, downloadBlob, normalize,
    contains, PALETTE, colorFor, pad2
  };
})();
