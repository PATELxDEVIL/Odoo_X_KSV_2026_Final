const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

// The replacement in loadUpcomingTrips got very mangled.
// Let's replace everything from 'async function loadUpcomingTrips(userId) {' to the next 'function loadDashboardRides'

const startIndex = appJs.indexOf('async function loadUpcomingTrips(userId) {');
const endIndex = appJs.indexOf('function loadDashboardRides(userId) {');

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index.");
  process.exit(1);
}

const replacement = `async function loadUpcomingTrips(userId) {
    const container = document.getElementById('upcoming-trips-list');
    if (!container) return;

    try {
      const allTrips = await API.getTrips();
      const upcoming = allTrips.filter(t => t.status === 'booked').slice(0, 3);

      if (!upcoming.length) {
        container.innerHTML = \`<div class="empty-state">
          <div class="empty-icon">🗓</div>
          <p>No upcoming trips. <a href="#" data-page="find-ride" class="link">Find a ride?</a></p>
        </div>\`;
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
        return \`
        <div class="trip-card" onclick="Trip.openTripDetail('\${t._id}')">
          <div class="user-avatar">\${driver?.avatar || '?'}</div>
          <div class="trip-card-route">
            <div class="trip-route-line">
              <div class="route-dot start sm"></div>
              <span>\${ride.pickup.split(',')[0]}</span>
              <span class="trip-route-arrow">→</span>
              <div class="route-dot end sm"></div>
              <span>\${ride.destination.split(',')[0]}</span>
            </div>
            <div class="trip-meta">
              <span class="trip-meta-item">📅 \${sdate}</span>
              <span class="trip-meta-item">🕐 \${ride.time}</span>
              <span class="trip-meta-item">with \${driver?.firstName || 'Driver'}</span>
            </div>
          </div>
          <div class="trip-card-right">
            <span class="status-badge booked">✓ Booked</span>
            <div class="trip-fare">₹\${t.totalFare}</div>
          </div>
        </div>\`;
      }).join('');
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p>Error loading trips.</p>';
    }
  }

  `;

appJs = appJs.slice(0, startIndex) + replacement + appJs.slice(endIndex);

fs.writeFileSync('js/app.js', appJs, 'utf8');
console.log("Successfully fixed app.js");
