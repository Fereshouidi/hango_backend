/**
 * Quick script to insert or publish an update directly into MongoDB
 * Usage:
 *   node scripts/publishUpdate.js
 */

require('dotenv').config();
const { connectDB } = require('../db/connection');
const { Update } = require('../models');

async function main() {
  try {
    await connectDB();

    const sampleUpdate = {
      version: '1.0.1',
      buildNumber: 2,
      title: 'HanGo v1.0.1 Released!',
      description: 'Major update with cloud sync, online updates, and database model enhancements!',
      releaseNotes: [
        'Cloud sync backup & restore directly on Vercel',
        'Automatic update detection when online',
        'User model tracking of installed app version',
        'Improved study session performance and bug fixes',
      ],
      downloadUrl: 'https://github.com/Fereshouidi/hango/releases',
      isMandatory: false,
      minSupportedVersion: '1.0.0',
      platform: 'all',
      isActive: true,
    };

    // Upsert by version using Mongoose Update model
    const doc = await Update.findOneAndUpdate(
      { version: sampleUpdate.version },
      { $set: sampleUpdate },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('\n==============================================');
    console.log('Update published successfully to MongoDB!');
    console.log(JSON.stringify(doc, null, 2));
    console.log('==============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error publishing update:', err);
    process.exit(1);
  }
}

main();
