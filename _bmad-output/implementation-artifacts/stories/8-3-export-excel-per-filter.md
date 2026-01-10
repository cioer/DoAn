# Story 8.3: Export Excel (Per Filter)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 7 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required -->

## Story

As a PKHCN/Admin,
I want export danh sách proposals ra Excel,
So that tôi có thể làm báo cáo.

## Acceptance Criteria

1. **AC1: Export Button Visibility**
   - Given User có role = PHONG_KHCN hoặc ADMIN
   - When User đang ở Worklist page
   - Then UI hiển thị "Xuất Excel" button

2. **AC2: Excel Generation with Current Filter**
   - Given User đang ở Worklist với bất kỳ filter nào
   - When User click "Xuất Excel"
   - Then server generate Excel file với:
     - Các columns: Code, Title, Owner, State, Holder, SLA Deadline, Days Remaining
     - Rows theo filter hiện tại (đã áp dụng)

3. **AC3: Excel Format**
   - Given Excel được generate
   - When export thành công
   - Then:
     - Format: .xlsx
     - File name: "proposals_{filter_name}_{timestamp}.xlsx"
     - Header row có styling (bold, background color)
     - Auto-fit column widths

4. **AC4: Download Trigger**
   - Given Excel được generate thành công
   - When export hoàn tất
   - Then UI trigger download browser

5. **AC5: RBAC Authorization**
   - Given User KHÔNG có role PHONG_KHCN hoặc ADMIN
   - When User cố gắng export Excel
   - Then return 403 Forbidden

6. **AC6: Large Dataset Handling**
   - Given Filter trả về nhiều records (> 1000)
   - When User click "Xuất Excel"
   - Then:
     - Server handle batch generation
     - Return file khi ready (có thể take few seconds)
     - Show progress indicator

7. **AC7: Audit Trail**
   - Given Excel export thành công
   - When operation complete
   - Then system ghi audit log:
     - action: EXPORT_EXCEL
     - filter_params
     - row_count

## Tasks / Subtasks

- [ ] Task 1: Backend - Add WorkflowAction Enum (AC: #7)
  - [ ] Add EXPORT_EXCEL to WorkflowAction enum in schema.prisma
  - [ ] Run prisma migrate

- [ ] Task 2: Backend - Install Excel Library (AC: #2, #3)
  - [ ] Install exceljs library: `npm install exceljs`
  - [ ] Install @types/exceljs if needed

- [ ] Task 3: Backend - Excel Service (AC: #2, #3)
  - [ ] Create ExcelExportService
  - [ ] Implement generateProposalExcel() method
  - [ ] Define column headers (Vietnamese)
  - [ ] Apply styling to header row
  - [ ] Auto-fit column widths
  - [ ] Return Buffer with .xlsx content

- [ ] Task 4: Backend - Export DTO (AC: #2, #7)
  - [ ] Create ExportExcelDto
  - [ ] Fields: filter (object), includeAll (boolean)
  - [ ] Add proper typing for filter parameters

- [ ] Task 5: Backend - Export Endpoint (AC: #1, #4, #5)
  - [ ] Create POST /worklist/export-excel endpoint
  - [ ] Add RBAC guard: @RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
  - [ ] Apply query proposals with filter
  - [ ] Generate Excel buffer
  - [ ] Return file with proper headers (Content-Type, Content-Disposition)

- [ ] Task 6: Backend - File Write Pattern (Epic 7 Retro) (AC: #4)
  - [ ] Generate Excel OUTSIDE transaction (no DB transaction needed)
  - [ ] If error occurs during generation, clean up any temp files
  - [ ] Stream file directly to response

- [ ] Task 7: Frontend - Export Button (AC: #1)
  - [ ] Add "Xuất Excel" button to Worklist page
  - [ ] Show loading state during export
  - [ ] Handle success/error

- [ ] Task 8: Frontend - Download Handling (AC: #4)
  - [ ] Trigger download when file ready
  - [ ] Handle large dataset progress indication

- [ ] Task 9: Unit Tests (AC: #2, #3, #5, #6)
  - [ ] Test Excel generation with sample data
  - [ ] Test Excel column headers (Vietnamese)
  - [ ] Test Excel styling (header, auto-fit)
  - [ ] Test RBAC for unauthorized users
  - [ ] Test large dataset handling (> 1000 rows)

- [ ] Task 10: Integration Tests (AC: #2, #4)
  - [ ] Test export with various filters
  - [ ] Test file download trigger
  - [ ] Test Excel file validity

## Dev Notes

### Epic 8 Context

**Epic 8: Bulk Actions & Reports**
- FRs covered: FR37 (Bulk Assign), FR38 (Bulk Remind), FR39 (Export Excel)
- Story 8.1: Bulk Assign (done)
- Story 8.2: Bulk Remind (done)
- **Story 8.3: Export Excel (THIS STORY)**
- Story 8.4: Morning Check Dashboard (pending)

### Dependencies

**Depends on:**
- Story 3.5 (queue filters) - For filter parameters
- Story 3.6 (SLA calculator) - For SLA Deadline, Days Remaining columns

**Enables:**
- Story 8.4 (Morning Check Dashboard) - May export from dashboard

### Epic 7 Retro Learnings to Apply (CRITICAL)

From `epic-7-retro-2026-01-07.md`:

**1. NO `as unknown` Casting**
```typescript
// ❌ WRONG:
const rowData = row as unknown as Prisma.InputJsonValue;

// ✅ CORRECT:
interface ProposalRowData {
  code: string;
  title: string;
  ownerName: string;
  state: string;
  holderName: string;
  slaDeadline: string | null;
  daysRemaining: number | null;
}
const rowData: ProposalRowData = {
  code: proposal.code,
  title: proposal.title,
  ownerName: proposal.owner?.displayName || 'N/A',
  state: proposal.state,
  holderName: proposal.holderUser?.displayName || 'Chưa gán',
  slaDeadline: proposal.slaDeadline ?
    new Date(proposal.slaDeadline).toLocaleDateString('vi-VN') : null,
  daysRemaining: this.slaService.calculateDaysRemaining(proposal),
};
```

**2. NO `as any` Casting**
```typescript
// ❌ WRONG:
const cellValue = (row as any).title;

// ✅ CORRECT:
const cellValue: string = row.title;
```

**3. Use WorkflowAction Enum Directly**
```typescript
// ❌ WRONG:
action: WorkflowAction.EXPORT_EXCEL as unknown as AuditAction

// ✅ CORRECT:
import { WorkflowAction } from '@prisma/client';
action: WorkflowAction.EXPORT_EXCEL
```

**4. File Write OUTSIDE Transactions (CRITICAL for Excel)**
```typescript
// Excel generation is file operation - NO database transaction needed
// Pattern: Generate → Return Buffer → Stream to response

// ❌ WRONG: File generation inside DB transaction
await this.prisma.$transaction(async (tx) => {
  const buffer = await excelService.generate(data);  // Wrong!
  return buffer;
});

// ✅ CORRECT: Generate OUTSIDE transaction
const buffer = await this.excelService.generateProposals(data);

// Then log audit (separate operation, not in same transaction)
await this.auditService.logEvent({
  action: WorkflowAction.EXPORT_EXCEL,
  // ... audit data
});
```

**5. Tests MUST Be Written**
```typescript
// Epic 7 retro: No tests → bugs not caught
// Test Excel generation with sample data
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  exports/
    excel-export.controller.ts    # New: Export endpoint
    excel-export.service.ts       # New: Excel generation service
    dto/
      export-excel.dto.ts         # New: Export DTOs
    excel-export.module.ts        # New: Module definition
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    worklist/
      ExportExcelButton.tsx       # New: Export button with loading
  lib/api/
    exports.ts                    # New: Export API client
```

### Architecture Compliance

**WorkflowAction Enum Addition:**
```prisma
enum WorkflowAction {
  // ... existing values ...
  BULK_ASSIGN           // Story 8.1
  BULK_REMIND           // Story 8.2
  EXPORT_EXCEL          // Xuất Excel (Story 8.3)
}
```

**Excel Generation Pattern (ExcelJS):**
```typescript
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelExportService {
  async generateProposalsExcel(
    proposals: ProposalRowData[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Hồ sơ');

    // Define columns
    worksheet.columns = [
      { header: 'Mã hồ sơ', key: 'code', width: 15 },
      { header: 'Tên đề tài', key: 'title', width: 40 },
      { header: 'Chủ nhiệm', key: 'ownerName', width: 25 },
      { header: 'Trạng thái', key: 'state', width: 20 },
      { header: 'Người xử lý', key: 'holderName', width: 25 },
      { header: 'Thời hạn SLA', key: 'slaDeadline', width: 20 },
      { header: 'Còn lại (ngày)', key: 'daysRemaining', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows - NO as any casting
    for (const proposal of proposals) {
      worksheet.addRow(proposal);
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
```

### Data Model

**Export Excel DTO:**
```typescript
import { IsObject, IsOptional, IsBoolean } from 'class-validator';

export class ExportExcelDto {
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  includeAll?: boolean;  // If true, ignore filter, export all
}
```

**Proposal Row Data Interface:**
```typescript
interface ProposalRowData {
  code: string;
  title: string;
  ownerName: string;
  state: string;
  holderName: string;
  slaDeadline: string | null;
  daysRemaining: number | null;
}
```

### RBAC Authorization

```typescript
@Post('worklist/export-excel')
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
async exportExcel(
  @Body() dto: ExportExcelDto,
  @CurrentUser() user: User,
  @Res() res: Response,
) {
  // ... implementation
}
```

### Vietnamese Localization

**Excel Headers (Vietnamese):**
```typescript
const EXCEL_HEADERS = {
  code: 'Mã hồ sơ',
  title: 'Tên đề tài',
  ownerName: 'Chủ nhiệm',
  state: 'Trạng thái',
  holderName: 'Người xử lý',
  slaDeadline: 'Thời hạn SLA',
  daysRemaining: 'Còn lại (ngày)',
} as const;
```

**State Labels (Vietnamese):**
```typescript
const STATE_LABELS: Record<ProjectState, string> = {
  DRAFT: 'Nháp',
  FACULTY_REVIEW: 'Xét duyệt Khoa',
  SCHOOL_SELECTION_REVIEW: 'Chọn Hội đồng',
  OUTLINE_COUNCIL_REVIEW: 'Họp Hội đồng',
  CHANGES_REQUESTED: 'Yêu cầu sửa',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang thực hiện',
  PAUSED: 'Tạm dừng',
  FACULTY_ACCEPTANCE_REVIEW: 'Nghiệm thu Khoa',
  SCHOOL_ACCEPTANCE_REVIEW: 'Nghiệm thu Trường',
  HANDOVER: 'Bàn giao',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút',
  CANCELLED: 'Đã hủy',
} as const;
```

### File Generation Pattern (Epic 7 Retro)

```typescript
// Generate Excel OUTSIDE any DB transaction
async exportExcel(
  dto: ExportExcelDto,
  user: User,
): Promise<{ buffer: Buffer; filename: string }> {
  // 1. Query data (no transaction for read)
  const proposals = await this.prisma.proposal.findMany({
    where: this.buildFilter(dto.filter),
    include: {
      owner: { select: { displayName: true } },
      holder: { select: { displayName: true } },
    },
  });

  // 2. Transform to row data - Proper typing, NO as unknown
  const rowData: ProposalRowData[] = proposals.map(p => ({
    code: p.code,
    title: p.title,
    ownerName: p.owner?.displayName || 'N/A',
    state: STATE_LABELS[p.state],
    holderName: p.holder?.displayName || 'Chưa gán',
    slaDeadline: p.slaDeadline ?
      new Date(p.slaDeadline).toLocaleDateString('vi-VN') : null,
    daysRemaining: this.slaService.calculateDaysRemaining(p),
  }));

  // 3. Generate Excel buffer
  const buffer = await this.excelService.generateProposalsExcel(rowData);

  // 4. Generate filename
  const timestamp = new Date().getTime();
  const filterName = dto.filter?.state || 'all';
  const filename = `proposals_${filterName}_${timestamp}.xlsx`;

  // 5. Log audit (separate operation, not in transaction)
  await this.auditService.logEvent({
    action: WorkflowAction.EXPORT_EXCEL,  // Direct enum usage
    entityType: 'export',
    entityId: filename,
    actorId: user.id,
    details: {
      rowCount: proposals.length,
      filter: dto.filter,
    },
  });

  return { buffer, filename };
}
```

### Response Headers for Download

```typescript
@Post('worklist/export-excel')
async exportExcel(
  @Body() dto: ExportExcelDto,
  @CurrentUser() user: User,
  @Res() res: Response,
) {
  const { buffer, filename } = await this.exportService.exportExcel(dto, user);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Length', buffer.length.toString());

  res.send(buffer);
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 7 Retro):**
```typescript
describe('ExcelExportService', () => {
  it('should generate Excel with proper headers', async () => {
    // Test Vietnamese headers
  });

  it('should style header row', async () => {
    // Test bold + background color
  });

  it('should handle empty dataset', async () => {
    // Test with 0 proposals
  });

  it('should handle large dataset (>1000 rows)', async () => {
    // Test performance
  });
});

describe('ExportExcelController', () => {
  it('should return 403 for unauthorized user', async () => {
    // Test RBAC
  });

  it('should set proper download headers', async () => {
    // Test Content-Type, Content-Disposition
  });
});
```

### NPM Dependencies

```bash
npm install exceljs
npm install -D @types/exceljs
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 8-3 created. Status: ready-for-dev
- Epic 7 retro learnings applied (type safety, no as unknown/as any)
- WorkflowAction.EXPORT_EXCEL enum value to be added
- ExcelJS library for .xlsx generation
- File generation OUTSIDE transactions (Epic 7 retro pattern)
- Proper DTO mapping for row data
- Vietnamese headers and state labels
- RBAC for PHONG_KHCN and ADMIN
- Tests required

### File List

**To Create:**
- `qlnckh/apps/src/modules/exports/excel-export.controller.ts` - Export endpoint
- `qlnckh/apps/src/modules/exports/excel-export.service.ts` - Excel generation
- `qlnckh/apps/src/modules/exports/dto/export-excel.dto.ts` - DTOs
- `qlnckh/apps/src/modules/exports/exports.module.ts` - Module
- `qlnckh/web-apps/src/components/worklist/ExportExcelButton.tsx` - Button
- `qlnckh/web-apps/src/lib/api/exports.ts` - API client

**To Modify:**
- `qlnckh/prisma/schema.prisma` - Add EXPORT_EXCEL to WorkflowAction enum
- `qlnckh/apps/src/app.module.ts` - Import ExportsModule
- `qlnckh/package.json` - Add exceljs dependency

## Change Log

- 2026-01-07: Story created. Status: ready-for-dev
  - Epic 7 retro learnings applied
  - ExcelJS for .xlsx generation
  - Vietnamese headers and labels
  - File generation outside transactions
  - Tests mandated

## References

- [epics.md Story 8.3](../../planning-artifacts/epics.md#L2138-L2158) - Full requirements
- [epic-7-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-7-retro-2026-01-07.md) - Lessons learned
- [ExcelJS docs](https://github.com/exceljs/exceljs) - Excel generation library
