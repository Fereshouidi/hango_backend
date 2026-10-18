const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    method: {
      type: String,
      enum: ['d17', 'ooredoo', 'payeer'],
      required: true,
    },
    durationMonths: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 6, 12],
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ['DT', '$'],
    },
    // The recipient number the money was sent to (from settings at time of request)
    recipientAccount: {
      type: String,
      required: true,
    },
    // The user's proof / sender phone number / Payeer ID / transaction ID
    senderReference: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    subscriptionStartedAt: {
      type: Date,
      default: null,
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

module.exports =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
