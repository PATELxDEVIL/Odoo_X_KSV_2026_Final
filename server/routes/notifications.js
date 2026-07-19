const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  const notes = await Notification.find({ userId: req.user._id }).sort({ date: -1 }).limit(50);
  res.json(notes);
});

// PATCH /api/notifications/:id — mark read
router.patch('/:id', protect, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all — mark all read
router.patch('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

module.exports = router;
