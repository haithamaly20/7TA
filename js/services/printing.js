/* ============================================================
   printing.js — الطباعة الاحترافية (الخطة العامة / الفردية / التقارير)
   ============================================================ */
window.APP = window.APP || {};

APP.printing = (function(){
  const h = APP.helpers;
  const storage = APP.storage;

  function printAreaEl(){
    let el = document.getElementById('printArea');
    if(!el){
      el = document.createElement('div');
      el.id = 'printArea';
      document.body.appendChild(el);
    }
    return el;
  }

  function header(subtitle){
    const settings = storage.getSettings();
    return `
      <div class="print-header">
        <div>
          <h1>${h.escapeHtml(settings.systemTitle)}</h1>
          <div style="font-size:12px; color:#333;">${h.escapeHtml(settings.orgName)} ${subtitle ? '— '+h.escapeHtml(subtitle) : ''}</div>
        </div>
        <div class="print-meta">
          <div>تاريخ الطباعة: ${h.formatDateTime()}</div>
        </div>
      </div>
    `;
  }

  function footer(){
    return `<div class="print-footer">${h.escapeHtml(storage.getSettings().systemTitle)} — صفحة تُنشأ آليًا</div>`;
  }

  // الخطة العامة (أفقي)
  function printGeneralPlan(monthKey, workingDays){
    const supervisors = storage.listSupervisors().filter(s=>s.status==='active');
    const plan = storage.getMonthPlan(monthKey);
    const days = workingDays.filter(d=>!d.isWeekend);

    let theadRow = `<tr><th>الموجه</th>`;
    days.forEach(d=>theadRow += `<th>${d.day}<br>${d.dowName}</th>`);
    theadRow += `</tr>`;

    let rows = '';
    supervisors.forEach(sup=>{
      const dayMap = plan[sup.id] || {};
      rows += `<tr><td><strong>${h.escapeHtml(sup.name)}</strong></td>`;
      days.forEach(d=>{
        const instId = dayMap[d.day];
        const inst = instId ? storage.getInstitute(instId) : null;
        rows += `<td>${inst ? h.escapeHtml(inst.name) : ''}</td>`;
      });
      rows += `</tr>`;
    });

    printAreaEl().innerHTML = `
      <div class="print-landscape">
        ${header(`الخطة العامة — ${h.monthLabel(monthKey)}`)}
        <table class="print-table"><thead>${theadRow}</thead><tbody>${rows}</tbody></table>
        ${footer()}
      </div>
    `;
    triggerPrint();
  }

  // خطة موجه واحد (رأسي)
  function printSupervisorPlan(supervisorId, monthKey, workingDays){
    const sup = storage.getSupervisor(supervisorId);
    const plan = (storage.getMonthPlan(monthKey))[supervisorId] || {};
    const days = workingDays.filter(d=>!d.isWeekend);

    let rows = '';
    days.forEach(d=>{
      const instId = plan[d.day];
      const inst = instId ? storage.getInstitute(instId) : null;
      rows += `<tr><td>${d.day}</td><td>${d.dowName}</td><td>${inst ? h.escapeHtml(inst.name) : '<span class="print-badge">لا توجد زيارة</span>'}</td><td>${inst ? h.escapeHtml(inst.department||'') : ''}</td></tr>`;
    });

    printAreaEl().innerHTML = `
      <div class="print-portrait">
        ${header(`خطة الموجه: ${sup.name} — ${h.monthLabel(monthKey)}`)}
        <table class="print-table">
          <thead><tr><th>اليوم</th><th>يوم الأسبوع</th><th>المعهد</th><th>الإدارة</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${footer()}
      </div>
    `;
    triggerPrint();
  }

  function printAllSupervisorPlans(monthKey, workingDays){
    const supervisors = storage.listSupervisors().filter(s=>s.status==='active');
    const days = workingDays.filter(d=>!d.isWeekend);
    const plan = storage.getMonthPlan(monthKey);

    let sections = supervisors.map((sup, idx)=>{
      const dayMap = plan[sup.id] || {};
      let rows = '';
      days.forEach(d=>{
        const instId = dayMap[d.day];
        const inst = instId ? storage.getInstitute(instId) : null;
        rows += `<tr><td>${d.day}</td><td>${d.dowName}</td><td>${inst ? h.escapeHtml(inst.name) : '—'}</td></tr>`;
      });
      return `
        <div class="${idx>0?'print-page-break':''}">
          <div class="print-section-title">خطة الموجه: ${h.escapeHtml(sup.name)}</div>
          <table class="print-table">
            <thead><tr><th>اليوم</th><th>يوم الأسبوع</th><th>المعهد</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    printAreaEl().innerHTML = `
      <div class="print-portrait">
        ${header(`الخطط الفردية لجميع الموجهين — ${h.monthLabel(monthKey)}`)}
        ${sections}
        ${footer()}
      </div>
    `;
    triggerPrint();
  }

  function printCustomReport(title, tableHeadHtml, tableBodyHtml, landscape){
    printAreaEl().innerHTML = `
      <div class="${landscape ? 'print-landscape':'print-portrait'}">
        ${header(title)}
        <table class="print-table"><thead>${tableHeadHtml}</thead><tbody>${tableBodyHtml}</tbody></table>
        ${footer()}
      </div>
    `;
    triggerPrint();
  }

  function triggerPrint(){
    setTimeout(()=>window.print(), 80);
  }

  return { printGeneralPlan, printSupervisorPlan, printAllSupervisorPlans, printCustomReport };
})();
