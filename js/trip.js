/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — TRIPS
   My Trips, Trip Detail, Trip Actions
═══════════════════════════════════════════════════════ */

const Trip = (() => {
  let _activeTab = 'upcoming';
  let _currentUserId = null;
  let _allMergedTrips = [];

  async function init(userId) {
    _currentUserId = userId;
    await fetchTripsAndRides();
    _lastStatusHash = _allMergedTrips.map(t => t._id + t.status).join('|');
    renderTab(_activeTab);
    bindTabs();
    updateBadge();
    startPolling();
  }

  let _pollInterval = null;
  let _lastStatusHash = '';

  function startPolling() {
    if (_pollInterval) clearInterval(_pollInterval);
    _pollInterval = setInterval(async () => {
      // Only poll if on My Trips page and detail modal is closed
      const page = document.getElementById('page-my-trips');
      const modal = document.getElementById('trip-detail-modal');
      if (page && page.classList.contains('active') && (!modal || modal.classList.contains('hidden'))) {
        await fetchTripsAndRides();
        const currentHash = _allMergedTrips.map(t => t._id + t.status).join('|');
        if (_lastStatusHash !== currentHash) {
          _lastStatusHash = currentHash;
          renderTab(_activeTab);
          updateBadge();
        }
      }
    }, 5000);
  }

  function bindTabs() {
    document.querySelectorAll('#trips-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#trips-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _activeTab = tab.dataset.tab;
        renderTab(_activeTab);
      });
    });
  }

  async function fetchTripsAndRides() {
    try {
      const trips = await API.getTrips();
      // Filter out trips where I am the passenger
      const passengerTrips = trips.filter(t => t.passengerId?._id === _currentUserId || t.passengerId === _currentUserId);
      
      const rides = await API.getRides({ driverId: _currentUserId });

      const driverRides = rides.map(r => ({
        _id: 'dr_' + r._id, rideId: r, passengerId: _currentUserId,
        seats: 0, totalFare: r.fare * (r.passengers || []).length,
        status: r.status === 'available' ? 'offered' : r.status,
        paymentStatus: r.status === 'completed' ? 'received' : 'pending',
        role: 'driver',
      }));

      _allMergedTrips = [...passengerTrips, ...driverRides];
    } catch (err) {
      console.error('Failed to fetch trips:', err);
      _allMergedTrips = [];
    }
  }

  function renderTab(tab) {
    const list = document.getElementById('my-trips-list');
    if (!list || !_currentUserId) return;

    let filtered;
    if (tab === 'upcoming')  filtered = _allMergedTrips.filter(t => ['booked','offered'].includes(t.status));
    else if (tab === 'active') filtered = _allMergedTrips.filter(t => ['in-progress','started', 'active'].includes(t.status));
    else filtered = _allMergedTrips.filter(t => ['completed','cancelled'].includes(t.status));

    if (!filtered.length) {
      const msgs = { upcoming: 'No upcoming trips.', active: 'No active trips.', completed: 'No completed trips.' };
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🚗</div>
        <p>${msgs[tab] || 'No trips.'} ${tab === 'upcoming' ? '<a href="#" data-page="find-ride" class="link">Find a ride?</a>' : ''}</p>
      </div>`;
      list.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', (e) => {
        e.preventDefault(); App.showPage('page-' + el.dataset.page);
      }));
      return;
    }

    list.innerHTML = filtered.map(t => tripCardHTML(t)).join('');
    list.querySelectorAll('.trip-card').forEach(card => {
      card.addEventListener('click', () => openTripDetail(card.dataset.id));
    });
  }

  function tripCardHTML(t) {
    const ride = typeof t.rideId === 'object' ? t.rideId : null;
    if (!ride) return '';
    const isDriver = t.role === 'driver';
    const statusBadge = getStatusBadge(t.status);
    const sdate = FindRide ? FindRide.formatDate(ride.date) : ride.date;
    const pickup = ride.pickup || '';
    const dest = ride.destination || '';

    return `
    <div class="trip-card" data-id="${t._id}">
      <div class="trip-card-route" style="flex:1">
        <div class="trip-route-line">
          <div class="route-dot start sm"></div>
          <span>${pickup.split(',')[0]}</span>
          <span class="trip-route-arrow">→</span>
          <div class="route-dot end sm"></div>
          <span>${dest.split(',')[0]}</span>
        </div>
        <div class="trip-meta">
          <span class="trip-meta-item">📅 ${sdate}</span>
          <span class="trip-meta-item">🕐 ${ride.time}</span>
          <span class="trip-meta-item">${isDriver ? '🚗 Driver' : '👤 Passenger'}</span>
          ${t.status === 'offered' ? '<span class="trip-meta-item">📢 Offered</span>' : ''}
        </div>
      </div>
      <div class="trip-card-right">
        ${statusBadge}
        <div class="trip-fare">${isDriver ? '+₹' + (t.totalFare || 0) : '₹' + (t.totalFare || 0)}</div>
      </div>
    </div>`;
  }

  function getStatusBadge(status) {
    const map = {
      'booked':       { cls: 'booked',          label: '✓ Booked'       },
      'offered':      { cls: 'booked',          label: '📢 Offered'      },
      'active':       { cls: 'started',         label: '▶ Started'      },
      'started':      { cls: 'started',         label: '▶ Started'      },
      'in-progress':  { cls: 'in-progress',     label: '🔴 In Progress'  },
      'completed':    { cls: 'completed',       label: '✅ Completed'    },
      'cancelled':    { cls: 'cancelled',       label: '✗ Cancelled'    },
      'payment-pending':{ cls: 'payment-pending', label: '💳 Pay Now'   },
    };
    const s = map[status] || { cls: 'booked', label: status };
    return `<span class="status-badge ${s.cls}">${s.label}</span>`;
  }

  async function openTripDetail(tripId) {
    let t, ride, isDriver = false;

    if (tripId.startsWith('dr_')) {
      const rideId = tripId.replace('dr_', '');
      try {
        ride = await API.getRide(rideId);
        isDriver = true;
      } catch (err) { return; }
    } else {
      try {
        t = await API.getTrip(tripId);
        ride = t.rideId;
        isDriver = false;
      } catch (err) { return; }
    }

    if (!ride) return;

    const driver = ride.driverId;
    const vehicle = ride.vehicleId;
    const passengers = ride.passengers || [];
    const sdate = FindRide ? FindRide.formatDate(ride.date) : ride.date;
    const fare = t ? t.totalFare : (ride.fare * passengers.length);

    // 1-hour cancellation check
    const rideDateTime = new Date(`${ride.date.split('T')[0]}T${ride.time}:00`);
    const oneHourBefore = new Date(rideDateTime.getTime() - 60 * 60 * 1000);
    const canCancel = new Date() < oneHourBefore;

    let actionButtons = '';
    if (t && t.status === 'booked' && !isDriver) {
      if (t.paymentStatus !== 'paid') {
        actionButtons += `<button class="btn btn-primary btn-sm" onclick="Payment.openPayment('${t._id}')">💳 Pay Now</button>`;
      }
      if (canCancel) {
        actionButtons += `<button class="btn btn-danger btn-sm" onclick="Trip.cancelTrip('${t._id}')">Cancel Booking</button>`;
      } else {
        actionButtons += `<button class="btn btn-danger btn-sm tooltip-btn" disabled title="Cannot cancel within 1 hour of ride">Cancel Booking</button>`;
      }
    }
    if (isDriver && ride.status === 'available') {
      actionButtons += `<button class="btn btn-primary btn-sm" onclick="Tracking.openTracking('${ride._id}')">▶ Start Trip</button>`;
      if (canCancel) {
        actionButtons += `<button class="btn btn-danger btn-sm" onclick="Trip.cancelRide('${ride._id}')" style="margin-left:8px">Cancel Ride</button>`;
      } else {
        actionButtons += `<button class="btn btn-danger btn-sm tooltip-btn" disabled title="Cannot cancel within 1 hour of ride" style="margin-left:8px">Cancel Ride</button>`;
      }
    }
    if ((t?.status === 'in-progress' || ride.status === 'active') ) {
      actionButtons += `<button class="btn btn-primary btn-sm" onclick="Tracking.openTracking('${ride._id}')">📍 Track Live</button>`;
    }
    if (t && t.status === 'booked' && !isDriver) {
      const pName = driver ? driver.firstName + ' ' + driver.lastName : 'Driver';
      const pAv = driver?.avatar || pName.charAt(0);
      actionButtons += `<button class="btn btn-ghost btn-sm" onclick="Chat.open('${ride._id}', null, '${pName}', '${pAv}')">💬 Ride Chat</button>`;
    }

    const passHTML = passengers.map(p => {
      let chatBtn = '';
      if (isDriver && ride.status !== 'completed' && ride.status !== 'cancelled') {
        const pName = p.firstName + ' ' + p.lastName;
        const pAv = p.avatar || p.firstName.charAt(0);
        chatBtn = `<button class="btn btn-ghost btn-sm" style="margin-left:auto; padding: 4px 8px; font-size: 12px" onclick="Chat.open('${ride._id}', '${p._id}', '${pName}', '${pAv}')">💬 Chat</button>`;
      }
        const passStatus = ride.status === 'active' ? 'in-progress' : (ride.status === 'completed' ? 'completed' : 'booked');
        const badgeLabel = passStatus === 'in-progress' ? 'In Progress' : (passStatus === 'completed' ? 'Completed' : 'Booked');
        const badgeCls = passStatus === 'in-progress' ? 'in-progress' : (passStatus === 'completed' ? 'completed' : 'booked');
        
        return `
      <div class="passenger-item" style="display:flex; align-items:center; width:100%">
        <div class="user-avatar sm">${p.avatar || '?'}</div>
        <span class="passenger-name" style="margin-right:8px">${p.firstName} ${p.lastName}</span>
        <span class="status-badge ${badgeCls}" style="font-size:11px">${badgeLabel}</span>
        ${chatBtn}
      </div>`;
    }).join('') || '<p style="color:var(--text-muted);font-size:13px">No passengers yet.</p>';

    document.getElementById('trip-detail-content').innerHTML = `
      <div class="trip-detail-card">
        <div class="trip-detail-route-header">
          <div class="trip-detail-point">
            <div class="route-dot start"></div>
            <span>${ride.pickup}</span>
          </div>
          ${(ride.waypoints || []).map(wp => `
          <div class="trip-detail-connector" style="margin-left:6px; height: 10px;"></div>
          <div class="trip-detail-point" style="color:var(--text-secondary); font-size: 13px;">
            <div class="route-dot start" style="background:#ef4444;border-color:#ef4444"></div>
            <span>via ${wp.location}</span>
          </div>
          `).join('')}
          <div class="trip-detail-connector" style="margin-left:6px"></div>
          <div class="trip-detail-point">
            <div class="route-dot end"></div>
            <span>${ride.destination}</span>
          </div>
        </div>
        <div class="trip-detail-meta-row">
          <div class="trip-detail-meta-item">
            <div class="trip-detail-meta-val">${sdate}</div>
            <div class="trip-detail-meta-label">Date</div>
          </div>
          <div class="trip-detail-meta-item">
            <div class="trip-detail-meta-val">${ride.time}</div>
            <div class="trip-detail-meta-label">Time</div>
          </div>
          <div class="trip-detail-meta-item">
            <div class="trip-detail-meta-val">${ride.distance?.toFixed(1) || '—'} km</div>
            <div class="trip-detail-meta-label">Distance</div>
          </div>
          <div class="trip-detail-meta-item">
            <div class="trip-detail-meta-val">₹${fare}</div>
            <div class="trip-detail-meta-label">Fare</div>
          </div>
        </div>
        ${getStatusBadge(t?.status || ride.status)}
      </div>

      <div class="driver-card">
        <div class="user-avatar lg">${driver?.avatar || '?'}</div>
        <div class="driver-info">
          <div class="driver-name">${driver ? driver.firstName + ' ' + driver.lastName : 'Unknown'}</div>
          <div class="driver-sub">⭐ ${driver?.rating || 4.5} • ${vehicle ? vehicle.model + ' (' + vehicle.regNo + ')' : 'Vehicle'}</div>
        </div>
        ${!isDriver ? `
        <div class="driver-actions">
          <button class="btn btn-ghost btn-sm" onclick="Chat.open('${ride._id}', null, '${driver?.firstName || 'Driver'}', '${driver?.avatar || 'D'}')" title="Chat">💬</button>
          <button class="btn btn-ghost btn-sm" onclick="Tracking.openCallModal('${driver?.firstName || 'Driver'}')" title="Call">📞</button>
        </div>` : ''}
      </div>

      ${passengers.length > 0 ? `
      <div class="section-header" style="margin-top:0">
        <h3 class="section-title">Passengers (${passengers.length})</h3>
      </div>
      <div class="passengers-list">
        ${passengers.map(p => `
          <div class="passenger-item" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="user-avatar sm">${p.avatar || '?'}</div>
              <div>
                <div class="passenger-name" style="margin:0;">${p.firstName} ${p.lastName}</div>
                <span class="status-badge booked" style="font-size:11px">Booked</span>
              </div>
            </div>
            ${isDriver ? `
            <div class="passenger-actions" style="display:flex; gap:5px;">
              <button class="btn btn-ghost btn-sm" onclick="Chat.open('${ride._id}', '${p._id}', '${p.firstName}', '${p.avatar || p.firstName.charAt(0)}')" title="Chat" style="padding:4px 8px;">💬</button>
              <button class="btn btn-ghost btn-sm" onclick="Tracking.openCallModal('${p.firstName}')" title="Call" style="padding:4px 8px;">📞</button>
            </div>` : ''}
          </div>
        `).join('')}
      </div>` : '<p style="color:var(--text-muted);font-size:13px;margin-top:10px;">No passengers yet.</p>'}

      <div class="trip-action-bar" style="margin-top:20px">
        ${actionButtons}
      </div>`;

    App.showPage('page-trip-detail');
  }

  async function cancelTrip(tripId) {
    if (!confirm('Cancel this trip?')) return;
    try {
      await API.cancelTrip(tripId);
      Notifications.showToast('info', 'Trip Cancelled', 'Your booking has been cancelled.');
      App.showPage('page-my-trips');
      await init(_currentUserId);
    } catch (err) {
      Notifications.showToast('error', 'Failed to cancel', err.message);
    }
  }

  async function cancelRide(rideId) {
    if (!confirm('Cancel this ride? All passenger bookings will be cancelled.')) return;
    try {
      await API.deleteRide(rideId);
      Notifications.showToast('info', 'Ride Cancelled', 'Your ride has been cancelled.');
      App.showPage('page-my-trips');
      await init(_currentUserId);
    } catch (err) {
      Notifications.showToast('error', 'Failed to cancel', err.message);
    }
  }

  function updateBadge() {
    const upcoming = _allMergedTrips.filter(t => t.status === 'booked' && t.role !== 'driver');
    const badge = document.getElementById('trips-badge');
    if (badge) {
      badge.textContent = upcoming.length;
      badge.style.display = upcoming.length ? 'inline-block' : 'none';
    }
  }

  return { init, openTripDetail, cancelTrip, cancelRide, updateBadge, tripCardHTML, getStatusBadge };
})();
