/**
 * Resume Confirm Dialog Component (Story 9.3)
 *
 * Confirmation dialog for resuming a paused proposal.
 * Only PHONG_KHCN can resume paused proposals.
 *
 * Features:
 * - Shows pre-pause state information
 * - Shows pause reason and expected resume date
 * - Confirmation about SLA recalculation
 * - Vietnamese localization
 * - Uses UI components (Button)
 */

import { Info, PlayCircle } from 'lucide-react';
import { Button } from '../../ui';

export interface PauseInfo {
  reason: string;
  expectedResumeAt?: string | null;
  prePauseState?: string | null;
  pausedAt?: string | null;
}

export interface ResumeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
  proposalTitle?: string;
  pauseInfo?: PauseInfo | null;
}

export function ResumeConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  proposalTitle = 'đề tài này',
  pauseInfo,
}: ResumeConfirmDialogProps) {
  const handleSubmit = async () => {
    try {
      await onConfirm();
    } catch (err) {
      // Error will be handled by parent component
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Chưa xác định';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-5 h-5 text-green-600" />
            </div>
            <h2
              id="resume-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Tiếp tục đề tài
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn tiếp tục <strong>{proposalTitle}</strong> không?
          </p>

          {/* Pause info display */}
          {pauseInfo && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Thông tin tạm dừng:</p>

              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-gray-500">Lý do:</span>
                <span className="text-gray-900">{pauseInfo.reason}</span>

                {pauseInfo.pausedAt && (
                  <>
                    <span className="text-gray-500">Ngày tạm dừng:</span>
                    <span className="text-gray-900">{formatDate(pauseInfo.pausedAt)}</span>
                  </>
                )}

                {pauseInfo.expectedResumeAt && (
                  <>
                    <span className="text-gray-500">Ngày dự kiến:</span>
                    <span className="text-gray-900">{formatDate(pauseInfo.expectedResumeAt)}</span>
                  </>
                )}

                {pauseInfo.prePauseState && (
                  <>
                    <span className="text-gray-500">Trạng thái trước:</span>
                    <span className="text-gray-900">{pauseInfo.prePauseState}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Info message about SLA recalculation */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Sau khi tiếp tục:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Đề tài sẽ quay lại trạng thái trước khi tạm dừng</li>
                <li>Thời gian tạm dừng sẽ được cộng vào hạn SLA</li>
                <li>Người xử lý sẽ được khôi phục</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer - using Button components */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Xác nhận tiếp tục
          </Button>
        </div>
      </div>
    </div>
  );
}
