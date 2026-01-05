---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-01-02'
inputDocuments: [
  "_bmad-output/planning-artifacts/prd.md",
  "_bmad-output/planning-artifacts/ux-design-specification-part-aa",
  "_bmad-output/planning-artifacts/ux-design-specification-part-ab",
  "_bmad-output/planning-artifacts/research/technical-rbac-workflow-audit-research-2026-01-02.md",
  "_bmad-output/addendum-forms-signature.md",
  "_bmad-output/tech-spec-nckh-part-aa",
  "_bmad-output/tech-spec-nckh-part-ab",
  "_bmad-output/tech-spec-nckh-part-ac",
  "_bmad-output/tech-spec-nckh-part-ad",
  "_bmad-output/excalidraw-diagrams/wireframe-20250102-demo.excalidraw"
]
workflowType: 'architecture'
project_name: 'DoAn'
user_name: 'Coc'
date: '2026-01-02'
---

# Architecture Decision Document - Hệ thống Quản lý NCKH (qlNCKH)

**Author:** Coc
**Date:** 2026-01-02
**Status:** In Progress

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-02 | Initial document creation | Architecture Workflow |
| 1.1 | 2026-01-02 | UX Lock Updates: SUBMITTED→event only, return_target fields, holder rules, SLA cutoff, PDF export, idempotency, icons, demo mode | Architecture Workflow |

---

## Input Documents

| # | Document | Purpose |
|---|----------|---------|
| 1 | `prd.md` | Product Requirements - 74 FRs + 4 Invariant Rules |
| 2 | `ux-design-specification-part-aa` | UI Components, Routes, Color System, State Machine |
| 3 | `ux-design-specification-part-ab` | Action Matrix, Form Semantics, SLA, Document Generation |
| 4 | `technical-rbac-workflow-audit-research.md` | Tech research: RBAC, workflow engines, audit patterns |
| 5 | `addendum-forms-signature.md` | 18 Form templates, signature policy, stage pack requirements |
| 6 | `tech-spec-nckh-part-aa` | API endpoints, Database entities, Terminology mapping |
| 7 | `tech-spec-nckh-part-ab` | Action Matrix, Save Draft vs Submit, Re-submit, Withdraw |
| 8 | `tech-spec-nckh-part-ac` | Budget rules, SLA calculation, Document generation, Visibility rules |
| 9 | `tech-spec-nckh-part-ad` | Legal signature standard, Compliance checklist, Expert review, Comments |
| 10 | `wireframe-20250102-demo.excalidraw` | UI wireframes with 4 roles, P0 FIXES applied |

---

_This document builds collaboratively through step-by-step discovery. Sections will be appended as we work through each architectural decision together._

---

## Project Context Analysis

### System Overview

**System Name:** qlNCKH (Quản lý Nghiên cứu Khoa học)
**Organization:** University/College (On-premises deployment)
**Scope:** Digital end-to-end NCKH proposal workflow (18 forms, 16 states)

### Requirements Overview

**Functional Requirements:** 74 FRs + 4 Invariant Rules

| Capability Area | FR Range | Summary |
|-----------------|----------|---------|
| User Management | FR1-FR7 | Admin-provisioned, local auth (Phase 1) |
| Workflow & State | FR8-FR22 | 16-state machine, 2-tier approval, reason governance |
| Forms & Proposals | FR23-FR31 | 18 form templates, update-in-place (no versioning in MVP) |
| Documents & Dossier | FR32-FR39 | SHA-256 integrity, scan signatures (MVP) |
| Dashboards | FR40-FR50 | 6 role-based dashboards |
| SLA & Notifications | FR51-FR59 | Working days engine, T-2/T0/T+2 alerts |
| Admin & Audit | FR60-FR74 | Dual-layer audit, DB reconciliation |

### Critical Architecture Decisions (Resolved)

| ID | Decision | Rationale |
|----|----------|-----------|
| **UX-1** | `SUBMITTED` is EVENT, not STATE - transition DRAFT → FACULTY_REVIEW directly, log "SUBMITTED" event | Prevents "how long in SUBMITTED?" confusion, matches UX decision |
| **UX-2** | `return_target_state`, `return_target_holder_unit`, `return_reason_sections` in workflow_logs for CHANGES_REQUESTED | PI returns to correct stage, no inference needed |
| **UX-3** | Holder rules: CHANGES_REQUESTED→PROJECT_OWNER.unit, PAUSED→PKHCN, terminal→decision maker (no queue) | Queue "Đang chờ tôi" works correctly |
| **UX-4** | SLA: Mon-Fri 8-17, UTC+7, cutoff 17:00, holiday configurable, auto-pause on CHANGES_REQUESTED | Consistent SLA calculation, resume on resubmit |
| **UX-5** | PDF export: WYSIWYG from HTML/CSS + headless (Playwright), NOT separate template | Design consistency, supports grayscale |
| **UX-6** | Idempotency: idempotencyKey required, optimistic concurrency with updatedAt/version check | Prevent double-click/refresh issues |
| **UX-7** | Icons: Lucide + text (icon-only forbidden), state badge always has label | Print/grayscale readable |
| **UX-8** | DEMO_MODE bar: switch persona (user+role), reset endpoint, 3 demo projects (DT-001/002/003) | Demo smoothness |
| **P0.1** | `CHANGES_REQUESTED` = "YC chỉnh sửa/bổ sung" (PI editable), `PAUSED` = gia hạn/tạm dừng (Mẫu 18b only) | Clear state separation |
| **P0.2** | `MAU_12B` belongs to `SCHOOL_ACCEPTANCE_REVIEW` (Phase D), NOT `OUTLINE_COUNCIL_REVIEW` | Correct business mapping |
| **P0.3** | Form pack = precondition for transition; state changes ONLY on action (approve/submit/decision) | Clarifies FR0-A vs gating |
| **P0.4** | Model: `projects.state` = current state; `workflow_logs` = append-only audit; reconciliation job validates | Stateful model |
| **P1.1** | No versioning in MVP; update-in-place; audit-only | Reduces complexity |
| **P1.2** | `HOI_DONG` role = council review (outline + acceptance only) | No EXPERT_REVIEW state |
| **P1.3** | Hash recalculated on each upload; manifest optional for MVP | Practical integrity |
| **P1.4** | `verify_signature` = optional admin action, NOT blocking flow | Uploader responsibility |

### State Machine (15 Canonical States + 1 Event)

**IMPORTANT:** `SUBMITTED` is an EVENT (logged in workflow_logs), NOT a state stored in `projects.state`.

When PI clicks "Nộp hồ sơ":
- State transition: `DRAFT` → `FACULTY_REVIEW` (direct)
- Log event: `event_type = "project.submitted"` for Timeline display
- UI: Shows "Đã nộp" in Timeline, but state badge shows `FACULTY_REVIEW`

```
PHASE A: ĐỀ XUẤT & XÉT CHỌN (Mẫu 1b–7b)
├── DRAFT (A0)              - Editable - Mẫu 1b + PL1
├── [EVENT] SUBMITTED       - Event logged, NOT a state - Mẫu 1b scan ký
├── FACULTY_REVIEW (A1)     - Pending - Mẫu 2b, 3b
├── SCHOOL_SELECTION_REVIEW (A2) - Pending - Mẫu 4b, 5b
├── OUTLINE_COUNCIL_REVIEW (A3) - Pending - Mẫu 6b (+ 7b if needed)
├── CHANGES_REQUESTED (A4)  - Editable (PI) - Mẫu 7b - holder=PROJECT_OWNER.unit
└── APPROVED (A5)           - Active

PHASE B: TRIỂN KHAI (Mẫu 18b if needed)
├── IN_PROGRESS (B1)        - Active
└── PAUSED (B2)             - Active - Mẫu 18b (gia hạn only) - holder=PKHCN

PHASE C: NGHIỆM THU KHOA (BẮT BUỘC)
└── FACULTY_ACCEPTANCE_REVIEW (C1) - Pending - Mẫu 8b–11b

PHASE D: NGHIỆM THU TRƯỜNG (CẦN KHOA PASS)
└── SCHOOL_ACCEPTANCE_REVIEW (D1) - Pending - Mẫu 12b–16b + PL3

PHASE E: BÀN GIAO
└── HANDOVER (E1)           - Pending - Mẫu 17b

TERMINAL (holder = decision maker, NOT in queue)
├── COMPLETED (T1)
├── REJECTED (T2)
├── WITHDRAWN (T3)
└── CANCELLED (T4)
```

**State Transitions:**
- `DRAFT` → `FACULTY_REVIEW` (on PI "Nộp hồ sơ" - logs "SUBMITTED" event)
- `FACULTY_REVIEW` → `CHANGES_REQUESTED` → returns to `FACULTY_REVIEW` (not inferred)
- Any review state → `CHANGES_REQUESTED` → returns to SAME state (via `return_target_state`)

### Stage Pack Requirements (Workflow Gating)

| Stage | Required Forms (signed scan) | Vote Tally | Holder Rules |
|-------|------------------------------|------------|--------------|
| `FACULTY_REVIEW` | MAU_02B, MAU_03B | Yes | `current_holder_id` = Khoa review assignee |
| `SCHOOL_SELECTION_REVIEW` | MAU_04B, MAU_05B | Yes | `current_holder_id` = PKHCN |
| `OUTLINE_COUNCIL_REVIEW` | MAU_06B (+ MAU_07B if needed) | Yes | `current_holder_id` = PKHCN |
| `CHANGES_REQUESTED` | MAU_07B (if applicable) | No | `current_holder_id` = PROJECT_OWNER.unit (PI sees in queue) |
| `IN_PROGRESS` | - | No | `current_holder_id` = PROJECT_OWNER |
| `PAUSED` | MAU_18B (optional) | No | `current_holder_id` = PKHCN (not PI) |
| `FACULTY_ACCEPTANCE_REVIEW` | MAU_08B, MAU_09B, MAU_10B, MAU_11B | Yes | `current_holder_id` = Council assignee |
| `SCHOOL_ACCEPTANCE_REVIEW` | MAU_12B, MAU_13B, MAU_14B, MAU_15B, MAU_16B + PL3 | Yes | `current_holder_id` = PKHCN |
| `HANDOVER` | MAU_17B | No | `current_holder_id` = PROJECT_OWNER |

**Guard Rule:** Cannot transition without ALL required signed documents uploaded.

**Important:** Upload form ≠ state change. State changes ONLY on action (approve/submit/decision).

### User Roles (6 Roles)

| Role Code | Role Name (VN) | Participating States | Demo Persona |
|-----------|----------------|---------------------|--------------|
| `GIANG_VIEN` | Giảng viên / PI | DRAFT, CHANGES_REQUESTED (own projects) | PI/BCN |
| `QUAN_LY_KHOA` | Quản lý Khoa / Thư ký Khoa | FACULTY_REVIEW, FACULTY_ACCEPTANCE_REVIEW | KHOA |
| `HOI_DONG` | Thành viên Hội đồng | OUTLINE_COUNCIL_REVIEW, SCHOOL_ACCEPTANCE_REVIEW | - |
| `BGH` | Ban Giám hiệu | OUTLINE_COUNCIL_REVIEW (final) | BGH |
| `PHONG_KHCN` | Phòng KHCN | All states (override, orchestration) | PKHCN |
| `ADMIN` | Quản trị hệ thống | Technical admin only (no workflow) | - |

**Note:** `PROJECT_OWNER` is contextual (`user.id = projects.owner_id`), NOT a standalone role.

### SLA by Task Type (Detailed Rules)

| Stage | Task | SLA | Owner | Pause on Changes |
|-------|------|-----|-------|------------------|
| `FACULTY_REVIEW` | Khoa review | 72h (3d) | QUAN_LY_KHOA | Yes → auto-pause |
| `SCHOOL_SELECTION_REVIEW` | Kế hoạch HĐ | 168h (7d) | PHONG_KHCN | Yes → auto-pause |
| `SCHOOL_SELECTION_REVIEW` | HĐ Trường | 168h (7d) | PHONG_KHCN | Yes → auto-pause |
| `OUTLINE_COUNCIL_REVIEW` | TVXC Đề cương | 72h (3d) | HOI_DONG | Yes → auto-pause |
| `FACULTY_ACCEPTANCE_REVIEW` | QĐ thành lập | 48h (2d) | HOI_DONG | Yes → auto-pause |
| `SCHOOL_ACCEPTANCE_REVIEW` | Họp NT | 168h (7d) | HOI_DONG | Yes → auto-pause |
| `IN_PROGRESS` | Hoàn thiện | 120h (5d) | PI | N/A |
| `CHANGES_REQUESTED` | PI sửa & nộp lại | 120h (5d) | PI | SLA for resubmit |

**SLA Working Hours (Locked Rules):**
- **Days:** Monday - Friday only
- **Hours:** 8:00 - 17:00
- **Cutoff:** 17:00 (after 17:00 counts as next working day)
- **Timezone:** UTC+7
- **Holidays:** Configurable by admin (stored in `holidays` table)
- **Deadline on holiday:** Push to next working day

**SLA Pause/Resume Behavior:**
- When CHANGES_REQUESTED: reviewer task SLA auto-pauses
- When PI resubmits: SLA resumes from original started_at
- UI shows `[PAUSED]` badge when SLA is paused

**SLA Display Format (Icon + Text):**
- OK: `⏳ Còn X ngày làm việc`
- Warning T-2: `⚠️ T-2 (Còn X ngày)`
- Overdue: `⛔ Quá hạn X ngày`

### MVP Constraints

| Constraint | Value |
|------------|-------|
| `project_type` | CAP_TRUONG (hardcoded) |
| Deployment | On-premises (single tenant) |
| User provisioning | Admin only (no self-registration) |
| Signature type | Scan file (PDF/JPG/PNG, max 10MB) |
| Form versioning | Update-in-place (no history) |
| State model | Stateful (not event-sourcing) |
| Verify signature | Optional admin action (not blocking) |

### Technical Constraints & Dependencies

| Constraint | Architectural Impact |
|------------|---------------------|
| **On-premises deployment** | Single tenant, Docker/VM deployment options |
| **Internal only (Phase 1)** | No self-registration, admin-provisioned users |
| **Working days SLA** | Holiday calendar import, weekend exclusion logic |
| **18 Form templates** | Document generation system required |
| **Stage Pack Requirements** | Workflow gating before state transitions |
| **Reconciliation requirement** | `projects.state` is source; `workflow_logs` for audit |
| **CAP_TRUONG only (MVP)** | `project_type` hardcoded |

### Scale & Complexity Assessment

| Metric | Value |
|--------|-------|
| **Complexity** | Medium-High |
| **Primary Domain** | Web Application + Workflow/Document System |
| **Workflow States** | 16 states |
| **User Roles** | 6 |
| **Form Templates** | 18 (MAU_01B to MAU_18B) |
| **Dashboard Types** | 6 role-based |
| **SLA Rules** | Task-based: 2/3/5/7/15 working days |
| **Estimated Components** | 12-15 core modules |
| **Concurrent Users** | 50-100 |
| **Total Users** | ~500 |

### Cross-Cutting Concerns

1. **RBAC Engine** - Role + State + Action + Context authorization (every API endpoint)
2. **Audit Trail** - Dual-layer: `workflow_logs` (structured) + `audit_logs` (trigger-based)
3. **SLA Calculator** - Working days engine with holiday calendar support
4. **Document Integrity** - SHA-256 hashing per upload, manifest optional for MVP
5. **State Machine** - Workflow transitions with mandatory reason for rejects/overrides
6. **Notification System** - Email + in-app, T-2/T0/T+2 reminder schedule
7. **Form System** - Dynamic forms with update-in-place (no versioning)
8. **Dashboard System** - Role-based views with drill-down capability

---

## UX-Locked Implementation Rules

### workflow_logs Schema Enhancement

**Critical Fields for CHANGES_REQUESTED Return Logic:**

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `return_target_state` | `ProjectState` | Yes (for CHANGES_REQUESTED) | Target state to return after resubmit |
| `return_target_holder_unit` | `String` | Yes (for CHANGES_REQUESTED) | Holder unit for return state |
| `return_reason_sections` | `String[]` | Yes (for CHANGES_REQUESTED) | List of canonical section IDs needing revision |
| `idempotency_key` | `UUID` | Yes (all transitions) | Prevent double-click/refresh duplicates |

**Prisma Schema Addition:**
```prisma
model WorkflowLog {
  id                String   @id @default(uuid())
  // ... existing fields ...

  // UX-Locked: Return target for CHANGES_REQUESTED
  return_target_state      ProjectState?   // Target state after resubmit
  return_target_holder_unit String?        // Holder unit for return state
  return_reason_sections    String[]        @default([])  // Section IDs needing revision

  // UX-Locked: Idempotency
  idempotency_key         String?         @unique  // Prevent duplicate transitions

  // ... existing fields ...
}
```

**Important:** When PI resubmits, system READS the latest CHANGES_REQUESTED log entry to determine return state, NOT inferred from prior_state.

### PDF Export Decision (WYSIWYG)

**Approach:** HTML/CSS + Headless Browser (Playwright)

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Rendering** | Playwright (or Puppeteer) | WYSIWYG - matches UI exactly |
| **CSS Framework** | Shared with UI (Tailwind) | Design tokens reused |
| **Page Break Control** | CSS: `break-after: avoid`, `break-inside: avoid` | Prevent ugly cuts |
| **Table Header Repeat** | CSS: `repeat-header` | Headers on each page |
| **Grayscale Support** | Text always exists (no icon-only) | Print/readable |

**PDF Export Button State Machine:**
```
[Xuất PDF] → [⏳ Đang tạo...] → [✅ Đã xuất] or [⚠️ Thất bại]
```

**NOT:** Separate PDF template system (causes inconsistency).

### Idempotency Requirement

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
  "idempotencyKey": "uuid-v4",
  "expectedVersion": 5  // optimistic concurrency
}
```

### Icon Convention (Lucide + Text)

**Rule:** Icon-only is FORBIDDEN. All icons MUST have accompanying text.

**State Badge Mapping (Lucide):**

| State | Icon + Label | Notes |
|-------|--------------|-------|
| DRAFT | 📝 Nháp | Always has label |
| FACULTY_REVIEW | ⏳ Đang xét (Khoa) | Always has label |
| CHANGES_REQUESTED | ↩️ Yêu cầu sửa | Always has label |
| APPROVED | ✅ Đã duyệt | Always has label |
| REJECTED | ❌ Từ chối | Always has label |
| PAUSED | ⏸️ Tạm dừng | Always has label |

**SLA Badge:** Icon + Text (never icon-only)
- ⏳ Còn X ngày làm việc
- ⚠️ T-2 (Còn X ngày)
- ⛔ Quá hạn X ngày

### Demo Mode Bar (UX-8)

**Purpose:** Single person demos as 4 roles without logout/login.

**Visibility:** Only when `DEMO_MODE=true` (environment variable).

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
| 🔵 DEMO MODE | Đang đóng vai: [PI/BCN] [KHOA] [PKHCN] [BGH] | [🔄 Reset Demo] |
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Clicking persona switches BOTH user + role (new JWT/session)
- Prevents invariant violation: PROJECT_OWNER is the one who clicked "Nộp hồ sơ"
- "Reset Demo" (admin-only) truncates demo tables + reseeds deterministic data

**Demo Projects (Seeded):**
| Code | State | SLA Status | Purpose |
|------|-------|-------------|---------|
| DT-001 | FACULTY_REVIEW | Sắp hạn (T-2) | Show SLA warning |
| DT-002 | FACULTY_REVIEW | Quá hạn | Show overdue state |
| DT-003 | PAUSED | Paused | Show pause state |

### Core Screen Definitions (3 Screens)

**A) Queue / My Action Items (Default Landing)**

```
┌─────────────────────────────────────────────────────────────┐
| SLA KPI: ⚠️ 2 Warning | ⛔ 1 Overdue | ⏸️ 0 Paused            |
├─────────────────────────────────────────────────────────────┤
| Filter: [Đang chờ tôi] [Của tôi] [Quá hạn]                  |
├─────────────────────────────────────────────────────────────┤
| State | Project | Holder | SLA | Action                  |
| ⏳ F_REVIEW | DT-001 | Khoa X | ⏳ 2d | [Mở]                   |
| ⏿ S_REVIEW | DT-002 | PKHCN  | ⛔ 3d | [Mở]                   |
└─────────────────────────────────────────────────────────────┘
```

**B) Proposal Detail (StatusCard + Timeline + ActionPanel)**

```
┌─────────────────────────────────────────────────────────────┐
| [StatusCard] State: ⏳ FACULTY_REVIEW | Holder: Khoa X      |
|            SLA: ⏳ Còn 2 ngày làm việc                       |
|            [PDFExportButton]                                 |
├─────────────────────────────────────────────────────────────┤
| [ActionPanel - Right]                                       |
| ┌─────────────────────────────────────────────────────────┐ │
| | Primary Action: [DUYỆT]                               | │
| |                                                     | │
| | Hồ sơ bắt buộc:                                     | │
| | ☑ MAU_02B (Đã ký)                                   | │
| | ☐ MAU_03B (Chưa ký) ← BLOCKING                       | │
| └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
| [WorkflowTimeline - Gmail-style]                            |
| ┌─────────────────────────────────────────────────────────┐ │
| │ 2025-12-15 10:30                                      │ │
| │ 🟢 Đã nộp                                             │ │
| │ ─────────────────────────────────────────────────────── │ │
| │ 2025-12-15 09:00                                      │ │
| │ ✅ Tạo mới: PI/BCN                                    │ │
| └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**C) Revision Required (CHANGES_REQUESTED state)**

```
┌─────────────────────────────────────────────────────────────┐
| [Left Panel - Sections to Revise]                           |
| ┌─────────────────────────────────────────────────────────┐ │
| | 1. Tên đề tài                                       [✓] │ │
| | 2. Mục tiêu                                           [!] │ │
| | 3. Phương pháp                                       [!] │ │
| │  → Click to jump to section                            │ │
| └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
| [Right Panel - RevisionPanel - STICKY]                      |
| ┌─────────────────────────────────────────────────────────┐ │
| │ Yêu cầu chỉnh sửa:                                    │ │
| │ - Mục tiêu chưa rõ ràng                                │ │
| │ - Phương pháp cần chi tiết hơn                         │ │
| │                                                     │ │
| │ [NỘP LẠI] ← Primary CTA (only action)                    │ │
| └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Voting Logic (Standardized)

**Pass Formula:** `yes_votes >= floor(2 * valid_votes / 3) + 1`

- Ensures strictly > 2/3 (not ≥ 2/3)
- `valid_votes` = votes from present members who voted

**Per-Item Pass (Phiếu đánh giá):**
- Only "Đạt" if ALL items are "Đạt"
- Single "Không đạt" item = entire phiếu "Không đạt"

**Post-Vote Lock:**
- After "Chốt biên bản/phiếu": LOCK editing
- To modify = create "YC chỉnh sửa/bổ sung" via state machine

---

## Updated Database Entities

**Core (5):** users, roles, user_roles, permissions, role_state_permissions
**Workflow (4):** projects, project_members, approval_tasks, workflow_logs (with return_target fields)
**Forms (3):** form_templates, form_instances, form_fields
**Documents (3):** document_templates, document_maps, documents
**Notifications (1):** notifications
**Settings (4):** sla_settings, withdrawal_policy, holidays, demo_seed_config

---

## Starter Template Evaluation

### Primary Technology Domain

**Web Application + Workflow/Document System** - Based on project requirements analysis:
- Frontend: 6 role-based dashboards, complex forms, SLA indicators, drill-down
- Backend: State machine (16 states), RBAC engine, SLA calculator, audit trail
- Deployment: On-premises (single tenant), Docker support required

### Starter Options Considered

| Option | Stack | Pros | Cons | Verdict |
|--------|-------|------|------|---------|
| **Nx Monorepo** | React + NestJS + Prisma | Code sharing, type safety, unified build, enterprise-grade | Learning curve | ✅ Selected |
| **Separate Repos** | Vite React + NestJS CLI | Simple, independent deployment | Manual type sharing, duplicate configs | ❌ |
| **T3 Stack** | Next.js + tRPC + Prisma | End-to-end type safety, fast dev | Less separation, monolithic approach | ❌ |
| **Full-Stack Framework** | Remix / SvelteKit | Integrated routing | Less flexible for complex backend | ❌ |

### Selected Starter: Nx Monorepo (React + NestJS + Prisma + PostgreSQL)

**Rationale for Selection:**
1. **Enterprise-grade architecture** - Suitable for complex systems like qlNCKH with 16-state workflow
2. **Type sharing** - Frontend and backend share Prisma types, reduces API contract bugs
3. **Unified build/test/dev** - Single command to build, test, and run both apps
4. **Scalability** - Monorepo structure allows future module additions
5. **Nx caching** - Faster builds for large codebases
6. **On-premises ready** - Docker support built-in

### Initialization Command

```bash
# Create Nx workspace with integrated preset (2025)
npx create-nx-workspace@latest qlnckh --preset=integrated

# Navigate to workspace
cd qlnckh

# Add NestJS backend app
nx g @nx/nest:app api

# Add React frontend app
nx g @nx/react:app web

# Install Prisma
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init

# Setup PostgreSQL in Docker (optional for dev)
#docker run --name pg-qlnckh -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

**Note:** Project initialization using this command should be the first implementation story.

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript 5.x (strict mode enabled)
- Node.js 20+ LTS
- React 18+ with hooks and concurrent features
- NestJS 10.x (latest stable)

**Styling Solution:**
- Tailwind CSS 3.x (recommended for rapid development)
- CSS Modules or Styled Components as alternatives
- shadcn/ui components (modern, accessible, customizable)

**Build Tooling:**
- Vite (dev server with HMR, optimized production builds)
- Nx (monorepo orchestration, task caching, affected graph)
- ESLint + Prettier (code quality and formatting)
- TypeScript Project References

**Testing Framework:**
- Vitest (unit testing - Jest compatible, faster)
- React Testing Library (component testing)
- Playwright (E2E testing - cross-browser)
- NestJS Testing Utilities (backend unit/integration tests)

**Code Organization:**
```
qlnckh/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── app/            # App routes/pages
│   │   │   ├── components/     # Feature components
│   │   │   ├── lib/            # Utilities, API client
│   │   │   └── styles/         # Global styles
│   │   ├── vite.config.ts
│   │   └── project.json
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── modules/        # Feature modules (workflow, rbac, etc.)
│       │   ├── common/         # Guards, interceptors, decorators
│       │   ├── database/       # Prisma service
│       │   └── main.ts
│       ├── test/
│       └── project.json
├── libs/
│   ├── shared/                 # Shared TypeScript types
│   ├── ui/                     # Shared UI components
│   └── workflow/               # Workflow state machine (shared logic)
├── prisma/
│   └── schema.prisma           # Database schema
├── docker/
│   └── docker-compose.yml      # On-premises deployment
├── nx.json                     # Nx configuration
├── tsconfig.base.json          # Root TypeScript config
└── package.json
```

**Development Experience:**
- Hot Module Replacement (HMR) with Vite
- TypeScript strict mode with path mapping
- Integrated testing (`nx test`, `nx e2e`)
- Docker support for PostgreSQL
- Swagger/OpenAPI documentation (NestJS default)
- Environment-based configuration

**Project Commands:**
```bash
nx serve web      # Run React dev server
nx serve api      # Run NestJS dev server
nx run-many -t serve   # Run both apps
nx test web       # Run frontend tests
nx test api       # Run backend tests
nx build          # Build all apps
nx run docker:up  # Start PostgreSQL in Docker
```

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database: PostgreSQL 16
- ORM: Prisma 5.x
- API Style: REST with Swagger/OpenAPI
- Authentication: JWT (Access + Refresh tokens)
- State Management: TanStack Query + Zustand
- RBAC: Custom Role Guards

**Important Decisions (Shape Architecture):**
- Caching: Redis 7.x for SLA calculations, dashboard aggregates, session storage
- Validation: Zod + Prisma (runtime + DB level)
- API Documentation: Swagger/OpenAPI (built-in NestJS)
- File Storage: Local filesystem (Docker volume)
- Rate Limiting: @nestjs/throttler

**Deferred Decisions (Post-MVP):**
- Kubernetes deployment
- S3-compatible object storage
- Message queue (RabbitMQ/Redis Bull) for async processing
- Distributed tracing

### Data Architecture

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **Database** | PostgreSQL | 16 | ACID compliance, JSONB support, on-premises ready |
| **ORM** | Prisma | 5.x | Type-safe migrations, excellent DX, NestJS integration |
| **Data Validation** | Zod + Prisma | Latest | Runtime validation (Zod) + DB constraints (Prisma) |
| **Migration** | Prisma Migrate | - | Version-controlled schema evolution |
| **Caching** | Redis | 7.x | SLA calculations, dashboard aggregates, session cache |
| **Seeding** | Custom SQL scripts | - | Production seed data (18 form templates, roles, permissions) |

**Prisma Schema Organization:**
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Core: users, roles, user_roles, permissions, role_state_permissions
// Workflow: projects, project_members, approval_tasks, workflow_logs
// Forms: form_templates, form_instances, form_fields
// Documents: document_templates, document_maps, documents
// Notifications: notifications
// Settings: sla_settings, withdrawal_policy, holidays
```

### Authentication & Security

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **Auth Method** | JWT (Access + Refresh) | - | Stateless, scalable, industry standard |
| **Access Token TTL** | 15 minutes | - | Balance between security and UX |
| **Refresh Token TTL** | 7 days | - | Reduce re-login frequency |
| **Password Hashing** | bcrypt | - | Proven, battle-tested |
| **JWT Library** | @nestjs/jwt | - | Official NestJS package |
| **RBAC** | Custom Role Guards | - | Full control over role + state + action logic |
| **Password Policy** | Min 8 chars, no complexity req | - | Reasonable security, good UX |
| **Session Storage** | Redis | - | Token invalidation, concurrent session limit |

**Authentication Flow:**
```
Login → Validate credentials → Generate tokens → Store refresh token (Redis)
     → Return tokens to client

API Request → Verify JWT → Extract user + roles → Check permissions
             → Process request → Return response
```

### API & Communication Patterns

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **API Style** | REST | - | Standard, enterprise-friendly, cacheable |
| **API Documentation** | Swagger/OpenAPI | 3.x | Built-in NestJS, interactive docs |
| **Response Format** | Standardized envelope | - | Consistent error handling |
| **Error Handling** | NestJS Exception Filters | - | Centralized error processing |
| **Rate Limiting** | @nestjs/throttler | - | Built-in, configurable |
| **Validation Pipe** | class-validator | - | DTO validation with decorators |

**Standard API Response:**
```typescript
// Success
{ success: true, data: {...}, meta: {...} }

// Error
{ success: false, error: { code: "ERROR_CODE", message: "...", details: [...] } }
```

### Frontend Architecture

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **State Management (Server)** | TanStack Query | 5.x | Caching, invalidation, loading states |
| **State Management (Client)** | Zustand | 4.x | Simple, TypeScript-first |
| **Routing** | React Router | 6.x | Standard, stable |
| **Form Handling** | React Hook Form | 7.x | Lightweight, performant |
| **Validation** | Zod | 3.x | Shared with backend |
| **HTTP Client** | Axios / fetch | - | Based on TanStack Query |
| **UI Components** | shadcn/ui + Tailwind | - | Accessible, customizable |

**Component Architecture:**
```
apps/web/src/
├── app/                    # Route components (pages)
│   ├── dashboard/          # Dashboard pages (role-based)
│   ├── projects/           # Project list, detail, form
│   ├── tasks/              # Task inbox
│   └── admin/              # Admin panel
├── components/             # Reusable components
│   ├── ui/                 # shadcn/ui components
│   ├── forms/              # Form components
│   ├── dashboard/          # Dashboard widgets
│   └── workflow/           # Workflow-related components
├── lib/                    # Utilities
│   ├── api/                # API client (TanStack Query)
│   ├── auth/               # Auth utilities
│   ├── rbac/               # Permission checks
│   └── utils/              # General utilities
└── hooks/                  # Custom hooks
    ├── usePermissions.ts   # RBAC hook
    ├── useWorkflow.ts      # Workflow state hook
    └── useSLA.ts           # SLA calculations
```

### Infrastructure & Deployment

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| **Container Strategy** | Docker Compose | 2.x | Simple on-premises deployment |
| **Environment Config** | @nestjs/config | 3.x | Joi validation, type-safe |
| **Logging** | Winston | 3.x | NestJS default, transport options |
| **File Storage** | Local filesystem | - | Docker volume, MVP simplicity |
| **Reverse Proxy** | Nginx | 1.x | Static assets, SSL termination |
| **Process Manager** | PM2 | - | Production process management |

**Docker Compose Structure:**
```yaml
services:
  postgres:  # PostgreSQL 16
  redis:     # Redis 7.x
  api:       # NestJS backend
  web:       # React frontend (Nginx static)
  nginx:     # Reverse proxy
```

### Decision Impact Analysis

**Implementation Sequence:**
1. **Foundation:** PostgreSQL + Prisma setup + NestJS modules
2. **Auth & RBAC:** JWT guards + role + permission system
3. **Workflow Engine:** State machine + transition logic
4. **Frontend Base:** React + TanStack Query + routing
5. **Dashboards:** Role-based dashboard components
6. **SLA System:** Calculator + Redis caching
7. **Notifications:** Email + in-app system

**Cross-Component Dependencies:**
- `libs/shared` → Type definitions shared across frontend/backend
- `libs/workflow` → State machine logic used by both apps
- Prisma generates types → Imported by both frontend (via API) and backend
- RBAC guards → Used by ALL API endpoints
---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
7 areas where AI agents could make different choices that would cause conflicts

### Naming Patterns

**Database Naming Conventions (PostgreSQL + Prisma):**

| Type | Convention | Example | Rationale |
|------|------------|---------|-----------|
| Tables | `snake_case` plural | `approval_tasks`, `workflow_logs` | PostgreSQL convention |
| Columns | `snake_case` | `current_holder_id`, `created_at` | PostgreSQL convention |
| Foreign keys | `{table}_id` | `project_id`, `user_id` | Clear relationship |
| Indexes | `idx_{table}_{column}` | `idx_projects_state` | Discoverable |
| Enums | `PascalCase` | `ProjectState`, `UserRole` | TypeScript consistency |

**API Naming Conventions:**

| Type | Convention | Example | Rationale |
|------|------------|---------|-----------|
| Endpoints | `kebab-case` plural | `/api/approval-tasks`, `/api/projects` | REST standard |
| Route params | `:id` | `/api/projects/:id` | Express convention |
| Query params | `snake_case` | `?project_id=xxx&is_overdue=true` | DB consistency |
| Headers | `X-` prefix for custom | `X-Request-ID` | HTTP standard |

**Code Naming Conventions (TypeScript/JavaScript):**

| Type | Convention | Example | Rationale |
|------|------------|---------|-----------|
| Variables | `camelCase` | `currentHolder`, `slaRemaining` | JS standard |
| Functions | `camelCase` verb-first | `getProjectById()`, `calculateSLA()` | Self-documenting |
| Classes/Interfaces | `PascalCase` | `WorkflowEngine`, `RBACGuard` | TS standard |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE`, `DEFAULT_SLA` | Convention |
| React Components | `PascalCase` | `ProjectCard`, `TaskInbox` | React standard |
| Files | `PascalCase` (components) | `ProjectCard.tsx`, `useWorkflow.ts` | Discoverability |

### Structure Patterns

**Project Organization (Nx Monorepo):**

```
qlnckh/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── app/            # Pages/routes (feature-based)
│   │   │   ├── components/     # Components (feature-based)
│   │   │   ├── lib/            # Utilities, API client
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── styles/         # Global styles
│   │   └── *.test.tsx          # Co-located tests
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── modules/        # Feature modules (workflow, rbac, etc.)
│       │   │   ├── {module}/
│       │   │   │   ├── controllers/
│       │   │   │   ├── services/
│       │   │   │   ├── dto/
│       │   │   │   └── *.spec.ts
│       │   ├── common/         # Guards, interceptors, decorators
│       │   ├── database/       # Prisma service
│       │   └── main.ts
│       └── test/
├── libs/
│   ├── shared/                 # Shared TypeScript types
│   ├── ui/                     # Shared UI components
│   └── workflow/               # Workflow state machine (shared logic)
├── prisma/
│   └── schema.prisma
└── docker/
    └── docker-compose.yml
```

**File Structure Rules:**
- Tests: Co-located with source (`*.test.ts` for frontend, `*.spec.ts` for backend)
- Components: Feature-based folders (`dashboard/`, `projects/`, `tasks/`)
- Shared code: In `libs/` directory
- DTOs: Inside module folders (`modules/workflow/dto/`)

### Format Patterns

**API Response Formats:**

```typescript
// Success response
{ "success": true, "data": {...}, "meta": {...} }

// Error response
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }

// Paginated response
{
  "success": true,
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

**Data Exchange Formats:**

| Type | Convention | Example | Rationale |
|------|------------|---------|-----------|
| JSON fields | `camelCase` | `projectId`, `createdAt` | JS/TS standard |
| Dates | ISO 8601 strings | `"2026-01-02T10:30:00Z"` | Standard, timezone-aware |
| Booleans | `true/false` | `isActive: true` | JSON standard |
| Nulls | `null` (not undefined) | `deletedAt: null` | Consistency |
| Enums | String values | `"DRAFT"`, `"SUBMITTED"` | Readable, debuggable |

### Communication Patterns

**Workflow Events (for audit_logs):**

| Type | Convention | Example |
|------|------------|---------|
| Event names | `{entity}.{action}` past tense | `project.submitted`, `task.approved` |
| Event payload | Standard structure | See below |

**Event Payload Structure:**
```typescript
interface WorkflowEvent {
  eventId: string;              // UUID
  eventType: string;            // "project.submitted"
  entityId: string;             // project_id
  entityType: string;           // "project", "task", "user"
  action: string;               // "submit", "approve", "reject"
  actorId: string;              // user_id who performed action
  actorRole: string;            // "GIANG_VIEN", "QUAN_LY_KHOA", etc.
  timestamp: string;            // ISO 8601
  fromState?: string;           // Previous state (for transitions)
  toState?: string;             // New state (for transitions)
  reason?: string;              // Required for rejects/overrides
  metadata?: Record<string, any>;
}
```

**State Management Patterns:**

```typescript
// Zustand store pattern
interface WorkflowStore {
  // State
  currentState: ProjectState;
  availableActions: Action[];

  // Actions
  setCurrentState: (state: ProjectState) => void;
  transitionTo: (state: ProjectState, reason?: string) => Promise<void>;
}

// TanStack Query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', id],
  queryFn: () => api.projects.getById(id)
});
```

### Process Patterns

**Error Handling Patterns:**

```typescript
// Backend (NestJS Exception Filter)
@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Standardized error response
    return {
      success: false,
      error: {
        code: exception.code,
        message: exception.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Frontend (Error Boundary)
try {
  await api.projects.transition(projectId, { action: "APPROVE" });
} catch (error) {
  if (error.code === "STAGE_PACK_INCOMPLETE") {
    // Show upload prompt for missing forms
  } else if (error.code === "INSUFFICIENT_PERMISSION") {
    // Show permission denied message
  }
}
```

**Loading State Patterns:**

```typescript
// TanStack Query handles loading states automatically
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['dashboard', role],
  queryFn: () => api.dashboard.get(role),
  staleTime: 5 * 60 * 1000,  // 5 minutes
});

// Local loading for mutations
const mutation = useMutation({
  mutationFn: (data) => api.projects.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }
});
```

### Enforcement Guidelines

**All AI Agents MUST:**

1. **Database:** Use `snake_case` for all database objects (tables, columns, indexes)
2. **Code:** Use `camelCase` for all TypeScript/JavaScript variables, functions, properties
3. **Tests:** Co-locate test files with source (`*.test.ts`, `*.spec.ts`)
4. **API Responses:** Always use the standardized envelope format (`{success, data, error}`)
5. **Dates:** Always use ISO 8601 string format for date/time values
6. **Errors:** Throw appropriate NestJS exceptions; include error codes
7. **Types:** Use Prisma-generated types - don't redefine in TypeScript
8. **Enums:** Use string enum values for database enums, share between frontend/backend

**Pattern Verification:**
- ESLint rules enforce naming conventions
- TypeScript strict mode catches type mismatches
- Prisma schema validates database patterns
- API documentation (Swagger) shows endpoint patterns
---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
qlnckh/                                    # Nx workspace root
├── apps/
│   ├── web/                                # React frontend
│   │   ├── src/
│   │   │   ├── app/                        # React Router pages
│   │   │   │   ├── index.tsx               # Home → redirect by role
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login.tsx           # Login page
│   │   │   │   │   └── logout.tsx          # Logout action
│   │   │   │   ├── dashboard/              # Role-based dashboards
│   │   │   │   │   ├── index.tsx           # Dashboard redirector
│   │   │   │   │   ├── pi.tsx              # GIANG_VIEN dashboard
│   │   │   │   │   ├── faculty.tsx         # QUAN_LY_KHOA dashboard
│   │   │   │   │   ├── council.tsx         # HOI_DONG dashboard
│   │   │   │   │   ├── bgh.tsx             # BGH dashboard
│   │   │   │   │   ├── pkhcn.tsx           # PHONG_KHCN dashboard
│   │   │   │   │   └── admin.tsx           # ADMIN dashboard
│   │   │   │   ├── projects/               # Project pages
│   │   │   │   │   ├── index.tsx           # Project list
│   │   │   │   │   ├── new.tsx             # Create project wizard
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── index.tsx       # Project detail
│   │   │   │   │       ├── timeline.tsx    # Timeline view
│   │   │   │   │       ├── documents.tsx   # Documents tab
│   │   │   │   │       └── history.tsx     # Audit history
│   │   │   │   ├── tasks/                  # Task inbox
│   │   │   │   │   ├── index.tsx           # Task list
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── index.tsx       # Task detail/decision
│   │   │   │   └── admin/                  # Admin panel
│   │   │   │       ├── users/
│   │   │   │       ├── form-templates/
│   │   │   │       ├── sla-settings/
│   │   │   │       └── audit-logs/
│   │   │   ├── components/                 # React components
│   │   │   │   ├── ui/                     # shadcn/ui base components
│   │   │   │   ├── forms/                  # Form components
│   │   │   │   │   ├── ProjectForm.tsx
│   │   │   │   │   └── DecisionForm.tsx
│   │   │   │   ├── dashboard/              # Dashboard widgets
│   │   │   │   │   ├── StatCard.tsx
│   │   │   │   │   ├── SLAIndicator.tsx
│   │   │   │   │   └── TaskList.tsx
│   │   │   │   ├── workflow/               # Workflow components
│   │   │   │   │   ├── StateBadge.tsx
│   │   │   │   │   ├── TimelineStep.tsx
│   │   │   │   │   └── ActionButton.tsx
│   │   │   │   └── layout/                 # Layout components
│   │   │   │       ├── Header.tsx
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       └── NotificationBell.tsx
│   │   │   ├── lib/                        # Utilities
│   │   │   │   ├── api/                    # API client (TanStack Query)
│   │   │   │   │   ├── client.ts           # Axios instance
│   │   │   │   │   ├── projects.ts         # Project APIs
│   │   │   │   │   ├── tasks.ts            # Task APIs
│   │   │   │   │   ├── dashboard.ts        # Dashboard APIs
│   │   │   │   │   └── admin.ts            # Admin APIs
│   │   │   │   ├── auth/                   # Auth utilities
│   │   │   │   │   ├── auth.ts             # Login/logout
│   │   │   │   │   └── session.ts          # Token management
│   │   │   │   ├── rbac/                   # Permission utilities
│   │   │   │   │   ├── permissions.ts      # Permission checker
│   │   │   │   │   └── usePermissions.ts   # Permission hook
│   │   │   │   └── utils/                  # General utilities
│   │   │   │       ├── date.ts             # Date formatting
│   │   │   │       ├── sla.ts              # SLA calculations
│   │   │   │       └── validation.ts       # Zod schemas
│   │   │   ├── hooks/                      # Custom React hooks
│   │   │   │   ├── usePermissions.ts       # RBAC hook
│   │   │   │   ├── useWorkflow.ts          # Workflow state hook
│   │   │   │   ├── useSLA.ts              # SLA hook
│   │   │   │   └── useNotifications.ts     # Notification hook
│   │   │   ├── stores/                     # Zustand stores
│   │   │   │   ├── authStore.ts           # Auth state
│   │   │   │   └── uiStore.ts             # UI state (modals, etc.)
│   │   │   ├── styles/                     # Global styles
│   │   │   │   └── globals.css
│   │   │   └── main.tsx                   # App entry point
│   │   ├── public/                         # Static assets
│   │   │   └── assets/
│   │   ├── project.json                    # Nx project config
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                                # NestJS backend
│       ├── src/
│       │   ├── main.ts                     # App entry point
│       │   ├── app.module.ts              # Root module
│       │   ├── config/                     # Configuration
│       │   │   ├── configuration.ts        # @nestjs/config
│       │   │   ├── database.ts            # Prisma config
│       │   │   └── swagger.ts             # Swagger config
│       │   ├── common/                     # Shared code
│       │   │   ├── guards/                # NestJS guards
│       │   │   │   ├── auth.guard.ts       # JWT guard
│       │   │   │   ├── role.guard.ts       # Role guard
│       │   │   │   ├── permission.guard.ts  # Role+State+Action guard
│       │   │   │   └── project-owner.guard.ts
│       │   │   ├── interceptors/          # Request/response interceptors
│       │   │   │   ├── logging.interceptor.ts
│       │   │   │   ├── transform.interceptor.ts
│       │   │   │   └── timeout.interceptor.ts
│       │   │   ├── filters/                # Exception filters
│       │   │   │   └── all-exceptions.filter.ts
│       │   │   ├── decorators/             # Custom decorators
│       │   │   │   ├── current-user.decorator.ts
│       │   │   │   └── roles.decorator.ts
│       │   │   ├── pipes/                  # Validation pipes
│       │   │   │   └── validation.pipe.ts
│       │   │   └── dto/                    # Shared DTOs
│       │   │       └── response.dto.ts
│       │   ├── modules/                    # Feature modules
│       │   │   ├── auth/                   # Authentication module
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── jwt.strategy.ts
│       │   │   │   ├── dto/
│       │   │   │   │   ├── login.dto.ts
│       │   │   │   │   └── refresh.dto.ts
│       │   │   │   └── *.spec.ts
│       │   │   ├── users/                  # User management module
│       │   │   │   ├── users.controller.ts
│       │   │   │   ├── users.service.ts
│       │   │   │   ├── users.module.ts
│       │   │   │   ├── dto/
│       │   │   │   └── *.spec.ts
│       │   │   ├── workflow/               # Workflow module
│       │   │   │   ├── workflow.controller.ts
│       │   │   │   ├── workflow.service.ts
│       │   │   │   ├── state-machine.service.ts
│       │   │   │   ├── workflow.module.ts
│       │   │   │   ├── dto/
│       │   │   │   │   ├── transition.dto.ts
│       │   │   │   │   └── decision.dto.ts
│       │   │   │   └── *.spec.ts
│       │   │   ├── projects/               # Projects module
│       │   │   │   ├── projects.controller.ts
│       │   │   │   ├── projects.service.ts
│       │   │   │   ├── projects.module.ts
│       │   │   │   ├── dto/
│       │   │   │   └── *.spec.ts
│       │   │   ├── tasks/                  # Approval tasks module
│       │   │   │   ├── tasks.controller.ts
│       │   │   │   ├── tasks.service.ts
│       │   │   │   ├── sla.service.ts       # SLA calculations
│       │   │   │   ├── tasks.module.ts
│       │   │   │   ├── dto/
│       │   │   │   └── *.spec.ts
│       │   │   ├── forms/                  # Forms module
│       │   │   │   ├── forms.controller.ts
│       │   │   │   ├── forms.service.ts
│       │   │   │   ├── forms.module.ts
│       │   │   │   ├── dto/
│       │   │   │   └── *.spec.ts
│       │   │   ├── documents/              # Documents module
│       │   │   │   ├── documents.controller.ts
│       │   │   │   ├── documents.service.ts
│       │   │   │   ├── documents.module.ts
│       │   │   │   ├── dto/
│       │   │   │   └── *.spec.ts
│       │   │   ├── notifications/          # Notifications module
│       │   │   │   ├── notifications.controller.ts
│       │   │   │   ├── notifications.service.ts
│       │   │   │   ├── email.service.ts
│       │   │   │   ├── notifications.module.ts
│       │   │   │   ├── dto/
│       │   │   │   └── *.spec.ts
│       │   │   ├── dashboard/              # Dashboard module
│       │   │   │   ├── dashboard.controller.ts
│       │   │   │   ├── dashboard.service.ts
│       │   │   │   ├── dashboard.module.ts
│       │   │   │   └── *.spec.ts
│       │   │   └── admin/                  # Admin module
│       │   │       ├── admin.controller.ts
│       │   │       ├── admin.service.ts
│       │   │       ├── admin.module.ts
│       │   │       ├── dto/
│       │   │       └── *.spec.ts
│       │   ├── database/                  # Prisma
│       │   │   ├── prisma.service.ts       # Prisma service
│       │   │   └── migrations/
│       │   └── bootstrap/                  # Seed data
│       │       ├── roles.seed.ts
│       │       ├── permissions.seed.ts
│       │       └── forms.seed.ts
│       ├── test/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── project.json                    # Nx project config
│       ├── nest-cli.json
│       └── tsconfig.json
│
├── libs/                                   # Shared libraries
│   ├── shared/                             # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── types/                     # Shared types
│   │   │   │   ├── project.types.ts       # Project types
│   │   │   │   ├── user.types.ts          # User types
│   │   │   │   ├── workflow.types.ts      # Workflow types
│   │   │   │   ├── sla.types.ts           # SLA types
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── states.ts              # ProjectState enum
│   │   │   │   ├── roles.ts               # UserRole enum
│   │   │   │   ├── actions.ts             # Actions enum
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   ├── ui/                                 # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── SLAIndicator.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   └── workflow/                           # Shared workflow logic
│       ├── src/
│       │   ├── state-machine.ts           # State transition logic
│       │   ├── guards.ts                  # Transition guards
│       │   ├── sla-calculator.ts           # SLA calculations
│       │   ├── stage-packs.ts              # Stage pack requirements
│       │   └── index.ts
│       └── project.json
│
├── prisma/                                 # Database schema
│   ├── schema.prisma                       # Prisma schema
│   └── migrations/                         # Database migrations
│       ├── 001_init/
│       ├── 002_users_roles/
│       ├── 003_workflow_tables/
│       └── 004_seed_data/
│
├── docker/                                 # Docker configuration
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
│
├── nx.json                                 # Nx configuration
├── tsconfig.base.json                      # Root TypeScript config
├── package.json                            # Root package.json
├── .env.example                            # Environment variables template
├── .gitignore
└── README.md
```

### Architectural Boundaries

**API Boundaries:**

| Endpoint Pattern | Module | Auth | Access Control |
|------------------|--------|------|----------------|
| `/api/auth/*` | auth | Public (login) | - |
| `/api/users/*` | users | JWT | Admin only |
| `/api/projects/*` | projects | JWT | RBAC (role + state + action) |
| `/api/tasks/*` | tasks | JWT | Role-based inbox |
| `/api/forms/*` | forms | JWT | RBAC |
| `/api/documents/*` | documents | JWT | RBAC |
| `/api/dashboard/*` | dashboard | JWT | Role-based data |
| `/api/notifications/*` | notifications | JWT | Own notifications only |
| `/api/admin/*` | admin | JWT | Admin only |

**Component Boundaries:**
- Frontend → Backend: REST API via Axios
- Frontend components: Props down, events up (React standard)
- State management: TanStack Query (server state) + Zustand (client state)
- Shared types: `libs/shared/` imported by both apps
- Workflow logic: `libs/workflow/` (shared state machine)

**Service Boundaries:**
- Each NestJS module: controller → service → repository (Prisma)
- Workflow state machine: `libs/workflow/src/state-machine.ts`
- External integrations: Email service (SMTP, future expansion)

**Data Boundaries:**
- Prisma as sole data access layer (no raw SQL)
- Redis for caching: SLA calculations, session storage, dashboard aggregates
- Filesystem for document storage (Docker volume at `/app/uploads`)

### Requirements to Structure Mapping

**Feature/Epic Mapping:**

| Epic/Feature | Backend Module | Frontend Pages | Shared Lib |
|--------------|----------------|----------------|------------|
| Authentication (FR1-FR7) | `modules/auth/` | `app/auth/*` | `libs/shared/src/types/user.types.ts` |
| Workflow Engine (FR8-FR22) | `modules/workflow/` | `components/workflow/*` | `libs/workflow/` |
| Projects (FR23-FR31) | `modules/projects/` | `app/projects/*` | `libs/shared/src/types/project.types.ts` |
| Approval Tasks | `modules/tasks/` | `app/tasks/*` | `libs/shared/src/types/workflow.types.ts` |
| Forms (FR23-FR31) | `modules/forms/` | `components/forms/*` | - |
| Documents (FR32-FR39) | `modules/documents/` | `app/projects/[id]/documents.tsx` | - |
| Dashboards (FR40-FR50) | `modules/dashboard/` | `app/dashboard/*` | - |
| SLA System (FR51-FR59) | `modules/tasks/sla.service.ts` | `components/dashboard/SLAIndicator.tsx` | `libs/workflow/src/sla-calculator.ts` |
| Notifications (FR51-FR59) | `modules/notifications/` | `components/layout/NotificationBell.tsx` | - |
| Admin (FR60-FR74) | `modules/admin/` | `app/admin/*` | - |

### Integration Points

**Internal Communication:**
```
React Component → TanStack Query → Axios → NestJS Controller
                                                        → Service
                                                        → Prisma
                                                        → PostgreSQL
                                                        ← JSON Response
← TanStack Query cache ← React Component re-render
```

**External Integrations (Future):**
- Email server (SMTP) for notifications
- LDAP/SAML for SSO (Phase 2+)
- S3-compatible storage (Phase 2+)

**Data Flow:**
1. User action in React component
2. TanStack Query mutation via Axios
3. NestJS JWT guard validates token
4. Permission guard checks role + state + action
5. Service executes business logic
6. Prisma updates database
7. Workflow log entry created (audit)
8. Response returns to frontend
9. TanStack Query updates cache
10. Component re-renders with new data

### File Organization Patterns

**Configuration Files:**
- Root: `nx.json`, `tsconfig.base.json`, `package.json`, `.env.example`
- API: `nest-cli.json`, `apps/api/src/config/`
- Web: `vite.config.ts`, `tailwind.config.js`

**Source Organization:**
- Feature-based modules (not layer-based)
- Co-located tests (`*.spec.ts`, `*.test.ts`)
- Shared code in `libs/`
- Types in `libs/shared/src/types/`

**Test Organization:**
- Unit: `*.spec.ts` (NestJS), `*.test.ts` (React)
- Integration: `apps/api/test/integration/`
- E2E: `apps/api/test/e2e/`

**Asset Organization:**
- Static: `apps/web/public/assets/`
- Uploads: `/app/uploads` (Docker volume)
- Form templates: `prisma/bootstrap/forms.seed.ts`
---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Nx Monorepo + React + NestJS + Prisma + PostgreSQL → All compatible technologies
- TypeScript 5.x across both apps → End-to-end type safety enabled
- TanStack Query + Zustand → Complementary state management (server + client)
- Redis 7.x + PostgreSQL 16 → Compatible versions for caching and persistence
- Docker Compose → On-premises deployment fully supported

**Pattern Consistency:**
- `snake_case` for DB objects, `camelCase` for JavaScript → Clear boundary maintained
- Co-located tests (`*.spec.ts`, `*.test.ts`) → Follows Nx convention
- Standardized API response envelope → Consistent across all endpoints
- Event naming `{entity}.{action}` → Audit-ready workflow logging

**Structure Alignment:**
- Feature-based modules → Matches domain complexity (workflow, RBAC, SLA)
- Shared libs (`libs/shared/`, `libs/workflow/`) → Enables type sharing
- API boundaries → Clear endpoint organization by module

### Requirements Coverage Validation ✅

**FR Category Coverage:**

| FR Category | Module | Coverage Status |
|-------------|--------|-----------------|
| FR1-FR7: User Management | `modules/auth/`, `modules/users/` | ✅ Complete |
| FR8-FR22: Workflow & State | `modules/workflow/`, `libs/workflow/` | ✅ Complete |
| FR23-FR31: Forms & Proposals | `modules/forms/`, `modules/projects/` | ✅ Complete |
| FR32-FR39: Documents & Dossier | `modules/documents/` | ✅ Complete |
| FR40-FR50: Dashboards | `modules/dashboard/`, `app/dashboard/*` | ✅ Complete |
| FR51-FR59: SLA & Notifications | `modules/tasks/sla.service.ts`, `modules/notifications/` | ✅ Complete |
| FR60-FR74: Admin & Audit | `modules/admin/`, workflow logs | ✅ Complete |

**Non-Functional Requirements Coverage:**
- ✅ **Performance:** Redis caching, TanStack Query cache, PostgreSQL indexes, pagination
- ✅ **Security:** JWT (access + refresh), bcrypt hashing, RBAC guards, TLS 1.3
- ✅ **Reliability:** Dual-layer audit (workflow_logs + audit_logs), append-only logging
- ✅ **Compliance:** 7-year document retention, exportable audit logs, SHA-256 integrity

### Implementation Readiness Validation ✅

**Decision Completeness:**
- ✅ All critical decisions documented with specific versions
- ✅ Implementation patterns comprehensive and enforceable
- ✅ Consistency rules supported by ESLint, TypeScript strict mode
- ✅ Examples provided for all major patterns (naming, structure, API, events)

**Structure Completeness:**
- ✅ Complete Nx monorepo structure with all files specified
- ✅ All modules, components, and utilities explicitly defined
- ✅ Integration points clearly mapped (React→NestJS→Prisma→PostgreSQL)
- ✅ Component boundaries well-established (API, service, data)

**Pattern Completeness:**
- ✅ 7 conflict points addressed (naming, structure, format, communication, process, state, error)
- ✅ Naming conventions comprehensive (DB, API, code, components, files)
- ✅ Communication patterns specified (API envelope, workflow events, state updates)
- ✅ Process patterns documented (error handling, loading states, validation)

### Gap Analysis Results

**Critical Gaps:** None identified

**Important Gaps:** None identified

**Nice-to-Have Gaps (Deferred):**
- Email service configuration (SMTP settings can be configured during implementation)
- Holiday calendar import format (CSV/JSON format decision during implementation)
- Specific UI component library details (shadcn/ui suggested but not locked in)

### Validation Issues Addressed

All P0 and P1 issues from initial analysis have been resolved:
- ✅ P0.1: `CHANGES_REQUESTED` vs `PAUSED` states clearly defined
- ✅ P0.2: `MAU_12B` correctly mapped to `SCHOOL_ACCEPTANCE_REVIEW`
- ✅ P0.3: Form pack = precondition, state changes only on action
- ✅ P0.4: Stateful model confirmed (not event-sourcing)
- ✅ P1.1-P1.4: Versioning, HOI_DONG role, manifest, signature verify all resolved

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (qlNCKH: 74 FRs, 16 states, 6 roles)
- [x] Scale and complexity assessed (Medium-High complexity, ~500 users)
- [x] Technical constraints identified (on-premises, internal only, admin-provisioned)
- [x] Cross-cutting concerns mapped (RBAC, Audit, SLA, Document Integrity, State Machine, Notifications)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (PostgreSQL 16, Prisma 5.x, NestJS 10.x, React 18+, Redis 7.x)
- [x] Technology stack fully specified (Nx Monorepo, TypeScript, Tailwind CSS, Vitest, Playwright)
- [x] Integration patterns defined (REST API, TanStack Query, Zustand)
- [x] Performance considerations addressed (Redis caching, query optimization, pagination)

**✅ Implementation Patterns**
- [x] Naming conventions established (snake_case DB, camelCase JS, PascalCase components)
- [x] Structure patterns defined (feature-based modules, co-located tests, shared libs)
- [x] Communication patterns specified (API envelope, workflow events, state updates)
- [x] Process patterns documented (error handling, loading states, validation)

**✅ Project Structure**
- [x] Complete directory structure defined (Nx monorepo with apps/web, apps/api, libs/)
- [x] Component boundaries established (API boundaries, module boundaries, data boundaries)
- [x] Integration points mapped (React → Axios → NestJS → Prisma → PostgreSQL)
- [x] Requirements to structure mapping complete (all 7 FR categories mapped to modules)

### Architecture Readiness Assessment

**Overall Status:** 🟢 **READY FOR IMPLEMENTATION**

**Confidence Level:** HIGH - All critical decisions made, patterns defined, structure complete

**Key Strengths:**
1. Clear frontend/backend separation with shared TypeScript types
2. Comprehensive RBAC system (role + state + action authorization)
3. State machine architecture supports all 16 workflow states
4. Dual-layer audit trail for compliance requirements
5. SLA system with working days calculator and Redis caching
6. Stage pack requirements enforceable at state transitions
7. Type-safe end-to-end (Prisma → NestJS → React)

**Areas for Future Enhancement (Post-MVP):**
- Phase 2: SSO integration (LDAP/SAML)
- Phase 2: S3-compatible object storage
- Phase 2: Message queue for async processing
- Phase 2: Distributed tracing
- Phase 2: Advanced analytics dashboard

### Implementation Handoff

**AI Agent Guidelines:**

1. **Follow all architectural decisions exactly as documented** - Do not deviate without explicit approval
2. **Use implementation patterns consistently** - Naming, structure, and communication patterns must be followed
3. **Respect project structure and boundaries** - Feature-based modules, shared libs, co-located tests
4. **Refer to this document for all architectural questions** - This is the source of truth
5. **Always use Prisma-generated types** - Don't redefine types that Prisma already generates
6. **Follow RBAC authorization pattern** - Use `@RequirePermissions()` decorator with role + state + action
7. **Maintain audit trail** - All state transitions must be logged to `workflow_logs`

**First Implementation Priority:**

```bash
# Initialize Nx workspace
npx create-nx-workspace@latest qlnckh --preset=integrated
cd qlnckh

# Add NestJS backend app
nx g @nx/nest:app api

# Add React frontend app
nx g @nx/react:app web

# Install core dependencies
npm install prisma @prisma/client
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install zustand
npm install react-router-dom
npm install axios
npm install ioredis
npm install zod
npm install @hookform/resolvers react-hook-form

# Initialize Prisma
npx prisma init

# Setup Docker Compose for local development
# (See docker/docker-compose.yml in project structure)
```

**Implementation Order:**
1. Foundation: PostgreSQL + Prisma schema + NestJS base modules
2. Auth & RBAC: JWT system + role/permission guards
3. Workflow Engine: State machine + transition logic + workflow logs
4. Frontend Base: React app + routing + TanStack Query setup
5. Projects Module: CRUD operations + form submissions
6. Tasks Module: Approval inbox + SLA calculations
7. Dashboards: Role-based dashboard pages
8. Notifications: Email + in-app notifications
---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-02
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping (74 FRs + 4 invariants)
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 25+ architectural decisions made (technology stack, patterns, structure)
- 7 implementation pattern categories defined (naming, structure, format, communication, process)
- 10 NestJS modules specified (auth, users, workflow, projects, tasks, forms, documents, notifications, dashboard, admin)
- 6 role-based dashboards mapped
- 16-state workflow machine defined

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (Nx, React 18+, NestJS 10.x, Prisma 5.x, PostgreSQL 16, Redis 7.x)
- Consistency rules that prevent implementation conflicts (snake_case DB, camelCase JS, co-located tests)
- Project structure with clear boundaries (API, module, data boundaries)
- Integration patterns and communication standards (REST API, TanStack Query, Zustand)

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing **qlNCKH** (Hệ thống Quản lý NCKH). Follow all decisions, patterns, and structures exactly as documented.

**Key Constraints:**
- **State Machine:** 16 canonical states (Phase A-E + Terminal)
- **RBAC:** Role + State + Action authorization (not just role-based)
- **SLA:** Working days calculator with holiday calendar, task-based SLA (2/3/5/7/15 days)
- **Audit:** Dual-layer logging (workflow_logs + audit_logs), append-only
- **Forms:** 18 templates (MAU_01B to MAU_18B), stage pack gating
- **Project Type:** CAP_TRUONG hardcoded for MVP

**First Implementation Priority:**
```bash
# Initialize Nx workspace
npx create-nx-workspace@latest qlnckh --preset=integrated
cd qlnckh
nx g @nx/nest:app api
nx g @nx/react:app web
npm install prisma @prisma/client @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @tanstack/react-query zustand react-router-dom axios ioredis zod react-hook-form @hookform/resolvers
npx prisma init
```

**Development Sequence:**
1. Initialize project using documented starter template
2. Set up Prisma schema with 19 core tables
3. Implement core architectural foundations (auth, RBAC, state machine)
4. Build features following established patterns
5. Maintain consistency with documented rules

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible (verified versions)
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All 74 functional requirements are supported
- [x] All 4 invariant rules are enforced
- [x] All non-functional requirements are addressed (performance, security, reliability, compliance)
- [x] Cross-cutting concerns are handled (RBAC, Audit, SLA, Document Integrity, State Machine, Notifications)

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts (7 categories addressed)
- [x] Structure is complete and unambiguous (full Nx monorepo tree)
- [x] Examples are provided for clarity

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**🏗️ Solid Foundation**
The chosen Nx Monorepo + React + NestJS + Prisma + PostgreSQL stack provides a production-ready foundation following current best practices for enterprise workflow applications.

---

**Architecture Status:** 🟢 **READY FOR IMPLEMENTATION** ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
