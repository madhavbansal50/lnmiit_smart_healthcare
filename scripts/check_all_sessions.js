const { MongoClient } = require('../backend/node_modules/mongodb');

async function check() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/lnmiit_healthcare');
  await client.connect();
  const db = client.db();

  const sessions = await db.collection('monitoringSession').find({}).toArray();
  console.log(`Total sessions in DB: ${sessions.length}`);
  sessions.forEach(s => {
    console.log(`- ID: ${s.id || s._id}, Bed: ${s.bedNumber} (type: ${typeof s.bedNumber}), Status: ${s.status} (type: ${typeof s.status}), StudentId: ${s.studentId}`);
  });

  const students = await db.collection('studentProfile').find({}).toArray();
  console.log(`Total students in DB: ${students.length}`);
  for (const st of students) {
    const u = await db.collection('user').findOne({ id: st.userId });
    console.log(`- Student: ${u?.firstName} ${u?.lastName}, StudentId: ${st.id}`);
  }

  await client.close();
  process.exit(0);
}

check().catch(console.error);
