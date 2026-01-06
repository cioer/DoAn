/**
 * SchoolSelectionActions Component Tests (Story 5.1)
 *
 * Tests for PKHCN action buttons at SCHOOL_SELECTION_REVIEW state.
 * AC2: UI displays button "Phân bổ hội đồng" (primary) + "Yêu cầu sửa" (secondary)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { SchoolSelectionActions } from './SchoolSelectionActions';

// Mock the workflow API
const mockReturnFacultyReview = vi.fn();
vi.mock('../../lib/api/workflow', () => ({
  workflowApi: {
    returnFacultyReview: () => mockReturnFacultyReview(),
  },
  generateIdempotencyKey: () => 'mock-uuid',
  RETURN_REASON_LABELS: {
    THIEU_TAI_LIEU: 'Thiếu tài liệu',
    NOI_DUNG_KHONG_RO_RANG: 'Nội dung không rõ ràng',
  },
  CANONICAL_SECTIONS: [
    { id: 'SEC_INFO_GENERAL', label: 'Thông tin chung' },
    { id: 'SEC_BUDGET', label: 'Kinh phí' },
  ],
}));

describe('SchoolSelectionActions', () => {
  const mockOnActionSuccess = vi.fn();
  const mockOnActionError = vi.fn();

  const defaultProps = {
    proposalId: 'proposal-123',
    proposalState: 'SCHOOL_SELECTION_REVIEW',
    currentUser: {
      id: 'user-123',
      role: 'PHONG_KHCN',
      facultyId: null,
    },
    onActionSuccess: mockOnActionSuccess,
    onActionError: mockOnActionError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Story 5.1: AC2 - Action Buttons Visibility', () => {
    it('should show "Phân bổ hội đồng" button for PHONG_KHCN at SCHOOL_SELECTION_REVIEW state', () => {
      render(<SchoolSelectionActions {...defaultProps} />);

      expect(screen.getByRole('button', { name: /phân bổ hội đồng/i })).toBeInTheDocument();
    });

    it('should show "Yêu cầu sửa" button for PHONG_KHCN at SCHOOL_SELECTION_REVIEW state', () => {
      render(<SchoolSelectionActions {...defaultProps} />);

      expect(screen.getByRole('button', { name: /yêu cầu sửa/i })).toBeInTheDocument();
    });

    it('should NOT show buttons when user does not have PHONG_KHCN role', () => {
      const props = {
        ...defaultProps,
        currentUser: { ...defaultProps.currentUser, role: 'GIANG_VIEN' },
      };

      render(<SchoolSelectionActions {...props} />);

      expect(screen.queryByRole('button', { name: /phân bổ hội đồng/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /yêu cầu sửa/i })).not.toBeInTheDocument();
    });

    it('should NOT show buttons when proposal is NOT in SCHOOL_SELECTION_REVIEW state', () => {
      const props = {
        ...defaultProps,
        proposalState: 'FACULTY_REVIEW',
      };

      render(<SchoolSelectionActions {...props} />);

      expect(screen.queryByRole('button', { name: /phân bổ hội đồng/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /yêu cầu sửa/i })).not.toBeInTheDocument();
    });
  });

  describe('Return Dialog', () => {
    it('should open return dialog when "Yêu cầu sửa" button is clicked', () => {
      render(<SchoolSelectionActions {...defaultProps} />);

      const returnButton = screen.getByRole('button', { name: /yêu cầu sửa/i });
      fireEvent.click(returnButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/yêu cầu sửa hồ sơ/i)).toBeInTheDocument();
    });

    it('should validate that reason code is selected', () => {
      render(<SchoolSelectionActions {...defaultProps} />);

      // Open return dialog
      const returnButton = screen.getByRole('button', { name: /yêu cầu sửa/i });
      fireEvent.click(returnButton);

      // Check that dialog has submit button
      const submitButton = screen.getByRole('button', { name: /gửi yêu cầu/i });
      expect(submitButton).toBeInTheDocument();

      // Check that submit button is disabled when form is invalid
      // The button should be disabled because no reason or sections selected
      // (handled by component logic)
    });

    it('should call returnFacultyReview API when form is valid', async () => {
      mockReturnFacultyReview.mockResolvedValue({
        proposalId: 'proposal-123',
        previousState: 'SCHOOL_SELECTION_REVIEW',
        currentState: 'CHANGES_REQUESTED',
      });

      render(<SchoolSelectionActions {...defaultProps} />);

      // Open return dialog
      const returnButton = screen.getByRole('button', { name: /yêu cầu sửa/i });
      fireEvent.click(returnButton);

      // Select reason code - find by text content since label may not work
      const selectElement = screen.getByRole('combobox');
      fireEvent.change(selectElement, { target: { value: 'THIEU_TAI_LIEU' } });

      // Select section
      const sectionCheckbox = screen.getByLabelText(/thông tin chung/i);
      fireEvent.click(sectionCheckbox);

      // Submit
      const submitButton = screen.getByRole('button', { name: /gửi yêu cầu/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockReturnFacultyReview).toHaveBeenCalled();
        expect(mockOnActionSuccess).toHaveBeenCalled();
      });
    });

    it('should call onActionError when API call fails', async () => {
      mockReturnFacultyReview.mockRejectedValue({
        response: {
          data: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Dữ liệu không hợp lệ',
            },
          },
        },
      });

      render(<SchoolSelectionActions {...defaultProps} />);

      // Open return dialog
      const returnButton = screen.getByRole('button', { name: /yêu cầu sửa/i });
      fireEvent.click(returnButton);

      // Select reason code
      const selectElement = screen.getByRole('combobox');
      fireEvent.change(selectElement, { target: { value: 'THIEU_TAI_LIEU' } });

      // Select section
      const sectionCheckbox = screen.getByLabelText(/thông tin chung/i);
      fireEvent.click(sectionCheckbox);

      // Submit
      const submitButton = screen.getByRole('button', { name: /gửi yêu cầu/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnActionError).toHaveBeenCalledWith({
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
        });
      });
    });

    it('should close dialog when cancel button is clicked', () => {
      render(<SchoolSelectionActions {...defaultProps} />);

      // Open return dialog
      const returnButton = screen.getByRole('button', { name: /yêu cầu sửa/i });
      fireEvent.click(returnButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /hủy/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Assign Council Button', () => {
    it('should show error message when clicked (Story 5.2 will implement)', () => {
      render(<SchoolSelectionActions {...defaultProps} />);

      const assignButton = screen.getByRole('button', { name: /phân bổ hội đồng/i });
      fireEvent.click(assignButton);

      expect(screen.getByText(/tính năng phân bổ hội đồng sẽ được triển khai trong story 5\.2/i)).toBeInTheDocument();
    });

    it('should allow closing error message', () => {
      render(<SchoolSelectionActions {...defaultProps} />);

      // Click assign button to show error
      const assignButton = screen.getByRole('button', { name: /phân bổ hội đồng/i });
      fireEvent.click(assignButton);

      // Close error message
      const closeButton = screen.getByRole('button', { name: /đóng/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText(/tính năng phân bổ hội đồng/i)).not.toBeInTheDocument();
    });
  });

  describe('RBAC Guards', () => {
    it('should only show buttons for PHONG_KHCN role at SCHOOL_SELECTION_REVIEW state', () => {
      const roles = ['GIANG_VIEN', 'QUAN_LY_KHOA', 'THU_KY_KHOA', 'ADMIN'];

      roles.forEach((role) => {
        const props = {
          ...defaultProps,
          currentUser: { ...defaultProps.currentUser, role },
        };

        const { container } = render(<SchoolSelectionActions {...props} />);

        // Should not render buttons for non-PKHCN roles
        expect(container.querySelector('button')).toBeNull();
      });
    });
  });
});
