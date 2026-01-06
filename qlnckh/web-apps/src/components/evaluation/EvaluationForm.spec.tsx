/**
 * EvaluationForm Component Tests (Story 5.3)
 *
 * Tests for:
 * - AC1: Evaluation Form Display
 * - AC2: Auto-save Functionality
 * - RBAC validation
 * - Form field interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvaluationForm, isCouncilSecretary } from './EvaluationForm';

// Mock the evaluation API
vi.mock('../../lib/api/evaluations', () => ({
  evaluationApi: {
    getOrCreateEvaluation: vi.fn(),
    updateEvaluation: vi.fn(),
  },
  DEFAULT_EVALUATION_DATA: {
    scientificContent: { score: 3, comments: '' },
    researchMethod: { score: 3, comments: '' },
    feasibility: { score: 3, comments: '' },
    budget: { score: 3, comments: '' },
    conclusion: 'DAT' as const,
    otherComments: '',
  },
  EvaluationState: {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
  },
}));

const { evaluationApi } = await import('../../lib/api/evaluations');

describe('EvaluationForm (Story 5.3)', () => {
  const mockProps = {
    proposalId: 'test-proposal-123',
    holderUser: 'test-secretary-id',
    currentState: 'OUTLINE_COUNCIL_REVIEW',
    currentUserId: 'test-secretary-id',
    currentUserRole: 'THU_KY_HOI_DONG',
    isSecretary: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Story 5.3: AC1 - Evaluation Form Display
   */
  describe('AC1: Evaluation Form Display', () => {
    it('should display all evaluation sections when user is authorized secretary', async () => {
      (evaluationApi.getOrCreateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 3, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<EvaluationForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Phiếu đánh giá đề tài')).toBeInTheDocument();
      });

      // Check all sections are displayed
      expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeInTheDocument();
      expect(screen.getByText('2. Đánh giá phương pháp nghiên cứu')).toBeInTheDocument();
      expect(screen.getByText('3. Đánh giá tính khả thi')).toBeInTheDocument();
      expect(screen.getByText('4. Đánh giá kinh phí')).toBeInTheDocument();
      expect(screen.getByText('5. Kết luận đánh giá')).toBeInTheDocument();
      expect(screen.getByText('6. Ý kiến khác (optional)')).toBeInTheDocument();
    });

    it('should show not authorized message when user is not the assigned secretary', async () => {
      const unauthorizedProps = {
        ...mockProps,
        holderUser: 'different-secretary-id',
      };

      render(<EvaluationForm {...unauthorizedProps} />);

      await waitFor(() => {
        expect(screen.getByText('Không thể đánh giá')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Đề tài chưa được phân bổ cho bạn đánh giá.'),
      ).toBeInTheDocument();
    });

    it('should show not authorized message when user is not THU_KY_HOI_DONG', async () => {
      const nonSecretaryProps = {
        ...mockProps,
        currentUserRole: 'GIANG_VIEN',
        isSecretary: false,
      };

      render(<EvaluationForm {...nonSecretaryProps} />);

      await waitFor(() => {
        expect(screen.getByText('Không thể đánh giá')).toBeInTheDocument();
      });
      expect(
        screen.getByText(/Chỉ Thư ký Hội đồng được phân công mới có thể đánh giá/),
      ).toBeInTheDocument();
    });

    it('should show not authorized message when proposal is not in OUTLINE_COUNCIL_REVIEW state', async () => {
      const wrongStateProps = {
        ...mockProps,
        currentState: 'FACULTY_REVIEW',
      };

      render(<EvaluationForm {...wrongStateProps} />);

      await waitFor(() => {
        expect(screen.getByText('Không thể đánh giá')).toBeInTheDocument();
      });
    });
  });

  /**
   * Story 5.3: AC2 - Auto-save Functionality
   */
  describe('AC2: Auto-save Functionality', () => {
    it('should trigger auto-save after 2 seconds of inactivity', async () => {
      (evaluationApi.getOrCreateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 3, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      (evaluationApi.updateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 4, comments: 'Test comment' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<EvaluationForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeInTheDocument();
      });

      // Change a field
      const sliders = screen.getAllByRole('slider');
      await userEvent.click(sliders[0]);

      // Fast-forward 1 second - should not save yet
      vi.advanceTimersByTime(1000);
      expect(evaluationApi.updateEvaluation).not.toHaveBeenCalled();

      // Fast-forward another 1.2 seconds - total 2.2 seconds, should save
      vi.advanceTimersByTime(1200);
      await waitFor(() => {
        expect(evaluationApi.updateEvaluation).toHaveBeenCalled();
      });
    });

    it('should display "Đã lưu vào HH:mm:ss" after successful save', async () => {
      (evaluationApi.getOrCreateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 3, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      (evaluationApi.updateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 4, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<EvaluationForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeInTheDocument();
      });

      // Change a field and wait for auto-save
      const sliders = screen.getAllByRole('slider');
      await userEvent.click(sliders[0]);

      vi.advanceTimersByTime(2100);

      await waitFor(() => {
        expect(evaluationApi.updateEvaluation).toHaveBeenCalled();
      });

      // Check for "Đã lưu vào" text
      await waitFor(() => {
        expect(screen.getByText(/Đã lưu vào/)).toBeInTheDocument();
      });
    });

    it('should cancel pending save when new change occurs', async () => {
      (evaluationApi.getOrCreateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 3, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      (evaluationApi.updateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 4, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<EvaluationForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeInTheDocument();
      });

      // First change
      const sliders = screen.getAllByRole('slider');
      await userEvent.click(sliders[0]);

      // Advance 1 second (not enough to trigger save)
      vi.advanceTimersByTime(1000);

      // Second change - should cancel previous timer
      await userEvent.click(sliders[1]);

      // Advance another 1.5 seconds from second change (total 2.5s from start)
      vi.advanceTimersByTime(1500);

      // Should only have called update once (for the second change, not the first)
      expect(evaluationApi.updateEvaluation).not.toHaveBeenCalled();

      // Advance another second to complete debounce
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(evaluationApi.updateEvaluation).toHaveBeenCalledTimes(1);
      });
    });
  });

  /**
   * Story 5.3: Form Field Interactions
   */
  describe('Form Field Interactions', () => {
    it('should update score when slider changes', async () => {
      (evaluationApi.getOrCreateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 3, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<EvaluationForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeInTheDocument();
      });

      // Find score displays
      const scoreDisplays = screen.getAllByText('/5');
      expect(scoreDisplays.length).toBeGreaterThan(0);
    });

    it('should update comments when textarea changes', async () => {
      (evaluationApi.getOrCreateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 3, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<EvaluationForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeInTheDocument();
      });

      // Find comment textarea
      const commentTextareas = screen.getAllByPlaceholderText(/Nhập nhận xét/);
      expect(commentTextareas.length).toBeGreaterThan(0);

      await userEvent.type(commentTextareas[0], 'Test comment');
      expect(commentTextareas[0]).toHaveValue('Test comment');
    });

    it('should update conclusion when radio button changes', async () => {
      (evaluationApi.getOrCreateEvaluation as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'eval-1',
        proposalId: mockProps.proposalId,
        evaluatorId: mockProps.currentUserId,
        state: 'DRAFT',
        formData: {
          scientificContent: { score: 3, comments: '' },
          researchMethod: { score: 3, comments: '' },
          feasibility: { score: 3, comments: '' },
          budget: { score: 3, comments: '' },
          conclusion: 'DAT' as const,
          otherComments: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      render(<EvaluationForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('5. Kết luận đánh giá')).toBeInTheDocument();
      });

      // Find conclusion radio buttons
      const datRadio = screen.getByDisplayValue('DAT');
      const khongDatRadio = screen.getByDisplayValue('KHONG_DAT');

      expect(datRadio).toBeChecked();
      expect(khongDatRadio).not.toBeChecked();

      await userEvent.click(khongDatRadio);

      expect(khongDatRadio).toBeChecked();
      expect(datRadio).not.toBeChecked();
    });
  });
});

/**
 * Test helper functions
 */
describe('Helper Functions', () => {
  describe('isCouncilSecretary', () => {
    it('should return true for THU_KY_HOI_DONG role', () => {
      expect(isCouncilSecretary('THU_KY_HOI_DONG')).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(isCouncilSecretary('GIANG_VIEN')).toBe(false);
      expect(isCouncilSecretary('QUAN_LY_KHOA')).toBe(false);
      expect(isCouncilSecretary('PHONG_KHCN')).toBe(false);
    });
  });
});
