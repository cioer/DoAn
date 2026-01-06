import { apiClient } from '../auth/auth';

/**
 * Workflow State Transitions
 * Story 4.1: Faculty Approve Action
 * Story 4.2: Faculty Return Action (Reason Code + Sections)
 */

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
 * Workflow API Client
 *
 * Story 4.1: Faculty Approve Action
 * Story 4.2: Faculty Return Action
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
};
