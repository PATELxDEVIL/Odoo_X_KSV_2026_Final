const express = require('express');
const Organization = require('../models/Organization');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/orgs — get all orgs
router.get('/', async (req, res) => {
  const orgs = await Organization.find().select('name _id domain');
  res.json(orgs);
});

// GET /api/orgs/first — first org (used in signup)
router.get('/first', async (req, res) => {
  const org = await Organization.findOne();
  if (!org) return res.status(404).json({ message: 'No organizations found' });
  res.json(org);
});

// GET /api/orgs/by-domain/:domain
router.get('/by-domain/:domain', async (req, res) => {
  const org = await Organization.findOne({ domain: req.params.domain });
  if (!org) return res.status(404).json({ message: 'Org not found for domain' });
  res.json(org);
});

// GET /api/orgs/:id
router.get('/:id', protect, async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json(org);
});

// PATCH /api/orgs/:id  (admin only)
router.patch('/:id', protect, adminOnly, async (req, res) => {
  const { name, domain, fuelCost, mileage, maxFarePerKm } = req.body;
  const org = await Organization.findByIdAndUpdate(
    req.params.id,
    { name, domain, fuelCost, mileage, maxFarePerKm },
    { new: true }
  );
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json(org);
});

module.exports = router;
