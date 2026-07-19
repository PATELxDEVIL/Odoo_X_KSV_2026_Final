const express  = require('express');
const User     = require('../models/User');
const Vehicle  = require('../models/Vehicle');
const Ride     = require('../models/Ride');
const Trip     = require('../models/Trip');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

// GET /api/admin/stats — org-level KPIs
router.get('/stats', async (req, res) => {
  try {
    const orgUsers = await User.find({ orgId: req.user.orgId }).select('_id');
    const userIds = orgUsers.map(u => u._id);

    const [totalUsers, totalRides, completedRides] = await Promise.all([
      User.countDocuments({ orgId: req.user.orgId }),
      Ride.countDocuments({ orgId: req.user.orgId }),
      Ride.countDocuments({ orgId: req.user.orgId, status: 'completed' }),
    ]);

    const totalTrips = await Trip.countDocuments({ passengerId: { $in: userIds } });

    // Revenue = sum of all completed trip fares
    const revenueAgg = await Trip.aggregate([
      { $match: { passengerId: { $in: userIds }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalFare' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    res.json({ totalUsers, totalRides, completedRides, totalTrips, totalRevenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Employees ─────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const users = await User.find({ orgId: req.user.orgId }).select('-password');
  res.json(users);
});

// POST /api/admin/users — add employee
router.post('/users', async (req, res) => {
  const { firstName, lastName, email, password, phone, role } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ message: 'firstName, lastName, email, password required' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create({
    firstName, lastName,
    email: email.toLowerCase(),
    password, phone: phone || '',
    orgId: req.user.orgId,
    role: role || 'user',
    walletBalance: 0, rating: 5.0, totalTrips: 0,
    avatar: firstName.charAt(0).toUpperCase(),
  });
  res.status(201).json({ ...user.toObject(), password: undefined });
});

// PATCH /api/admin/users/:id — promote, demote, update
router.patch('/users/:id', async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, orgId: req.user.orgId },
    { $set: req.body },
    { new: true }
  ).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found in your org' });
  res.json(user);
});

// DELETE /api/admin/users/:id — remove employee
router.delete('/users/:id', async (req, res) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, orgId: req.user.orgId });
  if (!user) return res.status(404).json({ message: 'User not found in your org' });
  res.json({ message: 'Employee removed' });
});

// ── Vehicles ──────────────────────────────────────────────

// GET /api/admin/vehicles — all org vehicles
router.get('/vehicles', async (req, res) => {
  const orgUsers = await User.find({ orgId: req.user.orgId }).select('_id');
  const ids = orgUsers.map(u => u._id);
  const vehicles = await Vehicle.find({ ownerId: { $in: ids } })
    .populate('ownerId', 'firstName lastName email');
  res.json(vehicles);
});

// POST /api/admin/vehicles — add vehicle for any org user
router.post('/vehicles', async (req, res) => {
  const { ownerId, model, regNo, capacity, color, year } = req.body;
  if (!ownerId || !model || !regNo)
    return res.status(400).json({ message: 'ownerId, model, regNo required' });

  const vehicle = await Vehicle.create({
    ownerId, model, regNo: regNo.toUpperCase(), capacity, color, year, tripCount: 0,
  });
  res.status(201).json(vehicle);
});

// PATCH /api/admin/vehicles/:id
router.patch('/vehicles/:id', async (req, res) => {
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  res.json(vehicle);
});

// DELETE /api/admin/vehicles/:id
router.delete('/vehicles/:id', async (req, res) => {
  await Vehicle.findByIdAndDelete(req.params.id);
  res.json({ message: 'Vehicle deleted' });
});

// ── Rides ─────────────────────────────────────────────────

// GET /api/admin/rides — all org rides
router.get('/rides', async (req, res) => {
  const rides = await Ride.find({ orgId: req.user.orgId })
    .populate('driverId', 'firstName lastName avatar')
    .populate('vehicleId', 'model regNo')
    .sort({ date: -1 });
  res.json(rides);
});

module.exports = router;
