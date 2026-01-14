/**
 * Workflow Constants
 *
 * Centralized constants for workflow module to avoid magic strings
 */

/**
 * Special unit codes used in workflow holder assignment
 * These represent organizational units that are not standard Faculties
 */
export const SPECIAL_UNIT_CODES = {
  PHONG_KHCN: 'PHONG_KHCN',
} as const;

/**
 * Role-based authorization matrix
 * Maps workflow actions to roles that can perform them
 * Epic 9: Updated with exception action permissions
 *
 * Note: BGH is a legacy alias for BAN_GIAM_HOC - both are valid
 */
export const ACTION_ROLE_PERMISSIONS = {
  SUBMIT: ['GIANG_VIEN'],
  APPROVE: ['QUAN_LY_KHOA', 'THU_KY_KHOA', 'THU_KY_HOI_DONG', 'BAN_GIAM_HOC', 'BGH'],
  RETURN: ['QUAN_LY_KHOA', 'THU_KY_KHOA', 'THU_KY_HOI_DONG', 'BAN_GIAM_HOC', 'BGH'],
  RESUBMIT: ['GIANG_VIEN'],
  START_PROJECT: ['GIANG_VIEN', 'PHONG_KHCN'],
  SUBMIT_ACCEPTANCE: ['GIANG_VIEN'],
  FACULTY_ACCEPT: ['QUAN_LY_KHOA', 'THU_KY_KHOA'],
  ACCEPT: ['PHONG_KHCN', 'BAN_GIAM_HOC', 'BGH'],
  REJECT: ['QUAN_LY_KHOA', 'PHONG_KHCN', 'THU_KY_HOI_DONG', 'THANH_TRUNG', 'BAN_GIAM_HOC', 'BGH'],
  CANCEL: ['GIANG_VIEN'],
  WITHDRAW: ['GIANG_VIEN'],
  PAUSE: ['PHONG_KHCN'],
  RESUME: ['PHONG_KHCN'],
  FINALIZE: ['PHONG_KHCN', 'GIANG_VIEN'],
  ASSIGN_COUNCIL: ['PHONG_KHCN'],
  HANDOVER_COMPLETE: ['GIANG_VIEN', 'PHONG_KHCN'],
} as const;

/**
 * Check if a user role can perform a specific workflow action
 *
 * @param action - Workflow action to check
 * @param userRole - User's role
 * @returns true if role can perform the action
 */
export function canRolePerformAction(
  action: string,
  userRole: string,
): boolean {
  const allowedRoles = ACTION_ROLE_PERMISSIONS[action as keyof typeof ACTION_ROLE_PERMISSIONS];
  return (allowedRoles as readonly string[] | undefined)?.includes(userRole) ?? false;
}
