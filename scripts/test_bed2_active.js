const prisma = require('../backend/src/services/prisma');

async function testQuery() {
  const activeSessions = await prisma.monitoringSession.findMany({
    where: { status: 'ACTIVE' }
  });

  console.log('ACTIVE SESSIONS IN DB:', activeSessions);
  process.exit(0);
}

testQuery().catch(console.error);
