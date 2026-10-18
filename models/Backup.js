const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    appVersion: {
      type: String,
      default: '1.0.0',
      trim: true,
    },
    stats: {
      hsksCount: { type: Number, default: 0 },
      lessonsCount: { type: Number, default: 0 },
      textsCount: { type: Number, default: 0 },
      sentencesCount: { type: Number, default: 0 },
      wordsCount: { type: Number, default: 0 },
      charactersCount: { type: Number, default: 0 },
      rulesCount: { type: Number, default: 0 },
    },
    data: {
      hsks: { type: Array, default: [] },
      lessons: { type: Array, default: [] },
      texts: { type: Array, default: [] },
      sentences: { type: Array, default: [] },
      words: { type: Array, default: [] },
      characters: { type: Array, default: [] },
      rules: { type: Array, default: [] },
      junctions: { type: Object, default: {} },
    },
  },
  {
    timestamps: true,
    collection: 'user_backups',
  }
);

module.exports = mongoose.models.Backup || mongoose.model('Backup', backupSchema);
