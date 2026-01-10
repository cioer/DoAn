import { PrismaClient, Permission } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Permission Constants
 *
 * Mirrors the Permission enum in Prisma schema.
 * Used for seeding default permissions.
 */
export const PERMISSIONS: Permission[] = [
  Permission.USER_MANAGE,
  Permission.DEMO_SWITCH_PERSONA,
  Permission.DEMO_RESET,
  Permission.CALENDAR_MANAGE,
  Permission.DASHBOARD_VIEW,
  Permission.AUDIT_VIEW,
  Permission.PROPOSAL_CREATE,
  Permission.PROPOSAL_EDIT,
  Permission.VIEW_EVALUATION_RESULTS,
  Permission.EXPORT_PROPOSAL_PDF,
  Permission.FORM_TEMPLATE_IMPORT,
];

/**
 * Display names for permissions (for admin UI)
 */
export const PERMISSION_DISPLAY_NAMES: Record<Permission, string> = {
  [Permission.USER_MANAGE]: 'Quản lý người dùng',
  [Permission.DEMO_SWITCH_PERSONA]: 'Demo: Chuyển persona',
  [Permission.DEMO_RESET]: 'Demo: Reset dữ liệu',
  [Permission.CALENDAR_MANAGE]: 'Quản lý lịch làm việc',
  [Permission.DASHBOARD_VIEW]: 'Xem dashboard',
  [Permission.AUDIT_VIEW]: 'Xem audit log',
  [Permission.PROPOSAL_CREATE]: 'Tạo đề tài mới',
  [Permission.PROPOSAL_EDIT]: 'Sửa đề tài',
  [Permission.VIEW_EVALUATION_RESULTS]: 'Xem kết quả đánh giá',
  [Permission.EXPORT_PROPOSAL_PDF]: 'Xuất đề tài ra PDF',
  [Permission.FORM_TEMPLATE_IMPORT]: 'Import biểu mẫu từ Word',
};

/**
 * Get all available permissions
 */
export function getAllPermissions(): Permission[] {
  return PERMISSIONS;
}

/**
 * Get display name for a permission
 */
export function getPermissionDisplayName(permission: Permission): string {
  return PERMISSION_DISPLAY_NAMES[permission];
}

/**
 * Run the seed function (for standalone execution)
 */
async function main(): Promise<void> {
  console.log('🔑 Available permissions:');
  for (const permission of PERMISSIONS) {
    console.log(`  - ${permission} (${PERMISSION_DISPLAY_NAMES[permission]})`);
  }
  console.log(`\n✨ Total: ${PERMISSIONS.length} permissions`);
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { main };
