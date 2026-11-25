const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('lnmiit_healthcare');
    const cols = await db.listCollections().toArray();
    console.log('Collections:', cols.map(c => c.name));

    const count = await db.collection('riskEvent').countDocuments();
    console.log(`Total riskEvents: ${count}`);

    const sample = await db.collection('riskEvent').find().limit(3).toArray();
    console.log('Sample riskEvents:', JSON.stringify(sample, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
