const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB, getDb } = require('./config/db');

const userRoutes = require('./routes/users');
const campaignRoutes = require('./routes/campaigns');
const contributionRoutes = require('./routes/contributions');
const withdrawalRoutes = require('./routes/withdrawals');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'https://crowdfunding-client-omega.vercel.app', 'https://crowdfunding-server-seven.vercel.app'], credentials: true }));
app.use(express.json());

// Lazy DB connection: connect on first request
let dbConnected = false;
app.use(async (req, res, next) => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
  req.db = getDb();
  next();
});

app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Crowdfunding Platform API is running' });
});

// Vercel: don't listen in production (Vercel handles it)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
