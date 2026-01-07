/**
 * Evaluation Preview Modal Component (Story 5.4)
 *
 * Provides preview of evaluation form before final submission.
 * Features:
 * - Render evaluation form data as HTML/CSS preview (WYSIWYG for PDF)
 * - Force light theme (print-ready)
 * - Display all sections with scores and comments
 * - "Xác nhận và nộp" (primary) and "Quay lại sửa" (secondary) buttons
 * - Generate idempotency key on modal open
 * - Handle submit with success/error
 *
 * Story 5.4: AC1 - Preview Modal Display
 * Story 5.4: AC2 - Cancel Review
 * Story 5.4: AC3 - Submit Evaluation
 */

import { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { EvaluationFormData, generateIdempotencyKey, evaluationApi } from '../../lib/api/evaluations';

export interface EvaluationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  formData: EvaluationFormData;
  onSubmitSuccess?: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Score Visualization Component (Story 5.4)
 * Displays score as filled/empty dots
 */
function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            i <= score ? 'bg-gray-800' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Evaluation Preview Modal Component (Story 5.4)
 */
export function EvaluationPreviewModal({
  isOpen,
  onClose,
  proposalId,
  formData,
  onSubmitSuccess,
}: EvaluationPreviewModalProps) {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  /**
   * Handle submit action (Story 5.4: AC3)
   */
  const handleSubmit = async () => {
    setSubmitState('submitting');
    setErrorMessage(null);

    try {
      const result = await evaluationApi.submitEvaluation(proposalId, idempotencyKey);

      setSubmitState('success');

      // Notify parent of success
      onSubmitSuccess?.();

      // Close modal after brief success display
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const error = err as Error & { response?: { data?: { error?: { message?: string } } } };
      setErrorMessage(
        error.response?.data?.error?.message ||
          error.message ||
          'Không thể nộp đánh giá. Vui lòng thử lại.',
      );
      setSubmitState('error');
    }
  };

  /**
   * Handle cancel action (Story 5.4: AC2)
   */
  const handleCancel = () => {
    onClose();
  };

  /**
   * Render preview content (Story 5.4: AC1)
   * Uses same HTML structure as final PDF (Story 5.6) for WYSIWYG consistency
   * Force light theme via className overrides
   */
  const renderPreviewContent = () => {
    return (
      <div className="bg-white text-black p-6 space-y-4 min-h-[500px]">
        <div className="border-b-2 border-black pb-4">
          <h2 className="text-xl font-bold text-center">PHIẾU ĐÁNH GIÁ ĐỀ TÀI</h2>
        </div>

        {/* Scientific Content */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm border-b border-gray-300 pb-1">
            1. Đánh giá nội dung khoa học
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span>Điểm:</span>
            <ScoreDots score={formData.scientificContent.score} />
            <span className="font-medium">{formData.scientificContent.score}/5</span>
          </div>
          <p className="text-sm">
            <span className="font-medium">Nhận xét:</span>{' '}
            {formData.scientificContent.comments || 'Không có'}
          </p>
        </div>

        {/* Research Method */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm border-b border-gray-300 pb-1">
            2. Đánh giá phương pháp nghiên cứu
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span>Điểm:</span>
            <ScoreDots score={formData.researchMethod.score} />
            <span className="font-medium">{formData.researchMethod.score}/5</span>
          </div>
          <p className="text-sm">
            <span className="font-medium">Nhận xét:</span>{' '}
            {formData.researchMethod.comments || 'Không có'}
          </p>
        </div>

        {/* Feasibility */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm border-b border-gray-300 pb-1">
            3. Đánh giá tính khả thi
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span>Điểm:</span>
            <ScoreDots score={formData.feasibility.score} />
            <span className="font-medium">{formData.feasibility.score}/5</span>
          </div>
          <p className="text-sm">
            <span className="font-medium">Nhận xét:</span>{' '}
            {formData.feasibility.comments || 'Không có'}
          </p>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm border-b border-gray-300 pb-1">
            4. Đánh giá kinh phí
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span>Điểm:</span>
            <ScoreDots score={formData.budget.score} />
            <span className="font-medium">{formData.budget.score}/5</span>
          </div>
          <p className="text-sm">
            <span className="font-medium">Nhận xét:</span>{' '}
            {formData.budget.comments || 'Không có'}
          </p>
        </div>

        {/* Other Comments (if provided) */}
        {formData.otherComments && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm border-b border-gray-300 pb-1">
              5. Ý kiến khác
            </h3>
            <p className="text-sm">{formData.otherComments}</p>
          </div>
        )}

        {/* Conclusion */}
        <div className="space-y-2 border-t-2 border-black pt-3">
          <h3 className="font-semibold text-sm">KẾT LUẬN</h3>
          <p className="text-lg font-bold">
            {formData.conclusion === 'DAT' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
          </p>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-gray-100">
            Xem trước khi nộp
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Force light theme for PDF preview */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderPreviewContent()}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-red-800 dark:text-red-200">
                    Lỗi
                  </h4>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {submitState === 'success' && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Đã nộp thành công!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitState === 'submitting' || submitState === 'success'}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Quay lại sửa
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitState === 'submitting' || submitState === 'success'}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitState === 'submitting' ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang nộp...
              </>
            ) : submitState === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Đã nộp
              </>
            ) : (
              'Xác nhận và nộp'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
