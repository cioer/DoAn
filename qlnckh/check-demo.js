const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: { contains: 'demo' }
      },
      select: { id: true, email: true, displayName: true, role: true }
    });
    console.log('Demo users found:', users.length);
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
