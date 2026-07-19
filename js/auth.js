/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — AUTH (MongoDB + JWT)
   Login/Signup using Express backend
═══════════════════════════════════════════════════════ */

const Auth = (() => {
  const JWT_KEY  = 'cp_jwt';
  const USER_KEY = 'cp_user';

  let _currentUser = null;

  // ── Session management ────────────────────────────────
  function saveSession(token, user) {
    localStorage.setItem(JWT_KEY,  token);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)));
    _currentUser = normalizeUser(user);
  }

  function clearSession() {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USER_KEY);
    _currentUser = null;
  }

  // Normalize MongoDB _id → id for compatibility with existing modules
  function normalizeUser(u) {
    if (!u) return null;
    return {
      ...u,
      id:    u._id || u.id,
      orgId: u.orgId?._id || u.orgId,
    };
  }

  function getCurrentUser() {
    if (_currentUser) return _currentUser;
    const raw = localStorage.getItem(USER_KEY);
    if (raw) { try { _currentUser = JSON.parse(raw); return _currentUser; } catch {} }
    return null;
  }

  // ── Boot — check existing JWT ─────────────────────────
  function init() {
    const token = localStorage.getItem(JWT_KEY);
    const user  = getCurrentUser();
    if (token && user) {
      _currentUser = user;
      return user;
    }
    return null;
  }

  // ── Login ─────────────────────────────────────────────
  function bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    // Demo credentials click-to-fill
    document.querySelector('.demo-hint')?.addEventListener('click', () => {
      document.getElementById('login-email').value    = 'admin@carpool.com';
      document.getElementById('login-password').value = 'admin123';
    });

    const eyeBtn = document.getElementById('login-eye');
    const passInput = document.getElementById('login-password');
    if (eyeBtn && passInput) {
      eyeBtn.addEventListener('click', () => {
        const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passInput.setAttribute('type', type);
        eyeBtn.textContent = type === 'password' ? '👁' : '👁‍🗨';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl    = document.getElementById('login-error');
      const btn      = document.getElementById('login-btn');

      if (!email || !password) {
        errEl.textContent = 'Please enter email and password.';
        errEl.classList.remove('hidden'); return;
      }

      btn.disabled = true; btn.textContent = 'Logging in...';
      errEl.classList.add('hidden');

      try {
        const { token, user } = await API.login(email, password);
        saveSession(token, user);
        App.onLogin(normalizeUser(user));
      } catch (err) {
        errEl.textContent = err.message || 'Login failed. Check your credentials.';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'Login';
      }
    });
  }

  // ── Sign Up ───────────────────────────────────────────
  async function bindSignupForm() {
    document.getElementById('goto-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      App.showAuthPage('page-signup');
    });
    document.getElementById('goto-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      App.showAuthPage('page-login');
    });

    const signupEyeBtn = document.getElementById('signup-eye');
    const signupPassInput = document.getElementById('signup-password');
    if (signupEyeBtn && signupPassInput) {
      signupEyeBtn.addEventListener('click', () => {
        const type = signupPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
        signupPassInput.setAttribute('type', type);
        signupEyeBtn.textContent = type === 'password' ? '👁' : '👁‍🗨';
      });
    }

    // Populate Orgs
    const orgSelect = document.getElementById('signup-org');
    if (orgSelect) {
      try {
        const orgs = await API.get('/orgs').catch(() => []);
        if (orgs && orgs.length > 0) {
          orgSelect.innerHTML = '<option value="">Select your organization</option>' + orgs.map(o => `<option value="${o._id}">${o.name}</option>`).join('');
        }
      } catch (err) {
        console.error('Failed to load orgs for signup', err);
      }
    }

    document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = document.getElementById('signup-fname').value.trim();
      const lastName  = document.getElementById('signup-lname').value.trim();
      const email     = document.getElementById('signup-email').value.trim();
      const password  = document.getElementById('signup-password').value;
      const orgInput  = document.getElementById('signup-org')?.value.trim();
      const errEl     = document.getElementById('signup-error');
      const btn       = document.querySelector('#signup-form button[type="submit"]');

      errEl?.classList.add('hidden');

      if (!firstName || !lastName || !email || !password) {
        errEl.textContent = 'All fields are required.'; errEl.classList.remove('hidden'); return;
      }
      if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.remove('hidden'); return;
      }

      btn.disabled = true; btn.textContent = 'Creating account...';

      try {
        // Try to resolve org from domain or use first org
        let orgId;
        if (orgInput) {
          const emailDomain = email.split('@')[1];
          const orgsRes = await API.get('/orgs/by-domain/' + emailDomain).catch(() => null);
          orgId = orgsRes?._id;
        }
        // Fallback: use first available org
        if (!orgId) {
          const orgsRes = await API.get('/orgs/first').catch(() => null);
          orgId = orgsRes?._id;
        }
        if (!orgId) throw new Error('No organization found. Contact your admin.');

        const { token, user } = await API.register({ firstName, lastName, email, password, orgId });
        saveSession(token, user);
        App.onLogin(normalizeUser(user));
      } catch (err) {
        errEl.textContent = err.message || 'Registration failed.';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'Create Account';
      }
    });
  }

  // ── Logout ────────────────────────────────────────────
  function bindLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      clearSession();
      App.onLogout();
    });
  }

  // ── Update current user in session ───────────────────
  function updateCurrentUser(updates) {
    const user = getCurrentUser();
    if (!user) return;
    const updated = { ...user, ...updates };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    _currentUser = updated;
    return updated;
  }

  return { init, bindLoginForm, bindSignupForm, bindLogout, getCurrentUser, updateCurrentUser, clearSession };
})();
