const app = require('./app');
const config = require('./config');
const { connectDB } = require('./db/connection');
const { getLocalIPAddresses } = require('./utils/network');

/**
 * Start server locally (only when executed directly with node)
 */
async function startServer() {
  let server;

  try {
    await connectDB();

    server = app.listen(config.PORT, '0.0.0.0', () => {
      console.log('\n==============================================');
      console.log('HanGo Cloud Sync Server is running!');
      console.log(`Local:  http://localhost:${config.PORT}`);
      console.log(`Health: http://localhost:${config.PORT}/api/health`);

      for (const ip of getLocalIPAddresses()) {
        console.log(`LAN:    http://${ip}:${config.PORT}`);
      }

      console.log('==============================================\n');
    });

    server.on('error', (error) => {
      console.error('[Server Listen Error]', error);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error('[Server Startup Error]', error);
    process.exitCode = 1;
  }
}

// Only listen on port if run directly (node index.js)
// When imported by Vercel serverless functions, do NOT call app.listen
if (require.main === module) {
  startServer();
}

// Export Express app for Vercel Serverless Functions
module.exports = app;
