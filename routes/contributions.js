const express = require('express');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/verifyBetterAuth');
const verifyRole = require('../middleware/verifyRole');

const router = express.Router();

router.post('/', verifyToken, async (req, res) => {
  try {
    const { campaignId, campaignTitle, contributionAmount, creatorName, creatorEmail, message } = req.body;
    if (!campaignId || !contributionAmount || contributionAmount <= 0) {
      return res.status(400).json({ message: 'Valid contribution amount is required.' });
    }
    const supporter = await req.db.collection('user').findOne({ email: req.user.email });
    if (!supporter || supporter.credits < contributionAmount) {
      return res.status(400).json({ message: 'Insufficient credits.' });
    }
    await req.db.collection('user').updateOne(
      { email: req.user.email },
      { $inc: { credits: -contributionAmount } }
    );
    const contribution = {
      campaignId, campaignTitle, contributionAmount, message,
      supporterEmail: req.user.email, supporterName: req.user.name,
      creatorName, creatorEmail, status: 'pending',
      createdAt: new Date()
    };
    const result = await req.db.collection('contributions').insertOne(contribution);
    await req.db.collection('notifications').insertOne({
      message: `${req.user.name} contributed ${contributionAmount} credits to "${campaignTitle}".`,
      toEmail: creatorEmail,
      actionRoute: '/dashboard/creator',
      createdAt: new Date()
    });
    res.status(201).json({ ...contribution, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const total = await req.db.collection('contributions').countDocuments({ supporterEmail: req.user.email });
    const contributions = await req.db.collection('contributions').find({ supporterEmail: req.user.email })
      .sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    res.json({ contributions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/approved', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const query = { supporterEmail: req.user.email, status: 'approved' };
    const total = await req.db.collection('contributions').countDocuments(query);
    const data = await req.db.collection('contributions').find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending/:creatorEmail', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const query = { creatorEmail: req.params.creatorEmail, status: 'pending' };
    const total = await req.db.collection('contributions').countDocuments(query);
    const data = await req.db.collection('contributions').find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/approve', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const contribution = await req.db.collection('contributions').findOne({ _id: new ObjectId(req.params.id) });
    if (!contribution) return res.status(404).json({ message: 'Contribution not found.' });
    if (contribution.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    await req.db.collection('contributions').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'approved' } }
    );
    await req.db.collection('campaigns').updateOne(
      { _id: new ObjectId(contribution.campaignId) },
      { $inc: { amountRaised: contribution.contributionAmount } }
    );
    await req.db.collection('user').updateOne(
      { email: contribution.creatorEmail },
      { $inc: { totalRaisedCredits: contribution.contributionAmount } }
    );
    await req.db.collection('notifications').insertOne({
      message: `Your contribution of ${contribution.contributionAmount} credits to "${contribution.campaignTitle}" was approved by ${req.user.name}.`,
      toEmail: contribution.supporterEmail,
      actionRoute: '/dashboard/supporter',
      createdAt: new Date()
    });
    const updated = await req.db.collection('contributions').findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/reject', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const contribution = await req.db.collection('contributions').findOne({ _id: new ObjectId(req.params.id) });
    if (!contribution) return res.status(404).json({ message: 'Contribution not found.' });
    if (contribution.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    await req.db.collection('contributions').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'rejected' } }
    );
    await req.db.collection('user').updateOne(
      { email: contribution.supporterEmail },
      { $inc: { credits: contribution.contributionAmount } }
    );
    await req.db.collection('notifications').insertOne({
      message: `Your contribution of ${contribution.contributionAmount} credits to "${contribution.campaignTitle}" was rejected by ${req.user.name}. The amount has been refunded.`,
      toEmail: contribution.supporterEmail,
      actionRoute: '/dashboard/supporter',
      createdAt: new Date()
    });
    const updated = await req.db.collection('contributions').findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
