/**
 * Proposal Actions Component (Story 4.1 + Story 4.2 + GIANG_VIEN Submit)
 *
 * Displays action buttons for proposal workflow based on:
 * - Current proposal state
 * - User's role (RBAC)
 *
 * Story 4.1: "Duyệt hồ sơ" button for QUAN_LY_KHOA/THU_KY_KHOA at FACULTY_REVIEW
 * Story 4.2: "Yêu cầu sửa" button for QUAN_LY_KHOA/THU_KY_KHOA at FACULTY_REVIEW
 * GIANG_VIEN Feature: "Gửi duyệt" button for proposal owner at DRAFT state
 * GIANG_VIEN Feature: "Bắt đầu thực hiện" button for proposal owner at APPROVED state
 * GIANG_VIEN Feature: "Nộp nghiệm thu" button for proposal owner at IN_PROGRESS state
 * - Uses UI components (Button, Select, Textarea)
 */

import { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Send,
  Play,
  FileCheck,
} from 'lucide-react';
import {
  workflowApi,
  generateIdempotencyKey,
  RETURN_REASON_LABELS,
  CANONICAL_SECTIONS,
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
 * Proposal state from backend
 */
export interface ProposalActionsProps {
  proposalId: string;
  proposalState: string;
  currentUser: UserInfo;
  ownerId?: string; // Proposal owner ID - needed for submit button
  onActionSuccess?: () => void;
  onActionError?: (error: { code: string; message: string }) => void;
}

/**
 * Roles that can approve/return proposals at FACULTY_REVIEW state
 */
const APPROVAL_ROLES = ['QUAN_LY_KHOA', 'THU_KY_KHOA'] as const;
type ApprovalRole = typeof APPROVAL_ROLES[number];

/**
 * Story 4.1: AC1 - Can Approve check
 * Returns true if user has QUAN_LY_KHOA or THU_KY_KHOA role
 * AND proposal is in FACULTY_REVIEW state
 */
function canApprove(proposalState: string, userRole: string): boolean {
  return (
    proposalState === 'FACULTY_REVIEW' && APPROVAL_ROLES.includes(userRole as ApprovalRole)
  );
}

/**
 * Story 4.2: AC1 - Can Return check
 * Returns true if user has QUAN_LY_KHOA or THU_KY_KHOA role
 * AND proposal is in FACULTY_REVIEW state
 */
function canReturn(proposalState: string, userRole: string): boolean {
  return (
    proposalState === 'FACULTY_REVIEW' && APPROVAL_ROLES.includes(userRole as ApprovalRole)
  );
}

/**
 * GIANG_VIEN Feature: Can Submit check
 * Returns true if user is the proposal owner AND proposal is in DRAFT state
 */
function canSubmit(proposalState: string, userId: string, ownerId?: string): boolean {
  return (
    proposalState === 'DRAFT' && ownerId !== undefined && userId === ownerId
  );
}

/**
 * GIANG_VIEN Feature: Can Start Project check
 * Returns true if user is the proposal owner AND proposal is in APPROVED state
 */
function canStartProject(proposalState: string, userId: string, ownerId?: string): boolean {
  return (
    proposalState === 'APPROVED' && ownerId !== undefined && userId === ownerId
  );
}

/**
 * GIANG_VIEN Feature: Can Submit Acceptance check
 * Returns true if user is the proposal owner AND proposal is in IN_PROGRESS state
 */
function canSubmitAcceptance(proposalState: string, userId: string, ownerId?: string): boolean {
  return (
    proposalState === 'IN_PROGRESS' && ownerId !== undefined && userId === ownerId
  );
}

/**
 * Faculty Acceptance: Can Accept Faculty Acceptance check
 * Returns true if user has QUAN_LY_KHOA or THU_KY_KHOA role
 * AND proposal is in FACULTY_ACCEPTANCE_REVIEW state
 */
function canAcceptFacultyAcceptance(proposalState: string, userRole: string): boolean {
  return (
    proposalState === 'FACULTY_ACCEPTANCE_REVIEW' && APPROVAL_ROLES.includes(userRole as ApprovalRole)
  );
}

/**
 * Faculty Acceptance: Can Return Faculty Acceptance check
 * Returns true if user has QUAN_LY_KHOA or THU_KY_KHOA role
 * AND proposal is in FACULTY_ACCEPTANCE_REVIEW state
 */
function canReturnFacultyAcceptance(proposalState: string, userRole: string): boolean {
  return (
    proposalState === 'FACULTY_ACCEPTANCE_REVIEW' && APPROVAL_ROLES.includes(userRole as ApprovalRole)
  );
}

/**
 * Return Dialog Component (Story 4.2: AC3, AC4)
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

  // AC4: Validation - reasonCode required and at least 1 section selected
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

          {/* AC3: Reason code dropdown (required) */}
          <div>
            <label htmlFor="reason-code" className="block text-sm font-medium text-gray-700 mb-1">
              Lý do trả về <span className="text-red-500">*</span>
            </label>
            <select
              id="reason-code"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Chọn lý do --</option>
              {Object.entries(RETURN_REASON_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>

          {/* AC3: Section checkboxes (required, min 1) */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Phần cần sửa <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-1">(ít nhất một phần)</span>
            </legend>
            <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto" role="group" aria-label="Các phần cần sửa">
              {CANONICAL_SECTIONS.map((section) => {
                const checkboxId = `section-${section.id}`;
                return (
                  <div key={section.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={revisionSections.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      aria-describedby="selection-count"
                    />
                    <label
                      htmlFor={checkboxId}
                      className="text-sm text-gray-700 cursor-pointer flex-1"
                    >
                      {section.label}
                    </label>
                  </div>
                );
              })}
            </div>
            {revisionSections.length > 0 && (
              <p id="selection-count" className="text-xs text-gray-500 mt-1">
                Đã chọn: {revisionSections.length} phần
              </p>
            )}
          </fieldset>

          {/* AC3: Comment textarea (optional) */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú thêm <span className="text-xs text-gray-500">(tùy chọn)</span>
            </label>
            <textarea
              id="comment"
              placeholder="Nhập ghi chú chi tiết về các vấn đề cần sửa..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
          {/* AC4: "Gửi" button disabled when validation fails */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Proposal Actions Component
 *
 * Displays action buttons for workflow transitions
 * Story 4.1: Faculty Approve Action
 * Story 4.2: Faculty Return Action
 * GIANG_VIEN Feature: Submit Proposal Action
 * - Uses UI components (Button)
 */
export function ProposalActions({
  proposalId,
  proposalState,
  currentUser,
  ownerId,
  onActionSuccess,
  onActionError,
}: ProposalActionsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingAcceptance, setIsSubmittingAcceptance] = useState(false);
  const [isAcceptingFacultyAcceptance, setIsAcceptingFacultyAcceptance] = useState(false);
  const [isReturningFacultyAcceptance, setIsReturningFacultyAcceptance] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showSubmitAcceptanceConfirm, setShowSubmitAcceptanceConfirm] = useState(false);
  const [showAcceptFacultyAcceptanceConfirm, setShowAcceptFacultyAcceptanceConfirm] = useState(false);
  const [showReturnFacultyAcceptanceDialog, setShowReturnFacultyAcceptanceDialog] = useState(false);
  const [returnFacultyAcceptanceReason, setReturnFacultyAcceptanceReason] = useState('');
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  // Debug logging
  console.log('ProposalActions:', {
    proposalId,
    proposalState,
    currentUser: currentUser ? { id: currentUser.id, role: currentUser.role } : null,
    ownerId,
  });

  const showApproveButton = canApprove(proposalState, currentUser?.role || '');
  const showReturnButton = canReturn(proposalState, currentUser?.role || '');
  const showSubmitButton = canSubmit(proposalState, currentUser?.id || '', ownerId);
  const showStartButton = canStartProject(proposalState, currentUser?.id || '', ownerId);
  const showSubmitAcceptanceButton = canSubmitAcceptance(proposalState, currentUser?.id || '', ownerId);
  const showAcceptFacultyAcceptanceButton = canAcceptFacultyAcceptance(proposalState, currentUser?.role || '');
  const showReturnFacultyAcceptanceButton = canReturnFacultyAcceptance(proposalState, currentUser?.role || '');

  /**
   * Story 4.1: AC3 & AC5 - Execute approve action
   * Transitions FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW
   */
  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.approveFacultyReview(
        proposalId,
        idempotencyKey,
      );

      setShowApproveConfirm(false);

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
      setIsApproving(false);
    }
  };

  /**
   * Story 4.2: AC3 & AC5 - Execute return action
   * Transitions FACULTY_REVIEW → CHANGES_REQUESTED
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
   * GIANG_VIEN Feature: Submit Proposal Action
   * Transitions DRAFT → FACULTY_REVIEW
   */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.submitProposal(
        proposalId,
        idempotencyKey,
      );

      setShowSubmitConfirm(false);

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
      setIsSubmitting(false);
    }
  };

  /**
   * GIANG_VIEN Feature: Start Project Action
   * Transitions APPROVED → IN_PROGRESS
   */
  const handleStart = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.startProject(
        proposalId,
        idempotencyKey,
      );

      setShowStartConfirm(false);

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
      setIsStarting(false);
    }
  };

  /**
   * GIANG_VIEN Feature: Submit Acceptance Action
   * Transitions IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW
   */
  const handleSubmitAcceptance = async () => {
    setIsSubmittingAcceptance(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.submitAcceptance(
        proposalId,
        idempotencyKey,
      );

      setShowSubmitAcceptanceConfirm(false);

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
      setIsSubmittingAcceptance(false);
    }
  };

  /**
   * Faculty Acceptance: Accept Faculty Acceptance Action
   * Transitions FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
   */
  const handleAcceptFacultyAcceptance = async () => {
    setIsAcceptingFacultyAcceptance(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.acceptFacultyAcceptance(
        proposalId,
        idempotencyKey,
      );

      setShowAcceptFacultyAcceptanceConfirm(false);

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
      setIsAcceptingFacultyAcceptance(false);
    }
  };

  /**
   * Faculty Acceptance: Return Faculty Acceptance Action
   * Transitions FACULTY_ACCEPTANCE_REVIEW → CHANGES_REQUESTED
   */
  const handleReturnFacultyAcceptance = async () => {
    if (!returnFacultyAcceptanceReason.trim()) {
      setError({ code: 'VALIDATION_ERROR', message: 'Vui lòng nhập lý do trả về' });
      return;
    }

    setIsReturningFacultyAcceptance(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      await workflowApi.returnFacultyAcceptance(
        proposalId,
        idempotencyKey,
        returnFacultyAcceptanceReason,
      );

      setShowReturnFacultyAcceptanceDialog(false);
      setReturnFacultyAcceptanceReason('');

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
      setIsReturningFacultyAcceptance(false);
    }
  };

  // AC2: Buttons hidden for wrong role/state
  if (!showApproveButton && !showReturnButton && !showSubmitButton && !showStartButton && !showSubmitAcceptanceButton && !showAcceptFacultyAcceptanceButton && !showReturnFacultyAcceptanceButton) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Story 4.2: AC1 - "Yêu cầu sửa" button (destructive) - using Button component */}
        {showReturnButton && (
          <button
            onClick={() => setShowReturnDialog(true)}
            disabled={isReturning}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            aria-label="Yêu cầu sửa hồ sơ"
          >
            <XCircle className="w-4 h-4" />
            Yêu cầu sửa
          </button>
        )}

        {/* Story 4.1: AC1 - "Duyệt hồ sơ" button (primary) - using Button component */}
        {showApproveButton && (
          <button
            onClick={() => setShowApproveConfirm(true)}
            disabled={isApproving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            aria-label="Duyệt hồ sơ đề tài"
          >
            <CheckCircle className="w-4 h-4" />
            Duyệt hồ sơ
          </button>
        )}

        {/* GIANG_VIEN Feature: "Bắt đầu thực hiện" button for proposal owner at APPROVED state */}
        {showStartButton && (
          <button
            onClick={() => setShowStartConfirm(true)}
            disabled={isStarting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            aria-label="Bắt đầu thực hiện đề tài"
          >
            <Play className="w-4 h-4" />
            Bắt đầu thực hiện
          </button>
        )}

        {/* GIANG_VIEN Feature: "Nộp nghiệm thu" button for proposal owner at IN_PROGRESS state */}
        {showSubmitAcceptanceButton && (
          <button
            onClick={() => setShowSubmitAcceptanceConfirm(true)}
            disabled={isSubmittingAcceptance}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            aria-label="Nộp nghiệm thu đề tài"
          >
            <FileCheck className="w-4 h-4" />
            Nộp nghiệm thu
          </button>
        )}

        {/* GIANG_VIEN Feature: "Gửi duyệt" button for proposal owner at DRAFT state */}
        {showSubmitButton && (
          <button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            aria-label="Gửi hồ sơ đề tài duyệt"
          >
            <Send className="w-4 h-4" />
            Gửi duyệt
          </button>
        )}

        {/* Faculty Acceptance: "Yêu cầu sửa" button for QUAN_LY_KHOA at FACULTY_ACCEPTANCE_REVIEW */}
        {showReturnFacultyAcceptanceButton && (
          <button
            onClick={() => setShowReturnFacultyAcceptanceDialog(true)}
            disabled={isReturningFacultyAcceptance}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            aria-label="Yêu cầu sửa từ nghiệm thu khoa"
          >
            <XCircle className="w-4 h-4" />
            Yêu cầu sửa
          </button>
        )}

        {/* Faculty Acceptance: "Nghiệm thu" button for QUAN_LY_KHOA at FACULTY_ACCEPTANCE_REVIEW */}
        {showAcceptFacultyAcceptanceButton && (
          <button
            onClick={() => setShowAcceptFacultyAcceptanceConfirm(true)}
            disabled={isAcceptingFacultyAcceptance}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            aria-label="Nghiệm thu cấp Khoa"
          >
            <CheckCircle className="w-4 h-4" />
            Nghiệm thu cấp Khoa
          </button>
        )}
      </div>

      {/* Approve Confirmation Dialog (Story 4.1) - using Button components */}
      {showApproveConfirm && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isApproving ? 'Đang xử lý...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Project Confirmation Dialog (GIANG_VIEN Feature) */}
      {showStartConfirm && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="start-confirm-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Xác nhận bắt đầu thực hiện
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn bắt đầu thực hiện đề tài này? Sau khi bắt đầu,
              đề tài sẽ được chuyển sang trạng thái Đang thực hiện (IN_PROGRESS).
            </p>

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
                  setShowStartConfirm(false);
                  setError(null);
                }}
                disabled={isStarting}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isStarting ? 'Đang xử lý...' : 'Bắt đầu thực hiện'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog (GIANG_VIEN Feature) */}
      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="submit-confirm-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Xác nhận gửi hồ sơ duyệt
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn gửi hồ sơ này để Quản lý khoa duyệt? Sau khi gửi,
              đề tài sẽ được chuyển sang trạng thái chờ duyệt.
            </p>

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
                  setShowSubmitConfirm(false);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Acceptance Confirmation Dialog (GIANG_VIEN Feature) */}
      {showSubmitAcceptanceConfirm && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-acceptance-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="submit-acceptance-confirm-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Xác nhận nộp nghiệm thu
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn nộp nghiệm thu đề tài này? Sau khi nộp,
              đề tài sẽ được chuyển sang trạng thái chờ nghiệm thu cấp Khoa.
            </p>

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
                  setShowSubmitAcceptanceConfirm(false);
                  setError(null);
                }}
                disabled={isSubmittingAcceptance}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitAcceptance}
                disabled={isSubmittingAcceptance}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isSubmittingAcceptance ? 'Đang xử lý...' : 'Nộp nghiệm thu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Faculty Acceptance Confirmation Dialog */}
      {showAcceptFacultyAcceptanceConfirm && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-faculty-acceptance-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="accept-faculty-acceptance-confirm-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Xác nhận nghiệm thu cấp Khoa
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn nghiệm thu đề tài này? Sau khi nghiệm thu,
              đề tài sẽ được chuyển lên Phòng KHCN để nghiệm thu cấp Trường.
            </p>

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
                  setShowAcceptFacultyAcceptanceConfirm(false);
                  setError(null);
                }}
                disabled={isAcceptingFacultyAcceptance}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleAcceptFacultyAcceptance}
                disabled={isAcceptingFacultyAcceptance}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isAcceptingFacultyAcceptance ? 'Đang xử lý...' : 'Xác nhận nghiệm thu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Faculty Acceptance Dialog */}
      {showReturnFacultyAcceptanceDialog && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-faculty-acceptance-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="return-faculty-acceptance-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Yêu cầu sửa đổi từ nghiệm thu Khoa
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Vui lòng nhập lý do yêu cầu sửa đổi để gửi về cho giảng viên.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Lỗi</p>
                  <p className="text-sm text-red-700">{error.message}</p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="return-faculty-acceptance-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Lý do trả về <span className="text-red-500">*</span>
              </label>
              <textarea
                id="return-faculty-acceptance-reason"
                placeholder="Nhập lý do yêu cầu sửa đổi..."
                value={returnFacultyAcceptanceReason}
                onChange={(e) => setReturnFacultyAcceptanceReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReturnFacultyAcceptanceDialog(false);
                  setReturnFacultyAcceptanceReason('');
                  setError(null);
                }}
                disabled={isReturningFacultyAcceptance}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleReturnFacultyAcceptance}
                disabled={isReturningFacultyAcceptance || !returnFacultyAcceptanceReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isReturningFacultyAcceptance ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Dialog (Story 4.2) */}
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
