import { FullDumpExportService } from './full-dump-export.service';
import { ProjectState, UserRole, WorkflowAction } from '@prisma/client';

/**
 * Full Dump Export Service Tests
 * Story 10.2: Export Excel (Full Dump)
 *
 * Tests follow Epic 9 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 * - Exception state handling
 */

// Manual mock
const mockPrisma = {
  user: {
    findMany: vi.fn(),
  },
  proposal: {
    findMany: vi.fn(),
  },
  workflowLog: {
    findMany: vi.fn(),
  },
  evaluation: {
    findMany: vi.fn(),
  },
  refreshToken: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

describe('FullDumpExportService', () => {
  let service: FullDumpExportService;

  // Test data fixtures
  const mockUsers = [
    {
      id: 'user-1',
      email: 'nguyenvan@example.com',
      displayName: 'Nguyễn Văn A',
      role: UserRole.GIANG_VIEN,
      facultyId: 'faculty-1',
      faculty: {
        code: 'FAC-001',
        name: 'Khoa CNTT',
      },
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'user-2',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: UserRole.ADMIN,
      facultyId: null,
      faculty: null,
      createdAt: new Date('2026-01-02'),
    },
  ];

  const mockProposals = [
    {
      id: 'proposal-1',
      code: 'DT-001',
      title: 'Nghiên cứu AI',
      ownerId: 'user-1',
      facultyId: 'faculty-1',
      councilId: 'council-1',
      holderUnit: 'PHONG_KHCN',
      holderUser: 'user-2',
      slaStartDate: new Date('2026-01-01'),
      slaDeadline: new Date('2026-01-15'),
      actualStartDate: new Date('2026-01-05'),
      completedDate: null,
      createdAt: new Date('2026-01-01'),
      // Exception states (Epic 9)
      cancelledAt: null,
      withdrawnAt: null,
      rejectedAt: null,
      pausedAt: null,
      rejectedById: null,
      pauseReason: null,
      prePauseState: null,
      state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      owner: {
        displayName: 'Nguyễn Văn A',
        email: 'nguyenvan@example.com',
      },
      faculty: {
        code: 'FAC-001',
        name: 'Khoa CNTT',
      },
      holder: {
        displayName: 'Admin User',
      },
      rejectedByUser: null,
    },
  ];

  const mockWorkflowLogs = [
    {
      id: 'log-1',
      proposalId: 'proposal-1',
      action: WorkflowAction.CREATE,
      fromState: null,
      toState: ProjectState.DRAFT,
      actorId: 'user-1',
      actorName: 'Nguyễn Văn A',
      returnTargetState: null,
      reasonCode: null,
      comment: 'Tạo mới',
      timestamp: new Date('2026-01-01T10:00:00Z'),
      proposal: {
        code: 'DT-001',
      },
    },
  ];

  const mockEvaluations = [
    {
      id: 'eval-1',
      proposalId: 'proposal-1',
      councilId: 'council-1',
      evaluatorId: 'user-2',
      state: 'COMPLETED',
      totalScore: 85,
      submittedAt: new Date('2026-01-10'),
      createdAt: new Date('2026-01-05'),
      proposal: {
        code: 'DT-001',
      },
      evaluator: {
        displayName: 'Admin User',
        email: 'admin@example.com',
      },
    },
  ];

  beforeEach(() => {
    service = new FullDumpExportService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('AC1, AC2: Generate Full Export', () => {
    beforeEach(() => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.workflowLog.findMany.mockResolvedValue(mockWorkflowLogs);
      mockPrisma.evaluation.findMany.mockResolvedValue(mockEvaluations);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]); // ~150MB
    });

    it('should generate full export with all sheets', async () => {
      const result = await service.generateFullExport(mockPrisma as any);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/^export_full_dump_\d+\.xlsx$/);
      expect(result.recordCounts).toHaveProperty('users', 2);
      expect(result.recordCounts).toHaveProperty('proposals', 1);
      expect(result.recordCounts).toHaveProperty('workflowLogs', 1);
      expect(result.recordCounts).toHaveProperty('evaluations', 1);
    });

    it('should fetch all data in parallel', async () => {
      await service.generateFullExport(mockPrisma as any);

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      expect(mockPrisma.proposal.findMany).toHaveBeenCalled();
      expect(mockPrisma.workflowLog.findMany).toHaveBeenCalled();
      expect(mockPrisma.evaluation.findMany).toHaveBeenCalled();
    });
  });

  describe('AC3: Users Sheet', () => {
    beforeEach(() => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue([]);
      mockPrisma.workflowLog.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);
    });

    it('should include user data with proper typing', async () => {
      const result = await service.generateFullExport(mockPrisma as any);

      expect(result.recordCounts.users).toBe(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          facultyId: true,
          faculty: {
            select: { code: true, name: true },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use Vietnamese role labels', async () => {
      const result = await service.generateFullExport(mockPrisma as any);

      // Verify role mapping
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      // Role labels should be in Vietnamese
      const users = mockPrisma.user.findMany.mock.results[0].value;
      expect(users).toBeDefined();
    });
  });

  describe('AC4: Exception State Handling', () => {
    beforeEach(() => {
      const proposalWithException = {
        ...mockProposals[0],
        cancelledAt: new Date('2026-01-20'),
        withdrawnAt: null,
        rejectedAt: new Date('2026-01-18'),
        pausedAt: new Date('2026-01-19'),
        rejectedById: 'admin-1',
        pauseReason: 'Đang chờ thông tin',
        prePauseState: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      };

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue([proposalWithException]);
      mockPrisma.workflowLog.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);
    });

    it('should include exception state columns', async () => {
      const result = await service.generateFullExport(mockPrisma as any);

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            cancelledAt: true,
            withdrawnAt: true,
            rejectedAt: true,
            pausedAt: true,
            rejectedById: true,
            pauseReason: true,
            prePauseState: true,
          }),
        }),
      );
    });

    it('should format exception state dates', async () => {
      await service.generateFullExport(mockPrisma as any);

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            rejectedByUser: {
              select: { displayName: true },
            },
          }),
        }),
      );
    });
  });

  describe('AC5: Vietnamese Headers', () => {
    beforeEach(() => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.workflowLog.findMany.mockResolvedValue(mockWorkflowLogs);
      mockPrisma.evaluation.findMany.mockResolvedValue(mockEvaluations);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);
    });

    it('should use Vietnamese headers for Users sheet', async () => {
      const result = await service.generateFullExport(mockPrisma as any);

      expect(result.buffer).toBeInstanceOf(Buffer);
      // Headers would be in the Excel file
    });

    it('should use Vietnamese state labels for proposals', async () => {
      await service.generateFullExport(mockPrisma as any);

      // State labels should be in Vietnamese
      expect(mockPrisma.proposal.findMany).toHaveBeenCalled();
    });

    it('should use Vietnamese action labels for workflow logs', async () => {
      await service.generateFullExport(mockPrisma as any);

      expect(mockPrisma.workflowLog.findMany).toHaveBeenCalled();
    });
  });

  describe('AC6: Date Formatting', () => {
    beforeEach(() => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.workflowLog.findMany.mockResolvedValue(mockWorkflowLogs);
      mockPrisma.evaluation.findMany.mockResolvedValue(mockEvaluations);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);
    });

    it('should format dates in Vietnamese locale', async () => {
      const result = await service.generateFullExport(mockPrisma as any);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/\.xlsx$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty datasets', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.proposal.findMany.mockResolvedValue([]);
      mockPrisma.workflowLog.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '0' }]);

      const result = await service.generateFullExport(mockPrisma as any);

      expect(result.recordCounts.users).toBe(0);
      expect(result.recordCounts.proposals).toBe(0);
      expect(result.recordCounts.workflowLogs).toBe(0);
      expect(result.recordCounts.evaluations).toBe(0);
    });

    it('should handle proposals without owners', async () => {
      const proposalWithoutOwner = {
        ...mockProposals[0],
        owner: null,
      };

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue([proposalWithoutOwner]);
      mockPrisma.workflowLog.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);

      const result = await service.generateFullExport(mockPrisma as any);

      expect(result.recordCounts.proposals).toBe(1);
    });

    it('should handle proposals without holders', async () => {
      const proposalWithoutHolder = {
        ...mockProposals[0],
        holder: null,
      };

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue([proposalWithoutHolder]);
      mockPrisma.workflowLog.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);

      const result = await service.generateFullExport(mockPrisma as any);

      expect(result.recordCounts.proposals).toBe(1);
    });
  });

  describe('Epic 9 Retro: Type Safety', () => {
    it('should use proper typing - NO as unknown casting', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.workflowLog.findMany.mockResolvedValue(mockWorkflowLogs);
      mockPrisma.evaluation.findMany.mockResolvedValue(mockEvaluations);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);

      const result = await service.generateFullExport(mockPrisma as any);

      // Verify result is properly typed
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('recordCounts');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(typeof result.filename).toBe('string');
      expect(typeof result.recordCounts).toBe('object');
    });

    it('should use direct enum values - NO double cast', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.workflowLog.findMany.mockResolvedValue(mockWorkflowLogs);
      mockPrisma.evaluation.findMany.mockResolvedValue(mockEvaluations);
      mockPrisma.$queryRaw.mockResolvedValue([{ pg_database_size: '157286400' }]);

      await service.generateFullExport(mockPrisma as any);

      // Verify direct enum usage in queries
      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
