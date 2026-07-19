/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — VEHICLES
═══════════════════════════════════════════════════════ */

const Vehicle = (() => {
  let _vehicles = [];

  async function getUserVehicles(userId) {
    try {
      _vehicles = await API.getVehicles({ ownerId: userId });
      return _vehicles;
    } catch (e) {
      console.error('Failed to get vehicles', e);
      return [];
    }
  }

  async function renderVehicles(userId) {
    const list = document.getElementById('vehicles-list');
    if (!list) return;
    const vehicles = await getUserVehicles(userId);

    if (!vehicles.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🚗</div>
        <p>No vehicles registered. Add one to offer rides!</p>
      </div>`;
      return;
    }

    list.innerHTML = vehicles.map(v => `
      <div class="vehicle-card">
        <div class="vehicle-card-top">
          <div class="vehicle-icon">🚗</div>
          <div class="vehicle-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="Vehicle.openEditModal('${v._id}')">✏️ Edit</button>
            <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2)" onclick="Vehicle.deleteVehicle('${v._id}')">🗑</button>
          </div>
        </div>
        <div class="vehicle-model">${v.model}</div>
        <div class="vehicle-reg">${v.regNo}</div>
        <div class="vehicle-meta">
          <div class="vehicle-meta-item">🎨 ${v.color || '—'}</div>
          <div class="vehicle-meta-item">👥 ${v.capacity} seats</div>
          <div class="vehicle-meta-item">📅 ${v.year || '—'}</div>
          <div class="vehicle-meta-item">🛣 ${v.tripCount || 0} trips</div>
        </div>
      </div>
    `).join('');
  }

  async function populateVehicleDropdown(userId) {
    const sel = document.getElementById('offer-vehicle');
    if (!sel) return;
    const vehicles = await getUserVehicles(userId);
    sel.innerHTML = '<option value="">Choose vehicle</option>';
    vehicles.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v._id;
      opt.textContent = `${v.model} (${v.regNo})`;
      sel.appendChild(opt);
    });
  }

  function openAddModal() {
    document.getElementById('vehicle-modal-title').textContent = 'Add Vehicle';
    document.getElementById('vehicle-id-input').value = '';
    document.getElementById('vehicle-form').reset();
    document.getElementById('vehicle-modal').classList.remove('hidden');
  }

  function openEditModal(vehicleId) {
    const v = _vehicles.find(x => x._id === vehicleId);
    if (!v) return;
    document.getElementById('vehicle-modal-title').textContent = 'Edit Vehicle';
    document.getElementById('vehicle-id-input').value = v._id;
    document.getElementById('vehicle-model').value = v.model;
    document.getElementById('vehicle-reg').value = v.regNo;
    document.getElementById('vehicle-capacity').value = v.capacity;
    document.getElementById('vehicle-color').value = v.color || '';
    document.getElementById('vehicle-year').value = v.year || '';
    document.getElementById('vehicle-modal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('vehicle-modal').classList.add('hidden');
  }

  async function deleteVehicle(id) {
    if (!confirm('Delete this vehicle?')) return;
    try {
      await API.deleteVehicle(id);
      const user = Auth.getCurrentUser();
      await renderVehicles(user.id);
      Notifications.showToast('success', 'Vehicle removed', '');
    } catch (err) {
      Notifications.showToast('error', 'Failed to remove', err.message);
    }
  }

  function bindVehicleForm(userId) {
    document.getElementById('add-vehicle-btn')?.addEventListener('click', openAddModal);
    document.getElementById('vehicle-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('vehicle-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('vehicle-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'vehicle-modal') closeModal();
    });

    document.getElementById('vehicle-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('vehicle-id-input').value;
      const data = {
        ownerId:  userId,
        model:    document.getElementById('vehicle-model').value.trim(),
        regNo:    document.getElementById('vehicle-reg').value.trim().toUpperCase(),
        capacity: parseInt(document.getElementById('vehicle-capacity').value),
        color:    document.getElementById('vehicle-color').value.trim(),
        year:     parseInt(document.getElementById('vehicle-year').value) || null,
        tripCount: 0,
      };

      try {
        if (editId) {
          await API.updateVehicle(editId, data);
          Notifications.showToast('success', 'Vehicle updated', '');
        } else {
          await API.createVehicle(data);
          Notifications.showToast('success', 'Vehicle added', '');
        }
        closeModal();
        await renderVehicles(userId);
        await populateVehicleDropdown(userId);
      } catch (err) {
        Notifications.showToast('error', 'Failed to save', err.message);
      }
    });
  }

  async function init(userId) {
    await renderVehicles(userId);
    bindVehicleForm(userId);
    await populateVehicleDropdown(userId);
  }

  return { init, renderVehicles, getUserVehicles, populateVehicleDropdown, openEditModal, deleteVehicle };
})();
