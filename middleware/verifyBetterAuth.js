const verifyBetterAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET || '');
    const { payload } = await jwtVerify(token, secret);
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
