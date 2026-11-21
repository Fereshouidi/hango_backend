const { Backup, User } = require('../models');

/**
 * POST /api/sync/backup
 * Upload and backup all client study data to MongoDB under this user's account
 */
async function backup(req, res) {
  try {
    const userId = req.user.userId;
    const {
      mode = 'replace',
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

    let finalHsks = Array.isArray(hsks) ? hsks : [];
    let finalLessons = Array.isArray(lessons) ? lessons : [];
    let finalTexts = Array.isArray(texts) ? texts : [];
    let finalSentences = Array.isArray(sentences) ? sentences : [];
    let finalWords = Array.isArray(words) ? words : [];
    let finalCharacters = Array.isArray(characters) ? characters : [];
    let finalRules = Array.isArray(rules) ? rules : [];
    let finalJunctions = junctions && typeof junctions === 'object' ? junctions : {};

    // If merge mode requested, combine with existing cloud data
    if (mode === 'merge') {
      const existingDoc = await Backup.findOne({ userId });
      if (existingDoc && existingDoc.data) {
        const old = existingDoc.data;

        const mergeArrays = (oldArr, newArr, keyFn) => {
          const map = new Map();
          (oldArr || []).forEach((item) => {
            const k = keyFn(item);
            if (k !== undefined && k !== null && k !== '') map.set(k, item);
          });
          (newArr || []).forEach((item) => {
            const k = keyFn(item);
            if (k !== undefined && k !== null && k !== '') map.set(k, item);
          });
          return Array.from(map.values());
        };

        finalHsks = mergeArrays(old.hsks, finalHsks, (h) => (h.name ? h.name.trim().toLowerCase() : h.id));
        finalLessons = mergeArrays(old.lessons, finalLessons, (l) => `${l.hskId || 0}_${l.num || 0}_${l.title || ''}`);
        finalTexts = mergeArrays(old.texts, finalTexts, (t) => t.content?.trim() || t.title?.trim() || t.id);
        finalSentences = mergeArrays(old.sentences, finalSentences, (s) => s.content?.trim() || s.id);
        finalWords = mergeArrays(old.words, finalWords, (w) => w.content?.trim() || w.id);
        finalCharacters = mergeArrays(old.characters, finalCharacters, (c) => c.content?.trim() || c.id);
        finalRules = mergeArrays(old.rules, finalRules, (r) => r.content?.trim() || r.title?.trim() || r.id);

        // Merge junctions
        const mergedJ = { ...(old.junctions || {}) };
        Object.keys(finalJunctions).forEach((k) => {
          const oldList = Array.isArray(mergedJ[k]) ? mergedJ[k] : [];
          const newList = Array.isArray(finalJunctions[k]) ? finalJunctions[k] : [];
          const jMap = new Map();
          oldList.forEach((j) => jMap.set(JSON.stringify(j), j));
          newList.forEach((j) => jMap.set(JSON.stringify(j), j));
          mergedJ[k] = Array.from(jMap.values());
        });
        finalJunctions = mergedJ;
      }
    }

    const stats = {
      hsksCount: finalHsks.length,
      lessonsCount: finalLessons.length,
      textsCount: finalTexts.length,
      sentencesCount: finalSentences.length,
      wordsCount: finalWords.length,
      charactersCount: finalCharacters.length,
      rulesCount: finalRules.length,
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
            hsks: finalHsks,
            lessons: finalLessons,
            texts: finalTexts,
            sentences: finalSentences,
            words: finalWords,
            characters: finalCharacters,
            rules: finalRules,
            junctions: finalJunctions,
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
