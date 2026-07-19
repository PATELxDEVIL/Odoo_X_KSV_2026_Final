const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:   { type: String, default: 'info' },
  icon:   { type: String, default: '🔔' },
  title:  { type: String, required: true },
  msg:    { type: String, default: '' },
  read:   { type: Boolean, default: false },
  date:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
