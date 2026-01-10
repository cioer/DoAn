const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const permissions = await prisma.rolePermission.findMany({ where: { role: 'ADMIN' } });
  console.log('ADMIN Role Permissions:', permissions.length);
  permissions.forEach(p => console.log(' -', p.permission));
}
main().finally(() => prisma.$disconnect());
