const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getPlansAndMethods,
  updatePaymentSettings,
  submitPayment,
  getUserSubscriptionStatus,
  getUserPaymentHistory,
  getAllPaymentsAdmin,
  approvePaymentAdmin,
  rejectPaymentAdmin,
  getAdminStats,
  getAdminUsers,
  updateUserSubscriptionAdmin,
  deletePaymentAdmin,
} = require('../controllers/paymentController');
const config = require('../config');

const router = express.Router();

/**
 * Middleware to protect admin-only endpoints via a shared secret header.
 * Pass header:  x-admin-key: <ADMIN_KEY>
 */
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== config.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden: invalid admin key.' });
  }
  next();
}

// ──────────────────────────────────────────────
// Public
// ──────────────────────────────────────────────
// GET  /api/payments/plans  – fetch available plans + recipient numbers
router.get('/plans', getPlansAndMethods);

// ──────────────────────────────────────────────
// Authenticated user endpoints
// ──────────────────────────────────────────────
// POST /api/payments/submit  – user submits payment proof
router.post('/submit', requireAuth, submitPayment);

// GET  /api/payments/status  – user checks their subscription status
router.get('/status', requireAuth, getUserSubscriptionStatus);

// GET  /api/payments/history – user views their payment history
router.get('/history', requireAuth, getUserPaymentHistory);

// ──────────────────────────────────────────────
// Admin endpoints (protected by x-admin-key)
// ──────────────────────────────────────────────
// GET  /api/payments/admin/stats            – dashboard analytics and revenue
router.get('/admin/stats', requireAdminKey, getAdminStats);

// GET  /api/payments/admin/all              – list all payments
router.get('/admin/all', requireAdminKey, getAllPaymentsAdmin);

// POST /api/payments/admin/:id/approve     – approve a payment
router.post('/admin/:id/approve', requireAdminKey, approvePaymentAdmin);

// POST /api/payments/admin/:id/reject      – reject a payment
router.post('/admin/:id/reject', requireAdminKey, rejectPaymentAdmin);

// DELETE /api/payments/admin/:id           – delete a payment
router.delete('/admin/:id', requireAdminKey, deletePaymentAdmin);

// GET  /api/payments/admin/users            – list all users
router.get('/admin/users', requireAdminKey, getAdminUsers);

// POST /api/payments/admin/users/:id/subscription – grant/revoke user subscription
router.post(
  '/admin/users/:id/subscription',
  requireAdminKey,
  updateUserSubscriptionAdmin
);

// PUT  /api/payments/settings              – update recipient numbers / plans
router.put('/settings', requireAdminKey, updatePaymentSettings);

module.exports = router;
