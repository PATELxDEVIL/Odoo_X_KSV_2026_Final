require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Ride = require('./models/Ride');
const Trip = require('./models/Trip');
const Organization = require('./models/Organization');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/carpool');
  console.log('Connected to DB');

  const org = await Organization.findOne();
  if (!org) {
    console.log('No organization found. Please create one first.');
    process.exit(1);
  }

  const today = new Date();
  // Set date to tomorrow to make them upcoming rides
  today.setDate(today.getDate() + 1);
  const dateStr = today.toISOString().split('T')[0];
  const timeStr = '09:00';

  console.log('Generating Naroda to Gandhinagar data...');
  for (let i = 1; i <= 75; i++) {
    // Host
    const host = await User.create({
      firstName: `HostA_${i}`,
      lastName: `Naroda`,
      email: `hosta_${i}@example.com`,
      password: `hostA_pass_${i}`, 
      orgId: org._id
    });

    // Passenger
    const passenger = await User.create({
      firstName: `PassA_${i}`,
      lastName: `Naroda`,
      email: `passa_${i}@example.com`,
      password: `passA_pass_${i}`,
      orgId: org._id
    });

    // Ride
    const ride = await Ride.create({
      driverId: host._id,
      pickup: 'Naroda, Ahmedabad',
      destination: 'Gandhinagar, Gujarat',
      date: dateStr,
      time: timeStr,
      seatsAvailable: 2,
      fare: 50,
      orgId: org._id,
      passengers: [passenger._id],
      status: 'available'
    });

    // Trip
    await Trip.create({
      rideId: ride._id,
      passengerId: passenger._id,
      seats: 1,
      totalFare: 50,
      status: 'booked',
      paymentStatus: 'paid',
      driverId: host._id
    });
  }

  console.log('Generating Gandhinagar to Sardar Patel Underpass data...');
  for (let i = 1; i <= 75; i++) {
    // Host
    const host = await User.create({
      firstName: `HostB_${i}`,
      lastName: `Gandhi`,
      email: `hostb_${i}@example.com`,
      password: `hostB_pass_${i}`,
      orgId: org._id
    });

    // Passenger
    const passenger = await User.create({
      firstName: `PassB_${i}`,
      lastName: `Gandhi`,
      email: `passb_${i}@example.com`,
      password: `passB_pass_${i}`,
      orgId: org._id
    });

    // Ride
    const ride = await Ride.create({
      driverId: host._id,
      pickup: 'Gandhinagar, Gujarat',
      destination: 'Sardar Patel Underpass, Ahmedabad',
      date: dateStr,
      time: timeStr,
      seatsAvailable: 2,
      fare: 50,
      orgId: org._id,
      passengers: [passenger._id],
      status: 'available'
    });

    // Trip
    await Trip.create({
      rideId: ride._id,
      passengerId: passenger._id,
      seats: 1,
      totalFare: 50,
      status: 'booked',
      paymentStatus: 'paid',
      driverId: host._id
    });
  }

  console.log('Seeding complete! Added 150 Hosts, 150 Passengers, 150 Rides, 150 Trips.');
  process.exit(0);
}

seed().catch(console.error);
