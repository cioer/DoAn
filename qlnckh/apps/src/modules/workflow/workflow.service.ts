import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ProjectState, WorkflowAction, WorkflowLog, Proposal } from '@prisma/client';
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

/**
 * Context for state transitions
 * Contains information about who is making the transition
 */
export interface TransitionContext {
  userId: string;
  userRole: string;
  userFacultyId?: string | null;
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
  private readonly idempotencyStore = new Map<string, TransitionResult>();

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private slaService: SlaService,
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
   * @param proposalId - Proposal ID
   * @param context - Transition context
   * @returns Transition result
   */
  async submitProposal(
    proposalId: string,
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
        action: 'FACULTY_APPROVE',
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

      // AC5: Store return_target_state + return_target_holder_unit
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
          comment: reason,
        },
      });

      // Log audit
      await this.auditService.logEvent({
        action: 'FACULTY_RETURN',
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
    const holder = getHolderForState(toState, proposal);

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
      workflowLogData.comment = context.reason || null;
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
}
