const express = require('express');
const Trip    = require('../models/Trip');
const Ride    = require('../models/Ride');
const User    = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/trips — my trips (as passenger or driver)
router.get('/', protect, async (req, res) => {
  const filter = {};
  if (req.query.role === 'driver') {
    filter.driverId = req.user._id;
  } else if (req.query.role === 'all') {
    filter.$or = [{ driverId: req.user._id }, { passengerId: req.user._id }];
  } else {
    filter.passengerId = req.user._id;
  }
  if (req.query.status) filter.status = req.query.status;

  const trips = await Trip.find(filter)
    .populate({ path: 'rideId', populate: { path: 'driverId', select: 'firstName lastName avatar rating phone' } })
    .populate('passengerId', 'firstName lastName avatar phone')
    .sort({ bookedAt: -1 });
  res.json(trips);
});

// POST /api/trips — book a ride
router.post('/', protect, async (req, res) => {
  const { rideId, seats = 1 } = req.body;

  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: 'Ride not found' });
  if (ride.status !== 'available') return res.status(400).json({ message: 'Ride not available' });
  if (ride.seatsAvailable < seats) return res.status(400).json({ message: 'Not enough seats' });
  if (ride.driverId.toString() === req.user._id.toString())
    return res.status(400).json({ message: 'Cannot book your own ride' });

  const totalFare = ride.fare * seats;
  const trip = await Trip.create({
    rideId, passengerId: req.user._id, seats, totalFare,
    status: 'booked', paymentStatus: 'pending',
    bookedAt: new Date(),
    driverId: ride.driverId
  });

  // Update ride: reduce seats, add passenger
  ride.seatsAvailable -= seats;
  ride.passengers.push(req.user._id);
  if (ride.seatsAvailable === 0) ride.status = 'active';
  await ride.save();

  res.status(201).json(trip);
});

// GET /api/trips/:id
router.get('/:id', protect, async (req, res) => {
  const trip = await Trip.findById(req.params.id)
    .populate({ path: 'rideId', populate: [
      { path: 'driverId', select: 'firstName lastName avatar rating phone' },
      { path: 'vehicleId', select: 'model regNo color capacity' },
      { path: 'passengers', select: 'firstName lastName avatar' },
    ]})
    .populate('passengerId', 'firstName lastName avatar phone');
  if (!trip) return res.status(404).json({ message: 'Trip not found' });
  res.json(trip);
});

// PATCH /api/trips/:id — update status or payment
router.patch('/:id', protect, async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: 'Trip not found' });

  const allowed = ['status', 'paymentStatus', 'paymentMethod', 'razorpayPaymentId'];
  allowed.forEach(k => { if (req.body[k] !== undefined) trip[k] = req.body[k]; });

  // On payment: deduct from passenger wallet if wallet method, credit driver
  if (req.body.paymentStatus === 'paid' && req.body.paymentMethod) {
    const ride = await Ride.findById(trip.rideId);
    if (ride) {
      // Credit driver
      await User.findByIdAndUpdate(ride.driverId, { $inc: { walletBalance: trip.totalFare } });
      await WalletTransaction.create({
        userId: ride.driverId, type: 'credit',
        amount: trip.totalFare, desc: `Ride earnings (${req.body.paymentMethod})`,
      });
      // Deduct from passenger if wallet
      if (req.body.paymentMethod === 'wallet') {
        const passenger = await User.findById(trip.passengerId);
        if (passenger.walletBalance < trip.totalFare)
          return res.status(400).json({ message: 'Insufficient wallet balance' });
        await User.findByIdAndUpdate(trip.passengerId, { $inc: { walletBalance: -trip.totalFare } });
      }
      await WalletTransaction.create({
        userId: trip.passengerId, type: 'debit',
        amount: trip.totalFare, desc: `Trip payment via ${req.body.paymentMethod}`,
        method: req.body.paymentMethod,
      });
    }
  }

  await trip.save();
  res.json(trip);
});

// DELETE /api/trips/:id — cancel
router.delete('/:id', protect, async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate('rideId');
  if (!trip) return res.status(404).json({ message: 'Trip not found' });
  if (trip.passengerId.toString() !== req.user._id.toString())
    return res.status(403).json({ message: 'Not your trip' });

  const ride = trip.rideId;
  if (ride && ride.date && ride.time) {
    // Combine ride.date and ride.time into a single JS Date object
    const dateStr = ride.date instanceof Date ? ride.date.toISOString().split('T')[0] : ride.date;
    const rideDate = new Date(`${dateStr}T${ride.time}:00`);
    const oneHourBefore = new Date(rideDate.getTime() - 60 * 60 * 1000);
    if (new Date() > oneHourBefore) {
      return res.status(400).json({ message: 'Cannot cancel a trip within 1 hour of the ride start time' });
    }
  }

  trip.status = 'cancelled';
  await trip.save();

  // Restore seats on ride
  if (ride) {
    ride.seatsAvailable += trip.seats;
    ride.passengers = ride.passengers.filter(p => p.toString() !== req.user._id.toString());
    if (ride.status === 'active' && ride.seatsAvailable > 0) ride.status = 'available';
    await ride.save();
  }

  res.json({ message: 'Trip cancelled' });
});

module.exports = router;
