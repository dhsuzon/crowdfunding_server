const express = require('express');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/verifyBetterAuth');

const router = express.Router();

router.get('/:email', verifyToken, async (req, res) => {
  try {
    const notifications = await req.db.collection('notifications').find({ toEmail: req.params.email })
      .sort({ createdAt: -1 }).limit(50).toArray();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const result = await req.db.collection('notifications').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { isRead: true } },
      { returnDocument: 'after' }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/read-all/:email', verifyToken, async (req, res) => {
  try {
    await req.db.collection('notifications').updateMany(
      { toEmail: req.params.email, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
