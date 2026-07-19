/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — SETTINGS
   Profile, Saved Places, Preferences
═══════════════════════════════════════════════════════ */

const Settings = (() => {
  let _userId = null;

  function init(userId) {
    _userId = userId;
    loadProfile(userId);
    loadSavedPlaces(userId);
    bindProfileForm(userId);
    bindSavedPlaces(userId);
    bindAppSettings();
    bindAccordion();
    bindQuickLinks();
  }

  async function loadProfile(userId) {
    try {
      const user = await API.me();
      if (!user) return;

      document.getElementById('profile-fname').value   = user.firstName || '';
      document.getElementById('profile-lname').value   = user.lastName  || '';
      document.getElementById('profile-phone').value   = user.phone     || '';
      document.getElementById('settings-avatar').textContent = user.avatar || user.firstName?.charAt(0) || 'U';
    } catch(e) {
      console.warn('Failed to load profile', e);
    }
  }

  function bindProfileForm(userId) {
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fname = document.getElementById('profile-fname').value.trim();
      const lname = document.getElementById('profile-lname').value.trim();
      const phone = document.getElementById('profile-phone').value.trim();
      if (!fname || !lname) { Notifications.showToast('error', 'Name required', ''); return; }

      const avatar = fname.charAt(0).toUpperCase();

      try {
        await API.updateUser(userId, { firstName: fname, lastName: lname, phone, avatar });
        Auth.updateCurrentUser({ firstName: fname, lastName: lname, phone, avatar });

        // Update sidebar
        document.getElementById('sidebar-user-name').textContent = fname + ' ' + lname;
        document.getElementById('sidebar-avatar').textContent    = avatar;
        document.getElementById('topbar-avatar').textContent     = avatar;
        document.getElementById('settings-avatar').textContent   = avatar;

        Notifications.showToast('success', 'Profile Updated', 'Your changes have been saved.');
      } catch (err) {
        Notifications.showToast('error', 'Update Failed', err.message);
      }
    });
  }

  function loadSavedPlaces(userId) {
    const container = document.getElementById('saved-places-list');
    if (!container) return;
    const places = DB.findWhere(DB.KEYS.saved_places, p => p.userId === userId);
    if (!places.length) {
      container.innerHTML = '<div class="empty-state"><p>No saved places yet.</p></div>';
      return;
    }
    container.innerHTML = places.map(p => `
      <div class="saved-place-item">
        <div class="saved-place-icon">${p.label === 'Home' ? '🏠' : p.label === 'Office' ? '🏢' : '📍'}</div>
        <div class="saved-place-info">
          <div class="saved-place-label">${p.label}</div>
          <div class="saved-place-addr">${p.location}</div>
        </div>
        <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2)"
          onclick="Settings.deleteSavedPlace('${p.id}')">🗑</button>
      </div>
    `).join('');
  }

  function bindSavedPlaces(userId) {
    document.getElementById('add-saved-place-btn')?.addEventListener('click', () => {
      document.getElementById('saved-place-modal').classList.remove('hidden');
      Maps.attachAutocomplete('saved-place-location', 'saved-place-list', () => {});
    });
    document.getElementById('saved-place-modal-close')?.addEventListener('click', () => {
      document.getElementById('saved-place-modal').classList.add('hidden');
    });
    document.getElementById('saved-place-modal-cancel')?.addEventListener('click', () => {
      document.getElementById('saved-place-modal').classList.add('hidden');
    });

    document.getElementById('saved-place-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const label    = document.getElementById('saved-place-label').value;
      const location = document.getElementById('saved-place-location').value.trim();
      if (!location) { Notifications.showToast('error', 'Enter a location', ''); return; }

      DB.insert(DB.KEYS.saved_places, { userId, label, location, lat: 0, lng: 0 });
      document.getElementById('saved-place-modal').classList.add('hidden');
      document.getElementById('saved-place-form').reset();
      loadSavedPlaces(userId);
      Notifications.showToast('success', 'Place saved', '');
    });
  }

  function deleteSavedPlace(id) {
    DB.remove(DB.KEYS.saved_places, id);
    loadSavedPlaces(_userId);
  }

  function bindAppSettings() {
    const settings = DB.getAppSettings();

    const notifToggle = document.getElementById('notif-toggle');
    const locToggle   = document.getElementById('location-toggle');
    if (notifToggle) notifToggle.checked = settings.notifications !== false;
    if (locToggle)   locToggle.checked   = settings.locationSharing !== false;

    notifToggle?.addEventListener('change', () => {
      DB.setAppSettings({ ...DB.getAppSettings(), notifications: notifToggle.checked });
    });
    locToggle?.addEventListener('change', () => {
      DB.setAppSettings({ ...DB.getAppSettings(), locationSharing: locToggle.checked });
    });
  }

  function bindAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const isOpen = body.classList.contains('open');
        // Close all
        document.querySelectorAll('.accordion-body').forEach(b => b.classList.remove('open'));
        document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('open'));
        if (!isOpen) {
          body.classList.add('open');
          header.classList.add('open');
        }
      });
    });
  }

  function bindQuickLinks() {
    document.querySelectorAll('.settings-link-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) App.showPage('page-' + page);
      });
    });
  }

  return { init, deleteSavedPlace };
})();
