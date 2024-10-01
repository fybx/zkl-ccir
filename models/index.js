const mongoose = require('mongoose');

const NonceSchema = new mongoose.Schema({
  address: String,
  nonce: String,
  type: String,
  createdAt: { type: Date, expires: 300, default: Date.now }
});

const AuthTokenSchema = new mongoose.Schema({
  address: String,
  auth_token: String,
  type: String,
  createdAt: { type: Date, expires: 3600, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  address: { type: String, required: true },
  networkType: { type: String, required: true },
  profileName: { type: String, required: true, default: 'Anonymous' },
  publicKey: { type: String, required: true, unique: true }
});

const Nonce = mongoose.model('Nonce', NonceSchema);
const AuthToken = mongoose.model('AuthToken', AuthTokenSchema);
const User = mongoose.model('User', UserSchema);
User.collection.createIndex({ publicKey: 1 }, { unique: true });

module.exports = { Nonce, AuthToken, User };
