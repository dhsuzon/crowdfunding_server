const express = require('express');
const Contribution = require('../models/Contribution');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');
const verifyRole = require('../middleware/verifyRole');

const router = express.Router();

router.post('/', verifyToken, async (req, res) => {
  try {
    const { campaignId, campaignTitle, contributionAmount, creatorName, creatorEmail, message } = req.body;
    if (!campaignId || !contributionAmount || contributionAmount <= 0) {
      return res.status(400).json({ message: 'Valid contribution amount is required.' });
    }
    const supporter = await User.findOne({ email: req.user.email });
    if (!supporter || supporter.credits < contributionAmount) {
      return res.status(400).json({ message: 'Insufficient credits.' });
    }
    supporter.credits -= contributionAmount;
    await supporter.save();
    const contribution = new Contribution({
      campaignId, campaignTitle, contributionAmount, message,
      supporterEmail: req.user.email, supporterName: req.user.name,
      creatorName, creatorEmail, status: 'pending'
    });
    await contribution.save();
    await new Notification({
      message: `${req.user.name} contributed ${contributionAmount} credits to "${campaignTitle}".`,
      toEmail: creatorEmail,
      actionRoute: '/dashboard/creator',
      createdAt: new Date()
    }).save();
    res.status(201).json(contribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const total = await Contribution.countDocuments({ supporterEmail: req.user.email });
    const contributions = await Contribution.find({ supporterEmail: req.user.email })
      .sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({ contributions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/approved', verifyToken, async (req, res) => {
  try {
    const contributions = await Contribution.find({ supporterEmail: req.user.email, status: 'approved' })
      .sort({ createdAt: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending/:creatorEmail', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const contributions = await Contribution.find({
      creatorEmail: req.params.creatorEmail, status: 'pending'
    }).sort({ createdAt: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/approve', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution not found.' });
    if (contribution.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    contribution.status = 'approved';
    await contribution.save();
    await Campaign.findByIdAndUpdate(contribution.campaignId, { $inc: { amountRaised: contribution.contributionAmount } });
    await User.findOneAndUpdate(
      { email: contribution.creatorEmail },
      { $inc: { totalRaisedCredits: contribution.contributionAmount } }
    );
    await new Notification({
      message: `Your contribution of ${contribution.contributionAmount} credits to "${contribution.campaignTitle}" was approved by ${req.user.name}.`,
      toEmail: contribution.supporterEmail,
      actionRoute: '/dashboard/supporter'
    }).save();
    res.json(contribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/reject', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution not found.' });
    if (contribution.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    contribution.status = 'rejected';
    await contribution.save();
    await User.findOneAndUpdate(
      { email: contribution.supporterEmail },
      { $inc: { credits: contribution.contributionAmount } }
    );
    await new Notification({
      message: `Your contribution of ${contribution.contributionAmount} credits to "${contribution.campaignTitle}" was rejected by ${req.user.name}. The amount has been refunded.`,
      toEmail: contribution.supporterEmail,
      actionRoute: '/dashboard/supporter'
    }).save();
    res.json(contribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
