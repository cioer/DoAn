/**
 * Council Review Approval Actions Component (BAN_GIAM_HOC)
 *
 * Displays high-level decision buttons for BAN_GIAM_HOC when proposal
 * is in OUTLINE_COUNCIL_REVIEW state after council evaluation.
 *
 * BAN_GIAM_HOC (Ban Giám học) is the highest decision-making authority:
 * - Approve button: Transitions to APPROVED (final approval)
 * - Return button: Transitions to CHANGES_REQUESTED
 * - Reject button: Available via ExceptionActions (only BAN_GIAM_HOC can reject at this stage)
 *
 * This component uses distinct visual styling to reflect the authoritative
 * nature of BAN_GIAM_HOC decisions.
 */

import { useState } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Crown,
} from 'lucide-react';
import {
  workflowApi,
  generateIdempotencyKey,
} from '../../lib/api/workflow';
import { Button } from '../ui';

/**
 * User role from JWT token
 */
export interface UserInfo {
  id: string;
  role: string;
  facultyId?: string | null;
}

/**
 * Component props
 */
export interface CouncilReviewApprovalActionsProps {
  proposalId: string;
  proposalState: string;
  currentUser: UserInfo;
  onActionSuccess?: () => void;
  onActionError?: (error: { code: string; message: string }) => void;
}

/**
 * Check if user can perform BAN_GIAM_HOC council review actions
 * Returns true if user has BAN_GIAM_HOC role
 * AND proposal is in OUTLINE_COUNCIL_REVIEW state
 */
function canApproveCouncil(proposalState: string, userRole: string): boolean {
  return proposalState === 'OUTLINE_COUNCIL_REVIEW' && userRole === 'BAN_GIAM_HOC';
}

/**
 * Return Dialog Component for BAN_GIAM_HOC
 *
 * Displays a simplified dialog with:
 * - Reason textarea (required)
 * - Uses distinctive styling for high-level decisions
 */
interface ReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

function ReturnDialog({ isOpen, onClose, onSubmit, isSubmitting }: ReturnDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Validation: reason is required
  const isValid = reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Vui lòng nhập lý do trả về');
      return;
    }

    setError(null);
    await onSubmit(reason.trim());
    setReason('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="council-return-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-amber-200">
        {/* Header with distinctive BAN_GIAM_HOC styling */}
        <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-600" />
            <h2
              id="council-return-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Quyết định Ban Giám học
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Đề tài sẽ được trả về cho giảng viên để hoàn thiện
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Reason textarea (required) */}
          <div>
            <label htmlFor="council-return-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Lý do trả về <span className="text-red-500">*</span>
            </label>
            <textarea
              id="council-return-reason"
              placeholder="Nhập lý do yêu cầu giảng viên hoàn thiện đề tài..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lý do này sẽ được hiển thị cho giảng viên để họ biết những gì cần hoàn thiện.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isSubmitting ? 'Đang xử lý...' : 'Yêu cầu hoàn thiện'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Council Review Approval Actions Component (BAN_GIAM_HOC)
 *
 * Displays high-level decision buttons for BAN_GIAM_HOC when proposal
 * is in OUTLINE_COUNCIL_REVIEW state.
 *
 * Only shown for users with BAN_GIAM_HOC role.
 * Uses distinctive styling to reflect authoritative decision-making.
 */
export function CouncilReviewApprovalActions({
  proposalId,
  proposalState,
  currentUser,
  onActionSuccess,
  onActionError,
}: CouncilReviewApprovalActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showButtons = canApproveCouncil(proposalState, currentUser?.role || '');

  /**
   * Execute approve action
   * Transitions OUTLINE_COUNCIL_REVIEW → APPROVED
   * This is the FINAL APPROVAL - proposal is now approved
   */
  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.approveCouncilReview(
        proposalId,
        idempotencyKey,
      );

      setShowApproveConfirm(false);
      setSuccessMessage('Đã phê duyệt đề tài thành công');

      if (onActionSuccess) {
        onActionSuccess();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { success: false; error: { code: string; message: string } } };
      };

      const errorData =
        apiError.response?.data?.error || { code: 'UNKNOWN_ERROR', message: 'Lỗi không xác định' };
      setError(errorData);

      if (onActionError) {
        onActionError(errorData);
      }
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Execute return action
   * Transitions OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED
   */
  const handleReturn = async (reason: string) => {
    setIsReturning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.returnCouncilReview(
        proposalId,
        idempotencyKey,
        reason,
      );

      setShowReturnDialog(false);
      setSuccessMessage('Đã yêu cầu hoàn thiện đề tài');

      if (onActionSuccess) {
        onActionSuccess();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { success: false; error: { code: string; message: string } } };
      };

      const errorData =
        apiError.response?.data?.error || { code: 'UNKNOWN_ERROR', message: 'Lỗi không xác định' };
      setError(errorData);

      if (onActionError) {
        onActionError(errorData);
      }
    } finally {
      setIsReturning(false);
    }
  };

  // Hide component if user doesn't have BAN_GIAM_HOC permissions
  if (!showButtons) {
    return null;
  }

  return (
    <>
      {/* Main action buttons with distinctive BAN_GIAM_HOC styling */}
      <div className="flex items-center gap-3">
        {/* Return button */}
        <button
          onClick={() => setShowReturnDialog(true)}
          disabled={isReturning}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          aria-label="Yêu cầu hoàn thiện đề tài"
        >
          <RotateCcw className="w-4 h-4" />
          Yêu cầu hoàn thiện
        </button>

        {/* Approve button - distinctive gold/amber styling for BAN_GIAM_HOC */}
        <button
          onClick={() => setShowApproveConfirm(true)}
          disabled={isApproving}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md hover:from-amber-600 hover:to-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium shadow-md"
          aria-label="Phê duyệt đề tài (Quyết định cuối cùng)"
        >
          <ShieldCheck className="w-4 h-4" />
          Phê duyệt
        </button>
      </div>

      {/* Error message display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Lỗi</p>
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Success message display */}
      {successMessage && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Thành công</p>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      {showApproveConfirm && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="council-approve-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 border-green-200">
            {/* Header with success/approval styling */}
            <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3
                  id="council-approve-confirm-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Xác nhận phê duyệt
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Đây là quyết định cuối cùng từ Ban Giám học
              </p>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                Sau khi phê duyệt, đề tài sẽ chuyển sang trạng thái <strong>Đã duyệt</strong> và được thông báo nghiệm thu.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Lưu ý:</strong> Hành động này không thể hoàn tác. Vui lòng xem xét kỹ trước khi xác nhận.
                </p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Lỗi</p>
                    <p className="text-sm text-red-700">{error.message}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApproveConfirm(false);
                  setError(null);
                }}
                disabled={isApproving}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md hover:from-amber-600 hover:to-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {isApproving ? 'Đang xử lý...' : 'Xác nhận phê duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Dialog */}
      <ReturnDialog
        isOpen={showReturnDialog}
        onClose={() => {
          setShowReturnDialog(false);
          setError(null);
        }}
        onSubmit={handleReturn}
        isSubmitting={isReturning}
      />
    </>
  );
}

/**
 * Default export for convenience
 */
export default CouncilReviewApprovalActions;
