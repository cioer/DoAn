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
import { IdempotencyService } from '../../common/services/idempotency.service';
import { TransactionService } from '../../common/services/transaction.service';
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
   * Calculate SLA deadline from start date and business days
   * Wrapper around SlaService.calculateDeadline()
   *
   * @param startDate - Start date for SLA calculation
   * @param businessDays - Number of business days for SLA
   * @returns Deadline as Date
   */
  private async calculateSlaDeadline(
    startDate: Date,
    businessDays: number,
  ): Promise<Date> {
    return this.slaService.calculateDeadline(startDate, businessDays);
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
   * Phase 1 Refactor: Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - HolderAssignmentService for holder calculation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async submitProposal(
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
          `Proposal ${proposal.code} submitted: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Start Project (APPROVED → IN_PROGRESS)
   * GIANG_VIEN Feature: Start implementation of approved proposal
   *
   * When owner starts:
   * - State transitions APPROVED → IN_PROGRESS
   * - holder_unit = owner_faculty_id (faculty of the owner)
   * - holder_user = owner_id (the researcher)
   * - workflow_logs entry with action=START_PROJECT
   *
   * Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - HolderAssignmentService for holder calculation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async startProject(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.IN_PROGRESS;
    const action = WorkflowAction.START_PROJECT;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `start-project-${proposalId}`,
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

        // Calculate SLA dates (no deadline for IN_PROGRESS - ongoing work)
        const slaStartDate = new Date();
        const slaDeadline = null; // No deadline during implementation

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
              action: 'START_PROJECT',
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
          `Proposal ${proposal.code} started: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Submit Acceptance (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
   * GIANG_VIEN Feature: Submit project for faculty acceptance review
   *
   * When owner submits for acceptance:
   * - State transitions IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW
   * - holder_unit = owner_faculty_id (faculty of the owner)
   * - holder_user = null (faculty QA will review)
   * - workflow_logs entry with action=SUBMIT_ACCEPTANCE
   *
   * Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - HolderAssignmentService for holder calculation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async submitAcceptance(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.FACULTY_ACCEPTANCE_REVIEW;
    const action = WorkflowAction.SUBMIT_ACCEPTANCE;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `submit-acceptance-${proposalId}`,
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

        // Calculate SLA dates (3 business days for faculty acceptance review)
        const slaStartDate = new Date();
        const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(
          slaStartDate,
          3, // 3 business days for faculty acceptance
          17, // 17:00 cutoff hour (5 PM)
        );

        // Set actualStartDate if not already set (the project was started)
        const updateData: any = {};
        if (!proposal.actualStartDate) {
          updateData.actualStartDate = new Date();
        }

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
          updateData,
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
              action: 'SUBMIT_ACCEPTANCE',
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
          `Proposal ${proposal.code} submitted for acceptance: ${proposal.state} → ${toState}`,
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
   * Phase 1 Refactor: Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - HolderAssignmentService for holder calculation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async approveFacultyReview(
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
          `Proposal ${proposal.code} approved by faculty: ${proposal.state} → ${toState}`,
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
   * Phase 1 Refactor: Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - HolderAssignmentService for holder calculation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
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
    const toState = ProjectState.CHANGES_REQUESTED;
    const action = WorkflowAction.RETURN;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `return-faculty-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Validation
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

        // 3. Calculate holder - back to owner's faculty
        const holder = this.holder.getHolderForState(
          toState,
          proposal,
          context.userId,
          context.userFacultyId,
        );

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. Store return target for resubmit
        const returnTargetState = proposal.state; // Return to FACULTY_REVIEW
        const returnTargetHolderUnit = proposal.facultyId; // Faculty that was reviewing

        // 6. Build comment JSON with reason and revisionSections
        const commentJson = JSON.stringify({
          reason,
          revisionSections: reasonSections || [],
        });

        // 7. No SLA for CHANGES_REQUESTED state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // 8. Execute transaction
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
          comment: commentJson,
          metadata: {
            returnTargetState,
            returnTargetHolderUnit,
            reasonSections: reasonSections || [],
            reasonCode,
          },
        });

        // 9. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 10. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
              metadata: {
                returnTargetState,
                returnTargetHolderUnit,
                reasonCode,
                reasonSections,
              },
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
          `Proposal ${proposal.code} returned by faculty: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Resubmit Proposal (CHANGES_REQUESTED → return_target_state)
   * Story 4.5: Resubmit after revisions - returns to reviewer, NOT to DRAFT
   *
   * AC1: Read return_target from workflow log
   * AC2: State transitions to return_target_state (FACULTY_REVIEW)
   * AC3: Workflow log entry with RESUBMIT action
   *
   * Phase 1 Refactor: Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - HolderAssignmentService for holder calculation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
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
    const action = WorkflowAction.RESUBMIT;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `resubmit-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Validate state
        if (proposal.state !== ProjectState.CHANGES_REQUESTED) {
          throw new BadRequestException(
            `Chỉ có thể nộp lại đề tài ở trạng thái CHANGES_REQUESTED. Hiện tại: ${proposal.state}`,
          );
        }

        // 3. Validate ownership
        if (proposal.ownerId !== context.userId) {
          throw new BadRequestException(
            'Chỉ chủ nhiệm đề tài mới có thể nộp lại hồ sơ',
          );
        }

        // 4. Fetch latest RETURN log to get return target
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

        // 5. Extract return target from the RETURN log
        const targetState = lastReturnLog.returnTargetState;
        const targetHolderUnit = lastReturnLog.returnTargetHolderUnit;

        if (!targetState || !targetHolderUnit) {
          throw new BadRequestException(
            'Thông tin return_target không đầy đủ trong log yêu cầu sửa. Vui lòng liên hệ quản trị viên.',
          );
        }

        // 6. Validate checkedSections against revisionSections
        let revisionSections: string[] = [];
        try {
          const commentParsed = JSON.parse(lastReturnLog.comment || '{}');
          revisionSections = commentParsed.revisionSections || [];
        } catch {
          // If parsing fails, assume no revision sections
        }

        const invalidSections = checkedSections.filter(
          (section) => !revisionSections.includes(section),
        );
        if (invalidSections.length > 0) {
          throw new BadRequestException(
            `Các section không hợp lệ: ${invalidSections.join(', ')}. Chỉ có thể đánh dấu sửa các section đã được yêu cầu.`,
          );
        }

        // 7. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 8. Calculate SLA (3 business days for re-review)
        const slaStartDate = new Date();
        const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(
          slaStartDate,
          3, // 3 business days
          17, // 17:00 cutoff
        );

        // 9. Execute transaction
        const result = await this.transaction.updateProposalWithLog({
          proposalId,
          userId: context.userId,
          userDisplayName: actorDisplayName,
          action,
          fromState: proposal.state,
          toState: targetState,
          holderUnit: targetHolderUnit,
          holderUser: lastReturnLog.actorId, // Back to original reviewer
          slaStartDate,
          slaDeadline,
          comment: JSON.stringify({
            returnLogId: lastReturnLog.id,
            checkedSections,
          }),
          metadata: {
            returnLogId: lastReturnLog.id,
            checkedSections,
            returnTargetState: targetState,
            returnTargetHolderUnit: targetHolderUnit,
          },
        });

        // 10. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: targetState,
          holderUnit: targetHolderUnit,
          holderUser: lastReturnLog.actorId,
        };

        // 11. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState: targetState,
              action: action.toString(),
              holderUnit: targetHolderUnit,
              holderUser: lastReturnLog.actorId,
              slaStartDate,
              slaDeadline,
              metadata: {
                returnTargetState: targetState,
                returnTargetHolderUnit: targetHolderUnit,
                checkedSections,
              },
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
          `Proposal ${proposal.code} resubmitted: ${proposal.state} → ${targetState} (returning to ${targetHolderUnit})`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
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
   * Phase 1 Refactor: Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
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
    const toState = ProjectState.CANCELLED;
    const action = WorkflowAction.CANCEL;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `cancel-${proposalId}`,
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

        // Cancelled proposal goes back to owner's faculty
        const holder = {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

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
          metadata: {
            cancelledAt: new Date(),
            comment: reason || 'Hủy bỏ đề tài',
          },
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
              action: 'CANCEL',
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
              comment: reason || 'Hủy bỏ đề tài',
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
          `Proposal ${proposal.code} cancelled: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Withdraw Proposal (Review states → WITHDRAWN)
   * Story 9.1: Withdraw Action - Owner can withdraw before APPROVED
   *
   * Phase 1 Refactor: Uses extracted services:
   * - IdempotencyService for atomic idempotency
   * - WorkflowValidatorService for validation
   * - TransactionService for transaction orchestration
   * - AuditHelperService for audit logging with retry
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
    const toState = ProjectState.WITHDRAWN;
    const action = WorkflowAction.WITHDRAW;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `withdraw-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Validation
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

        // 3. Calculate holder - Return to owner's faculty
        const holder = {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. No SLA for terminal state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // 6. Execute transaction
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
          comment: reason || 'Rút hồ sơ đề tài',
          metadata: {
            withdrawnAt: new Date(),
          },
        });

        // 7. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 8. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
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
          `Proposal ${proposal.code} withdrawn: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
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
    const toState = ProjectState.REJECTED;
    const action = WorkflowAction.REJECT;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `reject-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Validation
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

        // 3. Calculate holder - Use decision maker's unit
        const decisionMakerUnit = context.userFacultyId || context.userRole;
        const holder = {
          holderUnit: decisionMakerUnit,
          holderUser: context.userId,
        };

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. No SLA for terminal state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // 6. Execute transaction
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
          comment,
          metadata: {
            rejectedAt: new Date(),
            rejectedById: context.userId,
            reasonCode,
          },
        });

        // 7. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 8. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
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
          `Proposal ${proposal.code} rejected: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
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
    const toState = ProjectState.PAUSED;
    const action = WorkflowAction.PAUSE;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `pause-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Define terminal states (cannot pause)
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

        // 3. Validation
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

        // 3. Calculate holder - PHONG_KHCN for paused proposals
        const holder = {
          holderUnit: SPECIAL_UNIT_CODES.PHONG_KHCN,
          holderUser: null,
        };

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. No SLA for paused state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // 6. Build pause comment
        const pauseComment = this.buildPauseComment(reason, expectedResumeAt);

        // 7. Execute transaction
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
          comment: pauseComment,
          metadata: {
            pausedAt: new Date(),
            pauseReason: reason,
            expectedResumeAt,
            // Store pre-pause state for resume
            prePauseState: proposal.state,
            prePauseHolderUnit: proposal.holderUnit,
            prePauseHolderUser: proposal.holderUser,
          },
        });

        // 8. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 9. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
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
          `Proposal ${proposal.code} paused: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
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
    const resumedAt = new Date();

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `resume-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // Must be paused to resume - validate via validator service
        if (proposal.state !== ProjectState.PAUSED) {
          throw new BadRequestException('Đề tài không ở trạng thái tạm dừng');
        }

        // Validate pre-pause state exists
        if (!proposal.prePauseState) {
          throw new BadRequestException(
            'Không thể xác định trạng thái trước khi tạm dừng',
          );
        }

        const toState = proposal.prePauseState;
        const action = WorkflowAction.RESUME;

        // 2. Validation
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

        // 3. Calculate holder - Restore pre-pause holder
        const holder = {
          holderUnit: proposal.prePauseHolderUnit,
          holderUser: proposal.prePauseHolderUser,
        };

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. Recalculate SLA deadline if was paused
        let slaDeadline = proposal.slaDeadline;
        if (proposal.pausedAt && proposal.slaDeadline) {
          const pausedDuration = resumedAt.getTime() - proposal.pausedAt.getTime();
          slaDeadline = new Date(
            proposal.slaDeadline.getTime() + pausedDuration,
          );
        }

        // 6. Execute transaction
        const result = await this.transaction.updateProposalWithLog({
          proposalId,
          userId: context.userId,
          userDisplayName: actorDisplayName,
          action,
          fromState: proposal.state,
          toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
          slaStartDate: proposal.slaStartDate, // Keep original SLA start date
          slaDeadline,
          comment: comment || 'Tiếp tục đề tài sau tạm dừng',
          metadata: {
            resumedAt,
            // Clear pause tracking fields
            prePauseState: null,
            prePauseHolderUnit: null,
            prePauseHolderUser: null,
            pausedAt: null,
          },
        });

        // 7. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 8. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate: proposal.slaStartDate,
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
          `Proposal ${proposal.code} resumed: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
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
    const toState = ProjectState.CHANGES_REQUESTED;
    const action = WorkflowAction.RETURN;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `return-council-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Validation
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

        // 3. Calculate holder - back to owner's faculty
        const holder = {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. Store return target for resubmit
        const returnTargetState = ProjectState.OUTLINE_COUNCIL_REVIEW;
        const returnTargetHolderUnit = proposal.councilId;

        // 6. No SLA for CHANGES_REQUESTED state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // 7. Execute transaction
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
          comment: reason,
          metadata: {
            returnTargetState,
            returnTargetHolderUnit,
          },
        });

        // 8. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 9. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
              metadata: {
                returnTargetState,
                returnTargetHolderUnit,
                reason,
              },
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
          `Proposal ${proposal.code} returned by BAN_GIAM_HOC: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
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
    const toState = ProjectState.CHANGES_REQUESTED;
    const action = WorkflowAction.RETURN;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `return-school-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Validation
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

        // 3. Calculate holder - back to owner's faculty
        const holder = {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. Store return target for resubmit
        const returnTargetState = ProjectState.SCHOOL_ACCEPTANCE_REVIEW;
        const returnTargetHolderUnit = 'PHONG_KHCN';

        // 6. No SLA for CHANGES_REQUESTED state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // 7. Execute transaction
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
          comment: reason,
          metadata: {
            returnTargetState,
            returnTargetHolderUnit,
          },
        });

        // 8. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 9. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
              metadata: {
                returnTargetState,
                returnTargetHolderUnit,
                reason,
              },
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
          `Proposal ${proposal.code} returned by BAN_GIAM_HOC: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Accept Faculty Acceptance (FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW)
   * QUAN_LY_KHOA/THU_KY_KHOA: Accept proposal after Faculty Acceptance Review
   *
   * When QUAN_LY_KHOA accepts:
   * - State transitions FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
   * - holder_unit = "PHONG_KHCN"
   * - workflow_logs entry with action=FACULTY_ACCEPT
   *
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async acceptFacultyAcceptance(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.SCHOOL_ACCEPTANCE_REVIEW;
    const action = WorkflowAction.FACULTY_ACCEPT;

    // Use IdempotencyService for atomic idempotency check
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `accept-faculty-acceptance-${proposalId}`,
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

        // Fixed holder for school acceptance review
        const holder = { holderUnit: 'PHONG_KHCN', holderUser: null };

        // Get user display name for audit log
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // Calculate SLA dates (5 business days for school acceptance review)
        const slaStartDate = new Date();
        const slaDeadline = await this.calculateSlaDeadline(
          slaStartDate,
          5, // 5 business days for school acceptance
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
              action: 'FACULTY_ACCEPT',
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
          `Proposal ${proposal.code} faculty accepted by QUAN_LY_KHOA: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }

  /**
   * Return Faculty Acceptance (FACULTY_ACCEPTANCE_REVIEW → CHANGES_REQUESTED)
   * QUAN_LY_KHOA/THU_KY_KHOA: Return proposal for changes during Faculty Acceptance Review
   *
   * When QUAN_LY_KHOA returns:
   * - State transitions FACULTY_ACCEPTANCE_REVIEW → CHANGES_REQUESTED
   * - holder_unit = owner_faculty_id (back to PI for revision)
   * - return_target_state = FACULTY_ACCEPTANCE_REVIEW stored in workflow_logs
   *
   * @param proposalId - Proposal ID
   * @param reason - Return reason
   * @param context - Transition context
   * @returns Transition result
   */
  async returnFacultyAcceptance(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    const toState = ProjectState.CHANGES_REQUESTED;
    const action = WorkflowAction.RETURN;

    // Atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `return-faculty-acceptance-${proposalId}`,
      async () => {
        // 1. Get proposal
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new NotFoundException('Đề tài không tồn tại');
        }

        // 2. Validation
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

        // 3. Calculate holder - back to owner's faculty
        const holder = {
          holderUnit: proposal.facultyId,
          holderUser: proposal.ownerId,
        };

        // 4. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. Store return target for resubmit
        const returnTargetState = ProjectState.FACULTY_ACCEPTANCE_REVIEW;
        const returnTargetHolderUnit = proposal.facultyId;

        // 6. No SLA for CHANGES_REQUESTED state
        const slaStartDate = new Date();
        const slaDeadline = null;

        // 7. Execute transaction
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
          comment: reason,
          metadata: {
            returnTargetState,
            returnTargetHolderUnit,
          },
        });

        // 8. Build transition result
        const transitionResult: TransitionResult = {
          proposal: result.proposal,
          workflowLog: result.workflowLog,
          previousState: proposal.state,
          currentState: toState,
          holderUnit: holder.holderUnit,
          holderUser: holder.holderUser,
        };

        // 9. Audit logging (fire-and-forget)
        this.auditHelper
          .logWorkflowTransition(
            {
              proposalId,
              proposalCode: proposal.code,
              fromState: proposal.state,
              toState,
              action: action.toString(),
              holderUnit: holder.holderUnit,
              holderUser: holder.holderUser,
              slaStartDate,
              slaDeadline,
              metadata: {
                returnTargetState,
                returnTargetHolderUnit,
                reason,
              },
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
          `Proposal ${proposal.code} returned by QUAN_LY_KHOA from faculty acceptance: ${proposal.state} → ${toState}`,
        );

        return transitionResult;
      },
    );

    // Return the unwrapped result
    return idempotencyResult.data;
  }
}
