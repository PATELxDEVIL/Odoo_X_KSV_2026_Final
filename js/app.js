/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — APP CONTROLLER
   Main SPA controller — navigation, init, dashboard
═══════════════════════════════════════════════════════ */

const App = (() => {
  let _currentPage  = null;
  let _currentUser  = null;
  let _sidebarCollapsed = false;

  // ── Page Navigation ────────────────────────────────────
  function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show requested page
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    _currentPage = pageId;

    // Topbar title
    const titles = {
      'page-dashboard':         'Dashboard',
      'page-find-ride':         'Find a Ride',
      'page-route-confirm':     'Confirm Route',
      'page-available-rides':   'Available Rides',
      'page-offer-ride':        'Offer a Ride',
      'page-route-confirm-offer':'Confirm Route',
      'page-my-trips':          'My Trips',
      'page-trip-detail':       'Trip Details',
      'page-live-tracking':     'Live Tracking',
      'page-payment':           'Payment',
      'page-wallet':            'Wallet',
      'page-ride-history':      'Ride History',
      'page-my-vehicles':       'My Vehicles',
      'page-reports':           'Reports',
      'page-settings':          'Settings',
      'page-admin':             'Admin Panel',
      'page-chat':              'Chat',
    };
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titles[pageId] || 'CarPool';

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = {
      'page-dashboard':       'nav-dashboard',
      'page-find-ride':       'nav-find-ride',
      'page-route-confirm':   'nav-find-ride',
      'page-available-rides': 'nav-find-ride',
      'page-offer-ride':      'nav-offer-ride',
      'page-route-confirm-offer':'nav-offer-ride',
      'page-my-trips':        'nav-my-trips',
      'page-trip-detail':     'nav-my-trips',
      'page-my-vehicles':     'nav-my-vehicles',
      'page-wallet':          'nav-wallet',
      'page-ride-history':    'nav-history',
      'page-reports':         'nav-reports',
      'page-settings':        'nav-settings',
      'page-admin':           'nav-admin',
    };
    const navId = navMap[pageId];
    if (navId) document.getElementById(navId)?.classList.add('active');

    // Close mobile sidebar
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();

    // Scroll to top
    document.getElementById('main-content')?.scrollTo(0, 0);

    // Lazy init for pages that need it
    lazyInitPage(pageId);
  }

  function lazyInitPage(pageId) {
    if (!_currentUser) return;
    const uid = _currentUser.id;

    switch (pageId) {
      case 'page-my-trips':
        Trip.init(uid);
        break;
      case 'page-my-vehicles':
        Vehicle.renderVehicles(uid);
        break;
      case 'page-wallet':
        History.initWallet(uid);
        break;
      case 'page-ride-history':
        History.initRideHistory(uid);
        break;
      case 'page-reports':
        Reports.init(uid);
        break;
      case 'page-settings':
        Settings.init(uid);
        break;
      case 'page-admin':
        if (_currentUser.role === 'admin') Admin.init(_currentUser.orgId);
        break;
      case 'page-offer-ride':
        OfferRide.checkVehicles(uid);
        Vehicle.populateVehicleDropdown(uid);
        break;
    }
  }

  // ── Login / Logout ─────────────────────────────────────
  function onLogin(user) {
    _currentUser = user;
    setupShell(user);
    initModules(user);

    // Hide auth pages, show app
    document.querySelectorAll('.page-auth').forEach(p => p.classList.remove('active'));
    document.getElementById('app-shell').classList.remove('hidden');

    showPage('page-dashboard');
    loadDashboard(user);

    Notifications.showToast('success', `Welcome back, ${user.firstName}! 👋`, '');
  }

  function onLogout() {
    _currentUser = null;
    document.getElementById('app-shell').classList.add('hidden');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    showAuthPage('page-login');
    Notifications.showToast('info', 'Logged out', 'See you next time!');
  }

  function showAuthPage(pageId) {
    document.querySelectorAll('.page-auth').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
  }

  // ── Shell Setup ────────────────────────────────────────
  function setupShell(user) {
    // Sidebar user info
    document.getElementById('sidebar-user-name').textContent = user.firstName + ' ' + user.lastName;
    document.getElementById('sidebar-user-org').textContent  = DB.org(user.orgId)?.name || user.orgId;
    document.getElementById('sidebar-avatar').textContent    = user.avatar || user.firstName.charAt(0);
    document.getElementById('sidebar-wallet-badge').textContent = `₹${Math.round(user.walletBalance || 0)}`;

    // Topbar avatar
    document.getElementById('topbar-avatar').textContent = user.avatar || user.firstName.charAt(0);

    // Admin nav
    const adminNav = document.getElementById('nav-admin');
    if (adminNav) adminNav.style.display = user.role === 'admin' ? 'flex' : 'none';

    // Trip badge
    Trip.updateBadge(user.id);
  }

  // ── Module Initialization ──────────────────────────────
  function initModules(user) {
    Notifications.init(user.id);
    FindRide.init();
    FindRide.bindBookingModal();
    OfferRide.init(user.id);
    Vehicle.init(user.id);
    Tracking.bindTrackingButtons();
    Tracking.bindCallModal();
    Payment.bindPaymentPage();
    Chat.bind();
  }

  // ── Dashboard ──────────────────────────────────────────
  async function loadDashboard(user) {
    // Greeting
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
    document.getElementById('dashboard-greeting').textContent = `${greet}, ${user.firstName}! 👋`;
    document.getElementById('dashboard-sub').textContent = getMotivationalSub();

    // Date badge
    const dateBadge = document.getElementById('dashboard-date');
    if (dateBadge) {
      dateBadge.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    try {
      // Fetch passenger trips
      const pTrips = await API.getTrips({ role: 'all' });
      // Fetch driver rides
      const dRides = await API.getRides({ driverId: user.id });
      
      // Convert driver rides to a uniform trip format for stats
      const dTrips = dRides.map(r => ({
        _id: 'dr_' + r._id, rideId: r, passengerId: user.id,
        seats: 0, totalFare: r.fare * (r.passengers || []).length,
        status: r.status === 'available' ? 'offered' : r.status,
        paymentStatus: r.status === 'completed' ? 'received' : 'pending',
        role: 'driver',
      }));
      
      const trips = [...pTrips, ...dTrips];

      // Only calculate savings for trips that are not cancelled
      const validTrips = trips.filter(t => t.status !== 'cancelled');
      
      const totalKm = validTrips.reduce((s, t) => s + (t.rideId?.distance || 0), 0);
      const saved   = validTrips.reduce((s, t) => {
        const r = t.rideId;
        return s + Math.max(0, (r?.distance || 0) * 7 - (t.totalFare || 0));
      }, 0);
      const co2 = totalKm * 0.21;

      document.getElementById('stat-total-trips').textContent = validTrips.length;
      document.getElementById('stat-saved').textContent       = `₹${Math.round(saved)}`;
      document.getElementById('stat-distance').textContent    = totalKm.toFixed(0) + ' km';
      document.getElementById('stat-co2').textContent         = co2.toFixed(1) + ' kg';

      const activeTrip = trips.find(t => ['in-progress','started','active'].includes(t.status) || (t.rideId && t.rideId.status === 'active'));
      const banner = document.getElementById('active-trip-banner');
      if (activeTrip && banner) {
        const ride = activeTrip.rideId;
        if (ride) {
          document.getElementById('active-trip-route').textContent = `${ride.pickup.split(',')[0]} → ${ride.destination.split(',')[0]}`;
          banner.classList.remove('hidden');
          document.getElementById('active-trip-track-btn').onclick = () => Tracking.openTracking(ride._id);
        }
      } else if (banner) {
        banner.classList.add('hidden');
      }
    } catch (err) {
      console.error('[Dashboard]', err);
    }

    // Upcoming trips
    loadUpcomingTrips(user.id, trips);

    // Available rides on dashboard
    loadDashboardRides(user.id);
  }

  function getMotivationalSub() {
    const subs = [
      'Ready for your commute today?',
      'Every shared ride saves CO₂! 🌿',
      'Connecting colleagues, one ride at a time.',
      'Your carpool journey awaits!',
      'Share a ride, save the planet 🌍',
    ];
    return subs[Math.floor(Math.random() * subs.length)];
  }

  async function loadUpcomingTrips(userId, allTrips = []) {
    const container = document.getElementById('upcoming-trips-list');
    if (!container) return;

    try {
      const upcoming = allTrips.filter(t => t.status === 'booked' || t.status === 'offered' || (t.rideId && t.rideId.status === 'available')).slice(0, 3);

      if (!upcoming.length) {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-icon">🗓</div>
          <p>No upcoming trips. <a href="#" data-page="find-ride" class="link">Find a ride?</a></p>
        </div>`;
        container.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', (e) => {
          e.preventDefault(); showPage('page-' + el.dataset.page);
        }));
        return;
      }

      container.innerHTML = upcoming.map(t => {
        const ride = t.rideId;
        if (!ride) return '';
        const driver = ride.driverId;
        const sdate  = FindRide ? FindRide.formatDate(ride.date) : ride.date;
        return `
        <div class="trip-card" onclick="Trip.openTripDetail('${t._id}')">
          <div class="user-avatar">${driver?.avatar || '?'}</div>
          <div class="trip-card-route">
            <div class="trip-route-line">
              <div class="route-dot start sm"></div>
              <span>${ride.pickup.split(',')[0]}</span>
              <span class="trip-route-arrow">→</span>
              <div class="route-dot end sm"></div>
              <span>${ride.destination.split(',')[0]}</span>
            </div>
            <div class="trip-meta">
              <span class="trip-meta-item">📅 ${sdate}</span>
              <span class="trip-meta-item">🕐 ${ride.time}</span>
              <span class="trip-meta-item">with ${driver?.firstName || 'Driver'}</span>
            </div>
          </div>
          <div class="trip-card-right">
            <span class="status-badge booked">✓ Booked</span>
            <div class="trip-fare">₹${t.totalFare}</div>
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p>Error loading trips.</p>';
    }
  }

  async function loadDashboardRides(userId) {
    const container = document.getElementById('dashboard-rides-list');
    if (!container) return;
    
    try {
      const allRides = await API.getRides({ status: 'available' });
      const available = allRides.filter(r => r.driverId?._id !== userId).slice(0, 4);

      if (!available.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚗</div><p>No rides available today.</p></div>`;
        return;
      }

      container.innerHTML = available.map(r => {
        const driver = r.driverId;
        return `
        <div class="ride-card" style="cursor:pointer" onclick="FindRide.openBookingModal('${r._id}')">
          <div class="ride-card-header">
            <div class="ride-card-driver">
              <div class="user-avatar sm">${driver?.avatar || '?'}</div>
              <div>
                <div class="ride-driver-name">${driver?.firstName || 'Driver'}</div>
                <div class="ride-driver-rating">⭐ ${driver?.rating || 4.5}</div>
              </div>
            </div>
            <div class="ride-card-fare">₹${r.fare}<span>/seat</span></div>
          </div>
          <div class="ride-card-route">
            <div class="ride-route-point"><div class="route-dot start"></div><strong>${r.pickup.split(',')[0]}</strong></div>
            <div class="ride-route-point"><div class="route-dot end"></div><strong>${r.destination.split(',')[0]}</strong></div>
          </div>
          <div class="ride-card-footer">
            <div class="ride-card-meta">
              <span class="ride-meta-item">🕐 ${r.time}</span>
              <span class="ride-meta-item">👥 ${r.seatsAvailable} seats</span>
            </div>
            <button class="btn btn-primary btn-sm">Book</button>
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p>Error loading rides.</p>';
    }
  }


  // ── Module Initialization ──────────────────────────────
  function boot() {
    try {
      Auth.init();
      _currentUser = Auth.getCurrentUser();

      // Bind Auth events
      if (typeof Auth.bindLoginForm === 'function') Auth.bindLoginForm();
      if (typeof Auth.bindSignupForm === 'function') Auth.bindSignupForm();
      if (typeof Auth.bindLogout === 'function') Auth.bindLogout();

      // Sidebar logic
      document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('collapsed');
        document.getElementById('main-content')?.classList.toggle('expanded');
      });
      document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.add('mobile-open');
        document.getElementById('sidebar-overlay')?.classList.add('visible');
      });
      window.closeMobileSidebar = () => {
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebar-overlay')?.classList.remove('visible');
      };
      document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
        window.closeMobileSidebar();
      });

      // Setup global nav
      document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const target = e.currentTarget.dataset.target || e.currentTarget.dataset.page;
          if (target) showPage('page-' + target);
        });
      });

    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showPage('page-' + e.currentTarget.dataset.page);
      });
    });

      // Delay initial route to show splash screen animation (2.5 seconds)
      setTimeout(() => {
        if (_currentUser) {
          onLogin(_currentUser);
        } else {
          showPage('page-login');
        }
    
        const loader = document.getElementById('app-loader');
        if (loader) loader.classList.add('hidden');
      }, 2500);

    } catch (err) {
      alert("Boot Error: " + err.message + "\n" + err.stack);
      console.error(err);
    }
  }

  return {
    boot,
    onLogin,
    onLogout,
    showPage,
    showAuthPage
  };
})();

// ── Boot on DOM ready ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.boot());
