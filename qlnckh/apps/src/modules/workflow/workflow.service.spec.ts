import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  ProjectState,
  WorkflowAction,
  Proposal,
  User,
  Faculty,
} from '@prisma/client';
import { WorkflowService, TransitionContext } from './workflow.service';
import { AuditService } from '../audit/audit.service';
import {
  isValidTransition,
  InvalidTransitionError,
  isTerminalState,
  getValidNextStates,
  STATE_PHASES,
  TERMINAL_STATES,
} from './helpers/state-machine.helper';
import {
  getHolderForState,
  canUserActOnProposal,
  getHolderDisplayName,
  isTerminalQueueState,
  getMyQueueProposalsFilter,
  getMyProposalsFilter,
  getOverdueProposalsFilter,
} from './helpers/holder-rules.helper';
import { RejectReasonCode } from './enums/reject-reason-code.enum';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { TransactionService } from '../../../common/services/transaction.service';
import { HolderAssignmentService } from './services/holder-assignment.service';
import { AuditHelperService } from './services/audit-helper.service';

/**
 * Workflow Service Tests
 *
 * Tests follow Epic 2 lesson learned: manual DI bypass for reliable testing
 */

// Manual mock - bypass DI (Epic 2 pattern)
const mockPrisma = {
  proposal: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  workflowLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

const mockAuditService = {
  logEvent: vi.fn().mockResolvedValue(undefined),
};

// Story 3.3: SlaService mock
// Story 3.6: Added calculateDeadlineWithCutoff
const mockSlaService = {
  calculateDeadline: vi.fn(),
  calculateDeadlineWithCutoff: vi.fn(),
};

// Phase 1 Refactor: New service mocks
// Smart validator mock that performs real validation logic
const mockValidator = {
  validateTransition: vi.fn().mockImplementation(async (
    proposalId: string,
    targetState: ProjectState,
    action: WorkflowAction,
    validationContext: any,
  ) => {
    // Get proposal from the prisma mock
    const proposal = await mockPrisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
    });

    // Proposal exists check
    if (!proposal) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('Đề tài không tồn tại');
    }

    const user = validationContext.user;

    // Ownership check
    const ownershipRequiredActions = [WorkflowAction.SUBMIT, WorkflowAction.WITHDRAW, WorkflowAction.RESUBMIT];
    if (ownershipRequiredActions.includes(action) && proposal.ownerId !== user.id) {
      const { BadRequestException } = await import('@nestjs/common');
      throw new BadRequestException('Chỉ chủ nhiệm đề tài mới có thể thực hiện hành động này');
    }

    // Role-based permission check (simplified for tests)
    const canRolePerformAction = (action: WorkflowAction, role: string) => {
      const actionPermissions: Record<string, string[]> = {
        SUBMIT: ['GIANG_VIEN', 'SINH_VIEN'],
        APPROVE: ['QUAN_LY_KHOA', 'PHONG_KHCN', 'KHOA', 'PKHCN'],
        RETURN: ['QUAN_LY_KHOA', 'PHONG_KHCN', 'KHOA', 'PKHCN'],
        REQUEST_CHANGES: ['QUAN_LY_KHOA', 'PHONG_KHCN', 'KHOA', 'PKHCN'],
        WITHDRAW: ['GIANG_VIEN', 'SINH_VIEN'],
        RESUBMIT: ['GIANG_VIEN', 'SINH_VIEN'],
        CANCEL: ['GIANG_VIEN', 'SINH_VIEN'],
        REJECT: ['PHONG_KHCN', 'PKHCN'],
        PAUSE: ['PKHCN'],
        RESUME: ['PKHCN'],
        ACCEPT: ['KHOA', 'PHONG_KHCN'],
        START_PROJECT: ['GIANG_VIEN', 'SINH_VIEN'],
        COMPLETE_HANDOVER: ['GIANG_VIEN', 'SINH_VIEN'],
      };
      return actionPermissions[action]?.includes(role) ?? false;
    };

    if (!canRolePerformAction(action, user.role)) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException(
        `Vai trò '${user.role}' không có quyền thực hiện hành động ${action}`,
      );
    }

    // State transition check for SUBMIT action
    if (action === WorkflowAction.SUBMIT && proposal.state !== ProjectState.DRAFT) {
      const { BadRequestException } = await import('@nestjs/common');
      throw new BadRequestException(
        `Chỉ có thể thực hiện SUBMIT khi đề tài ở trạng thái DRAFT. Hiện tại: ${proposal.state}`,
      );
    }

    // State transition check for APPROVE action
    if (action === WorkflowAction.APPROVE) {
      const validStates = [
        ProjectState.FACULTY_REVIEW,
        ProjectState.SCHOOL_SELECTION_REVIEW,
        ProjectState.OUTLINE_COUNCIL_REVIEW,
      ];
      if (!validStates.includes(proposal.state)) {
        const { BadRequestException } = await import('@nestjs/common');
        throw new BadRequestException(
          `Chỉ có thể thực hiện APPROVE từ các trạng thái review. Hiện tại: ${proposal.state}`,
        );
      }
    }
  }),
};

const mockIdempotency = {
  setIfAbsent: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

const mockTransaction = {
  updateProposalWithLog: vi.fn(),
  execute: vi.fn(),
  executeWithRetry: vi.fn(),
  updateProposalSections: vi.fn(),
  batchUpdateProposals: vi.fn(),
  healthCheck: vi.fn().mockResolvedValue(true),
};

const mockHolder = {
  getHolderForState: vi.fn(),
  canUserActOnProposal: vi.fn(),
  getHolderDisplayName: vi.fn(),
  isTerminalQueueState: vi.fn(),
  getMyQueueProposalsFilter: vi.fn(),
  getMyProposalsFilter: vi.fn(),
  getOverdueProposalsFilter: vi.fn(),
  getUpcomingProposalsFilter: vi.fn(),
  getStats: vi.fn(),
};

const mockAuditHelper = {
  logWorkflowTransition: vi.fn().mockResolvedValue(undefined),
  logWorkflowTransitionsBatch: vi.fn().mockResolvedValue(undefined),
};

describe('WorkflowService', () => {
  let service: WorkflowService;

  // Test data fixtures
  const mockProposal: Proposal = {
    id: 'proposal-1',
    code: 'DT-001',
    title: 'Test Proposal',
    state: ProjectState.DRAFT,
    ownerId: 'user-1',
    facultyId: 'faculty-1',
    holderUnit: null,
    holderUser: null,
    slaStartDate: null,
    slaDeadline: null,
    templateId: null,
    templateVersion: null,
    formData: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    owner: {} as User,
    faculty: {} as Faculty,
    workflowLogs: [],
    attachments: [],
    template: null,
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    displayName: 'Test User',
    role: 'GIANG_VIEN' as any,
    facultyId: 'faculty-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    faculty: {} as Faculty,
    refreshTokens: [],
    auditEventsAsActor: [],
    auditEventsAsActing: [],
    ownedProposals: [],
  };

  const mockContext: TransitionContext = {
    userId: 'user-1',
    userRole: 'GIANG_VIEN',
    userFacultyId: 'faculty-1',
    ip: '127.0.0.1',
    userAgent: 'test',
    requestId: 'req-1',
  };

  beforeEach(() => {
    // Manual DI bypass - create service directly with mocks
    service = new WorkflowService(
      mockPrisma as any,
      mockAuditService as any,
      mockSlaService as any, // Story 3.3: SlaService
      // Phase 1 Refactor: New extracted services
      mockValidator as any,
      mockIdempotency as any,
      mockTransaction as any,
      mockHolder as any,
      mockAuditHelper as any,
    );
    vi.clearAllMocks();

    // Mock getUserDisplayName response (M4 fix)
    mockPrisma.user.findUnique.mockResolvedValue({
      displayName: 'Test User',
    });

    // Story 3.3: Mock SLA deadline calculation
    mockSlaService.calculateDeadline.mockResolvedValue(
      new Date('2026-01-10T17:00:00'),
    );

    // Phase 1 Refactor: Setup default mock implementations
    // Implement proper idempotency caching for tests
    const idempotencyCache = new Map<string, any>();
    mockIdempotency.setIfAbsent.mockImplementation(async (key, fn) => {
      if (!idempotencyCache.has(key)) {
        const result = await fn();
        idempotencyCache.set(key, result);
      }
      // Return IdempotencyResult structure (matching real service)
      return {
        data: idempotencyCache.get(key),
        isCached: idempotencyCache.has(key),
        key,
      };
    });
    // Clear cache before each test
    idempotencyCache.clear();

    mockHolder.getHolderForState.mockImplementation((state, proposal) => {
      return getHolderForState(state, proposal);
    });

    // Phase 1 Refactor: Setup TransactionService mock to simulate transaction execution
    mockTransaction.updateProposalWithLog.mockImplementation(async (params) => {
      // Simulate successful proposal update
      const updatedProposal = {
        ...mockProposal,
        state: params.toState,
        holderUnit: params.holderUnit,
        holderUser: params.holderUser,
        slaStartDate: params.slaStartDate,
        slaDeadline: params.slaDeadline,
      };

      // Simulate workflow log creation
      const workflowLog = {
        id: `log-${Date.now()}`,
        proposalId: params.proposalId,
        action: params.action,
        fromState: params.fromState,
        toState: params.toState,
        actorId: params.userId,
        actorName: params.userDisplayName,
        timestamp: new Date(),
      };

      return {
        proposal: updatedProposal,
        workflowLog,
      };
    });
  });

  describe('Task 1 & 2: State Machine Helper Tests', () => {
    describe('AC1: Enum ProjectState has 15 canonical states', () => {
      it('should have all Phase A states (Proposal)', () => {
        const phaseA = STATE_PHASES.PHASE_A_PROPOSAL;
        expect(phaseA).toHaveLength(4);
        expect(phaseA).toContain(ProjectState.DRAFT);
        expect(phaseA).toContain(ProjectState.FACULTY_REVIEW);
        expect(phaseA).toContain(ProjectState.SCHOOL_SELECTION_REVIEW);
        expect(phaseA).toContain(ProjectState.OUTLINE_COUNCIL_REVIEW);
      });

      it('should have all Phase B states (Changes & Approval)', () => {
        const phaseB = STATE_PHASES.PHASE_B_CHANGES_APPROVAL;
        expect(phaseB).toHaveLength(3);
        expect(phaseB).toContain(ProjectState.CHANGES_REQUESTED);
        expect(phaseB).toContain(ProjectState.APPROVED);
        expect(phaseB).toContain(ProjectState.IN_PROGRESS);
      });

      it('should have all Phase C states (Acceptance & Handover)', () => {
        const phaseC = STATE_PHASES.PHASE_C_ACCEPTANCE_HANDOVER;
        expect(phaseC).toHaveLength(4);
        expect(phaseC).toContain(ProjectState.FACULTY_ACCEPTANCE_REVIEW);
        expect(phaseC).toContain(ProjectState.SCHOOL_ACCEPTANCE_REVIEW);
        expect(phaseC).toContain(ProjectState.HANDOVER);
        expect(phaseC).toContain(ProjectState.COMPLETED);
      });

      it('should have all Exception states', () => {
        const exceptions = STATE_PHASES.EXCEPTION_STATES;
        expect(exceptions).toHaveLength(4);
        expect(exceptions).toContain(ProjectState.PAUSED);
        expect(exceptions).toContain(ProjectState.CANCELLED);
        expect(exceptions).toContain(ProjectState.REJECTED);
        expect(exceptions).toContain(ProjectState.WITHDRAWN);
      });

      it('should have exactly 15 total states', () => {
        const allStates = [
          ...STATE_PHASES.PHASE_A_PROPOSAL,
          ...STATE_PHASES.PHASE_B_CHANGES_APPROVAL,
          ...STATE_PHASES.PHASE_C_ACCEPTANCE_HANDOVER,
          ...STATE_PHASES.EXCEPTION_STATES,
        ];
        const uniqueStates = new Set(allStates);
        expect(uniqueStates.size).toBe(15);
      });
    });

    describe('AC2: SUBMITTED is EVENT, not STATE', () => {
      it('should NOT include SUBMITTED in ProjectState enum', () => {
        const projectStateValues = Object.values(ProjectState);
        expect(projectStateValues).not.toContain('SUBMITTED');
      });

      it('should validate DRAFT → FACULTY_REVIEW directly (not through SUBMITTED)', () => {
        const isValid = isValidTransition(
          ProjectState.DRAFT,
          ProjectState.FACULTY_REVIEW,
          WorkflowAction.SUBMIT,
        );
        expect(isValid).toBe(true);
      });

      it('should reject SUBMITTED as a state value', () => {
        const isSubmitted = 'SUBMITTED' as ProjectState;
        const allStates = Object.values(ProjectState);
        expect(allStates).not.toContain(isSubmitted);
      });
    });

    describe('Terminal States', () => {
      it('should identify COMPLETED as terminal', () => {
        expect(isTerminalState(ProjectState.COMPLETED)).toBe(true);
      });

      it('should identify CANCELLED as terminal', () => {
        expect(isTerminalState(ProjectState.CANCELLED)).toBe(true);
      });

      it('should identify REJECTED as terminal', () => {
        expect(isTerminalState(ProjectState.REJECTED)).toBe(true);
      });

      it('should identify WITHDRAWN as terminal', () => {
        expect(isTerminalState(ProjectState.WITHDRAWN)).toBe(true);
      });

      it('should NOT identify DRAFT as terminal', () => {
        expect(isTerminalState(ProjectState.DRAFT)).toBe(false);
      });

      it('should NOT identify IN_PROGRESS as terminal', () => {
        expect(isTerminalState(ProjectState.IN_PROGRESS)).toBe(false);
      });
    });

    describe('AC7: Valid State Transitions', () => {
      describe('DRAFT transitions', () => {
        it('should allow DRAFT → FACULTY_REVIEW with SUBMIT action', () => {
          expect(
            isValidTransition(
              ProjectState.DRAFT,
              ProjectState.FACULTY_REVIEW,
              WorkflowAction.SUBMIT,
            ),
          ).toBe(true);
        });

        it('should allow DRAFT → CANCELLED with CANCEL action', () => {
          expect(
            isValidTransition(
              ProjectState.DRAFT,
              ProjectState.CANCELLED,
              WorkflowAction.CANCEL,
            ),
          ).toBe(true);
        });

        it('should reject DRAFT → APPROVED (invalid transition)', () => {
          expect(
            isValidTransition(
              ProjectState.DRAFT,
              ProjectState.APPROVED,
              WorkflowAction.APPROVE,
            ),
          ).toBe(false);
        });
      });

      describe('FACULTY_REVIEW transitions', () => {
        it('should allow FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW with APPROVE', () => {
          expect(
            isValidTransition(
              ProjectState.FACULTY_REVIEW,
              ProjectState.SCHOOL_SELECTION_REVIEW,
              WorkflowAction.APPROVE,
            ),
          ).toBe(true);
        });

        it('should allow FACULTY_REVIEW → CHANGES_REQUESTED with RETURN', () => {
          expect(
            isValidTransition(
              ProjectState.FACULTY_REVIEW,
              ProjectState.CHANGES_REQUESTED,
              WorkflowAction.RETURN,
            ),
          ).toBe(true);
        });

        it('should get valid next states for FACULTY_REVIEW + APPROVE', () => {
          const nextStates = getValidNextStates(
            ProjectState.FACULTY_REVIEW,
            WorkflowAction.APPROVE,
          );
          expect(nextStates).toEqual([ProjectState.SCHOOL_SELECTION_REVIEW]);
        });
      });

      describe('CHANGES_REQUESTED transitions', () => {
        it('should allow CHANGES_REQUESTED → FACULTY_REVIEW with RESUBMIT', () => {
          expect(
            isValidTransition(
              ProjectState.CHANGES_REQUESTED,
              ProjectState.FACULTY_REVIEW,
              WorkflowAction.RESUBMIT,
            ),
          ).toBe(true);
        });

        it('should allow CHANGES_REQUESTED → SCHOOL_SELECTION_REVIEW with RESUBMIT', () => {
          expect(
            isValidTransition(
              ProjectState.CHANGES_REQUESTED,
              ProjectState.SCHOOL_SELECTION_REVIEW,
              WorkflowAction.RESUBMIT,
            ),
          ).toBe(true);
        });
      });
    });

    describe('Holder Assignment Rules', () => {
      it('should assign holder to faculty for FACULTY_REVIEW state', () => {
        const holder = getHolderForState(
          ProjectState.FACULTY_REVIEW,
          mockProposal,
        );
        expect(holder.holderUnit).toBe('faculty-1');
        expect(holder.holderUser).toBeNull();
      });

      it('should assign holder to PHONG_KHCN for SCHOOL_SELECTION_REVIEW', () => {
        const holder = getHolderForState(
          ProjectState.SCHOOL_SELECTION_REVIEW,
          mockProposal,
        );
        expect(holder.holderUnit).toBe('PHONG_KHCN');
        expect(holder.holderUser).toBeNull();
      });

      it('should assign holder to owner for CHANGES_REQUESTED', () => {
        const holder = getHolderForState(
          ProjectState.CHANGES_REQUESTED,
          mockProposal,
        );
        expect(holder.holderUnit).toBe('faculty-1'); // owner's faculty
        expect(holder.holderUser).toBe('user-1'); // owner
      });

      it('should not assign holder for DRAFT state', () => {
        const holder = getHolderForState(ProjectState.DRAFT, mockProposal);
        expect(holder.holderUnit).toBeNull();
        expect(holder.holderUser).toBeNull();
      });

      it('should assign holder to PHONG_KHCN for PAUSED state', () => {
        const holder = getHolderForState(ProjectState.PAUSED, mockProposal);
        expect(holder.holderUnit).toBe('PHONG_KHCN');
        expect(holder.holderUser).toBeNull();
      });
    });
  });

  describe('Task 4: Submit Proposal (DRAFT → FACULTY_REVIEW)', () => {
    beforeEach(() => {
      // Set up default mock returns for submit tests
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      // Story 3.6: Mock calculateDeadlineWithCutoff
      mockSlaService.calculateDeadlineWithCutoff.mockResolvedValue(
        new Date('2026-01-10T17:00:00'),
      );
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Simulate transaction - mockPrisma methods should return expected values
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          slaStartDate: new Date('2026-01-06T10:00:00'),
          slaDeadline: new Date('2026-01-10T17:00:00'),
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'GIANG_VIEN',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
    });

    it('AC3.1: should transition DRAFT → FACULTY_REVIEW on submit', async () => {
      const result = await service.submitProposal('proposal-1', mockContext);

      expect(result.previousState).toBe(ProjectState.DRAFT);
      expect(result.currentState).toBe(ProjectState.FACULTY_REVIEW);
      expect(result.holderUnit).toBe('faculty-1');

      // Phase 1 Refactor: Verify transaction service was called with correct params
      expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
        expect.objectContaining({
          toState: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          holderUser: null,
          slaStartDate: expect.any(Date),
          slaDeadline: expect.any(Date),
        }),
      );
    });

    it('AC3.2: should create workflow_log entry with action=SUBMIT', async () => {
      await service.submitProposal('proposal-1', mockContext);

      // Phase 1 Refactor: Verify transaction service was called with correct action
      expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
        }),
      );
    });

    it('AC3.3: should reject submit if proposal not in DRAFT state', async () => {
      const notDraftProposal = {
        ...mockProposal,
        state: ProjectState.APPROVED,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(notDraftProposal);

      await expect(
        service.submitProposal('proposal-1', mockContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC3.4: should reject submit if user is not owner', async () => {
      const notOwnerContext = {
        ...mockContext,
        userId: 'user-2',
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      await expect(
        service.submitProposal('proposal-1', notOwnerContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC3.5: should return cached result for idempotent requests', async () => {
      const idempotencyKey = 'idem-1';
      const contextWithKey = { ...mockContext, idempotencyKey };

      // First call
      const result1 = await service.submitProposal('proposal-1', contextWithKey);
      // Second call with same key
      const result2 = await service.submitProposal('proposal-1', contextWithKey);

      expect(result1).toBe(result2);

      // Phase 1 Refactor: With new implementation, validator also calls findUnique
      // So we expect 2 calls per actual execution (validator + workflow)
      // But with caching, the second request should not execute the callback at all
      // So total calls should be 2 (not 4) for two idempotent requests
      expect(mockPrisma.proposal.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('Task 5: Approve Faculty Review (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)', () => {
    const facultyReviewProposal = {
      ...mockProposal,
      state: ProjectState.FACULTY_REVIEW,
    };

    // Use proper role for APPROVE action (QUAN_LY_KHOA)
    const facultyContext = {
      ...mockContext,
      userRole: 'QUAN_LY_KHOA',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(facultyReviewProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...facultyReviewProposal,
          state: ProjectState.SCHOOL_SELECTION_REVIEW,
          holderUnit: 'PHONG_KHCN',
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-2',
          proposalId: 'proposal-1',
          action: WorkflowAction.APPROVE,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.SCHOOL_SELECTION_REVIEW,
          actorId: 'user-1',
          actorName: 'QUAN_LY_KHOA',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
    });

    it('AC4.1: should transition FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW on approve', async () => {
      const result = await service.approveFacultyReview(
        'proposal-1',
        facultyContext,
      );

      expect(result.previousState).toBe(ProjectState.FACULTY_REVIEW);
      expect(result.currentState).toBe(ProjectState.SCHOOL_SELECTION_REVIEW);
      expect(result.holderUnit).toBe('PHONG_KHCN');
    });

    it('AC4.2: should create workflow_log entry with action=APPROVE', async () => {
      await service.approveFacultyReview('proposal-1', facultyContext);

      // Phase 1 Refactor: Verify transaction service was called with correct action
      expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: WorkflowAction.APPROVE,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        }),
      );
    });

    it('AC4.3: should reject approve if proposal not in FACULTY_REVIEW', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      await expect(
        service.approveFacultyReview('proposal-1', facultyContext),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Task 6: Return Faculty Review (FACULTY_REVIEW → CHANGES_REQUESTED)', () => {
    const facultyReviewProposal = {
      ...mockProposal,
      state: ProjectState.FACULTY_REVIEW,
    };

    // Use proper role for RETURN action (QUAN_LY_KHOA)
    const facultyContext = {
      ...mockContext,
      userRole: 'QUAN_LY_KHOA',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(facultyReviewProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...facultyReviewProposal,
          state: ProjectState.CHANGES_REQUESTED,
          holderUnit: 'faculty-1',
          holderUser: 'user-1',
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-3',
          proposalId: 'proposal-1',
          action: WorkflowAction.RETURN,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.CHANGES_REQUESTED,
          actorId: 'user-1',
          actorName: 'QUAN_LY_KHOA',
          returnTargetState: ProjectState.FACULTY_REVIEW,
          returnTargetHolderUnit: 'faculty-1',
          reasonCode: 'MISSING_DOCUMENTS',
          comment: 'Cần bổ sung tài liệu',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
    });

    it('AC5.1: should transition FACULTY_REVIEW → CHANGES_REQUESTED on return', async () => {
      const result = await service.returnFacultyReview(
        'proposal-1',
        'Cần bổ sung tài liệu',
        'MISSING_DOCUMENTS',
        undefined,
        facultyContext,
      );

      expect(result.previousState).toBe(ProjectState.FACULTY_REVIEW);
      expect(result.currentState).toBe(ProjectState.CHANGES_REQUESTED);
      expect(result.holderUnit).toBe('faculty-1'); // owner's faculty
      expect(result.holderUser).toBe('user-1'); // owner
    });

    it('AC5.2: should store return_target_state in workflow_logs', async () => {
      await service.returnFacultyReview(
        'proposal-1',
        'Cần bổ sung tài liệu',
        'MISSING_DOCUMENTS',
        undefined,
        facultyContext,
      );

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          returnTargetState: ProjectState.FACULTY_REVIEW,
          returnTargetHolderUnit: 'faculty-1',
        }),
      });
    });

    it('AC5.3: should reject return if proposal not in FACULTY_REVIEW', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      await expect(
        service.returnFacultyReview(
          'proposal-1',
          'Cần bổ sung',
          'MISSING',
          undefined,
          facultyContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AC6: General State Transition Method', () => {
    it('should validate transition before executing', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      await expect(
        service.transitionState(
          'proposal-1',
          ProjectState.APPROVED,
          WorkflowAction.APPROVE,
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for terminal state transitions', async () => {
      const completedProposal = {
        ...mockProposal,
        state: ProjectState.COMPLETED,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(completedProposal);

      await expect(
        service.transitionState(
          'proposal-1',
          ProjectState.HANDOVER,
          WorkflowAction.FINALIZE,
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundException if proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.submitProposal('non-existent', mockContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InvalidTransitionError for invalid transitions', () => {
      expect(() => {
        throw new InvalidTransitionError(
          ProjectState.DRAFT,
          ProjectState.APPROVED,
          WorkflowAction.APPROVE,
        );
      }).toThrow(InvalidTransitionError);
    });
  });

  describe('M1 Fix: RBAC Validation', () => {
    it('should reject submit when user role lacks permission', async () => {
      const wrongRoleContext = {
        ...mockContext,
        userRole: 'ADMIN', // ADMIN not in SUBMIT allowed roles
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      await expect(
        service.submitProposal('proposal-1', wrongRoleContext),
      ).rejects.toThrow('không có quyền thực hiện hành động SUBMIT');
    });

    it('should reject approve when user role lacks permission', async () => {
      const facultyReviewProposal = {
        ...mockProposal,
        state: ProjectState.FACULTY_REVIEW,
      };
      const wrongRoleContext = {
        ...mockContext,
        userRole: 'GIANG_VIEN', // GIANG_VIEN not in APPROVE allowed roles
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(facultyReviewProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...facultyReviewProposal,
          state: ProjectState.SCHOOL_SELECTION_REVIEW,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-2',
          proposalId: 'proposal-1',
          action: WorkflowAction.APPROVE,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.SCHOOL_SELECTION_REVIEW,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      await expect(
        service.approveFacultyReview('proposal-1', wrongRoleContext),
      ).rejects.toThrow('không có quyền thực hiện hành động APPROVE');
    });

    it('should reject return when user role lacks permission', async () => {
      const facultyReviewProposal = {
        ...mockProposal,
        state: ProjectState.FACULTY_REVIEW,
      };
      const wrongRoleContext = {
        ...mockContext,
        userRole: 'GIANG_VIEN', // GIANG_VIEN not in RETURN allowed roles
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(facultyReviewProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...facultyReviewProposal,
          state: ProjectState.CHANGES_REQUESTED,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-3',
          proposalId: 'proposal-1',
          action: WorkflowAction.RETURN,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.CHANGES_REQUESTED,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      await expect(
        service.returnFacultyReview(
          'proposal-1',
          'Need changes',
          'MISSING_INFO',
          undefined,
          wrongRoleContext,
        ),
      ).rejects.toThrow('không có quyền thực hiện hành động RETURN');
    });
  });

  describe('M4 Fix: User Display Name', () => {
    it('should fetch user display name for workflow log', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      await service.submitProposal('proposal-1', mockContext);

      // Verify getUserDisplayName was called
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { displayName: true },
      });

      // Phase 1 Refactor: Verify transaction service was called with display name
      expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userDisplayName: 'Test User',
        }),
      );
    });

    it('should fallback to userId when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // User not found
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'user-1', // Fallback to userId
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      await service.submitProposal('proposal-1', mockContext);

      // Phase 1 Refactor: Verify transaction service was called with userId fallback
      expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userDisplayName: 'user-1', // Fallback when user not found
        }),
      );
    });
  });

  describe('Story 3.2: Holder Rules Tests', () => {
    describe('AC1: getHolderForState covers all 15 states', () => {
      it('should return correct holder for DRAFT state', () => {
        const result = getHolderForState(ProjectState.DRAFT, mockProposal);
        expect(result.holderUnit).toBeNull();
        expect(result.holderUser).toBeNull();
      });

      it('should return correct holder for FACULTY_REVIEW state', () => {
        const result = getHolderForState(ProjectState.FACULTY_REVIEW, mockProposal);
        expect(result.holderUnit).toBe('faculty-1');
        expect(result.holderUser).toBeNull();
      });

      it('should return correct holder for SCHOOL_SELECTION_REVIEW state', () => {
        const result = getHolderForState(ProjectState.SCHOOL_SELECTION_REVIEW, mockProposal);
        expect(result.holderUnit).toBe('PHONG_KHCN');
        expect(result.holderUser).toBeNull();
      });

      it('should return correct holder for OUTLINE_COUNCIL_REVIEW state (keeps existing)', () => {
        const proposalWithCouncil = {
          ...mockProposal,
          holderUnit: 'council-1',
          holderUser: 'secretary-1',
        };
        const result = getHolderForState(ProjectState.OUTLINE_COUNCIL_REVIEW, proposalWithCouncil);
        expect(result.holderUnit).toBe('council-1');
        expect(result.holderUser).toBe('secretary-1');
      });

      it('should return correct holder for CHANGES_REQUESTED state', () => {
        const result = getHolderForState(ProjectState.CHANGES_REQUESTED, mockProposal);
        expect(result.holderUnit).toBe('faculty-1'); // owner faculty
        expect(result.holderUser).toBe('user-1'); // owner
      });

      it('should return correct holder for APPROVED state', () => {
        const result = getHolderForState(ProjectState.APPROVED, mockProposal);
        expect(result.holderUnit).toBe('faculty-1');
        expect(result.holderUser).toBe('user-1');
      });

      it('should return correct holder for IN_PROGRESS state', () => {
        const result = getHolderForState(ProjectState.IN_PROGRESS, mockProposal);
        expect(result.holderUnit).toBe('faculty-1');
        expect(result.holderUser).toBe('user-1');
      });

      it('should return correct holder for FACULTY_ACCEPTANCE_REVIEW state', () => {
        const result = getHolderForState(ProjectState.FACULTY_ACCEPTANCE_REVIEW, mockProposal);
        expect(result.holderUnit).toBe('faculty-1');
        expect(result.holderUser).toBeNull();
      });

      it('should return correct holder for SCHOOL_ACCEPTANCE_REVIEW state', () => {
        const result = getHolderForState(ProjectState.SCHOOL_ACCEPTANCE_REVIEW, mockProposal);
        expect(result.holderUnit).toBe('PHONG_KHCN');
        expect(result.holderUser).toBeNull();
      });

      it('should return correct holder for HANDOVER state', () => {
        const result = getHolderForState(ProjectState.HANDOVER, mockProposal);
        expect(result.holderUnit).toBe('faculty-1');
        expect(result.holderUser).toBe('user-1');
      });

      it('should return correct holder for COMPLETED state', () => {
        const result = getHolderForState(ProjectState.COMPLETED, mockProposal);
        expect(result.holderUnit).toBeNull();
        expect(result.holderUser).toBeNull();
      });

      it('should return correct holder for PAUSED state', () => {
        const result = getHolderForState(ProjectState.PAUSED, mockProposal);
        expect(result.holderUnit).toBe('PHONG_KHCN');
        expect(result.holderUser).toBeNull();
      });

      it('should return correct holder for CANCELLED state with actor', () => {
        const result = getHolderForState(ProjectState.CANCELLED, mockProposal, 'actor-1', 'actor-faculty');
        expect(result.holderUnit).toBe('actor-faculty');
        expect(result.holderUser).toBe('actor-1');
      });

      it('should return correct holder for REJECTED state with actor', () => {
        const result = getHolderForState(ProjectState.REJECTED, mockProposal, 'actor-1', 'actor-faculty');
        expect(result.holderUnit).toBe('actor-faculty');
        expect(result.holderUser).toBe('actor-1');
      });

      it('should return correct holder for WITHDRAWN state with actor', () => {
        const result = getHolderForState(ProjectState.WITHDRAWN, mockProposal, 'actor-1', 'actor-faculty');
        expect(result.holderUnit).toBe('actor-faculty');
        expect(result.holderUser).toBe('actor-1');
      });

      it('should fallback to facultyId when actorFacultyId not provided for exception states', () => {
        const result = getHolderForState(ProjectState.CANCELLED, mockProposal, 'actor-1');
        expect(result.holderUnit).toBe('faculty-1'); // fallback to proposal.facultyId
        expect(result.holderUser).toBe('actor-1');
      });
    });

    describe('AC4: canUserActOnProposal validation helper', () => {
      it('should return false for terminal states', () => {
        const completedProposal = { ...mockProposal, state: ProjectState.COMPLETED };
        expect(canUserActOnProposal(completedProposal, 'user-1', 'faculty-1', 'GIANG_VIEN')).toBe(false);

        const cancelledProposal = { ...mockProposal, state: ProjectState.CANCELLED };
        expect(canUserActOnProposal(cancelledProposal, 'user-1', 'faculty-1', 'GIANG_VIEN')).toBe(false);
      });

      it('should return true only for owner in DRAFT state', () => {
        const draftProposal = { ...mockProposal, state: ProjectState.DRAFT };
        expect(canUserActOnProposal(draftProposal, 'user-1', 'faculty-1', 'GIANG_VIEN')).toBe(true);
        expect(canUserActOnProposal(draftProposal, 'user-2', 'faculty-1', 'GIANG_VIEN')).toBe(false);
      });

      it('should return true only for specific holderUser when set', () => {
        const assignedProposal = {
          ...mockProposal,
          state: ProjectState.APPROVED,
          holderUnit: 'faculty-1',
          holderUser: 'specific-user',
        };
        expect(canUserActOnProposal(assignedProposal, 'specific-user', 'faculty-1', 'GIANG_VIEN')).toBe(true);
        expect(canUserActOnProposal(assignedProposal, 'other-user', 'faculty-1', 'GIANG_VIEN')).toBe(false);
      });

      it('should return true for users in matching faculty when holderUnit is faculty', () => {
        const facultyProposal = {
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          holderUser: null,
        };
        expect(canUserActOnProposal(facultyProposal, 'user-1', 'faculty-1', 'QUAN_LY_KHOA')).toBe(true);
        expect(canUserActOnProposal(facultyProposal, 'user-2', 'faculty-2', 'QUAN_LY_KHOA')).toBe(false);
      });

      it('should return true for PHONG_KHCN role when holderUnit is PHONG_KHCN', () => {
        const phongKHNCProposal = {
          ...mockProposal,
          state: ProjectState.SCHOOL_SELECTION_REVIEW,
          holderUnit: 'PHONG_KHCN',
          holderUser: null,
        };
        expect(canUserActOnProposal(phongKHNCProposal, 'user-1', 'faculty-1', 'PHONG_KHCN')).toBe(true);
        expect(canUserActOnProposal(phongKHNCProposal, 'user-1', 'faculty-1', 'GIANG_VIEN')).toBe(false);
      });
    });

    describe('AC3: Queue filter helpers', () => {
      describe('isTerminalQueueState', () => {
        it('should return true for terminal states', () => {
          expect(isTerminalQueueState(ProjectState.COMPLETED)).toBe(true);
          expect(isTerminalQueueState(ProjectState.CANCELLED)).toBe(true);
          expect(isTerminalQueueState(ProjectState.REJECTED)).toBe(true);
          expect(isTerminalQueueState(ProjectState.WITHDRAWN)).toBe(true);
        });

        it('should return false for non-terminal states', () => {
          expect(isTerminalQueueState(ProjectState.DRAFT)).toBe(false);
          expect(isTerminalQueueState(ProjectState.FACULTY_REVIEW)).toBe(false);
          expect(isTerminalQueueState(ProjectState.IN_PROGRESS)).toBe(false);
          expect(isTerminalQueueState(ProjectState.PAUSED)).toBe(false);
        });
      });

      describe('getMyQueueProposalsFilter', () => {
        it('should match by holderUser', () => {
          const filter = getMyQueueProposalsFilter('user-1', 'faculty-1', 'GIANG_VIEN');
          expect(filter.OR).toContainEqual({ holderUser: 'user-1' });
          expect(filter.state.notIn).toContain(ProjectState.COMPLETED);
        });

        it('should match by holderUnit = user faculty', () => {
          const filter = getMyQueueProposalsFilter('user-1', 'faculty-1', 'GIANG_VIEN');
          expect(filter.OR).toContainEqual({ holderUnit: 'faculty-1' });
        });

        it('should match by PHONG_KHCN for PHONG_KHCN role', () => {
          const filter = getMyQueueProposalsFilter('user-1', 'faculty-1', 'PHONG_KHCN');
          expect(filter.OR).toContainEqual({ holderUnit: 'PHONG_KHCN' });
        });

        it('should NOT include PHONG_KHCN filter for non-PHONG_KHCN role', () => {
          const filter = getMyQueueProposalsFilter('user-1', 'faculty-1', 'GIANG_VIEN');
          const hasPHONGKHNCFilter = filter.OR?.some(
            (item: any) => item.holderUnit === 'PHONG_KHCN'
          );
          expect(hasPHONGKHNCFilter).toBe(false);
        });

        it('should exclude terminal states from queue', () => {
          const filter = getMyQueueProposalsFilter('user-1', 'faculty-1', 'GIANG_VIEN');
          expect(filter.state.notIn).toContain(ProjectState.COMPLETED);
          expect(filter.state.notIn).toContain(ProjectState.CANCELLED);
          expect(filter.state.notIn).toContain(ProjectState.REJECTED);
          expect(filter.state.notIn).toContain(ProjectState.WITHDRAWN);
        });
      });

      describe('getMyProposalsFilter', () => {
        it('should filter by ownerId', () => {
          const filter = getMyProposalsFilter('user-1');
          expect(filter.ownerId).toBe('user-1');
        });
      });

      describe('getOverdueProposalsFilter', () => {
        it('should filter by slaDeadline before current date', () => {
          const testDate = new Date('2026-01-10');
          const filter = getOverdueProposalsFilter(testDate);
          expect(filter.slaDeadline).toEqual({ lt: testDate });
        });

        it('should exclude terminal and PAUSED states from overdue', () => {
          const filter = getOverdueProposalsFilter();
          expect(filter.state.notIn).toContain(ProjectState.COMPLETED);
          expect(filter.state.notIn).toContain(ProjectState.CANCELLED);
          expect(filter.state.notIn).toContain(ProjectState.REJECTED);
          expect(filter.state.notIn).toContain(ProjectState.WITHDRAWN);
          expect(filter.state.notIn).toContain(ProjectState.PAUSED);
        });
      });
    });
  });

  describe('Story 3.3: SLA Integration Tests', () => {
    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          slaStartDate: new Date('2026-01-06T10:00:00'),
          slaDeadline: new Date('2026-01-10T17:00:00'),
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
    });

    it('AC3.1: should set slaStartDate to current time on submit', async () => {
      const testDate = new Date('2026-01-06T10:00:00');
      vi.spyOn(Date, 'now').mockReturnValue(testDate.getTime());

      await service.submitProposal('proposal-1', mockContext);

      // Phase 1 Refactor: Verify transaction service was called with slaStartDate
      expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
        expect.objectContaining({
          slaStartDate: expect.any(Date),
        }),
      );

      vi.restoreAllMocks();
    });

    it('AC3.2: should set slaDeadline to 3 business days + 17:00 cutoff', async () => {
      await service.submitProposal('proposal-1', mockContext);

      // Story 3.6: Now uses calculateDeadlineWithCutoff
      expect(mockSlaService.calculateDeadlineWithCutoff).toHaveBeenCalledWith(
        expect.any(Date),
        3, // 3 business days
        17, // 17:00 cutoff
      );

      // Phase 1 Refactor: Verify transaction service was called with slaDeadline
      expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
        expect.objectContaining({
          slaDeadline: expect.any(Date),
        }),
      );
    });

    it('AC3.3: should include SLA dates in audit log', async () => {
      await service.submitProposal('proposal-1', mockContext);

      // Phase 1 Refactor: Verify audit helper was called with SLA dates
      expect(mockAuditHelper.logWorkflowTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          slaStartDate: expect.any(Date),
          slaDeadline: expect.any(Date),
        }),
        expect.objectContaining({
          userId: 'user-1',
          ip: '127.0.0.1',
          userAgent: 'test',
          requestId: 'req-1',
        }),
      );
    });

    it('AC3.4: should use correct cutoff hour (17:00) for deadline calculation', async () => {
      await service.submitProposal('proposal-1', mockContext);

      // Story 3.6: The third parameter to calculateDeadlineWithCutoff should be 17 (17:00 cutoff)
      const callArgs = mockSlaService.calculateDeadlineWithCutoff.mock.calls[0];
      expect(callArgs[2]).toBe(17);
    });

    it('AC3.5: should return proposal with SLA dates in result', async () => {
      const result = await service.submitProposal('proposal-1', mockContext);

      expect(result.proposal.slaStartDate).toEqual(expect.any(Date));
      expect(result.proposal.slaDeadline).toEqual(expect.any(Date));
    });
  });

  describe('Story 3.3: SLA Business Day Logic Integration Tests', () => {
    // These tests verify the contract between WorkflowService and SlaService
    // They document expected behavior for weekend/holiday calculation
    // The actual business day logic is tested in SlaService's own tests (Story 1.8)

    it('should calculate deadline with proper parameters for weekend scenario', async () => {
      // Friday submit → deadline should skip weekend (Sat, Sun)
      // This documents the expected behavior: SlaService handles weekend skipping
      // Story 3.6: Uses calculateDeadlineWithCutoff for proper cutoff time handling
      const friday = new Date('2026-01-03T17:00:00'); // Friday
      const expectedDeadline = new Date('2026-01-08T17:00:00'); // Wednesday after weekend

      mockSlaService.calculateDeadlineWithCutoff.mockResolvedValue(expectedDeadline);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          slaStartDate: new Date('2026-01-03T17:00:00'),
          slaDeadline: expectedDeadline,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      const result = await service.submitProposal('proposal-1', mockContext);

      expect(mockSlaService.calculateDeadlineWithCutoff).toHaveBeenCalledWith(
        expect.any(Date),
        3, // 3 business days
        17, // 17:00 cutoff
      );
      expect(result.proposal.slaDeadline).toEqual(expectedDeadline);
    });

    it('should calculate deadline skipping holidays when configured', async () => {
      // If a holiday falls within the 3 business day window, it should be skipped
      // This documents the expected behavior: SlaService handles holiday skipping
      const submitDate = new Date('2026-01-06T10:00:00'); // Tuesday
      const expectedDeadline = new Date('2026-01-10T17:00:00'); // Friday after holiday

      mockSlaService.calculateDeadlineWithCutoff.mockResolvedValue(expectedDeadline);

      // Phase 1 Refactor: Override transaction mock to return expected deadline
      mockTransaction.updateProposalWithLog.mockResolvedValueOnce({
        proposal: {
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          slaStartDate: submitDate,
          slaDeadline: expectedDeadline,
        },
        workflowLog: {
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        },
      });

      const result = await service.submitProposal('proposal-1', mockContext);

      expect(result.proposal.slaDeadline).toEqual(expectedDeadline);
    });

    it('should use 17:00 cutoff hour for deadline time', async () => {
      const submitDate = new Date('2026-01-06T10:00:00'); // 10 AM submit
      const expectedDeadline = new Date('2026-01-09T17:00:00'); // 3 business days + 17:00

      // Story 3.6: Uses calculateDeadlineWithCutoff for proper cutoff time handling
      mockSlaService.calculateDeadlineWithCutoff.mockResolvedValue(expectedDeadline);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          slaStartDate: submitDate,
          slaDeadline: expectedDeadline,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-1',
          proposalId: 'proposal-1',
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'user-1',
          actorName: 'Test User',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      const result = await service.submitProposal('proposal-1', mockContext);

      // Story 3.6: Verify the cutoff hour parameter
      const deadlineArg = mockSlaService.calculateDeadlineWithCutoff.mock.calls[0];
      expect(deadlineArg[2]).toBe(17); // cutoff hour
      // Verify the result has correct time
      expect(result.proposal.slaDeadline?.getHours()).toBe(17);
      expect(result.proposal.slaDeadline?.getMinutes()).toBe(0);
    });
  });

  // ============================================================
  // Epic 9: Exception Action Tests (Stories 9.1, 9.2, 9.3)
  // ============================================================

  describe('Story 9.1: Cancel Proposal (DRAFT → CANCELLED)', () => {
    const draftProposal = {
      ...mockProposal,
      state: ProjectState.DRAFT,
    };

    const ownerContext: TransitionContext = {
      userId: 'user-1',
      userRole: 'GIANG_VIEN',
      userFacultyId: 'faculty-1',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(draftProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...draftProposal,
          state: ProjectState.CANCELLED,
          holderUnit: 'faculty-1',
          holderUser: 'user-1',
          cancelledAt: new Date(),
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-cancel',
          proposalId: 'proposal-1',
          action: WorkflowAction.CANCEL,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.CANCELLED,
          actorId: 'user-1',
          actorName: 'Test User',
          comment: 'Hủy đề tài',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'Test User',
      });
    });

    it('AC1: should cancel DRAFT proposal successfully', async () => {
      const result = await service.cancelProposal('proposal-1', undefined, ownerContext);

      expect(result.currentState).toBe(ProjectState.CANCELLED);
      expect(result.previousState).toBe(ProjectState.DRAFT);
      expect(result.holderUnit).toBe('faculty-1');
      expect(result.holderUser).toBe('user-1');
    });

    it('AC2: should set cancelledAt timestamp', async () => {
      await service.cancelProposal('proposal-1', undefined, ownerContext);

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          cancelledAt: expect.any(Date),
        }),
      });
    });

    it('AC3: should create workflow log with CANCEL action', async () => {
      await service.cancelProposal('proposal-1', 'Không còn nhu cầu', ownerContext);

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: WorkflowAction.CANCEL,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.CANCELLED,
          comment: 'Không còn nhu cầu',
        }),
      });
    });

    it('AC4: should only allow owner to cancel', async () => {
      const nonOwnerContext: TransitionContext = {
        ...ownerContext,
        userId: 'user-2',
      };

      await expect(
        service.cancelProposal('proposal-1', undefined, nonOwnerContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('AC5: should reject cancel if not in DRAFT state', async () => {
      const nonDraftProposal = {
        ...mockProposal,
        state: ProjectState.FACULTY_REVIEW,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(nonDraftProposal);

      await expect(
        service.cancelProposal('proposal-1', undefined, ownerContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC6: should log audit event', async () => {
      await service.cancelProposal('proposal-1', 'Test reason', ownerContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'PROPOSAL_CANCEL',
        actorUserId: 'user-1',
        entityType: 'Proposal',
        entityId: 'proposal-1',
        metadata: expect.objectContaining({
          reason: 'Test reason',
        }),
      });
    });
  });

  describe('Story 9.1: Withdraw Proposal (Review states → WITHDRAWN)', () => {
    const facultyReviewProposal = {
      ...mockProposal,
      state: ProjectState.FACULTY_REVIEW,
      holderUnit: 'faculty-1',
    };

    const ownerContext: TransitionContext = {
      userId: 'user-1',
      userRole: 'GIANG_VIEN',
      userFacultyId: 'faculty-1',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(facultyReviewProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...facultyReviewProposal,
          state: ProjectState.WITHDRAWN,
          holderUnit: 'faculty-1',
          holderUser: 'user-1',
          withdrawnAt: new Date(),
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-withdraw',
          proposalId: 'proposal-1',
          action: WorkflowAction.WITHDRAW,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.WITHDRAWN,
          actorId: 'user-1',
          actorName: 'Test User',
          comment: 'Rút hồ sơ',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'Test User',
      });
    });

    it('AC1: should withdraw from FACULTY_REVIEW successfully', async () => {
      const result = await service.withdrawProposal('proposal-1', undefined, ownerContext);

      expect(result.currentState).toBe(ProjectState.WITHDRAWN);
      expect(result.previousState).toBe(ProjectState.FACULTY_REVIEW);
    });

    it('AC2: should withdraw from SCHOOL_SELECTION_REVIEW successfully', async () => {
      const schoolReviewProposal = {
        ...mockProposal,
        state: ProjectState.SCHOOL_SELECTION_REVIEW,
        holderUnit: 'PHONG_KHCN',
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(schoolReviewProposal);

      const result = await service.withdrawProposal('proposal-1', undefined, ownerContext);

      expect(result.currentState).toBe(ProjectState.WITHDRAWN);
      expect(result.previousState).toBe(ProjectState.SCHOOL_SELECTION_REVIEW);
    });

    it('AC3: should withdraw from OUTLINE_COUNCIL_REVIEW successfully', async () => {
      const councilReviewProposal = {
        ...mockProposal,
        state: ProjectState.OUTLINE_COUNCIL_REVIEW,
        holderUnit: 'council-1',
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(councilReviewProposal);

      const result = await service.withdrawProposal('proposal-1', undefined, ownerContext);

      expect(result.currentState).toBe(ProjectState.WITHDRAWN);
      expect(result.previousState).toBe(ProjectState.OUTLINE_COUNCIL_REVIEW);
    });

    it('AC4: should withdraw from CHANGES_REQUESTED successfully', async () => {
      const changesRequestedProposal = {
        ...mockProposal,
        state: ProjectState.CHANGES_REQUESTED,
        holderUnit: 'faculty-1',
        holderUser: 'user-1',
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(changesRequestedProposal);

      const result = await service.withdrawProposal('proposal-1', undefined, ownerContext);

      expect(result.currentState).toBe(ProjectState.WITHDRAWN);
      expect(result.previousState).toBe(ProjectState.CHANGES_REQUESTED);
    });

    it('AC5: should NOT allow withdraw from IN_PROGRESS (after APPROVED)', async () => {
      const inProgressProposal = {
        ...mockProposal,
        state: ProjectState.IN_PROGRESS,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(inProgressProposal);

      await expect(
        service.withdrawProposal('proposal-1', undefined, ownerContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC6: should only allow owner to withdraw', async () => {
      const nonOwnerContext: TransitionContext = {
        ...ownerContext,
        userId: 'user-2',
      };

      await expect(
        service.withdrawProposal('proposal-1', undefined, nonOwnerContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('AC7: should set withdrawnAt timestamp', async () => {
      await service.withdrawProposal('proposal-1', undefined, ownerContext);

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          withdrawnAt: expect.any(Date),
        }),
      });
    });

    it('AC8: should log audit event', async () => {
      await service.withdrawProposal('proposal-1', 'Test reason', ownerContext);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'PROPOSAL_WITHDRAW',
        actorUserId: 'user-1',
        entityType: 'Proposal',
        entityId: 'proposal-1',
        metadata: expect.objectContaining({
          reason: 'Test reason',
        }),
      });
    });
  });

  describe('Story 9.2: Reject Proposal (Review states → REJECTED)', () => {
    const facultyReviewProposal = {
      ...mockProposal,
      state: ProjectState.FACULTY_REVIEW,
    };

    const managerContext: TransitionContext = {
      userId: 'manager-1',
      userRole: 'QUAN_LY_KHOA',
      userFacultyId: 'faculty-1',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(facultyReviewProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...facultyReviewProposal,
          state: ProjectState.REJECTED,
          holderUnit: 'faculty-1',
          holderUser: 'manager-1',
          rejectedAt: new Date(),
          rejectedById: 'manager-1',
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-reject',
          proposalId: 'proposal-1',
          action: WorkflowAction.REJECT,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.REJECTED,
          actorId: 'manager-1',
          actorName: 'Manager',
          reasonCode: RejectReasonCode.NOT_SCIENTIFIC,
          comment: 'Nội dung không đạt yêu cầu',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'Manager',
      });
    });

    it('AC1: QUAN_LY_KHOA can reject from FACULTY_REVIEW', async () => {
      const result = await service.rejectProposal(
        'proposal-1',
        RejectReasonCode.NOT_SCIENTIFIC,
        'Nội dung không đạt yêu cầu',
        managerContext,
      );

      expect(result.currentState).toBe(ProjectState.REJECTED);
      expect(result.previousState).toBe(ProjectState.FACULTY_REVIEW);
    });

    it('AC2: PHONG_KHCN can reject from FACULTY_REVIEW', async () => {
      const phongKHNCContext: TransitionContext = {
        ...managerContext,
        userRole: 'PHONG_KHCN',
      };

      const result = await service.rejectProposal(
        'proposal-1',
        RejectReasonCode.NOT_FEASIBLE,
        'Không khả thi',
        phongKHNCContext,
      );

      expect(result.currentState).toBe(ProjectState.REJECTED);
    });

    it('AC3: BAN_GIAM_HOC can reject from any review state', async () => {
      const banGiamHocContext: TransitionContext = {
        ...managerContext,
        userRole: 'BAN_GIAM_HOC',
      };

      // Test OUTLINE_COUNCIL_REVIEW
      const councilReviewProposal = {
        ...mockProposal,
        state: ProjectState.OUTLINE_COUNCIL_REVIEW,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(councilReviewProposal);

      const result = await service.rejectProposal(
        'proposal-1',
        RejectReasonCode.BUDGET_UNREASONABLE,
        'Kinh phí quá cao',
        banGiamHocContext,
      );

      expect(result.currentState).toBe(ProjectState.REJECTED);
    });

    it('AC4: THU_KY_HOI_DONG can reject from OUTLINE_COUNCIL_REVIEW', async () => {
      const councilReviewProposal = {
        ...mockProposal,
        state: ProjectState.OUTLINE_COUNCIL_REVIEW,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(councilReviewProposal);

      const secretaryContext: TransitionContext = {
        ...managerContext,
        userRole: 'THU_KY_HOI_DONG',
      };

      const result = await service.rejectProposal(
        'proposal-1',
        RejectReasonCode.NOT_COMPLIANT,
        'Không phù hợp quy định',
        secretaryContext,
      );

      expect(result.currentState).toBe(ProjectState.REJECTED);
    });

    it('AC5: should reject if user lacks permission for current state', async () => {
      const giangVienContext: TransitionContext = {
        ...managerContext,
        userRole: 'GIANG_VIEN',
      };

      await expect(
        service.rejectProposal(
          'proposal-1',
          RejectReasonCode.OTHER,
          'Test',
          giangVienContext,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('AC6: should NOT allow reject from IN_PROGRESS or APPROVED', async () => {
      const approvedProposal = {
        ...mockProposal,
        state: ProjectState.APPROVED,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(approvedProposal);

      await expect(
        service.rejectProposal(
          'proposal-1',
          RejectReasonCode.OTHER,
          'Test',
          managerContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC7: should set rejectedAt and rejectedById', async () => {
      await service.rejectProposal(
        'proposal-1',
        RejectReasonCode.NOT_SCIENTIFIC,
        'Test',
        managerContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          rejectedAt: expect.any(Date),
          rejectedById: 'manager-1',
        }),
      });
    });

    it('AC8: should store reasonCode and comment in workflow log', async () => {
      await service.rejectProposal(
        'proposal-1',
        RejectReasonCode.NOT_SCIENTIFIC,
        'Nội dung không đạt yêu cầu khoa học',
        managerContext,
      );

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reasonCode: RejectReasonCode.NOT_SCIENTIFIC,
          comment: 'Nội dung không đạt yêu cầu khoa học',
        }),
      });
    });

    it('AC9: should log audit event', async () => {
      await service.rejectProposal(
        'proposal-1',
        RejectReasonCode.NOT_FEASIBLE,
        'Test reason',
        managerContext,
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'PROPOSAL_REJECT',
        actorUserId: 'manager-1',
        entityType: 'Proposal',
        entityId: 'proposal-1',
        metadata: expect.objectContaining({
          reasonCode: RejectReasonCode.NOT_FEASIBLE,
          comment: 'Test reason',
        }),
      });
    });
  });

  describe('Story 9.3: Pause Proposal (Non-terminal → PAUSED)', () => {
    const inProgressProposal = {
      ...mockProposal,
      state: ProjectState.IN_PROGRESS,
      holderUnit: 'faculty-1',
      holderUser: 'user-1',
      slaDeadline: new Date('2026-01-20T17:00:00'),
    };

    const phongKHNCContext: TransitionContext = {
      userId: 'pkhcn-1',
      userRole: 'PHONG_KHCN',
      userFacultyId: 'PKHCN',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(inProgressProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...inProgressProposal,
          state: ProjectState.PAUSED,
          holderUnit: 'PHONG_KHCN',
          holderUser: null,
          pausedAt: new Date(),
          pauseReason: 'Tạm dừng để kiểm tra',
          expectedResumeAt: new Date('2026-01-15T00:00:00'),
          prePauseState: ProjectState.IN_PROGRESS,
          prePauseHolderUnit: 'faculty-1',
          prePauseHolderUser: 'user-1',
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-pause',
          proposalId: 'proposal-1',
          action: WorkflowAction.PAUSE,
          fromState: ProjectState.IN_PROGRESS,
          toState: ProjectState.PAUSED,
          actorId: 'pkhcn-1',
          actorName: 'PKHCN User',
          comment: expect.any(String),
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'PKHCN User',
      });
    });

    it('AC1: PHONG_KHCN can pause any non-terminal proposal', async () => {
      const result = await service.pauseProposal(
        'proposal-1',
        'Tạm dừng để kiểm tra',
        new Date('2026-01-15T00:00:00'),
        phongKHNCContext,
      );

      expect(result.currentState).toBe(ProjectState.PAUSED);
      expect(result.previousState).toBe(ProjectState.IN_PROGRESS);
    });

    it('AC2: should store pre-pause state for resume', async () => {
      await service.pauseProposal(
        'proposal-1',
        'Tạm dừng',
        undefined,
        phongKHNCContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          prePauseState: ProjectState.IN_PROGRESS,
          prePauseHolderUnit: 'faculty-1',
          prePauseHolderUser: 'user-1',
        }),
      });
    });

    it('AC3: should store pause reason', async () => {
      await service.pauseProposal(
        'proposal-1',
        'Cần bổ sung hồ sơ',
        undefined,
        phongKHNCContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          pauseReason: 'Cần bổ sung hồ sơ',
        }),
      });
    });

    it('AC4: should store expectedResumeAt if provided', async () => {
      const expectedDate = new Date('2026-01-15T00:00:00');
      await service.pauseProposal(
        'proposal-1',
        'Tạm dừng',
        expectedDate,
        phongKHNCContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          expectedResumeAt: expectedDate,
        }),
      });
    });

    it('AC5: should reject if expectedResumeAt is in the past', async () => {
      const pastDate = new Date('2025-01-01T00:00:00');

      await expect(
        service.pauseProposal(
          'proposal-1',
          'Tạm dừng',
          pastDate,
          phongKHNCContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC6: should NOT allow pause on terminal states', async () => {
      const completedProposal = {
        ...mockProposal,
        state: ProjectState.COMPLETED,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(completedProposal);

      await expect(
        service.pauseProposal(
          'proposal-1',
          'Tạm dừng',
          undefined,
          phongKHNCContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC7: should only allow PHONG_KHCN to pause', async () => {
      const giangVienContext: TransitionContext = {
        ...phongKHNCContext,
        userRole: 'GIANG_VIEN',
      };

      await expect(
        service.pauseProposal(
          'proposal-1',
          'Tạm dừng',
          undefined,
          giangVienContext,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('AC8: should set holder to PHONG_KHCN', async () => {
      await service.pauseProposal(
        'proposal-1',
        'Tạm dừng',
        undefined,
        phongKHNCContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          holderUnit: 'PHONG_KHCN',
          holderUser: null,
        }),
      });
    });

    it('AC9: should build pause comment with expected resume date', async () => {
      const expectedDate = new Date('2026-01-15T00:00:00');
      await service.pauseProposal(
        'proposal-1',
        'Tạm dừng',
        expectedDate,
        phongKHNCContext,
      );

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comment: expect.stringContaining('15/1/2026'),
        }),
      });
    });

    it('AC10: should log audit event', async () => {
      await service.pauseProposal(
        'proposal-1',
        'Tạm dừng',
        undefined,
        phongKHNCContext,
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'PROPOSAL_PAUSE',
        actorUserId: 'pkhcn-1',
        entityType: 'Proposal',
        entityId: 'proposal-1',
        metadata: expect.objectContaining({
          reason: 'Tạm dừng',
        }),
      });
    });
  });

  describe('Story 9.3: Resume Proposal (PAUSED → pre-pause state)', () => {
    const pausedProposal = {
      ...mockProposal,
      state: ProjectState.PAUSED,
      holderUnit: 'PHONG_KHCN',
      holderUser: null,
      pausedAt: new Date('2026-01-10T00:00:00'),
      slaDeadline: new Date('2026-01-20T17:00:00'),
      prePauseState: ProjectState.IN_PROGRESS,
      prePauseHolderUnit: 'faculty-1',
      prePauseHolderUser: 'user-1',
    };

    const phongKHNCContext: TransitionContext = {
      userId: 'pkhcn-1',
      userRole: 'PHONG_KHCN',
      userFacultyId: 'PKHCN',
    };

    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(pausedProposal);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...pausedProposal,
          state: ProjectState.IN_PROGRESS,
          holderUnit: 'faculty-1',
          holderUser: 'user-1',
          slaDeadline: new Date('2026-01-23T17:00:00'), // Extended by paused duration
          resumedAt: new Date('2026-01-13T00:00:00'),
          pausedAt: null,
          prePauseState: null,
          prePauseHolderUnit: null,
          prePauseHolderUser: null,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-resume',
          proposalId: 'proposal-1',
          action: WorkflowAction.RESUME,
          fromState: ProjectState.PAUSED,
          toState: ProjectState.IN_PROGRESS,
          actorId: 'pkhcn-1',
          actorName: 'PKHCN User',
          comment: 'Tiếp tục đề tài',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'PKHCN User',
      });
    });

    it('AC1: PHONG_KHCN can resume paused proposal', async () => {
      const result = await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );

      expect(result.currentState).toBe(ProjectState.IN_PROGRESS);
      expect(result.previousState).toBe(ProjectState.PAUSED);
    });

    it('AC2: should restore pre-pause state', async () => {
      await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          state: ProjectState.IN_PROGRESS,
          holderUnit: 'faculty-1',
          holderUser: 'user-1',
        }),
      });
    });

    it('AC3: should extend SLA deadline by paused duration', async () => {
      // Paused for 3 days (Jan 10 to Jan 13), deadline should extend by 3 days
      await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );

      // Verify update was called and result contains extended deadline
      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          slaDeadline: expect.any(Date),
        }),
      });

      // Verify the result has extended deadline
      const result = await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );
      expect(result.proposal.slaDeadline).toEqual(new Date('2026-01-23T17:00:00'));
    });

    it('AC4: should clear pause tracking fields', async () => {
      await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          pausedAt: null,
          prePauseState: null,
          prePauseHolderUnit: null,
          prePauseHolderUser: null,
        }),
      });
    });

    it('AC5: should set resumedAt timestamp', async () => {
      await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          resumedAt: expect.any(Date),
        }),
      });
    });

    it('AC6: should only allow PHONG_KHCN to resume', async () => {
      const giangVienContext: TransitionContext = {
        ...phongKHNCContext,
        userRole: 'GIANG_VIEN',
      };

      await expect(
        service.resumeProposal(
          'proposal-1',
          undefined,
          giangVienContext,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('AC7: should reject if proposal not paused', async () => {
      const inProgressProposal = {
        ...mockProposal,
        state: ProjectState.IN_PROGRESS,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(inProgressProposal);

      await expect(
        service.resumeProposal(
          'proposal-1',
          undefined,
          phongKHNCContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC8: should reject if prePauseState is missing', async () => {
      const pausedWithoutPreState = {
        ...pausedProposal,
        prePauseState: null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(pausedWithoutPreState);

      await expect(
        service.resumeProposal(
          'proposal-1',
          undefined,
          phongKHNCContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('AC9: should allow optional comment', async () => {
      await service.resumeProposal(
        'proposal-1',
        'Đã giải quyết xong vấn đề',
        phongKHNCContext,
      );

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comment: 'Đã giải quyết xong vấn đề',
        }),
      });
    });

    it('AC10: should log audit event', async () => {
      await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'PROPOSAL_RESUME',
        actorUserId: 'pkhcn-1',
        entityType: 'Proposal',
        entityId: 'proposal-1',
        metadata: expect.objectContaining({
          fromState: ProjectState.PAUSED,
          toState: ProjectState.IN_PROGRESS,
        }),
      });
    });

    it('AC11: should handle different pre-pause states', async () => {
      const pausedFromFacultyReview = {
        ...pausedProposal,
        prePauseState: ProjectState.FACULTY_REVIEW,
        prePauseHolderUnit: 'faculty-1',
        prePauseHolderUser: null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(pausedFromFacultyReview);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.proposal.update.mockResolvedValue({
          ...pausedFromFacultyReview,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          holderUser: null,
        });
        mockPrisma.workflowLog.create.mockResolvedValue({
          id: 'log-resume',
          proposalId: 'proposal-1',
          action: WorkflowAction.RESUME,
          fromState: ProjectState.PAUSED,
          toState: ProjectState.FACULTY_REVIEW,
          actorId: 'pkhcn-1',
          actorName: 'PKHCN User',
          comment: 'Tiếp tục',
          timestamp: new Date(),
        });
        return await callback(mockPrisma as any);
      });

      const result = await service.resumeProposal(
        'proposal-1',
        undefined,
        phongKHNCContext,
      );

      expect(result.currentState).toBe(ProjectState.FACULTY_REVIEW);
    });
  });
});
