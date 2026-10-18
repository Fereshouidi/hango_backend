const express = require('express');
const authRoutes = require('./auth');
const syncRoutes = require('./sync');
const updateRoutes = require('./updates');
const healthController = require('../controllers/healthController');
const { ensureDBConnection } = require('../middleware/db');

const router = express.Router();

// Root banner
router.get('/', healthController.getRoot);

// Health check (reports DB status gracefully)
router.get('/api/health', healthController.getHealth);

// Ensure MongoDB is connected for remaining API routes
router.use('/api', ensureDBConnection);

// Sub-routers
router.use('/api/auth', authRoutes);
router.use('/api/sync', syncRoutes);
router.use('/api/updates', updateRoutes);

module.exports = router;
