/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — DATABASE (localStorage)
   Data layer with CRUD helpers and seed data
═══════════════════════════════════════════════════════ */

const DB = (() => {
  const KEYS = {
    users:       'cp_users',
    session:     'cp_session',
    orgs:        'cp_orgs',
    vehicles:    'cp_vehicles',
    rides:       'cp_rides',
    trips:       'cp_trips',
    wallet_txns: 'cp_wallet_txns',
    notifications:'cp_notifications',
    saved_places:'cp_saved_places',
    org_settings:'cp_org_settings',
    app_settings:'cp_app_settings',
  };

  const uid = () => 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  const now = () => new Date().toISOString();

  function get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function getObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  }
  function set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
  function setObj(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ── Generic CRUD ──────────────────────────────────────
  function findAll(key) { return get(key); }
  function findById(key, id) { return get(key).find(r => r.id === id) || null; }
  function findWhere(key, pred) { return get(key).filter(pred); }
  function insert(key, data) {
    const rows = get(key);
    const row = { id: uid(), createdAt: now(), ...data };
    rows.push(row);
    set(key, rows);
    return row;
  }
  function update(key, id, data) {
    const rows = get(key);
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...data, updatedAt: now() };
    set(key, rows);
    return rows[idx];
  }
  function remove(key, id) {
    const rows = get(key).filter(r => r.id !== id);
    set(key, rows);
  }
  function clearAll(key) { set(key, []); }

  // ── Session ───────────────────────────────────────────
  function getSession() { return getObj(KEYS.session, null); }
  function setSession(user) { setObj(KEYS.session, user); }
  function clearSession() { localStorage.removeItem(KEYS.session); }

  // ── Seed data ─────────────────────────────────────────
  function seed() {
    if (localStorage.getItem('cp_seeded') === 'v3') return; // already seeded

    // Orgs
    const orgs = [
      { id: 'org1', name: 'Infosys Pune', domain: 'infosys.com', fuelCost: 103, mileage: 15, maxFarePerKm: 10 },
      { id: 'org2', name: 'TCS Mumbai',   domain: 'tcs.com',     fuelCost: 103, mileage: 14, maxFarePerKm: 10 },
    ];
    set(KEYS.orgs, orgs);

    // Users
    const users = [
      { id: 'u1', firstName: 'Admin',    lastName: 'User',    email: 'admin@carpool.com', phone: '9876543210', password: 'admin123', orgId: 'org1', role: 'admin', walletBalance: 1500, rating: 4.9, totalTrips: 47, avatar: 'A' },
      { id: 'u2', firstName: 'Priya',    lastName: 'Sharma',  email: 'priya@infosys.com', phone: '9876543211', password: 'pass123',  orgId: 'org1', role: 'user',  walletBalance: 450,  rating: 4.7, totalTrips: 23, avatar: 'P' },
      { id: 'u3', firstName: 'Rahul',    lastName: 'Verma',   email: 'rahul@infosys.com', phone: '9876543212', password: 'pass123',  orgId: 'org1', role: 'user',  walletBalance: 820,  rating: 4.5, totalTrips: 31, avatar: 'R' },
      { id: 'u4', firstName: 'Ananya',   lastName: 'Singh',   email: 'ananya@tcs.com',    phone: '9876543213', password: 'pass123',  orgId: 'org2', role: 'user',  walletBalance: 200,  rating: 4.8, totalTrips: 18, avatar: 'A' },
      { id: 'u5', firstName: 'Vikram',   lastName: 'Mehta',   email: 'vikram@infosys.com',phone: '9876543214', password: 'pass123',  orgId: 'org1', role: 'user',  walletBalance: 0,    rating: 4.6, totalTrips: 12, avatar: 'V' },
      { id: 'u6', firstName: 'Kavya',    lastName: 'Nair',    email: 'kavya@tcs.com',     phone: '9876543215', password: 'pass123',  orgId: 'org2', role: 'user',  walletBalance: 350,  rating: 4.4, totalTrips: 9,  avatar: 'K' },
    ];
    set(KEYS.users, users);

    // Vehicles
    const vehicles = [
      { id: 'v1', ownerId: 'u2', model: 'Maruti Swift',  regNo: 'MH 12 AB 1234', capacity: 4, color: 'White',  year: 2021, tripCount: 18 },
      { id: 'v2', ownerId: 'u3', model: 'Honda City',    regNo: 'MH 12 CD 5678', capacity: 4, color: 'Silver', year: 2022, tripCount: 24 },
      { id: 'v3', ownerId: 'u1', model: 'Hyundai Creta', regNo: 'MH 12 EF 9012', capacity: 5, color: 'Blue',   year: 2023, tripCount: 31 },
    ];
    set(KEYS.vehicles, vehicles);

    // Generate dates
    const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
    const subDays = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
    const fmtDate = (d) => d.toISOString().split('T')[0];
    const fmtTime = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

    // Rides (offered by drivers)
    const rides = [
      {
        id: 'r1', driverId: 'u2', vehicleId: 'v1',
        pickup: 'Hinjewadi Phase 1, Pune', pickupLat: 18.5904, pickupLng: 73.7381,
        destination: 'Infosys BPO, Pune', destLat: 18.5679, destLng: 73.9143,
        date: fmtDate(addDays(1)), time: fmtTime(9, 0), seatsAvailable: 2, fare: 60,
        distance: 18.5, duration: 45, status: 'available', recurring: false,
        passengers: ['u5'],
      },
      {
        id: 'r2', driverId: 'u3', vehicleId: 'v2',
        pickup: 'Kothrud, Pune', pickupLat: 18.5074, pickupLng: 73.8077,
        destination: 'Magarpatta City, Pune', destLat: 18.5089, destLng: 73.9260,
        date: fmtDate(addDays(1)), time: fmtTime(8, 30), seatsAvailable: 3, fare: 50,
        distance: 12.3, duration: 35, status: 'available', recurring: true, days: ['Mon','Tue','Wed','Thu','Fri'],
        passengers: [],
      },
      {
        id: 'r3', driverId: 'u1', vehicleId: 'v3',
        pickup: 'Wakad, Pune', pickupLat: 18.5994, pickupLng: 73.7628,
        destination: 'Hinjewadi Phase 3, Pune', destLat: 18.5975, pickupLng: 73.7155,
        date: fmtDate(addDays(1)), time: fmtTime(9, 30), seatsAvailable: 4, fare: 40,
        distance: 8.2, duration: 25, status: 'available', recurring: false,
        passengers: ['u2'],
      },
      {
        id: 'r4', driverId: 'u2', vehicleId: 'v1',
        pickup: 'Aundh, Pune', pickupLat: 18.5590, pickupLng: 73.8079,
        destination: 'Viman Nagar, Pune', destLat: 18.5679, destLng: 73.9143,
        date: fmtDate(addDays(2)), time: fmtTime(8, 0), seatsAvailable: 2, fare: 70,
        distance: 16.0, duration: 40, status: 'available', recurring: false,
        passengers: [],
      },
      {
        id: 'r5', driverId: 'u3', vehicleId: 'v2',
        pickup: 'Baner, Pune', pickupLat: 18.5590, pickupLng: 73.7771,
        destination: 'Hadapsar, Pune', destLat: 18.5022, destLng: 73.9298,
        date: fmtDate(new Date()), time: fmtTime(9, 15), seatsAvailable: 0, fare: 55,
        distance: 20.1, duration: 50, status: 'active', recurring: false,
        passengers: ['u1', 'u5'],
      },
      {
        id: 'r6', driverId: 'u1', vehicleId: 'v3',
        pickup: 'Kalyani Nagar, Pune', pickupLat: 18.5471, pickupLng: 73.9026,
        destination: 'Pimpri, Pune', destLat: 18.6298, destLng: 73.7996,
        date: fmtDate(subDays(2)), time: fmtTime(9, 0), seatsAvailable: 0, fare: 80,
        distance: 22.4, duration: 55, status: 'completed', recurring: false,
        passengers: ['u2', 'u3'],
      },
      {
        id: 'r7', driverId: 'u2', vehicleId: 'v1',
        pickup: 'Shivajinagar, Pune', pickupLat: 18.5308, pickupLng: 73.8475,
        destination: 'Kharadi, Pune', destLat: 18.5524, destLng: 73.9456,
        date: fmtDate(subDays(5)), time: fmtTime(9, 30), seatsAvailable: 0, fare: 45,
        distance: 10.8, duration: 30, status: 'completed', recurring: false,
        passengers: ['u5'],
      },
      {
        id: 'r8', driverId: 'u3', vehicleId: 'v2',
        pickup: 'FC Road, Pune', pickupLat: 18.5236, pickupLng: 73.8438,
        destination: 'Hinjewadi, Pune', destLat: 18.5904, destLng: 73.7381,
        date: fmtDate(addDays(3)), time: fmtTime(8, 45), seatsAvailable: 3, fare: 65,
        distance: 19.2, duration: 48, status: 'available', recurring: true, days: ['Mon','Wed','Fri'],
        passengers: [],
      },
    ];
    set(KEYS.rides, rides);

    // Trips (bookings by passengers)
    const trips = [
      { id: 't1', rideId: 'r1', passengerId: 'u5', seats: 1, totalFare: 60,  status: 'booked',            paymentStatus: 'pending', paymentMethod: null,  bookedAt: subDays(1).toISOString(), role: 'passenger' },
      { id: 't2', rideId: 'r3', passengerId: 'u2', seats: 1, totalFare: 40,  status: 'booked',            paymentStatus: 'pending', paymentMethod: null,  bookedAt: subDays(1).toISOString(), role: 'passenger' },
      { id: 't3', rideId: 'r5', passengerId: 'u1', seats: 1, totalFare: 55,  status: 'in-progress',       paymentStatus: 'pending', paymentMethod: null,  bookedAt: subDays(0).toISOString(), role: 'passenger' },
      { id: 't4', rideId: 'r5', passengerId: 'u5', seats: 1, totalFare: 55,  status: 'in-progress',       paymentStatus: 'pending', paymentMethod: null,  bookedAt: subDays(0).toISOString(), role: 'passenger' },
      { id: 't5', rideId: 'r6', passengerId: 'u2', seats: 1, totalFare: 80,  status: 'completed',         paymentStatus: 'paid',    paymentMethod: 'cash', bookedAt: subDays(3).toISOString(), role: 'passenger' },
      { id: 't6', rideId: 'r6', passengerId: 'u3', seats: 1, totalFare: 80,  status: 'completed',         paymentStatus: 'paid',    paymentMethod: 'upi',  bookedAt: subDays(3).toISOString(), role: 'passenger' },
      { id: 't7', rideId: 'r7', passengerId: 'u5', seats: 1, totalFare: 45,  status: 'completed',         paymentStatus: 'paid',    paymentMethod: 'wallet', bookedAt: subDays(6).toISOString(), role: 'passenger' },
      // Driver trips for offer rides
      { id: 't8', rideId: 'r6', passengerId: 'u2', seats: 0, totalFare: 160, status: 'completed',         paymentStatus: 'received',paymentMethod: null,  bookedAt: subDays(3).toISOString(), role: 'driver', driverId: 'u2' },
      { id: 't9', rideId: 'r7', passengerId: 'u2', seats: 0, totalFare: 45,  status: 'completed',         paymentStatus: 'received',paymentMethod: null,  bookedAt: subDays(6).toISOString(), role: 'driver', driverId: 'u2' },
    ];
    set(KEYS.trips, trips);

    // Wallet transactions
    const txns = [
      { id: 'tx1', userId: 'u1', type: 'credit', amount: 500,  desc: 'Wallet Recharge',       method: 'upi',   date: subDays(10).toISOString() },
      { id: 'tx2', userId: 'u1', type: 'credit', amount: 1000, desc: 'Wallet Recharge',       method: 'card',  date: subDays(5).toISOString()  },
      { id: 'tx3', userId: 'u1', type: 'debit',  amount: 55,   desc: 'Trip: Wakad → Hinjewadi', method: 'wallet', date: subDays(0).toISOString() },
      { id: 'tx4', userId: 'u2', type: 'credit', amount: 200,  desc: 'Wallet Recharge',       method: 'upi',   date: subDays(8).toISOString()  },
      { id: 'tx5', userId: 'u2', type: 'debit',  amount: 80,   desc: 'Trip: Kalyani → Pimpri', method: 'wallet', date: subDays(2).toISOString() },
      { id: 'tx6', userId: 'u2', type: 'credit', amount: 330,  desc: 'Ride Earnings',         method: null,    date: subDays(2).toISOString()  },
      { id: 'tx7', userId: 'u3', type: 'credit', amount: 500,  desc: 'Wallet Recharge',       method: 'card',  date: subDays(3).toISOString()  },
      { id: 'tx8', userId: 'u3', type: 'debit',  amount: 80,   desc: 'Trip: Kalyani → Pimpri', method: 'upi',  date: subDays(2).toISOString()  },
      { id: 'tx9', userId: 'u3', type: 'credit', amount: 400,  desc: 'Ride Earnings',         method: null,    date: subDays(0).toISOString()  },
      { id: 'tx10',userId: 'u4', type: 'credit', amount: 200,  desc: 'Wallet Recharge',       method: 'upi',   date: subDays(6).toISOString()  },
      { id: 'tx11',userId: 'u5', type: 'debit',  amount: 45,   desc: 'Trip: Shivajinagar → Kharadi', method: 'wallet', date: subDays(5).toISOString() },
    ];
    set(KEYS.wallet_txns, txns);

    // Notifications
    const notifs = [
      { id: 'n1', userId: 'u1', type: 'ride', icon: '🚗', title: 'Ride Booked',    msg: 'Your ride to Hinjewadi is confirmed for tomorrow.',  read: false, date: subDays(1).toISOString() },
      { id: 'n2', userId: 'u1', type: 'pay',  icon: '💰', title: 'Payment Due',    msg: 'Please pay ₹55 for your ongoing ride.',              read: false, date: subDays(0).toISOString() },
      { id: 'n3', userId: 'u2', type: 'ride', icon: '👤', title: 'New Passenger',  msg: 'Priya has joined your ride.',                        read: true,  date: subDays(1).toISOString() },
    ];
    set(KEYS.notifications, notifs);

    // Saved places
    const places = [
      { id: 'sp1', userId: 'u1', label: 'Home',   location: 'Baner, Pune',      lat: 18.5590, lng: 73.7771 },
      { id: 'sp2', userId: 'u1', label: 'Office', location: 'Hinjewadi, Pune',  lat: 18.5904, lng: 73.7381 },
      { id: 'sp3', userId: 'u2', label: 'Home',   location: 'Kothrud, Pune',    lat: 18.5074, lng: 73.8077 },
      { id: 'sp4', userId: 'u2', label: 'Office', location: 'Magarpatta, Pune', lat: 18.5089, lng: 73.9260 },
    ];
    set(KEYS.saved_places, places);

    localStorage.setItem('cp_seeded', 'v3');
    console.log('[DB] Seed data initialized ✓');
  }

  return {
    KEYS, uid, now,
    findAll, findById, findWhere, insert, update, remove, clearAll,
    getSession, setSession, clearSession,
    seed,
    // Convenience getters
    users:       () => findAll(KEYS.users),
    user:        (id) => findById(KEYS.users, id),
    orgs:        () => findAll(KEYS.orgs),
    org:         (id) => findById(KEYS.orgs, id),
    vehicles:    () => findAll(KEYS.vehicles),
    vehicle:     (id) => findById(KEYS.vehicles, id),
    rides:       () => findAll(KEYS.rides),
    ride:        (id) => findById(KEYS.rides, id),
    trips:       () => findAll(KEYS.trips),
    trip:        (id) => findById(KEYS.trips, id),
    walletTxns:  () => findAll(KEYS.wallet_txns),
    notifications: () => findAll(KEYS.notifications),
    savedPlaces: () => findAll(KEYS.saved_places),
    getOrgSettings: (orgId) => getObj('cp_org_' + orgId, {}),
    setOrgSettings: (orgId, data) => setObj('cp_org_' + orgId, data),
    getAppSettings: () => getObj(KEYS.app_settings, { notifications: true, locationSharing: true }),
    setAppSettings: (data) => setObj(KEYS.app_settings, data),
  };
})();

// Initialize seed data
DB.seed();
