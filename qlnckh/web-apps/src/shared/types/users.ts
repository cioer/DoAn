/**
 * User Management Types
 *
 * Types for user management operations
 */
import { UserRole } from './auth';

export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  facultyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  role: UserRole;
  facultyId?: string;
}

export interface CreateUserResponse {
  user: UserListItem;
  temporaryPassword: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: UserRole;
  facultyId?: string;
}

export interface UserListResponse {
  users: UserListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  facultyId?: string;
  search?: string;
}
