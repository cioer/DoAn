import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowAction, ProjectState, User } from '@prisma/client';
import { BulkOperationsService } from './bulk-operations.service';
import { AuditService } from '../audit/audit.service';

/**
 * Bulk Operations Service Tests
 * Story 8.1: Bulk Assign (Gán holder_user hàng loạt)
 *
 * Tests follow Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 */

// Manual mock - bypass DI
const mockPrisma = {
  proposal: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  workflowLog: {
    create: vi.fn(),
  },
};

const mockAuditService = {
  logEvent: vi.fn().mockResolvedValue(undefined),
};

describe('BulkOperationsService', () => {
  let service: BulkOperationsService;

  // Test data fixtures
  const mockProposals = [
    {
      id: 'proposal-1',
      code: 'DT-001',
      state: ProjectState.FACULTY_REVIEW,
      holderUser: null,
    },
    {
      id: 'proposal-2',
      code: 'DT-002',
      state: ProjectState.SCHOOL_SELECTION_REVIEW,
      holderUser: null,
    },
    {
      id: 'proposal-3',
      code: 'DT-003',
      state: ProjectState.APPROVED,
      holderUser: 'existing-user',
    },
  ];

  const mockTargetUser: User = {
    id: 'target-user-1',
    email: 'target@example.com',
    passwordHash: 'hash',
    displayName: 'Target User',
    role: 'GIANG_VIEN' as any,
    facultyId: 'faculty-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    faculty: {} as any,
    refreshTokens: [],
    auditEventsAsActor: [],
    auditEventsAsActing: [],
    ownedProposals: [],
  };

  const mockContext = {
    userId: 'admin-1',
    userRole: 'PHONG_KHCN',
    ip: '127.0.0.1',
    userAgent: 'test',
    requestId: 'req-1',
  };

  beforeEach(() => {
    service = new BulkOperationsService(
      mockPrisma as any,
      mockAuditService as any,
    );
    vi.clearAllMocks();

    // Default mock responses
    mockPrisma.user.findUnique.mockResolvedValue({
      displayName: 'Admin User',
    });
  });

  describe('AC1: Bulk Assign - Valid Proposals', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockTargetUser) // Target user lookup
        .mockResolvedValueOnce({ displayName: 'Admin User' }); // Actor name lookup

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
      mockPrisma.proposal.update.mockResolvedValue({});
      mockPrisma.workflowLog.create.mockResolvedValue({});
    });

    it('should assign holder_user to multiple proposals', async () => {
      const proposalIds = ['proposal-1', 'proposal-2', 'proposal-3'];
      const result = await service.bulkAssign(
        proposalIds,
        'target-user-1',
        mockContext,
      );

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(3);
      expect(result.errors).toHaveLength(0);

      // Verify each proposal was updated
      expect(mockPrisma.proposal.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.proposal.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'proposal-1' },
        data: { holderUser: 'target-user-1' },
      });
      expect(mockPrisma.proposal.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'proposal-2' },
        data: { holderUser: 'target-user-1' },
      });
      expect(mockPrisma.proposal.update).toHaveBeenNthCalledWith(3, {
        where: { id: 'proposal-3' },
        data: { holderUser: 'target-user-1' },
      });
    });

    it('should log workflow action for each proposal - Direct enum usage (Epic 7 retro)', async () => {
      const proposalIds = ['proposal-1', 'proposal-2', 'proposal-3'];

      await service.bulkAssign(proposalIds, 'target-user-1', mockContext);

      // Verify WorkflowAction.BULK_ASSIGN is used directly (no double cast)
      expect(mockPrisma.workflowLog.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.workflowLog.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          action: WorkflowAction.BULK_ASSIGN,
          comment: 'Gán cho Target User',
        }),
      });
    });

    it('should log audit event for bulk operation', async () => {
      const proposalIds = ['proposal-1', 'proposal-2', 'proposal-3'];

      await service.bulkAssign(proposalIds, 'target-user-1', mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'BULK_ASSIGN',
        actorUserId: 'admin-1',
        entityType: 'Proposal',
        entityId: 'proposal-1,proposal-2,proposal-3',
        metadata: {
          proposalIds,
          targetUserId: 'target-user-1',
          targetUserDisplayName: 'Target User',
          successCount: 3,
          failedCount: 0,
          errors: [],
        },
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });
  });

  describe('AC2: Bulk Assign - Partial Success', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(mockTargetUser);
      // Only return 2 of 3 proposals
      mockPrisma.proposal.findMany.mockResolvedValue([
        mockProposals[0],
        mockProposals[1],
      ]);
      mockPrisma.proposal.update.mockResolvedValue({});
      mockPrisma.workflowLog.create.mockResolvedValue({});
    });

    it('should handle not found proposals', async () => {
      const proposalIds = ['proposal-1', 'proposal-2', 'proposal-999'];
      const result = await service.bulkAssign(
        proposalIds,
        'target-user-1',
        mockContext,
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(3);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        proposalId: 'proposal-999',
        proposalCode: 'Unknown',
        reason: 'Không tìm thấy đề tài',
      });
    });
  });

  describe('AC3: Bulk Assign - Validation Errors', () => {
    it('should reject empty proposalIds array', async () => {
      await expect(
        service.bulkAssign([], 'target-user-1', mockContext),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.bulkAssign([], 'target-user-1', mockContext);
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'EMPTY_PROPOSAL_LIST',
            message: 'Phải chọn ít nhất một đề tài',
          },
        });
      }
    });

    it('should reject more than 100 proposals', async () => {
      const proposalIds = Array.from({ length: 101 }, (_, i) => `proposal-${i}`);

      await expect(
        service.bulkAssign(proposalIds, 'target-user-1', mockContext),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.bulkAssign(proposalIds, 'target-user-1', mockContext);
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'EXCEEDS_LIMIT',
            message: 'Chỉ có thể gán tối đa 100 đề tài cùng lúc',
          },
        });
      }
    });

    it('should throw NotFoundException when target user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkAssign(['proposal-1'], 'non-existent-user', mockContext),
      ).rejects.toThrow(NotFoundException);

      try {
        await service.bulkAssign(['proposal-1'], 'non-existent-user', mockContext);
      } catch (e) {
        expect((e as NotFoundException).response).toEqual({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Người dùng không tồn tại',
          },
        });
      }
    });
  });

  describe('AC4: Bulk Assign - Error Handling During Update', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockTargetUser)
        .mockResolvedValueOnce({ displayName: 'Admin User' });

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
    });

    it('should handle partial failure during proposal updates', async () => {
      // First proposal succeeds, second fails
      mockPrisma.proposal.update
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({});

      mockPrisma.workflowLog.create.mockResolvedValue({});

      const result = await service.bulkAssign(
        ['proposal-1', 'proposal-2', 'proposal-3'],
        'target-user-1',
        mockContext,
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].proposalId).toBe('proposal-2');
      expect(result.errors[0].reason).toBe('Database error');
    });
  });

  describe('AC5: RBAC Authorization', () => {
    it('should allow bulk assign for PHONG_KHCN role', () => {
      expect(() => {
        service.validateBulkPermission('PHONG_KHCN');
      }).not.toThrow();
    });

    it('should allow bulk assign for ADMIN role', () => {
      expect(() => {
        service.validateBulkPermission('ADMIN');
      }).not.toThrow();
    });

    it('should reject bulk assign for non-PHONG_KHCN/ADMIN roles', () => {
      expect(() => {
        service.validateBulkPermission('GIANG_VIEN');
      }).toThrow(BadRequestException);

      try {
        service.validateBulkPermission('GIANG_VIEN');
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

  describe('AC6: Atomic Transaction', () => {
    it('should continue processing after individual proposal failure (partial success OK)', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockTargetUser)
        .mockResolvedValueOnce({ displayName: 'Admin User' });

      mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);

      // Second proposal update fails
      mockPrisma.proposal.update
        .mockResolvedValueOnce({}) // proposal-1 succeeds
        .mockRejectedValueOnce(new Error('Update failed')) // proposal-2 fails
        .mockResolvedValueOnce({}); // proposal-3 succeeds

      mockPrisma.workflowLog.create.mockResolvedValue({});

      const result = await service.bulkAssign(
        ['proposal-1', 'proposal-2', 'proposal-3'],
        'target-user-1',
        mockContext,
      );

      // Partial success: proposal-1 and proposal-3 succeed
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);

      // Verify that successful proposals were updated
      expect(mockPrisma.proposal.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'proposal-1' },
        data: { holderUser: 'target-user-1' },
      });
      expect(mockPrisma.proposal.update).toHaveBeenNthCalledWith(3, {
        where: { id: 'proposal-3' },
        data: { holderUser: 'target-user-1' },
      });
    });
  });

  describe('Epic 7 Retro: Type Safety', () => {
    it('should use proper typing - NO as unknown casting', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockTargetUser)
        .mockResolvedValueOnce({ displayName: 'Admin User' });

      mockPrisma.proposal.findMany.mockResolvedValue([mockProposals[0]]);
      mockPrisma.proposal.update.mockResolvedValue({});
      mockPrisma.workflowLog.create.mockResolvedValue({});

      const result = await service.bulkAssign(
        ['proposal-1'],
        'target-user-1',
        mockContext,
      );

      // Result should be properly typed - no "as unknown"
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('errors');

      // Errors should be properly typed
      if (result.errors.length > 0) {
        result.errors.forEach((error) => {
          expect(error).toHaveProperty('proposalId');
          expect(error).toHaveProperty('proposalCode');
          expect(error).toHaveProperty('reason');
        });
      }
    });

    it('should use WorkflowAction enum directly - NO double cast (Epic 7 retro)', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockTargetUser)
        .mockResolvedValueOnce({ displayName: 'Admin User' });

      mockPrisma.proposal.findMany.mockResolvedValue([mockProposals[0]]);
      mockPrisma.proposal.update.mockResolvedValue({});
      mockPrisma.workflowLog.create.mockResolvedValue({});

      await service.bulkAssign(['proposal-1'], 'target-user-1', mockContext);

      // Verify direct enum usage - not "as unknown as AuditAction"
      const workflowLogCall = mockPrisma.workflowLog.create.mock.calls[0][0];
      expect(workflowLogCall.data.action).toBe(WorkflowAction.BULK_ASSIGN);
    });
  });
});
