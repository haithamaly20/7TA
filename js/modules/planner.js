/* ============================================================
   planner.js — إنشاء الخطة الشهرية للزيارات
   ============================================================ */
window.APP = window.APP || {};

APP.planner = (function(){
  const h = APP.helpers;
  const storage = APP.storage;
  const ui = APP.ui;
  const validation = APP.validation;

  let currentMonthKey = h.currentMonthKey();
  let clipboardCell = null; // {supervisorId, instituteId} for drag&drop
  let clipboardWeek = null; // {supervisorId, days:[{day,instituteId}]}

  function init(){
    const monthInput = document.getElementById('plannerMonth');
    monthInput.value = currentMonthKey;
    monthInput.addEventListener('change', ()=>{
      currentMonthKey = monthInput.value || h.currentMonthKey();
      render();
    });

    document.getElementById('btnCopyPrevMonth').addEventListener('click', copyPrevMonth);
    document.getElementById('btnClearMonth').addEventListener('click', clearMonthConfirm);
    document.getElementById('btnValidatePlan').addEventListener('click', showValidationReport);

    render();
  }

  function activeSupervisors(){
    return storage.listSupervisors().filter(s=>s.status==='active');
  }

  function getWorkingDays(){
    const settings = storage.getSettings();
    return h.getMonthDays(currentMonthKey, settings.weekendDows);
  }

  function render(){
    const supervisors = activeSupervisors();
    const days = getWorkingDays();
    const wrap = document.getElementById('plannerTableWrap');
    document.getElementById('plannerMonthLabel').textContent = h.monthLabel(currentMonthKey);

    if(!supervisors.length){
      wrap.innerHTML = `<div class="empty-state"><div class="icon">🗓️</div><strong>لا يوجد موجهون نشطون</strong><span>أضف موجهين من صفحة "الموجهون" أولًا لإنشاء الخطة</span></div>`;
      return;
    }

    const plan = storage.getMonthPlan(currentMonthKey);

    let thead = `<tr><th class="sup-col-header">الموجه</th>`;
    days.forEach(d=>{
      thead += `<th class="${d.isWeekend?'weekend-col':''}">${d.day}<br><small>${d.dowName}</small></th>`;
    });
    thead += `</tr>`;

    let tbody = '';
    supervisors.forEach(sup=>{
      const dayMap = plan[sup.id] || {};
      const assignedInstitutes = (sup.instituteIds||[]).map(id=>storage.getInstitute(id)).filter(Boolean);
      tbody += `<tr>
        <th class="sup-row-header" draggable="true" data-sup-drag="${sup.id}">
          <span class="swatch" style="background:${sup.color}; margin-inline-end:6px;"></span>${h.escapeHtml(sup.name)}
        </th>`;
      days.forEach(d=>{
        if(d.isWeekend){
          tbody += `<td class="plan-cell weekend-cell"></td>`;
          return;
        }
        const currentInstId = dayMap[d.day] || '';
        let options = `<option value="">—</option>`;
        assignedInstitutes.forEach(inst=>{
          options += `<option value="${inst.id}" ${inst.id===currentInstId?'selected':''}>${h.escapeHtml(inst.name)}</option>`;
        });
        tbody += `<td class="plan-cell">
          <select class="plan-select ${currentInstId?'has-value':''}" data-sup="${sup.id}" data-day="${d.day}">
            ${options}
          </select>
        </td>`;
      });
      tbody += `</tr>`;
    });

    wrap.innerHTML = `
      <div class="planner-scroll">
        <table class="planner-table">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    `;

    bindCellEvents();
    bindRowDrag();
    markConflicts();
  }

  function bindCellEvents(){
    document.querySelectorAll('.plan-select').forEach(sel=>{
      sel.addEventListener('change', ()=>{
        const supId = sel.dataset.sup;
        const day = sel.dataset.day;
        const instId = sel.value || null;

        if(instId){
          const conflictSup = validation.findInstituteConflict(currentMonthKey, day, instId, supId);
          if(conflictSup){
            const otherName = storage.getSupervisor(conflictSup)?.name || 'موجه آخر';
            ui.error('تعارض في الخطة', `هذا المعهد مخطط له بالفعل مع ${otherName} في نفس اليوم`);
            sel.value = '';
            return;
          }
        }
        storage.setCell(currentMonthKey, supId, day, instId);
        sel.classList.toggle('has-value', !!instId);
      });
    });
  }

  function bindRowDrag(){
    // Drag a supervisor's whole day-map onto another supervisor row (only into empty cells with matching institutes) — simplified: copy whole week via buttons instead.
    document.querySelectorAll('[data-sup-drag]').forEach(rowHeader=>{
      rowHeader.addEventListener('dragstart', (e)=>{
        e.dataTransfer.setData('text/plain', rowHeader.dataset.supDrag);
      });
    });
  }

  function markConflicts(){
    const days = getWorkingDays().filter(d=>!d.isWeekend);
    const analysis = validation.analyzeMonthPlan(currentMonthKey, days);
    // highlight conflicting selects
    document.querySelectorAll('.plan-select').forEach(sel=>sel.classList.remove('conflict'));
    analysis.conflicts.forEach(c=>{
      c.supervisors.forEach(supId=>{
        const sel = document.querySelector(`.plan-select[data-sup="${supId}"][data-day="${c.day}"]`);
        if(sel) sel.classList.add('conflict');
      });
    });
  }

  function copyPrevMonth(){
    const [y,m] = currentMonthKey.split('-').map(Number);
    const prevDate = new Date(y, m-2, 1);
    const prevKey = `${prevDate.getFullYear()}-${h.pad2(prevDate.getMonth()+1)}`;
    const prevPlan = storage.getMonthPlan(prevKey);
    if(!Object.keys(prevPlan).length){
      ui.warning('لا توجد بيانات', `لا توجد خطة محفوظة للشهر السابق (${h.monthLabel(prevKey)})`);
      return;
    }
    ui.confirmDialog({
      title:'نسخ خطة الشهر السابق',
      message:`سيتم نسخ خطة شهر ${h.monthLabel(prevKey)} إلى شهر ${h.monthLabel(currentMonthKey)}. سيتم استبدال أي بيانات حالية لهذا الشهر.`,
      confirmLabel:'نسخ الآن',
      onConfirm:()=>{
        storage.copyMonth(prevKey, currentMonthKey);
        ui.success('تم النسخ', `تم نسخ خطة ${h.monthLabel(prevKey)} بنجاح`);
        render();
      }
    });
  }

  function clearMonthConfirm(){
    ui.confirmDialog({
      title:'مسح خطة الشهر',
      message:`هل أنت متأكد من مسح خطة شهر ${h.monthLabel(currentMonthKey)} بالكامل؟ لا يمكن التراجع عن هذا الإجراء.`,
      danger:true,
      confirmLabel:'مسح الخطة',
      onConfirm:()=>{
        storage.getDB().plans[currentMonthKey] = {};
        storage.persist();
        ui.success('تم المسح', 'تم مسح خطة الشهر بالكامل');
        render();
      }
    });
  }

  function showValidationReport(){
    const days = getWorkingDays().filter(d=>!d.isWeekend);
    const analysis = validation.analyzeMonthPlan(currentMonthKey, days);
    const supervisors = activeSupervisors();

    let html = '';
    if(analysis.conflicts.length){
      html += `<h4 class="text-red mb-8">⚠ تعارضات (${analysis.conflicts.length})</h4><ul class="mini-list mb-16">`;
      analysis.conflicts.forEach(c=>{
        const inst = storage.getInstitute(c.instituteId);
        const names = c.supervisors.map(id=>storage.getSupervisor(id)?.name).join(' و ');
        html += `<li class="mini-list-item"><span>يوم ${c.day}: ${h.escapeHtml(inst?.name||'')}</span><span class="text-red">${h.escapeHtml(names)}</span></li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p class="text-green mb-16">✔ لا توجد تعارضات في الخطة الحالية</p>`;
    }

    html += `<h4 class="mb-8">أيام بلا زيارات مخططة</h4><ul class="mini-list mb-16">`;
    supervisors.forEach(sup=>{
      const empty = analysis.emptyDaysBySupervisor[sup.id] || [];
      html += `<li class="mini-list-item"><span>${h.escapeHtml(sup.name)}</span><span class="${empty.length?'text-amber':'text-green'}">${empty.length ? empty.length+' يوم فارغ' : 'مكتملة'}</span></li>`;
    });
    html += `</ul>`;

    if(analysis.unplannedInstituteIds.length){
      html += `<h4 class="text-amber mb-8">معاهد غير مخططة هذا الشهر (${analysis.unplannedInstituteIds.length})</h4><ul class="mini-list">`;
      analysis.unplannedInstituteIds.slice(0,30).forEach(id=>{
        const inst = storage.getInstitute(id);
        html += `<li class="mini-list-item"><span>${h.escapeHtml(inst?.name||'')}</span></li>`;
      });
      html += `</ul>`;
    }

    ui.openModal({ title:'تقرير التحقق من الخطة', icon:'🔎', size:'lg', bodyHtml: html,
      footerButtons:[{ label:'إغلاق', className:'btn-primary' }] });
  }

  function getCurrentMonthKey(){ return currentMonthKey; }

  return { init, render, getCurrentMonthKey, getWorkingDays };
})();
