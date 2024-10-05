const express = require('express');
const router = express.Router({ mergeParams: true });
const siwe = require('siwe');
const bs58 = require('bs58');
const nacl = require('tweetnacl');

const { Nonce, AuthToken } = require('../models/index.js');
const { generateNonce, generateBearerToken } = require('../utils/index.js');

router.get('/nonce', async (req, res) => {
  const { address, type } = req.query;

  if (!address || !type) {
    return res.status(400).json({ error: 'Missing address or type' });
  }

  if (type !== 'ethereum' && type !== 'solana') {
    return res.status(400).json({ error: 'Invalid type. Must be "ethereum" or "solana"' });
  }

  const nonce = generateNonce();

  try {
    await Nonce.findOneAndUpdate(
      { address, type },
      { address, nonce, type },
      { upsert: true, new: true }
    );

    res.json({ nonce });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', async (req, res) => {
  const { message, address, signature } = req.body;

  if (!address || !signature) {
    return res.status(400).json({error: 'Missing address or signature'});
  }

  const nonce = await Nonce.findOne({ address }).lean().select('-__v -updatedAt');
  const type = nonce.type;

  try {
    if (type === 'ethereum') {
      if (!message) {
        return res.status(400).json({ error: 'Missing SiweMessage' });
      }
      const siweMessage = new siwe.SiweMessage(message);
      const fields = await siweMessage.verify({ signature, nonce: nonce.nonce });
      if (address == fields.address)
        throw new Error('Invalid signature');
    } else if (type === 'solana') {
      const signatureUint8 = bs58.default.decode(signature);
      const messageUint8 = new TextEncoder().encode(nonce.nonce);
      const publicKeyUint8 = bs58.default.decode(address);

      const isValid = nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
      if (!isValid) {
        throw new Error('Invalid signature');
      }
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "ethereum" or "solana"' });
    }

    const auth_token = generateBearerToken();

    await AuthToken.findOneAndUpdate(
      { address, type },
      { auth_token, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await Nonce.deleteOne({ address, type });

    res.json({ auth_token });
  } catch (error) {
    res.status(400).json({ error: `${error.message}, ${error.stack}` });
  }
});

router.delete('/auth/signoff', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ error: 'Missing authorization token in header'});
  }

  const deletedAuth = AuthToken.findOneAndDelete({ auth_token: token });

  if (!deletedAuth) {
    return res.status(400).json({ error: 'Can\'t log out, not logged in?' });
  }

  return res.status(204).json({ error: 'Logged out successfully.' });
});

module.exports = router;
