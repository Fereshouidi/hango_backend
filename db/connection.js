const { MongoClient } = require('mongodb');
const config = require('../config');

let client = null;
let db = null;
let connectionPromise = null;

async function connectDB() {
  if (db) return db;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      client = new MongoClient(config.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      });

      await client.connect();
      db = client.db(config.DB_NAME);
      console.log(`[MongoDB] Connected successfully to database: "${config.DB_NAME}"`);

      // Ensure indexes for fast and secure lookups
      const usersCol = db.collection('users');
      await usersCol.createIndex({ email: 1 }, { unique: true });
      await usersCol.createIndex({ username: 1 }, { unique: true, sparse: true });

      const backupsCol = db.collection('user_backups');
      await backupsCol.createIndex({ userId: 1 }, { unique: true });

      const updatesCol = db.collection('updates');
      await updatesCol.createIndex({ buildNumber: -1 });
      await updatesCol.createIndex({ version: 1 });
      await updatesCol.createIndex({ isActive: 1 });
      await updatesCol.createIndex({ platform: 1 });

      return db;
    } catch (error) {
      connectionPromise = null;
      db = null;
      console.error('[MongoDB] Connection error:', error.message);
      throw error;
    }
  })();

  return connectionPromise;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
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
};
