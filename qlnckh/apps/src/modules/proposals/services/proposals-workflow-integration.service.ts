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
   * Faculty acceptance (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
   * Note: Acceptance data is stored in formData under 'facultyAcceptance' key
   */
  async facultyAcceptance(
    proposalId: string,
    acceptanceData: any,
    context: TransitionContext,
  ) {
    this.logger.log(`Faculty acceptance for proposal ${proposalId}`);

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

    // Then, transition state
    const result = await this.workflow.approveFacultyReview(proposalId, context);

    return result;
  }

  /**
   * School acceptance (SCHOOL_SELECTION_REVIEW → SCHOOL_ACCEPTANCE_REVIEW)
   * Note: Acceptance data is stored in formData under 'schoolAcceptance' key
   */
  async schoolAcceptance(
    proposalId: string,
    acceptanceData: any,
    context: TransitionContext,
  ) {
    this.logger.log(`School acceptance for proposal ${proposalId}`);

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

    // Then, transition state
    const result = await this.workflow.approveCouncilReview(proposalId, context);

    return result;
  }

  /**
   * Complete handover (HANDOVER → APPROVED)
   */
  async completeHandover(
    proposalId: string,
    context: TransitionContext,
  ) {
    this.logger.log(`Completing handover for proposal ${proposalId}`);

    const result = await this.workflow.acceptSchoolReview(proposalId, context);

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
        // Determine which approval based on current state
        const currentState = await this.getWorkflowState(proposalId);
        if (currentState === ProjectState.FACULTY_REVIEW) {
          return this.facultyAcceptance(proposalId, null, context);
        } else if (currentState === ProjectState.SCHOOL_SELECTION_REVIEW) {
          return this.schoolAcceptance(proposalId, null, context);
        } else if (currentState === ProjectState.OUTLINE_COUNCIL_REVIEW) {
          return this.completeHandover(proposalId, context);
        }
        break;

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
