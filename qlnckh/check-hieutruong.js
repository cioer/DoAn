const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'hieutruong@mail.com' },
      select: { id: true, email: true, displayName: true, role: true, facultyId: true }
    });
    console.log('User found:', JSON.stringify(user, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
