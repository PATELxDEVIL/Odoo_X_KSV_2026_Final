/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — ADMIN PANEL
   Employee management, Vehicle management, Rides, Org settings
═══════════════════════════════════════════════════════ */

const Admin = (() => {
  let _orgId = null;

  // ── Init ──────────────────────────────────────────────
  async function init(orgId) {
    _orgId = orgId;
    try {
      const org = await API.getOrg(orgId);
      if (org) document.getElementById('admin-org-badge').textContent = org.name;
    } catch (e) { console.warn(e); }

    // Load KPI stats
    try {
      const stats = await API.adminGetStats();
      document.getElementById('admin-stat-users').textContent   = stats.totalUsers;
      document.getElementById('admin-stat-rides').textContent   = stats.totalRides;
      document.getElementById('admin-stat-trips').textContent   = stats.totalTrips;
      document.getElementById('admin-stat-revenue').textContent = `₹${Math.round(stats.totalRevenue).toLocaleString('en-IN')}`;
    } catch (e) { console.warn('Stats load failed', e); }

    await renderEmployees(orgId);
    bindTabs();
    bindAddEmployeeModal();
    bindAddVehicleModal();
    bindOrgSettings(orgId);
    bindEmpSearch(orgId);
  }

  // ── Tabs ──────────────────────────────────────────────
  function bindTabs() {
    document.querySelectorAll('[data-admin-tab]').forEach(tab => {
      tab.addEventListener('click', async () => {
        document.querySelectorAll('[data-admin-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabId = tab.dataset.adminTab;
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`admin-tab-${tabId}`)?.classList.remove('hidden');

        if (tabId === 'vehicles')     await renderAdminVehicles(_orgId);
        if (tabId === 'rides')        await renderAdminRides(_orgId);
        if (tabId === 'org-settings') await loadOrgSettings(_orgId);
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────
  async function getOrgUsers(orgId) {
    try { return await API.adminGetUsers(); } catch (e) { return []; }
  }

  // ── Employees ─────────────────────────────────────────
  async function renderEmployees(orgId, searchTerm = '') {
    const tbody = document.getElementById('employees-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-state"><div class="spinner"></div></div></td></tr>`;
    let employees = await getOrgUsers(orgId);

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      employees = employees.filter(u =>
        (u.firstName||'').toLowerCase().includes(q) ||
        (u.lastName||'').toLowerCase().includes(q)  ||
        (u.email||'').toLowerCase().includes(q)
      );
    }

    if (!employees.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No employees found.</td></tr>`;
      return;
    }

    tbody.innerHTML = employees.map(u => {
      const trips = u.totalTrips || 0;
      return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="user-avatar sm">${u.avatar || (u.firstName||'U').charAt(0)}</div>
            <div>
              <div style="font-weight:600">${u.firstName} ${u.lastName}</div>
              <div style="font-size:12px;color:var(--text-muted)">${u.phone || '—'}</div>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${u.phone || '—'}</td>
        <td>${trips}</td>
        <td><span class="status-badge ${u.role === 'admin' ? 'in-progress' : 'booked'}">${u.role === 'admin' ? '👔 Admin' : '👤 User'}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="Admin.toggleRole('${u._id}', '${u.role}')">
            ${u.role === 'admin' ? 'Demote' : 'Promote'}
          </button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);margin-left:4px"
            onclick="Admin.removeEmployee('${u._id}', '${u.firstName}')">Remove</button>
        </td>
      </tr>`;
    }).join('');
  }

  function bindEmpSearch(orgId) {
    document.getElementById('emp-search')?.addEventListener('input', (e) => {
      renderEmployees(orgId, e.target.value.trim());
    });
  }

  // ── Add Employee Modal ────────────────────────────────
  function bindAddEmployeeModal() {
    const openModal  = () => {
      document.getElementById('add-employee-form').reset();
      document.getElementById('add-employee-error').classList.add('hidden');
      document.getElementById('emp-password').value = 'carpool123';
      document.getElementById('add-employee-modal').classList.remove('hidden');
    };
    const closeModal = () => {
      document.getElementById('add-employee-modal').classList.add('hidden');
    };

    document.getElementById('add-employee-btn')?.addEventListener('click', openModal);
    document.getElementById('add-employee-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('add-employee-cancel')?.addEventListener('click', closeModal);
    document.getElementById('add-employee-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'add-employee-modal') closeModal();
    });

    document.getElementById('add-employee-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('add-employee-error');
      errEl.classList.add('hidden');

      const firstName = document.getElementById('emp-fname').value.trim();
      const lastName  = document.getElementById('emp-lname').value.trim();
      const email     = document.getElementById('emp-email').value.trim().toLowerCase();
      const phone     = document.getElementById('emp-phone').value.trim();
      const role      = document.getElementById('emp-role').value;
      const password  = document.getElementById('emp-password').value.trim();

      if (!firstName || !lastName || !email || !password) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.classList.remove('hidden');
        return;
      }
      if (password.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        errEl.classList.remove('hidden');
        return;
      }

      const btn = e.target.querySelector('button[type="submit"]');
      const oldText = btn.textContent;
      btn.textContent = 'Adding...';
      btn.disabled = true;

      try {
        await API.adminAddUser({ firstName, lastName, email, phone, password, role });
        closeModal();
        await renderEmployees(_orgId);
        Notifications.showToast('success', 'Employee Added!', `${firstName} ${lastName} has been added.`);
      } catch (err) {
        errEl.textContent = err.message || 'Failed to add employee';
        errEl.classList.remove('hidden');
      } finally {
        btn.textContent = oldText;
        btn.disabled = false;
      }
    });
  }

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await API.adminUpdateUser(userId, { role: newRole });
      await renderEmployees(_orgId);
      Notifications.showToast('success', 'Role updated', `User is now ${newRole}.`);
    } catch (e) {
      Notifications.showToast('error', 'Update failed', e.message);
    }
  }

  async function removeEmployee(userId, firstName) {
    if (!confirm('Remove this employee from the system? This cannot be undone.')) return;
    try {
      await API.adminDeleteUser(userId);
      await renderEmployees(_orgId);
      Notifications.showToast('info', 'Employee removed', `${firstName || 'User'} has been removed.`);
    } catch (e) {
      Notifications.showToast('error', 'Remove failed', e.message);
    }
  }

  // ── Vehicles ──────────────────────────────────────────
  let _adminVehicles = [];

  async function renderAdminVehicles(orgId) {
    const tbody = document.getElementById('admin-vehicles-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-state"><div class="spinner"></div></div></td></tr>`;
    
    try {
      _adminVehicles = await API.adminGetVehicles();
    } catch (e) {
      _adminVehicles = [];
    }

    if (!_adminVehicles.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No vehicles registered. Click "+ Add Vehicle" to add one.</td></tr>`;
      return;
    }

    tbody.innerHTML = _adminVehicles.map(v => {
      const owner = v.ownerId; // Populated by API
      return `
      <tr>
        <td><span style="font-weight:600">🚗 ${v.model}</span></td>
        <td><span style="font-family:monospace;font-size:12px;background:var(--bg-elevated);padding:2px 8px;border-radius:4px">${v.regNo}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            ${owner ? `<div class="user-avatar sm">${owner.avatar || '?'}</div><span>${owner.firstName} ${owner.lastName}</span>` : '—'}
          </div>
        </td>
        <td>${v.capacity} seats</td>
        <td>${v.tripCount || 0}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="Admin.openEditVehicle('${v._id}')">✏️ Edit</button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);margin-left:4px"
            onclick="Admin.deleteVehicle('${v._id}')">🗑</button>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Add / Edit Vehicle Modal (Admin) ──────────────────
  function bindAddVehicleModal() {
    const closeModal = () => {
      document.getElementById('admin-vehicle-modal').classList.add('hidden');
      document.getElementById('admin-vehicle-form').reset();
      document.getElementById('admin-vehicle-id-input').value = '';
    };

    document.getElementById('admin-add-vehicle-btn')?.addEventListener('click', () => openAddVehicle());
    document.getElementById('admin-vehicle-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('admin-vehicle-cancel')?.addEventListener('click', closeModal);
    document.getElementById('admin-vehicle-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'admin-vehicle-modal') closeModal();
    });

    document.getElementById('admin-vehicle-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId   = document.getElementById('admin-vehicle-id-input').value;
      const ownerId  = document.getElementById('admin-vehicle-owner').value;
      const model    = document.getElementById('admin-vehicle-model').value.trim();
      const regNo    = document.getElementById('admin-vehicle-reg').value.trim().toUpperCase();
      const capacity = parseInt(document.getElementById('admin-vehicle-capacity').value);
      const color    = document.getElementById('admin-vehicle-color').value.trim();
      const year     = parseInt(document.getElementById('admin-vehicle-year').value) || null;

      if (!ownerId || !model || !regNo) {
        Notifications.showToast('error', 'Missing fields', 'Please fill in all required fields.');
        return;
      }

      const data = { ownerId, model, regNo, capacity, color, year };

      const btn = e.target.querySelector('button[type="submit"]');
      const oldText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      try {
        if (editId) {
          await API.adminUpdateVehicle(editId, data);
          Notifications.showToast('success', 'Vehicle updated', `${model} has been updated.`);
        } else {
          await API.adminAddVehicle(data);
          Notifications.showToast('success', 'Vehicle added! 🚗', `${model} has been registered.`);
        }
        closeModal();
        await renderAdminVehicles(_orgId);
      } catch (err) {
        Notifications.showToast('error', 'Error', err.message);
      } finally {
        btn.textContent = oldText;
        btn.disabled = false;
      }
    });
  }

  async function populateOwnerDropdown(selectedId = '') {
    const sel = document.getElementById('admin-vehicle-owner');
    if (!sel) return;
    const employees = await getOrgUsers(_orgId);
    sel.innerHTML = '<option value="">Select employee...</option>' +
      employees.map(u => `<option value="${u._id}" ${u._id === selectedId ? 'selected' : ''}>${u.firstName} ${u.lastName} (${u.email})</option>`).join('');
  }

  async function openAddVehicle() {
    document.getElementById('admin-vehicle-modal-title').textContent = 'Add Vehicle';
    document.getElementById('admin-vehicle-id-input').value = '';
    document.getElementById('admin-vehicle-form').reset();
    await populateOwnerDropdown();
    document.getElementById('admin-vehicle-modal').classList.remove('hidden');
  }

  async function openEditVehicle(vehicleId) {
    const v = _adminVehicles.find(veh => veh._id === vehicleId);
    if (!v) return;
    document.getElementById('admin-vehicle-modal-title').textContent = 'Edit Vehicle';
    document.getElementById('admin-vehicle-id-input').value = v._id;
    await populateOwnerDropdown(v.ownerId?._id || v.ownerId);
    document.getElementById('admin-vehicle-model').value    = v.model;
    document.getElementById('admin-vehicle-reg').value      = v.regNo;
    document.getElementById('admin-vehicle-capacity').value = v.capacity;
    document.getElementById('admin-vehicle-color').value    = v.color || '';
    document.getElementById('admin-vehicle-year').value     = v.year  || '';
    document.getElementById('admin-vehicle-modal').classList.remove('hidden');
  }

  async function deleteVehicle(vehicleId) {
    if (!confirm(`Delete this vehicle? This cannot be undone.`)) return;
    try {
      await API.adminDeleteVehicle(vehicleId);
      await renderAdminVehicles(_orgId);
      Notifications.showToast('success', 'Vehicle deleted', '');
    } catch (e) {
      Notifications.showToast('error', 'Delete failed', e.message);
    }
  }

  // ── Rides ─────────────────────────────────────────────
  async function renderAdminRides(orgId) {
    const tbody = document.getElementById('admin-rides-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-state"><div class="spinner"></div></div></td></tr>`;
    
    let rides = [];
    try {
      rides = await API.adminGetRides();
    } catch (e) {
      console.warn(e);
    }

    if (!rides.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No rides recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = rides.map(r => {
      const driver     = r.driverId; // Populated
      const sdate      = FindRide ? FindRide.formatDate(r.date) : r.date;
      const passengers = (r.passengers || []).length;
      return `
      <tr>
        <td><span style="font-size:13px">${(r.pickup||'').split(',')[0]} → ${(r.destination||'').split(',')[0]}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            ${driver ? `<div class="user-avatar sm">${driver.avatar||'?'}</div><span>${driver.firstName} ${driver.lastName}</span>` : '—'}
          </div>
        </td>
        <td>${sdate} ${r.time}</td>
        <td>${passengers}/${r.seatsAvailable}</td>
        <td>₹${r.fare}/seat</td>
        <td>${Trip ? Trip.getStatusBadge(r.status) : r.status}</td>
      </tr>`;
    }).join('');
  }

  // ── Org Settings ──────────────────────────────────────
  async function loadOrgSettings(orgId) {
    try {
      const org = await API.getOrg(orgId);
      if (!org) return;
      document.getElementById('org-name').value      = org.name       || '';
      document.getElementById('org-domain').value    = org.domain     || '';
      document.getElementById('org-fuel-cost').value = org.fuelCost   || 103;
      document.getElementById('org-mileage').value   = org.mileage    || 15;
      document.getElementById('org-max-fare').value  = org.maxFarePerKm || 10;
    } catch (e) {
      console.warn('Failed to load org settings', e);
    }
  }

  function bindOrgSettings(orgId) {
    document.getElementById('org-settings-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = {
        name:         document.getElementById('org-name').value.trim(),
        domain:       document.getElementById('org-domain').value.trim(),
        fuelCost:     parseFloat(document.getElementById('org-fuel-cost').value),
        mileage:      parseFloat(document.getElementById('org-mileage').value),
        maxFarePerKm: parseFloat(document.getElementById('org-max-fare').value),
      };

      const btn = e.target.querySelector('button[type="submit"]');
      const oldText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      try {
        await API.updateOrg(orgId, updated);
        document.getElementById('admin-org-badge').textContent = updated.name;
        Notifications.showToast('success', 'Settings saved', 'Organization settings have been updated.');
      } catch (err) {
        Notifications.showToast('error', 'Failed to save', err.message);
      } finally {
        btn.textContent = oldText;
        btn.disabled = false;
      }
    });
  }

  return { init, toggleRole, removeEmployee, openEditVehicle, openAddVehicle, deleteVehicle };
})();
