const express = require('express');
const Ride    = require('../models/Ride');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Haversine distance formula (returns distance in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/rides — list with optional filters
router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.orgId)   filter.orgId   = req.query.orgId;
  if (req.query.driverId)filter.driverId = req.query.driverId;
  if (req.query.date)    filter.date     = req.query.date;

  let rides = await Ride.find(filter)
    .populate('driverId', 'firstName lastName avatar rating phone')
    .populate('vehicleId', 'model regNo color capacity')
    .sort({ date: 1, time: 1 });

  // Geospatial Optimization
  const radius = 10; // 10 km tolerance
  const { fromLat, fromLng, toLat, toLng } = req.query;

  if (fromLat && fromLng && toLat && toLng) {
    rides = rides.filter(r => {
      const pickupDist = calculateDistance(Number(fromLat), Number(fromLng), r.pickupLat, r.pickupLng);
      const destDist = calculateDistance(Number(toLat), Number(toLng), r.destLat, r.destLng);
      return pickupDist <= radius && destDist <= radius;
    });
  }

  res.json(rides);
});

// POST /api/rides — create a ride
router.post('/', protect, async (req, res) => {
  const ride = await Ride.create({
    ...req.body,
    driverId: req.user._id,
    orgId:    req.user.orgId,
  });
  res.status(201).json(ride);
});

// GET /api/rides/:id
router.get('/:id', protect, async (req, res) => {
  const ride = await Ride.findById(req.params.id)
    .populate('driverId', 'firstName lastName avatar rating phone')
    .populate('vehicleId', 'model regNo color capacity')
    .populate('passengers', 'firstName lastName avatar');
  if (!ride) return res.status(404).json({ message: 'Ride not found' });
  res.json(ride);
});

// PATCH /api/rides/:id
router.patch('/:id', protect, async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: 'Ride not found' });
  if (ride.driverId.toString() !== req.user._id.toString())
    return res.status(403).json({ message: 'Not your ride' });

  const oldStatus = ride.status;
  Object.assign(ride, req.body);
  await ride.save();

  if (req.body.status && req.body.status !== oldStatus) {
    const Trip = require('../models/Trip');
    if (req.body.status === 'active') {
      await Trip.updateMany({ rideId: ride._id, status: 'booked' }, { status: 'in-progress' });
    } else if (req.body.status === 'completed') {
      await Trip.updateMany({ rideId: ride._id }, { status: 'completed' });
    } else if (req.body.status === 'cancelled') {
      await Trip.updateMany({ rideId: ride._id, status: { $in: ['booked', 'in-progress'] } }, { status: 'cancelled' });
    }
  }

  res.json(ride);
});

// DELETE /api/rides/:id
router.delete('/:id', protect, async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ message: 'Ride not found' });
  if (ride.driverId.toString() !== req.user._id.toString())
    return res.status(403).json({ message: 'Not your ride' });

  if (ride.date && ride.time) {
    const dateStr = ride.date instanceof Date ? ride.date.toISOString().split('T')[0] : ride.date;
    const rideDate = new Date(`${dateStr}T${ride.time}:00`);
    const oneHourBefore = new Date(rideDate.getTime() - 60 * 60 * 1000);
    if (new Date() > oneHourBefore) {
      return res.status(400).json({ message: 'Cannot cancel a ride within 1 hour of its start time' });
    }
  }

  ride.status = 'cancelled';
  await ride.save();
  res.json({ message: 'Ride cancelled' });
});

module.exports = router;
