---
project_name: 'qlNCKH'
user_name: 'Coc'
date: '2026-01-02'
sections_completed: ['discovery', 'technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'anti_patterns', 'ux_locked_rules']
existing_patterns_found: { patterns: 30, conventions: 18, rules: 15 }
status: 'complete'
version: '1.1'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in the qlNCKH (Hệ thống Quản lý NCKH) project. Focus on unobvious details that agents might otherwise miss._

**Architecture Reference:** `_bmad-output/planning-artifacts/architecture.md`

**Last Updated:** 2026-01-02 (v1.1 - UX-Locked Rules Applied)

---

## Technology Stack & Versions

**Frontend:**
- React 18+ with hooks
- TypeScript 5.x (strict mode)
- TanStack Query 5.x (server state)
- Zustand 4.x (client state)
- React Router v6
- React Hook Form 7.x + Zod 3.x (validation)
- Tailwind CSS 3.x + shadcn/ui
- Lucide React (icons)
- Vite (build tool)
- Vitest (unit tests)
- Playwright (E2E + PDF export)

**Backend:**
- NestJS 10.x
- TypeScript 5.x (strict mode)
- Prisma 5.x (ORM)
- PostgreSQL 16
- Redis 7.x (caching + idempotency)
- JWT (access 15m, refresh 7d)
- bcrypt (password hashing)
- Winston (logging)

**DevOps:**
- Nx (monorepo)
- Docker Compose
- ESLint + Prettier

---

## Critical Implementation Rules

### 1. Database Naming (CRITICAL)

**ALL database objects MUST use `snake_case`:**
- Tables: `approval_tasks`, `workflow_logs` (NOT `ApprovalTasks`)
- Columns: `current_holder_id`, `created_at` (NOT `currentHolderId`)
- Foreign keys: `{table}_id` format
- Enums: `PascalCase` (ProjectState, UserRole)

**JavaScript/TypeScript code uses `camelCase`:**
- Variables: `currentHolder`, `slaRemaining`
- Functions: `getProjectById()`, `calculateSLA()`
- Components: `ProjectCard`, `TaskInbox` (PascalCase)

### 2. RBAC Authorization Pattern (CRITICAL)

**NEVER check only role.** Authorization is: `role + state + action`

```typescript
// WRONG - only checks role
@Roles('GIANG_VIEN')

// CORRECT - checks role, state, and action
@RequirePermissions({
  role: 'GIANG_VIEN',
  state: 'DRAFT',
  action: 'EDIT'
})
```

**PROJECT_OWNER is contextual:** `user.id === project.owner_id`, NOT a standalone role.

### 3. State Machine Rules (CRITICAL)

**15 canonical states + 1 EVENT - NEVER invent new states without approval:**
- Phase A: DRAFT, [EVENT] SUBMITTED, FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW, CHANGES_REQUESTED, APPROVED
- Phase B: IN_PROGRESS, PAUSED (gia hạn only)
- Phase C: FACULTY_ACCEPTANCE_REVIEW
- Phase D: SCHOOL_ACCEPTANCE_REVIEW
- Phase E: HANDOVER
- Terminal: COMPLETED, REJECTED, WITHDRAWN, CANCELLED

**CRITICAL: SUBMITTED is EVENT, not STATE:**
- When PI clicks "Nộp hồ sơ": transition DRAFT → FACULTY_REVIEW directly
- Log event: `eventType = "project.submitted"` for Timeline display
- UI shows "Đã nộp" in Timeline, but state badge shows FACULTY_REVIEW
- Never store `projects.state = 'SUBMITTED'`

**State transitions require:**
- All stage pack forms uploaded (signed scan)
- Mandatory `reason` for REJECT, WITHDRAW, OVERRIDE actions
- Workflow log entry (append-only)
- `idempotencyKey` (prevent double-click duplicates)

**Return Logic for CHANGES_REQUESTED (UX-2):**
- System READS latest workflow_logs entry with `return_target_state`, `return_target_holder_unit`, `return_reason_sections`
- PI resubmits → returns to SAME state (not inferred from prior_state)
- UI "Revision Required" panel shows sections needing revision

**Holder Rules (UX-3):**
- CHANGES_REQUESTED: `holder_unit = PROJECT_OWNER.unit` (PI sees in "Đang chờ tôi")
- PAUSED: `holder_unit = PKHCN` (not PI)
- Terminal states: holder = decision maker (NOT in queue)

**CHANGES_REQUESTED = PI editable state. PAUSED = giaihan only.**

### 4. API Response Format (REQUIRED)

**ALL API responses MUST use this envelope:**

```typescript
// Success
{ success: true, data: {...}, meta: {...} }

// Error
{ success: false, error: { code: "ERROR_CODE", message: "...", details: [...] } }

// Paginated
{ success: true, data: [...], meta: { total: 100, page: 1, limit: 20, totalPages: 5 } }
```

### 5. Prisma Types (REQUIRED)

**ALWAYS use Prisma-generated types. NEVER redefine:**

```typescript
// WRONG - redefining types
interface User {
  id: string;
  name: string;
}

// CORRECT - use generated types
import { User, Project, ProjectState } from '@prisma/client';
```

### 6. Test File Organization

**Co-locate tests with source:**
- Frontend: `Component.test.tsx` next to `Component.tsx`
- Backend: `service.spec.ts` next to `service.ts`

### 7. SLA Calculation Rules (UX-4)

**Working Hours (Locked):**
- **Days:** Monday - Friday only
- **Hours:** 8:00 - 17:00
- **Cutoff:** 17:00 sharp (after 17:00 → next working day)
- **Timezone:** UTC+7 (Asia/Ho_Chi_Minh)
- **Holidays:** Configurable by admin in `holidays` table
- **Deadline on holiday:** Push to next working day

**SLA Display Format (Icon + Text - never icon-only):**
- OK: `⏳ Còn X ngày làm việc`
- Warning T-2: `⚠️ T-2 (Còn X ngày)`
- Overdue: `⛔ Quá hạn X ngày`
- Paused: `⏸️ Đã tạm dừng`

**SLA Pause/Resume (Auto):**
- When state → CHANGES_REQUESTED: SLA auto-pauses
- When PI resubmits: SLA resumes from original `started_at`
- Redis cache SLA results for performance

**Task-based SLA:** 72h (3d), 120h (5d), 168h (7d) depending on task type

### 8. Audit Requirements

**ALL state transitions MUST log to `workflow_logs` with return_target fields (UX-2):**

```typescript
{
  eventId: uuid(),
  eventType: "project.submitted",  // or "project.changes_requested"
  entityId: project_id,
  entityType: "project",
  action: "submit",
  actorId: user.id,
  actorRole: user.role,
  fromState: "DRAFT",
  toState: "FACULTY_REVIEW",
  timestamp: new Date().toISOString(),
  reason?: string,  // REQUIRED for rejects/overrides

  // UX-Locked: Return target for CHANGES_REQUESTED
  return_target_state?: "FACULTY_REVIEW",  // Where to return after resubmit
  return_target_holder_unit?: "KHOA.X",  // Holder for return state
  return_reason_sections?: string[],  // Section IDs needing revision

  // UX-Locked: Idempotency
  idempotency_key: string  // UUID, @unique index
}
```

**Important:** When PI resubmits, system READS the latest CHANGES_REQUESTED log entry to determine return state, NOT inferred from prior_state.

### 9. Import/Export Conventions

**Use absolute imports from libs:**
```typescript
// Correct
import { ProjectState, UserRole } from '@qlnckh/shared/types';
import { StateMachine } from '@qlnckh/workflow';

// Avoid relative imports when possible
import { StateMachine } from '../../../libs/workflow/src/state-machine';
```

### 10. Error Handling Pattern

```typescript
// Backend - use NestJS built-in exceptions
throw new BadRequestException("Validation failed");
throw new ForbiddenException("Insufficient permissions");

// Frontend - check error.code
if (error.code === "STAGE_PACK_INCOMPLETE") {
  // show upload prompt
}
```

---

## Project Structure (Nx Monorepo)

```
qlnckh/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # NestJS backend
├── libs/
│   ├── shared/       # Shared types
│   ├── ui/           # Shared UI components
│   └── workflow/     # Shared workflow logic
└── prisma/           # Database schema
```

**Feature-based modules** (not layer-based):
- `apps/api/src/modules/{module}/` contains controller, service, dto, tests
- `apps/web/src/app/{route}/` contains page components

---

## Anti-Patterns to Avoid

❌ **DON'T** use `any` type - use proper Prisma types
❌ **DON'T** skip RBAC checks on ANY endpoint
❌ **DON'T** change state without logging to `workflow_logs`
❌ **DON'T** use `SELECT *` - specify columns
❌ **DON'T** hardcode role checks - use `@RequirePermissions()`
❌ **DON'T** skip stage pack validation on transitions
❌ **DON'T** use camelCase for database objects
❌ **DON'T** create new states without architecture approval

---

## MVP Constraints

- `project_type` = CAP_TRUONG (hardcoded)
- Phase 1: Local auth only (no LDAP/SAML)
- Phase 1: Scan signatures (visual verification)
- Phase 1: Update-in-place (no versioning)
- On-premises deployment (Docker Compose)

---

## i18n Policy

**100% Vietnamese for MVP.** All UI text, error messages, emails in Vietnamese.
Technical terms (state names, role codes) remain English.

---

## UX-Locked Implementation Rules (v1.1)

### 11. Idempotency Requirement (UX-6)

**Problem:** Double-click or refresh causes duplicate state transitions.

**Solution:**
1. Client generates UUID `idempotencyKey` for each action
2. Server checks Redis: if key exists → return `already_processed`
3. Server stores key with TTL (24h)
4. Optimistic concurrency: check `updatedAt/version` before apply

**API Pattern:**
```typescript
POST /api/projects/:id/transition
{
  "action": "APPROVE",
  "idempotencyKey": "uuid-v4",  // Required
  "expectedVersion": 5  // Optimistic concurrency
}
```

**Error Response:**
- `ALREADY_PROCESSED`: Action already completed (idempotency_key exists)
- `CONFLICT`: Data changed, please refresh (version mismatch)

### 12. PDF Export (UX-5) - WYSIWYG

**Approach:** HTML/CSS + Headless Browser (Playwright)

| Aspect | Decision |
|--------|----------|
| **Rendering** | Playwright (NOT separate PDF template) |
| **CSS Framework** | Shared with UI (Tailwind) |
| **Page Break** | CSS: `break-after: avoid`, `break-inside: avoid` |
| **Table Header** | CSS: `repeat-header` |

**PDF Export Button State Machine:**
```
[Xuất PDF] → [⏳ Đang tạo...] → [✅ Đã xuất] or [⚠️ Thất bại]
```

**CSS Requirements:**
```css
/* Page break control */
.page-break { break-after: avoid; break-inside: avoid; }
/* Table header repeat */
table thead { display: table-header-group; }
```

### 13. Icon Convention (UX-7) - Lucide + Text

**Rule:** Icon-only is FORBIDDEN. All icons MUST have accompanying text.

**State Badge Mapping:**
| State | Icon + Label |
|-------|--------------|
| DRAFT | 📝 Nháp |
| FACULTY_REVIEW | ⏳ Đang xét (Khoa) |
| CHANGES_REQUESTED | ↩️ Yêu cầu sửa |
| APPROVED | ✅ Đã duyệt |
| REJECTED | ❌ Từ chối |
| PAUSED | ⏸️ Tạm dừng |

**SLA Badge:** Always Icon + Text
- `⏳ Còn X ngày làm việc`
- `⚠️ T-2 (Còn X ngày)`
- `⛔ Quá hạn X ngày`

### 14. Demo Mode Bar (UX-8)

**Visibility:** Only when `DEMO_MODE=true` (environment variable).

**UI Structure:**
```
┌─────────────────────────────────────────────────────────────┐
| 🔵 DEMO | Đang đóng vai: [PI/BCN] [KHOA] [PKHCN] [BGH] | [🔄 Reset] |
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Clicking persona switches BOTH user + role (new JWT/session)
- Prevents invariant violation: PROJECT_OWNER is who clicked "Nộp hồ sơ"
- "Reset Demo" truncates + reseeds deterministic data

**Demo Projects (Seeded):**
- DT-001: FACULTY_REVIEW, Sắp hạn (T-2)
- DT-002: FACULTY_REVIEW, Quá hạn
- DT-003: PAUSED

### 15. Core Screens (3 Screens)

**A) Queue / My Action Items (Default Landing)**
- SLA KPI header (Warning/Overdue/Paused counts)
- Filter chips: "Đang chờ tôi" (default), "Của tôi", "Quá hạn"
- Task list: State badge, Project, Holder, SLA badge, [Mở] button

**B) Proposal Detail**
- StatusCard: State + Holder + SLA + [PDFExportButton]
- ActionPanel: 1 primary action + Pack checklist
- Timeline: Gmail-style workflow history

**C) Revision Required (CHANGES_REQUESTED)**
- Left: Sections to revise with highlight
- Right: Sticky RevisionPanel + [NỘP LẠI] button (only action)

### 16. Voting Logic (Standardized)

**Pass Formula:** `yes_votes >= floor(2 * valid_votes / 3) + 1`
- Ensures strictly > 2/3 (not ≥ 2/3)

**Per-Item Pass:** Only "Đạt" if ALL items are "Đạt"

**Post-Vote Lock:** After "Chốt biên bản" → LOCK editing

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge during implementation

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

**Last Updated:** 2026-01-02
