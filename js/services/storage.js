/* ============================================================
   storage.js — طبقة تخزين البيانات (LocalStorage)
   جميع البيانات تُحفظ محليًا في متصفح الجهاز. لا يعتمد النظام
   على أي خادم أو قاعدة بيانات خارجية.
   ============================================================ */
window.APP = window.APP || {};

APP.storage = (function(){

  const DB_KEY = 'dabaa_planner_db_v1';
  const SCHEMA_VERSION = 1;

  function defaultDB(){
    return {
      version: SCHEMA_VERSION,
      settings: {
        systemTitle: 'خطة موجهي الضبعة',
        orgName: 'إدارة الضبعة التعليمية',
        weekendDows: [5,6], // الجمعة والسبت
        sidebarCollapsed: false,
        lastBackupAt: null
      },
      supervisors: [],
      institutes: [],
      plans: {},        // { "YYYY-MM": { supervisorId: { "day": instituteId } } }
      meta: {
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      }
    };
  }

  let db = null;

  function load(){
    try{
      const raw = localStorage.getItem(DB_KEY);
      if(!raw){
        db = defaultDB();
        persistLocalOnly(); // حفظ محلي فقط — بدون مزامنة، حتى لا تُمحى بيانات Sheets الحقيقية
                             // قبل أن تحصل cloudRestore.restoreIfNeeded() على فرصة الاسترجاع أولاً
      } else {
        db = JSON.parse(raw);
        // safety defaults for older/partial data
        db.settings = Object.assign(defaultDB().settings, db.settings||{});
        db.supervisors = db.supervisors || [];
        db.institutes = db.institutes || [];
        db.plans = db.plans || {};
        db.meta = db.meta || defaultDB().meta;
      }
    }catch(e){
      console.error('تعذر تحميل البيانات، سيتم إنشاء قاعدة بيانات جديدة', e);
      db = defaultDB();
      persistLocalOnly(); // نفس السبب: تجنّب مزامنة قاعدة بيانات فارغة قد تمحو بيانات Sheets الحقيقية
    }
    return db;
  }

  function persist(){
    db.meta.lastUpdatedAt = new Date().toISOString();
    try{
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      scheduleSyncToSheets(); // مزامنة مؤجلة (Debounce) بدل فورية مع كل حفظ
      return true;
    }catch(e){
      console.error('فشل حفظ البيانات', e);
      return false;
    }
  }

  // حفظ محلي فقط، بدون استدعاء المزامنة السحابية — يُستخدم فقط عند الإنشاء
  // الأولي لقاعدة بيانات فارغة (load عند عدم وجود بيانات محلية)، حتى لا تُمحى
  // بيانات Sheets الحقيقية بالخطأ قبل أن يحاول cloudRestore استرجاعها أولاً.
  function persistLocalOnly(){
    db.meta.lastUpdatedAt = new Date().toISOString();
    try{
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return true;
    }catch(e){
      console.error('فشل حفظ البيانات محليًا', e);
      return false;
    }
  }

  // ---------------- مزامنة Google Sheets (مؤجلة) ----------------
  // مبدأ العملية: persist() تُستدعى مع كل تعديل صغير (خلية خطة، حقل
  // نموذج، إعداد...) — وإطلاق 4 طلبات bulk_sync بالبيانات الكاملة مع
  // كل حفظ يُنتج عاصفة طلبات (مثال: 22 تعديلًا في الخطة = 88 POST).
  // الحل: مؤقت Debounce — كل حفظ يُعيد ضبط المؤقت، وعند سكوت
  // التعديلات لمدة SYNC_DEBOUNCE_MS تُرسل مزامنة واحدة بالحالة الأخيرة.
  // لا خطر فقدان: أي حفظ لاحق أو عودة اتصال (backgroundSync) تدفع
  // الحالة الكاملة من جديد في كل حالة.
  const SYNC_DEBOUNCE_MS = 2500;
  let syncTimer = null;

  function scheduleSyncToSheets(){
    if(!window.APP || !APP.sheetsSync || !APP.sheetsSync.isEnabled()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(()=>{
      syncTimer = null;
      syncToSheetsIfEnabled();
    }, SYNC_DEBOUNCE_MS);
  }

  function syncToSheetsIfEnabled(){
    if(!window.APP || !APP.sheetsSync || !APP.sheetsSync.isEnabled()) return;
    APP.sheetsSync.syncInBackground('supervisors', db.supervisors.map(s=>({id:s.id, data:s})));
    APP.sheetsSync.syncInBackground('institutes', db.institutes.map(i=>({id:i.id, data:i})));
    APP.sheetsSync.syncInBackground('plans', [{id:'plans', data: db.plans}]);
    APP.sheetsSync.syncInBackground('settings', [{id:'settings', data: db.settings}]);
  }

  function getDB(){ return db; }

  function replaceDB(newDb, options){
    db = newDb || defaultDB();
    if(options && options.sync === false){ persistLocalOnly(); } else { persist(); }
  }

  // options.sync === false → حفظ محلي بدون الدفع إلى Google Sheets.
  // يُستخدم عند دمج بيانات قادمة من السحابة نفسها (cloudRestore.js)،
  // فلا معنى لإعادة رفع إلى الشيت ما سُحب للتو منه — أي تعديل
  // محلي لاحق سيدفع الحالة الكاملة الجديدة في حينه على أي حال.
  function mergeDB(incoming, options){
    // merge supervisors/institutes by id, plans deep-merged by month/supervisor/day
    (incoming.supervisors||[]).forEach(s=>{
      const idx = db.supervisors.findIndex(x=>x.id===s.id);
      if(idx>=0) db.supervisors[idx] = s; else db.supervisors.push(s);
    });
    (incoming.institutes||[]).forEach(i=>{
      const idx = db.institutes.findIndex(x=>x.id===i.id);
      if(idx>=0) db.institutes[idx] = i; else db.institutes.push(i);
    });
    Object.keys(incoming.plans||{}).forEach(monthKey=>{
      db.plans[monthKey] = db.plans[monthKey] || {};
      Object.keys(incoming.plans[monthKey]).forEach(supId=>{
        db.plans[monthKey][supId] = Object.assign(db.plans[monthKey][supId]||{}, incoming.plans[monthKey][supId]);
      });
    });
    if(incoming.settings){
      db.settings = Object.assign(db.settings, incoming.settings);
    }
    if(options && options.sync === false){ persistLocalOnly(); } else { persist(); }
  }

  // ---------- Supervisors ----------
  function listSupervisors(){ return db.supervisors; }
  function getSupervisor(id){ return db.supervisors.find(s=>s.id===id); }
  function saveSupervisor(sup){
    const idx = db.supervisors.findIndex(s=>s.id===sup.id);
    if(idx>=0) db.supervisors[idx] = sup; else db.supervisors.push(sup);
    persist();
  }
  function deleteSupervisor(id){
    db.supervisors = db.supervisors.filter(s=>s.id!==id);
    Object.keys(db.plans).forEach(monthKey=>{ delete db.plans[monthKey][id]; });
    persist();
  }

  // ---------- Institutes ----------
  function listInstitutes(){ return db.institutes; }
  // توافق خلفي مع النسخ القديمة من institutes.js
  function getInstitutes(){ return db.institutes; }
  function getInstitute(id){ return db.institutes.find(i=>i.id===id); }
  function saveInstitute(inst){
    const idx = db.institutes.findIndex(i=>i.id===inst.id);
    if(idx>=0) db.institutes[idx] = inst; else db.institutes.push(inst);
    persist();
  }
  function deleteInstitute(id){
    db.institutes = db.institutes.filter(i=>i.id!==id);
    db.supervisors.forEach(s=>{ s.instituteIds = (s.instituteIds||[]).filter(x=>x!==id); });
    Object.keys(db.plans).forEach(monthKey=>{
      Object.keys(db.plans[monthKey]).forEach(supId=>{
        const dayMap = db.plans[monthKey][supId];
        Object.keys(dayMap).forEach(day=>{ if(dayMap[day]===id) delete dayMap[day]; });
      });
    });
    persist();
  }

  // ---------- Plans ----------
  function getMonthPlan(monthKey){
    db.plans[monthKey] = db.plans[monthKey] || {};
    return db.plans[monthKey];
  }
  function setCell(monthKey, supervisorId, day, instituteId){
    db.plans[monthKey] = db.plans[monthKey] || {};
    db.plans[monthKey][supervisorId] = db.plans[monthKey][supervisorId] || {};
    if(instituteId){
      db.plans[monthKey][supervisorId][day] = instituteId;
    } else {
      delete db.plans[monthKey][supervisorId][day];
    }
    persist();
  }
  function clearDay(monthKey, day){
    const plan = getMonthPlan(monthKey);
    Object.keys(plan).forEach(supId=>{ delete plan[supId][day]; });
    persist();
  }
  function clearWeek(monthKey, days){
    const plan = getMonthPlan(monthKey);
    Object.keys(plan).forEach(supId=>{ days.forEach(d=>delete plan[supId][d]); });
    persist();
  }
  function clearSupervisorMonth(monthKey, supervisorId){
    const plan = getMonthPlan(monthKey);
    plan[supervisorId] = {};
    persist();
  }
  function copyMonth(fromKey, toKey){
    db.plans[toKey] = JSON.parse(JSON.stringify(db.plans[fromKey] || {}));
    persist();
  }

  // ---------- Settings ----------
  function getSettings(){ return db.settings; }
  function saveSettings(patch){
    db.settings = Object.assign(db.settings, patch);
    persist();
  }

  return {
    load, getDB, replaceDB, mergeDB, persist, defaultDB, syncToSheetsIfEnabled,
    listSupervisors, getSupervisor, saveSupervisor, deleteSupervisor,
    listInstitutes, getInstitutes, getInstitute, saveInstitute, deleteInstitute,
    getMonthPlan, setCell, clearDay, clearWeek, clearSupervisorMonth, copyMonth,
    getPlans: ()=>db.plans,
    getSettings, saveSettings
  };
})();
