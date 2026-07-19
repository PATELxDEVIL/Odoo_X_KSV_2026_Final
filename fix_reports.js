const fs = require('fs');

let reportsJs = fs.readFileSync('js/reports.js', 'utf8');

// We need to replace DB.ride(t.rideId) with t.rideId, and DB.vehicle(vid) with the vehicle info.
// The vehicles can be populated on the rides. Wait, t.rideId.vehicleId might already be populated!
// Let's replace 'DB.ride(t.rideId)' with 't.rideId'
reportsJs = reportsJs.replace(/DB\.ride\(t\.rideId\)/g, 't.rideId');

// Replace DB.vehicle(vid) with looking up from the filtered list, or just using 't.rideId.vehicleId?.model'
// Let's just fix the vehicle loop entirely.

const vehicleLoopRegex = /const vehicleLabels = Object\.keys\(vehicleMap\)\.map\(vid => \{[\s\S]*?\}\);/m;
const newVehicleLoop = `const vehicleLabels = Object.keys(vehicleMap).map(vid => {
      // Find a trip that used this vehicle ID to extract its model
      const trip = filtered.find(t => {
        const v = t.rideId?.vehicleId;
        return v && (v._id === vid || v === vid);
      });
      return trip?.rideId?.vehicleId?.model || 'Unknown';
    });`;

reportsJs = reportsJs.replace(vehicleLoopRegex, newVehicleLoop);

fs.writeFileSync('js/reports.js', reportsJs, 'utf8');
console.log("Successfully fixed reports.js vehicle loop");
