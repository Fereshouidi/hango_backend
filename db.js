const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://feres997:feres997@cluster0.peiowiq.mongodb.net/hango';
const DB_NAME = 'hango';

let client = null;
let db = null;
let connectionPromise = null;

async function connectDB() {
  if (db) return db;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      client = new MongoClient(MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      });

      await client.connect();
      db = client.db(DB_NAME);
      console.log(`[MongoDB] Connected successfully to database: "${DB_NAME}"`);

      // Ensure indexes for fast and secure lookups
      const usersCol = db.collection('users');
      await usersCol.createIndex({ email: 1 }, { unique: true });
      await usersCol.createIndex({ username: 1 }, { unique: true, sparse: true });

      const backupsCol = db.collection('user_backups');
      await backupsCol.createIndex({ userId: 1 }, { unique: true });

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

module.exports = {
  connectDB,
  getDB,
  getUsersCollection,
  getBackupsCollection,
};
