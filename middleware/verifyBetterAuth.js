const { createRemoteJWKSet, jwtVerify } = require('jose');

const JWKS = createRemoteJWKSet(new URL('/api/auth/.well-known/jwks.json', process.env.CLIENT_URL || 'http://localhost:3000'));

const verifyBetterAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWKS);
    req.user = {
      email: payload.email || payload.sub,
      role: payload.role || 'supporter',
      name: payload.name || '',
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyBetterAuth;
