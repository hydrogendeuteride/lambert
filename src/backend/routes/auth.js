const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const { verifyToken, authRole } = require('../middlewares/auth');
const router = express.Router();

const secretKey = process.env.SESSION_SECRET;
const tokenExpiresIn = process.env.TOKEN_EXPIRES_IN || '24h';
const MAX_USER = process.env.MAX_USER || 3;

const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be more than 2 letters'),
  body('email').isEmail().normalizeEmail().withMessage('Enter valid Email'),
  body('password').isLength({ min: 8 }).withMessage('Password should be at least 8 words')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Enter valid Email'),
  body('password').notEmpty().withMessage('Enter password')
];

router.post('/users', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;
  let { role } = req.body;


  try {
    const userCount = await User.countDocuments();
    if (userCount >= MAX_USER) {
      return res.status(403).json({ error: 'Reached maximum user count' });
    }

    if (userCount === 0) {
      role = 'admin';
    } else if (role == 'admin') {
      const adminExists = await User.findOne({ role: 'admin' });
      if (adminExists) {
        return res.status(400).json({ error: 'An admin account already exists' });
      }
    } else {
      role = 'user';
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({ name, email, password, role });
    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, secretKey, { expiresIn: '1h' });
    const userInfo = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({ token, user: userInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Auth token needed' });
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, secretKey);

    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiry = decoded.exp;
    const halfLife = (tokenExpiry - decoded.iat) / 2;
    let newToken = null;

    if (tokenExpiry - currentTime < halfLife) {
      newToken = jwt.sign(
        { id: decoded.id, role: decoded.role },
        secretKey,
        { expiresIn: tokenExpiresIn }
      );
    }

    res.json({
      valid: true,
      role: decoded.role,
      ...(newToken && { token: newToken })
    });

  } catch (err) {

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false, error: 'Token expired' });
    }
    res.status(401).json({ valid: false, error: 'Unauthorized yoken' });

  }
});

module.exports = router;