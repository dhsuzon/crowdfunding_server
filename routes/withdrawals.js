const express = require('express');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/verifyBetterAuth');
const verifyRole = require('../middleware/verifyRole');

const router = express.Router();

router.post('/', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const { withdrawalCredits, paymentSystem, accountNumber } = req.body;
    if (!withdrawalCredits || !paymentSystem || !accountNumber) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (withdrawalCredits < 200) {
      return res.status(400).json({ message: 'Minimum 200 credits required for withdrawal.' });
    }
    const user = await req.db.collection('user').findOne({ email: req.user.email });
    if (!user || user.totalRaisedCredits < withdrawalCredits) {
      return res.status(400).json({ message: 'Insufficient raised credits.' });
    }
    const withdrawalAmount = withdrawalCredits / 20;
    const withdrawal = {
      creatorEmail: req.user.email, creatorName: req.user.name,
      withdrawalCredits, withdrawalAmount, paymentSystem, accountNumber, status: 'pending',
      createdAt: new Date()
    };
    const result = await req.db.collection('withdrawals').insertOne(withdrawal);
    res.status(201).json({ ...withdrawal, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my/:email', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const withdrawals = await req.db.collection('withdrawals').find({ creatorEmail: req.params.email })
      .sort({ createdAt: -1 }).toArray();
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const withdrawals = await req.db.collection('withdrawals').find({ status: 'pending' }).sort({ createdAt: -1 }).toArray();
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/approve', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const withdrawal = await req.db.collection('withdrawals').findOne({ _id: new ObjectId(req.params.id) });
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found.' });
    await req.db.collection('withdrawals').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'approved' } }
    );
    await req.db.collection('user').updateOne(
      { email: withdrawal.creatorEmail },
      { $inc: { totalRaisedCredits: -withdrawal.withdrawalCredits } }
    );
    await req.db.collection('notifications').insertOne({
      message: `Your withdrawal request of $${withdrawal.withdrawalAmount} (${withdrawal.withdrawalCredits} credits) has been approved.`,
      toEmail: withdrawal.creatorEmail,
      actionRoute: '/dashboard/creator',
      createdAt: new Date()
    });
    const updated = await req.db.collection('withdrawals').findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
