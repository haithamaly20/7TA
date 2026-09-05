/* ============================================================
   printing.js — نظام طباعة الخطط
   الإصدار 1.1.2
   ------------------------------------------------------------
   الخطة العامة: تصميم رسمي ثابت — ترويسة الأزهر + عنوان مركزي
   باسم الشهر والعام الدراسي + جدول (أيام العمل ذات الخطة صفوفًا × الموجهون
   أعمدة، 5 موجهين في كل صفحة) + سطر التوقيعات. المتغيرات فقط:
   التاريخ، أسماء المعاهد، أسماء الموجهين.
   الخطط الفردية: كما كانت (Portrait) دون تغيير.
   ============================================================ */
window.APP = window.APP || {};

APP.printing = (function(){
  const esc = (value) => APP.helpers ? APP.helpers.escapeHtml(value ?? '') : String(value ?? '');
  const h = () => APP.helpers;

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

  /* ============================================================
     الخطة العامة — التصميم الرسمي الثابت (1.1.2)
     ============================================================ */

  // العام الدراسي: يبدأ من يوليو (7) — أكتوبر 2025 → 2025/2026
  function schoolYearLabel(monthKey){
    const [y,m] = monthKey.split('-').map(Number);
    return m >= 7 ? `${y}/${(y+1)}` : `${(y-1)}/${y}`;
  }

  // الترويسة + العنوان المركزي — نص ثابت، المتغيرات: الشهر والعام فقط
  function generalPlanHeader(monthKey){
    return `
      <div class="print-org">
        <div>الأزهر الشريف</div>
        <div>الإدارة المركزية لمنطقة مطروح</div>
        <div>إدارة الضبعة الأزهرية</div>
      </div>
      <div class="print-title-center">
        <h1>الخطة العامة لموجهي إدارة الضبعة الأزهرية لشهر ${esc(h().monthLabel(monthKey))}</h1>
        <h2>للعام الدراسي ${schoolYearLabel(monthKey)}م</h2>
      </div>`;
  }

  // سطر التوقيعات — ثابت في أسفل كل صفحة
  function signatureRow(){
    return `<div class="print-sign">
      <span>المختص</span>
      <span>مدير إدارة الضبعة</span>
      <span>التوصية المثلى</span>
      <span>يعتمد مدير الإدارة المركزية</span>
    </div>`;
  }

  function generalHtml(data){
    const storage = APP.storage;
    const SUPS_PER_PAGE = 5;
    const plan = storage.getMonthPlan(data.monthKey);
    const supervisors = data.supervisors;
    // أيام عمل الشهر وفق إعدادات العطلة — متغيرة (14/22/23... يومًا)
    const workingDays = h().getMonthDays(data.monthKey, storage.getSettings().weekendDows)
      .filter(d => !d.isWeekend);
    // لا يُدرج اليوم إلا إذا وُجدت عليه زيارة مخططة لموجّه واحد على الأقل —
    // أي يوم عمل لا يوجد به خطة لكل الموجهين لا يوضع في الخطة العامة
    const plannedDays = workingDays.filter(d =>
      supervisors.some(sup => (plan[sup.id] || {})[d.day])
    );
    const allDays = plannedDays.length ? plannedDays : workingDays;

    if(!supervisors.length){
      return `<div class="print-container">${generalPlanHeader(data.monthKey)}<div class="print-empty">لا يوجد موجهون.</div></div>`;
    }
    if(!plannedDays.length){
      return `<div class="print-container">${generalPlanHeader(data.monthKey)}<div class="print-empty">لا توجد زيارات مخططة لهذا الشهر.</div>${signatureRow()}</div>`;
    }

    // تقسيم الموجهين: 5 في كل صفحة
    const chunks = [];
    for(let i = 0; i < supervisors.length; i += SUPS_PER_PAGE){
      chunks.push(supervisors.slice(i, i + SUPS_PER_PAGE));
    }

    return chunks.map((chunk, idx) => {
      const isLast = idx === chunks.length - 1;
      return `<section class="${isLast ? '' : 'print-page-break'}">
        <div class="print-container general-plan">
          ${generalPlanHeader(data.monthKey)}
          <table class="print-table plan-grid">
            <thead>
              <tr>
                <th class="day-col">اليوم / التاريخ</th>
                ${chunk.map(s => `<th>${esc(s.name)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${allDays.map(d => {
                const cells = chunk.map(sup => {
                  const instId = (plan[sup.id] || {})[d.day];
                  const inst = instId ? storage.getInstitute(instId) : null;
                  return `<td>${inst ? esc(inst.name) : ''}</td>`;
                }).join('');
                return `<tr><td class="day-col">${esc(d.dowName)} ${d.day}</td>${cells}</tr>`;
              }).join('')}
            </tbody>
          </table>
          ${signatureRow()}
        </div>
      </section>`;
    }).join('');
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
    if(!data.supervisors.length){ APP.ui?.warning('لا توجد بيانات','لا يوجد موجهون للطباعة'); return; }
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
