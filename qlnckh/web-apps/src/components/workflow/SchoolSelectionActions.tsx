/**
 * School Selection Actions Component (Story 5.1)
 *
 * Displays action buttons for PKHCN when proposal is in SCHOOL_SELECTION_REVIEW state.
 * This is the queue where PKHCN sees proposals that need council assignment.
 *
 * Story 5.1: School Selection Queue
 * AC2: UI displays button "Phân bổ hội đồng" (primary) + "Yêu cầu sửa" (secondary)
 */

import { useState } from 'react';
import {
  Users,
  AlertCircle,
  Loader2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import {
  workflowApi,
  generateIdempotencyKey,
  RETURN_REASON_CODES,
  RETURN_REASON_LABELS,
  CANONICAL_SECTIONS,
} from '../../lib/api/workflow';

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
export interface SchoolSelectionActionsProps {
  proposalId: string;
  proposalState: string;
  currentUser: UserInfo;
  onActionSuccess?: () => void;
  onActionError?: (error: { code: string; message: string }) => void;
}

/**
 * Story 5.1: AC2 - Can Assign Council check
 * Returns true if user has PHONG_KHCN role
 * AND proposal is in SCHOOL_SELECTION_REVIEW state
 */
function canAssignCouncil(proposalState: string, userRole: string): boolean {
  return proposalState === 'SCHOOL_SELECTION_REVIEW' && userRole === 'PHONG_KHCN';
}

/**
 * Story 5.1: AC2 - Can Return check for PKHCN
 * Returns true if user has PHONG_KHCN role
 * AND proposal is in SCHOOL_SELECTION_REVIEW state
 */
function canReturnSchoolSelection(proposalState: string, userRole: string): boolean {
  return proposalState === 'SCHOOL_SELECTION_REVIEW' && userRole === 'PHONG_KHCN';
}

/**
 * Return Dialog Component for PKHCN (Story 5.1)
 *
 * Displays a dialog with:
 * - Reason code dropdown (required)
 * - Section checkboxes (required, min 1)
 * - Comment textarea (optional)
 */
interface ReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    reason: string;
    reasonCode: string;
    reasonSections: string[];
  }) => Promise<void>;
  isSubmitting?: boolean;
}

function ReturnDialog({ isOpen, onClose, onSubmit, isSubmitting }: ReturnDialogProps) {
  const [reasonCode, setReasonCode] = useState<string>('');
  const [revisionSections, setRevisionSections] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Validation: reasonCode required and at least 1 section selected
  const isValid = reasonCode && revisionSections.length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Vui lòng chọn lý do và ít nhất một phần cần sửa');
      return;
    }

    setError(null);

    // Combine reason code with comment for the reason field
    const reasonText = comment || RETURN_REASON_LABELS[reasonCode as keyof typeof RETURN_REASON_LABELS];

    await onSubmit({
      reason: reasonText,
      reasonCode,
      reasonSections: revisionSections,
    });

    // Reset form after successful submit
    setReasonCode('');
    setRevisionSections([]);
    setComment('');
  };

  const toggleSection = (sectionId: string) => {
    setRevisionSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <h2
            id="return-dialog-title"
            className="text-lg font-semibold text-gray-900"
          >
            Yêu cầu sửa hồ sơ
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Chọn lý do và các phần cần sửa để gửi về cho giảng viên
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

          {/* Reason code dropdown (required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lý do trả về <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">-- Chọn lý do --</option>
                {Object.entries(RETURN_REASON_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Section checkboxes (required, min 1) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phần cần sửa <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-1">(ít nhất một phần)</span>
            </label>
            <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
              {CANONICAL_SECTIONS.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={revisionSections.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{section.label}</span>
                </label>
              ))}
            </div>
            {revisionSections.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Đã chọn: {revisionSections.length} phần
              </p>
            )}
          </div>

          {/* Comment textarea (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú thêm
              <span className="text-xs text-gray-500 ml-1">(tùy chọn)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập ghi chú chi tiết về các vấn đề cần sửa..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Gửi yêu cầu'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * School Selection Actions Component (Story 5.1)
 *
 * Displays action buttons for PKHCN when proposal is in SCHOOL_SELECTION_REVIEW state.
 * This is the queue where PKHCN sees proposals that need council assignment.
 *
 * AC2: UI displays button "Phân bổ hội đồng" (primary) + "Yêu cầu sửa" (secondary)
 */
export function SchoolSelectionActions({
  proposalId,
  proposalState,
  currentUser,
  onActionSuccess,
  onActionError,
}: SchoolSelectionActionsProps) {
  const [isReturning, setIsReturning] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const showAssignCouncilButton = canAssignCouncil(proposalState, currentUser.role);
  const showReturnButton = canReturnSchoolSelection(proposalState, currentUser.role);

  /**
   * Execute return action (Story 5.1)
   * Transitions SCHOOL_SELECTION_REVIEW → CHANGES_REQUESTED
   * Uses existing workflowApi.returnFacultyReview method
   * Note: Idempotency key is handled by the API interceptor
   */
  const handleReturn = async (data: {
    reason: string;
    reasonCode: string;
    reasonSections: string[];
  }) => {
    setIsReturning(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      // Use the generic transitionState method for SCHOOL_SELECTION_REVIEW return
      // The return target will be SCHOOL_SELECTION_REVIEW so PI returns to PKHCN queue
      // Note: For Epic 5, we need to ensure return_target_state is set correctly
      await workflowApi.returnFacultyReview(
        proposalId,
        idempotencyKey,
        data.reason,
        data.reasonCode,
        data.reasonSections,
      );

      setShowReturnDialog(false);

      if (onActionSuccess) {
        onActionSuccess();
      }
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

  // Hide component if user doesn't have permissions
  if (!showAssignCouncilButton && !showReturnButton) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Story 5.1: AC2 - "Yêu cầu sửa" button (secondary destructive) */}
        {showReturnButton && (
          <button
            onClick={() => setShowReturnDialog(true)}
            disabled={isReturning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            aria-label="Yêu cầu sửa hồ sơ"
          >
            {isReturning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Yêu cầu sửa</span>
              </>
            )}
          </button>
        )}

        {/* Story 5.1: AC2 - "Phân bổ hội đồng" button (primary) */}
        {showAssignCouncilButton && (
          <button
            onClick={() => {
              // Story 5.2 will implement the council assignment dialog
              // For now, show a placeholder message
              setError({ code: 'NOT_IMPLEMENTED', message: 'Tính năng phân bổ hội đồng sẽ được triển khai trong Story 5.2' });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Phân bổ hội đồng xét duyệt"
          >
            <Users className="w-4 h-4" />
            <span>Phân bổ hội đồng</span>
          </button>
        )}
      </div>

      {/* Error message display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
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

      {/* Return Dialog (Story 5.1) */}
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
export default SchoolSelectionActions;
