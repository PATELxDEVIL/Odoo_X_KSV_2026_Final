const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrganizationSchema = new Schema({
  _key:        { type: String, unique: true }, // e.g. 'org1' for seed compat
  name:        { type: String, required: true },
  domain:      { type: String },
  fuelCost:    { type: Number, default: 103 },
  mileage:     { type: Number, default: 15 },
  maxFarePerKm:{ type: Number, default: 10 },
}, { timestamps: true });

module.exports = mongoose.model('Organization', OrganizationSchema);
