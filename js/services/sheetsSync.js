// js/services/sheetsSync.js

window.APP = window.APP || {};

window.APP.sheetsSync = {
  // حالة المزامنة الحالية لمنع التضارب
  isSyncing: false,
  
  // طابور الطلبات المتسلسلة
  queue: [],

  /**
   * إضافة مهمة إلى طابور المعالجة وتنفيذها بالتسلسل
   * @param {string} action نوع العملية (add, update, delete, bulk_sync, save_json_backup)
   * @param {Object} payload البيانات المراد إرسالها
   */
  enqueue(action, payload) {
    return new Promise((resolve, reject) => {
      this.queue.push({ action, payload, resolve, reject });
      this.processQueue();
    });
  },

  /**
   * معالجة طابور المهام بالتسلسل واحدة تلو الأخرى
   */
  async processQueue() {
    if (this.isSyncing || this.queue.length === 0) return;

    this.isSyncing = true;
    const task = this.queue.shift();

    try {
      const response = await this.sendRequest(task.action, task.payload);
      if (task.resolve) task.resolve(response);
    } catch (err) {
      console.error("خطأ في عملية المزامنة الحالية:", err);
      if (task.reject) task.reject(err);
    } finally {
      this.isSyncing = false;
      // الانتقال الفوري لمعالجة المهمة التالية في الطابور إن وجدت
      this.processQueue();
    }
  },

  /**
   * إرسال طلب HTTP POST المباشر إلى Web App
   */
  async sendRequest(action, payload = {}) {
    const scriptUrl = window.CONFIG && window.CONFIG.SCRIPT_URL;
    if (!scriptUrl) {
      throw new Error("رابط SCRIPT_URL غير معرف في ملف config.js");
    }

    const requestData = {
      action: action,
      ...payload
    };

    // استخدام fetch مع إرسال البيانات بصيغة text/plain لتفادي تعقيدات CORS Preflight
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`خطأ في استجابة الخادم: ${response.status}`);
    }

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.error || 'حدث خطأ غير معروف في الخادم');
    }

    return result;
  },

  /**
   * مزامنة مجموعة من السجلات دفعة واحدة (Bulk Sync)
   * @param {string} type نوع البيانات (institutes, supervisors, plans)
   * @param {Array} records قائمة السجلات
   */
  async syncBulk(type, records) {
    return this.enqueue('bulk_sync', {
      type: type,
      records: records
    });
  },

  /**
   * حفظ نسخة احتياطية كاملة بصيغة JSON إلى Google Drive
   * @param {string} fileName اسم الملف
   * @param {string} jsonContent محتوى البيانات
   */
  async saveBackupToDrive(fileName, jsonContent) {
    return this.enqueue('save_json_backup', {
      fileName: fileName,
      jsonContent: jsonContent
    });
  }
};
