const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get proposal
  const proposal = await prisma.proposal.findUnique({
    where: { code: 'DT-004' }
  });
  
  console.log('Proposal:', proposal?.code, 'holder:', proposal?.holderUser);
  
  // Get secretary
  const secretary = await prisma.user.findUnique({
    where: { email: 'thuky@mail.com' }
  });
  
  console.log('Secretary:', secretary?.email, secretary?.id);
  
  // Update proposal holder
  await prisma.proposal.update({
    where: { code: 'DT-004' },
    data: { holderUser: secretary.id }
  });
  
  console.log('Updated proposal holder to secretary');
}

main().catch(console.error).finally(() => prisma.$disconnect());
