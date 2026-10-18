/**
 * Quick script to insert or publish an update directly into MongoDB
 * Usage:
 *   node scripts/publishUpdate.js
 */

require('dotenv').config();
const { connectDB, getUpdatesCollection } = require('../db/connection');

async function main() {
  try {
    await connectDB();
    const updatesCol = getUpdatesCollection();

    const sampleUpdate = {
      version: '1.0.1',
      buildNumber: 2,
      title: 'HanGo v1.0.1 Released!',
      description: 'Major update with cloud sync and online updates!',
      releaseNotes: [
        'Cloud sync backup & restore directly on Vercel',
        'Automatic update detection when online',
        'Improved study session performance and bug fixes',
      ],
      downloadUrl: 'https://github.com/Fereshouidi/hango/releases',
      isMandatory: false,
      minSupportedVersion: '1.0.0',
      platform: 'all',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Upsert by version
    await updatesCol.updateOne(
      { version: sampleUpdate.version },
      { $set: sampleUpdate },
      { upsert: true }
    );

    console.log('\n==============================================');
    console.log('Update published successfully to MongoDB!');
    console.log(JSON.stringify(sampleUpdate, null, 2));
    console.log('==============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error publishing update:', err);
    process.exit(1);
  }
}

main();
