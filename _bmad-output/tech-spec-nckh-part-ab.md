          "full_name": "Thư ký Khoa CNTT"
        },
        "current_holder_since": "2024-03-13T10:00:00Z",
        "sla_remaining_hours": 24,
        "created_at": "2024-03-12T10:30:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

#### GET /api/projects/:id
Get project details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_code": "PRJ-2024-001",
    "title": "Ứng dụng AI trong giáo dục",
    "description": "...",
    "research_field": "AI",
    "project_type": "CAP_TRUONG",
    "budget": 150000000,
    "owner": {
      "id": "uuid",
      "full_name": "Nguyễn Văn A",
      "email": "a@example.com"
    },
    "faculty": "Khoa CNTT",
    "state": "FACULTY_REVIEW",
    "current_holder": {...},
    "timeline": [
      {"state": "DRAFT", "at": "2024-03-12T10:00:00Z", "by": "Nguyễn Văn A"},
      {"state": "SUBMITTED", "at": "2024-03-12T10:30:00Z", "by": "Nguyễn Văn A"},
      {"state": "FACULTY_REVIEW", "at": "2024-03-13T09:00:00Z", "by": "System"}
    ],
    "members": [...],
    "documents": [...]
  }
}
```

#### POST /api/projects
Create new project (DRAFT state).

**P0-2: project_type is hardcoded to CAP_TRUONG for MVP**

**Request:**
```json
{
  "title": "Ứng dụng AI trong giáo dục",
  "description": "...",
  "research_field": "AI",
  "project_type": "CAP_TRUONG",  // Optional: ignored by backend, always set to CAP_TRUONG
  "budget": 150000000
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_code": "PRJ-2024-001",
    "state": "DRAFT",
    "project_type": "CAP_TRUONG",  // Always CAP_TRUONG for MVP
    ...
  }
}
```

**Backend Implementation (P0-2):**
```javascript
async function createProject(data, userId) {
  // P0-2: Hardcode project_type to CAP_TRUONG, ignore input
  return db.projects.create({
    data: {
      ...data,
      project_type: 'CAP_TRUONG',  // MVP: only CAP_TRUONG allowed
      created_by: userId,
      state: 'DRAFT'
    }
  });
}
```

#### GET /api/projects/:id/available-actions
Get allowed actions for current user on this project.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "current_state": "FACULTY_REVIEW",
    "user_role": "QUAN_LY_KHOA",
    "available_actions": [
      {
        "action": "REVIEW_APPROVE",
        "form": "review_decision",
        "label": "Phê duyệt",
        "icon": "check"
      },
      {
        "action": "REVIEW_RETURN",
        "form": "review_comment",
        "label": "Yêu cầu chỉnh sửa",
        "icon": "edit"
      }
    ]
  }
}
```

#### POST /api/projects/:id/actions/:action
Execute an action on a project.

**Request (for REVIEW_APPROVE with form):**
```json
{
  "form_data": {
    "decision": "APPROVE",
    "comment": "Đề xuất phù hợp, trình trường"
  }
}
```

**Request (for OVERRIDE):**
```json
{
  "reason": "Cần xử lý gấp do yêu cầu BGH",
  "target_state": "BGH_APPROVAL"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "previous_state": "FACULTY_REVIEW",
    "new_state": "COUNCIL_REVIEW",
    "workflow_log_id": "uuid",
    "notification_sent": true
  }
}
```

**Error (403):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSION",
  "message": "Bạn không có quyền thực hiện hành động này ở trạng thái hiện tại"
}
```

#### GET /api/projects/:id/history
Get project workflow history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "uuid",
        "from_state": "FACULTY_REVIEW",
        "to_state": "COUNCIL_REVIEW",
        "action": "REVIEW_APPROVE",
        "actor": {
          "id": "uuid",
          "full_name": "Thư ký Khoa CNTT",
          "role": "QUAN_LY_KHOA"
        },
        "timestamp": "2024-03-13T14:20:00Z",
        "reason": "Đề xuất phù hợp chuyên môn",
        "document": {
          "id": "uuid",
          "file_name": "bien_ban_khoa.docx"
        }
      }
    ]
  }
}
```

### 4.3 Forms

#### GET /api/forms
Get available forms for user role and action.

**Query Params:**
- `role`: User role
- `action`: Action to perform
- `project_id`: Project context (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "form": {
      "id": "uuid",
      "code": "proposal_v1",
      "name": "Đề xuất đề tài",
      "version": "1.0",
      "fields": [
        {
          "key": "title",
          "type": "string",
          "label": "Tên đề tài",
          "required": true,
          "placeholder": "Nhập tên đề tài"
        },
        {
          "key": "research_field",
          "type": "enum",
          "label": "Lĩnh vực",
          "required": true,
          "options": ["AI", "IoT", "Education", "Engineering"]
        }
      ],
      "validation_rules": {...}
    },
    "pre_filled_data": {
      "owner_name": "Nguyễn Văn A",
      "faculty": "Khoa CNTT",
      "email": "a@example.com"
    }
  }
}
```

#### POST /api/form-instances
Submit form instance.

**Request:**
```json
{
  "project_id": "uuid",
  "form_template_id": "uuid",
  "data": {
    "title": "Ứng dụng AI trong giáo dục",
    "research_field": "AI",
    "budget": 150000000,
    "description": "..."
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "status": "SUBMITTED",
    "submitted_at": "2024-03-12T10:30:00Z",
    "documents_generated": [
      {
        "id": "uuid",
        "file_name": "de_xuat_de_tai.docx",
        "download_url": "/api/documents/uuid/download"
      }
    ]
  }
}
```

### 4.4 Approval Tasks (Inbox/Queue)

#### GET /api/tasks
Get approval tasks for the current user (Inbox).

**Query Params:**
- `status`: Filter by status (PENDING, IN_PROGRESS, COMPLETED, etc.)
- `stage`: Filter by stage (FACULTY_REVIEW, COUNCIL_REVIEW, etc.)
- `overdue`: true/false to show overdue tasks only

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "project_title": "Ứng dụng AI trong giáo dục",
        "project_code": "PRJ-2024-001",
        "stage": "FACULTY_REVIEW",
        "status": "PENDING",
        "assigned_at": "2024-03-13T09:00:00Z",
        "due_at": "2024-03-18T17:00:00Z",
        "is_overdue": false,
        "sla_remaining_hours": 48,
        "owner": {
          "id": "uuid",
          "full_name": "Nguyễn Văn A"
        },
        "faculty": "Khoa CNTT"
      }
    ],
    "summary": {
      "total": 15,
      "pending": 8,
      "overdue": 2
    }
  }
}
```

#### GET /api/tasks/:id
Get approval task details.

#### POST /api/tasks/:id/decision
Submit a decision on an approval task.

**Request:**
```json
{
  "decision": "APPROVE",
  "comment": "Đề xuất phù hợp chuyên môn"
}
```

OR

```json
{
  "decision": "REQUEST_CHANGES",
  "comment": "Cần làm rõ phần kinh phí",
  "change_requests": [
    {"field": "budget", "issue": "Kinh phí chưa hợp lý"}
  ]
}
```

OR

```json
{
  "decision": "REJECT",
  "reason": "Không phù hợp quy định"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "previous_state": "FACULTY_REVIEW",
    "new_state": "COUNCIL_REVIEW",
    "workflow_log_id": "uuid",
    "next_task_id": "uuid"
  }
}
```

#### POST /api/tasks/:id/start
Mark task as started (for IN_PROGRESS tracking).

#### GET /api/tasks/statistics
Get task statistics for dashboard.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "by_stage": {
      "FACULTY_REVIEW": 5,
      "COUNCIL_REVIEW": 3,
      "EXPERT_REVIEW": 4,
      "BGH_REVIEW": 2
    },
    "by_status": {
      "PENDING": 12,
      "IN_PROGRESS": 2,
      "OVERDUE": 2
    },
    "my_overdue": 1
  }
}
```

### 4.5 Dashboard

#### GET /api/dashboard
Get role-based dashboard data.

**Query Params:**
- `role`: Override role (admin only)

**Response (200) - For GIANG_VIEN:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_projects": 5,
      "active_projects": 3,
      "pending_actions": 2,
      "completed_projects": 1
    },
    "my_projects": [
      {
        "id": "uuid",
        "project_code": "PRJ-2024-001",
        "title": "Ứng dụng AI trong giáo dục",
        "state": "FACULTY_REVIEW",
        "state_label": "Chờ duyệt Khoa",
        "current_holder": {...},
        "sla_remaining_hours": 24,
        "sla_status": "OK"
      }
    ],
    "action_items": [
      {
        "type": "SUBMIT_PROGRESS",
        "project_id": "uuid",
        "project_title": "IoT trong agriculture",
        "deadline": "2024-03-20T00:00:00Z",
        "overdue": false
      }
    ],
    "notifications": [
      {
        "id": "uuid",
        "title": "Đề tài PRJ-2024-001 đã được duyệt",
        "content": "...",
        "is_read": false,
        "created_at": "2024-03-13T14:20:00Z"
      }
    ]
  }
}
```

**Response (200) - For PHONG_KHCN:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_projects": 87,
      "active_projects": 62,
      "completed_projects": 25,
      "sla_compliance": 0.78
    },
    "sla_overdue": [
      {
        "project_id": "uuid",
        "project_title": "...",
        "current_state": "FACULTY_REVIEW",
        "overdue_hours": 48,
        "current_holder": {...}
      }
    ],
    "pending_approval_queue": {
      "faculty_review": 5,
      "council_review": 3,
      "expert_review": 4,
      "bgh_approval": 2
    },
    "by_faculty": [
      {"faculty": "Khoa CNTT", "count": 15, "budget": 1200000000, "sla_rate": 0.80},
      {"faculty": "Khoa KT", "count": 12, "budget": 800000000, "sla_rate": 0.85}
    ]
  }
}
```

### 4.5 Documents

#### GET /api/documents/:id/download
Download generated document.

#### POST /api/documents/generate
Manually trigger document generation.

**Request:**
```json
{
  "project_id": "uuid",
  "document_template_code": "QUYET_DINH_PHE_DUYET"
}
```

#### POST /api/documents/:id/upload-signed (P0.2 - CRITICAL)

Upload signed (scanned) document for approval workflow gating.

**Purpose:** Upload scan file có chữ ký tay để hệ thống xác nhận "đã ký" và unlock các action tiếp theo.

**Request (multipart/form-data):**
```
document_id: uuid
file: <binary> (PDF/JPG/PNG, max 10MB)
verification_code: string (optional - from document watermark)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "file_url": "https://storage.../signed_abc123.pdf",
    "uploaded_at": "2024-03-15T14:30:00Z",
    "signature_type": "SCAN_HANDWRITTEN",
    "verification_status": "VERIFIED",
    "workflow_unlocked": true
  }
}
```

**Validation Rules:**
```javascript
// Backend validation
async function uploadSignedDocument(documentId, file, userId) {
  // 1. Verify document exists and belongs to user's project
  const document = await db.documents.findUnique({ where: { id: documentId }});
  if (!document) throw new NotFoundError('Document not found');

  // 2. Check user has permission (PI, Khoa, or PKHCN)
  const project = await db.projects.findUnique({ where: { id: document.project_id } });
  if (!canUploadSigned(userId, project)) {
    throw new ForbiddenError('No permission to upload signed document');
  }

  // 3. Validate file format & size
  validateSignatureFile(file);  // See Section 6.8.2

  // 4. Upload to storage
  const fileUrl = await storage.upload(file);

  // 5. Update document record
  const updated = await db.documents.update({
    where: { id: documentId },
    data: {
      signed_file_url: fileUrl,
      signed_uploaded_by: userId,
      signed_uploaded_at: new Date(),
      signature_type: 'SCAN_HANDWRITTEN',
      verification_status: 'VERIFIED'
    }
  });

  // 6. Log audit event
  await logWorkflowEvent({
    project_id: project.id,
    action: 'SIGNED_DOCUMENT_UPLOADED',
    actor_id: userId,
    document_id: documentId,
    metadata: {
      file_url: fileUrl,
      signature_type: 'SCAN_HANDWRITTEN'
    }
  });

  // 7. Check if stage requirements are met
  await checkStageCompleteness(project.id);

  return updated;
}
```

**P0-3: Workflow Gating Rules - Stage Pack Requirements**

```javascript
// P0-3: Actions blocked until ALL signed documents uploaded for current stage
// P1.5: Updated mapping based on actual form requirements
const STAGE_PACK_REQUIREMENTS = {
  // Phase A: Proposal Submit
  'SUBMITTED': ['DOC_MAU_01B'],                    // PI ký scan Mẫu 1b - Phiếu đề xuất

  // Phase A: Faculty Review (Khoa)
  'FACULTY_REVIEW': ['DOC_MAU_02B', 'DOC_MAU_03B'],
  // MAU_02B: Phiếu đánh giá (cấp Khoa) - Khoa ký
  // MAU_03B: Biên bản họp đánh giá (cấp Khoa) - Khoa ký

  // Phase A: School Selection Review (Trường - Sơ bộ)
  'SCHOOL_SELECTION_REVIEW': ['DOC_MAU_04B', 'DOC_MAU_05B'],
  // MAU_04B: Danh mục tổng hợp kết quả xét chọn (PHIẾU TỔNG - giai đoạn A) - PKHCN chuẩn bị
  // MAU_05B: Biên bản họp xét chọn sơ bộ cấp Trường - Ban chủ nhiệm ký

  // Phase B: Outline Council Review
  'OUTLINE_COUNCIL_REVIEW': ['DOC_MAU_06B'],      // Biên bản HĐ tư vấn xét chọn đề cương
  'CHANGES_REQUESTED': ['DOC_MAU_07B'],            // Báo cáo hoàn thiện đề cương (nếu có chỉnh sửa)

  // Phase C: Faculty Acceptance Review
  'FACULTY_ACCEPTANCE_REVIEW': [
    'DOC_MAU_08B',  // Giấy đề nghị thành lập HĐ ĐGNT cấp Khoa
    'DOC_MAU_09B',  // Phiếu đánh giá, nghiệm thu cấp Khoa
    'DOC_MAU_10B',  // Biên bản họp HĐ ĐGNT cấp Khoa
    'DOC_MAU_11B'   // Báo cáo hoàn thiện hồ sơ NT cấp Khoa
  ],

  // Phase D: School Acceptance Review (P1.5: Updated to include MAU_12B)
  'SCHOOL_ACCEPTANCE_REVIEW': [
    'DOC_MAU_12B',  // P1.5: Nhận xét phản biện (Phản biện số 3) - PL3 ký
    'DOC_MAU_13B',  // Giấy đề nghị thành lập HĐ ĐGNT cấp Trường
    'DOC_MAU_14B',  // Phiếu đánh giá, nghiệm thu cấp Trường
    'DOC_MAU_15B',  // Biên bản họp HĐ ĐGNT cấp Trường
    'DOC_MAU_16B'   // P1.5: PHIẾU TỔNG (Báo cáo hoàn thiện hồ sơ NT cấp Trường)
  ],

  // Phase E: Handover
  'HANDOVER': ['DOC_MAU_17B']                      // Biên bản giao nhận sản phẩm
};

// P1.5: Stage pack requirements with vote_tally support
const STAGE_VOTE_TALLY_REQUIREMENTS = {
  'FACULTY_REVIEW': true,           // Có vote tally cho Mẫu 2b, 3b
  'SCHOOL_SELECTION_REVIEW': true,  // Có vote tally cho Mẫu 4b, 5b
  'OUTLINE_COUNCIL_REVIEW': true,   // Có vote tally cho Mẫu 6b
  'FACULTY_ACCEPTANCE_REVIEW': true, // Có vote tally cho Mẫu 8b–11b
  'SCHOOL_ACCEPTANCE_REVIEW': true   // P1.5: Có vote tally cho Mẫu 12b–16b
};

// P0-3: assertion function - MUST be called before every APPROVE or SUBMIT
async function assertStagePackComplete(projectId, stage) {
  const requiredCodes = STAGE_PACK_REQUIREMENTS[stage];
  if (!requiredCodes || requiredCodes.length === 0) return true;

  const uploadedDocs = await db.documents.findMany({
    where: {
      project_id: projectId,
      template_code: { in: requiredCodes },
      signed_file_url: { not: null }  // Must have signed upload
    }
  });

  const uploadedCodes = uploadedDocs.map(d => d.template_code);
  const missing = requiredCodes.filter(code => !uploadedCodes.includes(code));

  if (missing.length > 0) {
    const missingNames = missing.map(code => FORM_TEMPLATE_NAMES[code]);
    throw new StagePackIncompleteError(
      `Thiếu biểu mẫu đã ký để chuyển giai đoạn. Cần upload: ${missingNames.join(', ')}`
    );
  }

  return true;
}

// Legacy alias - use STAGE_PACK_REQUIREMENTS directly
const SIGNED_DOC_REQUIREMENTS = STAGE_PACK_REQUIREMENTS;

// Check if action is allowed based on signed documents
function canPerformAction(projectState, action, projectId) {
  const requiredDocs = STAGE_PACK_REQUIREMENTS[projectState];
  if (!requiredDocs || requiredDocs.length === 0) return true;

  const uploadedDocs = getSignedDocuments(projectId, projectState);
  const hasAllRequired = requiredDocs.every(doc => uploadedDocs.includes(doc));

  if (!hasAllRequired) {
    throw new WorkflowBlockedError(
      `Thiếu biểu mẫu đã ký. Vui lòng upload: ${requiredDocs.filter(d => !uploadedDocs.includes(d)).join(', ')}`
    );
  }

  return true;
}

// Apply gating before state transitions
async function transitionTo(projectId, targetState, action) {
  const project = await getProject(projectId);

  // Check signed document requirements
  canPerformAction(project.state, action, projectId);

  // Perform transition
  await updateProjectState(projectId, targetState);
}
```

**P0-3: UI Integration - Show Missing Forms Prompt**

```tsx
// P0-3: Show upload prompt when action is blocked by stage pack requirement
function ActionButton({ project, action, onClick }) {
  const { data: signedDocs } = useQuery(['signed-docs', project.id]);

  const requiredDocs = STAGE_PACK_REQUIREMENTS[project.state];
  const hasAllRequired = requiredDocs?.every(doc =>
    signedDocs?.some(d => d.template_code === doc && d.signed_uploaded)
  );

  if (!hasAllRequired) {
    const missing = requiredDocs.filter(d =>
      !signedDocs?.some(s => s.template_code === d && s.signed_uploaded)
    );
    const missingNames = missing.map(code => FORM_TEMPLATE_NAMES[code]).join(', ');

    return (
      <Tooltip content={`Thiếu biểu mẫu: ${missingNames}`}>
        <Button disabled variant="outline">
          <Upload className="mr-2" />
          Upload biểu mẫu đã ký ({missing.length} còn thiếu)
        </Button>
      </Tooltip>
    );
  }

  return <Button onClick={onClick}>{action}</Button>;
}
```

#### GET /api/documents/:project/signed-list

List all documents requiring signature for a project, with their signed status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "current_state": "FACULTY_ACCEPTANCE_REVIEW",
    "documents": [
      {
        "template_code": "MAU_08B",
        "template_name": "Mẫu 8b - Biên bản nghiệm thu Khoa",
        "signed_file_url": "https://storage.../signed.pdf",
        "signed_uploaded": true,
        "signed_uploaded_at": "2024-03-15T14:30:00Z",
        "signed_uploaded_by": "user_name"
      },
      {
        "template_code": "MAU_09B",
        "template_name": "Mẫu 9b - Phiếu đánh giá sản phẩm",
        "signed_uploaded": false,
        "required": true
      }
    ],
    "is_stage_complete": false,
    "missing_count": 3
  }
}
```

#### POST /api/documents/:id/verify-signature

Admin/Thư ký verifies the uploaded signed document (visual check).

**Request:**
```json
{
  "verified": true,
  "notes": "Chữ ký rõ ràng, đầy đủ thông tin"
}
```

### 4.6 Notifications

#### GET /api/notifications
Get user notifications.

**Query Params:**
- `unread_only`: true/false
- `limit`: Default 20

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "IN_APP",
        "event_type": "PROJECT_SUBMITTED",
        "title": "Đề tài mới cần duyệt",
        "content": "Đề tài 'PRJ-2024-001' đã được nộp",
        "project_id": "uuid",
        "is_read": false,
        "created_at": "2024-03-12T10:30:00Z"
      }
    ],
    "unread_count": 5
  }
}
```

#### POST /api/notifications/:id/read
Mark notification as read.

#### POST /api/notifications/read-all
Mark all notifications as read.

### 4.7 Admin

#### GET /api/admin/users
List all users (admin only).

#### POST /api/admin/users
Create new user.

#### POST /api/admin/users/import
Import users from Excel.

#### GET /api/admin/form-templates
CRUD for form templates.

#### POST /api/admin/form-templates
Create new form template.

#### GET /api/admin/audit-logs
Get system audit logs.

---

## 5. Frontend Components

### 5.1 Page Structure

```
/app
  /auth
    /login
    /logout
  /dashboard              # Role-based redirect
  /projects
    /index                # List projects
    /[id]                 # Project detail
    /new                  # Create new project
  /forms
    /[id]                 # Fill form
  /documents
    /[id]/download
  /profile
  /admin
    /users
    /roles
    /form-templates
    /audit-logs
```

#### 5.1.1 P0-5: MVP Scope Constraint (CAP_TRUONG Only)

**UI Filter Restriction:**
```tsx
// P0-5: DO NOT show "Cấp Khoa" filter in MVP
// Project type is hardcoded to CAP_TRUONG

// ❌ REMOVE for MVP:
const PROJECT_TYPE_OPTIONS = [
  { value: 'CAP_KHOA', label: 'Cấp Khoa' },   // REMOVE
  { value: 'CAP_TRUONG', label: 'Cấp Trường' }
];

// ✅ USE instead:
const SHOW_PROJECT_TYPE_FILTER = false;  // Only CAP_TRUONG in MVP

// If filter is shown, only have CAP_TRUONG:
const PROJECT_TYPE_OPTIONS_MVP = [
  { value: 'CAP_TRUONG', label: 'Cấp Trường' }
];
```

**Backend Enforcement:**
```javascript
// P0-5: Hardcode project_type on create
async function createProject(data, userId) {
  return db.projects.create({
    data: {
      ...data,
      project_type: 'CAP_TRUONG',  // Hardcoded, ignore input
      created_by: userId
    }
  });
}
```

### 5.2 Dashboard Components (Per Role)

#### Giảng viên Dashboard
```tsx
<GiảngVienDashboard>
  <ProjectStatusCard>           // Current status, who's holding
  <TimelineVisualization>       // 13-step process
  <MyActionItems>               // To-do list with deadlines
  <MyProjectsList>              // All my projects
  <RecentNotifications>
</GiảngVienDashboard>
```

#### Quản lý Khoa Dashboard
```tsx
<QuanLyKhoaDashboard>
  <KhoaSummary>                // Total projects, SLA rate
  <ApprovalQueue>              // Projects waiting review
  <SLAAlert>                   // Overdue projects
  <RecentActivity>
</QuanLyKhoaDashboard>
```

#### Phòng KHCN Dashboard
```tsx
<PhongKHCNDashboard>
  <SchoolSummary>              // Total stats, budget
  <PendingByState>             // Queue by state
  <SLAOverdue>                 // Overdue items
  <ByFacultyStats>             // Breakdown by faculty
  <TodayTasks>                 // Action items
  <BulkActions>                 // Bulk approve, transfer
</PhongKHCNDashboard>
```

#### BGH Dashboard
```tsx
<BGHDashboard>
  <ExecutiveSummary>           // 4 KPIs
  <ByFacultyChart>             // Projects by faculty
  <ByFieldChart>               // Projects by field
  <RisksAndAlerts>             // Need attention
  <PendingApprovals>           // Quick approve list
</BGHDashboard>
```

#### Admin Dashboard
```tsx
<AdminDashboard>
  <SystemStatus>               // Server, DB health
  <UserStats>                  // Active users, pending
  <Configuration>              // Templates, SLA rules
  <Security>                   // Failed logins, audit
</AdminDashboard>
```

### 5.3 Shared Components

#### ActionButton
```tsx
<ActionButton
  projectId="uuid"
  action="REVIEW_APPROVE"
  form="review_decision"
  onSuccess={handleSuccess}
/>
```

#### StatusCard
```tsx
<StatusCard
  project={project}
  showTimeline
  showHolder
  showSLA
/>
```

#### Timeline
```tsx
<Timeline
  steps={standardSteps}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onClickStep={handleClickStep}
/>
```

#### FormRenderer
```tsx
<FormRenderer
  template={formTemplate}
  preFilledData={preFilledData}
  onSubmit={handleSubmit}
  validation={validationRules}
/>
```

---

## 6. Business Logic

### 6.1 State Machine

#### 6.1.1 State Enum Definition (Mapping with Forms)

**Workflow State** (`projects.state`) - Trạng thái pháp lý của đề tài, **ánh xạ 1-1 với biểu mẫu thực tế**:

| Stage | State Code | Label (VN) | Label (EN) | Category | Biểu mẫu (Phụ lục II) | Description |
|-------|------------|------------|------------|----------|----------------------|-------------|
| **Giai đoạn A: Đề xuất & Xét chọn** |
| A0 | `DRAFT` | Nháp | Draft | Editable | Mẫu 1b + PL1 | PI đang viết đề cương |
| A1 | `SUBMITTED` | Đã nộp | Submitted | Pending | Mẫu 1b scan ký | PI đã nộp đề cương, chờ Khoa xem xét |
| A2 | `FACULTY_REVIEW` | Khoa đang duyệt | Faculty Review | Pending | Mẫu 2b, 3b | Khoa đánh giá, biên bản họp |
| A3 | `SCHOOL_SELECTION_REVIEW` | Xét chọn sơ bộ cấp Trường | School Selection Review | Pending | Mẫu 4b, 5b | HĐ KH&ĐT xét chọn sơ bộ |
| A4 | `OUTLINE_COUNCIL_REVIEW` | HĐ tư vấn xét đề cương | Outline Council Review | Pending | Mẫu 6b (+ 7b, 12b nếu có) | HĐ tư vấn hoàn thiện đề cương (gồm phản biện PL3) |
| A5 | `CHANGES_REQUESTED` | Yêu cầu chỉnh sửa | Changes Requested | Editable (PI only) | Mẫu 7b (nếu có) | Đã bị trả về, PI được edit và nộp lại |
| A6 | `APPROVED` | Được duyệt | Approved | Active | — | Đã duyệt, được phép triển khai |
| **Giai đoạn B: Triển khai** |
| B1 | `IN_PROGRESS` | Đang thực hiện | In Progress | Active | — | Đề tài đang chạy |
| B2 | `PAUSED` | Tạm dừng | Paused | Active | Mẫu 18b | Tạm dừng (do yêu cầu gia hạn hoặc lý do khác) |
| **Giai đoạn C: Nghiệm thu cấp Khoa** |
| C1 | `FACULTY_ACCEPTANCE_REVIEW` | Nghiệm thu cấp Khoa | Faculty Acceptance Review | Pending | Mẫu 8b–11b | Nghiệm thu tại Khoa trước cấp Trường |
| **Giai đoạn D: Nghiệm thu cấp Trường** |
| D1 | `SCHOOL_ACCEPTANCE_REVIEW` | Nghiệm thu cấp Trường | School Acceptance Review | Pending | Mẫu 13b–16b + PL3 | Nghiệm thu cấp Trường |
| **Giai đoạn E: Bàn giao** |
| E1 | `HANDOVER` | Bàn giao sản phẩm | Handover | Pending | Mẫu 17b | Biên bản giao nhận sản phẩm |
| **Terminal** |
| T1 | `COMPLETED` | Hoàn thành | Completed | Terminal | — | Đã hoàn thành tất cả quy trình |
| T2 | `REJECTED` | Từ chối | Rejected | Terminal | — | Bị từ chối, không thể tiếp tục |
| T3 | `WITHDRAWN` | Đã rút hồ sơ | Withdrawn | Terminal | — | PI chủ động rút hồ sơ |
| T4 | `CANCELLED` | Hủy bỏ | Cancelled | Terminal | — | Admin hủy (vi phạm quy định) |

**Category Types:**
- **Editable**: PI có thể chỉnh sửa form/dữ liệu
- **Pending**: Đang chờ ai đó duyệt/review
- **Active**: Đề tài đang chạy
- **Terminal**: Trạng thái kết thúc, không thể chuyển tiếp

**Biểu mẫu tương ứng (Phụ lục II):**
- **PL1**: Hướng dẫn viết đề cương
- **PL2**: Hướng dẫn trình bày báo cáo tổng hợp + tóm tắt
- **PL3**: Hướng dẫn viết nhận xét phản biện
- **Mẫu 1b**: Phiếu đề xuất
- **Mẫu 2b**: Phiếu đánh giá (cấp Khoa)
- **Mẫu 3b**: Biên bản họp (cấp Khoa)
- **Mẫu 4b**: Danh mục tổng hợp kết quả xét chọn cấp Trường (PHIẾU TỔNG - giai đoạn A)
- **Mẫu 5b**: Biên bản họp xét chọn sơ bộ cấp Trường
- **Mẫu 6b**: Biên bản họp HĐ tư vấn xét chọn đề cương
- **Mẫu 7b**: Báo cáo hoàn thiện đề cương (nếu có chỉnh sửa)
- **Mẫu 8b–11b**: Bộ hồ sơ nghiệm thu cấp Khoa
- **Mẫu 12b**: Nhận xét phản biện (PL3) - dùng trong SCHOOL_ACCEPTANCE_REVIEW
- **Mẫu 13b–15b**: Bộ hồ sơ nghiệm thu cấp Trường
- **Mẫu 16b**: Báo cáo hoàn thiện hồ sơ nghiệm thu cấp Trường (**PHIẾU TỔNG** - giai đoạn D)
- **Mẫu 17b**: Biên bản giao nhận sản phẩm
- **Mẫu 18b**: Đơn xin gia hạn

#### 6.1.2 Guard Rules (Bắt buộc - P0.5)

**Guard 1: Thứ tự nghiệm thu 2 tầng**
```javascript
// Guard: Cannot skip faculty acceptance
guard("Cannot proceed to school acceptance without passing faculty acceptance");

if (fromState === 'FACULTY_ACCEPTANCE_REVIEW' && toState === 'SCHOOL_ACCEPTANCE_REVIEW') {
  if (!isStagePassed(projectId, 'FACULTY_ACCEPTANCE_REVIEW')) {
    throw new ForbiddenError("Chưa nghiệm thu cấp Khoa. Vui lòng hoàn thành nghiệm thu cấp Khoa trước.");
  }
}
```

**Guard 2: Handover chỉ sau nghiệm thu cấp Trường**
```javascript
if (fromState === 'SCHOOL_ACCEPTANCE_REVIEW' && toState === 'HANDOVER') {
  if (!isStagePassed(projectId, 'SCHOOL_ACCEPTANCE_REVIEW')) {
    throw new ForbiddenError("Chưa nghiệm thu cấp Trường. Vui lòng hoàn thành nghiệm thu cấp Trường trước.");
  }
}
```

**Guard 3: IN_PROGRESS chỉ sau APPROVED**
```javascript
if (fromState === 'APPROVED' && toState === 'IN_PROGRESS') {
  // Chỉ có thể chuyển sang IN_PROGRESS khi đã APPROVED
  // Hoặc PKHCN có thể override (với lý do và audit)
}
```

**Guard 4: P0.3 - Không bypass FACULTY_REVIEW (BẮT BUỘC)**
```javascript
// Guard: Cannot skip faculty review in proposal stage
guard("Cannot bypass faculty review - 2-tier approval mandatory");

if (toState === 'SCHOOL_SELECTION_REVIEW') {
  // Must come from FACULTY_REVIEW (not directly from SUBMITTED)
  const validPreviousStates = ['FACULTY_REVIEW', 'CHANGES_REQUESTED'];
  if (!validPreviousStates.includes(fromState)) {
    throw new ForbiddenError(
      "Phải qua xét chọn cấp Khoa trước. " +
      "Không thể bypass FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW."
    );
  }
}

// Database constraint backup
// projects.faculty_review_completed must be TRUE before entering SCHOOL_SELECTION_REVIEW
```

#### 6.1.3 Valid State Transitions (Updated for 2-Tier Acceptance)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STATE TRANSITION MATRIX (2-TIER ACCEPTANCE)              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PHASE A: ĐỀ XUẤT & XÉT CHỌN (Mẫu 1b–7b, 12b)                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  PI (Chủ nhiệm)                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  A0: DRAFT ─────────────────────────────────► A1: SUBMITTED                │
│        │                                     │ (Submit Mẫu 1b scan ký)    │
│        │ (Save Draft Mẫu 1b + PL1)           ▼                             │
│        ▼                                     │                             │
│  A0: DRAFT ◄─────────────────────── A5: CHANGES_REQUESTED                 │
│        │                                     │ (Re-submit)                 │
│        │ (Withdraw before approval)          ▼                             │
│        ▼                                     │                             │
│  WITHDRAWN ◄────────────────────────────────┘                             │
│                                                                             │
│  Khoa (Thư ký Khoa)                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  A1: SUBMITTED ──────────────► A2: FACULTY_REVIEW (Mẫu 2b, 3b)            │
│                              │ (Auto-assign)                                │
│                              ▼                                              │
│                        A2: FACULTY_REVIEW ──────► A5: CHANGES_REQUESTED    │
│                              │ (Return with comment)                         │
│                              │ OR                                            │
│                              ▼ (Approve)                                    │
│                      A3: SCHOOL_SELECTION_REVIEW (Mẫu 4b, 5b)              │
│                                                                             │
│  Trường (Hội đồng KH&ĐT)                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                     A3: SCHOOL_SELECTION_REVIEW ──────► A5: CHANGES_REQUESTED
│                              │ (Return with comment)                         │
│                              │ OR                                            │
│                              ▼ (Approve)                                    │
│                 A4: OUTLINE_COUNCIL_REVIEW (Mẫu 6b + 7b, 12b)              │
│                              │ (gồm biên bản HĐ + phản biện PL3)            │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                         │
│         ▼                    ▼                    ▼                         │
│   CHANGES_REQUESTED     REJECTED           APPROVED                       │
│   (Yêu cầu sửa)         (Từ chối)          (Đạt)                          │
│                                                                             │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PHASE B: TRIỂN KHAI (Mẫu 18b nếu gia hạn)                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  PI              Phòng KHCN                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  APPROVED ──────────────► B1: IN_PROGRESS    APPROVED ⇄ B2: PAUSED         │
│        │ (Start)            │ (Báo cáo)       (Pause/Resume Mẫu 18b)       │
│        ▼                                     │                             │
│   B1: IN_PROGRESS ───────────────────────────┘                             │
│        │ (Submit acceptance pack)                                                │
│        ▼                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PHASE C: NGHIỆM THU CẤP KHOA (BẮT BUỘC) (Mẫu 8b–11b)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│                    C1: FACULTY_ACCEPTANCE_REVIEW                            │
│                              │                                               │
│         ┌────────────────────┼────────────────────┐                         │
│         ▼                    ▼                    ▼                         │
│   CHANGES_REQUESTED    REJECTED       APPROVED → (PHASE D)                  │
│   (Sửa & resubmit)     (Khoa từ chối)  (Khoa PASS)                         │
│         │                                                                 │
│         └──────────────────────────────────────────────► IN_PROGRESS       │
│                                                      (PI sửa & resubmit)   │
│                                                                             │
│  ⚠️ GUARD: PHASE D (SCHOOL_ACCEPTANCE_REVIEW) CHỈ TRUY CẬP NẾU            │
│           FACULTY_ACCEPTANCE_REVIEW PASSED                                 │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PHASE D: NGHIỆM THU CẤP TRƯỜNG (CẦN KHOA PASS) (Mẫu 12b–16b + PL3)       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│                    D1: SCHOOL_ACCEPTANCE_REVIEW                             │
│                              │                                               │
│         ┌────────────────────┼────────────────────┐                         │
│         ▼                    ▼                    ▼                         │
│   CHANGES_REQUESTED    REJECTED       APPROVED → (PHASE E)                  │
│   (Sửa & resubmit)    (HĐ từ chối)   (Trường PASS)                         │
│         │                                                                 │
│         └──────────────────────────────────────────────► FACULTY_ACCEPTANCE│
│                                                           _REVIEW          │
│                                                      (PI sửa & resubmit)   │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  PHASE E: BÀN GIAO (Mẫu 17b)                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  PI                  Khoa/Trường                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  APPROVED ────────────────────────► E1: HANDOVER                            │
│  (sau SCHOOL_ACCEPTANCE pass)        │ (Mẫu 17b scan ký)                   │
│                                     ▼                                       │
│                                  COMPLETED                                  │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  TERMINAL STATES (Không thể chuyển sang state khác)                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  COMPLETED | REJECTED | WITHDRAWN | CANCELLED                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

**KEY GUARD RULES:**
1. Khoa PASS → Truy cập được SCHOOL_ACCEPTANCE_REVIEW
2. Trường PASS → Truy cập được HANDOVER
3. Khoa REJECT → Quay lại IN_PROGRESS để PI sửa
4. Trường REJECT → Quay lại FACULTY_ACCEPTANCE_REVIEW để Khoa review lại
```

#### 6.1.4 Transition Rules (Enforced by Backend)

| From State | To State | Trigger | Who Can Trigger | Conditions |
|------------|----------|---------|------------------|-------------|
| **PHASE A: ĐỀ XUẤT & XÉT CHỌN** | | | | |
| `DRAFT` | `SUBMITTED` | Submit Mẫu 1b scan ký | PI (owner only) | Mẫu 1b + PL1 điền đầy đủ + file scan ký |
| `DRAFT` | `WITHDRAWN` | Withdraw | PI (owner only) | Trước khi bất kỳ ai duyệt |
| `SUBMITTED` | `FACULTY_REVIEW` | Auto-transition | System | On submit, auto-assign Khoa |
| `SUBMITTED` | `WITHDRAWN` | Withdraw | PI (owner only) | Nếu policy cho phép |
| `FACULTY_REVIEW` | `SCHOOL_SELECTION_REVIEW` | Approve | QUAN_LY_KHOA | Mẫu 2b, 3b hoàn thành |
| `FACULTY_REVIEW` | `CHANGES_REQUESTED` | Request Changes | QUAN_LY_KHOA | Comment bắt buộc |
| `SCHOOL_SELECTION_REVIEW` | `OUTLINE_COUNCIL_REVIEW` | Approve | PHONG_KHCN/HĐ | Mẫu 4b, 5b hoàn thành |
| `SCHOOL_SELECTION_REVIEW` | `CHANGES_REQUESTED` | Request Changes | PHONG_KHCN/HĐ | Comment bắt buộc |
| `OUTLINE_COUNCIL_REVIEW` | `APPROVED` | Approve (BGH ký) | BGH | Mẫu 6b + BGH ký |
| `OUTLINE_COUNCIL_REVIEW` | `CHANGES_REQUESTED` | Request Changes | HOI_DONG | Comment bắt buộc |
| `OUTLINE_COUNCIL_REVIEW` | `REJECTED` | Reject | BGH | Lý do bắt buộc |
| **PHASE B: TRIỂN KHAI** | | | | |
| `APPROVED` | `IN_PROGRESS` | Start project | PI (owner only) | PI xác nhận bắt đầu |
| `IN_PROGRESS` | `PAUSED` | Pause | PHONG_KHCN | Mẫu 18b + lý do (audit) |
| `PAUSED` | `IN_PROGRESS` | Resume | PHONG_KHCN | Mẫu 18b + lý do (audit) |
| **PHASE C: NGHIỆM THU KHOA** | | | | |
| `IN_PROGRESS` | `FACULTY_ACCEPTANCE_REVIEW` | Submit acceptance pack | PI (owner only) | Mẫu 8b–11b đầy đủ |
| `FACULTY_ACCEPTANCE_REVIEW` | `SCHOOL_ACCEPTANCE_REVIEW` | Approve (PASS) | QUAN_LY_KHOA | Vote tally PASS + biên bản ký |
| `FACULTY_ACCEPTANCE_REVIEW` | `CHANGES_REQUESTED` | Request Changes | QUAN_LY_KHOA | Comment bắt buộc |
| `FACULTY_ACCEPTANCE_REVIEW` | `IN_PROGRESS` | Return for fix | QUAN_LY_KHOA | Yêu cầu sửa |
| `FACULTY_ACCEPTANCE_REVIEW` | `REJECTED` | Reject | QUAN_LY_KHOA | Lý do bắt buộc |
| **PHASE D: NGHIỆM THU TRƯỜNG** | | | | |
| `FACULTY_ACCEPTANCE_REVIEW` | `SCHOOL_ACCEPTANCE_REVIEW` | Submit school pack | PI (owner only) | **GUARD**: Khoa PASS trước |
| `SCHOOL_ACCEPTANCE_REVIEW` | `HANDOVER` | Approve (PASS) | HOI_DONG | Vote tally PASS + biên bản ký |
| `SCHOOL_ACCEPTANCE_REVIEW` | `CHANGES_REQUESTED` | Request Changes | HOI_DONG | Comment bắt buộc |
| `SCHOOL_ACCEPTANCE_REVIEW` | `FACULTY_ACCEPTANCE_REVIEW` | Return to Khoa | HOI_DONG | Yêu cầu Khoa review lại |
| `SCHOOL_ACCEPTANCE_REVIEW` | `REJECTED` | Reject | HOI_DONG | Lý do bắt buộc |
| **PHASE E: BÀN GIAO** | | | | |
| `SCHOOL_ACCEPTANCE_REVIEW` | `HANDOVER` | Submit handover | PI (owner only) | **GUARD**: Trường PASS trước |
| `HANDOVER` | `COMPLETED` | Complete | System | Mẫu 17b scan ký |
| **CROSS-PHASE** | | | | |
| `CHANGES_REQUESTED` | `[PREVIOUS]` | Re-submit | PI (owner only) | Quay lại state trước return |
| `*REVIEW` | `WITHDRAWN` | Withdraw | PI (owner only) | Nếu policy cho phép |

**Important Rules:**
1. **Edit Lock**: Khi state ∈ {SUBMITTED, *_REVIEW, PAUSED, HANDOVER} → PI KHÔNG được edit form/dữ liệu
2. **2-Tier Acceptance GUARD**: `SCHOOL_ACCEPTANCE_REVIEW` chỉ truy cập được nếu `FACULTY_ACCEPTANCE_REVIEW` PASS
3. **Handover GUARD**: `HANDOVER` chỉ truy cập được nếu `SCHOOL_ACCEPTANCE_REVIEW` PASS
4. **Return to State**: Khi `CHANGES_REQUESTED` → workflow_log.metadata phải lưu `return_to_state`
5. **Terminal States**: `REJECTED`, `WITHDRAWN`, `COMPLETED`, `CANCELLED` không thể chuyển sang state khác
6. **Reject Flow**: Khoa REJECT → PI sửa & resubmit Khoa; Trường REJECT → Quay lại Khoa review
7. **Vote Tally**: Mọi *_ACCEPTANCE_REVIEW cần `vote_tallies` summary (không digitize từng phiếu)

#### 6.1.5 Workflow State vs Form Status

**IMPORTANT DISTINCTION:**

- `projects.state` = **Trạng thái pháp lý của đề tài** (Workflow State)
  - Determined by Workflow Engine ONLY
  - Changes ONLY through valid state transitions
  - 16 possible values (see enum above: DRAFT, SUBMITTED, FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW, CHANGES_REQUESTED, APPROVED, IN_PROGRESS, PAUSED, FACULTY_ACCEPTANCE_REVIEW, SCHOOL_ACCEPTANCE_REVIEW, HANDOVER, COMPLETED, CANCELLED, REJECTED, WITHDRAWN)

- `form_instances.status` = **Trạng thái của 1 lần nộp form** (Form Status)
  - Values: DRAFT, SUBMITTED, APPROVED, REJECTED
  - Does NOT affect project.state
  - Used for tracking form submission lifecycle

**FormInstance status does NOT decide workflow state. Workflow state is ONLY changed through Workflow Engine.**

#### CHANGES_REQUESTED → Previous State Rule

When `CHANGES_REQUESTED` is triggered (via REVIEW_RETURN action):

```json
{
  "metadata": {
    "return_to_state": "COUNCIL_REVIEW"
  }
}
```

When user RESUBMITs:
```javascript
// Workflow Engine reads return_to_state from workflow_log
const returnLog = getLatestReviewReturnLog(projectId);
const targetState = returnLog.metadata.return_to_state; // "COUNCIL_REVIEW"
transitionTo(targetState);
```

#### OVERRIDE Constraints

**OVERRIDE action (PKHCN only) - Scope limitations:**

OVERRIDE is ONLY for:
- ✅ Keeping project at current state (extend time)
- ✅ Delaying transition (pause temporarily)
- ✅ Moving forward within same branch (skip waiting)

OVERRIDE is NOT allowed for:
- ❌ Skipping EXPERT_REVIEW (bắt buộc theo quy định)
- ❌ Jumping directly to COMPLETED (bypass BGH approval)
- ❌ Moving backward multiple states (must use proper return flow)

Every OVERRIDE MUST include:
- `reason` (required)
- `target_state` (if changing state)
- Audit log entry

```

#### 6.1.6 Required Form Pack per Stage (Phụ lục II Mapping)

**Mỗi giai đoạn workflow yêu cầu một bộ biểu mẫu (form pack) đầy đủ trước khi chuyển sang state tiếp theo.**

| Giai đoạn | State | Biểu mẫu bắt buộc (Phụ lục II) | Mô tả | Validate trước transition |
|-----------|-------|-------------------------------|--------|--------------------------|
| **A: ĐỀ XUẤT & XÉT CHỌN** | | | | |
| | `DRAFT` | Mẫu 1b + PL1 | Đề cương đăng ký + Hướng dẫn | ✅ Tất cả field điền đầy đủ |
| | `SUBMITTED` | Mẫu 1b scan ký | Mẫu 1b có ký (scan) | ✅ File scan uploaded |
| | `FACULTY_REVIEW` | Mẫu 2b, 3b | Phiếu họp Khoa + Đánh giá | ✅ Khoa upload biên bản |
| | `SCHOOL_SELECTION_REVIEW` | Mẫu 4b, 5b | Phiếu họp Trường + Danh sách | ✅ Trường upload biên bản |
| | `OUTLINE_COUNCIL_REVIEW` | Mẫu 6b (+ Mẫu 7b nếu sửa) | Biên bản HĐ KH&ĐT | ✅ HĐ upload biên bản |
| | `APPROVED` | — | BGH đã ký phê duyệt | ✅ Quyết định BGH uploaded |
| **B: TRIỂN KHAI** | | | | |
| | `IN_PROGRESS` | — | PI đang thực hiện | — |
| | `PAUSED` | Mẫu 18b | Phiếu gia hạn (nếu cần) | ✅ Mẫu 18b scan uploaded |
| **C: NGHIỆM THU KHOA** | | | | |
| | `FACULTY_ACCEPTANCE_REVIEW` | Mẫu 8b, 9b, 10b, 11b | Bộ nghiệm thu Khoa | ✅ Tất cả 4 mẫu uploaded |
| | - Mẫu 8b | Biên bản họp nghiệm thu cấp Khoa | ✅ Scan ký |
| | - Mẫu 9b | Phiếu đánh giá sản phẩm | ✅ Điền đầy đủ |
| | - Mẫu 10b | Phiếu đánh giá nghiệp vụ | ✅ Điền đầy đủ |
| | - Mẫu 11b | Phiếu tổng hợp đánh giá | ✅ Ký Khoa trưởng |
| **D: NGHIỆM THU TRƯỜNG** | | | | |
| | `SCHOOL_ACCEPTANCE_REVIEW` | Mẫu 12b, 13b, 14b, 15b, 16b + PL3 | Bộ nghiệm thu Trường | ✅ Tất cả 5 mẫu uploaded |
| | - Mẫu 12b | Biên bản họp nghiệm thu cấp Trường | ✅ Scan ký |
| | - Mẫu 13b | Phiếu đánh giá nghiệm thu | ✅ Điền đầy đủ |
| | - Mẫu 14b | Phiếu ý kiến thành viên | ✅ Tất cả member |
| | - Mẫu 15b | Phiếu phản biện (PL3) | ✅ Phản biện viên ký |
| | - Mẫu 16b | Phiếu tổng hợp nghiệm thu | ✅ BGH ký |
| **E: BÀN GIAO** | | | | |
| | `HANDOVER` | Mẫu 17b | Biên bản bàn giao | ✅ Scan ký + Khoa nhận |
| | `COMPLETED` | — | Đã bàn giao đầy đủ | — |

**Validation Rules (Backend):**

```javascript
// Stage completeness check before state transition
async function validateStagePack(projectId, targetState) {
  const requiredForms = REQUIRED_FORMS_BY_STAGE[targetState];
  if (!requiredForms) return true; // No forms required for this state

  const submissions = await getFormSubmissions(projectId);
  const uploadedCodes = new Set(submissions.map(s => s.template_code));

  for (const formCode of requiredForms) {
    if (!uploadedCodes.has(formCode)) {
      throw new ValidationError(
        `Thiếu biểu mẫu bắt buộc: ${FORM_TEMPLATES[formCode].name_vi}. ` +
        `Vui lòng upload ${FORM_TEMPLATES[formCode].file_requirement}.`
      );
    }
  }

  return true;
}

// Required forms mapping
const REQUIRED_FORMS_BY_STAGE = {
  'SUBMITTED': ['MAU_01B'],           // Mẫu 1b scan ký
  'FACULTY_REVIEW': ['MAU_02B', 'MAU_03B'],
  'SCHOOL_SELECTION_REVIEW': ['MAU_04B', 'MAU_05B'],
  'OUTLINE_COUNCIL_REVIEW': ['MAU_06B'],
  'PAUSED': ['MAU_18B'],              // Optional
  'FACULTY_ACCEPTANCE_REVIEW': ['MAU_08B', 'MAU_09B', 'MAU_10B', 'MAU_11B'],
  'SCHOOL_ACCEPTANCE_REVIEW': ['MAU_12B', 'MAU_13B', 'MAU_14B', 'MAU_15B', 'MAU_16B', 'PL3'],
  'HANDOVER': ['MAU_17B']
};
```

**UI Behavior:**
- Trên Project Detail, hiển thị checklist các biểu mẫu theo stage hiện tại
- Icon trạng thái: ✅ (đã upload), ⚠️ (thiếu), 🔄 (đang xử lý)
- Nút "Submit" chỉ active khi tất cả forms required đã uploaded
- Thông báo rõ ràng: "Đã upload 3/4 biểu mẫu. Thiếu Mẫu 11b - Phiếu tổng hợp."

### 6.2 Permission Matrix

#### 6.2.1 Role Definitions

| Role Code | Role Name (VN) | Role Name (EN) | Description |
|-----------|----------------|----------------|-------------|
| `GIANG_VIEN` | Giảng viên / PI | Lecturer / PI | Chủ nhiệm đề tài, có thể tạo và nộp đề tài |
| `QUAN_LY_KHOA` | Quản lý Khoa | Faculty Manager | Thư ký Khoa, duyệt đề tài cấp Khoa |
| `HOI_DONG` | Thành viên Hội đồng | Council Member | Thành viên HĐ KH&ĐT, tham gia xét chọn |
| `THAM_DINH` | Thẩm định viên | Expert Reviewer | Chuyên gia thẩm định độc lập |
| `BGH` | Ban Giám hiệu | Board of Directors | Có quyền phê duyệt cuối cùng |
| `PHONG_KHCN` | Phòng KHCN | Science & Tech Dept | Quản lý workflow, có quyền override |
| `ADMIN` | Quản trị hệ thống | System Admin | Quản trị kỹ thuật, không tham gia workflow |

**Note:** `PROJECT_OWNER` is NOT a standalone role. It is a contextual role derived from `GIANG_VIEN` where `user.id = projects.owner_id`.

#### 6.2.2 Action Availability Matrix (Updated for 2-Tier Acceptance)

**Legend:**
- ✅ = Allowed
- ❌ = Not Allowed
- 🔒 = View Only
- * = Conditional (see notes)

| Role | State | View | Edit | Save Draft | Submit | Withdraw | Approve | Request Changes | Reject | Override | Pause/Resume |
|------|-------|------|------|------------|--------|----------|---------|-----------------|--------|----------|-------------|
| **GIANG_VIEN (PI)** | | | | | | | | | | | |
| | `DRAFT` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SUBMITTED` | ✅ | 🔒 | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SCHOOL_SELECTION_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `OUTLINE_COUNCIL_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `APPROVED` | ✅ | 🔒 | ❌ | ✅** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `IN_PROGRESS` | ✅ | 🔒 | ❌ | ✅*** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `PAUSED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SCHOOL_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `HANDOVER` | ✅ | 🔒 | ❌ | ✅**** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CHANGES_REQUESTED` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `COMPLETED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `REJECTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `WITHDRAWN` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CANCELLED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **QUAN_LY_KHOA** | | | | | | | | | | | |
| | `DRAFT` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SUBMITTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | `SCHOOL_SELECTION_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `OUTLINE_COUNCIL_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `APPROVED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `IN_PROGRESS` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `PAUSED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| | `SCHOOL_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `HANDOVER` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CHANGES_REQUESTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `COMPLETED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `REJECTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `WITHDRAWN` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CANCELLED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **HOI_DONG / THAM_DINH** | | | | | | | | | | | |
| | `DRAFT` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SUBMITTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SCHOOL_SELECTION_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | `OUTLINE_COUNCIL_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | `APPROVED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `IN_PROGRESS` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `PAUSED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SCHOOL_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| | `HANDOVER` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CHANGES_REQUESTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `COMPLETED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `REJECTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `WITHDRAWN` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CANCELLED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **BGH** | | | | | | | | | | | |
| | `DRAFT` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SUBMITTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SCHOOL_SELECTION_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `OUTLINE_COUNCIL_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| | `APPROVED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `IN_PROGRESS` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `PAUSED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `FACULTY_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `SCHOOL_ACCEPTANCE_REVIEW` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `HANDOVER` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CHANGES_REQUESTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `COMPLETED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `REJECTED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `WITHDRAWN` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | `CANCELLED` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PHONG_KHCN** | | | | | | | | | | | |
| | `ANY STATE` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **ADMIN** | | | | | | | | | | | |
| | `ANY STATE` | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- (*) Withdrawal allowed only if `withdrawal_policy` setting permits (default: before final approval)
- (**) Submit = Start IN_PROGRESS (APPROVED → IN_PROGRESS)
