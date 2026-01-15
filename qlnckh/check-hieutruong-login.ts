import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkHieuTruong() {
  const hieuTruong = await prisma.user.findUnique({
    where: { email: 'hieutruong@mail.com' },
    select: { id: true, email: true, role: true, displayName: true }
  });
  console.log('HieuTruong user:', JSON.stringify(hieuTruong, null, 2));

  await prisma.$disconnect();
}
checkHieuTruong().catch(console.error);
