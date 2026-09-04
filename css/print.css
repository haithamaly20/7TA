// js/services/printing.js

window.APP = window.APP || {};

window.APP.printing = {
  /**
   * تهيئة وتجهيز منطقة الطباعة ثم استدعاء window.print
   * @param {string} contentHtml - محتوى HTML المراد طباعته
   * @param {boolean} isLandscape - طباعة بالعرض (true) أم بالطول (false)
   */
  triggerPrint(contentHtml, isLandscape = false) {
    let printArea = document.getElementById('printArea');
    
    // إنشاء منطقة الطباعة إذا لم تكن موجودة في DOM
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'printArea';
      document.body.appendChild(printArea);
    }

    printArea.className = isLandscape ? 'print-landscape' : 'print-portrait';
    printArea.innerHTML = contentHtml;

    // الانتظار لرسم عناصر DOM بالكامل لمنع ظهور صفحات فارغة
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        
        // تنظيف منطقة الطباعة بعد الانتهاء
        window.addEventListener('afterprint', () => {
          printArea.innerHTML = '';
        }, { once: true });
      }, 150);
    });
  },

  /**
   * بناء وطباعة الخطة العامة لجميع الموجهين
   */
  printGeneralPlan(plansData) {
    if (!plansData || plansData.length === 0) {
      if (window.APP.ui) window.APP.ui.showToast("لا توجد بيانات خطة للطباعة", "warning");
      return;
    }

    const html = `
      <div class="print-container">
        <div class="print-header">
          <h2>المنطقة الأزهرية بالضبعة</h2>
          <h3>الخطة العامة لموجهي الإدارة</h3>
        </div>
        <table class="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الموجه</th>
              <th>المعهد الموجه إليه</th>
              <th>المرحلة</th>
              <th>اليوم / التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${plansData.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${p.supervisorName || '-'}</td>
                <td>${p.instituteName || '-'}</td>
                <td>${p.stage || '-'}</td>
                <td>${p.date || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.triggerPrint(html, true); // طباعة بالعرض
  }
};
