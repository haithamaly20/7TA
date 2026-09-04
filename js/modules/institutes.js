// js/modules/institutes.js

window.APP = window.APP || {};

window.APP.institutes = {
  /**
   * تهيئة قسم المعاهد وإضافة استماع للأحداث
   */
  init() {
    this.render();
    this.populateFilterOptions();
  },

  /**
   * تعبئة خيارات القوائم المنسدلة للفلترة ديناميكياً
   */
  populateFilterOptions() {
    const institutes = window.APP.storage ? window.APP.storage.getInstitutes() : [];
    const deptSelect = document.getElementById('filterDepartment');
    const stageSelect = document.getElementById('filterStage');

    if (!deptSelect || !stageSelect) return;

    // استخراج الإدارات والمراحل الفريدة
    const departments = [...new Set(institutes.map(i => i.department).filter(Boolean))];
    const stages = [...new Set(institutes.map(i => i.stage).filter(Boolean))];

    deptSelect.innerHTML = '<option value="">جميع الإدارات</option>' + 
      departments.map(d => `<option value="${d}">${d}</option>`).join('');

    stageSelect.innerHTML = '<option value="">جميع المراحل</option>' + 
      stages.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  /**
   * عرض جدول المعاهد
   */
  render() {
    const institutes = window.APP.storage ? window.APP.storage.getInstitutes() : [];
    this.renderRows(institutes);
  },

  /**
   * رسم صفوف الجدول
   */
  renderRows(list) {
    const tbody = document.getElementById('institutesTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد معاهد مسجلة</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((inst, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${inst.name || ''}</strong></td>
        <td>${inst.code || '-'}</td>
        <td>${inst.department || '-'}</td>
        <td><span class="badge blue">${inst.stage || '-'}</span></td>
      </tr>
    `).join('');

    const countBadge = document.getElementById('institutesCountBadge');
    if (countBadge) {
      const total = window.APP.storage ? window.APP.storage.getInstitutes().length : 0;
      countBadge.innerText = `المعروض: ${list.length} من أصل ${total}`;
    }
  },

  /**
   * تطبيق الفلترة والبحث المباشر
   */
  filterTable() {
    const q = (document.getElementById('instituteSearchInput')?.value || '').toLowerCase().trim();
    const dept = document.getElementById('filterDepartment')?.value || '';
    const stage = document.getElementById('filterStage')?.value || '';

    const allInstitutes = window.APP.storage ? window.APP.storage.getInstitutes() : [];
    
    const filtered = allInstitutes.filter(inst => {
      const matchQ = !q || 
        (inst.name && inst.name.toLowerCase().includes(q)) || 
        (inst.code && inst.code.toLowerCase().includes(q));
      const matchDept = !dept || inst.department === dept;
      const matchStage = !stage || inst.stage === stage;

      return matchQ && matchDept && matchStage;
    });

    this.renderRows(filtered);
  },

  /**
   * إعادة ضبط كل الفلاتر
   */
  resetFilters() {
    const searchInput = document.getElementById('instituteSearchInput');
    const deptSelect = document.getElementById('filterDepartment');
    const stageSelect = document.getElementById('filterStage');

    if (searchInput) searchInput.value = '';
    if (deptSelect) deptSelect.value = '';
    if (stageSelect) stageSelect.value = '';

    this.render();
  }
};
