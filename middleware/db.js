const { connectDB } = require('../db/connection');

/**
 * Middleware ensuring MongoDB is connected before handling route
 */
async function ensureDBConnection(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('[MongoDB Middleware Error]', error.message);
    res.status(500).json({
      error: 'Database connection failed. Please check MongoDB Atlas connection or IP whitelist.',
      details: error.message,
    });
  }
}

module.exports = {
  ensureDBConnection,
};
