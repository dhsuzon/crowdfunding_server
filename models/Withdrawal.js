const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  creatorEmail: { type: String, required: true },
  creatorName: { type: String, required: true },
  withdrawalCredits: { type: Number, required: true },
  withdrawalAmount: { type: Number, required: true },
  paymentSystem: { type: String, required: true },
  accountNumber: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
