const mongoose = require('mongoose');
const config = require('../config');

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      await mongoose.connect(config.MONGO_URI, {
        dbName: config.DB_NAME,
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      });

      console.log(`[MongoDB/Mongoose] Connected successfully to database: "${config.DB_NAME}"`);
      return mongoose.connection.db;
    } catch (error) {
      connectionPromise = null;
      console.error('[MongoDB/Mongoose] Connection error:', error.message);
      throw error;
    }
  })();

  return connectionPromise;
}

function getDB() {
  if (!mongoose.connection.db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return mongoose.connection.db;
}

function getUsersCollection() {
  return getDB().collection('users');
}

function getBackupsCollection() {
  return getDB().collection('user_backups');
}

function getUpdatesCollection() {
  return getDB().collection('updates');
}

module.exports = {
  connectDB,
  getDB,
  getUsersCollection,
  getBackupsCollection,
  getUpdatesCollection,
  mongoose,
};
