const mongoose = require('mongoose');
const { Schema } = mongoose;

const TripSchema = new Schema({
  rideId:            { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
  passengerId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seats:             { type: Number, default: 1 },
  totalFare:         { type: Number, required: true },
  status:            { type: String, enum: ['booked','in-progress','completed','cancelled'], default: 'booked' },
  paymentStatus:     { type: String, enum: ['pending','paid','refunded'], default: 'pending' },
  paymentMethod:     { type: String, enum: ['cash','upi','card','wallet', null], default: null },
  razorpayPaymentId: { type: String, default: null },
  role:              { type: String, enum: ['passenger','driver'], default: 'passenger' },
  driverId:          { type: Schema.Types.ObjectId, ref: 'User' },
  bookedAt:          { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);
