/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — LIVE TRACKING
   Simulated GPS tracking with Leaflet
═══════════════════════════════════════════════════════ */

const Tracking = (() => {
  let _trackingInterval = null;
  let _carMarker = null;
  let _progress = 5;
  let _currentRide = null;
  let _etaMinutes = 45;

  async function openTracking(rideId) {
    try {
      const ride = await API.getRide(rideId);
      if (!ride) return;
      _currentRide = ride;
      _progress = 5;
      _etaMinutes = ride.duration || 45;

      const driver = ride.driverId; // Populated
      const user   = Auth.getCurrentUser();
      const isDriver = user?.id === driver._id;

      // Set labels
      document.getElementById('tracking-pickup-label').textContent  = ride.pickup.split(',')[0];
      document.getElementById('tracking-dest-label').textContent    = ride.destination.split(',')[0];
      document.getElementById('tracking-progress').style.width      = _progress + '%';
      document.getElementById('tracking-distance-left').textContent = (ride.distance || 15).toFixed(1) + ' km';
      document.getElementById('tracking-speed').textContent         = '—';
      document.getElementById('tracking-status-label').textContent  = 'Scheduled';
      document.getElementById('tracking-eta').textContent           = 'ETA: ' + _etaMinutes + ' min';

      const vehicle = ride.vehicleId; // Populated
      // Driver card
      document.getElementById('tracking-driver-card').innerHTML = `
        <div style="display:flex;align-items:center;gap:12px">
          <div class="user-avatar lg">${driver?.avatar || '?'}</div>
          <div>
            <div style="font-weight:600;font-size:15px">${driver?.firstName || ''} ${driver?.lastName || ''}</div>
            <div style="font-size:13px;color:var(--text-secondary)">⭐ ${driver?.rating || 4.5} • ${vehicle?.model || 'Vehicle'}</div>
            <div style="font-size:12px;color:var(--text-muted)">${vehicle?.regNo || ''}</div>
          </div>
        </div>`;

      // Show/hide driver buttons
      const startBtn = document.getElementById('tracking-start-btn');
      const endBtn   = document.getElementById('tracking-end-btn');
      if (isDriver) {
        if (ride.status !== 'active') {
          startBtn.style.display = 'inline-flex';
          endBtn.style.display   = 'none';
        } else {
          startBtn.style.display = 'none';
          endBtn.style.display   = 'inline-flex';
        }
      } else {
        startBtn.style.display = 'none';
        endBtn.style.display   = 'none';
      }

      App.showPage('page-live-tracking');

      // Init map with ride start point
      setTimeout(async () => {
        const map = await Maps.initMap('live-tracking-map', ride.pickupLat || 18.5904, ride.pickupLng || 73.7381, 13);
        if (!map) return;
        await Maps.showRoute('live-tracking-map', ride.pickupLat || 18.5904, ride.pickupLng || 73.7381, ride.destLat || 18.5204, ride.destLng || 73.8567, { fromLabel: 'Pickup', toLabel: 'Destination', waypoints: ride.waypoints });
        _carMarker = await Maps.addLiveMarker('live-tracking-map', ride.pickupLat || 18.5904, ride.pickupLng || 73.7381, '🚗');
        if (ride.status === 'active') startSimulation();
      }, 150);

    } catch (err) {
      console.error('Tracking init error', err);
    }
  }

  function startSimulation() {
    clearInterval(_trackingInterval);
    if (!_currentRide) return;

    const ride = _currentRide;
    const fromLat = ride.pickupLat || 18.5904;
    const fromLng = ride.pickupLng || 73.7381;
    const toLat   = ride.destLat   || 18.5204;
    const toLng   = ride.destLng   || 73.8567;

    document.getElementById('tracking-status-label').textContent = 'In Progress';
    document.getElementById('tracking-speed').textContent = (28 + Math.random() * 12).toFixed(0) + ' km/h';

    _trackingInterval = setInterval(() => {
      if (_progress >= 98) { clearInterval(_trackingInterval); arriveAtDestination(); return; }

      _progress = Math.min(98, _progress + (Math.random() * 3 + 1));
      const frac = _progress / 100;
      const curLat = fromLat + (toLat - fromLat) * frac;
      const curLng = fromLng + (toLng - fromLng) * frac;

      Maps.moveLiveMarker(_carMarker, curLat, curLng);

      document.getElementById('tracking-progress').style.width = _progress + '%';
      _etaMinutes = Math.max(0, Math.round((ride.duration || 45) * (1 - frac)));
      document.getElementById('tracking-eta').textContent = `ETA: ${_etaMinutes} min`;
      document.getElementById('tracking-distance-left').textContent = ((ride.distance || 15) * (1 - frac)).toFixed(1) + ' km';
      document.getElementById('tracking-speed').textContent = (28 + Math.random() * 14).toFixed(0) + ' km/h';
    }, 2000);
  }

  function arriveAtDestination() {
    document.getElementById('tracking-status-label').textContent = 'Arrived';
    document.getElementById('tracking-eta').textContent = 'Arrived! 🎉';
    document.getElementById('tracking-distance-left').textContent = '0 km';
    document.getElementById('tracking-speed').textContent = '0 km/h';
    Notifications.showToast('success', 'Arrived!', 'You have reached your destination.');

    // Auto complete ride if driver
    const user = Auth.getCurrentUser();
    const driverId = typeof _currentRide.driverId === 'object' ? _currentRide.driverId._id : _currentRide.driverId;
    
    if (user && user.id === driverId && _currentRide.status === 'active') {
      setTimeout(async () => {
        try {
          await API.updateRide(_currentRide._id, { status: 'completed' });
          _currentRide.status = 'completed';
          Notifications.showToast('success', 'Trip Auto-Completed!', 'Your trip has been marked as completed.');
          App.showPage('page-my-trips');
          if (typeof Trip !== 'undefined') Trip.init(Auth.getCurrentUser()?.id);
        } catch(e) {
          console.error(e);
        }
      }, 2000);
    }
  }

  function bindTrackingButtons() {
    document.getElementById('tracking-start-btn')?.addEventListener('click', async () => {
      if (!_currentRide) return;
      try {
        await API.updateRide(_currentRide._id, { status: 'active' });
        _currentRide.status = 'active';
        
        document.getElementById('tracking-start-btn').style.display = 'none';
        document.getElementById('tracking-end-btn').style.display   = 'inline-flex';
        Notifications.showToast('success', 'Trip Started!', 'Passengers have been notified.');
        startSimulation();
      } catch (err) {
        Notifications.showToast('error', 'Failed to start trip', err.message);
      }
    });

    document.getElementById('tracking-end-btn')?.addEventListener('click', async () => {
      if (!_currentRide) return;
      clearInterval(_trackingInterval);
      
      try {
        await API.updateRide(_currentRide._id, { status: 'completed' });
        _currentRide.status = 'completed';
        Notifications.showToast('success', 'Trip Completed!', 'Great job! Earnings have been credited.');
        App.showPage('page-my-trips');
        if (typeof Trip !== 'undefined') Trip.init(Auth.getCurrentUser()?.id);
      } catch (err) {
        Notifications.showToast('error', 'Failed to complete trip', err.message);
      }
    });

    document.getElementById('tracking-chat-btn')?.addEventListener('click', () => {
      if (!_currentRide) return;
      const user = Auth.getCurrentUser();
      const isDriver = user?.id === _currentRide.driverId?._id;
      // In this demo, passengers array on the ride object
      const targetId = isDriver ? (_currentRide.passengers?.[0]?._id || '') : _currentRide.driverId?._id;
      const targetName = isDriver ? (_currentRide.passengers?.[0]?.firstName || 'Passenger') : (_currentRide.driverId?.firstName + ' ' + _currentRide.driverId?.lastName);
      const targetAvatar = isDriver ? (_currentRide.passengers?.[0]?.avatar || null) : (_currentRide.driverId?.avatar || null);
      if (targetId) Chat.open(_currentRide._id, targetId, targetName, targetAvatar, 'tracking');
    });

    document.getElementById('tracking-call-btn')?.addEventListener('click', () => {
      if (!_currentRide) return;
      const driver = _currentRide.driverId;
      openCallModal(driver?.firstName || 'Driver');
    });
  }

  function openCallModal(name) {
    document.getElementById('call-name').textContent = name;
    document.getElementById('call-avatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('call-status').textContent = 'Connecting...';
    document.getElementById('call-modal').classList.remove('hidden');

    setTimeout(() => {
      document.getElementById('call-status').textContent = 'Connected';
    }, 1500);
  }

  function bindCallModal() {
    document.getElementById('call-end-btn')?.addEventListener('click', () => {
      document.getElementById('call-modal').classList.add('hidden');
    });
    document.getElementById('call-mute-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.textContent = btn.textContent === '🔇' ? '🎙️' : '🔇';
    });
    document.getElementById('call-speaker-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.textContent = btn.textContent === '🔊' ? '🔈' : '🔊';
    });
    document.getElementById('call-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'call-modal') document.getElementById('call-modal').classList.add('hidden');
    });
  }

  return { openTracking, bindTrackingButtons, bindCallModal, openCallModal };
})();
