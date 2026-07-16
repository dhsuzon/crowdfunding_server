let jose;

const getJose = async () => {
  if (!jose) jose = await import('jose');
  return jose;
};

let JWKS;

const getJwks = async () => {
  if (!JWKS) {
    const { createRemoteJWKSet } = await getJose();
    JWKS = createRemoteJWKSet(new URL('/api/auth/.well-known/jwks.json', process.env.CLIENT_URL || 'http://localhost:3000'));
  }
  return JWKS;
};

const verifyBetterAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const { jwtVerify } = await getJose();
    const jwks = await getJwks();
    const { payload } = await jwtVerify(token, jwks);
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
