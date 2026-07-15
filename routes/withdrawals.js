const express = require('express');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');
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
    const user = await User.findOne({ email: req.user.email });
    if (!user || user.totalRaisedCredits < withdrawalCredits) {
      return res.status(400).json({ message: 'Insufficient raised credits.' });
    }
    const withdrawalAmount = withdrawalCredits / 20;
    const withdrawal = new Withdrawal({
      creatorEmail: req.user.email, creatorName: req.user.name,
      withdrawalCredits, withdrawalAmount, paymentSystem, accountNumber, status: 'pending'
    });
    await withdrawal.save();
    res.status(201).json(withdrawal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my/:email', verifyToken, verifyRole('creator'), async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ creatorEmail: req.params.email })
      .sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/approve', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found.' });
    withdrawal.status = 'approved';
    await withdrawal.save();
    await User.findOneAndUpdate(
      { email: withdrawal.creatorEmail },
      { $inc: { totalRaisedCredits: -withdrawal.withdrawalCredits } }
    );
    await new Notification({
      message: `Your withdrawal request of $${withdrawal.withdrawalAmount} (${withdrawal.withdrawalCredits} credits) has been approved.`,
      toEmail: withdrawal.creatorEmail,
      actionRoute: '/dashboard/creator'
    }).save();
    res.json(withdrawal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
