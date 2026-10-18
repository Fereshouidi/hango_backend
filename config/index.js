require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI:
    process.env.MONGO_URI ||
    'mongodb+srv://feres997:feres997@cluster0.peiowiq.mongodb.net/hango',
  DB_NAME: process.env.DB_NAME || 'hango',
  JWT_SECRET: process.env.JWT_SECRET || 'hango-super-secret-jwt-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  ADMIN_KEY: process.env.ADMIN_KEY || 'hango-admin-secret-key-2026',
};
