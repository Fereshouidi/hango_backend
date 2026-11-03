const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['announcement', 'update', 'promo', 'alert', 'general'],
      default: 'announcement',
    },
    targetType: {
      type: String,
      enum: ['all', 'subscribers', 'free', 'individual'],
      default: 'all',
    },
    recipientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    recipientsCount: {
      type: Number,
      default: 0,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sentBy: {
      type: String,
      default: 'admin',
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ targetType: 1 });
notificationSchema.index({ recipientIds: 1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);
