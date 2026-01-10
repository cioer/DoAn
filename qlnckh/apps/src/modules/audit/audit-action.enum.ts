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

  // Proposal events (Story 2.2, 2.3)
  PROPOSAL_CREATE = 'PROPOSAL_CREATE',
  PROPOSAL_UPDATE = 'PROPOSAL_UPDATE',
  PROPOSAL_DELETE = 'PROPOSAL_DELETE',
  PROPOSAL_SUBMIT = 'PROPOSAL_SUBMIT',
  PROPOSAL_RESUBMIT = 'PROPOSAL_RESUBMIT',
  PROPOSAL_AUTO_SAVE = 'PROPOSAL_AUTO_SAVE',

  // Workflow events
  FACULTY_RETURN = 'FACULTY_RETURN',

  // Attachment events (Story 2.4, 2.5)
  ATTACHMENT_UPLOAD = 'ATTACHMENT_UPLOAD',
  ATTACHMENT_REPLACE = 'ATTACHMENT_REPLACE',
  ATTACHMENT_DELETE = 'ATTACHMENT_DELETE',

  // Epic 7: Document Template events (Story 7.2)
  TEMPLATE_UPLOAD = 'TEMPLATE_UPLOAD',
  TEMPLATE_ACTIVATE = 'TEMPLATE_ACTIVATE',
  TEMPLATE_DELETE = 'TEMPLATE_DELETE',

  // Epic 7: Document events (Story 7.3)
  DOC_GENERATED = 'DOC_GENERATED',
  DOC_DOWNLOADED = 'DOC_DOWNLOADED',
  DOC_VERIFIED = 'DOC_VERIFIED',

  // Epic 8: Bulk Actions & Reports
  BULK_ASSIGN = 'BULK_ASSIGN',
  BULK_REMIND = 'BULK_REMIND',
  BULK_REMIND_DRY_RUN = 'BULK_REMIND_DRY_RUN',
  EXPORT_EXCEL = 'EXPORT_EXCEL',
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',

  // Epic 9: Exception Actions (Stories 9.1, 9.2, 9.3)
  PROPOSAL_CANCEL = 'PROPOSAL_CANCEL',
  PROPOSAL_WITHDRAW = 'PROPOSAL_WITHDRAW',
  PROPOSAL_REJECT = 'PROPOSAL_REJECT',
  PROPOSAL_PAUSE = 'PROPOSAL_PAUSE',
  PROPOSAL_RESUME = 'PROPOSAL_RESUME',

  // Epic 10: Backup & Restore (Story 10.6)
  BACKUP_UPLOAD = 'BACKUP_UPLOAD',
  BACKUP_DELETE = 'BACKUP_DELETE',
  RESTORE_STARTED = 'RESTORE_STARTED',
  RESTORE_COMPLETED = 'RESTORE_COMPLETED',
  RESTORE_FAILED = 'RESTORE_FAILED',
  STATE_CORRECTED = 'STATE_CORRECTED',
  STATE_VERIFICATION = 'STATE_VERIFICATION',

  // Epic 6: Acceptance actions (Stories 6.3, 6.4)
  FACULTY_ACCEPT = 'FACULTY_ACCEPT',
  SCHOOL_ACCEPT = 'SCHOOL_ACCEPT',

  // Generic CRUD actions (for backward compatibility)
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
}

/**
 * Type guard to check if a string is a valid AuditAction
 */
export function isValidAuditAction(value: string): value is AuditAction {
  return Object.values(AuditAction).includes(value as AuditAction);
}
