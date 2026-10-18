const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getUsersCollection, getBackupsCollection } = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', async (req, res) => {
  try {
    let { email, username, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    email = email.trim().toLowerCase();
    username = (username || email.split('@')[0]).trim();

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const usersCol = getUsersCollection();

    // Check if email already exists
    const existingEmail = await usersCol.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check if username already exists
    const existingUsername = await usersCol.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      email,
      username,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCol.insertOne(newUser);
    const userId = result.insertedId.toString();

    // Generate JWT
    const token = jwt.sign(
      { userId, email, username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: userId,
        email,
        username,
      },
    });
  } catch (error) {
    console.error('[Register error]', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate existing user
 */
router.post('/login', async (req, res) => {
  try {
    let { identifier, email, password } = req.body;
    const loginId = (identifier || email || '').trim().toLowerCase();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const usersCol = getUsersCollection();

    // Find by email or username
    const user = await usersCol.findOne({
      $or: [
        { email: loginId },
        { username: loginId }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userId = user._id.toString();

    // Generate JWT
    const token = jwt.sign(
      { userId, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: userId,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('[Login error]', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile & last backup status
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const usersCol = getUsersCollection();
    const user = await usersCol.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const backupsCol = getBackupsCollection();
    const backup = await backupsCol.findOne({ userId: req.user.userId });

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      lastBackup: backup ? {
        updatedAt: backup.updatedAt,
        stats: backup.stats,
      } : null,
    });
  } catch (error) {
    console.error('[Me error]', error);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

module.exports = router;
