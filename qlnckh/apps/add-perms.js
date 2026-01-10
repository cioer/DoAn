const { PrismaClient, Permission } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const newPerms = ['DASHBOARD_VIEW', 'AUDIT_VIEW', 'FORM_TEMPLATE_IMPORT'];
  for (const perm of newPerms) {
    try {
      await prisma.rolePermission.create({
        data: { role: 'ADMIN', permission: perm }
      });
      console.log('✅ Added:', perm);
    } catch (e) {
      if (e.code === 'P2002') {
        console.log('⚠️ Already exists:', perm);
      } else {
        console.log('❌ Error adding', perm, ':', e.message);
      }
    }
  }
  const allPerms = await prisma.rolePermission.findMany({ where: { role: 'ADMIN' } });
  console.log('\nADMIN Role Permissions in DB:', allPerms.length);
  allPerms.forEach(p => console.log(' -', p.permission));
}
main().finally(() => prisma.$disconnect());
