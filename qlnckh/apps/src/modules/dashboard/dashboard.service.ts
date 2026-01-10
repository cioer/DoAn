import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ProjectState } from '@prisma/client';
import { SlaService } from '../calendar/sla.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DashboardKpiDto,
  DashboardDataDto,
  OverdueProposalDto,
  REVIEW_STATES,
} from './dto/dashboard.dto';

/**
 * Context for dashboard operations
 */
interface DashboardContext {
  userId: string;
  userRole: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Dashboard Service
 * Story 8.4: Morning Check Dashboard (KPI + Overdue List)
 *
 * Handles dashboard data operations:
 * - Calculate KPI metrics
 * - Get overdue proposals list
 * - Bulk remind overdue proposals
 *
 * Critical: Follows Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private slaService: SlaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Get KPI data for dashboard
   * Story 8.4: AC2 - KPI Cards
   *
   * @returns DashboardKpiDto with all KPI metrics
   */
  async getKpiData(): Promise<DashboardKpiDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total waiting - proposals in review states
    // Proper typing - NO as unknown (Epic 7 retro pattern)
    const totalWaiting = await this.prisma.proposal.count({
      where: {
        state: { in: REVIEW_STATES },
        deletedAt: null,
      },
    });

    // Overdue - SLA deadline < now and in review states
    const overdueCount = await this.prisma.proposal.count({
      where: {
        state: { in: REVIEW_STATES },
        slaDeadline: { lt: now },
        deletedAt: null,
      },
    });

    // T-2 warning - within 2 working days
    const endDate = await this.slaService.addBusinessDays(now, 2);
    const t2WarningCount = await this.prisma.proposal.count({
      where: {
        state: { in: REVIEW_STATES },
        slaDeadline: {
          gt: now,
          lte: endDate,
        },
        deletedAt: null,
      },
    });

    // Completed this month
    const completedThisMonth = await this.prisma.proposal.count({
      where: {
        state: ProjectState.COMPLETED,
        completedDate: { gte: startOfMonth, lt: now },
        deletedAt: null,
      },
    });

    // Return KPI data - Proper typing, NO as unknown
    const kpiData: DashboardKpiDto = {
      totalWaiting,
      overdueCount,
      t2WarningCount,
      completedThisMonth,
    };

    this.logger.log(
      `KPI data: ${totalWaiting} waiting, ${overdueCount} overdue, ${t2WarningCount} warning, ${completedThisMonth} completed`,
    );

    return kpiData;
  }

  /**
   * Calculate overdue days for a proposal
   * Proper typing - NO as any (Epic 7 retro pattern)
   *
   * @param slaDeadline - SLA deadline date
   * @returns Number of overdue days (0 if not overdue)
   */
  private calculateOverdueDays(slaDeadline: Date | null): number {
    if (!slaDeadline) return 0;

    const now = new Date();
    const deadline = new Date(slaDeadline);
    const diffTime = now.getTime() - deadline.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Get overdue proposals list
   * Story 8.4: AC4 - Overdue List Table
   *
   * @returns Array of overdue proposals with details
   */
  async getOverdueList(): Promise<OverdueProposalDto[]> {
    const now = new Date();

    // Query overdue proposals - Proper typing
    const proposals = await this.prisma.proposal.findMany({
      where: {
        state: { in: REVIEW_STATES },
        slaDeadline: { lt: now },
        deletedAt: null,
      },
      orderBy: {
        slaDeadline: 'asc',
      },
    });

    // Get holder users for all proposals
    const holderUserIds = proposals
      .map((p) => p.holderUser)
      .filter((id): id is string => id !== null);

    const holders = holderUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: holderUserIds } },
          select: { id: true, displayName: true, email: true },
        })
      : [];

    const holderMap = new Map(holders.map((h) => [h.id, h]));

    // Map to DTO - Proper typing, NO as unknown (Epic 7 retro pattern)
    const result: OverdueProposalDto[] = proposals.map((p) => {
      const overdueDays = this.calculateOverdueDays(p.slaDeadline);
      const holder = p.holderUser ? holderMap.get(p.holderUser) : null;

      return {
        id: p.id,
        code: p.code,
        title: p.title,
        holderName: holder?.displayName || 'Chưa gán',
        holderEmail: holder?.email || '',
        overdueDays,
        slaDeadline: p.slaDeadline,
        slaStatus: overdueDays > 0 ? 'overdue' : 'warning',
        state: p.state,
      };
    });

    return result;
  }

  /**
   * Get complete dashboard data
   * Story 8.4: AC1 - Dashboard Access
   *
   * @returns Complete dashboard data with KPI and overdue list
   */
  async getDashboardData(): Promise<DashboardDataDto> {
    const [kpi, overdueList] = await Promise.all([
      this.getKpiData(),
      this.getOverdueList(),
    ]);

    return {
      kpi,
      overdueList,
      lastUpdated: new Date(),
    };
  }

  /**
   * Bulk remind all overdue proposals
   * Story 8.4: AC7 - Quick Actions
   *
   * @param context - Dashboard context
   * @returns Bulk remind result
   */
  async remindAllOverdue(context: DashboardContext): Promise<{
    success: number;
    failed: number;
    total: number;
    recipients: Array<{
      userId: string;
      userName: string;
      emailSent: boolean;
      error?: string;
    }>;
  }> {
    // Get overdue proposals
    const overdueProposals = await this.getOverdueList();

    if (overdueProposals.length === 0) {
      return {
        success: 0,
        failed: 0,
        total: 0,
        recipients: [],
      };
    }

    // Extract proposal IDs
    const proposalIds = overdueProposals.map((p) => p.id);

    // Use bulk remind from notifications service
    const result = await this.notificationsService.bulkRemind(
      proposalIds,
      false, // Not dry-run, actually send
      context,
    );

    return result;
  }

  /**
   * Validate user has permission to view dashboard
   * Only PHONG_KHCN and ADMIN can view dashboard
   *
   * @param userRole - User's role
   * @throws BadRequestException if user lacks permission
   */
  validateDashboardPermission(userRole: string): void {
    const allowedRoles = ['PHONG_KHCN', 'ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      });
    }
  }

  /**
   * Get personal dashboard data for GIANG_VIEN (Researcher)
   * GIANG_VIEN Feature: Personal dashboard with proposal stats
   *
   * @param userId - User ID (for filtering their proposals)
   * @returns Personal dashboard data
   */
  async getResearcherDashboardData(userId: string): Promise<{
    stats: {
      total: number;
      draft: number;
      underReview: number;
      approved: number;
      rejected: number;
      changesRequested: number;
    };
    recentProposals: Array<{
      id: string;
      code: string;
      title: string;
      state: ProjectState;
      createdAt: Date;
      updatedAt: Date;
      slaDeadline?: Date | null;
    }>;
    upcomingDeadlines: Array<{
      proposalId: string;
      proposalCode: string;
      proposalTitle: string;
      deadline: Date | null;
      daysRemaining: number;
    }>;
  }> {
    const now = new Date();

    // Count proposals by state
    const [
      total,
      draft,
      approved,
      rejected,
      changesRequested,
    ] = await Promise.all([
      // Total proposals
      this.prisma.proposal.count({
        where: { ownerId: userId, deletedAt: null },
      }),
      // Draft proposals
      this.prisma.proposal.count({
        where: { ownerId: userId, state: ProjectState.DRAFT, deletedAt: null },
      }),
      // Approved proposals
      this.prisma.proposal.count({
        where: { ownerId: userId, state: ProjectState.APPROVED, deletedAt: null },
      }),
      // Rejected proposals
      this.prisma.proposal.count({
        where: { ownerId: userId, state: ProjectState.REJECTED, deletedAt: null },
      }),
      // Changes requested proposals
      this.prisma.proposal.count({
        where: { ownerId: userId, state: ProjectState.CHANGES_REQUESTED, deletedAt: null },
      }),
    ]);

    // Under review - proposals in review states
    const REVIEW_STATES: ProjectState[] = [
      ProjectState.FACULTY_REVIEW,
      ProjectState.SCHOOL_SELECTION_REVIEW,
      ProjectState.OUTLINE_COUNCIL_REVIEW,
    ];

    const underReview = await this.prisma.proposal.count({
      where: {
        ownerId: userId,
        state: { in: REVIEW_STATES },
        deletedAt: null,
      },
    });

    // Get recent proposals (latest 5)
    const recentProposals = await this.prisma.proposal.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        state: true,
        createdAt: true,
        updatedAt: true,
        slaDeadline: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Get upcoming deadlines (proposals with SLA deadline within 7 days)
    const endDate = await this.slaService.addBusinessDays(now, 7);
    const proposalsWithDeadlines = await this.prisma.proposal.findMany({
      where: {
        ownerId: userId,
        state: { in: REVIEW_STATES },
        slaDeadline: { gt: now, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        title: true,
        slaDeadline: true,
      },
      orderBy: { slaDeadline: 'asc' },
      take: 5,
    });

    const upcomingDeadlines = proposalsWithDeadlines.map((p) => {
      const daysRemaining = p.slaDeadline
        ? Math.ceil((p.slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        proposalId: p.id,
        proposalCode: p.code,
        proposalTitle: p.title,
        deadline: p.slaDeadline,
        daysRemaining,
      };
    });

    this.logger.log(`Researcher dashboard data retrieved for user ${userId}`);

    return {
      stats: {
        total,
        draft,
        underReview,
        approved,
        rejected,
        changesRequested,
      },
      recentProposals,
      upcomingDeadlines,
    };
  }
}
