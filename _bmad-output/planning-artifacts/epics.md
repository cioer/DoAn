---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: [
  "_bmad-output/planning-artifacts/prd.md",
  "_bmad-output/planning-artifacts/architecture.md",
  "_bmad-output/planning-artifacts/ux-design-specification-part-aa.md",
  "_bmad-output/planning-artifacts/ux-design-specification-part-ab.md"
]
workflowType: 'create-epics-and-stories'
lastStep: 4
workflowStatus: 'completed'
lastUpdatedDate: '2026-01-04'
totalStories: 57
partyModeDecisions: true
user_name: Coc
date: '2026-01-04'
project_name: DoAn
---

# DoAn - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for DoAn (Hệ thống Quản lý Nghiên cứu Khoa học - Đại học Sư phạm Kỹ thuật Nam Định), decomposing the requirements from the PRD, UX Design, and Architecture specifications into implementable stories.

**Demo-First Principle:** Epics are ordered by demo path priority — core flows must run end-to-end before "nice-to-have" features.

## Requirements Inventory

### Functional Requirements

From the PRD and Architecture documents, the following functional requirements have been identified:

**User & Access (FR1-FR3):**
- FR1: User Roles — 7 vai trò (PROJECT_OWNER, QUAN_LY_KHOA, THU_KY_KHOA, PHONG_KHCN, THU_KY_HOI_DONG, THANH_TRUNG, ADMIN)
- FR2: RBAC Engine — Role + State + Action authorization matrix
- FR3: User Management — Tạo, sửa, xóa user; assign role

**Proposal Management (FR4-FR6):**
- FR4: Create Proposal — Tạo đề tài mới với form templates
- FR5: Auto-save — Autosave DRAFT với timestamp
- FR6: Attachments — Upload tài liệu đính kèm (PDF, CV, budget...)

**Workflow & State (FR7-FR9):**
- FR7: Submit Proposal — Nộp hồ sơ → auto transition
- FR8: State Transitions — 16 canonical states với transitions
- FR9: Holder Management — holder_unit + holder_user cho mỗi state

**Queue & Filters (FR10-FR12):**
- FR10: Queue Display — "Đang chờ tôi" filter theo holder_unit
- FR11: My Projects — Filter "Của tôi" cho PROJECT_OWNER
- FR12: State Filters — Filter theo state, SLA, overdue

**Faculty Review (FR13-FR15):**
- FR13: Faculty Approve — Khoa duyệt hồ sơ
- FR14: Faculty Return — Trả về với reason code + sections
- FR15: Revision Sections — Canonical Section IDs cho revision

**SLA & Calendar (FR16-FR18):**
- FR16: Business Calendar — Mon–Fri working, Sat–Sun non-working, holidays
- FR17: SLA Calculator — Tính toán ngày làm việc + deadline
- FR18: SLA Display — Badge "Còn X ngày" / "Quá hạn X ngày"

**Changes Requested & Resubmit (FR19-FR21):**
- FR19: CHANGES_REQUESTED State — State khi bị trả về
- FR20: Return Target — Lưu return_target_state + return_target_holder_unit
- FR21: Resubmit — Nộp lại về state trước, preserve form data

**School Operations (FR22-FR24):**
- FR22: School Selection — PKHCN phân bổ cho hội đồng trường
- FR23: Council Assignment — Gán thư ký hội đồng + thành viên
- FR24: Expert Review — Gán thẩm định viên (nếu có)

**Council Review (FR25-FR27):**
- FR25: Evaluation Form — Form đánh giá hội đồng
- FR26: Draft Evaluation — Draft + autosave
- FR27: Submit ONCE — Finalize → read-only, không edit được

**Project Execution (FR28-FR30):**
- FR28: APPROVED State — Đề tài được duyệt
- FR29: Start Project — Chuyển sang IN_PROGRESS
- FR30: Pause/Resume — Tạm dừng/tiếp tục (optional MVP)

**Acceptance (FR31-FR33):**
- FR31: Faculty Acceptance — Nghiệm thu cấp Khoa
- FR32: School Acceptance — Nghiệm thu cấp Trường
- FR33: Handover — Bàn giao hồ sơ

**Notifications (FR34-FR36):**
- FR34: T-2 Reminder — Nhắc trước 2 ngày làm việc
- FR35: T0 Reminder — Nhắc ngày deadline
- FR36: T+2 Reminder — Nhắc sau khi quá hạn 2 ngày

**Bulk Actions (FR37-FR39):**
- FR37: Bulk Assign — Gán holder_user hàng loạt
- FR38: Bulk Remind — Gửi email nhắc hàng loạt
- FR39: Export Excel — Xuất báo cáo Excel

**Document Export (FR40-FR42):**
- FR40: PDF Export — Xuất PDF giống UI (WYSIWYG)
- FR41: Dossier Pack — ZIP bundle theo stage
- FR42: Template Engine — HTML + Print CSS + Playwright

**Exceptions (FR43-FR45):**
- FR43: Cancel/Withdraw — Hủy/rút hồ sơ
- FR44: Reject — Từ chối (không phê duyệt)
- FR45: PAUSED State — Tạm dừng do PKHCN

**Admin & System (FR46-FR48):**
- FR46: Import/Export — Import Excel users/proposals
- FR47: Holiday Management — Quản lý ngày lễ
- FR48: Audit Logs — Workflow logs append-only

**Demo Operations (FR49-FR51):**
- FR49: Persona Switch — 1-click switch giữa các vai trò
- FR50: Seed Data — Dữ liệu demo đầy đủ
- FR51: Reset Demo — Reset về trạng thái ban đầu

### NonFunctional Requirements

- NFR1: Performance — Dashboard load < 3s
- NFR2: Accessibility — WCAG 2.1 AA compliance
- NFR3: Idempotency — Mọi action có idempotency key
- NFR4: Concurrency — Optimistic locking cho concurrent edits
- NFR5: PDF Parity — PDF giống UI layout/typography

### Additional Requirements

**UX Requirements:**
- shadcn/ui + Tailwind CSS design system
- Dark mode support (auto OS + toggle)
- Mobile: BGH read-only dashboard
- Lucide React icons (icon + text format)

**Technical Requirements:**
- Next.js + TypeScript
- PostgreSQL database
- Business calendar engine (Mon–Fri working)
- Redis for idempotency

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1-FR3, FR49-FR51 | Epic 1 | User Roles, RBAC, User Mgmt, Demo Ops |
| FR4-FR6 | Epic 2 | Create Proposal, Auto-save, Attachments, Form Registry |
| FR7-FR12, FR16-FR18 | Epic 3 | Submit, States, Holder, Queue, Timeline, SLA |
| FR13-FR15, FR19-FR21 | Epic 4 | Faculty Approve/Return, Revision, Resubmit |
| FR22-FR27 | Epic 5 | School Selection, Council Assign, Evaluation |
| FR28-FR30, FR31-FR33 | Epic 6 | APPROVED, IN_PROGRESS, Acceptance, Handover |
| FR40-FR42 | Epic 7 | PDF Export (milestone: Epic 3/4 → Project Detail PDF) |
| FR34-FR36, FR37-FR39 | Epic 8 | Reminders, Bulk Actions, Excel Export |
| FR43-FR45 | Epic 9 | Cancel/Withdraw, Reject, Pause/Resume |
| FR46-FR48, FR47 | Epic 10 | Import/Export, Audit Logs, Holiday Mgmt |

## Epic List

### Epic 1: Foundation + Demo Operator

**Mục tiêu:** Hệ thống có sẵn authentication, RBAC, user management và DEMO_MODE để 1 người có thể switch giữa tất cả các vai trò cho demo.

**FRs covered:** FR1, FR2, FR3, FR49, FR50, FR51, FR47 (partial), FR48 (partial: audit_events)

**Sprint Breakdown (Final):**
- **Sprint 1A (4 stories):** Auth + RBAC + User + Audit (không dính workflow)
- **Sprint 1B (4 stories):** Demo Operator + Seed/Reset + Business Calendar

**User Value:**
- Tất cả users có thể đăng nhập với quyền đúng vai trò
- Demo 1 người có thể impersonate (switch) giữa 8 persona
- Seed data deterministic cho demo
- Holiday config để SLA tính đúng

**Deliverables:**

*Sprint 1A:*
- Auth system (NestJS + Passport + JWT cookie-based)
- RBAC Engine (route + action permission, chưa gắn workflow state)
- User CRUD + temporary password reveal (demo-safe, không email)
- Audit log foundation (audit_events, workflow_logs để Epic 3)

*Sprint 1B:*
- Demo Mode Persona Switch (impersonation seeded user)
- Deterministic Seed Data (8 users, projects, calendar)
- Reset Demo (1 click, bảo hiểm bằng APP_MODE=demo)
- Business Calendar (CRUD holidays + SLA service stub)

**Demo Path:** Login → Switch Persona → See Worklist/Queue by role

---

## Epic 1 Stories

### Story 1.1: Authentication (NestJS-first, Cookie-based)

As a Người dùng (bất kỳ vai trò),
I want đăng nhập vào hệ thống với email/password và đăng xuất,
So that tôi có thể truy cập Worklist/Queue theo vai trò của mình.

**Tech Specs:** NestJS + Passport Local + bcrypt + JWT (access/refresh) in HttpOnly cookies (không dùng NextAuth)

**Acceptance Criteria:**

**Given** hệ thống đã có database schema với bảng users
**When** người dùng nhập email/password hợp lệ và click "Đăng nhập"
**Then** server set HttpOnly access cookie + refresh cookie
**And** server trả về me object (id, displayName, role, facultyId)
**And** UI redirect về Worklist/Queue mặc định của role (không gọi chung "Dashboard")

**Given** người dùng đã đăng nhập
**When** người dùng click "Đăng xuất"
**Then** server revoke refresh token (xóa khỏi DB/denylist)
**And** server clear cookies
**And** UI redirect về /login

**Given** access token hết hạn
**When** UI gọi API với expired token
**Then** server dùng refresh cookie để cấp access token mới
**And** nếu refresh cookie bị revoke → buộc login lại

**Session expiry:** 24h, thực thi bằng refresh TTL (không phải "invalidate all tokens")

**FRs:** FR1, FR3

---

### Story 1.2: Authorization (RBAC Engine + UI Gating)

As a Hệ thống,
I want kiểm tra quyền của user dựa trên Role + Route + Action,
So that chỉ user có quyền đúng mới thực hiện được action.

**Sửa scope:** Epic 1 chỉ làm RBAC theo route + action catalog, chưa gắn workflow states.

**Acceptance Criteria:**

**Given** database có bảng/enum roles, permissions, role_permissions (hoặc policy map)
**When** RBAC Engine khởi động
**Then** load action codes: USER_MANAGE, DEMO_SWITCH_PERSONA, DEMO_RESET, CALENDAR_MANAGE

**Given** Request vào endpoint cần quyền mà user không có
**When** Guard check permission
**Then** server trả về 403 với error_code=FORBIDDEN + required_permission

**Given** user đã login với role = ADMIN
**When** UI gọi GET /me để lấy permissions
**Then** server trả về danh sách permissions của user
**And** frontend ẩn hoặc disable menu items/buttons theo permissions

**Given** user không có permission USER_MANAGE
**When** user cố mở deep-link URL /users
**Then** UI hiển thị trang 403 đúng design (không crash)

**FRs:** FR1, FR2

---

### Story 1.3: User Management (Demo-Safe, Không Email)

As a Admin,
I want tạo, sửa, xóa user và assign role,
So that tôi quản lý được danh sách user và phân quyền.

**Bỏ yêu cầu gửi email. Thay bằng "credential reveal" trong UI để demo chạy chắc.**

**Acceptance Criteria:**

**Given** Admin đang ở màn hình User Management
**When** Admin click "Tạo user mới" và điền form (email, name, role, faculty/unit)
**Then** hệ thống tạo user + sinh temporary password
**And** UI hiển thị 1 lần temporary password trong modal + nút copy
**And** sau khi đóng modal, password không thể xem lại được

**Given** Admin đang ở màn hình User Management
**When** Admin chọn user và click "Sửa" rồi đổi role/unit
**Then** role/unit của user được cập nhật
**And** audit_events ghi action ADMIN_UPDATE_USER

**Given** Admin đang ở màn hình User Management
**When** Admin chọn user và click "Xóa"
**Then** hệ thống hiện confirm dialog
**And** sau khi confirm, user bị soft delete (deleted_at != null)
**And** user không thể login nữa

**FRs:** FR1, FR3

---

### Story 1.4: Audit Log Foundation (Auth + Admin Actions)

As a Hệ thống,
I want ghi lại mọi auth + admin action vào audit_events table,
So that có đầy đủ audit trail cho compliance.

**Đổi tên/đổi mục tiêu:** Epic 1 chưa có workflow → log nền tảng phải cover auth + admin actions. workflow_logs (from_state/to_state/return_target…) để Epic 3.

**Acceptance Criteria:**

**Given** database có bảng audit_events append-only
**When** audit event xảy ra
**Then** record được tạo với các field:
  - id, occurred_at, actor_user_id, acting_as_user_id (nullable)
  - action, entity_type, entity_id, metadata (json)
  - ip, user_agent, request_id

**Given** các actions auth/admin xảy ra
**When** action được execute
**Then** audit_events ghi lại:
  - LOGIN_SUCCESS/FAIL, LOGOUT
  - USER_CREATE/UPDATE/DELETE
  - DEMO_PERSONA_SWITCH, DEMO_RESET
  - HOLIDAY_CREATE/UPDATE/DELETE

**Given** Admin cần xem audit trail
**When** Admin gọi GET /audit?entity=users&entity_id=123
**Then** server trả timeline chronological cho entity đó
**And** endpoint là admin-only

**FRs:** FR48 (partial: audit_events)

**Note:** workflow_logs (from_state/to_state/return_target) sẽ được implement trong Epic 3 (Workflow Core).

---

### Story 1.5: Demo Mode - Persona Switch (Impersonation Chuẩn)

As a Demo Operator (người demo),
I want impersonate (switch) giữa các seeded persona chỉ với 1 click,
So that tôi có thể demo toàn bộ flow mà không cần đăng nhập/logout nhiều lần.

**Định nghĩa persona:** Persona = "acting as seeded user", không phải đổi role trừu tượng.

**Acceptance Criteria:**

**Given** environment có DEMO_MODE=true
**When** user login
**Then** UI hiển thị Persona dropdown ở top bar

**Given** Persona dropdown hiển thị
**When** user mở dropdown
**Then** hiển thị 8 persona (bao gồm Admin):
  - Giảng viên (PROJECT_OWNER)
  - Quản lý Khoa (QUAN_LY_KHOA)
  - Thư ký Khoa (THU_KY_KHOA)
  - PKHCN (PHONG_KHCN)
  - Thư ký HĐ (THU_KY_HOI_DONG)
  - Thành viên HĐ (THANH_TRUNG)
  - BGH (BAN_GIAM_HOC)
  - Admin (ADMIN)

**Given** user đang impersonate persona = Giảng viên
**When** user chọn "Quản lý Khoa" từ persona dropdown
**Then** server set acting_as_user_id (hoặc cấp token mới cho persona)
**And** server trả /me mới ngay lập tức
**And** UI rerender menu/queue theo persona mới (không reload, không logout/login)

**Given** user đang ở demo mode
**When** user thực hiện action sau khi switch persona
**Then** audit_events của action đó ghi cả:
  - actor_user_id (người demo thật)
  - acting_as_user_id (persona đang impersonate)

**Given** Persona switch được execute
**When** auth context update
**Then** atomic update:
  - Auth context updated (use immer produce hoặc equivalent)
  - Query cache invalidated (React Query `setQueryData([])`)
  - Queue refetched (`refetchQueries(['queue'])`)
  - Menu/CTAs update immediately (no stale UI from previous role)
  - Permissions re-checked (RBAC applied to new persona)

**Given** Rapid persona switch (5 lần liên tiếp)
**When** Switch 1 → Switch 2 → Switch 3 → Switch 4 → Switch 5
**Then** Mỗi lần:
  - Queue refetch thành công
  - Menu items update theo role mới
  - CTAs của role cũ KHÔNG hiển thị
  - Không có cache stale (no "button của role cũ" visible)

**Given** environment có DEMO_MODE=false
**When** user vào trang
**Then** KHÔNG hiển thị persona dropdown

**FRs:** FR49
**Party Mode Decision:** Persona switch reliability (atomic, cache invalidate, refetch, no stale UI)

---

### Story 1.6: Deterministic Seed Data (Đủ Cho Demo Flow, DT-001…DT-010)

As a Developer/QA,
I want chạy seed script để tạo dữ liệu demo deterministic với fixed IDs,
So that tôi có environment sẵn sàng để demo 10-12 phút không cần tạo thêm data.

**Acceptance Criteria:**

**Given** database trống hoặc đã reset
**When** chạy npm run seed
**Then** tạo đầy đủ data deterministic với fixed IDs:

**Users (8 users corresponding 8 persona):**
- email/password cố định cho demo (ví dụ: demo@spktn.edu.vn / Demo@123)
- mỗi user gán role cụ thể

**Faculties/Units mẫu:**
- 3-5 khoa/unit (ví dụ: Khoa CNTT, Khoa KT, Khoa Xây dựng...)

**Proposals (DT-001…DT-010, fixed IDs, deterministic):**
- **DT-001 (PI: PROJECT_OWNER):** DRAFT — dùng để tạo/sửa/auto-save + upload nhỏ
- **DT-002 (Khoa: QUAN_LY_KHOA):** FACULTY_REVIEW — dùng cho "Duyệt hồ sơ" happy path
- **DT-003 (Khoa: QUAN_LY_KHOA):** FACULTY_REVIEW — dùng cho "Yêu cầu sửa" → tạo CHANGES_REQUESTED trong demo
- **DT-004 (PI: PROJECT_OWNER):** CHANGES_REQUESTED — đã có sẵn return_target + sections để demo resubmit
- **DT-005 (PKHCN):** SCHOOL_SELECTION_REVIEW — dùng phân bổ hội đồng
- **DT-006 (Thư ký HĐ: THU_KY_HOI_DONG):** OUTLINE_COUNCIL_REVIEW — holder_user = secretary
- **DT-007 (Thành viên HĐ: THANH_TRUNG):** OUTLINE_COUNCIL_REVIEW — dùng vote / submit-once
- **DT-008 (PI: PROJECT_OWNER):** APPROVED — dùng "Bắt đầu thực hiện"
- **DT-009 (PI: PROJECT_OWNER):** IN_PROGRESS — dùng "Nộp nghiệm thu"
- **DT-010 (BGH: BAN_GIAM_HOC):** SCHOOL_ACCEPTANCE_REVIEW — dùng duyệt cấp Trường

**Business Calendar:**
- ngày làm việc mặc định (Mon–Fri working, Sat–Sun non-working)
- vài holiday mẫu (không hardcode danh sách "chuẩn quốc gia")

**Given** seed script đã chạy xong
**When** chạy lại npm run seed
**Then** data không đổi (không sinh id/random khác làm lệch UI test)
**And** demo script luôn khớp với DT-001…DT-010

**Given** Seed data đã tạo
**When** Demo script chạy (10-12 phút)
**Then** Không cần tạo thêm data nào — seed data đủ toàn bộ demo

**FRs:** FR50
**Party Mode Decision:** Fixed IDs DT-001…DT-010, đủ demo 10-12 phút, deterministic

---

### Story 1.7: Reset Demo (1 Click, < 30s, An Toàn Môi Trường Demo)

As a Demo Operator,
I want reset database về trạng thái ban đầu chỉ với 1 click trong < 30s,
So that tôi có thể demo lại từ đầu ngay lập tức.

**Acceptance Criteria:**

**Given** user ở environment không phải demo (APP_MODE != demo)
**When** user truy cập /reset-demo
**Then** server trả về 404 Not Found

**Given** user ở environment demo (APP_MODE=demo) nhưng KHÔNG DEMO_MODE
**When** user truy cập /reset-demo
**Then** server trả về 403 Forbidden

**Given** user ở DEMO_MODE=true AND APP_MODE=demo
**When** user click button "Reset Demo" ở top bar
**Then** UI hiển thị confirm modal: "Bạn có chắc? Mọi dữ liệu sẽ bị xóa."
**And** sau khi user confirm:
  - Server chạy reset() (truncate demo tables)
  - Server chạy seed() trong 1 pipeline
  - Server redirect về Worklist theo persona hiện tại
**And** Total time < 30 seconds

**Given** Reset demo đang chạy
**When** process đang execute
**Then** UI hiển thị progress indicator: "Đang reset demo..."

**Given** Reset demo hoàn thành (< 30s)
**When** process done
**Then** UI hiển thị toast "Đã reset demo thành công"
**And** data ở trạng thái giống như npm run seed mới chạy
**And** Persona hiện tại được giữ nguyên (không bị reset về default)

**Given** Reset demo xong
**When** User xem Worklist
**Then** Queue hiển thị theo persona hiện tại (không cần switch lại)

**FRs:** FR51
**Party Mode Decision:** Reset < 30s, progress indicator, keep persona after reset

---

### Story 1.8: Business Calendar (Basic Nhưng Đủ Để SLA Chạy Sau)

As a Admin,
I want quản lý danh sách ngày lễ,
So that SLA calculator tính đúng ngày làm việc.

**Acceptance Criteria:**

**Given** Admin đang ở màn hình Holiday Management
**When** Admin xem danh sách
**Then** hiển thị các ngày lễ từ business_calendar table
**And** hiển thị date + holiday_name cho từng holiday

**Given** Admin đang ở màn hình Holiday Management
**When** Admin click "Thêm ngày lễ" và nhập date + name
**Then** holiday mới được thêm vào business_calendar table
**And** is_holiday = true

**Given** SLA service (stub) đã được implement
**When** gọi nextBusinessDay(date)
**Then** trả về ngày làm việc tiếp theo (bỏ Sat/Sun + holidays)

**Given** SLA service (stub) đã được implement
**When** gọi addBusinessDays(date, n)
**Then** trả về date sau n ngày làm việc (bỏ Sat/Sun + holidays)

**Given** SLA deadline rơi vào holiday
**When** tính deadline
**Then** deadline được dời sang ngày làm việc tiếp theo
**And** logic deterministic (không random)

**FRs:** FR47 (partial), FR16 (business calendar foundation)

---

### Epic 2: Proposal Draft + Attachments + Form Registry

**Mục tiêu:** Giảng viên tạo đề tài, lưu nháp với auto-save, upload tài liệu đính kèm, Form Registry chuẩn (MAU_01B…MAU_18B).

**FRs covered:** FR4, FR5, FR6

**User Value:**
- Giảng viên tạo đề tài, điền form 1 lần, không phải điền lại
- Auto-save tránh mất dữ liệu
- Upload tài liệu đính kèm (PDF, CV, budget...)
- Form Registry chuẩn là "single source of truth"

**Deliverables:**
- Form templates (MAU_01B…MAU_18B) với canonical section IDs
- Proposal CRUD (Create, Read, Update DRAFT)
- Auto-save với "Last saved" timestamp
- File upload (50MB per file, 500MB total)
- Attachment CRUD (upload, replace, delete)
- Proposal master record structure

**Demo Path:** Tạo đề tài mới → Điền form → Upload files → Auto-save → Đóng → Mở lại (data được preserve)

---

## Epic 2 Stories

### Story 2.1: Form Registry (Canonical Section IDs)

As a Hệ thống,
I want định nghĩa Form Templates với canonical section IDs ổn định,
So that form data có structure nhất quán và revision có thể reference chính xác.

**Acceptance Criteria:**

**Given** database có bảng form_templates
**When** hệ thống khởi động
**Then** load các form templates:
  - MAU_01B: Đề tài NCKH cấp trường (đầy đủ)
  - MAU_02B: Đề tài NCKH cấp khoa (đầy đủ)
  - MAU_03B đến MAU_18B: các mẫu khác theo quy định

**Given** form template được định nghĩa
**When** inspect structure
**Then** mỗi template có:
  - id, name, version (ví dụ: v1.0)
  - sections[] với mỗi section có:
    - section_id (canonical: SEC_INFO_GENERAL, SEC_CONTENT_METHOD...)
    - label (tiếng Việt)
    - component (React component name)
    - order
    - required (boolean)

**Given** section IDs đã được định nghĩa
**When** template version được update
**Then** section IDs KHÔNG đổi nghĩa (backward compatible)
**And** chỉ có thể add new sections hoặc deprecate old sections

**FRs:** FR4

---

### Story 2.2: Create Proposal (DRAFT)

As a Giảng viên (PROJECT_OWNER),
I want tạo đề tài mới và điền form thông tin,
So that tôi có thể bắt đầu quy trình nộp hồ sơ.

**Acceptance Criteria:**

**Given** Giảng viên đang ở Worklist/Queue
**When** click button "Tạo đề tài mới"
**Then** UI hiển thị form với sections theo form template tương ứng
**And** proposal được tạo với state = DRAFT
**And** holder_unit = null, holder_user = null (chưa ai nắm giữ)

**Given** Giảng viên đang điền form
**When** điền các required fields (title, faculty, objective...)
**Then** UI validate các field theo form template
**And** highlight các field chưa hợp lệ

**Given** Giảng viên đã điền form
**When** click button "Lưu nháp"
**Then** proposal data được lưu vào database
**And** system ghi audit_events PROPOSAL_CREATE

**Given** Giảng viên đang tạo đề tài
**When** không đủ quyền tạo (ví dụ: không phải PROJECT_OWNER)
**Then** UI hiển thị lỗi hoặc hide button "Tạo đề tài mới"

**FRs:** FR4

---

### Story 2.3: Auto-Save DRAFT

As a Giảng viên,
I want form tự động save khi tôi điền dữ liệu,
So that tôi không mất dữ liệu khi browser crash hoặc mất điện.

**Acceptance Criteria:**

**Given** Giảng viên đang ở màn hình Edit Proposal (DRAFT state)
**When** user thay đổi bất kỳ field nào
**Then** system trigger auto-save sau 2 giây debounce
**And** UI hiển thị indicator "Đang lưu..."

**Given** Auto-save đang chạy
**When** save thành công
**Then** UI hiển thị "Đã lưu vào HH:mm:ss"
**And** proposal data được update trong database

**Given** Auto-save thất bại (network error)
**When** error xảy ra
**Then** UI hiển thị toast "Lưu thất bại. Đang thử lại..."
**And** system retry lên đến 3 lần với exponential backoff

**Given** Giảng viên đóng tab khi đang edit
**When** mở lại proposal
**Then** dữ liệu được preserve (không mất)

**FRs:** FR5

---

### Story 2.4: Upload Attachments (Demo Cap 5MB/File)

As a Giảng viên,
I want upload tài liệu đính kèm (PDF, CV, budget...),
So that hồ sơ của tôi đầy đủ chứng từ cần thiết.

**Acceptance Criteria:**

**Given** Giảng viên đang ở màn hình Edit Proposal
**When** click button "Tải tài liệu lên" hoặc drag-drop file
**Then** UI hiển thị file picker
**And** accept các định dạng: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG

**Given** User chọn file
**When** file size > 5MB (demo cap, configurable)
**Then** UI hiển thị lỗi "File quá 5MB. Vui lòng nén hoặc chia nhỏ."
**And** file KHÔNG được upload
**And** Progress bar hiển thị % upload (cho file gần limit)

**Given** User chọn file hợp lệ (≤ 5MB)
**When** upload thành công
**Then** Progress bar hiển thị từ 0% → 100%
**And** file được lưu vào storage (local/S3)
**And** attachment record được tạo với:
  - file_name, file_url, file_size, uploaded_at
  - uploaded_by = current user id
**And** UI hiển thị file trong danh sách attachments

**Given** Upload đang progress
**When** upload > 30 seconds
**Then** UI hiển thị timeout error "Upload quá时限. Vui lòng thử lại."
**And** File không được lưu

**Given** Total attachments size > 50MB (per proposal cap)
**When** user cố upload thêm
**Then** UI hiển thị warning "Tổng dung lượng đã vượt giới hạn (50MB/proposal)"

**FRs:** FR6
**Party Mode Decision:** Demo cap 5MB/file, progress bar, clear timeout message

---

### Story 2.5: Attachment CRUD (Replace, Delete)

As a Giảng viên,
I want thay thế hoặc xóa tài liệu đã upload,
So that tôi có thể cập nhật hồ sơ khi có version mới.

**Acceptance Criteria:**

**Given** Giảng viên đang ở màn hình Edit Proposal (DRAFT state)
**When** click button "Thay thế" trên attachment
**Then** UI hiển thị file picker
**And** sau khi chọn file mới:
  - File cũ bị xóa khỏi storage
  - File mới được upload
  - attachment record được update với file_url mới

**Given** Giảng viên đang ở màn hình Edit Proposal (DRAFT state)
**When** click button "Xóa" trên attachment
**Then** UI hiển thị confirm dialog
**And** sau khi confirm:
  - File bị xóa khỏi storage
  - attachment record bị soft delete

**Given** Proposal đã submit (không còn DRAFT)
**When** user cố thay thế/xóa attachment
**Then** UI hiển thị lỗi "Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa."

**FRs:** FR6

---

### Story 2.6: Proposal Master Record Structure

As a Hệ thống,
I want lưu trữ proposal data trong master record với structure chuẩn,
So rằng tất cả các workflows sau này có thể reference proposal data.

**Acceptance Criteria:**

**Given** database có bảng proposals
**When** inspect structure
**Then** proposals table có các field:
  - id, title, code (mã đề tài tự sinh)
  - state (DRAFT, FACULTY_REVIEW, etc.)
  - holder_unit, holder_user
  - owner_id (PROJECT_OWNER)
  - faculty_id (khoa của chủ nhiệm)
  - template_id, template_version
  - form_data (JSON, chứa data theo section)
  - sla_deadline, sla_start_date
  - created_at, updated_at, deleted_at

**Given** proposal có form_data JSON
**When** query theo section_id
**Then** có thể retrieve data cho section đó (ví dụ: SEC_INFO_GENERAL)

**Given** proposal được tạo
**When** form_data được populate
**Then** form_data structure follows canonical section IDs
**And** có thể extend khi template version update (backward compatible)

**FRs:** FR4

---

### Epic 3: Workflow Core + Queue + SLA

**Mục tiêu:** Submit hồ sơ → auto transition state → vào queue → hiển thị SLA badge. Đây là "màn hình demo chính".

**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR16, FR17, FR18, FR40 (partial: Project Detail PDF)

**User Value:**
- Submit xong biết ngay: State + Holder + SLA
- Queue hiển thị "Đang chờ tôi" theo holder_unit
- SLA badge "Còn X ngày làm việc" / "Quá hạn X ngày"
- Timeline hiển thị history
- PDF export Project Detail (để demo có cái trình bày)

**Deliverables:**
- 16 canonical states + transitions
- Holder rules (holder_unit + holder_user)
- Workflow state machine
- Queue filters (Đang chờ tôi, Của tôi, Quá hạn, T-2)
- Timeline display (thread view)
- SLA calculator (Mon–Fri working, holidays, cutoff 17:00)
- SLA badge component (icon + text)
- Idempotency keys (anti double-submit)
- Project Detail PDF export (WYSIWYG)

**Demo Path:** Submit → Khoa thấy trong queue → Open detail → See State/Holder/SLA → Export PDF

---

## Epic 3 Stories

### Story 3.1: 16 Canonical States + Transitions

As a Hệ thống,
I want định nghĩa 16 canonical states và transitions giữa chúng,
So that workflow engine có thể manage proposal lifecycle.

**Acceptance Criteria:**

**Given** database có bảng proposals với field state
**When** inspect enum ProjectState
**Then** có 16 canonical states:
  - Phase A (Proposal): DRAFT, FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW
  - Phase B (Changes & Approval): CHANGES_REQUESTED, APPROVED, IN_PROGRESS
  - Phase C (Acceptance & Handover): FACULTY_ACCEPTANCE_REVIEW, SCHOOL_ACCEPTANCE_REVIEW, HANDOVER, COMPLETED
  - Exception states: PAUSED, CANCELLED, REJECTED, WITHDRAWN

**Given** proposal ở state DRAFT
**When** owner submit proposal
**Then** state chuyển từ DRAFT → FACULTY_REVIEW (KHÔNG qua SUBMITTED)
**And** holder_unit = faculty_id của proposal

**Given** proposal ở FACULTY_REVIEW
**When** approver approve
**Then** state chuyển từ FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW

**Given** proposal ở FACULTY_REVIEW
**When** approver return
**Then** state chuyển từ FACULTY_REVIEW → CHANGES_REQUESTED
**And** holder_unit = faculty_id của owner (về lại giảng viên)

**FRs:** FR7, FR8

---

### Story 3.2: Holder Rules (holder_unit + holder_user)

As a Hệ thống,
I want assign holder_unit và holder_user cho mỗi state transition,
So that queue filters "Đang chờ tôi" hoạt động đúng.

**Acceptance Criteria:**

**Given** proposal chuyển state
**When** transition xảy ra
**Then** holder_unit và holder_user được set theo rules:

| State | holder_unit | holder_user | Logic |
|-------|-------------|-------------|-------|
| DRAFT | null | null | Chưa ai nắm giữ |
| FACULTY_REVIEW | faculty_id (từ proposal) | null | Khoa duyệt, chưa gán người |
| SCHOOL_SELECTION_REVIEW | PHONG_KHCN | null | PKHCN phân bổ |
| OUTLINE_COUNCIL_REVIEW | council_id | council_secretary_id | Hội đồng + thư ký |
| CHANGES_REQUESTED | owner_faculty_id | owner_id | Về lại giảng viên |
| APPROVED | owner_faculty_id | owner_id | Giảng viên thực hiện |
| IN_PROGRESS | owner_faculty_id | owner_id | Giảng viên đang làm |
| PAUSED | PKHCN | null | PKHCN tạm dừng |
| CANCELLED | actor_unit | actor_id | Người hủy |

**Given** proposal có holder_unit = "Khoa CNTT"
**When** user với role QUAN_LY_KHOA và faculty_id = "Khoa CNTT" query queue
**Then** proposal xuất hiện trong "Đang chờ tôi"

**Given** proposal có holder_unit = "Khoa CNTT"
**When** user với role QUAN_LY_KHOA nhưng faculty_id = "Khoa KT" query queue
**Then** proposal KHÔNG xuất hiện trong "Đang chờ tôi"

**FRs:** FR9

---

### Story 3.3: Submit Proposal (DRAFT → FACULTY_REVIEW)

As a Giảng viên (PROJECT_OWNER),
I want nộp hồ sơ đề tài,
So that hồ sơ được gửi đến Khoa duyệt.

**Acceptance Criteria:**

**Given** Giảng viên đang ở màn hình Edit Proposal với state = DRAFT
**When** click button "Nộp hồ sơ"
**Then** UI validate tất cả required fields
**And** nếu có field thiếu, highlight và show error

**Given** Tất cả required fields đã điền đủ
**When** Giảng viên click "Nộp hồ sơ" (kèm idempotency key)
**Then** proposal.state chuyển từ DRAFT → FACULTY_REVIEW
**And** proposal.holder_unit = proposal.faculty_id
**And** proposal.sla_start_date = now()
**And** proposal.sla_deadline = sla_start_date + 3 working days
**And** workflow_logs entry được tạo:
  - action = SUBMIT
  - from_state = DRAFT
  - to_state = FACULTY_REVIEW

**Given** Giảng viên click "Nộp hồ sơ" 2 lần với cùng idempotency key
**When** request thứ 2 đến
**Then** server trả về result đã cached từ request thứ 1
**And** KHÔNG tạo duplicate workflow_logs entry

**FRs:** FR7, FR9

---

### Story 3.4: Workflow Logs (Timeline Thread View)

As a Hệ thống,
I want ghi lại tất cả workflow actions vào workflow_logs table,
So that user có thể xem timeline history của proposal.

**Acceptance Criteria:**

**Given** database có bảng workflow_logs
**When** inspect structure
**Then** workflow_logs có các field:
  - id, project_id (FK proposals.id)
  - action (SUBMIT, APPROVE, RETURN, RESUBMIT, etc.)
  - from_state, to_state
  - actor_id, actor_name
  - return_target_state, return_target_holder_unit (nullable)
  - revision_sections (JSON array, nullable)
  - reason_code, comment
  - timestamp

**Given** proposal có nhiều workflow_logs entries
**When** user xem proposal detail
**Then** UI hiển thị Timeline component:
  - Entries theo chronological order (mới nhất ở trên)
  - Mỗi entry hiển thị: actor_name, action, timestamp
  - Nếu action = RETURN, hiển thị reason_code + revision_sections

**FRs:** FR48 (workflow_logs portion)

---

### Story 3.5: Queue Filters ("Đang chờ tôi", "Của tôi", etc.)

As a User (bất kỳ vai trò),
I want filter proposals theo holder và state,
So that tôi thấy những hồ sơ cần tôi xử lý.

**Acceptance Criteria:**

**Given** User đang ở Worklist/Queue page
**When** UI load
**Then** hiển thị các filter tabs:
  - "Đang chờ tôi" (mặc định)
  - "Của tôi"
  - "Tất cả"
  - "Quá hạn"
  - "Sắp đến hạn" (T-2)

**Given** User click filter "Đang chờ tôi"
**When** API được gọi
**Then** proposals trả về thỏa điều kiện:
  - proposal.holder_unit = user.faculty_id (hoặc user.unit)
  - Nếu holder_user != null, thì proposal.holder_user = user.id
  - proposal.state KHÔNG phải terminal state (COMPLETED, CANCELLED, REJECTED, WITHDRAWN)

**Given** User có role = PROJECT_OWNER
**When** User click filter "Của tôi"
**Then** proposals trả về thỏa điều kiện:
  - proposal.owner_id = user.id

**Given** User click filter "Quá hạn"
**When** API được gọi
**Then** proposals trả về thỏa điều kiện:
  - proposal.sla_deadline < now()
  - proposal.state NOT IN (COMPLETED, CANCELLED, PAUSED)

**FRs:** FR10, FR11, FR12

---

### Story 3.6: SLA Calculator (Business Days + Cutoff 17:00)

As a Hệ thống,
I want tính toán SLA deadline theo ngày làm việc + cutoff 17:00,
So that SLA badge hiển thị chính xác.

**Acceptance Criteria:**

**Given** business calendar đã được config (Mon–Fri working, Sat–Sun non-working)
**When** gọi calculateDeadline(startDate, workingDays)
**Then** deadline được tính:

```
- Cutoff time: 17:00 (5 PM)
- Nếu submit sau 17:00 → count từ ngày làm việc tiếp theo
- Mon–Fri = working days
- Sat–Sun = non-working
- Holidays (từ business_calendar) = non-working
- Nếu deadline rơi vào Sun/holiday → dời sang Mon/ngày làm việc tiếp theo
```

**Given** submit_time = Friday 16:59
**When** workingDays = 3
**Then** deadline = Tuesday 17:00
  - Fri = day 1 (16:59 < 17:00, count as day 1)
  - Sat = skip (non-working)
  - Sun = skip (non-working)
  - Mon = day 2
  - Tue = day 3, 17:00

**Given** submit_time = Friday 17:01
**When** workingDays = 3
**Then** deadline = Wednesday 17:00
  - Fri = không count (sau 17:00)
  - Sat = skip
  - Sun = skip
  - Mon = day 1
  - Tue = day 2
  - Wed = day 3, 17:00

**FRs:** FR16, FR17

---

### Story 3.7: SLA Badge Component (Icon + Text)

As a User,
I want see SLA status badge trên mỗi proposal card,
So that tôi biết đề tài còn bao nhiêu ngày hay đã quá hạn.

**Acceptance Criteria:**

**Given** proposal có sla_deadline = ngày mai
**When** SLA badge render
**Then** hiển thị:
  - Icon: clock (Lucide)
  - Text: "Còn 1 ngày làm việc"
  - Color: neutral/default

**Given** proposal có sla_deadline = hôm nay hoặc ngày mai (T-2)
**When** SLA badge render
**Then** hiển thị:
  - Icon: alert-triangle (Lucide)
  - Text: "⚠️ T-2 (Còn X ngày)" nếu còn ≤ 2 ngày
  - Color: warning (orange/amber)

**Given** proposal có sla_deadline < now (quá hạn)
**When** SLA badge render
**Then** hiển thị:
  - Icon: alert-circle (Lucide)
  - Text: "⛔ Quá hạn X ngày"
  - Color: danger (red)

**Given** proposal state = PAUSED
**When** SLA badge render
**Then** hiển thị:
  - Icon: pause-circle
  - Text: "Đã tạm dừng"
  - Không hiển thị countdown

**FRs:** FR18

---

### Story 3.8: Idempotency Keys (Anti Double-Submit, ALL State-Changing Actions)

As a Hệ thống,
I want dùng idempotency key cho mọi state-changing action (không chỉ evaluation),
So that user KHÔNG thể submit/approve/return/resubmit 2 lần khi double-click.

**Acceptance Criteria:**

**Given** UI component cho action (Submit, Approve, Return, Resubmit, Finalize, Start, Accept, Handover...)
**When** user click button
**Then** client generate UUID v4 làm idempotency key
**And** gửi key trong header: X-Idempotency-Key

**Given** Middleware intercepts POST/PUT requests with state changes
**When** idempotency key chưa tồn tại trong cache
**Then** execute action
**And** lưu result trong Redis với key = idempotency key, TTL = 5 phút

**Given** Middleware intercepts POST/PUT requests với idempotency key đã tồn tại
**When** key đã cached
**Then** KHÔNG execute action again
**And** trả về result đã cached (200 OK with same response)

**Given** user double-click "Nộp hồ sơ" (Submit)
**When** 2 requests đến gần như cùng lúc
**Then** chỉ 1 request thực sự execute
**And** request thứ 2 nhận result đã cached

**Given** User double-click "Duyệt hồ sơ" (Approve)
**When** 2 requests đến gần như cùng lúc
**Then** chỉ 1 APPROVE action execute
**And** request thứ 2 nhận result đã cached

**Given** User double-click "Yêu cầu sửa" (Return)
**When** 2 requests đến gần như cùng lúc
**Then** chỉ 1 RETURN action execute
**And** request thứ 2 nhận result đã cached

**Given** User double-click "Nộp lại" (Resubmit)
**When** 2 requests đến gần như cùng lúc
**Then** chỉ 1 RESUBMIT action execute
**And** request thứ 2 nhận result đã cached

**FRs:** NFR3
**Party Mode Decision:** Idempotency cho ALL state-changing actions (Submit, Approve, Return, Resubmit, Finalize, etc.)

---

### Story 3.9: Project Detail PDF Export (WYSIWYG, SLA 10s, Pre-Generated Seeds)

As a Giảng viên/Reviewer,
I want export proposal detail ra PDF giống như UI,
So that tôi có thể in hoặc gửi file cho người khác xem.

**Acceptance Criteria:**

**Given** user đang xem Proposal Detail
**When** click button "Xuất PDF"
**Then** UI hiển thị preview modal:
  - Render HTML giống UI (State badge, Holder, SLA, Form data)
  - Force light theme (print theme) ngay cả khi UI đang dark mode
  - Button "Tải xuống" + "Đóng"

**Given** User click "Tải xuống"
**When** server render PDF
**Then** PDF được export bằng Playwright/Puppeteer headless
**And** PDF layout giống UI:
  - Cùng typography (font, size, weight)
  - Cùng spacing (margins, padding)
  - Badge icon + text (grayscale vẫn đọc được)
  - Table header repeat nếu span nhiều trang

**Given** PDF đang render
**When** render time > 10 seconds
**Then** UI hiển thị loader "Đang tạo PDF..." với progress indicator
**And** User có thể đóng modal (PDF generate background)

**Given** PDF render time ≤ 10 seconds
**When** render hoàn thành
**Then** UI trigger download ngay lập tức
**And** file name format: "{proposal_code}_detail_{timestamp}.pdf"

**Given** PDF đang render
**When** content quá dài (> 1 trang)
**Then** page break ở logical boundaries (giữa sections)
**And** không break giữa một row của table

**Given** Seed data DT-001…DT-010 đã được tạo
**When** Seed script chạy
**Then** Pre-generate PDFs cho tất cả proposals (DT-001.pdf, DT-002.pdf, ...)
**And** `/api/proposals/{id}/pdf` trả pre-generated PDF nếu có
**And** New proposals (không trong seed) generate on-demand

**FRs:** FR40 (partial)
**Party Mode Decision:** PDF SLA 10s, loader if > 10s, pre-generated PDFs cho seed data

---

### Epic 4: Faculty Review + Changes Requested + Resubmit

**Mục tiêu:** Khoa duyệt/trả về hồ sơ với reason code + revision sections → Giảng viên resubmit về đúng state trước.

**FRs covered:** FR13, FR14, FR15, FR19, FR20, FR21, FR40 (partial: Revision PDF)

**User Value:**
- Khoa duyệt nhanh hoặc trả về rõ ràng
- Giảng viên BIẾT PHẢI SỬ GÌ (section-level)
- Resubmit không mất form data
- Return về đúng state (không về DRAFT)

**Party Mode Decisions:**
- **UX Revision Panel:** Checkbox "Đã sửa" MVP (user tự tick, không hash detection)
- **Revision PDF:** Phải có trong Epic 4 (đợi Epic 7 là quá muộn)
- **Timeline Entry:** Resubmit ghi rõ return_target_state + return_target_holder_unit

**Deliverables:**
- Faculty approve action
- Faculty return dialog (reason code + section checkboxes + comment)
- CHANGES_REQUESTED state → holder về Khoa của owner
- Return target (return_target_state + return_target_holder_unit) — EXPLICIT trong workflow log
- Revision panel (hiển thị sections cần sửa)
- Checkbox "Đã sửa" MVP — user tự tick, ≥1 checkbox = enable Resubmit button
- Section highlight (anchor link)
- Warning text: "Nộp lại sẽ giữ nguyên lịch sử; không quay về DRAFT"
- Resubmit action (về state trước, đọc return_target từ log)
- Form data preserve
- Revision PDF export
- Timeline entry "Đã nộp lại" với return_target info

**Demo Path:** Khoa mở hồ sơ → Click "Yêu cầu sửa" → Chọn sections → Submit → Giảng viên thấy revision panel → Tick "Đã sửa" → Resubmit → Về FACULTY_REVIEW

---

## Epic 4 Stories

### Story 4.1: Faculty Approve Action

As a Quản lý Khoa (QUAN_LY_KHOA),
I want duyệt hồ sơ đề tài,
So that hồ sơ được chuyển lên PKHCN phân bổ.

**Acceptance Criteria:**

**Given** User có role = QUAN_LY_KHOA
**When** User mở proposal với state = FACULTY_REVIEW
**Then** UI hiển thị button "Duyệt hồ sơ" (primary)

**Given** User click button "Duyệt hồ sơ"
**When** action được execute (kèm idempotency key)
**Then** proposal.state chuyển từ FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW
**And** proposal.holder_unit = PHONG_KHCN
**And** proposal.holder_user = null
**And** workflow_logs entry được tạo:
  - action = APPROVE
  - from_state = FACULTY_REVIEW
  - to_state = SCHOOL_SELECTION_REVIEW
  - actor_id = current user id

**Given** User không có role = QUAN_LY_KHOA
**When** User cố approve proposal
**Then** UI hide button "Duyệt hồ sơ" hoặc API trả 403

**FRs:** FR13

---

### Story 4.2: Faculty Return Dialog (Reason Code + Sections)

As a Quản lý Khoa,
I want trả về hồ sơ với reason code và section cần sửa,
So that Giảng viên biết chính xác gì cần sửa.

**Acceptance Criteria:**

**Given** User có role = QUAN_LY_KHOA
**When** User mở proposal với state = FACULTY_REVIEW
**Then** UI hiển thị option "Yêu cầu sửa" (secondary destructive button hoặc trong "…" menu)

**Given** User click "Yêu cầu sửa"
**When** Return Dialog mở
**Then** Dialog hiển thị:
  - Reason code dropdown (required):
    - "Thiếu tài liệu"
    - "Nội dung không rõ ràng"
    - "Phương pháp không khả thi"
    - "Kinh phí không hợp lý"
    - "Khác"
  - Section checkboxes (required, ít nhất 1):
    - [ ] Thông tin chung
    - [ ] Nội dung nghiên cứu
    - [ ] Phương pháp nghiên cứu
    - [ ] Kết quả mong đợi
    - [ ] Kinh phí
    - [ ] Tài liệu đính kèm
  - Comment field (optional, textarea)

**Given** User chưa chọn reason code hoặc chưa tick checkbox
**When** User click "Gửi"
**Then** button "Gửi" bị disabled
**And** hiển thị validation error

**FRs:** FR14, FR15

---

### Story 4.3: Execute Return (CHANGES_REQUESTED + Return Target)

As a Hệ thống,
I want xử lý return action với return target EXPLICIT,
So that resubmit biết quay về đâu.

**Acceptance Criteria:**

**Given** User đã điền return form (reason code + sections + comment)
**When** User click "Gửi" (kèm idempotency key)
**Then** proposal.state chuyển từ FACULTY_REVIEW → CHANGES_REQUESTED
**And** proposal.holder_unit = owner_faculty_id (về lại Khoa của giảng viên)
**And** proposal.holder_user = owner_id

**Given** Return action được execute
**When** workflow_logs entry được tạo
**Then** log có các field EXPLICIT:
  - action = RETURN
  - from_state = FACULTY_REVIEW
  - to_state = CHANGES_REQUESTED
  - return_target_state = FACULTY_REVIEW (SOURCE OF TRUTH)
  - return_target_holder_unit = Khoa đã trả về (SOURCE OF TRUTH)
  - reason_code = selected reason
  - revision_sections = array of selected section IDs
  - comment = user comment

**Given** proposal đã return
**When** Giảng viên xem proposal
**Then** UI hiển thị banner: "Hồ sơ cần sửa trước khi nộp lại"

**FRs:** FR14, FR19, FR20

---

### Story 4.4: Revision Panel (Checkbox "Đã sửa" MVP)

As a Giảng viên,
I want see panel hiển thị các sections cần sửa,
So that tôi biết phải sửa gì.

**Acceptance Criteria:**

**Given** Proposal ở state = CHANGES_REQUESTED
**When** Giảng viên mở proposal
**Then** UI hiển thị Revision Panel ở top của form:

```
┌─────────────────────────────────────────────────┐
│ Cần sửa các phần:                                │
│                                                 │
│ ☐ Phương pháp nghiên cứu    [Đã sửa]          │
│    "Cần chi tiết hóa phương pháp..."              │
│                                                 │
│ ☐ Kinh phí                   [Đã sửa]          │
│    "Chưa giải ngân giai đoạn 1"                   │
│                                                 │
│ [Primary: Nộp lại]  (enabled khi ≥1 checkbox)    │
│                                                 │
│ ⚠️ Nộp lại sẽ giữ nguyên lịch sử;                 │
│    không quay về DRAFT.                          │
└─────────────────────────────────────────────────┘
```

**Given** Revision Panel hiển thị
**When** Giảng viên click section label
**Then** UI scroll đến section đó trong form (anchor link)
**And** Section được highlight visual (border/glow)

**Given** Giảng viên click checkbox "Đã sửa"
**When** checkbox được tick
**Then** state được lưu (để resubmit validate)

**Given** Không có checkbox nào được tick
**When** Giảng viên click "Nộp lại"
**Then** button bị disabled

**FRs:** FR21, Party Mode Decision: Checkbox MVP

---

### Story 4.5: Resubmit Action (Đọc Return Target từ Log)

As a Giảng viên,
I want nộp lại hồ sơ sau khi đã sửa,
So that hồ sơ quay về state trước (FACULTY_REVIEW), không về DRAFT.

**Acceptance Criteria:**

**Given** Proposal ở state = CHANGES_REQUESTED
**When** Giảng viên đã tick ≥ 1 checkbox "Đã sửa"
**And** Giảng viên click "Nộp lại" (kèm idempotency key)
**Then** system đọc return_target từ workflow_logs entry gần nhất:

```typescript
const lastReturnLog = await workflow_logs
  .where('project_id', proposalId)
  .where('to_state', 'CHANGES_REQUESTED')
  .orderBy('timestamp', 'desc')
  .first();

const targetState = lastReturnLog.return_target_state; // FACULTY_REVIEW
const targetHolder = lastReturnLog.return_target_holder_unit; // Khoa đã trả
```

**Given** Resubmit action được execute
**When** proposal được update
**Then** proposal.state = targetState (FACULTY_REVIEW)
**And** proposal.holder_unit = targetHolder
**And** proposal.sla_start_date = now() (reset SLA)
**And** proposal.sla_deadline = now() + 3 working days

**Given** Resubmit thành công
**When** workflow_logs entry được tạo
**Then** log có:
  - action = RESUBMIT
  - from_state = CHANGES_REQUESTED
  - to_state = return_target_state (FACULTY_REVIEW)
  - metadata.return_info ghi rõ đã resubmit từ return nào

**Given** Resubmit thành công
**When** Giảng viên xem proposal
**Then** Revision Panel không còn hiển thị
**And** Form data được preserve (không mất)

**FRs:** FR21, Party Mode Decision: Return Target EXPLICIT

---

### Story 4.6: Revision PDF Export

As a Giảng viên/Reviewer,
I want export revision notes ra PDF,
So that tôi có thể lưu hoặc in yêu cầu sửa.

**Acceptance Criteria:**

**Given** Proposal có revision requests (state = CHANGES_REQUESTED)
**When** User click "Xuất PDF yêu cầu sửa"
**Then** PDF được generate với nội dung:
  - Proposal info (title, code)
  - Revision request details:
    - Reason code + label
    - Sections cần sửa (list)
    - Comment từ reviewer
  - Timeline: ai yêu cầu, khi nào

**Given** Revision PDF được render
**When** export thành công
**Then** UI trigger download file
**And** file name format: "{proposal_code}_revision_{timestamp}.pdf"

**FRs:** FR40 (partial: Revision PDF), Party Mode Decision

---

### Epic 5: School Ops + Council Review

**Mục tiêu:** PKHCN phân bổ cho hội đồng trường → Hội đồng đánh giá → Submit ONCE → khóa chỉnh sửa.

**FRs covered:** FR22, FR23, FR24, FR25, FR26, FR27, FR40 (partial: Evaluation PDF)

**User Value:**
- PKHCN phân bổ hiệu quả
- Hội đồng có form đánh giá rõ ràng
- Submit ONCE → không nộp nhầm
- Sau submit → read-only

**Deliverables:**
- School selection queue (SCHOOL_SELECTION_REVIEW)
- Council assignment (gán thư ký + thành viên)
- Expert review assignment (optional)
- Evaluation form (Draft + autosave)
- Draft evaluation (editable)
- Preview PDF + confirm gate
- Finalize (submit ONCE) → read-only
- Evaluation PDF export

**Demo Path:** PKHCN assign council → Thư ký nhận thông báo → Mở evaluation → Đánh giá draft → Preview PDF → Finalize → Read-only

---

### Epic 6: Acceptance & Handover + Dossier Pack

**Mục tiêu:** Dự án chạy → Nghiệm thu cấp Khoa → Nghiệm thu cấp Trường → Bàn giao → ZIP trọn bộ.

**FRs covered:** FR28, FR29, FR30, FR31, FR32, FR33, FR41, FR42

**User Value:**
- Dự án có quá trình thực hiện
- Nghiệm thu 2 cấp rõ ràng
- Bàn giao có checklist
- ZIP trọn bộ hồ sơ

**Deliverables:**
- APPROVED state → Start project
- IN_PROGRESS state
- Faculty acceptance review (form + vote)
- School acceptance review (form + vote)
- HANDOVER state
- COMPLETED state
- Dossier pack checklist (per stage)
- ZIP dossier pack (full)

**Demo Path:** Start project → IN_PROGRESS → Submit faculty acceptance → Faculty approves → Submit school acceptance → School approves → Handover → Complete → Export ZIP

---

### Epic 7: Document Export (Milestone Completion)

**Mục tiêu:** Hoàn thiện PDF/ZIP export theo milestone và thêm DOCX generation với integrity verification.

**FRs covered:** FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR70

**User Value:**
- PDF WYSIWYG (giống UI)
- ZIP trọn bộ hồ sơ
- Print theme (nền trắng)

**Deliverables:**
- Project Detail PDF (đã có từ Epic 3)
- Revision PDF (đã có từ Epic 4)
- Evaluation PDF (đã có từ Epic 5)
- Dossier ZIP pack (đã có từ Epic 6)
- Template engine (HTML + Print CSS + Playwright)
- Font embedding
- Dark mode handling (PDF luôn light)
- Controlled page breaks
- **DOCX Template Upload & Registry** (Story 7.2)
- **DOCX Generation + SHA-256 + Manifest** (Story 7.3)
- **Document RBAC Download** (Story 7.3)
- **Document Integrity Verify** (Story 7.3)
- **Retention Policy Enforcement** (Story 7.3)

**Note:** Epic này hoàn thiện PDF/ZIP exports và thêm DOCX generation capability với document integrity tracking.

---

### Epic 8: Bulk Actions & Reports

**Mục tiêu:** PKHCN làm bulk operations và export báo cáo.

**FRs covered:** FR34, FR35, FR56, FR57, FR58

**Note:** FR36-FR39 (Document integrity) đã chuyển sang Epic 7 (Story 7.3).

**User Value:**
- Bulk assign/remind
- Excel export cho báo cáo
- Morning check dashboard
- SLA compliance tracking

**Deliverables:**
- Bulk assign (gán holder_user hàng loạt)
- Bulk remind (preview + dry-run + execute)
- T-2/T0/T+2 reminders (scheduled jobs)
- Export Excel (per filter)
- Morning check dashboard (KPI + overdue list)
- Delivery reports
- SLA compliance rate tracking

**Demo Path:** PKHCN mở dashboard → See overdue list → Bulk remind → Export Excel

---

### Epic 9: Exceptions (Pause/Cancel/Withdraw/Reject)

**Mục tiêu:** Xử lý các exception states.

**FRs covered:** FR43, FR44, FR45

**User Value:**
- Cancel/withdraw khi cần thiết
- Reject khi không phê duyệt
- Pause/resume do PKHCN

**Deliverables:**
- Cancel action (PROJECT_OWNER)
- Withdraw action (PROJECT_OWNER, before approval)
- Reject action (decision maker, with reason)
- PAUSED state (PKHCN only)
- Resume action (PKHCN)
- Exception state holder rules

**Demo Path:** Giảng viên rút hồ sơ → Hoặc PKHCN pause → Resume

---

### Epic 10: Admin & System Configuration

**Mục tiêu:** Admin quản lý hệ thống đầy đủ với backup/restore capability.

**FRs covered:** FR46, FR47, FR48, FR65, FR66

**User Value:**
- Import/export lớn
- System health monitoring
- Full audit logs
- Holiday management (full)

**Deliverables:**
- Import Excel (users, proposals)
- Export Excel (full dump)
- System health dashboard
- Audit log viewer (full)
- Holiday management (full CRUD)
- Audit trigger (full)
- **Database Backup/Restore** (Story 10.6)
- **State Recompute + Verify** (Story 10.6)
- **Maintenance Mode** (Story 10.6)

**Demo Path:** Admin login → Import data → Check system health → View audit logs → Backup/Restore test

---

## Epic 5 Stories

### Story 5.1: School Selection Queue

As a PKHCN (PHONG_KHCN),
I want xem danh sách hồ sơ cần phân bổ hội đồng,
So that tôi biết哪些 hồ sơ cần assign.

**Acceptance Criteria:**

**Given** User có role = PHONG_KHCN
**When** User mở Worklist với filter "Đang chờ tôi"
**Then** hiển thị proposals với:
  - state = SCHOOL_SELECTION_REVIEW
  - holder_unit = PHONG_KHCN

**Given** Proposal ở state = SCHOOL_SELECTION_REVIEW
**When** PKHCN xem proposal
**Then** UI hiển thị button "Phân bổ hội đồng" + "Yêu cầu sửa" (secondary)

**FRs:** FR22

---

### Story 5.2: Council Assignment

As a PKHCN,
I want gán hội đồng trường đánh giá,
So that hồ sơ được chuyển sang hội đồng.

**Acceptance Criteria:**

**Given** User có role = PHONG_KHCN
**When** User click "Phân bổ hội đồng" trên proposal
**Then** UI hiển thị Council Assignment dialog:
  - Select council dropdown (list các hội đồng có sẵn)
  - Hoặc option "Tạo hội đồng mới"
  - Secretary assignment (required)
  - Members list (optional)

**Given** User đã chọn council + secretary
**When** User click "Xác nhận" (kèm idempotency key)
**Then** proposal.state chuyển từ SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW
**And** proposal.holder_unit = council_id
**And** proposal.holder_user = council_secretary_id
**And** workflow_logs entry ghi action ASSIGN_COUNCIL

**Given** Secretary được assign
**When** assignment hoàn thành
**Then** Secretary nhận notification (mock trong MVP)

**FRs:** FR23

---

### Story 5.3: Evaluation Form (Draft + Auto-save)

As a Thư ký Hội đồng (THU_KY_HOI_DONG),
I want điền form đánh giá đề tài,
So that tôi có thể đánh giá và kết luận.

**Acceptance Criteria:**

**Given** User có role = THU_KY_HOI_DONG
**When** User mở proposal với state = OUTLINE_COUNCIL_REVIEW
**And** proposal.holder_user = current user id
**Then** UI hiển thị Evaluation Form với sections:
  - Đánh giá nội dung khoa học
  - Đánh giá phương pháp nghiên cứu
  - Đánh giá tính khả thi
  - Đánh giá kinh phí
  - Kết luận (Đạt/Không đạt)
  - Ý kiến khác (optional)

**Given** User đang điền evaluation form
**When** user thay đổi field
**Then** auto-save sau 2 giây debounce
**And** UI hiển thị "Đã lưu vào HH:mm:ss"

**Given** Evaluation form đã được create
**When** inspect database
**Then** table evaluations có record:
  - proposal_id (FK)
  - evaluator_id (current user)
  - state = DRAFT
  - form_data (JSON)
  - created_at, updated_at

**FRs:** FR25, FR26

---

### Story 5.4: Preview PDF + Confirm Gate (Submit ONCE)

As a Thư ký Hội đồng,
I want preview PDF đánh giá trước khi finalize,
So that tôi có thể review và tránh nộp nhầm.

**Acceptance Criteria:**

**Given** User đang ở Evaluation Form (state = DRAFT)
**When** User click "Hoàn tất"
**Then** UI hiển thị Preview Modal:
  - Render PDF của evaluation form
  - Force light theme
  - Sections hiển thị đầy đủ
  - Button "Xác nhận và nộp" + "Quay lại sửa"

**Given** User click "Quay lại sửa"
**When** Modal đóng
**Then** Evaluation vẫn ở state = DRAFT
**And** User có thể edit tiếp

**Given** User click "Xác nhận và nộp"
**When** Confirm action execute (kèm idempotency key)
**Then** evaluation.state chuyển từ DRAFT → FINALIZED
**And** evaluation form_data bị lock (read-only)

**FRs:** FR27 (Submit ONCE), Party Mode Decision: Confirm gate

---

### Story 5.5: Finalize → Read-Only (Submit ONCE Lock)

As a Hệ thống,
I want khóa evaluation sau khi finalized,
So that không ai có thể edit sau khi đã nộp.

**Acceptance Criteria:**

**Given** Evaluation state = FINALIZED
**When** User (bao gồm secretary) mở evaluation form
**Then** UI hiển thị form ở read-only mode
**And** tất cả input fields bị disabled
**And** không có button "Lưu" hay "Sửa"

**Given** Evaluation state = FINALIZED
**When** User cố gọi PUT/POST API để sửa
**Then** API trả 403 Forbidden
**And** error message: "Đánh giá đã hoàn tất. Không thể chỉnh sửa."

**Given** Evaluation finalized thành công
**When** process hoàn tất
**Then** proposal.state chuyển từ OUTLINE_COUNCIL_REVIEW → APPROVED
**And** proposal.holder_unit = owner_faculty_id (về lại giảng viên)
**And** proposal.holder_user = owner_id
**And** workflow_logs entry ghi action EVALUATION_COMPLETE

**FRs:** FR27, FR28

---

### Story 5.6: Evaluation PDF Export

As a Thư ký Hội đồng/Reviewer,
I want export evaluation ra PDF,
So that tôi có thể lưu hoặc gửi file.

**Acceptance Criteria:**

**Given** Evaluation state = FINALIZED
**When** User click "Xuất PDF đánh giá"
**Then** PDF được generate với:
  - Proposal info (title, code)
  - Evaluation form data (tất cả sections)
  - Kết luận (Đạt/Không đạt)
  - Evaluator name, signature placeholder
  - Timestamp

**Given** PDF được render
**When** export thành công
**Then** UI trigger download
**And** file name: "{proposal_code}_evaluation_{timestamp}.pdf"

**FRs:** FR40 (partial: Evaluation PDF)

---

## Epic 6 Stories

### Story 6.1: Start Project (APPROVED → IN_PROGRESS)

As a Giảng viên (PROJECT_OWNER),
I want bắt đầu thực hiện đề tài sau khi được duyệt,
So that tôi có thể start project.

**Acceptance Criteria:**

**Given** Proposal state = APPROVED
**When** Owner (PROJECT_OWNER) mở proposal
**Then** UI hiển thị button "Bắt đầu thực hiện"

**Given** Owner click "Bắt đầu thực hiện" (kèm idempotency key)
**When** action execute
**Then** proposal.state chuyển từ APPROVED → IN_PROGRESS
**And** proposal.holder_unit giữ nguyên = owner_faculty_id
**And** proposal.holder_user giữ nguyên = owner_id
**And** proposal.actual_start_date = now()
**And** workflow_logs entry ghi action START_PROJECT

**FRs:** FR28, FR29

---

### Story 6.2: Submit Faculty Acceptance Review

As a Giảng viên,
I want nộp hồ sơ nghiệm thu cấp Khoa,
So that Khoa có thể nghiệm thu dự án.

**Acceptance Criteria:**

**Given** Proposal state = IN_PROGRESS
**When** Owner click "Nộp nghiệm thu cấp Khoa"
**Then** UI hiển thị Faculty Acceptance Form:
  - Kết quả thực hiện (textarea)
  - Sản phẩm đầu ra (list)
  - Upload sản phẩm/files
  - Submit button

**Given** Owner đã điền form và click "Nộp"
**When** action execute (kèm idempotency key)
**Then** proposal.state chuyển từ IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW
**And** proposal.holder_unit = owner_faculty_id
**And** proposal.holder_user = null (Khoa, chưa gán người)
**And** workflow_logs entry ghi action SUBMIT_FACULTY_ACCEPTANCE

**FRs:** FR31

---

### Story 6.3: Faculty Acceptance (Vote)

As a Quản lý Khoa,
I want nghiệm thu đề tài cấp Khoa,
So that dự án được xác nhận hoàn thành cấp Khoa.

**Acceptance Criteria:**

**Given** User có role = QUAN_LY_KHOA
**When** User mở proposal với state = FACULTY_ACCEPTANCE_REVIEW
**Then** UI hiển thị Faculty Acceptance Form:
  - Kết quả thực hiện (read-only, từ owner)
  - Sản phẩm đầu ra (read-only, từ owner)
  - Files đính kèm (read-only)
  - Kết luận nghiệm thu (dropdown: Đạt/Không đạt)
  - Ý kiến (textarea)
  - Button "Hoàn tất nghiệm thu"

**Given** User chọn "Đạt" và click "Hoàn tất"
**When** action execute (kèm idempotency key)
**Then** proposal.state chuyển từ FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
**And** proposal.holder_unit = PHONG_KHCN
**And** workflow_logs entry ghi action FACULTY_ACCEPT

**Given** User chọn "Không đạt"
**When** action execute
**Then** proposal.state chuyển từ FACULTY_ACCEPTANCE_REVIEW → IN_PROGRESS
**And** holder về lại owner
**And** workflow_logs entry ghi action FACULTY_REJECT với reason

**FRs:** FR31

---

### Story 6.4: School Acceptance (Vote)

As a PKHCN/Thư ký HĐ,
I want nghiệm thu đề tài cấp Trường,
So that dự án được xác nhận hoàn thành cấp Trường.

**Acceptance Criteria:**

**Given** Proposal state = SCHOOL_ACCEPTANCE_REVIEW
**When** User với role phù hợp mở proposal
**Then** UI hiển thị School Acceptance Form:
  - Kết quả cấp Khoa (read-only)
  - Kết luận nghiệm thu cấp Trường (dropdown: Đạt/Không đạt)
  - Ý kiến (textarea)
  - Button "Hoàn tất nghiệm thu"

**Given** User chọn "Đạt" và click "Hoàn tất"
**When** action execute (kèm idempotency key)
**Then** proposal.state chuyển từ SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
**And** proposal.holder_unit = owner_faculty_id
**And** proposal.holder_user = owner_id
**And** workflow_logs entry ghi action SCHOOL_ACCEPT

**Given** User chọn "Không đạt"
**When** action execute
**Then** proposal.state chuyển từ SCHOOL_ACCEPTANCE_REVIEW → IN_PROGRESS
**And** holder về lại owner
**And** workflow_logs entry ghi action SCHOOL_REJECT với reason

**FRs:** FR32

---

### Story 6.5: Handover + Dossier Pack Checklist

As a Giảng viên,
I want bàn giao hồ sơ và checklist,
So that dự án được marked hoàn thành.

**Acceptance Criteria:**

**Given** Proposal state = HANDOVER
**When** Owner mở proposal
**Then** UI hiển thị Handover Checklist:
  - [ ] Báo cáo kết quả
  - [ ] Sản phẩm đầu ra
  - [ ] Tài liệu hướng dẫn
  - [ ] File source code (nếu có)
  - [ ] Các tài liệu khác
  - Button "Hoàn thành bàn giao"

**Given** Owner đã tick ≥ 1 checkbox và click "Hoàn thành"
**When** action execute (kèm idempotency key)
**Then** proposal.state chuyển từ HANDOVER → COMPLETED
**And** proposal.completed_date = now()
**And** workflow_logs entry ghi action HANDOVER_COMPLETE

**FRs:** FR33

---

### Story 6.6: ZIP Dossier Pack Export (SLA 30s, Progress, Pre-Generated Seeds)

As a Giảng viên/Admin,
I want export ZIP trọn bộ hồ sơ dự án,
So that tôi có archive đầy đủ.

**Acceptance Criteria:**

**Given** Proposal state = COMPLETED
**When** User click "Tải xuống hồ sơ trọn bộ"
**Then** UI hiển thị progress indicator: "Đang tạo ZIP..."

**Given** ZIP đang generate
**When** generate time ≤ 30 seconds
**Then** ZIP được tạo thành công với:
  - Proposal form (PDF)
  - Evaluation forms (PDFs)
  - Acceptance documents (PDFs)
  - Attachments (original files)
  - Timeline (PDF)
  - Folder structure theo stage

**Given** ZIP generate time ≤ 30 seconds
**When** ZIP hoàn thành
**Then** UI trigger download ngay lập tức
**And** file name: "{proposal_code}_dossier.zip"

**Given** ZIP đang generate
**When** generate time > 30 seconds
**Then** UI hiển thị progress: "Đang tạo ZIP... {progress}%"
**And** User có thể đóng modal (ZIP continue background)
**And** Khi ZIP xong, UI hiển thị toast "ZIP đã sẵn sàng" + button "Tải xuống"

**Given** ZIP generate quá时限 (> 60 seconds) hoặc error
**When** timeout/error occurs
**Then** UI hiển thị error "Tạo ZIP thất bại. Vui lòng thử lại."
**And** KHÔNG có "email fallback" (demo-first, không background email pipeline)

**Given** Seed data DT-008, DT-009 (IN_PROGRESS/COMPLETED) đã được tạo
**When** Seed script chạy
**Then** Pre-generate ZIPs cho các completed proposals
**And** `/api/proposals/{id}/zip` trả pre-generated ZIP nếu có
**And** New proposals generate on-demand

**FRs:** FR41, FR42
**Party Mode Decision:** ZIP SLA 30s, progress indicator, pre-generated ZIPs cho seed data, NO email fallback

---

## Epic 7 Stories

### Story 7.1: Document Export Completion (Refinement)

As a Developer,
I want hoàn thiện và refine PDF/ZIP export,
So that tất cả exports consistent và stable.

**Acceptance Criteria:**

**Given** Core exports đã implement (Epic 3, 4, 5, 6)
**When** review tất cả exports
**Then** đảm bảo:
  - Template engine consistent (HTML + Print CSS + Playwright)
  - Font embedding đúng
  - Dark mode handling (PDF luôn light theme)
  - Controlled page breaks đúng

**Given** PDF export
**When** preview modal hiển thị
**Then** toggle theme (light/dark) chỉ affect preview display
**And** actual PDF luôn light theme

**FRs:** FR40, FR41, FR42

**Note:** Epic này chủ yếu là completion và refinement. Core exports đã được implement trong Epic 3, 4, 5, 6.

---

### Story 7.2: Template Upload & Registry

As a Admin/PKHCN,
I want upload và quản lý .docx template files,
So that hệ thống có thể generate documents từ templates.

**Tech Specs:**
- Template storage: local `/templates` hoặc S3 bucket
- Template validation: kiểm tra placeholders `{{variable_name}}`
- Template metadata: name, description, version, active, created_at, updated_at

**Acceptance Criteria:**

**Given** User có role = ADMIN hoặc PKHCN
**When** User vào Template Management page
**Then** UI hiển thị:
  - Danh sách templates (table)
  - Button "Upload template mới"
  - Per row: Preview, Download, Activate, Delete buttons

**Given** User click "Upload template mới"
**When** Upload modal mở
**Then** User điền:
  - Template name (text, required)
  - Description (textarea)
  - File upload (.docx, required)
  - Template type: proposal_outline, evaluation_form, final_report, etc.

**Given** User upload .docx file
**When** server process file
**Then** extract placeholders:
  - Scan cho `{{variable_name}}` patterns
  - Validate placeholders against known proposal data fields
  - Warn nếu unknown placeholders detected

**Given** Template đã upload
**When** Admin click "Activate"
**Then** template được đánh dấu active
**And** chỉ 1 template active per type tại một thời điểm

**Given** Template active
**When** Proposal cần generate document
**Then** system dùng active template cho type đó

**FRs:** FR33, FR70

---

### Story 7.3: DOCX Generation + SHA-256 + Manifest + Retention + RBAC Download + Verify

As a Hệ thống,
I want generate .docx documents từ proposal data với SHA-256 hash và manifest tracking,
So that documents có integrity verification và retention policy compliance.

**Tech Specs:**
- DOCX generation: dùng `docx` library hoặc `docx-templates`
- SHA-256: Node.js `crypto.createHash('sha256')`
- Manifest table: `document_artifacts (id, proposal_id, artifact_type, file_path, sha256_hash, created_at, retention_until, deleted_at)`
- RBAC download: check (role == owner OR has_permission("DOCUMENT_DOWNLOAD_ALL"))

**Acceptance Criteria:**

**Given** Proposal có data hoàn chỉnh
**When** Admin/PKHCN click "Generate DOCX"
**Then** system:
  - Load active template cho artifact_type
  - Map template placeholders với proposal data
  - Generate .docx file
  - Calculate SHA-256 hash của file
  - Save file với naming: `proposal_{id}_{type}_{timestamp}.docx`
  - Insert record vào `document_artifacts`:
    - proposal_id, artifact_type, file_path, sha256_hash
    - retention_until = completed_at + 7 years (configurable)
  - Return download URL

**Given** Document artifact đã generate
**When** User request download
**Then** RBAC check:
  - Nếu user = PROJECT_OWNER AND proposal.owner_id == user.id → ALLOW
  - Nếu user có role IN (PKHCN, QUAN_LY_KHOA, ADMIN) → ALLOW
  - Else → DENY (403)

**Given** User được ALLOW download
**When** Download initiated
**Then** server send file với headers:
  - Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - Content-Disposition: attachment; filename="..."
  - X-SHA256: {hash} (header)

**Given** Admin cần verify document integrity
**When** Admin click "Verify Document"
**Then** system:
  - Recalculate SHA-256 của stored file
  - Compare với manifest record
  - Return MATCH or MISMATCH

**Given** Document retention expired (retention_until < NOW)
**When** Retention cleanup job runs
**Then**:
  - Soft delete document artifact (deleted_at = NOW)
  - Move file to archive storage (hoặc mark for deletion)
  - Log deletion trong audit_events

**Given** Document已被 soft delete
**When** User request download
**Then** return 404 Not Found

**FRs:** FR32, FR34, FR35, FR36, FR37, FR38, FR39

---

## Epic 8 Stories

### Story 8.1: Bulk Assign (Gán holder_user hàng loạt)

As a PKHCN,
I want gán holder_user cho nhiều proposals cùng lúc,
So that tôi không phải assign từng cái một.

**Acceptance Criteria:**

**Given** User có role = PHONG_KHCN
**When** User mở Worklist với filter "Đang chờ tôi"
**Then** UI hiển thị:
  - Checkbox per proposal row
  - "Chọn tất cả" checkbox
  - Bulk actions menu khi ≥ 1 row selected

**Given** User đã chọn ≥ 1 proposals
**When** User click "Phân bổ người xử lý"
**Then** UI hiển thị Bulk Assign dialog:
  - Danh sách proposals được chọn (count N)
  - User selector (dropdown search)
  - Button "Xác nhận"

**Given** User đã chọn user và click "Xác nhận"
**When** action execute
**Then** tất cả selected proposals được update:
  - holder_user = selected user
**And** server trả report: { success: X, failed: Y, errors: [...] }

**FRs:** FR37

---

### Story 8.2: Bulk Remind (Preview + Dry-Run + Execute)

As a PKHCN,
I want gửi email nhắc nhở hàng loạt,
So that tôi nhắc nhiều người cùng lúc.

**Acceptance Criteria:**

**Given** User có role = PHONG_KHCN
**When** User chọn ≥ 1 proposals và click "Gửi email nhắc"
**Then** UI hiển thị Bulk Remind dialog:
  - Danh sách recipients (unique holder_users)
  - Email template (fixed trong MVP)
  - Preview nội dung email
  - Button "Gửi"

**Given** User click "Gửi"
**When** action execute
**Then** server:
  1. Dry-run: validate recipients
  2. Execute: gửi email cho từng recipient
  3. Return report: { sent: X, failed: Y, errors: [...] }

**Given** Email được gửi
**When** recipient nhận email
**Then** Email chứa:
  - greeting: "Kính gửi {recipient_name}"
  - proposal list (title + SLA)
  - deadline info
  - Link trực tiếp đến proposal

**FRs:** FR38

---

### Story 8.3: Export Excel (Per Filter)

As a PKHCN/Admin,
I want export danh sách proposals ra Excel,
So that tôi có thể làm báo cáo.

**Acceptance Criteria:**

**Given** User đang ở Worklist với bất kỳ filter nào
**When** User click "Xuất Excel"
**Then** server generate Excel file với:
  - Các columns: Code, Title, Owner, State, Holder, SLA Deadline, Days Remaining
  - Rows theo filter hiện tại
  - Format: .xlsx

**Given** Excel được generate
**When** export thành công
**Then** UI trigger download
**And** file name: "proposals_{filter}_{timestamp}.xlsx"

**FRs:** FR39

---

### Story 8.4: Morning Check Dashboard (KPI + Overdue List)

As a PKHCN/Admin,
I want xem dashboard tổng quan vào buổi sáng,
So that tôi biết bao nhiêu hồ sơ quá hạn.

**Acceptance Criteria:**

**Given** User có role = PHONG_KHCN hoặc ADMIN
**When** User mở Dashboard
**Then** UI hiển thị KPI cards:
  - Tổng hồ sơ đang chờ
  - Hồ sơ quá hạn
  - Hồ sơ sắp đến hạn (T-2)
  - Hồ sơ hoàn thành trong tháng

**Given** Dashboard hiển thị
**When** User scroll xuống
**Then** hiển thị Overdue List table:
  - Code, Title, Holder, Overdue Days
  - Button "Gửi nhắc" per row

**FRs:** FR34, FR35, FR36

---

## Epic 9 Stories

### Story 9.1: Cancel/Withdraw Actions

As a Giảng viên (PROJECT_OWNER),
I want hủy hoặc rút hồ sơ,
So that tôi có thể stop proposal khi cần.

**Acceptance Criteria:**

**Given** Proposal state = DRAFT
**When** Owner click "Hủy bỏ"
**Then** UI hiển thị confirm dialog
**And** sau khi confirm:
  - proposal.state = CANCELLED
  - holder_unit = owner_faculty_id
  - holder_user = owner_id
  - workflow_logs entry ghi action CANCEL

**Given** Proposal state != DRAFT và < APPROVED (ví dụ: FACULTY_REVIEW)
**When** Owner click "Rút hồ sơ"
**Then** UI hiển thị confirm dialog với warning
**And** sau khi confirm:
  - proposal.state = WITHDRAWN
  - holder về owner
  - workflow_logs entry ghi action WITHDRAW

**Given** Proposal state >= APPROVED
**When** Owner cố click "Rút hồ sơ"
**Then** UI hide button hoặc show error "Đề tài đang thực hiện, không thể rút"

**FRs:** FR43

---

### Story 9.2: Reject Action

As a Decision Maker (Khoa/Hội đồng),
I want từ chối đề tài,
So rằng hồ sơ bị reject với lý do rõ ràng.

**Acceptance Criteria:**

**Given** User có quyền reject (role phù hợp + state phù hợp)
**When** User click "Từ chối đề tài"
**Then** UI hiển thị Reject dialog:
  - Reason code dropdown (required)
  - Comment (required)
  - Button "Xác nhận"

**Given** User điền reason + comment và confirm
**When** action execute
**Then** proposal.state = REJECTED
**And** holder_unit = decision_maker_unit
**And** holder_user = decision_maker_id
**And** workflow_logs entry ghi action REJECT với reason

**FRs:** FR44

---

### Story 9.3: Pause/Resume (PKHCN Only)

As a PKHCN,
I want tạm dừng/tiếp tục proposal,
So rằng tôi có thể hold hồ sơ khi cần.

**Acceptance Criteria:**

**Given** User có role = PHONG_KHCN
**When** User click "Tạm dừng" trên proposal
**Then** UI hiển thị Pause dialog với reason field

**Given** User điền reason và confirm
**When** action execute
**Then** proposal.state = PAUSED
**And** proposal.holder_unit = PHONG_KHCN
**And** proposal.holder_user = null
**And** proposal.sla_paused_at = now()
**And** workflow_logs entry ghi action PAUSE

**Given** Proposal state = PAUSED
**When** User click "Tiếp tục"
**Then** proposal.state trở về state trước khi PAUSED
**And** proposal.sla_deadline được recalculate (add paused duration)
**And** workflow_logs entry ghi action RESUME

**FRs:** FR45

---

## Epic 10 Stories

### Story 10.1: Import Excel (Users, Proposals)

As a Admin,
I want import users/proposals từ Excel,
So that tôi không phải nhập data thủ công.

**Acceptance Criteria:**

**Given** User có role = ADMIN
**When** User vào Import page
**Then** UI hiển thị:
  - File upload (.xlsx, .csv)
  - Entity type selector (Users/Proposals)
  - Template download button

**Given** User upload file và chọn entity type
**When** server process file
**Then** validate từng row:
  - Nếu valid: insert vào database
  - Nếu invalid: skip + record error

**Given** Import hoàn thành
**When** process done
**Then** UI hiển thị report:
  - Total rows processed
  - Successfully imported: N
  - Failed: M
  - Error details (per failed row)

**FRs:** FR46

---

### Story 10.2: Export Excel (Full Dump)

As a Admin,
I want export toàn bộ data ra Excel,
So that tôi có backup đầy đủ.

**Acceptance Criteria:**

**Given** User có role = ADMIN
**When** User click "Export full data"
**Then** server generate Excel với:
  - Sheet 1: Users
  - Sheet 2: Proposals
  - Sheet 3: Workflow Logs
  - Sheet 4: Evaluations

**Given** Excel lớn (> 1000 rows)
**When** export thành công
**Then** file được stream download (không timeout)

**FRs:** FR46

---

### Story 10.3: System Health Dashboard

As a Admin,
I want xem system health metrics,
So that tôi biết hệ thống có ổn định không.

**Acceptance Criteria:**

**Given** User có role = ADMIN
**When** User mở System Health page
**Then** UI hiển thị metrics:
  - Active users count
  - Proposals by state (bar chart)
  - API response time (p95, p99)
  - Error rate (last 24h)
  - Database connection status
  - Redis status

**FRs:** Full Admin monitoring

---

### Story 10.4: Full Audit Log Viewer

As a Admin,
I want xem toàn bộ audit logs,
So that tôi có full visibility.

**Acceptance Criteria:**

**Given** User có role = ADMIN
**When** User mở Audit Log page
**Then** UI hiển thị:
  - Filters: entity_type, entity_id, actor_id, date range, action
  - Table: occurred_at, actor, action, entity, metadata
  - Pagination

**Given** Admin click vào log entry
**When** detail modal mở
**Then** hiển thị full metadata:
  - ip, user_agent
  - request_id
  - Full metadata JSON

**FRs:** FR48 (full audit_logs)

---

### Story 10.5: Holiday Management (Full CRUD)

As a Admin,
I want quản lý toàn bộ holidays,
So rằng SLA tính chính xác.

**Acceptance Criteria:**

**Given** User có role = ADMIN
**When** User vào Holiday Management page
**Then** UI hiển thị:
  - Danh sách holidays (table)
  - Button "Thêm ngày lễ"
  - Per row: Edit, Delete buttons

**Given** User click "Thêm ngày lễ"
**When** Form modal mở
**Then** User điền: date (date picker), name (text), recurring (checkbox)

**Given** User click Edit
**When** Update thành công
**Then** holiday được update
**And** SLA calculator dùng holiday mới

**FRs:** FR47 (full holiday management)

---

### Story 10.6: DB Restore + Recompute/Verify State

As a Admin,
I want restore database từ backup và recompute proposal states,
So that hệ thống có disaster recovery capability và state integrity verification.

**Tech Specs:**
- Backup format: PostgreSQL dump (.sql) hoặc database snapshot
- Restore command: `pg_restore` hoặc equivalent
- Recompute logic: traverse `workflow_logs` → derive expected state → compare với `projects.state`
- Verification report: list mismatches with proposal_id, current_state, computed_state

**Acceptance Criteria:**

**Given** User có role = ADMIN
**When** User vào Database Management page
**Then** UI hiển thị:
  - Backup list (filename, created_at, size)
  - Button "Upload backup"
  - Button "Restore from backup" (per backup)
  - Button "Verify State Integrity"

**Given** User upload backup file (.sql)
**When** Upload thành công
**Then** backup được lưu vào `/backups` directory
**And** backup record được created trong `backups` table:
  - filename, file_path, size, uploaded_at, uploaded_by

**Given** User chọn backup và click "Restore from backup"
**When** Confirm modal opens
**Then** UI hiển thị warning:
  - "⚠️ Restore sẽ overwrite current database"
  - "All unsaved changes will be lost"
  - Require confirm text: "RESTORE"

**Given** User confirms restore
**When** Restore process starts
**Then** system:
  - Set maintenance_mode = true (block non-admin requests)
  - Execute restore command
  - Log restore_start trong audit_events
  - Return job_id để track progress

**Given** Restore job running
**When** Job completes
**Then**:
  - Set maintenance_mode = false
  - Log restore_complete trong audit_events
  - Send success notification cho ADMIN

**Given** Database đã restore
**When** Admin click "Verify State Integrity"
**Then** system:
  - Traverse tất cả `workflow_logs` per proposal
  - Compute expected state từ log sequence
  - Compare với `projects.state` trong database
  - Generate verification report

**Given** Verification report generated
**When** Report displayed
**Then** UI shows:
  - Total proposals checked
  - Proposals MATCH: N
  - Proposals MISMATCH: M
  - Table of mismatches (proposal_id, current_state, computed_state, last_log)

**Given** Mismatches detected
**When** Admin click "Auto-correct States"
**Then** system:
  - Update `projects.state` = computed_state cho mismatched proposals
  - Log correction trong audit_events (action: STATE_CORRECTED)
  - Return summary của corrections applied

**Given** Restore fails mid-process
**When** Error occurs
**Then**:
  - Log error details trong audit_events
  - Send alert notification cho ADMIN
  - Keep database trong current state (do not partial restore)

**Note:** Đây là disaster recovery feature. Chỉ ADMIN có thể execute. Recommended runbook:
1. Weekly automated backups
2. Monthly integrity verification
3. Annually full restore drill

**FRs:** FR65, FR66

---

## Demo Path Summary (10-12 Minutes, Straight Path)

```
0:00 – Login (Epic 1)
     - CTA: Login form visible immediately
     - Action: Click "Đăng nhập" → Redirect → Persona dropdown appears

0:30 – Persona Switch → Giảng viên (Epic 1)
     - CTA: Persona dropdown (8 options)
     - Action: Select "Giảng viên" → Queue rerenders

1:00 – Tạo Đề Tài (Epic 2)
     - CTA: Button "Tạo đề tài mới" on Worklist
     - Action: Fill form → Auto-save indicator → "Lưu nháp" → Upload 1 file (<1MB)

2:30 – Submit (Epic 3)
     - CTA: Button "Nộp hồ sơ" appears when valid
     - Action: Click → State badge changes → SLA badge appears

3:00 – Persona Switch → Khoa (Epic 1)
     - CTA: Persona dropdown → Select "Quản lý Khoa"
     - Action: Queue refresh → See DT-002 in "Đang chờ tôi"

3:30 – Faculty Review → Approve (Epic 4)
     - CTA: Button "Duyệt hồ sơ" on DT-002 Detail
     - Action: Click → State changes → Timeline adds entry

4:30 – Faculty Review → Return (Epic 4) [DETOUR]
     - Setup: Mở DT-003 (FACULTY_REVIEW)
     - CTA: Button "Yêu cầu sửa" → Dialog opens
     - Action: Select reason + 2 sections → Submit
     - Result: DT-003 state = CHANGES_REQUESTED

5:30 – Persona Switch → Giảng viên → Resubmit (Epic 4)
     - CTA: Revision Panel appears + checkboxes (DT-003)
     - Action: Tick 2 checkboxes → Click "Nộp lại"
     - Result: DT-003 back to FACULTY_REVIEW, Timeline updated

6:30 – Persona Switch → PKHCN (Epic 1)
     - CTA: After DT-002 approved, proposal in PKHCN queue
     - Action: Assign DT-005 council → Select → Confirm

7:30 – Persona Switch → Thư ký HĐ (Epic 1)
     - CTA: DT-006 in "Đang chờ tôi" queue (holder_user = secretary)
     - Action: Open evaluation → Fill form → "Hoàn tất"
     - Action: Preview PDF → Confirm → Read-only lock

9:00 – Giảng viên: Bắt đầu thực hiện (Epic 6)
     - CTA: Button "Bắt đầu thực hiện" on DT-008 (APPROVED)
     - Action: Click → State = IN_PROGRESS

9:40 – Persona Switch → Khoa: Duyệt nghiệm thu cấp Khoa (Epic 6)
     - CTA: DT-009 in Khoa queue after "Nộp nghiệm thu"
     - Action: Open → Fill acceptance form → Select "Đạt" → Submit

10:20 – Persona Switch → BGH: Duyệt nghiệm thu cấp Trường (Epic 6)
     - CTA: DT-009 in BGH queue after Faculty approve
     - Action: Open → Fill acceptance form → Select "Đạt" → Submit
     - Result: State = HANDOVER

10:50 – Persona Switch → Giảng viên: Bàn giao (Epic 6)
     - CTA: Handover Checklist with checkboxes
     - Action: Tick checkboxes → Click "Hoàn thành bàn giao"
     - Result: State = COMPLETED

11:00 – Export ZIP (Epic 6)
     - CTA: "Tải xuống hồ sơ trọn bộ" on completed proposal
     - Action: Click → ZIP download (pre-generated for demo)

11:30 – Reset Demo (Epic 1)
     - CTA: Button "Reset Demo" → Confirm
     - Result: Back to initial state (< 30s)

12:00 – Q&A
```

**Key CTAs phải xuất thị NGAY LẬP TỨC (data-testid cho E2E tests):**
- `data-testid="btn-login"` (0:00)
- `data-testid="persona-dropdown"` (0:30)
- `data-testid="btn-create-proposal"` (1:00)
- `data-testid="btn-submit-proposal"` (2:30)
- `data-testid="btn-approve"` (3:30)
- `data-testid="btn-return"` (4:30)
- `data-testid="btn-resubmit"` (5:30)
- `data-testid="btn-assign-council"` (6:30)
- `data-testid="btn-finalize-evaluation"` (7:30)
- `data-testid="btn-start-project"` (9:00)
- `data-testid="btn-submit-acceptance"` (9:40)
- `data-testid="btn-school-accept"` (10:20)
- `data-testid="btn-handover-complete"` (10:50)
- `data-testid="btn-download-zip"` (11:00)
- `data-testid="btn-reset-demo"` (11:30)

---

## Party Mode Decisions (2026-01-04)

**Participants:** John (PM), Winston (Architect), Bob (SM), Mary (BA), Sally (UX), Murat (TEA), Amelia (Dev)

### Decisions Locked (Session 1 + Session 2):

| # | Decision | Impact |
|---|----------|--------|
| **1** | **Epic 1 tách 2 Sprint** | Sprint 1A: Auth + RBAC + User CRUD; Sprint 1B: Demo Operator + Seed/Reset |
| **2** | **Checkbox "Đã sửa" MVP** | User tự tick checkbox, không hash-based auto-detection. ≥1 tick = enable Resubmit |
| **3** | **Revision PDF trong Epic 4** | Không đợi Epic 7 — demo cần PDF để trình bày giữa chặng |
| **4** | **Timeline Entry rõ return_target** | Resubmit log ghi EXPLICIT: return_target_state + return_target_holder_unit |
| **5** | **Persona Switch Reliability** | Atomic update (immer produce) + Query cache invalidate + Queue refetch + No stale UI |
| **6** | **Fixed IDs DT-001…DT-010** | Deterministic seed data cho reproducible demo script |
| **7** | **Reset < 30s** | Progress indicator + Keep persona after reset + APP_MODE=demo guard |
| **8** | **Demo cap 5MB/file** | Progress bar + Clear timeout handling (không 50MB) |
| **9** | **Idempotency ALL state-changing** | UUID v4 cho Submit, Approve, Return, Resubmit, etc. |
| **10** | **PDF SLA 10s** | Loader "Đang tạo PDF..." + Pre-generated seeds (DT-001.pdf...) |
| **11** | **ZIP SLA 30s** | Progress + Pre-generated seeds + NO email fallback |
| **12** | **Definition of Done (+2)** | + data-testid required + seed/update data chạy được |
| **13** | **E2E Tests (+1)** | + Export Smoke Test (PDF/ZIP có generate không error) |
| **14** | **Risk Tests (+2)** | + Persona switch cache invalidation + RBAC drift detection |

### Scope EXCLUDED (Demo-First):

| Feature | Reason |
|---------|--------|
| **Notification badge** | Demo-first không phụ thuộc notification |
| **Email fallback** | Demo scope không có background email pipeline |
| **Undo action** | Demo complexity + UX ambiguity |

### Technical Specifications Added:

**Auth Stack:**
- NestJS + Passport Local + bcrypt + JWT cookie-based (HttpOnly)
- RBAC Matrix: role + route + action
- Persona switch = impersonation (acting_as_user_id)

**Seed Data (DT-001…DT-010):**
- DT-001: DRAFT — PI tạo/sửa/auto-save
- DT-002: FACULTY_REVIEW — Khoa duyệt happy path
- DT-003: FACULTY_REVIEW — Khoa yêu cầu sửa
- DT-004: CHANGES_REQUESTED — PI resubmit demo
- DT-005: SCHOOL_SELECTION_REVIEW — Phân bổ hội đồng
- DT-006: OUTLINE_COUNCIL_REVIEW — Thư ký HĐ holder
- DT-007: OUTLINE_COUNCIL_REVIEW — Thành viên vote
- DT-008: APPROVED — Bắt đầu thực hiện
- DT-009: IN_PROGRESS — Nộp nghiệm thu
- DT-010: SCHOOL_ACCEPTANCE_REVIEW — BGH duyệt

**Definition of Done (Updated):**
1. ✅ API implement + Unit test pass
2. ✅ UI implement + data-testid có
3. ✅ Audit event logged (audit_events)
4. ✅ Seed/update data chạy được demo script
5. ✅ Demo rehearsal pass (10-12 minutes)
6. ✅ Code review pass

### UX Specifications Added:

**Revision Panel (Epic 4):**
```
┌─────────────────────────────────────────────────┐
│ Cần sửa các phần:                                │
│                                                 │
│ ☐ Phương pháp nghiên cứu    [Đã sửa]          │
│    "Cần chi tiết hóa phương pháp..."              │
│                                                 │
│ ☐ Kinh phí                   [Đã sửa]          │
│    "Chưa giải ngân giai đoạn 1"                   │
│                                                 │
│ [Primary: Nộp lại]  (enabled khi ≥1 checkbox)    │
│                                                 │
│ ⚠️ Nộp lại sẽ giữ nguyên lịch sử;                 │
│    không quay về DRAFT.                          │
└─────────────────────────────────────────────────┘
```

---

*Epics designed per demo-first rules — Updated 2026-01-04 with Party Mode decisions*
