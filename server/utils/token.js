const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function generateAuthToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
}

function generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function generateRandomToken() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateAuthToken,
  generateRefreshToken,
  verifyToken,
  generateRandomToken
};