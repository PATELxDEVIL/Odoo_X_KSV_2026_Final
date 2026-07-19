const mongoose = require('mongoose');
const { Schema } = mongoose;

const RideSchema = new Schema({
  driverId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId:      { type: Schema.Types.ObjectId, ref: 'Vehicle' },
  pickup:         { type: String, required: true },
  pickupLat:      { type: Number },
  pickupLng:      { type: Number },
  destination:    { type: String, required: true },
  destLat:        { type: Number },
  destLng:        { type: Number },
  waypoints:      [{
    location: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  }],
  date:           { type: String, required: true }, // YYYY-MM-DD
  time:           { type: String, required: true }, // HH:MM
  seatsAvailable: { type: Number, required: true, min: 0 },
  fare:           { type: Number, required: true },
  distance:       { type: Number, default: 0 },
  duration:       { type: Number, default: 0 }, // minutes
  status:         { type: String, enum: ['available','active','completed','cancelled'], default: 'available' },
  recurring:      { type: Boolean, default: false },
  days:           [{ type: String }],
  passengers:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
  orgId:          { type: Schema.Types.ObjectId, ref: 'Organization' },
  routePolyline:  { type: String, default: null }, // Encoded polyline from Mappls route
}, { timestamps: true });

module.exports = mongoose.model('Ride', RideSchema);
