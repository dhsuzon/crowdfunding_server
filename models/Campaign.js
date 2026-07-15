const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  story: { type: String, required: true },
  category: { type: String, required: true, enum: ['Technology', 'Art', 'Community', 'Health', 'Education', 'Environment'] },
  fundingGoal: { type: Number, required: true },
  minimumContribution: { type: Number, required: true },
  deadline: { type: Date, required: true },
  rewardInfo: { type: String, default: '' },
  imageURL: { type: String, default: '' },
  amountRaised: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  creatorEmail: { type: String, required: true },
  creatorName: { type: String, required: true },
  isReported: { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  reportedBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Campaign', campaignSchema);
