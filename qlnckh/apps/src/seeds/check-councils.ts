import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const councils = await prisma.council.findMany({
    include: { members: { include: { user: true } }, secretary: true }
  });
  console.log('\n📋 COUNCILS IN DATABASE:');
  for (const c of councils) {
    console.log(`\n${c.id}: ${c.name} (${c.type})`);
    const secretaryName = c.secretary ? c.secretary.displayName : 'N/A';
    console.log(`  Secretary: ${secretaryName}`);
    console.log(`  Members (${c.members.length}):`);
    for (const m of c.members) {
      console.log(`    - ${m.user.displayName} (${m.role})`);
    }
  }
  await prisma.$disconnect();
}
main();
