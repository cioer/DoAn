import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ProjectState, WorkflowAction, WorkflowLog, Proposal, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  isValidTransition,
  InvalidTransitionError,
  STATE_PHASES,
  isTerminalState,
  getValidNextStates,
} from './helpers/state-machine.helper';
import { getHolderForState } from './helpers/holder-rules.helper';
import {
  SPECIAL_UNIT_CODES,
  canRolePerformAction,
} from './helpers/workflow.constants';
import { SlaService } from '../calendar/sla.service';
import { RejectReasonCode } from './enums/reject-reason-code.enum';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { TransactionService } from '../../../common/services/transaction.service';
import { HolderAssignmentService } from './services/holder-assignment.service';
import { AuditHelperService } from './services/audit-helper.service';

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
 * Workflow Service
 *
 * Handles state machine transitions for proposals.
 * Enforces transition rules, assigns holders, logs workflow events.
 *
 * Critical Rules:
 * - SUBMITTED is EVENT, not STATE (UX-1)
 * - DRAFT → FACULTY_REVIEW is direct transition (no SUBMITTED state)
 * - All transitions must be validated before execution
 * - Workflow logs must record return targets for resubmit logic
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  // Simple in-memory idempotency store (Redis to be added in Epic 3.8)
  // WARNING: This cache does NOT survive server restarts. Duplicate submissions
  // are possible after restart until Redis is implemented.
  // Can store either TransitionResult or Promise<TransitionResult> for race condition handling
  private readonly idempotencyStore = new Map<string, TransitionResult | Promise<TransitionResult>>();

  // Feature flag to enable new refactored services
  // Set to true in .env: WORKFLOW_USE_NEW_SERVICES=true
  private readonly useNewServices = process.env.WORKFLOW_USE_NEW_SERVICES === 'true';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private slaService: SlaService,
    // Phase 1 Refactor: New extracted services
    private validator: WorkflowValidatorService,
    private idempotency: IdempotencyService,
    private transaction: TransactionService,
    private holder: HolderAssignmentService,
    private auditHelper: AuditHelperService,
  ) {}

  /**
   * Get user display name from database
   * Used for audit logs and workflow timeline (M4 fix)
   *
   * @param userId - User ID to fetch
   * @returns Display name or fallback to user role
   */
  private async getUserDisplayName(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      return user?.displayName || userId;
    } catch {
      return userId;
    }
  }

  /**
   * Validate that user has permission to perform the workflow action
   * RBAC validation (M1 fix)
   *
   * @param action - Workflow action being performed
   * @param userRole - User's role
   * @throws BadRequestException if user lacks permission
   */
  private validateActionPermission(
    action: WorkflowAction,
    userRole: string,
  ): void {
    if (!canRolePerformAction(action, userRole)) {
      throw new BadRequestException(
        `Vai trò '${userRole}' không có quyền thực hiện hành động ${action}`,
      );
    }
  }

  /**
   * Submit Proposal (DRAFT → FACULTY_REVIEW)
   * Task 4: Implement submit action
   *
   * AC3: When owner submits proposal:
   * - State transitions DRAFT → FACULTY_REVIEW (direct, NOT through SUBMITTED)
   * - holder_unit = faculty_id of proposal
   * - workflow_logs entry created with action=SUBMIT
   *
   * Phase 1 Refactor: Routes to submitProposalNew if feature flag enabled
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async submitProposal(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Phase 1 Refactor: Use new implementation if feature flag is enabled
    if (this.useNewServices) {
      this.logger.debug('Using NEW refactored submitProposal implementation');
      return this.submitProposalNew(proposalId, context);
    }

    // Original implementation (fallback)
    this.logger.debug('Using ORIGINAL submitProposal implementation');
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Get proposal with current state
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in DRAFT state
    if (proposal.state !== ProjectState.DRAFT) {
      throw new BadRequestException(
        `Chỉ có thể nộp đề tài ở trạng thái NHÁP (DRAFT). Hiện tại: ${proposal.state}`,
      );
    }

    // Validate: Only owner can submit
    if (proposal.ownerId !== context.userId) {
      throw new BadRequestException(
        'Chỉ chủ nhiệm đề tài mới có thể nộp hồ sơ',
      );
    }

    // RBAC validation (M1 fix)
    this.validateActionPermission(WorkflowAction.SUBMIT, context.userRole);

    // Validate transition
    if (
      !isValidTransition(
        proposal.state,
        ProjectState.FACULTY_REVIEW,
        WorkflowAction.SUBMIT,
      )
    ) {
      throw new InvalidTransitionError(
        proposal.state,
        ProjectState.FACULTY_REVIEW,
        WorkflowAction.SUBMIT,
      );
    }

    // CRITICAL: DRAFT → FACULTY_REVIEW is DIRECT (no SUBMITTED state)
    const toState = ProjectState.FACULTY_REVIEW;
    const holder = getHolderForState(toState, proposal);

    // Get user display name for audit log (M4 fix)
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Story 3.3: Calculate SLA dates
    // Story 3.6: Use calculateDeadlineWithCutoff for proper cutoff time handling
    const slaStartDate = new Date();
    const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(
      slaStartDate,
      3, // 3 business days for faculty review
      17, // 17:00 cutoff hour (5 PM)
    );

    // Execute transition in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update proposal state, holder, and SLA dates
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
          slaStartDate, // Story 3.3: SLA start date
          slaDeadline, // Story 3.3: SLA deadline
        },
      });

      // Create workflow log entry
      // AC3: workflow_logs entry created with action=SUBMIT
      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId,
          action: WorkflowAction.SUBMIT,
          fromState: proposal.state,
          toState,
          actorId: context.userId,
          actorName: actorDisplayName, // M4 fix: use actual display name
          // No return_target needed for submit
        },
      });

      // Log audit event
      await this.auditService.logEvent({
        action: AuditAction.PROPOSAL_SUBMIT,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
          holderUnit: holder.holderUnit,
          slaStartDate: slaStartDate.toISOString(),
          slaDeadline: slaDeadline.toISOString(),
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    // Store in idempotency cache
    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} submitted: ${proposal.state} → ${toState}`,
    );

    return transitionResult;
  }

  /**
   * Submit Proposal - NEW Refactored Implementation
   * Phase 1 Refactor: Uses extracted services
   *
   * This method demonstrates the refactored approach using:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - HolderAssignmentService for holder calculation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
   *
   * Enable with: WORKFLOW_USE_NEW_SERVICES=true
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async submitProposalNew(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.FACULTY_REVIEW;
    const action = WorkflowAction.SUBMIT;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `submit-${proposalId}`,
      async () => {
        // Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // Use WorkflowValidatorService for validation
        await this.validator.validateTransition(
          proposalId,
          toState,
          action,
          {
            proposal,
            user: {
              id: context.userId,
              role: context.userRole,
              facultyId: context.userFacultyId,
            },
          },
        );

        // Calculate holder using HolderAssignmentService
        const holder = this.holder.getHolderForState(
          toState,
          proposal,
          context.userId,
          context.userFacultyId,
        );

        // Get user display name for audit log
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // Calculate SLA dates
        const slaStartDate = new Date();
        const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(
          slaStartDate,
          3, // 3 business days for faculty review
          17, // 17:00 cutoff hour (5 PM)
        );

        // Use TransactionService for transaction orchestration
        const result = await this.transaction.updateProposalWithLog({
          proposalId,
          userId: context.userId,
          userDisplayName: actorDisplayName,
          action,
          fromState: proposal.state,
          toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
          slaStartDate,
          slaDeadline,
        });

        // Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // Use AuditHelperService for audit logging with retry (fire-and-forget)
        // This runs outside the transaction and won't block the response
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: 'SUBMIT',
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
            },
            {
              userId: context.userId,
              userDisplayName: actorDisplayName,
              ip: context.ip,
              userAgent: context.userAgent,
              requestId: context.requestId,
              facultyId: context.userFacultyId,
              role: context.userRole,
            },
          )
          .catch((err) => {
            this.logger.error(
              `Audit log failed for proposal ${proposal.code}: ${err.message}`,
            );
            // Could send to dead letter queue here
          });

        this.logger.log(
          `Proposal ${proposal.code} submitted (NEW): ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Approve Faculty Review (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
   * Task 5: Implement faculty approve
   *
   * AC4: When approver approves:
   * - State transitions FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW
   * - holder_unit = "PHONG_KHCN"
   * - workflow_logs entry with action=APPROVE
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async approveFacultyReview(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Phase 1 Refactor: Use new implementation if feature flag is enabled
    if (this.useNewServices) {
      this.logger.debug('Using NEW refactored approveFacultyReview implementation');
      return this.approveFacultyReviewNew(proposalId, context);
    }

    // Original implementation (fallback)
    this.logger.debug('Using ORIGINAL approveFacultyReview implementation');

    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in FACULTY_REVIEW state
    if (proposal.state !== ProjectState.FACULTY_REVIEW) {
      throw new BadRequestException(
        `Chỉ có thể duyệt đề tài ở trạng thái FACULTY_REVIEW. Hiện tại: ${proposal.state}`,
      );
    }

    // RBAC validation (M1 fix): User must have QUAN_LY_KHOA or THU_KY_KHOA role
    this.validateActionPermission(WorkflowAction.APPROVE, context.userRole);

    // Validate transition
    const toState = ProjectState.SCHOOL_SELECTION_REVIEW;
    if (
      !isValidTransition(
        proposal.state,
        toState,
        WorkflowAction.APPROVE,
      )
    ) {
      throw new InvalidTransitionError(
        proposal.state,
        toState,
        WorkflowAction.APPROVE,
      );
    }

    // AC4: holder_unit = "PHONG_KHCN"
    const holder = getHolderForState(toState, proposal);

    // Get user display name for audit log (M4 fix)
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Execute transition
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        },
      });

      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId,
          action: WorkflowAction.APPROVE,
          fromState: proposal.state,
          toState,
          actorId: context.userId,
          actorName: actorDisplayName, // M4 fix: use actual display name
        },
      });

      // Log audit
      await this.auditService.logEvent({
        action: 'FACULTY_APPROVE' as AuditAction,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
          holderUnit: holder.holderUnit,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} approved by faculty: ${proposal.state} → ${toState}`,
    );

    return transitionResult;
  }

  /**
   * NEW: Approve Faculty Review (Phase 1 Refactor)
   * Uses extracted services for cleaner, more maintainable code
   */
  async approveFacultyReviewNew(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.SCHOOL_SELECTION_REVIEW;
    const action = WorkflowAction.APPROVE;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `approve-faculty-${proposalId}`,
      async () => {
        // Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // Use WorkflowValidatorService for validation
        await this.validator.validateTransition(
          proposalId,
          toState,
          action,
          {
            proposal,
            user: {
              id: context.userId,
              role: context.userRole,
              facultyId: context.userFacultyId,
            },
          },
        );

        // Calculate holder using HolderAssignmentService
        const holder = this.holder.getHolderForState(
          toState,
          proposal,
          context.userId,
          context.userFacultyId,
        );

        // Get user display name for audit log
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // Calculate SLA dates
        const slaStartDate = new Date();
        const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(
          slaStartDate,
          3, // 3 business days for school review
          17, // 17:00 cutoff hour (5 PM)
        );

        // Use TransactionService for transaction orchestration
        const result = await this.transaction.updateProposalWithLog({
          proposalId,
          userId: context.userId,
          userDisplayName: actorDisplayName,
          action,
          fromState: proposal.state,
          toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
          slaStartDate,
          slaDeadline,
        });

        // Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // Use AuditHelperService for audit logging with retry (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: 'APPROVE',
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
            },
            {
              userId: context.userId,
              userDisplayName: actorDisplayName,
              ip: context.ip,
              userAgent: context.userAgent,
              requestId: context.requestId,
              facultyId: context.userFacultyId,
              role: context.userRole,
            },
          )
          .catch((err) => {
            this.logger.error(
              `Audit log failed for proposal ${proposal.code}: ${err.message}`,
            );
          });

        this.logger.log(
          `Proposal ${proposal.code} approved by faculty (NEW): ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Return Faculty Review (FACULTY_REVIEW → CHANGES_REQUESTED)
   * Task 6: Implement faculty return
   *
   * AC5: When approver returns:
   * - State transitions FACULTY_REVIEW → CHANGES_REQUESTED
   * - holder_unit = owner_faculty_id (back to PI)
   * - return_target_state stored in workflow_logs
   *
   * @param proposalId - Proposal ID
   * @param reason - Return reason
   * @param reasonCode - Reason code
   * @param reasonSections - Sections needing revision
   * @param context - Transition context
   * @returns Transition result
   */
  async returnFacultyReview(
    proposalId: string,
    reason: string,
    reasonCode: string,
    reasonSections: string[] | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in FACULTY_REVIEW state
    if (proposal.state !== ProjectState.FACULTY_REVIEW) {
      throw new BadRequestException(
        `Chỉ có thể trả về đề tài ở trạng thái FACULTY_REVIEW. Hiện tại: ${proposal.state}`,
      );
    }

    // Validate transition
    const toState = ProjectState.CHANGES_REQUESTED;
    if (
      !isValidTransition(proposal.state, toState, WorkflowAction.RETURN)
    ) {
      throw new InvalidTransitionError(
        proposal.state,
        toState,
        WorkflowAction.RETURN,
      );
    }

    // RBAC validation (M1 fix): User must have role that can RETURN
    this.validateActionPermission(WorkflowAction.RETURN, context.userRole);

    // AC5: holder_unit = owner_faculty_id (back to PI)
    const holder = getHolderForState(toState, proposal);

    // Get user display name for audit log (M4 fix)
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // AC5: Store return_target_state in workflow_logs
    // When PI resubmits, system reads this to know where to return
    const returnTargetState = proposal.state; // Return to FACULTY_REVIEW
    const returnTargetHolderUnit = proposal.facultyId; // Faculty that was reviewing

    // Build comment JSON with reason and revisionSections (Story 4.2)
    const commentJson = JSON.stringify({
      reason,
      revisionSections: reasonSections || [],
    });

    // Execute transition
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        },
      });

      // AC5: Store return_target_state + return_target_holder_unit + revisionSections
      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId,
          action: WorkflowAction.RETURN,
          fromState: proposal.state,
          toState,
          actorId: context.userId,
          actorName: actorDisplayName, // M4 fix: use actual display name
          returnTargetState,
          returnTargetHolderUnit,
          reasonCode,
          comment: commentJson,
        },
      });

      // Log audit
      await this.auditService.logEvent({
        action: AuditAction.FACULTY_RETURN,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
          returnTargetState,
          returnTargetHolderUnit,
          reasonCode,
          reasonSections,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} returned by faculty: ${proposal.state} → ${toState}`,
    );

    return transitionResult;
  }

  /**
   * Resubmit Proposal (CHANGES_REQUESTED → return_target_state)
   * Story 4.5: Resubmit after revisions - returns to reviewer, NOT to DRAFT
   *
   * AC1: Read return_target from workflow log
   * AC2: State transitions to return_target_state (FACULTY_REVIEW)
   * AC3: Workflow log entry with RESUBMIT action
   *
   * @param proposalId - Proposal ID
   * @param checkedSections - Sections marked as fixed
   * @param context - Transition context
   * @returns Transition result
   */
  async resubmitProposal(
    proposalId: string,
    checkedSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Fix #5: Use promise cache pattern to prevent race condition in idempotency check
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        // If it's a promise, return it (prevents duplicate in-flight requests)
        if (cached instanceof Promise) {
          return cached;
        }
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in CHANGES_REQUESTED state
    if (proposal.state !== ProjectState.CHANGES_REQUESTED) {
      throw new BadRequestException(
        `Chỉ có thể nộp lại đề tài ở trạng thái CHANGES_REQUESTED. Hiện tại: ${proposal.state}`,
      );
    }

    // Validate: Only owner can resubmit
    if (proposal.ownerId !== context.userId) {
      throw new BadRequestException(
        'Chỉ chủ nhiệm đề tài mới có thể nộp lại hồ sơ',
      );
    }

    // RBAC validation: Owner must have GIANG_VIEN role (or allow QUAN_LY_KHOA for admin override)
    this.validateActionPermission(WorkflowAction.RESUBMIT, context.userRole);

    // AC1: Fetch latest RETURN log to get return_target
    const lastReturnLog = await this.prisma.workflowLog.findFirst({
      where: {
        proposalId,
        toState: ProjectState.CHANGES_REQUESTED,
        action: WorkflowAction.RETURN,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastReturnLog) {
      throw new BadRequestException(
        'Không tìm thấy thông tin yêu cầu sửa. Vui lòng liên hệ quản trị viên.',
      );
    }

    // AC1: Extract return target from the RETURN log
    const targetState = lastReturnLog.returnTargetState;
    const targetHolder = lastReturnLog.returnTargetHolderUnit;

    if (!targetState || !targetHolder) {
      throw new BadRequestException(
        'Thông tin return_target không đầy đủ trong log yêu cầu sửa. Vui lòng liên hệ quản trị viên.',
      );
    }

    // Fix #7: Validate checkedSections against revisionSections from RETURN log
    let revisionSections: string[] = [];
    try {
      const commentParsed = JSON.parse(lastReturnLog.comment || '{}');
      revisionSections = commentParsed.revisionSections || [];
    } catch {
      // If parsing fails, assume no revision sections
    }

    // Validate that all checked sections are actually in the revision list
    const invalidSections = checkedSections.filter(
      (section) => !revisionSections.includes(section),
    );
    if (invalidSections.length > 0) {
      throw new BadRequestException(
        `Các section không hợp lệ: ${invalidSections.join(', ')}. Chỉ có thể đánh dấu sửa các section đã được yêu cầu.`,
      );
    }

    // Fix #6: Move getUserDisplayName outside transaction for better performance
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // AC2: Calculate SLA dates (reset timer)
    const slaStartDate = new Date();
    const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(
      slaStartDate,
      3, // 3 business days for re-review
      17, // 17:00 cutoff hour (5 PM)
    );

    // Fix #5: Store promise in cache before transaction starts (prevents race condition)
    const executeResubmit = async (): Promise<TransitionResult> => {
      // Execute transition
      const result = await this.prisma.$transaction(async (tx) => {
        // AC2: Update proposal state to return_target_state (NOT to DRAFT!)
        const updated = await tx.proposal.update({
          where: { id: proposalId },
          data: {
            state: targetState,
            holderUnit: targetHolder,
            holderUser: lastReturnLog.actorId, // Back to the original reviewer
            slaStartDate,
            slaDeadline,
          },
        });

        // AC3: Create workflow log entry with RESUBMIT action
        const workflowLog = await tx.workflowLog.create({
          data: {
            proposalId,
            action: WorkflowAction.RESUBMIT,
            fromState: proposal.state,
            toState: targetState,
            actorId: context.userId,
            actorName: actorDisplayName,
            comment: JSON.stringify({
              returnLogId: lastReturnLog.id,
              checkedSections,
            }),
          },
        });

        // Log audit
        await this.auditService.logEvent({
          action: AuditAction.PROPOSAL_RESUBMIT,
          actorUserId: context.userId,
          entityType: 'Proposal',
          entityId: proposalId,
          metadata: {
            proposalCode: proposal.code,
            fromState: proposal.state,
            toState: targetState,
            returnTargetState: targetState,
            returnTargetHolderUnit: targetHolder,
            checkedSections,
          },
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
        });

        return { proposal: updated, workflowLog };
      });

      const transitionResult: TransitionResult = {
        proposal: result.proposal,
        workflowLog: result.workflowLog,
        previousState: proposal.state,
        currentState: targetState,
        holderUnit: targetHolder,
        holderUser: lastReturnLog.actorId,
      };

      this.logger.log(
        `Proposal ${proposal.code} resubmitted: ${proposal.state} → ${targetState} (returning to ${targetHolder})`,
      );

      return transitionResult;
    };

    // Set the promise as a pending value in cache to prevent duplicate requests
    if (context.idempotencyKey) {
      const resubmitPromise = executeResubmit();
      this.idempotencyStore.set(context.idempotencyKey, resubmitPromise);
      return resubmitPromise;
    }

    return executeResubmit();
  }

  /**
   * General State Transition Method
   * AC6: Service method to handle any state transition
   *
   * @param proposalId - Proposal ID
   * @param toState - Target state
   * @param action - Workflow action
   * @param context - Transition context with optional metadata
   * @returns Transition result
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
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Check if already in terminal state
    if (isTerminalState(proposal.state)) {
      throw new BadRequestException(
        `Đề tài ở trạng thái cuối (${proposal.state}), không thể chuyển tiếp`,
      );
    }

    // RBAC validation (M1 fix)
    this.validateActionPermission(action, context.userRole);

    // Validate transition
    if (!isValidTransition(proposal.state, toState, action)) {
      const validNextStates = getValidNextStates(proposal.state, action);
      throw new BadRequestException(
        `Transition không hợp lệ: ${proposal.state} → ${toState} (action: ${action})` +
          `\nCác trạng thái hợp lệ cho action ${action}: ${validNextStates.join(', ') || 'none'}`,
      );
    }

    // Get holder assignment for target state
    let holder = getHolderForState(toState, proposal);

    // Story 5.2: For ASSIGN_COUNCIL action, use council_id and secretary_id from context
    if (action === WorkflowAction.ASSIGN_COUNCIL && context.councilId) {
      holder = {
        holderUnit: context.councilId,
        holderUser: context.councilSecretaryId || null,
      };
    }

    // Get user display name for audit log (M4 fix)
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Prepare workflow log data
    const workflowLogData: {
      proposalId: string;
      action: WorkflowAction;
      fromState: ProjectState;
      toState: ProjectState;
      actorId: string;
      actorName: string;
      returnTargetState?: ProjectState | null;
      returnTargetHolderUnit?: string | null;
      reasonCode?: string | null;
      comment?: string | null;
    } = {
      proposalId,
      action,
      fromState: proposal.state,
      toState,
      actorId: context.userId,
      actorName: actorDisplayName, // M4 fix: use actual display name
    };

    // Add return target for RETURN actions
    if (action === WorkflowAction.RETURN) {
      workflowLogData.returnTargetState = proposal.state;
      workflowLogData.returnTargetHolderUnit = proposal.holderUnit || proposal.facultyId;
      workflowLogData.reasonCode = context.reasonCode || null;
      // Store revisionSections in comment as JSON (Story 4.2)
      workflowLogData.comment = JSON.stringify({
        reason: context.reason || null,
        revisionSections: context.reasonSections || [],
      });
    }

    // Execute transition
    const result = await this.prisma.$transaction(async (tx) => {
      // Update proposal
      const updateData: {
        state: ProjectState;
        holderUnit: string | null;
        holderUser: string | null;
      } = {
        state: toState,
        holderUnit: holder.holderUnit,
        holderUser: holder.holderUser,
      };

      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: updateData,
      });

      // Create workflow log
      const workflowLog = await tx.workflowLog.create({
        data: workflowLogData,
      });

      // Log audit
      await this.auditService.logEvent({
        action: `WORKFLOW_${action}` as AuditAction,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
          action,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
          reason: context.reason,
          reasonCode: context.reasonCode,
          reasonSections: context.reasonSections,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    // Store in idempotency cache
    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} transition: ${proposal.state} → ${toState} (${action})`,
    );

    return transitionResult;
  }

  /**
   * Get workflow logs for a proposal
   * Used for timeline/thread view (Story 3.4)
   *
   * @param proposalId - Proposal ID
   * @returns Workflow logs in chronological order
   */
  async getWorkflowLogs(proposalId: string): Promise<WorkflowLog[]> {
    return this.prisma.workflowLog.findMany({
      where: { proposalId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Clear idempotency cache entry
   * Useful for testing or manual cache invalidation
   *
   * @param key - Idempotency key to clear
   */
  clearIdempotencyKey(key: string): void {
    this.idempotencyStore.delete(key);
  }

  // ============================================================
  // Epic 9: Exception Actions (Stories 9.1, 9.2, 9.3)
  // ============================================================

  /**
   * Cancel Proposal (DRAFT → CANCELLED)
   * Story 9.1: Cancel Action - Owner can cancel DRAFT proposals
   *
   * Epic 7/8 Retro Pattern:
   * - NO `as unknown` casting
   * - NO `as any` casting
   * - Direct WorkflowAction enum usage
   * - Proper interface typing
   *
   * @param proposalId - Proposal ID
   * @param reason - Optional reason for cancellation
   * @param context - Transition context
   * @returns Transition result
   */
  async cancelProposal(
    proposalId: string,
    reason: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        if (cached instanceof Promise) {
          return cached;
        }
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Fetch proposal with proper typing (Epic 7/8 retro pattern)
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // State validation - Cancel only from DRAFT
    if (proposal.state !== ProjectState.DRAFT) {
      throw new BadRequestException(
        'Chỉ có thể hủy đề tài ở trạng thái Nháp (DRAFT)',
      );
    }

    // Ownership check - Only owner can cancel
    if (proposal.ownerId !== context.userId) {
      throw new ForbiddenException('Bạn không có quyền hủy đề tài này');
    }

    // RBAC validation
    this.validateActionPermission(WorkflowAction.CANCEL, context.userRole);

    // Get user display name
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    const executeCancel = async (): Promise<TransitionResult> => {
      // Execute cancel - using Prisma's typed update
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.proposal.update({
          where: { id: proposalId },
          data: {
            state: ProjectState.CANCELLED,
            holderUnit: proposal.facultyId, // Back to owner's faculty
            holderUser: proposal.ownerId, // Back to owner
            cancelledAt: new Date(),
          },
        });

        // Log workflow action - Direct enum usage (Epic 7/8 retro)
        const workflowLog = await tx.workflowLog.create({
          data: {
            proposalId: proposal.id,
            action: WorkflowAction.CANCEL, // Direct enum, NO double cast
            fromState: proposal.state,
            toState: ProjectState.CANCELLED,
            actorId: context.userId,
            actorName: actorDisplayName,
            comment: reason || 'Hủy bỏ đề tài',
            timestamp: new Date(),
          },
        });

        // Log audit event
        await this.auditService.logEvent({
          action: AuditAction.PROPOSAL_CANCEL,
          actorUserId: context.userId,
          entityType: 'Proposal',
          entityId: proposalId,
          metadata: {
            proposalCode: proposal.code,
            fromState: proposal.state,
            toState: ProjectState.CANCELLED,
            reason,
          },
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
        });

        return { proposal: updated, workflowLog };
      });

      const transitionResult: TransitionResult = {
        proposal: result.proposal,
        workflowLog: result.workflowLog,
        previousState: proposal.state,
        currentState: ProjectState.CANCELLED,
        holderUnit: proposal.facultyId,
        holderUser: proposal.ownerId,
      };

      this.logger.log(
        `Proposal ${proposal.code} cancelled: ${proposal.state} → CANCELLED`,
      );

      return transitionResult;
    };

    // Set the promise as a pending value in cache to prevent duplicate requests
    if (context.idempotencyKey) {
      const cancelPromise = executeCancel();
      this.idempotencyStore.set(context.idempotencyKey, cancelPromise);
      return cancelPromise;
    }

    return executeCancel();
  }

  /**
   * Withdraw Proposal (Review states → WITHDRAWN)
   * Story 9.1: Withdraw Action - Owner can withdraw before APPROVED
   *
   * Epic 7/8 Retro Pattern:
   * - NO `as unknown` casting
   * - NO `as any` casting
   * - Direct WorkflowAction enum usage
   * - Proper interface typing
   *
   * @param proposalId - Proposal ID
   * @param reason - Optional reason for withdrawal
   * @param context - Transition context
   * @returns Transition result
   */
  async withdrawProposal(
    proposalId: string,
    reason: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        if (cached instanceof Promise) {
          return cached;
        }
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Fetch proposal with proper typing
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Define withdrawable states (Story 9.1)
    const WITHDRAWABLE_STATES: ProjectState[] = [
      ProjectState.FACULTY_REVIEW,
      ProjectState.SCHOOL_SELECTION_REVIEW,
      ProjectState.OUTLINE_COUNCIL_REVIEW,
      ProjectState.CHANGES_REQUESTED,
    ];

    // State validation - Cannot withdraw after APPROVED
    if (!WITHDRAWABLE_STATES.includes(proposal.state)) {
      throw new BadRequestException(
        'Đề tài đang thực hiện, không thể rút. Vui lòng liên hệ PKHCN nếu cần.',
      );
    }

    // Ownership check - Only owner can withdraw
    if (proposal.ownerId !== context.userId) {
      throw new ForbiddenException('Bạn không có quyền rút đề tài này');
    }

    // RBAC validation
    this.validateActionPermission(WorkflowAction.WITHDRAW, context.userRole);

    // Store current holder for notification
    const currentHolderId = proposal.holderUser;
    const currentHolderUnit = proposal.holderUnit;

    // Get user display name
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    const executeWithdraw = async (): Promise<TransitionResult> => {
      // Execute withdraw
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.proposal.update({
          where: { id: proposalId },
          data: {
            state: ProjectState.WITHDRAWN,
            holderUnit: proposal.facultyId,
            holderUser: proposal.ownerId,
            withdrawnAt: new Date(),
          },
        });

        // Log workflow action
        const workflowLog = await tx.workflowLog.create({
          data: {
            proposalId: proposal.id,
            action: WorkflowAction.WITHDRAW, // Direct enum usage
            fromState: proposal.state,
            toState: ProjectState.WITHDRAWN,
            actorId: context.userId,
            actorName: actorDisplayName,
            comment: reason || 'Rút hồ sơ đề tài',
            timestamp: new Date(),
          },
        });

        // Log audit
        await this.auditService.logEvent({
          action: AuditAction.PROPOSAL_WITHDRAW,
          actorUserId: context.userId,
          entityType: 'Proposal',
          entityId: proposalId,
          metadata: {
            proposalCode: proposal.code,
            fromState: proposal.state,
            toState: ProjectState.WITHDRAWN,
            previousHolder: currentHolderId,
            reason,
          },
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
        });

        return { proposal: updated, workflowLog };
      });

      const transitionResult: TransitionResult = {
        proposal: result.proposal,
        workflowLog: result.workflowLog,
        previousState: proposal.state,
        currentState: ProjectState.WITHDRAWN,
        holderUnit: proposal.facultyId,
        holderUser: proposal.ownerId,
      };

      this.logger.log(
        `Proposal ${proposal.code} withdrawn: ${proposal.state} → WITHDRAWN`,
      );

      // Send notification to previous holder (outside transaction)
      // This would use NotificationService from Epic 8
      // For now, just log it
      if (currentHolderId) {
        this.logger.log(
          `TODO: Send notification to holder ${currentHolderId} for withdrawn proposal ${proposal.code}`,
        );
      }

      return transitionResult;
    };

    if (context.idempotencyKey) {
      const withdrawPromise = executeWithdraw();
      this.idempotencyStore.set(context.idempotencyKey, withdrawPromise);
      return withdrawPromise;
    }

    return executeWithdraw();
  }

  /**
   * Reject Proposal (Review states → REJECTED)
   * Story 9.2: Reject Action - Decision makers can reject proposals
   *
   * Epic 7/8 Retro Pattern:
   * - NO `as unknown` casting
   * - NO `as any` casting
   * - Direct WorkflowAction enum usage
   * - Proper interface typing
   *
   * @param proposalId - Proposal ID
   * @param reasonCode - Reason code for rejection
   * @param comment - Detailed explanation
   * @param context - Transition context
   * @returns Transition result
   */
  async rejectProposal(
    proposalId: string,
    reasonCode: RejectReasonCode,
    comment: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        if (cached instanceof Promise) {
          return cached;
        }
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Fetch proposal with proper typing
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Define rejectable states (Story 9.2)
    const REJECTABLE_STATES: ProjectState[] = [
      ProjectState.FACULTY_REVIEW,
      ProjectState.SCHOOL_SELECTION_REVIEW,
      ProjectState.OUTLINE_COUNCIL_REVIEW,
      ProjectState.CHANGES_REQUESTED,
    ];

    // State validation - Cannot reject terminal states or non-review states
    if (!REJECTABLE_STATES.includes(proposal.state)) {
      throw new BadRequestException(
        'Không thể từ chối đề tài ở trạng thái này',
      );
    }

    // Already rejected check
    if (proposal.state === ProjectState.REJECTED) {
      throw new BadRequestException('Đề tài đã bị từ chối trước đó');
    }

    // RBAC check - Validate user has permission to reject
    if (!this.canReject(context.userRole, proposal.state)) {
      throw new ForbiddenException(
        'Bạn không có quyền từ chối đề tài ở trạng thái này',
      );
    }

    // Get decision maker info for logging
    const decisionMakerUnit = context.userFacultyId || context.userRole;

    // Get user display name
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    const executeReject = async (): Promise<TransitionResult> => {
      // Execute reject
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.proposal.update({
          where: { id: proposalId },
          data: {
            state: ProjectState.REJECTED,
            holderUnit: decisionMakerUnit,
            holderUser: context.userId,
            rejectedAt: new Date(),
            rejectedById: context.userId,
          },
        });

        // Log workflow action
        const workflowLog = await tx.workflowLog.create({
          data: {
            proposalId: proposal.id,
            action: WorkflowAction.REJECT, // Direct enum, NO double cast
            fromState: proposal.state,
            toState: ProjectState.REJECTED,
            actorId: context.userId,
            actorName: actorDisplayName,
            reasonCode,
            comment,
            timestamp: new Date(),
          },
        });

        // Log audit
        await this.auditService.logEvent({
          action: AuditAction.PROPOSAL_REJECT,
          actorUserId: context.userId,
          entityType: 'Proposal',
          entityId: proposalId,
          metadata: {
            proposalCode: proposal.code,
            fromState: proposal.state,
            toState: ProjectState.REJECTED,
            reasonCode,
            comment,
          },
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
        });

        return { proposal: updated, workflowLog };
      });

      const transitionResult: TransitionResult = {
        proposal: result.proposal,
        workflowLog: result.workflowLog,
        previousState: proposal.state,
        currentState: ProjectState.REJECTED,
        holderUnit: decisionMakerUnit,
        holderUser: context.userId,
      };

      this.logger.log(
        `Proposal ${proposal.code} rejected: ${proposal.state} → REJECTED`,
      );

      // Send notification to PI (outside transaction)
      // This would use NotificationService from Epic 8
      this.logger.log(
        `TODO: Send notification to PI ${proposal.ownerId} for rejected proposal ${proposal.code}`,
      );

      return transitionResult;
    };

    if (context.idempotencyKey) {
      const rejectPromise = executeReject();
      this.idempotencyStore.set(context.idempotencyKey, rejectPromise);
      return rejectPromise;
    }

    return executeReject();
  }

  /**
   * Helper method to check if user can reject a proposal in given state
   * RBAC matrix for reject permissions (Story 9.2)
   */
  private canReject(userRole: string, proposalState: ProjectState): boolean {
    const REJECT_PERMISSIONS: Record<string, ProjectState[]> = {
      [UserRole.QUAN_LY_KHOA]: [
        ProjectState.FACULTY_REVIEW,
        ProjectState.CHANGES_REQUESTED,
      ],
      [UserRole.PHONG_KHCN]: [
        ProjectState.FACULTY_REVIEW,
        ProjectState.SCHOOL_SELECTION_REVIEW,
        ProjectState.CHANGES_REQUESTED,
      ],
      [UserRole.THU_KY_HOI_DONG]: [ProjectState.OUTLINE_COUNCIL_REVIEW],
      [UserRole.THANH_TRUNG]: [ProjectState.OUTLINE_COUNCIL_REVIEW],
      [UserRole.BAN_GIAM_HOC]: [
        ProjectState.FACULTY_REVIEW,
        ProjectState.SCHOOL_SELECTION_REVIEW,
        ProjectState.OUTLINE_COUNCIL_REVIEW,
        ProjectState.CHANGES_REQUESTED,
      ],
      [UserRole.GIANG_VIEN]: [],
      [UserRole.ADMIN]: [],
      [UserRole.THU_KY_KHOA]: [],
    };

    const allowedStates = REJECT_PERMISSIONS[userRole] || [];
    return allowedStates.includes(proposalState);
  }

  /**
   * Pause Proposal (Non-terminal → PAUSED)
   * Story 9.3: Pause Action - PHONG_KHCN can pause proposals
   *
   * Epic 7/8 Retro Pattern:
   * - NO `as unknown` casting
   * - NO `as any` casting
   * - Direct WorkflowAction enum usage
   * - Proper interface typing
   *
   * @param proposalId - Proposal ID
   * @param reason - Reason for pausing
   * @param expectedResumeAt - Optional expected resume date
   * @param context - Transition context
   * @returns Transition result
   */
  async pauseProposal(
    proposalId: string,
    reason: string,
    expectedResumeAt: Date | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        if (cached instanceof Promise) {
          return cached;
        }
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Fetch proposal with proper typing
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Define terminal states (cannot pause)
    const TERMINAL_STATES: ProjectState[] = [
      ProjectState.COMPLETED,
      ProjectState.CANCELLED,
      ProjectState.WITHDRAWN,
      ProjectState.REJECTED,
    ];

    // State validation - Cannot pause terminal states
    if (TERMINAL_STATES.includes(proposal.state)) {
      throw new BadRequestException(
        'Không thể tạm dừng đề tài ở trạng thái này',
      );
    }

    // Already paused check
    if (proposal.state === ProjectState.PAUSED) {
      throw new BadRequestException('Đề tài đang bị tạm dừng');
    }

    // Validate expected resume date is in the future
    if (expectedResumeAt && expectedResumeAt <= new Date()) {
      throw new BadRequestException(
        'Ngày dự kiến tiếp tục phải trong tương lai',
      );
    }

    // RBAC validation - Only PHONG_KHCN can pause
    if (context.userRole !== UserRole.PHONG_KHCN) {
      throw new ForbiddenException(
        'Chỉ PKHCN mới có quyền tạm dừng/tiếp tục đề tài',
      );
    }

    // Get user display name
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Build pause comment
    const pauseComment = this.buildPauseComment(reason, expectedResumeAt);

    const executePause = async (): Promise<TransitionResult> => {
      // Execute pause
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.proposal.update({
          where: { id: proposalId },
          data: {
            state: ProjectState.PAUSED,
            holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN,
            holderUser: null,
            pausedAt: new Date(),
            pauseReason: reason,
            expectedResumeAt,
            // Store pre-pause state for resume
            prePauseState: proposal.state,
            prePauseHolderUnit: proposal.holderUnit,
            prePauseHolderUser: proposal.holderUser,
          },
        });

        // Log workflow action
        const workflowLog = await tx.workflowLog.create({
          data: {
            proposalId: proposal.id,
            action: WorkflowAction.PAUSE, // Direct enum, NO double cast
            fromState: proposal.state,
            toState: ProjectState.PAUSED,
            actorId: context.userId,
            actorName: actorDisplayName,
            comment: pauseComment,
            timestamp: new Date(),
          },
        });

        // Log audit
        await this.auditService.logEvent({
          action: AuditAction.PROPOSAL_PAUSE,
          actorUserId: context.userId,
          entityType: 'Proposal',
          entityId: proposalId,
          metadata: {
            proposalCode: proposal.code,
            fromState: proposal.state,
            toState: ProjectState.PAUSED,
            reason,
            expectedResumeAt: expectedResumeAt?.toISOString(),
          },
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
        });

        return { proposal: updated, workflowLog };
      });

      const transitionResult: TransitionResult = {
        proposal: result.proposal,
        workflowLog: result.workflowLog,
        previousState: proposal.state,
        currentState: ProjectState.PAUSED,
        holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN,
        holderUser: null,
      };

      this.logger.log(
        `Proposal ${proposal.code} paused: ${proposal.state} → PAUSED`,
      );

      return transitionResult;
    };

    if (context.idempotencyKey) {
      const pausePromise = executePause();
      this.idempotencyStore.set(context.idempotencyKey, pausePromise);
      return pausePromise;
    }

    return executePause();
  }

  /**
   * Helper method to build pause comment
   */
  private buildPauseComment(reason: string, expectedResumeAt?: Date): string {
    let comment = `Tạm dừng: ${reason}`;
    if (expectedResumeAt) {
      const formatted = expectedResumeAt.toLocaleDateString('vi-VN');
      comment += `. Dự kiến tiếp tục: ${formatted}`;
    }
    return comment;
  }

  /**
   * Resume Proposal (PAUSED → pre-pause state)
   * Story 9.3: Resume Action - PHONG_KHCN can resume paused proposals
   *
   * Epic 7/8 Retro Pattern:
   * - NO `as unknown` casting
   * - NO `as any` casting
   * - Direct WorkflowAction enum usage
   * - Proper interface typing
   *
   * @param proposalId - Proposal ID
   * @param comment - Optional comment when resuming
   * @param context - Transition context
   * @returns Transition result
   */
  async resumeProposal(
    proposalId: string,
    comment: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        if (cached instanceof Promise) {
          return cached;
        }
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached;
      }
    }

    // Fetch proposal with pause tracking info
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Must be paused to resume
    if (proposal.state !== ProjectState.PAUSED) {
      throw new BadRequestException('Đề tài không ở trạng thái tạm dừng');
    }

    // Validate pre-pause state exists
    if (!proposal.prePauseState) {
      throw new BadRequestException(
        'Không thể xác định trạng thái trước khi tạm dừng',
      );
    }

    // RBAC validation - Only PHONG_KHCN can resume
    if (context.userRole !== UserRole.PHONG_KHCN) {
      throw new ForbiddenException(
        'Chỉ PKHCN mới có quyền tạm dừng/tiếp tục đề tài',
      );
    }

    const resumedAt = new Date();
    let newSlaDeadline = proposal.slaDeadline;

    // Recalculate SLA deadline if was paused (Story 9.3)
    if (proposal.pausedAt && proposal.slaDeadline) {
      const pausedDuration = resumedAt.getTime() - proposal.pausedAt.getTime();
      newSlaDeadline = new Date(
        proposal.slaDeadline.getTime() + pausedDuration,
      );
    }

    // Get user display name
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    const executeResume = async (): Promise<TransitionResult> => {
      // Execute resume - restore pre-pause state
      const result = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.proposal.update({
          where: { id: proposalId },
          data: {
            state: proposal.prePauseState,
            holderUnit: proposal.prePauseHolderUnit,
            holderUser: proposal.prePauseHolderUser,
            slaDeadline: newSlaDeadline,
            resumedAt,
            pausedAt: null,
            // Clear pause tracking fields
            prePauseState: null,
            prePauseHolderUnit: null,
            prePauseHolderUser: null,
          },
        });

        // Log workflow action
        const workflowLog = await tx.workflowLog.create({
          data: {
            proposalId: proposal.id,
            action: WorkflowAction.RESUME, // Direct enum, NO double cast
            fromState: ProjectState.PAUSED,
            toState: proposal.prePauseState!,
            actorId: context.userId,
            actorName: actorDisplayName,
            comment: comment || 'Tiếp tục đề tài sau tạm dừng',
            timestamp: resumedAt,
          },
        });

        // Log audit
        await this.auditService.logEvent({
          action: AuditAction.PROPOSAL_RESUME,
          actorUserId: context.userId,
          entityType: 'Proposal',
          entityId: proposalId,
          metadata: {
            proposalCode: proposal.code,
            fromState: ProjectState.PAUSED,
            toState: proposal.prePauseState,
            newSlaDeadline: newSlaDeadline?.toISOString(),
          },
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
        });

        return { proposal: updated, workflowLog };
      });

      const transitionResult: TransitionResult = {
        proposal: result.proposal,
        workflowLog: result.workflowLog,
        previousState: ProjectState.PAUSED,
        currentState: proposal.prePauseState!,
        holderUnit: proposal.prePauseHolderUnit,
        holderUser: proposal.prePauseHolderUser,
      };

      this.logger.log(
        `Proposal ${proposal.code} resumed: PAUSED → ${proposal.prePauseState}`,
      );

      return transitionResult;
    };

    if (context.idempotencyKey) {
      const resumePromise = executeResume();
      this.idempotencyStore.set(context.idempotencyKey, resumePromise);
      return resumePromise;
    }

    return executeResume();
  }

  /**
   * Approve Council Review (OUTLINE_COUNCIL_REVIEW → APPROVED)
   * BAN_GIAM_HOC: High-level decision to approve proposal after Council Review
   *
   * When BAN_GIAM_HOC approves:
   * - State transitions OUTLINE_COUNCIL_REVIEW → APPROVED
   * - holder_user remains null (no specific holder needed)
   * - workflow_logs entry with action=APPROVE
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async approveCouncilReview(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Phase 1 Refactor: Use new implementation if feature flag is enabled
    if (this.useNewServices) {
      this.logger.debug('Using NEW refactored approveCouncilReview implementation');
      return this.approveCouncilReviewNew(proposalId, context);
    }

    // Original implementation (fallback)
    this.logger.debug('Using ORIGINAL approveCouncilReview implementation');

    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached as Promise<TransitionResult>;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in OUTLINE_COUNCIL_REVIEW state
    if (proposal.state !== ProjectState.OUTLINE_COUNCIL_REVIEW) {
      throw new BadRequestException(
        `Chỉ có thể duyệt đề tài ở trạng thái OUTLINE_COUNCIL_REVIEW. Hiện tại: ${proposal.state}`,
      );
    }

    // RBAC validation: User must have BAN_GIAM_HOC role
    this.validateActionPermission(WorkflowAction.APPROVE, context.userRole);

    // Validate transition
    const toState = ProjectState.APPROVED;
    if (
      !isValidTransition(
        proposal.state,
        toState,
        WorkflowAction.APPROVE,
      )
    ) {
      throw new InvalidTransitionError(
        proposal.state,
        toState,
        WorkflowAction.APPROVE,
      );
    }

    // No specific holder needed after approval
    const holder = { holderUnit: null, holderUser: null };

    // Get user display name for audit log
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Execute transition
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        },
      });

      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId,
          action: WorkflowAction.APPROVE,
          fromState: proposal.state,
          toState,
          actorId: context.userId,
          actorName: actorDisplayName,
        },
      });

      // Log audit
      await this.auditService.logEvent({
        action: 'COUNCIL_APPROVE' as AuditAction,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} approved by BAN_GIAM_HOC: ${proposal.state} → ${toState}`,
    );

    return transitionResult;
  }

  /**
   * NEW: Approve Council Review (Phase 1 Refactor)
   * Uses extracted services for cleaner, more maintainable code
   * Transition to terminal state (APPROVED) - no SLA needed
   */
  async approveCouncilReviewNew(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.APPROVED;
    const action = WorkflowAction.APPROVE;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `approve-council-${proposalId}`,
      async () => {
        // Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // Use WorkflowValidatorService for validation
        await this.validator.validateTransition(
          proposalId,
          toState,
          action,
          {
            proposal,
            user: {
              id: context.userId,
              role: context.userRole,
              facultyId: context.userFacultyId,
            },
          },
        );

        // Terminal state (APPROVED) has no holder
        const holder = { holderUnit: null, holderUser: null };

        // Get user display name for audit log
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // No SLA for terminal state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // Use TransactionService for transaction orchestration
        const result = await this.transaction.updateProposalWithLog({
          proposalId,
          userId: context.userId,
          userDisplayName: actorDisplayName,
          action,
          fromState: proposal.state,
          toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
          slaStartDate,
          slaDeadline,
        });

        // Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // Use AuditHelperService for audit logging with retry (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: 'APPROVE',
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
            },
            {
              userId: context.userId,
              userDisplayName: actorDisplayName,
              ip: context.ip,
              userAgent: context.userAgent,
              requestId: context.requestId,
              facultyId: context.userFacultyId,
              role: context.userRole,
            },
          )
          .catch((err) => {
            this.logger.error(
              `Audit log failed for proposal ${proposal.code}: ${err.message}`,
            );
          });

        this.logger.log(
          `Proposal ${proposal.code} approved by BAN_GIAM_HOC (NEW): ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Return Council Review (OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal for changes during Council Review
   *
   * When BAN_GIAM_HOC returns:
   * - State transitions OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED
   * - holder_unit = owner_faculty_id (back to PI for revision)
   * - return_target_state = OUTLINE_COUNCIL_REVIEW stored in workflow_logs
   *
   * @param proposalId - Proposal ID
   * @param reason - Return reason
   * @param context - Transition context
   * @returns Transition result
   */
  async returnCouncilReview(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached as Promise<TransitionResult>;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in OUTLINE_COUNCIL_REVIEW state
    if (proposal.state !== ProjectState.OUTLINE_COUNCIL_REVIEW) {
      throw new BadRequestException(
        `Chỉ có thể trả về đề tài ở trạng thái OUTLINE_COUNCIL_REVIEW. Hiện tại: ${proposal.state}`,
      );
    }

    // RBAC validation: User must have BAN_GIAM_HOC role
    this.validateActionPermission(WorkflowAction.RETURN, context.userRole);

    // Validate transition
    const toState = ProjectState.CHANGES_REQUESTED;
    if (
      !isValidTransition(
        proposal.state,
        toState,
        WorkflowAction.RETURN,
      )
    ) {
      throw new InvalidTransitionError(
        proposal.state,
        toState,
        WorkflowAction.RETURN,
      );
    }

    // holder = owner faculty (back to PI)
    const holder = {
      holderUnit: proposal.facultyId,
      holderUser: proposal.ownerId,
    };

    // Get user display name for audit log
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Execute transition
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        },
      });

      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId,
          action: WorkflowAction.RETURN,
          fromState: proposal.state,
          toState,
          returnTargetState: ProjectState.OUTLINE_COUNCIL_REVIEW,
          returnTargetHolderUnit: proposal.councilId,
          actorId: context.userId,
          actorName: actorDisplayName,
          comment: reason,
        },
      });

      // Log audit
      await this.auditService.logEvent({
        action: 'COUNCIL_RETURN' as AuditAction,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
          returnTargetState: ProjectState.OUTLINE_COUNCIL_REVIEW,
          reason,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} returned by BAN_GIAM_HOC: ${proposal.state} → ${toState}`,
    );

    return transitionResult;
  }

  /**
   * Accept School Acceptance (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
   * BAN_GIAM_HOC: Final acceptance after School Acceptance Review
   *
   * When BAN_GIAM_HOC accepts:
   * - State transitions SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
   * - holder_unit = "PHONG_KHCN"
   * - workflow_logs entry with action=ACCEPT
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async acceptSchoolReview(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Phase 1 Refactor: Use new implementation if feature flag is enabled
    if (this.useNewServices) {
      this.logger.debug('Using NEW refactored acceptSchoolReview implementation');
      return this.acceptSchoolReviewNew(proposalId, context);
    }

    // Original implementation (fallback)
    this.logger.debug('Using ORIGINAL acceptSchoolReview implementation');

    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached as Promise<TransitionResult>;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in SCHOOL_ACCEPTANCE_REVIEW state
    if (proposal.state !== ProjectState.SCHOOL_ACCEPTANCE_REVIEW) {
      throw new BadRequestException(
        `Chỉ có thể nghiệm thu đề tài ở trạng thái SCHOOL_ACCEPTANCE_REVIEW. Hiện tại: ${proposal.state}`,
      );
    }

    // RBAC validation: User must have BAN_GIAM_HOC role
    this.validateActionPermission(WorkflowAction.ACCEPT, context.userRole);

    // Validate transition
    const toState = ProjectState.HANDOVER;
    if (
      !isValidTransition(
        proposal.state,
        toState,
        WorkflowAction.ACCEPT,
      )
    ) {
      throw new InvalidTransitionError(
        proposal.state,
        toState,
        WorkflowAction.ACCEPT,
      );
    }

    // holder = PHONG_KHCN for handover
    const holder = { holderUnit: 'PHONG_KHCN', holderUser: null };

    // Get user display name for audit log
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Execute transition
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        },
      });

      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId,
          action: WorkflowAction.ACCEPT,
          fromState: proposal.state,
          toState,
          actorId: context.userId,
          actorName: actorDisplayName,
        },
      });

      // Log audit
      await this.auditService.logEvent({
        action: 'SCHOOL_ACCEPT' as AuditAction,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} accepted by BAN_GIAM_HOC: ${proposal.state} → ${toState}`,
    );

    return transitionResult;
  }

  /**
   * NEW: Accept School Review (Phase 1 Refactor)
   * Uses extracted services for cleaner, more maintainable code
   * Transition: SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
   */
  async acceptSchoolReviewNew(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.HANDOVER;
    const action = WorkflowAction.ACCEPT;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `accept-school-${proposalId}`,
      async () => {
        // Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // Use WorkflowValidatorService for validation
        await this.validator.validateTransition(
          proposalId,
          toState,
          action,
          {
            proposal,
            user: {
              id: context.userId,
              role: context.userRole,
              facultyId: context.userFacultyId,
            },
          },
        );

        // Fixed holder for handover
        const holder = { holderUnit: 'PHONG_KHCN', holderUser: null };

        // Get user display name for audit log
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // No SLA for handover phase
        const slaStartDate = new Date();
        const slaDeadline = null;

        // Use TransactionService for transaction orchestration
        const result = await this.transaction.updateProposalWithLog({
          proposalId,
          userId: context.userId,
          userDisplayName: actorDisplayName,
          action,
          fromState: proposal.state,
          toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
          slaStartDate,
          slaDeadline,
        });

        // Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // Use AuditHelperService for audit logging with retry (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: 'ACCEPT',
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
            },
            {
              userId: context.userId,
              userDisplayName: actorDisplayName,
              ip: context.ip,
              userAgent: context.userAgent,
              requestId: context.requestId,
              facultyId: context.userFacultyId,
              role: context.userRole,
            },
          )
          .catch((err) => {
            this.logger.error(
              `Audit log failed for proposal ${proposal.code}: ${err.message}`,
            );
          });

        this.logger.log(
          `Proposal ${proposal.code} accepted by BAN_GIAM_HOC (NEW): ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Return School Acceptance (SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal for changes during School Acceptance Review
   *
   * When BAN_GIAM_HOC returns:
   * - State transitions SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED
   * - holder_unit = owner_faculty_id (back to PI for revision)
   * - return_target_state = SCHOOL_ACCEPTANCE_REVIEW stored in workflow_logs
   *
   * @param proposalId - Proposal ID
   * @param reason - Return reason
   * @param context - Transition context
   * @returns Transition result
   */
  async returnSchoolReview(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Check idempotency
    if (context.idempotencyKey) {
      const cached = this.idempotencyStore.get(context.idempotencyKey);
      if (cached) {
        this.logger.log(
          `Idempotent request: ${context.idempotencyKey} - returning cached result`,
        );
        return cached as Promise<TransitionResult>;
      }
    }

    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    if (!proposal) {
      throw new NotFoundException('Đề tài không tồn tại');
    }

    // Validate: Must be in SCHOOL_ACCEPTANCE_REVIEW state
    if (proposal.state !== ProjectState.SCHOOL_ACCEPTANCE_REVIEW) {
      throw new BadRequestException(
        `Chỉ có thể trả về đề tài ở trạng thái SCHOOL_ACCEPTANCE_REVIEW. Hiện tại: ${proposal.state}`,
      );
    }

    // RBAC validation: User must have BAN_GIAM_HOC role
    this.validateActionPermission(WorkflowAction.RETURN, context.userRole);

    // Validate transition
    const toState = ProjectState.CHANGES_REQUESTED;
    if (
      !isValidTransition(
        proposal.state,
        toState,
        WorkflowAction.RETURN,
      )
    ) {
      throw new InvalidTransitionError(
        proposal.state,
        toState,
        WorkflowAction.RETURN,
      );
    }

    // holder = owner faculty (back to PI)
    const holder = {
      holderUnit: proposal.facultyId,
      holderUser: proposal.ownerId,
    };

    // Get user display name for audit log
    const actorDisplayName = await this.getUserDisplayName(context.userId);

    // Execute transition
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        },
      });

      const workflowLog = await tx.workflowLog.create({
        data: {
          proposalId,
          action: WorkflowAction.RETURN,
          fromState: proposal.state,
          toState,
          returnTargetState: ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
          returnTargetHolderUnit: 'PHONG_KHCN',
          actorId: context.userId,
          actorName: actorDisplayName,
          comment: reason,
        },
      });

      // Log audit
      await this.auditService.logEvent({
        action: 'SCHOOL_RETURN' as AuditAction,
        actorUserId: context.userId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          fromState: proposal.state,
          toState,
          returnTargetState: ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
          reason,
        },
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });

      return { proposal: updated, workflowLog };
    });

    const transitionResult: TransitionResult = {
      proposal: result.proposal,
      workflowLog: result.workflowLog,
      previousState: proposal.state,
      currentState: toState,
      holderUnit: holder.holderUnit,
      holderUser: holder.holderUser,
    };

    if (context.idempotencyKey) {
      this.idempotencyStore.set(context.idempotencyKey, transitionResult);
    }

    this.logger.log(
      `Proposal ${proposal.code} returned by BAN_GIAM_HOC: ${proposal.state} → ${toState}`,
    );

    return transitionResult;
  }
}
