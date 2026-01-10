# Story 10.2: Export Excel (Full Dump)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 9 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Admin,
I want export toàn bộ data ra Excel,
So that tôi có backup đầy đủ.

## Acceptance Criteria

1. **AC1: Export Endpoint (Admin only)**
   - Given User có role = ADMIN
   - When User click "Export full data"
   - Then server generate Excel với streaming download

2. **AC2: Multi-Sheet Excel Structure**
   - Given Export request được process
   - When Excel được generate
   - Then file contains 4 sheets:
     - Sheet 1: Users (id, email, displayName, role, facultyId, createdAt)
     - Sheet 2: Proposals (id, code, title, ownerId, state, facultyId, createdAt, etc.)
     - Sheet 3: Workflow Logs (id, proposalId, action, fromState, toState, actorId, timestamp)
     - Sheet 4: Evaluations (id, proposalId, councilId, evaluatorId, scores, submittedAt)

3. **AC3: Large File Streaming**
   - Given Excel lớn (> 1000 rows)
   - When export thành công
   - Then file được stream download (không timeout)
   - And Progress bar hiển thị on frontend

4. **AC4: Exception State Handling**
   - Given Proposals có exception states (CANCELLED, WITHDRAWN, REJECTED, PAUSED)
   - When export được generate
   - Then exception fields được include:
     - cancelledAt, withdrawnAt, rejectedAt, pausedAt
     - rejectedById, pauseReason
     - prePauseState (for PAUSED proposals)

5. **AC5: Vietnamese Headers**
   - Given Excel được generate
   - When file opened
   - Then column headers trong Vietnamese:
     - Users: "ID", "Email", "Tên hiển thị", "Vai trò", "Khoa", "Ngày tạo"
     - Proposals: "ID", "Mã", "Tiêu đề", "Chủ nhiệm", "Trạng thái", "Khoa", "Ngày tạo"
     - Workflow Logs: "ID", "Đề tài", "Hành động", "Từ trạng thái", "Đến trạng thái", "Người thực hiện", "Thời gian"
     - Evaluations: "ID", "Đề tài", "Hội đồng", "Người chấm", "Điểm", "Ngày nộp"

6. **AC6: Export Log Tracking**
   - Given Export request completed
   - When export finished
   - Then record trong export_logs table:
     - exportedBy (admin userId)
     - exportedAt (timestamp)
     - recordCounts (users, proposals, logs, evaluations)
     - fileSize (bytes)

## Tasks / Subtasks

- [ ] Task 1: Backend - Export Module Setup (AC: #1, #2)
  - [ ] Extend ExportModule from Epic 8
  - [ ] Add full dump export methods
  - [ ] Register new endpoints

- [ ] Task 2: Backend - Multi-Sheet Excel Generation (AC: #2)
  - [ ] Create generateMultiSheetExcel() method
  - [ ] Define sheet structures with proper typing
  - [ ] NO as unknown/as any casts (Epic 9 retro pattern)

- [ ] Task 3: Backend - Large File Streaming (AC: #3)
  - [ ] Implement streaming response for large files
  - [ ] Add progress tracking via job queue or WebSocket
  - [ ] Set appropriate timeouts (5+ minutes for large exports)

- [ ] Task 4: Backend - Exception State Export (AC: #4)
  - [ ] Include exception fields in proposal export
  - [ ] Map state enums to Vietnamese labels
  - [ ] Include pre-pause state for PAUSED proposals

- [ ] Task 5: Backend - Vietnamese Headers (AC: #5)
  - [ ] Create header mapping objects (Vietnamese labels)
  - [ ] Format dates in Vietnamese locale (dd/MM/yyyy)
  - [ ] Format role/state enums in Vietnamese

- [ ] Task 6: Backend - Export Controller (AC: #1, #6)
  - [ ] GET /admin/export/full endpoint
  - [ ] RBAC: @RequireRoles(UserRole.ADMIN)
  - [ ] Return streaming file download
  - [ ] Log export in export_logs table

- [ ] Task 7: Backend - Export Log Model (AC: #6)
  - [ ] Create ExportLog model in schema.prisma
  - [ ] Fields: exportedBy, exportedAt, recordCounts, fileSize
  - [ ] Index on exportedAt for history queries

- [ ] Task 8: Frontend - Export Button (AC: #1)
  - [ ] Add "Xuất toàn bộ dữ liệu" button on admin dashboard
  - [ ] Show confirmation dialog before starting export
  - [ ] Progress indicator for large exports

- [ ] Task 9: Frontend - Download Handling (AC: #3)
  - [ ] Handle streaming download
  - [ ] Show success message with file info (size, record counts)
  - [ ] Auto-open download folder or provide "Open" button

- [ ] Task 10: Unit Tests (AC: #2, #4, #5)
  - [ ] Test multi-sheet Excel generation
  - [ ] Test exception state field inclusion
  - [ ] Test Vietnamese header mapping
  - [ ] Test date formatting
  - [ ] Test large file streaming (mock with >1000 records)

- [ ] Task 11: Integration Tests (AC: #1, #6)
  - [ ] Test full export flow: request → stream → log
  - [ ] Test export log record creation
  - [ ] Test concurrent exports (should queue or reject)

## Dev Notes

### Epic 10 Context

**Epic 10: Admin & System Configuration**
- FRs covered: FR46 (Import/Export Excel), FR47 (Holiday Mgmt), FR48 (Audit Logs)
- Story 10.1: Import Excel (Users, Proposals)
- Story 10.2: Export Excel (Full Dump) (THIS STORY)
- Story 10.3: System Health Dashboard
- Story 10.4: Full Audit Log Viewer
- Story 10.5: Holiday Management (Full CRUD)
- Story 10.6: DB Restore + State Recompute

**Epic Objective:**
Enable full system administration with import/export, health monitoring, audit logs, and backup/restore.

### Dependencies

**Depends on:**
- Story 1.2 (RBAC) - For ADMIN role
- Story 3.1 (16 canonical states) - For state enum mapping
- Story 3.4 (Workflow Logs) - For log export structure
- Story 5.3 (Evaluations) - For evaluation export structure
- Story 8.3 (Export Excel) - Reuse XLSX library and streaming patterns
- Story 9.1, 9.2, 9.3 (Exception Actions) - For exception state fields

**Enables:**
- Story 10.6 (DB Restore) - Import exported data for restore

### Epic 9 Retro Learnings to Apply (CRITICAL)

From `epic-9-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const row = data as unknown as ExcelRow;

// ✅ CORRECT - Epic 9 retro pattern:
interface ProposalExportRow {
  id: string;
  code: string;
  title: string;
  state: ProjectState;
  // ... all fields properly typed
}
const row: ProposalExportRow = {
  id: proposal.id,
  code: proposal.code,
  // ... direct mapping with proper types
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG:
const headers = (sheet as any).headers;

// ✅ CORRECT - Define proper interface:
interface SheetConfig {
  name: string;
  headers: Record<string, string>;  // key → Vietnamese label
  data: unknown[];
}
const headers: Record<string, string> = sheetConfig.headers;
```

**3. Use WorkflowAction Enum Directly** ⚠️ MANDATORY
```typescript
// ✅ CORRECT - Map enum to Vietnamese:
const ACTION_LABELS: Record<WorkflowAction, string> = {
  [WorkflowAction.CANCEL]: 'Hủy bỏ',
  [WorkflowAction.WITHDRAW]: 'Rút hồ sơ',
  [WorkflowAction.REJECT]: 'Từ chối',
  [WorkflowAction.PAUSE]: 'Tạm dừng',
  [WorkflowAction.RESUME]: 'Tiếp tục',
  // ... all actions mapped
};
```

**4. Proper Decorator Usage** ⚠️ Epic 8 Finding
```typescript
// ✅ CORRECT - Use stream response:
@Get('full')
@Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
@Header('Content-Disposition', 'attachment; filename="export-full.xlsx"')
async exportFull(@Res() res: Response): Promise<void> {
  // Stream file to response
}
```

**5. Tests MUST Be Written**
```typescript
// Epic 9 achievement: 130 tests passing with 0 type violations
// Epic 10 REQUIREMENT: Write tests for export scenarios including large files
```

### Project Structure Notes

**Backend Structure (extend Epic 8):**
```
qlnckh/apps/src/modules/
  exports/
    exports.controller.ts         # Extend: Add full dump endpoint
    exports.service.ts            # Extend: Add exportFull() method
    dto/
      full-export-query.dto.ts    # New: Optional filters for full export
    helpers/
      excel-builder.helper.ts     # Extend: Add multi-sheet builder
    interfaces/
      export-config.interface.ts  # New: Sheet configuration interface
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    admin/
      dashboard/
        components/
          FullExportButton.tsx    # New: Full export trigger
  lib/
    api/
      exports.ts                  # Extend: Add exportFull() method
```

### Architecture Compliance

**XLSX Library (reuse from Epic 8):**
```typescript
import * as XLSX from 'xlsx';
import { write, utils, Stream } from 'xlsx';

// Build multi-sheet workbook
function buildMultiSheetExport(
  users: User[],
  proposals: Proposal[],
  logs: WorkflowLog[],
  evaluations: Evaluation[],
): XLSX.WorkBook {
  const workbook = utils.book_new();

  // Sheet 1: Users
  const usersData = users.map(mapUserToExportRow);
  const usersSheet = utils.json_to_sheet(usersData, { header: USER_HEADERS });
  utils.book_append_sheet(workbook, usersSheet, 'Users');

  // Sheet 2: Proposals
  const proposalsData = proposals.map(mapProposalToExportRow);
  const proposalsSheet = utils.json_to_sheet(proposalsData, { header: PROPOSAL_HEADERS });
  utils.book_append_sheet(workbook, proposalsSheet, 'Proposals');

  // Sheet 3: Workflow Logs
  const logsData = logs.map(mapLogToExportRow);
  const logsSheet = utils.json_to_sheet(logsData, { header: LOG_HEADERS });
  utils.book_append_sheet(workbook, logsSheet, 'WorkflowLogs');

  // Sheet 4: Evaluations
  const evalData = evaluations.map(mapEvalToExportRow);
  const evalSheet = utils.json_to_sheet(evalData, { header: EVAL_HEADERS });
  utils.book_append_sheet(workbook, evalSheet, 'Evaluations');

  return workbook;
}
```

**Streaming Response Pattern:**
```typescript
@Get('full')
@Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
@Header('Content-Disposition', 'attachment; filename="export-full-${timestamp}.xlsx"')
async exportFull(@Res() res: Response): Promise<void> {
  const workbook = await this.exportsService.buildFullExport();

  // Write to buffer
  const buffer = write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Stream to response
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}
```

### Data Model

**Export Log Model:**
```prisma
model ExportLog {
  id            String   @id @default(uuid())
  exportedBy    String
  exportedAt    DateTime @default(now())
  recordCounts  Json     // { users: number, proposals: number, logs: number, evaluations: number }
  fileSize      Int      // bytes in MB
  filename      String

  exportedByUser User?   @relation("ExportedBy", fields: [exportedBy], references: [id])

  @@index([exportedAt])
}
```

**Vietnamese Header Mappings:**
```typescript
// Users sheet headers
const USER_HEADERS = {
  id: 'ID',
  email: 'Email',
  displayName: 'Tên hiển thị',
  role: 'Vai trò',
  facultyId: 'Mã khoa',
  createdAt: 'Ngày tạo',
};

// Proposals sheet headers (include exception states)
const PROPOSAL_HEADERS = {
  id: 'ID',
  code: 'Mã số',
  title: 'Tiêu đề',
  ownerId: 'ID chủ nhiệm',
  ownerName: 'Chủ nhiệm',
  state: 'Trạng thái',
  facultyId: 'Mã khoa',
  createdAt: 'Ngày tạo',
  // Exception states (Epic 9)
  cancelledAt: 'Ngày hủy',
  withdrawnAt: 'Ngày rút',
  rejectedAt: 'Ngày từ chối',
  pausedAt: 'Ngày tạm dừng',
  rejectedById: 'Người từ chối',
  pauseReason: 'Lý do tạm dừng',
  prePauseState: 'Trạng thái trước tạm dừng',
};

// Workflow Logs sheet headers
const LOG_HEADERS = {
  id: 'ID',
  proposalId: 'ID đề tài',
  proposalCode: 'Mã đề tài',
  action: 'Hành động',
  fromState: 'Từ trạng thái',
  toState: 'Đến trạng thái',
  actorId: 'ID người thực hiện',
  actorName: 'Người thực hiện',
  comment: 'Ghi chú',
  timestamp: 'Thời gian',
};

// Evaluations sheet headers
const EVAL_HEADERS = {
  id: 'ID',
  proposalId: 'ID đề tài',
  proposalCode: 'Mã đề tài',
  councilId: 'ID hội đồng',
  evaluatorId: 'ID người chấm',
  evaluatorName: 'Người chấm',
  scores: 'Điểm',
  totalScore: 'Tổng điểm',
  submittedAt: 'Ngày nộp',
};
```

**State to Vietnamese Label Mapping:**
```typescript
const STATE_LABELS: Record<ProjectState, string> = {
  [ProjectState.DRAFT]: 'Nháp',
  [ProjectState.FACULTY_REVIEW]: 'Thẩm định Khoa',
  [ProjectState.SCHOOL_SELECTION_REVIEW]: 'Thẩm định Trường',
  [ProjectState.OUTLINE_COUNCIL_REVIEW]: 'Thẩm định Hội đồng',
  [ProjectState.CHANGES_REQUESTED]: 'Cần sửa đổi',
  [ProjectState.APPROVED]: 'Đã phê duyệt',
  [ProjectState.IN_PROGRESS]: 'Đang thực hiện',
  [ProjectState.FACULTY_ACCEPTANCE_REVIEW]: 'Nghiệm thu Khoa',
  [ProjectState.SCHOOL_ACCEPTANCE_REVIEW]: 'Nghiệm thu Trường',
  [ProjectState.HANDOVER]: 'Bàn giao',
  [ProjectState.COMPLETED]: 'Hoàn thành',
  // Exception states (Epic 9)
  [ProjectState.CANCELLED]: 'Đã hủy',
  [ProjectState.WITHDRAWN]: 'Đã rút',
  [ProjectState.REJECTED]: 'Đã từ chối',
  [ProjectState.PAUSED]: 'Tạm dừng',
};
```

### Vietnamese Localization

All UI text and export headers in Vietnamese:

**UI Text:**
- "Xuất toàn bộ dữ liệu" (Export Full Data)
- "Đang xuất dữ liệu..." (Exporting data...)
- "Xuất thành công!" (Export successful!)
- "Kích thước file: {size} MB" (File size: {size} MB)
- "Bản ghi: {count}" (Records: {count})

**Confirm Dialog:**
- "Xuất toàn bộ dữ liệu?" (Export all data?)
- "Hành động này sẽ tạo file Excel chứa tất cả người dùng, đề tài, nhật ký và đánh giá. File có thể lớn." (This action will create an Excel file containing all users, proposals, logs, and evaluations. The file may be large.)
- "Tiếp tục" (Continue) / "Hủy" (Cancel)

### Code Patterns to Follow

**Proper Export Service (Epic 9 Retro Pattern):**
```typescript
// ExportsService.buildFullExport()
async buildFullExport(): Promise<XLSX.WorkBook> {
  // Fetch all data with proper typing - NO as any
  const [users, proposals, logs, evaluations] = await Promise.all([
    this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        facultyId: true,
        createdAt: true,
      },
    }),
    this.prisma.proposal.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        ownerId: true,
        state: true,
        facultyId: true,
        createdAt: true,
        // Exception states (Epic 9)
        cancelledAt: true,
        withdrawnAt: true,
        rejectedAt: true,
        pausedAt: true,
        rejectedById: true,
        pauseReason: true,
        prePauseState: true,
      },
      include: {
        owner: { select: { displayName: true } },
      },
    }),
    this.prisma.workflowLog.findMany({
      select: {
        id: true,
        proposalId: true,
        action: true,
        fromState: true,
        toState: true,
        actorId: true,
        actorName: true,
        comment: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    }),
    this.prisma.evaluation.findMany({
      select: {
        id: true,
        proposalId: true,
        councilId: true,
        evaluatorId: true,
        scores: true,
        totalScore: true,
        submittedAt: true,
      },
      include: {
        proposal: { select: { code: true } },
        evaluator: { select: { displayName: true } },
      },
    }),
  ]);

  // Build workbook with proper interface
  const workbook = this.buildMultiSheetWorkbook({
    users: users.map(mapUserToExportRow),
    proposals: proposals.map(mapProposalToExportRow),
    logs: logs.map(mapLogToExportRow),
    evaluations: evaluations.map(mapEvalToExportRow),
  });

  return workbook;
}

// Proper interface for export data
interface ExportData {
  users: UserExportRow[];
  proposals: ProposalExportRow[];
  logs: WorkflowLogExportRow[];
  evaluations: EvaluationExportRow[];
}

function mapProposalToExportRow(proposal: Proposal & { owner: { displayName: string } }): ProposalExportRow {
  return {
    id: proposal.id,
    code: proposal.code,
    title: proposal.title,
    ownerId: proposal.ownerId,
    ownerName: proposal.owner.displayName,
    state: STATE_LABELS[proposal.state],  // Vietnamese label
    facultyId: proposal.facultyId,
    createdAt: formatDateVn(proposal.createdAt),  // dd/MM/yyyy
    // Exception states (Epic 9)
    cancelledAt: formatDateVn(proposal.cancelledAt),
    withdrawnAt: formatDateVn(proposal.withdrawnAt),
    rejectedAt: formatDateVn(proposal.rejectedAt),
    pausedAt: formatDateVn(proposal.pausedAt),
    rejectedById: proposal.rejectedById,
    pauseReason: proposal.pauseReason,
    prePauseState: proposal.prePauseState ? STATE_LABELS[proposal.prePauseState] : '',
  };
}
```

**Date Formatting (Vietnamese):**
```typescript
function formatDateVn(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 9 Retro):**
```typescript
describe('ExportsService.buildFullExport', () => {
  it('should generate multi-sheet Excel with all data', async () => {
    // Setup test data
    await createTestUsers(5);
    await createTestProposals(10);

    const workbook = await service.buildFullExport();

    expect(workbook.SheetNames).toEqual(['Users', 'Proposals', 'WorkflowLogs', 'Evaluations']);

    // Verify Users sheet
    const usersSheet = workbook.Sheets['Users'];
    const usersData = XLSX.utils.sheet_to_json(usersSheet);
    expect(usersData).toHaveLength(5);
  });

  it('should include exception state fields in proposals export', async () => {
    const cancelledProposal = await createTestProposal({
      state: ProjectState.CANCELLED,
      cancelledAt: new Date('2026-01-01'),
    });

    const workbook = await service.buildFullExport();
    const proposalsSheet = workbook.Sheets['Proposals'];
    const proposals = XLSX.utils.sheet_to_json<ProposalExportRow>(proposalsSheet);

    const cancelled = proposals.find(p => p.id === cancelledProposal.id);
    expect(cancelled?.cancelledAt).toBe('01/01/2026');
  });

  it('should use Vietnamese headers', async () => {
    await createTestUsers(1);

    const workbook = await service.buildFullExport();
    const usersSheet = workbook.Sheets['Users'];

    // Get header row
    const headers = XLSX.utils.sheet_to_json<string[]>(usersSheet, { header: 1 })[0];
    expect(headers).toContain('Tên hiển thị');
    expect(headers).toContain('Email');
    expect(headers).toContain('Vai trò');
  });
});

describe('ExportsController', () => {
  it('should require ADMIN role', async () => {
    const nonAdmin = await createTestUser({ role: UserRole.GIANG_VIEN });

    await request(app.get('/admin/export/full'))
      .set('Authorization', `Bearer ${getToken(nonAdmin)}`)
      .expect(403);
  });

  it('should stream Excel file with correct headers', async () => {
    const admin = await createTestUser({ role: UserRole.ADMIN });

    const response = await request(app.get('/admin/export/full'))
      .set('Authorization', `Bearer ${getToken(admin)}`)
      .expect(200);

    expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toContain('export-full');
  });
});
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 10-2 created via create-story workflow. Status: ready-for-dev
- Epic 9 retrospective learnings applied (type safety, no as unknown/as any)
- Reuses XLSX library from Epic 8
- Multi-sheet Excel generation defined
- Exception state fields from Epic 9 included
- Vietnamese headers and labels
- Streaming response for large files
- Export log tracking
- Tests mandated per Epic 9 retro lessons

### File List

**To Create:**
- `qlnckh/apps/src/modules/exports/dto/full-export-query.dto.ts` - Full export query DTO
- `qlnckh/apps/src/modules/exports/interfaces/export-config.interface.ts` - Sheet configuration interface
- `qlnckh/apps/src/modules/exports/helpers/vietnamese-headers.helper.ts` - Header mappings
- `qlnckh/web-apps/src/app/admin/dashboard/components/FullExportButton.tsx` - Full export button

**To Modify:**
- `qlnckh/apps/src/modules/exports/exports.controller.ts` - Add full dump endpoint
- `qlnckh/apps/src/modules/exports/exports.service.ts` - Add buildFullExport() method
- `qlnckh/apps/src/modules/exports/helpers/excel-builder.helper.ts` - Add multi-sheet builder
- `qlnckh/prisma/schema.prisma` - Add ExportLog model
- `qlnckh/web-apps/src/lib/api/exports.ts` - Add exportFull() method
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 9 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Multi-sheet Excel generation pattern
  - Exception state handling from Epic 9
  - Vietnamese localization for all headers
  - Streaming response for large files
  - Export log tracking
  - Tests mandated per Epic 9 retro lessons
  - Ready for dev-story workflow execution

## References

- [epics.md Story 10.2](../../planning-artifacts/epics.md#L2314-L2335) - Full requirements
- [epic-9-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-9-retro-2026-01-07.md) - Lessons learned
- [epic-8-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-8-retro-2026-01-07.md) - Export patterns
- [Story 8.3](./8-3-export-excel-per-filter.md) - Excel handling patterns
- [Story 9.1](./9-1-cancel-withdraw-actions.md) - Exception states (CANCELLED, WITHDRAWN)
- [Story 9.2](./9-2-reject-action.md) - Exception states (REJECTED)
- [Story 9.3](./9-3-pause-resume-pkhcn-only.md) - Exception states (PAUSED)
