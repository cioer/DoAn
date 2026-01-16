import { apiClient } from '../auth/auth';
import type {
  UserListItem,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UserListResponse,
  UserListParams,
} from '../../shared/types/users';

// Faculty types
export interface Faculty {
  id: string;
  code: string;
  name: string;
  type: 'FACULTY' | 'DEPARTMENT';
  createdAt: string;
  updatedAt: string;
}

export interface FacultyListResponse {
  faculties: Faculty[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FacultySelectItem {
  id: string;
  code: string;
  name: string;
}

/**
 * Faculties API Client
 */
export const facultiesApi = {
  getFaculties: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
  }): Promise<FacultyListResponse> => {
    const response = await apiClient.get<{ success: true; data: Faculty[]; meta: any }>(
      '/faculties',
      { params: params || {} },
    );
    return {
      faculties: response.data.data,
      meta: response.data.meta,
    };
  },

  getFacultiesForSelect: async (): Promise<FacultySelectItem[]> => {
    const response = await apiClient.get<{ success: true; data: FacultySelectItem[] }>(
      '/faculties/select',
    );
    return response.data.data;
  },

  createFaculty: async (data: { code: string; name: string; type?: string }): Promise<Faculty> => {
    const response = await apiClient.post<{ success: true; data: Faculty }>(
      '/faculties',
      data,
    );
    return response.data.data;
  },

  updateFaculty: async (id: string, data: { code?: string; name?: string; type?: string }): Promise<Faculty> => {
    const response = await apiClient.patch<{ success: true; data: Faculty }>(
      `/faculties/${id}`,
      data,
    );
    return response.data.data;
  },

  deleteFaculty: async (id: string): Promise<Faculty> => {
    const response = await apiClient.delete<{ success: true; data: Faculty }>(
      `/faculties/${id}`,
    );
    return response.data.data;
  },
};

/**
 * Users API Client
 *
 * All user management API calls
 */
export const usersApi = {
  /**
   * Get paginated list of users with optional filters
   */
  getUsers: async (params: UserListParams = {}): Promise<UserListResponse> => {
    const { page = 1, limit = 20, role, facultyId, search } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('page', String(page));
    queryParams.append('limit', String(limit));
    if (role) queryParams.append('role', role);
    if (facultyId) queryParams.append('facultyId', facultyId);
    if (search) queryParams.append('search', search);

    const response = await apiClient.get<{ success: true; data: UserListItem[]; meta: any }>(
      `/users?${queryParams.toString()}`,
    );

    return {
      users: response.data.data,
      meta: response.data.meta,
    };
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: string): Promise<UserListItem> => {
    const response = await apiClient.get<{ success: true; data: UserListItem }>(
      `/users/${id}`,
    );
    return response.data.data;
  },

  /**
   * Create a new user
   * Returns temporary password that is only shown once
   */
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    const response = await apiClient.post<{ success: true; data: CreateUserResponse }>(
      '/users',
      data,
    );
    return response.data.data;
  },

  /**
   * Update user (role, facultyId, displayName)
   */
  updateUser: async (id: string, data: UpdateUserRequest): Promise<UserListItem> => {
    const response = await apiClient.patch<{ success: true; data: UserListItem }>(
      `/users/${id}`,
      data,
    );
    return response.data.data;
  },

  /**
   * Soft delete user
   */
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  /**
   * Reset user password (Admin only)
   * Returns the new temporary 8-character password
   */
  resetPassword: async (id: string): Promise<{ userId: string; email: string; temporaryPassword: string; message: string }> => {
    const response = await apiClient.post<{
      success: true;
      data: { userId: string; email: string; temporaryPassword: string; message: string };
    }>(`/users/${id}/reset-password`, {});
    return response.data.data;
  },
};

/**
 * My Account API
 *
 * Self-service endpoints for authenticated users
 */
export const myAccountApi = {
  /**
   * Change own password
   * Requires current password verification
   */
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await apiClient.post<{ success: true; data: { message: string } }>(
      '/me/change-password',
      data,
    );
    return response.data.data;
  },
};
