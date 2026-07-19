require('dotenv').config();
const mongoose = require('mongoose');
const Trip = require('./models/Trip');
const Ride = require('./models/Ride');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/carpool');
  console.log('Connected to DB');

  const trips = await Trip.find({ driverId: { $exists: false } });
  console.log(`Found ${trips.length} trips missing driverId. Updating...`);

  let count = 0;
  for (const trip of trips) {
    const ride = await Ride.findById(trip.rideId);
    if (ride) {
      trip.driverId = ride.driverId;
      await trip.save();
      count++;
    }
  }

  console.log(`Updated ${count} trips.`);
  process.exit(0);
}

migrate().catch(console.error);
