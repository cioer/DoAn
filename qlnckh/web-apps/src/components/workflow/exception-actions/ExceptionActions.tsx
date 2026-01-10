/**
 * Exception Actions Component (Story 9.1, 9.2, 9.3)
 *
 * Displays exception action buttons for proposal workflow based on:
 * - Current proposal state
 * - User's role (RBAC)
 * - Ownership (for cancel/withdraw)
 *
 * Exception Actions:
 * - Cancel: PROJECT_OWNER can cancel DRAFT proposals
 * - Withdraw: PROJECT_OWNER can withdraw before APPROVED
 * - Reject: Decision makers (QUAN_LY_KHOA, PHONG_KHCN, HOI_DONG, BGH) based on state
 * - Pause: PHONG_KHCN can pause active proposals
 * - Resume: PHONG_KHCN can resume paused proposals
 *
 * Updated: Added pause/resume buttons for PHONG_KHCN role
 */

import { useState } from 'react';
import {
  XCircle,
  Ban,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import {
  workflowApi,
  generateIdempotencyKey,
  RejectReasonCode,
} from '@/lib/api/workflow';
import { Button } from '../../ui';
import { CancelConfirmDialog } from './CancelConfirmDialog';
import { WithdrawConfirmDialog } from './WithdrawConfirmDialog';
import { RejectConfirmDialog } from './RejectConfirmDialog';
import { PauseConfirmDialog } from './PauseConfirmDialog';
import { ResumeConfirmDialog, PauseInfo } from './ResumeConfirmDialog';

/**
 * User role from JWT token
 */
export interface UserInfo {
  id: string;
  role: string;
  facultyId?: string | null;
  isOwner?: boolean; // True if user is the proposal owner
}

/**
 * Proposal state from backend
 */
export interface ExceptionActionsProps {
  proposalId: string;
  proposalState: string;
  proposalTitle?: string;
  currentUser: UserInfo;
  pauseInfo?: PauseInfo | null;
  onActionSuccess?: () => void;
  onActionError?: (error: { code: string; message: string }) => void;
}

/**
 * Terminal states - no exception actions allowed
 */
const TERMINAL_STATES = [
  'CANCELLED',
  'REJECTED',
  'WITHDRAWN',
  'COMPLETED',
  'HANDOVER',
];

/**
 * States where withdrawal is blocked (after approval)
 */
const APPROVAL_STATES = [
  'APPROVED',
  'IN_PROGRESS',
  'FACULTY_ACCEPTANCE_REVIEW',
  'SCHOOL_ACCEPTANCE_REVIEW',
  'HANDOVER',
  'COMPLETED',
];

/**
 * States where PHONG_KHCN can pause
 */
const PAUSABLE_STATES = [
  'DRAFT',
  'FACULTY_REVIEW',
  'SCHOOL_SELECTION_REVIEW',
  'OUTLINE_COUNCIL_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'IN_PROGRESS',
];

/**
 * Story 9.1: Can Cancel check
 * Returns true if user is owner AND proposal is in DRAFT state
 */
function canCancel(proposalState: string, isOwner: boolean | undefined): boolean {
  return proposalState === 'DRAFT' && isOwner === true;
}

/**
 * Story 9.1: Can Withdraw check
 * Returns true if user is owner AND proposal state < APPROVED
 */
function canWithdraw(proposalState: string, isOwner: boolean | undefined): boolean {
  return !APPROVAL_STATES.includes(proposalState) && isOwner === true;
}

/**
 * Story 9.2: Can Reject check
 * Returns true based on role + state matrix
 */
function canReject(proposalState: string, userRole: string): boolean {
  if (TERMINAL_STATES.includes(proposalState)) {
    return false;
  }

  // Define reject permissions per role
  const REJECT_PERMISSIONS: Record<string, string[]> = {
    QUAN_LY_KHOA: ['FACULTY_REVIEW', 'CHANGES_REQUESTED'],
    PHONG_KHCN: [
      'FACULTY_REVIEW',
      'SCHOOL_SELECTION_REVIEW',
      'CHANGES_REQUESTED',
    ],
    THU_KY_HOI_DONG: ['OUTLINE_COUNCIL_REVIEW'],
    THANH_TRUNG: ['OUTLINE_COUNCIL_REVIEW'],
    CHU_TICH: ['OUTLINE_COUNCIL_REVIEW'],
    BGH: [
      'FACULTY_REVIEW',
      'SCHOOL_SELECTION_REVIEW',
      'OUTLINE_COUNCIL_REVIEW',
      'CHANGES_REQUESTED',
    ],
  };

  const allowedStates = REJECT_PERMISSIONS[userRole];
  return allowedStates?.includes(proposalState) || false;
}

/**
 * Story 9.3: Can Pause check
 * Returns true if user has PHONG_KHCN role AND proposal is in pausable state
 */
function canPause(proposalState: string, userRole: string): boolean {
  return userRole === 'PHONG_KHCN' && PAUSABLE_STATES.includes(proposalState);
}

/**
 * Story 9.3: Can Resume check
 * Returns true if user has PHONG_KHCN role AND proposal is PAUSED
 */
function canResume(proposalState: string, userRole: string): boolean {
  return userRole === 'PHONG_KHCN' && proposalState === 'PAUSED';
}

/**
 * Exception Actions Component
 *
 * Displays exception action buttons based on RBAC + state
 */
export function ExceptionActions({
  proposalId,
  proposalState,
  proposalTitle,
  currentUser,
  pauseInfo,
  onActionSuccess,
  onActionError,
}: ExceptionActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // RBAC checks
  const showCancelButton = canCancel(proposalState, currentUser.isOwner);
  const showWithdrawButton = canWithdraw(proposalState, currentUser.isOwner);
  const showRejectButton = canReject(proposalState, currentUser.role);
  const showPauseButton = canPause(proposalState, currentUser.role);
  const showResumeButton = canResume(proposalState, currentUser.role);

  /**
   * Story 9.1: Cancel Action
   */
  const handleCancel = async (reason?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.cancelProposal(proposalId, idempotencyKey, reason);
      setShowCancelDialog(false);

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
      setIsLoading(false);
    }
  };

  /**
   * Story 9.1: Withdraw Action
   */
  const handleWithdraw = async (reason: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.withdrawProposal(proposalId, idempotencyKey, reason);
      setShowWithdrawDialog(false);

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
      setIsLoading(false);
    }
  };

  /**
   * Story 9.2: Reject Action
   */
  const handleReject = async (reasonCode: RejectReasonCode, comment: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.rejectProposal(proposalId, idempotencyKey, reasonCode, comment);
      setShowRejectDialog(false);

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
      setIsLoading(false);
    }
  };

  /**
   * Story 9.3: Pause Action
   */
  const handlePause = async (reason: string, expectedResumeAt?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.pauseProposal(proposalId, idempotencyKey, reason, expectedResumeAt);
      setShowPauseDialog(false);

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
      setIsLoading(false);
    }
  };

  /**
   * Story 9.3: Resume Action
   */
  const handleResume = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await workflowApi.resumeProposal(proposalId, idempotencyKey);
      setShowResumeDialog(false);

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
      setIsLoading(false);
    }
  };

  // Don't render if no buttons to show
  const hasAnyButton =
    showCancelButton ||
    showWithdrawButton ||
    showRejectButton ||
    showPauseButton ||
    showResumeButton;

  if (!hasAnyButton) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Story 9.1: Cancel Button (Owner only, DRAFT) */}
        {showCancelButton && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            disabled={isLoading}
            isLoading={isLoading && showCancelDialog}
            leftIcon={<XCircle className="w-4 h-4" />}
            className="bg-gray-600 hover:bg-gray-700 text-white border-0 focus:ring-gray-500"
            aria-label="Hủy bỏ đề tài"
            title="Hủy đề tài (chỉ khi ở trạng thái nháp)"
          >
            Hủy bỏ
          </Button>
        )}

        {/* Story 9.1: Withdraw Button (Owner only, < APPROVED) */}
        {showWithdrawButton && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowWithdrawDialog(true)}
            disabled={isLoading}
            isLoading={isLoading && showWithdrawDialog}
            leftIcon={<XCircle className="w-4 h-4" />}
            className="bg-secondary-600 hover:bg-secondary-700 text-white border-0 focus:ring-secondary-500"
            aria-label="Rút hồ sơ đề tài"
            title="Rút hồ sơ (trước khi phê duyệt)"
          >
            Rút hồ sơ
          </Button>
        )}

        {/* Story 9.2: Reject Button (Decision makers) */}
        {showRejectButton && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading}
            isLoading={isLoading && showRejectDialog}
            leftIcon={<Ban className="w-4 h-4" />}
            aria-label="Từ chối đề tài"
            title="Từ chối đề tài"
          >
            Từ chối
          </Button>
        )}

        {/* Story 9.3: Pause Button (PKHCN only) */}
        {showPauseButton && (
          <Button
            variant="warning"
            size="sm"
            onClick={() => setShowPauseDialog(true)}
            disabled={isLoading}
            isLoading={isLoading && showPauseDialog}
            leftIcon={<PauseCircle className="w-4 h-4" />}
            aria-label="Tạm dừng đề tài"
            title="Tạm dừng đề tài"
          >
            Tạm dừng
          </Button>
        )}

        {/* Story 9.3: Resume Button (PKHCN only, PAUSED state) */}
        {showResumeButton && (
          <Button
            variant="success"
            size="sm"
            onClick={() => setShowResumeDialog(true)}
            disabled={isLoading}
            isLoading={isLoading && showResumeDialog}
            leftIcon={<PlayCircle className="w-4 h-4" />}
            aria-label="Tiếp tục đề tài"
            title="Tiếp tục đề tài"
          >
            Tiếp tục
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <CancelConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => {
          if (!isLoading) setShowCancelDialog(false);
          setError(null);
        }}
        onConfirm={handleCancel}
        isSubmitting={isLoading}
        proposalTitle={proposalTitle}
      />

      <WithdrawConfirmDialog
        isOpen={showWithdrawDialog}
        onClose={() => {
          if (!isLoading) setShowWithdrawDialog(false);
          setError(null);
        }}
        onConfirm={handleWithdraw}
        isSubmitting={isLoading}
        proposalTitle={proposalTitle}
        currentState={proposalState}
      />

      <RejectConfirmDialog
        isOpen={showRejectDialog}
        onClose={() => {
          if (!isLoading) setShowRejectDialog(false);
          setError(null);
        }}
        onConfirm={handleReject}
        isSubmitting={isLoading}
        proposalTitle={proposalTitle}
      />

      <PauseConfirmDialog
        isOpen={showPauseDialog}
        onClose={() => {
          if (!isLoading) setShowPauseDialog(false);
          setError(null);
        }}
        onConfirm={handlePause}
        isSubmitting={isLoading}
        proposalTitle={proposalTitle}
        currentState={proposalState}
      />

      <ResumeConfirmDialog
        isOpen={showResumeDialog}
        onClose={() => {
          if (!isLoading) setShowResumeDialog(false);
          setError(null);
        }}
        onConfirm={handleResume}
        isSubmitting={isLoading}
        proposalTitle={proposalTitle}
        pauseInfo={pauseInfo}
      />
    </>
  );
}

/**
 * Export individual dialogs for direct use if needed
 */
export { CancelConfirmDialog } from './CancelConfirmDialog';
export { WithdrawConfirmDialog } from './WithdrawConfirmDialog';
export { RejectConfirmDialog } from './RejectConfirmDialog';
export { PauseConfirmDialog } from './PauseConfirmDialog';
export { ResumeConfirmDialog } from './ResumeConfirmDialog';
