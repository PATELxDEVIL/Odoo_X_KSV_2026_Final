const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Ride = require('../models/Ride');
const Trip = require('../models/Trip');

// GET /api/messages/:rideId - Get all messages for a specific ride
router.get('/:rideId', protect, async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isDriver = ride.driverId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    // Also allow any user who has a trip booked for this ride
    const hasTrip = await Trip.exists({ rideId, passengerId: req.user.id });
    const isPassenger = ride.passengers.some(p => p.toString() === req.user.id) || !!hasTrip;

    if (!isPassenger && !isDriver && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }

    const messages = await Message.find({ rideId }).sort({ createdAt: 1 }).populate('senderId', 'firstName lastName avatar');
    res.json(messages);
  } catch (err) {
    console.error('[GET /messages/:rideId]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/messages/:rideId - Send a new message
router.post('/:rideId', protect, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) return res.status(400).json({ message: 'Content is required' });

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isDriver = ride.driverId.toString() === req.user.id;
    const hasTrip = await Trip.exists({ rideId, passengerId: req.user.id });
    const isPassenger = ride.passengers.some(p => p.toString() === req.user.id) || !!hasTrip;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }

    const message = new Message({
      rideId,
      senderId: req.user.id,
      content: content.trim()
    });

    await message.save();
    
    const populated = await Message.findById(message._id).populate('senderId', 'firstName lastName avatar');
    res.status(201).json(populated);
  } catch (err) {
    console.error('[POST /messages/:rideId]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

