/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — NOTIFICATIONS
═══════════════════════════════════════════════════════ */

const Notifications = (() => {
  let _userId = null;

  function init(userId) {
    _userId = userId;
    refreshBadge();
  }

  function refreshBadge() {
    if (!_userId) return;
    const unread = DB.findWhere(DB.KEYS.notifications, n => n.userId === _userId && !n.read);
    const dot = document.getElementById('notif-dot');
    if (dot) dot.classList.toggle('hidden', unread.length === 0);
  }

  function showToast(type, title, msg, duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <button class="toast-close">✕</button>
    `;
    el.querySelector('.toast-close').addEventListener('click', () => dismiss(el));
    container.appendChild(el);

    const timer = setTimeout(() => dismiss(el), duration);
    el._timer = timer;
    return el;
  }

  function dismiss(el) {
    clearTimeout(el._timer);
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }

  function push(userId, type, icon, title, msg) {
    const notif = DB.insert(DB.KEYS.notifications, { userId, type, icon, title, msg, read: false, date: DB.now() });
    if (userId === _userId) {
      refreshBadge();
      showToast('info', title, msg, 5000);
    }
    return notif;
  }

  function markAllRead(userId) {
    const all = DB.findAll(DB.KEYS.notifications);
    all.forEach(n => { if (n.userId === userId) n.read = true; });
    DB.set && localStorage.setItem(DB.KEYS.notifications, JSON.stringify(all));
    refreshBadge();
  }

  return { init, showToast, push, refreshBadge, markAllRead };
})();
