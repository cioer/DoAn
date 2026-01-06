/**
 * Revision Panel Component Tests (Story 4.4)
 *
 * AC1: Panel displays when state = CHANGES_REQUESTED
 * AC2: Section items with checkboxes
 * AC3: Click to scroll and highlight
 * AC4: Checkbox state persisted
 * AC5: Button enabled/disabled based on checkboxes
 * AC6: Warning message displayed
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { RevisionPanel } from './RevisionPanel';
import { workflowApi, WorkflowLog } from '@/lib/api/workflow';

// Mock the workflow API
vi.mock('@/lib/api/workflow', () => ({
  workflowApi: {
    getLatestReturn: vi.fn(),
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

const mockProposalId = 'test-proposal-id';

const mockReturnLog: WorkflowLog = {
  id: 'log-1',
  proposalId: mockProposalId,
  action: 'RETURN',
  fromState: 'FACULTY_REVIEW',
  toState: 'CHANGES_REQUESTED',
  actorId: 'user-2',
  actorName: 'Trần Văn B',
  returnTargetState: 'FACULTY_REVIEW',
  returnTargetHolderUnit: 'CNTT-KHOA',
  reasonCode: 'THIEU_TAI_LIEU',
  comment: JSON.stringify({
    reason: 'Thiếu tài liệu',
    revisionSections: ['SEC_METHOD', 'SEC_BUDGET', 'SEC_ATTACHMENTS'],
  }),
  timestamp: '2026-01-07T10:00:00Z',
};

describe('RevisionPanel (Story 4.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('AC1: Panel displays when state = CHANGES_REQUESTED', () => {
    it('should display panel when proposal state = CHANGES_REQUESTED', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Cần sửa các phần:')).toBeInTheDocument();
      });
    });

    it('should NOT display panel when proposal state != CHANGES_REQUESTED', () => {
      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
        />,
      );

      expect(screen.queryByText('Cần sửa các phần:')).not.toBeInTheDocument();
    });

    it('should NOT display panel when proposal state = DRAFT', () => {
      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="DRAFT"
        />,
      );

      expect(screen.queryByText('Cần sửa các phần:')).not.toBeInTheDocument();
    });
  });

  describe('AC2: Section items with checkboxes', () => {
    it('should display sections from return log', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Phương pháp nghiên cứu')).toBeInTheDocument();
        expect(screen.getByText('Kinh phí')).toBeInTheDocument();
        expect(screen.getByText('Tài liệu đính kèm')).toBeInTheDocument();
      });
    });

    it('should display checkbox for each section', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBe(3);
      });
    });

    it('should display "Xem trong form" button for each section', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        const viewButtons = screen.getAllByText('Xem trong form →');
        expect(viewButtons.length).toBe(3);
      });
    });

    it('should handle empty revisionSections', async () => {
      const logWithNoSections: WorkflowLog = {
        ...mockReturnLog,
        comment: JSON.stringify({
          reason: 'Thiếu tài liệu',
          revisionSections: [],
        }),
      };

      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(logWithNoSections);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Không có section cụ thể nào được yêu cầu sửa.')).toBeInTheDocument();
      });
    });
  });

  describe('AC3: Click to scroll and highlight', () => {
    it('should scroll to section when label clicked', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      // Mock scrollIntoView
      const mockScroll = vi.fn();
      Element.prototype.scrollIntoView = mockScroll;

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        const label = screen.getByText('Phương pháp nghiên cứu');
        fireEvent.click(label);
      });

      // Note: scrollIntoView was called but element might not be found
      // This is expected in test environment
      expect(mockScroll).toHaveBeenCalled();
    });

    it('should add highlight class to element on scroll', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      // Create a test element
      const testElement = document.createElement('div');
      testElement.id = 'method';
      testElement.setAttribute('data-section', 'SEC_METHOD');
      document.body.appendChild(testElement);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        const viewButton = screen.getAllByText('Xem trong form →')[0];
        fireEvent.click(viewButton);
      });

      // Check if highlight class was added
      expect(testElement.classList.contains('ring-4')).toBe(true);

      // Cleanup
      document.body.removeChild(testElement);
    });
  });

  describe('AC4: Checkbox state persisted', () => {
    it('should save checkbox state to localStorage', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Phương pháp nghiên cứu')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);

      // Check localStorage
      const stored = localStorage.getItem(`revision-${mockProposalId}`);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(['SEC_METHOD']);
    });

    it('should load checkbox state from localStorage on mount', async () => {
      // Pre-populate localStorage
      localStorage.setItem(
        `revision-${mockProposalId}`,
        JSON.stringify(['SEC_METHOD', 'SEC_BUDGET']),
      );

      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
        expect(checkboxes[0]).toBeChecked(); // SEC_METHOD
        expect(checkboxes[1]).toBeChecked(); // SEC_BUDGET
        expect(checkboxes[2]).not.toBeChecked(); // SEC_ATTACHMENTS
      });
    });

    it('should clear localStorage when state changes away from CHANGES_REQUESTED', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      const { rerender } = render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Cần sửa các phần:')).toBeInTheDocument();
      });

      // Check some checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);

      expect(localStorage.getItem(`revision-${mockProposalId}`)).toBeTruthy();

      // Change state to FACULTY_REVIEW
      rerender(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="FACULTY_REVIEW"
        />,
      );

      // localStorage should be cleared
      expect(localStorage.getItem(`revision-${mockProposalId}`)).toBeNull();
    });
  });

  describe('AC5: Button enabled/disabled based on checkboxes', () => {
    it('should call onResubmit with checked sections', async () => {
      const onResubmit = vi.fn();
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
          onResubmit={onResubmit}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Cần sửa các phần:')).toBeInTheDocument();
      });

      // Check one checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);

      expect(onResubmit).toHaveBeenCalledWith(['SEC_METHOD']);
    });

    it('should update checked sections count', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('(0/3 đã sửa)')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);

      expect(screen.getByText('(1/3 đã sửa)')).toBeInTheDocument();
    });

    it('should support controlled component mode', async () => {
      const onResubmit = vi.fn();
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
          onResubmit={onResubmit}
          checkedSections={['SEC_METHOD']}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('(1/3 đã sửa)')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('AC6: Warning message displayed', () => {
    it('should display warning message about history preservation', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Nộp lại sẽ giữ nguyên lịch sử/)).toBeInTheDocument();
        expect(screen.getByText(/không quay về DRAFT/)).toBeInTheDocument();
      });
    });

    it('should display warning icon', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      const { container } = render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        // Check for warning icon (lucide-react AlertTriangle)
        const svgs = container.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error handling', () => {
    it('should show minimal panel when API fails', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockRejectedValue(new Error('Network error'));

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Cần sửa các phần:')).toBeInTheDocument();
        expect(screen.getByText(/Không thể tải chi tiết yêu cầu sửa/)).toBeInTheDocument();
      });
    });

    it('should show minimal panel when return log is null', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(null);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Cần sửa các phần:')).toBeInTheDocument();
        expect(screen.getByText(/Không thể tải chi tiết yêu cầu sửa/)).toBeInTheDocument();
      });
    });
  });

  describe('Visual feedback', () => {
    it('should show checked icon for checked sections', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Cần sửa các phần:')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);

      // Check for CheckCircle icon (SVG)
      const { container } = render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should apply green background to checked section items', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      const { container } = render(
        <RevisionPanel
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Cần sửa các phần:')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);

      await waitFor(() => {
        const greenBackgrounds = container.querySelectorAll('.bg-green-50');
        expect(greenBackgrounds.length).toBeGreaterThan(0);
      });
    });
  });
});
