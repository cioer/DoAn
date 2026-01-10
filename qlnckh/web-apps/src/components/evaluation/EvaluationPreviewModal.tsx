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
import { CheckCircle } from 'lucide-react';
import { EvaluationFormData, generateIdempotencyKey, evaluationApi } from '../../lib/api/evaluations';
import { Dialog, DialogBody, DialogFooter, Button, Alert } from '../ui';

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
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="Xem trước khi nộp"
      size="lg"
    >
      <DialogBody className="flex-1 overflow-y-auto">
        {renderPreviewContent()}

        {/* Error Message - using Alert component */}
        {errorMessage && (
          <Alert variant="error" className="mt-4">
            {errorMessage}
          </Alert>
        )}

        {/* Success Message - using Alert component */}
        {submitState === 'success' && (
          <Alert variant="success" className="mt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Đã nộp thành công!</span>
            </div>
          </Alert>
        )}
      </DialogBody>

      <DialogFooter>
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={submitState === 'submitting' || submitState === 'success'}
        >
          Quay lại sửa
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={submitState === 'submitting'}
          disabled={submitState === 'success'}
          leftIcon={submitState === 'success' ? <CheckCircle className="h-4 w-4" /> : undefined}
        >
          {submitState === 'submitting' ? 'Đang nộp...' : submitState === 'success' ? 'Đã nộp' : 'Xác nhận và nộp'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
