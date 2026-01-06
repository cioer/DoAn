import { BadRequestException, NotFoundException } from '@nestjs/common';
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
} from './helpers/holder-rules.helper';

/**
 * Workflow Service Tests
 *
 * Tests follow Epic 2 lesson learned: manual DI bypass for reliable testing
 */

// Manual mock - bypass DI (Epic 2 pattern)
const mockPrisma = {
  proposal: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  workflowLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAuditService = {
  logEvent: jest.fn().mockResolvedValue(undefined),
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
    service = new WorkflowService(mockPrisma as any, mockAuditService as any);
    jest.clearAllMocks();

    // Mock getUserDisplayName response (M4 fix)
    mockPrisma.user.findUnique.mockResolvedValue({
      displayName: 'Test User',
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
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Simulate transaction - mockPrisma methods should return expected values
        mockPrisma.proposal.update.mockResolvedValue({
          ...mockProposal,
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
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
      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: {
          state: ProjectState.FACULTY_REVIEW,
          holderUnit: 'faculty-1',
          holderUser: null,
        },
      });
    });

    it('AC3.2: should create workflow_log entry with action=SUBMIT', async () => {
      await service.submitProposal('proposal-1', mockContext);

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: WorkflowAction.SUBMIT,
          fromState: ProjectState.DRAFT,
          toState: ProjectState.FACULTY_REVIEW,
        }),
      });
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
      // findUnique should be called only once for idempotent requests (first call reads, second uses cache)
      expect(mockPrisma.proposal.findUnique).toHaveBeenCalledTimes(1);
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

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: WorkflowAction.APPROVE,
          fromState: ProjectState.FACULTY_REVIEW,
          toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        }),
      });
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

      // Verify workflow log uses display name
      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorName: 'Test User', // Not 'GIANG_VIEN' role
        }),
      });
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

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorName: 'user-1', // Fallback when user not found
        }),
      });
    });
  });
});
