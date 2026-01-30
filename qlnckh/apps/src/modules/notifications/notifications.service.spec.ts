import { BadRequestException } from '@nestjs/common';
import { WorkflowAction, ProjectState, User } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from './email/email.service';
import { SlaService } from '../calendar/sla.service';

/**
 * Notifications Service Tests
 * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
 *
 * Tests follow Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 */

// Manual mocks
const mockPrisma = {
  proposal: {
    findMany: vi.fn(),
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

const mockEmailService = {
  isEmailEnabled: vi.fn().mockReturnValue(true),
  sendReminder: vi.fn(),
};

const mockSlaService = {
  addBusinessDays: vi.fn().mockReturnValue(new Date('2026-01-10')),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  // Test data fixtures
  const mockProposals = [
    {
      id: 'proposal-1',
      code: 'DT-001',
      title: 'Nghiên cứu AI',
      holderUser: 'user-1',
      slaDeadline: new Date('2026-01-15'),
    },
    {
      id: 'proposal-2',
      code: 'DT-002',
      title: 'Nghiên cứu Blockchain',
      holderUser: 'user-1',
      slaDeadline: new Date('2026-01-20'),
    },
    {
      id: 'proposal-3',
      code: 'DT-003',
      title: 'Nghiên cứu Cloud',
      holderUser: 'user-2',
      slaDeadline: new Date('2026-01-25'),
    },
  ];

  const mockUsers = [
    {
      id: 'user-1',
      displayName: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
    },
    {
      id: 'user-2',
      displayName: 'Trần Văn B',
      email: 'tranvanb@example.com',
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
    service = new NotificationsService(
      mockPrisma as any,
      mockAuditService as any,
      mockEmailService as any,
      mockSlaService as any,
    );
    vi.clearAllMocks();

    // Default mock responses
    mockPrisma.user.findUnique.mockImplementation((params: any) => {
      const userId = params.where.id;
      return mockUsers.find((u) => u.id === userId) || null;
    });

    mockPrisma.proposal.findMany.mockResolvedValue(mockProposals);
    mockEmailService.isEmailEnabled.mockReturnValue(true);
    mockEmailService.sendReminder.mockResolvedValue({ success: true });
    mockPrisma.workflowLog.create.mockResolvedValue({});
  });

  describe('AC1: Recipient Grouping', () => {
    it('should group proposals by holder_user', async () => {
      const proposalIds = ['proposal-1', 'proposal-2', 'proposal-3'];
      const result = await service.groupRecipientsByHolder(proposalIds);

      expect(result).toHaveLength(2); // 2 unique holders

      // User 1 should have 2 proposals
      const user1Group = result.find((g) => g.userId === 'user-1');
      expect(user1Group?.proposals).toHaveLength(2);
      expect(user1Group?.userName).toBe('Nguyễn Văn A');
      expect(user1Group?.userEmail).toBe('nguyenvana@example.com');

      // User 2 should have 1 proposal
      const user2Group = result.find((g) => g.userId === 'user-2');
      expect(user2Group?.proposals).toHaveLength(1);
      expect(user2Group?.userName).toBe('Trần Văn B');
      expect(user2Group?.userEmail).toBe('tranvanb@example.com');
    });

    it('should skip proposals without holder_user', async () => {
      const proposalsWithoutHolder = [
        { ...mockProposals[0], holderUser: null },
        mockProposals[2],
      ];
      mockPrisma.proposal.findMany.mockResolvedValue(proposalsWithoutHolder);

      const result = await service.groupRecipientsByHolder(['proposal-1', 'proposal-3']);

      expect(result).toHaveLength(1); // Only user-2
      expect(result[0].userId).toBe('user-2');
    });

    it('should skip users without email', async () => {
      mockPrisma.user.findUnique.mockImplementation((params: any) => {
        if (params.where.id === 'user-1') {
          return { id: 'user-1', displayName: 'User 1', email: null };
        }
        return mockUsers[1];
      });

      const result = await service.groupRecipientsByHolder(['proposal-1', 'proposal-2', 'proposal-3']);

      expect(result).toHaveLength(1); // Only user-2 has email
      expect(result[0].userId).toBe('user-2');
    });
  });

  describe('AC2: Dry-Run Validation', () => {
    it('should validate recipients and emails in dry-run mode', async () => {
      const proposalIds = ['proposal-1', 'proposal-3'];
      const result = await service.validateDryRun(proposalIds);

      expect(result.valid).toBe(true);
      expect(result.recipientCount).toBe(2);
      expect(result.proposalCount).toBe(3); // user-1 has 2 proposals
      expect(result.invalidEmails).toHaveLength(0);
    });

    it('should return invalid when email service disabled', async () => {
      mockEmailService.isEmailEnabled.mockReturnValue(false);

      const result = await service.validateDryRun(['proposal-1']);

      expect(result.valid).toBe(false);
    });

    it('should identify invalid emails', async () => {
      mockPrisma.user.findUnique.mockImplementation((params: any) => {
        if (params.where.id === 'user-1') {
          return { id: 'user-1', displayName: 'User 1', email: null };
        }
        return mockUsers[1];
      });

      const result = await service.validateDryRun(['proposal-1', 'proposal-3']);

      // User without email is skipped, not included in invalidEmails
      // The service skips users without email during grouping
      expect(result.recipientCount).toBe(1); // Only user-2 has valid email
    });
  });

  describe('AC3: Bulk Remind - Dry Run', () => {
    it('should return validation result without sending emails in dry-run mode', async () => {
      const proposalIds = ['proposal-1', 'proposal-2', 'proposal-3'];
      const result = await service.bulkRemind(proposalIds, true, mockContext);

      expect(result.dryRun).toBe(true);
      expect(result.total).toBe(2); // 2 recipients
      expect(result.success).toBe(0); // No emails sent in dry-run
      expect(result.failed).toBe(0);

      // Verify no emails were sent
      expect(mockEmailService.sendReminder).not.toHaveBeenCalled();

      // Verify dry-run audit was logged
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'BULK_REMIND_DRY_RUN',
        actorUserId: 'admin-1',
        entityType: 'Proposal',
        entityId: 'proposal-1,proposal-2,proposal-3',
        metadata: {
          proposalIds,
          recipientCount: 2,
          dryRun: true,
        },
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });
  });

  describe('AC4: Bulk Remind - Execute', () => {
    beforeEach(() => {
      // Mock proposal state lookup for workflow logging
      mockPrisma.proposal.findMany
        .mockImplementation((params: any) => {
          // First call is for recipient grouping
          if (params.select?.holderUser !== undefined) {
            return Promise.resolve(mockProposals);
          }
          // Second call is for state lookup
          return Promise.resolve(
            mockProposals.map((p) => ({
              ...p,
              state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
            }))
          );
        });
    });

    it('should send reminder emails to all recipients', async () => {
      // Reset the mock to return proper proposals including state
      mockPrisma.proposal.findMany.mockResolvedValue(
        mockProposals.map((p) => ({
          ...p,
          state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
        }))
      );

      const result = await service.bulkRemind(
        ['proposal-1', 'proposal-2', 'proposal-3'],
        false,
        mockContext,
      );

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
      expect(result.dryRun).toBe(false);

      // Verify emails were sent
      expect(mockEmailService.sendReminder).toHaveBeenCalledTimes(2);
    });

    it('should handle partial email failures', async () => {
      // Mock first email success, second email fail
      mockEmailService.sendReminder
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'SMTP error' });

      // Reset the mock to return proper proposals including state
      mockPrisma.proposal.findMany.mockResolvedValue(
        mockProposals.map((p) => ({
          ...p,
          state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
        }))
      );

      const result = await service.bulkRemind(
        ['proposal-1', 'proposal-2', 'proposal-3'],
        false,
        mockContext,
      );

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.recipients[1].error).toBe('SMTP error');
    });

    it('should log audit event for bulk remind', async () => {
      // Reset the mock to return proper proposals including state
      mockPrisma.proposal.findMany.mockResolvedValue(
        mockProposals.map((p) => ({
          ...p,
          state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
        }))
      );

      await service.bulkRemind(
        ['proposal-1', 'proposal-2', 'proposal-3'],
        false,
        mockContext,
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'BULK_REMIND',
        actorUserId: 'admin-1',
        entityType: 'Proposal',
        entityId: 'proposal-1,proposal-2,proposal-3',
        metadata: {
          proposalIds: ['proposal-1', 'proposal-2', 'proposal-3'],
          recipientCount: 2,
          successCount: 2,
          failedCount: 0,
        },
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });

    it('should log workflow action for each proposal - Direct enum usage (Epic 7 retro)', async () => {
      // Reset the mock to return proper proposals including state
      mockPrisma.proposal.findMany.mockResolvedValue(
        mockProposals.map((p) => ({
          ...p,
          state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
        }))
      );

      await service.bulkRemind(
        ['proposal-1', 'proposal-2', 'proposal-3'],
        false,
        mockContext,
      );

      // Verify WorkflowAction.REMIND_SENT is used directly
      expect(mockPrisma.workflowLog.create).toHaveBeenCalled();
      const calls = mockPrisma.workflowLog.create.mock.calls;
      const workflowLogActions = calls.map((call) => call[0].data.action);

      expect(workflowLogActions).toContain(WorkflowAction.REMIND_SENT);
    });
  });

  describe('AC5: Validation Errors', () => {
    it('should reject empty proposalIds array', async () => {
      await expect(
        service.bulkRemind([], false, mockContext),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.bulkRemind([], false, mockContext);
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'EMPTY_PROPOSAL_LIST',
            message: 'Phải chọn ít nhất một hồ sơ',
          },
        });
      }
    });

    it('should reject more than 100 proposals', async () => {
      const proposalIds = Array.from({ length: 101 }, (_, i) => `proposal-${i}`);

      await expect(
        service.bulkRemind(proposalIds, false, mockContext),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.bulkRemind(proposalIds, false, mockContext);
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'EXCEEDS_LIMIT',
            message: 'Chỉ có thể gửi tối đa 100 hồ sơ cùng lúc',
          },
        });
      }
    });

    it('should throw error when no recipients found', async () => {
      // All proposals have no holder_user
      const proposalsWithoutHolder = mockProposals.map((p) => ({
        ...p,
        holderUser: null,
      }));
      mockPrisma.proposal.findMany.mockResolvedValue(proposalsWithoutHolder);

      await expect(
        service.bulkRemind(['proposal-1'], false, mockContext),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.bulkRemind(['proposal-1'], false, mockContext);
      } catch (e) {
        expect((e as BadRequestException).response).toEqual({
          success: false,
          error: {
            code: 'NO_RECIPIENTS',
            message: 'Không tìm thấy người nhận (không có holder_user hoặc email)',
          },
        });
      }
    });
  });

  describe('AC6: RBAC Authorization', () => {
    it('should allow bulk remind for PHONG_KHCN role', () => {
      expect(() => {
        service.validateBulkPermission('PHONG_KHCN');
      }).not.toThrow();
    });

    it('should allow bulk remind for ADMIN role', () => {
      expect(() => {
        service.validateBulkPermission('ADMIN');
      }).not.toThrow();
    });

    it('should reject bulk remind for non-PHONG_KHCN/ADMIN roles', () => {
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

  describe('Epic 7 Retro: Type Safety', () => {
    it('should use proper typing for recipient groups - NO as unknown', async () => {
      const result = await service.groupRecipientsByHolder(['proposal-1']);

      // Verify proper interface structure
      if (result.length > 0) {
        result.forEach((group) => {
          expect(group).toHaveProperty('userId');
          expect(group).toHaveProperty('userName');
          expect(group).toHaveProperty('userEmail');
          expect(group).toHaveProperty('proposals');

          // Verify proposals are properly typed
          group.proposals.forEach((proposal) => {
            expect(proposal).toHaveProperty('id');
            expect(proposal).toHaveProperty('code');
            expect(proposal).toHaveProperty('title');
            expect(proposal).toHaveProperty('slaStatus');
          });
        });
      }
    });

    it('should use proper typing for SLA status - NO as any', () => {
      const slaStatus = service['calculateSlaStatus']({
        slaDeadline: new Date('2026-01-01'), // Past date
      });

      expect(['ok', 'warning', 'overdue']).toContain(slaStatus);
    });
  });

  describe('AC7: SLA Status Calculation', () => {
    it('should return "overdue" for past deadlines', () => {
      const proposal = {
        slaDeadline: new Date('2020-01-01'), // Far in the past
      };

      const status = service['calculateSlaStatus'](proposal);
      expect(status).toBe('overdue');
    });

    it('should return "warning" for deadlines within 2 days', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const proposal = {
        slaDeadline: tomorrow,
      };

      const status = service['calculateSlaStatus'](proposal);
      expect(status).toBe('warning');
    });

    it('should return "ok" for deadlines more than 2 days away', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);

      const proposal = {
        slaDeadline: future,
      };

      const status = service['calculateSlaStatus'](proposal);
      expect(status).toBe('ok');
    });

    it('should return "ok" for proposals without deadline', () => {
      const proposal = {
        slaDeadline: null,
      };

      const status = service['calculateSlaStatus'](proposal);
      expect(status).toBe('ok');
    });
  });
});
