const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const { MongoClient } = require('../backend/node_modules/mongodb');

const prisma = new PrismaClient();
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lnmiit_healthcare';

async function migrate() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db();
  console.log('Connected to MongoDB database:', db.databaseName);

  const models = [
    'user',
    'doctorProfile',
    'doctorSpecialization',
    'studentProfile',
    'healthBaseline',
    'monitoringSession',
    'vitalsReading',
    'riskEvent',
    'clinicalNote',
    'prescription',
    'medicalReport',
    'device',
    'notification'
  ];

  for (const model of models) {
    if (prisma[model]) {
      const rows = await prisma[model].findMany();
      const col = db.collection(model);
      await col.deleteMany({});
      if (rows.length > 0) {
        // Map _id = id for MongoDB idiomatic indexing while retaining id
        const docs = rows.map((r) => ({
          _id: r.id,
          ...r
        }));
        await col.insertMany(docs);
        console.log(`✓ Migrated ${rows.length} records into collection '${model}'`);
      } else {
        console.log(`- Collection '${model}' is empty (0 records)`);
      }
    }
  }

  // Create essential indexes
  await db.collection('user').createIndex({ email: 1 }, { unique: true });
  await db.collection('studentProfile').createIndex({ rollNumber: 1 }, { unique: true });
  await db.collection('device').createIndex({ deviceId: 1 }, { unique: true });
  await db.collection('vitalsReading').createIndex({ timestamp: -1 });
  await db.collection('vitalsReading').createIndex({ bedNumber: 1 });

  console.log('\n[SUCCESS] All data and indexes successfully migrated to MongoDB!');
  await mongo.close();
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('[MIGRATION ERROR]', err);
  process.exit(1);
});
