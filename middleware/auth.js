const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Payment } = require('../models');

/**
 * Middleware to require a valid Bearer JWT in the Authorization header
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. No Bearer token provided.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded; // { userId, email, username }
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired session token. Please log in again.',
    });
  }
}

/**
 * Middleware to require that the authenticated user has an active subscription or trial
 */
async function requireSubscription(req, res, next) {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.subscriptionStatus === 'cancelled' || user.subscriptionStatus === 'canceled') {
      return res.status(403).json({
        error: 'Your subscription is cancelled. Please renew to use cloud sync.',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    const now = new Date();
    // 1. Direct active subscription or trial on user record
    if (user.isSubscribed && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now) {
      return next();
    }

    // 2. Active approved payment check
    const latestApproved = await Payment.findOne({
      userId,
      status: 'approved',
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (latestApproved && latestApproved.subscriptionExpiresAt && new Date(latestApproved.subscriptionExpiresAt) > now) {
      return next();
    }

    return res.status(403).json({
      error: 'Cloud sync requires an active subscription or free trial.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
  } catch (err) {
    console.error('[requireSubscription Error]', err);
    return res.status(500).json({ error: 'Failed to verify subscription status.' });
  }
}

module.exports = {
  requireAuth,
  authenticateToken: requireAuth,
  requireSubscription,
};
