/* ============================================================
institutes.js — إدارة المعاهد
============================================================ */
window.APP = window.APP || {};
APP.institutes = (function(){
  const storage = APP.storage;
  const h = APP.helpers;
  const ui = APP.ui;

  function init(){
    document.getElementById('btnAddInstitute')?.addEventListener('click', () => openForm());
    render();
    populateFilterOptions();
  }

  // ⭐ الإصلاح: وضع النص الافتراضي داخل <option value=""> صحيح
  function populateFilterOptions(){
    const list = storage.listInstitutes();
    const d = document.getElementById('filterDepartment');
    const s = document.getElementById('filterStage');
    if(!d || !s) return;
    const oldD = d.value, oldS = s.value;

    const depts = [...new Set(list.map(i => i.department).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b, 'ar'));
    d.innerHTML = '<option value="">جميع الإدارات</option>' +
      depts.map(x => `<option value="${h.escapeHtml(x)}">${h.escapeHtml(x)}</option>`).join('');

    const stages = [...new Set(list.map(i => i.stage).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b, 'ar'));
    s.innerHTML = '<option value="">جميع المراحل</option>' +
      stages.map(x => `<option value="${h.escapeHtml(x)}">${h.escapeHtml(x)}</option>`).join('');

    if([...d.options].some(o => o.value === oldD)) d.value = oldD;
    if([...s.options].some(o => o.value === oldS)) s.value = oldS;
  }

  function render(){ filterTable(); }

  function renderRows(list){
    const tbody = document.getElementById('institutesTableBody');
    if(!tbody) return;
    const total = storage.listInstitutes().length;
    const badge = document.getElementById('institutesCountBadge');
    if(badge) badge.textContent = `المعروض: ${list.length} من أصل ${total}`;

    if(!list.length){
      tbody.innerHTML = `
        <tr class="table-empty-row"><td colspan="6">
          <div class="empty-state"><div class="icon">🏫</div>
          <strong>لا توجد معاهد مسجلة</strong>
          <span>ابدأ بإضافة أول معهد</span></div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((i, n) => `
      <tr data-id="${i.id}">
        <td class="row-num">${n+1}</td>
        <td><strong>${h.escapeHtml(i.name || '')}</strong></td>
        <td>${h.escapeHtml(i.code || '-')}</td>
        <td>${h.escapeHtml(i.department || '-')}</td>
        <td><span class="badge blue">${h.escapeHtml(i.stage || '-')}</span></td>
        <td>
          <div class="table-actions">
            <button class="action-icon" title="تعديل" data-act="edit">✏️</button>
            <button class="action-icon danger" title="حذف" data-act="delete">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');

    // ⭐ ربط أزرار التعديل والحذف
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id;
      tr.querySelector('[data-act="edit"]')?.addEventListener('click', () => openForm(id));
      tr.querySelector('[data-act="delete"]')?.addEventListener('click', () => confirmDelete(id));
    });
  }

  function filterTable(){
    const q = (document.getElementById('instituteSearchInput')?.value || '').trim();
    const d = document.getElementById('filterDepartment')?.value || '';
    const s = document.getElementById('filterStage')?.value || '';
    const list = storage.listInstitutes().filter(i => {
      const match = !q || h.contains(i.name, q) || h.contains(i.code, q);
      return match && (!d || i.department === d) && (!s || i.stage === s);
    });
    renderRows(list);
  }

  function resetFilters(){
    const q = document.getElementById('instituteSearchInput'); if(q) q.value = '';
    const d = document.getElementById('filterDepartment'); if(d) d.value = '';
    const s = document.getElementById('filterStage'); if(s) s.value = '';
    render();
  }

  // ⭐ جديد: حذف معهد مع تأكيد
  function confirmDelete(id){
    const inst = storage.getInstitute(id);
    if(!inst) return;
    ui.confirmDialog({
      title: 'حذف معهد',
      message: `هل أنت متأكد من حذف المعهد "${inst.name}"؟ سيتم إزالة تكليفه من جميع الموجهين ومن الخطط.`,
      danger: true,
      confirmLabel: 'حذف نهائيًا',
      onConfirm: () => {
        storage.deleteInstitute(id);
        ui.success('تم الحذف', `تم حذف المعهد "${inst.name}"`);
        populateFilterOptions();
        render();
        APP.app.refreshDashboard();
      }
    });
  }

  function openForm(id){
    const existing = id ? storage.getInstitute(id) : null;
    const body = `
      <div class="form-row">
        <div class="form-group">
          <label>اسم المعهد *</label>
          <input id="fInstName" type="text" value="${h.escapeHtml(existing?.name || '')}" placeholder="مثال: معهد الفرقان">
        </div>
        <div class="form-group">
          <label>الكود</label>
          <input id="fInstCode" type="text" value="${h.escapeHtml(existing?.code || '')}" placeholder="كود المعهد">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>الإدارة</label>
          <input id="fInstDept" type="text" value="${h.escapeHtml(existing?.department || '')}" placeholder="إدارة الضبعة">
        </div>
        <div class="form-group">
          <label>المرحلة</label>
          <input id="fInstStage" type="text" value="${h.escapeHtml(existing?.stage || '')}" placeholder="ابتدائي / إعدادي / ثانوي">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>عدد الفصول</label>
          <input id="fInstClasses" type="number" min="0" value="${existing?.classCount ?? ''}">
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input id="fInstNotes" type="text" value="${h.escapeHtml(existing?.notes || '')}">
        </div>
      </div>
    `;
    ui.openModal({
      title: existing ? 'تعديل المعهد' : 'إضافة معهد',
      icon: '🏫',
      bodyHtml: body,
      footerButtons: [
        { label: 'إلغاء', className: 'btn-ghost' },
        {
          label: existing ? 'حفظ التعديل' : 'إضافة المعهد',
          className: 'btn-primary',
          close: false,
          onClick: (ov) => {
            const name = document.getElementById('fInstName').value.trim();
            if(!name || name.length < 2){
              ui.error('بيانات ناقصة', 'أدخل اسم المعهد (حرفان على الأقل)');
              return;
            }
            const inst = existing || { id: h.uid('inst') };
            inst.name = name;
            inst.code = document.getElementById('fInstCode').value.trim();
            inst.department = document.getElementById('fInstDept').value.trim();
            inst.stage = document.getElementById('fInstStage').value.trim();
            inst.classCount = Number(document.getElementById('fInstClasses').value) || 0;
            inst.notes = document.getElementById('fInstNotes').value.trim();
            storage.saveInstitute(inst);
            ui.closeModal(ov);
            populateFilterOptions();
            render();
            ui.success(existing ? 'تم الحفظ' : 'تمت الإضافة', inst.name);
            APP.app.refreshDashboard();
          }
        }
      ]
    });
  }

  return { init, render, renderRows, filterTable, resetFilters, populateFilterOptions };
})();
