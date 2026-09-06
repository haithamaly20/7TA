/* ============================================================
printing.js — نظام طباعة الخطط
الإصدار 1.2.0 — إصلاح الطباعة الفردية (نظام المربعات)
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
          date: day.dowName + ' ' + day.day + '/' + monthKey.split('-')[1] + '/' + monthKey.split('-')[0]
        });
      });
    });
    return { monthKey, days, rows, supervisors };
  }

  function triggerPrint(contentHtml, isLandscape){
    isLandscape = isLandscape !== undefined ? isLandscape : true;
    var printArea = document.getElementById('printArea');
    if(!printArea){
      printArea = document.createElement('div');
      printArea.id = 'printArea';
      document.body.appendChild(printArea);
    }
    printArea.className = isLandscape ? 'print-landscape' : 'print-portrait';
    printArea.innerHTML = contentHtml;
    document.body.classList.add('printing-active');
    var cleanup = function(){
      document.body.classList.remove('printing-active');
      printArea.innerHTML = '';
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    requestAnimationFrame(function(){ setTimeout(function(){ window.print(); }, 120); });
  }

  function header(title, subtitle, monthKey){
    var settings = APP.storage.getSettings();
    return '<div class="print-header">' +
      '<h2>' + esc(settings.orgName || 'إدارة الضبعة التعليمية') + '</h2>' +
      '<h1>' + esc(title) + '</h1>' +
      '<h3>' + esc(subtitle || '') + '</h3>' +
      '<div class="print-meta">الشهر: ' + esc(APP.helpers.monthLabel(monthKey)) + ' — تاريخ الطباعة: ' + esc(APP.helpers.formatDateTime()) + '</div>' +
    '</div>';
  }

  /* ============================================================
  الخطة العامة — التصميم الرسمي الثابت
  ============================================================ */
  function schoolYearLabel(monthKey){
    var parts = monthKey.split('-').map(Number);
    var y = parts[0], m = parts[1];
    return m >= 7 ? y + '/' + (y+1) : (y-1) + '/' + y;
  }

  function generalPlanHeader(monthKey){
    return '<div class="print-org">' +
      '<div>الأزهر الشريف</div>' +
      '<div>الإدارة المركزية لمنطقة مطروح</div>' +
      '<div>إدارة الضبعة الأزهرية</div>' +
    '</div>' +
    '<div class="print-title-center">' +
      '<h1>الخطة العامة لموجهي إدارة الضبعة الأزهرية لشهر ' + esc(h().monthLabel(monthKey)) + '</h1>' +
      '<h2>للعام الدراسي ' + schoolYearLabel(monthKey) + 'م</h2>' +
    '</div>';
  }

  function signatureRow(){
    return '<div class="print-sign">' +
      '<span>المختص</span>' +
      '<span>مدير إدارة الضبعة</span>' +
      '<span>التوصية المثلى</span>' +
      '<span>يعتمد مدير الإدارة المركزية</span>' +
    '</div>';
  }

  function generalHtml(data){
    var storage = APP.storage;
    var SUPS_PER_PAGE = 5;
    var plan = storage.getMonthPlan(data.monthKey);
    var supervisors = data.supervisors;
    var workingDays = h().getMonthDays(data.monthKey, storage.getSettings().weekendDows).filter(function(d){ return !d.isWeekend; });
    var plannedDays = workingDays.filter(function(d){
      return supervisors.some(function(sup){ return (plan[sup.id] || {})[d.day]; });
    });
    var allDays = plannedDays.length ? plannedDays : workingDays;

    if(!supervisors.length){
      return '<div class="print-container">' + generalPlanHeader(data.monthKey) + '<div class="print-empty">لا يوجد موجهون.</div></div>';
    }
    if(!plannedDays.length){
      return '<div class="print-container">' + generalPlanHeader(data.monthKey) + '<div class="print-empty">لا توجد زيارات مخططة لهذا الشهر.</div>' + signatureRow() + '</div>';
    }

    var chunks = [];
    for(var i = 0; i < supervisors.length; i += SUPS_PER_PAGE){
      chunks.push(supervisors.slice(i, i + SUPS_PER_PAGE));
    }

    return chunks.map(function(chunk, idx){
      var isLast = idx === chunks.length - 1;
      var theadCols = chunk.map(function(s){ return '<th>' + esc(s.name) + '</th>'; }).join('');
      var tbodyRows = allDays.map(function(d){
        var cells = chunk.map(function(sup){
          var instId = (plan[sup.id] || {})[d.day];
          var inst = instId ? storage.getInstitute(instId) : null;
          return '<td>' + (inst ? esc(inst.name) : '') + '</td>';
        }).join('');
        return '<tr><td class="day-col">' + esc(d.dowName) + ' ' + d.day + '</td>' + cells + '</tr>';
      }).join('');

      return '<section class="' + (isLast ? '' : 'print-page-break') + '">' +
        '<div class="print-container general-plan">' +
        generalPlanHeader(data.monthKey) +
        '<table class="print-table plan-grid">' +
        '<thead><tr><th class="day-col">اليوم / التاريخ</th>' + theadCols + '</tr></thead>' +
        '<tbody>' + tbodyRows + '</tbody>' +
        '</table>' +
        signatureRow() +
        '</div></section>';
    }).join('');
  }

  /* ============================================================
  ⭐ الخطة الفردية — نظام المربعات (الإصدار 1.2.0)
  ============================================================ */
  function supervisorHtml(data, supervisorId){
    var sup = data.supervisors.find(function(s){ return String(s.id) === String(supervisorId); });
    if(!sup){
      return '<div class="print-container"><div class="print-empty">لم يتم العثور على الموجه.</div></div>';
    }

    var rows = data.rows.filter(function(r){ return String(r.supervisorId) === String(supervisorId); });
    var monthLabel = h().monthLabel(data.monthKey);

    // 1. الترويسة
    var html = '<div class="print-container individual-plan">';
    html += '<div class="print-header-custom">';
    html += '<div class="print-top-line">إدارة الضبعة الأزهرية — خطة الموجه لشهر ' + esc(monthLabel) + '</div>';
    html += '<div class="print-mid-line">';
    html += '<span class="mid-item">الاسم: ' + esc(sup.name) + '</span>';
    html += '<span class="mid-item">رقم السجل: ' + esc(sup.phone || '---') + '</span>';
    html += '<span class="mid-item">موجه: ' + esc(sup.role || '---') + '</span>';
    html += '</div>';
    html += '</div>';

    // 2. شبكة المربعات
    if(!rows.length){
      html += '<div class="print-empty">لا توجد زيارات مخططة لهذا الموجه في هذا الشهر.</div>';
    } else {
      html += '<div class="print-visits-grid">';
      rows.forEach(function(r, index){
        html += '<div class="print-visit-box">';
        html += '<div class="box-header">الزيارة رقم ' + (index + 1) + '</div>';
        html += '<div class="box-day">' + esc(r.dowName) + '</div>';
        html += '<div class="box-date">' + esc(r.date) + '</div>';
        html += '<div class="box-institute">' + esc(r.instituteName) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 3. التذييل
    html += '<div class="print-footer-custom">';
    html += '<span class="footer-right">المختص</span>';
    html += '<span class="footer-left">رئيس الإدارة</span>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  function printGeneralPlan(monthKey, legacyDays){
    if(Array.isArray(monthKey)){
      var legacyRows = monthKey;
      if(!legacyRows.length){
        if(APP.ui) APP.ui.warning('لا توجد بيانات','لا توجد خطة للطباعة');
        return;
      }
      var html = '<div class="print-container">' +
        header('الخطة العامة لموجهي الإدارة','',APP.helpers.currentMonthKey()) +
        '<table class="print-table"><thead><tr><th>#</th><th>الموجه</th><th>المعهد</th><th>المرحلة</th><th>التاريخ</th></tr></thead><tbody>' +
        legacyRows.map(function(p,i){
          return '<tr><td>' + (i+1) + '</td><td>' + esc(p.supervisorName) + '</td><td>' + esc(p.instituteName) + '</td><td>' + esc(p.stage) + '</td><td>' + esc(p.date) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
      triggerPrint(html, true);
      return;
    }
    monthKey = monthKey || APP.helpers.currentMonthKey();
    var data = normalizePlanData(monthKey);
    if(!data.supervisors.length){
      if(APP.ui) APP.ui.warning('لا توجد بيانات','لا يوجد موجهون للطباعة');
      return;
    }
    triggerPrint(generalHtml(data), true);
  }

  function printSupervisorPlan(supervisorId, monthKey){
    monthKey = monthKey || APP.helpers.currentMonthKey();
    var data = normalizePlanData(monthKey);
    var sup = data.supervisors.find(function(s){ return String(s.id) === String(supervisorId); });
    if(!sup){
      if(APP.ui) APP.ui.error('خطأ','الموجه المطلوب غير موجود');
      return;
    }
    triggerPrint(supervisorHtml(data, supervisorId), false);
  }

  function printAllSupervisorPlans(monthKey){
    monthKey = monthKey || APP.helpers.currentMonthKey();
    var data = normalizePlanData(monthKey);
    if(!data.supervisors.length){
      if(APP.ui) APP.ui.warning('لا توجد بيانات','لا يوجد موجهون للطباعة');
      return;
    }
    var html = data.supervisors.map(function(sup, i){
      return '<section class="print-page-break">' + supervisorHtml(data, sup.id) + '</section>';
    }).join('');
    triggerPrint(html, false);
  }

  return { triggerPrint, normalizePlanData, printGeneralPlan, printSupervisorPlan, printAllSupervisorPlans };
})();
