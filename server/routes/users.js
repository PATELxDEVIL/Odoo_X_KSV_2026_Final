const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').populate('orgId', 'name domain');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// PATCH /api/users/:id
router.patch('/:id', protect, async (req, res) => {
  if (req.user._id.toString() !== req.params.id)
    return res.status(403).json({ message: 'Not allowed to update another user' });

  const { firstName, lastName, phone, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { firstName, lastName, phone, avatar },
    { new: true, runValidators: true }
  ).select('-password');
  res.json(user);
});

module.exports = router;
