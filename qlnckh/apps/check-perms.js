const { PrismaClient, Permission } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Available Permission enum values:');
  console.log(Object.values(Permission));
  const allPerms = await prisma.rolePermission.findMany({ where: { role: 'ADMIN' } });
  console.log('\nADMIN Role Permissions in DB:', allPerms.length);
  allPerms.forEach(p => console.log(' -', p.permission));
}
main().finally(() => prisma.$disconnect());
