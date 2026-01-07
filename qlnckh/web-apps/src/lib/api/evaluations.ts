import { apiClient } from '../auth/auth';

/**
 * Evaluation API (Story 5.3, Story 5.4)
 * Provides API methods for council evaluation operations
 */

/**
 * Evaluation State Enum
 */
export enum EvaluationState {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED', // Story 5.4: Replaced SUBMITTED with FINALIZED
}

/**
 * Evaluation Score with Comments
 */
export interface EvaluationScore {
  score: number;
  comments: string;
}

/**
 * Evaluation Form Data Structure (Story 5.3)
 */
export interface EvaluationFormData {
  scientificContent: EvaluationScore;
  researchMethod: EvaluationScore;
  feasibility: EvaluationScore;
  budget: EvaluationScore;
  conclusion: 'DAT' | 'KHONG_DAT';
  otherComments?: string;
}

/**
 * Evaluation DTO
 */
export interface Evaluation {
  id: string;
  proposalId: string;
  evaluatorId: string;
  state: EvaluationState;
  formData: EvaluationFormData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get or Create Evaluation Response (Story 5.3)
 */
export interface GetOrCreateEvaluationResponse {
  success: true;
  data: Evaluation;
}

/**
 * Update Evaluation Request (Story 5.3)
 */
export interface UpdateEvaluationRequest {
  formData?: Partial<EvaluationFormData>;
}

/**
 * Update Evaluation Response (Story 5.3)
 */
export interface UpdateEvaluationResponse {
  success: true;
  data: Evaluation;
}

/**
 * Error Response DTO
 */
export interface EvaluationErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Submit Evaluation Request (Story 5.4)
 */
export interface SubmitEvaluationRequest {
  idempotencyKey: string;
}

/**
 * Submit Evaluation Response (Story 5.4)
 */
export interface SubmitEvaluationResponse {
  success: true;
  data: {
    evaluationId: string;
    state: string;
    proposalId: string;
    proposalState: string;
    submittedAt: string;
  };
}

/**
 * Default Evaluation Form Data (Story 5.3)
 * Used when creating a new draft evaluation
 */
export const DEFAULT_EVALUATION_DATA: EvaluationFormData = {
  scientificContent: { score: 3, comments: '' },
  researchMethod: { score: 3, comments: '' },
  feasibility: { score: 3, comments: '' },
  budget: { score: 3, comments: '' },
  conclusion: 'DAT' as const,
  otherComments: '',
};

/**
 * Generate UUID v4 for idempotency key (Story 5.4)
 */
export const generateIdempotencyKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Evaluation API Client
 * Story 5.3: Evaluation Form Draft
 * Story 5.4: Preview PDF + Confirm Gate
 */
export const evaluationApi = {
  /**
   * Get or create draft evaluation for a proposal
   * Auto-creates draft if it doesn't exist
   *
   * @param proposalId - Proposal ID
   * @returns Evaluation (draft or existing)
   * @throws 400 if proposal not in OUTLINE_COUNCIL_REVIEW state
   * @throws 403 if user is not the assigned secretary (holder_user != current user)
   * @throws 404 if proposal not found
   */
  getOrCreateEvaluation: async (proposalId: string): Promise<Evaluation> => {
    const response = await apiClient.get<GetOrCreateEvaluationResponse>(
      `/evaluations/${proposalId}`,
    );
    return response.data.data;
  },

  /**
   * Update evaluation form data
   * Only allows updating DRAFT evaluations
   *
   * @param proposalId - Proposal ID
   * @param formData - Partial form data to update
   * @returns Updated evaluation
   * @throws 403 if evaluation is FINALIZED (Story 5.4, Story 5.5)
   * @throws 404 if evaluation not found
   */
  updateEvaluation: async (
    proposalId: string,
    formData: Partial<EvaluationFormData>,
  ): Promise<Evaluation> => {
    const response = await apiClient.patch<UpdateEvaluationResponse>(
      `/evaluations/${proposalId}`,
      { formData },
    );
    return response.data.data;
  },

  /**
   * Submit evaluation (Story 5.4)
   * Transitions evaluation from DRAFT to FINALIZED
   * Transitions proposal from OUTLINE_COUNCIL_REVIEW to APPROVED
   *
   * @param proposalId - Proposal ID
   * @param idempotencyKey - UUID v4 for idempotency
   * @returns Submitted evaluation and updated proposal
   * @throws 400 if proposal not in OUTLINE_COUNCIL_REVIEW state or form incomplete
   * @throws 403 if user is not the assigned secretary
   * @throws 404 if evaluation not found
   */
  submitEvaluation: async (
    proposalId: string,
    idempotencyKey: string,
  ): Promise<SubmitEvaluationResponse['data']> => {
    const response = await apiClient.post<SubmitEvaluationResponse>(
      `/evaluations/${proposalId}/submit`,
      { idempotencyKey },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );
    return response.data.data;
  },
};

/**
 * localStorage namespace for evaluation drafts (Story 5.3)
 * Used for auto-save functionality
 */
export const EVALUATION_STORAGE_KEY = (proposalId: string) =>
  `evaluation_draft_${proposalId}`;
