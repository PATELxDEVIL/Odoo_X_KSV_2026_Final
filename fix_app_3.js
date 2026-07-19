const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const bootCode = `
  // ── Module Initialization ──────────────────────────────
  function boot() {
    Auth.init();
    _currentUser = Auth.getUser();

    // Setup global nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget.dataset.target || e.currentTarget.dataset.page;
        if (target) showPage(target);
      });
    });

    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(e.currentTarget.dataset.page);
      });
    });

    if (_currentUser) {
      onLogin(_currentUser);
    } else {
      showPage('page-dashboard');
      setTimeout(() => {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.remove('hidden');
      }, 500);
    }
    
    const loader = document.getElementById('app-loader');
    if (loader) loader.classList.add('hidden');
  }

  return { showPage, onLogin, onLogout, boot };
})();

// ── Boot on DOM ready ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.boot());
`;

const returnIndex = appJs.indexOf('  return { showPage, onLogin, onLogout, boot };');

if (returnIndex !== -1) {
  appJs = appJs.slice(0, returnIndex) + bootCode;
  fs.writeFileSync('js/app.js', appJs, 'utf8');
  console.log("Fixed boot successfully");
} else {
  console.log("Could not find return block");
}
