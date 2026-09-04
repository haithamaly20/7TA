/* ============================================================
   printing.js — نظام طباعة الخطط
   ============================================================ */
window.APP = window.APP || {};

APP.printing = (function(){
  const esc = (value) => APP.helpers ? APP.helpers.escapeHtml(value ?? '') : String(value ?? '');

  function normalizePlanData(monthKey){
    const storage = APP.storage;
    const settings = storage.getSettings();
    const days = APP.helpers.getMonthDays(monthKey, settings.weekendDows).filter(d => !d.isWeekend);
    const plan = storage.getMonthPlan(monthKey);
    const supervisors = storage.listSupervisors().filter(s => s.status !== 'disabled');
    const rows = [];

    supervisors.forEach(sup => {
      const dayMap = plan[sup.id] || {};
      days.forEach(day => {
        const instituteId = dayMap[day.day];
        if(!instituteId) return;
        const inst = storage.getInstitute(instituteId);
        if(!inst) return;
        rows.push({
          supervisorId: sup.id,
          supervisorName: sup.name,
          supervisorRole: sup.role || '',
          supervisorDepartment: (sup.departments || []).join('، '),
          instituteId: inst.id,
          instituteName: inst.name,
          instituteCode: inst.code || '',
          department: inst.department || '',
          stage: inst.stage || '',
          day: day.day,
          dowName: day.dowName,
          iso: day.iso,
          date: `${day.dowName} ${day.day}/${monthKey.split('-')[1]}/${monthKey.split('-')[0]}`
        });
      });
    });
    return { monthKey, days, rows, supervisors };
  }

  function triggerPrint(contentHtml, isLandscape = true){
    let printArea = document.getElementById('printArea');
    if(!printArea){
      printArea = document.createElement('div');
      printArea.id = 'printArea';
      document.body.appendChild(printArea);
    }

    printArea.className = isLandscape ? 'print-landscape' : 'print-portrait';
    printArea.innerHTML = contentHtml;
    document.body.classList.add('printing-active');

    const cleanup = () => {
      document.body.classList.remove('printing-active');
      printArea.innerHTML = '';
    };
    window.addEventListener('afterprint', cleanup, { once:true });

    requestAnimationFrame(() => setTimeout(() => window.print(), 120));
  }

  function header(title, subtitle, monthKey){
    const settings = APP.storage.getSettings();
    return `<div class="print-header">
      <h2>${esc(settings.orgName || 'إدارة الضبعة التعليمية')}</h2>
      <h1>${esc(title)}</h1>
      <h3>${esc(subtitle || '')}</h3>
      <div class="print-meta">الشهر: ${esc(APP.helpers.monthLabel(monthKey))} — تاريخ الطباعة: ${esc(APP.helpers.formatDateTime())}</div>
    </div>`;
  }

  function generalHtml(data){
    const rows = data.rows;
    return `<div class="print-container">
      ${header('الخطة العامة لموجهي الإدارة', 'كشف الزيارات المخططة لجميع الموجهين', data.monthKey)}
      ${rows.length ? `<table class="print-table"><thead><tr>
        <th>#</th><th>الموجه</th><th>الإدارة</th><th>المعهد</th><th>المرحلة</th><th>اليوم</th><th>التاريخ</th>
      </tr></thead><tbody>${rows.map((r,i)=>`<tr>
        <td>${i+1}</td><td>${esc(r.supervisorName)}</td><td>${esc(r.department)}</td><td>${esc(r.instituteName)}</td><td>${esc(r.stage)}</td><td>${esc(r.dowName)}</td><td>${esc(r.date)}</td>
      </tr>`).join('')}</tbody></table>` : `<div class="print-empty">لا توجد زيارات مخططة لهذا الشهر.</div>`}
      <div class="print-footer">إجمالي الزيارات المخططة: <strong>${rows.length}</strong></div>
    </div>`;
  }

  function supervisorHtml(data, supervisorId){
    const sup = data.supervisors.find(s => String(s.id) === String(supervisorId));
    if(!sup) return `<div class="print-container"><div class="print-empty">لم يتم العثور على الموجه.</div></div>`;
    const rows = data.rows.filter(r => String(r.supervisorId) === String(supervisorId));
    const byDay = new Map(rows.map(r => [r.day, r]));
    return `<div class="print-container supervisor-plan">
      ${header(`خطة الموجه: ${sup.name}`, `${sup.role || 'موجه'}${sup.departments?.length ? ' — ' + sup.departments.join('، ') : ''}`, data.monthKey)}
      <table class="print-table"><thead><tr><th>#</th><th>اليوم</th><th>التاريخ</th><th>المعهد</th><th>الكود</th><th>الإدارة</th><th>المرحلة</th></tr></thead><tbody>
      ${data.days.map((d,i)=>{
        const r = byDay.get(d.day);
        return `<tr class="${r?'':'unplanned-row'}"><td>${i+1}</td><td>${esc(d.dowName)}</td><td>${esc(`${d.day}/${data.monthKey.split('-')[1]}/${data.monthKey.split('-')[0]}`)}</td><td>${esc(r?.instituteName || '—')}</td><td>${esc(r?.instituteCode || '—')}</td><td>${esc(r?.department || '—')}</td><td>${esc(r?.stage || '—')}</td></tr>`;
      }).join('')}
      </tbody></table>
      <div class="print-footer">عدد الزيارات المخططة: <strong>${rows.length}</strong> من ${data.days.length} يوم عمل.</div>
    </div>`;
  }

  function printGeneralPlan(monthKey, legacyDays){
    // يدعم الاستدعاء القديم printGeneralPlan(array) أيضًا.
    if(Array.isArray(monthKey)){
      const legacyRows = monthKey;
      if(!legacyRows.length){ APP.ui?.warning('لا توجد بيانات','لا توجد خطة للطباعة'); return; }
      const html = `<div class="print-container">${header('الخطة العامة لموجهي الإدارة','',APP.helpers.currentMonthKey())}<table class="print-table"><thead><tr><th>#</th><th>الموجه</th><th>المعهد</th><th>المرحلة</th><th>التاريخ</th></tr></thead><tbody>${legacyRows.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.supervisorName)}</td><td>${esc(p.instituteName)}</td><td>${esc(p.stage)}</td><td>${esc(p.date)}</td></tr>`).join('')}</tbody></table></div>`;
      triggerPrint(html,true); return;
    }
    monthKey = monthKey || APP.helpers.currentMonthKey();
    const data = normalizePlanData(monthKey);
    if(!data.rows.length){ APP.ui?.warning('لا توجد بيانات','لا توجد زيارات مخططة لهذا الشهر للطباعة'); return; }
    triggerPrint(generalHtml(data), true);
  }

  function printSupervisorPlan(supervisorId, monthKey){
    monthKey = monthKey || APP.helpers.currentMonthKey();
    const data = normalizePlanData(monthKey);
    const sup = data.supervisors.find(s => String(s.id) === String(supervisorId));
    if(!sup){ APP.ui?.error('خطأ','الموجه المطلوب غير موجود'); return; }
    triggerPrint(supervisorHtml(data, supervisorId), false);
  }

  function printAllSupervisorPlans(monthKey){
    monthKey = monthKey || APP.helpers.currentMonthKey();
    const data = normalizePlanData(monthKey);
    if(!data.supervisors.length){ APP.ui?.warning('لا توجد بيانات','لا يوجد موجهون للطباعة'); return; }
    const html = data.supervisors.map((sup, i) => `<section class="print-page-break">${supervisorHtml(data, sup.id)}</section>`).join('');
    triggerPrint(html, false);
  }

  return { triggerPrint, normalizePlanData, printGeneralPlan, printSupervisorPlan, printAllSupervisorPlans };
})();
