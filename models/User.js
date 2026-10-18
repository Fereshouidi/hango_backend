const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // The current version of the app the user is using
    appVersion: {
      type: String,
      default: '1.0.0',
      trim: true,
    },
    // The platform the user is on ('android', 'ios', 'web', 'unknown')
    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown',
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    // Subscription & Payment status
    isSubscribed: {
      type: Boolean,
      default: false,
      index: true,
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    subscriptionPlan: {
      type: String,
      default: null, // e.g. '1_month', '2_months', '3_months'
    },
    subscriptionStatus: {
      type: String,
      enum: ['none', 'pending', 'active', 'expired'],
      default: 'none',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compiling model in serverless hot reloads
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
