const express = require('express');
const updateController = require('../controllers/updateController');
const { requireAdminKey } = require('../middleware/adminAuth');

const router = express.Router();

// Public client update endpoints
router.get('/check', updateController.checkUpdate);
router.get('/latest', updateController.getLatestUpdate);
router.get('/', updateController.getAllUpdates);

// Admin endpoints (require x-admin-key header)
router.post('/', requireAdminKey, updateController.createUpdate);
router.put('/:id', requireAdminKey, updateController.updateUpdate);
router.delete('/:id', requireAdminKey, updateController.deleteUpdate);

module.exports = router;
