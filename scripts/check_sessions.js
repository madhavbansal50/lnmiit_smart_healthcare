const prisma = require('../backend/src/services/prisma');

async function check() {
  const allSessions = await prisma.monitoringSession.findMany({
    where: { status: 'ACTIVE' },
    include: {
      student: { include: { user: true } }
    }
  });

  console.log('ACTIVE SESSIONS IN DB:');
  console.log(JSON.stringify(allSessions, null, 2));

  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
