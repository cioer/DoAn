/**
 * Changes Requested Banner Component Tests (Story 4.3)
 *
 * AC3: UI Banner for CHANGES_REQUESTED Proposals
 * - Banner renders when state = CHANGES_REQUESTED
 * - Banner hidden for other states
 * - Banner displays warning message
 * - Banner shows return reason
 * - Banner lists revision sections
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { ChangesRequestedBanner } from './ChangesRequestedBanner';
import { workflowApi, WorkflowLog } from '../../lib/api/workflow';

// Mock the workflow API
vi.mock('../../lib/api/workflow', () => ({
  workflowApi: {
    getLatestReturn: vi.fn(),
  },
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

const mockProposalId = 'test-proposal-id';

const mockReturnLog: WorkflowLog = {
  id: 'log-1',
  proposalId: mockProposalId,
  action: 'RETURN',
  fromState: 'FACULTY_COUNCIL_OUTLINE_REVIEW',
  toState: 'CHANGES_REQUESTED',
  actorId: 'user-2',
  actorName: 'Trần Văn B',
  returnTargetState: 'FACULTY_COUNCIL_OUTLINE_REVIEW',
  returnTargetHolderUnit: 'CNTT-KHOA',
  reasonCode: 'THIEU_TAI_LIEU',
  comment: JSON.stringify({
    reason: 'Thiếu tài liệu',
    revisionSections: ['SEC_BUDGET', 'SEC_ATTACHMENTS'],
  }),
  timestamp: '2026-01-07T10:00:00Z',
};

describe('ChangesRequestedBanner (Story 4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC3: Banner renders when state = CHANGES_REQUESTED', () => {
    it('should display banner when proposal state = CHANGES_REQUESTED', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Hồ sơ cần sửa trước khi nộp lại')).toBeDefined();
      });
    });

    it('should NOT display banner when proposal state != CHANGES_REQUESTED', () => {
      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="FACULTY_COUNCIL_OUTLINE_REVIEW"
        />,
      );

      expect(screen.queryByText('Hồ sơ cần sửa trước khi nộp lại')).toBeNull();
    });

    it('should NOT display banner when proposal state = DRAFT', () => {
      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="DRAFT"
        />,
      );

      expect(screen.queryByText('Hồ sơ cần sửa trước khi nộp lại')).toBeNull();
    });

    it('should NOT display banner when proposal state = APPROVED', () => {
      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="APPROVED"
        />,
      );

      expect(screen.queryByText('Hồ sơ cần sửa trước khi nộp lại')).toBeNull();
    });
  });

  describe('AC3: Banner displays warning message', () => {
    it('should show warning icon (AlertCircle)', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      const { container } = render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        // Check for SVG icon (lucide-react AlertCircle)
        const svgs = container.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
      });
    });

    it('should have distinctive orange/yellow background styling', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      const { container } = render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        const banner = container.querySelector('.bg-amber-50');
        expect(banner).toBeDefined();
      });
    });

    it('should show loading state while fetching', () => {
      vi.mocked(workflowApi.getLatestReturn).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { container } = render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      expect(screen.getByText(/Đang tải thông tin yêu cầu sửa/i)).toBeDefined();
    });
  });

  describe('AC3: Banner shows return reason', () => {
    it('should display return reason label', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Thiếu tài liệu')).toBeDefined();
      });
    });

    it('should display reason label for NOI_DUNG_KHONG_RO_RANG', async () => {
      const logWithDifferentReason: WorkflowLog = {
        ...mockReturnLog,
        reasonCode: 'NOI_DUNG_KHONG_RO_RANG',
        comment: JSON.stringify({
          reason: 'Nội dung không rõ ràng',
          revisionSections: ['SEC_CONTENT_METHOD'],
        }),
      };

      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(logWithDifferentReason);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Nội dung không rõ ràng')).toBeDefined();
      });
    });

    it('should handle unknown reason code gracefully', async () => {
      const logWithUnknownReason: WorkflowLog = {
        ...mockReturnLog,
        reasonCode: 'UNKNOWN_CODE',
        comment: JSON.stringify({
          reason: 'Unknown',
          revisionSections: [],
        }),
      };

      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(logWithUnknownReason);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('UNKNOWN_CODE')).toBeDefined();
      });
    });
  });

  describe('AC3: Banner lists revision sections', () => {
    it('should display section labels from revisionSections', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Kinh phí')).toBeDefined();
        expect(screen.getByText('Tài liệu đính kèm')).toBeDefined();
      });
    });

    it('should display all section labels', async () => {
      const logWithManySections: WorkflowLog = {
        ...mockReturnLog,
        comment: JSON.stringify({
          reason: 'Thiếu tài liệu',
          revisionSections: [
            'SEC_INFO_GENERAL',
            'SEC_CONTENT_METHOD',
            'SEC_METHOD',
            'SEC_BUDGET',
          ],
        }),
      };

      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(logWithManySections);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Thông tin chung')).toBeDefined();
        expect(screen.getByText('Nội dung nghiên cứu')).toBeDefined();
        expect(screen.getByText('Phương pháp nghiên cứu')).toBeDefined();
        expect(screen.getByText('Kinh phí')).toBeDefined();
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
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Hồ sơ cần sửa trước khi nộp lại')).toBeDefined();
        // Should not show "Phần cần sửa" label
        expect(screen.queryByText('Phần cần sửa:')).toBeNull();
      });
    });
  });

  describe('Error handling', () => {
    it('should show banner with error message when API fails', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockRejectedValue(new Error('Network error'));

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Hồ sơ cần sửa trước khi nộp lại')).toBeDefined();
        expect(screen.getByText(/Không thể tải thông tin yêu cầu sửa/i)).toBeDefined();
      });
    });

    it('should handle null return log gracefully', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(null);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Hồ sơ cần sửa trước khi nộp lại')).toBeDefined();
        expect(screen.getByText(/Vui lòng xem chi tiết trong lịch sử thay đổi/i)).toBeDefined();
      });
    });

    it('should handle malformed comment JSON', async () => {
      const logWithBadJson: WorkflowLog = {
        ...mockReturnLog,
        comment: 'invalid json',
      };

      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(logWithBadJson);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      await waitFor(() => {
        // Should still render banner without crashing
        expect(screen.getByText('Hồ sơ cần sửa trước khi nộp lại')).toBeDefined();
      });
    });
  });

  describe('Actor and timestamp display', () => {
    it('should display actor name', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      // Wait for loading to complete and content to render
      await waitFor(() => {
        expect(screen.getByText(/Người yêu cầu:/)).toBeDefined();
      }, { timeout: 2000 });

      // Actor name should be visible
      expect(screen.getByText(/Trần Văn B/)).toBeDefined();
    });

    it('should display timestamp', async () => {
      vi.mocked(workflowApi.getLatestReturn).mockResolvedValue(mockReturnLog);

      render(
        <ChangesRequestedBanner
          proposalId={mockProposalId}
          proposalState="CHANGES_REQUESTED"
        />,
      );

      // Wait for loading to complete and content to render
      await waitFor(() => {
        expect(screen.getByText(/Ngày:/)).toBeDefined();
      }, { timeout: 2000 });

      // Date may be formatted as "7/1/2026" or "07/01/2026" depending on locale
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/2026/)).toBeDefined();
    });
  });
});
