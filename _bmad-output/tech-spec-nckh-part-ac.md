- (***) Submit = Submit acceptance pack (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
- (****) Submit = Submit handover form (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER → COMPLETED)
- 🔒 View Only = Can read but cannot modify
- **2-Tier Acceptance GUARD**: Khoa chỉ approve/reject FACULTY_ACCEPTANCE_REVIEW; HĐ chỉ approve/reject SCHOOL_ACCEPTANCE_REVIEW
- Override = Skip current stage, force move to another state (PHONG_KHCN only)
- Pause/Resume = Only for APPROVED ↔ PAUSED transitions (PHONG_KHCN only)

#### 6.2.3 UI Component Access by Role

| Component | GIANG_VIEN | QUAN_LY_KHOA | HOI_DONG | BGH | PHONG_KHCN | ADMIN |
|-----------|------------|--------------|----------|-----|------------|-------|
| Dashboard (PI) | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | ❌ |
| Dashboard (Faculty) | 🔒 | ✅ | 🔒 | 🔒 | 🔒 | ❌ |
| Dashboard (Council) | 🔒 | 🔒 | ✅ | 🔒 | 🔒 | ❌ |
| Dashboard (BGH) | 🔒 | 🔒 | 🔒 | ✅ | 🔒 | ❌ |
| Dashboard (PKHCN) | 🔒 | 🔒 | 🔒 | 🔒 | ✅ | ❌ |
| Admin Panel | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Project Detail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Project | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Task Inbox | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Audit Log View | 🔒 | 🔒 | 🔒 | 🔒 | ✅ | ✅ |

#### 6.2.4 Action Button Component Behavior

**Action Button** (`<ActionButton>`) renders different actions based on `user.role` + `project.state`:

```tsx
// Pseudo-code for action determination
function getAvailableActions(user, project) {
  const role = getPrimaryRole(user);
  const state = project.state;
  const isOwner = user.id === project.owner_id;

  if (!isOwner && role === 'GIANG_VIEN') {
    return []; // Non-owner GIANG_VIEN has no actions
  }

  const actions = ACTION_MATRIX[role]?.[state] || [];
  return actions.filter(action => hasPermission(user, action));
}
```

**Example outputs:**

| Context | User Role | Project State | Available Actions |
|---------|-----------|---------------|-------------------|
| Project Detail | GIANG_VIEN (owner) | DRAFT | Save Draft, Submit, Withdraw |
| Project Detail | GIANG_VIEN (owner) | FACULTY_REVIEW | Withdraw |
| Project Detail | GIANG_VIEN (owner) | CHANGES_REQUESTED | Save Draft, Re-submit |
| Project Detail | QUAN_LY_KHOA | FACULTY_REVIEW | Approve, Request Changes |
| Task Inbox | QUAN_LY_KHOA | FACULTY_REVIEW | Approve, Request Changes |
| Project Detail | BGH | BGH_REVIEW | Approve, Reject |
| Any | PHONG_KHCN | ANY | Override (with modal) |

#### 6.2.5 Project Detail: PI View vs Approver View

**Project Detail page** (`/projects/:id`) is a shared page with role-based action bar:

**PI View (when `user.id === project.owner_id` and `role === GIANG_VIEN`):**
```
┌─────────────────────────────────────────────────────────────┐
│  [Project Title]                                State Badge  │
│  ─────────────────────────────────────────────────────────  │
│  Tabs: Overview | Timeline | Documents | Team                │
│  ─────────────────────────────────────────────────────────  │
│  [Content Area - View Only in most states]                  │
│  ─────────────────────────────────────────────────────────  │
│  Action Bar:                                                │
│  [Save Draft] [Submit] [Withdraw]     (DRAFT state)        │
│  [Withdraw]                               (REVIEW states)   │
│  [Save Changes] [Re-submit]              (CHANGES_REQUESTED)│
└─────────────────────────────────────────────────────────────┘
```

**Approver View (when user has approver role for current state):**
```
┌─────────────────────────────────────────────────────────────┐
│  [Project Title]                                State Badge  │
│  ─────────────────────────────────────────────────────────  │
│  Tabs: Overview | Timeline | Documents | Team | Review      │
│  ─────────────────────────────────────────────────────────  │
│  [Content Area]                                             │
│  ─────────────────────────────────────────────────────────  │
│  Action Bar:                                                │
│  [Approve] [Request Changes]            (their review state)│
│  [Approve] [Reject]                      (BGH_REVIEW)       │
│  [Submit Review]                          (EXPERT_REVIEW)   │
└─────────────────────────────────────────────────────────────┘
```

**Entry Points for Review:**
1. **Task Inbox** (`/tasks`) - List of pending approvals, click to open Project Detail
2. **Project Detail** directly - Accessible via project list/search
3. Both entry points show the same Project Detail page with approver actions

#### 6.2.6 ADMIN Role Scope Clarification

**Admin is TECHNICAL ONLY - NOT involved in academic workflow:**

Admin CANNOT:
- ❌ Approve/Reject projects (academic decision)
- ❌ Modify project content (research data)
- ❌ Access workflow decisions

Admin CAN:
- ✅ Manage user accounts (create, deactivate)
- ✅ Manage form templates (add, edit, deactivate)
- ✅ Configure SLA settings (working hours, escalation)
- ✅ Manage system configuration (email, notifications)
- ✅ View audit logs (for troubleshooting)

**This separation ensures:**
- Academic decisions remain with authorized roles (BGH, Council)
- Admin can maintain system without interfering with research process
- Clear accountability for audit trails

### 6.3 Form Submission Semantics: Save Draft vs Submit

**CRITICAL DISTINCTION:** The wizard "Create Submission" has TWO distinct behaviors that must be implemented separately.

#### 6.3.1 Save Draft Behavior

**Purpose:** Allow PI to save progress incrementally and resume later.

**Trigger:**
- Click "Save Draft" button
- Auto-save after each wizard step (optional, can be toggled)

**Valid States:** `DRAFT`, `CHANGES_REQUESTED`

**Backend Behavior:**
```javascript
async function saveDraft(projectId, formData, userId) {
  // 1. Validate: user must be PI (owner)
  if (!isProjectOwner(projectId, userId)) {
    throw new ForbiddenError("Only project owner can save draft");
  }

  // 2. Validate: project must be in editable state
  const project = await getProject(projectId);
  if (!EDITABLE_STATES.includes(project.state)) {
    throw new ForbiddenError("Cannot save draft in current state");
  }

  // 3. Upsert form_instance with status = DRAFT
  const formInstance = await upsertFormInstance({
    project_id: projectId,
    status: 'DRAFT',
    data: formData,
    submitted_by: userId,
    submitted_at: null  // Not submitted yet
  });

  // 4. Update projects.updated_at (but NOT state)
  await touchProject(projectId);

  // 5. NO workflow_log entry (draft saves are not audited as "actions")
  // 6. NO notification sent

  return { success: true, formInstanceId: formInstance.id };
}
```

**UI Behavior:**
- Show "Saved at HH:MM" toast notification
- User can navigate away and return later
- Data persists in form fields
- No state transition occurs

#### 6.3.2 Submit Behavior

**Purpose:** Finalize submission, lock editing, create approval task.

**Trigger:** Click "Submit" / "Nộp" button

**Valid States:** `DRAFT` → `SUBMITTED`, `CHANGES_REQUESTED` → `[PREVIOUS]`, `APPROVED` → `IN_PROGRESS` (start implementation)

**Backend Behavior:**
```javascript
async function submitProject(projectId, formData, userId) {
  // 1. Full validation
  const validation = await validateFormComplete(formData);
  if (!validation.isValid) {
    throw new ValidationError("Please complete all required fields", validation.errors);
  }

  // 2. Validate: user must be PI (owner)
  if (!isProjectOwner(projectId, userId)) {
    throw new ForbiddenError("Only project owner can submit");
  }

  // 3. Get current project to determine next state
  const project = await getProject(projectId);
  const nextState = getNextStateForSubmit(project.state);

  // 4. Update form_instance to SUBMITTED status
  await updateFormInstance({
    project_id: projectId,
    status: 'SUBMITTED',
    data: formData,
    submitted_by: userId,
    submitted_at: new Date()
  });

  // 5. Create workflow_log entry
  await createWorkflowLog({
    project_id: projectId,
    from_state: project.state,
    to_state: nextState,
    action: 'SUBMIT',
    actor_id: userId,
    actor_role: 'GIANG_VIEN'
  });

  // 6. Transition project state
  await transitionProjectState(projectId, nextState);

  // 7. Generate documents (if template exists)
  const documents = await generateDocuments(projectId, formData);

  // 8. Create ApprovalTask for the first approver
  const approvalTask = await createApprovalTask({
    project_id: projectId,
    stage: nextState,  // e.g., FACULTY_REVIEW
    assignee_role: getAssigneeRoleForState(nextState),
    status: 'PENDING',
    due_at: calculateSLADueDate(nextState)
  });

  // 9. Send notifications to assignees
  await notifyApprovers(approvalTask);

  return {
    success: true,
    newState: nextState,
    taskId: approvalTask.id,
    documents: documents
  };
}
```

**UI Behavior:**
- Show confirmation modal: "Bạn có chắc muốn nộp? Sau khi nộp sẽ không thể chỉnh sửa."
- On submit: show loading spinner
- On success: redirect to Project Detail with success message
- Show new state badge
- Hide Edit buttons
- Show "View Only" indicator

#### 6.3.3 Re-submit Behavior (after CHANGES_REQUESTED)

**Purpose:** PI re-submits after making requested changes.

**Valid States:** `CHANGES_REQUESTED` → `[PREVIOUS_STATE]`

**Backend Behavior:**
```javascript
async function resubmitProject(projectId, formData, userId) {
  // 1-4. Same validation as Submit

  // 5. Get the state to return to (P0-3: stored in workflow_logs.return_target_state)
  const returnLog = await getLatestReviewReturnLog(projectId);
  const targetState = returnLog.return_target_state;  // e.g., FACULTY_REVIEW
  const targetHolder = returnLog.return_target_holder_unit;  // e.g., KHOA.CNTT

  // 6. Update form_instance (create new version)
  await createFormInstanceVersion({
    project_id: projectId,
    parent_id: returnLog.form_instance_id,  // Link to previous version
    status: 'SUBMITTED',
    data: formData,
    submitted_by: userId,
    submitted_at: new Date()
  });

  // 7. Create workflow_log with action = RESUBMIT
  await createWorkflowLog({
    project_id: projectId,
    from_state: 'CHANGES_REQUESTED',
    to_state: targetState,
    action: 'RESUBMIT',
    actor_id: userId,
    actor_role: 'GIANG_VIEN',
    metadata: { returned_from_log_id: returnLog.id }
  });

  // 8. Transition project to target state
  await transitionProjectState(projectId, targetState);

  // 9. Re-create ApprovalTask for the target stage
  const approvalTask = await createApprovalTask({
    project_id: projectId,
    stage: targetState,
    assignee_role: getAssigneeRoleForState(targetState),
    status: 'PENDING',
    due_at: calculateSLADueDate(targetState)
  });

  return { success: true, newState: targetState };
}
```

#### 6.3.4 Withdraw Behavior

**Purpose:** PI withdraws submission before final approval.

**Valid States:** `SUBMITTED`, `FACULTY_REVIEW`, `SCHOOL_SELECTION_REVIEW`, `OUTLINE_COUNCIL_REVIEW` (if policy allows)

**Backend Behavior:**
```javascript
async function withdrawProject(projectId, userId, reason) {
  // 1. Check withdrawal policy
  const policy = await getWithdrawalPolicy();
  const project = await getProject(projectId);

  if (!policy.allowedStates.includes(project.state)) {
    throw new ForbiddenError("Cannot withdraw in current state");
  }

  // 2. Must be owner
  if (!isProjectOwner(projectId, userId)) {
    throw new ForbiddenError("Only project owner can withdraw");
  }

  // 3. Cancel pending ApprovalTask
  await cancelPendingApprovalTasks(projectId);

  // 4. Create workflow_log
  await createWorkflowLog({
    project_id: projectId,
    from_state: project.state,
    to_state: 'WITHDRAWN',
    action: 'WITHDRAW',
    actor_id: userId,
    actor_role: 'GIANG_VIEN',
    reason: reason
  });

  // 5. Transition to WITHDRAWN
  await transitionProjectState(projectId, 'WITHDRAWN');

  // 6. Notify stakeholders
  await notifyWithdrawal(projectId);

  return { success: true };
}
```

#### 6.3.5 UI Component: SubmissionWizard

```tsx
<SubmissionWizard
  project={project}
  onSaveDraft={handleSaveDraft}
  onSubmit={handleSubmit}
  canSubmit={isFormValid()}
  canWithdraw={canWithdraw()}
/>

function handleSaveDraft() {
  // Auto-save, no validation
  api.saveDraft(projectId, formData)
    .then(() => toast("Đã lưu nháp"));
}

function handleSubmit() {
  // Show confirmation
  if (!confirm("Bạn có chắc muốn nộp?")) return;

  // Full validation + submit
  api.submitProject(projectId, formData)
    .then(result => {
      toast("Nộp thành công");
      router.push(`/projects/${projectId}`);
    });
}
```

### 6.4 Budget Disbursement Rules

**Financial control logic (not a full accounting module):**

```javascript
// Budget disbursement validation
function validateBudgetDisbursement(project, amount) {
  // Rule 1: Partial disbursement BEFORE completion
  if (project.state !== 'COMPLETED') {
    const maxDisbursable = project.budget_approved * 0.7; // Max 70% before completion
    if (project.budget_disbursed + amount > maxDisbursable) {
      throw new Error('Không thể giải ngân vượt 70% khi chưa nghiệm thu');
    }
  }

  // Rule 2: Full disbursement ONLY after completion
  if (project.state === 'COMPLETED') {
    if (!project.final_report_approved) {
      throw new Error('Chưa nghiệm thu báo cáo cuối cùng');
    }
    if (!project.signed_uploaded) {
      throw new Error('Chưa tải lên bản ký có chữ ký');
    }
    // Full amount can be disbursed
  }

  // Rule 3: Audit every disbursement
  logBudgetDisbursement(project.id, amount, actor, reason);

  return true;
}
```

**Business rules:**
- Before COMPLETED: Max 70% budget can be disbursed (partial limit configurable in SLA settings)
- After COMPLETED: Full disbursement allowed ONLY IF `final_report_approved = true` AND `signed_uploaded = true`
- Every disbursement change MUST be logged to `budget_disbursement_log` table

### 6.5 SLA Calculation (Clarified)

#### 6.5.1 SLA Definition

**SLA is calculated in WORKING HOURS (not calendar hours).**

**Working Calendar:**
- Monday - Friday: 8:00 AM - 5:00 PM
- Saturday, Sunday: Non-working
- Public holidays (Vietnam): Non-working (stored in `holidays` table)
- **SLA PAUSES** when project state = `CHANGES_REQUESTED` (PI is editing)
- **SLA RESUMES** when PI re-submits

**Example:**
```
Submit: Friday 4:00 PM
SLA: 72 hours = 3 working days

Calculation:
- Friday 4:00 PM - 5:00 PM = 1 hour
- Monday 8:00 AM - 5:00 PM = 9 hours
- Tuesday 8:00 AM - 5:00 PM = 9 hours
- Wednesday 8:00 AM - 5:00 PM = 9 hours
- Total: 1 + 9 + 9 + 9 = 28 hours (remaining: 44 hours)

Due: Friday of next week (approximately)
```

#### 6.5.2 SLA by Stage

**P1.6: SLA by (approval_tasks.stage, assignee_role)**

SLA được định nghĩa theo stage của task và role của người được assign. Mỗi stage có thể có nhiều role với SLA khác nhau.

| Stage | Assignee Role | SLA | Working Days | T-2 Reminder | T+2 Escalation | Pause on Changes |
|-------|---------------|-----|--------------|--------------|----------------|------------------|
| `FACULTY_REVIEW` | `QUAN_LY_KHOA` | 72h | 3 days | 48h before | 48h after | Yes |
| `SCHOOL_SELECTION_REVIEW` | `PHONG_KHCN` | 48h | 2 days | 24h before | 48h after | Yes |
| `OUTLINE_COUNCIL_REVIEW` | `THU_KY_HOI_DONG` | 72h | 3 days | 48h before | 48h after | Yes |
| `FACULTY_ACCEPTANCE_REVIEW` | `THU_KY_HOI_DONG` | 48h | 2 days | 24h before | 24h after | Yes |
| `SCHOOL_ACCEPTANCE_REVIEW` | `THU_KY_HOI_DONG` | 72h | 3 days | 48h before | 48h after | Yes |
| `PAUSED` | `PHONG_KHCN` | Unlimited | - | - | - | N/A |

**Các stage không tạo task (không có SLA):**
- `DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`, `IN_PROGRESS`, `HANDOVER`, `COMPLETED`, `CANCELLED`, `REJECTED`, `WITHDRAWN`

**Notes:**
- P1.6: SLA được lookup bằng key (stage, assignee_role) trong sla_settings table
- T-2 = Send reminder 2 working days trước deadline
- T+2 = Escalate lên role cao hơn sau 2 working days quá hạn
- Escalation tạo notification và mark task là `ESCALATED`
- `pause_on_changes_requested = true`: SLA tạm dừng khi project ở trạng thái CHANGES_REQUESTED

**SLA Query Example:**
```javascript
// P1.6: Lookup SLA by (stage, role)
async function getSLAForTask(stage, assigneeRole) {
  return await db.sla_settings.findUnique({
    where: {
      stage_assignee_role: {
        stage: stage,
        assignee_role: assigneeRole
      }
    }
  });
}

// Usage
const sla = await getSLAForTask('FACULTY_REVIEW', 'QUAN_LY_KHOA');
// sla.sla_hours = 72
// sla.reminder_hours_before = 48
// sla.escalate_hours_after = 48
// sla.pause_on_changes_requested = true
```

#### 6.5.3 SLA Pause Behavior

**When is SLA paused?**
- When project state = `CHANGES_REQUESTED` (PI is editing)
- When project state = `PAUSED` (PKHCN paused the project)

**When is SLA resumed?**
- When PI re-submits (`CHANGES_REQUESTED` → `[PREVIOUS]`)
- When PKHCN resumes (`PAUSED` → `APPROVED`)

**Implementation:**
```javascript
// Each approval_task has: assigned_at, due_at, paused_at, resumed_at
// SLA calculation considers only active time

function getTaskSLAStatus(task) {
  let totalPausedHours = 0;

  // Calculate paused duration
  if (task.paused_at && task.resumed_at) {
    totalPausedHours += countWorkingHours(task.paused_at, task.resumed_at);
  }

  // Calculate active duration
  const activeHours = countWorkingHours(task.assigned_at, NOW) - totalPausedHours;

  return {
    total_hours: task.sla_hours,
    active_hours: activeHours,
    remaining_hours: task.sla_hours - activeHours,
    is_overdue: activeHours > task.sla_hours,
    overdue_hours: Math.max(0, activeHours - task.sla_hours)
  };
}
```

#### 6.5.4 SLA Escalation Rules

**Escalation Tiers:**

| Tier | Trigger | Action |
|------|---------|--------|
| T-2 | SLA - 48h | Send reminder to assignee |
| T0 | SLA = 0 (deadline) | Send overdue notice, mark task overdue |
| T+2 | SLA + 48h | Escalate to PKHCN, create escalated task |
| T+5 | SLA + 120h (optional) | Escalate to BGH (configurable) |

**Escalation Behavior:**
1. Original task status = `ESCALATED`
2. New task created with `escalated_from_task_id`
3. Notification sent to `escalate_to_role`
4. Original task remains in Inbox (read-only)

```javascript
// P1.6: Escalation with (stage, role) lookup
async function escalateTask(taskId) {
  const task = await getTask(taskId);

  // P1.6: Lookup SLA by (stage, assignee_role)
  const slaSetting = await db.sla_settings.findUnique({
    where: {
      stage_assignee_role: {
        stage: task.stage,
        assignee_role: task.assignee_role
      }
    }
  });

  // Create new task for escalated role
  const escalatedTask = await createApprovalTask({
    project_id: task.project_id,
    stage: task.stage,
    assignee_role: slaSetting.escalate_to_role,  // PHONG_KHCN or higher
    status: 'PENDING',
    escalated_from_task_id: taskId,
    escalation_reason: `Task overdue by ${task.overdue_hours}h`
  });

  // Update original task
  await updateTask(taskId, {
    status: 'ESCALATED',
    escalated_at: NOW()
  });

  // Notify
  await notifyEscalation(escalatedTask);
}
```

#### 6.5.5 SLA Display in UI

**Task Inbox:**
```tsx
<TaskItem>
  <SLAIndicator
    remaining={48}
    total={72}
    status="OK"  // OK | WARNING | OVERDUE
  />
  <Badge>
    {remaining > 48 ? 'Trong hạn' :
     remaining > 0 ? `Còn ${remaining}h` :
     `Quá hạn ${Math.abs(remaining)}h`}
  </Badge>
</TaskItem>
```

**Project Detail (Timeline View):**
```tsx
<TimelineStep state="FACULTY_REVIEW">
  <Duration>2.5 ngày / 3 ngày</Duration>
  <ProgressBar value={80} />
</TimelineStep>
```

### 6.6 Document Generation

```
Process:
1. Get DocumentTemplate by code
2. Get DocumentMap for template + form
3. Get FormInstance data
4. Replace variables in template
5. Generate .docx file
6. Save to Documents table
7. Return download URL

Variable mapping:
{{TEN_DE_TAI}}     → project.title
{{CHU_NHIEM}}      → project.owner.full_name
{{KINH_PHI}}       → project.budget
{{NGAY_NOP}}       → form_instance.submitted_at
{{NGUOI_DUYET}}    → workflow_log.actor.full_name
{{NGAY_DUYET}}     → workflow_log.timestamp
```

### 6.7 Document Visibility Rules

**Who can see which documents at which stage?**

#### 6.7.1 Document Types

| Document Type | Code | Generated At | Internal Only |
|---------------|------|--------------|---------------|
| Đề xuất đề tài | `PROPOSAL` | On SUBMIT | No |
| Biên bản Khoa | `FACULTY_MINUTES` | On FACULTY_REVIEW approve | No |
| Biên bản HĐ KH&ĐT | `COUNCIL_MINUTES` | On COUNCIL_REVIEW approve | No |
| Phiếu thẩm định | `EXPERT_REVIEW` | On EXPERT_REVIEW submit | Yes |
| Quyết định duyệt | `APPROVAL_DECISION` | On BGH_REVIEW approve | No |
| Báo cáo tiến độ | `PROGRESS_REPORT` | On ACTIVE | No |
| Biên bản nghiệm thu | `ACCEPTANCE_MINUTES` | On COMPLETED | No |

#### 6.7.2 Visibility Matrix

| Document | PI | Khoa | HĐ | TVXC | BGH | PKHCN | ADMIN |
|----------|----|-------|----|------|-----|-------|-------|
| `PROPOSAL` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `FACULTY_MINUTES` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `COUNCIL_MINUTES` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `EXPERT_REVIEW` (Internal) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `APPROVAL_DECISION` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `PROGRESS_REPORT` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `ACCEPTANCE_MINUTES` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ = Can view and download
- ❌ = Cannot view (internal document)
- `Internal Only` documents are only visible to approvers at that stage and above, PKHCN, and ADMIN

#### 6.7.3 Implementation

**Database:**
```sql
-- Add to document_templates
CREATE TABLE document_templates (
  ...
  is_internal BOOLEAN DEFAULT false,  -- Internal documents only
  min_role_to_view VARCHAR(50),       -- Minimum role to see this document
  ...
);
```

**API:**
```javascript
async function getProjectDocuments(projectId, user) {
  const documents = await db.documents.findMany({
    where: { project_id: projectId }
  });

  // Filter by visibility rules
  return documents.filter(doc => {
    const template = await getDocumentTemplate(doc.document_template_id);

    // Internal documents require approver role or higher
    if (template.is_internal) {
      return APPROVER_ROLES.includes(user.role) ||
             user.role === 'PHONG_KHCN' ||
             user.role === 'ADMIN';
    }

    // Non-internal: everyone can see
    return true;
  });
}
```

**UI Component:**
```tsx
<DocumentList
  documents={documents}
  user={currentUser}
/>

// Each document item checks visibility
{documents.map(doc => (
  canViewDocument(doc, user) && (
    <DocumentItem
      key={doc.id}
      document={doc}
      canDownload={canDownloadDocument(doc, user)}
    />
  )
))}
```

#### 6.7.4 Download Rules

| Role | Can Download |
|------|--------------|
| PI | All non-internal documents |
| Khoa | All non-internal documents + FACULTY_MINUTES |
| HĐ | All documents in their stage + previous stages |
| TVXC | EXPERT_REVIEW (internal) + all non-internal |
| BGH | All documents |
| PKHCN | All documents |
| ADMIN | All documents (for troubleshooting) |

**Audit Rule:** Every document download is logged to `workflow_logs` with action = `DOCUMENT_DOWNLOAD`.

---

### 6.8 Legal Standard for Signatures (MVP Policy)

**QUAN TRỌNG: Chuẩn pháp lý cho MVP là SCAN CHỮ KÝ TAY, KHÔNG sử dụng chữ ký số.**

#### 6.8.1 Signature Requirements

| Document Type | Signature Requirement | Legal Evidence |
|---------------|----------------------|----------------|
| Mẫu 1b (Đề cương) | Chữ ký PI + Khoa trưởng | Scan file có chữ ký tay |
| Mẫu 2b–7b (Xét chọn) | Chữ ký Thư ký Khoa/Trưởng Khoa + BGH | Scan biên bản họp |
| Mẫu 8b–11b (Nghiệm thu Khoa) | Chữ ký toàn bộ thành viên HĐ Khoa | Scan biên bản có tất cả chữ ký |
| Mẫu 12b–16b (Nghiệm thu Trường) | Chữ ký thành viên HĐ Trường + BGH | Scan biên bản có tất cả chữ ký |
| Mẫu 17b (Bàn giao) | Chữ ký PI + Khoa接收人 | Scan biên bản bàn giao |
| Mẫu 18b (Gia hạn) | Chữ ký PI + Khoa trưởng + PKHCN | Scan phiếu gia hạn |
| PL3 (Phản biện) | Chữ ký phản biện viên | Scan phiếu phản biện |

#### 6.8.2 File Format & Storage

```javascript
// Upload requirements
const SIGNATURE_FILE_REQUIREMENTS = {
  allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
  maxSizeBytes: 10 * 1024 * 1024,  // 10MB
  minResolution: { width: 800, height: 600 },  // Độ phân giải tối thiểu để đọc chữ ký

  // Validation rules
  validate: (file) => {
    if (file.size > SIGNATURE_FILE_REQUIREMENTS.maxSizeBytes) {
      throw new ValidationError('File quá lớn. Tối đa 10MB.');
    }
    if (!SIGNATURE_FILE_REQUIREMENTS.allowedFormats.includes(file.extension)) {
      throw new ValidationError('Chỉ chấp nhận PDF, JPG, PNG.');
    }
    // OCR check: ensure document contains signature-like content (optional, Phase 2)
  }
};

// Storage path pattern
// /documents/{project_id}/{form_template_code}/{timestamp}_{original_filename}
// Example: /documents/uuid-123/MAU_01B/20240115_143022_Mau1b_scan_ky.pdf
```

#### 6.8.3 Verification Workflow

**Frontend (Upload):**
1. User selects file (drag & drop or file picker)
2. System validates format & size
3. Preview image (1-2 pages) for visual confirmation
4. User confirms "Tôi xác nhận file này có chữ ký hợp lệ"
5. File uploaded to S3/storage

**Backend (Validation):**
```javascript
async function uploadSignedDocument(projectId, templateCode, file, uploadedBy) {
  // 1. Validate file requirements
  validateSignatureFile(file);

  // 2. Store document record
  const document = await db.documents.create({
    project_id: projectId,
    template_code: templateCode,
    file_url: await storage.upload(file),
    file_type: file.extension,
    uploaded_by: uploadedBy,
    signature_type: 'SCAN_HANDWRITTEN',  // MVP: Only scan signatures
    verification_status: 'PENDING',       // Awaiting visual check
  });

  // 3. Log for audit
  await logWorkflowEvent({
    project_id: projectId,
    action: 'FORM_UPLOADED',
    actor_id: uploadedBy,
    metadata: {
      template_code: templateCode,
      document_id: document.id,
      signature_type: 'SCAN_HANDWRITTEN'
    }
  });

  // 4. Trigger approval task if applicable
  await checkStageCompleteness(projectId);

  return document;
}
```

#### 6.8.4 Visual Verification Checklist

Thủ ký Khoa / PKHCN kiểm tra visual khi xử lý:

- [ ] File rõ nét, có thể đọc được chữ ký
- [ ] Tất cả người bắt buộc ký đều có tên và chữ ký
- [ ] Không có phần nào bị che/mất
- [] Ngày tháng ghi rõ ràng

**NOTE:** Verification is VISUAL ONLY. No digital signature validation required for MVP.

#### 6.8.5 Phase 2+ Considerations (Future)

**Out of Scope for MVP** (consider for future releases):

| Feature | Description | Priority |
|---------|-------------|----------|
| Chữ ký số (USB Token) | Yêu cầu thiết bị hard token, PKI | P2 |
| Chữ ký điện tử (e-signature) | Integration với dịch vụ bên ngoài | P2 |
| OCR tự động | Tự động đọc và xác thực chữ ký từ scan | P3 |
| Blockchain audit trail | Lưu trữ hash trên blockchain | P3 |

**MVP Position:**
- ✅ **Include**: Scan file upload + Visual verification checklist
- ❌ **Exclude**: Digital signatures, OCR, Blockchain

#### 6.8.6 Legal Compliance Statement

**Hệ thống tuân thủ:**
- Quyết định về quản lý NCKH của trường [Tên trường]
- Phụ lục II: Bộ biểu mẫu chuẩn (Mẫu 1b–18b, PL1–PL3)
- Quy trình xét duyệt qua các cấp (Khoa → Trường → BGH)

**Bằng chứng pháp lý:**
- File scan có chữ ký tay là bằng chứng hợp lệ
- Biên bản họp (Mẫu 2b, 8b, 12b) được lưu trữ đầy đủ
- Vote tally summary được ghi nhận kèm biên bản

**Trách nhiệm:**
- Người upload xác nhận tính chính xác của file upload
- Thư ký Khoa/PKHCN có trách nhiệm kiểm tra visual
- Hệ thống lưu trữ audit trail đầy đủ

---

### 6.9 Compliance Checklist & Bundle View (P2.1/P2.2)

#### 6.9.1 Compliance Checklist per Stage

**Mỗi stage có một compliance checklist để đảm bảo tất cả yêu cầu đã được đáp ứng.**

```javascript
// Compliance checklist definition
// Note: 'DRAFT' here means "requirements when submitting from DRAFT state"
// SUBMITTED is an EVENT, not a state - user clicks "Nộp" while in DRAFT
const COMPLIANCE_CHECKLISTS = {
  'DRAFT': [
    { id: 'mau_01b', label: 'Mẫu 1b - Đề cương đăng ký', required: true, type: 'file' },
    { id: 'pl1', label: 'PL1 - Hướng dẫn viết đề cương', required: false, type: 'reference' }
  ],
  'FACULTY_REVIEW': [
    { id: 'mau_02b', label: 'Mẫu 2b - Biên bản họp Khoa', required: true, type: 'file' },
    { id: 'mau_03b', label: 'Mẫu 3b - Phiếu đánh giá Khoa', required: true, type: 'file' },
    { id: 'faculty_signature', label: 'Chữ ký Khoa trưởng', required: true, type: 'verification' }
  ],
  'FACULTY_ACCEPTANCE_REVIEW': [
    { id: 'mau_08b', label: 'Mẫu 8b - Biên bản nghiệm thu Khoa', required: true, type: 'file' },
    { id: 'mau_09b', label: 'Mẫu 9b - Đánh giá sản phẩm', required: true, type: 'file' },
    { id: 'mau_10b', label: 'Mẫu 10b - Đánh giá nghiệp vụ', required: true, type: 'file' },
    { id: 'mau_11b', label: 'Mẫu 11b - Tổng hợp đánh giá', required: true, type: 'file' },
    { id: 'vote_tally', label: 'Kết quả biểu quyết', required: true, type: 'data' },
    { id: 'all_members_signed', label: 'Chữ ký tất cả thành viên HĐ', required: true, type: 'verification' }
  ],
  'SCHOOL_ACCEPTANCE_REVIEW': [
    { id: 'faculty_passed', label: 'Khoa nghiệm thu PASS', required: true, type: 'condition' },
    { id: 'mau_12b', label: 'Mẫu 12b - Biên bản nghiệm thu Trường', required: true, type: 'file' },
    { id: 'mau_13b', label: 'Mẫu 13b - Phiếu đánh giá nghiệm thu', required: true, type: 'file' },
    { id: 'mau_14b', label: 'Mẫu 14b - Ý kiến thành viên HĐ', required: true, type: 'file' },
    { id: 'mau_15b', label: 'Mẫu 15b - Phiếu phản biện (PL3)', required: true, type: 'file' },
    { id: 'mau_16b', label: 'Mẫu 16b - Tổng hợp nghiệm thu', required: true, type: 'file' },
    { id: 'vote_tally', label: 'Kết quả biểu quyết', required: true, type: 'data' },
    { id: 'bgh_signature', label: 'Chữ ký BGH', required: true, type: 'verification' }
  ]
};
```

**UI Component - Compliance Checklist:**

```tsx
interface ComplianceChecklistProps {
  projectId: string;
  stage: string;
  onComplete?: () => void;
}

function ComplianceChecklist({ projectId, stage, onComplete }: ComplianceChecklistProps) {
  const checklist = COMPLIANCE_CHECKLISTS[stage];
  const [items, setItems] = useState<ChecklistItem[]>(checklist);
  const [progress, setProgress] = useState(0);

  const allChecked = items.every(item => item.checked);
  const requiredChecked = items
    .filter(item => item.required)
    .every(item => item.checked);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Checklist - {stage}</CardTitle>
        <Progress value={progress} />
        <p>{items.filter(i => i.checked).length}/{items.length} hoàn thành</p>
      </CardHeader>
      <CardContent>
        {items.map(item => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={(checked) => setItems(items.map(i =>
              i.id === item.id ? { ...i, checked } : i
            ))}
          />
        ))}
      </CardContent>
      <CardFooter>
        <Button
          disabled={!requiredChecked}
          onClick={onComplete}
        >
          Xác nhận đầy đủ
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### 6.9.2 Bundle View (Tổng hợp biểu mẫu)

**Bundle View hiển thị TẤT CẢ biểu mẫu của một project theo nhóm stage.**

```tsx
interface BundleViewProps {
  projectId: string;
}

function BundleView({ projectId }: BundleViewProps) {
  const { data: forms } = useQuery(['form-submissions', projectId], () =>
    fetchFormSubmissions(projectId)
  );

  const groupedByStage = useMemo(() => {
    return groupBy(forms, f => f.stage);
  }, [forms]);

  return (
    <div className="bundle-view">
      {/* Phase A: Đề xuất & Xét chọn */}
      <StageGroup title="A. ĐỀ XUẤT & XÉT CHỌN" forms={groupedByStage['DRAFT']} />
      <StageGroup title="A. XÉT CHỌN KHOA" forms={groupedByStage['FACULTY_REVIEW']} />
      <StageGroup title="A. XÉT CHỌN TRƯỜNG" forms={groupedByStage['SCHOOL_SELECTION_REVIEW']} />
      <StageGroup title="A. HỘI ĐỒNG" forms={groupedByStage['OUTLINE_COUNCIL_REVIEW']} />

      {/* Phase B: Triển khai */}
      <StageGroup title="B. TRIỂN KHAI" forms={groupedByStage['PAUSED']} />

      {/* Phase C: Nghiệm thu Khoa */}
      <StageGroup title="C. NGHIỆM THU KHOA" forms={groupedByStage['FACULTY_ACCEPTANCE_REVIEW']} />

      {/* Phase D: Nghiệm thu Trường */}
      <StageGroup title="D. NGHIỆM THU TRƯỜNG" forms={groupedByStage['SCHOOL_ACCEPTANCE_REVIEW']} />

      {/* Phase E: Bàn giao */}
      <StageGroup title="E. BÀN GIAO" forms={groupedByStage['HANDOVER']} />
    </div>
  );
}

function StageGroup({ title, forms }: { title: string; forms: FormSubmission[] }) {
  const isComplete = forms?.every(f => f.verification_status === 'VERIFIED');

  return (
    <div className="stage-group">
      <div className="stage-header">
        <h3>{title}</h3>
        <StatusBadge status={isComplete ? 'COMPLETE' : 'INCOMPLETE'} />
      </div>
      <div className="form-list">
        {forms?.map(form => (
          <FormCard key={form.id} form={form} />
        ))}
      </div>
    </div>
  );
}
```

**Bundle View Features:**
- **Group by Stage:** Hiển thị form nhóm theo giai đoạn workflow
- **Status Indicator:** Icon ✅ cho stage hoàn thành, ⚠️ cho stage thiếu
- **Expand/Collapse:** Thu gọn từng stage để dễ navigation
- **Download All:** Tải xuống tất cả forms của một stage (zip)
- **Export Summary:** Xuất báo cáo tổng hợp forms (PDF)

**API Endpoints for Bundle View:**

```javascript
// GET /api/projects/:id/bundle
// Returns all form submissions grouped by stage
async function getProjectBundle(projectId) {
  const submissions = await db.form_submissions.findMany({
    where: { project_id: projectId },
    include: { template: true, uploader: true },
    orderBy: { stage: 'asc', submitted_at: 'asc' }
  });

  // Group by stage
  const grouped = groupBy(submissions, 'stage');

  // Add completion status
  return Object.entries(grouped).map(([stage, forms]) => ({
    stage,
    forms,
    required_count: REQUIRED_FORMS_BY_STAGE[stage]?.length || 0,
    uploaded_count: forms.length,
    is_complete: forms.length >= (REQUIRED_FORMS_BY_STAGE[stage]?.length || 0)
  }));
}

// GET /api/projects/:id/bundle/download
// Downloads all forms as ZIP
async function downloadProjectBundle(projectId) {
  const submissions = await db.form_submissions.findMany({
    where: { project_id: projectId }
  });

  const files = await Promise.all(
    submissions.map(s => storage.download(s.file_url))
  );

  return await createZip(files, `project-${projectId}-bundle.zip`);
}
```

---

### 6.10 Expert Review Rules (P1.2 - MVP Policy)

**P1.2: Quy trình phản biện chuyên môn (MVP - 1 phản biện viên)**

#### 6.10.1 Scope & Assignment

| Aspect | MVP Policy | Phase 2+ |
|--------|------------|----------|
| Số lượng phản biện | 1 reviewer per project | 2-3 reviewers |
| Phân công | Manual bởi PKHCN | Auto-rotate based on workload |
| Xung đột lợi ích | Không review đề tài cùng khoa | System check conflict of interest |
| Thời hạn | 5 working days | 3-5 working days |

**Assignment Rule:**
```javascript
// P1.2: MVP - Manual assignment by PKHCN
async function assignExpertReviewer(projectId, reviewerId) {
  // 1. Verify reviewer is THAM_DINH role
  const reviewer = await getUser(reviewerId);
  if (reviewer.role !== 'THAM_DINH' && reviewer.role !== 'HOI_DONG') {
    throw new ForbiddenError('Chỉ thành viên HĐ/Thẩm định mới được phân công phản biện');
  }

  // 2. Check conflict of interest (same faculty)
  const project = await getProject(projectId);
  if (reviewer.faculty_id === project.faculty_id) {
    throw new ForbiddenError('Không thể phản biện đề tài cùng khoa');
  }

  // 3. Create approval task for expert review
  const task = await createApprovalTask({
    project_id: projectId,
    stage: 'SCHOOL_SELECTION_REVIEW',  // Expert reviews during school selection
    assignee_role: 'THAM_DINH',
    assignee_id: reviewerId,
    status: 'PENDING',
    due_at: calculateDueDate(5, 'working_days')  // 5 working days
  });

  return task;
}
```

#### 6.10.2 Review Form & Decision

**Expert Review Decision Options:**

| Decision | Description | Workflow Effect |
|----------|-------------|------------------|
| `APPROVE` | Đề xuất đạt yêu cầu | Chuyển sang OUTLINE_COUNCIL_REVIEW |
| `REQUEST_CHANGES` | Cần chỉnh sửa | Quay lại FACULTY_REVIEW |
| `REJECT` | Không đạt yêu cầu | Project state = REJECTED |
| `ABSTAIN` | Kiên quyết | Không counted, PKHCN assign alternative |

**MVP Decision Rule (Single Reviewer):**
```javascript
// P1.2: With 1 reviewer, their decision IS the final decision
function processExpertReviewDecision(taskId, decision, comment) {
  const task = await getApprovalTask(taskId);

  // Update task
  await updateApprovalTask(taskId, {
    decision: decision,
    comment: comment,
    status: 'COMPLETED',
    completed_at: new Date()
  });

  // Transition project based on decision
  switch (decision) {
    case 'APPROVE':
      await transitionTo(task.project_id, 'OUTLINE_COUNCIL_REVIEW');
      break;
    case 'REQUEST_CHANGES':
      await transitionTo(task.project_id, 'FACULTY_REVIEW');
      break;
    case 'REJECT':
      await transitionTo(task.project_id, 'REJECTED');
      break;
    case 'ABSTAIN':
      // PKHCN must assign alternative reviewer
      await escalateTask(taskId, 'PHONG_KHCN', 'Reviewer abstained - need reassignment');
      break;
  }

  // Log audit
  await logWorkflowEvent({
    project_id: task.project_id,
    action: 'EXPERT_REVIEW_COMPLETE',
    actor_id: task.assignee_id,
    metadata: { decision, comment, task_id: taskId }
  });
}

// Phase 2+ (Multiple reviewers): Aggregate by majority
function processMultipleExpertReviews(projectId) {
  const tasks = await getApprovalTasks(projectId, 'SCHOOL_SELECTION_REVIEW');

  const approveCount = tasks.filter(t => t.decision === 'APPROVE').length;
  const rejectCount = tasks.filter(t => t.decision === 'REJECT').length;
  const totalReviewers = tasks.length;

  if (approveCount > totalReviewers / 2) {
    await transitionTo(projectId, 'OUTLINE_COUNCIL_REVIEW');
  } else if (rejectCount > totalReviewers / 2) {
    await transitionTo(projectId, 'REJECTED');
  } else {
    // Tie - escalate to BGH for final decision
    await escalateTo(projectId, 'BGH');
  }
}
```

#### 6.10.3 Review Form Fields

**Mẫu phản biện (Mẫu 15b / PL3):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reviewer_name` | text | Yes | Họ tên phản biện viên |
| `review_date` | date | Yes | Ngày phản biện |
| `technical_quality` | enum | Yes | Xuất sắc / Khá / Trung bình / Yếu |
| `novelty` | enum | Yes | Cao / Khá / Trung bình / Thấp |
| `feasibility` | enum | Yes | Feasible / Cần điều chỉnh / Không feasible |
| `recommendation` | enum | Yes | APPROVE / REQUEST_CHANGES / REJECT |
| `comments` | text | Yes | Nhận xét chi tiết |
| `required_changes` | text[] | No* | Các thay đổi cần thiết (nếu REQUEST_CHANGES) |
| `signature` | file | Yes | Scan chữ ký (Mẫu 15b) |

\* Required when recommendation = REQUEST_CHANGES

#### 6.10.4 API Endpoints

```
POST /api/expert-reviews/:task/submit
Body: { decision, comment, required_changes[], file }
Response: { task_id, project_id, new_state }

GET /api/expert-reviews/available
Query: ?exclude_faculty=KHA06
Response: [{ reviewer_id, name, faculty, current_load }]
```

---

### 6.11 Comments & Discussion (P1.3 - MVP Policy)

**P1.3: Comments = workflow_logs (no separate table needed for MVP)**

#### 6.11.1 Data Model

**MVP: Use workflow_logs table as comment stream**

```sql
-- Comments ARE workflow_logs with action = 'COMMENT'
-- No separate comments table needed for MVP

-- Example comment log entry
{
  id: "uuid",
  project_id: "project-uuid",
  action: "COMMENT",           -- P1.3: New action type for comments
  actor_id: "user-uuid",
  actor_name: "Nguyễn Văn A",
  timestamp: "2024-03-15T14:30:00Z",
  reason: "@NguyenVanB Vui lòng kiểm tra lại kinh phí phần thiết bị",
  metadata: {
    comment_type: "MENTION",   -- COMMENT, MENTION, SYSTEM
    mentioned_users: ["user-uuid-2"],
    parent_id: null           -- For threading (Phase 2+)
  }
}
```

#### 6.11.2 UI Component

**Comment Box on Project Detail:**

```tsx
interface Comment {
  id: string;
  actor_name: string;
  actor_role: string;
  content: string;
  created_at: string;
  is_mention?: boolean;
  mentioned_users?: string[];
}

function ProjectComments({ projectId }: { projectId: string }) {
  const { data: comments } = useQuery(
    ['comments', projectId],
    () => fetchComments(projectId)
  );

  const submitComment = useMutation({
    mutationFn: async (content: string) => {
      await fetch('/api/projects/' + projectId + '/comments', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thảo luận ({comments?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Comment list */}
        <div className="space-y-4">
          {comments?.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>

        {/* Comment input */}
        <CommentInput
          placeholder="Viết bình luận... (@username để nhắc)"
          onSubmit={submitComment.mutate}
        />
      </CardContent>
    </Card>
  );
}
```

#### 6.11.3 API Endpoints

```
GET /api/projects/:id/comments
Response: [{ id, actor_name, content, created_at, mentioned_users[] }]

POST /api/projects/:id/comments
Body: { content: string }
Response: { id, created_at }

DELETE /api/comments/:id
Auth: Own comment or ADMIN/PKHCN only
```

#### 6.11.4 Backend Implementation

```javascript
// P1.3: Comments are just workflow_logs with action = 'COMMENT'
async function addComment(projectId, userId, content) {
  // Parse mentions
  const mentions = content.match(/@(\w+)/g) || [];
  const mentionedUserIds = await resolveUsernames(mentions.map(m => m.slice(1)));

  // Create workflow log entry
  const comment = await db.workflow_logs.create({
    data: {
      project_id: projectId,
      action: 'COMMENT',
      actor_id: userId,
      actor_name: await getUserName(userId),
      actor_role: await getUserRole(userId),
      reason: content,  // Store comment in 'reason' field
      metadata: {
        comment_type: mentions.length > 0 ? 'MENTION' : 'COMMENT',
        mentioned_users: mentionedUserIds
      }
    }
  });

  // Send notifications for mentions
  for (const mentionedUserId of mentionedUserIds) {
    await sendNotification({
      user_id: mentionedUserId,
      type: 'COMMENT_MENTION',
      title: `${comment.actor_name} đã nhắc bạn`,
      content: content,
      project_id: projectId,
      action_url: `/projects/${projectId}#comments`
    });
  }

  return comment;
}

async function getComments(projectId) {
  return await db.workflow_logs.findMany({
    where: {
      project_id: projectId,
      action: { in: ['COMMENT', 'SYSTEM'] }
    },
    orderBy: { created_at: 'desc' },
    take: 100  // Limit to 100 most recent
  });
}

async function deleteComment(commentId, userId) {
  const comment = await db.workflow_logs.findUnique({ where: { id: commentId } });

  // Check permission: own comment or ADMIN/PKHCN
  const user = await getUser(userId);
  if (comment.actor_id !== userId && user.role !== 'ADMIN' && user.role !== 'PHONG_KHCN') {
    throw new ForbiddenError('No permission to delete this comment');
  }

  // Soft delete: update action to 'COMMENT_DELETED'
  await db.workflow_logs.update({
    where: { id: commentId },
    data: {
      action: 'COMMENT_DELETED',
      reason: '[Bình luận đã bị xóa]'
    }
  });
}
```

#### 6.11.5 Visibility Rules

| State | Who can comment | Who can view |
|-------|-----------------|---------------|
| DRAFT | PI (owner) + members | PI + members |
| SUBMITTED + *_REVIEW | PI + current reviewer | PI + current reviewer + PKHCN |
| APPROVED | PI + PKHCN | PI + PKHCN |
| COMPLETED | PI + Khoa (for handover) | PI + Khoa + PKHCN |
| REJECTED | PI only | PI only |

---

## 7. Implementation Plan

### 7.1 Phase Breakdown

| Phase | Weeks | Modules | Deliverables |
|-------|-------|---------|--------------|
| 0: Setup | 1-2 | Project foundation | Repo, DB schema, Dev env |
| 1: RBAC | 3-4 | Auth + Permission | Login, Role middleware |
| 2: Forms | 5-7 | Form + Data | Dynamic forms, Doc gen |
| 3: Workflow | 8-10 | State machine + SLA | Transitions, Escalation |
| 4: Dashboard | 11-13 | UI (5 roles) | Dashboards, Components |
| 5: Notification | 14-15 | Email + In-app | Notifications, Reminders |
| 6: Audit | 16 | Decision log | History view, Export |
| 7: Launch | 17-18 | UAT + Deploy | Production system |

### 7.2 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict adherence to spec, change request process |
| Data migration | Early analysis, backup plan, test migration |
| User adoption | Early training, support team, gradual rollout |
| Performance | Load testing, optimization, caching strategy |

### 7.3 Success Criteria

- 100% of 4-step workflow digitized
- SLA compliance > 90%
- User adoption > 80% within 3 months
- Zero data loss
- Complete audit trail for all actions

---

## Appendix A: Routes/UI Structure and API Summary

### A.1 Frontend Routes

```
/auth
  /login              # Login page
  /logout             # Logout action

/                    # Root → redirect based on role

/dashboard           # Role-based dashboard redirect
  → /dashboard/pi     # GIANG_VIEN
  → /dashboard/faculty    # QUAN_LY_KHOA
  → /dashboard/council    # HOI_DONG, THAM_DINH
  → /dashboard/bgh        # BGH
  → /dashboard/pkhcn      # PHONG_KHCN
  → /dashboard/admin      # ADMIN

/projects
  /                   # Project list (filterable)
  /new                # Create new project (wizard)
  /:id                # Project detail (role-based view)
  /:id/edit           # Edit project (DRAFT, CHANGES_REQUESTED only)
  /:id/timeline       # Workflow timeline
  /:id/documents      # Documents tab
  /:id/history        # Audit history

/tasks                # Approval task inbox
  /                   # Task list (filterable)
  /:id                # Task detail / decision form
  /statistics         # Task statistics

/documents
  /:id/download       # Download document

/forms
  /:id                # Fill form (for submission)

/profile
  /                   # User profile
  /change-password    # Change password

/admin                # Admin panel (ADMIN only)
  /users              # User management
  /roles              # Role management
  /form-templates     # Form template CRUD
  /doc-templates      # Document template CRUD
  /sla-settings       # SLA configuration
  /audit-logs         # System audit logs
  /statistics         # System statistics
```

### A.2 UI Components

**Dashboard Components (Per Role):**

| Role | Dashboard Components |
|------|---------------------|
| GIANG_VIEN | ProjectStatusCard, MyProjectsList, ActionItems, Timeline, Notifications |
| QUAN_LY_KHOA | KhoaSummary, ApprovalQueue, SLAAlert, RecentActivity |
| HOI_DONG | CouncilTasks, ProjectListForReview, SLAIndicator |
| BGH | ExecutiveSummary, PendingApprovals, ByFacultyChart, RisksAndAlerts |
| PHONG_KHCN | SchoolSummary, PendingByState, SLAOverdue, ByFacultyStats, BulkActions |
| ADMIN | SystemStatus, UserStats, Configuration, Security |

**Shared Components:**
- `<ActionButton>` - Role-based action buttons
- `<StatusCard>` - Project status with badge
- `<Timeline>` - Workflow timeline visualization
- `<FormRenderer>` - Dynamic form rendering
- `<SLAIndicator>` - SLA status with progress
- `<DocumentList>` - Document list with visibility rules
- `<NotificationBell>` - Notification icon with count

### A.3 API Endpoints Summary

**Authentication:**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
