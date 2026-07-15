const jwt = require('jsonwebtoken');

const verifyBetterAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.BETTER_AUTH_SECRET);
    req.user = {
      email: decoded.email || decoded.sub,
      role: decoded.role || 'supporter',
      name: decoded.name || '',
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyBetterAuth;
