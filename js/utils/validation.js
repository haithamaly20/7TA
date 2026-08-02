/* ============================================================
   validation.js — قواعد التحقق من صحة الخطة والنماذج
   ============================================================ */
window.APP = window.APP || {};

APP.validation = (function(){
  const storage = APP.storage;

  function isNameValid(name){
    return !!(name && name.trim().length >= 2);
  }

  // يمنع تكرار نفس المعهد في نفس اليوم عبر أكثر من موجه
  function findInstituteConflict(monthKey, day, instituteId, excludeSupervisorId){
    const plan = storage.getMonthPlan(monthKey);
    for(const supId of Object.keys(plan)){
      if(supId === excludeSupervisorId) continue;
      if(plan[supId][day] === instituteId) return supId;
    }
    return null;
  }

  // يتحقق أن المعهد ضمن نطاق تكليف الموجه
  function isInstituteAssignedToSupervisor(supervisorId, instituteId){
    const sup = storage.getSupervisor(supervisorId);
    if(!sup) return false;
    return (sup.instituteIds||[]).includes(instituteId);
  }

  // تحليل شامل للخطة الشهرية لإيجاد التعارضات والأيام الفارغة
  function analyzeMonthPlan(monthKey, workingDays){
    const plan = storage.getMonthPlan(monthKey);
    const supervisors = storage.listSupervisors().filter(s=>s.status==='active');
    const conflicts = [];
    const emptyDaysBySupervisor = {};
    const unplannedInstitutes = new Set(storage.listInstitutes().map(i=>i.id));

    // detect duplicate institute per day (conflict)
    workingDays.forEach(({day})=>{
      const seenInDay = {};
      supervisors.forEach(sup=>{
        const instId = (plan[sup.id]||{})[day];
        if(instId){
          unplannedInstitutes.delete(instId);
          if(seenInDay[instId]){
            conflicts.push({ day, instituteId: instId, supervisors: [seenInDay[instId], sup.id] });
          } else {
            seenInDay[instId] = sup.id;
          }
        }
      });
    });

    supervisors.forEach(sup=>{
      const dayMap = plan[sup.id] || {};
      const emptyDays = workingDays.filter(wd=>!dayMap[wd.day]).map(wd=>wd.day);
      emptyDaysBySupervisor[sup.id] = emptyDays;
    });

    return {
      conflicts,
      emptyDaysBySupervisor,
      unplannedInstituteIds: Array.from(unplannedInstitutes)
    };
  }

  return { isNameValid, findInstituteConflict, isInstituteAssignedToSupervisor, analyzeMonthPlan };
})();
