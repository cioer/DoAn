/**
 * Pause Confirm Dialog Component (Story 9.3)
 *
 * Confirmation dialog for pausing a proposal.
 * Only PHONG_KHCN can pause proposals.
 *
 * Features:
 * - Required reason field with MinLength(5) validation
 * - Optional expected resume date picker
 * - Information about SLA pause behavior
 * - Vietnamese localization
 * - Uses UI components (Button, Textarea, Input)
 */

import { useState } from 'react';
import { AlertCircle, Calendar, PauseCircle } from 'lucide-react';
import { Button } from '../../ui';
import { Input } from '../../ui';
import { Textarea } from '../../ui';

export interface PauseConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, expectedResumeAt?: string) => Promise<void>;
  isSubmitting?: boolean;
  proposalTitle?: string;
  currentState?: string;
}

export function PauseConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  proposalTitle = 'đề tài này',
  currentState,
}: PauseConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [expectedResumeAt, setExpectedResumeAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Validation: reason must have at least 5 characters
  const isValid = reason.trim().length >= 5;

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Lý do phải có ít nhất 5 ký tự');
      return;
    }

    setError(null);

    try {
      await onConfirm(reason.trim(), expectedResumeAt || undefined);
      // Reset after successful submit
      setReason('');
      setExpectedResumeAt('');
    } catch (err) {
      // Error will be handled by parent component
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setExpectedResumeAt('');
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
      aria-labelledby="pause-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <PauseCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <h2
              id="pause-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Tạm dừng đề tài
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn tạm dừng <strong>{proposalTitle}</strong> không?
          </p>

          {/* Info message about SLA */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Lưu ý:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Đếm SLA sẽ bị tạm dừng</li>
                <li>Hồ sơ sẽ được giữ lại bởi Phong KHCN</li>
                <li>Có thể tiếp tục lại sau</li>
              </ul>
            </div>
          </div>

          {/* Current state info */}
          {currentState && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Trạng thái hiện tại:</span> {currentState}
              </p>
            </div>
          )}

          {/* Required reason field - using Textarea component */}
          <Textarea
            label="Lý do tạm dừng"
            helperText="(tối thiểu 5 ký tự)"
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Nhập lý do tạm dừng hồ sơ..."
            rows={2}
            disabled={isSubmitting}
            maxLength={500}
            error={error || undefined}
            state={error ? 'error' : reason.length >= 5 ? 'success' : undefined}
          />
          <p className="text-xs text-gray-500 text-right -mt-4 mb-4">
            {reason.length}/500 ký tự
          </p>

          {/* Optional expected resume date - using Input component */}
          <div>
            <Input
              label="Ngày dự kiến tiếp tục"
              type="date"
              min={today}
              value={expectedResumeAt}
              onChange={(e) => setExpectedResumeAt(e.target.value)}
              disabled={isSubmitting}
              helperText="(tùy chọn) - Nếu để trống, không có ngày dự kiến tiếp tục"
              className="pr-10"
            />
            <Calendar className="absolute right-12 top-[2.35rem] w-4 h-4 text-gray-400 pointer-events-none" />
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
            variant="warning"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!isValid}
          >
            Xác nhận tạm dừng
          </Button>
        </div>
      </div>
    </div>
  );
}
