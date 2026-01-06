/**
 * Proposal Actions Component (Story 4.1)
 *
 * Displays action buttons for proposal workflow based on:
 * - Current proposal state
 * - User's role (RBAC)
 *
 * AC1 & AC2: "Duyệt hồ sơ" button shown only for QUAN_LY_KHOA/THU_KY_KHOA
 *            when proposal state = FACULTY_REVIEW
 */

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { workflowApi, generateIdempotencyKey } from '@/lib/api/workflow';

/**
 * User role from JWT token
 */
export interface UserInfo {
  id: string;
  role: string;
  facultyId?: string | null;
}

/**
 * Proposal state from backend
 */
export interface ProposalActionsProps {
  proposalId: string;
  proposalState: string;
  currentUser: UserInfo;
  onActionSuccess?: () => void;
  onActionError?: (error: { code: string; message: string }) => void;
}

/**
 * Story 4.1: AC1 - Can Approve check
 * Returns true if user has QUAN_LY_KHOA or THU_KY_KHOA role
 * AND proposal is in FACULTY_REVIEW state
 */
function canApprove(proposalState: string, userRole: string): boolean {
  const APPROVAL_ROLES = ['QUAN_LY_KHOA', 'THU_KY_KHOA'];
  return (
    proposalState === 'FACULTY_REVIEW' && APPROVAL_ROLES.includes(userRole)
  );
}

/**
 * Proposal Actions Component
 *
 * Displays action buttons for workflow transitions
 * Story 4.1: Faculty Approve Action
 */
export function ProposalActions({
  proposalId,
  proposalState,
  currentUser,
  onActionSuccess,
  onActionError,
}: ProposalActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  const showApproveButton = canApprove(proposalState, currentUser.role);

  /**
   * Story 4.1: AC3 & AC5 - Execute approve action
   * Transitions FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW
   * Includes idempotency key for anti-double-submit
   */
  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      const result = await workflowApi.approveFacultyReview(
        proposalId,
        idempotencyKey,
      );

      // Success: state transitioned
      setShowConfirmDialog(false);

      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (err: unknown) {
      // Handle error responses
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

  // AC2: Button hidden for wrong role/state
  if (!showApproveButton) {
    return null;
  }

  return (
    <>
      {/* AC1: Primary "Duyệt hồ sơ" button */}
      <button
        onClick={() => setShowConfirmDialog(true)}
        disabled={isApproving}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Duyệt hồ sơ đề tài"
      >
        {isApproving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Duyệt hồ sơ</span>
          </>
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="approve-confirm-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Xác nhận duyệt hồ sơ
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn duyệt hồ sơ này? Sau khi duyệt, đề tài sẽ được
              chuyển lên Phòng KHCN để phân bổ Hội đồng xét duyệt.
            </p>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Lỗi</p>
                  <p className="text-sm text-red-700">{error.message}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setError(null);
                }}
                disabled={isApproving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận duyệt'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
