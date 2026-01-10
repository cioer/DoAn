import { WorkflowController } from './workflow.controller';
import { WorkflowAction, ProjectState, WorkflowLog } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { QueueFilterType } from './dto/queue-filter.dto';

/**
 * Story 3.4: Tests for workflow logs endpoint
 * Story 3.5: Tests for queue filter endpoint
 */

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'GIANG_VIEN',
  facultyId: 'faculty-1',
};

const mockPhongKHCNUser = {
  id: 'user-pkhcn',
  email: 'pkhcn@example.com',
  role: 'PHONG_KHCN',
  facultyId: null,
};

const mockWorkflowLogs: WorkflowLog[] = [
  {
    id: 'log-2',
    proposalId: 'proposal-1',
    action: WorkflowAction.APPROVE,
    fromState: ProjectState.FACULTY_REVIEW,
    toState: ProjectState.SCHOOL_SELECTION_REVIEW,
    actorId: 'user-2',
    actorName: 'Trần Văn B',
    returnTargetState: null,
    returnTargetHolderUnit: null,
    reasonCode: null,
    comment: null,
    timestamp: new Date('2026-01-07T14:30:00.000Z'),
  },
  {
    id: 'log-1',
    proposalId: 'proposal-1',
    action: WorkflowAction.SUBMIT,
    fromState: ProjectState.DRAFT,
    toState: ProjectState.FACULTY_REVIEW,
    actorId: 'user-1',
    actorName: 'Nguyễn Văn A',
    returnTargetState: null,
    returnTargetHolderUnit: null,
    reasonCode: null,
    comment: null,
    timestamp: new Date('2026-01-06T10:00:00.000Z'),
  },
];

const mockProposals = [
  {
    id: 'proposal-1',
    code: 'DT-2024-001',
    title: 'Nghiên cứu ứng dụng AI',
    state: ProjectState.FACULTY_REVIEW,
    holderUnit: 'faculty-1',
    holderUser: null,
    slaDeadline: new Date('2026-01-10T17:00:00.000Z'),
    slaStartDate: new Date('2026-01-06T10:00:00.000Z'),
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    ownerId: 'user-1',
  },
  {
    id: 'proposal-2',
    code: 'DT-2024-002',
    title: 'Nghiên cứu Blockchain',
    state: ProjectState.APPROVED,
    holderUnit: 'faculty-1',
    holderUser: 'user-1',
    slaDeadline: new Date('2026-01-15T17:00:00.000Z'),
    slaStartDate: new Date('2026-01-07T10:00:00.000Z'),
    createdAt: new Date('2026-01-02T10:00:00.000Z'),
    ownerId: 'user-1',
  },
];

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let mockService: any;
  let mockPrisma: any;
  let mockSlaService: any;

  beforeEach(() => {
    // Create mock service
    mockService = {
      getWorkflowLogs: vi.fn(),
      approveFacultyReview: vi.fn(),
      returnFacultyReview: vi.fn(),
    };

    // Create mock PrismaService
    mockPrisma = {
      proposal: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    // Create mock SlaService
    mockSlaService = {
      addBusinessDays: vi.fn(),
    };

    // Manually create controller with mock services - bypass DI
    controller = new WorkflowController(mockService, mockPrisma, mockSlaService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * AC2: getWorkflowLogs() returns entries sorted DESC
   */
  describe('getWorkflowLogs', () => {
    beforeEach(() => {
      // Default: proposal exists
      mockPrisma.proposal.findUnique.mockResolvedValue({ id: 'proposal-1' });
    });

    it('AC2.1: should return workflow logs sorted by timestamp DESC (newest first)', async () => {
      mockService.getWorkflowLogs.mockResolvedValue(mockWorkflowLogs);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('log-2'); // Newest first
      expect(result.data[1].id).toBe('log-1');
      expect(result.data[0].timestamp).toEqual(
        new Date('2026-01-07T14:30:00.000Z'),
      );
      expect(result.data[1].timestamp).toEqual(
        new Date('2026-01-06T10:00:00.000Z'),
      );
    });

    it('AC2.2: should include metadata with proposalId and total count', async () => {
      mockService.getWorkflowLogs.mockResolvedValue(mockWorkflowLogs);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      expect(result.meta).toEqual({
        proposalId: 'proposal-1',
        total: 2,
      });
    });

    it('AC2.3: should return empty array when proposal has no logs', async () => {
      mockService.getWorkflowLogs.mockResolvedValue([]);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    /**
     * Code Review Fix: Test 404 when proposal doesn't exist
     */
    it('CR_FIX: should throw NotFoundException when proposal does not exist', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        controller.getWorkflowLogs('non-existent-proposal', mockUser),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.getWorkflowLogs('non-existent-proposal', mockUser),
      ).rejects.toMatchObject({
        response: {
          success: false,
          error: {
            code: 'PROPOSAL_NOT_FOUND',
            message: 'Không tìm thấy đề tài',
          },
        },
      });
    });
  });

  /**
   * AC3: All state transition log fields are included
   */
  describe('workflow log structure (AC3)', () => {
    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue({ id: 'proposal-1' });
    });

    it('AC3.1: should include all required fields in log entry', async () => {
      mockService.getWorkflowLogs.mockResolvedValue(mockWorkflowLogs);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      const log = result.data[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('proposalId');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('fromState');
      expect(log).toHaveProperty('toState');
      expect(log).toHaveProperty('actorId');
      expect(log).toHaveProperty('actorName');
      expect(log).toHaveProperty('timestamp');
    });

    it('AC3.2: should include return_target fields for RETURN actions', async () => {
      const returnLog: WorkflowLog = {
        id: 'log-3',
        proposalId: 'proposal-1',
        action: WorkflowAction.RETURN,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.CHANGES_REQUESTED,
        actorId: 'user-2',
        actorName: 'Trần Văn B',
        returnTargetState: ProjectState.FACULTY_REVIEW,
        returnTargetHolderUnit: 'KHOA.CNTT',
        reasonCode: 'MISSING_DOCUMENTS',
        comment: 'Cần bổ sung tài liệu',
        timestamp: new Date('2026-01-08T10:00:00.000Z'),
      };

      mockService.getWorkflowLogs.mockResolvedValue([returnLog]);

      const result = await controller.getWorkflowLogs('proposal-1', mockUser);

      const log = result.data[0];
      expect(log.action).toBe(WorkflowAction.RETURN);
      expect(log.returnTargetState).toBe(ProjectState.FACULTY_REVIEW);
      expect(log.returnTargetHolderUnit).toBe('KHOA.CNTT');
      expect(log.reasonCode).toBe('MISSING_DOCUMENTS');
      expect(log.comment).toBe('Cần bổ sung tài liệu');
    });
  });

  /**
   * Story 3.5: Queue Filter Endpoint Tests
   */
  describe('getQueue', () => {
    describe('MY_QUEUE filter', () => {
      it('AC2.1: should return proposals where holderUnit matches user faculty', async () => {
        mockPrisma.proposal.count.mockResolvedValue(1);
        mockPrisma.proposal.findMany.mockResolvedValue([mockProposals[0]]);

        const result = await controller.getQueue(
          QueueFilterType.MY_QUEUE,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.meta.filter).toBe(QueueFilterType.MY_QUEUE);
        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { holderUnit: 'faculty-1' },
                { holderUser: 'user-1' },
              ]),
            }),
          }),
        );
      });

      it('AC2.2: should work for PHONG_KHCN role with PHONG_KHCN holderUnit', async () => {
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.MY_QUEUE,
          undefined,
          undefined,
          undefined,
          mockPhongKHCNUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { holderUser: 'user-pkhcn' },
                { holderUnit: 'PHONG_KHCN' },
              ]),
            }),
          }),
        );
      });

      it('AC2.3: should exclude terminal states from my-queue', async () => {
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.MY_QUEUE,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              state: {
                notIn: [
                  ProjectState.COMPLETED,
                  ProjectState.CANCELLED,
                  ProjectState.REJECTED,
                  ProjectState.WITHDRAWN,
                ],
              },
            }),
          }),
        );
      });
    });

    describe('MY_PROPOSALS filter', () => {
      it('AC3.1: should return proposals where ownerId matches user ID', async () => {
        mockPrisma.proposal.count.mockResolvedValue(2);
        mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);

        const result = await controller.getQueue(
          QueueFilterType.MY_PROPOSALS,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.meta.filter).toBe(QueueFilterType.MY_PROPOSALS);
        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { ownerId: 'user-1' },
          }),
        );
      });
    });

    describe('ALL filter', () => {
      it('should return all non-terminal proposals', async () => {
        mockPrisma.proposal.count.mockResolvedValue(2);
        mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);

        const result = await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.meta.filter).toBe(QueueFilterType.ALL);
        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              state: {
                notIn: [
                  ProjectState.COMPLETED,
                  ProjectState.CANCELLED,
                  ProjectState.REJECTED,
                  ProjectState.WITHDRAWN,
                ],
              },
            }),
          }),
        );
      });
    });

    describe('OVERDUE filter', () => {
      it('AC4.1: should return proposals with sla_deadline < now()', async () => {
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.OVERDUE,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              slaDeadline: { lt: expect.any(Date) },
            }),
          }),
        );
      });

      it('AC4.2: should exclude PAUSED state from overdue', async () => {
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.OVERDUE,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        const callArgs = mockPrisma.proposal.findMany.mock.calls[0][0];
        const stateNotIn = callArgs.where.state.notIn;
        expect(stateNotIn).toContain(ProjectState.PAUSED);
      });
    });

    describe('UPCOMING filter', () => {
      it('AC5.1: should calculate +2 working days using SlaService', async () => {
        const futureDate = new Date('2026-01-08T17:00:00.000Z');
        mockSlaService.addBusinessDays.mockReturnValue(futureDate);
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.UPCOMING,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(mockSlaService.addBusinessDays).toHaveBeenCalledWith(
          expect.any(Date),
          2,
        );
      });

      it('AC5.2: should filter proposals with sla_deadline in range [now, now+2]', async () => {
        mockSlaService.addBusinessDays.mockReturnValue(
          new Date('2026-01-08T17:00:00.000Z'),
        );
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.UPCOMING,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              slaDeadline: {
                gte: expect.any(Date),
                lte: expect.any(Date),
              },
            }),
          }),
        );
      });

      it('AC5.3: should exclude PAUSED and terminal states from upcoming', async () => {
        mockSlaService.addBusinessDays.mockReturnValue(
          new Date('2026-01-08T17:00:00.000Z'),
        );
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.UPCOMING,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        const callArgs = mockPrisma.proposal.findMany.mock.calls[0][0];
        const stateNotIn = callArgs.where.state.notIn;
        expect(stateNotIn).toContain(ProjectState.PAUSED);
        expect(stateNotIn).toContain(ProjectState.COMPLETED);
        expect(stateNotIn).toContain(ProjectState.CANCELLED);
      });
    });

    describe('Pagination', () => {
      it('should use default pagination values when not provided', async () => {
        mockPrisma.proposal.count.mockResolvedValue(5);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 20,
          }),
        );
      });

      it('should use custom pagination values when provided', async () => {
        mockPrisma.proposal.count.mockResolvedValue(50);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.ALL,
          '2',
          '10',
          undefined,
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 10,
          }),
        );
      });

      it('should calculate total pages correctly', async () => {
        mockPrisma.proposal.count.mockResolvedValue(25);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        const result = await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          '10',
          undefined,
          mockUser,
        );

        expect(result.meta.totalPages).toBe(3);
      });

      it('should return meta with filter, total, page, pageSize, totalPages', async () => {
        mockPrisma.proposal.count.mockResolvedValue(15);
        mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);

        const result = await controller.getQueue(
          QueueFilterType.MY_QUEUE,
          '1',
          '20',
          undefined,
          mockUser,
        );

        expect(result.meta).toEqual({
          filter: QueueFilterType.MY_QUEUE,
          total: 15,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        });
      });

      // Story 3.5 code review fix: pagination validation tests
      it('CR_FIX: should handle invalid page number (NaN) by defaulting to 1', async () => {
        mockPrisma.proposal.count.mockResolvedValue(10);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        const result = await controller.getQueue(
          QueueFilterType.ALL,
          'abc', // Invalid - should default to 1
          undefined,
          undefined,
          mockUser,
        );

        expect(result.meta.page).toBe(1);
        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0, // (1 - 1) * 20 = 0
          }),
        );
      });

      it('CR_FIX: should handle negative page number by defaulting to 1', async () => {
        mockPrisma.proposal.count.mockResolvedValue(10);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        const result = await controller.getQueue(
          QueueFilterType.ALL,
          '-5', // Invalid - should default to 1
          undefined,
          undefined,
          mockUser,
        );

        expect(result.meta.page).toBe(1);
        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
          }),
        );
      });

      it('CR_FIX: should handle invalid pageSize (NaN) by defaulting to 20', async () => {
        mockPrisma.proposal.count.mockResolvedValue(10);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        const result = await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          'xyz', // Invalid - should default to 20
          undefined,
          mockUser,
        );

        expect(result.meta.pageSize).toBe(20);
        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 20,
          }),
        );
      });

      it('CR_FIX: should handle negative pageSize by defaulting to 20', async () => {
        mockPrisma.proposal.count.mockResolvedValue(10);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        const result = await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          '-10', // Invalid - should default to 20
          undefined,
          mockUser,
        );

        expect(result.meta.pageSize).toBe(20);
      });

      it('CR_FIX: should cap pageSize at 100 to prevent excessive queries', async () => {
        mockPrisma.proposal.count.mockResolvedValue(200);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        const result = await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          '999', // Should be capped at 100
          undefined,
          mockUser,
        );

        expect(result.meta.pageSize).toBe(100);
        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          }),
        );
      });
    });

    describe('Search functionality', () => {
      it('should filter by title when search term is provided', async () => {
        mockPrisma.proposal.count.mockResolvedValue(1);
        mockPrisma.proposal.findMany.mockResolvedValue([mockProposals[0]]);

        await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          undefined,
          'AI',
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: [
                expect.anything(),
                {
                  OR: [
                    { title: { contains: 'AI', mode: 'insensitive' } },
                    { code: { contains: 'AI', mode: 'insensitive' } },
                  ],
                },
              ],
            }),
          }),
        );
      });

      it('should filter by code when search term matches code', async () => {
        mockPrisma.proposal.count.mockResolvedValue(1);
        mockPrisma.proposal.findMany.mockResolvedValue([mockProposals[0]]);

        await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          undefined,
          'DT-2024-001',
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: [
                expect.anything(),
                {
                  OR: [
                    { title: { contains: 'DT-2024-001', mode: 'insensitive' } },
                    { code: { contains: 'DT-2024-001', mode: 'insensitive' } },
                  ],
                },
              ],
            }),
          }),
        );
      });

      it('should trim whitespace from search term', async () => {
        mockPrisma.proposal.count.mockResolvedValue(0);
        mockPrisma.proposal.findMany.mockResolvedValue([]);

        await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          undefined,
          '  AI  ',
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: [
                expect.anything(),
                {
                  OR: [
                    { title: { contains: 'AI', mode: 'insensitive' } },
                    { code: { contains: 'AI', mode: 'insensitive' } },
                  ],
                },
              ],
            }),
          }),
        );
      });

      it('should not apply search filter when search term is empty', async () => {
        mockPrisma.proposal.count.mockResolvedValue(2);
        mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);

        await controller.getQueue(
          QueueFilterType.ALL,
          undefined,
          undefined,
          '',
          mockUser,
        );

        expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              AND: expect.any(Array),
            }),
          }),
        );
      });
    });

    describe('Response structure', () => {
      it('should return proposals with correct structure', async () => {
        mockPrisma.proposal.count.mockResolvedValue(1);
        mockPrisma.proposal.findMany.mockResolvedValue([mockProposals[0]]);

        const result = await controller.getQueue(
          QueueFilterType.MY_QUEUE,
          undefined,
          undefined,
          undefined,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({
          id: 'proposal-1',
          code: 'DT-2024-001',
          title: 'Nghiên cứu ứng dụng AI',
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          slaDeadline: expect.any(Date),
          slaStartDate: expect.any(Date),
          createdAt: expect.any(Date),
          ownerId: 'user-1',
        });
      });
    });
  });

  /**
   * Story 4.1: Faculty Approve Action Tests
   * Tests for POST /api/workflow/:proposalId/approve-faculty endpoint
   */
  describe('approveFacultyReview (Story 4.1)', () => {
    const mockProposalId = 'test-proposal-id';
    const mockIdempotencyKey = '123e4567-e89b-12d3-a456-426614174000';

    const mockFacultyReviewProposal = {
      id: mockProposalId,
      state: ProjectState.FACULTY_REVIEW,
    };

    const mockSchoolSelectionProposal = {
      id: mockProposalId,
      code: 'DT-001',
      title: 'Test Proposal',
      state: ProjectState.SCHOOL_SELECTION_REVIEW,
      ownerId: 'user-1',
      facultyId: 'faculty-1',
      holderUnit: 'PHONG_KHCN',
      holderUser: null,
      slaStartDate: new Date('2026-01-06'),
      slaDeadline: new Date('2026-01-10'),
      templateId: null,
      templateVersion: null,
      formData: null,
      createdAt: new Date('2026-01-06'),
      updatedAt: new Date('2026-01-06'),
      deletedAt: null,
    };

    const mockWorkflowLog = {
      id: 'test-log-id',
      proposalId: mockProposalId,
      action: 'APPROVE' as const,
      fromState: ProjectState.FACULTY_REVIEW,
      toState: ProjectState.SCHOOL_SELECTION_REVIEW,
      actorId: 'user-2',
      actorName: 'Test User',
      returnTargetState: null,
      returnTargetHolderUnit: null,
      reasonCode: null,
      comment: null,
      timestamp: new Date(),
    };

    const mockTransitionResult = {
      proposal: mockSchoolSelectionProposal,
      workflowLog: mockWorkflowLog,
      previousState: ProjectState.FACULTY_REVIEW,
      currentState: ProjectState.SCHOOL_SELECTION_REVIEW,
      holderUnit: 'PHONG_KHCN',
      holderUser: null,
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockImplementation((args: any) => {
        if (args.where.id === mockProposalId) {
          return Promise.resolve(mockFacultyReviewProposal);
        }
        return Promise.resolve(null);
      });
    });

    describe('AC3 & AC4: State transition & workflow log', () => {
      it('should transition FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW', async () => {
        mockService.approveFacultyReview.mockResolvedValue(mockTransitionResult);

        const result = await controller.approveFacultyReview(
          mockProposalId,
          { proposalId: mockProposalId, idempotencyKey: mockIdempotencyKey },
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.data.previousState).toBe('FACULTY_REVIEW');
        expect(result.data.currentState).toBe('SCHOOL_SELECTION_REVIEW');
      });

      it('should set holder_unit to PHONG_KHCN', async () => {
        mockService.approveFacultyReview.mockResolvedValue(mockTransitionResult);

        const result = await controller.approveFacultyReview(
          mockProposalId,
          { proposalId: mockProposalId, idempotencyKey: mockIdempotencyKey },
          mockUser,
        );

        expect(result.data.holderUnit).toBe('PHONG_KHCN');
      });

      it('should create workflow log entry', async () => {
        mockService.approveFacultyReview.mockResolvedValue(mockTransitionResult);

        await controller.approveFacultyReview(
          mockProposalId,
          { proposalId: mockProposalId, idempotencyKey: mockIdempotencyKey },
          mockUser,
        );

        expect(mockService.approveFacultyReview).toHaveBeenCalledWith(
          mockProposalId,
          expect.objectContaining({
            userId: mockUser.id,
            userRole: mockUser.role,
            idempotencyKey: mockIdempotencyKey,
          }),
        );
      });

      it('should return workflow log ID in response', async () => {
        mockService.approveFacultyReview.mockResolvedValue(mockTransitionResult);

        const result = await controller.approveFacultyReview(
          mockProposalId,
          { proposalId: mockProposalId, idempotencyKey: mockIdempotencyKey },
          mockUser,
        );

        expect(result.data.workflowLogId).toBe('test-log-id');
      });
    });

    describe('AC6: Error handling - wrong state', () => {
      it('should return 400 when proposal is not in FACULTY_REVIEW state', async () => {
        mockPrisma.proposal.findUnique.mockResolvedValue({
          id: mockProposalId,
          state: ProjectState.DRAFT,
        });

        await expect(
          controller.approveFacultyReview(
            mockProposalId,
            { proposalId: mockProposalId, idempotencyKey: mockIdempotencyKey },
            mockUser,
          ),
        ).rejects.toMatchObject({
          response: {
            success: false,
            error: {
              code: 'PROPOSAL_NOT_FACULTY_REVIEW',
            },
          },
        });
      });
    });

    describe('Error handling - proposal not found', () => {
      it('should return 404 when proposal does not exist', async () => {
        mockPrisma.proposal.findUnique.mockResolvedValue(null);

        await expect(
          controller.approveFacultyReview(
            'non-existent-id',
            { proposalId: 'non-existent-id', idempotencyKey: mockIdempotencyKey },
            mockUser,
          ),
        ).rejects.toMatchObject({
          response: {
            success: false,
            error: {
              code: 'PROPOSAL_NOT_FOUND',
            },
          },
        });
      });
    });
  });

  /**
   * Story 4.2: Faculty Return Action Tests
   * Tests for POST /api/workflow/:proposalId/return-faculty endpoint
   */
  describe('returnFacultyReview (Story 4.2)', () => {
    const mockProposalId = 'test-proposal-id';
    const mockIdempotencyKey = '123e4567-e89b-12d3-a456-426614174000';

    const mockFacultyReviewProposal = {
      id: mockProposalId,
      state: ProjectState.FACULTY_REVIEW,
    };

    const mockChangesRequestedProposal = {
      id: mockProposalId,
      code: 'DT-001',
      title: 'Test Proposal',
      state: ProjectState.CHANGES_REQUESTED,
      ownerId: 'user-1',
      facultyId: 'faculty-1',
      holderUnit: 'faculty-1',
      holderUser: 'user-1',
      slaStartDate: new Date('2026-01-06'),
      slaDeadline: new Date('2026-01-10'),
      templateId: null,
      templateVersion: null,
      formData: null,
      createdAt: new Date('2026-01-06'),
      updatedAt: new Date('2026-01-06'),
      deletedAt: null,
    };

    const mockReturnWorkflowLog = {
      id: 'test-log-id',
      proposalId: mockProposalId,
      action: 'RETURN' as const,
      fromState: ProjectState.FACULTY_REVIEW,
      toState: ProjectState.CHANGES_REQUESTED,
      actorId: 'user-2',
      actorName: 'Test User',
      returnTargetState: ProjectState.FACULTY_REVIEW,
      returnTargetHolderUnit: 'faculty-1',
      reasonCode: 'THIEU_TAI_LIEU',
      comment: '{"reason":"Cần bổ sung tài liệu","revisionSections":["SEC_BUDGET"]}',
      timestamp: new Date(),
    };

    const mockReturnTransitionResult = {
      proposal: mockChangesRequestedProposal,
      workflowLog: mockReturnWorkflowLog,
      previousState: ProjectState.FACULTY_REVIEW,
      currentState: ProjectState.CHANGES_REQUESTED,
      holderUnit: 'faculty-1',
      holderUser: 'user-1',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockImplementation((args: any) => {
        if (args.where.id === mockProposalId) {
          return Promise.resolve(mockFacultyReviewProposal);
        }
        return Promise.resolve(null);
      });
    });

    describe('AC3 & AC4: State transition & workflow log', () => {
      it('should transition FACULTY_REVIEW → CHANGES_REQUESTED', async () => {
        mockService.returnFacultyReview.mockResolvedValue(mockReturnTransitionResult);

        const result = await controller.returnFacultyReview(
          mockProposalId,
          {
            proposalId: mockProposalId,
            reason: 'Cần bổ sung tài liệu',
            reasonCode: 'THIEU_TAI_LIEU',
            reasonSections: ['SEC_BUDGET'],
            idempotencyKey: mockIdempotencyKey,
          },
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.data.previousState).toBe('FACULTY_REVIEW');
        expect(result.data.currentState).toBe('CHANGES_REQUESTED');
        expect(result.data.action).toBe('RETURN');
      });

      it('should set holder to owner (back to PI)', async () => {
        mockService.returnFacultyReview.mockResolvedValue(mockReturnTransitionResult);

        const result = await controller.returnFacultyReview(
          mockProposalId,
          {
            proposalId: mockProposalId,
            reason: 'Cần bổ sung tài liệu',
            reasonCode: 'THIEU_TAI_LIEU',
            reasonSections: ['SEC_BUDGET'],
            idempotencyKey: mockIdempotencyKey,
          },
          mockUser,
        );

        expect(result.data.holderUnit).toBe('faculty-1');
        expect(result.data.holderUser).toBe('user-1');
      });

      it('should call workflow service with return data', async () => {
        mockService.returnFacultyReview.mockResolvedValue(mockReturnTransitionResult);

        await controller.returnFacultyReview(
          mockProposalId,
          {
            proposalId: mockProposalId,
            reason: 'Cần bổ sung tài liệu',
            reasonCode: 'THIEU_TAI_LIEU',
            reasonSections: ['SEC_BUDGET', 'SEC_CONTENT_METHOD'],
            idempotencyKey: mockIdempotencyKey,
          },
          mockUser,
        );

        expect(mockService.returnFacultyReview).toHaveBeenCalledWith(
          mockProposalId,
          'Cần bổ sung tài liệu',
          'THIEU_TAI_LIEU',
          ['SEC_BUDGET', 'SEC_CONTENT_METHOD'],
          expect.objectContaining({
            userId: mockUser.id,
            userRole: mockUser.role,
            idempotencyKey: mockIdempotencyKey,
          }),
        );
      });

      it('should create workflow log with return target fields', async () => {
        mockService.returnFacultyReview.mockResolvedValue(mockReturnTransitionResult);

        const result = await controller.returnFacultyReview(
          mockProposalId,
          {
            proposalId: mockProposalId,
            reason: 'Cần bổ sung tài liệu',
            reasonCode: 'THIEU_TAI_LIEU',
            reasonSections: ['SEC_BUDGET'],
            idempotencyKey: mockIdempotencyKey,
          },
          mockUser,
        );

        expect(result.data.workflowLogId).toBe('test-log-id');
      });
    });

    describe('AC5 & AC6: Error handling - wrong state', () => {
      it('should return 400 when proposal is not in FACULTY_REVIEW state', async () => {
        mockPrisma.proposal.findUnique.mockResolvedValue({
          id: mockProposalId,
          state: ProjectState.DRAFT,
        });

        await expect(
          controller.returnFacultyReview(
            mockProposalId,
            {
              proposalId: mockProposalId,
              reason: 'Cần sửa',
              reasonCode: 'KHAC',
              idempotencyKey: mockIdempotencyKey,
            },
            mockUser,
          ),
        ).rejects.toMatchObject({
          response: {
            success: false,
            error: {
              code: 'PROPOSAL_NOT_FACULTY_REVIEW',
            },
          },
        });
      });
    });

    describe('Error handling - proposal not found', () => {
      it('should return 404 when proposal does not exist', async () => {
        mockPrisma.proposal.findUnique.mockResolvedValue(null);

        await expect(
          controller.returnFacultyReview(
            'non-existent-id',
            {
              proposalId: 'non-existent-id',
              reason: 'Cần sửa',
              reasonCode: 'KHAC',
              idempotencyKey: mockIdempotencyKey,
            },
            mockUser,
          ),
        ).rejects.toMatchObject({
          response: {
            success: false,
            error: {
              code: 'PROPOSAL_NOT_FOUND',
            },
          },
        });
      });
    });
  });
});
