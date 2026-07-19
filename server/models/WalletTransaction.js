const mongoose = require('mongoose');
const { Schema } = mongoose;

const WalletTxnSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:   { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  desc:   { type: String, default: '' },
  method: { type: String, default: null },
  date:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('WalletTransaction', WalletTxnSchema);
