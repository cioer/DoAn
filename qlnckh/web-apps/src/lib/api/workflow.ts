import { apiClient } from '../auth/auth';

/**
 * Workflow State Transitions
 * Story 4.1: Faculty Approve Action
 */

export interface ApproveFacultyReviewRequest {
  proposalId: string;
  idempotencyKey: string;
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

export interface WorkflowErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}

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
 * POST /api/workflow/:proposalId/approve-faculty
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
