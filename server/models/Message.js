const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  rideId:   { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:  { type: String, required: true },
  read:     { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
