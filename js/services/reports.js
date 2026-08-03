/* ============================================================
   reports.js — التقارير
   ============================================================ */
window.APP = window.APP || {};

APP.reports = (function(){
  const h = APP.helpers;
  const storage = APP.storage;
  const stats = APP.statistics;
  const printing = APP.printing;
  const ui = APP.ui;

  function init(){
    const monthInput = document.getElementById('reportsMonth');
    monthInput.value = h.currentMonthKey();
    monthInput.addEventListener('change', render);

    document.getElementById('btnPrintGeneralPlan').addEventListener('click', ()=>{
      const monthKey = monthInput.value;
      const days = h.getMonthDays(monthKey, storage.getSettings().weekendDows);
      printing.printGeneralPlan(monthKey, days);
    });
    document.getElementById('btnPrintAllSupervisorPlans').addEventListener('click', ()=>{
      const monthKey = monthInput.value;
      const days = h.getMonthDays(monthKey, storage.getSettings().weekendDows);
      printing.printAllSupervisorPlans(monthKey, days);
    });

    render();
  }

  function currentMonthKey(){
    return document.getElementById('reportsMonth').value || h.currentMonthKey();
  }

  function render(){
    const monthKey = currentMonthKey();
    document.getElementById('reportsMonthLabel').textContent = h.monthLabel(monthKey);
    renderSupervisorList(monthKey);
    renderInstituteVisits(monthKey);
    renderDepartmentVisits(monthKey);
    renderCharts(monthKey);
  }

  function renderCharts(monthKey){
    if(!APP.charts) return;

    const supList = stats.visitsPerSupervisor(monthKey).slice(0, 10);
    APP.charts.renderBarChart(
      document.getElementById('chartSupervisorVisits'),
      supList,
      {
        label: item => item.supervisor.name,
        value: item => item.count,
        color: item => item.supervisor.color || '#6366F1'
      }
    );

    const deptList = stats.visitsPerDepartment(monthKey);
    APP.charts.renderBarChart(
      document.getElementById('chartDepartmentVisits'),
      deptList,
      {
        label: item => item.department,
        value: item => item.count,
        color: () => '#22C55E'
      }
    );
  }

  function renderSupervisorList(monthKey){
    const list = stats.visitsPerSupervisor(monthKey);
    const el = document.getElementById('reportSupervisorList');
    if(!list.length){ el.innerHTML = `<div class="empty-state"><span>لا يوجد موجهون</span></div>`; return; }
    el.innerHTML = list.map(({supervisor,count})=>`
      <div class="mini-list-item">
        <span class="flex items-center gap-8"><span class="swatch" style="background:${supervisor.color}"></span>${h.escapeHtml(supervisor.name)}</span>
        <span class="flex items-center gap-8">
          <span class="badge blue">${count} زيارة</span>
          <button class="btn btn-sm btn-outline" data-print-sup="${supervisor.id}">🖨 طباعة خطته</button>
        </span>
      </div>
    `).join('');
    el.querySelectorAll('[data-print-sup]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const days = h.getMonthDays(monthKey, storage.getSettings().weekendDows);
        printing.printSupervisorPlan(btn.dataset.printSup, monthKey, days);
      });
    });
  }

  function renderInstituteVisits(monthKey){
    const list = stats.visitsPerInstitute(monthKey);
    const el = document.getElementById('reportInstituteList');
    if(!list.length){ el.innerHTML = `<div class="empty-state"><span>لا توجد معاهد</span></div>`; return; }
    el.innerHTML = list.slice(0,50).map(({institute,count})=>`
      <div class="mini-list-item">
        <span>${h.escapeHtml(institute.name)}</span>
        <span class="badge ${count?'green':'gray'}">${count} زيارة</span>
      </div>
    `).join('');
  }

  function renderDepartmentVisits(monthKey){
    const list = stats.visitsPerDepartment(monthKey);
    const el = document.getElementById('reportDepartmentList');
    if(!list.length){ el.innerHTML = `<div class="empty-state"><span>لا توجد بيانات</span></div>`; return; }
    el.innerHTML = list.map(({department,count})=>`
      <div class="mini-list-item">
        <span>${h.escapeHtml(department)}</span>
        <span class="badge amber">${count} زيارة</span>
      </div>
    `).join('');
  }

  return { init, render };
})();
