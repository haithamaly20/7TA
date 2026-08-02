/* ============================================================
   statistics.js — حساب الإحصائيات العامة
   ============================================================ */
window.APP = window.APP || {};

APP.statistics = (function(){
  const storage = APP.storage;
  const h = APP.helpers;

  function overview(){
    const supervisors = storage.listSupervisors();
    const institutes = storage.listInstitutes();
    const activeSupervisors = supervisors.filter(s=>s.status==='active');
    const monthKey = h.currentMonthKey();
    const days = h.getMonthDays(monthKey, storage.getSettings().weekendDows).filter(d=>!d.isWeekend);
    const plan = storage.getMonthPlan(monthKey);

    let plannedVisits = 0;
    activeSupervisors.forEach(sup=>{
      const dayMap = plan[sup.id]||{};
      plannedVisits += Object.keys(dayMap).length;
    });
    const totalPossible = activeSupervisors.length * days.length;
    const completion = totalPossible ? Math.round((plannedVisits/totalPossible)*100) : 0;

    const unassignedInstitutes = institutes.filter(i=>{
      return !supervisors.some(s=>(s.instituteIds||[]).includes(i.id));
    });

    return {
      totalSupervisors: supervisors.length,
      activeSupervisors: activeSupervisors.length,
      totalInstitutes: institutes.length,
      plannedVisits,
      totalPossible,
      completion,
      unassignedInstitutesCount: unassignedInstitutes.length,
      monthKey
    };
  }

  function visitsPerSupervisor(monthKey){
    const supervisors = storage.listSupervisors();
    const plan = storage.getMonthPlan(monthKey);
    return supervisors.map(sup=>({
      supervisor: sup,
      count: Object.keys(plan[sup.id]||{}).length
    })).sort((a,b)=>b.count-a.count);
  }

  function visitsPerInstitute(monthKey){
    const plan = storage.getMonthPlan(monthKey);
    const counter = {};
    Object.values(plan).forEach(dayMap=>{
      Object.values(dayMap).forEach(instId=>{
        counter[instId] = (counter[instId]||0) + 1;
      });
    });
    return storage.listInstitutes().map(inst=>({
      institute: inst,
      count: counter[inst.id] || 0
    })).sort((a,b)=>b.count-a.count);
  }

  function visitsPerDepartment(monthKey){
    const perSup = visitsPerSupervisor(monthKey);
    const map = {};
    perSup.forEach(({supervisor, count})=>{
      (supervisor.departments&&supervisor.departments.length ? supervisor.departments : ['بدون إدارة']).forEach(dep=>{
        map[dep] = (map[dep]||0) + count;
      });
    });
    return Object.entries(map).map(([department,count])=>({department,count})).sort((a,b)=>b.count-a.count);
  }

  return { overview, visitsPerSupervisor, visitsPerInstitute, visitsPerDepartment };
})();
