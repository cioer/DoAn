import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState, WorkflowAction } from '@prisma/client';
import { WorkflowLog } from '@prisma/client';

/**
 * Timeline Event Interface
 */
export interface TimelineEvent {
  timestamp: Date;
  action: string;
  fromState?: ProjectState;
  toState?: ProjectState;
  actor: {
    id: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Workflow Query Service
 *
 * Handles read operations for workflow data.
 * Separates query logic from transition logic.
 *
 * Phase 2 Refactor: Extracted from workflow.service.ts
 */
@Injectable()
export class WorkflowQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get workflow logs for a proposal
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
   * Get latest RETURN log for a proposal
   *
   * Used by resubmitProposal to determine return target.
   *
   * @param proposalId - Proposal ID
   * @returns Latest RETURN log or null
   */
  async getLatestReturnLog(proposalId: string): Promise<WorkflowLog | null> {
    return this.prisma.workflowLog.findFirst({
      where: {
        proposalId,
        toState: ProjectState.CHANGES_REQUESTED,
        action: WorkflowAction.RETURN,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get workflow history with filters
   *
   * @param proposalId - Proposal ID
   * @param options - Query options (limit, offset, actions)
   * @returns Filtered logs with total count
   */
  async getWorkflowHistory(
    proposalId: string,
    options?: {
      limit?: number;
      offset?: number;
      actions?: WorkflowAction[];
    },
  ): Promise<{ logs: WorkflowLog[]; total: number }> {
    const { limit = 50, offset = 0, actions } = options || {};

    const where: any = { proposalId };

    if (actions && actions.length > 0) {
      where.action = { in: actions };
    }

    const [logs, total] = await Promise.all([
      this.prisma.workflowLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.workflowLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get proposal timeline
   *
   * Enriched timeline with state transitions and metadata.
   * Useful for UI timeline visualization.
   *
   * @param proposalId - Proposal ID
   * @returns Timeline events in chronological order
   */
  async getProposalTimeline(proposalId: string): Promise<TimelineEvent[]> {
    const logs = await this.prisma.workflowLog.findMany({
      where: { proposalId },
      orderBy: { timestamp: 'asc' },
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      fromState: log.fromState,
      toState: log.toState,
      actor: {
        id: log.actorId,
        name: log.actor?.displayName || 'Unknown User',
      },
      metadata: log.metadata as Record<string, unknown> | undefined,
    }));
  }

  /**
   * Get workflow logs by action type
   *
   * @param proposalId - Proposal ID
   * @param action - Workflow action to filter by
   * @returns Logs for the specified action
   */
  async getLogsByAction(
    proposalId: string,
    action: WorkflowAction,
  ): Promise<WorkflowLog[]> {
    return this.prisma.workflowLog.findMany({
      where: {
        proposalId,
        action,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get workflow logs by date range
   *
   * @param proposalId - Proposal ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Logs within the date range
   */
  async getLogsByDateRange(
    proposalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WorkflowLog[]> {
    return this.prisma.workflowLog.findMany({
      where: {
        proposalId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get proposal current state with transition count
   *
   * @param proposalId - Proposal ID
   * @returns Proposal state and transition statistics
   */
  async getProposalStateStats(proposalId: string): Promise<{
    currentState: ProjectState;
    totalTransitions: number;
    lastTransitionAt: Date | null;
    lastAction: WorkflowAction | null;
  }> {
    const [proposal, logCount, lastLog] = await Promise.all([
      this.prisma.proposal.findUnique({
        where: { id: proposalId },
        select: { state: true },
      }),
      this.prisma.workflowLog.count({ where: { proposalId } }),
      this.prisma.workflowLog.findFirst({
        where: { proposalId },
        orderBy: { timestamp: 'desc' },
        select: { action: true, timestamp: true },
      }),
    ]);

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    return {
      currentState: proposal.state,
      totalTransitions: logCount,
      lastTransitionAt: lastLog?.timestamp || null,
      lastAction: lastLog?.action || null,
    };
  }
}
