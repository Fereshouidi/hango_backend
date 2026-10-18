const express = require('express');
const syncController = require('../controllers/syncController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All sync routes require valid JWT auth
router.use(requireAuth);

router.post('/backup', syncController.backup);
router.get('/restore', syncController.restore);
router.get('/status', syncController.getSyncStatus);

module.exports = router;
