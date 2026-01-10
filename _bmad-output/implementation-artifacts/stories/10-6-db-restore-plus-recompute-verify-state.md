# Story 10.6: DB Restore + Recompute/Verify State

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 9 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Admin,
I want restore database từ backup và recompute proposal states,
So that hệ thống có disaster recovery capability và state integrity verification.

## Acceptance Criteria

1. **AC1: Database Management Page (Admin only)**
   - Given User có role = ADMIN
   - When User vào Database Management page (/admin/database)
   - Then UI hiển thị:
     - Backup list (filename, created_at, size)
     - Button "Upload backup"
     - Button "Verify State Integrity"
     - Warning banner: "⚠️ DANGER ZONE - Critical operations"

2. **AC2: Backup List Display**
   - Given Database Management page loaded
   - When backups displayed
   - Then table columns:
     - Filename
     - Size (formatted: MB, GB)
     - Created at (dd/MM/yyyy HH:mm)
     - Uploaded by (user name)
     - Actions (Restore, Delete buttons)

3. **AC3: Upload Backup**
   - Given User click "Upload backup"
   - When File dialog opens
   - Then accept .sql files (PostgreSQL dump)
   - And max file size: 500MB
   - And sau khi upload:
     - Save to /backups directory
     - Create record in backups table
     - Show success message

4. **AC4: Restore Confirmation**
   - Given User chọn backup và click "Restore"
   - When Confirm modal opens
   - Then UI hiển thị warning:
     - "⚠️ Restore sẽ overwrite current database"
     - "All unsaved changes will be lost"
     - Require type "RESTORE" to confirm
     - Show estimated downtime (~30s-5min)

5. **AC5: Restore Execution**
   - Given User confirms restore
   - When Restore process starts
   - Then system:
     - Set maintenance_mode = true (block non-admin requests)
     - Log restore_start trong audit_events
     - Execute restore command (pg_restore or psql)
     - Return job_id để track progress
     - Send notification khi complete

6. **AC6: Restore Progress Tracking**
   - Given Restore job running
   - When User view progress
   - Then UI hiển thị:
     - Progress bar (estimated %)
     - Current step (dumping, restoring, verifying)
     - Log output (live streaming)
     - "Cancel" button (if not too late)

7. **AC7: Restore Completion**
   - Given Restore job completes
   - When finish
   - Then:
     - Set maintenance_mode = false
     - Log restore_complete trong audit_events
     - Send success notification cho ADMIN
     - Redirect to dashboard with success message

8. **AC8: Restore Error Handling**
   - Given Restore fails mid-process
   - When Error occurs
   - Then:
     - Log error details trong audit_events
     - Send alert notification cho ADMIN
     - Keep database trong current state (no partial restore)
     - Show error message with diagnostics

9. **AC9: State Integrity Verification**
   - Given Database restored or User click "Verify"
   - When Verify State Integrity runs
   - Then system:
     - Traverse tất cả workflow_logs per proposal
     - Compute expected state từ log sequence
     - Compare với proposals.state trong database
     - Generate verification report

10. **AC10: Verification Report**
    - Given Verification report generated
    - When Report displayed
    - Then UI shows:
      - Total proposals checked
      - Proposals MATCH: N
      - Proposals MISMATCH: M
      - Table of mismatches (proposal_id, current_state, computed_state, last_log)

11. **AC11: Auto-Correct States**
    - Given Mismatches detected
    - When Admin click "Auto-correct States"
    - Then system:
      - Update proposals.state = computed_state cho mismatched proposals
      - Log correction trong audit_events (action: STATE_CORRECTED)
      - Return summary của corrections applied

12. **AC12: Maintenance Mode**
    - Given maintenance_mode = true
    - When non-ADMIN user try access
    - Then show "System under maintenance" page
    - And ADMIN can still access /admin/* pages

## Tasks / Subtasks

- [ ] Task 1: Backend - Backup Module Setup (AC: #1)
  - [ ] Create BackupModule in qlnckh/apps/src/modules/backup/
  - [ ] Create BackupController with /admin/database endpoints
  - [ ] RBAC: @RequireRoles(UserRole.ADMIN)

- [ ] Task 2: Backend - Backup Model (AC: #2, #3)
  - [ ] Add Backup model to schema.prisma
  - [ ] Fields: id, filename, filePath, size, uploadedBy, uploadedAt
  - [ ] Add index on uploadedAt
  - [ ] Run prisma migrate

- [ ] Task 3: Backend - Backup File Storage (AC: #3)
  - [ ] Create /backups directory with proper permissions
  - [ ] Implement file upload handler (.sql files, max 500MB)
  - [ ] Store file metadata in database
  - [ ] Validate file format

- [ ] Task 4: Backend - Restore Execution Service (AC: #5, #6, #7)
  - [ ] Create restoreDatabase() method
  - [ ] Set maintenance mode
  - [ ] Execute pg_restore or psql command
  - [ ] Track progress with job queue
  - [ ] Handle completion/error

- [ ] Task 5: Backend - Maintenance Mode (AC: #12)
  - [ ] Add maintenance_mode flag to settings or database
  - [ ] Create MaintenanceGuard
  - [ ] Block non-admin requests when active
  - [ ] Show maintenance page

- [ ] Task 6: Backend - State Verification Service (AC: #9, #10)
  - [ ] Create verifyStateIntegrity() method
  - [ ] Traverse workflow_logs for each proposal
  - [ ] Compute expected state from log sequence
  - [ ] Compare with current state
  - [ ] Generate VerificationReport interface

- [ ] Task 7: Backend - State Correction Service (AC: #11)
  - [ ] Create autoCorrectStates() method
  - [ ] Update mismatched proposals
  - [ ] Log corrections in audit_events
  - [ ] Return correction summary

- [ ] Task 8: Backend - DTOs and Interfaces (All ACs)
  - [ ] Create UploadBackupDto
  - [ ] Create RestoreJobDto
  - [ ] Create VerificationReportDto
  - [ ] Create StateMismatchDto
  - [ ] NO as unknown/as any casts (Epic 9 retro pattern)

- [ ] Task 9: Frontend - Database Management Page (AC: #1)
  - [ ] Create /admin/database/page.tsx
  - [ ] Warning banner
  - [ ] Backup list table
  - [ ] Upload button
  - [ ] Verify button

- [ ] Task 10: Frontend - Restore Confirmation Modal (AC: #4)
  - [ ] RestoreConfirmDialog component
  - [ ] Warning messages
  - [ ] Type "RESTORE" confirmation
  - [ ] Estimated downtime display

- [ ] Task 11: Frontend - Restore Progress (AC: #6)
  - [ ] RestoreProgress component
  - [ ] Progress bar
  - [ ] Current step display
  - [ ] Live log streaming

- [ ] Task 12: Frontend - Verification Report (AC: #10)
  - [ ] VerificationReport component
  - [ ] Summary stats
  - [ ] Mismatch table
  - [ ] Auto-correct button

- [ ] Task 13: Unit Tests (All ACs)
  - [ ] Test backup file upload
  - [ ] Test restore execution (mocked)
  - [ ] Test maintenance mode blocking
  - [ ] Test state verification logic
  - [ ] Test state correction
  - [ ] Test error handling

## Dev Notes

### Epic 10 Context

**Epic 10: Admin & System Configuration**
- FRs covered: FR46 (Import/Export), FR47 (Holiday Mgmt), FR48 (Audit Logs), FR65, FR66 (DB Recovery)
- Story 10.1: Import Excel (Users, Proposals)
- Story 10.2: Export Excel (Full Dump)
- Story 10.3: System Health Dashboard
- Story 10.4: Full Audit Log Viewer
- Story 10.5: Holiday Management (Full CRUD)
- Story 10.6: DB Restore + State Recompute (THIS STORY)

**Epic Objective:**
Enable full system administration with import/export, health monitoring, audit logs, and backup/restore.

### Dependencies

**Depends on:**
- Story 1.2 (RBAC) - For ADMIN role
- Story 3.1 (16 canonical states) - For state machine understanding
- Story 3.4 (Workflow Logs) - For state recompute logic
- Story 9.1, 9.2, 9.3 (Exception Actions) - For exception state handling

**No Dependencies On:**
- This is the final story in Epic 10

### Epic 9 Retro Learnings to Apply (CRITICAL)

From `epic-9-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const log = data as unknown as WorkflowLog;

// ✅ CORRECT - Epic 9 retro pattern:
interface WorkflowLogWithState {
  id: string;
  proposalId: string;
  action: WorkflowAction;
  fromState: ProjectState | null;
  toState: ProjectState;
  timestamp: Date;
}
const log: WorkflowLogWithState = {
  id: row.id,
  proposalId: row.proposalId,
  action: row.action as WorkflowAction,
  fromState: row.fromState as ProjectState,
  toState: row.toState as ProjectState,
  timestamp: new Date(row.timestamp),
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG:
const mismatch = (result as any).mismatch;

// ✅ CORRECT - Define proper interface:
interface StateMismatch {
  proposalId: string;
  proposalCode: string;
  currentState: ProjectState;
  computedState: ProjectState;
  lastLog: WorkflowLog;
}
const mismatch: StateMismatch = {
  proposalId: proposal.id,
  proposalCode: proposal.code,
  currentState: proposal.state,
  computedState,
  lastLog,
};
```

**3. Use ProjectState Enum Directly** ⚠️ MANDATORY
```typescript
// ✅ CORRECT - Direct enum usage for state comparison:
if (proposal.state !== computedState) {
  mismatches.push({
    proposalId: proposal.id,
    currentState: proposal.state,  // ProjectState enum
    computedState,                 // ProjectState enum
  });
}
```

**4. Tests MUST Be Written**
```typescript
// Epic 9 achievement: 130 tests passing with 0 type violations
// Epic 10 REQUIREMENT: Write tests for restore and verification scenarios
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  backup/
    backup.module.ts              # New: Module definition
    backup.controller.ts          # New: Backup endpoints
    backup.service.ts             # New: Restore and verification logic
    dto/
      upload-backup.dto.ts        # New: Upload DTO
      restore-job.dto.ts          # New: Restore job DTO
      verification-report.dto.ts  # New: Report DTO
    interfaces/
      state-mismatch.interface.ts # New: Mismatch interface
      restore-job.interface.ts    # New: Job tracking interface
    guards/
      maintenance.guard.ts        # New: Maintenance mode guard
```

**File System:**
```
/backups/                         # Backup storage directory
  uploads/                        # User-uploaded backups
  automated/                      # Automated backups (future)
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    admin/
      database/
        page.tsx                  # New: Database management page
        components/
          BackupList.tsx          # New: Backup list table
          UploadBackup.tsx        # New: Upload component
          RestoreConfirmDialog.tsx # New: Restore confirmation
          RestoreProgress.tsx     # New: Restore progress
          VerificationReport.tsx  # New: Verification report
  lib/
    api/
      backup.ts                   # New: Backup API client
    hooks/
      useRestoreJob.ts            # New: Restore job tracking hook
```

### Architecture Compliance

**Database Schema:**
```prisma
model Backup {
  id          String   @id @default(uuid())
  filename    String
  filePath    String
  size        BigInt   @db.BigInt
  uploadedBy  String
  uploadedAt  DateTime @default(now())

  uploadedByUser User?   @relation("UploadedBy", fields: [uploadedBy], references: [id])

  @@index([uploadedAt])
}

model SystemSetting {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String   @db.Text
  updatedAt   DateTime @updatedAt

  @@index([key])
}

// Initialize with maintenance_mode setting
// key: "maintenance_mode", value: "false"
```

**State Verification Logic:**
```typescript
interface VerificationReport {
  totalProposals: number;
  matchedCount: number;
  mismatchedCount: number;
  mismatches: StateMismatch[];
  verifiedAt: Date;
}

interface StateMismatch {
  proposalId: string;
  proposalCode: string;
  currentState: ProjectState;
  computedState: ProjectState;
  lastLog: {
    action: WorkflowAction;
    toState: ProjectState;
    timestamp: Date;
  };
}

// State computation from workflow logs
async computeExpectedState(proposalId: string): Promise<ProjectState> {
  // Get all workflow logs for this proposal, ordered by timestamp
  const logs = await this.prisma.workflowLog.findMany({
    where: { proposalId },
    orderBy: { timestamp: 'asc' },
  });

  // Start with DRAFT as initial state
  let currentState = ProjectState.DRAFT;

  // Apply each transition in sequence
  for (const log of logs) {
    // Validate transition is valid
    if (log.toState && log.toState !== currentState) {
      currentState = log.toState;
    }
  }

  return currentState;
}
```

**Restore Job Tracking:**
```typescript
interface RestoreJob {
  id: string;
  backupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: string;
  progress: number;  // 0-100
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  logs: string[];
}

// Job queue (in-memory or Redis based)
class RestoreJobQueue {
  private jobs: Map<string, RestoreJob> = new Map();

  async create(backupId: string): Promise<string> {
    const jobId = uuid();
    const job: RestoreJob = {
      id: jobId,
      backupId,
      status: 'pending',
      currentStep: 'queued',
      progress: 0,
      startedAt: new Date(),
      logs: [],
    };
    this.jobs.set(jobId, job);
    return jobId;
  }

  async update(jobId: string, updates: Partial<RestoreJob>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
    }
  }

  async get(jobId: string): Promise<RestoreJob | undefined> {
    return this.jobs.get(jobId);
  }
}
```

### Vietnamese Localization

All UI text in Vietnamese:

**UI Text:**
- "Quản lý cơ sở dữ liệu" (Database Management)
- "⚠️ NGUY HIỂM - Vùng thao tác quan trọng" (DANGER ZONE - Critical operations)
- "Sao lưu" (Backups)
- "Tải lên bản sao lưu" (Upload Backup)
- "Khôi phục" (Restore)
- "Xác minh tính toàn vẹn" (Verify Integrity)
- "Bảo trì" (Maintenance)

**Warning Messages:**
- "⚠️ Khôi phục sẽ ghi đè cơ sở dữ liệu hiện tại" (Restore will overwrite current database)
- "Tất cả thay đổi chưa lưu sẽ bị mất" (All unsaved changes will be lost)
- "Hệ thống sẽ ngừng hoạt động trong 30 giây - 5 phút" (System will be down for 30s-5min)

**Confirmation:**
- "Nhập 'RESTORE' để xác nhận" (Type 'RESTORE' to confirm)
- "Bạn có chắc chắn?" (Are you sure?)

**Status Messages:**
- "Đang khôi phục..." (Restoring...)
- "Hoàn tất" (Complete)
- "Thất bại" (Failed)
- "Hệ thống đang bảo trì" (System under maintenance)

**Verification Report:**
- "Báo cáo xác minh" (Verification Report)
- "Tổng số đề tài kiểm tra" (Total proposals checked)
- "Khớp" (Match)
- "Không khớp" (Mismatch)
- "Tự động sửa" (Auto-correct)

### Code Patterns to Follow

**Proper Backup Service (Epic 9 Retro Pattern):**
```typescript
// BackupService.verifyStateIntegrity()
async verifyStateIntegrity(): Promise<VerificationReport> {
  // Get all proposals
  const proposals = await this.prisma.proposal.findMany({
    select: {
      id: true,
      code: true,
      state: true,
    },
  });

  const mismatches: StateMismatch[] = [];
  let matchedCount = 0;

  // Check each proposal
  for (const proposal of proposals) {
    const computedState = await this.computeExpectedState(proposal.id);

    if (computedState !== proposal.state) {
      // Get last workflow log for context
      const lastLog = await this.prisma.workflowLog.findFirst({
        where: { proposalId: proposal.id },
        orderBy: { timestamp: 'desc' },
      });

      mismatches.push({
        proposalId: proposal.id,
        proposalCode: proposal.code,
        currentState: proposal.state,
        computedState,
        lastLog: {
          action: lastLog?.action as WorkflowAction,
          toState: lastLog?.toState as ProjectState,
          timestamp: lastLog?.timestamp || new Date(),
        },
      });
    } else {
      matchedCount++;
    }
  }

  return {
    totalProposals: proposals.length,
    matchedCount,
    mismatchedCount: mismatches.length,
    mismatches,
    verifiedAt: new Date(),
  };
}

// Auto-correct states
async autoCorrectStates(mismatches: StateMismatch[]): Promise<CorrectionSummary> {
  let correctedCount = 0;
  const errors: string[] = [];

  for (const mismatch of mismatches) {
    try {
      await this.prisma.proposal.update({
        where: { id: mismatch.proposalId },
        data: { state: mismatch.computedState },
      });

      // Log correction
      await this.auditService.log({
        action: 'STATE_CORRECTED',
        entityType: 'Proposal',
        entityId: mismatch.proposalId,
        message: `Auto-corrected state from ${mismatch.currentState} to ${mismatch.computedState}`,
        metadata: {
          fromState: mismatch.currentState,
          toState: mismatch.computedState,
        },
      });

      correctedCount++;
    } catch (error) {
      errors.push(`Failed to correct ${mismatch.proposalCode}: ${error}`);
    }
  }

  return {
    total: mismatches.length,
    corrected: correctedCount,
    failed: errors.length,
    errors,
  };
}

// Restore execution
async restoreDatabase(
  backupId: string,
  confirmedBy: string,
): Promise<string> {
  const backup = await this.prisma.backup.findUnique({
    where: { id: backupId },
  });

  if (!backup) {
    throw new NotFoundException('Bản sao lưu không tồn tại');
  }

  // Create job
  const jobId = await this.jobQueue.create(backupId);

  // Execute restore in background
  this.executeRestore(jobId, backup.filePath, confirmedBy);

  return jobId;
}

private async executeRestore(
  jobId: string,
  filePath: string,
  userId: string,
): Promise<void> {
  try {
    // Update job status
    await this.jobQueue.update(jobId, {
      status: 'running',
      currentStep: 'starting',
      progress: 0,
    });

    // Set maintenance mode
    await this.setMaintenanceMode(true);

    // Log start
    await this.auditService.log({
      action: 'RESTORE_STARTED',
      entityType: 'Database',
      entityId: jobId,
      actorId: userId,
      message: `Database restore started from ${filePath}`,
    });

    // Drop and recreate database
    await this.jobQueue.update(jobId, {
      currentStep: 'dropping_database',
      progress: 10,
    });

    // Execute psql command
    await this.executeShellCommand(
      `psql -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`
    );

    // Restore from backup
    await this.jobQueue.update(jobId, {
      currentStep: 'restoring',
      progress: 30,
    });

    await this.executeShellCommand(
      `psql -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${filePath}`
    );

    // Verify restore
    await this.jobQueue.update(jobId, {
      currentStep: 'verifying',
      progress: 90,
    });

    // Check proposal count
    const proposalCount = await this.prisma.proposal.count();
    if (proposalCount === 0) {
      throw new Error('Restore verification failed: no proposals found');
    }

    // Complete
    await this.jobQueue.update(jobId, {
      status: 'completed',
      currentStep: 'completed',
      progress: 100,
      completedAt: new Date(),
    });

    // Clear maintenance mode
    await this.setMaintenanceMode(false);

    // Log completion
    await this.auditService.log({
      action: 'RESTORE_COMPLETED',
      entityType: 'Database',
      entityId: jobId,
      actorId: userId,
      message: `Database restore completed successfully`,
    });

    // Send notification
    await this.notificationService.send({
      recipientId: userId,
      type: 'RESTORE_COMPLETED',
      message: 'Khôi phục cơ sở dữ liệu thành công',
    });

  } catch (error) {
    // Handle error
    await this.jobQueue.update(jobId, {
      status: 'failed',
      error: error.message,
    });

    // Clear maintenance mode even on error
    await this.setMaintenanceMode(false);

    // Log error
    await this.auditService.log({
      action: 'RESTORE_FAILED',
      entityType: 'Database',
      entityId: jobId,
      actorId: userId,
      message: `Database restore failed: ${error.message}`,
    });

    // Send alert
    await this.notificationService.send({
      recipientId: userId,
      type: 'RESTORE_FAILED',
      message: `Khôi phục cơ sở dữ liệu thất bại: ${error.message}`,
    });
  }
}

private async setMaintenanceMode(enabled: boolean): Promise<void> {
  await this.prisma.systemSetting.upsert({
    where: { key: 'maintenance_mode' },
    update: { value: enabled.toString() },
    create: { key: 'maintenance_mode', value: enabled.toString() },
  });
}
```

**Maintenance Guard:**
```typescript
@Injectable()
export class MaintenanceGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Always allow ADMIN access
    if (user?.role === UserRole.ADMIN) {
      return true;
    }

    // Check maintenance mode
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'maintenance_mode' },
    });

    const isMaintenance = setting?.value === 'true';

    if (isMaintenance) {
      throw new ServiceUnavailableException('Hệ thống đang bảo trì');
    }

    return true;
  }
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 9 Retro):**
```typescript
describe('BackupService', () => {
  describe('verifyStateIntegrity', () => {
    it('should detect mismatched states', async () => {
      const proposal = await createTestProposal({
        state: ProjectState.DRAFT,
      });

      // Add workflow log that should move state to FACULTY_REVIEW
      await createWorkflowLog({
        proposalId: proposal.id,
        toState: ProjectState.FACULTY_REVIEW,
      });

      const report = await service.verifyStateIntegrity();

      expect(report.mismatchedCount).toBe(1);
      expect(report.mismatches[0].currentState).toBe(ProjectState.DRAFT);
      expect(report.mismatches[0].computedState).toBe(ProjectState.FACULTY_REVIEW);
    });

    it('should compute correct state from logs', async () => {
      const proposal = await createTestProposal();

      // Simulate state transitions
      await createWorkflowLog({
        proposalId: proposal.id,
        toState: ProjectState.FACULTY_REVIEW,
      });
      await createWorkflowLog({
        proposalId: proposal.id,
        toState: ProjectState.APPROVED,
      });

      const computed = await service.computeExpectedState(proposal.id);

      expect(computed).toBe(ProjectState.APPROVED);
    });
  });

  describe('autoCorrectStates', () => {
    it('should correct mismatched proposals', async () => {
      const proposal = await createTestProposal({
        state: ProjectState.DRAFT,
      });
      await createWorkflowLog({
        proposalId: proposal.id,
        toState: ProjectState.APPROVED,
      });

      const mismatches: StateMismatch[] = [{
        proposalId: proposal.id,
        proposalCode: proposal.code,
        currentState: ProjectState.DRAFT,
        computedState: ProjectState.APPROVED,
        lastLog: null,
      }];

      const result = await service.autoCorrectStates(mismatches);

      expect(result.corrected).toBe(1);

      const updated = await prisma.proposal.findUnique({
        where: { id: proposal.id },
      });
      expect(updated?.state).toBe(ProjectState.APPROVED);
    });
  });
});

describe('MaintenanceGuard', () => {
  it('should block non-admin during maintenance', async () => {
    await enableMaintenanceMode();

    const nonAdmin = await createTestUser({ role: UserRole.GIANG_VIEN });

    await request(app.get('/api/proposals'))
      .set('Authorization', `Bearer ${getToken(nonAdmin)}`)
      .expect(503);
  });

  it('should allow admin during maintenance', async () => {
    await enableMaintenanceMode();

    const admin = await createTestUser({ role: UserRole.ADMIN });

    await request(app.get('/admin/database'))
      .set('Authorization', `Bearer ${getToken(admin)}`)
      .expect(200);
  });
});
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-202201101

### Completion Notes List

Story 10-6 created via create-story workflow. Status: ready-for-dev
- Epic 9 retrospective learnings applied (type safety, no as unknown/as any)
- Disaster recovery capability defined
- State integrity verification logic
- Auto-correct functionality
- Maintenance mode implementation
- Proper interfaces for all types
- Vietnamese localization for all messages
- Tests mandated per Epic 9 retro lessons
- Final story of Epic 10

### File List

**To Create:**
- `qlnckh/apps/src/modules/backup/backup.module.ts` - Backup module
- `qlnckh/apps/src/modules/backup/backup.controller.ts` - Backup endpoints
- `qlnckh/apps/src/modules/backup/backup.service.ts` - Restore and verification logic
- `qlnckh/apps/src/modules/backup/dto/upload-backup.dto.ts` - Upload DTO
- `qlnckh/apps/src/modules/backup/dto/restore-job.dto.ts` - Restore job DTO
- `qlnckh/apps/src/modules/backup/dto/verification-report.dto.ts` - Report DTO
- `qlnckh/apps/src/modules/backup/interfaces/state-mismatch.interface.ts` - Mismatch interface
- `qlnckh/apps/src/modules/backup/interfaces/restore-job.interface.ts` - Job tracking interface
- `qlnckh/apps/src/modules/backup/guards/maintenance.guard.ts` - Maintenance mode guard
- `qlnckh/backups/uploads/` - Backup storage directory
- `qlnckh/web-apps/src/app/admin/database/page.tsx` - Database management page
- `qlnckh/web-apps/src/app/admin/database/components/BackupList.tsx` - Backup list table
- `qlnckh/web-apps/src/app/admin/database/components/UploadBackup.tsx` - Upload component
- `qlnckh/web-apps/src/app/admin/database/components/RestoreConfirmDialog.tsx` - Restore confirmation
- `qlnckh/web-apps/src/app/admin/database/components/RestoreProgress.tsx` - Restore progress
- `qlnckh/web-apps/src/app/admin/database/components/VerificationReport.tsx` - Verification report
- `qlnckh/web-apps/src/lib/api/backup.ts` - Backup API client
- `qlnckh/web-apps/src/lib/hooks/useRestoreJob.ts` - Restore job tracking hook

**To Modify:**
- `qlnckh/apps/src/app.module.ts` - Register BackupModule and MaintenanceGuard
- `qlnckh/prisma/schema.prisma` - Add Backup, SystemSetting models
- `qlnckh/apps/src/main.ts` - Apply MaintenanceGuard globally
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 9 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Disaster recovery capability defined
  - State integrity verification logic
  - Auto-correct functionality
  - Maintenance mode implementation
  - Proper interfaces for all types
  - Vietnamese localization for all messages
  - Tests mandated per Epic 9 retro lessons
  - Final story of Epic 10
  - Ready for dev-story workflow execution

## References

- [epics.md Story 10.6](../../planning-artifacts/epics.md#L2414-L2500) - Full requirements
- [epic-9-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-9-retro-2026-01-07.md) - Lessons learned
- [Story 3.1](./3-1-16-canonical-states-plus-transitions.md) - State machine reference
- [Story 3.4](./3-4-workflow-logs-timeline-thread-view.md) - Workflow log patterns
- [Story 9.1](./9-1-cancel-withdraw-actions.md) - Exception states
- [Story 9.2](./9-2-reject-action.md) - Exception states
- [Story 9.3](./9-3-pause-resume-pkhcn-only.md) - Exception states
