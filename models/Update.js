const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    buildNumber: {
      type: Number,
      required: true,
      index: -1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    releaseNotes: {
      type: [String],
      default: [],
    },
    downloadUrl: {
      type: String,
      required: true,
      trim: true,
    },
    isMandatory: {
      type: Boolean,
      default: false,
    },
    minSupportedVersion: {
      type: String,
      default: null,
    },
    minSupportedBuildNumber: {
      type: Number,
      default: null,
    },
    platform: {
      type: String,
      enum: ['all', 'android', 'ios', 'web'],
      default: 'all',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Update || mongoose.model('Update', updateSchema);
