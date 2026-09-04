/* ============================================================
   institutes.js — إدارة المعاهد
   ============================================================ */
window.APP = window.APP || {};
APP.institutes = (function(){
  const storage = APP.storage;
  const h = APP.helpers;
  const ui = APP.ui;

  function init(){
    document.getElementById('btnAddInstitute')?.addEventListener('click',()=>openForm());
    render();
    populateFilterOptions();
  }

  function populateFilterOptions(){
    const list=storage.listInstitutes();
    const d=document.getElementById('filterDepartment'), s=document.getElementById('filterStage');
    if(!d||!s)return;
    const oldD=d.value, oldS=s.value;
    d.innerHTML='<option value="">جميع الإدارات</option>'+[...new Set(list.map(i=>i.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')).map(x=>`<option value="${h.escapeHtml(x)}">${h.escapeHtml(x)}</option>`).join('');
    s.innerHTML='<option value="">جميع المراحل</option>'+[...new Set(list.map(i=>i.stage).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')).map(x=>`<option value="${h.escapeHtml(x)}">${h.escapeHtml(x)}</option>`).join('');
    if([...d.options].some(o=>o.value===oldD)) d.value=oldD;
    if([...s.options].some(o=>o.value===oldS)) s.value=oldS;
  }

  function render(){ filterTable(); }

  function renderRows(list){
    const tbody=document.getElementById('institutesTableBody'); if(!tbody)return;
    const total=storage.listInstitutes().length;
    document.getElementById('institutesCountBadge')?.replaceChildren(document.createTextNode(`المعروض: ${list.length} من أصل ${total}`));
    if(!list.length){tbody.innerHTML='<tr><td colspan="5" class="text-center">لا توجد معاهد مسجلة</td></tr>';return;}
    tbody.innerHTML=list.map((i,n)=>`<tr><td>${n+1}</td><td><strong>${h.escapeHtml(i.name||'')}</strong></td><td>${h.escapeHtml(i.code||'-')}</td><td>${h.escapeHtml(i.department||'-')}</td><td><span class="badge blue">${h.escapeHtml(i.stage||'-')}</span></td></tr>`).join('');
  }

  function filterTable(){
    const q=(document.getElementById('instituteSearchInput')?.value||'').trim();
    const d=document.getElementById('filterDepartment')?.value||'';
    const s=document.getElementById('filterStage')?.value||'';
    const list=storage.listInstitutes().filter(i=>{
      const match=!q||h.contains(i.name,q)||h.contains(i.code,q);
      return match&&(!d||i.department===d)&&(!s||i.stage===s);
    });
    renderRows(list);
  }

  function resetFilters(){
    const q=document.getElementById('instituteSearchInput'); if(q)q.value='';
    const d=document.getElementById('filterDepartment'); if(d)d.value='';
    const s=document.getElementById('filterStage'); if(s)s.value='';
    render();
  }

  function openForm(id){
    const existing=id?storage.getInstitute(id):null;
    const body=`<div class="form-row"><div class="form-group"><label>اسم المعهد *</label><input id="fInstName" class="form-control" value="${h.escapeHtml(existing?.name||'')}"></div><div class="form-group"><label>الكود</label><input id="fInstCode" class="form-control" value="${h.escapeHtml(existing?.code||'')}"></div></div><div class="form-row"><div class="form-group"><label>الإدارة</label><input id="fInstDept" class="form-control" value="${h.escapeHtml(existing?.department||'')}"></div><div class="form-group"><label>المرحلة</label><input id="fInstStage" class="form-control" value="${h.escapeHtml(existing?.stage||'')}"></div></div><div class="form-row"><div class="form-group"><label>عدد الفصول</label><input id="fInstClasses" type="number" min="0" class="form-control" value="${existing?.classCount??''}"></div><div class="form-group"><label>ملاحظات</label><input id="fInstNotes" class="form-control" value="${h.escapeHtml(existing?.notes||'')}"></div></div>`;
    ui.openModal({title:existing?'تعديل المعهد':'إضافة معهد',icon:'🏫',bodyHtml:body,footerButtons:[{label:'إلغاء',className:'btn-ghost'},{label:existing?'حفظ التعديل':'إضافة المعهد',className:'btn-primary',close:false,onClick:ov=>{
      const name=document.getElementById('fInstName').value.trim();
      if(!h.normalize(name)||name.length<2){ui.error('بيانات ناقصة','أدخل اسم المعهد');return;}
      const inst=existing||{id:h.uid('inst')};
      inst.name=name; inst.code=document.getElementById('fInstCode').value.trim(); inst.department=document.getElementById('fInstDept').value.trim(); inst.stage=document.getElementById('fInstStage').value.trim(); inst.classCount=Number(document.getElementById('fInstClasses').value)||0; inst.notes=document.getElementById('fInstNotes').value.trim();
      storage.saveInstitute(inst); ui.closeModal(ov); populateFilterOptions(); render(); ui.success(existing?'تم الحفظ':'تمت الإضافة',inst.name); APP.app.refreshDashboard();
    }}]});
  }

  return {init,render,renderRows,filterTable,resetFilters,populateFilterOptions};
})();
