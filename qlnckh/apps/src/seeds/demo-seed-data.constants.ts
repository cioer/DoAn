import { UserRole, ProjectState, WorkflowAction, FacultyType } from '@prisma/client';

/**
 * Demo Seed Data Constants
 *
 * Fixed IDs for demo personas (MUST match DEMO_PERSONAS from demo-personas.ts)
 * All IDs are deterministic to ensure reproducible demo environments
 *
 * Deterministic Strategy:
 * - User IDs use fixed strings (DT-USER-XXX) instead of random UUIDs
 * - Faculty/Proposal IDs use UUID v5 (namespace-based) for determinism
 * - Timestamps use fixed dates for consistent demo data
 */

// ============================================================
// DEMO USERS
// ============================================================

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  facultyCode?: string;
}

/**
 * 8 Demo Users matching DEMO_PERSONAS from Story 1.5
 * All have password: Demo@123
 */
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'DT-USER-001',
    email: 'DT-USER-001@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Nguyễn Văn A',
    role: UserRole.GIANG_VIEN,
    facultyCode: 'FAC-001',
  },
  {
    id: 'DT-USER-002',
    email: 'DT-USER-002@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Trần Thị B',
    role: UserRole.QUAN_LY_KHOA,
    facultyCode: 'FAC-001',
  },
  {
    id: 'DT-USER-003',
    email: 'DT-USER-003@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Lê Văn C',
    role: UserRole.THU_KY_KHOA,
    facultyCode: 'FAC-001',
  },
  {
    id: 'DT-USER-004',
    email: 'DT-USER-004@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Phạm Thị D',
    role: UserRole.PHONG_KHCN,
    facultyCode: undefined, // PKHCN không thuộc faculty
  },
  {
    id: 'DT-USER-005',
    email: 'DT-USER-005@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Hoàng Văn E',
    role: UserRole.THU_KY_HOI_DONG,
    facultyCode: undefined,
  },
  {
    id: 'DT-USER-006',
    email: 'DT-USER-006@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Đặng Thị F',
    role: UserRole.THANH_TRUNG,
    facultyCode: undefined,
  },
  {
    id: 'DT-USER-007',
    email: 'DT-USER-007@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Vũ Văn G',
    role: UserRole.BAN_GIAM_HOC,
    facultyCode: undefined,
  },
  {
    id: 'DT-USER-008',
    email: 'DT-USER-008@demo.qlnckh.edu.vn',
    password: 'Demo@123',
    displayName: 'Admin System',
    role: UserRole.ADMIN,
    facultyCode: undefined,
  },
];

// ============================================================
// FACULTIES
// ============================================================

export interface DemoFaculty {
  code: string;
  name: string;
  type: FacultyType;
}

/**
 * 4 Faculties for demo
 */
export const DEMO_FACULTIES: DemoFaculty[] = [
  {
    code: 'FAC-001',
    name: 'Khoa Công nghệ thông tin',
    type: FacultyType.FACULTY,
  },
  {
    code: 'FAC-002',
    name: 'Khoa Kinh tế',
    type: FacultyType.FACULTY,
  },
  {
    code: 'FAC-003',
    name: 'Khoa Xây dựng',
    type: FacultyType.FACULTY,
  },
  {
    code: 'FAC-004',
    name: 'Phòng Khoa học Công nghệ',
    type: FacultyType.DEPARTMENT,
  },
];

// ============================================================
// WORKFLOW LOGS
// ============================================================

export interface DemoWorkflowLog {
  action: WorkflowAction;
  fromState?: ProjectState;
  toState: ProjectState;
  actorId: string;
  actorName: string;
  returnTargetState?: ProjectState;
  returnTargetHolderUnit?: string;
  reasonCode?: string;
  comment?: string;
}

// ============================================================
// PROPOSALS
// ============================================================

export interface DemoProposal {
  code: string;
  title: string;
  state: ProjectState;
  ownerId: string;
  facultyCode: string;
  holderUnit?: string;
  holderUser?: string;
  workflowLogs?: DemoWorkflowLog[];
}

/**
 * 10 Proposals covering all workflow states for demo
 * DT-001 to DT-010 with deterministic codes
 */
export const DEMO_PROPOSALS: DemoProposal[] = [
  {
    code: 'DT-001',
    title: 'Nghiên cứu ứng dụng AI trong giáo dục',
    state: ProjectState.DRAFT,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: undefined, // DRAFT không có holder
    holderUser: undefined,
  },
  {
    code: 'DT-002',
    title: 'Phát triển hệ thống IoT cho nông nghiệp thông minh',
    state: ProjectState.FACULTY_REVIEW,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: 'FAC-001', // Khoa CNTT
    holderUser: undefined,
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
    ],
  },
  {
    code: 'DT-003',
    title: 'Nghiên cứu vật liệu nano bền vững',
    state: ProjectState.FACULTY_REVIEW,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-002',
    holderUnit: 'FAC-002', // Khoa Kinh tế
    holderUser: undefined,
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
    ],
  },
  {
    code: 'DT-004',
    title: 'Ứng dụng Blockchain trong quản lý chuỗi cung ứng',
    state: ProjectState.CHANGES_REQUESTED,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: 'FAC-001', // Về lại Khoa CNTT
    holderUser: 'DT-USER-001', // PI cần sửa
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.RETURN,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.CHANGES_REQUESTED,
        returnTargetState: ProjectState.FACULTY_REVIEW,
        returnTargetHolderUnit: 'FAC-001',
        reasonCode: 'NEED_CLARIFICATION',
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
    ],
  },
  {
    code: 'DT-005',
    title: 'Nghiên cứu năng lượng tái tạo cho khu vực miền núi',
    state: ProjectState.SCHOOL_SELECTION_REVIEW,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: 'FAC-004', // PKHCN
    holderUser: undefined,
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.APPROVE,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
    ],
  },
  {
    code: 'DT-006',
    title: 'Phân tích dữ liệu lớn y tế Việt Nam',
    state: ProjectState.OUTLINE_COUNCIL_REVIEW,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: 'COUNCIL-001', // Hội đồng
    holderUser: 'DT-USER-005', // Thư ký HĐ
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.APPROVE,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
      {
        action: WorkflowAction.ASSIGN_COUNCIL,
        fromState: ProjectState.SCHOOL_SELECTION_REVIEW,
        toState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        actorId: 'DT-USER-004',
        actorName: 'Phạm Thị D',
      },
    ],
  },
  {
    code: 'DT-007',
    title: 'Nghiên cứu robot công nghiệp',
    state: ProjectState.APPROVED,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-002',
    holderUnit: 'FAC-002', // Về lại Khoa
    holderUser: 'DT-USER-001', // PI
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.APPROVE,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
      {
        action: WorkflowAction.ASSIGN_COUNCIL,
        fromState: ProjectState.SCHOOL_SELECTION_REVIEW,
        toState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        actorId: 'DT-USER-004',
        actorName: 'Phạm Thị D',
      },
      {
        action: WorkflowAction.FINALIZE,
        fromState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        toState: ProjectState.APPROVED,
        actorId: 'DT-USER-005',
        actorName: 'Hoàng Văn E',
      },
    ],
  },
  {
    code: 'DT-008',
    title: 'Hệ thống giám sát môi trường',
    state: ProjectState.IN_PROGRESS,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: 'FAC-001',
    holderUser: 'DT-USER-001',
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.APPROVE,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
      {
        action: WorkflowAction.ASSIGN_COUNCIL,
        fromState: ProjectState.SCHOOL_SELECTION_REVIEW,
        toState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        actorId: 'DT-USER-004',
        actorName: 'Phạm Thị D',
      },
      {
        action: WorkflowAction.FINALIZE,
        fromState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        toState: ProjectState.APPROVED,
        actorId: 'DT-USER-005',
        actorName: 'Hoàng Văn E',
      },
      {
        action: WorkflowAction.START_PROJECT,
        fromState: ProjectState.APPROVED,
        toState: ProjectState.IN_PROGRESS,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
    ],
  },
  {
    code: 'DT-009',
    title: 'Nền tảng Smart City cho đô thị thông minh',
    state: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: 'FAC-001', // Khoa nghiệm thu
    holderUser: undefined,
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.APPROVE,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
      {
        action: WorkflowAction.ASSIGN_COUNCIL,
        fromState: ProjectState.SCHOOL_SELECTION_REVIEW,
        toState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        actorId: 'DT-USER-004',
        actorName: 'Phạm Thị D',
      },
      {
        action: WorkflowAction.FINALIZE,
        fromState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        toState: ProjectState.APPROVED,
        actorId: 'DT-USER-005',
        actorName: 'Hoàng Văn E',
      },
      {
        action: WorkflowAction.START_PROJECT,
        fromState: ProjectState.APPROVED,
        toState: ProjectState.IN_PROGRESS,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.SUBMIT_ACCEPTANCE,
        fromState: ProjectState.IN_PROGRESS,
        toState: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
    ],
  },
  {
    code: 'DT-010',
    title: 'Công nghệ 4.0 trong sản xuất nông sản',
    state: ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
    ownerId: 'DT-USER-001',
    facultyCode: 'FAC-001',
    holderUnit: 'FAC-004', // PKHCN/ BGH xem xét
    holderUser: undefined,
    workflowLogs: [
      {
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.APPROVE,
        fromState: ProjectState.FACULTY_REVIEW,
        toState: ProjectState.SCHOOL_SELECTION_REVIEW,
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
      {
        action: WorkflowAction.ASSIGN_COUNCIL,
        fromState: ProjectState.SCHOOL_SELECTION_REVIEW,
        toState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        actorId: 'DT-USER-004',
        actorName: 'Phạm Thị D',
      },
      {
        action: WorkflowAction.FINALIZE,
        fromState: ProjectState.OUTLINE_COUNCIL_REVIEW,
        toState: ProjectState.APPROVED,
        actorId: 'DT-USER-005',
        actorName: 'Hoàng Văn E',
      },
      {
        action: WorkflowAction.START_PROJECT,
        fromState: ProjectState.APPROVED,
        toState: ProjectState.IN_PROGRESS,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.SUBMIT_ACCEPTANCE,
        fromState: ProjectState.IN_PROGRESS,
        toState: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
        actorId: 'DT-USER-001',
        actorName: 'Nguyễn Văn A',
      },
      {
        action: WorkflowAction.FACULTY_ACCEPT,
        fromState: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
        toState: ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
        actorId: 'DT-USER-002',
        actorName: 'Trần Thị B',
      },
    ],
  },
];

// ============================================================
// BUSINESS CALENDAR (HOLIDAYS)
// ============================================================

export interface DemoHoliday {
  date: string;
  name: string;
  isHoliday: boolean;
  isWorkingDay: boolean;
  recurring: boolean;
}

/**
 * Vietnamese holidays for 2026
 */
export const DEMO_HOLIDAYS: DemoHoliday[] = [
  {
    date: '2026-01-01',
    name: 'Tết Dương Lịch',
    isHoliday: true,
    isWorkingDay: false,
    recurring: true,
  },
  {
    date: '2026-02-10',
    name: 'Tết Nguyên Đán',
    isHoliday: true,
    isWorkingDay: false,
    recurring: false,
  },
  {
    date: '2026-02-11',
    name: 'Tết Nguyên Đán (ngày 2)',
    isHoliday: true,
    isWorkingDay: false,
    recurring: false,
  },
  {
    date: '2026-02-12',
    name: 'Tết Nguyên Đán (ngày 3)',
    isHoliday: true,
    isWorkingDay: false,
    recurring: false,
  },
  {
    date: '2026-04-30',
    name: 'Giải phóng miền Nam',
    isHoliday: true,
    isWorkingDay: false,
    recurring: true,
  },
  {
    date: '2026-05-01',
    name: 'Quốc tế Lao động',
    isHoliday: true,
    isWorkingDay: false,
    recurring: true,
  },
  {
    date: '2026-09-02',
    name: 'Quốc khánh',
    isHoliday: true,
    isWorkingDay: false,
    recurring: true,
  },
];

// ============================================================
// ROLE PERMISSIONS
// ============================================================

export interface DemoRolePermission {
  role: UserRole;
  permission: string;
}

/**
 * Role permissions for demo personas
 * Extends existing role-permissions.seed.ts with demo-specific permissions
 */
export const DEMO_ROLE_PERMISSIONS: DemoRolePermission[] = [
  // GIANG_VIEN permissions
  { role: UserRole.GIANG_VIEN, permission: 'DEMO_SWITCH_PERSONA' },

  // QUAN_LY_KHOA permissions
  { role: UserRole.QUAN_LY_KHOA, permission: 'DEMO_SWITCH_PERSONA' },

  // THU_KY_KHOA permissions
  { role: UserRole.THU_KY_KHOA, permission: 'DEMO_SWITCH_PERSONA' },

  // PHONG_KHCN permissions
  { role: UserRole.PHONG_KHCN, permission: 'DEMO_SWITCH_PERSONA' },
  { role: UserRole.PHONG_KHCN, permission: 'CALENDAR_MANAGE' },

  // THU_KY_HOI_DONG permissions
  { role: UserRole.THU_KY_HOI_DONG, permission: 'DEMO_SWITCH_PERSONA' },

  // THANH_TRUNG permissions
  { role: UserRole.THANH_TRUNG, permission: 'DEMO_SWITCH_PERSONA' },

  // BAN_GIAM_HOC permissions
  { role: UserRole.BAN_GIAM_HOC, permission: 'DEMO_SWITCH_PERSONA' },

  // ADMIN permissions - ALL
  { role: UserRole.ADMIN, permission: 'USER_MANAGE' },
  { role: UserRole.ADMIN, permission: 'DEMO_SWITCH_PERSONA' },
  { role: UserRole.ADMIN, permission: 'DEMO_RESET' },
  { role: UserRole.ADMIN, permission: 'CALENDAR_MANAGE' },
];
