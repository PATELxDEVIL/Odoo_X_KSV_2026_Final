/**
 * SEED SCRIPT — Populates MongoDB with demo data
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const Organization   = require('./models/Organization');
const User           = require('./models/User');
const Vehicle        = require('./models/Vehicle');
const Ride           = require('./models/Ride');
const Trip           = require('./models/Trip');
const WalletTransaction = require('./models/WalletTransaction');
const Notification   = require('./models/Notification');

const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const subDays = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const fmtDate = (d) => d.toISOString().split('T')[0];
const fmtTime = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    Vehicle.deleteMany({}),
    Ride.deleteMany({}),
    Trip.deleteMany({}),
    WalletTransaction.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('🗑  Cleared existing data');

  // ── Organizations ─────────────────────────────────────
  const [org1, org2] = await Organization.insertMany([
    { _key: 'org1', name: 'Infosys Pune', domain: 'infosys.com', fuelCost: 103, mileage: 15, maxFarePerKm: 10 },
    { _key: 'org2', name: 'TCS Mumbai',   domain: 'tcs.com',     fuelCost: 103, mileage: 14, maxFarePerKm: 10 },
  ]);
  console.log('✅ Organizations seeded');

  // ── Users (passwords auto-hashed by pre-save hook) ────
  const hash = async (p) => bcrypt.hash(p, 10);

  const [admin, priya, rahul, ananya, vikram, kavya] = await User.insertMany([
    { firstName: 'Admin',  lastName: 'User',   email: 'admin@carpool.com',  password: await hash('admin123'), phone: '9876543210', orgId: org1._id, role: 'admin', walletBalance: 1500, rating: 4.9, totalTrips: 47, avatar: 'A' },
    { firstName: 'Priya',  lastName: 'Sharma', email: 'priya@infosys.com',  password: await hash('pass123'),  phone: '9876543211', orgId: org1._id, role: 'user',  walletBalance: 450,  rating: 4.7, totalTrips: 23, avatar: 'P' },
    { firstName: 'Rahul',  lastName: 'Verma',  email: 'rahul@infosys.com',  password: await hash('pass123'),  phone: '9876543212', orgId: org1._id, role: 'user',  walletBalance: 820,  rating: 4.5, totalTrips: 31, avatar: 'R' },
    { firstName: 'Ananya', lastName: 'Singh',  email: 'ananya@tcs.com',     password: await hash('pass123'),  phone: '9876543213', orgId: org2._id, role: 'user',  walletBalance: 200,  rating: 4.8, totalTrips: 18, avatar: 'A' },
    { firstName: 'Vikram', lastName: 'Mehta',  email: 'vikram@infosys.com', password: await hash('pass123'),  phone: '9876543214', orgId: org1._id, role: 'user',  walletBalance: 0,    rating: 4.6, totalTrips: 12, avatar: 'V' },
    { firstName: 'Kavya',  lastName: 'Nair',   email: 'kavya@tcs.com',      password: await hash('pass123'),  phone: '9876543215', orgId: org2._id, role: 'user',  walletBalance: 350,  rating: 4.4, totalTrips: 9,  avatar: 'K' },
  ]);
  console.log('✅ Users seeded');

  // ── Vehicles ──────────────────────────────────────────
  const [v1, v2, v3] = await Vehicle.insertMany([
    { ownerId: priya._id, model: 'Maruti Swift',  regNo: 'MH12AB1234', capacity: 4, color: 'White',  year: 2021, tripCount: 18 },
    { ownerId: rahul._id, model: 'Honda City',    regNo: 'MH12CD5678', capacity: 4, color: 'Silver', year: 2022, tripCount: 24 },
    { ownerId: admin._id, model: 'Hyundai Creta', regNo: 'MH12EF9012', capacity: 5, color: 'Blue',   year: 2023, tripCount: 31 },
  ]);
  console.log('✅ Vehicles seeded');

  // ── Rides ─────────────────────────────────────────────
  const [r1, r2, r3, r4, r5, r6, r7, r8] = await Ride.insertMany([
    { driverId: priya._id, vehicleId: v1._id, orgId: org1._id,
      pickup: 'Hinjewadi Phase 1, Pune', pickupLat: 18.5904, pickupLng: 73.7381,
      destination: 'Infosys BPO, Pune', destLat: 18.5679, destLng: 73.9143,
      date: fmtDate(addDays(1)), time: fmtTime(9,0),  seatsAvailable: 2, fare: 60, distance: 18.5, duration: 45, status: 'available', passengers: [vikram._id] },
    { driverId: rahul._id, vehicleId: v2._id, orgId: org1._id,
      pickup: 'Kothrud, Pune', pickupLat: 18.5074, pickupLng: 73.8077,
      destination: 'Magarpatta City, Pune', destLat: 18.5089, destLng: 73.9260,
      date: fmtDate(addDays(1)), time: fmtTime(8,30), seatsAvailable: 3, fare: 50, distance: 12.3, duration: 35, status: 'available', recurring: true, days: ['Mon','Tue','Wed','Thu','Fri'], passengers: [] },
    { driverId: admin._id, vehicleId: v3._id, orgId: org1._id,
      pickup: 'Wakad, Pune', pickupLat: 18.5994, pickupLng: 73.7628,
      destination: 'Hinjewadi Phase 3, Pune', destLat: 18.5975, destLng: 73.7155,
      date: fmtDate(addDays(1)), time: fmtTime(9,30), seatsAvailable: 4, fare: 40, distance: 8.2, duration: 25, status: 'available', passengers: [priya._id] },
    { driverId: priya._id, vehicleId: v1._id, orgId: org1._id,
      pickup: 'Aundh, Pune', pickupLat: 18.5590, pickupLng: 73.8079,
      destination: 'Viman Nagar, Pune', destLat: 18.5679, destLng: 73.9143,
      date: fmtDate(addDays(2)), time: fmtTime(8,0),  seatsAvailable: 2, fare: 70, distance: 16.0, duration: 40, status: 'available', passengers: [] },
    { driverId: rahul._id, vehicleId: v2._id, orgId: org1._id,
      pickup: 'Baner, Pune', pickupLat: 18.5590, pickupLng: 73.7771,
      destination: 'Hadapsar, Pune', destLat: 18.5022, destLng: 73.9298,
      date: fmtDate(new Date()), time: fmtTime(9,15), seatsAvailable: 0, fare: 55, distance: 20.1, duration: 50, status: 'active', passengers: [admin._id, vikram._id] },
    { driverId: admin._id, vehicleId: v3._id, orgId: org1._id,
      pickup: 'Kalyani Nagar, Pune', pickupLat: 18.5471, pickupLng: 73.9026,
      destination: 'Pimpri, Pune', destLat: 18.6298, destLng: 73.7996,
      date: fmtDate(subDays(2)), time: fmtTime(9,0),  seatsAvailable: 0, fare: 80, distance: 22.4, duration: 55, status: 'completed', passengers: [priya._id, rahul._id] },
    { driverId: priya._id, vehicleId: v1._id, orgId: org1._id,
      pickup: 'Shivajinagar, Pune', pickupLat: 18.5308, pickupLng: 73.8475,
      destination: 'Kharadi, Pune', destLat: 18.5524, destLng: 73.9456,
      date: fmtDate(subDays(5)), time: fmtTime(9,30), seatsAvailable: 0, fare: 45, distance: 10.8, duration: 30, status: 'completed', passengers: [vikram._id] },
    { driverId: rahul._id, vehicleId: v2._id, orgId: org1._id,
      pickup: 'FC Road, Pune', pickupLat: 18.5236, pickupLng: 73.8438,
      destination: 'Hinjewadi, Pune', destLat: 18.5904, destLng: 73.7381,
      date: fmtDate(addDays(3)), time: fmtTime(8,45), seatsAvailable: 3, fare: 65, distance: 19.2, duration: 48, status: 'available', recurring: true, days: ['Mon','Wed','Fri'], passengers: [] },
  ]);
  console.log('✅ Rides seeded');

  // ── Trips ─────────────────────────────────────────────
  await Trip.insertMany([
    { rideId: r1._id, passengerId: vikram._id, seats: 1, totalFare: 60,  status: 'booked',       paymentStatus: 'pending', bookedAt: subDays(1) },
    { rideId: r3._id, passengerId: priya._id,  seats: 1, totalFare: 40,  status: 'booked',       paymentStatus: 'pending', bookedAt: subDays(1) },
    { rideId: r5._id, passengerId: admin._id,  seats: 1, totalFare: 55,  status: 'in-progress',  paymentStatus: 'pending', bookedAt: subDays(0) },
    { rideId: r5._id, passengerId: vikram._id, seats: 1, totalFare: 55,  status: 'in-progress',  paymentStatus: 'pending', bookedAt: subDays(0) },
    { rideId: r6._id, passengerId: priya._id,  seats: 1, totalFare: 80,  status: 'completed',    paymentStatus: 'paid', paymentMethod: 'cash',   bookedAt: subDays(3) },
    { rideId: r6._id, passengerId: rahul._id,  seats: 1, totalFare: 80,  status: 'completed',    paymentStatus: 'paid', paymentMethod: 'upi',    bookedAt: subDays(3) },
    { rideId: r7._id, passengerId: vikram._id, seats: 1, totalFare: 45,  status: 'completed',    paymentStatus: 'paid', paymentMethod: 'wallet', bookedAt: subDays(6) },
  ]);
  console.log('✅ Trips seeded');

  // ── Wallet Transactions ───────────────────────────────
  await WalletTransaction.insertMany([
    { userId: admin._id, type: 'credit', amount: 500,  desc: 'Wallet Recharge',       method: 'upi',    date: subDays(10) },
    { userId: admin._id, type: 'credit', amount: 1000, desc: 'Wallet Recharge',       method: 'card',   date: subDays(5)  },
    { userId: admin._id, type: 'debit',  amount: 55,   desc: 'Trip: Baner → Hadapsar', method: 'wallet', date: subDays(0) },
    { userId: priya._id, type: 'credit', amount: 200,  desc: 'Wallet Recharge',       method: 'upi',    date: subDays(8)  },
    { userId: priya._id, type: 'debit',  amount: 80,   desc: 'Trip: Kalyani → Pimpri',method: 'wallet', date: subDays(2)  },
    { userId: priya._id, type: 'credit', amount: 330,  desc: 'Ride Earnings',         method: null,     date: subDays(2)  },
    { userId: rahul._id, type: 'credit', amount: 500,  desc: 'Wallet Recharge',       method: 'card',   date: subDays(3)  },
    { userId: rahul._id, type: 'debit',  amount: 80,   desc: 'Trip: Kalyani → Pimpri',method: 'upi',    date: subDays(2)  },
    { userId: rahul._id, type: 'credit', amount: 400,  desc: 'Ride Earnings',         method: null,     date: subDays(0)  },
  ]);
  console.log('✅ Wallet transactions seeded');

  // ── Notifications ─────────────────────────────────────
  await Notification.insertMany([
    { userId: admin._id, type: 'ride', icon: '🚗', title: 'Ride Booked',   msg: 'Your ride to Hadapsar is in progress.',       read: false, date: subDays(0) },
    { userId: admin._id, type: 'pay',  icon: '💰', title: 'Payment Due',   msg: 'Please pay ₹55 for your ongoing ride.',        read: false, date: subDays(0) },
    { userId: priya._id, type: 'ride', icon: '👤', title: 'New Passenger', msg: 'Admin User joined your ride.',                 read: true,  date: subDays(1) },
  ]);
  console.log('✅ Notifications seeded');

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('   admin@carpool.com  / admin123');
  console.log('   priya@infosys.com  / pass123');
  console.log('   rahul@infosys.com  / pass123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
