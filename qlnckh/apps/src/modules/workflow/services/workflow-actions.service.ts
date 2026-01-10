import { Injectable } from '@nestjs/common';
import { WorkflowStateMachineService } from './workflow-state-machine.service';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState, WorkflowAction, RejectReasonCode } from '@prisma/client';
import { TransitionContext, TransitionResult } from '../workflow.service';

/**
 * Workflow Actions Service
 *
 * Provides semantic API for all workflow actions.
 * Each method is ~10 lines (vs 120 lines before refactor).
 *
 * Phase 2 Refactor: Extracted from workflow.service.ts
 */
@Injectable()
export class WorkflowActionsService {
  constructor(
    private readonly stateMachine: WorkflowStateMachineService,
    private readonly prisma: PrismaService,
  ) {}

  // ========================================================================
  // Core Workflow Actions
  // ========================================================================

  /**
   * Submit proposal (DRAFT → FACULTY_REVIEW)
   */
  async submit(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.FACULTY_REVIEW,
      WorkflowAction.SUBMIT,
      context,
      { slaDays: 3, slaCutoffHour: 17 },
    );
  }

  /**
   * Approve faculty review (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
   */
  async approveFaculty(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.SCHOOL_SELECTION_REVIEW,
      WorkflowAction.APPROVE,
      context,
      { slaDays: 3, slaCutoffHour: 17 },
    );
  }

  /**
   * Return faculty review (FACULTY_REVIEW → CHANGES_REQUESTED)
   */
  async returnFaculty(
    proposalId: string,
    reason: string,
    reasonCode: string,
    reasonSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Get proposal to determine return target
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { facultyId: true },
    });

    if (!proposal) {
      throw new Error('Đề tài không tồn tại');
    }

    return this.stateMachine.executeReturnTransition(
      proposalId,
      ProjectState.CHANGES_REQUESTED,
      ProjectState.FACULTY_REVIEW, // Return to faculty review
      proposal.facultyId, // Return to reviewing faculty
      context,
      { reason, reasonCode, reasonSections },
    );
  }

  /**
   * Resubmit proposal (CHANGES_REQUESTED → return_target_state)
   */
  async resubmit(
    proposalId: string,
    checkedSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeResubmitTransition(
      proposalId,
      checkedSections,
      context,
    );
  }

  /**
   * Approve council review (OUTLINE_COUNCIL_REVIEW → APPROVED)
   */
  async approveCouncil(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.APPROVED,
      WorkflowAction.APPROVE,
      context,
      // No SLA for terminal state
    );
  }

  /**
   * Return council review (OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED)
   */
  async returnCouncil(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Get proposal to determine council
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { councilId: true },
    });

    if (!proposal) {
      throw new Error('Đề tài không tồn tại');
    }

    return this.stateMachine.executeReturnTransition(
      proposalId,
      ProjectState.CHANGES_REQUESTED,
      ProjectState.OUTLINE_COUNCIL_REVIEW, // Return to council review
      proposal.councilId, // Return to reviewing council
      context,
      { reason },
    );
  }

  /**
   * Accept school review (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
   */
  async acceptSchool(
    proposalId: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.HANDOVER,
      WorkflowAction.ACCEPT,
      context,
      { holderUnit: 'PHONG_KHCN', holderUser: null },
    );
  }

  /**
   * Return school review (SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED)
   */
  async returnSchool(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeReturnTransition(
      proposalId,
      ProjectState.CHANGES_REQUESTED,
      ProjectState.SCHOOL_ACCEPTANCE_REVIEW, // Return to school review
      'PHONG_KHCN', // Return to PHONG_KHCN
      context,
      { reason },
    );
  }

  // ========================================================================
  // Exception Actions
  // ========================================================================

  /**
   * Cancel proposal (→ CANCELLED)
   */
  async cancel(
    proposalId: string,
    reason: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.CANCELLED,
      WorkflowAction.CANCEL,
      context,
      {
        comment: reason || 'Hủy bỏ đề tài',
        metadata: { cancelledAt: new Date(), comment: reason || 'Hủy bỏ đề tài' },
      },
    );
  }

  /**
   * Withdraw proposal (→ WITHDRAWN)
   */
  async withdraw(
    proposalId: string,
    reason: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.WITHDRAWN,
      WorkflowAction.WITHDRAW,
      context,
      {
        comment: reason || 'Rút hồ sơ đề tài',
        metadata: { withdrawnAt: new Date() },
      },
    );
  }

  /**
   * Reject proposal (→ REJECTED)
   */
  async reject(
    proposalId: string,
    reasonCode: RejectReasonCode,
    comment: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Use decision maker's unit as holder
    const decisionMakerUnit = context.userFacultyId || context.userRole;

    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.REJECTED,
      WorkflowAction.REJECT,
      context,
      {
        holderUnit: decisionMakerUnit,
        holderUser: context.userId,
        reasonCode,
        comment,
        metadata: {
          rejectedAt: new Date(),
          rejectedById: context.userId,
        },
      },
    );
  }

  /**
   * Pause proposal (→ PAUSED)
   */
  async pause(
    proposalId: string,
    reason: string,
    expectedResumeAt: Date | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.PAUSED,
      WorkflowAction.PAUSE,
      context,
      {
        holderUnit: 'PHONG_KHCN',
        holderUser: null,
        comment: this.buildPauseComment(reason, expectedResumeAt),
        metadata: {
          pausedAt: new Date(),
          pauseReason: reason,
          expectedResumeAt,
          // Store pre-pause state for resume
          // Note: prePauseState, prePauseHolderUnit, prePauseHolderUser
          // are populated by TransactionService
        },
      },
    );
  }

  /**
   * Resume proposal (PAUSED → pre-pause state)
   */
  async resume(
    proposalId: string,
    comment: string | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeResumeTransition(
      proposalId,
      comment || 'Tiếp tục đề tài sau tạm dừng',
      context,
    );
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Build pause comment with optional expected resume date
   */
  private buildPauseComment(reason: string, expectedResumeAt?: Date): string {
    let comment = `Tạm dừng: ${reason}`;
    if (expectedResumeAt) {
      const formatted = expectedResumeAt.toLocaleDateString('vi-VN');
      comment += `. Dự kiến tiếp tục: ${formatted}`;
    }
    return comment;
  }
}
