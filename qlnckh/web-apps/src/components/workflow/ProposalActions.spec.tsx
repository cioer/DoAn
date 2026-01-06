/**
 * Proposal Actions Component Tests (Story 4.1)
 *
 * Tests for:
 * - AC1: UI Button Display - RBAC Gated (QUAN_LY_KHOA, THU_KY_KHOA)
 * - AC2: UI Button Hidden - Wrong Role/State
 * - AC3: Approve Action - State Transition
 * - AC5: Idempotency Key (anti-double-submit)
 * - AC6: Error Handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { ProposalActions } from './ProposalActions';
import { workflowApi } from '@/lib/api/workflow';

// Mock the workflow API
vi.mock('@/lib/api/workflow', () => ({
  workflowApi: {
    approveFacultyReview: vi.fn(),
  },
  generateIdempotencyKey: vi.fn(() => 'mocked-uuid-key'),
}));

describe('ProposalActions Component (Story 4.1)', () => {
  const mockProposalId = 'test-proposal-id';
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1 & AC2: RBAC - Button visibility', () => {
    it('should show "Duyệt hồ sơ" button for QUAN_LY_KHOA role when state = FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Duyệt hồ sơ đề tài');
    });

    it('should show "Duyệt hồ sơ" button for THU_KY_KHOA role when state = FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'THU_KY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).toBeInTheDocument();
    });

    it('should NOT show button for GIANG_VIEN role', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'GIANG_VIEN' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should NOT show button for PHONG_KHCN role', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'PHONG_KHCN' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should NOT show button when proposal state != FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="DRAFT"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should NOT show button when proposal state = SCHOOL_SELECTION_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="SCHOOL_SELECTION_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('AC3 & AC5: Approve action execution', () => {
    it('should show confirmation dialog when button clicked', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /duyệt hồ sơ/i });
      fireEvent.click(button);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Xác nhận duyệt hồ sơ')).toBeInTheDocument();
      expect(
        screen.getByText(/chuyển lên Phòng KHCN để phân bổ/i),
      ).toBeInTheDocument();
    });

    it('should call approve API with idempotency key when confirmed', async () => {
      const mockResult = {
        proposalId: mockProposalId,
        previousState: 'FACULTY_REVIEW',
        currentState: 'SCHOOL_SELECTION_REVIEW',
        action: 'APPROVE',
        holderUnit: 'PHONG_KHCN',
        holderUser: null,
        workflowLogId: 'log-id',
      };

      vi.mocked(workflowApi.approveFacultyReview).mockResolvedValue(mockResult);

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      // Click approve button
      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: 'Xác nhận duyệt' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(workflowApi.approveFacultyReview).toHaveBeenCalledWith(
          mockProposalId,
          'mocked-uuid-key',
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should close dialog and call onSuccess after successful approve', async () => {
      const mockResult = {
        proposalId: mockProposalId,
        previousState: 'FACULTY_REVIEW',
        currentState: 'SCHOOL_SELECTION_REVIEW',
        action: 'APPROVE',
        holderUnit: 'PHONG_KHCN',
        holderUser: null,
        workflowLogId: 'log-id',
      };

      vi.mocked(workflowApi.approveFacultyReview).mockResolvedValue(mockResult);

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should close dialog when cancel button clicked', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(workflowApi.approveFacultyReview).not.toHaveBeenCalled();
    });

    it('should show loading state during API call', async () => {
      vi.mocked(workflowApi.approveFacultyReview).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

      await waitFor(() => {
        expect(screen.getByText(/đang xử lý/i)).toBeInTheDocument();
      });
    });
  });

  describe('AC6: Error handling', () => {
    it('should display error message when API returns error', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'PROPOSAL_NOT_FACULTY_REVIEW',
              message: 'Chỉ có thể duyệt đề tài ở trạng thái FACULTY_REVIEW',
            },
          },
        },
      };

      vi.mocked(workflowApi.approveFacultyReview).mockRejectedValue(mockError);

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionError={mockOnError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

      await waitFor(() => {
        expect(screen.getByText('Lỗi')).toBeInTheDocument();
        expect(
          screen.getByText('Chỉ có thể duyệt đề tài ở trạng thái FACULTY_REVIEW'),
        ).toBeInTheDocument();
      });
    });

    it('should call onError callback when API fails', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Bạn không có quyền duyệt',
            },
          },
        },
      };

      vi.mocked(workflowApi.approveFacultyReview).mockRejectedValue(mockError);

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionError={mockOnError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith({
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền duyệt',
        });
      });
    });

    it('should show generic error for unknown errors', async () => {
      vi.mocked(workflowApi.approveFacultyReview).mockRejectedValue({});

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionError={mockOnError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

      await waitFor(() => {
        expect(screen.getByText('Lỗi')).toBeInTheDocument();
        expect(screen.getByText('Lỗi không xác định')).toBeInTheDocument();
      });
    });
  });

  describe('Idempotency key generation (AC5)', () => {
    it('should generate UUID v4 idempotency key', async () => {
      const { generateIdempotencyKey } = await import('@/lib/api/workflow');

      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();

      // Verify UUID v4 format
      expect(key1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // Verify uniqueness
      expect(key1).not.toBe(key2);
    });
  });
});
