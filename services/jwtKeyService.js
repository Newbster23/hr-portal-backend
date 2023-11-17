const crypto = require('crypto');

// Generate a secure random key for JWT signing
const jwtSecretKey = crypto.randomBytes(32).toString('hex');

module.exports = {
  jwtSecretKey,
};
