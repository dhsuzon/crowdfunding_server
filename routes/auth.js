const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, photoURL, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const credits = role === 'creator' ? 20 : 50;
    const user = new User({
      name, email, photoURL, password: hashedPassword, role, credits
    });
    await user.save();
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, photoURL: user.photoURL, credits: user.credits },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user._id, name, email, photoURL, role, credits }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, photoURL: user.photoURL, credits: user.credits, totalRaisedCredits: user.totalRaisedCredits },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, photoURL: user.photoURL, role: user.role, credits: user.credits, totalRaisedCredits: user.totalRaisedCredits }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { name, email, photoURL } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    let user = await User.findOne({ email });
    if (!user) {
      const password = await bcrypt.hash(email + process.env.JWT_SECRET, 10);
      user = new User({
        name, email, photoURL, password, role: 'supporter', credits: 50
      });
      await user.save();
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, photoURL: user.photoURL, credits: user.credits, totalRaisedCredits: user.totalRaisedCredits },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Google login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, photoURL: user.photoURL, role: user.role, credits: user.credits, totalRaisedCredits: user.totalRaisedCredits }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
