require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('crowdfundingDatabase');
    console.log('Connected to MongoDB');

    const adminExists = await db.collection('user').findOne({ email: 'admin@gmail.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin12345', 10);
      const now = new Date();
      const adminId = new ObjectId();
      await db.collection('user').insertOne({
        _id: adminId,
        name: 'Admin',
        email: 'admin@gmail.com',
        emailVerified: true,
        role: 'admin',
        credits: 100000,
        totalRaisedCredits: 0,
        photoURL: '',
        createdAt: now,
        updatedAt: now,
      });
      await db.collection('account').insertOne({
        userId: adminId,
        accountId: 'admin@gmail.com',
        providerId: 'email',
        password: hashedPassword,
        createdAt: now,
      });
      console.log('Admin user created with login credentials');
    }

    console.log('Seed completed');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
