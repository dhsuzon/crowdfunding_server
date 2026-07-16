const express = require('express');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/verifyBetterAuth');
const verifyRole = require('../middleware/verifyRole');

const router = express.Router();

router.post('/', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const { title, story, category, fundingGoal, minimumContribution, deadline, rewardInfo, imageURL } = req.body;
    if (!title || !story || !category || !fundingGoal || !minimumContribution || !deadline) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }
    const campaign = {
      title, story, category, fundingGoal, minimumContribution, deadline: new Date(deadline), rewardInfo, imageURL,
      creatorEmail: req.user.email, creatorName: req.user.name,
      amountRaised: 0, status: 'pending', isReported: false, reportReason: '', reportedBy: '',
      createdAt: new Date()
    };
    const result = await req.db.collection('campaigns').insertOne(campaign);
    res.status(201).json({ ...campaign, _id: result.insertedId });
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
    const campaigns = await req.db.collection('campaigns').find(query).sort({ createdAt: -1 }).toArray();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/top-funded', async (req, res) => {
  try {
    const campaigns = await req.db.collection('campaigns').find({ status: 'approved' })
      .sort({ amountRaised: -1 }).limit(6).toArray();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const campaigns = await req.db.collection('campaigns').find({ creatorEmail: req.user.email })
      .sort({ deadline: -1 }).toArray();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaigns = await req.db.collection('campaigns').find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaigns = await req.db.collection('campaigns').find().sort({ createdAt: -1 }).toArray();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reported', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaigns = await req.db.collection('campaigns').find({ isReported: true }).sort({ createdAt: -1 }).toArray();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await req.db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const campaign = await req.db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    if (campaign.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    const { title, story, rewardInfo } = req.body;
    const update = {};
    if (title) update.title = title;
    if (story) update.story = story;
    if (rewardInfo) update.rewardInfo = rewardInfo;
    await req.db.collection('campaigns').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
    const updated = await req.db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const campaign = await req.db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    if (campaign.creatorEmail !== req.user.email) return res.status(403).json({ message: 'Not authorized.' });
    const approvedContributions = await req.db.collection('contributions').find({ campaignId: req.params.id, status: 'approved' }).toArray();
    for (const contribution of approvedContributions) {
      await req.db.collection('users').updateOne(
        { email: contribution.supporterEmail },
        { $inc: { credits: contribution.contributionAmount } }
      );
    }
    await req.db.collection('contributions').deleteMany({ campaignId: req.params.id });
    await req.db.collection('campaigns').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Campaign deleted. Supporters refunded.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/approve', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const result = await req.db.collection('campaigns').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'approved' } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Campaign not found.' });
    await req.db.collection('notifications').insertOne({
      message: `Your campaign "${result.title}" has been approved by the admin.`,
      toEmail: result.creatorEmail,
      actionRoute: '/dashboard/creator',
      createdAt: new Date()
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/reject', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const result = await req.db.collection('campaigns').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'rejected' } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Campaign not found.' });
    await req.db.collection('notifications').insertOne({
      message: `Your campaign "${result.title}" has been rejected by the admin.`,
      toEmail: result.creatorEmail,
      actionRoute: '/dashboard/creator',
      createdAt: new Date()
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/report', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await req.db.collection('campaigns').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { isReported: true, reportReason: reason, reportedBy: req.user.email } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ message: 'Campaign not found.' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id/admin-delete', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const campaign = await req.db.collection('campaigns').findOne({ _id: new ObjectId(req.params.id) });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
    const approvedContributions = await req.db.collection('contributions').find({ campaignId: req.params.id, status: 'approved' }).toArray();
    for (const contribution of approvedContributions) {
      await req.db.collection('users').updateOne(
        { email: contribution.supporterEmail },
        { $inc: { credits: contribution.contributionAmount } }
      );
    }
    await req.db.collection('contributions').deleteMany({ campaignId: req.params.id });
    await req.db.collection('campaigns').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Campaign deleted by admin. Supporters refunded.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
