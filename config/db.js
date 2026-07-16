const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let db = null;

const connectDB = async () => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db('crowdfundingDatabase');
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const getDb = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

module.exports = { connectDB, getDb };
