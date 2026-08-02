/* ============================================================
   importExport.js — التصدير والاستيراد والنسخ الاحتياطي
   ============================================================ */
window.APP = window.APP || {};

APP.importExport = (function(){
  const h = APP.helpers;
  const storage = APP.storage;
  const ui = APP.ui;

  function init(){
    document.getElementById('btnExportJson').addEventListener('click', exportJSON);
    document.getElementById('btnExportCsvSupervisors').addEventListener('click', ()=>exportCSVSupervisors());
    document.getElementById('btnExportCsvInstitutes').addEventListener('click', ()=>exportCSVInstitutes());
    document.getElementById('btnExportCsvPlan').addEventListener('click', ()=>exportCSVPlan());

    const fileInput = document.getElementById('importFileInput');
    document.getElementById('btnChooseImportFile').addEventListener('click', ()=>fileInput.click());
    fileInput.addEventListener('change', handleFileSelected);

    renderLastBackupInfo();
  }

  function renderLastBackupInfo(){
    const settings = storage.getSettings();
    const el = document.getElementById('lastBackupInfo');
    el.textContent = settings.lastBackupAt
      ? `آخر نسخة احتياطية: ${h.formatDateTime(new Date(settings.lastBackupAt))}`
      : 'لم يتم إنشاء أي نسخة احتياطية بعد';
  }

  function exportJSON(){
    const db = storage.getDB();
    const payload = JSON.stringify(db, null, 2);
    const filename = `نسخة-احتياطية-خطة-موجهي-الضبعة-${h.todayISO()}.json`;
    h.downloadBlob(payload, filename, 'application/json');
    storage.saveSettings({ lastBackupAt: new Date().toISOString() });
    renderLastBackupInfo();
    ui.success('تم التصدير', 'تم تنزيل ملف النسخة الاحتياطية بصيغة JSON');
  }

  function toCSV(rows){
    return rows.map(r=>r.map(cell=>{
      const s = (cell===null||cell===undefined) ? '' : String(cell);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\r\n');
  }

  function exportCSVSupervisors(){
    const rows = [['الاسم','الوظيفة','الإدارات','الهاتف','الحالة','عدد المعاهد']];
    storage.listSupervisors().forEach(s=>{
      rows.push([s.name, s.role||'', (s.departments||[]).join('؛ '), s.phone||'', s.status==='active'?'نشط':'معطل', (s.instituteIds||[]).length]);
    });
    h.downloadBlob('\uFEFF'+toCSV(rows), `الموجهون-${h.todayISO()}.csv`, 'text/csv;charset=utf-8');
    ui.success('تم التصدير','تم تنزيل بيانات الموجهين بصيغة CSV (متوافق مع Excel)');
  }

  function exportCSVInstitutes(){
    const rows = [['الاسم','الإدارة','المرحلة','عدد الفصول','ملاحظات']];
    storage.listInstitutes().forEach(i=>{
      rows.push([i.name, i.department||'', i.stage||'', i.classCount ?? '', i.notes||'']);
    });
    h.downloadBlob('\uFEFF'+toCSV(rows), `المعاهد-${h.todayISO()}.csv`, 'text/csv;charset=utf-8');
    ui.success('تم التصدير','تم تنزيل بيانات المعاهد بصيغة CSV (متوافق مع Excel)');
  }

  function exportCSVPlan(){
    const monthKey = h.currentMonthKey();
    const days = h.getMonthDays(monthKey, storage.getSettings().weekendDows).filter(d=>!d.isWeekend);
    const plan = storage.getMonthPlan(monthKey);
    const rows = [['الموجه', ...days.map(d=>`${d.day} (${d.dowName})`)]];
    storage.listSupervisors().filter(s=>s.status==='active').forEach(sup=>{
      const dayMap = plan[sup.id]||{};
      rows.push([sup.name, ...days.map(d=>{
        const inst = dayMap[d.day] ? storage.getInstitute(dayMap[d.day]) : null;
        return inst ? inst.name : '';
      })]);
    });
    h.downloadBlob('\uFEFF'+toCSV(rows), `خطة-${monthKey}.csv`, 'text/csv;charset=utf-8');
    ui.success('تم التصدير', `تم تنزيل خطة ${h.monthLabel(monthKey)} بصيغة CSV`);
  }

  function isValidBackup(obj){
    return obj && typeof obj === 'object' && Array.isArray(obj.supervisors) && Array.isArray(obj.institutes) && typeof obj.plans === 'object';
  }

  function handleFileSelected(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      let parsed;
      try{
        parsed = JSON.parse(reader.result);
      }catch(err){
        ui.error('ملف غير صالح', 'تعذر قراءة الملف، تأكد أنه ملف نسخة احتياطية JSON صحيح');
        return;
      }
      if(!isValidBackup(parsed)){
        ui.error('ملف غير متوافق', 'هذا الملف لا يحتوي على بنية نسخة احتياطية صحيحة لهذا النظام');
        return;
      }
      askImportMode(parsed);
    };
    reader.onerror = ()=>ui.error('خطأ', 'تعذرت قراءة الملف');
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  function askImportMode(parsed){
    const supCount = parsed.supervisors.length;
    const instCount = parsed.institutes.length;
    ui.openModal({
      title:'استيراد نسخة احتياطية',
      icon:'📥',
      bodyHtml:`
        <p class="text-dim mb-16">تم العثور على <strong>${supCount}</strong> موجه و <strong>${instCount}</strong> معهد داخل الملف. اختر طريقة الاستيراد:</p>
        <div class="flex-col gap-12">
          <label class="checkbox-row"><input type="radio" name="importMode" value="merge" checked> دمج مع البيانات الحالية (الأحدث يطغى عند التكرار)</label>
          <label class="checkbox-row"><input type="radio" name="importMode" value="replace"> استبدال جميع البيانات الحالية بالكامل</label>
        </div>
      `,
      footerButtons:[
        { label:'إلغاء', className:'btn-ghost' },
        { label:'تنفيذ الاستيراد', className:'btn-primary', close:false, onClick:(ov)=>{
          const mode = document.querySelector('input[name="importMode"]:checked').value;
          if(mode === 'replace'){
            ui.confirmDialog({
              title:'تأكيد الاستبدال الكامل',
              message:'سيتم حذف جميع البيانات الحالية واستبدالها ببيانات الملف المستورد. هل أنت متأكد؟',
              danger:true, confirmLabel:'استبدال نهائيًا',
              onConfirm:()=>{
                storage.replaceDB(parsed);
                ui.success('تم الاستيراد', 'تم استبدال البيانات بنجاح');
                ui.closeModal(ov);
                APP.app.refreshAll();
              }
            });
          } else {
            storage.mergeDB(parsed);
            ui.success('تم الاستيراد', 'تم دمج البيانات بنجاح');
            ui.closeModal(ov);
            APP.app.refreshAll();
          }
        }}
      ]
    });
  }

  return { init };
})();
