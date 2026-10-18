
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const os = require('os');

const { connectDB } = require('./db');
const authRoutes = require('./routes/auth');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'HanGo Cloud Sync Service',
    time: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).send('HanGo Cloud Sync Service is running!');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    error:
      status >= 500
        ? 'Internal Server Error'
        : err.message || 'Request Error',
  });
});

// Local network IP addresses
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(interfaces)) {
    for (const iface of entries || []) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        !iface.address.startsWith('169.254.')
      ) {
        addresses.push(iface.address);
      }
    }
  }

  return [...new Set(addresses)];
}

// Start server only after database connection succeeds
async function startServer() {
  let server;

  try {
    await connectDB();

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n==============================================');
      console.log('HanGo Cloud Sync Server is running!');
      console.log(`Local: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);

      for (const ip of getLocalIPAddresses()) {
        console.log(`LAN: http://${ip}:${PORT}`);
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

startServer();
