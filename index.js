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

app.use(cors({ origin: ['http://localhost:3000', 'https://your-app.vercel.app'], credentials: true }));
app.use(express.json());

connectDB();

app.use((req, res, next) => {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
