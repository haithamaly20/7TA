/* ============================================================
   charts.js — رسوم بيانية بسيطة (أعمدة أفقية) بدون أي مكتبة خارجية
   ------------------------------------------------------------
   تصميم مقصود: تنسيق مضمّن (inline styles) بدل إضافة كلاسات CSS
   جديدة، لتفادي التعارض مع ملفات التصميم الحالية ولإبقاء التغيير
   محصورًا في هذا الملف فقط. لا يعتمد على إنترنت أو أي مكتبة،
   فيعمل بدون مشاكل ضمن استراتيجية العمل بدون اتصال للنظام.
   ============================================================ */
window.APP = window.APP || {};

APP.charts = (function () {

  // items: [{label, value, color?}] أو مصفوفة عناصر أي شكل + opts.label/value/color كدوال استخراج
  function renderBarChart(container, items, opts) {
    if (!container) return;
    opts = opts || {};
    const labelFn = opts.label || (i => i.label);
    const valueFn = opts.value || (i => i.value);
    const colorFn = opts.color || (() => '#6366F1');
    const h = APP.helpers;

    const list = (items || []).filter(i => valueFn(i) > 0);

    if (!list.length) {
      container.innerHTML = `<div class="empty-state"><span>لا توجد بيانات كافية لعرض الرسم البياني بعد</span></div>`;
      return;
    }

    const max = Math.max(1, ...list.map(valueFn));

    container.innerHTML = list.map(item => {
      const value = valueFn(item);
      const pct = Math.max(3, Math.round((value / max) * 100));
      const label = h ? h.escapeHtml(String(labelFn(item))) : String(labelFn(item));
      const color = colorFn(item) || '#6366F1';
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;">
          <div style="width:120px;flex-shrink:0;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${label}">${label}</div>
          <div style="flex:1;background:rgba(148,163,184,0.15);border-radius:6px;height:14px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;border-radius:6px;background:${color};transition:width .3s ease;"></div>
          </div>
          <div style="width:32px;flex-shrink:0;text-align:left;font-size:12px;opacity:.8;">${value}</div>
        </div>
      `;
    }).join('');
  }

  return { renderBarChart };
})();
