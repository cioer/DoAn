import { apiClient } from '../auth/auth';

/**
 * Councils API Client (Story 5.2)
 * Handles council-related API calls
 */

/**
 * Council Member type
 */
export interface CouncilMember {
  id: string;
  councilId: string;
  userId: string;
  displayName: string;
  role: string;
  createdAt: string;
}

/**
 * Council type
 */
export interface Council {
  id: string;
  name: string;
  type: string;
  secretaryId: string | null;
  secretaryName: string | null;
  members: CouncilMember[];
  createdAt: string;
  updatedAt: string;
}

/**
 * List Councils Response
 */
export interface ListCouncilsResponse {
  councils: Council[];
  total: number;
}

/**
 * Eligible Member type (for dropdown)
 */
export interface EligibleMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
  facultyId: string | null;
}

/**
 * List Eligible Members Response
 */
export interface ListEligibleMembersResponse {
  members: EligibleMember[];
  total: number;
}

/**
 * Councils API
 */
export const councilsApi = {
  /**
   * Get list of councils (Story 5.2)
   * @param type - Optional council type filter (OUTLINE, ACCEPTANCE, etc.)
   */
  async getCouncils(type?: string): Promise<ListCouncilsResponse> {
    const params = type ? `?type=${type}` : '';
    const response = await apiClient.get(`/council${params}`);
    return response.data;
  },

  /**
   * Get council by ID
   * @param id - Council ID
   */
  async getCouncilById(id: string): Promise<Council> {
    const response = await apiClient.get(`/council/${id}`);
    return response.data;
  },

  /**
   * Get eligible members for council (Story 5.2)
   * Returns users with HOI_DONG or THANH_TRUNG roles
   */
  async getEligibleMembers(): Promise<ListEligibleMembersResponse> {
    const response = await apiClient.get('/council/members');
    return response.data;
  },

  /**
   * Create new council
   * @param data - Council data
   */
  async createCouncil(data: {
    name: string;
    type: string;
    secretaryId?: string;
    memberIds?: string[];
  }): Promise<Council> {
    const response = await apiClient.post('/council', data);
    return response.data;
  },

  /**
   * Update council
   * @param id - Council ID
   * @param data - Council data to update
   */
  async updateCouncil(
    id: string,
    data: {
      name?: string;
      type?: string;
      secretaryId?: string;
      memberIds?: string[];
    }
  ): Promise<Council> {
    const response = await apiClient.put(`/council/${id}`, data);
    return response.data;
  },

  /**
   * Delete council
   * @param id - Council ID
   */
  async deleteCouncil(id: string): Promise<{ success: true; message: string }> {
    const response = await apiClient.delete(`/council/${id}`);
    return response.data;
  },
};

export default councilsApi;
