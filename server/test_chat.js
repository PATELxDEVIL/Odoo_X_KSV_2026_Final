const mongoose = require('mongoose');
const Ride = require('./models/Ride');
const Trip = require('./models/Trip');
const Message = require('./models/Message');
const User = require('./models/User');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const rides = await Ride.find({});
  if (!rides.length) {
    console.log("No rides found.");
    process.exit(0);
  }
  
  const ride = rides[0];
  console.log("Testing with Ride:", ride._id);
  
  const driver = await User.findById(ride.driverId);
  console.log("Driver:", driver.email);
  
  const trips = await Trip.find({ rideId: ride._id });
  console.log("Trips for ride:", trips.length);
  
  if (trips.length > 0) {
    const trip = trips[0];
    const passenger = await User.findById(trip.passengerId);
    console.log("Passenger:", passenger.email);
    
    // Check if passenger exists in ride.passengers
    const inRideArray = ride.passengers.some(p => p.toString() === passenger._id.toString());
    console.log("Passenger in ride.passengers array?", inRideArray);
    
    // Simulate auth logic
    const hasTrip = await Trip.exists({ rideId: ride._id, passengerId: passenger._id });
    console.log("hasTrip logic result:", !!hasTrip);
    
    const isPassenger = inRideArray || !!hasTrip;
    console.log("isPassenger authorized?", isPassenger);
  } else {
    console.log("No trips booked for this ride yet.");
  }
  
  process.exit(0);
}

test().catch(console.error);
