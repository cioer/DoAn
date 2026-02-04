/**
 * Evaluation Form Component (Story 5.3, Story 5.4, Story 5.5, Story 5.6)
 *
 * Provides evaluation form for council secretaries to evaluate proposals.
 * Features:
 * - Four evaluation sections with scores (1-5) and comments
 * - Conclusion radio buttons (Đạt/Không đạt)
 * - Other comments optional field
 * - Auto-save with 2-second debounce
 * - Save indicator showing "Đã lưu vào HH:mm:ss"
 * - "Hoàn tất" button with preview modal (Story 5.4)
 * - Submit evaluation to FINALIZED state (Story 5.4)
 * - Read-only mode when FINALIZED (Story 5.5)
 * - SubmittedBadge display when FINALIZED (Story 5.5)
 * - Export PDF button when FINALIZED (Story 5.6)
 *
 * Story 5.3: AC1 - Evaluation Form Display
 * Story 5.3: AC2 - Auto-save Functionality
 * Story 5.4: AC1 - Preview Modal Display
 * Story 5.4: AC3 - Submit Evaluation
 * Story 5.5: AC1 - Read-Only UI Mode
 * Story 5.6: AC1 - PDF Export Button
 */

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { evaluationApi, EvaluationFormData, DEFAULT_EVALUATION_DATA, EvaluationState } from '../../lib/api/evaluations';
import { EvaluationPreviewModal } from './EvaluationPreviewModal';
import { SubmittedBadge } from './SubmittedBadge';
import { ExportPdfButton } from './ExportPdfButton';

// Static score labels - defined outside component to avoid recreation
const SCORE_LABELS: Record<number, string> = {
  1: 'Kém',
  2: 'Yếu',
  3: 'Trung bình',
  4: 'Tốt',
  5: 'Xuất sắc',
} as const;

export interface EvaluationFormProps {
  proposalId: string;
  proposalCode?: string; // Story 5.6: For PDF export filename
  holderUser: string | null; // From proposal data
  currentState: string; // Should be OUTLINE_COUNCIL_REVIEW
  currentUserId: string; // From auth context
  currentUserRole: string; // From auth context
  isSecretary: boolean; // Derived from role = THU_KY_HOI_DONG
  isCouncilMember: boolean; // Multi-member: Check if user is HOI_DONG or THU_KY_HOI_DONG
  onSubmitComplete?: () => void; // Callback for Story 5.4
}

/**
 * Auto-save state types (simplified from useAutoSave for evaluation-specific use)
 */
type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveState {
  status: AutoSaveStatus;
  lastSavedAt?: Date;
  error?: Error;
}

/**
 * Evaluation Score Section Props
 */
interface ScoreSectionProps {
  title: string;
  score: number;
  comments: string;
  onScoreChange: (score: number) => void;
  onCommentsChange: (comments: string) => void;
  disabled?: boolean; // Story 5.5: Disabled prop for read-only mode
}

/**
 * Score Section Component
 * Renders a single evaluation section with score slider and comment textarea
 * Story 5.5: Added disabled prop for read-only mode
 */
const ScoreSection = memo(function ScoreSection({
  title,
  score,
  comments,
  onScoreChange,
  onCommentsChange,
  disabled = false
}: ScoreSectionProps) {
  // Generate unique IDs for accessibility - memoize to avoid recomputation
  const sectionId = useMemo(() =>
    title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    [title]
  );
  const sliderId = `score-${sectionId}`;
  const textareaId = `comments-${sectionId}`;

  // Memoized handlers
  const handleScoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onScoreChange(Number(e.target.value));
  }, [onScoreChange]);

  const handleCommentsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCommentsChange(e.target.value);
  }, [onCommentsChange]);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white">
      <h4 id={`heading-${sectionId}`} className="font-semibold text-sm text-gray-900">{title}</h4>

      {/* Score Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <label htmlFor={sliderId}>Đánh giá:</label>
          <span className="font-medium text-sm" aria-live="polite">{score}/5 - {SCORE_LABELS[score]}</span>
        </div>
        <input
          id={sliderId}
          type="range"
          min={1}
          max={5}
          step={1}
          value={score}
          onChange={handleScoreChange}
          disabled={disabled}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={score}
          aria-valuetext={`${score} trên 5: ${SCORE_LABELS[score]}`}
          aria-describedby={`heading-${sectionId}`}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-500" aria-hidden="true">
          <span>1 - Kém</span>
          <span>2 - Yếu</span>
          <span>3 - Trung bình</span>
          <span>4 - Tốt</span>
          <span>5 - Xuất sắc</span>
        </div>
      </div>

      {/* Comments Textarea */}
      <div className="space-y-1">
        <label htmlFor={textareaId} className="text-xs text-gray-600">Nhận xét:</label>
        <textarea
          id={textareaId}
          value={comments}
          onChange={handleCommentsChange}
          placeholder="Nhập nhận xét cho mục này…"
          rows={3}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
        />
      </div>
    </div>
  );
});

/**
 * Evaluation Form Component (Story 5.3)
 * Story 5.6: Added proposalCode prop for PDF export
 */
export function EvaluationForm({
  proposalId,
  proposalCode,
  holderUser,
  currentState,
  currentUserId,
  currentUserRole,
  isSecretary,
  isCouncilMember,
  onSubmitComplete,
}: EvaluationFormProps) {
  // Form state
  const [formData, setFormData] = useState<EvaluationFormData>(DEFAULT_EVALUATION_DATA);
  const [initialEvaluation, setInitialEvaluation] = useState<EvaluationFormData | null>(null);
  const [evaluationState, setEvaluationState] = useState<EvaluationState>(EvaluationState.DRAFT);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null); // Story 5.5: Submitted timestamp

  // UI state
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({ status: 'idle' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false); // Story 5.4: Preview modal state

  /**
   * Check if form is read-only (Story 5.5: AC1)
   * Form is read-only when evaluation is FINALIZED
   */
  const isReadOnly = evaluationState === EvaluationState.FINALIZED;

  // Refs for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);
  const pendingDataRef = useRef<EvaluationFormData | null>(null);

  /**
   * Check if current user can evaluate (Story 5.3: AC1, Multi-member)
   * - User must be a council member (HOI_DONG or THU_KY_HOI_DONG)
   * - Proposal state must be OUTLINE_COUNCIL_REVIEW (faculty or school level)
   * - User must be assigned to the proposal's council
   */
  const canEvaluate = isCouncilMember && ['FACULTY_COUNCIL_OUTLINE_REVIEW', 'SCHOOL_COUNCIL_OUTLINE_REVIEW'].includes(currentState);

  /**
   * Load evaluation on mount (Story 5.3: AC1)
   * Auto-creates draft if doesn't exist
   */
  useEffect(() => {
    if (!canEvaluate) {
      setLoading(false);
      return;
    }

    const loadEvaluation = async () => {
      setLoading(true);
      setError(null);

      try {
        const evaluation = await evaluationApi.getOrCreateEvaluation(proposalId);

        // Parse form data from API
        const apiFormData = evaluation.formData as EvaluationFormData;

        // Ensure all fields exist (merge with defaults)
        const mergedFormData: EvaluationFormData = {
          scientificContent: { ...DEFAULT_EVALUATION_DATA.scientificContent, ...apiFormData.scientificContent },
          researchMethod: { ...DEFAULT_EVALUATION_DATA.researchMethod, ...apiFormData.researchMethod },
          feasibility: { ...DEFAULT_EVALUATION_DATA.feasibility, ...apiFormData.feasibility },
          budget: { ...DEFAULT_EVALUATION_DATA.budget, ...apiFormData.budget },
          conclusion: apiFormData.conclusion || 'DAT',
          otherComments: apiFormData.otherComments || '',
        };

        setFormData(mergedFormData);
        setInitialEvaluation(mergedFormData);
        setEvaluationState(evaluation.state as EvaluationState); // Story 5.4: Capture evaluation state
        setSubmittedAt(evaluation.state === EvaluationState.FINALIZED ? new Date(evaluation.updatedAt) : null); // Story 5.5: Capture submittedAt
        setAutoSaveState({
          status: 'saved',
          lastSavedAt: new Date(evaluation.updatedAt),
        });
      } catch (err) {
        const error = err as Error & { response?: { data?: { error?: { message?: string } } } };
        setError(
          error.response?.data?.error?.message ||
            error.message ||
            'Không thể tải phiếu đánh giá. Vui lòng thử lại.',
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [proposalId, canEvaluate]);

  /**
   * Perform save with error handling
   * Skip save when evaluation is finalized (Story 5.5: AC1)
   */
  const performSave = useCallback(async (dataToSave: EvaluationFormData) => {
    if (isSavingRef.current || !canEvaluate || isReadOnly) {
      return;
    }

    isSavingRef.current = true;
    setAutoSaveState({ status: 'saving' });

    try {
      await evaluationApi.updateEvaluation(proposalId, dataToSave);

      setAutoSaveState({
        status: 'saved',
        lastSavedAt: new Date(),
      });

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setAutoSaveState((prev) => (prev.status === 'saved' ? { status: 'idle' } : prev));
      }, 2000);
    } catch (err) {
      const error = err as Error;
      setAutoSaveState({
        status: 'error',
        error,
      });

      // Retry after delay
      setTimeout(() => {
        if (pendingDataRef.current) {
          isSavingRef.current = false;
          performSave(pendingDataRef.current);
        }
      }, 2000);
    } finally {
      isSavingRef.current = false;
    }
  }, [proposalId, canEvaluate]);

  /**
   * Trigger auto-save with debounce (Story 5.3: AC2)
   * 2-second debounce as specified
   */
  const triggerAutoSave = useCallback((newFormData: EvaluationFormData) => {
    if (!canEvaluate) {
      return;
    }

    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Store pending data
    pendingDataRef.current = newFormData;

    // Schedule debounced save (2 seconds as per Story 5.3: AC2)
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current && !isSavingRef.current) {
        performSave(pendingDataRef.current);
      }
    }, 2000);
  }, [canEvaluate, performSave]);

  /**
   * Handle form field changes
   */
  const handleFieldChange = useCallback(<K extends keyof EvaluationFormData>(
    section: K,
    value: EvaluationFormData[K],
  ) => {
    const newFormData = {
      ...formData,
      [section]: value,
    };
    setFormData(newFormData);
    triggerAutoSave(newFormData);
  }, [formData, triggerAutoSave]);

  /**
   * Force save before unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (pendingDataRef.current && canEvaluate) {
        void performSave(pendingDataRef.current);
      }
    };
  }, [canEvaluate, performSave]);

  /**
   * Check if form is complete for submission (Story 5.4)
   * Conclusion is required
   */
  const isFormComplete = (): boolean => {
    return !!formData.conclusion;
  };

  /**
   * Handle open preview modal (Story 5.4: AC1)
   */
  const handleOpenPreview = () => {
    setIsPreviewModalOpen(true);
  };

  /**
   * Handle submit success (Story 5.4: AC3, Story 5.5: AC1)
   */
  const handleSubmitSuccess = () => {
    setEvaluationState(EvaluationState.FINALIZED);
    setSubmittedAt(new Date()); // Story 5.5: Set submitted timestamp
    onSubmitComplete?.();
  };

  /**
   * Handle close preview modal (Story 5.4: AC2)
   */
  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
  };

  /**
   * Render save indicator (Story 5.3: AC2)
   * Shows "Đã lưu vào HH:mm:ss" format
   */
  const renderSaveIndicator = () => {
    if (autoSaveState.status === 'idle') {
      return null;
    }

    if (autoSaveState.status === 'saving') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Đang lưu...</span>
        </div>
      );
    }

    if (autoSaveState.status === 'saved' && autoSaveState.lastSavedAt) {
      const time = new Date(autoSaveState.lastSavedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>Đã lưu vào {time}</span>
        </div>
      );
    }

    if (autoSaveState.status === 'error') {
      return (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>Lưu thất bại. Đang thử lại...</span>
        </div>
      );
    }

    return null;
  };

  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  /**
   * Not authorized state
   */
  if (!canEvaluate) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">
              Không thể đánh giá
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              {isCouncilMember
                ? 'Đề tài không ở trạng thái chờ đánh giá của hội đồng.'
                : 'Chỉ thành viên hội đồng mới có thể đánh giá đề tài này.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm text-red-800 dark:text-red-200">Lỗi</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Evaluation Form (Story 5.3: AC1, Story 5.5: AC1)
   */
  return (
    <div className="space-y-6">
      {/* Header with Save Indicator / Submitted Badge (Story 5.5) */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Phiếu đánh giá đề tài
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Đánh giá các tiêu chí và đưa ra kết luận cho đề tài này.
          </p>
        </div>
        {/* Show SubmittedBadge when FINALIZED, otherwise show save indicator */}
        {isReadOnly && submittedAt ? (
          <SubmittedBadge submittedAt={submittedAt} />
        ) : (
          renderSaveIndicator()
        )}
      </div>

      {/* Form Sections */}
      <div className="space-y-4">
        {/* Scientific Content */}
        <ScoreSection
          title="1. Đánh giá nội dung khoa học"
          score={formData.scientificContent.score}
          comments={formData.scientificContent.comments}
          onScoreChange={(score) =>
            handleFieldChange('scientificContent', { ...formData.scientificContent, score })
          }
          onCommentsChange={(comments) =>
            handleFieldChange('scientificContent', { ...formData.scientificContent, comments })
          }
          disabled={isReadOnly}
        />

        {/* Research Method */}
        <ScoreSection
          title="2. Đánh giá phương pháp nghiên cứu"
          score={formData.researchMethod.score}
          comments={formData.researchMethod.comments}
          onScoreChange={(score) =>
            handleFieldChange('researchMethod', { ...formData.researchMethod, score })
          }
          onCommentsChange={(comments) =>
            handleFieldChange('researchMethod', { ...formData.researchMethod, comments })
          }
          disabled={isReadOnly}
        />

        {/* Feasibility */}
        <ScoreSection
          title="3. Đánh giá tính khả thi"
          score={formData.feasibility.score}
          comments={formData.feasibility.comments}
          onScoreChange={(score) =>
            handleFieldChange('feasibility', { ...formData.feasibility, score })
          }
          onCommentsChange={(comments) =>
            handleFieldChange('feasibility', { ...formData.feasibility, comments })
          }
          disabled={isReadOnly}
        />

        {/* Budget */}
        <ScoreSection
          title="4. Đánh giá kinh phí"
          score={formData.budget.score}
          comments={formData.budget.comments}
          onScoreChange={(score) =>
            handleFieldChange('budget', { ...formData.budget, score })
          }
          onCommentsChange={(comments) =>
            handleFieldChange('budget', { ...formData.budget, comments })
          }
          disabled={isReadOnly}
        />

        {/* Conclusion */}
        <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            5. Kết luận đánh giá
          </h4>
          <div className="space-y-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">Kết luận:</label>
            <div className="flex gap-6">
              <label className={`flex items-center gap-2 ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="conclusion"
                  value="DAT"
                  checked={formData.conclusion === 'DAT'}
                  onChange={() => handleFieldChange('conclusion', 'DAT' as const)}
                  disabled={isReadOnly}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Đạt</span>
              </label>
              <label className={`flex items-center gap-2 ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="conclusion"
                  value="KHONG_DAT"
                  checked={formData.conclusion === 'KHONG_DAT'}
                  onChange={() => handleFieldChange('conclusion', 'KHONG_DAT' as const)}
                  disabled={isReadOnly}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">Không đạt</span>
              </label>
            </div>
          </div>
        </div>

        {/* Other Comments (Optional) - Story 5.5: Disabled when read-only */}
        <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            6. Ý kiến khác (optional)
          </h4>
          <textarea
            value={formData.otherComments || ''}
            onChange={(e) => handleFieldChange('otherComments', e.target.value)}
            placeholder="Nhập ý kiến khác nếu có..."
            rows={3}
            disabled={isReadOnly}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900"
          />
        </div>
      </div>

      {/* Submit Button (Story 5.4) */}
      {evaluationState === EvaluationState.DRAFT && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={!isFormComplete() || autoSaveState.status === 'saving'}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Hoàn tất
          </button>
        </div>
      )}

      {/* Export PDF Button (Story 5.6) - Shown when FINALIZED */}
      {evaluationState === EvaluationState.FINALIZED && (
        <div className="flex justify-center">
          <ExportPdfButton
            proposalId={proposalId}
            isFinalized={isReadOnly}
            proposalCode={proposalCode}
          />
        </div>
      )}

      {/* Footer note */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Phiếu đánh giá sẽ được tự động lưu sau 2 giây kể từ khi bạn thay đổi.
      </div>

      {/* Preview Modal (Story 5.4) */}
      <EvaluationPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        proposalId={proposalId}
        formData={formData}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </div>
  );
}

/**
 * Export convenience type for checking if user is THU_KY_HOI_DONG
 */
export const isCouncilSecretary = (role: string): boolean => {
  return role === 'THU_KY_HOI_DONG';
};

/**
 * Check if user is a council member (includes both secretary and general members)
 * Multi-member Evaluation: Allow HOI_DONG role to evaluate
 */
export const isCouncilMember = (role: string): boolean => {
  return role === 'THU_KY_HOI_DONG' || role === 'HOI_DONG';
};
