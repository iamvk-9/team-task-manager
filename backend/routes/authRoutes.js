const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Lookup user by email (used when adding project members)
router.get('/users', protect, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  const user = await User.findOne({ email }).select('-password');
  if (!user) return res.status(404).json({ message: 'No user found with that email' });
  res.json(user);
});

module.exports = router;
