const express = require('express');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/verifyBetterAuth');
const verifyRole = require('../middleware/verifyRole');

const router = express.Router();

router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const users = await req.db.collection('users').find(
      {},
      { projection: { password: 0 } }
    ).sort({ createdAt: -1 }).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/role', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['supporter', 'creator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    const result = await req.db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { role } },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    if (!result) return res.status(404).json({ message: 'User not found.' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const result = await req.db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
