const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const userPayload = (u) => ({
  id:            u._id,
  firstName:     u.firstName,
  lastName:      u.lastName,
  email:         u.email,
  phone:         u.phone,
  orgId:         u.orgId,
  role:          u.role,
  walletBalance: u.walletBalance,
  rating:        u.rating,
  totalTrips:    u.totalTrips,
  avatar:        u.avatar,
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid email or password' });

  res.json({ token: signToken(user._id), user: userPayload(user) });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, phone, orgId } = req.body;
  if (!firstName || !lastName || !email || !password || !orgId)
    return res.status(400).json({ message: 'All fields are required' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create({
    firstName, lastName,
    email: email.toLowerCase(),
    password, phone: phone || '',
    orgId, role: 'user',
    walletBalance: 0, rating: 5.0, totalTrips: 0,
    avatar: firstName.charAt(0).toUpperCase(),
  });

  res.status(201).json({ token: signToken(user._id), user: userPayload(user) });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json(userPayload(req.user));
});

module.exports = router;
