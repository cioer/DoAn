import { apiClient } from '../auth/auth';
import type {
  UserListItem,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UserListResponse,
  UserListParams,
} from '../../shared/types/users';

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
};
