const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('lnmiit_healthcare');
    const result = await db.collection('riskEvent').deleteMany({});
    console.log(`Deleted ${result.deletedCount} legacy riskEvent records.`);
    
    // Also clean any mock notification records referencing old test alerts
    const notifResult = await db.collection('notification').deleteMany({ type: { $in: ['EMERGENCY_ALERT', 'RISK_ALERT'] } });
    console.log(`Deleted ${notifResult.deletedCount} legacy alert notifications.`);
  } catch (err) {
    console.error('Purge error:', err);
  } finally {
    await client.close();
  }
}

main();
