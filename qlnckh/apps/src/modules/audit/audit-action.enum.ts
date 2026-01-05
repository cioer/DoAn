/**
 * Audit Action Enum
 *
 * Defines all possible audit event action types.
 * Used with AuditService.logEvent() to track system events.
 */
export enum AuditAction {
  // Auth events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAIL = 'LOGIN_FAIL',
  LOGOUT = 'LOGOUT',

  // User management events
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',

  // Demo mode events (Story 1.5)
  DEMO_PERSONA_SWITCH = 'DEMO_PERSONA_SWITCH',
  DEMO_RESET = 'DEMO_RESET',

  // Holiday events (Story 1.8)
  HOLIDAY_CREATE = 'HOLIDAY_CREATE',
  HOLIDAY_UPDATE = 'HOLIDAY_UPDATE',
  HOLIDAY_DELETE = 'HOLIDAY_DELETE',
}

/**
 * Type guard to check if a string is a valid AuditAction
 */
export function isValidAuditAction(value: string): value is AuditAction {
  return Object.values(AuditAction).includes(value as AuditAction);
}
