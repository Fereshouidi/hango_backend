const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAdminKey } = require('../middleware/adminAuth');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Admin Endpoints (requires x-admin-key) ──────────────────────────────────
router.post('/admin/send', requireAdminKey, notificationController.sendNotification);
router.get('/admin/all', requireAdminKey, notificationController.getAllNotifications);
router.delete('/admin/:id', requireAdminKey, notificationController.deleteNotification);

// ── App User Endpoints ──────────────────────────────────────────────────────
router.get('/', optionalAuth, notificationController.getUserNotifications);
router.patch('/:id/read', requireAuth, notificationController.markAsRead);
router.post('/read-all', requireAuth, notificationController.markAllAsRead);

module.exports = router;
