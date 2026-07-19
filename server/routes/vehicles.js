const express = require('express');
const Vehicle = require('../models/Vehicle');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/vehicles — my vehicles (or by ownerId)
router.get('/', protect, async (req, res) => {
  const ownerId = req.query.ownerId || req.user._id;
  const vehicles = await Vehicle.find({ ownerId }).populate('ownerId', 'firstName lastName');
  res.json(vehicles);
});

// POST /api/vehicles
router.post('/', protect, async (req, res) => {
  const { model, regNo, capacity, color, year, ownerId } = req.body;
  const vehicle = await Vehicle.create({
    ownerId: ownerId || req.user._id,
    model, regNo: regNo.toUpperCase(), capacity, color, year,
  });
  res.status(201).json(vehicle);
});

// PATCH /api/vehicles/:id
router.patch('/:id', protect, async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  if (vehicle.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Not authorized' });

  Object.assign(vehicle, req.body);
  await vehicle.save();
  res.json(vehicle);
});

// DELETE /api/vehicles/:id
router.delete('/:id', protect, async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
  if (vehicle.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Not authorized' });

  await vehicle.deleteOne();
  res.json({ message: 'Vehicle deleted' });
});

module.exports = router;
