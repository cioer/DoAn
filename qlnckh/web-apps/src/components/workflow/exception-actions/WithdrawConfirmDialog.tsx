/**
 * Withdraw Confirm Dialog Component (Story 9.1)
 *
 * Confirmation dialog for withdrawing a proposal before approval.
 * Owner can withdraw proposals before APPROVED state.
 *
 * Features:
 * - Required reason field with MinLength(5) validation
 * - Strong warning message about consequences
 * - Vietnamese localization
 * - Uses UI components (Button, Textarea)
 */

import { useState } from 'react';
import { AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '../../ui';
import { Textarea } from '../../ui';

export interface WithdrawConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
  proposalTitle?: string;
  currentState?: string;
}

export function WithdrawConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  proposalTitle = 'đề tài này',
  currentState,
}: WithdrawConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // MinLength validation: reason must have at least 5 characters if provided
  const isValid = reason.trim().length >= 5;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Lý do phải có ít nhất 5 ký tự');
      return;
    }

    setError(null);

    try {
      await onConfirm(reason.trim());
      setReason(''); // Reset after successful submit
    } catch (err) {
      // Error will be handled by parent component
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-orange-600" />
            </div>
            <h2
              id="withdraw-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Rút hồ sơ đề tài
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn rút <strong>{proposalTitle}</strong> không?
          </p>

          {/* Warning message */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Cảnh báo quan trọng:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Hồ sơ sẽ chuyển sang trạng thái <strong>Đã rút</strong></li>
                <li>Quy trình xét duyệt sẽ bị dừng</li>
                <li>Không thể khôi phục sau khi rút</li>
              </ul>
            </div>
          </div>

          {/* Current state info */}
          {currentState && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Trạng thái hiện tại:</span> {currentState}
              </p>
            </div>
          )}

          {/* Required reason field - using Textarea component */}
          <Textarea
            label="Lý do rút hồ sơ"
            helperText="(tối thiểu 5 ký tự)"
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Nhập lý do rút hồ sơ..."
            rows={3}
            disabled={isSubmitting}
            maxLength={500}
            error={error || undefined}
            state={error ? 'error' : reason.length >= 5 ? 'success' : undefined}
          />
          <div className="flex justify-between mt-1 -mb-4">
            <p className={`text-xs ${reason.length < 5 && reason.length > 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {reason.length >= 5
                ? `✓ Đủ độ dài (${reason.length}/500)`
                : `${reason.length}/500 ký tự (cần ít nhất 5)`}
            </p>
          </div>
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
            disabled={!isValid}
          >
            Xác nhận rút
          </Button>
        </div>
      </div>
    </div>
  );
}
