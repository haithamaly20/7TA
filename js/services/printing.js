/* ============================================================
printing.js — نظام طباعة الخطط
الإصدار 1.3.0 — إعادة تصميم صفحة الخطة الفردية بحجم ديناميكي
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
          supervisorPhone: sup.phone || '',
          supervisorRegistry: sup.registryNumber || '',
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
     العام الدراسي
  ============================================================ */
  function schoolYearLabel(monthKey){
    const [y,m] = monthKey.split('-').map(Number);
    return m >= 7 ? `${y}/${(y+1)}` : `${(y-1)}/${y}`;
  }

  function generalPlanHeader(monthKey){
    return `<div class="print-org">
        <div>الأزهر الشريف</div>
        <div>الإدارة المركزية لمنطقة مطروح</div>
        <div>إدارة الضبعة الأزهرية</div>
      </div>
      <div class="print-title-center">
        <h1>الخطة العامة لموجهي إدارة الضبعة الأزهرية لشهر ${esc(h().monthLabel(monthKey))}</h1>
        <h2>للعام الدراسي ${schoolYearLabel(monthKey)}م</h2>
      </div>`;
  }

  function signatureRow(){
    return `<div class="print-sign">
      <span>المختص</span>
      <span>مدير إدارة الضبعة</span>
      <span>التوصية المثلى</span>
      <span>يعتمد مدير الإدارة المركزية</span>
    </div>`;
  }

  /* ============================================================
     الخطة العامة — أفقي (Landscape)
  ============================================================ */
  function generalHtml(data){
    const storage = APP.storage;
    const SUPS_PER_PAGE = 5;
    const plan = storage.getMonthPlan(data.monthKey);
    const supervisors = data.supervisors;
    const workingDays = h().getMonthDays(data.monthKey, storage.getSettings().weekendDows)
      .filter(d => !d.isWeekend);
    const plannedDays = workingDays.filter(d =>
      supervisors.some(sup => (plan[sup.id] || {})[d.day])
    );
    const allDays = plannedDays.length ? plannedDays : workingDays;

    if(!supervisors.length){
      return `<div class="print-container general-plan">${generalPlanHeader(data.monthKey)}<div class="print-empty">لا يوجد موجهون.</div></div>`;
    }
    if(!plannedDays.length){
      return `<div class="print-container general-plan">${generalPlanHeader(data.monthKey)}<div class="print-empty">لا توجد زيارات مخططة لهذا الشهر.</div>${signatureRow()}</div>`;
    }

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

  /* ============================================================
     ⭐ الخطة الفردية — إعادة تصميم كاملة (الإصدار 1.3.0)
     ————————————————————————————————————————————————
     خوارزمية التخطيط الديناميكي:
     1) حساب عدد الزيارات (N)
     2) تثبيت عدد الأعمدة = 3
     3) حساب عدد الصفوف = ceil(N / 3)
     4) حساب المساحة المتاحة = ارتفاع A4 - الهوامش - الترويسة - التذييل
     5) حساب ارتفاع البطاقة = (المساحة المتاحة - (الصفوف-1) × الفجوة) / الصفوف
     6) تقييد الارتفاع بين 22mm (للحد الأقصى 22 زيارة) و 65mm (لزيارة واحدة)
     7) تمرير القيم كمتغيرات CSS لتستخدمها شبكة CSS Grid
     النتيجة: صفحة A4 واحدة دائمًا، أيًّا كان عدد الزيارات.
  ============================================================ */
  function supervisorHtml(data, supervisorId){
    const sup = data.supervisors.find(s => String(s.id) === String(supervisorId));
    if(!sup){
      return `<div class="print-container"><div class="print-empty">لم يتم العثور على الموجه.</div></div>`;
    }

    const rows = data.rows.filter(r => String(r.supervisorId) === String(supervisorId));
    const monthLabel = h().monthLabel(data.monthKey);

    // ⭐ خوارزمية الحساب الديناميكي
    const visitsCount = Math.max(rows.length, 1);
    const cols = 3;
    const rowsCount = Math.max(1, Math.ceil(visitsCount / cols));

    // أبعاد صفحة A4 بالمليمتر
    const PAGE_H_MM     = 297;
    const MARGIN_MM     = 10;
    const HEADER_H_MM   = 40;   // الترويسة الرسمية
    const FOOTER_H_MM   = 35;   // التوقيعات
    const GAP_MM        = 3;    // الفجوة بين البطاقات

    const availableH = PAGE_H_MM - (MARGIN_MM * 2) - HEADER_H_MM - FOOTER_H_MM;
    let cardH = (availableH - (rowsCount - 1) * GAP_MM) / rowsCount;
    // تقييد الارتفاع ضمن حدود عملية
    cardH = Math.max(22, Math.min(65, cardH));

    // بيانات الموجه
    const registryNumber = sup.registryNumber || sup.phone || '---';
    const specialization = sup.role || '---';

    // بناء الترويسة الرسمية
    let html = `<div class="print-container individual-plan">`;

    html += `<header class="ind-header">`;
    html += `<div class="ind-org-name">إدارة الضبعة التعليمية</div>`;
    html += `<div class="ind-plan-title">خطة الموجه لشهر ${esc(monthLabel)}</div>`;
    html += `<div class="ind-separator"></div>`;
    html += `<div class="ind-sup-info">`;
    html += `<span class="ind-info-item"><strong>اسم الموجه:</strong> ${esc(sup.name)}</span>`;
    html += `<span class="ind-info-item"><strong>رقم السجل:</strong> ${esc(registryNumber)}</span>`;
    html += `<span class="ind-info-item"><strong>مادة التخصص:</strong> ${esc(specialization)}</span>`;
    html += `</div>`;
    html += `</header>`;

    // بناء شبكة الزيارات مع المتغيرات الديناميكية
    html += `<div class="ind-visits-grid" style="--card-h:${cardH.toFixed(1)}mm; --rows:${rowsCount}; --cols:${cols}; --gap:${GAP_MM}mm;">`;

    if(!rows.length){
      html += `<div class="ind-empty" style="grid-column: 1 / -1;">لا توجد زيارات مخططة لهذا الموجه في هذا الشهر.</div>`;
    } else {
      rows.forEach((r) => {
        html += `<div class="ind-visit-box">`;
        html += `<div class="box-top">`;
        html += `<span class="box-day">${esc(r.dowName)}</span>`;
        html += `<span class="box-date">${esc(r.day)}/${esc(data.monthKey.split('-')[1])}</span>`;
        html += `</div>`;
        html += `<div class="box-school">${esc(r.instituteName)}</div>`;
        html += `<div class="box-stamp"></div>`;
        html += `</div>`;
      });
    }

    html += `</div>`;

    // بناء التذييل (التوقيعات)
    html += `<footer class="ind-footer">`;
    html += `<div class="ind-sign-block">`;
    html += `<div class="ind-sign-title">المختص</div>`;
    html += `<div class="ind-sign-line"></div>`;
    html += `<div class="ind-sign-label">التوقيع</div>`;
    html += `</div>`;
    html += `<div class="ind-sign-block">`;
    html += `<div class="ind-sign-title">مدير الإدارة</div>`;
    html += `<div class="ind-sign-line"></div>`;
    html += `<div class="ind-sign-label">التوقيع</div>`;
    html += `</div>`;
    html += `</footer>`;

    html += `</div>`;
    return html;
  }

  /* ============================================================
     دوال الطباعة
  ============================================================ */
  function printGeneralPlan(monthKey, legacyDays){
    if(Array.isArray(monthKey)){
      const legacyRows = monthKey;
      if(!legacyRows.length){ APP.ui?.warning('لا توجد بيانات','لا توجد خطة للطباعة'); return; }
      const html = `<div class="print-container">${header('الخطة العامة لموجهي الإدارة','',APP.helpers.currentMonthKey())}<table class="print-table"><thead><tr><th>#</th><th>الموجه</th><th>المعهد</th><th>المرحلة</th><th>التاريخ</th></tr></thead><tbody>${legacyRows.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.supervisorName)}</td><td>${esc(p.instituteName)}</td><td>${esc(p.stage)}</td><td>${esc(p.date)}</td></tr>`).join('')}</tbody></table></div>`;
      triggerPrint(html, true);
      return;
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
    const html = data.supervisors.map((sup) =>
      `<section class="print-page-break">${supervisorHtml(data, sup.id)}</section>`
    ).join('');
    triggerPrint(html, false);
  }

  return { triggerPrint, normalizePlanData, printGeneralPlan, printSupervisorPlan, printAllSupervisorPlans };
})();
