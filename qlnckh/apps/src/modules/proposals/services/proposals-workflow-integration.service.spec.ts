import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectState, WorkflowAction } from '@prisma/client';
import { ProposalsWorkflowService } from './proposals-workflow-integration.service';

/**
 * ProposalsWorkflowService Tests
 *
 * Bug fix verification: completeHandover should transition to COMPLETED state
 * NOT call acceptSchoolReview (which transitions to HANDOVER).
 */

// Manual mocks (Epic 2 pattern)
const mockPrisma = {
  proposal: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockWorkflowService = {
  submitProposal: vi.fn(),
  approveFacultyReview: vi.fn(),
  approveCouncilReview: vi.fn(),
  acceptSchoolReview: vi.fn(),
  transitionState: vi.fn(),
};

describe('ProposalsWorkflowService', () => {
  let service: ProposalsWorkflowService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create service with mocked dependencies
    service = new ProposalsWorkflowService(
      mockPrisma as any,
      mockWorkflowService as any,
    );
  });

  describe('completeHandover', () => {
    const proposalId = 'test-proposal-001';
    const context = {
      userId: 'user-001',
      userRole: 'GIANG_VIEN' as const,
      idempotencyKey: 'test-key-001',
    };

    it('should call transitionState with COMPLETED and HANDOVER_COMPLETE', async () => {
      // Arrange
      const expectedResult = {
        success: true,
        proposalId,
        previousState: ProjectState.HANDOVER,
        currentState: ProjectState.COMPLETED,
      };
      mockWorkflowService.transitionState.mockResolvedValue(expectedResult);

      // Act
      const result = await service.completeHandover(proposalId, context);

      // Assert - Bug fix verification
      expect(mockWorkflowService.transitionState).toHaveBeenCalledWith(
        proposalId,
        ProjectState.COMPLETED,
        WorkflowAction.HANDOVER_COMPLETE,
        context,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should NOT call acceptSchoolReview', async () => {
      // Arrange
      mockWorkflowService.transitionState.mockResolvedValue({ success: true });

      // Act
      await service.completeHandover(proposalId, context);

      // Assert - Bug fix verification
      expect(mockWorkflowService.acceptSchoolReview).not.toHaveBeenCalled();
    });

    it('should transition from HANDOVER to COMPLETED (not APPROVED)', async () => {
      // Arrange
      mockWorkflowService.transitionState.mockResolvedValue({
        success: true,
        previousState: ProjectState.HANDOVER,
        currentState: ProjectState.COMPLETED,
      });

      // Act
      const result = await service.completeHandover(proposalId, context);

      // Assert - State machine correctness
      expect(result.currentState).toBe(ProjectState.COMPLETED);
      expect(result.currentState).not.toBe(ProjectState.APPROVED);
    });
  });

  describe('workflow transitions', () => {
    const proposalId = 'test-proposal-002';
    const context = {
      userId: 'user-002',
      userRole: 'GIANG_VIEN' as const,
    };

    it('submitToWorkflow should call workflow.submitProposal', async () => {
      mockWorkflowService.submitProposal.mockResolvedValue({ success: true });

      await service.submitToWorkflow(proposalId, context);

      expect(mockWorkflowService.submitProposal).toHaveBeenCalledWith(
        proposalId,
        context,
      );
    });

    it('facultyAcceptance should merge formData and call approveFacultyReview', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        formData: { existingField: 'value' },
      });
      mockPrisma.proposal.update.mockResolvedValue({ id: proposalId });
      mockWorkflowService.approveFacultyReview.mockResolvedValue({ success: true });

      const acceptanceData = { evaluation: 'passed' };
      await service.facultyAcceptance(proposalId, acceptanceData, context);

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: proposalId },
        data: {
          formData: {
            existingField: 'value',
            facultyAcceptance: acceptanceData,
          },
        },
      });
      expect(mockWorkflowService.approveFacultyReview).toHaveBeenCalled();
    });
  });
});
