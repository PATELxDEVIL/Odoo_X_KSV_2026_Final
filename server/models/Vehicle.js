const mongoose = require('mongoose');
const { Schema } = mongoose;

const VehicleSchema = new Schema({
  ownerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  model:     { type: String, required: true },
  regNo:     { type: String, required: true, uppercase: true },
  capacity:  { type: Number, default: 4 },
  color:     { type: String, default: '' },
  year:      { type: Number },
  tripCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
