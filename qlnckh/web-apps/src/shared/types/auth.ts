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
  actingAs?: User; // Demo mode: acting as this user
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    error_code: string;
    message: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

// Demo mode types
export interface DemoPersona {
  id: string;
  name: string;
  role: UserRole;
  description: string;
}

export interface DemoModeConfig {
  enabled: boolean;
  personas: DemoPersona[];
}

export interface SwitchPersonaResponse {
  user: User;
  actingAs: User;
}

export interface ResetDemoCounts {
  users: number;
  faculties: number;
  proposals: number;
  holidays: number;
  permissions: number;
}

export interface ResetDemoResponse {
  message: string;
  counts: ResetDemoCounts;
  duration: number;
}
