const prisma = require('../backend/src/services/prisma');

async function testQuery() {
  const activeBedSession = await prisma.monitoringSession.findFirst({
    where: { bedNumber: 2, status: 'ACTIVE' },
    include: { student: { include: { user: true } } }
  });

  console.log('Result of findFirst for Bed 2 ACTIVE:');
  console.log(JSON.stringify(activeBedSession, null, 2));

  process.exit(0);
}

testQuery().catch(console.error);
