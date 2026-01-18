const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

(async () => {
  try {
    // Set password to 'hieutruong'
    const passwordHash = await bcrypt.hash('hieutruong', 12);

    const user = await prisma.user.updateMany({
      where: { email: 'hieutruong@mail.com' },
      data: { passwordHash }
    });

    console.log('✅ Password reset for hieutruong@mail.com');
    console.log('New password: hieutruong');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
