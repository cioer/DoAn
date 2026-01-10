/**
 * Permission Enum
 *
 * Mirrors backend Permission enum for type safety.
 * All permission codes must match backend exactly.
 */
export enum Permission {
  // User Management
  USER_MANAGE = 'USER_MANAGE',

  // Demo Features
  DEMO_SWITCH_PERSONA = 'DEMO_SWITCH_PERSONA',
  DEMO_RESET = 'DEMO_RESET',

  // Calendar
  CALENDAR_MANAGE = 'CALENDAR_MANAGE',

  // Dashboard (Story 11.2)
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',

  // Audit
  AUDIT_VIEW = 'AUDIT_VIEW',

  // Proposals (Story 2.2, 2.3)
  PROPOSAL_CREATE = 'PROPOSAL_CREATE',
  PROPOSAL_EDIT = 'PROPOSAL_EDIT',

  // GIANG_VIEN Features
  VIEW_EVALUATION_RESULTS = 'VIEW_EVALUATION_RESULTS',
  EXPORT_PROPOSAL_PDF = 'EXPORT_PROPOSAL_PDF',

  // Form Template Management (ADMIN)
  FORM_TEMPLATE_IMPORT = 'FORM_TEMPLATE_IMPORT',
}

/**
 * Type guard to check if a string is a valid Permission
 */
export function isValidPermission(value: string): value is Permission {
  return Object.values(Permission).includes(value as Permission);
}

/**
 * Get all permissions as an array
 */
export function getAllPermissions(): Permission[] {
  return Object.values(Permission);
}
