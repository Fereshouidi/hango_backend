const { Update } = require('../models');

/**
 * Compare two semantic version strings (e.g. "1.2.0" vs "1.1.9")
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
function compareVersions(v1, v2) {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  const clean1 = String(v1).replace(/^v/i, '').trim();
  const clean2 = String(v2).replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const length = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * GET /api/updates/check
 * Check if a newer version of the app exists for the client
 * Query params:
 *   - version (e.g. "1.0.0")
 *   - build (e.g. 1)
 *   - platform (e.g. "android", "ios", "web")
 */
async function checkUpdate(req, res) {
  try {
    const clientVersion = (req.query.version || '1.0.0').trim();
    const clientBuild = Number(req.query.build || req.query.buildNumber) || 0;
    const platform = (req.query.platform || 'all').trim().toLowerCase();

    // Query active updates for this platform or 'all'
    const platformFilter =
      platform && platform !== 'all'
        ? { platform: { $in: [platform, 'all'] } }
        : {};

    const latest = await Update.findOne({
      isActive: true,
      ...platformFilter,
    }).sort({ buildNumber: -1, createdAt: -1 });

    if (!latest) {
      return res.json({
        updateAvailable: false,
        currentVersion: clientVersion,
        message: 'No updates found. You are running the latest version.',
      });
    }

    // Determine if latest is newer than client
    let isNewer = false;

    if (latest.buildNumber && clientBuild > 0) {
      isNewer = latest.buildNumber > clientBuild;
    } else {
      isNewer = compareVersions(latest.version, clientVersion) > 0;
    }

    if (!isNewer) {
      return res.json({
        updateAvailable: false,
        currentVersion: clientVersion,
        latestVersion: latest.version,
        message: 'You are on the latest version.',
      });
    }

    // Determine if update is mandatory
    let isMandatory = Boolean(latest.isMandatory);

    // If a minimum supported version is specified, check against it
    if (latest.minSupportedVersion) {
      if (compareVersions(latest.minSupportedVersion, clientVersion) > 0) {
        isMandatory = true;
      }
    }

    // If a minimum supported build number is specified, check against it
    if (latest.minSupportedBuildNumber && clientBuild > 0) {
      if (latest.minSupportedBuildNumber > clientBuild) {
        isMandatory = true;
      }
    }

    res.json({
      updateAvailable: true,
      currentVersion: clientVersion,
      latestVersion: latest.version,
      isMandatory,
      update: {
        id: latest._id.toString(),
        version: latest.version,
        buildNumber: latest.buildNumber || 1,
        title: latest.title || `HanGo ${latest.version} Available!`,
        description: latest.description || 'A new update is available for HanGo.',
        releaseNotes: Array.isArray(latest.releaseNotes)
          ? latest.releaseNotes
          : (latest.description || '')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
        downloadUrl: latest.downloadUrl,
        isMandatory,
        platform: latest.platform || 'all',
        releasedAt: latest.createdAt || latest.updatedAt,
      },
    });
  } catch (error) {
    console.error('[CheckUpdate Error]', error);
    res.status(500).json({ error: 'Failed to check for updates.' });
  }
}

/**
 * GET /api/updates/latest
 * Get the latest active update
 */
async function getLatestUpdate(req, res) {
  try {
    const platform = (req.query.platform || 'all').trim().toLowerCase();

    const platformFilter =
      platform && platform !== 'all'
        ? { platform: { $in: [platform, 'all'] } }
        : {};

    const latest = await Update.findOne({ isActive: true, ...platformFilter }).sort({
      buildNumber: -1,
      createdAt: -1,
    });

    if (!latest) {
      return res.status(404).json({ error: 'No active updates found.' });
    }

    res.json(latest);
  } catch (error) {
    console.error('[GetLatestUpdate Error]', error);
    res.status(500).json({ error: 'Failed to fetch latest update.' });
  }
}

/**
 * GET /api/updates
 * List all update records (for admin or changelog)
 */
async function getAllUpdates(req, res) {
  try {
    const updates = await Update.find({}).sort({ createdAt: -1 });
    res.json(updates);
  } catch (error) {
    console.error('[GetAllUpdates Error]', error);
    res.status(500).json({ error: 'Failed to fetch updates list.' });
  }
}

/**
 * POST /api/updates
 * Create and publish a new app update (Admin)
 */
async function createUpdate(req, res) {
  try {
    const {
      version,
      buildNumber,
      title,
      description,
      releaseNotes,
      downloadUrl,
      isMandatory,
      minSupportedVersion,
      minSupportedBuildNumber,
      platform,
      isActive,
    } = req.body;

    if (!version || !downloadUrl) {
      return res.status(400).json({
        error: 'Both "version" and "downloadUrl" are required.',
      });
    }

    // Auto-calculate buildNumber if not provided
    let calculatedBuild = Number(buildNumber);
    if (!calculatedBuild) {
      const highest = await Update.findOne({}).sort({ buildNumber: -1 });
      calculatedBuild = highest && highest.buildNumber ? highest.buildNumber + 1 : 1;
    }

    // Format release notes array
    let notes = [];
    if (Array.isArray(releaseNotes)) {
      notes = releaseNotes;
    } else if (typeof description === 'string') {
      notes = description
        .split('\n')
        .map((s) => s.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    }

    const newDoc = await Update.create({
      version: version.trim(),
      buildNumber: calculatedBuild,
      title: title ? title.trim() : `HanGo Version ${version.trim()}`,
      description: description ? description.trim() : '',
      releaseNotes: notes,
      downloadUrl: downloadUrl.trim(),
      isMandatory: Boolean(isMandatory),
      minSupportedVersion: minSupportedVersion ? minSupportedVersion.trim() : null,
      minSupportedBuildNumber: minSupportedBuildNumber
        ? Number(minSupportedBuildNumber)
        : null,
      platform: platform ? platform.trim().toLowerCase() : 'all',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      message: 'Update published successfully!',
      update: {
        id: newDoc._id.toString(),
        version: newDoc.version,
        buildNumber: newDoc.buildNumber,
        title: newDoc.title,
        description: newDoc.description,
        releaseNotes: newDoc.releaseNotes,
        downloadUrl: newDoc.downloadUrl,
        isMandatory: newDoc.isMandatory,
        platform: newDoc.platform,
        isActive: newDoc.isActive,
        createdAt: newDoc.createdAt,
      },
    });
  } catch (error) {
    console.error('[CreateUpdate Error]', error);
    res.status(500).json({ error: 'Failed to create update record.' });
  }
}

/**
 * PUT /api/updates/:id
 * Modify an existing update (Admin)
 */
async function updateUpdate(req, res) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    const updated = await Update.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    if (!updated) {
      return res.status(404).json({ error: 'Update not found.' });
    }

    res.json({ message: 'Update record modified successfully!', update: updated });
  } catch (error) {
    console.error('[UpdateUpdate Error]', error);
    res.status(500).json({ error: 'Failed to update record.' });
  }
}

/**
 * DELETE /api/updates/:id
 * Remove an update record (Admin)
 */
async function deleteUpdate(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Update.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Update not found.' });
    }

    res.json({ message: 'Update record removed successfully!' });
  } catch (error) {
    console.error('[DeleteUpdate Error]', error);
    res.status(500).json({ error: 'Failed to delete update record.' });
  }
}

module.exports = {
  checkUpdate,
  getLatestUpdate,
  getAllUpdates,
  createUpdate,
  updateUpdate,
  deleteUpdate,
};
