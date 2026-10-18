const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public auth endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected auth endpoints
router.get('/me', requireAuth, authController.getProfile);
router.patch('/version', requireAuth, authController.updateAppVersion);

module.exports = router;
