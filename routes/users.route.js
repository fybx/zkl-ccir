const express = require('express');
const router = express.Router({ mergeParams: true });

const { User } = require('../models/index.js');

router.get('/users', async (req, res) => {
  const { publicKey, address } = req.query;

  try {
    const query = {};
    if (publicKey) {
      query.publicKey = publicKey;
    }
    if (address) {
      query.address = address;
    }

    if (!publicKey && !address) {
      return res.status(400).json({ error: 'Please provide a publicKey or address to search.' });
    }

    const users = await User.find(query);

    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found matching the criteria.' });
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const user = new User({
      address: req.body.address,
      networkType: req.body.networkType,
      profileName: req.body.profileName || 'Anonymous',
      publicKey: req.body.publicKey
    });
    
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Public key already exists, are you trying to impersonate someone?' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:publicKey', async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { publicKey: req.params.publicKey },
      {
        address: req.body.address,
        networkType: req.body.networkType,
        profileName: req.body.profileName
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
