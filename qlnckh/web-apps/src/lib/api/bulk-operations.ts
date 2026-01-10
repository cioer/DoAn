import { apiClient } from '../auth/auth';

/**
 * Bulk Operations types matching backend DTOs
 */
export interface BulkAssignRequest {
  proposalIds: string[];
  userId: string;
  idempotencyKey: string;
}

export interface BulkAssignResult {
  success: number;
  failed: number;
  results: Array<{
    proposalId: string;
    proposalCode: string;
    success: boolean;
    error?: string;
  }>;
}

export interface BulkRemindRequest {
  proposalIds: string[];
  idempotencyKey: string;
}

export interface BulkRemindResult {
  success: number;
  failed: number;
  results: Array<{
    proposalId: string;
    proposalCode: string;
    recipientEmail: string;
    emailSent: boolean;
    error?: string;
  }>;
}

export interface BulkAssignPreviewRequest {
  proposalIds: string[];
  userId: string;
}

export interface BulkAssignPreviewResult {
  total: number;
  valid: number;
  invalid: number;
  proposals: Array<{
    id: string;
    code: string;
    title: string;
    state: string;
    currentHolder?: string;
    canAssign: boolean;
    reason?: string;
  }>;
  targetUser?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Bulk Operations API Client
 *
 * All bulk operation API calls
 * Story 8.1: Bulk Assign Holder User
 * Story 8.2: Bulk Remind with Preview
 */
export const bulkOperationsApi = {
  /**
   * POST /api/bulk-operations/bulk-assign
   * Bulk assign holder user to proposals
   */
  bulkAssign: async (data: BulkAssignRequest): Promise<BulkAssignResult> => {
    const response = await apiClient.post<ApiResponse<BulkAssignResult>>('/bulk-operations/bulk-assign', data);
    return response.data.data;
  },

  /**
   * POST /api/bulk-operations/bulk-assign/preview
   * Preview bulk assign before execution
   */
  bulkAssignPreview: async (data: BulkAssignPreviewRequest): Promise<BulkAssignPreviewResult> => {
    const response = await apiClient.post<ApiResponse<BulkAssignPreviewResult>>('/bulk-operations/bulk-assign/preview', data);
    return response.data.data;
  },

  /**
   * POST /api/bulk-operations/bulk-remind
   * Bulk send reminders for proposals
   */
  bulkRemind: async (data: BulkRemindRequest): Promise<BulkRemindResult> => {
    const response = await apiClient.post<ApiResponse<BulkRemindResult>>('/bulk-operations/bulk-remind', data);
    return response.data.data;
  },

  /**
   * POST /api/bulk-operations/bulk-remind/preview
   * Preview bulk remind before execution
   */
  bulkRemindPreview: async (data: { proposalIds: string[] }): Promise<BulkRemindResult> => {
    const response = await apiClient.post<ApiResponse<BulkRemindResult>>('/bulk-operations/bulk-remind/preview', data);
    return response.data.data;
  },
};
