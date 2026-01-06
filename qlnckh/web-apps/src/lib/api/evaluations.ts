import { apiClient } from '../auth/auth';

/**
 * Evaluation API (Story 5.3)
 * Provides API methods for council evaluation operations
 */

/**
 * Evaluation State Enum
 */
export enum EvaluationState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
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
 * Evaluation API Client
 * Story 5.3: Evaluation Form Draft
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
   * @throws 400 if evaluation is not in DRAFT state
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
};

/**
 * localStorage namespace for evaluation drafts (Story 5.3)
 * Used for auto-save functionality
 */
export const EVALUATION_STORAGE_KEY = (proposalId: string) =>
  `evaluation_draft_${proposalId}`;
