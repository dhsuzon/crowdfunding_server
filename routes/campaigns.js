const express = require('express');
const Campaign = require('../models/Campaign');
const Contribution = require('../models/Contribution');
const Notification = require('../models/Notification');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyBetterAuth');
const verifyRole = require('../middleware/verifyRole');

const router = express.Router();

router.post('/', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const { title, story, category, fundingGoal, minimumContribution, deadline, rewardInfo, imageURL } = req.body;
    if (!title || !story || !category || !fundingGoal || !minimumContribution || !deadline) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }
    const campaign = new Campaign({
      title, story, category, fundingGoal, minimumContribution, deadline, rewardInfo, imageURL,
      creatorEmail: req.user.email, creatorName: req.user.name
    });
    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { status: 'approved', deadline: { $gte: new Date() } };
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };
    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/top-funded', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'approved' })
      .sort({ amountRaised: -1 }).limit(6);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creatorEmail: req.user.email })
      .sort({ deadline: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reported', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaigns = await Campaign.find({ isReported: true }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    if (campaign.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    const { title, story, rewardInfo } = req.body;
    if (title) campaign.title = title;
    if (story) campaign.story = story;
    if (rewardInfo) campaign.rewardInfo = rewardInfo;
    await campaign.save();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    if (campaign.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    const approvedContributions = await Contribution.find({ campaignId: req.params.id, status: 'approved' });
    for (const contribution of approvedContributions) {
      await User.findOneAndUpdate(
        { email: contribution.supporterEmail },
        { $inc: { credits: contribution.contributionAmount } }
      );
    }
    await Contribution.deleteMany({ campaignId: req.params.id });
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted. Supporters refunded.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/approve', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id, { status: 'approved' }, { new: true }
    );
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    await new Notification({
      message: `Your campaign "${campaign.title}" has been approved by the admin.`,
      toEmail: campaign.creatorEmail,
      actionRoute: '/dashboard/creator'
    }).save();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/reject', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id, { status: 'rejected' }, { new: true }
    );
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    await new Notification({
      message: `Your campaign "${campaign.title}" has been rejected by the admin.`,
      toEmail: campaign.creatorEmail,
      actionRoute: '/dashboard/creator'
    }).save();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/report', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { isReported: true, reportReason: reason, reportedBy: req.user.email },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id/admin-delete', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    const approvedContributions = await Contribution.find({ campaignId: req.params.id, status: 'approved' });
    for (const contribution of approvedContributions) {
      await User.findOneAndUpdate(
        { email: contribution.supporterEmail },
        { $inc: { credits: contribution.contributionAmount } }
      );
    }
    await Contribution.deleteMany({ campaignId: req.params.id });
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted by admin. Supporters refunded.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
