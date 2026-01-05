const handleSubmit = () => {
  if (hasError) {
    formRef.current.querySelector('[aria-invalid="true"]')?.focus();
  }
};
```

**High Contrast & Reduced Motion:**

```css
/* Respect OS high contrast setting */
@media (prefers-contrast: high) {
  .card { border: 2px solid currentColor; }
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Workflow Completion

**Status:** ✅ UX Design Specification Complete

**Date Completed:** 2026-01-02

**Author:** Coc

**Total Steps Completed:** 14

---

### Completion Checklist

**Design Specification Complete:**

- [x] Executive summary and project understanding
- [x] Core experience and emotional response definition
- [x] UX pattern analysis and inspiration
- [x] Design system choice and strategy
- [x] Core interaction mechanics definition
- [x] Visual design foundation (colors, typography, spacing)
- [x] Design direction decisions and mockups
- [x] User journey flows and interaction design
- [x] Component strategy and specifications
- [x] UX consistency patterns documentation
- [x] Responsive design and accessibility strategy

**Process Complete:**

- [x] All 14 steps completed with user confirmation
- [x] All content saved to specification document
- [x] Frontmatter properly updated with all steps
- [x] Next steps clearly communicated

---

### Next Steps Recommendations

**Immediate Options:**

| Workflow | Purpose | When to Use |
|----------|---------|-------------|
| **Wireframe Generation** | Create low-fidelity layouts based on UX spec | Need visual layout before development |
| **Interactive Prototype** | Build clickable prototypes for user testing | Validate UX with real users |
| **Solution Architecture** | Technical design with UX context | Ready for technical planning |
| **Epic Creation** | Break down UX requirements for development | Ready for development sprint planning |

**Recommended Sequence (Design-Focused):**

```
UX Design Spec (Complete) → Wireframes → Interactive Prototype → User Testing → Figma Design → Development
```

**Recommended Sequence (Technical-Focused):**

```
UX Design Spec (Complete) → Solution Architecture → Epic Creation → Development Sprints → Testing
```

---

### Core Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| **UX Design Specification** | `_bmad-output/planning-artifacts/ux-design-specification.md` | ✅ Complete |
| **Color Themes Visualizer** | `_bmad-output/planning-artifacts/ux-color-themes.html` | ⚠️ Not generated |
| **Design Directions** | `_bmad-output/planning-artifacts/ux-design-directions.html` | ⚠️ Not generated |

**Note:** HTML visualizers (Color Themes, Design Directions) were referenced in the workflow but not explicitly generated. These can be created if needed for stakeholder review.

---

### Locked Decisions Summary

| # | Locked Decision | Section |
|---|----------------|---------|
| 1 | **shadcn/ui + Tailwind CSS** | Design System Foundation |
| 2 | **Open → See → Do (< 10s)** | Core Experience |
| 3 | **State First, Always** | Experience Principles |
| 4 | **Business Terminology** | Emotional Response |
| 5 | **Direction C + Per-Role Density** | Design Direction |
| 6 | **PDF = WYSIWYG** | Visual Foundation |
| 7 | **Dark Mode Auto OS** | Visual Foundation |
| 8 | **Overdue Muted Red** | Visual Foundation |
| 9 | **Badge = Icon + Text** | Visual Foundation |
| 10 | **Submit ONCE = Finalize** | User Journey Flows |
| 11 | **Revision = Section-Level** | User Journey Flows |
| 12 | **Attachments MVP Policy** | User Journey Flows |
| 13 | **holder_user Policy** | User Journey Flows |
| 14 | **Bulk Safety Bundle** | User Journey Flows |
| 15 | **Desktop-First, Mobile BGH Only** | Responsive Strategy |

---

### For Implementation Team

**This specification provides:**

1. **Clear Design Vision:** "Nhìn là biết" — State + Holder + SLA visible everywhere
2. **Component Roadmap:** 10 custom components with full specifications
3. **User Journey Maps:** 6 detailed flows (J1-J6) with breakpoints and fixes
4. **UX Patterns:** Button hierarchy, feedback, forms, navigation, modals, empty states
5. **Accessibility Requirements:** WCAG 2.1 AA compliance with Radix UI foundation
6. **Responsive Strategy:** Desktop-primary with tablet adaptation, mobile read-only (BGH)

**Start Implementation With:**

1. **Phase 1 Components:** StatusCard, SLABadge, WorkflowTimeline, ActionPanel
2. **Core Screen:** Dashboard per role (My Action Items + Queue)
3. **Critical Flow:** J1 (Giảng viên nộp hồ sơ) + J3 (Khoa duyệt)

**Use This Spec For:**

- Visual design reference (Figma/Sketch)
- Development requirements (component specs, patterns)
- QA testing criteria (accessibility, responsive, user flows)
- User testing protocols (journey validation)

---

*UX Design Workflow Completed 2026-01-02*

---

## Post-Completion Review & Enhancements

**Reviewer:** Coc
**Date:** 2026-01-02
**Purpose:** Lock remaining blind spots before implementation

---

### Critical Resolutions (8 Failure Points)

#### 1. SUBMITTED: Event vs State (Locked)

**Decision:** **Option A — SUBMITTED is event, not state**

```
DRAFT → FACULTY_REVIEW (direct transition)
Timeline entry: "Đã nộp" (SUBMITTED event logged, but not a stable state)
```

**Rationale:**
- UI/analytics/filters only show stable states
- `projects.state` never = "SUBMITTED"
- Timeline still captures submission event for audit
- Avoids confusion about "how long does SUBMITTED last?"

**Implementation:**
```javascript
// NO
projects.state = 'SUBMITTED';

// YES
projects.state = 'FACULTY_REVIEW';
workflow_logs.push({
  from_state: 'DRAFT',
  to_state: 'FACULTY_REVIEW',
  event: 'SUBMITTED',  // event type, not state value
  timestamp: now()
});
```

---

#### 2. prior_state for CHANGES_REQUESTED (Locked)

**Decision:** **Store return_target explicitly in log entry**

```
Instead of: "return to prior_state" (inferred)
Use: return_target_state + return_target_holder_unit (source of truth)
```

**Schema Addition:**
```typescript
interface WorkflowLogEntry {
  // ... existing fields
  return_target_state?: string;      // e.g., "FACULTY_REVIEW", "OUTLINE_COUNCIL_REVIEW"
  return_target_holder_unit?: string; // e.g., "Khoa CNTT", "Phòng KHCN"
  return_reason_sections?: string[];  // Canonical Section IDs
}
```

**Resubmit Logic:**
```javascript
// When resubmitting, read from workflow log, NOT infer
const lastReturnLog = workflow_logs
  .filter(l => l.to_state === 'CHANGES_REQUESTED')
  .sortDesc('timestamp')[0];

const targetState = lastReturnLog.return_target_state;  // explicit
const targetHolder = lastReturnLog.return_target_holder_unit;  // explicit
```

---

#### 3. Holder Logic for Exception States (Locked)

**State → Holder Rules:**

| Exception State | holder_unit | holder_user | Rationale |
|-----------------|-------------|-------------|-----------|
| **CANCELLED** | Actor's unit | Actor (who cancelled) | Trace responsibility |
| **REJECTED** | Decision maker's unit | Decision maker | Audit trail |
| **PAUSED** | PKHCN | Optional | Only PKHCN can pause/resume |
| **CHANGES_REQUESTED** | PROJECT_OWNER's unit | — | Owner must fix |

**Dashboard Impact:**
- "Đang chờ tôi" filter respects these rules
- Cancelled/Rejected projects show in "Tất cả" but NOT "Đang chờ tôi"
- Paused projects show in PKHCN queue only

---

#### 4. SLA Calculation Rules (Locked)

**Business Rules:**

1. **Working days:** Thứ 2-6 (excludes Sunday)
2. **Cutoff time:** 17:00 (5 PM) — actions after cutoff count as next day
3. **Timezone:** UTC+7 (Vietnam time)
4. **Holidays:** Configurable holiday list (managed by Admin)
5. **Weekend deadline:** If deadline falls on Sunday, move to Monday
6. **Holiday deadline:** If deadline falls on holiday, move to next working day
7. **Submit time edge:** Submit at 16:59 → counts as today; 17:01 → counts as next day

**Example Calculations:**

```
Case 1: Deadline falls on Sunday
Submit: Friday 14:00 → SLA: 3 working days
= Friday (day 1) + Saturday (skip) + Sunday (skip) + Monday (day 2) + Tuesday (day 3)
Deadline: Tuesday 17:00

Case 2: Late Friday submission
Submit: Friday 16:59 → counts as Friday
Submit: Friday 17:01 → counts as Monday (next working day)
```

**Implementation:**
```typescript
function calculateSLADeadline(submitTime: Date, workingDays: number): Date {
  // Business calendar: exclude Sun + holidays
  // Cutoff: 17:00
}
```

---

#### 5. PDF Export Technical Decision (Locked)

**Decision:** **Render from HTML/CSS + headless export (Playwright/Puppeteer)**

**Rationale:**
- True WYSIWYG — what user sees is what gets printed
- No separate template language to maintain
- Design tokens shared between UI and PDF
- Page breaks controlled via CSS `break-after`, `break-inside`

**Requirements (Acceptance Tests):**

| Requirement | Test |
|-------------|------|
| **Table header repeat** | Export table spanning 2+ pages → header repeats on each page |
| **Controlled page breaks** | Long sections break at logical boundaries |
| **Font embedding** | PDF renders correctly on machines without fonts installed |
| **Dark mode handling** | PDF always uses light theme regardless of UI theme |
| **Badge icon+text** | Grayscale print remains readable |

**CSS for PDF:**
```css
@media print {
  /* Force light theme */
  :root {
    --background: white;
    --foreground: black;
  }

  /* Table headers repeat */
  thead {
    display: table-header-group;
  }

  /* Page break control */
  .page-break-after {
    break-after: page;
  }

  .no-break {
    break-inside: avoid;
  }
}
```

---

#### 6. Concurrency & Idempotency (Locked)

**Idempotency Keys:**

```typescript
// Every state-changing action requires idempotency key
interface ActionRequest {
  idempotencyKey: string;  // UUID generated client-side
  action: string;
  projectId: string;
}

// Server: check if key already processed
if (await redis.get(idempotencyKey)) {
  return { status: 'already_processed', result };
}
```

**Bulk Job Safety:**

```typescript
// 1. Dry-run on snapshot
const snapshot = await getRecords(filters);  // immutable snapshot
const dryRunResult = validateAll(snapshot);

// 2. Execute with re-check
for (const record of snapshot) {
  const current = await getRecord(record.id);
  if (current.state !== record.state || current.holder !== record.holder) {
    // Skip + report
    results.skipped.push({
      id: record.id,
      reason: 'State changed since snapshot',
      before: record,
      after: current
    });
    continue;
  }
  // Execute action
}
```

---

#### 7. Canonical Section Dictionary (Locked)

**Section Taxonomy:**

| Section ID | Label (VN) | Scope | Fields (examples) |
|------------|------------|-------|-------------------|
| `info_general` | Thông tin chung | All | title, code, faculty, duration |
| `info_researcher` | Thông tin nghiên cứu viên | All | name, email, phone, degree |
| `content_objective` | Mục tiêu nghiên cứu | All | objective, scope |
| `content_methodology` | Phương pháp nghiên cứu | All | methods, tools, approach |
| `content_expected_outcomes` | Kết quả mong đợi | All | outcomes, deliverables |
| `budget_estimation` | Kinh phí ước tính | All | total, breakdown |
| `budget_allocation` | Phân bổ kinh phí | With budget | by_year, by_category |
| `attach_proposal` | Tờ trình đề xuất | All | file_url, version |
| `attach_cv` | CV nghiên cứu viên | All | file_url, version |
| `attach_budget` | Dự toán chi tiết | With budget | file_url, version |
| `attach_other` | Tài liệu khác | All | file_url, version, description |

**Usage:**
- Revision requests reference `section_id` (not free text)
- Form validation uses `section_id` for grouping
- Analytics report completion by section

---

#### 8. Icon Set Convention (Locked)

**Icon Library:** **Lucide React** (consistent with shadcn/ui)

**State Badge Icons:**

| State | Icon (Lucide) | Rationale |
|-------|---------------|-----------|
| DRAFT | `file-edit` | Editable |
| SUBMITTED | `send` | Sent (event) |
| FACULTY_REVIEW | `building` | Faculty unit |
| SCHOOL_SELECTION_REVIEW | `filter` | School selection |
| OUTLINE_COUNCIL_REVIEW | `users` | Council group |
| CHANGES_REQUESTED | `arrow-uturn-left` | Return |
| APPROVED | `check-circle` | Approved |
| IN_PROGRESS | `play-circle` | Project running |
| PAUSED | `pause-circle` | Paused |
| FACULTY_ACCEPTANCE_REVIEW | `clipboard-check` | Faculty acceptance |
| SCHOOL_ACCEPTANCE_REVIEW | `shield-check` | School acceptance |
| HANDOVER | `package` | Product handover |
| COMPLETED | `check-circle-2` | Done |
| CANCELLED | `x-circle` | Cancelled |
| REJECTED | `ban` | Rejected |
| WITHDRAWN | `folder-minus` | Withdrawn |

**SLA Badge Icons:**

| Status | Icon (Lucide) | Format |
|--------|---------------|--------|
| OK (in SLA) | `clock` | ⏳ Còn X ngày |
| Warning (T-2) | `alert-triangle` | ⚠️ T-2 (Còn X ngày) |
| Overdue | `alert-circle` | ⛔ Quá hạn X ngày |

**Dark Mode / Print Rules:**
- Icons always render with currentColor
- Text label always present (icon-only forbidden)
- Grayscale print: icon + text remains readable

---

### Step 10 Enhancements (3 Additions)

#### A. Global Breakpoints Matrix

| Error Category | UX Handling | System Handling | Owner |
|----------------|-------------|------------------|-------|
| **Network failure** | Toast: "Kiểm tra kết nối" + Retry button | Auto-retry 3x with exponential backoff | Dev |
| **Stale data** | "Dữ liệu đã cũ. Tải lại?" | Background refresh + conflict resolution prompt | Dev |
| **Permission denied** | Inline: "Bạn không có quyền thực hiện" | Log attempt + return 403 | PKHCN |
| **File too large** | Inline: "File quá 10MB" | Reject upload + suggest compression | Dev |
| **Job timeout** | "Tác vụ đang xử lý. Kiểm tra sau" | Continue async + send notification when done | Dev |
| **Duplicate submit** | Toast: "Đã nộp. Không nộp lại." | Idempotency key check | Dev |
| **Concurrent edit** | "Dữ liệu đã được cập nhật bởi người khác" | Optimistic locking + merge UI | Dev |
| **Missing holder** | Alert banner: "Hồ sơ chưa có người xử lý" | Auto-escalate to PKHCN after T+2 | PKHCN |

---

#### B. State Transition Guardrails

**Every transition must specify:**

| Field | Description | Example |
|-------|-------------|---------|
| **from_state** | Current state | `DRAFT` |
| **to_state** | Target state | `FACULTY_REVIEW` |
| **allowed_roles** | Who can trigger | `['PROJECT_OWNER']` |
| **required_inputs** | Mandatory fields | `reason_code (if negative)` |
| **side_effects** | What happens | `holder_unit → Khoa, notify Khoa` |
| **sla_reset** | Does SLA restart? | `true` |
| **audit_requirement** | Must log | `action, actor, reason, timestamp` |

**Example: DRAFT → FACULTY_REVIEW (Submit)**

```typescript
{
  from_state: 'DRAFT',
  to_state: 'FACULTY_REVIEW',
  allowed_roles: ['PROJECT_OWNER'],
  required_inputs: {
    form_valid: true,
    required_documents: true
  },
  side_effects: {
    holder_unit: 'Khoa',  // From project.faculty
    holder_user: null,
    sla_start: now(),
    notifications: ['faculty_queue', 'submitter_confirm']
  },
  audit_requirement: {
    log_fields: ['from_state', 'to_state', 'actor', 'timestamp'],
    reason_required: false  // Optional for positive transition
  }
}
```

**Example: FACULTY_REVIEW → CHANGES_REQUESTED (Return)**

```typescript
{
  from_state: 'FACULTY_REVIEW',
  to_state: 'CHANGES_REQUESTED',
  allowed_roles: ['FACULTY_REVIEWER'],
  required_inputs: {
    reason_code: true,  // Mandatory
    revision_sections: true,  // Canonical Section IDs
    comment: true
  },
  side_effects: {
    holder_unit: '{PROJECT_OWNER_FACULTY}',
    holder_user: '{PROJECT_OWNER}',
    return_target_state: 'FACULTY_REVIEW',  // Explicit
    return_target_holder_unit: '{CURRENT_HOLDER}',
    notifications: ['submitter_return']
  },
  audit_requirement: {
    log_fields: ['from_state', 'to_state', 'actor', 'reason_code', 'revision_sections', 'return_target'],
    reason_required: true
  }
}
```

---

#### C. Journey Definition of Done (DoD)

**J1 (Giảng viên nộp hồ sơ) DoD:**
- [ ] All required fields validated
- [ ] All required documents uploaded
- [ ] `projects.state` = `FACULTY_REVIEW`
- [ ] `holder_unit` = Khoa (from project.faculty)
- [ ] Timeline has 2 entries: "Đã nộp" + "Chuyển Khoa duyệt"
- [ ] Toast confirmation shown
- [ ] Email sent to submitter
- [ ] SLA countdown started
- [ ] Deep link valid

**J2 (Resubmit sau CHANGES_REQUESTED) DoD:**
- [ ] User edited ≥1 section in `revision_required_sections` list
- [ ] Resubmit successful
- [ ] Timeline entry: "Đã nộp lại"
- [ ] `projects.state` = `return_target_state` (from log, not inferred)
- [ ] `holder_unit` = `return_target_holder_unit`
- [ ] SLA recalculated from resubmit time
- [ ] Email notification sent
- [ ] Revision sections marked as addressed

**J3 (Khoa duyệt hồ sơ) DoD:**
- [ ] Approver selected (Approve OR Return)
- [ ] If Return: reason_code + revision_sections provided
- [ ] State transition logged
- [ ] Holder transferred correctly
- [ ] Notification sent
- [ ] SLA updated (reset or escalated)

**J4 (PKHCN Bulk Actions) DoD:**
- [ ] Recipients previewed
- [ ] Dry-run validation passed
- [ ] Job created + tracked
- [ ] Progress visible (polling)
- [ ] Delivery report generated
- [ ] Audit snapshot saved

**J5 (HĐ Submit ONCE) DoD:**
- [ ] Evaluation form in FINALIZED state
- [ ] Read-only enforced
- [ ] No further edits possible
- [ ] Timeline entry + audit log
- [ ] State transition triggered
- [ ] PDF exportable

**J6 (BGH Read-only) DoD:**
- [ ] KPI visible within 30 seconds
- [ ] Drill-down functional
- [ ] PDF export works
- [ ] No data modification possible

---

### Critical Questions Answered (5 Blind Spots Locked)

#### Q1: holder_unit khi CHANGES_REQUESTED?

**Answer:** `holder_unit = PROJECT_OWNER's faculty` (Khoa của giảng viên)

**Rationale:**
- Owner must fix, so holder points to owner's unit
- "Đang chờ tôi" filter works correctly for faculty
- Queue shows in faculty's pending list

**Schema:**
```typescript
if (state === 'CHANGES_REQUESTED') {
  holder_unit = project.owner.faculty;
  holder_user = project.owner.id;
}
```

---

#### Q2: SLA có "dừng đồng hồ" khi PAUSED?

**Answer:** **Có — SLA pauses when PAUSED, resumes on unpause**

**Rules:**
- PAUSED: `sla_paused_at = now()`, accumulate paused duration
- RESUME: `sla_deadline += paused_duration`, reset `sla_paused_at`
- Display: "Đã tạm dừng" (no countdown shown)

**Implementation:**
```typescript
interface ProjectSLA {
  deadline: Date;
  paused_at?: Date;
  total_paused_duration: number;  // milliseconds
}

function getEffectiveSLA(project: Project): Date | null {
  if (project.state === 'PAUSED') {
    return null;  // Don't show countdown
  }
  return addMilliseconds(project.deadline, project.total_paused_duration);
}
```

---

#### Q3: PDF preview trong dark mode hiển thị theo theme nào?

**Answer:** **PDF preview always shows light theme, regardless of UI theme**

**UX:**
- Preview modal has header: "Xem trước (in màu)"
- Small toggle: "Chế độ tối/ sáng" ONLY affects preview display, not actual PDF
- Actual PDF always light theme

**Rationale:**
- Avoids "tôi thấy khác" confusion
- Print output always light theme
- Preview matches final output

---

#### Q4: Bulk remind — template locked hay user tự soạn?

**Answer:** **Template locked (MVP); PKHCN quản trị template**

**MVP Policy:**
- 2-3 fixed templates (Vietnamese)
- PKHCN selects template, cannot edit content
- Templates managed by Admin (versioning)

**Growth (Optional):**
- PKHCN can create custom templates (with approval)
- Template variables: `{project_title}`, `{sla_remaining}`, `{holder}`, `{deadline}`

**Template Variables:**
```text
Template: Nhắc hạn hồ sơ KHCN

Kính gửi {recipient_name},

Đề tài "{project_title}" đang ở trạng thái {state}
với thời gian xử lý còn {sla_remaining} ngày.

Deadline: {deadline}

Vui lòng kiểm tra và xử lý.

Trân trọng,
Phòng KHCN - Đại học Sư phạm Kỹ thuật Nam Định
```

---

#### Q5: Escape hatch (PKHCN reopen) — audit + justification bắt buộc?

**Answer:** **Có — justification bắt buộc, audit entry required**

**Requirements:**
- PKHCN must select `reopen_reason_code` (dropdown)
- PKHCN must enter `reopen_justification` (free text, min 20 chars)
- Audit log records: `original_evaluator`, `reopen_actor`, `reopen_reason`, `reopen_timestamp`
- Evaluation form becomes editable again, but shows "Đã được reopen bởi PKHCN lúc..."

**Reason Codes for Reopen:**
- `EVALUATOR_REQUEST`: Người đánh giá yêu cầu sửa
- `ADMIN_ERROR`: Lỗi hành chính
- `NEW_EVIDENCE`: Bằng chứng mới xuất hiện
- `OTHER`: Khác (phải giải thích)

**Audit Entry:**
```typescript
interface ReopenAuditLog {
  evaluation_id: string;
  original_evaluator: string;
  original_finalize_time: Date;
  reopen_actor: string;
  reopen_reason_code: string;
  reopen_justification: string;
  reopen_timestamp: Date;
  approved_by?: string;  // If PKHCN head approval required
}
```

**UI Display:**
- Banner on evaluation form: "⚠️ Đánh giá này đã được reopen. Lý do: {reason}"
- Timeline shows reopen entry
- Original evaluator notified of reopen

---

### Summary of Locked Additions

| # | Addition | Location |
|---|----------|----------|
| 1 | SUBMITTED = event, not state | Global Rules |
| 2 | return_target explicitly stored | Workflow Logs Schema |
| 3 | Exception state holder rules | Holder Logic |
| 4 | SLA calculation rules | SLA Specification |
| 5 | PDF export via HTML+headless | PDF Technical Decision |
| 6 | Idempotency keys + bulk safety | Concurrency Rules |
| 7 | Canonical Section Dictionary | Data Taxonomy |
| 8 | Lucide icon set mapping | Visual Design |
| 9 | Global Breakpoints Matrix | Error Handling |
| 10 | State Transition Guardrails | Workflow Rules |
| 11 | Journey Definition of Done | User Journeys |
| 12 | 5 critical question answers | Blind Spots Locked |

---

*Enhancements locked by Coc on 2026-01-02*

---

## Locked Decisions Clarification (5 Implementation Rules)

**Reviewer:** Coc
**Date:** 2026-01-02
**Purpose:** Resolve implementation ambiguities before dev starts

---

### 1. PDF "WYSIWYG" vs Dark Mode / Print

**Quyết định khóa:**

```
WYSIWYG = giống về bố cục + thứ tự thông tin + typography + component structure
KHÔNG bắt buộc "giống 100% màu theme"
```

**Rules:**

| Aspect | Rule |
|--------|------|
| **Layout parity** | Grid, columns, spacing — giống UI |
| **Typography** | Font family, sizes, weights — giống UI |
| **Component structure** | Badge, table, card structure — giống UI |
| **Theme** | PDF luôn dùng "Print Theme" (nền trắng) cố định |
| **Colors** | Semantic colors (OK/Warn/Overdue) muted, in trắng-đen vẫn hiểu |

**Implementation:**

```css
/* PDF Token Namespace */
:root {
  /* Print variant tokens */
  --pdf-surface: #ffffff;
  --pdf-text: #000000;
  --pdf-border: #e2e8f0;
  --pdf-danger: #B5474B;  /* Muted red, not neon */
}

/* Color mapping ensures grayscale readability */
.badge-overdue {
  background: var(--pdf-danger);
  color: white;
}

/* Icon + text ensures meaning without color */
.badge-overdue::before {
  content: "⛔ ";  /* Icon prefix */
}
```

**UI Modal Copy:**

```
[Xuất PDF]
"PDF dùng chế độ in (nền trắng) để dễ đọc và lưu trữ."
```

**Badge Requirement (Locked):**

```
Format: [icon] + text
Example: ⛔ Quá hạn 3 ngày
✓ Grayscale print vẫn hiểu
✗ Badge chỉ có màu là KHÔNG ĐỦ
```

---

### 2. SLA "Ngày làm việc" (Mon–Fri vs "Loại Chủ nhật")

**Quyết định khóa:**

```
Default: Thứ 2–Thứ 6 là ngày làm việc
Thứ 7 + Chủ nhật = non-working (mặc định)
Có thể override qua holiday calendar: is_working_day = true (ngày làm bù)
```

**Implementation Rules:**

```typescript
// Calendar table structure
interface BusinessCalendar {
  date: Date;
  is_working_day: boolean;  // Override default (null = use default)
  is_holiday: boolean;      // Explicit holiday
  holiday_name?: string;
}

// Core function
function isWorkingDay(date: Date, calendar: BusinessCalendar[]): boolean {
  const entry = calendar.find(c => isSameDay(c.date, date));

  // 1. Explicit override wins
  if (entry?.is_working_day === false) return false;  // Explicit non-working
  if (entry?.is_working_day === true) return true;   // Explicit working

  // 2. Default: Mon-Fri = working, Sat-Sun = non-working
  const weekday = date.getDay();  // 0=Sun, 6=Sat
  return weekday >= 1 && weekday <= 5;  // Mon-Fri
}

// Deadline calculation
function calculateDeadline(startDate: Date, workingDays: number, calendar: BusinessCalendar[]): Date {
  let current = startDate;
  let remaining = workingDays;

  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, calendar)) {
      remaining--;
    }
  }

  return current;  // Deadline at 17:00
}
```

**T-2/T0/T+2 Calculation:**

```typescript
// Working-day offset, NOT calendar-day offset
function getSLADeadlineStatus(deadline: Date, calendar: BusinessCalendar[]) {
  const today = new Date();
  const workingDaysUntilDeadline = countWorkingDays(today, deadline, calendar);

  if (workingDaysUntilDeadline < 0) return { status: 'overdue', days: -workingDaysUntilDeadline };
  if (workingDaysUntilDeadline <= 2) return { status: 'warning', days: workingDaysUntilDeadline };  // T-2
  return { status: 'ok', days: workingDaysUntilDeadline };
}
```

**Sat/Sun Override (Làm bù):**

| Scenario | is_working_day | is_holiday | Result |
|----------|----------------|------------|--------|
| Thứ 7 bình thường | `null` | `false` | Non-working (default) |
| Thứ 7 làm bù | `true` | `false` | Working (override) |
| Thứ 2 nhưng là lễ | `false` | `true` | Non-working (holiday) |

---

### 3. SUBMITTED là "State" hay "Event"?

**Quyết định khóa (Reinforced):**

```
SUBMITTED là EVENT, không phải STATE trong projects.state
Workflow state nhảy: DRAFT → FACULTY_REVIEW ngay sau submit
Timeline hiển thị "Đã nộp" như log entry
```

**Schema:**

```typescript
// Database Schema (16 canonical states)
interface Project {
  state: ProjectState;  // NEVER = 'SUBMITTED'
  // ProjectState = 'DRAFT' | 'FACULTY_REVIEW' | 'SCHOOL_SELECTION_REVIEW'
  //               | 'OUTLINE_COUNCIL_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED'
  //               | 'IN_PROGRESS' | 'PAUSED' | 'FACULTY_ACCEPTANCE_REVIEW'
  //               | 'SCHOOL_ACCEPTANCE_REVIEW' | 'HANDOVER' | 'COMPLETED'
  //               | 'CANCELLED' | 'REJECTED' | 'WITHDRAWN'
}

interface WorkflowLog {
  id: string;
  project_id: string;
  action: LogAction;  // 'SUBMIT', 'APPROVE', 'RETURN', ...
  from_state: ProjectState;
  to_state: ProjectState;
  actor_id: string;
  timestamp: Date;
  reason_code?: string;
}

// LogAction = 'SUBMIT' | 'AUTO_TRANSITION' | 'APPROVE' | 'RETURN' | ...
```

**Implementation:**

```javascript
// SUBMIT action
async function submitProject(projectId: string, userId: string) {
  const project = await db.projects.find(projectId);

  // 1. Validate
  if (!isValidForSubmit(project)) throw new Error(...);

  // 2. Transition state (NOT to SUBMITTED)
  const newState = 'FACULTY_REVIEW';
  const newHolder = project.faculty_id;  // Khoa

  // 3. Log SUBMIT event
  await db.workflow_logs.insert({
    project_id: projectId,
    action: 'SUBMIT',
    from_state: 'DRAFT',
    to_state: 'FACULTY_REVIEW',
    actor_id: userId,
    timestamp: now()
  });

  // 4. Log auto-transition (optional, for audit clarity)
  await db.workflow_logs.insert({
    project_id: projectId,
    action: 'AUTO_TRANSITION',
    from_state: 'DRAFT',
    to_state: 'FACULTY_REVIEW',
    actor_id: 'SYSTEM',
    timestamp: now()
  });

  // 5. Update project
  await db.projects.update(projectId, {
    state: newState,
    holder_unit: newHolder,
    holder_user: null
  });
}
```

**UI Label Mapping:**

```typescript
// UI label from workflow_logs, NOT state
function getProjectActionLabel(log: WorkflowLog): string {
  const actionLabels = {
    'SUBMIT': 'Đã nộp',
    'APPROVE': 'Đã duyệt',
    'RETURN': 'Đã trả về',
    'CHANGES_REQUESTED': 'Yêu cầu sửa',
    'AUTO_TRANSITION': 'Chuyển trạng thái'
  };
  return actionLabels[log.action] || log.action;
}
```

**Filter "Đã nộp" (nếu cần):**

```sql
-- Query: projects that were submitted in date range
SELECT p.*
FROM projects p
INNER JOIN workflow_logs wl ON wl.project_id = p.id
WHERE wl.action = 'SUBMIT'
  AND wl.timestamp BETWEEN @start AND @end
```

---

### 4. "One Primary Action" với Approve/Return (2 lựa chọn)

**Quyết định khóa:**

```
Proposal Detail: luôn có 1 Primary CTA duy nhất
"Return" là Secondary (destructive), yêu cầu reason code + confirm
Return đặt là nút phụ hoặc "More actions (…) → Return"
```

**UI Hierarchy:**

| Scenario | Primary | Secondary | Placement |
|----------|---------|-----------|-----------|
| **Can Approve + Return** | Approve (green/neutral) | Return (destructive outline) | Return below Approve or in "…" |
| **Can only Return** | Return (destructive primary) | — | Return becomes primary |
| **Can only Approve** | Approve (primary) | — | Approve only |
| **Single action** | Action X | — | X is primary |

**Component Spec:**

```typescript
interface ActionPanelProps {
  state: ProjectState;
  role: UserRole;
}

// Action determination logic
function getActions(state: ProjectState, role: UserRole): ActionPanelConfig {
  if (state === 'FACULTY_REVIEW' && role === 'FACULTY_REVIEWER') {
    return {
      primary: {
        label: 'Duyệt hồ sơ',
        action: 'approve',
        variant: 'default'
      },
      secondary: [
        {
          label: 'Yêu cầu sửa',
          action: 'return',
          variant: 'destructive-outline',
          requiresReason: true  // Must provide reason code
        }
      ]
    };
  }

  if (state === 'DRAFT' && role === 'PROJECT_OWNER') {
    return {
      primary: {
        label: 'Nộp hồ sơ',
        action: 'submit',
        variant: 'default'
      },
      secondary: []
    };
  }

  // ... other states
}
```

**UI Layout:**

```
┌─────────────────────────────────────────┐
│  [Primary: Duyệt hồ sơ]                  │
│                                         │
│  [Yêu cầu sửa...]  (secondary link)      │
│  or                                     │
│  More actions (…) →                      │
│    • Duyệt hồ sơ                         │
│    • Yêu cầu sửa                         │
│    • Xem PDF                             │
└─────────────────────────────────────────┘
```

**Return Flow (Secondary Destructive):**

1. User clicks "Yêu cầu sửa" (secondary button)
2. Opens Sheet/Dialog with:
   - Reason code dropdown (required)
   - Section checkboxes (required)
   - Comment field (optional)
3. Confirm → executes return

**PKHCN Bulk/List View:**

| Location | Primary | Secondary |
|----------|---------|-----------|
| **Toolbar** | Bulk Assign / Bulk Remind | Export Excel |
| **Per-row** | "…" menu → View, Assign, Remind | — |

---

### 5. Canonical Section IDs (Returned UX Granularity)

**Quyết định khóa:**

```
Mỗi Form Template có version + canonical section IDs ổn định
RETURN lưu revision_requests[] = { template_version, section_id, note }
KHÔNG đổi nghĩa section_id giữa version — backward compatible
```

**Schema:**

```typescript
// Form Template with versioning
interface FormTemplate {
  id: string;
  name: string;
  version: string;  // "v1.0", "v1.1", "v2.0"
  sections: FormSection[];
  created_at: Date;
  deprecated_at?: Date;
}

interface FormSection {
  id: string;  // Canonical, stable: "SEC_OVERVIEW", "SEC_METHOD"
  label: string;  // Display label
  component: string;  // React component name
  order: number;
}

// Project links to template version
interface ProjectFormInstance {
  project_id: string;
  template_id: string;
  template_version: string;  // Snapshot of template used
  data: Record<string, any>;  // Section data
}

// Revision requests reference (version, section_id)
interface RevisionRequest {
  id: string;
  project_id: string;
  template_version: string;  // Version when revision was created
  section_id: string;  // Canonical section ID
  note: string;
  created_by: string;
  created_at: Date;
  resolved_at?: Date;
}
```

**Versioning Rules:**

| Rule | Description |
|------|-------------|
| **Stable IDs** | Section ID never changes meaning once created |
| **Add only** | New sections get new IDs; old IDs preserved |
| **Deprecate** | Old sections marked deprecated, not deleted |
| **Backward compatible** | Old projects reference old version; new projects use new version |

**Section ID Taxonomy (Locked):**

```
SEC_INFO_GENERAL        → Thông tin chung
SEC_INFO_RESEARCHER     → Thông tin nghiên cứu viên
SEC_CONTENT_OBJECTIVE   → Mục tiêu nghiên cứu
SEC_CONTENT_METHOD      → Phương pháp nghiên cứu
SEC_CONTENT_OUTCOMES    → Kết quả mong đợi
SEC_BUDGET_ESTIMATE     → Kinh phí ước tính
SEC_BUDGET_ALLOCATION   → Phân bổ kinh phí
SEC_ATTACH_PROPOSAL     → Tờ trình đề xuất
SEC_ATTACH_CV           → CV nghiên cứu viên
SEC_ATTACH_BUDGET       → Dự toán chi tiết
SEC_ATTACH_OTHER        → Tài liệu khác
```

**Return Flow with Versioned Sections:**

```typescript
// Faculty returns project
async function returnProject(projectId: string, returnData: ReturnRequest) {
  const project = await getProject(projectId);
  const form = await getProjectForm(projectId);

  // Create revision requests with template version
  const revisionRequests = returnData.section_ids.map(sectionId => ({
    project_id: projectId,
    template_version: form.template_version,  // Snapshot!
    section_id: sectionId,  // Canonical ID
    note: returnData.note,
    created_by: getCurrentUser().id,
    created_at: now()
  }));

  await db.revision_requests.insert(revisionRequests);

  // Update project state
  await updateProjectState(projectId, 'CHANGES_REQUESTED');
}

// Resubmit: highlight sections
async function getRevisionHighlight(projectId: string) {
  const form = await getProjectForm(projectId);
  const revisions = await db.revision_requests
    .where('project_id', projectId)
    .where('resolved_at', null)
    .toArray();

  return revisions.map(r => {
    const section = form.template.sections.find(s => s.id === r.section_id);

    if (!section) {
      // Section not found in current template version
      return {
        section_id: r.section_id,
        status: 'deprecated',
        message: `Section "${r.section_id}" đã thay đổi theo mẫu mới. Yêu cầu sửa: ${r.note}`,
        note: r.note
      };
    }

    return {
      section_id: r.section_id,
      section_label: section.label,
      status: 'active',
      note: r.note
    };
  });
}
```

**Frontend Highlight Logic:**

```typescript
// RevisionPanel component
function RevisionPanel({ projectId }: Props) {
  const highlights = useRevisionHighlights(projectId);

  return (
    <div>
      {highlights.map(h => (
        h.status === 'deprecated' ? (
          <Alert key={h.section_id} variant="warning">
            {h.message}
          </Alert>
        ) : (
          <RevisionItem
            key={h.section_id}
            sectionId={h.section_id}
            label={h.section_label}
            note={h.note}
            onScrollToSection={() => scrollToSection(h.section_id)}
          />
        )
      ))}
    </div>
  );
}
```

**Template Ownership:**

| Action | Who | Notes |
|--------|-----|-------|
| **Create template** | Admin / PKHCN | Requires approval |
| **Edit sections** | Admin / PKHCN | New version ONLY, not in-place edit |
| **Deprecate section** | Admin / PKHCN | Mark deprecated, don't delete |
| **Change section ID** | FORBIDDEN | Creates new ID instead |

**Migration Path:**

```
Template v1.0 → Active projects use v1.0
Template v1.1 → New projects use v1.1; v1.0 projects continue
Template v2.0 → Breaking changes; migrate v1.0 projects manually
```

---

### Summary Table (One Page for Dev)

| # | Rule | Implementation |
|---|------|----------------|
| **1** | **PDF WYSIWYG** | Layout parity + print theme (light) + muted colors + icon+text badges |
| **2** | **SLA Working Days** | Mon-Fri default; Sat/Sun override via `is_working_day` in calendar |
| **3** | **SUBMITTED = Event** | `projects.state` never = SUBMITTED; log entry with action='SUBMIT' |
| **4** | **One Primary Action** | Primary = Approve (if both); Return = secondary destructive with reason |
| **5** | **Canonical Section IDs** | Versioned templates; stable IDs; revision stores `(version, section_id)` |

---

*Locked decisions clarification by Coc on 2026-01-02*

---

## Developer Guardrails Checklist

**Purpose:** "Chốt để không vỡ" — Solutions cho failure points. Đội dev PHẢI tuân thủ.

**Date:** 2026-01-02
**Status:** LOCKED — Không thay đổi mà không có họp với PKHCN + Product Owner

---

### A. 8 Failure Points Cốt Lõi

| # | Điểm vỡ | Triệu chứng "vỡ" | Giải pháp khóa (UX + System) | Output bắt buộc (audit/QA) |
|---|---------|------------------|------------------------------|---------------------------|
| **1** | **SUBMITTED: Event vs State** | Filter/analytics rối; không biết kéo dài bao lâu | SUBMITTED là EVENT, không phải `projects.state`. Submit: `DRAFT → FACULTY_REVIEW` trực tiếp. Timeline vẫn có entry "Đã nộp". | `projects.state` không bao giờ = SUBMITTED; `workflow_logs.action=SUBMIT` tồn tại |
| **2** | **prior_state khi CHANGES_REQUESTED** | Resubmit quay sai state (đặc biệt nhiều vòng trả về) | KHÔNG suy luận prior_state. RETURN tạo log với `return_target_state` + `return_target_holder_unit` (source of truth). Resubmit đọc từ log gần nhất. | Log entry của RETURN chứa `return_target_`; resubmit dùng `return_target_` |
| **3** | **Holder logic cho Exception states** | "Đang chờ tôi" bị sai; hồ sơ "mất người giữ" | Bảng rule state→holder cố định: `CHANGES_REQUESTED → holder_unit=Khoa của owner`; `PAUSED→PKHCN`; `REJECTED/CANCELLED→unit+actor quyết định`. | Không có holder trống; queue filter chạy theo `holder_unit` |
| **4** | **SLA calculation (ngày làm việc)** | User cãi vì "3 ngày" nhưng hệ tính khác; T-2/T0 sai | Calendar engine: Mon–Fri working; Sat/Sun non-working (default) + override; cutoff 17:00; holiday list configurable; deadline rơi CN/lễ → dời; timezone UTC+7. | Hàm SLA deterministic + test cases (16:59 vs 17:01, rơi CN/lễ) |
| **5** | **PDF = WYSIWYG + Template engine** | PDF lệch font/spacing 5–10%; table dài mất header; dark-mode in ra đen | Render từ HTML/CSS + headless (Playwright). Token chung UI/PDF; CSS `@media print` ép "print theme" (nền trắng); `thead { display: table-header-group; }`; controlled page breaks; embed fonts + SVG icons. | Test: header lặp trang; break-inside; font embed; PDF luôn light; badge icon+text |
| **6** | **Concurrency & Idempotency** | Double submit/approve do refresh; bulk action gửi nhầm khi state đổi | Idempotency key cho mọi action thay đổi state. Bulk job: "snapshot + dry-run + re-check khi execute"; record đổi state/holder → skip + report. | Redis/idempotency store; bulk report: sent/failed/skipped + lý do |
| **7** | **Canonical Section Dictionary (Revision)** | Reviewer nói "sửa mục A", dev map sai; template đổi version làm mất link | Section IDs canonical + versioned templates. RETURN lưu `(template_version, section_id, note)`. KHÔNG đổi nghĩa section_id; chỉ "add + deprecate", không "edit in-place". | `revision_requests[]` có version+section_id; UI scroll-to-section ổn định |
| **8** | **Icon set convention** | Badge chỉ dựa màu → in trắng đen không hiểu; icon mỗi nơi một kiểu | Lucide React + mapping icon cố định theo state/SLA. Badge bắt buộc icon + chữ (icon-only bị cấm). `currentColor` để dark/print không vỡ. | Design token + icon map; kiểm thử grayscale readability |

---

### B. Global Breakpoints (Error Handling Standards)

| Nhóm lỗi | UX Handling (user thấy gì) | System Handling (hệ thống làm gì) | Guardrail cần có |
|----------|---------------------------|----------------------------------|------------------|
| **Network failure** | Toast "Mất kết nối. Thử lại" + nút Retry; KHÔNG modal chặn | Auto-retry 3 lần backoff; giữ DRAFT local; không làm mất context | Retry policy + offline-safe autosave |
| **Stale data** | Banner "Dữ liệu đã thay đổi. Tải lại?" + diff nhẹ nếu cần | Background re-fetch; optimistic locking; chặn ghi đè silent | Version field / ETag; conflict resolution |
| **Permission denied (403)** | Inline "Bạn không có quyền thực hiện" + link "Quay lại hàng đợi" | Log attempt; không đổi state; trả 403 rõ ràng | RBAC: role+state+action matrix |
| **File too large / invalid** | Field-level error "File quá X MB" / "Sai định dạng" | Reject upload; trả lỗi rõ; gợi ý nén/đổi PDF | Pre-check client + server validation |
| **Job timeout (bulk/email/pdf)** | "Tác vụ đang xử lý, kiểm tra sau" + link trang Job | Async job tiếp tục; notify khi xong; có delivery report | Job queue + progress endpoint |
| **Duplicate submit** | Toast "Đã nộp rồi. Không cần nộp lại." | Idempotency dedupe; trả kết quả đã xử lý | Idempotency key bắt buộc |
| **Concurrent edit** | "Có người đã cập nhật. Hãy reload" | Optimistic lock; cho merge nếu cùng section | Per-section versioning (nếu làm) |
| **Missing holder** (nguy hiểm nhất) | Banner đỏ nhạt "Hồ sơ chưa có người xử lý" + CTA "Báo PKHCN" | Auto-escalate T+2 sang PKHCN; tạo action item | DB constraint + background monitor |

---

### C. PDF "Giống Màn Hình" — 3 Risk Points

| Risk | Vì sao vỡ | Chặn vỡ (BẮT BUỘC) |
|-------|-----------|---------------------|
| **Font/spacing lệch** | Máy người dùng không có font; renderer khác nhau | Embed font trong PDF + dùng token chung UI/PDF; snapshot test PDF vs UI |
| **Table/timeline dài** | Qua trang mất header; ngắt giữa row làm khó đọc | `thead { display: table-header-group; }` + `break-inside: avoid` cho row/card; controlled page breaks |
| **Dark mode vs PDF** | UI dark nhưng PDF cần đọc/lưu trữ | PDF luôn print theme (light); Preview PDF cũng light để "không bất ngờ" |

---

### D. Checklist "Đóng Dấu" (Dev Team PHẢI tuân thủ)

**QUYỀN CỐ KHÔNG TỰ Ý THAY ĐỔI:**

| # | Quy tắc | Phạm vi |
|---|---------|---------|
| **1** | KHÔNG tạo state "SUBMITTED" trong `projects.state` | Database schema |
| **2** | RETURN luôn ghi `return_target_state` + `return_target_holder_unit` | Workflow logs schema |
| **3** | KHÔNG có holder trống | DB constraint + monitor |
| **4** | SLA theo lịch làm việc + cutoff 17:00 + holiday overrides | Business calendar |
| **5** | PDF xuất từ HTML/CSS headless, luôn print theme, embed fonts | PDF rendering |
| **6** | Mọi action đổi state có idempotency key | API design |
| **7** | Revision dùng canonical `section_id` + `template_version`, KHÔNG free-text-only | Form templates |
| **8** | Badge bắt buộc icon + chữ; Lucide mapping thống nhất | Design system |

---

### E. Quick Reference Schema (For Backend Dev)

```typescript
// === CORE TYPES (v1.9: 16 canonical states) ===

// Project state NEVER includes SUBMITTED
type ProjectState =
  // Phase A: Proposal
  | 'DRAFT'
  | 'FACULTY_REVIEW'
  | 'SCHOOL_SELECTION_REVIEW'
  | 'OUTLINE_COUNCIL_REVIEW'
  // Phase B: Changes & Approval
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  // Phase C: Acceptance & Handover
  | 'FACULTY_ACCEPTANCE_REVIEW'
  | 'SCHOOL_ACCEPTANCE_REVIEW'
  | 'HANDOVER'
  | 'COMPLETED'
  // Exception states
  | 'PAUSED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'WITHDRAWN';

// Workflow log action (includes SUBMIT as event)
type WorkflowAction =
  | 'SUBMIT'
  | 'AUTO_TRANSITION'
  | 'APPROVE'
  | 'RETURN'
  | 'RESUBMIT'
  | 'ASSIGN'
  | 'ESCALATE'
  | 'PAUSE'
  | 'RESUME'
  | 'CANCEL'
  | 'REJECT';

// === SUBMIT ACTION ===
async function submitProject(projectId: string, userId: string) {
  const newState: ProjectState = 'FACULTY_REVIEW';  // NOT 'SUBMITTED'
  const newHolder = project.faculty_id;

  // Log SUBMIT event
  await logWorkflow({
    project_id: projectId,
    action: 'SUBMIT',
    from_state: 'DRAFT',
    to_state: newState,
    actor_id: userId,
    timestamp: now()
  });

  await updateProject(projectId, {
    state: newState,
    holder_unit: newHolder
  });
}

// === RETURN ACTION (with return_target) ===
async function returnProject(projectId: string, data: ReturnData) {
  const project = await getProject(projectId);

  // Get current state BEFORE transition
  const currentValidState = project.state;

  // Create revision requests with version snapshot
  const revisions = data.section_ids.map(sid => ({
    project_id: projectId,
    template_version: project.form.template_version,
    section_id: sid,  // Canonical ID
    note: data.note
  }));

  // Log RETURN with return_target
  await logWorkflow({
    project_id: projectId,
    action: 'RETURN',
    from_state: currentValidState,
    to_state: 'CHANGES_REQUESTED',
    return_target_state: currentValidState,      // SOURCE OF TRUTH
    return_target_holder_unit: project.holder_unit,  // SOURCE OF TRUTH
    revision_sections: data.section_ids,
    reason_code: data.reason_code,
    actor_id: getCurrentUserId()
  });

  await updateProject(projectId, {
    state: 'CHANGES_REQUESTED',
    holder_unit: project.owner.faculty_id,  // Owner's faculty
    holder_user: project.owner.id
  });
}

// === RESUBMIT ACTION (reads return_target) ===
async function resubmitProject(projectId: string) {
  const project = await getProject(projectId);

  // Read return_target from LAST RETURN log
  const lastReturnLog = await getLastReturnLog(projectId);
  const targetState = lastReturnLog.return_target_state;
  const targetHolder = lastReturnLog.return_target_holder_unit;

  await updateProject(projectId, {
    state: targetState,  // Return to prior state, NOT DRAFT
    holder_unit: targetHolder
  });
}

// === HOLDER RULES (Exception states) ===
function getHolderForState(state: ProjectState, project: Project): Holder {
  switch (state) {
    case 'CHANGES_REQUESTED':
      return { unit: project.owner.faculty_id, user: project.owner.id };
    case 'PAUSED':
      return { unit: 'PKHCN', user: null };
    case 'CANCELLED':
    case 'REJECTED':
      return { unit: getLastActionUnit(project), user: getLastActionUser(project) };
    default:
      return { unit: project.holder_unit, user: project.holder_user };
  }
}

// === IDEMPOTENCY ===
interface ActionRequest {
  idempotencyKey: string;  // UUID client-side
  action: WorkflowAction;
  projectId: string;
}

async function executeAction(req: ActionRequest) {
  // Check idempotency
  if (await redis.get(`idem:${req.idempotencyKey}`)) {
    return { status: 'already_processed', result: await getCachedResult(req.idempotencyKey) };
  }

  // Mark as processing
  await redis.set(`idem:${req.idempotencyKey}`, 'processing', 'EX', 300);

  // Execute action
  const result = await doAction(req);

  // Cache result
  await redis.set(`idem:${req.idempotencyKey}`, result, 'EX', 86400);

  return { status: 'success', result };
}

// === SLA CALCULATION ===
interface BusinessCalendar {
  date: Date;
  is_working_day?: boolean;  // Override null = use default
  is_holiday?: boolean;
  holiday_name?: string;
}

function isWorkingDay(date: Date, calendar: BusinessCalendar[]): boolean {
  const entry = calendar.find(c => isSameDay(c.date, date));
  if (entry?.is_working_day === false) return false;
  if (entry?.is_working_day === true) return true;

  const weekday = date.getDay();
  return weekday >= 1 && weekday <= 5;  // Mon-Fri
}

function calculateDeadline(startDate: Date, workingDays: number): Date {
  let current = startDate;
  let remaining = workingDays;
  const calendar = getBusinessCalendar();

  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, calendar)) {
      remaining--;
    }
  }

  return setHours(current, 17, 0, 0, 0);  // 17:00 UTC+7
}

// === SECTION IDS (Canonical) ===
const CANONICAL_SECTIONS = {
  SEC_INFO_GENERAL: 'Thông tin chung',
  SEC_INFO_RESEARCHER: 'Thông tin nghiên cứu viên',
  SEC_CONTENT_OBJECTIVE: 'Mục tiêu nghiên cứu',
  SEC_CONTENT_METHOD: 'Phương pháp nghiên cứu',
  SEC_CONTENT_OUTCOMES: 'Kết quả mong đợi',
  SEC_BUDGET_ESTIMATE: 'Kinh phí ước tính',
  SEC_BUDGET_ALLOCATION: 'Phân bổ kinh phí',
  SEC_ATTACH_PROPOSAL: 'Tờ trình đề xuất',
  SEC_ATTACH_CV: 'CV nghiên cứu viên',
  SEC_ATTACH_BUDGET: 'Dự toán chi tiết',
  SEC_ATTACH_OTHER: 'Tài liệu khác'
} as const;
```

---

### F. Icon Mapping (Lucide → State/SLA)

```typescript
import * as Lucide from 'lucide-react';

// State badge icons (v1.9: 16 states)
const STATE_ICONS: Record<ProjectState, React.ComponentType> = {
  // Phase A: Proposal
  DRAFT: Lucide.FileEdit,
  FACULTY_REVIEW: Lucide.Building,
  SCHOOL_SELECTION_REVIEW: Lucide.Filter,
  OUTLINE_COUNCIL_REVIEW: Lucide.Users,
  // Phase B: Changes & Approval
  CHANGES_REQUESTED: Lucide.ArrowUturnLeft,
  APPROVED: Lucide.CheckCircle,
  IN_PROGRESS: Lucide.PlayCircle,
  // Phase C: Acceptance & Handover
  FACULTY_ACCEPTANCE_REVIEW: Lucide.ClipboardCheck,
  SCHOOL_ACCEPTANCE_REVIEW: Lucide.ShieldCheck,
  HANDOVER: Lucide.Package,
  COMPLETED: Lucide.CheckCircle2,
  // Exception states
  PAUSED: Lucide.PauseCircle,
  CANCELLED: Lucide.XCircle,
  REJECTED: Lucide.Ban,
  WITHDRAWN: Lucide.FolderMinus
};

// SLA badge icons
const SLA_ICONS = {
  ok: Lucide.Clock,           // ⏳ Còn X ngày
  warning: Lucide.AlertTriangle,  // ⚠️ T-2
  overdue: Lucide.AlertCircle      // ⛔ Quá hạn X ngày
};
```

---

*Developer Guardrails Checklist locked by Coc on 2026-01-02*

---

## Final Consistency Fixes (5 Gaps Closed)

**Reviewer:** Coc
**Date:** 2026-01-02
**Purpose:** Loại bỏ mâu thuẫn còn sót để spec "đóng kín" trước khi bàn giao dev

---

### Gap 1: "Template Engine" Terminology

**Vấn đề:** Spec chốt "PDF từ template engine", sau đó chốt "HTML/CSS + headless" → Dễ hiểu nhầm thành PDFKit/Docx template.

**Quyết định khóa:**

```
"Template engine" = HTML templates (React components) + Print CSS
Render server-side → Playwright/Puppeteer headless → PDF export
KHÔNG dùng PDFKit/Docx template riêng biệt
```

**Language chuẩn (dùng trong toàn spec):**

| Thuật ngữ | Định nghĩa | KHÔNG được hiểu là |
|-----------|-----------|-------------------|
| **Template engine** | HTML templates (React) + Print CSS + Playwright export | PDFKit/Docx/JasperReports |
| **PDF export** | Render HTML → headless browser → PDF | Direct PDF generation |
| **Print CSS** | CSS `@media print` controls layout/pagination | Separate template file |

**Code comment chuẩn (cho dev):**

```typescript
/**
 * PDF Export via Playwright
 * Template = React component + Print CSS
 * Render → HTML string → Playwright → PDF
 * NOT: PDFKit, Docx, or separate template engine
 */
async function exportPDF(projectId: string) {
  // ...
}
```

---

### Gap 2: SLA Working Days — Standardized Rule

**Vấn đề:** Spec nói "exclude Sunday" chỗ khác, chốt "Mon–Fri (Sat/Sun non-working)" chỗ khác → Lẽ dễ gây bug.

**Quyết định khóa (DUY NHẤT):**

```
Mon–Fri = working days (default)
Sat–Sun = non-working days (default)
Override via business_calendar (is_working_day)
KHÔNG dùng thuật ngữ "exclude Sunday" — gây confusion
```

**Spec language update (replace tất cả occurrences):**

| Cũ (KHÔNG dùng) | Mới (Dùng) |
|-----------------|-----------|
| "exclude Sunday" | "Mon–Fri working, Sat–Sun non-working (default)" |
| "loại Chủ nhật" | "Sat–Sun non-working (default)" |

**Function comment chuẩn:**

```typescript
/**
 * Check if date is a working day
 *
 * Rules:
 * - Mon–Fri: working (default)
 * - Sat–Sun: non-working (default)
 * - Override: business_calendar.is_working_day wins
 *
 * @param date - Date to check
 * @param calendar - Business calendar overrides
 * @returns true if working day, false otherwise
 */
function isWorkingDay(date: Date, calendar: BusinessCalendar[]): boolean;
```

---

### Gap 3: File Size Limit — Consistent Across System

**Vấn đề:** Error matrix nói "10MB", các chỗ khác nói "50MB" → Không nhất quán.

**Quyết định khóa:**

```
File size limit MVP: 50MB per file
Total attachments limit: 500MB per project
```

**Consistent values across all touchpoints:**

| Context | Limit | UI Message |
|---------|-------|------------|
| **Upload validation (client)** | 50MB per file | "File tối đa 50MB. File quá lớn sẽ bị từ chối." |
| **Upload validation (server)** | 50MB per file | HTTP 413 nếu vượt |
| **Import Excel** | 50MB per file | "File quá 50MB. Vui lòng chia nhỏ." |
| **PDF attachment limit** | 50MB per attachment | — |
| **Project total** | 500MB all attachments | Warning khi vượt 80% |

**Validation code:**

```typescript
const FILE_LIMIT_MB = 50;
const FILE_LIMIT_BYTES = FILE_LIMIT_MB * 1024 * 1024;

function validateFileSize(file: File): ValidationResult {
  if (file.size > FILE_LIMIT_BYTES) {
    return {
      valid: false,
      message: `File "${file.name}" quá ${FILE_LIMIT_MB}MB. Vui lòng nén hoặc chia nhỏ.`
    };
  }
  return { valid: true };
}
```

---

### Gap 4: "Đã sửa section" Detection Criteria (MVP)

**Vấn đề:** DoD nói "edited ≥1 section" nhưng không có tiêu chí kỹ thuật đo.

**Quyết định khóa (MVP — Checkbox approach):**

```
MVP: Checkbox "Đã sửa" cho từng section trong revision list
User BẮTẮC tick ít nhất 1 checkbox + submit
System ghi revision_resolutions[] = { section_id, resolved_at, resolved_by }
```

**UI Flow:**

```
┌─────────────────────────────────────────────────┐
│ Các phần cần sửa:                                │
│                                                 │
│ ☐ Phương pháp nghiên cứu    [Đã sửa]          │
│ ☐ Kinh phí                   [Đã sửa]          │
│ ☐ Tài liệu đính kèm          [Đã sửa]          │
│                                                 │
│ [Nộp lại]  (chỉ enabled khi ≥1 checkbox tick)  │
└─────────────────────────────────────────────────┘
```

**Schema:**

```typescript
interface RevisionRequest {
  id: string;
  project_id: string;
  template_version: string;
  section_id: string;  // Canonical ID
  note: string;
  created_by: string;
  created_at: Date;
}

interface RevisionResolution {
  id: string;
  revision_request_id: string;
  section_id: string;
  resolved_at: Date;
  resolved_by: string;
  // MVP: KHÔNG cần hash/phát hiện thay đổi dữ liệu
  // User tự tick checkbox = xác nhận đã sửa
}

// DoD update
function isResubmitValid(projectId: string): boolean {
  const resolutions = getRevisionResolutions(projectId);
  return resolutions.length >= 1;  // At least 1 section marked resolved
}
```

**Growth (optional — hash detection):**

```
Phase 2: Tự động phát hiện thay đổi dữ liệu
- section_hash = hash(form_data[section_id])
- So sánh hash trước/sau để auto-tick checkbox
- User vẫn có thể override manual
```

---

### Gap 5: "One Primary Action" — Deterministic Rules

**Vấn đề:** Spec chốt "Approve = primary, Return = secondary" nhưng chưa nói khi chỉ có Return hợp lệ → Cần rule dứt khoát.

**Quyết định khóa (Decision Table):**

```typescript
interface ActionPanelConfig {
  primary: Action | null;   // null = no valid primary action
  secondary: Action[];      // Empty hoặc có items
}

function getActionPanelConfig(state: ProjectState, role: UserRole): ActionPanelConfig {
  // Rule 1: Nếu chỉ có 1 action hợp lệ → đó là Primary
  const validActions = getPossibleActions(state, role);

  if (validActions.length === 0) {
    return {
      primary: null,
      secondary: [],
      message: 'Bạn đang chờ bên kia xử lý'
    };
  }

  if (validActions.length === 1) {
    const action = validActions[0];
    return {
      primary: action,
      secondary: [],
      message: undefined
    };
  }

  // Rule 2: Nếu có 2+ actions → chọn Primary theo ưu tiên
  const primaryPriority = ['APPROVE', 'SUBMIT', 'ASSIGN', 'RATE_AND_SUBMIT'];
  const primaryAction = validActions.find(a => primaryPriority.includes(a.action));
  const secondaryActions = validActions.filter(a => a !== primaryAction);

  return {
    primary: primaryAction || validActions[0],
    secondary: secondaryActions,
    message: undefined
  };
}
```

**Deterministic Table (cho QA test):**

| State | Role | Valid Actions | Primary | Secondary |
|-------|------|---------------|---------|-----------|
| `DRAFT` | `PROJECT_OWNER` | SUBMIT | SUBMIT | — |
| `FACULTY_REVIEW` | `QUAN_LY_KHOA` | APPROVE, RETURN | APPROVE | RETURN (destructive) |
| `SCHOOL_SELECTION_REVIEW` | `PHONG_KHCN` | APPROVE, RETURN | APPROVE | RETURN (destructive) |
| `OUTLINE_COUNCIL_REVIEW` | `THU_KY_HOI_DONG` | RATE_AND_SUBMIT | RATE_AND_SUBMIT | — |
| `CHANGES_REQUESTED` | `PROJECT_OWNER` | RESUBMIT | RESUBMIT | — |
| `APPROVED` | `PROJECT_OWNER` | START_PROJECT | START_PROJECT | — |
| `IN_PROGRESS` | `PROJECT_OWNER` | REQUEST_PAUSE, SUBMIT_ACCEPTANCE | SUBMIT_ACCEPTANCE | REQUEST_PAUSE |
| `FACULTY_ACCEPTANCE_REVIEW` | `THU_KY_HOI_DONG` | RATE_AND_SUBMIT | RATE_AND_SUBMIT | — |
| `SCHOOL_ACCEPTANCE_REVIEW` | `THU_KY_HOI_DONG` | RATE_AND_SUBMIT | RATE_AND_SUBMIT | — |
| `PAUSED` | `PHONG_KHCN` | RESUME | RESUME | — |
| `HANDOVER` | `PROJECT_OWNER` | COMPLETE | COMPLETE | — |

**QA Test Criteria:**

```
Test 1: Single action available
  Given: state=DRAFT, role=PROJECT_OWNER
  Then: Exactly 1 button visible (Nộp hồ sơ)
  And: No secondary actions

Test 2: Dual actions available
  Given: state=FACULTY_REVIEW, role=FACULTY_REVIEWER
  Then: Primary button = Duyệt hồ sơ
  And: Secondary link = Yêu cầu sửa (destructive)
  And: Clicking secondary opens dialog with reason code

Test 3: No actions available
  Given: state=FACULTY_REVIEW, role=PROJECT_OWNER
  Then: No primary button
  And: Message "Bạn đang chờ Khoa duyệt"
```

---

### Summary Table (For Quick Reference)

| # | Gap | Fix | Impact |
|---|-----|-----|--------|
| **1** | "Template engine" terminology | Define = HTML + Print CSS + Playwright; NOT PDFKit/Docx | Tránh dev hiểu nhầm |
| **2** | SLA "exclude Sun" vs "Mon–Fri" | Standardize: Mon–Fri working, Sat–Sun non-working; override via calendar | Tránh bug calendar |
| **3** | File limit 10MB vs 50MB | Chốt 50MB per file, 500MB per project | Consistent validation |
| **4** | "Đã sửa section" detection | MVP: checkbox user tick; ≥1 tick = valid resubmit | Clear DoD criteria |
| **5** | Primary action edge cases | Decision table + QA test criteria | Deterministic UI behavior |

---

*Final consistency fixes locked by Coc on 2026-01-02*

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Submit ONCE = Finalize** | Draft evaluation cho phép sửa, Finalize khóa vĩnh viễn |
| 2 | **Revision = Section-level** | Theo Canonical Section IDs (không field-level trong MVP) |
| 3 | **Attachments MVP** | Preserve + replace có điều kiện (chỉ file được yêu cầu) |
| 4 | **holder_user policy** | Mandatory ở COUNCIL secretary + EXPERT reviewer; optional elsewhere; T+2 escalation tạo action item PKHCN |
| 5 | **Bulk Safety Bundle** | Preview + dry-run + template locked + rate limit + job progress + audit snapshot |

---
