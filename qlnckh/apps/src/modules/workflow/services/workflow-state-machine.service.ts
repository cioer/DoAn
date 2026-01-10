import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { WorkflowValidatorService } from './workflow-validator.service';
import { HolderAssignmentService } from './holder-assignment.service';
import { SlaService } from '../../calendar/sla.service';
import { TransactionService } from '../../../common/services/transaction.service';
import { AuditHelperService } from './audit-helper.service';
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { ProjectState, WorkflowAction } from '@prisma/client';
import { TransitionContext, TransitionResult } from '../workflow.service';

/**
 * Workflow State Machine Service
 *
 * Core state machine logic for all workflow transitions.
 * Replaces 16 repetitive transition methods with generic executor.
 *
 * Phase 2 Refactor: Extracted from workflow.service.ts
 */
@Injectable()
export class WorkflowStateMachineService {
  private readonly logger = new Logger(WorkflowStateMachineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: WorkflowValidatorService,
    private readonly holder: HolderAssignmentService,
    private readonly sla: SlaService,
    private readonly transaction: TransactionService,
    private readonly auditHelper: AuditHelperService,
    private readonly idempotency: IdempotencyService,
  ) {}

  /**
   * Generic transition executor - handles all standard transitions
   *
   * This replaces 16 repetitive methods (submit, approve*, return*, etc.)
   * Each was ~120 lines, now unified in one place.
   *
   * @param proposalId - Proposal ID
   * @param toState - Target state
   * @param action - Workflow action
   * @param context - Transition context
   * @param options - Optional configuration (SLA, comment, metadata)
   * @returns Transition result
   */
  async executeTransition(
    proposalId: string,
    toState: ProjectState,
    action: WorkflowAction,
    context: TransitionContext,
    options?: {
      slaDays?: number;
      slaCutoffHour?: number;
      holderUnit?: string | null;
      holderUser?: string | null;
      reasonCode?: string;
      comment?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<TransitionResult> {
    const {
      slaDays,
      slaCutoffHour = 17, // Default 5 PM cutoff
      holderUnit: overrideHolderUnit,
      holderUser: overrideHolderUser,
      reasonCode,
      comment,
      metadata,
    } = options || {};

    // Use IdempotencyService for atomic idempotency
    const idempotencyResult = await this.idempotency.setIfAbsent(
      context.idempotencyKey || `${action}-${proposalId}`,
      async () => {
        // 1. Get proposal with relations
        const proposal = await this.prisma.proposal.findUnique({
          where: { id: proposalId },
          include: { owner: true, faculty: true },
        });

        if (!proposal) {
          throw new Error('Đề tài không tồn tại');
        }

        // 2. Validate transition
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

        // 3. Calculate holder (use override if provided)
        let holder;
        if (overrideHolderUnit !== undefined || overrideHolderUser !== undefined) {
          holder = {
            holderUnit: overrideHolderUnit ?? null,
            holderUser: overrideHolderUser ?? null,
          };
        } else {
          holder = this.holder.getHolderForState(
            toState,
            proposal,
            context.userId,
            context.userFacultyId,
          );
        }

        // 4. Get user display name for audit log
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 5. Calculate SLA dates (if applicable)
        let slaStartDate: Date;
        let slaDeadline: Date | null;

        if (slaDays && slaDays > 0) {
          slaStartDate = new Date();
          slaDeadline = await this.sla.calculateDeadlineWithCutoff(
            slaStartDate,
            slaDays,
            slaCutoffHour,
          );
        } else {
          slaStartDate = new Date();
          slaDeadline = null;
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
          slaStartDate,
          slaDeadline,
          comment,
          metadata: reasonCode ? { ...metadata, reasonCode } : metadata,
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
              metadata,
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

        // 9. Log success
        this.logger.log(
          `Proposal ${proposal.code} transition: ${proposal.state} → ${toState} (${action})`,
        );

        return transitionResult;
      },
    );

    return idempotencyResult.data;
  }

  /**
   * Execute RETURN transition with return target storage
   *
   * Used for: returnFacultyReview, returnSchoolReview, returnCouncilReview
   *
   * @param proposalId - Proposal ID
   * @param toState - Target state (usually CHANGES_REQUESTED)
   * @param returnTargetState - State to return to after resubmit
   * @param returnTargetHolderUnit - Holder unit to return to
   * @param context - Transition context
   * @param options - Optional configuration
   * @returns Transition result
   */
  async executeReturnTransition(
    proposalId: string,
    toState: ProjectState,
    returnTargetState: ProjectState,
    returnTargetHolderUnit: string,
    context: TransitionContext,
    options?: {
      reason?: string;
      reasonCode?: string;
      reasonSections?: string[];
    },
  ): Promise<TransitionResult> {
    const { reason, reasonCode, reasonSections } = options || {};

    // Build comment JSON with reason and revisionSections
    const commentJson = JSON.stringify({
      reason: reason || null,
      revisionSections: reasonSections || [],
    });

    // Execute transition with return target metadata
    return this.executeTransition(
      proposalId,
      toState,
      WorkflowAction.RETURN,
      context,
      {
        comment: commentJson,
        reasonCode,
        holderUnit: context.userFacultyId, // Return to owner's faculty
        holderUser: context.userId, // Back to owner
        metadata: {
          returnTargetState,
          returnTargetHolderUnit,
          reasonSections: reasonSections || [],
        },
      },
    );
  }

  /**
   * Execute RESUBMIT transition
   *
   * Fetches latest RETURN log to determine target state and holder.
   * Used for: resubmitProposal
   *
   * @param proposalId - Proposal ID
   * @param checkedSections - Sections marked as fixed
   * @param context - Transition context
   * @returns Transition result
   */
  async executeResubmitTransition(
    proposalId: string,
    checkedSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
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
          throw new Error('Đề tài không tồn tại');
        }

        // 2. Validate state
        if (proposal.state !== ProjectState.CHANGES_REQUESTED) {
          throw new Error(
            `Chỉ có thể nộp lại đề tài ở trạng thái CHANGES_REQUESTED. Hiện tại: ${proposal.state}`,
          );
        }

        // 3. Validate ownership
        if (proposal.ownerId !== context.userId) {
          throw new Error(
            'Chỉ chủ nhiệm đề tài mới có thể nộp lại hồ sơ',
          );
        }

        // 4. Fetch latest RETURN log
        const lastReturnLog = await this.prisma.workflowLog.findFirst({
          where: {
            proposalId,
            toState: ProjectState.CHANGES_REQUESTED,
            action: WorkflowAction.RETURN,
          },
          orderBy: { timestamp: 'desc' },
        });

        if (!lastReturnLog) {
          throw new Error(
            'Không tìm thấy thông tin yêu cầu sửa. Vui lòng liên hệ quản trị viên.',
          );
        }

        // 5. Extract return target from the RETURN log
        const targetState = lastReturnLog.returnTargetState;
        const targetHolderUnit = lastReturnLog.returnTargetHolderUnit;

        if (!targetState || !targetHolderUnit) {
          throw new Error(
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
          throw new Error(
            `Các section không hợp lệ: ${invalidSections.join(', ')}. Chỉ có thể đánh dấu sửa các section đã được yêu cầu.`,
          );
        }

        // 7. Get user display name
        const actorDisplayName = await this.getUserDisplayName(context.userId);

        // 8. Calculate SLA (3 business days for re-review)
        const slaStartDate = new Date();
        const slaDeadline = await this.sla.calculateDeadlineWithCutoff(
          slaStartDate,
          3,
          17,
        );

        // 9. Execute transaction
        const result = await this.transaction.updateProposalWithLog({
          proposalId,
          userId: context.userId,
          userDisplayName: actorDisplayName,
          action: WorkflowAction.RESUBMIT,
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
              action: 'RESUBMIT',
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

    return idempotencyResult.data;
  }

  /**
   * Execute RESUME transition (restore pre-pause state)
   *
   * Used for: resumeProposal
   *
   * @param proposalId - Proposal ID
   * @param comment - Optional comment when resuming
   * @param context - Transition context
   * @returns Transition result
   */
  async executeResumeTransition(
    proposalId: string,
    comment: string,
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
          throw new Error('Đề tài không tồn tại');
        }

        // Must be paused to resume
        if (proposal.state !== ProjectState.PAUSED) {
          throw new Error('Đề tài không ở trạng thái tạm dừng');
        }

        // Validate pre-pause state exists
        if (!proposal.prePauseState) {
          throw new Error(
            'Không thể xác định trạng thái trước khi tạm dừng',
          );
        }

        const toState = proposal.prePauseState;

        // 2. Validation
        await this.validator.validateTransition(
          proposalId,
          toState,
          WorkflowAction.RESUME,
          {
            proposal,
            user: {
              id: context.userId,
              role: context.userRole,
              facultyId: context.userFacultyId,
            },
          },
        );

        // 3. Restore pre-pause holder
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
          action: WorkflowAction.RESUME,
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
              action: 'RESUME',
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

    return idempotencyResult.data;
  }

  /**
   * Helper: Get user display name
   */
  private async getUserDisplayName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    return user?.displayName || 'Unknown User';
  }
}
