const express = require('express');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyBetterAuth');

const router = express.Router();

router.get('/:email', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ toEmail: req.params.email })
      .sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id, { isRead: true }, { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/read-all/:email', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { toEmail: req.params.email, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
