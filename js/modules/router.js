/* ============================================================
   router.js — التنقل بين الصفحات
   ملاحظة: جميع الصفحات مُضمّنة داخل index.html كأقسام (sections)
   ويتم إظهار/إخفاء القسم المطلوب فقط، بدلاً من استخدام fetch()
   لتحميل ملفات HTML منفصلة. هذا القرار مقصود ومهم لأن المتصفحات
   تمنع fetch() لملفات محلية عند فتح الصفحة عبر file:// مباشرة.
   ============================================================ */
window.APP = window.APP || {};

APP.router = (function(){
  const PAGES = ['dashboard','supervisors','institutes','planner','reports','backup','settings'];
  let current = 'dashboard';
  let onChangeCallbacks = [];

  function init(){
    document.querySelectorAll('.nav-item[data-page]').forEach(item=>{
      item.addEventListener('click', ()=> navigate(item.dataset.page));
    });
    const initial = (location.hash||'').replace('#','') || 'dashboard';
    navigate(PAGES.includes(initial) ? initial : 'dashboard');
    window.addEventListener('hashchange', ()=>{
      const page = (location.hash||'').replace('#','');
      if(PAGES.includes(page) && page !== current) navigate(page, true);
    });
  }

  function navigate(page, skipHash){
    if(!PAGES.includes(page)) page = 'dashboard';
    current = page;
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active', p.id === `page-${page}`));
    document.querySelectorAll('.nav-item[data-page]').forEach(item=>{
      item.classList.toggle('active', item.dataset.page === page);
    });
    if(!skipHash) location.hash = page;
    onChangeCallbacks.forEach(cb=>cb(page));
    document.querySelector('.page-content')?.scrollTo?.(0,0);
  }

  function onChange(cb){ onChangeCallbacks.push(cb); }
  function getCurrent(){ return current; }

  return { init, navigate, onChange, getCurrent };
})();
