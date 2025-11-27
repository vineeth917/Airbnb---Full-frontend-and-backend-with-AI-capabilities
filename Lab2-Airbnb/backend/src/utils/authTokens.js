const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getTokenCollection } = require('./mongo');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const getExpiryFromToken = (token) => {
  const decoded = jwt.decode(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
};

const issueToken = async (userId, userType) => {
  const jti = uuidv4();
  const token = jwt.sign(
    { userId, userType, jti },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const expiresAt = getExpiryFromToken(token);
  const collection = await getTokenCollection();
  await collection.insertOne({
    jti,
    userId,
    userType,
    createdAt: new Date(),
    expiresAt,
    revokedAt: null
  });

  return { token, jti, expiresAt };
};

const verifyToken = async (token) => {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (!decoded || !decoded.jti) {
    throw new Error('Token missing identifier');
  }

  const collection = await getTokenCollection();
  const stored = await collection.findOne({ jti: decoded.jti });

  if (!stored) {
    throw new Error('Token not recognized');
  }

  if (stored.revokedAt) {
    throw new Error('Token revoked');
  }

  if (stored.expiresAt && stored.expiresAt < new Date()) {
    throw new Error('Token expired');
  }

  return decoded;
};

const revokeToken = async (jti, reason = 'user_logout') => {
  if (!jti) return;
  const collection = await getTokenCollection();
  await collection.updateOne(
    { jti },
    { $set: { revokedAt: new Date(), revokeReason: reason } }
  );
};

module.exports = {
  issueToken,
  verifyToken,
  revokeToken
};
