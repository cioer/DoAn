import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkHieuTruong() {
  const hieuTruong = await prisma.user.findUnique({
    where: { email: 'hieutruong@mail.com' },
    select: { id: true, email: true, role: true, facultyId: true, displayName: true }
  });
  console.log('HieuTruong user:', JSON.stringify(hieuTruong, null, 2));

  const proposal = await prisma.proposal.findUnique({
    where: { id: 'e22f8c6d-8132-49bd-b219-2cab5b47c7b6' },
    select: { id: true, code: true, ownerId: true, facultyId: true, state: true }
  });
  console.log('Proposal:', JSON.stringify(proposal, null, 2));

  await prisma.$disconnect();
}
checkHieuTruong().catch(console.error);
