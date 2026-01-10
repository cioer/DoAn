const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Adding new permissions to GIANG_VIEN role...');

  const permissionsToAdd = [
    'PROPOSAL_CREATE',
    'PROPOSAL_EDIT',
    'VIEW_EVALUATION_RESULTS',
    'EXPORT_PROPOSAL_PDF',
    'DASHBOARD_VIEW',
  ];

  for (const permission of permissionsToAdd) {
    try {
      await prisma.rolePermission.upsert({
        where: {
          role_permission: {
            role: 'GIANG_VIEN',
            permission: permission,
          },
        },
        create: {
          role: 'GIANG_VIEN',
          permission: permission,
        },
        update: {},
      });
      console.log(`✓ Added permission: ${permission}`);
    } catch (error) {
      console.log(`× Skipped permission: ${permission} (${error.message})`);
    }
  }

  // Verify
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role: 'GIANG_VIEN' },
  });
  console.log('\nGIANG_VIEN permissions:');
  rolePermissions.forEach((rp) => console.log(`  - ${rp.permission}`));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
