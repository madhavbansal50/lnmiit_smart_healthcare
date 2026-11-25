const prisma = require('../backend/src/services/prisma');

async function testStart() {
  const student = await prisma.studentProfile.findFirst({
    where: { rollNumber: '21UEC045' },
    include: { user: true }
  });
  console.log('Found student:', student ? student.user.firstName + ' ' + student.user.lastName : 'None');

  const firstDoctor = await prisma.doctorProfile.findFirst();
  console.log('Found doctor:', firstDoctor);

  const device = await prisma.device.findFirst({
    where: { bedNumber: 1 }
  });
  console.log('Found device:', device);

  console.log('All queries succeeded without throwing TypeError!');
  process.exit(0);
}

testStart().catch(console.error);
