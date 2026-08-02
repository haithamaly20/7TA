/* ============================================================
   ui.js — عناصر واجهة عامة: Modals + Toast Notifications
   ============================================================ */
window.APP = window.APP || {};

APP.ui = (function(){
  const h = APP.helpers;

  function toastContainer(){
    let c = document.getElementById('toastContainer');
    if(!c){
      c = document.createElement('div');
      c.id = 'toastContainer';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  const ICONS = { success:'✔', error:'✕', warning:'!', info:'ℹ' };

  function toast(type, title, message, duration){
    const c = toastContainer();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-ico">${ICONS[type]||ICONS.info}</span>
      <div class="toast-text">
        <strong>${h.escapeHtml(title)}</strong>
        ${message ? `<span>${h.escapeHtml(message)}</span>` : ''}
      </div>
      <button class="toast-close" aria-label="إغلاق">✕</button>
    `;
    c.appendChild(el);
    const remove = ()=>{
      el.classList.add('hide');
      setTimeout(()=>el.remove(), 200);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, duration || 3200);
  }

  const success = (title, msg)=>toast('success', title, msg);
  const error   = (title, msg)=>toast('error', title, msg);
  const warning = (title, msg)=>toast('warning', title, msg);
  const info    = (title, msg)=>toast('info', title, msg);

  // ---------- Modal engine ----------
  function overlayRoot(){
    let r = document.getElementById('modalRoot');
    if(!r){
      r = document.createElement('div');
      r.id = 'modalRoot';
      document.body.appendChild(r);
    }
    return r;
  }

  function closeModal(overlayEl){
    overlayEl.style.animation = 'overlayIn .15s ease reverse';
    setTimeout(()=>overlayEl.remove(), 120);
  }

  // opts: { title, bodyHtml, size:'sm|md|lg', footerButtons:[{label,className,onClick,close}], onClose, icon }
  function openModal(opts){
    const root = overlayRoot();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const sizeClass = opts.size === 'lg' ? 'modal-lg' : opts.size === 'sm' ? 'modal-sm' : '';

    overlay.innerHTML = `
      <div class="modal-box ${sizeClass}">
        <div class="modal-header">
          <h3>${opts.icon ? `<span>${opts.icon}</span>` : ''}${h.escapeHtml(opts.title||'')}</h3>
          <button class="modal-close" aria-label="إغلاق">✕</button>
        </div>
        <div class="modal-body">${opts.bodyHtml||''}</div>
        <div class="modal-footer ${opts.footerBetween?'footer-between':''}"></div>
      </div>
    `;
    root.appendChild(overlay);

    const footer = overlay.querySelector('.modal-footer');
    (opts.footerButtons||[]).forEach(btn=>{
      const b = document.createElement('button');
      b.className = `btn ${btn.className||'btn-outline'}`;
      b.textContent = btn.label;
      b.addEventListener('click', ()=>{
        if(btn.onClick) btn.onClick(overlay);
        if(btn.close !== false) closeModal(overlay);
      });
      footer.appendChild(b);
    });
    if(!footer.children.length) footer.remove();

    function onEsc(e){
      if(e.key === 'Escape'){ closeModal(overlay); document.removeEventListener('keydown', onEsc); }
    }
    document.addEventListener('keydown', onEsc);

    overlay.querySelector('.modal-close').addEventListener('click', ()=>{
      closeModal(overlay);
      if(opts.onClose) opts.onClose();
    });
    overlay.addEventListener('click', (e)=>{
      if(e.target === overlay){ closeModal(overlay); if(opts.onClose) opts.onClose(); }
    });

    if(opts.onOpen) opts.onOpen(overlay);
    return overlay;
  }

  // Replacement for confirm()
  function confirmDialog({title, message, confirmLabel, cancelLabel, danger, onConfirm}){
    return openModal({
      title: title || 'تأكيد',
      size: 'sm',
      icon: danger ? '⚠' : '❓',
      bodyHtml: `<p class="text-dim" style="font-size:14px; line-height:1.8;">${h.escapeHtml(message||'')}</p>`,
      footerButtons: [
        { label: cancelLabel || 'إلغاء', className:'btn-ghost' },
        { label: confirmLabel || 'تأكيد', className: danger ? 'btn-danger' : 'btn-primary', onClick: ()=>onConfirm && onConfirm() }
      ]
    });
  }

  // Replacement for alert()
  function alertDialog({title, message, okLabel}){
    return openModal({
      title: title || 'تنبيه',
      size:'sm',
      bodyHtml: `<p class="text-dim" style="font-size:14px; line-height:1.8;">${h.escapeHtml(message||'')}</p>`,
      footerButtons: [ { label: okLabel || 'حسنًا', className:'btn-primary' } ]
    });
  }

  function setLoading(isLoading){
    let el = document.getElementById('globalLoading');
    if(isLoading){
      if(!el){
        el = document.createElement('div');
        el.id = 'globalLoading';
        el.className = 'loading-screen';
        el.innerHTML = `<div class="spinner"></div><span>جارِ التحميل...</span>`;
        document.body.appendChild(el);
      }
    } else if(el){
      el.remove();
    }
  }

  // يُدرج صفوفاً وهمية متحركة (Skeleton) داخل حاوية، مفيد أثناء انتظار
  // استجابة غير متزامنة (كقراءة أولى من Google Sheets). استدعِ مرة أخرى
  // بالمحتوى الحقيقي لاستبدالها بمجرد وصول البيانات.
  function skeletonRows(container, count){
    if(typeof container === 'string') container = document.getElementById(container);
    if(!container) return;
    const n = count || 4;
    container.innerHTML = Array.from({length:n}).map(()=>'<div class="skeleton-row"></div>').join('');
  }

  return { toast, success, error, warning, info, openModal, closeModal, confirmDialog, alertDialog, setLoading, skeletonRows };
})();
