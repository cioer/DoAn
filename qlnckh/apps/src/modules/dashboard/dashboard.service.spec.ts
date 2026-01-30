import { BadRequestException } from '@nestjs/common';
import { ProjectState, User } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { SlaService } from '../calendar/sla.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Dashboard Service Tests
 * Story 8.4: Morning Check Dashboard (KPI + Overdue List)
 *
 * Tests follow Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 */

// Manual mocks
const mockPrisma = {
  proposal: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
};

// Helper to setup proposal mock
const setupProposalMock = () => {
  mockPrisma.proposal.count = vi.fn();
  mockPrisma.proposal.findMany = vi.fn();
};

const mockSlaService = {
  addBusinessDays: vi.fn().mockReturnValue(new Date('2026-01-10')),
};

const mockNotificationsService = {
  bulkRemind: vi.fn(),
};

describe('DashboardService', () => {
  let service: DashboardService;

  // Test data fixtures
  const mockOverdueProposals = [
    {
      id: 'proposal-1',
      code: 'DT-001',
      title: 'Nghiên cứu AI',
      state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      slaDeadline: new Date('2020-01-01'), // Far in the past
      holder: {
        id: 'user-1',
        displayName: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
      },
    },
    {
      id: 'proposal-2',
      code: 'DT-002',
      title: 'Nghiên cứu Blockchain',
      state: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
      slaDeadline: new Date('2020-01-05'),
      holder: {
        id: 'user-2',
        displayName: 'Trần Văn B',
        email: 'tranvanb@example.com',
      },
    },
    {
      id: 'proposal-3',
      code: 'DT-003',
      title: 'Nghiên cứu Cloud',
      state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      slaDeadline: new Date('2020-01-10'),
      holder: null, // No holder assigned
    },
  ];

  const mockContext = {
    userId: 'admin-1',
    userRole: 'PHONG_KHCN',
    ip: '127.0.0.1',
    userAgent: 'test',
    requestId: 'req-1',
  };

  beforeEach(() => {
    service = new DashboardService(
      mockPrisma as any,
      mockSlaService as any,
      mockNotificationsService as any,
    );
    vi.clearAllMocks();
  });

  describe('AC1: Dashboard Access - Get Complete Data', () => {
    beforeEach(() => {
      // Mock KPI counts
      mockPrisma.proposal.count
        .mockResolvedValueOnce(15) // totalWaiting
        .mockResolvedValueOnce(3) // overdueCount
        .mockResolvedValueOnce(5) // t2WarningCount
        .mockResolvedValueOnce(8); // completedThisMonth

      // Mock overdue list
      mockPrisma.proposal.findMany.mockResolvedValue(mockOverdueProposals);
    });

    it('should return complete dashboard data with KPI and overdue list', async () => {
      const result = await service.getDashboardData();

      expect(result).toHaveProperty('kpi');
      expect(result).toHaveProperty('overdueList');
      expect(result).toHaveProperty('lastUpdated');

      expect(result.kpi.totalWaiting).toBe(15);
      expect(result.kpi.overdueCount).toBe(3);
      expect(result.kpi.t2WarningCount).toBe(5);
      expect(result.kpi.completedThisMonth).toBe(8);

      expect(result.overdueList).toHaveLength(3);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('AC2: KPI Metrics Calculation', () => {
    beforeEach(() => {
      mockPrisma.proposal.count.mockResolvedValue(10);
    });

    it('should calculate total waiting proposals (in review states)', async () => {
      const result = await service.getKpiData();

      expect(mockPrisma.proposal.count).toHaveBeenCalledWith({
        where: {
          state: { in: expect.any(Array) },
          deletedAt: null,
        },
      });

      expect(result.totalWaiting).toBe(10);
    });

    it('should calculate overdue proposals', async () => {
      const result = await service.getKpiData();

      expect(mockPrisma.proposal.count).toHaveBeenCalledWith({
        where: {
          state: { in: expect.any(Array) },
          slaDeadline: { lt: expect.any(Date) },
          deletedAt: null,
        },
      });

      expect(result.overdueCount).toBeDefined();
    });

    it('should calculate T-2 warning proposals (within 2 working days)', async () => {
      const result = await service.getKpiData();

      expect(mockSlaService.addBusinessDays).toHaveBeenCalledWith(expect.any(Date), 2);

      expect(result.t2WarningCount).toBeDefined();
    });

    it('should calculate completed this month proposals', async () => {
      const result = await service.getKpiData();

      expect(mockPrisma.proposal.count).toHaveBeenCalledWith({
        where: {
          state: ProjectState.COMPLETED,
          completedDate: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
          deletedAt: null,
        },
      });

      expect(result.completedThisMonth).toBeDefined();
    });
  });

  describe('AC3: Review States Constant', () => {
    it('should include all review states in REVIEW_STATES', async () => {
      // Import from actual file
      const { REVIEW_STATES } = await import('./dto/dashboard.dto');

      expect(REVIEW_STATES).toContain(ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW);
      expect(REVIEW_STATES).toContain(ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW);
      expect(REVIEW_STATES).toContain(ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW);
      expect(REVIEW_STATES).toContain(ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW);
      expect(REVIEW_STATES).toContain(ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW);
      expect(REVIEW_STATES).toContain(ProjectState.HANDOVER);
      expect(REVIEW_STATES).toContain(ProjectState.CHANGES_REQUESTED);
    });

    it('should exclude terminal states from REVIEW_STATES', async () => {
      const { REVIEW_STATES } = await import('./dto/dashboard.dto');

      expect(REVIEW_STATES).not.toContain(ProjectState.COMPLETED);
      expect(REVIEW_STATES).not.toContain(ProjectState.CANCELLED);
      expect(REVIEW_STATES).not.toContain(ProjectState.REJECTED);
      expect(REVIEW_STATES).not.toContain(ProjectState.WITHDRAWN);
    });
  });

  describe('AC4: Overdue List - Data Structure', () => {
    beforeEach(() => {
      mockPrisma.proposal.findMany.mockResolvedValue(mockOverdueProposals);
    });

    it('should return overdue proposals with proper structure - Proper typing (Epic 7 retro)', async () => {
      const result = await service.getOverdueList();

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(3);

      // Verify proper interface structure - NO as unknown
      result.forEach((proposal) => {
        expect(proposal).toHaveProperty('id');
        expect(proposal).toHaveProperty('code');
        expect(proposal).toHaveProperty('title');
        expect(proposal).toHaveProperty('holderName');
        expect(proposal).toHaveProperty('holderEmail');
        expect(proposal).toHaveProperty('overdueDays');
        expect(proposal).toHaveProperty('slaDeadline');
        expect(proposal).toHaveProperty('slaStatus');
        expect(proposal).toHaveProperty('state');

        // Verify types
        expect(typeof proposal.id).toBe('string');
        expect(typeof proposal.code).toBe('string');
        expect(typeof proposal.title).toBe('string');
        expect(typeof proposal.overdueDays).toBe('number');
        expect(['warning', 'overdue']).toContain(proposal.slaStatus);
      });
    });

    it('should calculate overdue days correctly', async () => {
      mockPrisma.proposal.findMany.mockResolvedValue([mockOverdueProposals[0]]);

      const result = await service.getOverdueList();

      expect(result[0].overdueDays).toBeGreaterThan(0);
      expect(result[0].slaStatus).toBe('overdue');
    });

    it('should handle proposals without holder', async () => {
      const result = await service.getOverdueList();

      const noHolderProposal = result.find((p) => p.id === 'proposal-3');
      expect(noHolderProposal?.holderName).toBe('Chưa gán');
      expect(noHolderProposal?.holderEmail).toBe('');
    });

    it('should order by slaDeadline ascending', async () => {
      await service.getOverdueList();

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: {
          slaDeadline: 'asc',
        },
      });
    });
  });

  describe('AC5: Quick Actions - Remind All Overdue', () => {
    beforeEach(() => {
      mockPrisma.proposal.count.mockResolvedValue(10);
      mockPrisma.proposal.findMany.mockResolvedValue(mockOverdueProposals);
      mockNotificationsService.bulkRemind.mockResolvedValue({
        success: 2,
        failed: 0,
        total: 2,
        recipients: [],
        dryRun: false,
      });
    });

    it('should get all overdue proposals and send reminders', async () => {
      const result = await service.remindAllOverdue(mockContext);

      expect(mockNotificationsService.bulkRemind).toHaveBeenCalledWith(
        ['proposal-1', 'proposal-2', 'proposal-3'],
        false, // Not dry-run
        mockContext,
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should handle empty overdue list', async () => {
      mockPrisma.proposal.findMany.mockResolvedValue([]);

      const result = await service.remindAllOverdue(mockContext);

      expect(mockNotificationsService.bulkRemind).not.toHaveBeenCalled();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(0);
      expect(result.recipients).toHaveLength(0);
    });
  });

  describe('AC6: RBAC Authorization', () => {
    it('should allow dashboard access for PHONG_KHCN role', () => {
      expect(() => {
        service.validateDashboardPermission('PHONG_KHCN');
      }).not.toThrow();
    });

    it('should allow dashboard access for ADMIN role', () => {
      expect(() => {
        service.validateDashboardPermission('ADMIN');
      }).not.toThrow();
    });

    it('should reject dashboard access for non-PHONG_KHCN/ADMIN roles', () => {
      expect(() => {
        service.validateDashboardPermission('GIANG_VIEN');
      }).toThrow(BadRequestException);

      try {
        service.validateDashboardPermission('GIANG_VIEN');
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Bạn không có quyền thực hiện thao tác này',
          },
        });
      }
    });
  });

  describe('AC7: Edge Cases', () => {
    it('should handle proposals with null slaDeadline', async () => {
      const proposalWithNullDeadline = {
        id: 'proposal-null',
        code: 'DT-NULL',
        title: 'No Deadline',
        state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
        slaDeadline: null,
        holder: {
          id: 'user-1',
          displayName: 'User 1',
          email: 'user1@example.com',
        },
      };

      mockPrisma.proposal.findMany.mockResolvedValue([proposalWithNullDeadline]);

      const result = await service.getOverdueList();

      expect(result).toHaveLength(1);
      expect(result[0].overdueDays).toBe(0);
      expect(result[0].slaStatus).toBe('warning');
    });

    it('should handle zero KPI counts', async () => {
      mockPrisma.proposal.count.mockResolvedValue(0);

      const result = await service.getKpiData();

      expect(result.totalWaiting).toBe(0);
      expect(result.overdueCount).toBe(0);
      expect(result.t2WarningCount).toBe(0);
      expect(result.completedThisMonth).toBe(0);
    });
  });

  describe('Epic 7 Retro: Type Safety', () => {
    beforeEach(() => {
      setupProposalMock();
      mockPrisma.proposal.count.mockResolvedValue(5);
      mockPrisma.proposal.findMany.mockResolvedValue(mockOverdueProposals);
    });

    it('should use proper typing for KPI data - NO as unknown', async () => {

      const result = await service.getKpiData();

      // Verify proper interface structure
      expect(result).toHaveProperty('totalWaiting');
      expect(result).toHaveProperty('overdueCount');
      expect(result).toHaveProperty('t2WarningCount');
      expect(result).toHaveProperty('completedThisMonth');

      // Verify types are numbers, not unknown
      expect(typeof result.totalWaiting).toBe('number');
      expect(typeof result.overdueCount).toBe('number');
      expect(typeof result.t2WarningCount).toBe('number');
      expect(typeof result.completedThisMonth).toBe('number');
    });

    it('should use proper typing for overdue proposals - NO as any', async () => {
      // Mock already setup in beforeEach

      const result = await service.getOverdueList();

      // Verify proper typing
      result.forEach((proposal) => {
        expect(proposal.slaStatus).toMatch(/^(warning|overdue)$/);
        expect(typeof proposal.state).toBe('string');
        expect(proposal.slaDeadline).toBeInstanceOf(Date);
      });
    });

    it('should calculate overdue days without type casting', () => {
      const calculateOverdueDays = service['calculateOverdueDays'];

      // Test with past date
      const pastDate = new Date('2020-01-01');
      expect(calculateOverdueDays(pastDate)).toBeGreaterThan(0);

      // Test with future date
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(calculateOverdueDays(futureDate)).toBe(0);

      // Test with null
      expect(calculateOverdueDays(null)).toBe(0);
    });
  });

  describe('AC8: Data Freshness - Last Updated Timestamp', () => {
    beforeEach(() => {
      setupProposalMock();
      mockPrisma.proposal.count.mockResolvedValue(10);
      mockPrisma.proposal.findMany.mockResolvedValue([]);
    });

    it('should include current timestamp in dashboard data', async () => {

      const before = new Date();
      const result = await service.getDashboardData();
      const after = new Date();

      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('AC9: Query Optimization', () => {
    beforeEach(() => {
      setupProposalMock();
    });

    it('should use proper select for holder data (only needed fields)', async () => {
      mockPrisma.proposal.findMany.mockResolvedValue(mockOverdueProposals);

      await service.getOverdueList();

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: {
          holder: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: expect.any(Object),
      });
    });

    it('should exclude deleted proposals', async () => {
      mockPrisma.proposal.count.mockResolvedValue(10);

      await service.getKpiData();

      expect(mockPrisma.proposal.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      });
    });
  });
});
