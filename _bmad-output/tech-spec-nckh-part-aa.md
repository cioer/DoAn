# TECHNICAL SPECIFICATION
## Hệ thống Quản lý Nghiên cứu Khoa học
## Trường Đại học Sư phạm Kỹ thuật Nam Định

---

**Version:** 2.2
**Date:** 2026-01-03
**Author:** BMad Master Gap Analysis & Fix
**Status:** Ready for Development

**Changelog:**
- v2.2 (2026-01-03): **P2 NICE-TO-HAVE FIXES** - Fixed P2 issues from gap analysis:
  - P2-1: Standardized icon convention - Added lucide-react icon library reference with complete icon mapping for all 15 states, actions, navigation, and UI elements in UX design spec v1.2
- v2.1 (2026-01-03): **P1 IMPORTANT FIXES** - Fixed all P1 issues from gap analysis:
  - P1-1: Enhanced voting logic - Added `voting_thresholds` database table with stage-based thresholds (50% vs 66.67%), minimum member validation, and configurability
  - P1-2: Added working calendar configuration - `working_calendar_config` table with timezone support (Asia/Ho_Chi_Minh), working hours, lunch break, and `holidays` table for public holidays
  - P1-3: Added Nx monorepo workspace structure documentation with full folder structure, nx.json config, and common commands
- v2.0 (2026-01-03): **P0 CRITICAL FIXES** - Fixed all P0 issues from gap analysis:
  - P0-1: Updated backend framework from Express to NestJS 10.x (aligns with architecture.md)
  - P0-2: Clarified SUBMITTED as EVENT not STATE - removed from database CHECK constraint (15 states, not 16)
  - P0-3: Standardized return state storage - added `return_target_state` and `return_target_holder_unit` as top-level fields in workflow_logs table (NOT in project.metadata)
  - P0-4: Added `idempotency_key UUID UNIQUE` to workflow_logs table for API call deduplication
- v1.9 (2026-01-02): **FORM NAMES UPDATED FROM PDF** - Updated all document template names to match "Cac bieu mau quy dinh NCKH 2024.pdf": MAU_01B: "Phiếu đề xuất nghiên cứu khoa học", MAU_03B: "Biên bản họp đánh giá (cấp Khoa)", MAU_12B: "Nhận xét phản biện (Phản biện số 3)". Updated file names to match.
- v1.8 (2026-01-02): **P1 DECISIONS IMPLEMENTED** - P1.1: Task creation per transition (new task, close old) with unique constraint. P1.2: Documents as single source of truth, no form_submissions MVP. P1.3: Re-upload update-in-place, no history UI. P1.4: return_to_state rule for CHANGES_REQUESTED. P1.5: MAU_12B → SCHOOL_ACCEPTANCE_REVIEW, MAU_16B as "phiếu tổng". P1.6: SLA by (approval_tasks.stage, role) with pause/resume. Fixed MAU_02B/03B/04B/05B mapping.
- v1.7 (2026-01-02): **P0 CRITICAL FIXES** - State machine: REMOVED EXPERT_REVIEW (keep 16 canonical states), removed FINAL_REPORT_*/FINAL_REVIEW from SLA & 6.3, fixed "13 possible values" → "16 states". P0-2: project_type hardcoded to CAP_TRUONG in API + DB constraint. P0-3: Added is_internal, min_role_to_view to document_templates with visibility rules
- v1.6 (2026-01-02): **P0-1→P0-5 Critical Fixes** - Form mapping corrected (MAU_02B/03B, 04B/05B, 12B-16B), REMOVED EXPERT_REVIEW (keep 16 canonical states), removed FINAL_REPORT_*/FINAL_REVIEW from SLA & 6.3, fixed "13 possible values" → "16 states", Stage Pack Requirements with assertStagePackComplete(), created addendum-forms-signature.md, CAP_TRUONG scope locked
- v1.5 (2026-01-02): **P0/P1 Blockers Fixed** - REVISION_REQUIRED→CHANGES_REQUESTED, API upload-signed, CAP_TRUONG lock, FACULTY before COUNCIL constraint, Doc types including Mẫu 4b, Expert review rules (1 reviewer MVP), Comments spec
- v1.4 (2026-01-02): Mapping Phụ lục II forms, 2-tier acceptance workflow, vote tally summary, scan signatures as legal standard
- v1.3 (2026-01-02): Fixed state machine inconsistencies, added action matrix
- v1.2 (2026-01-02): Updated with wireframe gap analysis (P0, P1, P2 requirements)
- v1.1 (2026-01-02): Initial specification with core workflow

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [API Specification](#4-api-specification)
5. [Frontend Components](#5-frontend-components)
6. [Business Logic](#6-business-logic)
7. [Implementation Plan](#7-implementation-plan)

---

## 1. System Overview

### 1.1 Project Goals

Xây dựng hệ thống quản lý nghiên cứu khoa học (NCKH) hiện đại, mượt mà để:
- Quản lý quy trình xét chọn đề tài từ cấp Khoa đến cấp Trường
- Tối ưu hóa trải nghiệm người dùng (giảm thủ tục giấy tờ)
- Theo dõi SLA và trách nhiệm giải trình
- Tự động sinh văn bản .docx
- Dashboard theo vai trò

### 1.2 Scope

**In Scope:**
- Quản lý quy trình 4 bước: Khoa → HĐ KH&ĐT → Thẩm định → Phê duyệt
- 5 vai trò người dùng (Giảng viên, Quản lý Khoa, Phòng KHCN, Hội đồng, BGH)
- Tự động sinh văn bản từ template
- Theo dõi SLA với escalation 3 tầng
- 5 Role-based dashboards

**Out of Scope (Phase 1):**
- AI gợi ý thành viên hội đồng
- SMS/Zalo notification
- Form builder kéo thả
- Mobile app (web responsive only)

### 1.3 Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontend | Next.js 14+ | SSR, SEO friendly, modern React |
| Backend | NestJS 10.x | Type-safe, modular, scalable backend framework |
| Database | PostgreSQL 15+ | Relational, audit trail, ACID compliant |
| ORM | Prisma | Type-safe, migration support |
| Auth | JWT + httpOnly cookies | Stateless, secure |
| Doc Gen | docx-templates | Flexible .docx generation |
| Email | Nodemailer + SMTP | Email notification |
| UI Library | shadcn/ui + Tailwind | Modern, accessible, customizable |

### 1.4 i18n Policy (Internationalization)

**MVP Policy: 100% Tiếng Việt**

For the initial release (MVP), the system will use **100% Vietnamese** for:
- UI labels, buttons, messages
- Email notifications
- Error messages
- Document templates (.docx)
- Database stored values (role names, state labels, etc.)

**No i18n infrastructure is needed for MVP.**

**Future Expansion (Post-MVP):**

If multi-language support is needed later:
1. Add `next-i18next` or similar for frontend
2. Create translation files: `/locales/{lang}/common.json`
3. Backend API returns `message_key` instead of hardcoded text
4. Frontend looks up translations by key

**Key Convention for Future:**
```typescript
// Instead of: return "Đề tài đã được nộp"
// Use:
return {
  message_key: "PROJECT_SUBMITTED",
  params: { project_code: "PRJ-001" }
}
// Frontend renders: t('PROJECT_SUBMITTED', { project_code: 'PRJ-001' })
```

**For MVP (Current Spec):**
All UI text is hardcoded Vietnamese. No message_key system needed.

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │ Giảng viên  │ Quản lý Khoa │  Phòng KHCN │    BGH      │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
│                          Next.js App                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                             │
│                    (NestJS + Guards/Interceptors)               │
│  ┌───────────┬───────────┬───────────┬───────────┬─────────┐  │
│  │   Auth    │    RBAC   │  Workflow │   Audit   │  Validate│ │
│  │   Guard   │   Guard   │Interceptor│ Interceptor│  Pipe   │ │
│  └───────────┴───────────┴───────────┴───────────┴─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                             │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ FormService  │WorkflowService│NotificationService│EmailService│ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │DocGenService │  RBACService │  SLAService  │AuditService  │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  PostgreSQL  │    Redis     │  File Storage│  SMTP Server │ │
│  │  (Primary)   │   (Cache)    │  (Docs/Avatars)   (Email)   │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODULE CLUSTERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLUSTER 1: AUTHORIZATION & ACCESS                             │
│  ├── RBAC Engine (Role + State + Action)                       │
│  ├── Authentication (JWT)                                      │
│  └── Permission Middleware                                     │
│                                                                 │
│  CLUSTER 2: FORM & DATA                                         │
│  ├── FormTemplate CRUD                                         │
│  ├── FormInstance Management                                   │
│  ├── One-time Entry Logic                                      │
│  └── Document Generation (.docx)                               │
│                                                                 │
│  CLUSTER 3: WORKFLOW ORCHESTRATION                              │
│  ├── State Machine (11 states)                                 │
│  ├── Transition Engine                                         │
│  ├── SLA Tracking                                              │
│  └── Escalation (T-2, T0, T+2)                                 │
│                                                                 │
│  CLUSTER 4: USER INTERFACE                                      │
│  ├── Role-based Dashboard (5 variants)                         │
│  ├── Action Button Component                                   │
│  └── Timeline Visualization                                    │
│                                                                 │
│  CLUSTER 5: NOTIFICATION & COMMUNICATION                        │
│  ├── Email Service                                             │
│  ├── In-app Notification                                      │
│  └── SLA Reminder System                                       │
│                                                                 │
│  CLUSTER 6: AUDIT & COMPLIANCE                                  │
│  ├── Workflow History / Decision Log                           │
│  └── FormInstance Versioning                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Nx Monorepo Structure (P1-3)

**P1-3: Nx Workspace for Type-Safe Full-Stack Development**

```bash
ql-nckh/
├── apps/
│   ├── web/                          # Next.js Frontend (React 18+)
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   ├── components/           # UI components
│   │   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   │   ├── dashboard/       # Role-based dashboards
│   │   │   │   ├── forms/           # Form components
│   │   │   │   └── workflow/        # Timeline, status, actions
│   │   │   ├── lib/                 # Utilities, API client
│   │   │   └── styles/              # Global styles
│   │   ├── public/                   # Static assets
│   │   ├── project.json              # Nx project config
│   │   └── next.config.js
│   │
│   └── api/                          # NestJS Backend API
│       ├── src/
│       │   ├── modules/              # NestJS feature modules
│       │   │   ├── auth/            # JWT, guards
│       │   │   ├── projects/        # Projects CRUD + workflow
│       │   │   ├── tasks/           # Approval tasks inbox
│       │   │   ├── forms/           # Form templates, instances
│       │   │   ├── documents/       # Doc generation, uploads
│       │   │   ├── users/           # Users, roles, RBAC
│       │   │   ├── notifications/   # Email, in-app
│       │   │   └── sla/             # SLA tracking, escalation
│       │   ├── common/               # Shared code
│       │   │   ├── guards/          # Role-based guards
│       │   │   ├── interceptors/   # Logging, transform
│       │   │   ├── pipes/           # Validation
│       │   │   └── decorators/      # Custom decorators
│       │   ├── database/             # Prisma
│       │   │   └── prisma.service.ts
│       │   ├── config/               # Environment config
│       │   └── main.ts
│       ├── test/                     # E2E tests
│       ├── project.json              # Nx project config
│       └── nest-cli.json
│
├── libs/
│   ├── shared/
│   │   ├── types/                    # Shared TypeScript types
│   │   │   ├── src/
│   │   │   │   ├── project.ts       # Project, ProjectState enums
│   │   │   │   ├── task.ts          # ApprovalTask types
│   │   │   │   ├── user.ts          # User, Role types
│   │   │   │   └── index.ts         # Barrel export
│   │   │   └── project.json
│   │   │
│   │   ├── utils/                    # Shared utilities
│   │   │   ├── src/
│   │   │   │   ├── date.ts          # Date formatting, timezone
│   │   │   │   ├── sla.ts           # SLA calculation
│   │   │   │   └── index.ts
│   │   │   └── project.json
│   │   │
│   │   ├── constants/                # Shared constants
│   │   │   ├── src/
│   │   │   │   ├── states.ts        # State enum definitions
│   │   │   │   ├── actions.ts       # Action enum definitions
│   │   │   │   └── index.ts
│   │   │   └── project.json
│   │   │
│   │   └── ui/                       # Shared UI components (if any)
│   │       ├── src/
│   │       │   ├── StatusBadge/
│   │       │   ├── Timeline/
│   │       │   └── index.ts
│   │       └── project.json
│   │
│   └── client/                       # Frontend-specific shared code
│       ├── api/                      # API client
│       │   ├── src/
│       │   │   ├── services/        # API service classes
│       │   │   ├── hooks/           # React Query hooks
│       │   │   └── index.ts
│       │   └── project.json
│       │
│       └── features/                 # Frontend feature libraries
│           ├── dashboard/            # Dashboard logic
│           └── workflow/             # Workflow UI logic
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/                   # SQL migrations
│
├── nx.json                           # Nx workspace configuration
├── package.json                      # Root package.json
├── tsconfig.base.json                # Base TypeScript config
└── .gitignore
```

**P1-3: Key Nx Configuration**

```json
// nx.json
{
  "version": 2,
  "cli": {
    "defaultCollection": "@nrwl/nest"
  },
  "defaultProject": "web",
  "generators": {
    "@nrwl/react": {
      "application": {
        "bundler": "vite",
        "style": "tailwind",
        "linter": "eslint"
      }
    },
    "@nrwl/nest": {
      "application": {
        "linter": "eslint"
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    },
    "lint": {
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": []
  }
}
```

**P1-3: Benefits of Nx Monorepo**

| Benefit | Description |
|---------|-------------|
| **Type Safety** | Shared types between frontend/backend (no API contract drift) |
| **Code Sharing** | Shared utilities, constants, validation schemas |
| **Single Build System** | One command to build, test, lint all projects |
| **Smart Caching** | Nx caches build outputs, only rebuild changed code |
| **Affected Commands** | `nx affected:build` only rebuilds affected projects |
| **Atomic Commits** | Frontend + backend changes in one commit |
| **Shared CI/CD** | One pipeline for entire monorepo |

**P1-3: Common Nx Commands**

```bash
# Create new application
npx nx g @nrwl/nest:app api
npx nx g @nrwl/react:app web

# Create new library
npx nx g @nrwl/js:lib shared-types
npx nx g @nrwl/react:lib ui-shared

# Run commands
npx nx serve web          # Start frontend dev server
npx nx serve api          # Start backend dev server
npx nx build web          # Build frontend for production
npx nx build api          # Build backend for production
npx nx test web           # Run tests
npx nx lint               # Run linter

# Affected commands (CI/CD)
npx nx affected:build     # Build only changed projects
npx nx affected:test      # Test only changed projects
npx nx graph              # Visualize dependency graph
npx nx graph --affected   # Show affected projects
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
users ──┬──1:N── roles
       │
       ├──1:N── workflow_logs
       │
       ├──1:N── notifications
       │
       ├──1:N── projects (as owner)
       │
       └──1:N── vote_tallies (as recorded_by)

roles ──┬──1:N── permissions
       │
       └──1:N── role_permissions (pivot)

projects ──┬──1:N── form_instances
          │
          ├──1:N── workflow_logs
          │
          ├──1:N── documents
          │
          ├──1:N── approval_tasks
          │
          ├──1:N── vote_tallies
          │
          ├──1:N── form_submissions (NEW)
          │
          ├──1:N── extension_requests (NEW)
          │
          └──1:N── handover_records (NEW)

form_templates ──┬──1:N── form_instances
                 │
                 └──1:N── form_fields

form_instances ──┬──1:N── workflow_logs
                 │
                 └──1:N── document_generations

document_templates ──┬──1:N── document_maps
                     │
                     └──1:N── documents
```

### 3.2 Table Definitions

#### 3.2.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  employee_code VARCHAR(50) UNIQUE,  -- Mã GV
  faculty_id VARCHAR(100),            -- Khoa
  department_id VARCHAR(100),         -- Bộ môn

  -- Authentication
  password_hash VARCHAR(255) NOT NULL,
  last_login_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,                 -- Soft delete

  -- Indexes
  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_employee_code ON users(employee_code);
CREATE INDEX idx_users_faculty ON users(faculty_id);
```

#### 3.2.2 roles

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,     -- GIANG_VIEN, QUAN_LY_KHOA, etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- System roles cannot be deleted
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed data
INSERT INTO roles (code, name, is_system) VALUES
  ('GIANG_VIEN', 'Giảng viên / Chủ nhiệm đề tài', true),
  ('QUAN_LY_KHOA', 'Quản lý Khoa', true),
  ('PHONG_KHCN', 'Phòng Khoa học & Công nghệ', true),
  ('HOI_DONG', 'Thành viên Hội đồng / Thẩm định', true),
  ('BGH', 'Ban Giám hiệu / Hiệu trưởng', true),
  ('ADMIN', 'Quản trị hệ thống', true);
```

#### 3.2.3 user_roles (pivot)

```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),

  PRIMARY KEY (user_id, role_id)
);
```

#### 3.2.4 permissions

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,  -- EDIT_FORM, SUBMIT, REVIEW_APPROVE, etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data: Atomic actions
INSERT INTO permissions (code, name) VALUES
  ('EDIT_FORM', 'Chỉnh sửa form'),
  ('SUBMIT', 'Nộp đề tài / báo cáo'),
  ('CANCEL', 'Hủy đề tài'),
  ('RESUBMIT', 'Nộp lại sau khi bị trả về'),
  ('REVIEW_APPROVE', 'Duyệt (Khoa/HĐ/TVXC)'),
  ('REVIEW_RETURN', 'Trả về / Yêu cầu chỉnh sửa'),
  ('REVIEW_SUBMIT', 'Nộp kết quả thẩm định'),
  ('APPROVE', 'Phê duyệt cuối (BGH)'),
  ('REJECT', 'Từ chối'),
  ('PAUSE', 'Tạm dừng đề tài'),
  ('RESUME', 'Tiếp tục đề tài'),
  ('OVERRIDE', 'Ghi đè quy trình (PKHCN only)'),
  ('VIEW_ONLY', 'Xem (tất cả roles)'),
  ('TECHNICAL_ONLY', 'Quản trị kỹ thuật (Admin only)');
```

#### 3.2.5 role_state_permissions

```sql
CREATE TABLE role_state_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  state VARCHAR(50) NOT NULL,           -- DRAFT, FACULTY_REVIEW, etc. (SUBMITTED is event, not state)
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,

  UNIQUE(role_id, state, permission_id)
);

-- Sample data for GIANG_VIEN + DRAFT
INSERT INTO role_state_permissions (role_id, state, permission_id)
SELECT r.id, 'DRAFT', p.id
FROM roles r, permissions p
WHERE r.code = 'GIANG_VIEN'
  AND p.code IN ('EDIT_FORM', 'SUBMIT', 'CANCEL');
```

#### 3.2.6 projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code VARCHAR(50) UNIQUE NOT NULL,  -- PRJ-2024-001
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classification
  research_field VARCHAR(100),             -- Lĩnh vực
  project_type VARCHAR(50) DEFAULT 'CAP_TRUONG',  -- P0.3: MVP chỉ quản lý cấp Trường

  -- P0.3: SCOPE LOCK - Only CAP_TRUONG for MVP

  -- People
  owner_id UUID REFERENCES users(id) NOT NULL,
  faculty_id VARCHAR(100),

  -- Budget
  budget_amount DECIMAL(15,2),
  budget_approved DECIMAL(15,2),
  budget_disbursed DECIMAL(15,2),

  -- Timeline
  start_date DATE,
  end_date DATE,
  expected_completion DATE,

  -- State
  state VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  -- IMPORTANT: SUBMITTED is an EVENT (logged in workflow_logs), NOT a state in projects.state
  -- Transition: DRAFT → FACULTY_REVIEW directly (logs "SUBMITTED" event)
  -- Phase A: DRAFT, FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW
  -- Phase B: IN_PROGRESS, PAUSED
  -- Phase C: FACULTY_ACCEPTANCE_REVIEW
  -- Phase D: SCHOOL_ACCEPTANCE_REVIEW
  -- Phase E: HANDOVER
  -- Common: CHANGES_REQUESTED, APPROVED, COMPLETED, CANCELLED, REJECTED, WITHDRAWN

  current_holder_id UUID REFERENCES users(id),  -- Ai đang giữ hồ sơ

  -- Stage tracking (for 2-tier acceptance)
  faculty_acceptance_passed BOOLEAN DEFAULT false,
  school_acceptance_passed BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  -- Indexes
  CONSTRAINT projects_state_check
    CHECK (state IN ('DRAFT', 'FACULTY_REVIEW', 'SCHOOL_SELECTION_REVIEW',
                     'OUTLINE_COUNCIL_REVIEW', 'CHANGES_REQUESTED', 'APPROVED',
                     'IN_PROGRESS', 'PAUSED', 'FACULTY_ACCEPTANCE_REVIEW',
                     'SCHOOL_ACCEPTANCE_REVIEW', 'HANDOVER', 'COMPLETED',
                     'CANCELLED', 'REJECTED', 'WITHDRAWN')),  -- 15 states (SUBMITTED is event, not state)
  CONSTRAINT projects_type_check
    CHECK (project_type = 'CAP_TRUONG')  -- P0.3: MVP scope lock
);

CREATE INDEX idx_projects_state ON projects(state);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_faculty ON projects(faculty_id);
CREATE INDEX idx_projects_current_holder ON projects(current_holder_id);
```

#### 3.2.7 project_members

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,              -- Thành viên, Thư ký, etc.

  UNIQUE(project_id, user_id)
);
```

#### 3.2.8 form_templates

```sql
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,      -- MAU_01B, MAU_02B, etc.
  name VARCHAR(255) NOT NULL,
  name_vi VARCHAR(255) NOT NULL,         -- Tên tiếng Việt
  description TEXT,

  version VARCHAR(20) NOT NULL,          -- 1.0, 1.1, etc.
  is_active BOOLEAN DEFAULT true,

  -- Targeting
  applies_to VARCHAR(50),                -- PROJECT, REPORT, ACCEPTANCE, etc.
  stage VARCHAR(50),                     -- DRAFT, FACULTY_REVIEW, etc.
  allowed_roles TEXT[],                  -- ['GIANG_VIEN', 'QUAN_LY_KHOA']
  action VARCHAR(50),                    -- SUBMIT, UPLOAD, etc.

  -- Form definition (JSON Schema)
  fields JSONB NOT NULL,

  -- File requirements (for scan uploads)
  requires_upload BOOLEAN DEFAULT false,
  upload_formats TEXT[],                 -- ['pdf', 'jpg', 'png']

  -- Validation rules
  validation_rules JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT form_templates_version_unique UNIQUE (code, version)
);

-- ================================================================
-- FORM TEMPLATE CATALOG (PHỤ LỤC II)
-- ================================================================

-- Phase A: ĐỀ XUẤT & XÉT CHỌN
INSERT INTO form_templates (code, name, name_vi, applies_to, stage, allowed_roles, action, requires_upload, upload_formats) VALUES
  ('MAU_01B', 'Proposal Form', 'Mẫu 1b - Đề cương đăng ký NCKH', 'PROJECT', 'DRAFT', ARRAY['GIANG_VIEN'], 'SUBMIT', true, ARRAY['pdf', 'jpg', 'png']),
  ('MAU_02B', 'Faculty Minutes', 'Mẫu 2b - Biên bản họp Khoa', 'PROJECT', 'FACULTY_REVIEW', ARRAY['QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),
  ('MAU_03B', 'Faculty Evaluation', 'Mẫu 3b - Phiếu đánh giá Khoa', 'PROJECT', 'FACULTY_REVIEW', ARRAY['QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf']),
  ('MAU_04B', 'School Minutes', 'Mẫu 4b - Biên bản họp Trường (xét chọn)', 'PROJECT', 'SCHOOL_SELECTION_REVIEW', ARRAY['PHONG_KHCN'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),
  ('MAU_05B', 'School Selection List', 'Mẫu 5b - Danh sách đề xuất xét chọn', 'PROJECT', 'SCHOOL_SELECTION_REVIEW', ARRAY['PHONG_KHCN'], 'UPLOAD', true, ARRAY['pdf']),
  ('MAU_06B', 'Council Minutes', 'Mẫu 6b - Biên bản HĐ KH&ĐT', 'PROJECT', 'OUTLINE_COUNCIL_REVIEW', ARRAY['HOI_DONG'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),
  ('MAU_07B', 'Revision Request', 'Mẫu 7b - Phiếu yêu cầu sửa đổi (nếu có)', 'PROJECT', 'CHANGES_REQUESTED', ARRAY['HOI_DONG', 'QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf']),

-- Phase B: TRIỂN KHAI
  ('MAU_18B', 'Extension Request', 'Mẫu 18b - Phiếu gia hạn', 'PROJECT', 'PAUSED', ARRAY['GIANG_VIEN'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),

-- Phase C: NGHIỆM THU KHOA
  ('MAU_08B', 'Faculty Acceptance Minutes', 'Mẫu 8b - Biên bản nghiệm thu cấp Khoa', 'ACCEPTANCE', 'FACULTY_ACCEPTANCE_REVIEW', ARRAY['QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),
  ('MAU_09B', 'Product Evaluation', 'Mẫu 9b - Phiếu đánh giá sản phẩm', 'ACCEPTANCE', 'FACULTY_ACCEPTANCE_REVIEW', ARRAY['QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf']),
  ('MAU_10B', 'Performance Evaluation', 'Mẫu 10b - Phiếu đánh giá nghiệp vụ', 'ACCEPTANCE', 'FACULTY_ACCEPTANCE_REVIEW', ARRAY['QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf']),
  ('MAU_11B', 'Faculty Acceptance Summary', 'Mẫu 11b - Phiếu tổng hợp đánh giá Khoa', 'ACCEPTANCE', 'FACULTY_ACCEPTANCE_REVIEW', ARRAY['QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf']),

-- Phase D: NGHIỆM THU TRƯỜNG
  ('MAU_12B', 'School Acceptance Minutes', 'Mẫu 12b - Biên bản nghiệm thu cấp Trường', 'ACCEPTANCE', 'SCHOOL_ACCEPTANCE_REVIEW', ARRAY['HOI_DONG'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),
  ('MAU_13B', 'Acceptance Evaluation', 'Mẫu 13b - Phiếu đánh giá nghiệm thu', 'ACCEPTANCE', 'SCHOOL_ACCEPTANCE_REVIEW', ARRAY['HOI_DONG'], 'UPLOAD', true, ARRAY['pdf']),
  ('MAU_14B', 'Member Comments', 'Mẫu 14b - Phiếu ý kiến thành viên HĐ', 'ACCEPTANCE', 'SCHOOL_ACCEPTANCE_REVIEW', ARRAY['HOI_DONG'], 'UPLOAD', true, ARRAY['pdf']),
  ('MAU_15B', 'Expert Review', 'Mẫu 15b - Phiếu phản biện', 'ACCEPTANCE', 'SCHOOL_ACCEPTANCE_REVIEW', ARRAY['THAM_DINH'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),
  ('MAU_16B', 'School Acceptance Summary', 'Mẫu 16b - Phiếu tổng hợp nghiệm thu', 'ACCEPTANCE', 'SCHOOL_ACCEPTANCE_REVIEW', ARRAY['HOI_DONG'], 'UPLOAD', true, ARRAY['pdf']),

-- Phase E: BÀN GIAO
  ('MAU_17B', 'Handover Record', 'Mẫu 17b - Biên bản bàn giao', 'HANDOVER', 'HANDOVER', ARRAY['GIANG_VIEN', 'QUAN_LY_KHOA'], 'UPLOAD', true, ARRAY['pdf', 'jpg']),

-- PHỤ LỤC: HƯỚNG DẪN
  ('PL1', 'Outline Guide', 'PL1 - Hướng dẫn viết đề cương', 'GUIDE', 'DRAFT', ARRAY['GIANG_VIEN'], 'VIEW', false, ARRAY['pdf']),
  ('PL2', 'Report Format', 'PL2 - Hướng dẫn trình bày báo cáo', 'GUIDE', 'IN_PROGRESS', ARRAY['GIANG_VIEN'], 'VIEW', false, ARRAY['pdf']),
  ('PL3', 'Review Template', 'PL3 - Mẫu phiếu phản biện', 'ACCEPTANCE', 'SCHOOL_ACCEPTANCE_REVIEW', ARRAY['THAM_DINH'], 'UPLOAD', true, ARRAY['pdf']);

-- Index for looking up forms by stage
CREATE INDEX idx_form_templates_stage ON form_templates(stage, is_active);
CREATE INDEX idx_form_templates_code ON form_templates(code);
```

#### 3.2.9 form_instances

```sql
CREATE TABLE form_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  form_template_id UUID REFERENCES form_templates(id),
  form_template_version VARCHAR(20) NOT NULL,

  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMP,

  -- Form data
  data JSONB NOT NULL DEFAULT '{}',

  -- Status
  status VARCHAR(50) DEFAULT 'DRAFT',    -- DRAFT, SUBMITTED, APPROVED, REJECTED

  -- Versioning
  parent_id UUID REFERENCES form_instances(id),  -- Previous version
  version INT DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_form_instances_project ON form_instances(project_id);
CREATE INDEX idx_form_instances_template ON form_instances(form_template_id);
```

#### 3.2.10 document_templates

```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,      -- DOC_MAU_01B, DOC_PHIEU_TONG, etc.
  name VARCHAR(255) NOT NULL,
  name_vi VARCHAR(255) NOT NULL,         -- Tên tiếng Việt
  description TEXT,

  file_path VARCHAR(500) NOT NULL,       -- Path to .docx template
  file_name VARCHAR(255) NOT NULL,

  is_active BOOLEAN DEFAULT true,

  -- P1.1: Document category for filtering
  category VARCHAR(50),                   -- PROPOSAL, MINUTES, ACCEPTANCE, DECISION, SUMMARY

  -- P0-3: Document visibility rules
  is_internal BOOLEAN DEFAULT false,      -- true = internal only (not visible to PI)
  min_role_to_view VARCHAR(50),           -- Minimum role to view: GIANG_VIEN, QUAN_LY_KHOA, PHONG_KHCN, ADMIN
                                          -- null = public (all authenticated users can view)

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- DOCUMENT TEMPLATE CATALOG (P1.1 + P0-3: Visibility Rules)
-- ================================================================

INSERT INTO document_templates (code, name, name_vi, category, file_name, is_internal, min_role_to_view) VALUES
-- Phase A: Proposal (PUBLIC)
  ('DOC_MAU_01B', 'Research Proposal Form', 'Mẫu 1b - Phiếu đề xuất nghiên cứu khoa học', 'PROPOSAL', 'Mau1b_PhuieuDeXuatNCKH.docx', false, NULL),

-- Phase A: Faculty Review (Khoa - INTERNAL)
  ('DOC_MAU_02B', 'Faculty Evaluation', 'Mẫu 2b - Phiếu đánh giá (cấp Khoa)', 'EVALUATION', 'Mau2b_PhieuDanhGiaKhoa.docx', true, 'QUAN_LY_KHOA'),
  ('DOC_MAU_03B', 'Faculty Evaluation Meeting Minutes', 'Mẫu 3b - Biên bản họp đánh giá (cấp Khoa)', 'MINUTES', 'Mau3b_BienBanHopDanhGiaKhoa.docx', true, 'QUAN_LY_KHOA'),

-- Phase A: School Selection Review (Trường - INTERNAL)
  ('DOC_MAU_04B', 'School Selection Summary', 'Mẫu 4b - Danh mục tổng hợp kết quả xét chọn thực hiện đề tài khoa học cấp Trường', 'SUMMARY', 'Mau4b_DanhMucTongHop.docx', true, 'PHONG_KHCN'),
  ('DOC_MAU_05B', 'School Preliminary Minutes', 'Mẫu 5b - Biên bản họp xét chọn sơ bộ cấp Trường', 'MINUTES', 'Mau5b_BienBanHopXetChonSoboi.docx', true, 'PHONG_KHCN'),

-- Phase B: Outline Council Review (Trường - INTERNAL)
  ('DOC_MAU_06B', 'Council Minutes', 'Mẫu 6b - Biên bản họp Hội đồng tư vấn xét chọn đề cương đề tài', 'MINUTES', 'Mau6b_BienBanHoiDongTuVanXetChonDeCuong.docx', true, 'PHONG_KHCN'),
  ('DOC_MAU_07B', 'Revision Report', 'Mẫu 7b - Báo cáo v/v hoàn thiện đề cương đề tài', 'REPORT', 'Mau7b_BaoCaoHoanThienDeCuong.docx', false, NULL),

-- Phase C: Faculty Acceptance Review (Mixed)
  ('DOC_MAU_08B', 'Faculty Council Request', 'Mẫu 8b - Giấy đề nghị thành lập Hội đồng đánh giá, nghiệm thu cấp Khoa', 'DECISION', 'Mau8b_GiayDeNghiThanhLapHDDGNghiemThuKhoa.docx', false, NULL),
  ('DOC_MAU_09B', 'Faculty Acceptance Evaluation', 'Mẫu 9b - Phiếu đánh giá, nghiệm thu cấp Khoa', 'ACCEPTANCE', 'Mau9b_PhieuDanhGiaNghiemThuKhoa.docx', true, 'QUAN_LY_KHOA'),
  ('DOC_MAU_10B', 'Faculty Acceptance Minutes', 'Mẫu 10b - Biên bản họp Hội đồng đánh giá, nghiệm thu cấp Khoa', 'MINUTES', 'Mau10b_BienBanHopHDDGNghiemThuKhoa.docx', true, 'QUAN_LY_KHOA'),
  ('DOC_MAU_11B', 'Faculty Acceptance Report', 'Mẫu 11b - Báo cáo v/v hoàn thiện hồ sơ nghiệm thu cấp Khoa đề tài NCKH', 'REPORT', 'Mau11b_BaoCaoHoanThienHoSoNghiemThuKhoa.docx', false, NULL),

-- Phase D: School Acceptance Review (Mixed)
  ('DOC_MAU_12B', 'Expert Review Comments (PL3)', 'Mẫu 12b - Nhận xét phản biện (Phản biện số 3)', 'REVIEW', 'Mau12b_NhanXetPhanBienPL3.docx', true, 'PHONG_KHCN'),
  ('DOC_MAU_13B', 'School Council Request', 'Mẫu 13b - Giấy đề nghị thành lập Hội đồng đánh giá, nghiệm thu cấp Trường', 'DECISION', 'Mau13b_GiayDeNghiThanhLapHDDGNghiemThuTruong.docx', false, NULL),
  ('DOC_MAU_14B', 'School Acceptance Evaluation', 'Mẫu 14b - Phiếu đánh giá, nghiệm thu cấp Trường', 'ACCEPTANCE', 'Mau14b_PhieuDanhGiaNghiemThuTruong.docx', true, 'PHONG_KHCN'),
  ('DOC_MAU_15B', 'School Acceptance Minutes', 'Mẫu 15b - Biên bản họp Hội đồng đánh giá, nghiệm thu cấp Trường', 'MINUTES', 'Mau15b_BienBanHopHDDGNghiemThuTruong.docx', true, 'PHONG_KHCN'),
  ('DOC_MAU_16B', 'School Acceptance Report', 'Mẫu 16b - Báo cáo v/v hoàn thiện hồ sơ nghiệm thu cấp Trường đề tài NCKH', 'REPORT', 'Mau16b_BaoCaoHoanThienHoSoNghiemThuTruong.docx', false, NULL),

-- Phase E: Handover (PUBLIC)
  ('DOC_MAU_17B', 'Handover Minutes', 'Mẫu 17b - Biên bản giao nhận sản phẩm của đề tài NCKH cấp Trường', 'MINUTES', 'Mau17b_BienBanGiaoNhanSanPham.docx', false, NULL),

-- Extension (during IN_PROGRESS - PUBLIC)
  ('DOC_MAU_18B', 'Extension Request', 'Mẫu 18b - Đơn xin gia hạn thời gian thực hiện', 'DECISION', 'Mau18b_DonXinGiaHan.docx', false, NULL),

-- Decisions (Quyết định - Generated by system - PUBLIC)
  ('DOC_QUYET_DINH_PHE_DUYET', 'Approval Decision', 'Quyết định phê duyệt đề tài', 'DECISION', 'QuyetDinhPheDuyet.docx', false, NULL),
  ('DOC_QUYET_DINH_NGHIEM_THU_KHOA', 'Faculty Acceptance Decision', 'Quyết định nghiệm thu cấp Khoa', 'DECISION', 'QuyetDinhNghiemThuKhoa.docx', false, NULL),
  ('DOC_QUYET_DINH_NGHIEM_THU_TRUONG', 'School Acceptance Decision', 'Quyết định nghiệm thu cấp Trường', 'DECISION', 'QuyetDinhNghiemThuTruong.docx', false, NULL);

-- P0-3: Visibility rules:
-- is_internal = true: Only visible to specified min_role_to_view and above
-- is_internal = false: Public (all authenticated users can view)
-- min_role_to_view hierarchy: GIANG_VIEN < QUAN_LY_KHOA < PHONG_KHCN < ADMIN
```

#### 3.2.11 document_maps

```sql
CREATE TABLE document_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_template_id UUID REFERENCES document_templates(id),
  form_template_id UUID REFERENCES form_templates(id),

  -- Mapping: template variable -> data path
  field_mappings JSONB NOT NULL,         -- {"{{TEN_DE_TAI}}": "project.title"}

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2.12 documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_template_id UUID REFERENCES document_templates(id),

  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),

  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW(),

  metadata JSONB DEFAULT '{}',
  -- For signed documents (final reports, decisions):
  -- {"signed_required": true, "signed_uploaded": false, "signed_file_path": null}
  -- Rule: IF state == COMPLETED AND signed_required == true
  --       THEN signed_uploaded MUST be true

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2.13 workflow_logs

```sql
CREATE TABLE workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  from_state VARCHAR(50),
  to_state VARCHAR(50) NOT NULL,

  action VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR(50) NOT NULL,
  actor_name VARCHAR(255),              -- Denormalized for audit (full_name at time of action)

  timestamp TIMESTAMP DEFAULT NOW(),

  reason TEXT,                          -- Optional reason for decision
  form_instance_id UUID REFERENCES form_instances(id),
  document_id UUID REFERENCES documents(id),
  approval_task_id UUID REFERENCES approval_tasks(id),

  -- P0-3: Return target fields (for REQUEST_CHANGES action)
  return_target_state VARCHAR(50),       -- State to return to after resubmit (e.g., "FACULTY_REVIEW")
  return_target_holder_unit VARCHAR(100), -- Holder unit for return state (e.g., "KHOA.CNTT")

  -- P0-4: Idempotency key for API call deduplication
  idempotency_key UUID UNIQUE,           -- Client-provided UUID for idempotent API calls

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_logs_project ON workflow_logs(project_id, timestamp DESC);
CREATE INDEX idx_workflow_logs_actor ON workflow_logs(actor_id, timestamp DESC);
CREATE INDEX idx_workflow_logs_action ON workflow_logs(action, timestamp DESC);
CREATE UNIQUE INDEX idx_workflow_logs_idempotency ON workflow_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

**Standardized Event Types (action field):**

| Action Code | Label (VN) | Label (EN) | Description | Actor |
|-------------|------------|------------|-------------|-------|
| **PROJECT WORKFLOW** | | | | |
| `CREATE` | Tạo đề tài | Create Project | PI creates new project | GIANG_VIEN |
| `SAVE_DRAFT` | Lưu nháp | Save Draft | PI saves draft (NOT audited as major action) | GIANG_VIEN |
| `SUBMIT` | Nộp đề tài | Submit | PI submits for review | GIANG_VIEN |
| `RESUBMIT` | Nộp lại | Re-submit | PI re-submits after changes | GIANG_VIEN |
| `WITHDRAW` | Rút hồ sơ | Withdraw | PI withdraws submission | GIANG_VIEN |
| `AUTO_ASSIGN` | Tự động phân công | Auto Assign | System auto-assigns to stage | SYSTEM |
| `ASSIGN` | Phân công | Assign | Manual assignment (PKHCN only) | PHONG_KHCN |
| `REVIEW_START` | Bắt đầu duyệt | Start Review | Approver opens task | Any Approver |
| `APPROVE` | Phê duyệt | Approve | Approver approves | Any Approver |
| `REQUEST_CHANGES` | Yêu cầu chỉnh sửa | Request Changes | Approver returns with changes | Any Approver |
| `REJECT` | Từ chối | Reject | Reject project | BGH / Khoa / HĐ |
| `ESCALATE` | Escalation | Escalate | Task escalated due to SLA | SYSTEM |
| `OVERRIDE` | Ghi đè | Override | PKHCN overrides workflow | PHONG_KHCN |
| `PAUSE` | Tạm dừng | Pause | PKHCN pauses project | PHONG_KHCN |
| `RESUME` | Tiếp tục | Resume | PKHCN resumes paused project | PHONG_KHCN |
| `COMPLETE` | Hoàn thành | Complete | Project marked complete | SYSTEM |
| `CANCEL` | Hủy | Cancel | Project cancelled | ADMIN |
| **FORM TRACKING (P1.5)** | | | | |
| `FORM_UPLOADED` | Upload biểu mẫu | Form Uploaded | User uploads scan file | Any Role |
| `FORM_VERIFIED` | Xác thực biểu mẫu | Form Verified | Admin verifies uploaded form | PKHCN / Khoa |
| `FORM_REJECTED` | Từ chối biểu mẫu | Form Rejected | Uploaded form rejected | PKHCN / Khoa |
| `STAGE_PACK_COMPLETED` | Hoàn thành bộ biểu mẫu | Stage Pack Complete | All required forms for stage uploaded | SYSTEM |
| `STAGE_PACK_INCOMPLETE` | Thiếu biểu mẫu | Stage Pack Incomplete | Missing required forms for stage | SYSTEM |
| **VOTE & ACCEPTANCE (P0.3)** | | | | |
| `VOTE_TALLY_RECORDED` | Ghi kết quả biểu quyết | Vote Tally Recorded | HĐ records vote summary | HOI_DONG / Khoa |
| `ACCEPTANCE_PASSED` | Nghiệm thu đạt | Acceptance Passed | Acceptance stage passed | SYSTEM |
| `ACCEPTANCE_FAILED` | Nghiệm thu không đạt | Acceptance Failed | Acceptance stage failed | SYSTEM |
| **EXTENSION (P1.3)** | | | | |
| `EXTENSION_REQUESTED` | Yêu cầu gia hạn | Extension Requested | PI requests extension | GIANG_VIEN |
| `EXTENSION_APPROVED` | Gia hạn được duyệt | Extension Approved | Extension approved | PKHCN |
| `EXTENSION_REJECTED` | Gia hạn bị từ chối | Extension Rejected | Extension rejected | PKHCN |
| **HANDOVER (P1.4)** | | | | |
| `HANDOVER_INITIATED` | Khởi tạo bàn giao | Handover Initiated | PI initiates handover | GIANG_VIEN |
| `HANDOVER_CONFIRMED` | Xác nhận bàn giao | Handover Confirmed | Khoa confirms receipt | QUAN_LY_KHOA |
| `HANDOVER_COMPLETED` | Hoàn tất bàn giao | Handover Completed | Handover process complete | SYSTEM |
| **COMMENTS (P1.3)** | | | | |
| `COMMENT` | Bình luận | Comment | User adds comment | Any Role |
| `COMMENT_MENTION` | Nhắc trong bình luận | Mention | User mentions another user | Any Role |
| `COMMENT_DELETED` | Xóa bình luận | Comment Deleted | Comment deleted by owner/admin | ADMIN / PKHCN |
| **SIGNED DOCS (P0.2)** | | | | |
| `SIGNED_DOCUMENT_UPLOADED` | Upload bản đã ký | Signed Doc Uploaded | Upload scan with signature | Any Role |
| `SIGNED_DOCUMENT_VERIFIED` | Xác thực bản ký | Signed Doc Verified | Admin verifies signed doc | PKHCN / Khoa |

**Metadata Schema for Specific Actions:**

```json
// REQUEST_CHANGES - P0-3: return_target_state is now a top-level field
{
  "return_target_state": "FACULTY_REVIEW",
  "return_target_holder_unit": "KHOA.CNTT",
  "change_requests": [
    {"field": "budget", "issue": "Kinh phí chưa hợp lý"},
    {"field": "description", "issue": "Cần làm rõ mục tiêu"}
  ]
}

// Note: return_target_state and return_target_holder_unit are stored as top-level
// fields in workflow_logs table, NOT in metadata. See schema above.

// OVERRIDE
{
  "original_state": "FACULTY_REVIEW",
  "target_state": "BGH_REVIEW",
  "reason": "Yêu cầu gấp từ BGH"
}

// ESCALATE
{
  "overdue_hours": 48,
  "escalated_to_role": "PHONG_KHCN",
  "original_task_id": "uuid"
}

// ASSIGN
{
  "assigned_to": "user_id",
  "assigned_by": "admin_user_id",
  "reason": "Thay thế người duyệt nghỉ ốm"
}

// FORM_UPLOADED (P1.5)
{
  "template_code": "MAU_01B",
  "form_submission_id": "uuid",
  "file_name": "Mau1b_scan_ky.pdf",
  "file_size_bytes": 1024000
}

// STAGE_PACK_COMPLETED (P1.5)
{
  "stage": "FACULTY_ACCEPTANCE_REVIEW",
  "required_forms": ["MAU_08B", "MAU_09B", "MAU_10B", "MAU_11B"],
  "uploaded_forms": ["MAU_08B", "MAU_09B", "MAU_10B", "MAU_11B"],
  "is_complete": true
}

// VOTE_TALLY_RECORDED (P0.3)
{
  "vote_tally_id": "uuid",
  "stage": "FACULTY_ACCEPTANCE_REVIEW",
  "approve_count": 5,
  "reject_count": 1,
  "abstain_count": 0,
  "pass_percentage": 83.33,
  "final_decision": "PASS"
}

// ACCEPTANCE_PASSED / ACCEPTANCE_FAILED (P0.3)
{
  "stage": "FACULTY_ACCEPTANCE_REVIEW",
  "vote_tally_id": "uuid",
  "pass_percentage": 83.33,
  "next_state": "SCHOOL_ACCEPTANCE_REVIEW"
}

// EXTENSION_REQUESTED (P1.3)
{
  "extension_request_id": "uuid",
  "extension_months": 3,
  "original_end_date": "2024-12-31",
  "requested_end_date": "2025-03-31",
  "reason_type": "TECHNICAL"
}

// HANDOVER_COMPLETED (P1.4)
{
  "handover_record_id": "uuid",
  "handed_over_by": "user_id",
  "received_by": "user_id",
  "items": {
    "reports": true,
    "source_code": true,
    "documentation": true,
    "equipment": false
  }
}
```

**Important:** When action is `REQUEST_CHANGES`, metadata MUST include:
- `"return_to_state"`: The state to return to after PI resubmits
- Optional `"change_requests"`: Array of specific change requests

This is used when user `RESUBMIT`s to determine which state to return to.

#### 3.2.14 notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,            -- EMAIL, IN_APP
  event_type VARCHAR(50) NOT NULL,      -- PROJECT_SUBMITTED, SLA_REMINDER, etc.

  title VARCHAR(500) NOT NULL,
  content TEXT,

  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,

  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

#### 3.2.15 sla_settings

**P1.6: SLA by (approval_tasks.stage, assignee_role)**

```sql
CREATE TABLE sla_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- P1.6: SLA keyed by stage and role, NOT by state transition
  stage VARCHAR(50) NOT NULL,            -- approval_tasks.stage (FACULTY_REVIEW, etc.)
  assignee_role VARCHAR(50) NOT NULL,    -- approval_tasks.assignee_role (QUAN_LY_KHOA, etc.)

  sla_hours INT NOT NULL,               -- SLA in WORKING HOURS (Mon-Fri, exclude holidays)
  -- Example: sla_hours = 72 means 3 working days (3 × 24 = 72 hours)

  escalation_t_minus_2_hours INT,       -- Reminder before deadline (working hours)
  escalation_t_plus_2_hours INT,        -- Escalation after deadline (working hours)

  escalate_to_role VARCHAR(50),          -- Role to escalate to (e.g., PHONG_KHCN)

  -- P1.6: SLA pause/resume for CHANGES_REQUESTED
  pause_on_changes_requested BOOLEAN DEFAULT true,  -- Pause SLA when project in CHANGES_REQUESTED

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(stage, assignee_role)           -- P1.6: One SLA setting per (stage, role) combination
);

-- P1.6: Seed data: SLA settings by (stage, role)
INSERT INTO sla_settings (stage, assignee_role, sla_hours, escalation_t_minus_2_hours, escalation_t_plus_2_hours, escalate_to_role) VALUES
  -- Stage: Faculty Review
  ('FACULTY_REVIEW', 'QUAN_LY_KHOA', 72, 48, 48, 'PHONG_KHCN'),  -- 3 working days

  -- Stage: School Selection Review
  ('SCHOOL_SELECTION_REVIEW', 'PHONG_KHCN', 48, 24, 48, 'BGH'),  -- 2 working days

  -- Stage: Outline Council Review
  ('OUTLINE_COUNCIL_REVIEW', 'HOI_DONG', 72, 48, 48, 'PHONG_KHCN'),  -- 3 working days

  -- Stage: Faculty Acceptance Review
  ('FACULTY_ACCEPTANCE_REVIEW', 'HOI_DONG_KHOA', 48, 24, 24, 'PHONG_KHCN'),  -- 2 working days

  -- Stage: School Acceptance Review
  ('SCHOOL_ACCEPTANCE_REVIEW', 'HOI_DONG_TRUONG', 72, 48, 48, 'PHONG_KHCN'),  -- 3 working days

  -- Stage: Handover
  ('HANDOVER', 'GIANG_VIEN', 24, 16, 0, NULL);  -- 1 working day (auto-complete)
```

#### 3.2.15b working_calendar_config (P1-2: Timezone & Working Hours)

**P1-2: NEW TABLE - Working calendar configuration for SLA calculation**

```sql
CREATE TABLE working_calendar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timezone configuration
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',  -- IANA timezone
  -- Vietnam: UTC+7, no DST. Valid values: 'Asia/Ho_Chi_Minh', 'Asia/Hanoi'

  -- Working hours (24-hour format)
  work_start_hour INT NOT NULL DEFAULT 8,   -- 8:00 AM
  work_end_hour INT NOT NULL DEFAULT 17,    -- 5:00 PM
  lunch_break_start_hour INT DEFAULT 12,    -- 12:00 PM (optional)
  lunch_break_end_hour INT DEFAULT 13,      -- 1:00 PM (optional)

  -- Working days (0=Sunday, 1=Monday, ..., 6=Saturday)
  working_days INT[] DEFAULT ARRAY[1, 2, 3, 4, 5],  -- Mon-Fri

  -- Holiday handling
  exclude_holidays BOOLEAN DEFAULT true,    -- Exclude public holidays from SLA

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- P1-2: Seed data - Vietnam working calendar
INSERT INTO working_calendar_config (timezone, work_start_hour, work_end_hour,
                                     lunch_break_start_hour, lunch_break_end_hour,
                                     working_days, exclude_holidays) VALUES
  ('Asia/Ho_Chi_Minh', 8, 17, 12, 13, ARRAY[1, 2, 3, 4, 5], true);

-- Only one active config at a time
CREATE UNIQUE INDEX idx_working_calendar_active
  ON working_calendar_config(is_active) WHERE is_active = true;
```

#### 3.2.15c holidays (Public Holidays for SLA)

```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,             -- Tết Nguyên Đán, Giỗ Tổ Hùng Vương, etc.
  is_recurring BOOLEAN DEFAULT false,     -- true = same date every year (e.g., Jan 1)

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(holiday_date)
);

-- Seed data - Vietnam public holidays (2024 example)
INSERT INTO holidays (holiday_date, name, is_recurring) VALUES
  -- Fixed holidays (same date every year)
  ('2024-01-01', 'Tết Dương lịch', true),
  ('2024-02-14', 'Valentine', false),  -- Example non-recurring
  ('2024-04-30', 'Ngày Giải phóng miền Nam', true),
  ('2024-05-01', 'Ngày Quốc tế Lao động', true),
  ('2024-09-02', 'Ngày Quốc khánh', true);

-- Lunar calendar holidays (dates vary by year, need manual update)
-- Tết Nguyên Đán, Giỗ Tổ Hùng Vương, etc. should be added annually
```

**P1-2: SLA Calculation with Timezone Support**

```javascript
// P1-2: Calculate SLA deadline considering working hours, timezone, and holidays
async function calculateSLADeadline(createdAt, slaHours) {
  const config = await getActiveWorkingCalendarConfig();
  const holidays = await getHolidaysInDateRange(createdAt, slaHours);

  let deadline = new Date(createdAt);
  let hoursRemaining = slaHours;

  while (hoursRemaining > 0) {
    // Convert to configured timezone
    const deadlineInTz = toTimezone(deadline, config.timezone);

    // Check if it's a working day
    const dayOfWeek = deadlineInTz.getDay(); // 0=Sun, 6=Sat
    if (!config.working_days.includes(dayOfWeek)) {
      // Skip weekend
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(config.work_start_hour, 0, 0, 0);
      continue;
    }

    // Check if it's a holiday
    const dateStr = deadline.toISOString().split('T')[0];
    if (holidays.has(dateStr)) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(config.work_start_hour, 0, 0, 0);
      continue;
    }

    // Calculate working hours for this day
    const currentHour = deadlineInTz.getHours();
    const workEnd = config.work_end_hour;
    const workStart = config.work_start_hour;

    // Skip before working hours
    if (currentHour < workStart) {
      deadline.setHours(workStart, 0, 0, 0);
      continue;
    }

    // Skip after working hours
    if (currentHour >= workEnd) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(workStart, 0, 0, 0);
      continue;
    }

    // Skip lunch break
    if (config.lunch_break_start_hour && currentHour >= config.lunch_break_start_hour) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(workStart, 0, 0, 0);
      continue;
    }

    // Calculate remaining work hours today
    const hoursToday = Math.min(workEnd - currentHour, hoursRemaining);
    deadline.setHours(deadline.getHours() + hoursToday);
    hoursRemaining -= hoursToday;
  }

  return deadline;
}

// P1-2: Timezone helper
function toTimezone(date, timezone) {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}
```

#### 3.2.16 approval_tasks

**IMPORTANT:** This is a SEPARATE entity from projects. Inbox/Queue is NOT a filter on projects.

**P1.1: Task Creation Rule - NEW task per transition, CLOSE old task**

```sql
CREATE TABLE approval_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  stage VARCHAR(50) NOT NULL,              -- FACULTY_REVIEW, COUNCIL_REVIEW, etc.
  assignee_role VARCHAR(50) NOT NULL,      -- QUAN_LY_KHOA, HOI_DONG, BGH, etc.
  assignee_id UUID REFERENCES users(id),   -- Specific user (optional, for expert review)

  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  -- Values: PENDING, IN_PROGRESS, DECIDED, CANCELLED, ESCALATED
  -- P1.1: DECIDED = approver has made decision (APPROVE/REQUEST_CHANGES/REJECT)

  -- Timeline
  assigned_at TIMESTAMP DEFAULT NOW(),
  due_at TIMESTAMP,
  started_at TIMESTAMP,                    -- When assignee first opened the task
  decided_at TIMESTAMP,                    -- P1.1: When decision was made

  -- Decision
  decision VARCHAR(50),                    -- APPROVE, REQUEST_CHANGES, REJECT
  comment TEXT,

  -- Escalation
  escalated_at TIMESTAMP,
  escalated_from_task_id UUID REFERENCES approval_tasks(id),
  escalation_reason TEXT,

  -- P1.1: Task linkage - for audit trail
  previous_task_id UUID REFERENCES approval_tasks(id),  -- Previous task in this project
  next_task_id UUID REFERENCES approval_tasks(id),      -- Next task (filled when creating next)

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT approval_tasks_stage_check
    CHECK (stage IN ('FACULTY_REVIEW', 'SCHOOL_SELECTION_REVIEW',
                     'OUTLINE_COUNCIL_REVIEW', 'FACULTY_ACCEPTANCE_REVIEW',
                     'SCHOOL_ACCEPTANCE_REVIEW', 'HANDOVER', 'CHANGES_REQUESTED')),  -- SUBMITTED is event, not stage
  CONSTRAINT approval_tasks_status_check
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'DECIDED', 'CANCELLED', 'ESCALATED')),
  CONSTRAINT approval_tasks_decision_check
    CHECK (decision IS NULL OR decision IN ('APPROVE', 'REQUEST_CHANGES', 'REJECT'))
);

-- P1.1: Unique constraint - Only ONE open task per project at a time
-- "Open" = status IN ('PENDING', 'IN_PROGRESS', 'ESCALATED')
CREATE UNIQUE INDEX idx_approval_tasks_one_open_per_project
ON approval_tasks(project_id) WHERE status IN ('PENDING', 'IN_PROGRESS', 'ESCALATED');

-- Indexes for Inbox queries
CREATE INDEX idx_approval_tasks_assignee ON approval_tasks(assignee_id, status) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_approval_tasks_stage_role ON approval_tasks(stage, assignee_role, status);
CREATE INDEX idx_approval_tasks_project_stage ON approval_tasks(project_id, stage, status);
CREATE INDEX idx_approval_tasks_role ON approval_tasks(assignee_role, status);
CREATE INDEX idx_approval_tasks_project ON approval_tasks(project_id, created_at DESC);
CREATE INDEX idx_approval_tasks_stage ON approval_tasks(stage, status);

-- Index for overdue tasks
CREATE INDEX idx_approval_tasks_overdue ON approval_tasks(due_at, status)
  WHERE status IN ('PENDING', 'IN_PROGRESS') AND due_at < NOW();
```

**P1.1: Task Transition Rules (Critical for Inbox/Queue)**

```javascript
// P1.1: Rule - Create NEW task per transition, CLOSE old task
async function handleDecision(taskId, decision, userId, comment) {
  const task = await getTask(taskId);

  // 1. Mark current task as DECIDED
  await db.approval_tasks.update({
    where: { id: taskId },
    data: {
      status: 'DECIDED',
      decision: decision,
      decided_at: new Date(),
      comment: comment
    }
  });

  // 2. Create next task based on decision
  if (decision === 'APPROVE') {
    const nextStage = getNextStage(task.stage);
    if (nextStage) {
      const nextTask = await createApprovalTask({
        project_id: task.project_id,
        stage: nextStage,
        assignee_role: getRoleForStage(nextStage),
        previous_task_id: taskId  // P1.1: Link to previous task
      });

      // Link current task to next
      await db.approval_tasks.update({
        where: { id: taskId },
        data: { next_task_id: nextTask.id }
      });

      // Update project state
      await updateProjectState(task.project_id, nextStage);
    }
  } else if (decision === 'REQUEST_CHANGES') {
    // P0-3: Save return_target_state for PI to resubmit (logged in workflow_logs, not project.metadata)
    await db.projects.update({
      where: { id: task.project_id },
      data: {
        state: 'CHANGES_REQUESTED'
      }
    });

    // P0-3: Log with return_target fields
    await logWorkflowEvent({
      project_id: task.project_id,
      action: 'REQUEST_CHANGES',
      actor_id: userId,
      from_state: task.stage,
      to_state: 'CHANGES_REQUESTED',
      return_target_state: task.stage,  // P0-3: Top-level field
      return_target_holder_unit: getHolderUnitForStage(task.stage),
      reason: comment
    });
  } else if (decision === 'REJECT') {
    await updateProjectState(task.project_id, 'REJECTED');
  }

  // Log workflow event
  await logWorkflowEvent({
    project_id: task.project_id,
    action: 'TASK_DECIDED',
    actor_id: userId,
    task_id: taskId,
    decision: decision,
    comment: comment
  });

  return task;
}

// P1.1: Create approval task for a stage
async function createApprovalTask(data) {
  const stageConfig = STAGE_CONFIG[data.stage];
  const dueAt = calculateDueDate(stageConfig.sla_hours);

  return await db.approval_tasks.create({
    data: {
      project_id: data.project_id,
      stage: data.stage,
      assignee_role: data.assignee_role,
      assignee_id: data.assignee_id,  // Optional: specific user
      status: 'PENDING',
      due_at: dueAt,
      previous_task_id: data.previous_task_id,
      metadata: stageConfig.metadata || {}
    }
  });
}

// P0-3: PI resubmits - read return_target from workflow_logs
async function resubmitAfterChanges(projectId, userId) {
  // P0-3: Read from workflow_logs.return_target_state (NOT from project.metadata)
  const returnLog = await db.workflow_logs.findFirst({
    where: {
      project_id: projectId,
      action: 'REQUEST_CHANGES',
      return_target_state: { not: null }
    },
    orderBy: { timestamp: 'desc' }
  });

  if (!returnLog || !returnLog.return_target_state) {
    throw new ForbiddenError('Không có stage để quay về');
  }

  const returnToState = returnLog.return_target_state;
  const returnHolder = returnLog.return_target_holder_unit;

  // Create new task for the saved stage
  const task = await createApprovalTask({
    project_id: projectId,
    stage: returnToState,
    assignee_role: getRoleForStage(returnToState)
  });

  // Update project state
  await updateProjectState(projectId, returnToState);

  // P0-3: No need to clear project.metadata - return_target is in workflow_logs

  return task;
}
```

**Key Points:**
- `approval_tasks` is the **source of truth** for Inbox/Queue
- **P1.1**: Only ONE open task per project at any time (enforced by unique index)
- When approver decides: current task → DECIDED, create NEW task for next stage
- Previous tasks linked via `previous_task_id` / `next_task_id` for full audit trail
- **P0-3**: When REQUEST_CHANGES, log `return_target_state` in `workflow_logs` table (NOT in project.metadata)

**Relationship to projects:**
```
projects.state = 'FACULTY_REVIEW'  →  ONE approval_tasks WHERE stage='FACULTY_REVIEW' AND status IN ('PENDING', 'IN_PROGRESS', 'ESCALATED')
```

#### 3.2.17 withdrawal_policy

```sql
CREATE TABLE withdrawal_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,

  allowed_states VARCHAR(50)[] NOT NULL,  -- States where withdrawal is permitted
  -- Example: {DRAFT, FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW}
  -- Note: SUBMITTED is an event, not a state, so DRAFT is the earliest state for withdrawal

  require_reason BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false, -- If true, needs PKHCN approval

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Default policy
INSERT INTO withdrawal_policy (name, description, allowed_states, require_reason, is_default) VALUES
  ('Mặc định', 'Cho phép rút hồ sơ trước khi BGH duyệt',
   ARRAY['DRAFT', 'FACULTY_REVIEW', 'SCHOOL_SELECTION_REVIEW', 'OUTLINE_COUNCIL_REVIEW'],
   true, true);
```

#### 3.2.18 vote_tallies (Phiếu tổng hợp phiếu biểu quyết)

**PURPOSE: Lưu tóm tắt kết quả biểu quyết của hội đồng (KHÔNG digitize từng phiếu riêng lẻ).**

```sql
CREATE TABLE vote_tallies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,              -- FACULTY_ACCEPTANCE_REVIEW, SCHOOL_ACCEPTANCE_REVIEW, etc.
  meeting_date DATE NOT NULL,
  meeting_location VARCHAR(255),

  -- Vote summary (NOT individual ballots)
  total_members INT NOT NULL,              -- Tổng số thành viên
  attending_members INT NOT NULL,          -- Số người tham dự
  voting_members INT NOT NULL,             -- Số người bỏ phiếu

  -- Vote counts
  approve_count INT DEFAULT 0,
  reject_count INT DEFAULT 0,
  abstain_count INT DEFAULT 0,

  -- Decision
  final_decision VARCHAR(20) NOT NULL,     -- PASS, FAIL, DEFERRED
  pass_percentage DECIMAL(5,2),            -- Tỷ lệ % đồng thuận

  -- Supporting documents
  minutes_document_id UUID,                -- scan biên bản họp
  minutes_document_url VARCHAR(500),

  -- Recorded by
  recorded_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),   -- Khoa trưởng / Chủ tịch HĐ

  -- Notes
  notes TEXT,                              -- Ghi chú thêm
  meeting_summary TEXT,                    -- Tóm tắt nội dung họp

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT vote_tallies_stage_check
    CHECK (stage IN ('FACULTY_ACCEPTANCE_REVIEW', 'SCHOOL_ACCEPTANCE_REVIEW',
                     'OUTLINE_COUNCIL_REVIEW')),
  CONSTRAINT vote_tallies_decision_check
    CHECK (final_decision IN ('PASS', 'FAIL', 'DEFERRED')),
  CONSTRAINT vote_tallies_vote_counts_check
    CHECK (approve_count + reject_count + abstain_count <= voting_members),
  CONSTRAINT vote_tallies_percentage_check
    CHECK (pass_percentage BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX idx_vote_tallies_project ON vote_tallies(project_id, stage);
CREATE INDEX idx_vote_tallies_meeting ON vote_tallies(meeting_date DESC);
CREATE INDEX idx_vote_tallies_decision ON vote_tallies(final_decision, stage);

-- Unique: One vote tally per project per stage
CREATE UNIQUE INDEX idx_vote_tallies_unique_stage
  ON vote_tallies(project_id, stage);
```

**Key Design Decisions:**

1. **Summary Only (NO Individual Ballots):**
   - We store ONLY aggregate counts: approve, reject, abstain
   - Individual paper ballots remain PHYSICAL (scan biên bản là bằng chứng pháp lý)
   - System calculates `pass_percentage = (approve_count / voting_members) * 100`

2. **PASS Condition (per stage) - P1-1: Stage-based thresholds:**
   - **P1-1 IMPROVEMENT**: Thresholds now stored in database table for configurability

   ```sql
   -- P1-1: NEW TABLE - Voting thresholds per stage
   CREATE TABLE voting_thresholds (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     stage VARCHAR(50) UNIQUE NOT NULL,    -- FACULTY_ACCEPTANCE_REVIEW, etc.
     pass_threshold DECIMAL(5,2) NOT NULL, -- Percentage (0-100) required to pass
     min_voting_members INT DEFAULT 3,     -- Minimum members required for valid vote
     description TEXT,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- P1-1: Seed data - Stage-based voting thresholds
   INSERT INTO voting_thresholds (stage, pass_threshold, min_voting_members, description) VALUES
     ('FACULTY_ACCEPTANCE_REVIEW', 50.00, 3, 'Nghiệm thu cấp Khoa: Đa số (>50%) thành viên HĐ Khoa'),
     ('SCHOOL_ACCEPTANCE_REVIEW', 66.67, 5, 'Nghiệm thu cấp Trường: 2/3 thành viên HĐ Trường'),
     ('OUTLINE_COUNCIL_REVIEW', 50.00, 5, 'Phê duyệt đề cương: Đa số (>50%) thành viên HĐ KH&ĐT'),
     ('SCHOOL_SELECTION_REVIEW', 50.00, 3, 'Xét chọn sơ bộ: Đa số (>50%) thành viên');
   ```

   ```javascript
   // P1-1: Read thresholds from database (not hardcoded)
   async function getVotingThreshold(stage) {
     const threshold = await db.voting_thresholds.findUnique({
       where: { stage: stage, is_active: true }
     });
     if (!threshold) {
       throw new Error(`No voting threshold configured for stage: ${stage}`);
     }
     return threshold;
   }

   async function isPass(voteTally) {
     const threshold = await getVotingThreshold(voteTally.stage);
     return voteTally.pass_percentage >= threshold.pass_threshold;
   }

   // P1-1: Validate minimum voting members
   async function isValidVote(voteTally) {
     const threshold = await getVotingThreshold(voteTally.stage);
     return voteTally.voting_members >= threshold.min_voting_members;
   }
   ```

   **Threshold Rationale:**
   | Stage | Threshold | Rationale |
   |-------|-----------|-----------|
   | FACULTY_ACCEPTANCE_REVIEW | 50% | Đa số đơn giản - cấp Khoa |
   | SCHOOL_ACCEPTANCE_REVIEW | 66.67% (2/3) | Siêu đa số - cấp Trường quan trọng |
   | OUTLINE_COUNCIL_REVIEW | 50% | Đa số đơn giản - xét chọn sơ bộ |
   | SCHOOL_SELECTION_REVIEW | 50% | Đa số đơn giản - lọc đề xuất |

3. **Workflow Integration:**
   - When Khoa/HĐ records vote tally → triggers state transition:
     - `PASS` → project advances to next stage
     - `FAIL` → project.state = `REJECTED`
     - `DEFERRED` → project stays in current stage, awaiting more review

4. **Audit Trail:**
   - `minutes_document_url` = scan file của biên bản có chữ ký (bằng chứng pháp lý)
   - `meeting_summary` = tóm tắt nội dung thảo luận (text, searchable)

#### 3.2.19 form_submissions (Nộp biểu mẫu scan)

**PURPOSE: Track uploaded scan files for each form (distinct from form_instances which stores filled field data).**

```sql
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_code VARCHAR(50) NOT NULL REFERENCES form_templates(code),

  -- File info
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,         -- S3/storage URL
  file_type VARCHAR(20) NOT NULL,         -- pdf, jpg, png
  file_size_bytes INT,

  -- Submission metadata
  submitted_by UUID NOT NULL REFERENCES users(id),
  submitted_at TIMESTAMP DEFAULT NOW(),

  -- Verification
  verification_status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, VERIFIED, REJECTED
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,

  -- Version tracking (for re-submission)
  version INT DEFAULT 1,
  replaces_id UUID REFERENCES form_submissions(id),  -- Previous submission being replaced

  -- Stage completeness tracking
  is_stage_requirement BOOLEAN DEFAULT false,
  stage VARCHAR(50),                        -- FACULTY_REVIEW, SCHOOL_ACCEPTANCE_REVIEW, etc.

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT form_submissions_status_check
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED'))
);

-- Indexes
CREATE INDEX idx_form_submissions_project ON form_submissions(project_id, template_code);
CREATE INDEX idx_form_submissions_stage ON form_submissions(stage, verification_status);
CREATE INDEX idx_form_submissions_uploaded ON form_submissions(submitted_by, submitted_at DESC);
```

#### 3.2.20 extension_requests (Phiếu gia hạn - Mẫu 18b)

**PURPOSE: Track project extension requests during PAUSED state.**

```sql
CREATE TABLE extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Extension details
  original_end_date DATE NOT NULL,
  requested_end_date DATE NOT NULL,
  extension_months INT NOT NULL,

  -- Reason
  reason TEXT NOT NULL,
  reason_type VARCHAR(50),                  -- HEALTH, TECHNICAL, ADMIN, OTHER

  -- Supporting document (Mẫu 18b scan)
  document_url VARCHAR(500),
  document_verified BOOLEAN DEFAULT false,

  -- Request workflow
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMP DEFAULT NOW(),

  -- Approvals
  faculty_approved BOOLEAN,
  faculty_approved_by UUID REFERENCES users(id),
  faculty_approved_at TIMESTAMP,
  faculty_notes TEXT,

  pkhcn_approved BOOLEAN,
  pkhcn_approved_by UUID REFERENCES users(id),
  pkhcn_approved_at TIMESTAMP,
  pkhcn_notes TEXT,

  -- Final decision
  status VARCHAR(20) DEFAULT 'PENDING',      -- PENDING, APPROVED, REJECTED
  approved_end_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT extension_requests_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT extension_requests_dates_check
    CHECK (requested_end_date > original_end_date),
  CONSTRAINT extension_requests_months_check
    CHECK (extension_months > 0 AND extension_months <= 12)  -- Max 12 months
);

-- Indexes
CREATE INDEX idx_extension_requests_project ON extension_requests(project_id, created_at DESC);
CREATE INDEX idx_extension_requests_status ON extension_requests(status, requested_at);
```

#### 3.2.21 handover_records (Biên bản bàn giao - Mẫu 17b)

**PURPOSE: Track project handover after acceptance.**

```sql
CREATE TABLE handover_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Handover details
  handover_date DATE NOT NULL,
  handover_location VARCHAR(255),

  -- Items being handed over
  items JSONB DEFAULT '{
    "reports": false,
    "source_code": false,
    "documentation": false,
    "equipment": false,
    "budget_records": false,
    "other": []
  }',

  -- People involved
  handed_over_by UUID NOT NULL REFERENCES users(id),      -- PI
  received_by UUID NOT NULL REFERENCES users(id),        -- Khoa representative
  witnessed_by UUID REFERENCES users(id),                -- PKHCN

  -- Supporting document (Mẫu 17b scan)
  document_url VARCHAR(500) NOT NULL,
  document_verified BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',      -- PENDING, COMPLETED, REJECTED
  completed_at TIMESTAMP,

  -- Notes
  notes TEXT,
  conditions TEXT,                          -- Special conditions if any

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT handover_records_status_check
    CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED'))
);

-- Indexes
CREATE INDEX idx_handover_records_project ON handover_records(project_id);
CREATE INDEX idx_handover_records_status ON handover_records(status, handover_date);
CREATE UNIQUE INDEX idx_handover_records_unique_project
  ON handover_records(project_id);  -- One handover per project
```

---

## 4. API Specification

### 4.1 Authentication & Authorization

#### POST /api/auth/login
Login with username/password.

**Request:**
```json
{
  "username": "gv_a",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "gv_a",
      "full_name": "Nguyễn Văn A",
      "email": "a@example.com",
      "roles": ["GIANG_VIEN"]
    },
    "token": "jwt_token"
  }
}
```

#### POST /api/auth/logout
Logout and invalidate token.

#### GET /api/auth/me
Get current user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "gv_a",
    "full_name": "Nguyễn Văn A",
    "email": "a@example.com",
    "employee_code": "GV001",
    "faculty": "Khoa CNTT",
    "roles": ["GIANG_VIEN"],
    "permissions": ["EDIT_FORM", "SUBMIT", "VIEW_ONLY"]
  }
}
```

### 4.2 Projects

#### GET /api/projects
List projects with filters.

**Query Params:**
- `state`: Filter by state
- `faculty`: Filter by faculty
- `owner_id`: Filter by owner
- `page`, `limit`: Pagination

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "project_code": "PRJ-2024-001",
        "title": "Ứng dụng AI trong giáo dục",
        "state": "FACULTY_REVIEW",
        "current_holder": {
          "id": "uuid",
