import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { WorkflowAction, ProjectState } from '@prisma/client';
import { TransitionContext } from '../../workflow/workflow.service';

/**
 * Proposals Workflow Integration Service
 *
 * Handles workflow integration for proposals.
 * Focus: Bridging proposals and workflow systems.
 */
@Injectable()
export class ProposalsWorkflowService {
  private readonly logger = new Logger(ProposalsWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
  ) {}

  /**
   * Submit proposal to workflow (DRAFT → FACULTY_REVIEW)
   */
  async submitToWorkflow(proposalId: string, context: TransitionContext) {
    this.logger.log(`Submitting proposal ${proposalId} to workflow`);

    const result = await this.workflow.submitProposal(proposalId, context);

    return result;
  }

  /**
   * Start project (APPROVED → IN_PROGRESS)
   * Note: This method may not exist in WorkflowService yet
   */
  async startProject(proposalId: string, context: TransitionContext) {
    this.logger.log(`Starting project for proposal ${proposalId}`);

    // TODO: Implement startProject in WorkflowService or use appropriate transition
    // For now, just update the proposal state
    const result = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        state: ProjectState.IN_PROGRESS,
        actualStartDate: new Date(),
      },
    });

    return result;
  }

  /**
   * Faculty acceptance decision (FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW or CHANGES_REQUESTED)
   * Phase C: After project completion, faculty reviews and decides DAT/KHONG_DAT
   *
   * - If decision = DAT: transitions to SCHOOL_ACCEPTANCE_REVIEW
   * - If decision = KHONG_DAT: transitions to CHANGES_REQUESTED with return to FACULTY_ACCEPTANCE_REVIEW
   *
   * Note: Acceptance data is stored in formData under 'facultyAcceptance' key
   */
  async facultyAcceptance(
    proposalId: string,
    acceptanceData: any,
    context: TransitionContext,
  ) {
    this.logger.log(`Faculty acceptance decision for proposal ${proposalId}`);

    const decision = acceptanceData?.decision; // 'DAT' or 'KHONG_DAT'

    // First, get current formData and merge acceptance data
    const current = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { formData: true },
    });

    const mergedFormData = {
      ...(current?.formData as any || {}),
      facultyAcceptance: acceptanceData,
    };

    // Update proposal with acceptance data in formData
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        formData: mergedFormData as any,
      },
    });

    // Then, transition state based on decision
    if (decision === 'DAT') {
      // Approve and move to school acceptance review
      const result = await this.workflow.approveFacultyAcceptance(proposalId, context);
      return result;
    } else if (decision === 'KHONG_DAT') {
      // Return for changes
      const reason = acceptanceData?.comments || 'Yêu cầu sửa đổi theo đánh giá nghiệm thu Khoa';
      const result = await this.workflow.returnFacultyAcceptance(proposalId, reason, context);
      return result;
    } else {
      throw new Error(`Invalid decision: ${decision}. Must be 'DAT' or 'KHONG_DAT'`);
    }
  }

  /**
   * School acceptance decision (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER or CHANGES_REQUESTED)
   * Phase C: After faculty acceptance, school reviews and decides DAT/KHONG_DAT
   *
   * - If decision = DAT: transitions to HANDOVER
   * - If decision = KHONG_DAT: transitions to CHANGES_REQUESTED with return to SCHOOL_ACCEPTANCE_REVIEW
   *
   * Note: Acceptance data is stored in formData under 'schoolAcceptance' key
   */
  async schoolAcceptance(
    proposalId: string,
    acceptanceData: any,
    context: TransitionContext,
  ) {
    this.logger.log(`School acceptance decision for proposal ${proposalId}`);

    const decision = acceptanceData?.decision; // 'DAT' or 'KHONG_DAT'

    // Get current formData and merge acceptance data
    const current = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { formData: true },
    });

    const mergedFormData = {
      ...(current?.formData as any || {}),
      schoolAcceptance: acceptanceData,
    };

    // Update proposal with acceptance data in formData
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        formData: mergedFormData as any,
      },
    });

    // Then, transition state based on decision
    if (decision === 'DAT') {
      // Approve and move to handover
      const result = await this.workflow.acceptSchoolReview(proposalId, context);
      return result;
    } else if (decision === 'KHONG_DAT') {
      // Return for changes
      const reason = acceptanceData?.comments || 'Yêu cầu sửa đổi theo đánh giá nghiệm thu Trường';
      const result = await this.workflow.returnSchoolReview(proposalId, reason, context);
      return result;
    } else {
      throw new Error(`Invalid decision: ${decision}. Must be 'DAT' or 'KHONG_DAT'`);
    }
  }

  /**
   * Complete handover (HANDOVER → COMPLETED)
   */
  async completeHandover(
    proposalId: string,
    context: TransitionContext,
  ) {
    this.logger.log(`Completing handover for proposal ${proposalId}`);

    const result = await this.workflow.transitionState(
      proposalId,
      ProjectState.COMPLETED,
      WorkflowAction.HANDOVER_COMPLETE,
      context,
    );

    return result;
  }

  /**
   * Sync proposal state with workflow
   */
  async syncState(proposalId: string): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Sync logic can be added here if needed
    // For now, the workflow service handles state updates
  }

  /**
   * Get proposal workflow state
   */
  async getWorkflowState(proposalId: string): Promise<ProjectState | null> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    return proposal?.state || null;
  }

  /**
   * Get proposal workflow logs
   * Note: WorkflowLog doesn't have actor relation, using actorId instead
   */
  async getWorkflowLogs(proposalId: string, take = 50) {
    const logs = await this.prisma.workflowLog.findMany({
      where: { proposalId },
      orderBy: { timestamp: 'desc' },
      take,
    });

    return logs;
  }

  /**
   * Get proposal timeline
   */
  async getTimeline(proposalId: string) {
    const [proposal, workflowLogs, attachments] = await Promise.all([
      this.prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
            },
          },
          faculty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.workflowLog.findMany({
        where: { proposalId },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.proposal.findUnique({
        where: { id: proposalId },
        select: { attachments: true },
      }),
    ]);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    return {
      proposal,
      workflowLogs,
      attachments: attachments?.attachments || [],
    };
  }

  /**
   * Handle workflow transition event
   *
   * Routes workflow actions to the appropriate methods based on action type.
   * Note: This method routes Phase A transitions directly to workflow service.
   * Phase C acceptance decisions should use facultyAcceptance()/schoolAcceptance()
   * methods directly which handle decision-based routing (DAT/KHONG_DAT).
   * RETURN actions require a reason parameter and should be called directly.
   */
  async handleTransition(
    proposalId: string,
    action: WorkflowAction,
    context: TransitionContext,
  ) {
    this.logger.log(`Handling workflow transition: ${action} for proposal ${proposalId}`);

    switch (action) {
      case WorkflowAction.SUBMIT:
        return this.submitToWorkflow(proposalId, context);

      case WorkflowAction.START_PROJECT:
        return this.startProject(proposalId, context);

      case WorkflowAction.APPROVE:
        // Phase A: Route based on current state
        const currentState = await this.getWorkflowState(proposalId);
        if (currentState === ProjectState.FACULTY_REVIEW) {
          return this.workflow.approveFacultyReview(proposalId, context);
        } else if (currentState === ProjectState.OUTLINE_COUNCIL_REVIEW) {
          return this.workflow.approveCouncilReview(proposalId, context);
        }
        break;

      case WorkflowAction.FACULTY_ACCEPT:
        // Phase C: Faculty acceptance review approval
        return this.workflow.approveFacultyAcceptance(proposalId, context);

      case WorkflowAction.ACCEPT:
        // Phase C: School acceptance review approval
        return this.workflow.acceptSchoolReview(proposalId, context);

      case WorkflowAction.HANDOVER_COMPLETE:
        // Phase C: Complete handover
        return this.completeHandover(proposalId, context);

      default:
        throw new Error(`Unsupported workflow action: ${action}`);
    }

    throw new Error(`Cannot handle action ${action} in current state`);
  }

  /**
   * Check if proposal can transition to target state
   */
  async canTransitionTo(
    proposalId: string,
    targetState: ProjectState,
  ): Promise<boolean> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    if (!proposal) {
      return false;
    }

    // Use workflow service to validate transition
    try {
      // This would call WorkflowValidatorService
      // For now, return true
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get next valid states for proposal
   */
  async getNextValidStates(proposalId: string): Promise<ProjectState[]> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    if (!proposal) {
      return [];
    }

    // This would use state machine helper
    // For now, return common transitions based on current state
    const transitions: Record<ProjectState, ProjectState[]> = {
      [ProjectState.DRAFT]: [ProjectState.FACULTY_REVIEW, ProjectState.CANCELLED],
      [ProjectState.FACULTY_REVIEW]: [
        ProjectState.SCHOOL_SELECTION_REVIEW,
        ProjectState.CHANGES_REQUESTED,
        ProjectState.WITHDRAWN,
      ],
      [ProjectState.SCHOOL_SELECTION_REVIEW]: [
        ProjectState.OUTLINE_COUNCIL_REVIEW,
        ProjectState.WITHDRAWN,
      ],
      [ProjectState.OUTLINE_COUNCIL_REVIEW]: [
        ProjectState.APPROVED,
        ProjectState.CHANGES_REQUESTED,
        ProjectState.REJECTED,
      ],
      [ProjectState.APPROVED]: [ProjectState.IN_PROGRESS],
      [ProjectState.IN_PROGRESS]: [
        ProjectState.FACULTY_ACCEPTANCE_REVIEW,
        ProjectState.PAUSED,
        ProjectState.COMPLETED,
      ],
      [ProjectState.FACULTY_ACCEPTANCE_REVIEW]: [
        ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
        ProjectState.IN_PROGRESS,
      ],
      [ProjectState.SCHOOL_ACCEPTANCE_REVIEW]: [
        ProjectState.HANDOVER,
        ProjectState.IN_PROGRESS,
      ],
      [ProjectState.HANDOVER]: [ProjectState.COMPLETED],
      [ProjectState.PAUSED]: [ProjectState.IN_PROGRESS],
      [ProjectState.CHANGES_REQUESTED]: [ProjectState.FACULTY_REVIEW],
      // Terminal states
      [ProjectState.CANCELLED]: [],
      [ProjectState.WITHDRAWN]: [],
      [ProjectState.REJECTED]: [],
      [ProjectState.COMPLETED]: [],
    };

    return transitions[proposal.state] || [];
  }
}
