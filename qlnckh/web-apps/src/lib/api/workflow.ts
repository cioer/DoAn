import { apiClient } from '../auth/auth';

/**
 * Workflow State Transitions
 * Story 4.1: Faculty Approve Action
 * Story 4.2: Faculty Return Action (Reason Code + Sections)
 * Story 4.3: CHANGES_REQUESTED Banner + Return Target Verification
 */

/**
 * Workflow Log Entry (Story 3.4, 4.2, 4.3)
 */
export interface WorkflowLog {
  id: string;
  proposalId: string;
  action: string;
  fromState: string;
  toState: string;
  actorId: string;
  actorName: string;
  returnTargetState?: string | null;
  returnTargetHolderUnit?: string | null;
  reasonCode?: string | null;
  comment?: string | null;
  timestamp: string;
}

/**
 * Latest Return Response (Story 4.3)
 */
export interface LatestReturnResponse {
  success: true;
  data: WorkflowLog | null;
}

/**
 * Get Workflow Logs Response (Story 3.4)
 */
export interface GetWorkflowLogsResponse {
  success: true;
  data: WorkflowLog[];
  meta: {
    proposalId: string;
    total: number;
  };
}

export interface ApproveFacultyReviewRequest {
  proposalId: string;
  idempotencyKey: string;
}

export interface ReturnFacultyReviewRequest {
  proposalId: string;
  idempotencyKey: string;
  reason: string;
  reasonCode: string;
  reasonSections?: string[];
}

export interface TransitionResult {
  proposalId: string;
  previousState: string;
  currentState: string;
  action: string;
  holderUnit: string | null;
  holderUser: string | null;
  workflowLogId: string;
}

export interface ApproveFacultyReviewResponse {
  success: true;
  data: TransitionResult;
}

export interface ReturnFacultyReviewResponse {
  success: true;
  data: TransitionResult;
}

export interface ResubmitProposalRequest {
  proposalId: string;
  idempotencyKey?: string;
  checkedSections: string[];
}

export interface ResubmitProposalResponse {
  success: true;
  data: TransitionResult;
}

/**
 * Assign Council Request (Story 5.2)
 */
export interface AssignCouncilRequest {
  proposalId: string;
  councilId: string;
  secretaryId: string;
  memberIds?: string[];
  idempotencyKey: string;
}

/**
 * Assign Council Response (Story 5.2)
 */
export interface AssignCouncilResponse {
  success: true;
  data: TransitionResult;
}

/**
 * Download Revision PDF (Story 4.6)
 * Downloads the revision PDF for a proposal with changes requested.
 *
 * @param proposalId - Proposal ID to download revision PDF for
 * @returns Promise that resolves when download is complete
 */
export const downloadRevisionPdf = async (proposalId: string): Promise<void> => {
  const response = await apiClient.get(`/proposals/${proposalId}/revision-pdf`, {
    responseType: 'blob',
  });

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers['content-disposition'];
  let filename = `revision_${proposalId}.pdf`;

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      filename = decodeURIComponent(filenameMatch[1]);
    }
  }

  // Create blob link and trigger download
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export interface WorkflowErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}

/**
 * Return Reason Codes (Story 4.2)
 */
export const RETURN_REASON_CODES = {
  THIEU_TAI_LIEU: 'THIEU_TAI_LIEU',
  NOI_DUNG_KHONG_RO_RANG: 'NOI_DUNG_KHONG_RO_RANG',
  PHUONG_PHAP_KHONG_KHA_THI: 'PHUONG_PHAP_KHONG_KHA_THI',
  KINH_PHI_KHONG_HOP_LE: 'KINH_PHI_KHONG_HOP_LE',
  KHAC: 'KHAC',
} as const;

export type ReturnReasonCode = (typeof RETURN_REASON_CODES)[keyof typeof RETURN_REASON_CODES];

export const RETURN_REASON_LABELS: Record<ReturnReasonCode, string> = {
  THIEU_TAI_LIEU: 'Thiếu tài liệu',
  NOI_DUNG_KHONG_RO_RANG: 'Nội dung không rõ ràng',
  PHUONG_PHAP_KHONG_KHA_THI: 'Phương pháp không khả thi',
  KINH_PHI_KHONG_HOP_LE: 'Kinh phí không hợp lý',
  KHAC: 'Khác',
};

/**
 * Canonical Section IDs (Story 4.2)
 */
export const CANONICAL_SECTIONS = [
  { id: 'SEC_INFO_GENERAL', label: 'Thông tin chung' },
  { id: 'SEC_CONTENT_METHOD', label: 'Nội dung nghiên cứu' },
  { id: 'SEC_METHOD', label: 'Phương pháp nghiên cứu' },
  { id: 'SEC_EXPECTED_RESULTS', label: 'Kết quả mong đợi' },
  { id: 'SEC_BUDGET', label: 'Kinh phí' },
  { id: 'SEC_ATTACHMENTS', label: 'Tài liệu đính kèm' },
] as const;

/**
 * Generate UUID v4 for idempotency key
 * Story 3.8: Idempotency Keys for anti-double-submit
 */
export function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Reject Reason Codes (Story 9.2: Reject Action)
 */
export const REJECT_REASON_CODES = {
  NOT_SCIENTIFIC: 'NOT_SCIENTIFIC',
  NOT_FEASIBLE: 'NOT_FEASIBLE',
  BUDGET_UNREASONABLE: 'BUDGET_UNREASONABLE',
  NOT_COMPLIANT: 'NOT_COMPLIANT',
  OTHER: 'OTHER',
} as const;

export type RejectReasonCode = (typeof REJECT_REASON_CODES)[keyof typeof REJECT_REASON_CODES];

export const REJECT_REASON_LABELS: Record<RejectReasonCode, string> = {
  NOT_SCIENTIFIC: 'Nội dung không có tính khoa học',
  NOT_FEASIBLE: 'Phương pháp không khả thi',
  BUDGET_UNREASONABLE: 'Kinh phí không hợp lý',
  NOT_COMPLIANT: 'Không tuân thủ quy định',
  OTHER: 'Khác',
};

/**
 * Cancel Proposal Request (Story 9.1)
 */
export interface CancelProposalRequest {
  proposalId: string;
  idempotencyKey: string;
  reason?: string;
}

/**
 * Withdraw Proposal Request (Story 9.1)
 */
export interface WithdrawProposalRequest {
  proposalId: string;
  idempotencyKey: string;
  reason?: string;
}

/**
 * Reject Proposal Request (Story 9.2)
 */
export interface RejectProposalRequest {
  proposalId: string;
  idempotencyKey: string;
  reasonCode: RejectReasonCode;
  comment: string;
}

/**
 * Pause Proposal Request (Story 9.3)
 */
export interface PauseProposalRequest {
  proposalId: string;
  idempotencyKey: string;
  reason: string;
  expectedResumeAt?: string;
}

/**
 * Resume Proposal Request (Story 9.3)
 */
export interface ResumeProposalRequest {
  proposalId: string;
  idempotencyKey: string;
}

/**
 * Workflow API Client
 *
 * Story 4.1: Faculty Approve Action
 * Story 4.2: Faculty Return Action
 * Story 9.1: Cancel/Withdraw Actions
 * Story 9.2: Reject Action
 * Story 9.3: Pause/Resume Actions
 */
export const workflowApi = {
  /**
   * Approve Faculty Review (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
   * Story 4.1: AC3 - State transition with workflow log
   *
   * @param proposalId - Proposal ID to approve
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in FACULTY_REVIEW state
   * @throws 403 if user lacks QUAN_LY_KHOA or THU_KY_KHOA role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  approveFacultyReview: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<ApproveFacultyReviewResponse>(
      `/workflow/${proposalId}/approve-faculty`,
      {
        proposalId,
        // Note: idempotencyKey sent in header (X-Idempotency-Key) for IdempotencyInterceptor
        // Body field kept for DTO compatibility but interceptor checks header
        idempotencyKey,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Return Faculty Review (FACULTY_REVIEW → CHANGES_REQUESTED)
   * Story 4.2: Faculty Return Action with reason code and sections
   *
   * @param proposalId - Proposal ID to return
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reason - Return reason text
   * @param reasonCode - Reason code enum
   * @param reasonSections - Array of section IDs needing revision
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in FACULTY_REVIEW state
   * @throws 403 if user lacks QUAN_LY_KHOA or THU_KY_KHOA role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  returnFacultyReview: async (
    proposalId: string,
    idempotencyKey: string,
    reason: string,
    reasonCode: string,
    reasonSections?: string[],
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<ReturnFacultyReviewResponse>(
      `/workflow/${proposalId}/return-faculty`,
      {
        proposalId,
        reason,
        reasonCode,
        reasonSections,
        idempotencyKey,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Resubmit Proposal (CHANGES_REQUESTED → return_target_state)
   * Story 4.5: Resubmit after revisions - returns to reviewer, NOT to DRAFT
   *
   * @param proposalId - Proposal ID to resubmit
   * @param idempotencyKey - UUID v4 idempotency key
   * @param checkedSections - Array of section IDs marked as fixed
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in CHANGES_REQUESTED state
   * @throws 403 if user not owner of proposal
   * @throws 404 if proposal or return log not found
   * @throws 409 if idempotency key was already used
   */
  resubmitProposal: async (
    proposalId: string,
    idempotencyKey: string,
    checkedSections: string[],
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<ResubmitProposalResponse>(
      `/workflow/${proposalId}/resubmit`,
      {
        proposalId,
        checkedSections,
        idempotencyKey,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Submit Proposal (DRAFT → FACULTY_REVIEW)
   * Story 3.3: Submit action
   */
  submitProposal: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/submit`,
      {
        proposalId,
        idempotencyKey,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Start Project (APPROVED → IN_PROGRESS)
   * GIANG_VIEN Feature: Start implementation of approved proposal
   *
   * @param proposalId - Proposal ID to start
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in APPROVED state
   * @throws 403 if user lacks GIANG_VIEN role (must be owner)
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  startProject: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/start-project`,
      {
        proposalId,
        idempotencyKey,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Submit Acceptance (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
   * GIANG_VIEN Feature: Submit project for faculty acceptance review
   *
   * @param proposalId - Proposal ID to submit
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in IN_PROGRESS state
   * @throws 403 if user lacks GIANG_VIEN role (must be owner)
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  submitAcceptance: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/submit-acceptance`,
      {
        proposalId,
        idempotencyKey,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Assign Council (SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW)
   * Story 5.2: Assigns a council to a proposal for review
   *
   * @param proposalId - Proposal ID to assign council to
   * @param councilId - Council ID to assign
   * @param secretaryId - Secretary user ID
   * @param memberIds - Optional array of member IDs
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in SCHOOL_SELECTION_REVIEW state
   * @throws 403 if user lacks PHONG_KHCN role
   * @throws 404 if proposal or council not found
   * @throws 409 if idempotency key was already used
   */
  assignCouncil: async (
    proposalId: string,
    councilId: string,
    secretaryId: string,
    memberIds: string[] | undefined,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<AssignCouncilResponse>(
      `/council/${proposalId}/assign-council`,
      {
        proposalId,
        councilId,
        secretaryId,
        memberIds,
        idempotencyKey,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Get Workflow Logs for a proposal (Story 3.4)
   * Returns all workflow log entries sorted by timestamp DESC (newest first)
   *
   * @param proposalId - Proposal ID to get logs for
   * @returns Workflow logs with metadata
   */
  getWorkflowLogs: async (proposalId: string): Promise<WorkflowLog[]> => {
    const response = await apiClient.get<GetWorkflowLogsResponse>(
      `/workflow/${proposalId}/logs`,
    );
    return response.data.data;
  },

  /**
   * Get Latest RETURN Log Entry (Story 4.3)
   * Returns the most recent RETURN action workflow log for a proposal.
   * Used by ChangesRequestedBanner to display return details.
   *
   * @param proposalId - Proposal ID to get latest return log for
   * @returns Latest RETURN log entry or null if no return exists
   */
  getLatestReturn: async (proposalId: string): Promise<WorkflowLog | null> => {
    const logs = await workflowApi.getWorkflowLogs(proposalId);
    // Find first RETURN action log (logs are sorted DESC, newest first)
    return logs.find((log) => log.action === 'RETURN') || null;
  },

  /**
   * Download Revision PDF (Story 4.6)
   * Downloads the revision PDF for a proposal with changes requested.
   *
   * @param proposalId - Proposal ID to download revision PDF for
   * @returns Promise that resolves when download is complete
   */
  downloadRevisionPdf: async (proposalId: string): Promise<void> => {
    await downloadRevisionPdf(proposalId);
  },

  /**
   * Cancel Proposal (DRAFT → CANCELLED)
   * Story 9.1: Cancel Action - Owner can cancel DRAFT proposals
   *
   * @param proposalId - Proposal ID to cancel
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reason - Optional reason for cancellation
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in DRAFT state
   * @throws 403 if user not owner of proposal
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  cancelProposal: async (
    proposalId: string,
    idempotencyKey: string,
    reason?: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/cancel`,
      { reason },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Withdraw Proposal (Before APPROVED → WITHDRAWN)
   * Story 9.1: Withdraw Action - Owner can withdraw before approval
   *
   * @param proposalId - Proposal ID to withdraw
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reason - Optional reason for withdrawal
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal state >= APPROVED
   * @throws 403 if user not owner of proposal
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  withdrawProposal: async (
    proposalId: string,
    idempotencyKey: string,
    reason?: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/withdraw`,
      { reason },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Reject Proposal (Review State → REJECTED)
   * Story 9.2: Reject Action - Decision makers can reject proposals
   *
   * @param proposalId - Proposal ID to reject
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reasonCode - Standardized reason code enum
   * @param comment - Required comment explaining rejection
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal in terminal state
   * @throws 403 if user lacks permission for current state
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  rejectProposal: async (
    proposalId: string,
    idempotencyKey: string,
    reasonCode: RejectReasonCode,
    comment: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/reject`,
      { reasonCode, comment },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Pause Proposal (Active State → PAUSED)
   * Story 9.3: Pause Action - PHONG_KHCN can pause proposals
   *
   * @param proposalId - Proposal ID to pause
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reason - Required reason for pausing
   * @param expectedResumeAt - Optional expected resume date
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal in terminal state
   * @throws 403 if user lacks PHONG_KHCN role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  pauseProposal: async (
    proposalId: string,
    idempotencyKey: string,
    reason: string,
    expectedResumeAt?: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/pause`,
      { reason, expectedResumeAt },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Resume Proposal (PAUSED → Previous State)
   * Story 9.3: Resume Action - PHONG_KHCN can resume paused proposals
   *
   * @param proposalId - Proposal ID to resume
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in PAUSED state
   * @throws 403 if user lacks PHONG_KHCN role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  resumeProposal: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/resume`,
      {},
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Approve Council Review (OUTLINE_COUNCIL_REVIEW → APPROVED)
   * BAN_GIAM_HOC: Final approval - proposal moves to APPROVED state
   *
   * @param proposalId - Proposal ID to approve
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in OUTLINE_COUNCIL_REVIEW state
   * @throws 403 if user lacks BAN_GIAM_HOC role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  approveCouncilReview: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/approve-council`,
      { proposalId, idempotencyKey },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Return Council Review (OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal for changes with reason
   *
   * @param proposalId - Proposal ID to return
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reason - Return reason text
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in OUTLINE_COUNCIL_REVIEW state
   * @throws 403 if user lacks BAN_GIAM_HOC role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  returnCouncilReview: async (
    proposalId: string,
    idempotencyKey: string,
    reason: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/return-council`,
      { proposalId, reason, idempotencyKey },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Accept School Review (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
   * BAN_GIAM_HOC: Final acceptance - proposal moves to HANDOVER state
   *
   * @param proposalId - Proposal ID to accept
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in SCHOOL_ACCEPTANCE_REVIEW state
   * @throws 403 if user lacks BAN_GIAM_HOC role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  acceptSchoolReview: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/accept-school`,
      { proposalId, idempotencyKey },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Return School Review (SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal for changes before final acceptance
   *
   * @param proposalId - Proposal ID to return
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reason - Return reason text
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in SCHOOL_ACCEPTANCE_REVIEW state
   * @throws 403 if user lacks BAN_GIAM_HOC role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  returnSchoolReview: async (
    proposalId: string,
    idempotencyKey: string,
    reason: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/return-school`,
      { proposalId, reason, idempotencyKey },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Accept Faculty Acceptance Review (FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW)
   * QUAN_LY_KHOA/THU_KY_KHOA: Faculty acceptance - proposal moves to school acceptance review
   *
   * @param proposalId - Proposal ID to accept
   * @param idempotencyKey - UUID v4 idempotency key
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in FACULTY_ACCEPTANCE_REVIEW state
   * @throws 403 if user lacks QUAN_LY_KHOA or THU_KY_KHOA role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  acceptFacultyAcceptance: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/accept-faculty-acceptance`,
      { proposalId, idempotencyKey },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Return Faculty Acceptance Review (FACULTY_ACCEPTANCE_REVIEW → CHANGES_REQUESTED)
   * QUAN_LY_KHOA/THU_KY_KHOA: Return proposal for changes during faculty acceptance
   *
   * @param proposalId - Proposal ID to return
   * @param idempotencyKey - UUID v4 idempotency key
   * @param reason - Return reason text
   * @returns Transition result with proposal state and workflow log
   * @throws 400 if proposal not in FACULTY_ACCEPTANCE_REVIEW state
   * @throws 403 if user lacks QUAN_LY_KHOA or THU_KY_KHOA role
   * @throws 404 if proposal not found
   * @throws 409 if idempotency key was already used
   */
  returnFacultyAcceptance: async (
    proposalId: string,
    idempotencyKey: string,
    reason: string,
  ): Promise<TransitionResult> => {
    const response = await apiClient.post<{ success: true; data: TransitionResult }>(
      `/workflow/${proposalId}/return-faculty-acceptance`,
      { proposalId, reason, idempotencyKey },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },

  /**
   * Get Council Evaluation Summary (OUTLINE_COUNCIL_REVIEW state)
   * BAN_GIAM_HOC: View aggregated council evaluation results before approval
   *
   * @param proposalId - Proposal ID to get evaluation summary for
   * @returns Council evaluation summary with aggregate scores and individual evaluations
   * @throws 403 if user lacks BAN_GIAM_HOC or BGH role
   * @throws 404 if proposal or council not found
   */
  getCouncilEvaluationSummary: async (
    proposalId: string,
  ): Promise<CouncilEvaluationSummaryData> => {
    const response = await apiClient.get<CouncilEvaluationSummaryResponse>(
      `/evaluations/${proposalId}/summary`,
    );
    return response.data.data;
  },
};

/**
 * Council Evaluation Summary Types
 * For BAN_GIAM_HOC to view before approval
 */

export interface AggregateScore {
  avg: number;
  min: number;
  max: number;
}

export interface AggregateScores {
  scientificContent: AggregateScore;
  researchMethod: AggregateScore;
  feasibility: AggregateScore;
  budget: AggregateScore;
  overallAvg: number;
}

export interface EvaluationSummary {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  isSecretary: boolean;
  scientificContentScore: number;
  researchMethodScore: number;
  feasibilityScore: number;
  budgetScore: number;
  totalScore: number;
  conclusion?: string;
  otherComments?: string;
}

export interface CouncilEvaluationSummaryData {
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  councilName: string;
  secretaryName: string;
  submittedCount: number;
  totalMembers: number;
  allSubmitted: boolean;
  aggregateScores: AggregateScores;
  finalConclusion?: 'DAT' | 'KHONG_DAT' | null;
  finalComments?: string;
  evaluations: EvaluationSummary[];
}

export interface CouncilEvaluationSummaryResponse {
  success: true;
  data: CouncilEvaluationSummaryData;
}
