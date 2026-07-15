const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  photoURL: { type: String, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['supporter', 'creator', 'admin'], default: 'supporter' },
  credits: { type: Number, default: 0 },
  totalRaisedCredits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('User', userSchema);
