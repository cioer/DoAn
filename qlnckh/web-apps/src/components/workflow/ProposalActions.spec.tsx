/**
 * Proposal Actions Component Tests (Story 4.1 + Story 4.2)
 *
 * Story 4.1 Tests:
 * - AC1: UI Button Display - RBAC Gated (QUAN_LY_KHOA, THU_KY_KHOA)
 * - AC2: UI Button Hidden - Wrong Role/State
 * - AC3: Approve Action - State Transition
 * - AC5: Idempotency Key (anti-double-submit)
 * - AC6: Error Handling
 *
 * Story 4.2 Tests:
 * - AC1: "Yêu cầu sửa" button for QUAN_LY_KHOA/THU_KY_KHOA at FACULTY_REVIEW
 * - AC2: Button hidden for wrong role/state
 * - AC3: Return Dialog with reason code dropdown and section checkboxes
 * - AC4: Return Dialog validation (reasonCode required, sections min 1)
 * - AC5: Idempotency Key handling
 * - AC6: Error handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { ProposalActions } from './ProposalActions';
import { workflowApi } from '@/lib/api/workflow';

// Mock the workflow API
vi.mock('@/lib/api/workflow', () => ({
  workflowApi: {
    approveFacultyReview: vi.fn(),
    returnFacultyReview: vi.fn(),
  },
  generateIdempotencyKey: vi.fn(() => 'mocked-uuid-key'),
  RETURN_REASON_LABELS: {
    THIEU_TAI_LIEU: 'Thiếu tài liệu',
    NOI_DUNG_KHONG_RO_RANG: 'Nội dung không rõ ràng',
    PHUONG_PHAP_KHONG_KHA_THI: 'Phương pháp không khả thi',
    KINH_PHI_KHONG_HOP_LE: 'Kinh phí không hợp lý',
    KHAC: 'Khác',
  },
  CANONICAL_SECTIONS: [
    { id: 'SEC_INFO_GENERAL', label: 'Thông tin chung' },
    { id: 'SEC_CONTENT_METHOD', label: 'Nội dung nghiên cứu' },
    { id: 'SEC_METHOD', label: 'Phương pháp nghiên cứu' },
    { id: 'SEC_EXPECTED_RESULTS', label: 'Kết quả mong đợi' },
    { id: 'SEC_BUDGET', label: 'Kinh phí' },
    { id: 'SEC_ATTACHMENTS', label: 'Tài liệu đính kèm' },
  ],
}));

describe('ProposalActions Component (Story 4.1 + Story 4.2)', () => {
  const mockProposalId = 'test-proposal-id';
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Story 4.1: AC1 & AC2 - Approve Button RBAC', () => {
    it('should show "Duyệt hồ sơ" button for QUAN_LY_KHOA role when state = FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).toBeDefined();
      expect(button).toHaveAttribute('aria-label', 'Duyệt hồ sơ đề tài');
    });

    it('should show "Duyệt hồ sơ" button for THU_KY_KHOA role when state = FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'THU_KY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).toBeDefined();
    });

    it('should NOT show approve button for GIANG_VIEN role', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'GIANG_VIEN' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).toBeNull();
    });

    it('should NOT show approve button when proposal state != FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="DRAFT"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /duyệt hồ sơ/i });
      expect(button).toBeNull();
    });
  });

  describe('Story 4.2: AC1 & AC2 - Return Button RBAC', () => {
    it('should show "Yêu cầu sửa" button for QUAN_LY_KHOA role when state = FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /yêu cầu sửa/i });
      expect(button).toBeDefined();
      expect(button).toHaveAttribute('aria-label', 'Yêu cầu sửa hồ sơ');
    });

    it('should show "Yêu cầu sửa" button for THU_KY_KHOA role when state = FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'THU_KY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /yêu cầu sửa/i });
      expect(button).toBeDefined();
    });

    it('should NOT show return button for GIANG_VIEN role', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'GIANG_VIEN' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /yêu cầu sửa/i });
      expect(button).toBeNull();
    });

    it('should NOT show return button when proposal state != FACULTY_REVIEW', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="DRAFT"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.queryByRole('button', { name: /yêu cầu sửa/i });
      expect(button).toBeNull();
    });
  });

  describe('Story 4.2: AC3 & AC4 - Return Dialog', () => {
    it('should open return dialog when "Yêu cầu sửa" button clicked', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Yêu cầu sửa hồ sơ')).toBeDefined();
    });

    it('should display reason code dropdown in return dialog', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      expect(screen.getByText(/lý do trả về/i)).toBeDefined();
      expect(screen.getByText(/-- Chọn lý do --/)).toBeDefined();
      expect(screen.getByText('Thiếu tài liệu')).toBeDefined();
      expect(screen.getByText('Nội dung không rõ ràng')).toBeDefined();
      expect(screen.getByText('Phương pháp không khả thi')).toBeDefined();
      expect(screen.getByText('Kinh phí không hợp lý')).toBeDefined();
      expect(screen.getByText('Khác')).toBeDefined();
    });

    it('should display section checkboxes in return dialog', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      expect(screen.getByText(/phần cần sửa/i)).toBeDefined();
      expect(screen.getByText('Thông tin chung')).toBeDefined();
      expect(screen.getByText('Nội dung nghiên cứu')).toBeDefined();
      expect(screen.getByText('Phương pháp nghiên cứu')).toBeDefined();
      expect(screen.getByText('Kết quả mong đợi')).toBeDefined();
      expect(screen.getByText('Kinh phí')).toBeDefined();
      expect(screen.getByText('Tài liệu đính kèm')).toBeDefined();
    });

    it('should display comment textarea in return dialog', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      expect(screen.getByText(/ghi chú thêm/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/nhập ghi chú chi tiết/i)).toBeDefined();
    });

    it('AC4: should disable submit button when validation fails (no reason code)', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      const submitButton = screen.getByRole('button', { name: 'Gửi yêu cầu' });
      expect(submitButton).toBeDisabled();
    });

    it('AC4: should disable submit button when validation fails (no sections selected)', async () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      // Select reason code but no sections
      const select = screen.getByDisplayValue('-- Chọn lý do --');
      fireEvent.change(select, { target: { value: 'THIEU_TAI_LIEU' } });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Gửi yêu cầu' });
        expect(submitButton).toBeDisabled();
      });
    });

    it('AC4: should enable submit button when validation passes (reason code + sections)', async () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      // Select reason code
      const select = screen.getByDisplayValue('-- Chọn lý do --');
      fireEvent.change(select, { target: { value: 'THIEU_TAI_LIEU' } });

      // Select a section
      const sectionCheckbox = screen.getByLabelText('Thông tin chung');
      fireEvent.click(sectionCheckbox);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Gửi yêu cầu' });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should call returnFacultyReview API with correct data when submitted', async () => {
      const mockResult = {
        proposalId: mockProposalId,
        previousState: 'FACULTY_COUNCIL_OUTLINE_REVIEW',
        currentState: 'CHANGES_REQUESTED',
        action: 'RETURN',
        holderUnit: 'faculty-1',
        holderUser: 'user-1',
        workflowLogId: 'log-id',
      };

      vi.mocked(workflowApi.returnFacultyReview).mockResolvedValue(mockResult);

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      // Select reason code
      const select = screen.getByDisplayValue('-- Chọn lý do --');
      fireEvent.change(select, { target: { value: 'NOI_DUNG_KHONG_RO_RANG' } });

      // Select sections
      fireEvent.click(screen.getByLabelText('Nội dung nghiên cứu'));
      fireEvent.click(screen.getByLabelText('Phương pháp nghiên cứu'));

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

      await waitFor(() => {
        expect(workflowApi.returnFacultyReview).toHaveBeenCalledWith(
          mockProposalId,
          'mocked-uuid-key',
          'Nội dung không rõ ràng',
          'NOI_DUNG_KHONG_RO_RANG',
          ['SEC_CONTENT_METHOD', 'SEC_METHOD'],
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should close return dialog when cancel button clicked', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(workflowApi.returnFacultyReview).not.toHaveBeenCalled();
    });

    it('should show validation error when submitting without required fields', async () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      // Click submit without filling form (should show validation error)
      const submitButton = screen.getByRole('button', { name: 'Gửi yêu cầu' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Vui lòng chọn lý do và ít nhất một phần cần sửa')).toBeDefined();
      });
    });

    it('should show loading state during return API call', async () => {
      vi.mocked(workflowApi.returnFacultyReview).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      // Fill form to enable submit
      const select = screen.getByDisplayValue('-- Chọn lý do --');
      fireEvent.change(select, { target: { value: 'THIEU_TAI_LIEU' } });
      fireEvent.click(screen.getByLabelText('Thông tin chung'));

      fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

      await waitFor(() => {
        expect(screen.getByText(/đang xử lý/i)).toBeDefined();
      });
    });
  });

  describe('Story 4.1: Approve action execution', () => {
    it('should show confirmation dialog when approve button clicked', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      const button = screen.getByRole('button', { name: /duyệt hồ sơ/i });
      fireEvent.click(button);

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Xác nhận duyệt hồ sơ')).toBeDefined();
      expect(
        screen.getByText(/chuyển lên Phòng KHCN để phân bổ/i),
      ).toBeDefined();
    });

    it('should call approve API with idempotency key when confirmed', async () => {
      const mockResult = {
        proposalId: mockProposalId,
        previousState: 'FACULTY_COUNCIL_OUTLINE_REVIEW',
        currentState: 'SCHOOL_COUNCIL_OUTLINE_REVIEW',
        action: 'APPROVE',
        holderUnit: 'PHONG_KHCN',
        holderUser: null,
        workflowLogId: 'log-id',
      };

      vi.mocked(workflowApi.approveFacultyReview).mockResolvedValue(mockResult);

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

      await waitFor(() => {
        expect(workflowApi.approveFacultyReview).toHaveBeenCalledWith(
          mockProposalId,
          'mocked-uuid-key',
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should close approve dialog when cancel button clicked', () => {
      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionSuccess={mockOnSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(workflowApi.approveFacultyReview).not.toHaveBeenCalled();
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

  describe('Error handling (AC6)', () => {
    it('should display error message when return API returns error', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'PROPOSAL_NOT_FACULTY_REVIEW',
              message: 'Chỉ có thể trả về đề tài ở trạng thái FACULTY_REVIEW',
            },
          },
        },
      };

      vi.mocked(workflowApi.returnFacultyReview).mockRejectedValue(mockError);

      render(
        <ProposalActions
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionError={mockOnError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /yêu cầu sửa/i }));

      // Fill form to enable submit
      const select = screen.getByDisplayValue('-- Chọn lý do --');
      fireEvent.change(select, { target: { value: 'THIEU_TAI_LIEU' } });
      fireEvent.click(screen.getByLabelText('Thông tin chung'));

      fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

      await waitFor(() => {
        expect(screen.getByText('Chỉ có thể trả về đề tài ở trạng thái FACULTY_REVIEW')).toBeDefined();
        expect(mockOnError).toHaveBeenCalledWith({
          code: 'PROPOSAL_NOT_FACULTY_REVIEW',
          message: 'Chỉ có thể trả về đề tài ở trạng thái FACULTY_REVIEW',
        });
      });
    });

    it('should display error message when approve API returns error', async () => {
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
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
          currentUser={{ id: 'user-1', role: 'QUAN_LY_KHOA' }}
          onActionError={mockOnError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /duyệt hồ sơ/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

      await waitFor(() => {
        expect(screen.getByText('Bạn không có quyền duyệt')).toBeDefined();
        expect(mockOnError).toHaveBeenCalledWith({
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền duyệt',
        });
      });
    });
  });
});
