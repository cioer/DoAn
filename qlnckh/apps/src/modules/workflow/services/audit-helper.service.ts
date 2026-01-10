import { Injectable, Logger, Inject } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-action.enum';
import { ProjectState, Proposal } from '@prisma/client';

/**
 * Workflow Transition Result
 *
 * Standard output from workflow state transitions.
 * Used for audit logging after successful transitions.
 */
export interface WorkflowTransitionResult {
  proposalId: string;
  proposalCode: string;
  fromState: ProjectState;
  toState: ProjectState;
  action: string;
  holderUnit: string | null;
  holderUser: string | null;
  slaStartDate?: Date;
  slaDeadline?: Date;
  councilId?: string | null;
  returnTargetState?: ProjectState;
  returnTargetHolderUnit?: string | null;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Workflow Context
 *
 * Standard context passed through workflow operations.
 */
export interface WorkflowContext {
  userId: string;
  userDisplayName?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  facultyId?: string;
  role?: string;
}

/**
 * Audit Helper Service for Workflow
 *
 * Provides streamlined audit logging for workflow operations.
 * Extracts repeated audit event creation logic from WorkflowService.
 *
 * Features:
 * - Standardized workflow event logging
 * - Automatic metadata construction from transition results
 * - Retry logic with exponential backoff for transient failures
 * - Type-safe event construction
 *
 * Refactored from WorkflowService audit logging patterns.
 */
@Injectable()
export class AuditHelperService {
  private readonly logger = new Logger(AuditHelperService.name);

  // Default max retries for audit logging
  private readonly DEFAULT_MAX_RETRIES = 3;

  // Base delay for exponential backoff (milliseconds)
  private readonly BASE_RETRY_DELAY = 100;

  constructor(private auditService: AuditService) {}

  /**
   * Log a workflow transition event
   *
   * Main entry point for workflow audit logging.
   * Builds audit event from transition result and context,
   * then logs with retry logic.
   *
   * @param result - Workflow transition result
   * @param context - Workflow operation context
   * @param maxRetries - Maximum retry attempts (default: 3)
   *
   * @example
   * ```typescript
   * const result = await this.workflowService.submitProposal(context);
   * await this.auditHelper.logWorkflowTransition(result, context);
   * ```
   */
  async logWorkflowTransition(
    result: WorkflowTransitionResult,
    context: WorkflowContext,
    maxRetries: number = this.DEFAULT_MAX_RETRIES,
  ): Promise<void> {
    const event = this.buildAuditEvent(result, context);
    await this.sendWithRetry(event, maxRetries);
  }

  /**
   * Build audit event from workflow transition result
   *
   * Constructs standardized audit event payload including:
   * - Action (from result.action or mapped from action/state)
   * - Actor information
   * - Entity (Proposal)
   * - Metadata (transition details, SLA info, holder info)
   *
   * @param result - Workflow transition result
   * @param context - Workflow operation context
   * @returns Audit event DTO
   */
  buildAuditEvent(
    result: WorkflowTransitionResult,
    context: WorkflowContext,
  ): {
    action: AuditAction;
    actorUserId: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    requestId?: string;
  } {
    // Map result.action to AuditAction with smart mapping
    let auditAction: AuditAction;
    if (this.isValidAuditAction(result.action)) {
      // Already a valid AuditAction
      auditAction = result.action as AuditAction;
    } else {
      // Try to map common action strings to AuditAction
      auditAction = this.mapActionToAuditAction(result.action);
    }

    // Build metadata with common fields
    const metadata: Record<string, unknown> = {
      proposalCode: result.proposalCode,
      fromState: result.fromState,
      toState: result.toState,
      holderUnit: result.holderUnit,
    };

    // Add optional fields if present
    if (result.holderUser) {
      metadata.holderUser = result.holderUser;
    }

    if (result.slaStartDate) {
      metadata.slaStartDate = result.slaStartDate.toISOString();
    }

    if (result.slaDeadline) {
      metadata.slaDeadline = result.slaDeadline.toISOString();
    }

    if (result.councilId) {
      metadata.councilId = result.councilId;
    }

    if (result.returnTargetState) {
      metadata.returnTargetState = result.returnTargetState;
    }

    if (result.returnTargetHolderUnit) {
      metadata.returnTargetHolderUnit = result.returnTargetHolderUnit;
    }

    if (result.reason) {
      metadata.reason = result.reason;
    }

    // Add any additional fields from result
    Object.keys(result).forEach((key) => {
      if (
        ![
          'proposalId',
          'proposalCode',
          'fromState',
          'toState',
          'action',
          'holderUnit',
          'holderUser',
          'slaStartDate',
          'slaDeadline',
          'councilId',
          'returnTargetState',
          'returnTargetHolderUnit',
          'reason',
        ].includes(key)
      ) {
        metadata[key] = result[key];
      }
    });

    return {
      action: auditAction,
      actorUserId: context.userId,
      entityType: 'Proposal',
      entityId: result.proposalId,
      metadata,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    };
  }

  /**
   * Send audit event with retry logic
   *
   * Implements exponential backoff retry for transient failures.
   * Delays: 100ms, 200ms, 400ms, ...
   *
   * @param event - Audit event to log
   * @param maxRetries - Maximum retry attempts
   *
   * @example
   * ```typescript
   * await this.sendWithRetry(event, 3);
   * // Attempts: immediate, 100ms, 200ms, 400ms (if needed)
   * ```
   */
  async sendWithRetry(
    event: {
      action: AuditAction;
      actorUserId: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown>;
      ip?: string;
      userAgent?: string;
      requestId?: string;
    },
    maxRetries: number,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Inject AuditService dynamically to avoid circular dependency
        const auditService = this.getAuditService();
        await auditService.logEvent(event);

        if (attempt > 0) {
          this.logger.log(
            `Audit event logged after ${attempt} retries: ${event.action} on ${event.entityType}:${event.entityId}`,
          );
        }

        return;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt);
        this.logger.warn(
          `Audit log attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms: ${error.message}`,
        );

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    this.logger.error(
      `Failed to log audit event after ${maxRetries + 1} attempts: ${event.action} on ${event.entityType}:${event.entityId}`,
      lastError?.stack,
    );
  }

  /**
   * Get AuditService instance
   *
   * Returns the injected AuditService.
   *
   * @private
   */
  private getAuditService(): AuditService {
    return this.auditService;
  }

  /**
   * Check if error is retryable
   *
   * Retryable errors:
   * - Network errors (ECONNRESET, ETIMEDOUT)
   * - Database connection errors
   * - Transient Prisma errors (P2034 serialization failure)
   *
   * Non-retryable errors:
   * - Validation errors
   * - Permission errors
   * - Data integrity errors
   *
   * @param error - Error to check
   * @returns true if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    // Handle both Error objects and plain objects with code property
    const message = error instanceof Error ? error.message?.toLowerCase() || '' : String(error).toLowerCase();
    const code = (error as any)?.code;

    // Network errors
    if (
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('enotfound') ||
      message.includes('econnrefused')
    ) {
      return true;
    }

    // Prisma transient errors (check code or message)
    if (code === 'P2034' || message.includes('p2034') || message.includes('serialization failure')) {
      return true;
    }

    // Database connection errors
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('database')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Map action string to AuditAction
   *
   * Handles common workflow action strings and maps them to appropriate AuditAction values.
   * Provides smart mapping for:
   * - Direct AuditAction values (pass through)
   * - Common workflow actions (SUBMIT, RESUBMIT, APPROVE, etc.)
   * - Custom actions (fallback to WORKFLOW_ prefix)
   *
   * @param action - Action string to map
   * @returns Mapped AuditAction
   */
  private mapActionToAuditAction(action: string): AuditAction {
    // Define common mappings
    const actionMap: Record<string, AuditAction> = {
      'SUBMIT': AuditAction.PROPOSAL_SUBMIT,
      'RESUBMIT': AuditAction.PROPOSAL_RESUBMIT,
      'APPROVE': AuditAction.PROPOSAL_SUBMIT, // Generic approve
      'FACULTY_APPROVE': 'FACULTY_APPROVE' as AuditAction,
      'SCHOOL_APPROVE': 'SCHOOL_APPROVE' as AuditAction,
      'RETURN': AuditAction.FACULTY_RETURN,
      'FACULTY_RETURN': AuditAction.FACULTY_RETURN,
      'REJECT': AuditAction.PROPOSAL_REJECT,
      'CANCEL': AuditAction.PROPOSAL_CANCEL,
      'WITHDRAW': AuditAction.PROPOSAL_WITHDRAW,
      'PAUSE': AuditAction.PROPOSAL_PAUSE,
      'RESUME': AuditAction.PROPOSAL_RESUME,
      'ACCEPT': AuditAction.FACULTY_ACCEPT,
      'FACULTY_ACCEPT': AuditAction.FACULTY_ACCEPT,
      'SCHOOL_ACCEPT': AuditAction.SCHOOL_ACCEPT,
      'ASSIGN_COUNCIL': 'ASSIGN_COUNCIL' as AuditAction,
      'COUNCIL_APPROVE': 'COUNCIL_APPROVE' as AuditAction,
      'COUNCIL_REJECT': 'COUNCIL_REJECT' as AuditAction,
    };

    // Check direct mapping
    if (actionMap[action]) {
      return actionMap[action];
    }

    // Fallback: construct action with WORKFLOW_ prefix
    return `WORKFLOW_${action}` as AuditAction;
  }

  /**
   * Type guard to check if string is valid AuditAction
   *
   * @param value - Value to check
   * @returns true if value is valid AuditAction
   */
  private isValidAuditAction(value: string): boolean {
    return Object.values(AuditAction).includes(value as AuditAction);
  }

  /**
   * Log multiple workflow transitions in batch
   *
   * Useful for bulk operations where you want to log
   * multiple transitions efficiently.
   *
   * @param results - Array of workflow transition results
   * @param context - Shared workflow context
   * @param maxRetries - Maximum retry attempts per event
   *
   * @example
   * ```typescript
   * const results = await this.workflowService.bulkApprove(proposalIds, context);
   * await this.auditHelper.logWorkflowTransitionsBatch(results, context);
   * ```
   */
  async logWorkflowTransitionsBatch(
    results: WorkflowTransitionResult[],
    context: WorkflowContext,
    maxRetries: number = this.DEFAULT_MAX_RETRIES,
  ): Promise<void> {
    const promises = results.map((result) =>
      this.logWorkflowTransition(result, context, maxRetries),
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get service health/stats
   *
   * Useful for health checks and monitoring.
   *
   * @returns Service statistics
   */
  getStats() {
    return {
      service: 'AuditHelperService',
      defaultMaxRetries: this.DEFAULT_MAX_RETRIES,
      baseRetryDelay: this.BASE_RETRY_DELAY,
    };
  }
}
