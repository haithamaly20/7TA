/* ============================================================
sheetsSync.js — مزامنة Google Sheets / Apps Script
الإصدار 1.1.5 — إضافة forceSyncAll للمزامنة الفورية
============================================================ */
window.APP = window.APP || {};
APP.sheetsSync = {
  isSyncing: false,
  queue: [],
  consecutiveFailures: 0,
  disabledUntil: 0,
  REQUEST_TIMEOUT_MS: 25000,

  isEnabled(){
    return !!(window.CONFIG && CONFIG.ENABLE_SYNC && CONFIG.SCRIPT_URL);
  },

  enqueue(action, payload){
    return new Promise((resolve, reject) => {
      this.queue.push({ action, payload, resolve, reject });
      this.processQueue();
    });
  },

  async processQueue(){
    if(this.isSyncing || !this.queue.length) return;
    this.isSyncing = true;
    const task = this.queue.shift();
    try {
      task.resolve(await this.sendRequest(task.action, task.payload));
    } catch(err){
      this.consecutiveFailures++;
      if(this.consecutiveFailures >= 3) this.disabledUntil = Date.now() + 60000;
      console.error('Sheets sync:', err);
      task.reject(err);
    } finally {
      this.isSyncing = false;
      this.processQueue();
    }
  },

  async sendRequest(action, payload = {}){
    if(!this.isEnabled()) throw new Error('مزامنة Google Sheets غير مفعّلة');
    if(Date.now() < this.disabledUntil) throw new Error('مزامنة Google Sheets متوقفة مؤقتًا بعد فشل الاتصال');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow',
        signal: controller.signal
      });

      if(!response.ok) throw new Error(`خطأ HTTP ${response.status}`);
      const result = await response.json();
      if(result && result.ok === false) throw new Error(result.error || 'خطأ من Google Apps Script');
      if(result && result.status === 'error') throw new Error(result.error || 'خطأ من Google Apps Script');

      this.consecutiveFailures = 0;
      this.disabledUntil = 0;
      return result;
    } catch(err) {
      if(err && err.name === 'AbortError') throw new Error('انتهت مهلة الاتصال بـ Google Apps Script');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  async read(){ return this.readSince(null); },

  async readSince(since){
    if(!this.isEnabled()) return { ok:false, error:'المزامنة غير مفعّلة' };
    const url = new URL(CONFIG.SCRIPT_URL);
    url.searchParams.set('action', 'read');
    if(since) url.searchParams.set('since', since);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      if(!response.ok) throw new Error(`خطأ HTTP ${response.status}`);
      return await response.json();
    } catch(err) {
      if(err && err.name === 'AbortError') throw new Error('انتهت مهلة الاتصال بـ Google Apps Script');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  async syncBulk(type, records){
    return this.enqueue('bulk_sync', { type, records });
  },

  syncInBackground(type, records){
    if(!this.isEnabled()) return Promise.resolve({ ok:false, disabled:true });
    return this.syncBulk(type, records).catch(err => {
      console.warn(`تعذرت مزامنة ${type}:`, err);
      return { ok:false, error:err.message };
    });
  },

  async saveBackupToDrive(fileName, jsonContent){
    return this.enqueue('save_json_backup', { fileName, jsonContent });
  },

  // ⭐ جديد: مزامنة فورية لكل البيانات (تتخطى الـ debounce)
  async forceSyncAll(){
    // فحص 1: هل المزامنة مفعّلة؟
    if(!this.isEnabled()){
      return {
        ok: false,
        error: 'المزامنة غير مفعّلة — تأكد من ملء SCRIPT_URL في js/config.js'
      };
    }

    // فحص 2: هل هناك اتصال بالإنترنت؟
    if(!navigator.onLine){
      return { ok:false, error:'لا يوجد اتصال بالإنترنت' };
    }

    // فحص 3: هل قاعدة البيانات موجودة؟
    if(!APP.storage || typeof APP.storage.getDB !== 'function'){
      return { ok:false, error:'طبقة التخزين غير جاهزة' };
    }

    const db = APP.storage.getDB();
    if(!db){
      return { ok:false, error:'قاعدة البيانات فارغة' };
    }

    try {
      // إرسال كل أنواع البيانات بالتوازي
      const results = await Promise.allSettled([
        this.syncBulk('supervisors', (db.supervisors || []).map(s => ({ id:s.id, data:s }))),
        this.syncBulk('institutes', (db.institutes || []).map(i => ({ id:i.id, data:i }))),
        this.syncBulk('plans', [{ id:'plans', data: db.plans || {} }]),
        this.syncBulk('settings', [{ id:'settings', data: db.settings || {} }])
      ]);

      // فحص النتائج
      const failed = results.filter(r => r.status === 'rejected');
      if(failed.length > 0){
        const firstError = failed[0].reason;
        const msg = (firstError && firstError.message) || String(firstError);
        return { ok:false, error: `فشل في ${failed.length} من 4 طلبات: ${msg}` };
      }

      this.consecutiveFailures = 0;
      this.disabledUntil = 0;

      return {
        ok: true,
        details: {
          supervisors: (db.supervisors || []).length,
          institutes: (db.institutes || []).length,
          plans: Object.keys(db.plans || {}).length
        }
      };
    } catch(err){
      return { ok:false, error: (err && err.message) || String(err) };
    }
  }
};
