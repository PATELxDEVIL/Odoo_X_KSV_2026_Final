const fs = require('fs');

let appJs = fs.readFileSync('js/app.js', 'utf8');

const startIndex = appJs.indexOf('async function loadDashboardRides(userId) {');
const endIndex = appJs.indexOf('// ── Module Initialization ──────────────────────────────', startIndex) !== -1 ? appJs.indexOf('// ── Module Initialization ──────────────────────────────', startIndex) : appJs.indexOf('return {', startIndex);

if (startIndex === -1) {
  console.log("Could not find start index.");
  process.exit(1);
}

const replacement = `async function loadDashboardRides(userId) {
    const container = document.getElementById('dashboard-rides-list');
    if (!container) return;
    
    try {
      const allRides = await API.getRides({ status: 'available' });
      const available = allRides.filter(r => r.driverId?._id !== userId).slice(0, 4);

      if (!available.length) {
        container.innerHTML = \`<div class="empty-state"><div class="empty-icon">🚗</div><p>No rides available today.</p></div>\`;
        return;
      }

      container.innerHTML = available.map(r => {
        const driver = r.driverId;
        return \`
        <div class="ride-card" style="cursor:pointer" onclick="FindRide.openBookingModal('\${r._id}')">
          <div class="ride-card-header">
            <div class="ride-card-driver">
              <div class="user-avatar sm">\${driver?.avatar || '?'}</div>
              <div>
                <div class="ride-driver-name">\${driver?.firstName || 'Driver'}</div>
                <div class="ride-driver-rating">⭐ \${driver?.rating || 4.5}</div>
              </div>
            </div>
            <div class="ride-card-fare">₹\${r.fare}<span>/seat</span></div>
          </div>
          <div class="ride-card-route">
            <div class="ride-route-point"><div class="route-dot start"></div><strong>\${r.pickup.split(',')[0]}</strong></div>
            <div class="ride-route-point"><div class="route-dot end"></div><strong>\${r.destination.split(',')[0]}</strong></div>
          </div>
          <div class="ride-card-footer">
            <div class="ride-card-meta">
              <span class="ride-meta-item">🕐 \${r.time}</span>
              <span class="ride-meta-item">👥 \${r.seatsAvailable} seats</span>
            </div>
            <button class="btn btn-primary btn-sm">Book</button>
          </div>
        </div>\`;
      }).join('');
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p>Error loading rides.</p>';
    }
  }

  `;

appJs = appJs.slice(0, startIndex) + replacement + (endIndex !== -1 ? appJs.slice(endIndex) : '}');

fs.writeFileSync('js/app.js', appJs, 'utf8');
console.log("Successfully fixed app.js loadDashboardRides");
