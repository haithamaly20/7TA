/* ============================================================
   app.js — نقطة انطلاق التطبيق
   ============================================================ */
window.APP = window.APP || {};

APP.app = (function(){
  const h = APP.helpers;
  const storage = APP.storage;
  const ui = APP.ui;

  function boot(){
    storage.load();
    APP.theme.init();
    applySettingsToUI();
    APP.router.init();
    initSidebar();
    initClock();
    initGlobalSearch();
    initDashboardActions();
    initSettingsPage();

    APP.supervisors.init();
    APP.institutes.init();
    APP.planner.init();
    APP.reports.init();
    APP.importExport.init();

    refreshDashboard();

    APP.router.onChange((page)=>{
      if(page==='dashboard') refreshDashboard();
      if(page==='supervisors') APP.supervisors.render();
      if(page==='institutes') APP.institutes.render();
      if(page==='planner') APP.planner.render();
      if(page==='reports') APP.reports.render();
    });

    ui.setLoading(false);
  }

  function applySettingsToUI(){
    const settings = storage.getSettings();
    document.querySelectorAll('[data-bind="systemTitle"]').forEach(el=>el.textContent = settings.systemTitle);
    document.querySelectorAll('[data-bind="orgName"]').forEach(el=>el.textContent = settings.orgName);
    document.title = settings.systemTitle;
    if(settings.sidebarCollapsed){
      document.getElementById('sidebar').classList.add('collapsed');
    }
  }

  function initSidebar(){
    const sidebar = document.getElementById('sidebar');
    document.getElementById('sidebarToggle').addEventListener('click', ()=>{
      sidebar.classList.toggle('collapsed');
      storage.saveSettings({ sidebarCollapsed: sidebar.classList.contains('collapsed') });
    });
    document.getElementById('mobileMenuBtn')?.addEventListener('click', ()=>{
      sidebar.classList.toggle('mobile-open');
    });
  }

  function initClock(){
    function tick(){
      const now = new Date();
      const timeEl = document.getElementById('topClock');
      const dateEl = document.getElementById('topDate');
      if(timeEl) timeEl.textContent = h.formatTime(now);
      if(dateEl) dateEl.textContent = h.formatDateTime(now);
    }
    tick();
    setInterval(tick, 1000);
  }

  function initGlobalSearch(){
    const input = document.getElementById('globalSearch');
    const resultsBox = document.getElementById('globalSearchResults');
    APP.search.bindGlobalSearch(input, (results)=>{
      const hasQuery = !!input.value.trim();
      if(!hasQuery){ resultsBox.classList.add('hidden'); resultsBox.innerHTML=''; return; }
      const total = results.supervisors.length + results.institutes.length;
      if(!total){
        resultsBox.innerHTML = `<div class="empty-state" style="padding:20px;"><span>لا توجد نتائج مطابقة</span></div>`;
      } else {
        let html = '';
        if(results.supervisors.length){
          html += `<div class="nav-section-label">الموجهون</div>`;
          html += results.supervisors.slice(0,5).map(s=>`<div class="mini-list-item" style="cursor:pointer" data-goto="supervisors">${h.escapeHtml(s.name)} <span class="text-faint">${h.escapeHtml(s.role||'')}</span></div>`).join('');
        }
        if(results.institutes.length){
          html += `<div class="nav-section-label">المعاهد</div>`;
          html += results.institutes.slice(0,5).map(i=>`<div class="mini-list-item" style="cursor:pointer" data-goto="institutes">${h.escapeHtml(i.name)} <span class="text-faint">${h.escapeHtml(i.department||'')}</span></div>`).join('');
        }
        resultsBox.innerHTML = html;
        resultsBox.querySelectorAll('[data-goto]').forEach(el=>{
          el.addEventListener('click', ()=>{
            APP.router.navigate(el.dataset.goto);
            resultsBox.classList.add('hidden');
            input.value='';
          });
        });
      }
      resultsBox.classList.remove('hidden');
    });
    document.addEventListener('click', (e)=>{
      if(!e.target.closest('.topbar-search')) resultsBox.classList.add('hidden');
    });
  }

  function initDashboardActions(){
    document.getElementById('qaAddSupervisor')?.addEventListener('click', ()=>{
      APP.router.navigate('supervisors');
      setTimeout(()=>document.getElementById('btnAddSupervisor')?.click(), 150);
    });
    document.getElementById('qaAddInstitute')?.addEventListener('click', ()=>{
      APP.router.navigate('institutes');
      setTimeout(()=>document.getElementById('btnAddInstitute')?.click(), 150);
    });
    document.getElementById('qaOpenPlanner')?.addEventListener('click', ()=>APP.router.navigate('planner'));
    document.getElementById('qaOpenBackup')?.addEventListener('click', ()=>APP.router.navigate('backup'));
  }

  function refreshDashboard(){
    const s = APP.statistics.overview();
    setText('statTotalSupervisors', s.activeSupervisors);
    setText('statTotalSupervisorsSub', `من أصل ${s.totalSupervisors} إجمالي`);
    setText('statTotalInstitutes', s.totalInstitutes);
    setText('statTotalInstitutesSub', s.unassignedInstitutesCount ? `${s.unassignedInstitutesCount} بدون تكليف` : 'الكل مُكلّف بموجه');
    setText('statPlannedVisits', s.plannedVisits);
    setText('statPlannedVisitsSub', `من أصل ${s.totalPossible} زيارة ممكنة`);
    setText('statCompletion', `${s.completion}%`);
    setText('statCompletionSub', h.monthLabel(s.monthKey));

    setText('dashCurrentMonth', h.monthLabel(h.currentMonthKey()));
    setText('dashToday', h.formatDateTime());

    renderRecentList();
  }

  function renderRecentList(){
    const el = document.getElementById('dashRecentList');
    if(!el) return;
    const supervisors = storage.listSupervisors().slice(-5).reverse();
    if(!supervisors.length){
      el.innerHTML = `<div class="empty-state"><span>لا يوجد موجهون بعد</span></div>`;
      return;
    }
    el.innerHTML = supervisors.map(s=>`
      <div class="mini-list-item">
        <span class="flex items-center gap-8"><span class="swatch" style="background:${s.color}"></span>${h.escapeHtml(s.name)}</span>
        <span class="badge ${s.status==='active'?'green':'gray'}">${s.status==='active'?'نشط':'معطل'}</span>
      </div>
    `).join('');
  }

  function setText(id, val){
    const el = document.getElementById(id);
    if(el) el.textContent = val;
  }

  function initSettingsPage(){
    const settings = storage.getSettings();
    const titleInput = document.getElementById('settingsSystemTitle');
    const orgInput = document.getElementById('settingsOrgName');
    const friInput = document.getElementById('settingsWeekendFri');
    const satInput = document.getElementById('settingsWeekendSat');
    const thuInput = document.getElementById('settingsWeekendThu');
    const themeDarkInput = document.getElementById('settingsThemeDark');
    const themeLightInput = document.getElementById('settingsThemeLight');

    titleInput.value = settings.systemTitle;
    orgInput.value = settings.orgName;
    friInput.checked = settings.weekendDows.includes(5);
    satInput.checked = settings.weekendDows.includes(6);
    thuInput.checked = settings.weekendDows.includes(4);

    function syncThemeRadios(){
      const t = APP.theme.get();
      themeDarkInput.checked = (t !== 'light');
      themeLightInput.checked = (t === 'light');
    }
    syncThemeRadios();
    themeDarkInput.addEventListener('change', ()=>{ if(themeDarkInput.checked) APP.theme.apply('dark'); });
    themeLightInput.addEventListener('change', ()=>{ if(themeLightInput.checked) APP.theme.apply('light'); });
    // إبقاء راديو الإعدادات متزامناً إن بدّل المستخدم عبر زر الشريط العلوي
    document.getElementById('themeToggleBtn')?.addEventListener('click', syncThemeRadios);

    document.getElementById('btnSaveSettings').addEventListener('click', ()=>{
      const weekendDows = [];
      if(thuInput.checked) weekendDows.push(4);
      if(friInput.checked) weekendDows.push(5);
      if(satInput.checked) weekendDows.push(6);
      storage.saveSettings({
        systemTitle: titleInput.value.trim() || 'خطة موجهي الضبعة',
        orgName: orgInput.value.trim(),
        weekendDows
      });
      applySettingsToUI();
      ui.success('تم الحفظ', 'تم تحديث إعدادات النظام بنجاح');
      APP.planner.render();
      refreshDashboard();
    });

    document.getElementById('btnFactoryReset').addEventListener('click', ()=>{
      ui.confirmDialog({
        title:'إعادة ضبط النظام بالكامل',
        message:'سيتم حذف جميع البيانات (الموجهون، المعاهد، الخطط) نهائيًا وإعادة النظام لحالته الأولى. يُفضّل تصدير نسخة احتياطية أولًا. هل تريد المتابعة؟',
        danger:true, confirmLabel:'حذف كل شيء',
        onConfirm:()=>{
          storage.replaceDB(storage.defaultDB());
          ui.success('تمت إعادة الضبط', 'تم إعادة النظام لحالته الأولى');
          refreshAll();
          applySettingsToUI();
        }
      });
    });
  }

  function refreshAll(){
    APP.supervisors.render();
    APP.institutes.render();
    APP.planner.render();
    APP.reports.render();
    refreshDashboard();
  }

  return { boot, refreshDashboard, refreshAll };
})();

document.addEventListener('DOMContentLoaded', ()=>{
  APP.app.boot();
});
