---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'Hệ thống quản lý nghiên cứu khoa học - Đại học Sư phạm Kỹ thuật Nam Định'
session_goals: 'Xây dựng website hiện đại, mượt mà để quản lý các hoạt động nghiên cứu khoa học'
selected_approach: 'progressive-flow'
techniques_used: ['What If Scenarios', 'Morphological Analysis', 'SCAMPER Method', 'Decision Tree Mapping']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Coc
**Date:** 2026-01-02

## Session Overview

**Topic:** Hệ thống quản lý nghiên cứu khoa học - Đại học Sư phạm Kỹ thuật Nam Định

**Goals:** Xây dựng website hiện đại, mượt mà để quản lý các hoạt động nghiên cứu khoa học

### Session Setup

**Phiên làm việc đã được thiết lập thành công!** Chúng ta sẽ tập trung vào việc tạo ra một hệ thống quản lý nghiên cứu khoa học hoàn chỉnh cho trường Đại học Sư phạm Kỹ thuật Nam Định, với ưu tiên về trải nghiệm người dùng hiện đại và mượt mà.

## Technique Selection

**Approach:** Progressive Technique Flow
**Journey Design:** Phát triển có hệ thống từ khám phá đến hành động

**Progressive Techniques:**

- **Giai đoạn 1 - Khám phá:** What If Scenarios - Tạo ra tối đa ý tưởng không giới hạn
- **Giai đoạn 2 - Nhận diện mẫu:** Morphological Analysis - Tổ chức và tìm kiếm insight
- **Giai đoạn 3 - Phát triển:** SCAMPER Method - Tinh chỉnh và hoàn thiện khái niệm
- **Giai đoạn 4 - Lập kế hoạch:** Decision Tree Mapping - Lập kế hoạch triển khai

---

## Technique Execution Results

### Phase 1: Expansive Exploration (What If Scenarios) ✅

#### Ý tưởng chính được khám phá:

| # | Ý tưởng | Mô tả |
|---|---------|-------|
| 1 | **Dynamic Form System** | Form linh hoạt theo role + hành động, tự sinh .docx |
| 2 | **Workflow Engine** | Tự động routing qua 4 bước: Khoa → HĐ KH&ĐT → TVXC → Phê duyệt |
| 3 | **Smart Data Entry** | One-time entry, auto-fill từ database |
| 4 | **Auto Document Generation** | Tự sinh tất cả văn bản .docx từ dữ liệu đã nhập |
| 5 | **SLA & Accountability** | Theo dõi thời gian xử lý, cảnh báo quá hạn |
| 6 | **Role-based Dashboard** | 5 dashboard khác nhau cho 5 vai trò chính |
| 7 | **Dynamic Council Assignment** | Gợi ý thành viên hội đồng theo chuyên môn, check xung đột |

---

### 🔥 Deep Dive: Role-based Dashboard (Ý tưởng #6)

#### 5 Roles Architecture:

```
Giảng viên (Actor gốc)
    ↓
Quản lý Khoa (Chuyên môn)
    ↓
Phòng KHCN (Vận hành - xương sống)
    ↓
BGH/Hiệu trưởng (Quyết định)

Admin (Kỹ thuật) - hỗ trợ tất cả
```

#### Requirements Matrix:

| Role | Độ phức tạp | MUST-HAVE Features |
|------|-------------|-------------------|
| **Giảng viên** | Thấp | ✅ Action items + Deadline<br>✅ History (read-only) + Copy metadata<br>✅ Search member (KHÔNG AI gợi ý)<br>✅ Email + In-app notification |
| **Quản lý Khoa** | TB | ✅ Duyệt + Ghi nhận xét<br>✅ Yêu cầu bổ sung hồ sơ<br>✅ Báo cáo Quý/Năm/Đợt + Export<br>❌ KHÔNG benchmarking với khoa khác |
| **Phòng KHCN** | **CAO NHẤT** | ✅ Bulk action (BẮT BUỘC)<br>✅ SLA tracking<br>✅ Module lập HĐ (bản đơn giản)<br>✅ Export Excel (BẮT BUỘC) |
| **BGH** | Thấp | ✅ Dashboard tổng quan<br>✅ Click-through chi tiết (read-only)<br>✅ Mobile view (CHỈ BGH)<br>✅ Trend 2-3 KPI so với năm trước |
| **Admin** | TB | ✅ Quản lý template (RẤT QUAN TRỌNG)<br>✅ Audit log (BẮT BUỘC)<br>✅ Import user từ Excel (BẮT BUỘC) |

#### Quyết định chiến lược:

1. **"Ưu tiên ổn định > thông minh giả"**
   - KHÔNG AI gợi ý thành viên ở giai đoạn 1
   - Chỉ search + filter theo lĩnh vực/khoa

2. **"Quyền mập mờ = rắc rối"**
   - Quản lý Khoa: KHÔNG thay đổi thành viên, KHÔNG can thiệp kinh phí
   - BGH: Read-only khi click-through

3. **"Không export = không triển khai được"**
   - Phòng KHCN: Export Excel là BẮT BUỘC
   - Thực tế vẫn phải in, trình ký, lưu hồ sơ giấy

4. **"Notification = Email + In-app là đủ"**
   - KHÔNG SMS/Zalo ở giai đoạn đầu
   - Tốn chi phí + phức tạp pháp lý

#### Dashboard Design Principles:

> **Dashboard phải trả lời 3 câu hỏi trong 5 giây:**
> 1. Tôi cần làm gì ngay bây giờ?
> 2. Cái gì đang bị tắc?
> 3. Nếu không làm gì, rủi ro là gì?

**Thứ tự ưu tiên:** Việc cần làm > Trạng thái & trách nhiệm > Biểu đồ tổng hợp

---

### 🔥 Deep Dive: Dynamic Form System (Ý tưởng #1)

#### Nguyên tắc sống còn:

| # | Nguyên tắc | Ý nghĩa |
|---|------------|---------|
| 1 | **Form ≠ UI** | Form là DATA CONTRACT, Backend kiểm soát |
| 2 | **ONE SOURCE OF TRUTH** | Dữ liệu đề tài tồn tại 1 lần, các form sau chỉ đọc/bổ sung |
| 3 | **Form Versioned** | Quy định thay đổi → form thay đổi, dữ liệu cũ không hỏng |

#### Kiến trúc 3 khái niệm BẮT BUỘC:

```
FormTemplate (Định nghĩa)     →     FormInstance (Dữ liệu)     →     DocumentMap (.docx)
┌──────────────┐                    ┌──────────────┐                  ┌──────────────┐
│ id           │                    │ project_id   │                  │ template     │
│ version      │    Render + Fill    │ submitted_by │     Map          │ map: {}      │
│ allowed_roles│   ─────────────▶   │ data: {}     │  ─────────────▶  │              │
│ action       │                    │ submitted_at │                  │              │
│ fields: []   │                    │              │                  │              │
└──────────────┘                    └──────────────┘                  └──────────────┘
```

#### ONE-TIME ENTRY - Chìa khóa của hệ thống:

```javascript
// FormInstance đầu tiên (proposal_v1)
{
  data: { title: "AI trong giáo dục", budget: 150M }
}

// → Promote thành Project Metadata
project.title = "AI trong giáo dục"
project.budget = 150M

// → Các form SAU chỉ ĐỌC
Form tiến độ: Chỉ hỏi "tiến độ%", title tự điền
Form nghiệm thu: Chỉ hỏi "kết quả", title tự điền
```

#### Form theo Role + Action (KHÔNG theo trang):

```
Role          Action          FormTemplate
─────────────────────────────────────────
Giảng viên    SUBMIT_PROPOSAL    proposal_v1
Giảng viên    SUBMIT_PROGRESS    progress_v1
Quản lý Khoa  REVIEW             review_comment
Phòng KHCN    ASSIGN_COUNCIL     council_assign
BGH           APPROVE            approval_note

UI chỉ cần: GET /forms?role=KHOA&action=REVIEW
```

#### Validation tách biệt:

| Layer | Kiểm tra | Mục đích |
|-------|----------|----------|
| Frontend | Format UX | Email đúng format, số → số |
| Backend | **PHÁP LÝ** | Role có quyền? Workflow cho phép? Field đủ? |

#### Auto DOCX Template Engine:

```json
{
  "doc_type": "DE_XUAT_DE_TAI",
  "template": "de_xuat.docx",
  "map": {
    "{{TEN_DE_TAI}}": "project.title",
    "{{CHU_NHIEM}}": "project.owner_name",
    "{{KINH_PHI}}": "project.budget"
  }
}
```

→ Admin chỉ cần upload .docx + define mapping = XONG!

#### NHỮNG THỨ KHÔNG LÀM (Giai đoạn 1):

| ❌ KHÔNG | Tại sao |
|---------|---------|
| Form builder kéo thả | Over-engineer, phức tạp không cần thiết |
| Logic điều kiện phức tạp | Hard to maintain, bug nhiều |
| AI "hiểu ngữ cảnh" | Giả thông minh, dễ sai |
| Form khác nhau theo khoa | Nguy hiểm, khó bảo trì |

#### Tóm lại:

> **"Không xây 'form'. Xây Hệ thống quản lý tri thức + quy trình + pháp lý bằng dữ liệu cấu trúc."**

---

### 🔥 Deep Dive: Workflow Engine (Ý tưởng #2)

#### 11 Trạng thái State Machine:

```
DRAFT → SUBMITTED → FACULTY_REVIEW → COUNCIL_REVIEW → EXPERT_REVIEW
  │         │             │                  │              │
  ▼         ▼             ▼                  ▼              ▼
CANCELLED REJECTED   REVISION_REQUIRED ───────┘         BGH_APPROVAL
                                                           │
                                                           ▼
                                                        ACTIVE
                                                      ┌─┴─┬────────────┐
                                                      ▼   ▼             ▼
                                                   PAUSED COMPLETED   CANCELLED
```

**Giải thích 3 trạng thái đặc biệt:**
- **REVISION_REQUIRED**: Bị trả về + có góp ý (KHÁC DRAFT - về mặt pháp lý & audit)
- **PAUSED**: Chỉ cho giai đoạn ACTIVE, chỉ Phòng KHCN/BGH mới cho phép, có lý do + thời hạn
- **CANCELLED**: Bởi chủ nhiệm (trước ACTIVE) hoặc BGH (bất kỳ lúc nào), không xóa dữ liệu

#### Transition Logic - HYBRID:

```
Bước                Ai quyết định
──────────────────────────────────────────
Khoa duyệt          Con người
Chuyển sang bước tiếp HỆ THỐNG TỰ ĐỘNG
Override đặc biệt   Phòng KHCN
```

**Quyết định:** Auto transition để không tắc workflow, Exception handling bởi Phòng KHCN

#### "Bị trả về" - Logic đúng:

```
COUNCIL_REVIEW → REVISION_REQUIRED → (Giảng viên nộp lại) → COUNCIL_REVIEW ✅
```

**Quyết định:**
- ❌ KHÔNG quay về từ đầu (Khoa duyệt lại)
- ✅ Quay lại đúng cấp đã trả về
- ✅ Quan trọng khi bảo vệ học thuật

#### SLA Table (Ngày làm việc):

| Bước | SLA | Bắt đầu tính | Ai chịu trách nhiệm? |
|------|-----|--------------|---------------------|
| SUBMITTED → FACULTY_REVIEW | **3 ngày** | Khi giảng viên nộp | Khoa |
| FACULTY_REVIEW → COUNCIL_REVIEW | **2 ngày** | Khi khoa duyệt | Hệ thống auto |
| COUNCIL_REVIEW | **5 ngày** | Khi PKHCN trình | HĐ KH&ĐT |
| EXPERT_REVIEW | **5 ngày** | Khi gửi TVXC | TVXC |
| REVISION_REQUIRED | **5 ngày** | Khi gửi feedback | **Giảng viên** |
| BGH_APPROVAL | **3 ngày** | Khi trình BGH | BGH |

⚠️ **REVISION_REQUIRED**: SLA của GIẢNG VIÊN
⚠️ **Các bước khác**: SLA của ĐƠN VỊ GIỞ HỒ SƠ

#### Escalation - 3 Tầng:

| Tầng | Thời điểm | Action | Channel |
|------|-----------|--------|---------|
| T-2 | Sắp hết hạn | Nhắc người giữ hồ sơ | Email + In-app |
| T0 | Quá hạn | Nhắc + Đánh dấu OVERDUE | Email + In-app |
| T+2 | Escalate | Escalate lên Phòng KHCN | Email + In-app |

**Reporting:** Đánh dấu khoa chậm (để REPORT, không phạt tự động)

#### Notification Matrix:

| Event | Ai nhận | Channel | Bắt buộc? |
|-------|---------|---------|-----------|
| Hồ sơ mới nộp | Thư ký Khoa | Email + In-app | ✅ |
| Khoa duyệt xong | Phòng KHCN | Email + In-app | ✅ |
| Hồ sơ bị trả về | Chủ nhiệm | Email + In-app | ✅ |
| Hồ sơ chuyển bước | Người nhận bước mới | Email + In-app | ✅ |
| SLA sắp hết (T-2) | Người giữ | Email + In-app | ✅ (có unsubscribe) |
| SLA quá hạn (T0) | Người giữ + PKHCN | Email + In-app | ✅ |
| SLA quá hạn (T+2) | Phòng KHCN | Email + In-app | ✅ |
| Approved / Rejected | Chủ nhiệm | Email + In-app | ✅ |

#### Bulk Action (Phòng KHCN):

**BẮT BUỘC CÓ:**
- ✅ Bulk trình BGH
- ✅ Bulk chuyển trạng thái
- ✅ Bulk gửi thông báo

**KHÔNG NÊN:**
- ❌ Bulk approve tại BGH (không xem gì)

**BGH có thể "Approve nhanh" NHƯNG phải xem danh sách + có audit log**

---

### 🔥 Deep Dive: Workflow History / Decision Log (Ý tưởng #8 - BẮT BUỘC)

#### Audit Trail Structure:

```
EVERY transition = ONE record

┌──────────────────────────────────────────────────────────┐
│  workflow_log                                             │
│  ────────────────                                         │
│  id                  UUID                                 │
│  project_id         UUID                                 │
│  from_state         STRING  (DRAFT, SUBMITTED, ...)       │
│  to_state           STRING                               │
│  actor              UUID    (user_id)                    │
│  actor_role         STRING  (GIANG_VIEN, KHOA, PKHCN, ...) │
│  timestamp          DATETIME                             │
│  reason             TEXT    (optional - lý do)            │
│  related_doc_ver    STRING  (document version)            │
│  metadata           JSON    (flexible data)               │
│  ────────────────                                         │
│  INDEX: (project_id, timestamp)                           │
└──────────────────────────────────────────────────────────┘
```

#### Tại sao BẮT BUỘC?

| Tình huống | Nếu KHÔNG có | Nếu CÓ |
|------------|--------------|---------|
| "Tại sao đề tài đang treo?" | ❌ Không biết ai đang giữ | ✅ Xem log: Ai, Khi nào, Lý do |
| "Ai đã duyệt?" | ❌ Không biết | ✅ Log rõ: Ai, Khi nào |
| "Tại sao bị trả về?" | ❌ Không nhớ lý do | ✅ Log lưu reason |
| "Báo cáo SLA" | ❌ Không tính được | ✅ Query từ timestamp |
| "Pháp lý - tranh chấp" | ❌ Không có bằng chứng | ✅ Full audit trail |

#### Use Cases:

1. **Dashboard**: Hiển thị "Ai đang giữ", "Đã giữ bao lâu"
2. **Timeline**: Hiển thị lịch sử đề tài cho chủ nhiệm
3. **SLA Report**: Tính thời gian xử lý của từng bước
4. **Pháp lý**: By chứng khi có khiếu nại

---

### 🔥 Deep Dive: Dynamic Form ↔ Workflow Binding (Ý tưởng #9 - BẮT BUỘC)

#### Nguyên tắc cốt lõi:

- **Workflow quyết định Form**, không phải UI
- **Form gắn với Action**, không gắn với Page
- **Role + State + Action = quyền duy nhất**
- 👉 UI chỉ là "renderer", backend là "trọng tài"

#### 3 Bảng Logic:

**Bảng A: State × Role → Allowed Actions**

```
State          Role          Allowed Actions
────────────────────────────────────────────────
DRAFT          Giảng viên    EDIT, SUBMIT, CANCEL
SUBMITTED      Giảng viên    VIEW_ONLY
FACULTY_REVIEW Quản lý Khoa  REVIEW_APPROVE, REVIEW_RETURN
COUNCIL_REVIEW PKHCN         SCHEDULE_COUNCIL
COUNCIL_REVIEW Hội đồng     REVIEW_APPROVE, REVIEW_RETURN
EXPERT_REVIEW  TVXC          REVIEW_SUBMIT
REVISION_REQ   Giảng viên    EDIT, RESUBMIT
BGH_APPROVAL   BGH           APPROVE, REJECT
ACTIVE         PKHCN         PAUSE
ACTIVE         Giảng viên    SUBMIT_PROGRESS
PAUSED         PKHCN         RESUME
ANY            PKHCN         OVERRIDE (audit bắt buộc)
```

**Bảng B: Action → Form Template**

```
Action           Form Template
─────────────────────────────────
SUBMIT           proposal_v1
REVIEW_APPROVE   review_decision
REVIEW_RETURN    review_comment
RESUBMIT         proposal_v1
SCHEDULE_COUNCIL council_schedule
REVIEW_SUBMIT    expert_review
APPROVE          approval_note
SUBMIT_PROGRESS  progress_report
PAUSE            pause_reason
```

**Bảng C: State × Action → Next State**

```
Current State    Action           Next State
─────────────────────────────────────────────
DRAFT            SUBMIT           SUBMITTED
SUBMITTED        (auto)           FACULTY_REVIEW
FACULTY_REVIEW   REVIEW_APPROVE   COUNCIL_REVIEW
FACULTY_REVIEW   REVIEW_RETURN    REVISION_REQ
COUNCIL_REVIEW   REVIEW_APPROVE   EXPERT_REVIEW
COUNCIL_REVIEW   REVIEW_RETURN    REVISION_REQ
EXPERT_REVIEW    REVIEW_SUBMIT    BGH_APPROVAL
REVISION_REQ     RESUBMIT         (previous state)
BGH_APPROVAL     APPROVE          ACTIVE
BGH_APPROVAL     REJECT           REJECTED
ACTIVE           PAUSE            PAUSED
PAUSED           RESUME           ACTIVE
```

#### API Contract:

**GET /projects/{id}/available-actions**
```json
[
  {
    "action": "REVIEW_APPROVE",
    "form": "review_decision",
    "label": "Phê duyệt"
  },
  {
    "action": "REVIEW_RETURN",
    "form": "review_comment",
    "label": "Yêu cầu chỉnh sửa"
  }
]
```

**POST /projects/{id}/actions/{action}**
- Backend checks: State, Role, Action validity, Form template, Validation, Transition

#### 4 Edge Cases BẮT BUỘC PHẢI KHÓA:

| ❌ Edge Case | Tại sao phải khóa? |
|--------------|-------------------|
| Giảng viên mở form khi state = FACULTY_REVIEW | Sai quy trình |
| Khoa sửa proposal khi state = COUNCIL_REVIEW | Vi phạm quyền |
| BGH submit form khác approval_note | Sai template |
| PKHCN override mà không có reason | Audit trail mất |

#### Checklist Tự Kiểm (4 YES = Đóng module):

| ✅ | Câu hỏi |
|----|---------|
| 1 | Ở mỗi state, UI chỉ hiện đúng action? |
| 2 | Action nào cũng map được form? |
| 3 | Không action nào bypass backend? |
| 4 | Audit log trả lời được "ai làm gì bằng form nào"? |

---

### 🔥 Deep Dive: RBAC Architecture (Ý tưởng #10 - BẮT BUỘC)

#### 3 Trục DUY NHẤT:

```
ROLE + STATE + ACTION = PERMISSION?
```

**Quyết định cốt lõi:**
- ❌ KHÔNG permission theo menu
- ❌ KHÔNG permission theo page
- ❌ KHÔNG "role chung chung"

#### 6 Roles (Đã chốt):

| Role | Description |
|------|-------------|
| GIANG_VIEN | Giảng viên / Chủ nhiệm đề tài |
| QUAN_LY_KHOA | Quản lý Khoa |
| PHONG_KHCN | Phòng Khoa học & Công nghệ |
| HOI_DONG | Thành viên Hội đồng / TVXC |
| BGH | Ban Giám hiệu / Hiệu trưởng |
| ADMIN | Quản trị hệ thống (kỹ thuật) |

#### Atomic Actions (Không trùng nghĩa):

```
EDIT_FORM, SUBMIT, CANCEL, RESUBMIT,
REVIEW_APPROVE, REVIEW_RETURN, REVIEW_SUBMIT,
APPROVE, REJECT, PAUSE, RESUME,
OVERRIDE, VIEW_ONLY
```

**❌ KHÔNG dùng:** EDIT, MANAGE, FULL_ACCESS

#### Rule Engine - Luật tối cao:

```
Role          State          Allowed Actions
────────────────────────────────────────────────
Giảng viên    DRAFT          EDIT_FORM, SUBMIT, CANCEL
Giảng viên    REVISION_REQ   EDIT_FORM, RESUBMIT
Giảng viên    ACTIVE         SUBMIT_PROGRESS
Quản lý Khoa  FACULTY_REVIEW REVIEW_APPROVE, REVIEW_RETURN
Hội đồng      COUNCIL_REVIEW REVIEW_APPROVE, REVIEW_RETURN
TVXC          EXPERT_REVIEW  REVIEW_SUBMIT
BGH           BGH_APPROVAL   APPROVE, REJECT
Phòng KHCN    ANY            OVERRIDE (audit bắt buộc)
Admin         ANY            TECHNICAL_ONLY
```

**Luật:** Không có dòng trong bảng = KHÔNG được làm

#### Permission Boundary:

| ❌ CẤM TUYỆT ĐỐI | Tại sao? |
|------------------|-----------|
| "Admin làm được tất cả" | Sai nghiệp vụ, nguy hiểm pháp lý |
| Giảng viên sửa proposal khi state ≠ DRAFT/REVISION | Sai quy trình |
| Khoa can thiệp kinh phí | Vi phạm quyền hạn |
| BGH chỉnh form nội dung | Sai vai trò |

#### RBAC Flow (Backend):

```
User calls: POST /projects/{id}/actions/{action}
         ↓
Backend RBAC Check:
  1. Get user.role
  2. Get project.current_state
  3. Check: isAllowed(role, state, action)?
         ↓
   ┌─────┬─────────────────────────┐
   │ ❌  │ 403 Forbidden           │
   │ NO  │                         │
   ├─────┼─────────────────────────┤
   │ ✅  │ Continue workflow       │
   │ YES │ → Log action            │
   │     │ → Update state          │
   └─────┴─────────────────────────┘
```

**UI chỉ:** Hỏi "tôi được làm gì?" + Render đúng button

#### Impact đến Dashboard:

- Button nào hiện? → RBAC.allowed_actions
- Card nào active? → RBAC.state_access
- Việc nào trong To-do? → RBAC.pending_actions

👉 Dashboard không có logic riêng, chỉ đọc RBAC + Workflow

#### Checklist (5/5 YES = RBAC đủ cứng):

| # | Checklist | YES/NO |
|---|-----------|--------|
| 1 | Không có permission theo page | |
| 2 | Không có "role toàn năng" | |
| 3 | Mỗi action đều gắn state | |
| 4 | Mọi vi phạm đều bị chặn ở backend | |
| 5 | Override luôn có audit log | |

---

### Phase 2: Pattern Recognition (Morphological Analysis) ✅

#### 6 Parameters Identified:

| P | Parameter | Values |
|---|-----------|--------|
| P1 | ROLES | 6 (GIANG_VIEN, QUAN_LY_KHOA, PHONG_KHCN, HOI_DONG, BGH, ADMIN) |
| P2 | STATES | 11 (DRAFT, SUBMITTED, FACULTY_REVIEW, COUNCIL_REVIEW, EXPERT_REVIEW, REVISION_REQUIRED, BGH_APPROVAL, ACTIVE, PAUSED, COMPLETED, CANCELLED, REJECTED) |
| P3 | ACTIONS | 13 (EDIT_FORM, SUBMIT, CANCEL, RESUBMIT, REVIEW_APPROVE, REVIEW_RETURN, REVIEW_SUBMIT, APPROVE, REJECT, PAUSE, RESUME, OVERRIDE, VIEW_ONLY) |
| P4 | FORMS | 9 templates |
| P5 | NOTIFICATIONS | 8 events |
| P6 | DOCUMENTS | 5 types |

#### Pattern Analysis Results:

**Pattern 1: Permission Binding**
- Phòng KHCN là role phức tạp nhất (ALL states + OVERRIDE)
- Admin là role đơn giản nhất (TECHNICAL_ONLY)

**Pattern 2: Form-Action Binding**
- ⚠️ Thiếu form `override_reason` cho action OVERRIDE

**Pattern 3: State Transition Flow**
- ✅ Flow đúng, không có dead-end ngoài terminal states

**Pattern 4: Notification Coverage**
- ⚠️ Thiếu notification khi RESUME từ PAUSED

#### Module Clusters (6 Groups):

```
CLUSTER 1: AUTHORIZATION & ACCESS
├── RBAC (Role + State + Action)
├── Workflow Binding (3 bảng logic)
└── Permission Boundary

CLUSTER 2: FORM & DATA
├── Dynamic Form System (Template + Instance)
├── One-time Entry (Source of Truth)
└── Document Generation (.docx)

CLUSTER 3: WORKFLOW ORCHESTRATION
├── State Machine (11 states)
├── SLA Engine (Escalation 3 tầng)
├── Auto-transition
└── Manual Override (PKHCN)

CLUSTER 4: USER INTERFACE
├── Role-based Dashboard (5 variants)
├── Action Button (Render từ RBAC)
└── Timeline Visualization

CLUSTER 5: NOTIFICATION & COMMUNICATION
├── Email Service
├── In-app Notification
└── SLA Reminder (T-2, T0, T+2)

CLUSTER 6: AUDIT & COMPLIANCE
├── Workflow History / Decision Log
└── FormInstance Versioning
```

#### Gap Analysis:

| Gap | Mô tả | Ưu tiên |
|-----|-------|---------|
| 1 | Form `override_reason` cho action OVERRIDE | 🔴 High |
| 2 | Notification khi RESUME từ PAUSED | 🟡 Medium |
| 3 | Export Excel detail | 🟢 Low |
| 4 | Import user from Excel detail | 🟢 Low |

#### System Architecture:

```
DASHBOARD (5 ROLES)
      ↓
RBAC LAYER (ROLE + STATE + ACTION)
      ↓
WORKFLOW ENGINE (State Machine + SLA + Auto)
      ├──────────────┐
      ↓              ↓
FORM SYSTEM     AUDIT LOG
(Template+      (Decision)
 Instance)          ↓
      ↓        DOC ENGINE
   DOC ENGINE   (.docx gen)
```

---

### Phase 4: Action Planning (Decision Tree Mapping) ✅

#### Implementation Decision Tree:

```
[BẮT ĐẦU]
   │
   ▼
PHASE 0: SETUP (Tuần 1-2)
   │
   ├──────────────────┬──────────────────┬──────────────────┐
   ▼                  ▼                  ▼                  ▼
PHASE 1:        PHASE 2:          PHASE 3:          PHASE 4:
AUTHZ (3-4)      FORM (5-7)        WORKFLOW (8-10)   UI (11-13)
   │                  │                  │                  │
   └──────────────────┴──────────────────┴──────────────────┘
                                │
                                ▼
                        PHASE 5: NOTIF (14-15)
                                │
                                ▼
                        PHASE 6: AUDIT (16)
                                │
                                ▼
                        PHASE 7: LAUNCH (17-18)
```

#### Tech Stack Decision:

| Component | Decision | Lý do |
|-----------|----------|-------|
| Frontend | **Next.js** | SSR, SEO friendly, modern |
| Backend | **Node.js + Express** | Fast, dễ scale, JavaScript full-stack |
| Database | **PostgreSQL** | Relational, audit trail, ACID |
| Doc Gen | **docx-template** | Node.js library, flexible |
| Auth | **JWT** | Stateless, scalable |

#### Phase Breakdown:

| Phase | Tuần | Deliverables |
|-------|------|--------------|
| 0: Setup | 1-2 | Project foundation, DB schema, Environment |
| 1: RBAC | 3-4 | Auth, Permission engine, API middleware |
| 2: Forms | 5-7 | Dynamic form, One-time entry, Doc gen |
| 3: Workflow | 8-10 | State machine, SLA, Escalation |
| 4: Dashboard | 11-13 | 5 Role dashboards, Timeline, Actions |
| 5: Notification | 14-15 | Email service, In-app, SLA reminder |
| 6: Audit | 16 | Workflow log, Decision log, Export |
| 7: Launch | 17-18 | UAT, Training, Go-live |

**Total: 18 tuần (~4.5 tháng)**

#### Risk Mitigation:

| Risk | P | I | Mitigation |
|------|---|---|------------|
| Scope creep | M | H | Strict adherence to spec, Phase 1 only |
| Data migration | L | H | Early analysis, backup plan |
| User adoption | M | H | Early training, support team |
| Performance | L | M | Load testing, optimization |

#### Success Criteria:

- ✅ 100% workflows digitized
- ✅ SLA > 90% on-time processing
- ✅ User adoption > 80% within 3 months
- ✅ Zero data loss
- ✅ Audit trail for all actions

---

## 🎯 BRAINSTORMING SESSION COMPLETE

**Facilitator:** Coc
**Date:** 2026-01-02
**Duration:** ~4 hours
**Techniques Used:** What If Scenarios, Morphological Analysis, Decision Tree Mapping
**Deep Dives:** 6 modules (Form, Workflow, Dashboard, Binding, RBAC, Audit Log)

**Key Outputs:**
- 7 core ideas identified
- 6 module clusters defined
- System architecture designed
- 18-week implementation plan
- Tech stack selected
- Risk mitigation plan

---

### Phase 3: Idea Development (SCAMPER Method)

*Bỏ qua - Chuyển thẳng sang Phase 4*
