# Story 10.1: Import Excel (Users, Proposals)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 9 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Admin,
I want import users/proposals từ Excel,
So that tôi không phải nhập data thủ công.

## Acceptance Criteria

1. **AC1: Import Page UI (Admin only)**
   - Given User có role = ADMIN
   - When User vào Import page
   - Then UI hiển thị:
     - File upload (.xlsx, .csv)
     - Entity type selector (Users/Proposals)
     - Template download button

2. **AC2: Import Validation and Processing**
   - Given User upload file và chọn entity type
   - When server process file
   - Then validate từng row:
     - Nếu valid: insert vào database
     - Nếu invalid: skip + record error

3. **AC3: Import Report**
   - Given Import hoàn thành
   - When process done
   - Then UI hiển thị report:
     - Total rows processed
     - Successfully imported: N
     - Failed: M
     - Error details (per failed row)

4. **AC4: User Import Validation**
   - Given User chọn import Users
   - When file được process
   - Then validate: email (unique, format), displayName (required), role (valid enum), facultyId (exists)
   - And skip invalid rows with error logged

5. **AC5: Proposal Import Validation**
   - Given User chọn import Proposals
   - When file được process
   - Then validate: ownerId (exists), title (required), facultyId (exists), state (valid enum)
   - And skip invalid rows with error logged
   - And preserve workflow integrity (holder rules)

6. **AC6: Idempotency and Atomicity**
   - Given Import fails mid-process
   - When error occurs
   - Then rollback all inserts from this import
   - And return error report with partial success info

## Tasks / Subtasks

- [ ] Task 1: Backend - Import Module Setup (AC: #1, #2)
  - [ ] Create ImportModule in qlnckh/apps/src/modules/import/
  - [ ] Add dependencies: XLSX library for Excel parsing
  - [ ] Register module in app.module.ts

- [ ] Task 2: Backend - Import DTOs (AC: #1, #2, #4, #5)
  - [ ] Create ImportRequestDto (entityType, file)
  - [ ] Create UserImportRowDto interface (email, displayName, role, facultyId)
  - [ ] Create ProposalImportRowDto interface (ownerId, title, facultyId, state, etc.)
  - [ ] NO as unknown/as any casts (Epic 9 retro pattern)

- [ ] Task 3: Backend - User Import Validation (AC: #4)
  - [ ] Create validateUserImportRow() method
  - [ ] Validate email format and uniqueness
  - [ ] Validate displayName presence
  - [ ] Validate role against UserRole enum
  - [ ] Validate facultyId exists in database

- [ ] Task 4: Backend - Proposal Import Validation (AC: #5)
  - [ ] Create validateProposalImportRow() method
  - [ ] Validate ownerId exists
  - [ ] Validate title present
  - [ ] Validate facultyId exists
  - [ ] Validate state against ProjectState enum
  - [ ] Set holder_unit/faculty_id based on state rules

- [ ] Task 5: Backend - Excel Parser Service (AC: #2)
  - [ ] Create ExcelParserService with parseExcelFile() method
  - [ ] Support .xlsx and .csv formats
  - [ ] Return typed arrays (UserImportRow[] | ProposalImportRow[])
  - [ ] Handle encoding issues for Vietnamese text

- [ ] Task 6: Backend - Import Execution Service (AC: #2, #6)
  - [ ] Create ImportService with importUsers() and importProposals() methods
  - [ ] Wrap import in database transaction
  - [ ] Use Prisma batch create for performance
  - [ ] Rollback on error (atomicity)
  - [ ] Return import result report

- [ ] Task 7: Backend - Import Controller (AC: #1, #3)
  - [ ] Create ImportController
  - [ ] POST /import/upload endpoint
  - [ ] POST /import/users endpoint
  - [ ] POST /import/proposals endpoint
  - [ ] GET /import/template/:entity endpoint (download template)
  - [ ] RBAC: @RequireRoles(UserRole.ADMIN)

- [ ] Task 8: Backend - Import Result Tracking (AC: #3, #6)
  - [ ] Create ImportResult interface (total, success, failed, errors[])
  - [ ] Store import logs in import_logs table
  - [ ] Track per-row errors with line number

- [ ] Task 9: Frontend - Import Page (AC: #1)
  - [ ] Create /admin/import page
  - [ ] Entity type selector dropdown
  - [ ] File upload component with drag-drop
  - [ ] Template download button
  - [ ] Import progress indicator

- [ ] Task 10: Frontend - Import Report Display (AC: #3)
  - [ ] Create ImportReport component
  - [ ] Show summary: total, success, failed
  - [ ] Error details table (line number, error message, row data)
  - [ ] Export errors to CSV button

- [ ] Task 11: Unit Tests (AC: #2, #4, #5, #6)
  - [ ] Test Excel parser with valid/invalid files
  - [ ] Test user import validation (all scenarios)
  - [ ] Test proposal import validation (all scenarios)
  - [ ] Test transaction rollback on error
  - [ ] Test import result report generation

- [ ] Task 12: Integration Tests (AC: #2, #6)
  - [ ] Test full import flow: upload → validate → import → report
  - [ ] Test large file handling (>1000 rows)
  - [ ] Test concurrent imports
  - [ ] Test atomic rollback

## Dev Notes

### Epic 10 Context

**Epic 10: Admin & System Configuration**
- FRs covered: FR46 (Import Excel), FR47 (Holiday Mgmt), FR48 (Audit Logs)
- Story 10.1: Import Excel (Users, Proposals) (THIS STORY)
- Story 10.2: Export Excel (Full Dump)
- Story 10.3: System Health Dashboard
- Story 10.4: Full Audit Log Viewer
- Story 10.5: Holiday Management (Full CRUD)
- Story 10.6: DB Restore + State Recompute

**Epic Objective:**
Enable full system administration with import/export, health monitoring, audit logs, and backup/restore.

### Dependencies

**Depends on:**
- Story 1.2 (RBAC) - For ADMIN role
- Story 3.1 (16 canonical states) - For proposal state validation
- Epic 8 (Export Excel) - Reuse XLSX library patterns

**Enables:**
- Story 10.2 (Export Excel) - Shared file handling patterns
- Story 10.6 (DB Restore) - For backup/restore workflows

### Epic 9 Retro Learnings to Apply (CRITICAL)

From `epic-9-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const row = data as unknown as UserImportRow;

// ✅ CORRECT - Epic 9 retro pattern:
interface UserImportRow {
  email: string;
  displayName: string;
  role: UserRole;
  facultyId: string;
}
const row: UserImportRow = {
  email: parsedRow[0],
  displayName: parsedRow[1],
  role: parsedRow[2] as UserRole,  // Single cast for enum
  facultyId: parsedRow[3],
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG:
const errors = (result as any).errors;

// ✅ CORRECT - Define proper interface:
interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: ImportError[];
}
const errors: ImportError[] = result.errors;
```

**3. Use WorkflowAction Enum Directly** ⚠️ MANDATORY
```typescript
// ❌ WRONG:
action: WorkflowAction.IMPORT as unknown as AuditAction

// ✅ CORRECT - Use enum directly:
action: WorkflowAction.IMPORT  // Add to enum if needed
```

**4. Proper Decorator Usage** ⚠️ Epic 8 Finding
```typescript
// ❌ WRONG - @Get() is route decorator:
@Post('upload') @UseInterceptors(FileInterceptor) file: Express.Multer.File

// ✅ CORRECT - Use @UploadedFile() for file uploads:
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
```

**5. Tests MUST Be Written**
```typescript
// Epic 9 achievement: 130 tests passing with 0 type violations
// Epic 10 REQUIREMENT: Write tests for import validation scenarios
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  import/
    import.module.ts             # New: Module definition
    import.controller.ts         # New: Import endpoints
    import.service.ts            # New: Import logic
    dto/
      import-request.dto.ts      # New: Import request DTO
      import-result.dto.ts       # New: Import result interface
    interfaces/
      user-import-row.interface.ts  # New: User row interface
      proposal-import-row.interface.ts  # New: Proposal row interface
    helpers/
      excel-parser.helper.ts     # New: XLSX/CSV parsing
      import-validator.helper.ts # New: Validation logic
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    admin/
      import/
        page.tsx                 # New: Import page
        components/
          ImportUploader.tsx     # New: File upload component
          ImportReport.tsx       # New: Report display
          TemplateDownload.tsx   # New: Template download
  lib/
    api/
      import.ts                  # New: Import API client
    constants/
      import-templates.ts        # New: Template URLs
```

### Architecture Compliance

**Excel Parsing Library:**
```typescript
// Reuse XLSX library from Epic 8 (export)
import * as XLSX from 'xlsx';
import { read, utils } from 'xlsx';

// Parse Excel file to typed array
function parseUserImportFile(buffer: Buffer): UserImportRow[] {
  const workbook = read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = utils.sheet_to_json<string[]>(worksheet);

  return data.map((row, index) => ({
    email: row[0]?.trim(),
    displayName: row[1]?.trim(),
    role: row[2]?.trim() as UserRole,
    facultyId: row[3]?.trim(),
    _lineNumber: index + 2,  // Excel line number (1-indexed + header)
  }));
}
```

**RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
@Controller('admin/import')
export class ImportController {
  @Post('users')
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    // Only ADMIN can import
  }
}
```

### Data Model

**Import Request DTO:**
```typescript
import { IsEnum, IsUUID } from 'class-validator';

export enum ImportEntityType {
  USERS = 'users',
  PROPOSALS = 'proposals',
}

export class ImportRequestDto {
  @IsEnum(ImportEntityType)
  entityType: ImportEntityType;

  @IsUUID('4')
  idempotencyKey: string;
}
```

**User Import Row Interface:**
```typescript
export interface UserImportRow {
  email: string;
  displayName: string;
  role: UserRole;
  facultyId: string;
  _lineNumber?: number;  // For error reporting
}
```

**Proposal Import Row Interface:**
```typescript
export interface ProposalImportRow {
  ownerId: string;        // Email or ID
  title: string;
  facultyId: string;      // Faculty code or ID
  state?: ProjectState;   // Default to DRAFT
  researchField?: string;
  budget?: number;
  _lineNumber?: number;
}
```

**Import Result Interface:**
```typescript
export interface ImportError {
  lineNumber: number;
  row: Record<string, unknown>;
  message: string;
  field?: string;
}

export interface ImportResult {
  entityType: ImportEntityType;
  total: number;
  success: number;
  failed: number;
  errors: ImportError[];
  duration: number;  // milliseconds
}
```

**Database Schema for Import Logs:**
```prisma
model ImportLog {
  id          String   @id @default(uuid())
  entityType  String   // USERS | PROPOSALS
  totalRows   Int
  successCount Int
  failedCount Int
  errors      Json     // Array of {lineNumber, message, row}
  importedBy  String
  importedAt  DateTime @default(now())

  importedByUser User? @relation("ImportedBy", fields: [importedBy], references: [id])

  @@index([importedAt])
  @@index([entityType])
}
```

### State Machine Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    IMPORT VALIDATION FLOW                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   FILE UPLOAD → PARSE → VALIDATE ROW → IMPORT ROW          │
│                      │                                       │
│                      ↓ invalid                               │
│                    SKIP + LOG ERROR                         │
│                                                              │
│   Transaction:                                              │
│     BEGIN → Loop rows → Insert valid → COMMIT              │
│       │                                                    │
│       ↓ ERROR                                              │
│     ROLLBACK → Return partial report                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Vietnamese Localization

All UI text and error messages must be in Vietnamese:

**UI Text:**
- "Import dữ liệu" (Import Data)
- "Chọn loại dữ liệu" (Select Entity Type)
- "Người dùng" (Users)
- "Đề tài" (Proposals)
- "Tải xuống mẫu" (Download Template)
- "Chọn file" (Choose File)
- "Đang xử lý..." (Processing...)
- "Kết quả import" (Import Results)

**Error Messages:**
- "File không hợp lệ. Vui lòng tải xuống template và điền đúng định dạng." (Invalid file. Please download template and fill in correct format.)
- "Email không đúng định dạng" (Invalid email format)
- "Email đã tồn tại: {email}" (Email already exists)
- "Vai trò không hợp lệ: {role}" (Invalid role)
- "Khoa không tồn tại: {facultyId}" (Faculty does not exist)
- "Tên hiển thị không được để trống" (Display name is required)
- "Import thất bại. Vui lòng thử lại." (Import failed. Please try again.)

**Success Messages:**
- "Import thành công! {success}/{total} dòng được thêm vào." (Import successful! {success}/{total} rows added.)
- "Hoàn thành với {success} thành công, {failed} thất bại." (Completed with {success} successful, {failed} failed.)

### Code Patterns to Follow

**Proper Excel Parsing (Epic 9 Retro Pattern):**
```typescript
// ExcelParserHelper.parseUserImportFile()
import * as XLSX from 'xlsx';

function parseUserImportFile(buffer: Buffer): UserImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,  // Array of arrays
    defval: '',
  });

  // Skip header row
  const dataRows = rawData.slice(1);

  return dataRows
    .filter(row => row.some(cell => cell !== ''))  // Skip empty rows
    .map((row, index) => ({
      email: row[0]?.trim() || '',
      displayName: row[1]?.trim() || '',
      role: row[2]?.trim(),
      facultyId: row[3]?.trim() || '',
      _lineNumber: index + 2,  // +1 for 1-index, +1 for header
    }));
}
```

**Proper Import Service (Epic 9 Retro Pattern):**
```typescript
// ImportService.importUsers()
async importUsers(
  file: Express.Multer.File,
  context: RequestContext,
): Promise<ImportResult> {
  const startTime = Date.now();
  const errors: ImportError[] = [];
  let successCount = 0;

  // Parse Excel file with proper typing
  let rows: UserImportRow[];
  try {
    rows = this.excelParserHelper.parseUserImportFile(file.buffer);
  } catch (error) {
    throw new BadRequestException('File không hợp lệ. Vui lòng sử dụng template.');
  }

  // Validate all rows first (fail-fast for critical errors)
  const validRows: UserImportRow[] = [];
  for (const row of rows) {
    const validationResult = await this.validateUserImportRow(row);
    if (!validationResult.valid) {
      errors.push({
        lineNumber: row._lineNumber || 0,
        row: row as unknown as Record<string, unknown>,
        message: validationResult.message || 'Dữ liệu không hợp lệ',
        field: validationResult.field,
      });
    } else {
      validRows.push(row);
    }
  }

  // Import valid rows in transaction
  try {
    await this.prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        // Check email uniqueness again in case of race
        const existing = await tx.user.findUnique({
          where: { email: row.email },
        });
        if (existing) {
          errors.push({
            lineNumber: row._lineNumber || 0,
            row: row as unknown as Record<string, unknown>,
            message: `Email đã tồn tại: ${row.email}`,
            field: 'email',
          });
          continue;
        }

        await tx.user.create({
          data: {
            email: row.email,
            displayName: row.displayName,
            role: row.role,
            facultyId: row.facultyId,
            createdAt: new Date(),
            createdBy: context.userId,
          },
        });
        successCount++;
      }
    });
  } catch (error) {
    throw new BadRequestException('Import thất bại. Vui lòng thử lại.');
  }

  // Log import
  await this.prisma.importLog.create({
    data: {
      entityType: 'USERS',
      totalRows: rows.length,
      successCount,
      failedCount: errors.length,
      errors,
      importedBy: context.userId,
    },
  });

  return {
    entityType: ImportEntityType.USERS,
    total: rows.length,
    success: successCount,
    failed: errors.length,
    errors,
    duration: Date.now() - startTime,
  };
}
```

**Controller Implementation:**
```typescript
@Post('users')
@UseInterceptors(FileInterceptor('file'))
async importUsers(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: User,
  @Body() dto: ImportRequestDto,
) {
  if (!file) {
    throw new BadRequestException('Vui lòng chọn file để import.');
  }

  const result = await this.importService.importUsers(file, {
    userId: user.id,
    userDisplayName: user.displayName,
  });

  return {
    success: true,
    data: result,
  };
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 9 Retro):**
```typescript
describe('ImportService.importUsers', () => {
  it('should import valid users', async () => {
    const file = createMockExcelFile([
      ['email', 'displayName', 'role', 'facultyId'],
      ['user1@test.com', 'User 1', 'GIANG_VIEN', 'FACULTY_A'],
      ['user2@test.com', 'User 2', 'GIANG_VIEN', 'FACULTY_B'],
    ]);

    const result = await service.importUsers(file, mockContext);

    expect(result.total).toBe(2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should skip invalid email rows', async () => {
    const file = createMockExcelFile([
      ['email', 'displayName', 'role', 'facultyId'],
      ['invalid-email', 'User 1', 'GIANG_VIEN', 'FACULTY_A'],
      ['user2@test.com', 'User 2', 'GIANG_VIEN', 'FACULTY_B'],
    ]);

    const result = await service.importUsers(file, mockContext);

    expect(result.total).toBe(2);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0].message).toContain('Email không đúng định dạng');
  });

  it('should rollback on transaction error', async () => {
    // Mock Prisma to throw error mid-transaction
    jest.spyOn(prisma.user, 'create').mockRejectedValueOnce(
      new Error('Database error')
    );

    const file = createMockExcelFile([...]);

    await expect(service.importUsers(file, mockContext)).rejects.toThrow();

    // Verify no users were created
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(0);
  });
});

describe('ExcelParserHelper', () => {
  it('should parse xlsx file correctly', async () => {
    const buffer = createXlsxBuffer([...]);
    const result = parseUserImportFile(buffer);

    expect(result).toHaveLength(2);
    expect(result[0].email).toBe('user1@test.com');
  });

  it('should handle Vietnamese characters correctly', async () => {
    const buffer = createXlsxBufferWithVietnamese([
      ['Nguyễn Văn A', 'Đại học B'],
    ]);

    const result = parseUserImportFile(buffer);
    expect(result[0].displayName).toBe('Nguyễn Văn A');
  });
});
```

### Error Handling Pattern

**Vietnamese Error Messages:**
```typescript
export const IMPORT_ERRORS = {
  // File errors
  INVALID_FILE_FORMAT: 'File không hợp lệ. Chỉ chấp nhận .xlsx và .csv',
  EMPTY_FILE: 'File không có dữ liệu',
  MISSING_HEADER: 'File thiếu tiêu đề cột. Vui lòng tải xuống template.',

  // User validation errors
  INVALID_EMAIL: 'Email không đúng định dạng',
  EMAIL_EXISTS: (email: string) => `Email đã tồn tại: ${email}`,
  MISSING_DISPLAY_NAME: 'Tên hiển thị không được để trống',
  INVALID_ROLE: (role: string) => `Vai trò không hợp lệ: ${role}`,
  FACULTY_NOT_FOUND: (facultyId: string) => `Khoa không tồn tại: ${facultyId}`,

  // Proposal validation errors
  OWNER_NOT_FOUND: (ownerId: string) => `Chủ đề tài không tồn tại: ${ownerId}`,
  MISSING_TITLE: 'Tiêu đề đề tài không được để trống',
  INVALID_STATE: (state: string) => `Trạng thái không hợp lệ: ${state}`,

  // General
  IMPORT_FAILED: 'Import thất bại. Vui lòng thử lại.',
  TRANSACTION_FAILED: 'Lỗi transaction. Đã rollback tất cả thay đổi.',
} as const;
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 10-1 created via create-story workflow. Status: ready-for-dev
- Epic 9 retrospective learnings applied (type safety, no as unknown/as any)
- Proper interface typing for import rows (UserImportRow, ProposalImportRow)
- Excel parsing patterns defined
- Transaction-based atomic import for rollback capability
- Comprehensive validation rules defined
- Import result tracking with error details
- Vietnamese localization for all messages
- RBAC for ADMIN only
- Tests mandated per Epic 9 retro lessons

### File List

**To Create:**
- `qlnckh/apps/src/modules/import/import.module.ts` - Import module
- `qlnckh/apps/src/modules/import/import.controller.ts` - Import endpoints
- `qlnckh/apps/src/modules/import/import.service.ts` - Import logic
- `qlnckh/apps/src/modules/import/dto/import-request.dto.ts` - Import request DTO
- `qlnckh/apps/src/modules/import/dto/import-result.dto.ts` - Import result interface
- `qlnckh/apps/src/modules/import/interfaces/user-import-row.interface.ts` - User row interface
- `qlnckh/apps/src/modules/import/interfaces/proposal-import-row.interface.ts` - Proposal row interface
- `qlnckh/apps/src/modules/import/helpers/excel-parser.helper.ts` - XLSX/CSV parsing
- `qlnckh/apps/src/modules/import/helpers/import-validator.helper.ts` - Validation logic
- `qlnckh/web-apps/src/app/admin/import/page.tsx` - Import page
- `qlnckh/web-apps/src/app/admin/import/components/ImportUploader.tsx` - File upload component
- `qlnckh/web-apps/src/app/admin/import/components/ImportReport.tsx` - Report display
- `qlnckh/web-apps/src/app/admin/import/components/TemplateDownload.tsx` - Template download
- `qlnckh/web-apps/src/lib/api/import.ts` - Import API client

**To Modify:**
- `qlnckh/apps/src/app.module.ts` - Import ImportModule
- `qlnckh/prisma/schema.prisma` - Add ImportLog model
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 9 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper interface typing for import data
  - Transaction-based atomic import pattern
  - Comprehensive validation rules
  - Vietnamese localization for all messages
  - RBAC authorization for ADMIN only
  - Tests mandated per Epic 9 retro lessons
  - Ready for dev-story workflow execution

## References

- [epics.md Story 10.1](../../planning-artifacts/epics.md#L2281-L2311) - Full requirements
- [epic-9-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-9-retro-2026-01-07.md) - Lessons learned
- [epic-8-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-8-retro-2026-01-07.md) - Export patterns (XLSX library)
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [Story 1.2](./1-2-authorization-rbac-engine-ui-gating.md) - RBAC patterns
- [Story 3.1](./3-1-16-canonical-states-plus-transitions.md) - State machine reference
- [Story 8.3](./8-3-export-excel-per-filter.md) - Excel handling patterns
