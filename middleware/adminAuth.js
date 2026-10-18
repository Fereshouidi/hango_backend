const config = require('../config');

/**
 * Middleware requiring an administrative secret key in headers
 * Header: x-admin-key: <ADMIN_KEY>
 */
function requireAdminKey(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;

  if (!adminKey || adminKey !== config.ADMIN_KEY) {
    return res.status(403).json({
      error: 'Unauthorized: Invalid or missing admin key (x-admin-key).',
    });
  }

  next();
}

module.exports = {
  requireAdminKey,
};
