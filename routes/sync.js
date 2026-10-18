const express = require('express');
const { getBackupsCollection } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all sync endpoints
router.use(requireAuth);

/**
 * POST /api/sync/backup
 * Upload and backup all client study data to MongoDB under this user's account
 */
router.post('/backup', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { hsks, lessons, texts, sentences, words, characters, rules, junctions } = req.body;

    if (!hsks && !words && !sentences && !lessons) {
      return res.status(400).json({ error: 'No data provided in backup payload.' });
    }

    const stats = {
      hsksCount: Array.isArray(hsks) ? hsks.length : 0,
      lessonsCount: Array.isArray(lessons) ? lessons.length : 0,
      textsCount: Array.isArray(texts) ? texts.length : 0,
      sentencesCount: Array.isArray(sentences) ? sentences.length : 0,
      wordsCount: Array.isArray(words) ? words.length : 0,
      charactersCount: Array.isArray(characters) ? characters.length : 0,
      rulesCount: Array.isArray(rules) ? rules.length : 0,
    };

    const backupsCol = getBackupsCollection();
    const now = new Date();

    await backupsCol.updateOne(
      { userId },
      {
        $set: {
          userId,
          userEmail: req.user.email,
          updatedAt: now,
          stats,
          data: {
            hsks: hsks || [],
            lessons: lessons || [],
            texts: texts || [],
            sentences: sentences || [],
            words: words || [],
            characters: characters || [],
            rules: rules || [],
            junctions: junctions || {},
          },
        },
      },
      { upsert: true }
    );

    console.log(`[Sync] Backup saved for user ${req.user.email} (${userId}):`, stats);

    res.json({
      message: 'Cloud backup saved successfully!',
      updatedAt: now,
      stats,
    });
  } catch (error) {
    console.error('[Backup error]', error);
    res.status(500).json({ error: 'Failed to save cloud backup.' });
  }
});

/**
 * GET /api/sync/restore
 * Retrieve the latest backup data for the authenticated user
 */
router.get('/restore', async (req, res) => {
  try {
    const userId = req.user.userId;
    const backupsCol = getBackupsCollection();

    const backup = await backupsCol.findOne({ userId });

    if (!backup || !backup.data) {
      return res.status(404).json({
        error: 'No cloud backup found for this account. Create a backup first.',
        hasBackup: false,
      });
    }

    res.json({
      hasBackup: true,
      updatedAt: backup.updatedAt,
      stats: backup.stats,
      data: backup.data,
    });
  } catch (error) {
    console.error('[Restore error]', error);
    res.status(500).json({ error: 'Failed to retrieve cloud backup.' });
  }
});

/**
 * GET /api/sync/status
 * Get quick sync status metadata without heavy payload
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.userId;
    const backupsCol = getBackupsCollection();

    const backup = await backupsCol.findOne(
      { userId },
      { projection: { stats: 1, updatedAt: 1, userEmail: 1 } }
    );

    if (!backup) {
      return res.json({ hasBackup: false });
    }

    res.json({
      hasBackup: true,
      updatedAt: backup.updatedAt,
      stats: backup.stats,
    });
  } catch (error) {
    console.error('[Status error]', error);
    res.status(500).json({ error: 'Failed to check sync status.' });
  }
});

module.exports = router;
