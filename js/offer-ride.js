/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — OFFER A RIDE
═══════════════════════════════════════════════════════ */

const OfferRide = (() => {
  let _fromLoc = null;
  let _toLoc   = null;
  let _seats   = 2;
  let _offerData = {};
  let _waypoints = [];
  let _waypointCount = 0;

  function init(userId) {
    bindOfferForm(userId);
    bindRouteConfirmOffer();
    initSeatCounter();
    checkVehicles(userId);
    bindWaypoints();
  }

  async function checkVehicles(userId) {
    try {
      const vehicles = await API.getVehicles({ ownerId: userId });
      const warn = document.getElementById('offer-no-vehicle-warn');
      const form = document.getElementById('offer-ride-form-wrap');
      if (warn && form) {
        if (!vehicles || !vehicles.length) {
          warn.classList.remove('hidden');
          form.classList.add('hidden');
        } else {
          warn.classList.add('hidden');
          form.classList.remove('hidden');
        }
      }
    } catch (e) { console.error('Failed to load vehicles for offer ride', e); }
  }

  function initSeatCounter() {
    const val = document.getElementById('offer-seats-val');
    document.getElementById('offer-seats-minus')?.addEventListener('click', () => {
      _seats = Math.max(1, _seats - 1);
      if (val) val.textContent = _seats;
    });
    document.getElementById('offer-seats-plus')?.addEventListener('click', () => {
      _seats = Math.min(6, _seats + 1);
      if (val) val.textContent = _seats;
    });
  }

  function bindWaypoints() {
    document.getElementById('offer-add-waypoint-btn')?.addEventListener('click', () => {
      if (_waypointCount >= 3) {
        Notifications.showToast('info', 'Limit reached', 'Maximum 3 stops allowed.');
        return;
      }
      _waypointCount++;
      const id = `offer-wp-${_waypointCount}`;
      const listId = `offer-wp-list-${_waypointCount}`;
      
      const container = document.getElementById('offer-waypoints-container');
      const wpHTML = `
        <div class="form-group waypoint-group" id="group-${id}" style="position:relative;">
          <label class="form-label" style="font-size:12px;color:var(--text-secondary)">🛑 Stop ${_waypointCount}</label>
          <div class="location-input-wrap">
            <input type="text" id="${id}" class="form-input" placeholder="Enter stop location" autocomplete="off" />
            <div class="autocomplete-list" id="${listId}"></div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" style="position:absolute; right:0; top:0; color:#ef4444; padding:0 8px;" onclick="document.getElementById('group-${id}').remove()">✕</button>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', wpHTML);
      
      const wpIdx = _waypointCount;
      Maps.attachAutocomplete(id, listId, (loc) => {
        // Find existing or add new
        const existing = _waypoints.find(w => w.id === id);
        if (existing) {
          existing.loc = loc;
        } else {
          _waypoints.push({ id, loc });
        }
      });
    });
  }

  function bindOfferForm(userId) {
    const dateInput = document.getElementById('offer-date');
    if (dateInput) { const t = new Date(); t.setDate(t.getDate()+1); dateInput.valueAsDate = t; }

    const timeInput = document.getElementById('offer-time');
    if (timeInput) timeInput.value = '09:00';

    Maps.attachAutocomplete('offer-pickup', 'offer-pickup-list', (loc) => { _fromLoc = loc; });
    Maps.attachAutocomplete('offer-destination', 'offer-destination-list', (loc) => { _toLoc = loc; });

    document.getElementById('offer-pickup-map')?.addEventListener('click', async () => {
      const loc = await Maps.openMapPicker(_fromLoc?.lat, _fromLoc?.lng);
      if (loc) {
        _fromLoc = loc;
        document.getElementById('offer-pickup').value = loc.label;
      }
    });

    document.getElementById('offer-pickup-gps')?.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      document.getElementById('offer-pickup').value = 'Locating...';
      navigator.geolocation.getCurrentPosition((pos) => {
        _fromLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Current Location' };
        document.getElementById('offer-pickup').value = 'Current Location';
      });
    });

    document.getElementById('offer-dest-map')?.addEventListener('click', async () => {
      const loc = await Maps.openMapPicker(_toLoc?.lat, _toLoc?.lng);
      if (loc) {
        _toLoc = loc;
        document.getElementById('offer-destination').value = loc.label;
      }
    });

    document.getElementById('offer-dest-gps')?.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      document.getElementById('offer-destination').value = 'Locating...';
      navigator.geolocation.getCurrentPosition((pos) => {
        _toLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Current Location' };
        document.getElementById('offer-destination').value = 'Current Location';
      });
    });

    document.getElementById('offer-ride-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pickup = document.getElementById('offer-pickup').value.trim();
      const dest   = document.getElementById('offer-destination').value.trim();
      const date   = document.getElementById('offer-date').value;
      const time   = document.getElementById('offer-time').value;
      const fare   = parseFloat(document.getElementById('offer-fare').value) || 0;
      const vehicleId = document.getElementById('offer-vehicle').value;

      if (!pickup || !dest) {
        Notifications.showToast('error', 'Missing location', 'Enter pickup and destination.');
        return;
      }
      if (!vehicleId) {
        Notifications.showToast('error', 'No vehicle', 'Please select a vehicle.');
        return;
      }

      // Collect active waypoints from the DOM
      const finalWaypoints = [];
      document.querySelectorAll('.waypoint-group input').forEach(inp => {
        const val = inp.value.trim();
        if (val) {
          const wpObj = _waypoints.find(w => w.id === inp.id);
          if (wpObj && wpObj.loc) {
            finalWaypoints.push({ location: val, lat: wpObj.loc.lat, lng: wpObj.loc.lng });
          } else {
            // fallback if autocomplete wasn't used
            finalWaypoints.push({ location: val, lat: 18.55, lng: 73.80 }); // dummy fallback
          }
        }
      });

      if (!_fromLoc) _fromLoc = { lat: 18.5904, lng: 73.7381, label: pickup };
      if (!_toLoc)   _toLoc   = { lat: 18.5204, lng: 73.8567, label: dest };

      const dist = Maps.computeDistance(_fromLoc.lat, _fromLoc.lng, _toLoc.lat, _toLoc.lng) + (finalWaypoints.length * 5); // Rough addition for waypoints
      const dur  = Math.round(dist / 30 * 60);

      _offerData = {
        pickup, dest, date, time, fare, vehicleId, seats: _seats,
        fromLoc: _fromLoc, toLoc: _toLoc, distance: parseFloat(dist.toFixed(1)), duration: dur,
        driverId: userId, waypoints: finalWaypoints
      };

      showOfferRouteConfirm();
    });
  }

  function showOfferRouteConfirm() {
    const { pickup, dest, fare, seats, distance, duration, waypoints } = _offerData;
    document.getElementById('offer-confirm-pickup-label').textContent = pickup;
    document.getElementById('offer-confirm-dest-label').textContent   = dest;
    document.getElementById('offer-confirm-fare').textContent   = `₹${fare}`;
    document.getElementById('offer-confirm-seats').textContent  = seats;
    document.getElementById('offer-confirm-distance').textContent = distance + ' km';
    document.getElementById('offer-confirm-duration').textContent = duration + ' min';

    App.showPage('page-route-confirm-offer');

    setTimeout(async () => {
      const result = await Maps.showRoute('offer-route-confirm-map',
        _offerData.fromLoc.lat, _offerData.fromLoc.lng,
        _offerData.toLoc.lat, _offerData.toLoc.lng,
        {
          fromLabel: pickup, toLabel: dest, waypoints,
          _polylineCallback: (poly) => {
            _offerData.routePolyline = poly;
            // Also update distance/duration from actual route data
            if (typeof result?.distance === 'number') {
              _offerData.distance = parseFloat((result.distance / 1000).toFixed(1));
              _offerData.duration = Math.round(result.duration / 60);
              document.getElementById('offer-confirm-distance').textContent = _offerData.distance + ' km';
              document.getElementById('offer-confirm-duration').textContent = _offerData.duration + ' min';
            }
          }
        }
      );
      // Also update if async result is available
      if (result?.distance) {
        _offerData.distance = parseFloat((result.distance / 1000).toFixed(1));
        _offerData.duration = Math.round((result.duration || 0) / 60);
        _offerData.routePolyline = result.polyline || _offerData.routePolyline;
        document.getElementById('offer-confirm-distance').textContent = _offerData.distance + ' km';
        document.getElementById('offer-confirm-duration').textContent = _offerData.duration + ' min';
      }
    }, 200);
  }

  function bindRouteConfirmOffer() {
    document.getElementById('publish-ride-btn')?.addEventListener('click', publishRide);
  }

  async function publishRide() {
    const { pickup, dest, date, time, fare, vehicleId, seats, fromLoc, toLoc, distance, duration, driverId, waypoints, routePolyline } = _offerData;
    
    document.getElementById('publish-ride-btn').disabled = true;
    try {
      await API.createRide({
        driverId, vehicleId,
        pickup, pickupLat: fromLoc.lat, pickupLng: fromLoc.lng,
        destination: dest, destLat: toLoc.lat, destLng: toLoc.lng,
        waypoints,
        date, time, seatsAvailable: seats, fare, distance, duration,
        status: 'available', recurring: false, passengers: [],
        routePolyline: routePolyline || null,
      });

      Notifications.showToast('success', 'Ride Published! 🚀', `Your ride on ${date} is now live.`);
      App.showPage('page-my-trips');
      Trip.init(driverId);
    } catch (err) {
      Notifications.showToast('error', 'Failed to publish ride', err.message);
    } finally {
      document.getElementById('publish-ride-btn').disabled = false;
    }
  }

  return { init, checkVehicles };
})();
