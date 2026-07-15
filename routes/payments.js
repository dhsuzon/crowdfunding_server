const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

const PACKAGES = {
  '100': { credits: 100, price: 10 },
  '300': { credits: 300, price: 25 },
  '800': { credits: 800, price: 60 },
  '1500': { credits: 1500, price: 110 }
};

router.post('/create-payment-intent', verifyToken, async (req, res) => {
  try {
    const { credits } = req.body;
    const pkg = PACKAGES[credits.toString()];
    if (!pkg) return res.status(400).json({ message: 'Invalid package.' });
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pkg.price * 100,
      currency: 'usd',
      metadata: { userEmail: req.user.email, credits: pkg.credits }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/confirm', verifyToken, async (req, res) => {
  try {
    const { paymentIntentId, credits, amount } = req.body;
    const pkg = PACKAGES[credits.toString()];
    if (!pkg) return res.status(400).json({ message: 'Invalid package.' });
    const payment = new Payment({
      userEmail: req.user.email, userName: req.user.name,
      amount: pkg.price, credits: pkg.credits,
      packageName: `${pkg.credits} credits`, stripePaymentId: paymentIntentId,
      status: 'success'
    });
    await payment.save();
    await User.findOneAndUpdate({ email: req.user.email }, { $inc: { credits: pkg.credits } });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:email', verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
