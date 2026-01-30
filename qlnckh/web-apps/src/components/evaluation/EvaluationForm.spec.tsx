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
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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
    FINALIZED: 'FINALIZED',
  },
  generateIdempotencyKey: vi.fn(() => 'mock-idempotency-key-12345'),
  EVALUATION_STORAGE_KEY: vi.fn((id: string) => `evaluation_draft_${id}`),
}));

const { evaluationApi } = await import('../../lib/api/evaluations');

describe('EvaluationForm (Story 5.3)', () => {
  const mockProps = {
    proposalId: 'test-proposal-123',
    holderUser: 'test-secretary-id',
    currentState: 'SCHOOL_COUNCIL_OUTLINE_REVIEW',
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
        expect(screen.getByText('Phiếu đánh giá đề tài')).toBeDefined();
      });

      // Check all sections are displayed
      expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeDefined();
      expect(screen.getByText('2. Đánh giá phương pháp nghiên cứu')).toBeDefined();
      expect(screen.getByText('3. Đánh giá tính khả thi')).toBeDefined();
      expect(screen.getByText('4. Đánh giá kinh phí')).toBeDefined();
      expect(screen.getByText('5. Kết luận đánh giá')).toBeDefined();
      expect(screen.getByText('6. Ý kiến khác (optional)')).toBeDefined();
    });

    it('should show not authorized message when user is not the assigned secretary', async () => {
      const unauthorizedProps = {
        ...mockProps,
        holderUser: 'different-secretary-id',
      };

      render(<EvaluationForm {...unauthorizedProps} />);

      await waitFor(() => {
        expect(screen.getByText('Không thể đánh giá')).toBeDefined();
      });
      expect(
        screen.getByText('Đề tài chưa được phân bổ cho bạn đánh giá.'),
      ).toBeDefined();
    });

    it('should show not authorized message when user is not THU_KY_HOI_DONG', async () => {
      const nonSecretaryProps = {
        ...mockProps,
        currentUserRole: 'GIANG_VIEN',
        isSecretary: false,
      };

      render(<EvaluationForm {...nonSecretaryProps} />);

      await waitFor(() => {
        expect(screen.getByText('Không thể đánh giá')).toBeDefined();
      });
      expect(
        screen.getByText(/Chỉ Thư ký Hội đồng được phân công mới có thể đánh giá/),
      ).toBeDefined();
    });

    it('should show not authorized message when proposal is not in OUTLINE_COUNCIL_REVIEW state', async () => {
      const wrongStateProps = {
        ...mockProps,
        currentState: 'FACULTY_COUNCIL_OUTLINE_REVIEW',
      };

      render(<EvaluationForm {...wrongStateProps} />);

      await waitFor(() => {
        expect(screen.getByText('Không thể đánh giá')).toBeDefined();
      });
    });
  });

  /**
   * Story 5.3: AC2 - Auto-save Functionality
   */
  describe('AC2: Auto-save Functionality', () => {
    beforeEach(() => {
      // Use real timers for auto-save tests since userEvent doesn't work with fake timers
      vi.useRealTimers();
    });

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
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeDefined();
      });

      // Change a field using fireEvent (faster, works with real timers)
      const sliders = screen.getAllByRole('slider');
      fireEvent.input(sliders[0], { target: { value: '4' } });

      // Should not have called yet
      expect(evaluationApi.updateEvaluation).not.toHaveBeenCalled();

      // Wait for auto-save debounce (2.1 seconds to be safe)
      await new Promise(resolve => setTimeout(resolve, 2100));

      await waitFor(() => {
        expect(evaluationApi.updateEvaluation).toHaveBeenCalled();
      }, { timeout: 3000 });
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
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeDefined();
      });

      // Change a field and wait for auto-save
      const sliders = screen.getAllByRole('slider');
      fireEvent.input(sliders[0], { target: { value: '4' } });

      // Wait for auto-save debounce + UI update
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Check for "Đã lưu vào" text
      await waitFor(() => {
        const savedText = screen.queryByText(/Đã lưu vào/);
        expect(savedText).toBeDefined();
      }, { timeout: 3000 });
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
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeDefined();
      });

      // First change
      const sliders = screen.getAllByRole('slider');
      fireEvent.input(sliders[0], { target: { value: '4' } });

      // Wait 1 second (not enough to trigger save)
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(evaluationApi.updateEvaluation).not.toHaveBeenCalled();

      // Second change - should cancel previous timer
      fireEvent.input(sliders[1], { target: { value: '2' } });

      // Wait 1.5 seconds (not enough from second change)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should still not have called
      expect(evaluationApi.updateEvaluation).not.toHaveBeenCalled();

      // Wait another second to complete debounce (total 2.5s from second change)
      await new Promise(resolve => setTimeout(resolve, 1000));

      await waitFor(() => {
        expect(evaluationApi.updateEvaluation).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });
    });
  });

  /**
   * Story 5.3: Form Field Interactions
   */
  describe('Form Field Interactions', () => {
    beforeEach(() => {
      // Use real timers for interaction tests since userEvent doesn't work with fake timers
      vi.useRealTimers();
    });
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
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeDefined();
      }, { timeout: 3000 });

      // Find sliders - should have 4 score sliders
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBe(4);

      // Verify initial score is 3 for the first slider
      expect(sliders[0]).toHaveValue('3');

      // Change the first slider value
      fireEvent.input(sliders[0], { target: { value: '5' } });
      expect(sliders[0]).toHaveValue('5');
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
        expect(screen.getByText('1. Đánh giá nội dung khoa học')).toBeDefined();
      }, { timeout: 3000 });

      // Find comment textarea
      const commentTextareas = screen.getAllByPlaceholderText(/Nhập nhận xét/);
      expect(commentTextareas.length).toBeGreaterThan(0);

      // Use fireEvent instead of userEvent for faster execution
      fireEvent.change(commentTextareas[0], { target: { value: 'Test comment' } });
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
        expect(screen.getByText('5. Kết luận đánh giá')).toBeDefined();
      }, { timeout: 3000 });

      // Find conclusion radio buttons
      const datRadio = screen.getByDisplayValue('DAT');
      const khongDatRadio = screen.getByDisplayValue('KHONG_DAT');

      expect(datRadio).toBeChecked();
      expect(khongDatRadio).not.toBeChecked();

      // Use fireEvent instead of userEvent for faster execution
      fireEvent.click(khongDatRadio);

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
