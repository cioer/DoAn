import { AuditHelperService } from './audit-helper.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-action.enum';
import { ProjectState } from '@prisma/client';

describe('AuditHelperService', () => {
  let service: AuditHelperService;
  let mockAuditService: AuditService;

  beforeEach(() => {
    // Create mock AuditService
    mockAuditService = {
      logEvent: jest.fn(),
      getAuditEvents: jest.fn(),
      getEntityHistory: jest.fn(),
      getAuditStatistics: jest.fn(),
      getAuditEventsGroupedByAction: jest.fn(),
      getAuditTimeline: jest.fn(),
    } as unknown as AuditService;

    // Create service with injected auditService
    service = new AuditHelperService(null as any);
    (service as any).auditService = mockAuditService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return service stats', () => {
      const stats = service.getStats();

      expect(stats.service).toBe('AuditHelperService');
      expect(stats.defaultMaxRetries).toBe(3);
      expect(stats.baseRetryDelay).toBe(100);
    });
  });

  describe('logWorkflowTransition', () => {
    const mockContext = {
      userId: 'user-1',
      userDisplayName: 'Test User',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      requestId: 'req-1',
      facultyId: 'KHOA.CNTT',
      role: 'QUAN_LY_KHOA',
    };

    const mockResult = {
      proposalId: 'prop-1',
      proposalCode: 'DEMO-2024-001',
      fromState: ProjectState.DRAFT,
      toState: ProjectState.FACULTY_REVIEW,
      action: 'SUBMIT',
      holderUnit: 'KHOA.CNTT',
      holderUser: null,
      slaStartDate: new Date('2024-01-01'),
      slaDeadline: new Date('2024-01-05'),
    };

    it('should log workflow transition successfully', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(mockResult, mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.action).toBe(AuditAction.PROPOSAL_SUBMIT);
      expect(event.actorUserId).toBe('user-1');
      expect(event.entityType).toBe('Proposal');
      expect(event.entityId).toBe('prop-1');
    });

    it('should include all transition details in metadata', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(mockResult, mockContext);

      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.metadata).toMatchObject({
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        holderUnit: 'KHOA.CNTT',
        slaStartDate: new Date('2024-01-01').toISOString(),
        slaDeadline: new Date('2024-01-05').toISOString(),
      });
    });

    it('should include context fields in event', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(mockResult, mockContext);

      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.ip).toBe('127.0.0.1');
      expect(event.userAgent).toBe('test-agent');
      expect(event.requestId).toBe('req-1');
    });

    it('should handle transitions with optional fields', async () => {
      const resultWithOptional = {
        ...mockResult,
        councilId: 'council-1',
        returnTargetState: ProjectState.DRAFT,
        returnTargetHolderUnit: 'KHOA.CNTT',
        reason: 'Incomplete documentation',
      };

      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(resultWithOptional, mockContext);

      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.metadata.councilId).toBe('council-1');
      expect(event.metadata.returnTargetState).toBe(ProjectState.DRAFT);
      expect(event.metadata.returnTargetHolderUnit).toBe('KHOA.CNTT');
      expect(event.metadata.reason).toBe('Incomplete documentation');
    });

    it('should include holderUser if present', async () => {
      const resultWithHolder = {
        ...mockResult,
        holderUser: 'user-2',
      };

      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(resultWithHolder, mockContext);

      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.metadata.holderUser).toBe('user-2');
    });

    it('should use custom max retries', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(mockResult, mockContext, 5);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
    });

    it('should use WORKFLOW_ prefix for non-AuditAction actions', async () => {
      const customActionResult = {
        ...mockResult,
        action: 'CUSTOM_ACTION',
      };

      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(customActionResult, mockContext);

      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.action).toBe('WORKFLOW_CUSTOM_ACTION');
    });
  });

  describe('buildAuditEvent', () => {
    const mockContext = {
      userId: 'user-1',
      userDisplayName: 'Test User',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      requestId: 'req-1',
    };

    const mockResult = {
      proposalId: 'prop-1',
      proposalCode: 'DEMO-2024-001',
      fromState: ProjectState.DRAFT,
      toState: ProjectState.FACULTY_REVIEW,
      action: AuditAction.PROPOSAL_SUBMIT,
      holderUnit: 'KHOA.CNTT',
      holderUser: null,
      slaStartDate: new Date('2024-01-01'),
      slaDeadline: new Date('2024-01-05'),
    };

    it('should build complete audit event', () => {
      const event = service.buildAuditEvent(mockResult, mockContext);

      expect(event).toMatchObject({
        action: AuditAction.PROPOSAL_SUBMIT,
        actorUserId: 'user-1',
        entityType: 'Proposal',
        entityId: 'prop-1',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        requestId: 'req-1',
      });
    });

    it('should build metadata with all required fields', () => {
      const event = service.buildAuditEvent(mockResult, mockContext);

      expect(event.metadata).toMatchObject({
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        holderUnit: 'KHOA.CNTT',
        slaStartDate: new Date('2024-01-01').toISOString(),
        slaDeadline: new Date('2024-01-05').toISOString(),
      });
    });

    it('should include optional fields in metadata when present', () => {
      const resultWithOptions = {
        ...mockResult,
        holderUser: 'user-2',
        councilId: 'council-1',
        returnTargetState: ProjectState.CHANGES_REQUESTED,
        returnTargetHolderUnit: 'KHOA.CNTT',
        reason: 'Missing documents',
      };

      const event = service.buildAuditEvent(resultWithOptions, mockContext);

      expect(event.metadata.holderUser).toBe('user-2');
      expect(event.metadata.councilId).toBe('council-1');
      expect(event.metadata.returnTargetState).toBe(ProjectState.CHANGES_REQUESTED);
      expect(event.metadata.returnTargetHolderUnit).toBe('KHOA.CNTT');
      expect(event.metadata.reason).toBe('Missing documents');
    });

    it('should not include optional fields when absent', () => {
      const minimalResult = {
        proposalId: 'prop-1',
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        action: 'SUBMIT',
        holderUnit: 'KHOA.CNTT',
        holderUser: null,
      };

      const event = service.buildAuditEvent(minimalResult, mockContext);

      expect(event.metadata.holderUser).toBeUndefined();
      expect(event.metadata.slaStartDate).toBeUndefined();
      expect(event.metadata.slaDeadline).toBeUndefined();
      expect(event.metadata.councilId).toBeUndefined();
    });

    it('should include custom fields from result', () => {
      const resultWithCustom = {
        ...mockResult,
        customField: 'custom value',
        anotherField: 123,
      };

      const event = service.buildAuditEvent(resultWithCustom, mockContext);

      expect(event.metadata.customField).toBe('custom value');
      expect(event.metadata.anotherField).toBe(123);
    });

    it('should handle minimal context', () => {
      const minimalContext = {
        userId: 'user-1',
      };

      const event = service.buildAuditEvent(mockResult, minimalContext);

      expect(event.actorUserId).toBe('user-1');
      expect(event.ip).toBeUndefined();
      expect(event.userAgent).toBeUndefined();
      expect(event.requestId).toBeUndefined();
    });
  });

  describe('sendWithRetry', () => {
    const mockEvent = {
      action: AuditAction.PROPOSAL_SUBMIT,
      actorUserId: 'user-1',
      entityType: 'Proposal',
      entityId: 'prop-1',
      metadata: { proposalCode: 'DEMO-2024-001' },
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      requestId: 'req-1',
    };

    it('should send event on first attempt', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.sendWithRetry(mockEvent, 3);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new Error('Connection timeout');
      (mockAuditService.logEvent as jest.Mock)
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(undefined);

      await service.sendWithRetry(mockEvent, 3);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff between retries', async () => {
      const retryableError = new Error('ECONNRESET');
      let callCount = 0;
      const timestamps: number[] = [];

      (mockAuditService.logEvent as jest.Mock).mockImplementation(async () => {
        timestamps.push(Date.now());
        callCount++;
        if (callCount < 3) {
          throw retryableError;
        }
      });

      await service.sendWithRetry(mockEvent, 3);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(3);
      expect(timestamps.length).toBe(3);

      // Check exponential backoff (approximately)
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];
      expect(delay2).toBeGreaterThan(delay1); // Second delay should be longer
    });

    it('should exhaust max retries and log error', async () => {
      const retryableError = new Error('Connection timeout');
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      (mockAuditService.logEvent as jest.Mock).mockRejectedValue(retryableError);

      await service.sendWithRetry(mockEvent, 2);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Validation failed');
      (mockAuditService.logEvent as jest.Mock).mockRejectedValue(nonRetryableError);

      await service.sendWithRetry(mockEvent, 3);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1); // No retries
    });

    it('should detect retryable network errors', async () => {
      const networkErrors = [
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
        new Error('ENOTFOUND'),
        new Error('ECONNREFUSED'),
      ];

      for (const error of networkErrors) {
        (mockAuditService.logEvent as jest.Mock)
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(undefined);

        await service.sendWithRetry(mockEvent, 1);

        expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2); // Failed + retry
        jest.clearAllMocks();
      }
    });

    it('should detect retryable Prisma errors', async () => {
      const prismaError = { code: 'P2034', message: 'Serialization failure' };
      (mockAuditService.logEvent as jest.Mock)
        .mockRejectedValueOnce(prismaError)
        .mockResolvedValueOnce(undefined);

      await service.sendWithRetry(mockEvent, 1);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2);
    });

    it('should detect retryable database errors', async () => {
      const dbErrors = [
        new Error('Connection lost'),
        new Error('Database timeout'),
        new Error('Connection refused'),
      ];

      for (const error of dbErrors) {
        (mockAuditService.logEvent as jest.Mock)
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(undefined);

        await service.sendWithRetry(mockEvent, 1);

        expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2);
        jest.clearAllMocks();
      }
    });

    it('should log success after retries', async () => {
      const retryableError = new Error('Connection timeout');
      const loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});

      (mockAuditService.logEvent as jest.Mock)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(undefined);

      await service.sendWithRetry(mockEvent, 3);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Audit event logged after 1 retries'),
      );

      loggerLogSpy.mockRestore();
    });
  });

  describe('logWorkflowTransitionsBatch', () => {
    const mockContext = {
      userId: 'user-1',
      userDisplayName: 'Test User',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      requestId: 'req-1',
    };

    const mockResults = [
      {
        proposalId: 'prop-1',
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        action: 'SUBMIT',
        holderUnit: 'KHOA.CNTT',
        holderUser: null,
      },
      {
        proposalId: 'prop-2',
        proposalCode: 'DEMO-2024-002',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        action: 'SUBMIT',
        holderUnit: 'KHOA.CNTT',
        holderUser: null,
      },
    ];

    it('should log multiple transitions', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransitionsBatch(mockResults, mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2);
    });

    it('should use custom max retries for batch', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransitionsBatch(mockResults, mockContext, 5);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch', async () => {
      (mockAuditService.logEvent as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Validation failed'));

      // Should not throw - uses Promise.allSettled
      await expect(
        service.logWorkflowTransitionsBatch(mockResults, mockContext),
      ).resolves.toBeUndefined();

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle empty batch', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransitionsBatch([], mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(0);
    });

    it('should handle single result batch', async () => {
      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransitionsBatch([mockResults[0]], mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    const mockContext = {
      userId: 'user-1',
    };

    it('should handle result without optional fields', async () => {
      const minimalResult = {
        proposalId: 'prop-1',
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        action: 'SUBMIT',
        holderUnit: 'KHOA.CNTT',
        holderUser: null,
      };

      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(minimalResult, mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
    });

    it('should handle null/undefined optional context fields', async () => {
      const mockResult = {
        proposalId: 'prop-1',
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        action: 'SUBMIT',
        holderUnit: 'KHOA.CNTT',
        holderUser: null,
      };

      const contextWithNulls = {
        userId: 'user-1',
        ip: null as string | undefined,
        userAgent: undefined,
        requestId: undefined,
      };

      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(mockResult, contextWithNulls);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.ip).toBeNull();
      expect(event.userAgent).toBeUndefined();
      expect(event.requestId).toBeUndefined();
    });

    it('should handle result with custom metadata fields', async () => {
      const resultWithCustom = {
        proposalId: 'prop-1',
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        action: 'SUBMIT',
        holderUnit: 'KHOA.CNTT',
        holderUser: null,
        customField1: 'value1',
        customField2: 123,
        customField3: { nested: 'object' },
      };

      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      await service.logWorkflowTransition(resultWithCustom, mockContext);

      const event = (mockAuditService.logEvent as jest.Mock).mock.calls[0][0];
      expect(event.metadata.customField1).toBe('value1');
      expect(event.metadata.customField2).toBe(123);
      expect(event.metadata.customField3).toEqual({ nested: 'object' });
    });

    it('should handle error when AuditService.logEvent fails', async () => {
      const serviceWithError = new AuditHelperService(mockAuditService);

      (mockAuditService.logEvent as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      const mockResult = {
        proposalId: 'prop-1',
        proposalCode: 'DEMO-2024-001',
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        action: 'SUBMIT',
        holderUnit: 'KHOA.CNTT',
        holderUser: null,
      };

      // Should handle error gracefully and log (not throw)
      await serviceWithError.logWorkflowTransition(mockResult, mockContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow transition lifecycle', async () => {
      const mockContext = {
        userId: 'user-1',
        userDisplayName: 'Test User',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        requestId: 'req-1',
      };

      const transitions = [
        {
          proposalId: 'prop-1',
          proposalCode: 'DEMO-2024-001',
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          action: AuditAction.PROPOSAL_SUBMIT,
          holderUnit: 'KHOA.CNTT',
          holderUser: null,
          slaStartDate: new Date('2024-01-01'),
          slaDeadline: new Date('2024-01-05'),
        },
        {
          proposalId: 'prop-1',
          proposalCode: 'DEMO-2024-001',
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.SCHOOL_SELECTION_REVIEW,
          action: 'FACULTY_APPROVE',
          holderUnit: 'PHONG_KHCN',
          holderUser: null,
        },
        {
          proposalId: 'prop-1',
          proposalCode: 'DEMO-2024-001',
          fromState: ProjectState.SCHOOL_SELECTION_REVIEW,
          toState: ProjectState.CHANGES_REQUESTED,
          action: AuditAction.FACULTY_RETURN,
          holderUnit: 'KHOA.CNTT',
          holderUser: 'user-1',
          returnTargetState: ProjectState.DRAFT,
          returnTargetHolderUnit: 'KHOA.CNTT',
          reason: 'Incomplete sections',
        },
      ];

      (mockAuditService.logEvent as jest.Mock).mockResolvedValue(undefined);

      for (const transition of transitions) {
        await service.logWorkflowTransition(transition, mockContext);
      }

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(3);

      // Verify each transition was logged correctly
      const calls = (mockAuditService.logEvent as jest.Mock).mock.calls;
      expect(calls[0][0].action).toBe(AuditAction.PROPOSAL_SUBMIT);
      expect(calls[1][0].action).toBe('FACULTY_APPROVE');
      expect(calls[2][0].action).toBe(AuditAction.FACULTY_RETURN);
      expect(calls[2][0].metadata.reason).toBe('Incomplete sections');
    });
  });
});
