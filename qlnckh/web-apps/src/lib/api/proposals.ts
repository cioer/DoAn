import { apiClient } from '../auth/auth';

/**
 * Proposal types matching backend DTOs
 */
export interface Proposal {
  id: string;
  code: string;
  title: string;
  state: string;
  ownerId: string;
  facultyId: string;
  holderUnit: string | null;
  holderUser: string | null;
  slaStartDate: Date | null;
  slaDeadline: Date | null;
  templateId: string | null;
  templateVersion: string | null;
  formData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  template?: {
    id: string;
    code: string;
    name: string;
    version: string;
  } | null;
  owner?: {
    id: string;
    email: string;
    displayName: string;
    role?: string;
  };
  faculty?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateProposalRequest {
  title: string;
  facultyId: string;
  templateId: string;
  formData?: Record<string, unknown>;
}

export interface UpdateProposalRequest {
  title?: string;
  formData?: Record<string, unknown>;
}

export interface AutoSaveProposalRequest {
  formData: Record<string, unknown>;
  expectedUpdatedAt?: Date;
}

export interface ProposalListParams {
  ownerId?: string;
  state?: string;
  facultyId?: string;
  page?: number;
  limit?: number;
}

export interface ProposalListResponse {
  data: Proposal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Proposals API Client
 *
 * All proposal-related API calls
 */
export const proposalsApi = {
  /**
   * Get paginated list of proposals with optional filters
   */
  getProposals: async (params: ProposalListParams = {}): Promise<ProposalListResponse> => {
    const { page = 1, limit = 20, ownerId, state, facultyId } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));
    if (ownerId) queryParams.append('ownerId', ownerId);
    if (state) queryParams.append('state', state);
    if (facultyId) queryParams.append('facultyId', facultyId);

    const response = await apiClient.get<{ success: true; data: Proposal[]; meta: any }>(
      `/proposals?${queryParams.toString()}`,
    );

    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  /**
   * Get proposal by ID
   */
  getProposalById: async (id: string): Promise<Proposal> => {
    const response = await apiClient.get<{ success: true; data: Proposal }>(
      `/proposals/${id}`,
    );
    return response.data.data;
  },

  /**
   * Create a new proposal (DRAFT state)
   */
  createProposal: async (data: CreateProposalRequest): Promise<Proposal> => {
    const response = await apiClient.post<{ success: true; data: Proposal }>(
      '/proposals',
      data,
    );
    return response.data.data;
  },

  /**
   * Update proposal (DRAFT only)
   */
  updateProposal: async (id: string, data: UpdateProposalRequest): Promise<Proposal> => {
    const response = await apiClient.put<{ success: true; data: Proposal }>(
      `/proposals/${id}`,
      data,
    );
    return response.data.data;
  },

  /**
   * Auto-save proposal form data (Story 2.3)
   * Deep merges partial form data with existing data
   */
  autoSave: async (id: string, data: AutoSaveProposalRequest): Promise<Proposal> => {
    const response = await apiClient.patch<{ success: true; data: Proposal }>(
      `/proposals/${id}/auto-save`,
      data,
    );
    return response.data.data;
  },

  /**
   * Delete proposal (DRAFT only)
   */
  deleteProposal: async (id: string): Promise<void> => {
    await apiClient.delete(`/proposals/${id}`);
  },
};
