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
    Permission.DASHBOARD_VIEW,
    Permission.AUDIT_VIEW,
    Permission.FORM_TEMPLATE_IMPORT, // Form template import from Word
  ],
  PHONG_KHCN: [
    Permission.CALENDAR_MANAGE,
    Permission.DASHBOARD_VIEW,
    Permission.EXPORT_PROPOSAL_PDF, // PHONG_KHCN can export proposals for review
  ],
  GIANG_VIEN: [
    Permission.PROPOSAL_CREATE,
    Permission.PROPOSAL_EDIT,
    Permission.DEMO_SWITCH_PERSONA,
    Permission.VIEW_EVALUATION_RESULTS,    // GIANG_VIEN Feature: View evaluation results
    Permission.EXPORT_PROPOSAL_PDF,        // GIANG_VIEN Feature: Export proposal to PDF
    Permission.DASHBOARD_VIEW,             // GIANG_VIEN Feature: Personal dashboard
  ],
  QUAN_LY_KHOA: [
    Permission.DEMO_SWITCH_PERSONA,
    Permission.FACULTY_APPROVE, // Approve proposal at faculty level
    Permission.FACULTY_RETURN, // Return proposal for revision
    Permission.PROPOSAL_VIEW_FACULTY, // View proposals from own faculty
    Permission.FACULTY_DASHBOARD_VIEW, // Access faculty dashboard
    Permission.FACULTY_USER_MANAGE, // Manage users within own faculty
    Permission.EXPORT_PROPOSAL_PDF, // QUAN_LY_KHOA can export faculty proposals for review
  ],
  THU_KY_KHOA: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  THU_KY_HOI_DONG: [
    Permission.DEMO_SWITCH_PERSONA,
    Permission.DASHBOARD_VIEW, // Council member dashboard
  ],
  THANH_TRUNG: [
    Permission.DEMO_SWITCH_PERSONA,
  ],
  BAN_GIAM_HOC: [
    Permission.DEMO_SWITCH_PERSONA,
    Permission.DASHBOARD_VIEW, // BAN_GIAM_HOC dashboard for school acceptance review
    Permission.EXPORT_PROPOSAL_PDF, // Export proposals for review
  ],
  HOI_DONG: [
    Permission.DEMO_SWITCH_PERSONA,
    Permission.DASHBOARD_VIEW, // Council member dashboard
  ],
  BGH: [
    Permission.DEMO_SWITCH_PERSONA,
    Permission.DASHBOARD_VIEW, // BAN_GIAM_HOC dashboard for school acceptance review
    Permission.EXPORT_PROPOSAL_PDF, // Export proposals for review
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
