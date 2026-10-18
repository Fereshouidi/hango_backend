const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Backup } = require('../models');

/**
 * POST /api/auth/register
 * Create a new user account with initial app version
 */
async function register(req, res) {
  try {
    let { email, username, password, appVersion, platform } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    email = email.trim().toLowerCase();
    username = (username || email.split('@')[0]).trim();
    const version = (appVersion || req.headers['x-app-version'] || '1.0.0').trim();

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      username,
      passwordHash,
      appVersion: version,
      platform: platform || 'unknown',
      lastLoginAt: new Date(),
    });

    const userId = newUser._id.toString();

    // Generate JWT
    const token = jwt.sign(
      { userId, email, username },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN || '30d' }
    );

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: userId,
        email: newUser.email,
        username: newUser.username,
        appVersion: newUser.appVersion,
      },
    });
  } catch (error) {
    console.error('[Register error]', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

/**
 * POST /api/auth/login
 * Authenticate existing user and update their current app version
 */
async function login(req, res) {
  try {
    let { identifier, email, password, appVersion, platform } = req.body;
    const loginId = (identifier || email || '').trim().toLowerCase();
    const version = (appVersion || req.headers['x-app-version'] || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    // Find by email or username
    const user = await User.findOne({
      $or: [{ email: loginId }, { username: loginId }],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Record the current version of the app the user is using
    if (version) {
      user.appVersion = version;
    }
    if (platform) {
      user.platform = platform;
    }
    user.lastLoginAt = new Date();
    await user.save();

    const userId = user._id.toString();

    // Generate JWT
    const token = jwt.sign(
      { userId, email: user.email, username: user.username },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: userId,
        email: user.email,
        username: user.username,
        appVersion: user.appVersion,
      },
    });
  } catch (error) {
    console.error('[Login error]', error);
    res.status(500).json({
      error: 'Internal server error during login.',
      details: error.message,
    });
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user profile & last backup status
 */
async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const backup = await Backup.findOne({ userId: req.user.userId });

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        appVersion: user.appVersion,
        platform: user.platform,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      lastBackup: backup
        ? {
            updatedAt: backup.updatedAt,
            stats: backup.stats,
          }
        : null,
    });
  } catch (error) {
    console.error('[Profile error]', error);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
}

/**
 * PATCH /api/auth/version
 * Explicitly update the user's current app version
 */
async function updateAppVersion(req, res) {
  try {
    const { appVersion, platform } = req.body;
    if (!appVersion) {
      return res.status(400).json({ error: 'appVersion is required.' });
    }

    const updateFields = { appVersion: appVersion.trim() };
    if (platform) updateFields.platform = platform;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      message: 'App version updated successfully.',
      appVersion: user.appVersion,
    });
  } catch (error) {
    console.error('[UpdateAppVersion error]', error);
    res.status(500).json({ error: 'Failed to update app version.' });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateAppVersion,
};
