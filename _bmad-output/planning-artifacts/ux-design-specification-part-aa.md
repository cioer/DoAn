---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments: [
  "_bmad-output/prd-nckh-system.md",
  "_bmad-output/planning-artifacts/research/technical-rbac-workflow-audit-research-2026-01-02.md",
  "_bmad-output/analysis/brainstorming-session-2026-01-02.md",
  "_bmad-output/tech-spec-nckh-system.md"
]
workflowType: 'ux-design'
lastStep: 14
workflowStatus: 'complete'
completedDate: '2026-01-02'
lastUpdatedDate: '2026-01-02'
user_name: Coc
date: '2026-01-02'
project_name: DoAn
---

# UX Design Specification DoAn

**Version:** 1.2
**Author:** Coc
**Date:** 2026-01-03
**Status:** ALIGNED WITH TECH-SPEC v2.1

**Changelog:**
- v1.2 (2026-01-03): **P2 ICON CONVENTION** - Added standardized icon library reference using lucide-react with complete icon mapping for all states, actions, navigation, and UI elements; added icon size standards and wrapper component
- v1.1 (2026-01-02): **ALIGNED WITH TECH-SPEC v1.9** - Updated state machine to 16 canonical states, removed EXPERT_REVIEW/BGH_APPROVAL, renamed REVISION_REQUIRED→CHANGES_REQUESTED, updated state icons, action matrix, and all code examples
- v1.0 (2026-01-02): Initial UX specification with 14 steps complete

---

## Executive Summary

### Project Vision

Hệ thống Quản lý Nghiên cứu Khoa học - Đại học Sư phạm Kỹ thuật Nam Định - biến quy trình từ Excel + email rời rạc thành hệ thống có trạng thái với:

- **Workflow state machine 16 states** (v1.9):
  - Phase A: DRAFT → SUBMITTED → FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW
  - Phase B: CHANGES_REQUESTED (editable by PI) → APPROVED → IN_PROGRESS
  - Phase C: FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW → HANDOVER → COMPLETED
  - Exception: PAUSED, CANCELLED, REJECTED, WITHDRAWN
- RBAC Engine: Role + State + Action authorization cho 7 vai trò chính
- 100% hồ sơ luôn có holder + state rõ ràng (không bao giờ "không biết hồ sơ ở đâu")
- Audit trail với reason codes (compliance-ready)

### Target Users

| Vai trò | Mức độ kỹ thuật | Nhu cầu chính |
|---------|-----------------|---------------|
| **Giảng viên** | Thấp/Không đồng đều | UI đơn giản, timeline rõ ràng, resubmit không mất context |
| **Quản lý Khoa** | Thấp/Không đồng đều | UI đơn giản, review queue, báo cáo theo khoa |
| **Phòng KHCN** | Trung bình (quen Excel) | Dashboard aggregate, overdue detection, bulk actions, Excel export |
| **Hội đồng/Thẩm định** | Trung bình | Form đánh giá, submit ONCE, read-only sau submit |
| **BGH** | Thấp | Dashboard tổng quan read-only, drill-down, mobile-friendly |
| **Admin** | Cao | System health, import/export, reconciliation, user management |

**Primary Devices:** Desktop/Laptop (trong giờ hành chính)
**Mobile:** Chỉ BGH dashboard read-only (xem nhanh)

### Key Design Challenges

1. **Terminology Mapping:** Kỹ thuật → Nghiệp vụ ("SCHOOL_SELECTION_REVIEW" → "Xét chọn sơ bộ", "OUTLINE_COUNCIL_REVIEW" → "HĐ tư vấn đề cương")
2. **Empty State → Next Action:** Mỗi role mở vào phải có "My Action Items"/queue rõ ràng
3. **Return/Revision UX:** Màn hình "yêu cầu sửa" (CHANGES_REQUESTED) phải chỉ ra cần sửa mục nào + nút resubmit rõ ràng
4. **Context Preservation:** Resubmit KHÔNG mất form data (P1.4: return_to_state rule)
5. **Holder Transparency:** 100% hồ sơ luôn hiển thị holder_unit + holder_user
6. **SLA Visualization:** Working days (Thứ 2-6) + holidays → business-friendly display
7. **2-tier Acceptance:** Faculty acceptance MANDATORY before School acceptance

### Design Opportunities

1. **State Transparency:** "Tôi biết ngay hồ sơ đang ở đâu, ai giữ, bao lâu rồi" - không cần gọi điện
2. **One-click Actions:** PKHCN 1 click ra danh sách quá hạn + gửi email nhắc
3. **Visual Timeline:** Giảng viên thấy timeline chính xác (bước nào, cần sửa gì, deadline)
4. **Resubmit Without Penalty:** Chỉ sửa phần cần thiết, không điền lại từ đầu
5. **BGH 5-minute Dashboard:** 5 phút biết hết tình hình trường, click-through read-only
6. **Business-friendly SLA:** "3 ngày làm việc" thay raw timestamp

---

## Core User Experience

### Defining the Experience

**Core Action: "Open → See → Do (in < 10s)"**

Every login must deliver:

- **Open:** dashboard loads < 3s
- **See:** State + Holder + SLA (working days)
- **Do:** one primary action per role/state (Approve/Return/Assign/Submit)

**Anti-pattern:** 3+ clicks/screens to complete one task.

### Core Action per Persona

| Persona | Open → See | Primary "Do" |
|----------|-----------|--------------|
| **Giảng viên** | My Projects: state + holder + SLA | Submit / Resubmit / View timeline |
| **Quản lý Khoa** | Faculty Queue: pending approvals + SLA | Approve / Return / View faculty report |
| **PKHCN** | School overview: aggregate + overdue | Assign / Bulk remind / Export Excel |
| **Hội đồng/Thẩm định** | Review queue: proposals awaiting evaluation | Evaluate + Submit ONCE |
| **BGH** | KPI overview + drill-down | Drill-down read-only |
| **Admin** | System health + errors | Import / Export / Reconcile |

### Platform Strategy

| Role scope | Platform | Constraint |
|------------|----------|------------|
| **All roles** | Desktop-first (mouse/keyboard) | Full functionality |
| **BGH only** | Mobile read-only | Tối đa 3 screens: Overview → Faculty drill-down → Proposal detail |

### Effortless Interactions

| # | Interaction | Effortless UX requirement |
|---|-------------|---------------------------|
| 1 | Tìm trạng thái | Mở dashboard → thấy holder + state + SLA ngay |
| 2 | Nộp hồ sơ | Auto-fill profile + one-time entry |
| 3 | Resubmit | Preserve form data, chỉ sửa phần cần sửa |
| 4 | Xuất báo cáo | 1 click → download Excel |
| 5 | Nhắc hạn | Auto T-2/T0/T+2 + 1 click bulk email |
| 6 | Default filters | "Của tôi", "Đang chờ tôi", "Quá hạn", "T-2" |
| 7 | Deep link | Email/notification → đúng hồ sơ + action panel |

### Critical Success Moments

| Moment | Success definition | Required UI blocks |
|--------|-------------------|---------------------|
| "Tôi thấy ngay việc của tôi" | First login → My Action Items/Queue rõ ràng | Queue widget, primary action button |
| "Tôi biết ai đang giữ và deadline" | Submit → confirm state + holder + SLA ngay | Status card, timeline, confirmation toast |
| "Tôi biết phải sửa mục nào + resubmit 1 lần" | Returned → chỉ ra section cần sửa + resubmit không mất context | Revision panel, highlight sections, resubmit CTA |
| "30 giây có bức tranh toàn trường" | PKHCN morning check → aggregate + overdue + actionable | KPI cards, overdue list, quick actions |

### Experience Principles

1. **State First, Always** — Trạng thái hiển thị đầu tiên, không bao giờ ẩn.
2. **Next Action, Not Navigation** — Mỗi màn hình trả lời: "Tôi cần làm gì tiếp theo?".
3. **Never Lose Context** — Resubmit không mất data; timeline đầy đủ.
4. **Business Terminology, Not Technical** — "Xét chọn sơ bộ", "HĐ tư vấn đề cương", "Nghiệm thu", không technical state names.
5. **No Empty Holder** — 100% hồ sơ hiển thị holder (unit bắt buộc, user nếu có).

### Primary Screen Flow

```
Dashboard (Landing)
    ↓
Queue / Action Items (default filters by role)
    ↓
Proposal Detail
    ↓
Action Panel (single primary action)
```

### Blind Spots (Locked Resolutions)

| # | Blind spot | Locked resolution |
|---|------------|-------------------|
| 1 | Queue ownership logic | "Đang chờ tôi" = holder_unit (mandatory). holder_user chỉ là optional assignment. |
| 2 | Returned UX granularity | MVP dùng section-level + field changed indicator (badge/border). Không cần validation sâu/phức tạp. |
| 3 | Read-only boundary | Sau "submit ONCE": form đánh giá read-only; proposal data read-only trừ khi state = CHANGES_REQUESTED. |

**Queue Ownership (Locked):**
- "Đang chờ tôi" dựa trên holder_unit (hiển thị chính).
- holder_user hiển thị phụ (ví dụ: "Thư ký: Nguyễn Văn A").

**Returned UX (Locked):**
- Highlight sections cần sửa.
- Field changed indicator (badge/border) để định vị nhanh.
- MVP không cần "độ sâu enterprise" cho validation messaging.

**Read-only Boundary (Locked):**
- Sau submit ONCE: evaluation form read-only.
- Proposal data read-only trừ khi CHANGES_REQUESTED.

---

## Desired Emotional Response

### Core Emotional Goals (Target Feelings)

**North Star Emotion: Control & Confidence**

User phải cảm thấy "mình đang nắm tình hình, biết việc cần làm, và tin rằng hệ thống không làm thất lạc hồ sơ."

| Pain (Today) | Gain (Target) | Meaning in this system |
|---------------|---------------|----------------------|
| Lo lắng vì "không biết hồ sơ ở đâu" | Confidence | State/Holder/SLA luôn rõ ràng |
| Phiền vì phải gọi điện hỏi | Autonomy | Tự tra cứu, tự hành động được |
| Áp lực vì sợ mất dữ liệu khi sửa | Safety | Resubmit giữ context, chỉ sửa phần cần sửa |
| Mệt vì tổng hợp Excel thủ công | Efficiency | 1 click ra báo cáo, 30s biết toàn trường |

**Emotion priorities (must win):** Confidence + Trust + Control
**Must avoid:** Confusion + Anxiety + Frustration

### Emotional Journey Map (Moments that Matter)

| Stage | User should feel | UX trigger (minimum) |
|-------|-----------------|----------------------|
| **First login** | "Tôi biết việc của tôi" | My Action Items + default filters |
| **Core action (Open→See→Do)** | "Tôi đang làm đúng việc" | Single primary action + clear labels |
| **After submit** | "Tôi biết chuyện gì sẽ xảy ra" | Confirmation: state + holder + SLA |
| **Returned / Revision** | "Tôi biết sửa gì và không mất công vô ích" | Section highlight + resubmit CTA + preserve data |
| **PKHCN morning check** | "Tôi nắm toàn trường" | KPI + overdue list + actionable shortcuts |
| **Error / failure** | "Tôi biết vì sao và bước tiếp theo" | Error message + next action (retry / fix file / contact admin) |

### Micro-Emotions (Operational UX Targets)

| Micro-emotion | Priority | UX mechanism (how we cause it) |
|---------------|----------|-------------------------------|
| **Confidence** | Highest | State First + No Empty Holder + SLA in working days |
| **Trust** | Highest | Audit evidence + reason codes + read-only boundaries |
| **Control** | Highest | My Action Items + deep links + predictable actions |
| **Anxiety** | Avoid | T-2 reminder + clear countdown ("còn X ngày làm việc") |
| **Confusion** | Avoid | Business terminology + one primary action |
| **Frustration** | Avoid | Auto-fill + defaults + < 3 screens per task |

### Emotion → UX Contract (Design Implications)

| Emotion target | UI/UX requirement | Acceptance check (MVP) |
|----------------|------------------|------------------------|
| **Confidence** | State + Holder + SLA visible without digging | On dashboard + detail: always present, never blank |
| **Trust** | Reason code visible on timeline; evaluation submit ONCE becomes read-only | After submit ONCE: cannot edit; audit entry exists |
| **Control** | "My Action Items" is the landing anchor; deep link lands on action panel | Link from email opens correct proposal + action panel |
| **Low anxiety** | SLA displayed as working days + T-2 reminders; overdue clearly highlighted | User can tell in < 5s: "còn mấy ngày / quá hạn mấy ngày" |
| **No confusion** | Labels are business-first (Vietnamese) not technical state names | User test: 80% understand state label without training |
| **Low frustration** | Defaults + auto-fill + bulk actions where needed (PKHCN) | Common tasks finish in < 10s Open→See→Do |

### Emotional Design Principles (Locked)

1. **"Nhìn là nắm"** — State + Holder + SLA hiển thị ngay ở dashboard và detail.
2. **"Không để user đoán"** — Mỗi màn hình chỉ 1 primary action hợp lệ theo role/state.
3. **"Không mất công vô ích"** — Revision chỉ ra cần sửa gì, resubmit giữ context.
4. **"Không bất ngờ"** — SLA theo ngày làm việc; nhắc hạn T-2/T0/T+2 (async).
5. **"Không powerlessness"** — Deep link đưa thẳng đến đúng hồ sơ + action panel; boundary read-only rõ ràng.

### Blind Spots (Locked Resolutions - Emotional)

| # | Blind spot | Locked resolution |
|---|------------|-------------------|
| 1 | **Over-communication risk** | Chỉ gửi email khi hồ sơ đang ở holder_unit liên quan + throttle theo ngày. |
| 2 | **Conflict: Control vs Locking** | UX phải show: "Đã nộp đánh giá lúc … bởi …, muốn chỉnh sửa phải … (PKHCN return/reopen)". |
| 3 | **Error UX = Trust killer** | Import Excel lỗi phải rõ: "file thiếu cột X", "dòng Y lỗi", tải về file lỗi. |

**Notification Throttling (Locked):**
- Chỉ gửi khi holder_unit liên quan đến user.
- Throttle: tối đa 1 email/ngày/user cho các reminder giống nhau.

**Read-only Explanation UX (Locked):**
- Sau submit ONCE: hiển thị clearly "Đã nộp, không thể chỉnh sửa".
- Provide escape hatch info: "Liên hệ PKHCN để return/reopen nếu cần".

**Error UX Requirements (Locked):**
- Import Excel: trả về file lỗi với dòng bị lỗi đánh dấu.
- Message rõ ràng: "Cột X thiếu", "Dòng Y: định dạng sai".
- User có thể tải về file lỗi để sửa và re-import.

---

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

| Category | Product | UX Strengths | Relevance to NCKH |
|----------|----------|--------------|-------------------|
| **Email/Communication** | Gmail, Outlook | Thread view, state badge, deep link from notification | Timeline visualization, notification → deep link |
| **Document Management** | Google Drive, OneDrive | File state, version history, sharing clear | Audit trail, document generation tracking |
| **Workflow/Approval** | Jira, ServiceNow | State machine UI, approval flow, bulk action | Workflow state visualization, PKHCN bulk actions |
| **Public Services (VN)** | Cổng DVCQG, Thuế điện tử | Workflow state, dashboard, clear status | Vietnamese users familiar with gov-style workflow |
| **Education** | Moodle, Canvas | Assignment submission, grading, feedback | Giảng viên familiar với submission/feedback flow |

### Transferable UX Patterns

| Pattern | Source | Apply to NCKH as |
|---------|--------|------------------|
| **Thread view** | Gmail | Workflow timeline hiển thị history theo chiều dọc |
| **State badge** | Jira/Trello | Status badge với color coding (đỏ = overdue, xanh = OK) |
| **Bulk action checkbox** | Gmail/Outlook | PKHCN bulk approve/bulk remind |
| **Deep link from email** | Gmail notifications | Email link → đúng proposal + action panel |
| **Version history** | Google Docs | Audit trail hiển thị timeline với reason codes |
| **Read-only mode indicator** | Google Sheets (view-only) | Sau submit ONCE → banner "Đã nộp, chỉ xem" + escape hatch |
| **Toast notification** | Modern web apps | Confirmation toast thay vì modal spam |
| **High-contrast primary button** | Gov websites | Primary action button nổi bật, secondary action mờ hơn |

### Anti-Patterns to Avoid (Context Việt Nam)

| Anti-pattern | Why avoid? | Replacement |
|--------------|------------|-------------|
| **Modal spam** | Users VN thích "làm nhanh", modal chặn view gây ức chế | Toast/slide-in notification |
| **Technical error messages** | "Error 500" → user không hiểu | "Không thể nộp. Vui lòng thử lại hoặc liên hệ PKHCN" |
| **Hamburger menu (desktop)** | Giảng viên không tìm thấy | Visible navigation sidebar |
| **Small click targets (< 44px)** | Khó click, sai sót | Minimum 44x44px |
| **Dark mode default** | Governance app → cần clarity, not cool | Light mode default, high contrast |
| **Hidden secondary actions** | User không biết có tồn tại | Show all actions, gray out disabled ones |

### Design Inspiration Strategy

**What to Adopt:**
- Thread view timeline (Gmail) → Workflow history
- State badge with color (Jira) → Status visualization
- Bulk action pattern (Gmail) → PKHCN bulk operations
- Toast notification (Modern web) → Confirmation messages

**What to Adapt:**
- Jira workflow → Simplify cho giảng viên (fewer states visible)
- Gov website style → Modernize nhưng giữ clarity
- Google Docs version history → Add reason codes (compliance)

**What to Avoid:**
- Modal spam → Use toast/slide-in
- Technical jargon in UI → Business terminology only
- Hidden navigation → Visible sidebar
- Small buttons → Minimum 44x44px

---

## Design System Foundation

### Design System Choice (Locked)

**shadcn/ui + Tailwind CSS** (như Tech Spec đã chốt)

### Rationale for Selection

| Factor | Reason |
|--------|--------|
| **Tech Stack Alignment** | Next.js + Tailwind là combination phổ biến, performance tốt |
| **Accessibility** | shadcn/ui built on Radix UI → a11y compliance sẵn có (WCAG 2.1 AA) |
| **Customization** | Tailwind utility-first → dễ tweak theo brand của trường |
| **Vietnamese Context** | shadcn/ui neutral, không giống Google/Material → dễ localize |
| **Component Quality** | Modern, clean, phù hợp governance/admin apps |
| **Development Speed** | Copy-paste components vào project → nhanh MVP |
| **Community Support** | Large community, rich documentation |

### Implementation Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    Design Tokens (Tailwind config)           │
│  - Colors (primary, secondary, status colors)               │
│  - Typography (font sizes, line heights)                    │
│  - Spacing (scale 4px base)                                │
│  - Border radius, shadows                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Base Components (shadcn/ui)                │
│  - Button, Input, Select, Dialog, Table                    │
│  - Card, Badge, Avatar, Dropdown, Sheet                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Custom Components (NCKH-specific)               │
│  - WorkflowTimeline, StatusCard, ActionPanel               │
│  - SLABadge, RevisionPanel, BulkActions                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Pages / Screens                        │
│  - Dashboard (5 role variants)                              │
│  - Project Detail, Queue, Forms                            │
└─────────────────────────────────────────────────────────────┘
```

### Customization Strategy

**1. Design Tokens (Tailwind config extension)**

```javascript
// tailwind.config.js - Custom tokens for NCKH
module.exports = {
  theme: {
    extend: {
      colors: {
        // Status colors (business-friendly)
        status: {
          ok: 'var(--color-status-ok)',      // Xanh lá - OK, trong SLA
          warning: 'var(--color-status-warning)', // Vàng - Sắp hạn
          overdue: 'var(--color-status-overdue)', // Đỏ - Quá hạn
          info: 'var(--color-status-info)',    // Xanh dương - Informational
        },
        // Brand colors (Đại học Sư phạm Kỹ thuật Nam Định)
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Hoặc font VN-friendly
      },
    },
  },
}
```

**2. Component Standards**

| Component | Base (shadcn) | Custom props | Usage |
|-----------|---------------|--------------|-------|
| **Button** | Button | `variant="primary/secondary/ghost"` | Primary action nổi bật |
| **Badge** | Badge | `status="ok/warning/overdue"` | Status indicator |
| **Card** | Card | `collapsible`, `elevated` | Dashboard cards |
| **Table** | Table | `selectable`, `bulk-actions` | PKHCN queues |
| **Dialog** | Dialog | `size="sm/md/lg"` | Forms, confirmations |
| **Sheet** | Sheet (side-drawer) | `side="right"` | Action panels |
| **Toast** | Toast (Sonner) | `variant="success/error/info"` | Confirmations |

**3. Custom Components Specification**

| Component | Props | Behavior |
|-----------|-------|----------|
| **WorkflowTimeline** | `steps`, `currentStep`, `clickable` | Vertical timeline, clickable steps |
| **StatusCard** | `state`, `holder`, `sla` | Compact state display |
| **ActionPanel** | `actions[]`, `role`, `state` | Single primary action + disabled secondary |
| **SLABadge** | `daysRemaining`, `isOverdue` | "Còn X ngày" or "Quá hạn X ngày" |
| **RevisionPanel** | `sections[]`, `highlights[]` | Section-level highlight |
| **BulkActions** | `selectedIds[]`, `actions[]` | Checkbox + bulk actions bar |

### Accessibility Requirements (Locked)

| Requirement | Implementation | Acceptance check |
|-------------|----------------|------------------|
| **Keyboard navigation** | Tab order logical, Enter/Space triggers | Full flow navigable via keyboard |
| **Screen reader** | ARIA labels on all interactive elements | NVDA/VoiceOver usable |
| **Color contrast** | WCAG 2.1 AA (4.5:1 minimum) | Automated test pass |
| **Focus indicators** | Visible focus ring (Tailwind `ring`) | Focus always visible |
| **Touch targets** | Minimum 44x44px | All clickable elements ≥44px |

### Mobile Considerations

| Role | Mobile support | Constraints |
|------|----------------|------------|
| **Giảng viên, Khoa, PKHCN, HĐ, Admin** | Not supported in MVP | Desktop only |
| **BGH** | Read-only dashboard | 3 screens max, simplified layout |

---

## Defining Experience (The Core Interaction)

### The Defining Experience

**"Nhìn là biết"** — User opens dashboard and in < 5 seconds, knows exactly:

| Question | Answer visible on UI |
|----------|----------------------|
| Hồ sơ đang ở **ĐÂU**? | State badge (color-coded) |
| **AI** đang giữ? | Holder (unit + user if assigned) |
| Còn bao **NHIÊU** thời gian? | SLA badge ("Còn X ngày" / "Quá hạn X ngày") |
| Cần làm **GÌ** tiếp? | Single primary action button |

This is the ONE interaction that, if nailed, makes everything else follow.

### User Mental Model

| Current Mental Model (Pain) | Desired Mental Model (Gain) |
|-----------------------------|----------------------------|
| "Hồ sơ của tôi đang ở đâu? Tôi phải gọi điện hỏi" | "Mở app là thấy ngay trạng thái" |
| "Sợ nộp bị mất, phải copy lại" | "Đã nộp xong, hệ thống giữ, tôi có thể xem lại" |
| "Sửa bị trả về = điền lại từ đầu" | "Chỉ sửa phần cần sửa, data được preserve" |
| "Tổng hợp báo cáo = mất 2 giờ Excel" | "1 click là xong" |

### Success Criteria (Defining Experience)

| Success Indicator | What it means |
|-------------------|---------------|
| **"5-second rule"** | User knows state + holder + SLA in < 5 seconds when opening dashboard |
| **"One-click action"** | From dashboard → perform primary action ≤ 1 click |
| **"No surprises"** | State transition always has notification + clear next action |
| **"Never lost"** | User NEVER sees "I don't know where the file is" |

### Experience Mechanics - Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIATION: User opens app / clicks notification link   │
│    → Dashboard loads < 3s                                  │
│    → "My Action Items" visible immediately                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. INTERACTION: User sees + does                          │
│    → See: State badge (color coded)                        │
│    → See: Holder (unit + user nếu có)                      │
│    → See: SLA ("Còn X ngày" or "Quá hạn X ngày")          │
│    → Do: Single primary action button (Approve/Return/...) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. FEEDBACK: System confirms                              │
│    → Toast notification "Đã duyệt"                         │
│    → State badge updates immediately                        │
│    → Timeline shows new entry                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. COMPLETION: User knows what's next                     │
│    → "Hồ sơ đã chuyển sang Hội đồng trường"                │
│    → "Email đã gửi đến thư ký HĐ"                          │
│    → Next action available (or "chờ đối phương")           │
└─────────────────────────────────────────────────────────────┘
```

### Novel vs. Established Patterns

| Pattern | Type | Approach |
|---------|------|----------|
| **State badge** | Established | Jira/Trello pattern - color coding users already understand |
| **Thread view timeline** | Established | Gmail pattern - familiar to most users |
| **SLA in working days** | **Novel** | Governance apps rarely show working days - needs education |
| **"My Action Items" as landing** | **Novel** | Most apps use navigation as anchor - we use action items |

**For novel patterns:**
- Use clear labels ("Còn 3 ngày làm việc", not "3 business days remaining")
- Add tooltip: "Thứ 2-6, bỏ chủ nhật & ngày lễ"
- Show calculation: "Deadline: 15/01/2026 (3 ngày làm việc còn lại)"

---

## Visual Design Foundation (v1.1 - Locked)

### Locked Decisions Summary

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **PDF = WYSIWYG** | PDF phải render đúng layout/typography/badge/tables như UI |
| 2 | **PDF from Template Engine** | Design tokens dùng chung cho UI và PDF (không có 2 bộ style) |
| 3 | **Dark mode auto theo OS** | Default = prefers-color-scheme, có toggle Light/Dark/Auto |
| 4 | **Overdue đỏ nhưng giảm bão hòa** | Giữ hue đỏ, giảm saturation, dùng badge/icon/viền (không phủ nền đỏ lớn) |
| 5 | **Badge = icon + chữ** | Status/SLA phải hiểu được khi in trắng đen (màu chỉ là secondary cue) |

### Color System (Neutral-First, No Brand Color)

**Primary (Neutral):** Dùng gray/black cho primary actions thay vì "màu biểu trưng".

**Accent:** Chỉ dùng cho trạng thái và nhấn nhẹ (không phải brand).

#### Semantic Colors (Light/Dark Pairs)

| State | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|------|
| **OK** | `#00875A` | `#36B37E` | Trong SLA, success states |
| **Warning (T-2)** | `#FF991F` | `#FFAB00` | Sắp hạn,需要注意 |
| **Overdue** | `#B5474B` | `#E07A7A` | Quá hạn (đỏ muted) |
| **Overdue (alt)** | `#B84A4F` | `#E58A8A` | Đỏ "chắc" hơn một chút (optional) |
| **Info** | `#0052CC` | `#579DFF` | Informational, neutral |

**Overdue Red Rules (Locked):**
- Giữ hue đỏ, giảm saturation
- Dùng: badge + icon + viền (không phủ nền đỏ lớn)
- Text vẫn rõ ràng, không "hù doạ"

### Typography System

| Element | UI Size | PDF Mapping | Font |
|---------|---------|------------|------|
| **H1** | 28px | 24pt | Be Vietnam Pro / Inter / Roboto |
| **H2** | 24px | 20pt | Be Vietnam Pro / Inter / Roboto |
| **H3** | 20px | 16pt | Be Vietnam Pro / Inter / Roboto |
| **Body** | 15px | 11pt | Be Vietnam Pro / Inter / Roboto |
| **Small** | 13px | 9pt | Be Vietnam Pro / Inter / Roboto |
| **Caption** | 11px | 8pt | Be Vietnam Pro / Inter / Roboto |

**UI & PDF dùng chung scale/tokens.**

**Font Priority:**
1. **Be Vietnam Pro** (VN-friendly, recommended)
2. **Inter** (fallback)
3. **Roboto** (fallback)

### Component Standards (Icon + Text)

#### SLABadge Format

| State | Format |
|-------|--------|
| Trong SLA | ⏳ Còn 2 ngày làm việc |
| T-2 (Cảnh báo) | ⚠️ T-2 (Còn 2 ngày) |
| Quá hạn | ⛔ Quá hạn 3 ngày |

#### StateBadge Format

| State | Format |
|-------|--------|
| Chờ duyệt | 📌 Hội đồng trường |
| Đã duyệt | ✅ Đã duyệt |
| Yêu cầu sửa | ↩️ Yêu cầu sửa |
| Đã hủy | ❌ Đã hủy |

**Badge = icon + chữ (không phụ thuộc màu) — Status/SLA phải hiểu được khi in trắng đen. Màu chỉ là "secondary cue".**

#### P2-1: Standardized Icon Library Reference (NEW)

**P2-1: Icon Library Convention - lucide-react**

All icons MUST come from `lucide-react` library. No custom SVG icons allowed without explicit approval.

```bash
npm install lucide-react
```

**Import Convention:**
```tsx
import { IconName } from 'lucide-react';
```

---

**State Icons (StateBadge)**

| State | Icon Component | Display | Variant |
|-------|---------------|---------|---------|
| `DRAFT` | `FileEdit` | 📝 Nháp | Neutral |
| `FACULTY_REVIEW` | `Building2` | 🏢 Khoa | Blue |
| `SCHOOL_SELECTION_REVIEW` | `Users` | 👥 HĐ Trường | Blue |
| `OUTLINE_COUNCIL_REVIEW` | `ScrollText` | 📜 HĐ KH&ĐT | Blue |
| `CHANGES_REQUESTED` | `ArrowUUpLeft` | ↩️ Yêu cầu sửa | Orange |
| `APPROVED` | `CheckCircle` | ✅ Đã duyệt | Green |
| `IN_PROGRESS` | `PlayCircle` | ▶️ Đang thực hiện | Blue |
| `PAUSED` | `PauseCircle` | ⏸️ Tạm dừng | Yellow |
| `FACULTY_ACCEPTANCE_REVIEW` | `ClipboardCheck` | ✅ NT Khoa | Blue |
| `SCHOOL_ACCEPTANCE_REVIEW` | `Award` | 🏆 NT Trường | Blue |
| `HANDOVER` | `Package` | 📦 Bàn giao | Purple |
| `COMPLETED` | `CheckCircle2` | ✅ Hoàn thành | Green |
| `CANCELLED` | `XCircle` | ❌ Đã hủy | Gray |
| `REJECTED` | `Ban` | ❌ Từ chối | Red |
| `WITHDRAWN` | `RemoveCircle` | ⭕ Đã rút | Gray |

---

**SLA Icons (SLABadge)**

| SLA Status | Icon Component | Display | Variant |
|------------|---------------|---------|---------|
| On Track | `Clock` | ⏰ Còn X ngày | Green |
| T-2 Warning | `AlertTriangle` | ⚠️ T-2 | Yellow |
| Overdue | `AlertOctagon` | ⛔ Quá hạn | Red |
| Paused | `PauseOctagon` | ⏸️ Tạm dừng | Yellow |

---

**Action Icons (ActionPanel Buttons)**

| Action | Icon Component | Usage |
|--------|---------------|-------|
| Submit | `Send` | Nộp đề tài |
| Resubmit | `RotateCw` | Nộp lại |
| Withdraw | `XCircle` | Rút hồ sơ |
| Approve | `Check` | Phê duyệt |
| Request Changes | `MessageSquareWarning` | Yêu cầu sửa |
| Reject | `X` | Từ chối |
| Comment | `MessageCircle` | Bình luận |
| Upload | `Upload` | Upload file |
| Download | `Download` | Tải xuống |
| Print | `Printer` | In |
| Edit | `Pencil` | Chỉnh sửa |
| Delete | `Trash2` | Xóa |
| View | `Eye` | Xem chi tiết |
| History | `History` | Lịch sử |
| Settings | `Settings` | Cài đặt |

---

**Navigation Icons (Sidebar)**

| Item | Icon Component |
|------|---------------|
| Dashboard | `LayoutDashboard` |
| Projects | `FolderOpen` |
| Tasks | `CheckSquare` |
| Documents | `FileText` |
| Users | `Users` |
| Reports | `BarChart` |
| Admin | `Shield` |
| Help | `HelpCircle` |

---

**UI Element Icons**

| Element | Icon Component | Usage |
|---------|---------------|-------|
| Search | `Search` | Search bar |
| Filter | `Filter` | Filter button |
| Sort | `ArrowUpDown` | Sort button |
| Chevron Down | `ChevronDown` | Dropdown expand |
| Chevron Right | `ChevronRight` | Navigation forward |
| Chevron Left | `ChevronLeft` | Navigation back |
| Plus | `Plus` | Add new |
| Minus | `Minus` | Remove |
| External Link | `ExternalLink` | Open in new tab |
| Copy | `Copy` | Copy to clipboard |
| More Vertical | `MoreVertical` | "..." menu |
| Calendar | `Calendar` | Date picker |
| User | `User` | User avatar placeholder |
| Bell | `Bell` | Notifications |
| Log Out | `LogOut` | Logout |

---

**Icon Size Standards**

| Size | Pixels | Usage |
|------|--------|-------|
| XS | 14px | Inline text, compact lists |
| SM | 16px | Buttons, form labels |
| MD | 20px | Table rows, list items (default) |
| LG | 24px | Sidebar, cards |
| XL | 32px | Page headers, hero sections |

**Default Icon Size:** `20px` (MD) for most UI elements.

---

**Icon Component Wrapper (Recommended)**

```tsx
// libs/shared/ui/src/components/Icon/Icon.tsx
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconProps {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export function Icon({ icon: IconComponent, size = 'md', className }: IconProps) {
  return (
    <IconComponent
      size={sizeMap[size]}
      className={cn('shrink-0', className)}
    />
  );
}
```

---

**P2-1: Icon Naming Convention for Source Code**

When referencing icons in code/config, use the exact `lucide-react` component name (PascalCase):

```tsx
// ✅ DO - Use exact lucide-react name
import { CheckCircle, AlertTriangle } from 'lucide-react';

// ❌ DON'T - Use emoji or custom names
const icons = {
  success: '✅',
  warning: '⚠️',
};
```

### Dark Mode Rules (Locked)

| Rule | Implementation |
|------|----------------|
| **Default** | `prefers-color-scheme: light dark` (auto theo OS) |
| **Toggle** | Có switch "Light / Dark / Auto" để tránh người lớn tuổi bị "kẹt" |
| **Contrast** | Ưu tiên text/border rõ, hạn chế nền đậm |
| **Tables** | Header nền khác nhẹ + border rõ để không "tan" |

### PDF Engine Requirements (Locked)

**Contract:** UI tokens = PDF tokens. Không có 2 bộ style.

**Template Engine Requirements:**

| Requirement | Implementation |
|-------------|----------------|
| **Token sync** | Cùng một file tokens (JSON) cho UI và PDF templates |
| **Layout parity** | Template engine hỗ trợ: grid/flex tương đương, repeat table header khi sang trang, controlled page breaks |
| **Asset parity** | Icons (SVG) dùng chung; fonts embed trong PDF (để không lệch máy) |
| **Print theme** | PDF luôn theo "print theme" (nền trắng) dù UI đang dark |

**3 Rủi ro lớn (nếu không khóa sẽ vỡ):**

| # | Risk | Mitigation |
|---|------|------------|
| 1 | "Giống hệt màn hình" + template engine dễ lệch 5–10% spacing/font rendering | Fonts phải embed trong PDF |
| 2 | Timeline/long tables: nếu không có repeat header + page break rules | Template engine phải hỗ trợ controlled page breaks |
| 3 | Dark mode vs PDF | PDF phải luôn theo "print theme" (nền trắng) dù UI đang dark |

### Spacing & Layout Foundation

```
Base unit: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96
```

| Spacing | Usage |
|---------|-------|
| `4px` | Icon padding, tight gaps |
| `8px` | Button padding, small gaps |
| `12px` | Compact spacing |
| `16px` | Card padding, standard gaps |
| `24px` | Section spacing |
| `32px` | Component gaps |
| `48px+` | Major sections |

**Grid System:** 12-column grid, 1200px max content width, centered

### Accessibility Compliance

All color combinations must pass WCAG 2.1 AA (4.5:1 contrast minimum). The icon + text badge format ensures status is readable even in grayscale.

---

## Design Direction Decision (Locked)

### Chosen Direction: C (Hybrid Balanced) with Per-Role Density

**Decision:** Direction C (Hybrid Balanced) làm default cho tất cả roles, với "density mode" bật theo role.

**Rationale:**
- Direction A thuần → PKHCN chậm và khó "morning check"
- Direction B thuần → Giảng viên/BGH rối và tăng ticket
- Hybrid + per-role density là cách duy nhất đạt "Open → See → Do < 10s" cho mọi nhóm

### Per-Role Density Modes (Locked)

| Role | Density Mode | Description |
|------|--------------|-------------|
| **Giảng viên** | Comfort (A-mode) | Nhiều whitespace, 1 primary action, đọc nhanh |
| **BGH** | Comfort (A-mode) | Minimalist, easy to scan |
| **PKHCN** | Compact (B-mode) | Table-heavy, bulk-first, information dense |
| **Admin** | Compact (B-mode) | Table-heavy, aggregate-focused |
| **Quản lý Khoa** | Balanced (C chuẩn) | Giữa comfort và compact, hơi nghiêng dense |
| **Thư ký HĐ** | Balanced (C chuẩn) | Giữa comfort và compact, hơi nghiêng dense |

### Direction C - Layout Rules (Locked)

#### Global Layout

| Element | Specification |
|---------|----------------|
| **Sidebar** | Left, collapsible, luôn icon + chữ (không hamburger trên desktop) |
| **Top bar** | Search (optional), user menu, toggle Auto/Light/Dark |
| **Content** | Grid 12 cột, max-width theo breakpoint; card + table mixed |
| **State-first header** | Luôn có StatusCard ở "top-left of content" (mobile: full width) |

#### Density Mode Specifications

| Property | Comfort (A-mode) | Compact (B-mode) | Balanced (C-mode) |
|----------|------------------|-----------------|-------------------|
| **Padding** | 16–20px | 12–16px | 14–18px |
| **Row height** | 44px | 36–40px | 40px |
| **Border usage** | Ít border | Nhiều border | Balance |
| **Visual style** | Airy, elevation | Table-first, flat | Card + table mixed |

### Wireframe 1 — Dashboard Landing (Per Role)

#### A. Giảng viên (Comfort Mode)

**Row 1 (2/3 + 1/3):**

| Section | Content |
|---------|---------|
| **My Action Items** (2/3) | Tabs: "Đang chờ tôi" \| "T-2" \| "Quá hạn" \| "Của tôi"<br>List item each row:<br>• [StateBadge icon+text] + proposal title<br>• Holder (unit + user nếu có)<br>• SLABadge (icon+text)<br>• Primary action button (1 nút duy nhất): Nộp, Nộp lại, Xem yêu cầu sửa |
| **Quick Stats** (1/3) | "Đang xử lý", "T-2", "Quá hạn", "Đang ACTIVE", "Đã hoàn thành" |

**Row 2:**

| Section | Content |
|---------|---------|
| **My Projects Table/Card** | Columns tối thiểu: Mã / Tên / Trạng thái / SLA / Holder / Hành động |

#### B. PKHCN (Compact Mode)

**Row 1:**

| Section | Content |
|---------|---------|
| **School Overview KPIs** | 4 cards nhỏ (compact) |
| **Overdue Table** | Full width, table-first<br>Bulk actions: Checkboxes + Assign holder_user + Gửi email nhắc + Xuất Excel |

**Row 2:**

| Section | Content |
|---------|---------|
| **Queues by Stage** | Tabs: Khoa \| HĐ \| Thẩm định \| Chờ BGH \| Nghiệm thu<br>Mỗi tab là table có SLA column rõ |

#### C. BGH (Mobile Read-Only)

**3 screens (locked):**

| Screen | Content |
|--------|---------|
| **1. Overview KPIs** | Aggregate stats, drill-down capability |
| **2. Faculty drill-down list** | Click vào khoa → xem chi tiết |
| **3. Proposal detail read-only** | View-only, không edit |

**PDF mapping:** Dashboard PDF = snapshot đúng layout (cards + table). Nếu table dài: auto page break theo row groups, header table lặp lại.

### Wireframe 2 — Queue / My Action Items (Default Landing)

#### Structure (All Roles)

**Top: Filters bar (chips):**
- "Đang chờ tôi" (holder_unit) — default
- "Của tôi"
- "Quá hạn"
- "T-2"

**Table (role-based columns), each row:**
- StateBadge (icon+text)
- Proposal title + code
- Holder (unit \| user)
- SLABadge (icon+text)
- Single primary action (inline button)
- Secondary actions trong "…" (không spam)

**Bulk actions (PKHCN/Admin only):**
- Checkboxes + sticky bulk bar:
  - Assign holder_user (optional)
  - Gửi email nhắc
  - Xuất Excel

**PDF mapping:** Queue PDF = table report (WYSIWYG). Badge luôn icon+text để in trắng đen vẫn hiểu.

### Wireframe 3 — Proposal Detail (StatusCard + Timeline + ActionPanel)

#### Layout (Desktop)

**Header block (full width):**

| Section | Content |
|---------|---------|
| **StatusCard** (left, 2/3) | • 📌 Trạng thái nghiệp vụ (không technical)<br>• Holder: Unit + (optional) user<br>• SLABadge: "Còn X ngày làm việc / Quá hạn X ngày" |
| **Primary Action Panel** (right, 1/3) | • Hiển thị DUY NHẤT 1 CTA hợp lệ theo role/state<br>• Dưới CTA là "What happens next" (1–2 dòng)<br>• Nếu không có action: "Bạn đang chờ bên kia xử lý" + next expected unit |

**Body (2 columns):**

| Section | Content |
|---------|---------|
| **Left** (2/3) | Tabs: Tổng quan \| Hồ sơ \| Tệp đính kèm \| Lịch sử |
| **Right** (1/3) | Timeline (vertical)<br>• WorkflowTimeline: state + timestamp + actor + reason<br>• Click entry → expand details (side panel, not modal) |

#### Read-only Boundary (Locked)

- Sau submit ONCE (Thư ký HĐ): form đánh giá read-only, proposal data read-only trừ CHANGES_REQUESTED.

**PDF mapping:** Proposal Detail PDF =
- StatusCard header
- Proposal sections (tab "Hồ sơ" dạng sections)
- Timeline (nếu dài → trang riêng)
- Template engine dùng chung design tokens để PDF giống UI.

### Wireframe 4 — Revision Required (RevisionPanel + Highlight Sections)

#### Layout

**Top:**
- StatusCard (hiển thị rõ "Yêu cầu chỉnh sửa" + SLA)

**Main: Two-panel:**

| Section | Content |
|---------|---------|
| **Left** (2/3) | Proposal Form (readable sections)<br>• Sections accordion: "Thông tin chung", "Nội dung nghiên cứu", …<br>• Field changed indicator: border/badge (không dựa vào màu) |
| **Right** (1/3) | RevisionPanel (sticky)<br>• "Cần sửa các phần:" list section-level<br>• Mỗi item có nút "Đi tới phần"<br>• Primary CTA: Nộp lại (duy nhất)<br>• Confirm text: "Nộp lại sẽ giữ nguyên lịch sử; không quay về DRAFT." |

**PDF mapping:** Revision PDF =
- "Danh sách phần cần sửa" (RevisionPanel) ở trang đầu
- Các section có marker "CẦN SỬA" (icon+text)
- Template engine dùng chung tokens để WYSIWYG

### Component Specification Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    SLABadge Component                        │
├─────────────────────────────────────────────────────────────┤
│  ⏳ Còn 2 ngày làm việc  [status: ok]                       │
│  ⚠️ T-2 (Còn 2 ngày)       [status: warning]                │
│  ⛔ Quá hạn 3 ngày         [status: overdue, muted red]    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   StatusCard Component                       │
├─────────────────────────────────────────────────────────────┤
│  📌 Hội đồng trường                                        │
│  Holder: Phòng KHCN | Thư ký: Nguyễn Văn A                 │
│  ⏳ Còn 2 ngày làm việc                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  WorkflowTimeline Component                  │
├─────────────────────────────────────────────────────────────┤
│  ✅ Đã nộp           →  ✅ Khoa đã duyệt  →  📌 HĐ trường → │
│  [2026-01-02]        [2026-01-03]        [Đang xử lý]      │
└─────────────────────────────────────────────────────────────┘
```

### Visual Tokens Adjustments (Step 8 Alignment)

| Decision | Implementation |
|----------|----------------|
| **Dark mode** | Auto theo OS + toggle Auto/Light/Dark |
| **Overdue red** | Giữ đỏ nhưng giảm bão hòa (muted), không neon |
| **No brand color** | Primary dùng neutral blue/gray, không "màu biểu trưng" |
| **Badge icon + chữ** | Mọi status/SLA phải đọc được khi in trắng đen |
| **PDF WYSIWYG** | Mọi component phải có "print variant" đồng layout |

---

## User Journey Flows (Locked)

### Flow Invariants (Áp dụng cho mọi journey)

| # | Invariant | Meaning |
|---|-----------|---------|
| **I-1** | Open → See → Do (< 10s) | Dashboard/Detail phải hiển thị ngay State + Holder + SLA + Next Action |
| **I-2** | Separation | projects.state độc lập với form_instances.status (form submit không tự ý đổi workflow state) |
| **I-3** | Ownership | Chỉ PROJECT_OWNER được edit/submit/resubmit proposal (contextual permission) |
| **I-4** | Holder never empty | Luôn có holder_unit (100%); holder_user optional, DRAFT mặc định = PROJECT_OWNER |
| **I-5** | Append-only logs | Mọi transition phải ghi workflow_logs (append-only), state phải recompute được sau restore |

---

### J1 — Giảng viên nộp hồ sơ mới (DRAFT → SUBMITTED → FACULTY_REVIEW)

**Mục tiêu:** Nộp nhanh, không rối; sau submit biết ngay "ai giữ + deadline".

#### Entry Points

| Entry | Description |
|-------|-------------|
| Dashboard (My Projects) | → "Tạo đề tài mới" |
| Dashboard → DRAFT | → Mở 1 DRAFT đang có |
| Deep link email nhắc | → "Chưa nộp, sắp hết hạn nội bộ" |

#### Flow (Happy Path)

**1. Open (Dashboard / Create)**
- CTA: "Tạo đề tài mới" (primary button)

**2. Form Entry (One-time entry)**
- Auto-fill: name/email/khoa từ profile
- Upload tracker: "Đã upload x/y tài liệu"
- Autosave DRAFT + last saved timestamp

**3. Pre-submit Check**
- Validate required fields + required documents
- Hiển thị "Thiếu gì" dạng checklist (không popup spam)

**4. Submit**
- Confirm screen nhỏ (1 bước): hiển thị State sẽ chuyển, holder_unit tiếp theo, SLA dự kiến

**5. Success Feedback**
- Toast: "Đã nộp"
- StatusCard cập nhật: SUBMITTED → FACULTY_REVIEW (auto)
- Timeline thêm entry
- Deep link: "Xem hồ sơ" (mở Detail)

#### Breakpoints & Fixes

| Error | Fix |
|-------|-----|
| Thiếu file/thiếu trường | Checklist + focus vào section lỗi |
| Upload lỗi mạng | Retry + giữ DRAFT; không mất context |
| Submit xong không biết ai giữ | Confirm card bắt buộc hiển thị holder_unit + SLA |

#### Postconditions

- `projects.state = FACULTY_REVIEW` (auto transition)
- `holder_unit = Khoa`
- `workflow_logs`: DRAFT→SUBMITTED + SUBMITTED→FACULTY_REVIEW (append-only)
- `form_instances.status = SUBMITTED` (nhưng không trực tiếp đổi state)

---

### J2 — Giảng viên Resubmit sau CHANGES_REQUESTED (Context Preserved)

**Mục tiêu:** "Tôi biết phải sửa gì" + sửa đúng section + resubmit 1 lần.

#### Entry Points

| Entry | Description |
|-------|-------------|
| Email deep link | "Hồ sơ cần bổ sung" → mở thẳng Revision Panel |
| Dashboard → filter | "Cần tôi xử lý" / "Returned" |
| Proposal detail | Banner "CHANGES_REQUESTED" |

#### Flow (Happy Path)

**1. Open (Deep link / Dashboard)**
- Detail mở vào: StatusCard (state + holder + SLA)

**2. See (Revision Panel)**
- Hiển thị danh sách section-level cần sửa (Canonical Section IDs)
- Ví dụ: "Phần: Phương pháp nghiên cứu" (section_id=methodology)
- Kèm comment reviewer (free-text)

**3. Edit (Context preserved)**
- Form đã có sẵn dữ liệu (preserve)
- Highlight section cần sửa (scroll + anchor)
- Chỉ cho edit các section được yêu cầu (optional policy)

**4. Attachments (MVP Policy)**
- Preserve uploads mặc định
- Nếu reviewer yêu cầu thay file X: mở "Replace file" chỉ cho file đó (có nhãn Required)

**5. Pre-resubmit Check**
- Checklist: "Các sections yêu cầu đã chỉnh sửa?" (dựa trên section_id)

**6. Resubmit**
- Confirm: state sẽ "return-to-prior-state" (không DRAFT)

**7. Success Feedback**
- Toast: "Đã nộp lại"
- Timeline thêm entry: "Resubmitted revision"
- State quay về prior state (VD: FACULTY_REVIEW, OUTLINE_COUNCIL_REVIEW) theo P1.4 return_to_state rule

#### Breakpoints & Fixes

| Error | Fix |
|-------|-----|
| User không biết sửa gì | Canonical Section IDs + Revision Panel + anchor link |
| Resubmit làm mất dữ liệu | Preserve form data; không tạo form mới |
| File version hỗn loạn | MVP preserve uploads; replace chỉ khi required (P1.3) |
| Không rõ quay lại state nào | Confirm màn hình hiển thị "Quay lại: [state name]" |

#### Postconditions

- `projects.state = prior_state` (không DRAFT)
- `workflow_logs`: …→CHANGES_REQUESTED→prior_state (append-only)
- Metadata log: `revision_required_sections: [section_id...]`

---

### J3 — Quản lý Khoa duyệt hồ sơ (FACULTY_REVIEW → APPROVE/RETURN)

**Mục tiêu:** Duyệt nhanh theo queue, bắt buộc reason code khi trả về.

#### Entry Points

| Entry | Description |
|-------|-------------|
| Dashboard → "Đang chờ tôi" | holder_unit = Khoa |
| Dashboard → "T-2 / Quá hạn" | Priority filtering |
| Deep link email | "Hồ sơ sắp quá hạn" |

#### Flow (Happy Path: Approve)

**1. Open (Queue)**
- Table list với badge SLA (icon + chữ), trạng thái, owner

**2. See (Detail)**
- StatusCard + Timeline

**3. Do (ActionPanel)**
- Single primary action: Approve
- Secondary: "Xem PDF", "Tải doc"

**4. Approve Confirm**
- Reason code optional cho positive transition (theo FR11)

**5. Success Feedback**
- Toast + Timeline entry
- Holder chuyển sang đơn vị tiếp theo (ví dụ: Hội đồng)

#### Flow (Happy Path: Return/Reject)

**1. Chọn Return** (primary nếu thiếu)

**2. Modal/Sheet "Reason Code"**
- Bắt buộc + free-text khi chọn "KHAC"

**3. Chọn sections cần sửa** (Canonical Section IDs)

**4. Submit return**

**5. Success**
- State → CHANGES_REQUESTED
- Deep link gửi cho owner

#### Breakpoints & Fixes

| Error | Fix |
|-------|-----|
| Return nhưng không rõ yêu cầu | Bắt chọn section + comment ngắn |
| Queue có holder_user trống | Queue theo holder_unit vẫn hoạt động; nếu quá hạn T+2 thì escalations sang PKHCN |
| User thao tác nhầm | Confirm ngắn + hiển thị rõ hậu quả "sẽ trả về giảng viên" |

#### Postconditions

- `workflow_logs` ghi đủ: action + reason code (negative mandatory)
- Nếu Return: lưu `revision_required_sections` + comment

---

### J4 — PKHCN Morning Check + Bulk Actions

**Mục tiêu:** "30 giây có bức tranh toàn trường" + xử lý quá hạn bằng bulk an toàn.

#### Entry Points

| Entry | Description |
|-------|-------------|
| PKHCN Dashboard landing | Default |
| Deep link escalation | T+2 |
| Menu: Reports / Overdue | Alternative access |

#### Flow (Morning Check in 30s)

**1. Open**
- KPI cards: tổng hồ sơ, đang xử lý, quá hạn, T-2

**2. See**
- Overdue list (top priority)
- "My Action Items" cho PKHCN (assign/escalation/export)

**3. Do (3 CTA chính)**
- Bulk remind
- Assign holder_user / assign expert / designate council secretary
- Export Excel

#### Bulk Remind Flow (Safety Bundle — MVP)

| Step | Description |
|------|-------------|
| 1 | Chọn filter (faculty/state/overdue days) |
| 2 | Preview recipients: số lượng + danh sách mẫu (10 items) |
| 3 | Dry-run validation: loại record thiếu email / state đã đổi |
| 4 | Template locked (MVP): chọn 1 trong 2–3 mẫu chuẩn |
| 5 | Confirm (typing nếu >50) |
| 6 | Execute as job (async) → UI polling progress |
| 7 | Delivery report: sent/failed + lý do |

#### Assign Flow (Holder Policy)

- Với state yêu cầu cá nhân (OUTLINE_COUNCIL_REVIEW secretary, acceptance council secretary): UI bắt buộc chọn holder_user
- Với state khác: holder_user optional, nhưng nếu "Overdue T+2" thì hệ thống đề xuất "Assign ngay"

#### Breakpoints & Fixes

| Error | Fix |
|-------|-----|
| Bulk spam/sai đối tượng | Preview + dry-run + rate limit + audit snapshot |
| Overdue không rõ ai chịu trách nhiệm | holder_unit luôn có; escalation T+2 tạo action item cho PKHCN |
| Thiếu thông tin khi drill-down | Detail luôn có StatusCard + Timeline + ActionPanel |

#### Postconditions

- Bulk actions tạo `bulk_action_logs` + audit entries
- Assign tạo workflow log hoặc audit log (tùy thiết kế), trace được actor + timestamp

---

### J5 — Thư ký HĐ đánh giá + Submit ONCE (Two-phase Commit)

**Mục tiêu:** Tránh "nộp nhầm không cứu được" nhưng vẫn giữ "submit once".

#### Entry Points

| Entry | Description |
|-------|-------------|
| Dashboard → "Council Queue" | Default |
| "Đang chờ tôi" | holder_unit filter |
| Deep link | "Bạn được chỉ định thư ký cho hồ sơ X" |

#### Flow (Two-phase commit: Draft → Finalize)

**Phase 1: Draft evaluation**

| Step | Description |
|------|-------------|
| 1 | Open detail: proposal read-only + attachments |
| 2 | Mở Evaluation Form trạng thái DRAFT |
| 3 | Nhập điểm/nhận xét, upload file biên bản (nếu có) |
| 4 | Autosave + "Last saved" |

**Phase 2: Preview & Finalize (Submit ONCE)**

| Step | Description |
|------|-------------|
| 5 | Preview PDF (WYSIWYG, template engine tokens chung) |
| 6 | Checklist: đủ thông tin? đúng kết luận? đúng hội đồng? |
| 7 | Confirm "Finalize":<br>• checkbox "Tôi hiểu sau khi nộp không thể chỉnh sửa"<br>• confirm typing (mã hồ sơ hoặc FINALIZE) cho safety |
| 8 | Finalize success:<br>• evaluation.status = FINALIZED (read-only)<br>• timeline entry + toast<br>• workflow tiếp tục (OUTLINE_COUNCIL_REVIEW → APPROVED hoặc CHANGES_REQUESTED; ACCEPTANCE_REVIEW → next phase) |

#### Breakpoints & Fixes

| Error | Fix |
|-------|-----|
| Nộp nhầm | Draft trước finalize + preview PDF + confirm typing |
| Muốn sửa sau finalize | MVP không sửa; Growth có "Correction Request PKHCN-only" nếu cần |
| Mất dữ liệu khi mạng lỗi | Autosave |

#### Postconditions

- Evaluation immutable sau finalize
- `workflow_logs` ghi transition + actor + (reason code nếu exception)

---

### J6 — BGH view tổng quan + drill-down (Read-only)

**Mục tiêu:** 5 phút hiểu tình hình; mobile 3 màn hình tối đa.

#### Entry Points

| Entry | Description |
|-------|-------------|
| Mobile/desktop BGH dashboard | Primary |
| Deep link | "SLA thấp khoa X" (nếu có email nội bộ) |

#### Mobile Flow (3 screens)

| Screen | Description |
|--------|-------------|
| **1. Overview** | KPI cards + SLA compliance + top overdue faculties |
| **2. Faculty drill-down** | List proposals theo khoa (overdue/T-2) + filters tối giản |
| **3. Proposal detail (read-only)** | StatusCard + Timeline + SLA badge<br>CTA duy nhất: "Xuất PDF" (WYSIWYG) / "Tải báo cáo" |

#### Breakpoints & Fixes

| Error | Fix |
|-------|-----|
| BGH bị overload thông tin | Hạn chế hành động, chỉ drill-down |
| In trắng đen vẫn hiểu | Badge icon + chữ (không phụ thuộc màu) |
| PDF giống hệt màn hình | Template engine dùng chung tokens + dark mode handling |

#### Postconditions

- Không thay đổi dữ liệu (read-only)
- Chỉ tạo audit "view" nếu cần

---

### Global Error & Recovery (Áp dụng chung)

| Error Type | Handling |
|-----------|----------|
| Error copy | Business-friendly: "Không thể nộp. Vui lòng thử lại hoặc liên hệ PKHCN." |
| Next action | Always visible: retry / back to queue / contact PKHCN |
| Idempotency | Cho submit/finalize/bulk jobs: tránh double submit do refresh |
| Audit | Mọi action quan trọng phải trace được |

---

### Output Artifacts (Để Dev/UX dùng ngay)

#### Các màn hình "Must Design"

| Screen | Priority |
|--------|----------|
| Dashboard per role | Highest |
| Proposal Detail | Highest |
| Queue / My Action Items | Highest |
| Revision Panel | High |
| Bulk Action Preview + Job Progress | High |
| Evaluation Form (Draft) + Finalize Preview | High |

#### Components Tái Sử dụng

| Component | Usage |
|-----------|-------|
| StatusCard | Tất cả screens |
| SLABadge | Tất cả screens |
| WorkflowTimeline | Detail screens |
| ActionPanel | Detail screens |
| RevisionPanel | J2 flow |
| BulkActionBar | J4 flow |
| RecipientPreview | J4 bulk remind |
| JobProgress | J4 bulk jobs |
| EvaluationFinalizeGate | J5 finalize |
| PDF Export Button | Tất cả screens |

---

### Quyết định cần "Đóng dấu" (Locked để không vỡ về sau)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Submit ONCE = Finalize** | Draft evaluation cho phép sửa, Finalize khóa vĩnh viễn |
| 2 | **Revision = Section-level** | Theo Canonical Section IDs (không field-level trong MVP) |
| 3 | **Attachments MVP** | Preserve + replace có điều kiện (chỉ file được yêu cầu) |
| 4 | **holder_user policy** | Mandatory ở COUNCIL secretary + EXPERT reviewer; optional elsewhere; T+2 escalation tạo action item PKHCN |
| 5 | **Bulk Safety Bundle** | Preview + dry-run + template locked + rate limit + job progress + audit snapshot |

---

## Component Strategy

### Design System Components

**Foundation from shadcn/ui:**

shadcn/ui provides a comprehensive set of base components that form our foundation:

| Component | shadcn/ui Equivalent | Usage for DoAn |
|-----------|---------------------|----------------|
| Button | ✅ Button | Primary/secondary/ghost actions |
| Input | ✅ Input | Form fields |
| Select | ✅ Select | Dropdown selections |
| Dialog | ✅ Dialog | Modals/confirmations |
| Sheet | ✅ Sheet | Side panels (ActionPanel, RevisionPanel) |
| Card | ✅ Card | Dashboard cards, sections |
| Badge | ✅ Badge | Status badges (with custom variants) |
| Table | ✅ Table | Queue tables, data tables |
| Avatar | ✅ Avatar | User avatars |
| Tabs | ✅ Tabs | Detail screen navigation |
| Accordion | ✅ Accordion | Form sections, revision items |
| Checkbox | ✅ Checkbox | Bulk selection |
| Toast | ✅ Sonner (Toast) | Confirmations, feedback |
| Dropdown | ✅ DropdownMenu | "…" menu actions |

**Customization approach:**
- Extend Tailwind config with NCKH-specific design tokens (status colors, spacing)
- Create custom Badge variants for status/SLA display
- Use `cn()` utility for variant composition
- Follow Radix UI patterns for accessibility compliance

### Custom Components

#### StatusCard

**Purpose:** Display current project state in a compact block — answers "Where is it? Who holds it? How long?"

**Usage:** Dashboard (My Action Items), Proposal Detail header, Revision screens

**Specification:**
```
┌─────────────────────────────────────────────────┐
│ 📌 Hội đồng trường            [state: info]     │
│ Holder: Phòng KHCN | Thư ký: Nguyễn Văn A       │
│ ⏳ Còn 2 ngày làm việc         [sla: ok]        │
└─────────────────────────────────────────────────┘
```

**Props:**
- `state`: Business state label (Vietnamese)
- `stateValue`: Technical state value (for color mapping)
- `holderUnit`: Unit holding the project
- `holderUser?`: Optional assigned user
- `slaDaysRemaining?`: Days remaining in SLA
- `slaOverdueDays?`: Days overdue
- `compact?`: Smaller variant for table rows

**States:** default, compact, loading

**Variants:**
- Full size (dashboard, detail header)
- Compact (table rows, mobile)
- Minimal (badge-only for very dense views)

**Accessibility:**
- `role="status"` + `aria-live="polite"`
- State icon with `aria-hidden="true"`
- Full text labels (no color-only indicators)

**Content Guidelines:**
- State label: Business terminology (Vietnamese)
- SLA: "Còn X ngày làm việc" or "Quá hạn X ngày"
- Icon + text format for grayscale readability

---

#### SLABadge

**Purpose:** Display SLA (Service Level Agreement) in working days with icon + text format — readable in grayscale.

**Usage:** StatusCard, tables, dashboard cards, anywhere SLA needs visibility

**Specification:**
```
⏳ Còn 2 ngày làm việc    [status: ok]
⚠️ T-2 (Còn 2 ngày)       [status: warning]
⛔ Quá hạn 3 ngày          [status: overdue]
```

**Props:**
- `daysRemaining?`: Days remaining in SLA
- `overdueDays?`: Days overdue
- `variant`: 'ok' | 'warning' | 'overdue'
- `compact?`: Shorter text
- `showWorkingDays?`: Explicitly show "làm việc"

**States:** ok (green), warning (yellow), overdue (muted red), none

**Variants:**
- Full: "Còn 2 ngày làm việc"
- Compact: "2 ngày"
- Minimal: "2" (for very dense PKHCN tables)

**Accessibility:**
- `role="status"` + `aria-live="polite"`
- Full text description
- Color NOT the only indicator

**Content Guidelines:**
- Always use icon + text
- "làm việc" suffix for clarity
- "Quá hạn X ngày" (not "X days overdue")

**Interaction Behavior:**
- Hover → tooltip: "Deadline: 15/01/2026 (Thứ 2-6, không tính CN)"

---

#### WorkflowTimeline

**Purpose:** Display workflow history as thread view (Gmail-style) — user can trace complete journey.

**Usage:** Proposal Detail (right panel), audit views

**Specification:**
```
┌─────────────────────────────────────────────────┐
│ ✅ Đã nộp                          02/01 09:30  │
│    bởi Nguyễn Văn A                                │
│                                                  │
│ ✅ Khoa đã duyệt                   03/01 14:20  │
│    bởi Trưởng khoa CNTT                          │
│    Reason: "Đủ điều kiện"                         │
│                                                  │
│ 📌 Hội đồng trường                  (Đang xử lý) │
│    Phòng KHCN                                    │
└─────────────────────────────────────────────────┘
```

**Props:**
- `entries`: TimelineEntry[] (state, timestamp, actor, reason, details)
- `currentStep?`: Highlight current state
- `clickable?`: Click to expand details
- `maxEntries?`: Show only N entries, rest collapsed

**States:** expanded, collapsed, loading

**Variants:**
- Full width (desktop detail)
- Compact (mobile)
- Inline (for table row expansion)

**Accessibility:**
- `role="list"` + `role="listitem"`
- Time in readable format, not just ISO
- Keyboard navigation between entries

**Interaction Behavior:**
- Click entry → expand details in side panel
- "Xem thêm" → load more entries
- Hover entry → highlight related workflow state

---

#### ActionPanel

**Purpose:** Display EXACTLY ONE primary action valid for role + state — avoid user confusion.

**Usage:** Proposal Detail (header right), screens requiring action

**Specification:**
```
┌─────────────────────────────────────────────────┐
│  [Primary: Duyệt hồ sơ]                         │
│                                                 │
│  What happens next:                              │
│  • Hồ sơ chuyển sang Hội đồng trường            │
│  • Email gửi đến thư ký HĐ                       │
└─────────────────────────────────────────────────┘

OR (no action):

┌─────────────────────────────────────────────────┐
│  Bạn đang chờ bên kia xử lý                      │
│  Tiếp theo: Hội đồng trường                     │
└─────────────────────────────────────────────────┘
```

**Props:**
- `role`: Current user role
- `projectState`: Current workflow state
- `availableActions`: Action[]
- `nextState?`: Next state after action
- `nextHolder?`: Next holder unit

**States:** hasAction, noAction, loading

**Variants:**
- Full (with "what happens next" text)
- Compact (button only)

**Accessibility:**
- Primary action has highest visual weight
- Only ONE primary action visible
- Disabled actions shown but grayed out

**Content Guidelines:**
- Button label: Business action ("Duyệt hồ sơ", not "APPROVE")
- "What happens next": max 2 bullet points
- If no action: explain WHO is processing next

---

#### RevisionPanel

**Purpose:** Display sections needing revision with anchor links — user knows SPECIFICALLY what to fix.

**Usage:** J2 Resubmit flow (sticky right panel)

**Specification:**
```
┌─────────────────────────────────────────────────┐
│ Cần sửa các phần:                                │
│                                                 │
│ ▸ Phương pháp nghiên cứu        [Đi tới]        │
│   "Cần chi tiết hóa phương pháp..."              │
│                                                 │
│ ▸ Kinh phí                 [Đi tới]              │
│   "Chưa giải ngân giai đoạn 1"                   │
│                                                 │
│ [Primary: Nộp lại]                               │
│                                                 │
│ Nộp lại sẽ giữ nguyên lịch sử;                   │
│ không quay về DRAFT.                             │
└─────────────────────────────────────────────────┘
```

**Props:**
- `sections`: RevisionSection[] (sectionId, label, comment, isFixed)
- `projectId`: Current project
- `onResubmit`: Callback with fixed sections
- `sticky?`: Sticky to viewport

**States:** pending, partial, complete

**Variants:**
- Full (sticky on desktop)
- Inline (for mobile or non-sticky)

**Accessibility:**
- `role="complementary"` + `aria-label="Yêu cầu sửa đổi"`
- Section links are standard anchors

**Interaction Behavior:**
- Click "Đi tới" → scroll to section + highlight
- Click "Nộp lại" → confirm resubmit
- Checkbox "Đã sửa" → mark section as addressed

---

#### BulkActionBar

**Purpose:** Sticky bar displaying bulk actions for PKHCN — select multiple records + process safely.

**Usage:** J4 Morning Check + Bulk Actions

**Specification:**
```
┌─────────────────────────────────────────────────────────────┐
│ ☐ Đã chọn 5 hồ sơ    [Xóa chọn]                            │
│                                                             │
│ [Giao cho...] [Gửi email nhắc] [Xuất Excel]                │
└─────────────────────────────────────────────────────────────┘
```

**Props:**
- `selectedIds`: Selected record IDs
- `totalCount`: Total selected count
- `actions`: BulkAction[]
- `onClearSelection`: Clear all selection
- `onAction`: Execute bulk action

**States:** hidden, visible, processing

**Variants:**
- Full (all actions visible)
- Minimal (just count + clear)

**Accessibility:**
- `role="toolbar"` + `aria-label="Tác vụ hàng loạt"`
- Selected count clearly announced

**Interaction Behavior:**
- Sticky to bottom of viewport
- Only appears when selectedIds.length > 0
- Clear selection → uncheck all + hide bar

---

#### RecipientPreview

**Purpose:** Preview recipients before bulk email — safety bundle to avoid sending to wrong people.

**Usage:** J4 Bulk Remind Flow (step 2-3)

**Specification:**
```
┌─────────────────────────────────────────────────┐
│ Gửi email nhắc hạn                                │
│                                                 │
│ Số người nhận: 25                                 │
│                                                 │
│ Danh sách mẫu (10/25):                            │
│ • nguyenvana@example.com   - Đề tài #001         │
│ • tranvanb@example.com   - Đề tài #002           │
│ ...                                               │
│                                                 │
│ [Xem tất cả 25]    [Lọc bỏ không hợp lệ]        │
│                                                 │
│ [← Quay lại]    [Tiếp tục →]                    │
└─────────────────────────────────────────────────┘
```

**Props:**
- `recipients`: Recipient[] (email, projectId, projectTitle, isValid)
- `templateId`: Email template to use
- `onFilterInvalid`: Run validation
- `onConfirm`: Proceed to next step

**States:** loading, preview, validated

**Variants:**
- Modal (desktop)
- Sheet (side drawer)

**Accessibility:**
- `role="dialog"` + `aria-labelledby`
- Recipient count clearly announced
- Invalid entries marked

---

#### JobProgress

**Purpose:** Display progress of async bulk jobs — UI polling + user knows job is running.

**Usage:** J4 Bulk actions (execute as job)

**Specification:**
```
┌─────────────────────────────────────────────────┐
│ ⏳ Đang gửi email nhắc hạn                        │
│                                                 │
│ Progress: 15/25                                   │
│ ████████████░░░░░░░░                             │
│                                                 │
│ Thành công: 14  |  Thất bại: 1                   │
│                                                 │
│ [Hủy] [Xem chi tiết]                            │
└─────────────────────────────────────────────────┘
```

**Props:**
- `job`: Job (id, type, status, total, processed, succeeded, failed, startedAt)
- `onCancel`: Cancel running job
- `onViewDetails`: Show error details

**States:** pending, running, completed, failed

**Variants:**
- Full modal/inline
- Compact (toast-sized)

**Accessibility:**
- `role="status"` + `aria-live="polite"`
- Progress updates announced

**Interaction Behavior:**
- Polling: refresh every 2-3 seconds
- Auto-close when completed (optional)
- "Xem chi tiết" → show error list if any

---

#### EvaluationFinalizeGate

**Purpose:** Confirm gate with checkbox + typing — avoid "accidental submit that can't be undone".

**Usage:** J5 Submit ONCE (Two-phase commit, phase 2)

**Specification:**
```
┌─────────────────────────────────────────────────┐
│ Finalize đánh giá Hội đồng                       │
│                                                 │
│ ☐ Tôi hiểu sau khi nộp không thể chỉnh sửa      │
│                                                 │
│ Gõ "FINALIZE" để xác nhận:                        │
│ [_______________]                                │
│                                                 │
│ Sau khi finalize:                                │
│ • Form đánh giá trở thành read-only              │
│ • Hồ sơ chuyển sang giai đoạn tiếp theo          │
│                                                 │
│ [← Quay lại]    [Finalize →]                    │
└─────────────────────────────────────────────────┘
```

**Props:**
- `evaluationId`: Current evaluation ID
- `projectId`: Project being evaluated
- `onFinalize`: Finalize callback
- `onCancel`: Cancel callback

**States:** initial, checked, typing, ready

**Variants:**
- Modal (desktop)
- Sheet (side drawer)

**Accessibility:**
- `role="dialog"` + `aria-labelledby`
- Checkbox label clearly states consequence

**Interaction Behavior:**
- Checkbox required to enable input
- Input value must match exactly
- "Finalize" button disabled until match

---

#### PDFExportButton

**Purpose:** Export button with loading states — user knows PDF is being generated.

**Usage:** All screens with PDF export capability

**Specification:**
```
[Xuất PDF]           → Default
[⏳ Đang tạo...]      → Loading
[✅ Đã xuất]          → Success (temporary)
[⚠️ Thất bại]         → Error (with retry)
```

**Props:**
- `projectId`: Project to export
- `documentType`: 'proposal' | 'evaluation' | 'report'
- `onExport`: Export callback
- `status`: 'idle' | 'loading' | 'success' | 'error'

**States:** idle, loading, success, error

**Variants:**
- Standalone button
- Dropdown item
- Icon button

**Accessibility:**
- `aria-label` changes with state
- Loading: `aria-busy="true"`

**Interaction Behavior:**
- Click → trigger PDF generation
- Loading → disable button, show spinner
- Success → auto-download + temporary success state
- Error → show error message + retry option

---

### Component Implementation Strategy

**Architecture Layers:**

```
┌─────────────────────────────────────────────────────────────┐
│           Layer 1: Design Tokens (Tailwind config)          │
│  - Status colors (ok, warning, overdue, info)               │
│  - Spacing scale (4px base)                                │
│  - Typography (Be Vietnam Pro)                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          Layer 2: Foundation Components (shadcn/ui)          │
│  - Button, Input, Select, Dialog, Table                    │
│  - Card, Badge, Avatar, Dropdown, Sheet                    │
│  - Accordion, Tabs, Checkbox, Toast                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Layer 3: Custom Components (NCKH)               │
│  - StatusCard, SLABadge, WorkflowTimeline                  │
│  - ActionPanel, RevisionPanel, BulkActionBar               │
│  - RecipientPreview, JobProgress, EvaluationFinalizeGate   │
│  - PDFExportButton                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Layer 4: Screen Assemblies                 │
│  - Dashboard (5 role variants)                              │
│  - Proposal Detail, Queue, Forms                            │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Approach:**
1. Build custom components using shadcn/ui primitives as base
2. Use shared Tailwind tokens for consistency
3. Follow Radix UI patterns for accessibility
4. Create reusable patterns for common use cases

---

### Implementation Roadmap

**Phase 1 - Core Components (Highest Priority)**

Required for "Open → See → Do < 10s" core experience:

| Component | Needed for | User Journeys |
|-----------|-----------|---------------|
| StatusCard | Dashboard, Detail | J1, J2, J3 |
| SLABadge | All screens | All |
| WorkflowTimeline | Detail | J1-J6 |
| ActionPanel | Detail | J1, J3, J5 |

**Phase 2 - Supporting Components (High Priority)**

Required for specific user journeys:

| Component | Needed for | User Journeys |
|-----------|-----------|---------------|
| RevisionPanel | Resubmit flow | J2 |
| BulkActionBar | PKHCN bulk actions | J4 |
| RecipientPreview | Bulk remind safety | J4 |
| EvaluationFinalizeGate | Submit ONCE | J5 |

**Phase 3 - Enhancement Components (Medium Priority)**

Polish and nice-to-have features:

| Component | Needed for | User Journeys |
|-----------|-----------|---------------|
| JobProgress | Bulk job progress | J4 |
| PDFExportButton | All screens with export | All |

**Dependencies:**
- Phase 1 components must be completed first (they enable core UX)
- Phase 2 components depend on Phase 1
- Phase 3 can be developed in parallel with Phase 2

**Ordering Rationale:**
- Phase 1: Critical for core experience ("Nhìn là biết")
- Phase 2: Required for J2, J4, J5 flows
- Phase 3: Nice-to-have for polish and async operations

---

## Quyết định cần "Đóng dấu" (Locked để không vỡ về sau)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Submit ONCE = Finalize** | Draft evaluation cho phép sửa, Finalize khóa vĩnh viễn |
| 2 | **Revision = Section-level** | Theo Canonical Section IDs (không field-level trong MVP) |
| 3 | **Attachments MVP** | Preserve + replace có điều kiện (chỉ file được yêu cầu) |
| 4 | **holder_user policy** | Mandatory ở COUNCIL secretary + EXPERT reviewer; optional elsewhere; T+2 escalation tạo action item PKHCN |
| 5 | **Bulk Safety Bundle** | Preview + dry-run + template locked + rate limit + job progress + audit snapshot |

---

## Responsive Design & Accessibility

### Responsive Strategy

**Platform Requirements (Locked):**

| Role | Platform | Constraint |
|------|----------|------------|
| **Giảng viên, Khoa, PKHCN, HĐ, Admin** | Desktop-only (laptop trong giờ hành chính) | Full functionality |
| **BGH** | Mobile read-only | 3 screens max, simplified layout |

**Desktop Strategy (Primary):**

- Layout: 12-column grid, max-width 1200px, centered
- Sidebar: Left, always visible, icon + label
- Content density: Per-role modes (Comfort/Compact/Balanced)
- Tables: Full width with horizontal scroll if needed
- Modals: Centered, max-width 600px

**Tablet Strategy (768px - 1023px):**

- Layout: Collapse to single column where appropriate
- Sidebar: Icon-only by default, expandable
- Tables: Horizontal scroll with sticky first column
- Touch targets: Minimum 44x44px

**Mobile Strategy (BGH Read-Only Only):**

- Layout: Single column, full-width cards
- Navigation: Bottom navigation bar (3 tabs max)
- Tables: Convert to card layout
- Screens: 3 screens locked — Overview → Faculty List → Detail

---

### Breakpoint Strategy

**Tailwind Default Breakpoints:**

| Breakpoint | Width | Use Case |
|------------|-------|----------|
| `sm` | 640px | Small tablets, landscape phones |
| `md` | 768px | Tablets portrait |
| `lg` | 1024px | Small laptops, tablets landscape |
| `xl` | 1280px | Desktop standard |
| `2xl` | 1536px | Large desktops |

**DoAn-Specific Extension:**

```javascript
// tailwind.config.js
screens: {
  'xs': '480px',   // Small phones
  'sm': '640px',   // Standard Tailwind
  'md': '768px',   // Tablets
  'lg': '1024px',  // Desktop (primary target)
  'xl': '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
}
```

**Layout Transitions:**

| Breakpoint | Sidebar | Content | Tables |
|------------|---------|---------|--------|
| `< md` (mobile) | Hidden (bottom nav) | Single column | Card layout |
| `md - lg` (tablet) | Icon-only | 1-2 columns | Horizontal scroll |
| `>= lg` (desktop) | Full icon+label | 2-3 columns | Full table |

---

### Accessibility Strategy

**WCAG Compliance Level: AA (Industry Standard)**

| Requirement | Implementation | Acceptance |
|-------------|----------------|------------|
| **Color contrast** | 4.5:1 for normal text, 3:1 for large text | Automated test pass |
| **Keyboard navigation** | Full flow navigable via Tab/Enter/Space | Manual test pass |
| **Screen reader** | ARIA labels, roles, live regions | NVDA/VoiceOver usable |
| **Touch targets** | Minimum 44x44px | All interactive elements |
| **Focus indicators** | Visible focus ring (Tailwind `ring`) | Focus always visible |

**shadcn/ui + Radix UI Foundation:**

Radix UI primitives handle most WCAG 2.1 AA requirements:
- Focus trap (Dialog, Sheet)
- Escape key handling
- ARIA attributes
- Keyboard navigation

**Custom Accessibility Requirements:**

| Component | A11y Requirement |
|-----------|------------------|
| **StatusCard** | `role="status"` + `aria-live="polite"` |
| **SLABadge** | Icon + text (not color-only) |
| **WorkflowTimeline** | `role="list"` + `role="listitem"` |
| **ActionPanel** | Only ONE primary action |
| **Form errors** | `aria-invalid="true"` + `aria-describedby` |
| **Toast** | `role="alert"` + `aria-live` |
| **Filter chips** | `aria-label` + toggle state |

**Vietnamese Language Support:**
- `lang="vi"` attribute on `<html>`
- UTF-8 character encoding
- Screen reader compatible Vietnamese text

---

### Testing Strategy

**Responsive Testing:**

| Test Type | Tools | Frequency |
|-----------|-------|-----------|
| **Device testing** | Real devices (iPhone, Android, iPad) | Per release |
| **Browser testing** | Chrome, Firefox, Safari, Edge | Per PR |
| **Viewport testing** | Chrome DevTools, Responsively | Per component |
| **Network performance** | Chrome DevTools throttling | Per release |

**Accessibility Testing:**

| Test Type | Tools | Frequency |
|-----------|-------|-----------|
| **Automated** | axe-core, Lighthouse, jest-axe | Per PR |
| **Screen reader** | NVDA (Windows), VoiceOver (Mac), TalkBack (Android) | Per release |
| **Keyboard-only** | Manual Tab navigation test | Per PR |
| **Color blindness** | Chrome extension, simulator | Per design iteration |

**User Testing:**

| Test Type | Participants | Coverage |
|-----------|--------------|----------|
| **Usability** | 5-8 users per role (Giảng viên, Khoa, PKHCN, BGH) | Quarterly |
| **Accessibility** | Include users with disabilities if available | Per major release |
| **Device diversity** | Test on actual user devices | Per release |

---

### Implementation Guidelines

**Responsive Development:**

```javascript
// DO: Use relative units
const buttonPadding = 'px-4 py-2';  // Tailwind uses rem

// DON'T: Fixed pixels for layout
const bad = { width: '1200px' };
const good = { maxWidth: '1200px', width: '100%' };
```

**Mobile-First Media Queries:**

```css
/* Base: Mobile styles */
.container { padding: 1rem; }

/* Tablet and up */
@media (min-width: 768px) {
  .container { padding: 2rem; }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    display: grid;
    grid-template-columns: 2fr 1fr;
  }
}
```

**Accessibility Development:**

```jsx
// DO: Semantic HTML
<button type="button">Duyệt hồ sơ</button>

// DO: ARIA labels for icons
<button aria-label="Xuất PDF">
  <DownloadIcon />
</button>

// DO: Form error association
<input
  aria-invalid={hasError}
  aria-describedby={hasError ? 'email-error' : undefined}
/>
{hasError && <span id="email-error">Email không hợp lệ</span>}

// DO: Skip navigation link
<a href="#main-content" className="sr-only focus:not-sr-only">
  Bỏ qua navigation
</a>
```

**Focus Management:**

```jsx
// Modal focus trap (Radix UI handles this)
<Dialog>
  <DialogContent>
    {/* Focus trapped here */}
  </DialogContent>
</Dialog>

// Custom focus management for form errors
const formRef = useRef(null);
