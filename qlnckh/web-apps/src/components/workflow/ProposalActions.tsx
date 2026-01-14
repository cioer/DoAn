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
import { Button, Dialog, DialogFooter, Alert, Select, Textarea } from '../ui';

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

  // Build select options for reason codes
  const reasonCodeOptions = [
    { value: '', label: '-- Chọn lý do --' },
    ...Object.entries(RETURN_REASON_LABELS).map(([code, label]) => ({ value: code, label })),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Yêu cầu sửa hồ sơ"
      description="Chọn lý do và các phần cần sửa để gửi về cho giảng viên"
      size="lg"
      showCloseButton={!isSubmitting}
      footer={
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            variant="error"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!isValid}
            leftIcon={<XCircle className="w-4 h-4" />}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Button>
        </DialogFooter>
      }
    >
      {/* Error message */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* AC3: Reason code dropdown (required) */}
      <Select
        label="Lý do trả về"
        required
        placeholder="-- Chọn lý do --"
        options={reasonCodeOptions}
        value={reasonCode}
        onChange={(e) => setReasonCode(e.target.value)}
        disabled={isSubmitting}
      />

      {/* AC3: Section checkboxes (required, min 1) */}
      <fieldset className="mt-4">
        <legend className="block text-sm font-semibold text-gray-700 mb-2">
          Phần cần sửa <span className="text-error-500 ml-1">*</span>
          <span className="text-xs text-gray-500 ml-1 font-normal">(ít nhất một phần)</span>
        </legend>
        <div className="space-y-2 border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto shadow-inner" role="group" aria-label="Các phần cần sửa">
          {CANONICAL_SECTIONS.map((section) => {
            const checkboxId = `section-${section.id}`;
            const isChecked = revisionSections.includes(section.id);
            return (
              <label
                key={section.id}
                htmlFor={checkboxId}
                className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${isChecked ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSection(section.id)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                  aria-describedby="selection-count"
                />
                <span className="text-sm font-medium text-gray-700 flex-1">
                  {section.label}
                </span>
              </label>
            );
          })}
        </div>
        {revisionSections.length > 0 && (
          <p id="selection-count" className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
            <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
              {revisionSections.length} phần
            </span>
            đã chọn
          </p>
        )}
      </fieldset>

      {/* AC3: Comment textarea (optional) */}
      <div className="mt-4">
        <Textarea
          label="Ghi chú thêm"
          placeholder="Nhập ghi chú chi tiết về các vấn đề cần sửa..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          disabled={isSubmitting}
          helperText="Tùy chọn"
        />
      </div>
    </Dialog>
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
          <Button
            variant="error"
            onClick={() => setShowReturnDialog(true)}
            isLoading={isReturning}
            leftIcon={<XCircle className="w-4 h-4" />}
            className="rounded-xl"
          >
            Yêu cầu sửa
          </Button>
        )}

        {/* Story 4.1: AC1 - "Duyệt hồ sơ" button (primary) - using Button component */}
        {showApproveButton && (
          <Button
            variant="primary"
            onClick={() => setShowApproveConfirm(true)}
            isLoading={isApproving}
            leftIcon={<CheckCircle className="w-4 h-4" />}
            className="rounded-xl"
          >
            Duyệt hồ sơ
          </Button>
        )}

        {/* GIANG_VIEN Feature: "Bắt đầu thực hiện" button for proposal owner at APPROVED state */}
        {showStartButton && (
          <Button
            variant="primary"
            onClick={() => setShowStartConfirm(true)}
            isLoading={isStarting}
            leftIcon={<Play className="w-4 h-4" />}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
          >
            Bắt đầu thực hiện
          </Button>
        )}

        {/* GIANG_VIEN Feature: "Nộp nghiệm thu" button for proposal owner at IN_PROGRESS state */}
        {showSubmitAcceptanceButton && (
          <Button
            variant="primary"
            onClick={() => setShowSubmitAcceptanceConfirm(true)}
            isLoading={isSubmittingAcceptance}
            leftIcon={<FileCheck className="w-4 h-4" />}
            className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
          >
            Nộp nghiệm thu
          </Button>
        )}

        {/* GIANG_VIEN Feature: "Gửi duyệt" button for proposal owner at DRAFT state */}
        {showSubmitButton && (
          <Button
            variant="primary"
            onClick={() => setShowSubmitConfirm(true)}
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
            className="rounded-xl bg-gradient-to-r from-success-600 to-emerald-600 hover:from-success-700 hover:to-emerald-700"
          >
            Gửi duyệt
          </Button>
        )}

        {/* Faculty Acceptance: "Yêu cầu sửa" button for QUAN_LY_KHOA at FACULTY_ACCEPTANCE_REVIEW */}
        {showReturnFacultyAcceptanceButton && (
          <Button
            variant="error"
            onClick={() => setShowReturnFacultyAcceptanceDialog(true)}
            isLoading={isReturningFacultyAcceptance}
            leftIcon={<XCircle className="w-4 h-4" />}
            className="rounded-xl"
          >
            Yêu cầu sửa
          </Button>
        )}

        {/* Faculty Acceptance: "Nghiệm thu" button for QUAN_LY_KHOA at FACULTY_ACCEPTANCE_REVIEW */}
        {showAcceptFacultyAcceptanceButton && (
          <Button
            variant="primary"
            onClick={() => setShowAcceptFacultyAcceptanceConfirm(true)}
            isLoading={isAcceptingFacultyAcceptance}
            leftIcon={<CheckCircle className="w-4 h-4" />}
            className="rounded-xl bg-gradient-to-r from-success-600 to-emerald-600 hover:from-success-700 hover:to-emerald-700"
          >
            Nghiệm thu cấp Khoa
          </Button>
        )}
      </div>

      {/* Approve Confirmation Dialog (Story 4.1) - using Dialog component */}
      {showApproveConfirm && (
        <Dialog
          isOpen={showApproveConfirm}
          onClose={() => {
            setShowApproveConfirm(false);
            setError(null);
          }}
          title="Xác nhận duyệt hồ sơ"
          description="Bạn có chắc chắn muốn duyệt hồ sơ này? Sau khi duyệt, đề tài sẽ được chuyển lên Phòng KHCN để phân bổ Hội đồng xét duyệt."
          showCloseButton={!isApproving}
          footer={
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowApproveConfirm(false);
                  setError(null);
                }}
                disabled={isApproving}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                isLoading={isApproving}
              >
                {isApproving ? 'Đang xử lý...' : 'Xác nhận duyệt'}
              </Button>
            </DialogFooter>
          }
        >
          {error && (
            <Alert variant="error" className="mb-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Lỗi</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </Alert>
          )}
        </Dialog>
      )}

      {/* Start Project Confirmation Dialog (GIANG_VIEN Feature) */}
      {showStartConfirm && (
        <Dialog
          isOpen={showStartConfirm}
          onClose={() => {
            setShowStartConfirm(false);
            setError(null);
          }}
          title="Xác nhận bắt đầu thực hiện"
          description="Bạn có chắc chắn muốn bắt đầu thực hiện đề tài này? Sau khi bắt đầu, đề tài sẽ được chuyển sang trạng thái Đang thực hiện (IN_PROGRESS)."
          showCloseButton={!isStarting}
          footer={
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStartConfirm(false);
                  setError(null);
                }}
                disabled={isStarting}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleStart}
                isLoading={isStarting}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              >
                {isStarting ? 'Đang xử lý...' : 'Bắt đầu thực hiện'}
              </Button>
            </DialogFooter>
          }
        >
          {error && (
            <Alert variant="error" className="mb-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Lỗi</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </Alert>
          )}
        </Dialog>
      )}

      {/* Submit Confirmation Dialog (GIANG_VIEN Feature) */}
      {showSubmitConfirm && (
        <Dialog
          isOpen={showSubmitConfirm}
          onClose={() => {
            setShowSubmitConfirm(false);
            setError(null);
          }}
          title="Xác nhận gửi hồ sơ duyệt"
          description="Bạn có chắc chắn muốn gửi hồ sơ này để Quản lý khoa duyệt? Sau khi gửi, đề tài sẽ được chuyển sang trạng thái chờ duyệt."
          showCloseButton={!isSubmitting}
          footer={
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                className="bg-gradient-to-r from-success-600 to-emerald-600 hover:from-success-700 hover:to-emerald-700"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi duyệt'}
              </Button>
            </DialogFooter>
          }
        >
          {error && (
            <Alert variant="error" className="mb-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Lỗi</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </Alert>
          )}
        </Dialog>
      )}

      {/* Submit Acceptance Confirmation Dialog (GIANG_VIEN Feature) */}
      {showSubmitAcceptanceConfirm && (
        <Dialog
          isOpen={showSubmitAcceptanceConfirm}
          onClose={() => {
            setShowSubmitAcceptanceConfirm(false);
            setError(null);
          }}
          title="Xác nhận nộp nghiệm thu"
          description="Bạn có chắc chắn muốn nộp nghiệm thu đề tài này? Sau khi nộp, đề tài sẽ được chuyển sang trạng thái chờ nghiệm thu cấp Khoa."
          showCloseButton={!isSubmittingAcceptance}
          footer={
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSubmitAcceptanceConfirm(false);
                  setError(null);
                }}
                disabled={isSubmittingAcceptance}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitAcceptance}
                isLoading={isSubmittingAcceptance}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
              >
                {isSubmittingAcceptance ? 'Đang xử lý...' : 'Nộp nghiệm thu'}
              </Button>
            </DialogFooter>
          }
        >
          {error && (
            <Alert variant="error" className="mb-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Lỗi</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </Alert>
          )}
        </Dialog>
      )}

      {/* Accept Faculty Acceptance Confirmation Dialog */}
      {showAcceptFacultyAcceptanceConfirm && (
        <Dialog
          isOpen={showAcceptFacultyAcceptanceConfirm}
          onClose={() => {
            setShowAcceptFacultyAcceptanceConfirm(false);
            setError(null);
          }}
          title="Xác nhận nghiệm thu cấp Khoa"
          description="Bạn có chắc chắn muốn nghiệm thu đề tài này? Sau khi nghiệm thu, đề tài sẽ được chuyển lên Phòng KHCN để nghiệm thu cấp Trường."
          showCloseButton={!isAcceptingFacultyAcceptance}
          footer={
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAcceptFacultyAcceptanceConfirm(false);
                  setError(null);
                }}
                disabled={isAcceptingFacultyAcceptance}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleAcceptFacultyAcceptance}
                isLoading={isAcceptingFacultyAcceptance}
                className="bg-gradient-to-r from-success-600 to-emerald-600 hover:from-success-700 hover:to-emerald-700"
              >
                {isAcceptingFacultyAcceptance ? 'Đang xử lý...' : 'Xác nhận nghiệm thu'}
              </Button>
            </DialogFooter>
          }
        >
          {error && (
            <Alert variant="error" className="mb-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Lỗi</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </Alert>
          )}
        </Dialog>
      )}

      {/* Return Faculty Acceptance Dialog */}
      {showReturnFacultyAcceptanceDialog && (
        <Dialog
          isOpen={showReturnFacultyAcceptanceDialog}
          onClose={() => {
            setShowReturnFacultyAcceptanceDialog(false);
            setReturnFacultyAcceptanceReason('');
            setError(null);
          }}
          title="Yêu cầu sửa đổi từ nghiệm thu Khoa"
          description="Vui lòng nhập lý do yêu cầu sửa đổi để gửi về cho giảng viên."
          showCloseButton={!isReturningFacultyAcceptance}
          footer={
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowReturnFacultyAcceptanceDialog(false);
                  setReturnFacultyAcceptanceReason('');
                  setError(null);
                }}
                disabled={isReturningFacultyAcceptance}
              >
                Hủy
              </Button>
              <Button
                variant="error"
                onClick={handleReturnFacultyAcceptance}
                isLoading={isReturningFacultyAcceptance}
                disabled={!returnFacultyAcceptanceReason.trim()}
              >
                {isReturningFacultyAcceptance ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </DialogFooter>
          }
        >
          {error && (
            <Alert variant="error" className="mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Lỗi</p>
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            </Alert>
          )}

          <Textarea
            label="Lý do trả về"
            required
            placeholder="Nhập lý do yêu cầu sửa đổi..."
            value={returnFacultyAcceptanceReason}
            onChange={(e) => setReturnFacultyAcceptanceReason(e.target.value)}
            rows={4}
            disabled={isReturningFacultyAcceptance}
          />
        </Dialog>
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
