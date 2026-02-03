import { apiClient } from '../auth/auth';

/**
 * Faculty Councils API Client
 * Handles faculty-level council management for QUAN_LY_KHOA role
 */

/**
 * Council Member type
 */
export interface FacultyCouncilMember {
  id: string;
  councilId: string;
  userId: string;
  displayName: string;
  role: string;
  createdAt: string;
}

/**
 * Faculty Council type
 */
export interface FacultyCouncil {
  id: string;
  name: string;
  type: 'FACULTY_OUTLINE' | 'FACULTY_ACCEPTANCE';
  scope: 'FACULTY';
  facultyId: string;
  facultyName?: string;
  secretaryId: string | null;
  secretaryName: string | null;
  members: FacultyCouncilMember[];
  votingMemberCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * List Faculty Councils Response
 */
export interface ListFacultyCouncilsResponse {
  councils: FacultyCouncil[];
  total: number;
}

/**
 * Eligible Member type (for dropdown)
 */
export interface FacultyEligibleMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
  facultyId: string;
}

/**
 * List Faculty Eligible Members Response
 */
export interface ListFacultyEligibleMembersResponse {
  members: FacultyEligibleMember[];
  total: number;
}

/**
 * Create Faculty Council Request
 */
export interface CreateFacultyCouncilRequest {
  name: string;
  type: 'FACULTY_OUTLINE' | 'FACULTY_ACCEPTANCE';
  secretaryId: string;
  memberIds: string[];
}

/**
 * Create Faculty Council Response
 */
export interface CreateFacultyCouncilResponse {
  success: boolean;
  data: FacultyCouncil;
}

/**
 * Faculty Councils API
 */
export const facultyCouncilsApi = {
  /**
   * Get list of faculty councils
   * @param facultyId - Faculty ID (must be valid UUID)
   * @param type - Optional council type filter (FACULTY_OUTLINE, FACULTY_ACCEPTANCE)
   */
  async getFacultyCouncils(
    facultyId: string,
    type?: 'FACULTY_OUTLINE' | 'FACULTY_ACCEPTANCE'
  ): Promise<ListFacultyCouncilsResponse> {
    // Validate facultyId before making request
    if (!facultyId || facultyId === 'undefined' || facultyId === 'null') {
      throw new Error('Faculty ID không hợp lệ');
    }
    const params = type ? `?type=${type}` : '';
    const response = await apiClient.get(`/council/faculty/${facultyId}${params}`);
    return response.data;
  },

  /**
   * Get eligible members for faculty council
   * @param facultyId - Faculty ID (must be valid UUID)
   * @param excludeOwnerId - Optional owner ID to exclude (for proposal assignment)
   */
  async getFacultyEligibleMembers(
    facultyId: string,
    excludeOwnerId?: string
  ): Promise<ListFacultyEligibleMembersResponse> {
    // Validate facultyId before making request
    if (!facultyId || facultyId === 'undefined' || facultyId === 'null') {
      throw new Error('Faculty ID không hợp lệ');
    }
    const params = excludeOwnerId ? `?excludeOwnerId=${excludeOwnerId}` : '';
    const response = await apiClient.get(`/council/faculty/${facultyId}/members${params}`);
    return response.data;
  },

  /**
   * Create new faculty council
   * @param data - Council data
   *
   * Validation rules (enforced by backend):
   * - All members must belong to same faculty
   * - Minimum 3 voting members (excluding secretary)
   * - Voting member count MUST be odd
   * - Secretary must be in members list
   */
  async createFacultyCouncil(
    data: CreateFacultyCouncilRequest
  ): Promise<CreateFacultyCouncilResponse> {
    const response = await apiClient.post('/council/faculty', data);
    return response.data;
  },

  /**
   * Delete faculty council
   * @param councilId - Council ID
   */
  async deleteFacultyCouncil(
    councilId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/council/${councilId}`);
    return response.data;
  },
};

export default facultyCouncilsApi;
