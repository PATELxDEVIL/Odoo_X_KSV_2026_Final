/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — MAPS (Mappls / MapMyIndia)
   Map SDK Key   : de4518f234493b9d11f7647b2dc89daa
   Client ID     : 96dHZVzsAutMmq211CuQNqZuMIdljVtZ3MMjQSEjlcfUoToMju187_-i-5fhjx18DZP0etHtTSAwZkYOT6CGnw==
   Client Secret : lrFxI-iSEg-ftax_c-LpJ8VJlerVuJ_sBsdtJP5UhqW2UbtsfPK74tku4Dl6xX4LVGiMrOOz5rXmjqIfd-qPxkrbALi0jJDs
═══════════════════════════════════════════════════════ */

const Maps = (() => {
  const MAP_SDK_KEY       = 'de4518f234493b9d11f7647b2dc89daa';
  const MAPPLS_CLIENT_ID  = '96dHZVzsAutMmq211CuQNqZuMIdljVtZ3MMjQSEjlcfUoToMju187_-i-5fhjx18DZP0etHtTSAwZkYOT6CGnw==';
  const MAPPLS_CLIENT_SEC = 'lrFxI-iSEg-ftax_c-LpJ8VJlerVuJ_sBsdtJP5UhqW2UbtsfPK74tku4Dl6xX4LVGiMrOOz5rXmjqIfd-qPxkrbALi0jJDs';

  const DEFAULT_LAT  = 18.5204;
  const DEFAULT_LNG  = 73.8567;
  const DEFAULT_ZOOM = 12;

  let _maps        = {};
  let _layers      = {}; // per-map polyline/layer arrays
  let _markers     = {}; // per-map marker arrays
  let _liveMarkers = {};

  /* ── OAuth Token via backend proxy (avoids CORS) ───── */
  let _token = null, _tokenExpiry = 0;

  async function _getToken() {
    if (_token && Date.now() < _tokenExpiry) return _token;
    try {
      // Use our own backend as proxy so credentials never hit the browser
      const jwt = localStorage.getItem('carpool_token');
      const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};
      const r = await fetch('http://localhost:5000/api/maps/token', { headers });
      if (!r.ok) throw new Error('Backend token proxy returned ' + r.status);
      const d = await r.json();
      if (d.access_token) {
        _token = d.access_token;
        _tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 min
        return _token;
      }
    } catch (e) { console.warn('[Maps] Token error:', e.message); }
    return null;
  }

  /* ── Wait for Mappls SDK ────────────────────────────── */
  function _waitForSDK(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (window.mappls) { resolve(); return; }
      const t0 = Date.now();
      const poll = () => {
        if (window.mappls) { resolve(); return; }
        if (Date.now() - t0 > timeout) { reject(new Error('Mappls SDK not loaded within ' + timeout + 'ms')); return; }
        setTimeout(poll, 200);
      };
      poll();
    });
  }

  /* ── Init Map ───────────────────────────────────────── */
  async function initMap(containerId, lat = DEFAULT_LAT, lng = DEFAULT_LNG, zoom = DEFAULT_ZOOM) {
    try { await _waitForSDK(); } catch (e) {
      console.warn('[Maps]', e.message);
      return null;
    }

    const el = document.getElementById(containerId);
    if (!el) return null;

    // Remove previous instance
    if (_maps[containerId]) {
      try { _maps[containerId].remove(); } catch {}
    }
    el.innerHTML = '';

    // The Mappls SDK exposes mappls.Map as a class (use `new`)
    const map = new mappls.Map(containerId, {
      center: [lat, lng],
      zoom,
      zoomControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });

    _maps[containerId]    = map;
    _markers[containerId] = [];
    _layers[containerId]  = [];
    return map;
  }

  /* ── Clear all overlays on a map ───────────────────── */
  function _clearOverlays(containerId) {
    const map = _maps[containerId];
    if (!map) return;
    (_layers[containerId]  || []).forEach(l => { try { l.remove(); } catch {} });
    (_markers[containerId] || []).forEach(m => { try { m.remove(); } catch {} });
    _layers[containerId]  = [];
    _markers[containerId] = [];
  }

  /* ── Markers ─────────────────────────────────────────  */
  function _addMarker(containerId, lat, lng, color = 'green') {
    const map = _maps[containerId];
    if (!map || !window.mappls) return null;
    const m = new mappls.Marker({ position: { lat, lng }, map });
    if (_markers[containerId]) _markers[containerId].push(m);
    return m;
  }

  /* ── Decode encoded polyline ────────────────────────── */
  function _decodePoly(encoded) {
    const pts = [];
    let i = 0, lat = 0, lng = 0;
    while (i < encoded.length) {
      let b, shift = 0, res = 0;
      do { b = encoded.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (res & 1) ? ~(res >> 1) : (res >> 1);
      shift = 0; res = 0;
      do { b = encoded.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += (res & 1) ? ~(res >> 1) : (res >> 1);
      pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return pts;
  }

  /* ── Draw polyline on map ───────────────────────────── */
  function _drawPolyline(containerId, map, path) {
    if (!window.mappls || !path.length) return;
    const pl = new mappls.Polyline({
      map,
      path,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
    if (_layers[containerId]) _layers[containerId].push(pl);
    return pl;
  }

  /* ── Fit map to bounds ──────────────────────────────── */
  function _fitBounds(map, points) {
    if (!map || points.length < 2) return;
    try {
      const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
      const sw = { lat: Math.min(...lats), lng: Math.min(...lngs) };
      const ne = { lat: Math.max(...lats), lng: Math.max(...lngs) };
      map.fitBounds({ sw, ne }, { padding: 40 });
    } catch {}
  }

  /* ── Show Route ─────────────────────────────────────── */
  async function showRoute(containerId, fromLat, fromLng, toLat, toLng, options = {}) {
    try { await _waitForSDK(); } catch { return null; }

    let map = _maps[containerId] || await initMap(containerId, fromLat, fromLng, 13);
    if (!map) return null;

    _clearOverlays(containerId);

    // ① Use pre-stored encoded polyline if provided
    if (options.encodedPolyline) {
      const pts = _decodePoly(options.encodedPolyline);
      if (pts.length) {
        _drawPolyline(containerId, map, pts);
        _addMarker(containerId, fromLat, fromLng);
        _addMarker(containerId, toLat, toLng);
        _fitBounds(map, pts);
        return { map, polyline: options.encodedPolyline };
      }
    }

    // ② Try Mappls Directions REST API
    try {
      const token = await _getToken();
      if (token) {
        const wpsParam = (options.waypoints || []).length
          ? '&via=' + options.waypoints.map(w => `${w.lat},${w.lng}`).join(';')
          : '';
        const url = `https://apis.mappls.com/advancedmaps/v1/route_adv/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&alternatives=false&costing=auto${wpsParam}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();

        const shape = data?.trip?.legs?.[0]?.shape || data?.routes?.[0]?.geometry;
        if (shape) {
          const pts = _decodePoly(shape);
          _drawPolyline(containerId, map, pts);
          _addMarker(containerId, fromLat, fromLng);
          _addMarker(containerId, toLat, toLng);
          _fitBounds(map, pts);

          const distM = data?.trip?.summary?.length  || data?.routes?.[0]?.distance || 0;
          const durS  = data?.trip?.summary?.time    || data?.routes?.[0]?.duration || 0;

          options._polylineCallback && options._polylineCallback(shape);
          return { map, polyline: shape, distance: distM, duration: durS };
        }
      }
    } catch (e) { console.warn('[Maps] Directions API failed:', e.message); }

    // ③ Fallback — straight line between points
    const pts = [{ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }];
    _drawPolyline(containerId, map, pts);
    _addMarker(containerId, fromLat, fromLng);
    _addMarker(containerId, toLat, toLng);
    _fitBounds(map, pts);
    const dist = computeDistance(fromLat, fromLng, toLat, toLng);
    return { map, polyline: null, distance: dist * 1000, duration: Math.round(dist / 0.5) * 60 };
  }

  /* ── Live marker (car icon) ─────────────────────────── */
  async function addLiveMarker(containerId, lat, lng, label = '') {
    await _waitForSDK().catch(() => {});
    const map = _maps[containerId];
    if (!map || !window.mappls) return null;
    if (_liveMarkers[containerId]) { try { _liveMarkers[containerId].remove(); } catch {} }
    const m = new mappls.Marker({ position: { lat, lng }, map, title: label || 'Car' });
    _liveMarkers[containerId] = m;
    return m;
  }

  function moveLiveMarker(marker, lat, lng) {
    if (!marker) return;
    try { marker.setPosition({ lat, lng }); } catch {}
  }

  function getMap(id) { return _maps[id] || null; }

  /* ── Mappls Places Autocomplete ─────────────────────── */
  const _acTimers = {};

  function attachAutocomplete(inputId, listId, onSelect) {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;

    input.addEventListener('input', () => {
      const q = input.value.trim();
      clearTimeout(_acTimers[inputId]);
      if (q.length < 2) { list.classList.remove('visible'); list.innerHTML = ''; return; }

      _acTimers[inputId] = setTimeout(() => _doAutocomplete(q, list, input, onSelect), 350);
    });

    input.addEventListener('blur',  () => setTimeout(() => list.classList.remove('visible'), 200));
    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !list.contains(e.target)) list.classList.remove('visible');
    });
  }

  async function _doAutocomplete(q, list, input, onSelect) {
    // ① Mappls Atlas Places Search
    try {
      const token = await _getToken();
      if (token) {
        const r = await fetch(
          `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(q)}&region=IND&tokenizeAddress=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = await r.json();
        const places = d?.suggestedLocations || [];
        if (places.length) {
          _showSuggestions(list, input, onSelect, places.slice(0, 6).map(s => ({
            label: s.placeName || (s.placeAddress || '').split(',')[0],
            sub:   s.placeAddress,
            lat:   parseFloat(s.latitude),
            lng:   parseFloat(s.longitude),
          })));
          return;
        }
      }
    } catch (e) { console.warn('[Maps] Mappls Places failed:', e.message); }

    // ② Fallback — OpenStreetMap Nominatim (free, India only)
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const d = await r.json();
      if (d.length) {
        _showSuggestions(list, input, onSelect, d.map(x => ({
          label: (x.address?.road || x.address?.suburb || x.name || x.display_name).split(',')[0].trim(),
          sub:   x.display_name,
          lat:   parseFloat(x.lat),
          lng:   parseFloat(x.lon),
        })));
        return;
      }
    } catch {}

    list.classList.remove('visible');
  }

  function _showSuggestions(list, input, onSelect, items) {
    list.innerHTML = items.map((s, i) =>
      `<div class="autocomplete-item" data-idx="${i}">
        <span class="autocomplete-item-icon">📍</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.label}</div>
          ${s.sub && s.sub !== s.label ? `<div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.sub}</div>` : ''}
        </div>
      </div>`
    ).join('');
    list.classList.add('visible');

    list.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const s = items[i];
        input.value = s.label;
        list.classList.remove('visible');
        list.innerHTML = '';
        onSelect && onSelect({ label: s.label, fullLabel: s.sub || s.label, lat: s.lat, lng: s.lng });
      });
    });
  }

  /* ── Reverse Geocode ────────────────────────────────── */
  async function reverseGeocode(lat, lng) {
    // ① Mappls
    try {
      const token = await _getToken();
      if (token) {
        const r = await fetch(
          `https://apis.mappls.com/advancedmaps/v1/rev_geocode?lat=${lat}&lng=${lng}&lang=en`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = await r.json();
        const res = d?.results?.[0];
        if (res) {
          const parts = [res.subLocality || res.locality, res.city || res.district].filter(Boolean);
          return parts.join(', ') || res.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      }
    } catch {}

    // ② Nominatim fallback
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'Accept-Language': 'en' }
      });
      const d = await r.json();
      const a = d?.address || {};
      return [a.road || a.neighbourhood || a.suburb, a.city || a.town || a.village].filter(Boolean).join(', ')
        || d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {}

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  /* ── Haversine distance ─────────────────────────────── */
  function computeDistance(lat1, lng1, lat2, lng2) {
    const R = 6371, d2r = Math.PI / 180;
    const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ── Map Picker Modal ───────────────────────────────── */
  let _pickerMap = null, _pickerDebounce = null;

  async function openMapPicker(initLat, initLng) {
    const modal = document.getElementById('map-picker-modal');
    if (!modal) return null;
    modal.classList.remove('hidden');

    const lat = initLat || DEFAULT_LAT;
    const lng = initLng || DEFAULT_LNG;

    if (!_pickerMap) {
      _pickerMap = await initMap('map-picker-container', lat, lng, 15);

      if (_pickerMap) {
        // Mappls fires 'dragend' and 'moveend'
        _pickerMap.addListener('moveend', () => {
          const c = _pickerMap.getCenter();
          clearTimeout(_pickerDebounce);
          _pickerDebounce = setTimeout(() => _updatePickerLabel(c.lat, c.lng), 500);
        });

        document.getElementById('map-picker-current-location')?.addEventListener('click', () => {
          navigator.geolocation?.getCurrentPosition(pos => {
            _pickerMap.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          });
        });
        document.getElementById('map-picker-zoom-in')?.addEventListener('click',  () => _pickerMap.setZoom(_pickerMap.getZoom() + 1));
        document.getElementById('map-picker-zoom-out')?.addEventListener('click', () => _pickerMap.setZoom(_pickerMap.getZoom() - 1));
      }
    } else {
      _pickerMap.setCenter({ lat, lng });
    }

    // Fetch address for current center
    const c = _pickerMap?.getCenter?.();
    if (c) _updatePickerLabel(c.lat, c.lng);

    return new Promise(resolve => {
      const closeBtn   = document.getElementById('map-picker-close');
      const confirmBtn = document.getElementById('map-picker-confirm');

      const cleanup = () => {
        closeBtn?.removeEventListener('click', onClose);
        confirmBtn?.removeEventListener('click', onConfirm);
      };
      const onClose = () => { modal.classList.add('hidden'); cleanup(); resolve(null); };
      const onConfirm = () => {
        const el = document.getElementById('map-picker-address');
        if (el?.dataset?.lat) {
          modal.classList.add('hidden'); cleanup();
          resolve({ lat: parseFloat(el.dataset.lat), lng: parseFloat(el.dataset.lng), label: el.dataset.address, fullLabel: el.dataset.address });
        }
      };
      closeBtn?.addEventListener('click', onClose);
      confirmBtn?.addEventListener('click', onConfirm);
    });
  }

  async function _updatePickerLabel(lat, lng) {
    const el = document.getElementById('map-picker-address');
    if (!el) return;
    el.textContent = 'Fetching address…';
    const label = await reverseGeocode(lat, lng);
    el.textContent = label;
    el.dataset.lat = lat; el.dataset.lng = lng; el.dataset.address = label;
  }

  /* ── Public API ─────────────────────────────────────── */
  return {
    initMap, showRoute, addLiveMarker, moveLiveMarker, getMap,
    attachAutocomplete, computeDistance, openMapPicker, reverseGeocode,
    _decodePoly,
  };
})();
