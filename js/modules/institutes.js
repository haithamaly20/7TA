/* ============================================================
   institutes.js — إدارة المعاهد
   ============================================================ */
window.APP = window.APP || {};

APP.institutes = (function(){
  const h = APP.helpers;
  const storage = APP.storage;
  const ui = APP.ui;

  let state = { query:'', sortKey:'name', sortDir:1 };

  function init(){
    document.getElementById('btnAddInstitute').addEventListener('click', ()=>openInstituteForm());
    const search = document.getElementById('instituteSearch');
    search.addEventListener('input', h.debounce(()=>{ state.query = search.value; render(); }, 150));

    document.querySelectorAll('#institutesTable thead th[data-sort]').forEach(th=>{
      th.addEventListener('click', ()=>{
        const key = th.dataset.sort;
        if(state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
        render();
      });
    });

    render();
  }

  function getFiltered(){
    let list = storage.listInstitutes().slice();
    if(state.query){
      list = list.filter(i=>h.contains(i.name, state.query) || h.contains(i.department, state.query) || h.contains(i.stage, state.query));
    }
    list.sort((a,b)=>{
      const ka = (a[state.sortKey]||'').toString();
      const kb = (b[state.sortKey]||'').toString();
      return ka.localeCompare(kb,'ar') * state.sortDir;
    });
    return list;
  }

  function supervisorsOf(instituteId){
    return storage.listSupervisors().filter(s=>(s.instituteIds||[]).includes(instituteId));
  }

  function render(){
    const tbody = document.getElementById('institutesTbody');
    const list = getFiltered();
    document.getElementById('instituteCount').textContent = `${storage.listInstitutes().length} معهد`;

    if(!list.length){
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="6">
        <div class="empty-state"><div class="icon">🏫</div><strong>لا توجد معاهد بعد</strong><span>ابدأ بإضافة أول معهد ليتم تكليف الموجهين به</span></div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((i,idx)=>{
      const supCount = supervisorsOf(i.id).length;
      return `
      <tr data-id="${i.id}">
        <td class="row-num">${idx+1}</td>
        <td><strong>${h.escapeHtml(i.name)}</strong></td>
        <td>${h.escapeHtml(i.department||'-')}</td>
        <td>${h.escapeHtml(i.stage||'-')}</td>
        <td>${i.classCount ?? '-'}</td>
        <td><span class="badge blue">${supCount} موجه</span></td>
        <td>
          <div class="table-actions">
            <button class="action-icon" title="تعديل" data-act="edit">✏️</button>
            <button class="action-icon danger" title="حذف" data-act="delete">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(tr=>{
      const id = tr.dataset.id;
      tr.querySelector('[data-act="edit"]').addEventListener('click', ()=>openInstituteForm(id));
      tr.querySelector('[data-act="delete"]').addEventListener('click', ()=>confirmDelete(id));
    });
  }

  function confirmDelete(id){
    const inst = storage.getInstitute(id);
    const supCount = supervisorsOf(id).length;
    ui.confirmDialog({
      title:'حذف معهد',
      message:`هل أنت متأكد من حذف معهد "${inst.name}"؟ ${supCount ? `سيتم إزالته من تكليفات ${supCount} موجه ومن الخطة.` : ''}`,
      danger:true,
      confirmLabel:'حذف نهائيًا',
      onConfirm:()=>{
        storage.deleteInstitute(id);
        ui.success('تم الحذف', `تم حذف معهد "${inst.name}"`);
        render();
        APP.app.refreshDashboard();
      }
    });
  }

  function openInstituteForm(id){
    const existing = id ? storage.getInstitute(id) : null;
    const bodyHtml = `
      <div class="form-group">
        <label>اسم المعهد *</label>
        <input type="text" id="fInstName" value="${h.escapeHtml(existing?.name||'')}" placeholder="مثال: معهد الضبعة الأزهري">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>الإدارة</label>
          <input type="text" id="fInstDept" value="${h.escapeHtml(existing?.department||'')}" placeholder="إدارة الضبعة">
        </div>
        <div class="form-group">
          <label>المرحلة</label>
          <input type="text" id="fInstStage" value="${h.escapeHtml(existing?.stage||'')}" placeholder="ابتدائي / إعدادي / ثانوي">
        </div>
      </div>
      <div class="form-group">
        <label>عدد الفصول</label>
        <input type="number" min="0" id="fInstClasses" value="${existing?.classCount ?? ''}">
      </div>
      <div class="form-group">
        <label>ملاحظات</label>
        <textarea id="fInstNotes" placeholder="ملاحظات إضافية...">${h.escapeHtml(existing?.notes||'')}</textarea>
      </div>
    `;

    const overlay = ui.openModal({
      title: existing ? 'تعديل بيانات المعهد' : 'إضافة معهد جديد',
      icon:'🏫',
      bodyHtml,
      footerButtons:[
        { label:'إلغاء', className:'btn-ghost' },
        { label: existing ? 'حفظ التعديلات' : 'إضافة المعهد', className:'btn-primary', close:false, onClick:(ov)=>{
          const name = document.getElementById('fInstName').value.trim();
          if(!APP.validation.isNameValid(name)){
            ui.error('بيانات غير مكتملة','يرجى إدخال اسم المعهد (حرفان على الأقل)');
            return;
          }
          const inst = existing || { id:h.uid('inst') };
          inst.name = name;
          inst.department = document.getElementById('fInstDept').value.trim();
          inst.stage = document.getElementById('fInstStage').value.trim();
          const cc = document.getElementById('fInstClasses').value;
          inst.classCount = cc === '' ? null : Number(cc);
          inst.notes = document.getElementById('fInstNotes').value.trim();
          storage.saveInstitute(inst);
          ui.success(existing ? 'تم الحفظ' : 'تمت الإضافة', inst.name);
          ui.closeModal(ov);
          render();
          APP.app.refreshDashboard();
        }}
      ]
    });
  }

  return { init, render, supervisorsOf };
})();
