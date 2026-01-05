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
