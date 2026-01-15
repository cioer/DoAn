import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAdmin() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@admin.com' },
    select: { id: true, email: true, role: true, facultyId: true, displayName: true }
  });
  console.log('Admin user:', JSON.stringify(admin, null, 2));

  const proposal = await prisma.proposal.findUnique({
    where: { id: 'e22f8c6d-8132-49bd-b219-2cab5b47c7b6' },
    select: { id: true, code: true, ownerId: true, facultyId: true, state: true }
  });
  console.log('Proposal:', JSON.stringify(proposal, null, 2));

  await prisma.$disconnect();
}
checkAdmin().catch(console.error);
