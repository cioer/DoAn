import { PrismaClient, UserRole, Permission } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default Role-Permission Mappings
 *
 * Maps each role to its default permissions for Epic 1.
 * Additional permissions will be added in later epics.
 */
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    Permission.USER_MANAGE,
    Permission.DEMO_SWITCH_PERSONA,
    Permission.DEMO_RESET,
    Permission.CALENDAR_MANAGE,
  ],
  PHONG_KHCN: [
    Permission.CALENDAR_MANAGE,
  ],
  GIANG_VIEN: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  QUAN_LY_KHOA: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  THU_KY_KHOA: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  THU_KY_HOI_DONG: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  THANH_TRUNG: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  BAN_GIAM_HOC: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  HOI_DONG: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  BGH: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
};

/**
 * Seed role permissions into the database
 * Uses upsert to avoid duplicates if run multiple times
 */
export async function seedRolePermissions(): Promise<void> {
  console.log('🌱 Seeding role permissions...');

  let createdCount = 0;
  let skippedCount = 0;

  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      try {
        await prisma.rolePermission.upsert({
          where: {
            role_permission: {
              role: role as UserRole,
              permission,
            },
          },
          create: {
            role: role as UserRole,
            permission,
          },
          update: {},
        });
        createdCount++;
      } catch (error) {
        console.error(`Error seeding permission ${permission} for role ${role}:`, error);
        skippedCount++;
      }
    }
  }

  console.log(`✅ Role permissions seeded: ${createdCount} created, ${skippedCount} skipped`);
}

/**
 * Run the seed function
 * Can be executed directly: ts-node apps/src/seeds/role-permissions.seed.ts
 */
async function main(): Promise<void> {
  try {
    await seedRolePermissions();
  } catch (error) {
    console.error('Error seeding role permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✨ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { main };
