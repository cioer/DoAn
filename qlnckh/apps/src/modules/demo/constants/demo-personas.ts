import { UserRole } from '@prisma/client';

/**
 * Demo Persona interface
 * Represents a seeded user that can be impersonated in demo mode
 */
export interface DemoPersona {
  id: string;          // User ID from seed data
  name: string;        // Display name (Vietnamese)
  role: UserRole;      // Role enum value
  description: string; // Short description
}

/**
 * Demo personas list
 * These personas are seeded in Story 1.6 and can be impersonated in demo mode
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'DT-USER-001',
    name: 'Giảng viên',
    role: UserRole.GIANG_VIEN,
    description: 'Chủ nhiệm đề tài',
  },
  {
    id: 'DT-USER-002',
    name: 'Quản lý Khoa',
    role: UserRole.QUAN_LY_KHOA,
    description: 'Duyệt hồ sơ cấp Khoa',
  },
  {
    id: 'DT-USER-003',
    name: 'Thư ký Khoa',
    role: UserRole.THU_KY_KHOA,
    description: 'Thư ký Khoa',
  },
  {
    id: 'DT-USER-004',
    name: 'PKHCN',
    role: UserRole.PHONG_KHCN,
    description: 'Phòng Khoa học Công nghệ',
  },
  {
    id: 'DT-USER-005',
    name: 'Thư ký HĐ',
    role: UserRole.THU_KY_HOI_DONG,
    description: 'Thư ký Hội đồng',
  },
  {
    id: 'DT-USER-006',
    name: 'Thành viên HĐ',
    role: UserRole.THANH_TRUNG,
    description: 'Thành viên Hội đồng',
  },
  {
    id: 'DT-USER-007',
    name: 'BGH',
    role: UserRole.BAN_GIAM_HOC,
    description: 'Ban Giám học',
  },
  {
    id: 'DT-USER-008',
    name: 'Admin',
    role: UserRole.ADMIN,
    description: 'Quản trị hệ thống',
  },
];

/**
 * Demo persona IDs for quick lookup
 */
export const DEMO_PERSONA_IDS = new Set(DEMO_PERSONAS.map((p) => p.id));

/**
 * Get persona by user ID
 */
export function getPersonaById(userId: string): DemoPersona | undefined {
  return DEMO_PERSONAS.find((p) => p.id === userId);
}

/**
 * Check if a user ID is a demo persona
 */
export function isDemoPersona(userId: string): boolean {
  return DEMO_PERSONA_IDS.has(userId);
}
