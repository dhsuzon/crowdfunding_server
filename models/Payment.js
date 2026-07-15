const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  amount: { type: Number, required: true },
  credits: { type: Number, required: true },
  packageName: { type: String, required: true },
  stripePaymentId: { type: String, default: '' },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
