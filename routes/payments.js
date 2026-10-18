const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getPlansAndMethods,
  updatePaymentSettings,
  submitPayment,
  getUserSubscriptionStatus,
  getUserPaymentHistory,
  getAllPaymentsAdmin,
  approvePaymentAdmin,
  rejectPaymentAdmin,
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
router.post('/submit', authenticateToken, submitPayment);

// GET  /api/payments/status  – user checks their subscription status
router.get('/status', authenticateToken, getUserSubscriptionStatus);

// GET  /api/payments/history – user views their payment history
router.get('/history', authenticateToken, getUserPaymentHistory);

// ──────────────────────────────────────────────
// Admin endpoints (protected by x-admin-key)
// ──────────────────────────────────────────────
// GET  /api/payments/admin/all             – list all payments
router.get('/admin/all', requireAdminKey, getAllPaymentsAdmin);

// POST /api/payments/admin/:id/approve    – approve a payment
router.post('/admin/:id/approve', requireAdminKey, approvePaymentAdmin);

// POST /api/payments/admin/:id/reject     – reject a payment
router.post('/admin/:id/reject', requireAdminKey, rejectPaymentAdmin);

// PUT  /api/payments/settings             – update recipient numbers / plans
router.put('/settings', requireAdminKey, updatePaymentSettings);

module.exports = router;
