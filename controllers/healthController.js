const { connectDB } = require('../db/connection');

/**
 * GET /
 * Root service banner
 */
function getRoot(req, res) {
  res.status(200).send('HanGo Cloud Sync Service is running!');
}

/**
 * GET /api/health
 * Health check endpoint reporting service and database status
 */
async function getHealth(req, res) {
  let dbStatus = 'connected';
  try {
    await connectDB();
  } catch (err) {
    dbStatus = `disconnected (${err.message})`;
  }

  res.status(200).json({
    status: 'ok',
    app: 'HanGo Cloud Sync Service',
    database: dbStatus,
    time: new Date().toISOString(),
  });
}

module.exports = {
  getRoot,
  getHealth,
};
