/* ============================================================
   sheetsSync.js — مزامنة Google Sheets / Apps Script
   ============================================================ */
window.APP = window.APP || {};

APP.sheetsSync = {
  isSyncing:false,
  queue:[],

  isEnabled(){
    return !!(window.CONFIG && CONFIG.ENABLE_SYNC && CONFIG.SCRIPT_URL);
  },

  enqueue(action,payload){
    return new Promise((resolve,reject)=>{
      this.queue.push({action,payload,resolve,reject});
      this.processQueue();
    });
  },

  async processQueue(){
    if(this.isSyncing || !this.queue.length) return;
    this.isSyncing=true;
    const task=this.queue.shift();
    try{ task.resolve(await this.sendRequest(task.action,task.payload)); }
    catch(err){ console.error('Sheets sync:',err); task.reject(err); }
    finally{ this.isSyncing=false; this.processQueue(); }
  },

  async sendRequest(action,payload={}){
    if(!this.isEnabled()) throw new Error('مزامنة Google Sheets غير مفعلة');
    const response=await fetch(CONFIG.SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})});
    if(!response.ok) throw new Error(`خطأ HTTP ${response.status}`);
    const result=await response.json();
    if(result && result.ok===false) throw new Error(result.error||'خطأ من Google Apps Script');
    if(result && result.status==='error') throw new Error(result.error||'خطأ من Google Apps Script');
    return result;
  },

  async read(){
    if(!this.isEnabled()) return {ok:false,error:'المزامنة غير مفعلة'};
    const url=new URL(CONFIG.SCRIPT_URL);
    url.searchParams.set('action','read');
    const response=await fetch(url.toString(),{method:'GET'});
    if(!response.ok) throw new Error(`خطأ HTTP ${response.status}`);
    return await response.json();
  },

  async readSince(since){
    if(!this.isEnabled()) return {ok:false,error:'المزامنة غير مفعلة'};
    const url=new URL(CONFIG.SCRIPT_URL);
    url.searchParams.set('action','read');
    if(since) url.searchParams.set('since',since);
    const response=await fetch(url.toString(),{method:'GET'});
    if(!response.ok) throw new Error(`خطأ HTTP ${response.status}`);
    return await response.json();
  },

  async syncBulk(type,records){
    return this.enqueue('bulk_sync',{type,records});
  },

  syncInBackground(type,records){
    if(!this.isEnabled()) return Promise.resolve({ok:false,disabled:true});
    return this.syncBulk(type,records).catch(err=>{ console.warn(`تعذرت مزامنة ${type}:`,err); return {ok:false,error:err.message}; });
  },

  async saveBackupToDrive(fileName,jsonContent){
    return this.enqueue('save_json_backup',{fileName,jsonContent});
  }
};
