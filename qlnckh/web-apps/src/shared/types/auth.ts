/**
 * Shared authentication types
 * These types are shared between frontend and backend to avoid importing
 * backend dependencies (like @prisma/client) in the frontend
 */
import { Permission } from './permissions';

export enum UserRole {
  GIANG_VIEN = 'GIANG_VIEN',
  QUAN_LY_KHOA = 'QUAN_LY_KHOA',
  HOI_DONG = 'HOI_DONG',
  BGH = 'BGH',
  PHONG_KHCN = 'PHONG_KHCN',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  facultyId?: string | null;
  permissions: Permission[];
}

export interface AuthResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}
