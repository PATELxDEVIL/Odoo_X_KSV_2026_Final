/* ═══════════════════════════════════════════════════════
   CARPOOL ENTERPRISE — REPORTS & ANALYTICS
   Chart.js-powered reports with period filter
═══════════════════════════════════════════════════════ */

const Reports = (() => {
  let _charts = {};

  function init(userId) {
    const periodSel = document.getElementById('reports-period');
    periodSel?.addEventListener('change', () => render(userId, parseInt(periodSel.value)));
    render(userId, 30);
  }

  async function render(userId, days) {
    let trips = [];
    try {
      // Fetch passenger trips
      const pTrips = await API.getTrips({ role: 'all' });
      // Fetch driver rides
      const dRides = await API.getRides({ driverId: userId });
      
      const dTrips = dRides.map(r => ({
        _id: 'dr_' + r._id, rideId: r, passengerId: userId,
        seats: 0, totalFare: r.fare * (r.passengers || []).length,
        status: r.status === 'available' ? 'offered' : r.status,
        paymentStatus: r.status === 'completed' ? 'received' : 'pending',
        role: 'driver',
      }));
      
      const allTrips = [...pTrips, ...dTrips];

      // Filter out cancelled trips so they contribute to stats
      trips = allTrips.filter(t => t.status !== 'cancelled');
    } catch (e) {
      console.error(e);
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = trips.filter(t => {
      const ride = t.rideId;
      return ride && new Date(ride.date) >= cutoff;
    });

    // Compute stats
    let totalKm = 0, totalSaved = 0, totalFuel = 0, totalFare = 0;
    const vehicleMap = {};

    filtered.forEach(t => {
      const ride = t.rideId;
      if (!ride) return;
      const d = ride.distance || 0;
      totalKm += d;
      totalFare += t.totalFare || 0;

      const fuelPerKm = 1 / 15;
      totalFuel += d * fuelPerKm;

      const mySoloCost = d * 7;
      totalSaved += Math.max(0, mySoloCost - (t.totalFare || 0));

      const vid = ride.vehicleId?._id || ride.vehicleId || 'unknown';
      vehicleMap[vid] = (vehicleMap[vid] || 0) + 1;
    });

    const co2 = totalFuel * 2.3;
    const costPerKm = totalKm > 0 ? (totalFare / totalKm) : 0;

    // Update stat cards
    document.getElementById('report-total-trips').textContent = filtered.length;
    document.getElementById('report-total-km').textContent    = totalKm.toFixed(0) + ' km';
    document.getElementById('report-fuel').textContent        = totalFuel.toFixed(1) + ' L';
    document.getElementById('report-cost-km').textContent     = `₹${costPerKm.toFixed(1)}/km`;
    document.getElementById('report-saved').textContent       = `₹${Math.round(totalSaved)}`;
    document.getElementById('report-co2').textContent         = co2.toFixed(1) + ' kg';

    // Build time series
    const labels = [];
    const tripsData = [];
    const costData  = [];
    const fuelData  = [];

    const intervals = days <= 7 ? 7 : days <= 30 ? 30 : days <= 90 ? 12 : 12;
    const step = days <= 7 ? 1 : days <= 30 ? 1 : days <= 90 ? 7 : 30;
    const numPoints = Math.min(intervals, 12);

    for (let i = numPoints - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * step);
      labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

      const dTrips = filtered.filter(t => {
        const ride = t.rideId;
        if (!ride) return false;
        const rd = new Date(ride.date);
        const diff = Math.abs(rd - d) / (1000 * 60 * 60 * 24);
        return diff < step;
      });
      tripsData.push(dTrips.length);
      costData.push(dTrips.reduce((s, t) => s + (t.totalFare || 0), 0));
      fuelData.push(dTrips.reduce((s, t) => { const r = t.rideId; return s + ((r?.distance || 0) / 15); }, 0));
    }

    // Chart.js config shared
    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#94A3B8', font: { family: 'Inter' } } },
        tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8' }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }, grid: { color: '#1e293b' } }
      }
    };

    buildChart('trips-chart', 'line', labels, [{
      label: 'Trips', data: tripsData,
      borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)',
      fill: true, tension: 0.4, pointBackgroundColor: '#3B82F6',
    }], chartDefaults);

    buildChart('cost-chart', 'bar', labels, [{
      label: 'Cost (₹)', data: costData,
      backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10B981', borderRadius: 6,
    }], chartDefaults);

    buildChart('fuel-chart', 'line', labels, [{
      label: 'Fuel (L)', data: fuelData,
      borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)',
      fill: true, tension: 0.4, pointBackgroundColor: '#F59E0B',
    }], chartDefaults);

    // Vehicle doughnut
    const vehicleLabels = Object.keys(vehicleMap).map(vid => {
      // Find a trip that used this vehicle ID to extract its model
      const trip = filtered.find(t => {
        const v = t.rideId?.vehicleId;
        return v && (v._id === vid || v === vid);
      });
      return trip?.rideId?.vehicleId?.model || 'Unknown';
    });
    const vehicleData = Object.values(vehicleMap);

    buildChart('vehicle-chart', 'doughnut', vehicleLabels.length ? vehicleLabels : ['No trips'], [{
      data: vehicleData.length ? vehicleData : [1],
      backgroundColor: ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444'],
      borderColor: '#0D1421', borderWidth: 2,
    }], {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94A3B8', font: { family: 'Inter' }, padding: 16 } },
        tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8' }
      }
    });
  }

  function buildChart(canvasId, type, labels, datasets, options) {
    if (_charts[canvasId]) { _charts[canvasId].destroy(); }
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    _charts[canvasId] = new Chart(canvas, { type, data: { labels, datasets }, options });
  }

  return { init };
})();
