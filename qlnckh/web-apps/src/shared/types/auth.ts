/**
 * Shared authentication types
 * These types are shared between frontend and backend to avoid importing
 * backend dependencies (like @prisma/client) in the frontend
 */
import { Permission } from './permissions';

export enum UserRole {
  GIANG_VIEN = 'GIANG_VIEN',         // Giảng viên / PI
  QUAN_LY_KHOA = 'QUAN_LY_KHOA',     // Quản lý Khoa
  THU_KY_KHOA = 'THU_KY_KHOA',      // Thư ký Khoa
  PHONG_KHCN = 'PHONG_KHCN',        // Phòng KHCN
  THU_KY_HOI_DONG = 'THU_KY_HOI_DONG',  // Thư ký Hội đồng
  THANH_TRUNG = 'THANH_TRUNG',      // Thành viên Hội đồng
  BAN_GIAM_HOC = 'BAN_GIAM_HOC',    // Ban Giám học
  HOI_DONG = 'HOI_DONG',            // Legacy: Thành viên Hội đồng (same as THANH_TRUNG)
  BGH = 'BGH',                      // Legacy: Ban Giám hiệu (same as BAN_GIAM_HOC)
  ADMIN = 'ADMIN',                  // Quản trị hệ thống
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
