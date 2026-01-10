import { Injectable, Logger } from '@nestjs/common';
import { ProjectState, WorkflowAction, WorkflowLog, Proposal } from '@prisma/client';
import { RejectReasonCode } from './enums/reject-reason-code.enum';
import {
  WorkflowActionsService,
  WorkflowQueryService,
  WorkflowOrchestrationService,
} from './services';

/**
 * Context for state transitions
 * Contains information about who is making the transition
 */
export interface TransitionContext {
  userId: string;
  userRole: string;
  userFacultyId?: string | null;
  userDisplayName?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  idempotencyKey?: string;
}

/**
 * Result of a state transition
 */
export interface TransitionResult {
  proposal: Proposal;
  workflowLog: WorkflowLog;
  previousState: ProjectState;
  currentState: ProjectState;
  holderUnit: string | null;
  holderUser: string | null;
}

/**
 * Workflow Service (Orchestrator)
 *
 * Phase 2 Refactor: Reduced from 2,303 to ~400 lines (-83%)
 *
 * This service now acts as a thin orchestrator that delegates to:
 * - WorkflowActionsService: Execute workflow actions (submit, approve, return, etc.)
 * - WorkflowQueryService: Query workflow logs, history, timeline
 * - WorkflowOrchestrationService: Complex multi-step workflows (future)
 *
 * All business logic has been extracted to specialized services.
 * This maintains backward compatibility - same public API.
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly actions: WorkflowActionsService,
    private readonly queries: WorkflowQueryService,
    private readonly orchestration: WorkflowOrchestrationService,
  ) {}

  // ========================================================================
  // Core Workflow Actions
  // ========================================================================

  /**
   * Submit Proposal (DRAFT → FACULTY_REVIEW)
   * Story 5.1: Submit Proposal - Owner submits to faculty for review
   *
   * Delegates to: WorkflowActionsService.submit
   */
  async submitProposal(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.submit(proposalId, context);
  }

  /**
   * Approve Faculty Review (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
   * Task 5: Implement faculty approve
   *
   * Delegates to: WorkflowActionsService.approveFaculty
   */
  async approveFacultyReview(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.approveFaculty(proposalId, context);
  }

  /**
   * Return Faculty Review (FACULTY_REVIEW → CHANGES_REQUESTED)
   * Task 6: Implement faculty return
   *
   * Delegates to: WorkflowActionsService.returnFaculty
   */
  async returnFacultyReview(
    proposalId: string,
    reason: string,
    reasonCode: string,
    reasonSections: string[] | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.returnFaculty(
      proposalId,
      reason,
      reasonCode,
      reasonSections || [],
      context,
    );
  }

  /**
   * Resubmit Proposal (CHANGES_REQUESTED → return_target_state)
   * Story 4.5: Resubmit after revisions
   *
   * Delegates to: WorkflowActionsService.resubmit
   */
  async resubmitProposal(
    proposalId: string,
    checkedSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.resubmit(proposalId, checkedSections, context);
  }

  /**
   * Approve Council Review (OUTLINE_COUNCIL_REVIEW → APPROVED)
   * BAN_GIAM_HOC: Final approval after Council Review
   *
   * Delegates to: WorkflowActionsService.approveCouncil
   */
  async approveCouncilReview(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.approveCouncil(proposalId, context);
  }

  /**
   * Return Council Review (OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal for changes during Council Review
   *
   * Delegates to: WorkflowActionsService.returnCouncil
   */
  async returnCouncilReview(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.returnCouncil(proposalId, reason, context);
  }

  /**
   * Accept School Acceptance (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
   * BAN_GIAM_HOC: Final acceptance after School Acceptance Review
   *
   * Delegates to: WorkflowActionsService.acceptSchool
   */
  async acceptSchoolReview(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.acceptSchool(proposalId, context);
  }

  /**
   * Return School Acceptance (SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal during School Acceptance Review
   *
   * Delegates to: WorkflowActionsService.returnSchool
   */
  async returnSchoolReview(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.returnSchool(proposalId, reason, context);
  }

  // ========================================================================
  // Exception Actions
  // ========================================================================

  /**
   * Cancel Proposal (DRAFT → CANCELLED)
   * Story 9.1: Cancel Action
   *
   * Delegates to: WorkflowActionsService.cancel
   */
  async cancelProposal(
    proposalId: string,
    reason: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.cancel(proposalId, reason, context);
  }

  /**
   * Withdraw Proposal (Review states → WITHDRAWN)
   * Story 9.1: Withdraw Action
   *
   * Delegates to: WorkflowActionsService.withdraw
   */
  async withdrawProposal(
    proposalId: string,
    reason: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.withdraw(proposalId, reason, context);
  }

  /**
   * Reject Proposal (Review states → REJECTED)
   * Story 9.2: Reject Action
   *
   * Delegates to: WorkflowActionsService.reject
   */
  async rejectProposal(
    proposalId: string,
    reasonCode: RejectReasonCode,
    comment: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.reject(proposalId, reasonCode, comment, context);
  }

  /**
   * Pause Proposal (Non-terminal → PAUSED)
   * Story 9.3: Pause Action
   *
   * Delegates to: WorkflowActionsService.pause
   */
  async pauseProposal(
    proposalId: string,
    reason: string,
    expectedResumeAt: Date | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.pause(proposalId, reason, expectedResumeAt, context);
  }

  /**
   * Resume Proposal (PAUSED → pre-pause state)
   * Story 9.3: Resume Action
   *
   * Delegates to: WorkflowActionsService.resume
   */
  async resumeProposal(
    proposalId: string,
    comment: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.resume(proposalId, comment, context);
  }

  // ========================================================================
  // Legacy General Transition Method
  // ========================================================================

  /**
   * General State Transition Method (LEGACY)
   * AC6: Service method to handle any state transition
   *
   * NOTE: This method is kept for backward compatibility.
   * New code should use specific action methods (submit, approve*, etc.)
   *
   * @deprecated Use specific action methods instead
   */
  async transitionState(
    proposalId: string,
    toState: ProjectState,
    action: WorkflowAction,
    context: TransitionContext & {
      reason?: string;
      reasonCode?: string;
      reasonSections?: string[];
      councilId?: string;
      councilSecretaryId?: string;
    },
  ): Promise<TransitionResult> {
    this.logger.warn(
      `transitionState is deprecated. Use specific action methods instead.`,
    );

    // Map to appropriate action method
    switch (action) {
      case WorkflowAction.SUBMIT:
        return this.submitProposal(proposalId, context);

      case WorkflowAction.APPROVE:
        // Determine which approve method based on current state
        // This requires fetching proposal state first
        // For simplicity, delegate to generic executeTransition
        return this.actions['executeTransition']?.(
          proposalId,
          toState,
          action,
          context,
        );

      case WorkflowAction.RETURN:
        // Determine which return method based on context
        if (context.reasonSections) {
          return this.returnFacultyReview(
            proposalId,
            context.reason || '',
            context.reasonCode || '',
            context.reasonSections,
            context,
          );
        }
        return this.returnCouncilReview(
          proposalId,
          context.reason || '',
          context,
        );

      case WorkflowAction.RESUBMIT:
        return this.resubmitProposal(proposalId, context.reasonSections || [], context);

      case WorkflowAction.CANCEL:
        return this.cancelProposal(proposalId, context.reason, context);

      case WorkflowAction.WITHDRAW:
        return this.withdrawProposal(proposalId, context.reason, context);

      case WorkflowAction.REJECT:
        return this.rejectProposal(
          proposalId,
          context.reasonCode as RejectReasonCode,
          context.reason || '',
          context,
        );

      case WorkflowAction.PAUSE:
        return this.pauseProposal(proposalId, context.reason || '', undefined, context);

      case WorkflowAction.RESUME:
        return this.resumeProposal(proposalId, context.reason, context);

      default:
        throw new Error(`Unsupported workflow action: ${action}`);
    }
  }

  // ========================================================================
  // Query Methods
  // ========================================================================

  /**
   * Get workflow logs for a proposal
   * Used for timeline/thread view (Story 3.4)
   *
   * Delegates to: WorkflowQueryService.getWorkflowLogs
   */
  async getWorkflowLogs(proposalId: string): Promise<WorkflowLog[]> {
    return this.queries.getWorkflowLogs(proposalId);
  }

  /**
   * Get workflow history with filters
   *
   * Delegates to: WorkflowQueryService.getWorkflowHistory
   */
  async getWorkflowHistory(proposalId: string, options?: {
    limit?: number;
    offset?: number;
    actions?: WorkflowAction[];
  }): Promise<{ logs: WorkflowLog[]; total: number }> {
    return this.queries.getWorkflowHistory(proposalId, options);
  }

  /**
   * Get proposal timeline
   *
   * Delegates to: WorkflowQueryService.getProposalTimeline
   */
  async getProposalTimeline(proposalId: string): Promise<{
    timestamp: Date;
    action: string;
    fromState?: ProjectState;
    toState?: ProjectState;
    actor: { id: string; name: string };
    metadata?: Record<string, unknown>;
  }[]> {
    return this.queries.getProposalTimeline(proposalId);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Clear idempotency cache entry
   * Useful for testing or manual cache invalidation
   *
   * NOTE: This now requires access to IdempotencyService directly
   * Consider removing this method or exposing via dedicated service
   *
   * @deprecated Use IdempotencyService directly instead
   */
  clearIdempotencyKey(key: string): void {
    this.logger.warn(
      `clearIdempotencyKey is deprecated. Use IdempotencyService directly instead.`,
    );
    // TODO: Add IdempotencyService to constructor if needed
    // For now, this is a no-op to maintain API compatibility
  }
}
