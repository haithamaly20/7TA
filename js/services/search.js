/* ============================================================
   search.js — البحث اللحظي داخل النظام
   ============================================================ */
window.APP = window.APP || {};

APP.search = (function(){
  const h = APP.helpers;
  const storage = APP.storage;

  function searchAll(query){
    if(!query || !query.trim()) return { supervisors:[], institutes:[] };
    const supervisors = storage.listSupervisors().filter(s=>
      h.contains(s.name, query) || h.contains(s.role, query) || h.contains((s.departments||[]).join(' '), query)
    );
    const institutes = storage.listInstitutes().filter(i=>
      h.contains(i.name, query) || h.contains(i.department, query) || h.contains(i.stage, query)
    );
    return { supervisors, institutes };
  }

  function bindGlobalSearch(inputEl, onResults){
    inputEl.addEventListener('input', h.debounce(()=>{
      onResults(searchAll(inputEl.value));
    }, 150));
  }

  return { searchAll, bindGlobalSearch };
})();
