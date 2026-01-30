/**
 * Cancel Confirm Dialog Component (Story 9.1)
 *
 * Confirmation dialog for canceling a DRAFT proposal.
 * Owner can cancel proposals in DRAFT state.
 *
 * Features:
 * - Simple confirmation with optional reason field
 * - Warning message about consequences
 * - Vietnamese localization
 * - Uses UI components (Button, Textarea)
 */

import { useState } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { Button } from '../../ui';
import { Textarea } from '../../ui';

export interface CancelConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  isSubmitting?: boolean;
  proposalTitle?: string;
}

export function CancelConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  proposalTitle = 'đề tài này',
}: CancelConfirmDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    await onConfirm(reason || undefined);
    setReason(''); // Reset after submit
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <h2
              id="cancel-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Hủy bỏ đề tài
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn hủy <strong>{proposalTitle}</strong> không?
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Sau khi hủy, đề tài sẽ chuyển sang trạng thái <strong>Đã hủy</strong> và không thể khôi phục.
            </p>
          </div>

          {/* Optional reason field - using Textarea component */}
          <Textarea
            label="Lý do hủy"
            helperText="(tùy chọn)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy đề tài..."
            rows={2}
            disabled={isSubmitting}
            maxLength={500}
            className="text-right"
          />
          <p className="text-xs text-gray-500 text-right -mt-4 mb-4">
            {reason.length}/500 ký tự
          </p>
        </div>

        {/* Footer - using Button components */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Xác nhận hủy
          </Button>
        </div>
      </div>
    </div>
  );
}
