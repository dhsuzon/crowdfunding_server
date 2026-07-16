require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('crowdfundingDatabase');
    console.log('Connected to MongoDB');

    const adminExists = await db.collection('users').findOne({ email: 'admin@gmail.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin12345', 10);
      await db.collection('users').insertOne({
        name: 'admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'admin',
        credits: 100000,
        createdAt: new Date()
      });
      console.log('Admin user created');
    }

    console.log('Seed completed');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
