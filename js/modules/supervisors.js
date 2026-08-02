/* ============================================================
   supervisors.js — إدارة الموجهين وتكليفاتهم بالمعاهد
   ============================================================ */
window.APP = window.APP || {};

APP.supervisors = (function(){
  const h = APP.helpers;
  const storage = APP.storage;
  const ui = APP.ui;

  let state = { query:'', sortKey:'name', sortDir:1, statusFilter:'all' };

  function init(){
    document.getElementById('btnAddSupervisor').addEventListener('click', ()=>openSupervisorForm());
    const search = document.getElementById('supervisorSearch');
    search.addEventListener('input', h.debounce(()=>{ state.query = search.value; render(); }, 150));

    document.getElementById('supervisorStatusFilter').addEventListener('change', (e)=>{
      state.statusFilter = e.target.value; render();
    });

    document.querySelectorAll('#supervisorsTable thead th[data-sort]').forEach(th=>{
      th.addEventListener('click', ()=>{
        const key = th.dataset.sort;
        if(state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
        render();
      });
    });

    render();
  }

  function getFiltered(){
    let list = storage.listSupervisors().slice();
    if(state.query){
      list = list.filter(s=> h.contains(s.name, state.query) || h.contains(s.role, state.query) || h.contains((s.departments||[]).join(' '), state.query));
    }
    if(state.statusFilter !== 'all'){
      list = list.filter(s=>s.status === state.statusFilter);
    }
    list.sort((a,b)=>{
      const ka = (a[state.sortKey]||'').toString();
      const kb = (b[state.sortKey]||'').toString();
      return ka.localeCompare(kb, 'ar') * state.sortDir;
    });
    return list;
  }

  function render(){
    const tbody = document.getElementById('supervisorsTbody');
    const list = getFiltered();
    document.getElementById('supervisorCount').textContent = `${storage.listSupervisors().length} موجه`;

    if(!list.length){
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="7">
        <div class="empty-state"><div class="icon">🧑‍🏫</div><strong>لا يوجد موجهون بعد</strong><span>ابدأ بإضافة أول موجه لإدارة خطته</span></div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((s,idx)=>{
      const instCount = (s.instituteIds||[]).length;
      const statusBadge = s.status === 'active'
        ? `<span class="badge green">نشط</span>`
        : `<span class="badge gray">معطّل</span>`;
      return `
      <tr class="${s.status!=='active'?'row-disabled':''}" data-id="${s.id}">
        <td class="row-num">${idx+1}</td>
        <td><span class="swatch" style="background:${s.color}"></span></td>
        <td><strong>${h.escapeHtml(s.name)}</strong></td>
        <td>${h.escapeHtml(s.role||'-')}</td>
        <td>${h.escapeHtml((s.departments||[]).join('، ')||'-')}</td>
        <td>${instCount} معهد</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="action-icon" title="المعاهد المكلف بها" data-act="assign">🏫</button>
            <button class="action-icon" title="تعديل" data-act="edit">✏️</button>
            <button class="action-icon" title="${s.status==='active'?'تعطيل':'تفعيل'}" data-act="toggle">${s.status==='active'?'⏸':'▶'}</button>
            <button class="action-icon danger" title="حذف" data-act="delete">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(tr=>{
      const id = tr.dataset.id;
      tr.querySelector('[data-act="assign"]').addEventListener('click', ()=>openAssignInstitutes(id));
      tr.querySelector('[data-act="edit"]').addEventListener('click', ()=>openSupervisorForm(id));
      tr.querySelector('[data-act="toggle"]').addEventListener('click', ()=>toggleStatus(id));
      tr.querySelector('[data-act="delete"]').addEventListener('click', ()=>confirmDelete(id));
    });
  }

  function toggleStatus(id){
    const sup = storage.getSupervisor(id);
    sup.status = sup.status === 'active' ? 'disabled' : 'active';
    storage.saveSupervisor(sup);
    ui.success(sup.status==='active' ? 'تم التفعيل' : 'تم التعطيل', sup.name);
    render();
    APP.app.refreshDashboard();
  }

  function confirmDelete(id){
    const sup = storage.getSupervisor(id);
    ui.confirmDialog({
      title:'حذف موجه',
      message:`هل أنت متأكد من حذف الموجه "${sup.name}"؟ سيتم حذف جميع بياناته وتكليفاته من الخطة نهائيًا.`,
      danger:true,
      confirmLabel:'حذف نهائيًا',
      onConfirm:()=>{
        storage.deleteSupervisor(id);
        ui.success('تم الحذف', `تم حذف الموجه "${sup.name}"`);
        render();
        APP.app.refreshDashboard();
      }
    });
  }

  function openSupervisorForm(id){
    const existing = id ? storage.getSupervisor(id) : null;
    const departmentsVal = existing ? (existing.departments||[]).join('، ') : '';
    const color = existing ? existing.color : h.PALETTE[storage.listSupervisors().length % h.PALETTE.length];

    const bodyHtml = `
      <div class="form-group">
        <label>اسم الموجه *</label>
        <input type="text" id="fSupName" value="${h.escapeHtml(existing?.name||'')}" placeholder="مثال: أ. محمد أحمد">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>الوظيفة</label>
          <input type="text" id="fSupRole" value="${h.escapeHtml(existing?.role||'')}" placeholder="موجه أول لغة عربية">
        </div>
        <div class="form-group">
          <label>الهاتف (اختياري)</label>
          <input type="tel" id="fSupPhone" value="${h.escapeHtml(existing?.phone||'')}" placeholder="01xxxxxxxxx">
        </div>
      </div>
      <div class="form-group">
        <label>الإدارة أو الإدارات (افصل بينها بفاصلة)</label>
        <input type="text" id="fSupDepts" value="${h.escapeHtml(departmentsVal)}" placeholder="إدارة الضبعة، إدارة مطروح">
      </div>
      <div class="form-group">
        <label>اللون المميز</label>
        <div class="color-swatches" id="fSupColorSwatches"></div>
        <input type="hidden" id="fSupColor" value="${color}">
      </div>
      <div class="form-group">
        <label>ملاحظات</label>
        <textarea id="fSupNotes" placeholder="ملاحظات إضافية...">${h.escapeHtml(existing?.notes||'')}</textarea>
      </div>
    `;

    const overlay = ui.openModal({
      title: existing ? 'تعديل بيانات الموجه' : 'إضافة موجه جديد',
      icon:'🧑‍🏫',
      bodyHtml,
      footerButtons:[
        { label:'إلغاء', className:'btn-ghost' },
        { label: existing ? 'حفظ التعديلات' : 'إضافة الموجه', className:'btn-primary', close:false, onClick:(ov)=>{
          const name = document.getElementById('fSupName').value.trim();
          if(!APP.validation.isNameValid(name)){
            ui.error('بيانات غير مكتملة','يرجى إدخال اسم الموجه (حرفان على الأقل)');
            return;
          }
          const sup = existing || { id:h.uid('sup'), status:'active', instituteIds:[] };
          sup.name = name;
          sup.role = document.getElementById('fSupRole').value.trim();
          sup.phone = document.getElementById('fSupPhone').value.trim();
          sup.departments = document.getElementById('fSupDepts').value.split('،').map(s=>s.trim()).filter(Boolean).length
            ? document.getElementById('fSupDepts').value.split(/[،,]/).map(s=>s.trim()).filter(Boolean)
            : [];
          sup.color = document.getElementById('fSupColor').value;
          sup.notes = document.getElementById('fSupNotes').value.trim();
          storage.saveSupervisor(sup);
          ui.success(existing ? 'تم الحفظ' : 'تمت الإضافة', sup.name);
          ui.closeModal(ov);
          render();
          APP.app.refreshDashboard();
        }}
      ],
      onOpen:()=>{
        const sw = document.getElementById('fSupColorSwatches');
        sw.innerHTML = h.PALETTE.map(c=>`<span class="color-swatch ${c===color?'selected':''}" style="background:${c}" data-c="${c}"></span>`).join('');
        sw.querySelectorAll('.color-swatch').forEach(s=>{
          s.addEventListener('click', ()=>{
            sw.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('selected'));
            s.classList.add('selected');
            document.getElementById('fSupColor').value = s.dataset.c;
          });
        });
      }
    });
  }

  function openAssignInstitutes(supervisorId){
    const sup = storage.getSupervisor(supervisorId);
    const allInstitutes = storage.listInstitutes().slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
    let assigned = new Set(sup.instituteIds||[]);
    let query = '';

    const bodyHtml = `
      <div class="search-box mb-12">
        <input type="text" id="assignSearch" placeholder="ابحث داخل المعاهد...">
        <span class="ico">🔍</span>
      </div>
      <div class="flex justify-between items-center mb-12">
        <span class="text-faint" id="assignCountLabel" style="font-size:12.5px;"></span>
        <div class="flex gap-8">
          <button class="btn btn-sm btn-outline" id="assignSelectAll">تحديد الكل</button>
          <button class="btn btn-sm btn-outline" id="assignClearAll">إلغاء التحديد</button>
        </div>
      </div>
      <div class="institute-picker" id="instPickerList"></div>
    `;

    const overlay = ui.openModal({
      title:`المعاهد المكلف بها — ${sup.name}`,
      icon:'🏫',
      size:'lg',
      bodyHtml,
      footerButtons:[
        { label:'إلغاء', className:'btn-ghost' },
        { label:'حفظ التكليف', className:'btn-primary', close:false, onClick:(ov)=>{
          sup.instituteIds = Array.from(assigned);
          storage.saveSupervisor(sup);
          ui.success('تم الحفظ', `تم تحديث معاهد ${sup.name}`);
          ui.closeModal(ov);
          render();
        }}
      ],
      onOpen:()=>{
        const listEl = document.getElementById('instPickerList');
        const countLabel = document.getElementById('assignCountLabel');

        function renderList(){
          const filtered = allInstitutes.filter(i=>h.contains(i.name, query) || h.contains(i.department, query));
          countLabel.textContent = `${assigned.size} من أصل ${allInstitutes.length} معهد محدد`;
          if(!filtered.length){
            listEl.innerHTML = `<div class="empty-state"><span>لا توجد معاهد مطابقة</span></div>`;
            return;
          }
          listEl.innerHTML = filtered.map(i=>`
            <label class="institute-picker-row">
              <input type="checkbox" data-id="${i.id}" ${assigned.has(i.id)?'checked':''}>
              <div class="flex-col" style="flex:1;">
                <span>${h.escapeHtml(i.name)}</span>
                <span class="meta">${h.escapeHtml(i.department||'')} ${i.stage?'· '+h.escapeHtml(i.stage):''}</span>
              </div>
            </label>
          `).join('');
          listEl.querySelectorAll('input[type=checkbox]').forEach(cb=>{
            cb.addEventListener('change', ()=>{
              if(cb.checked) assigned.add(cb.dataset.id); else assigned.delete(cb.dataset.id);
              countLabel.textContent = `${assigned.size} من أصل ${allInstitutes.length} معهد محدد`;
            });
          });
        }

        document.getElementById('assignSearch').addEventListener('input', h.debounce((e)=>{
          query = e.target.value; renderList();
        }, 120));
        document.getElementById('assignSelectAll').addEventListener('click', ()=>{
          allInstitutes.forEach(i=>assigned.add(i.id)); renderList();
        });
        document.getElementById('assignClearAll').addEventListener('click', ()=>{
          assigned.clear(); renderList();
        });

        renderList();
      }
    });
  }

  return { init, render };
})();
