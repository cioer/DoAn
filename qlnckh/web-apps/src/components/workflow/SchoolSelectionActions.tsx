/**
 * School Selection Actions Component (Story 5.1)
 *
 * Displays action buttons for PKHCN when proposal is in SCHOOL_SELECTION_REVIEW state.
 * This is the queue where PKHCN sees proposals that need council assignment.
 *
 * Story 5.1: School Selection Queue
 * AC2: UI displays button "Phân bổ hội đồng" (primary) + "Yêu cầu sửa" (secondary)
 *
 * Story 5.2: Council Assignment Integration
 * - "Phân bổ hội đồng" button opens CouncilAssignmentDialog
 * - Uses UI components (Button, Select, Textarea)
 */

import { useState } from 'react';
import {
  Users,
  AlertCircle,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import {
  workflowApi,
  generateIdempotencyKey,
  RETURN_REASON_LABELS,
  CANONICAL_SECTIONS,
  TransitionResult,
} from '../../lib/api/workflow';
import { Button } from '../ui';
import { Select, SelectOption, Textarea } from '../ui';
import { CouncilAssignmentDialog } from './CouncilAssignmentDialog';

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
 * - Uses UI components (Button, Select, Textarea)
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

  // Build select options for return reasons
  const reasonOptions: SelectOption[] = Object.entries(RETURN_REASON_LABELS).map(
    ([code, label]) => ({ value: code, label })
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
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

          {/* Reason code dropdown (required) - using Select component */}
          <Select
            label="Lý do trả về"
            required
            placeholder="-- Chọn lý do --"
            options={reasonOptions}
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
          />

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

          {/* Comment textarea (optional) - using Textarea component */}
          <Textarea
            label="Ghi chú thêm"
            helperText="(tùy chọn)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nhập ghi chú chi tiết về các vấn đề cần sửa..."
            rows={3}
          />
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
            variant="destructive"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!isValid}
          >
            Gửi yêu cầu
          </Button>
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
 * - Uses UI components (Button)
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
  const [showCouncilDialog, setShowCouncilDialog] = useState(false);
  const [isAssigningCouncil, setIsAssigningCouncil] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  /**
   * Execute council assignment action (Story 5.2: AC2)
   * Transitions SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW
   * Calls assign-council API with idempotency key
   */
  const handleAssignCouncil = async (data: {
    councilId: string;
    secretaryId: string;
    memberIds?: string[];
    idempotencyKey: string;
  }) => {
    setIsAssigningCouncil(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Call the real API (Story 5.2: AC2)
      const result: TransitionResult = await workflowApi.assignCouncil(
        proposalId,
        data.councilId,
        data.secretaryId,
        data.memberIds,
        data.idempotencyKey,
      );

      setShowCouncilDialog(false);

      // Show success message (Story 5.2: AC3 - Secretary Notification Mock)
      setSuccessMessage(`Đã phân bổ hội đồng thành công`);

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
      setIsAssigningCouncil(false);
    }
  };

  // Hide component if user doesn't have permissions
  if (!showAssignCouncilButton && !showReturnButton) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Story 5.1: AC2 - "Yêu cầu sửa" button (destructive) - using Button component */}
        {showReturnButton && (
          <Button
            variant="destructive"
            onClick={() => setShowReturnDialog(true)}
            isLoading={isReturning}
            leftIcon={<XCircle className="w-4 h-4" />}
            aria-label="Yêu cầu sửa hồ sơ"
          >
            Yêu cầu sửa
          </Button>
        )}

        {/* Story 5.1: AC2 - "Phân bổ hội đồng" button (primary) - using Button component */}
        {/* Story 5.2: Opens CouncilAssignmentDialog */}
        {showAssignCouncilButton && (
          <Button
            variant="primary"
            onClick={() => setShowCouncilDialog(true)}
            isLoading={isAssigningCouncil}
            leftIcon={<Users className="w-4 h-4" />}
            aria-label="Phân bổ hội đồng xét duyệt"
          >
            Phân bổ hội đồng
          </Button>
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

      {/* Success message display (Story 5.2: AC3 - Secretary Notification Mock) */}
      {successMessage && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
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

      {/* Council Assignment Dialog (Story 5.2) */}
      <CouncilAssignmentDialog
        isOpen={showCouncilDialog}
        onClose={() => {
          setShowCouncilDialog(false);
          setError(null);
        }}
        onAssign={handleAssignCouncil}
        isSubmitting={isAssigningCouncil}
        proposalId={proposalId}
      />
    </>
  );
}

/**
 * Default export for convenience
 */
export default SchoolSelectionActions;
