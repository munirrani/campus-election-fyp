const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const calculateHash = (timestamp, data) => {
   return crypto.createHash('sha256').update(timestamp + data + process.env.SECRET_KEY_HASH).digest('hex')
}

const generateSecret = () => {
  const secret = crypto.randomBytes(24).toString('hex');
  return secret;
}

const secret = generateSecret();

module.exports = {
  calculateHash,
  secret
};

