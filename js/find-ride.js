/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — FIND A RIDE
═══════════════════════════════════════════════════════ */

const FindRide = (() => {
  let _searchData = {};
  let _fromLoc = null;
  let _toLoc   = null;
  let _seats   = 1;
  let _allRides = [];

  function init() {
    bindFindForm();
    bindRouteConfirm();
    bindAvailableRides();
    initSeatCounter();
  }

  function initSeatCounter() {
    const val = document.getElementById('find-seats-val');
    document.getElementById('find-seats-minus')?.addEventListener('click', () => {
      _seats = Math.max(1, _seats - 1);
      if (val) val.textContent = _seats;
    });
    document.getElementById('find-seats-plus')?.addEventListener('click', () => {
      _seats = Math.min(6, _seats + 1);
      if (val) val.textContent = _seats;
    });

    // Recurring toggle
    const rec = document.getElementById('find-recurring');
    const recDays = document.getElementById('find-recurring-days');
    const recLabel = document.getElementById('find-recurring-label');
    rec?.addEventListener('change', () => {
      if (rec.checked) {
        recDays.classList.remove('hidden');
        recLabel.textContent = 'Recurring';
      } else {
        recDays.classList.add('hidden');
        recLabel.textContent = 'One-time';
      }
    });
  }

  function bindFindForm() {
    // Set today's date as default
    const dateInput = document.getElementById('find-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    const timeInput = document.getElementById('find-time');
    if (timeInput) {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      timeInput.value = `${String(now.getHours()).padStart(2,'0')}:00`;
    }

    Maps.attachAutocomplete('find-pickup', 'find-pickup-list', (loc) => { _fromLoc = loc; });
    Maps.attachAutocomplete('find-destination', 'find-destination-list', (loc) => { _toLoc = loc; });

    document.getElementById('find-pickup-map')?.addEventListener('click', async () => {
      const loc = await Maps.openMapPicker(_fromLoc?.lat, _fromLoc?.lng);
      if (loc) {
        _fromLoc = loc;
        document.getElementById('find-pickup').value = loc.label;
      }
    });

    document.getElementById('find-pickup-gps')?.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      document.getElementById('find-pickup').value = 'Locating...';
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        _fromLoc = { lat, lng, label: 'Current Location' };
        document.getElementById('find-pickup').value = 'Current Location';
      });
    });

    document.getElementById('find-dest-map')?.addEventListener('click', async () => {
      const loc = await Maps.openMapPicker(_toLoc?.lat, _toLoc?.lng);
      if (loc) {
        _toLoc = loc;
        document.getElementById('find-destination').value = loc.label;
      }
    });

    document.getElementById('find-dest-gps')?.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      document.getElementById('find-destination').value = 'Locating...';
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        _toLoc = { lat, lng, label: 'Current Location' };
        document.getElementById('find-destination').value = 'Current Location';
      });
    });

    document.getElementById('find-ride-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const pickup = document.getElementById('find-pickup').value.trim();
      const dest   = document.getElementById('find-destination').value.trim();
      const date   = document.getElementById('find-date').value;
      const time   = document.getElementById('find-time').value;

      if (!pickup || !dest) {
        Notifications.showToast('error', 'Missing location', 'Please enter pickup and destination.');
        return;
      }

      // Use fallback coords if no autocomplete selection
      if (!_fromLoc) _fromLoc = { lat: 18.5904, lng: 73.7381, label: pickup };
      if (!_toLoc)   _toLoc   = { lat: 18.5204, lng: 73.8567, label: dest };

      _searchData = { pickup, dest, date, time, seats: _seats, fromLoc: _fromLoc, toLoc: _toLoc };

      // Show route confirmation
      showRouteConfirm();
    });
  }

  function showRouteConfirm() {
    const { pickup, dest, fromLoc, toLoc } = _searchData;
    document.getElementById('confirm-pickup-label').textContent = pickup || fromLoc.label;
    document.getElementById('confirm-dest-label').textContent   = dest   || toLoc.label;
    document.getElementById('confirm-seats').textContent = _seats;

    const dist = Maps.computeDistance(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
    const dur  = Math.round(dist / 30 * 60);
    document.getElementById('confirm-distance').textContent = dist.toFixed(1) + ' km';
    document.getElementById('confirm-duration').textContent = dur + ' min';

    App.showPage('page-route-confirm');

    setTimeout(() => {
      Maps.showRoute('route-confirm-map', fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng, {
        fromLabel: pickup, toLabel: dest
      });
    }, 100);
  }

  function bindRouteConfirm() {
    document.getElementById('route-confirm-back')?.addEventListener('click', () => App.showPage('page-find-ride'));
    document.getElementById('route-confirm-back-btn')?.addEventListener('click', () => App.showPage('page-find-ride'));
    document.getElementById('route-confirm-proceed')?.addEventListener('click', () => {
      App.showPage('page-available-rides');
      loadAvailableRides();
    });
  }

  async function loadAvailableRides() {
    const list = document.getElementById('available-rides-list');
    const sub  = document.getElementById('available-rides-sub');
    if (!list) return;

    list.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Searching rides...</p></div>`;

    try {
      const { fromLoc, toLoc, date, seats } = _searchData;
      const query = {
        status: 'available',
        fromLat: fromLoc?.lat,
        fromLng: fromLoc?.lng,
        toLat: toLoc?.lat,
        toLng: toLoc?.lng,
      };
      if (date) query.date = date;

      const allRides = await API.getRides(query);

      // Show available rides with enough seats (removed driver filter for testing purposes)
      _allRides = allRides.filter(r => r.seatsAvailable >= (seats || _seats));

      if (sub) sub.textContent = `${_allRides.length} rides found`;

      renderRideCards(_allRides, list);
    } catch (err) {
      list.innerHTML = `<div class="no-rides-state"><div class="no-rides-title">Error loading rides</div><div class="no-rides-desc">${err.message}</div></div>`;
    }
  }

  function renderRideCards(rides, container) {
    if (!rides.length) {
      container.innerHTML = `<div class="no-rides-state">
        <div class="no-rides-icon">🔍</div>
        <div class="no-rides-title">No rides found</div>
        <div class="no-rides-desc">Try a different route or date. Check back later!</div>
      </div>`;
      return;
    }

    container.innerHTML = rides.map(r => {
      const driver = r.driverId; // Populated by API
      return `
      <div class="ride-card" data-id="${r._id}">
        <div class="ride-card-header">
          <div class="ride-card-driver">
            <div class="user-avatar">${driver?.avatar || '?'}</div>
            <div>
              <div class="ride-driver-name">${driver ? driver.firstName + ' ' + driver.lastName : 'Unknown'}</div>
              <div class="ride-driver-rating">⭐ ${driver?.rating || '4.5'}</div>
            </div>
          </div>
          <div class="ride-card-fare">₹${r.fare}<span>/seat</span></div>
        </div>
        <div class="ride-card-route">
          <div class="ride-route-point">
            <div class="route-dot start"></div>
            <span><strong>${r.pickup.split(',')[0]}</strong></span>
          </div>
          ${(r.waypoints || []).map(wp => `
          <div class="ride-route-point" style="padding-left:22px;margin:4px 0">
            <span style="color:var(--text-muted);font-size:12px">↓ via ${wp.location.split(',')[0]}</span>
          </div>
          `).join('')}
          <div class="ride-route-point" style="padding-left:22px;margin:4px 0">
            <span style="color:var(--text-muted);font-size:12px">↓ ${r.distance?.toFixed(1) || '—'} km • ~${r.duration || '—'} min</span>
          </div>
          <div class="ride-route-point">
            <div class="route-dot end"></div>
            <span><strong>${r.destination.split(',')[0]}</strong></span>
          </div>
        </div>
        <!-- Route map preview showing the driver's actual planned path -->
        <div class="ride-card-map" id="ride-map-${r._id}" style="height:140px;border-radius:10px;overflow:hidden;margin:8px 0;background:var(--bg-elevated)"></div>
        <div class="ride-card-footer">
          <div class="ride-card-meta">
            <div class="ride-meta-item">📅 ${formatDate(r.date)}</div>
            <div class="ride-meta-item">🕐 ${r.time}</div>
            <div class="ride-meta-item">👥 ${r.seatsAvailable} seat${r.seatsAvailable!==1?'s':''} left</div>
            ${r.recurring ? '<div class="ride-meta-item">🔁 Recurring</div>' : ''}
          </div>
          <button class="btn btn-primary btn-sm" onclick="FindRide.openBookingModal('${r._id}')">Book</button>
        </div>
      </div>`;
    }).join('');

    // Render route maps for each card
    rides.forEach(r => {
      setTimeout(() => {
        if (r.pickupLat && r.destLat) {
          Maps.showRoute(`ride-map-${r._id}`,
            r.pickupLat, r.pickupLng,
            r.destLat, r.destLng,
            {
              waypoints: r.waypoints || [],
              encodedPolyline: r.routePolyline || undefined,
            }
          );
        }
      }, 200);
    });
  }

  function bindAvailableRides() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.dataset.filter;
        let sorted = [..._allRides];
        if (filter === 'cheapest') sorted.sort((a, b) => a.fare - b.fare);
        else if (filter === 'soonest') sorted.sort((a, b) => a.time.localeCompare(b.time));
        else if (filter === 'seats') sorted.sort((a, b) => b.seatsAvailable - a.seatsAvailable);
        const list = document.getElementById('available-rides-list');
        if (list) renderRideCards(sorted, list);
      });
    });
  }

  async function openBookingModal(rideId) {
    let ride = _allRides.find(r => r._id === rideId);
    if (!ride) {
      try {
        ride = await API.getRide(rideId);
      } catch (err) {
        Notifications.showToast('error', 'Ride not found', 'Could not load ride details.');
        return;
      }
    }
    if (!ride) return;
    const driver = ride.driverId;
    const user   = Auth.getCurrentUser();
    if (!driver || !user) return;

    const total = ride.fare * _seats;

    document.getElementById('booking-confirm-details').innerHTML = `
      <div class="booking-confirm-info">
        <div class="booking-confirm-row"><span>Driver</span><span>${driver.firstName} ${driver.lastName}</span></div>
        <div class="booking-confirm-row"><span>Route</span><span>${ride.pickup.split(',')[0]} → ${ride.destination.split(',')[0]}</span></div>
        <div class="booking-confirm-row"><span>Date & Time</span><span>${formatDate(ride.date)} at ${ride.time}</span></div>
        <div class="booking-confirm-row"><span>Seats</span><span>${_seats}</span></div>
        <div class="booking-confirm-row"><span>Fare per seat</span><span>₹${ride.fare}</span></div>
        <div class="booking-confirm-row"><span style="font-weight:600">Total</span><span style="font-size:18px;font-weight:700;color:var(--emerald)">₹${total}</span></div>
      </div>`;

    document.getElementById('booking-confirm-modal').classList.remove('hidden');
    document.getElementById('booking-confirm-btn').onclick = () => confirmBooking(ride._id, _seats, total);
  }

  async function confirmBooking(rideId, seats, total) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const btn = document.getElementById('booking-confirm-btn');
    btn.disabled = true;
    btn.textContent = 'Booking...';

    try {
      await API.bookTrip({ rideId, seats });

      document.getElementById('booking-confirm-modal').classList.add('hidden');
      Notifications.showToast('success', 'Ride Booked!', 'Your ride is confirmed.');

      // Refresh badge
      const trips = await API.getTrips({ status: 'booked', role: 'passenger' });
      const badge = document.getElementById('trips-badge');
      if (badge) { badge.textContent = trips.length; badge.style.display = trips.length ? 'block' : 'none'; }

      App.showPage('page-my-trips');
      Trip.init(user.id);
    } catch (err) {
      Notifications.showToast('error', 'Booking failed', err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirm Booking';
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function bindBookingModal() {
    document.getElementById('booking-modal-close')?.addEventListener('click', () => {
      document.getElementById('booking-confirm-modal').classList.add('hidden');
    });
    document.getElementById('booking-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('booking-confirm-modal').classList.add('hidden');
    });
    document.getElementById('booking-confirm-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'booking-confirm-modal') {
        document.getElementById('booking-confirm-modal').classList.add('hidden');
      }
    });
  }

  return { init, loadAvailableRides, openBookingModal, bindBookingModal, formatDate };
})();
