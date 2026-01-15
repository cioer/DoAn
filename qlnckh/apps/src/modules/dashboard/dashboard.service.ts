import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ProjectState } from '@prisma/client';
import { SlaService } from '../calendar/sla.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RbacService } from '../rbac/rbac.service';
import { Permission } from '../rbac/permissions.enum';
import {
  DashboardKpiDto,
  DashboardDataDto,
  OverdueProposalDto,
  StatusDistributionDto,
  REVIEW_STATES,
} from './dto/dashboard.dto';
import {
  FacultyDashboardKpiDto,
  FacultyDashboardDataDto,
  FacultyStatusDistributionDto,
  FacultyMonthlyTrendDto,
  FACULTY_DASHBOARD_STATE_MAPPING,
} from './dto/faculty-dashboard.dto';
import {
  CouncilDashboardDataDto,
  CouncilDashboardKpiDto,
  CouncilProposalItemDto,
  CouncilEvaluationItemDto,
  CouncilInfoDto,
} from './dto/council-dashboard.dto';
import {
  BghDashboardDataDto,
  BghDashboardKpiDto,
  BghProposalItemDto,
  SystemKpiDto,
  FacultyStatsDto,
  MonthlyTrendDto,
  UserStatsDto,
  CouncilStatsDto,
} from './dto/bgh-dashboard.dto';

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
    private rbacService: RbacService,
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
   * @returns Complete dashboard data with KPI, overdue list, and chart data
   */
  async getDashboardData(): Promise<DashboardDataDto> {
    const [kpi, overdueList] = await Promise.all([
      this.getKpiData(),
      this.getOverdueList(),
    ]);

    // ==================== BUILD STATUS DISTRIBUTION ====================
    // Count proposals by state for system-wide pie chart
    const now = new Date();
    const [
      totalProposals,
      draft,
      facultyReview,
      schoolSelectionReview,
      councilReview,
      schoolAcceptanceReview,
      approved,
      rejected,
      changesRequested,
      inProgress,
      handover,
      completed,
    ] = await Promise.all([
      this.prisma.proposal.count({ where: { deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.DRAFT, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.FACULTY_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.SCHOOL_SELECTION_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.OUTLINE_COUNCIL_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.SCHOOL_ACCEPTANCE_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.APPROVED, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.REJECTED, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.CHANGES_REQUESTED, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.IN_PROGRESS, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.HANDOVER, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.COMPLETED, deletedAt: null } }),
    ]);

    // Build status distribution for pie chart
    const statusDistribution = [
      { state: 'DRAFT', stateName: 'Nháp', count: draft, percentage: totalProposals > 0 ? Math.round((draft / totalProposals) * 100) : 0 },
      { state: 'FACULTY_REVIEW', stateName: 'Đang xét (Khoa)', count: facultyReview, percentage: totalProposals > 0 ? Math.round((facultyReview / totalProposals) * 100) : 0 },
      { state: 'SCHOOL_REVIEW', stateName: 'Đang xét (Trường)', count: schoolSelectionReview, percentage: totalProposals > 0 ? Math.round((schoolSelectionReview / totalProposals) * 100) : 0 },
      { state: 'COUNCIL_REVIEW', stateName: 'Đang xét (HĐ)', count: councilReview, percentage: totalProposals > 0 ? Math.round((councilReview / totalProposals) * 100) : 0 },
      { state: 'APPROVED', stateName: 'Đã duyệt', count: approved, percentage: totalProposals > 0 ? Math.round((approved / totalProposals) * 100) : 0 },
      { state: 'REJECTED', stateName: 'Từ chối', count: rejected, percentage: totalProposals > 0 ? Math.round((rejected / totalProposals) * 100) : 0 },
      { state: 'CHANGES_REQUESTED', stateName: 'Yêu cầu sửa', count: changesRequested, percentage: totalProposals > 0 ? Math.round((changesRequested / totalProposals) * 100) : 0 },
      { state: 'IN_PROGRESS', stateName: 'Đang thực hiện', count: inProgress, percentage: totalProposals > 0 ? Math.round((inProgress / totalProposals) * 100) : 0 },
      { state: 'ACCEPTANCE_REVIEW', stateName: 'Nghiệm thu', count: schoolAcceptanceReview, percentage: totalProposals > 0 ? Math.round((schoolAcceptanceReview / totalProposals) * 100) : 0 },
      { state: 'COMPLETED', stateName: 'Hoàn thành', count: completed, percentage: totalProposals > 0 ? Math.round((completed / totalProposals) * 100) : 0 },
      { state: 'HANDOVER', stateName: 'Bàn giao', count: handover, percentage: totalProposals > 0 ? Math.round((handover / totalProposals) * 100) : 0 },
    ].filter((item) => item.count > 0); // Only show states with data

    // ==================== BUILD MONTHLY TRENDS ====================
    // Get monthly trends for the last 6 months
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const [newProposals, approvedCount, rejectedCount, completedCount] = await Promise.all([
        this.prisma.proposal.count({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
            deletedAt: null,
          },
        }),
        this.prisma.proposal.count({
          where: {
            state: ProjectState.APPROVED,
            updatedAt: { gte: startOfMonth, lte: endOfMonth },
            deletedAt: null,
          },
        }),
        this.prisma.proposal.count({
          where: {
            state: ProjectState.REJECTED,
            updatedAt: { gte: startOfMonth, lte: endOfMonth },
            deletedAt: null,
          },
        }),
        this.prisma.proposal.count({
          where: {
            state: { in: [ProjectState.COMPLETED, ProjectState.HANDOVER] },
            updatedAt: { gte: startOfMonth, lte: endOfMonth },
            deletedAt: null,
          },
        }),
      ]);

      monthlyTrends.push({
        month: monthStr,
        newProposals,
        approved: approvedCount,
        rejected: rejectedCount,
        completed: completedCount,
      });
    }

    return {
      kpi,
      overdueList,
      lastUpdated: now,
      statusDistribution,
      monthlyTrends,
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
   * Uses permission-based check instead of role-based (DEBT MITIGATION)
   *
   * @param userRole - User's role
   * @throws BadRequestException if user lacks permission
   */
  async validateDashboardPermission(userRole: string): Promise<void> {
    const hasPermission = await this.rbacService.hasPermission(
      userRole as any,
      Permission.DASHBOARD_VIEW,
    );
    if (!hasPermission) {
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
   * Get faculty dashboard data for QUAN_LY_KHOA
   * Faculty-specific KPI and proposal list
   *
   * @param facultyId - Faculty ID to filter data
   * @returns Faculty dashboard data with KPI and recent proposals
   */
  async getFacultyDashboardData(facultyId: string): Promise<FacultyDashboardDataDto> {
    // Count proposals by state for faculty KPI
    const [
      totalProposals,
      pendingReview,
      approved,
      returned,
      inProgress,
      completed,
      pendingAcceptance,
      acceptedByFaculty,
    ] = await Promise.all([
      // Total proposals for this faculty
      this.prisma.proposal.count({
        where: { facultyId, deletedAt: null },
      }),
      // Pending review (FACULTY_REVIEW)
      this.prisma.proposal.count({
        where: {
          facultyId,
          state: { in: FACULTY_DASHBOARD_STATE_MAPPING.pendingReview },
          deletedAt: null,
        },
      }),
      // Approved (in higher review stages)
      this.prisma.proposal.count({
        where: {
          facultyId,
          state: { in: FACULTY_DASHBOARD_STATE_MAPPING.approved },
          deletedAt: null,
        },
      }),
      // Returned for changes
      this.prisma.proposal.count({
        where: {
          facultyId,
          state: { in: FACULTY_DASHBOARD_STATE_MAPPING.returned },
          deletedAt: null,
        },
      }),
      // In progress (DRAFT)
      this.prisma.proposal.count({
        where: {
          facultyId,
          state: { in: FACULTY_DASHBOARD_STATE_MAPPING.inProgress },
          deletedAt: null,
        },
      }),
      // Completed (HANDOVER, APPROVED, COMPLETED)
      this.prisma.proposal.count({
        where: {
          facultyId,
          state: { in: FACULTY_DASHBOARD_STATE_MAPPING.completed },
          deletedAt: null,
        },
      }),
      // Pending acceptance (FACULTY_ACCEPTANCE_REVIEW) - proposals waiting for faculty manager to accept
      this.prisma.proposal.count({
        where: {
          facultyId,
          state: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
          deletedAt: null,
        },
      }),
      // Accepted by faculty (SCHOOL_ACCEPTANCE_REVIEW) - proposals that faculty has accepted
      this.prisma.proposal.count({
        where: {
          facultyId,
          state: ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
          deletedAt: null,
        },
      }),
    ]);

    // Get recent proposals for this faculty (latest 10)
    const recentProposals = await this.prisma.proposal.findMany({
      where: { facultyId, deletedAt: null },
      include: {
        owner: true,
        faculty: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const kpi: FacultyDashboardKpiDto = {
      totalProposals,
      pendingReview,
      approved,
      returned,
      inProgress,
      completed,
      pendingAcceptance,
      acceptedByFaculty,
    };

    // Build status distribution for pie chart
    const statusDistribution: FacultyStatusDistributionDto[] = [
      {
        state: 'DRAFT',
        stateName: 'Nháp',
        count: inProgress,
        percentage: totalProposals > 0 ? Math.round((inProgress / totalProposals) * 100) : 0,
      },
      {
        state: 'FACULTY_REVIEW',
        stateName: 'Đang xét duyệt',
        count: pendingReview,
        percentage: totalProposals > 0 ? Math.round((pendingReview / totalProposals) * 100) : 0,
      },
      {
        state: 'APPROVED',
        stateName: 'Đã duyệt',
        count: approved,
        percentage: totalProposals > 0 ? Math.round((approved / totalProposals) * 100) : 0,
      },
      {
        state: 'CHANGES_REQUESTED',
        stateName: 'Yêu cầu sửa',
        count: returned,
        percentage: totalProposals > 0 ? Math.round((returned / totalProposals) * 100) : 0,
      },
      {
        state: 'COMPLETED',
        stateName: 'Hoàn thành',
        count: completed,
        percentage: totalProposals > 0 ? Math.round((completed / totalProposals) * 100) : 0,
      },
      {
        state: 'ACCEPTANCE',
        stateName: 'Nghiệm thu',
        count: pendingAcceptance + acceptedByFaculty,
        percentage: totalProposals > 0 ? Math.round(((pendingAcceptance + acceptedByFaculty) / totalProposals) * 100) : 0,
      },
    ].filter(item => item.count > 0); // Only show states with data

    // Get monthly trends for the last 6 months
    const now = new Date();
    const monthlyTrends: FacultyMonthlyTrendDto[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      // Count new proposals created in this month
      const newProposals = await this.prisma.proposal.count({
        where: {
          facultyId,
          createdAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      });

      // Count proposals approved in this month (moved to approved states)
      const approvedInMonth = await this.prisma.proposal.count({
        where: {
          facultyId,
          state: { in: FACULTY_DASHBOARD_STATE_MAPPING.approved },
          updatedAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      });

      // Count proposals completed in this month
      const completedInMonth = await this.prisma.proposal.count({
        where: {
          facultyId,
          state: { in: FACULTY_DASHBOARD_STATE_MAPPING.completed },
          updatedAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      });

      monthlyTrends.push({
        month: monthStr,
        newProposals,
        approved: approvedInMonth,
        completed: completedInMonth,
      });
    }

    this.logger.log(
      `Faculty dashboard data retrieved for faculty ${facultyId}: ${totalProposals} total, ${pendingReview} pending, ${approved} approved`,
    );

    // Fetch faculty name for display
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { id: true, name: true, code: true },
    });

    const facultyName = faculty
      ? `${faculty.name} (${faculty.code})`
      : 'Khoa không xác định';

    return {
      kpi,
      recentProposals,
      facultyName,
      facultyId,
      statusDistribution,
      monthlyTrends,
    };
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

  /**
   * Get council member dashboard data for HOI_DONG and THU_KY_HOI_DONG
   * Shows proposals assigned to council for evaluation
   *
   * @param userId - User ID (council member)
   * @param userRole - User role (HOI_DONG or THU_KY_HOI_DONG)
   * @returns Council dashboard data with KPI, pending proposals, and submitted evaluations
   */
  async getCouncilDashboardData(
    userId: string,
    userRole: string,
  ): Promise<CouncilDashboardDataDto> {
    const now = new Date();
    const isSecretary = userRole === 'THU_KY_HOI_DONG';

    // Get all councils where user is a member
    const councilMembers = await this.prisma.councilMember.findMany({
      where: { userId },
      include: {
        council: {
          select: { id: true, name: true },
        },
      },
    });

    // Also check if user is secretary via holderUser in proposals
    const secretaryProposals = await this.prisma.proposal.findMany({
      where: {
        holderUser: userId,
        state: ProjectState.OUTLINE_COUNCIL_REVIEW,
      },
      select: { councilId: true },
    });

    // Get unique council IDs
    const councilIds = [
      ...new Set([
        ...councilMembers.map((cm) => cm.councilId),
        ...secretaryProposals.map((p) => p.councilId).filter((id): id is string => id !== null),
      ]),
    ];

    // Get proposals in council review state for these councils
    const proposals = await this.prisma.proposal.findMany({
      where: {
        state: ProjectState.OUTLINE_COUNCIL_REVIEW,
        councilId: { in: councilIds },
        deletedAt: null,
      },
      include: {
        owner: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user's evaluations for these proposals
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        evaluatorId: userId,
        proposalId: { in: proposals.map((p) => p.id) },
      },
    });

    const evaluationMap = new Map(evaluations.map((e) => [e.proposalId, e]));

    // Calculate KPI
    const totalAssigned = proposals.length;
    const evaluated = evaluations.filter((e) => e.state === 'FINALIZED').length;
    const pendingEvaluation = totalAssigned - evaluated;

    // Count proposals ready for finalize (all members submitted) - secretary only
    let pendingFinalize = 0;
    if (isSecretary) {
      // Get all councils where user is secretary
      const secretaryCouncilIds = councilMembers
        .filter((cm) => cm.role === 'SECRETARY')
        .map((cm) => cm.councilId);

      if (secretaryCouncilIds.length > 0) {
        // For each proposal in secretary's councils, check if all evaluations are submitted
        for (const proposal of proposals) {
          if (proposal.councilId && secretaryCouncilIds.includes(proposal.councilId)) {
            const memberCount = await this.prisma.councilMember.count({
              where: { councilId: proposal.councilId },
            });
            const submittedCount = await this.prisma.evaluation.count({
              where: {
                proposalId: proposal.id,
                state: 'FINALIZED',
              },
            });
            if (submittedCount >= memberCount && memberCount > 0) {
              pendingFinalize++;
            }
          }
        }
      }
    }

    const kpi: CouncilDashboardKpiDto = {
      pendingEvaluation,
      evaluated,
      totalAssigned,
      pendingFinalize,
    };

    // Build pending proposals list
    const pendingProposals: CouncilProposalItemDto[] = proposals
      .filter((p) => {
        const evaluation = evaluationMap.get(p.id);
        return !evaluation || evaluation.state !== 'FINALIZED';
      })
      .map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        state: p.state,
        ownerId: p.owner.id,
        ownerName: p.owner.displayName,
        createdAt: p.createdAt,
        slaDeadline: p.slaDeadline,
        hasSubmitted: evaluationMap.get(p.id)?.state === 'FINALIZED',
      }));

    // Build submitted evaluations list
    const submittedEvaluations: CouncilEvaluationItemDto[] = evaluations
      .filter((e) => e.state === 'FINALIZED')
      .map((e) => {
        const proposal = proposals.find((p) => p.id === e.proposalId);
        const formData = e.formData as any;
        const scores = [
          formData?.scientificContent?.score || 0,
          formData?.researchMethod?.score || 0,
          formData?.feasibility?.score || 0,
          formData?.budget?.score || 0,
        ];
        const averageScore = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

        return {
          id: e.id,
          proposalId: e.proposalId,
          proposalCode: proposal?.code || 'N/A',
          proposalTitle: proposal?.title || 'N/A',
          state: e.state,
          conclusion: formData?.conclusion || null,
          averageScore: Math.round(averageScore * 10) / 10,
          updatedAt: e.updatedAt,
        };
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Get council info (first council or primary council)
    let council: CouncilInfoDto | null = null;
    if (councilMembers.length > 0) {
      const primaryCouncil = councilMembers[0];
      const memberCount = await this.prisma.councilMember.count({
        where: { councilId: primaryCouncil.councilId },
      });

      council = {
        id: primaryCouncil.council.id,
        name: primaryCouncil.council.name,
        memberCount,
        isSecretary,
      };
    }

    this.logger.log(
      `Council dashboard data retrieved for user ${userId}: ${totalAssigned} total, ${pendingEvaluation} pending, ${evaluated} evaluated`,
    );

    return {
      kpi,
      pendingProposals,
      submittedEvaluations,
      council,
      lastUpdated: now,
    };
  }

  /**
   * Get BAN_GIAM_HOC (Hiệu trưởng) dashboard data
   * Shows proposals in SCHOOL_ACCEPTANCE_REVIEW state for final school acceptance
   * AND system-wide statistics for executive oversight
   *
   * @returns BAN_GIAM_HOC dashboard data with KPI, system stats, and proposals
   */
  async getBghDashboardData(): Promise<BghDashboardDataDto> {
    const now = new Date();

    // ==================== QUICK ACTION KPI ====================
    // Get proposals in SCHOOL_ACCEPTANCE_REVIEW state
    const pendingProposals = await this.prisma.proposal.findMany({
      where: {
        state: ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
        deletedAt: null,
      },
      include: {
        owner: {
          select: { id: true, displayName: true, email: true },
        },
        faculty: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { slaDeadline: 'asc' },
    });

    // Calculate days remaining and check overdue
    const pendingWithDaysRemaining: BghProposalItemDto[] = pendingProposals.map((p) => {
      const daysRemaining = p.slaDeadline
        ? Math.ceil((p.slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: p.id,
        code: p.code,
        title: p.title,
        state: p.state,
        ownerName: p.owner.displayName,
        ownerEmail: p.owner.email,
        facultyName: p.faculty.name,
        slaDeadline: p.slaDeadline,
        daysRemaining,
        isOverdue: p.slaDeadline ? p.slaDeadline < now : false,
        submittedDate: p.updatedAt,
        facultyDecision: null,
        createdAt: p.createdAt,
      };
    });

    // Get recently approved (moved to HANDOVER by BAN_GIAM_HOC)
    const recentlyApprovedRaw = await this.prisma.proposal.findMany({
      where: {
        state: ProjectState.HANDOVER,
        deletedAt: null,
      },
      include: {
        owner: {
          select: { id: true, displayName: true, email: true },
        },
        faculty: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    const recentlyApproved: BghProposalItemDto[] = recentlyApprovedRaw.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      state: p.state,
      ownerName: p.owner.displayName,
      ownerEmail: p.owner.email,
      facultyName: p.faculty.name,
      slaDeadline: p.slaDeadline,
      daysRemaining: 0,
      isOverdue: false,
      submittedDate: p.updatedAt,
      facultyDecision: 'DAT',
      createdAt: p.createdAt,
    }));

    // Get returned proposals (CHANGES_REQUESTED from SCHOOL_ACCEPTANCE_REVIEW)
    const returnedProposalsRaw = await this.prisma.proposal.findMany({
      where: {
        state: ProjectState.CHANGES_REQUESTED,
        deletedAt: null,
        holderUnit: { not: null },
      },
      include: {
        owner: {
          select: { id: true, displayName: true, email: true },
        },
        faculty: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    const returnedProposals: BghProposalItemDto[] = returnedProposalsRaw.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      state: p.state,
      ownerName: p.owner.displayName,
      ownerEmail: p.owner.email,
      facultyName: p.faculty.name,
      slaDeadline: p.slaDeadline,
      daysRemaining: 0,
      isOverdue: false,
      submittedDate: p.updatedAt,
      facultyDecision: null,
      createdAt: p.createdAt,
    }));

    // Count total approved by BAN_GIAM_HOC (in HANDOVER or COMPLETED)
    const approvedCount = await this.prisma.proposal.count({
      where: {
        state: { in: [ProjectState.HANDOVER, ProjectState.COMPLETED] },
        deletedAt: null,
      },
    });

    // Count returned from school acceptance
    const returnedCount = await this.prisma.proposal.count({
      where: {
        state: ProjectState.CHANGES_REQUESTED,
        deletedAt: null,
      },
    });

    // Build quick action KPI
    const kpi: BghDashboardKpiDto = {
      pendingAcceptance: pendingWithDaysRemaining.length,
      approved: approvedCount,
      returned: returnedCount,
      totalPending: pendingWithDaysRemaining.length,
    };

    // ==================== SYSTEM-WIDE STATISTICS ====================

    // Count proposals by state for system KPI
    const [
      totalProposals,
      draft,
      facultyReview,
      schoolSelectionReview,
      councilReview,
      schoolAcceptanceReview,
      approved,
      rejected,
      changesRequested,
      inProgress,
      handover,
      completed,
    ] = await Promise.all([
      this.prisma.proposal.count({ where: { deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.DRAFT, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.FACULTY_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.SCHOOL_SELECTION_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.OUTLINE_COUNCIL_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.SCHOOL_ACCEPTANCE_REVIEW, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.APPROVED, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.REJECTED, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.CHANGES_REQUESTED, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.IN_PROGRESS, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.HANDOVER, deletedAt: null } }),
      this.prisma.proposal.count({ where: { state: ProjectState.COMPLETED, deletedAt: null } }),
    ]);

    // Calculate approval rate
    const totalDecided = approved + rejected;
    const approvalRate = totalDecided > 0 ? Math.round((approved / totalDecided) * 100 * 10) / 10 : 0;

    // Count overdue proposals (in review states with SLA deadline past)
    const reviewStates = [
      ProjectState.FACULTY_REVIEW,
      ProjectState.SCHOOL_SELECTION_REVIEW,
      ProjectState.OUTLINE_COUNCIL_REVIEW,
      ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
    ];
    const overdueCount = await this.prisma.proposal.count({
      where: {
        state: { in: reviewStates },
        slaDeadline: { lt: now },
        deletedAt: null,
      },
    });

    // Calculate SLA compliance rate
    const totalInReview = await this.prisma.proposal.count({
      where: {
        state: { in: reviewStates },
        deletedAt: null,
      },
    });
    const slaComplianceRate = totalInReview > 0
      ? Math.round(((totalInReview - overdueCount) / totalInReview) * 100 * 10) / 10
      : 100;

    const systemKpi: SystemKpiDto = {
      totalProposals,
      draft,
      facultyReview,
      schoolSelectionReview,
      councilReview,
      schoolAcceptanceReview,
      approved,
      rejected,
      changesRequested,
      inProgress,
      handover,
      completed,
      approvalRate,
      overdueCount,
      slaComplianceRate,
    };

    // ==================== FACULTY STATISTICS ====================
    const faculties = await this.prisma.faculty.findMany({
      select: { id: true, name: true, code: true },
    });

    const facultyStats: FacultyStatsDto[] = await Promise.all(
      faculties.map(async (faculty) => {
        const [total, pendingCount, approvedCount, rejectedCount, completedCount] =
          await Promise.all([
            this.prisma.proposal.count({
              where: { facultyId: faculty.id, deletedAt: null },
            }),
            this.prisma.proposal.count({
              where: {
                facultyId: faculty.id,
                state: { in: reviewStates },
                deletedAt: null,
              },
            }),
            this.prisma.proposal.count({
              where: {
                facultyId: faculty.id,
                state: { in: [ProjectState.APPROVED, ProjectState.HANDOVER, ProjectState.COMPLETED] },
                deletedAt: null,
              },
            }),
            this.prisma.proposal.count({
              where: { facultyId: faculty.id, state: ProjectState.REJECTED, deletedAt: null },
            }),
            this.prisma.proposal.count({
              where: { facultyId: faculty.id, state: ProjectState.COMPLETED, deletedAt: null },
            }),
          ]);

        return {
          facultyId: faculty.id,
          facultyCode: faculty.code,
          facultyName: faculty.name,
          totalProposals: total,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          completed: completedCount,
        };
      }),
    );

    // Sort by total proposals descending
    facultyStats.sort((a, b) => b.totalProposals - a.totalProposals);

    // ==================== MONTHLY TRENDS (Last 6 months) ====================
    const monthlyTrends: MonthlyTrendDto[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const [newProposals, approvedCount, rejectedCount, completedCount] =
        await Promise.all([
          this.prisma.proposal.count({
            where: {
              createdAt: { gte: startOfMonth, lte: endOfMonth },
              deletedAt: null,
            },
          }),
          this.prisma.proposal.count({
            where: {
              state: ProjectState.APPROVED,
              updatedAt: { gte: startOfMonth, lte: endOfMonth },
              deletedAt: null,
            },
          }),
          this.prisma.proposal.count({
            where: {
              state: ProjectState.REJECTED,
              updatedAt: { gte: startOfMonth, lte: endOfMonth },
              deletedAt: null,
            },
          }),
          this.prisma.proposal.count({
            where: {
              state: ProjectState.COMPLETED,
              completedDate: { gte: startOfMonth, lte: endOfMonth },
              deletedAt: null,
            },
          }),
        ]);

      monthlyTrends.push({
        month: monthStr,
        newProposals,
        approved: approvedCount,
        rejected: rejectedCount,
        completed: completedCount,
      });
    }

    // ==================== USER STATISTICS ====================
    const [giangVien, quanLyKhoa, hoiDong, thuKyHoiDong, phongKhcn, banGiamHoc, admin] =
      await Promise.all([
        this.prisma.user.count({ where: { role: 'GIANG_VIEN' } }),
        this.prisma.user.count({ where: { role: 'QUAN_LY_KHOA' } }),
        this.prisma.user.count({ where: { role: 'HOI_DONG' } }),
        this.prisma.user.count({ where: { role: 'THU_KY_HOI_DONG' } }),
        this.prisma.user.count({ where: { role: 'PHONG_KHCN' } }),
        this.prisma.user.count({ where: { role: { in: ['BAN_GIAM_HOC', 'BGH'] } } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
      ]);

    const userStats: UserStatsDto = {
      totalUsers: giangVien + quanLyKhoa + hoiDong + thuKyHoiDong + phongKhcn + banGiamHoc + admin,
      giangVien,
      quanLyKhoa,
      hoiDong,
      thuKyHoiDong,
      phongKhcn,
      banGiamHoc,
      admin,
    };

    // ==================== COUNCIL STATISTICS ====================
    const [totalCouncils, totalMembers, pendingCouncilProposals] = await Promise.all([
      this.prisma.council.count(),
      this.prisma.councilMember.count(),
      this.prisma.proposal.count({
        where: {
          state: ProjectState.OUTLINE_COUNCIL_REVIEW,
          councilId: { not: null },
          deletedAt: null,
        },
      }),
    ]);

    // Active councils = councils with proposals in review
    const activeCouncils = await this.prisma.council.count({
      where: {
        proposals: {
          some: {
            state: ProjectState.OUTLINE_COUNCIL_REVIEW,
          },
        },
      },
    });

    const councilStats: CouncilStatsDto = {
      totalCouncils,
      activeCouncils,
      pendingProposals: pendingCouncilProposals,
      totalMembers,
    };

    this.logger.log(
      `BAN_GIAM_HOC dashboard data retrieved: ${kpi.pendingAcceptance} pending, ${kpi.approved} approved, ${kpi.returned} returned | System: ${systemKpi.totalProposals} total proposals`,
    );

    return {
      kpi,
      systemKpi,
      facultyStats,
      monthlyTrends,
      userStats,
      councilStats,
      pendingProposals: pendingWithDaysRemaining,
      recentlyApproved,
      returnedProposals,
      lastUpdated: now,
    };
  }
}
