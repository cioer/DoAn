/**
 * Permission Enum
 *
 * Defines all available permissions in the system for RBAC.
 * Permissions are used with @RequirePermissions() decorator on endpoints.
 *
 * Epic 1 Scope: User management, Demo features, Calendar
 * Additional permissions will be added in later epics (workflow, proposals, evaluations)
 */
export enum Permission {
  // User Management
  USER_MANAGE = 'USER_MANAGE',

  // Demo Features
  DEMO_SWITCH_PERSONA = 'DEMO_SWITCH_PERSONA',
  DEMO_RESET = 'DEMO_RESET',

  // Calendar
  CALENDAR_MANAGE = 'CALENDAR_MANAGE',
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
