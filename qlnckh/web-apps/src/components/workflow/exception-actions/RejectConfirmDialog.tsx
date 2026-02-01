/**
 * Reject Confirm Dialog Component (Story 9.2)
 *
 * Confirmation dialog for rejecting a proposal.
 * Decision makers can reject proposals with a reason code and comment.
 *
 * Features:
 * - Required reason code dropdown (enum)
 * - Required comment field with MinLength(10) validation
 * - Character counter for comment field
 * - Vietnamese localization
 * - Uses UI components (Button, Select, Textarea)
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Ban } from 'lucide-react';
import { Button } from '../../ui';
import { Select, SelectOption, Textarea } from '../../ui';
import { REJECT_REASON_LABELS, RejectReasonCode } from '../../../lib/api/workflow';
import { useDynamicZIndex } from '../../../lib/contexts/ZIndexContext';

export interface RejectConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonCode: RejectReasonCode, comment: string) => Promise<void>;
  isSubmitting?: boolean;
  proposalTitle?: string;
}

export function RejectConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  proposalTitle = 'đề tài này',
}: RejectConfirmDialogProps) {
  const [reasonCode, setReasonCode] = useState<RejectReasonCode | ''>('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Dynamic z-index - dialogs opened later appear on top
  const { style: zIndexStyle } = useDynamicZIndex(isOpen);

  // Validation: reasonCode required + comment MinLength(10)
  const isValid = reasonCode && comment.trim().length >= 10;

  const handleSubmit = async () => {
    if (!reasonCode) {
      setError('Vui lòng chọn lý do từ chối');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Nội dung giải thích phải có ít nhất 10 ký tự');
      return;
    }

    setError(null);

    try {
      await onConfirm(reasonCode, comment.trim());
      // Reset after successful submit
      setReasonCode('');
      setComment('');
    } catch (err) {
      // Error will be handled by parent component
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReasonCode('');
      setComment('');
      setError(null);
      onClose();
    }
  };

  // Build select options
  const reasonOptions: SelectOption[] = Object.entries(REJECT_REASON_LABELS).map(
    ([code, label]) => ({ value: code, label })
  );

  if (!isOpen) return null;

  // Use portal to render at body level, outside any stacking context
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      style={zIndexStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <h2
              id="reject-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Từ chối đề tài
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn từ chối <strong>{proposalTitle}</strong> không?
          </p>

          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              Sau khi từ chối, đề tài sẽ chuyển sang trạng thái <strong>Đã từ chối</strong> và quy trình xét duyệt sẽ kết thúc.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Reason code dropdown - using Select component */}
          <Select
            label="Lý do từ chối"
            required
            placeholder="-- Chọn lý do --"
            options={reasonOptions}
            value={reasonCode}
            onChange={(e) => {
              setReasonCode(e.target.value as RejectReasonCode);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          />

          {/* Comment textarea - using Textarea component */}
          <Textarea
            label="Giải thích chi tiết"
            helperText="(tối thiểu 10 ký tự)"
            required
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Nhập giải thích chi tiết về lý do từ chối..."
            rows={4}
            disabled={isSubmitting}
            maxLength={500}
            state={comment.length >= 10 ? 'success' : undefined}
          />
          <div className="flex justify-between mt-1 -mb-4">
            <p className={`text-xs ${comment.length < 10 && comment.length > 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {comment.length >= 10
                ? `✓ Đủ độ dài (${comment.length}/500)`
                : `${comment.length}/500 ký tự (cần ít nhất 10)`}
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
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
