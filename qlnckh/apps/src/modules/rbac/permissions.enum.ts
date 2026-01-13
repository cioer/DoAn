/**
 * Permission Enum
 *
 * Defines all available permissions in system for RBAC.
 * Permissions are used with @RequirePermissions() decorator on endpoints.
 *
 * Epic 1 Scope: User management, Demo features, Calendar, Audit
 * Additional permissions will be added in later epics (workflow, proposals, evaluations)
 */
export enum Permission {
  // User Management
  USER_MANAGE = 'USER_MANAGE',
  USER_VIEW = 'USER_VIEW', // Read-only access to user list (for bulk operations, etc.)

  // Demo Features
  DEMO_SWITCH_PERSONA = 'DEMO_SWITCH_PERSONA',
  DEMO_RESET = 'DEMO_RESET',

  // Calendar
  CALENDAR_MANAGE = 'CALENDAR_MANAGE',

  // Dashboard (Story 11.2)
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',

  // Audit
  AUDIT_VIEW = 'AUDIT_VIEW',

  // Proposal Permissions (GIANG_VIEN Features)
  PROPOSAL_CREATE = 'PROPOSAL_CREATE',
  PROPOSAL_EDIT = 'PROPOSAL_EDIT',

  // Evaluation Results (GIANG_VIEN Feature - View own evaluation results)
  VIEW_EVALUATION_RESULTS = 'VIEW_EVALUATION_RESULTS',

  // Export Proposal PDF (GIANG_VIEN Feature)
  EXPORT_PROPOSAL_PDF = 'EXPORT_PROPOSAL_PDF',

  // Form Template Management (ADMIN)
  FORM_TEMPLATE_IMPORT = 'FORM_TEMPLATE_IMPORT',

  // Faculty Management (QUAN_LY_KHOA Features)
  FACULTY_APPROVE = 'FACULTY_APPROVE', // Approve proposal at faculty level
  FACULTY_RETURN = 'FACULTY_RETURN', // Return proposal for revision
  PROPOSAL_VIEW_FACULTY = 'PROPOSAL_VIEW_FACULTY', // View proposals from own faculty
  FACULTY_DASHBOARD_VIEW = 'FACULTY_DASHBOARD_VIEW', // Access faculty dashboard
  FACULTY_USER_MANAGE = 'FACULTY_USER_MANAGE', // Manage users within own faculty
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
