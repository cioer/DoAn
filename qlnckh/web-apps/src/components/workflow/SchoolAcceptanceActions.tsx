/**
 * School Acceptance Actions Component (BAN_GIAM_HOC)
 *
 * Displays final acceptance decision buttons for BAN_GIAM_HOC when proposal
 * is in SCHOOL_ACCEPTANCE_REVIEW state for final handover acceptance.
 *
 * BAN_GIAM_HOC (Ban Giám học) is the highest decision-making authority:
 * - Accept button: Transitions to HANDOVER (final acceptance - project completed)
 * - Return button: Transitions to CHANGES_REQUESTED
 *
 * This component uses distinctive visual styling to reflect the authoritative
 * nature of BAN_GIAM_HOC final acceptance decisions.
 */

import { useState } from 'react';
import {
  CheckCircle,
  RotateCcw,
  AlertCircle,
  Crown,
  Package,
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
export interface SchoolAcceptanceActionsProps {
  proposalId: string;
  proposalState: string;
  currentUser: UserInfo;
  onActionSuccess?: () => void;
  onActionError?: (error: { code: string; message: string }) => void;
}

/**
 * Check if user can perform BAN_GIAM_HOC school acceptance actions
 * Returns true if user has BAN_GIAM_HOC or BGH role
 * AND proposal is in SCHOOL_ACCEPTANCE_REVIEW state
 */
function canAcceptSchool(proposalState: string, userRole: string): boolean {
  return proposalState === 'SCHOOL_COUNCIL_ACCEPTANCE_REVIEW' &&
         (userRole === 'BAN_GIAM_HOC' || userRole === 'BGH');
}

/**
 * Return Dialog Component for BAN_GIAM_HOC at School Acceptance stage
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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-return-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-amber-200">
        {/* Header with distinctive BAN_GIAM_HOC styling */}
        <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-600" />
            <h2
              id="school-return-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              Quyết định Ban Giám học
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Đề tài sẽ được trả về để hoàn thiện trước khi nghiệm thu cuối cùng
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
            <label htmlFor="school-return-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Lý do trả về <span className="text-red-500">*</span>
            </label>
            <textarea
              id="school-return-reason"
              placeholder="Nhập lý do yêu cầu hoàn thiện trước khi nghiệm thu..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lý do này sẽ được hiển thị để hoàn thiện các vấn đề trước khi nghiệm thu.
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
 * School Acceptance Actions Component (BAN_GIAM_HOC)
 *
 * Displays final acceptance decision buttons for BAN_GIAM_HOC when proposal
 * is in SCHOOL_ACCEPTANCE_REVIEW state.
 *
 * Only shown for users with BAN_GIAM_HOC role.
 * Uses distinctive styling to reflect authoritative decision-making.
 */
export function SchoolAcceptanceActions({
  proposalId,
  proposalState,
  currentUser,
  onActionSuccess,
  onActionError,
}: SchoolAcceptanceActionsProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showButtons = canAcceptSchool(proposalState, currentUser?.role || '');

  /**
   * Execute accept action
   * Transitions SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
   * This is the FINAL ACCEPTANCE - project is complete
   */
  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.acceptSchoolReview(
        proposalId,
        idempotencyKey,
      );

      setShowAcceptConfirm(false);
      setSuccessMessage('Đã nghiệm thu thành công. Đề tài đã hoàn thành!');

      if (onActionSuccess) {
        onActionSuccess();
      }

      // Clear success message after 5 seconds (longer for final acceptance)
      setTimeout(() => setSuccessMessage(null), 5000);
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
      setIsAccepting(false);
    }
  };

  /**
   * Execute return action
   * Transitions SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED
   */
  const handleReturn = async (reason: string) => {
    setIsReturning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.returnSchoolReview(
        proposalId,
        idempotencyKey,
        reason,
      );

      setShowReturnDialog(false);
      setSuccessMessage('Đã yêu cầu hoàn thiện trước khi nghiệm thu');

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
          aria-label="Yêu cầu hoàn thiện trước khi nghiệm thu"
        >
          <RotateCcw className="w-4 h-4" />
          Yêu cầu hoàn thiện
        </button>

        {/* Accept button - distinctive green/emerald styling for final acceptance */}
        <button
          onClick={() => setShowAcceptConfirm(true)}
          disabled={isAccepting}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-md hover:from-emerald-600 hover:to-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium shadow-md"
          aria-label="Nghiệm thu đề tài (Quyết định cuối cùng)"
        >
          <Package className="w-4 h-4" />
          Nghiệm thu
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
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
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

      {/* Accept Confirmation Dialog */}
      {showAcceptConfirm && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="school-accept-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 border-emerald-200">
            {/* Header with success/acceptance styling */}
            <div className="p-6 border-b bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3
                  id="school-accept-confirm-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Xác nhận nghiệm thu
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Đây là quyết định nghiệm thu cuối cùng từ Ban Giám học
              </p>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                Sau khi nghiệm thu, đề tài sẽ chuyển sang trạng thái <strong>Bàn giao</strong>.
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Đề tài được xác nhận hoàn thành
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
                  <Package className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Bắt đầu quy trình bàn giao kết quả nghiên cứu
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
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
                  setShowAcceptConfirm(false);
                  setError(null);
                }}
                disabled={isAccepting}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-md hover:from-emerald-600 hover:to-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                {isAccepting ? 'Đang xử lý...' : 'Xác nhận nghiệm thu'}
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
export default SchoolAcceptanceActions;
