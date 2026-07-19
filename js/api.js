/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — API CLIENT
   Fetch wrapper for Express + MongoDB backend
   Base URL: http://localhost:5000/api
═══════════════════════════════════════════════════════ */

const API = (() => {
  const BASE = 'http://localhost:5000/api';

  function token() { return localStorage.getItem('cp_jwt') || ''; }

  function headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...extra,
    };
  }

  async function request(method, path, body) {
    try {
      const opts = { method, headers: headers() };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res  = await fetch(BASE + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      console.error(`[API] ${method} ${path} →`, err.message);
      throw err;
    }
  }

  return {
    get:    (path)         => request('GET',    path),
    post:   (path, body)   => request('POST',   path, body),
    patch:  (path, body)   => request('PATCH',  path, body),
    delete: (path)         => request('DELETE', path),

    // ── Auth ──────────────────────────────────────────
    login:    (email, password)  => request('POST', '/auth/login',    { email, password }),
    register: (data)             => request('POST', '/auth/register', data),
    me:       ()                 => request('GET',  '/auth/me'),

    // ── Users ─────────────────────────────────────────
    getUser:    (id)    => request('GET',   `/users/${id}`),
    updateUser: (id, d) => request('PATCH', `/users/${id}`, d),

    // ── Orgs ──────────────────────────────────────────
    getOrg:    (id)    => request('GET',   `/orgs/${id}`),
    updateOrg: (id, d) => request('PATCH', `/orgs/${id}`, d),

    // ── Rides ─────────────────────────────────────────
    getRides:   (q = {}) => request('GET', '/rides?' + new URLSearchParams(q)),
    getRide:    (id)     => request('GET',    `/rides/${id}`),
    createRide: (d)      => request('POST',   '/rides', d),
    updateRide: (id, d)  => request('PATCH',  `/rides/${id}`, d),
    deleteRide: (id)     => request('DELETE', `/rides/${id}`),

    // ── Trips ─────────────────────────────────────────
    getTrips:   (q = {}) => request('GET', '/trips?' + new URLSearchParams(q)),
    getTrip:    (id)     => request('GET',    `/trips/${id}`),
    bookTrip:   (d)      => request('POST',   '/trips', d),
    updateTrip: (id, d)  => request('PATCH',  `/trips/${id}`, d),
    cancelTrip: (id)     => request('DELETE', `/trips/${id}`),

    // ── Chat ──────────────────────────────────────────
    getMessages: (tripId) => request('GET', `/messages/${tripId}`),
    sendMessage: (tripId, text) => request('POST', `/messages/${tripId}`, { content: text }),

    // ── Vehicles ──────────────────────────────────────
    getVehicles:   ()       => request('GET',    '/vehicles'),
    getVehicle:    (id)     => request('GET',    `/vehicles/${id}`),
    createVehicle: (d)      => request('POST',   '/vehicles', d),
    updateVehicle: (id, d)  => request('PATCH',  `/vehicles/${id}`, d),
    deleteVehicle: (id)     => request('DELETE', `/vehicles/${id}`),

    // ── Wallet ────────────────────────────────────────
    getWalletTxns: ()    => request('GET',  '/wallet/txns'),
    createWalletOrder: (d) => request('POST', '/wallet/order', d),
    rechargeWallet:(d)   => request('POST', '/wallet/recharge', d),

    // ── Notifications ─────────────────────────────────
    getNotifications: ()   => request('GET',   '/notifications'),
    markRead:        (id)  => request('PATCH', `/notifications/${id}`, {}),
    markAllRead:     ()    => request('PATCH', '/notifications/read-all', {}),


    // ── Admin ─────────────────────────────────────────
    adminGetStats:     ()        => request('GET',    '/admin/stats'),
    adminGetUsers:     ()        => request('GET',    '/admin/users'),
    adminAddUser:      (d)       => request('POST',   '/admin/users', d),
    adminUpdateUser:   (id, d)   => request('PATCH',  `/admin/users/${id}`, d),
    adminDeleteUser:   (id)      => request('DELETE', `/admin/users/${id}`),
    adminGetVehicles:  ()        => request('GET',    '/admin/vehicles'),
    adminAddVehicle:   (d)       => request('POST',   '/admin/vehicles', d),
    adminUpdateVehicle:(id, d)   => request('PATCH',  `/admin/vehicles/${id}`, d),
    adminDeleteVehicle:(id)      => request('DELETE', `/admin/vehicles/${id}`),
    adminGetRides:     ()        => request('GET',    '/admin/rides'),
  };
})();
