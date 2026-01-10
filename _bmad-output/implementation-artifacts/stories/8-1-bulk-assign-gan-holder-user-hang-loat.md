# Story 8.1: Bulk Assign (Gán holder_user hàng loạt)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 7 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required -->

## Story

As a PKHCN (Phòng Khoa học Công nghệ),
I want gán holder_user cho nhiều proposals cùng lúc,
So that tôi không phải assign từng cái một.

## Acceptance Criteria

1. **AC1: Bulk Selection UI**
   - Given User có role = PHONG_KHCN
   - When User mở Worklist với filter "Đang chờ tôi"
   - Then UI hiển thị:
     - Checkbox per proposal row
     - "Chọn tất cả" (Select All) checkbox ở header
     - Bulk actions menu hiển thị khi ≥ 1 row selected

2. **AC2: Bulk Assign Dialog**
   - Given User đã chọn ≥ 1 proposals
   - When User click "Phân bổ người xử lý"
   - Then UI hiển thị Bulk Assign dialog:
     - Danh sách proposals được chọn (count N)
     - User selector (dropdown với search)
     - Button "Xác nhận" và "Hủy"

3. **AC3: Bulk Assign Execution**
   - Given User đã chọn user và click "Xác nhận"
   - When action execute
   - Then tất cả selected proposals được update:
     - holder_user = selected user
     - workflow_logs entry ghi action ASSIGN cho mỗi proposal
   - And server trả report: `{ success: X, failed: Y, errors: [...] }`

4. **AC4: Error Handling**
   - Given Có proposals thất bại trong batch
   - When batch operation completes
   - Then UI hiển thị:
     - Số lượng thành công
     - Số lượng thất bại
     - Chi tiết errors cho từng proposal thất bại
   - And user có thể retry chỉ những proposals thất bại

5. **AC5: RBAC Authorization**
   - Given User KHÔNG có role = PHONG_KHCN
   - When User cố gắng truy cập bulk assign
   - Then return 403 Forbidden với message "Bạn không có quyền thực hiện thao tác này"

6. **AC6: Atomic Transaction**
   - Given Batch operation đang execute
   - When Có lỗi xảy ra giữa batch
   - Then:
     - Những proposals đã được update giữ nguyên
     - Những proposals chưa update giữ nguyên
     - Operation dừng tại lỗi (no rollback toàn bộ - partial success OK)

## Tasks / Subtasks

- [ ] Task 1: Backend - Bulk Assign DTO (AC: #1, #2, #3, #4)
  - [ ] Create BulkAssignDto với proper typing
  - [ ] Fields: proposalIds (string[]), userId (string)
  - [ ] Add validation: proposalIds min 1, max 100
  - [ ] Add validation: userId is valid UUID

- [ ] Task 2: Backend - Bulk Assign Service (AC: #3, #4, #6)
  - [ ] Create bulkAssign() method in WorkflowService
  - [ ] Validate each proposal exists and user has permission
  - [ ] Execute updates sequentially (no rollback on individual failure)
  - [ ] Collect results: success list, failed list, errors
  - [ ] Log workflow action for EACH proposal (WorkflowAction.BULK_ASSIGN)
  - [ ] Return structured result with success/failed counts

- [ ] Task 3: Backend - Bulk Assign Endpoint (AC: #3, #5)
  - [ ] Create POST /workflow/bulk-assign endpoint
  - [ ] Add RBAC guard: @RequireRoles(UserRole.PHONG_KHCN)
  - [ ] Apply IdempotencyInterceptor
  - [ ] Return BulkAssignResult response

- [ ] Task 4: Backend - Add WorkflowAction Enum Value (AC: #3)
  - [ ] Add BULK_ASSIGN to WorkflowAction enum in schema.prisma
  - [ ] Run prisma migrate

- [ ] Task 5: Frontend - Bulk Selection UI (AC: #1)
  - [ ] Add checkbox per row in WorklistTable
  - [ ] Add "Chọn tất cả" checkbox in table header
  - [ ] Show bulk actions menu khi ≥ 1 row selected
  - [ ] Track selected proposals in state

- [ ] Task 6: Frontend - Bulk Assign Dialog (AC: #2)
  - [ ] Create BulkAssignDialog component
  - [ ] Show count of selected proposals
  - [ ] User selector dropdown với search
  - [ ] "Xác nhận" và "Hủy" buttons
  - [ ] Loading state during execution

- [ ] Task 7: Frontend - Result Display (AC: #3, #4)
  - [ ] Display success/failed counts
  - [ ] Show error details for failed proposals
  - [ - Option to retry failed proposals only
  - [ ] Refresh worklist after success

- [ ] Task 8: Unit Tests (AC: #3, #4, #5, #6)
  - [ ] Test bulk assign với valid proposals
  - [ ] Test bulk assign với invalid proposal IDs
  - [ ] Test bulk assign với non-PKHCN user (403)
  - [ ] Test partial success scenario
  - [ ] Test empty proposalIds array (validation error)
  - [ ] Test max 100 proposals limit

- [ ] Task 9: Integration Tests (AC: #3, #4)
  - [ ] Test full flow: select → assign → verify
  - [ ] Test concurrent bulk assign operations
  - [ ] Test idempotency với same idempotencyKey

## Dev Notes

### Epic 8 Context

**Epic 8: Bulk Actions & Reports**
- FRs covered: FR37 (Bulk Assign), FR38 (Bulk Remind), FR39 (Export Excel)
- Story 8.1: Bulk Assign (THIS STORY)
- Story 8.2: Bulk Remind (preview + dry-run + execute)
- Story 8.3: Export Excel (per filter)
- Story 8.4: Morning Check Dashboard (KPI + overdue list)

**Epic Objective:**
PKHCN performs bulk operations efficiently on multiple proposals, exports reports, and monitors KPIs.

### Dependencies

**Depends on:**
- Story 3.2 (holder rules) - For understanding holder assignment patterns
- Story 3.5 (queue filters) - For "Đang chờ tôi" filter context
- Epic 7 (completed) - For RBAC and WorkflowAction patterns

**Enables:**
- Story 8.2 (Bulk Remind) - Reuses bulk operation patterns

### Epic 7 Retro Learnings to Apply (CRITICAL)

From `epic-7-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const result = bulkAssignData as unknown as Prisma.InputJsonValue;

// ✅ CORRECT - Epic 7 retro pattern:
interface BulkAssignData {
  proposalIds: string[];
  userId: string;
  assignedBy: string;
  assignedAt: Date;
}
const result: BulkAssignData = {
  proposalIds: dto.proposalIds,
  userId: dto.userId,
  assignedBy: user.id,
  assignedAt: new Date(),
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation (11 instances found):
const userData = (user as any).displayName;

// ✅ CORRECT - Define proper interface:
interface UserWithDisplayName {
  id: string;
  displayName: string;
  email: string;
}
const userData: UserWithDisplayName = user;
```

**3. Use WorkflowAction Enum Directly** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
action: WorkflowAction.BULK_ASSIGN as unknown as AuditAction

// ✅ CORRECT - Use enum directly:
import { WorkflowAction } from '@prisma/client';
action: WorkflowAction.BULK_ASSIGN
```

**4. File Operations OUTSIDE Transactions**
```typescript
// For Epic 8: If we export Excel files, write file OUTSIDE transaction:
// 1. Do database transaction first
// 2. Write file after transaction succeeds
// 3. Clean up file if transaction fails
```

**5. Tests MUST Be Written**
```typescript
// Epic 7 retro finding: No tests written → bugs not caught early
// Epic 8 REQUIREMENT: Write tests for each critical path
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  workflow/
    workflow.service.ts       # Extend: Add bulkAssign() method
    dto/
      bulk-assign.dto.ts      # New: BulkAssignDto, BulkAssignResultDto
    bulk-operations.controller.ts  # New: Bulk operations endpoints
  bulk-operations/
    bulk-operations.module.ts # New: Module for bulk operations
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    worklist/
      components/
        WorklistTable.tsx      # Modify: Add checkboxes
        BulkAssignDialog.tsx   # New: Assign dialog
  lib/api/
    bulk-operations.ts        # New: Bulk operations API client
```

### Architecture Compliance

**WorkflowAction Enum Addition:**
```prisma
enum WorkflowAction {
  // ... existing values ...
  BULK_ASSIGN           // Gán holder_user hàng loạt (Story 8.1)
  BULK_REMIND           // Gửi email nhắc hàng loạt (Story 8.2)
  EXPORT_EXCEL          // Xuất Excel (Story 8.3)
}
```

**RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PHONG_KHCN)
@Controller('bulk-operations')
export class BulkOperationsController {
  // All endpoints require PHONG_KHCN role
}
```

**Idempotency Pattern:**
```typescript
@Post('bulk-assign')
@UseInterceptors(IdempotencyInterceptor)
async bulkAssign(
  @Body() dto: BulkAssignDto,
  @CurrentUser() user: User,
  @Headers('idempotency-key') idempotencyKey: string,
) {
  // Prevent duplicate bulk operations
}
```

### Data Model

**Bulk Assign DTO:**
```typescript
import { IsArray, IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  @MinLength(1, {
    message: 'Phải chọn ít nhất một đề tài'
  })
  @MaxLength(100, {
    message: 'Chỉ có thể gán tối đa 100 đề tài cùng lúc'
  })
  proposalIds: string[];

  @IsString()
  @IsUUID('4')
  userId: string;
}
```

**Bulk Assign Result DTO:**
```typescript
export class BulkAssignResultDto {
  success: number;           // Số lượng thành công
  failed: number;            // Số lượng thất bại
  total: number;             // Tổng số
  errors: BulkAssignError[]; // Chi tiết errors
}

export class BulkAssignError {
  proposalId: string;
  proposalCode: string;      // For display
  reason: string;            // Vietnamese error message
}
```

### RBAC Authorization

**Authorization Rules:**
- Only PHONG_KHCN can perform bulk assign
- ADMIN có thể override (optional - confirm with PO)
- Other roles receive 403 Forbidden

```typescript
// Authorization check
if (user.role !== UserRole.PHONG_KHCN && user.role !== UserRole.ADMIN) {
  throw new ForbiddenException({
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Bạn không có quyền thực hiện thao tác này',
    },
  });
}
```

### Vietnamese Localization

All UI text and error messages must be in Vietnamese:
- "Phân bổ người xử lý" (Bulk Assign)
- "Chọn tất cả" (Select All)
- "Đã chọn N đề tài" (N proposals selected)
- "Xác nhận" (Confirm)
- "Hủy" (Cancel)
- "Đang gán..." (Assigning...)
- "Thành công: X, Thất bại: Y" (Success: X, Failed: Y)
- "Bạn không có quyền thực hiện thao tác này" (Insufficient permissions)
- "Không tìm thấy đề tài" (Proposal not found)
- "Người dùng không tồn tại" (User not found)

### Code Patterns to Follow

**Proper DTO Mapping (Epic 7 Retro Pattern):**
```typescript
// WorkflowService.bulkAssign()
async bulkAssign(
  proposalIds: string[],
  targetUserId: string,
  context: TransitionContext,
): Promise<BulkAssignResultDto> {
  const results = {
    success: 0,
    failed: 0,
    total: proposalIds.length,
    errors: [] as BulkAssignError[],
  };

  // Validate proposals exist
  const proposals = await this.prisma.proposal.findMany({
    where: { id: { in: proposalIds } },
    select: { id: true, code: true, state: true, holderUser: true },
  });

  // Check for not found proposals
  const foundIds = new Set(proposals.map(p => p.id));
  for (const id of proposalIds) {
    if (!foundIds.has(id)) {
      results.failed++;
      results.errors.push({
        proposalId: id,
        proposalCode: 'Unknown',
        reason: 'Không tìm thấy đề tài',
      });
    }
  }

  // Process each proposal
  for (const proposal of proposals) {
    try {
      // Update holder_user
      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { holderUser: targetUserId },
      });

      // Log workflow action - Proper enum usage (Epic 7 retro)
      await this.prisma.workflowLog.create({
        data: {
          proposalId: proposal.id,
          action: WorkflowAction.BULK_ASSIGN,  // Direct enum usage
          fromState: proposal.state,
          toState: proposal.state,
          actorId: context.userId,
          actorName: context.userDisplayName,
          comment: `Gán cho ${targetUserName}`,
          timestamp: new Date(),
        },
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        proposalId: proposal.id,
        proposalCode: proposal.code,
        reason: error instanceof Error ? error.message : 'Lỗi không xác định',
      });
    }
  }

  return results;
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 7 Retro):**
```typescript
describe('WorkflowService.bulkAssign', () => {
  it('should assign holder_user to multiple proposals', async () => {
    // Test bulk assign with 3 valid proposals
  });

  it('should handle partial success - some proposals fail', async () => {
    // Test scenario where some proposals don't exist
  });

  it('should reject empty proposalIds array', async () => {
    // Test validation error
  });

  it('should reject more than 100 proposals', async () => {
    // Test max limit validation
  });

  it('should log workflow action for each proposal', async () => {
    // Verify WorkflowAction.BULK_ASSIGN is logged
  });

  it('should return 403 for non-PKHCN users', async () => {
    // Test RBAC enforcement
  });
});
```

### Error Handling Pattern

**Vietnamese Error Messages:**
```typescript
export const BULK_ASSIGN_ERRORS = {
  EMPTY_LIST: 'Phải chọn ít nhất một đề tài',
  EXCEEDS_LIMIT: 'Chỉ có thể gán tối đa 100 đề tài cùng lúc',
  INVALID_USER: 'Người dùng không tồn tại',
  INSUFFICIENT_PERMISSIONS: 'Bạn không có quyền thực hiện thao tác này',
  PROPOSAL_NOT_FOUND: (id: string) => `Không tìm thấy đề tài: ${id}`,
  ASSIGN_FAILED: (code: string) => `Gán holder_user thất bại cho đề tài: ${code}`,
} as const;
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 8-1 created via create-story workflow. Status: ready-for-dev
- Epic 7 retrospective learnings applied (type safety, no as unknown/as any)
- WorkflowAction.BULK_ASSIGN enum value to be added
- Proper DTO mapping pattern specified
- RBAC for PHONG_KHCN only
- Idempotency for duplicate prevention
- Tests required (Epic 7 retro lesson)
- Vietnamese localization for all messages
- Partial success handling (no full rollback)

### File List

**To Create:**
- `qlnckh/apps/src/modules/workflow/dto/bulk-assign.dto.ts` - Bulk assign DTOs
- `qlnckh/apps/src/modules/workflow/bulk-operations.controller.ts` - Bulk endpoints (or create separate module)
- `qlnckh/apps/src/modules/bulk-operations/bulk-operations.module.ts` - Module definition (if creating separate)
- `qlnckh/web-apps/src/app/worklist/components/BulkAssignDialog.tsx` - Assign dialog
- `qlnckh/web-apps/src/app/worklist/components/WorklistTable.tsx` - Modify: Add checkboxes
- `qlnckh/web-apps/src/lib/api/bulk-operations.ts` - API client

**To Modify:**
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Add bulkAssign() method
- `qlnckh/prisma/schema.prisma` - Add BULK_ASSIGN to WorkflowAction enum
- `qlnckh/apps/src/app.module.ts` - Import BulkOperationsModule (if creating)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 7 retro analysis applied (epic-7-retro-2026-01-07.md)
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper DTO mapping pattern specified
  - WorkflowAction enum pattern (direct usage, no double cast)
  - RBAC authorization for PHONG_KHCN
  - Tests mandated per Epic 7 retro lessons
  - Vietnamese localization for all messages
  - Bulk operation patterns established for Epic 8 reuse
  - Ready for dev-story workflow execution

## References

- [epics.md Story 8.1](../../planning-artifacts/epics.md#L2071-L2099) - Full requirements
- [epic-7-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-7-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [workflow.service.ts](../../../qlnckh/apps/src/modules/workflow/workflow.service.ts) - Existing workflow patterns
- [Story 3.2](./3-2-holder-rules-holder-unit-plus-holder-user.md) - Holder assignment patterns
