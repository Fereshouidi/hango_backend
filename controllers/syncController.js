const { Backup, User } = require('../models');

/**
 * POST /api/sync/backup
 * Upload and backup all client study data to MongoDB under this user's account
 */
async function backup(req, res) {
  try {
    const userId = req.user.userId;
    const {
      hsks,
      lessons,
      texts,
      sentences,
      words,
      characters,
      rules,
      junctions,
      appVersion,
    } = req.body;

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

    const now = new Date();
    const version = (appVersion || req.headers['x-app-version'] || '').trim();

    // Update user's lastSyncAt and appVersion if provided
    const userUpdate = { lastSyncAt: now };
    if (version) userUpdate.appVersion = version;
    await User.findByIdAndUpdate(userId, { $set: userUpdate }).catch(() => {});

    // Save or update backup document
    const backupDoc = await Backup.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          userEmail: req.user.email,
          appVersion: version || '1.0.0',
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
      { upsert: true, new: true }
    );

    console.log(
      `[Sync] Backup saved for user ${req.user.email} (${userId}):`,
      stats
    );

    res.json({
      message: 'Cloud backup saved successfully!',
      updatedAt: backupDoc.updatedAt || now,
      stats,
    });
  } catch (error) {
    console.error('[Backup error]', error);
    res.status(500).json({ error: 'Failed to save cloud backup.' });
  }
}

/**
 * GET /api/sync/restore
 * Retrieve the latest backup data for the authenticated user
 */
async function restore(req, res) {
  try {
    const userId = req.user.userId;
    const backupDoc = await Backup.findOne({ userId });

    if (!backupDoc || !backupDoc.data) {
      return res.status(404).json({
        error: 'No cloud backup found for this account. Create a backup first.',
        hasBackup: false,
      });
    }

    res.json({
      hasBackup: true,
      updatedAt: backupDoc.updatedAt,
      stats: backupDoc.stats,
      data: backupDoc.data,
    });
  } catch (error) {
    console.error('[Restore error]', error);
    res.status(500).json({ error: 'Failed to retrieve cloud backup.' });
  }
}

/**
 * GET /api/sync/status
 * Get quick sync status metadata without heavy payload
 */
async function getSyncStatus(req, res) {
  try {
    const userId = req.user.userId;
    const backupDoc = await Backup.findOne({ userId })
      .select('stats updatedAt userEmail appVersion')
      .lean();

    if (!backupDoc) {
      return res.json({ hasBackup: false });
    }

    res.json({
      hasBackup: true,
      updatedAt: backupDoc.updatedAt,
      stats: backupDoc.stats,
      appVersion: backupDoc.appVersion,
    });
  } catch (error) {
    console.error('[Status error]', error);
    res.status(500).json({ error: 'Failed to check sync status.' });
  }
}

module.exports = {
  backup,
  restore,
  getSyncStatus,
};
