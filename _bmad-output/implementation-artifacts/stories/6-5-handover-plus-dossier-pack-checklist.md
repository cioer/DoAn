# Story 6.5: Handover + Dossier Pack Checklist

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên (PROJECT_OWNER),
I want bàn giao hồ sơ và checklist,
So that dự án được marked hoàn thành.

## Acceptance Criteria

1. **AC1: Handover Checklist Visibility**
   - Given Proposal state = HANDOVER
   - When Owner (PROJECT_OWNER) mở proposal detail
   - Then UI hiển thị Handover Checklist panel
   - And panel disabled khi state ≠ HANDOVER
   - And chỉ owner của proposal mới thấy panel này

2. **AC2: Checklist Items Display**
   - Given Handover Checklist panel hiển thị
   - Then UI hiển thị checklist items:
     - [ ] Báo cáo kết quả
     - [ ] Sản phẩm đầu ra
     - [ ] Tài liệu hướng dẫn
     - [ ] File source code (nếu có)
     - [ ] Các tài liệu khác
   - And mỗi item có checkbox và optional note field
   - And user có thể select/deselect từng item

3. **AC3: Complete Handover Button**
   - Given Handover Checklist panel hiển thị
   - When User chưa tick bất kỳ checkbox nào
   - Then "Hoàn thành bàn giao" button disabled
   - Given User đã tick ≥ 1 checkbox
   - When User click "Hoàn thành bàn giao"
   - Then Confirm dialog hiển thị: "Xác nhận hoàn thành bàn giao?"
   - And UI có "Hủy" và "Xác nhận" buttons

4. **AC4: State Transition (HANDOVER → COMPLETED)**
   - Given User đã tick ≥ 1 checkbox và confirm
   - When action execute (kèm idempotency key)
   - Then proposal.state chuyển từ HANDOVER → COMPLETED
   - And proposal.completedDate = now()
   - And proposal.holderUnit = owner_faculty_id
   - And proposal.holderUser = owner_id
   - And formData được lưu với checklist data
   - And workflow_logs entry ghi action HANDOVER_COMPLETE

5. **AC5: Idempotency**
   - Given User click "Hoàn thành bàn giao" nhiều lần
   - When các request có cùng idempotency key
   - Then chỉ thực hiện transition một lần
   - And các request sau đó trả về kết quả đã cached (200 OK)

6. **AC6: UI Update After Complete**
   - Given Complete handover thành công
   - When transition hoàn tất
   - Then UI update state badge hiển thị "Đã hoàn thành"
   - And Handover Checklist panel không còn editable
   - And Timeline hiển thị entry mới: "Đã hoàn thành bàn giao"
   - And Completed date hiển thị trong proposal detail
   - And "Hoàn thành bàn giao" button không còn hiển thị

7. **AC7: Permission Check**
   - Given User không phải owner của proposal
   - When User cố gọi complete handover API
   - Then API trả về 403 Forbidden
   - And error message: "Bạn không có quyền thực hiện hành động này"

8. **AC8: Completed State Read-Only**
   - Given Proposal state = COMPLETED
   - When Owner mở proposal detail
   - Then Handover Checklist hiển thị nhưng read-only
   - And các checkbox disabled
   - And không có "Hoàn thành bàn giao" button
   - And "Đã hoàn thành" badge hiển thị

## Tasks / Subtasks

- [ ] Task 1: Backend - Handover Data Model (AC: #2, #4)
  - [ ] Add SectionId.SEC_HANDOVER_CHECKLIST to schema
  - [ ] Add completedDate DateTime? field to Proposal model
  - [ ] Define HandoverChecklistItem type
  - [ ] Create migration for new field
  - [ ] Update Prisma client generation

- [ ] Task 2: Backend - Complete Handover Service (AC: #3, #4, #5, #7)
  - [ ] Add completeHandover() method to ProposalsService
  - [ ] Validate proposal.state = HANDOVER
  - [ ] Validate user.id = proposal.ownerId (PROJECT_OWNER check)
  - [ ] Validate at least one checklist item selected
  - [ ] Use @UseInterceptors(IdempotencyInterceptor) on controller
  - [ ] Wrap transition in Prisma transaction
  - [ ] Update proposal: HANDOVER → COMPLETED
  - [ ] Set completedDate = now()
  - [ ] Set holderUnit = facultyId, holderUser = ownerId
  - [ ] Update proposal.formData với checklist data
  - [ ] Create workflow_logs entry with HANDOVER_COMPLETE action
  - [ ] Return updated proposal

- [ ] Task 3: Backend - Complete Endpoint (AC: #1, #4, #7)
  - [ ] Create POST /proposals/:id/complete-handover endpoint
  - [ ] Add @UseGuards(JwtAuthGuard) for authentication
  - [ ] Add @UseGuards(ProjectOwnerGuard) for authorization
  - [ ] Apply IdempotencyInterceptor at controller level
  - [ ] Handle idempotency key from X-Idempotency-Key header
  - [ ] Create CompleteHandoverDto
  - [ ] Return 403 if user is not owner
  - [ ] Return 400 if state ≠ HANDOVER
  - [ ] Return 400 if no checklist items selected
  - [ ] Return 200 with updated proposal on success

- [ ] Task 4: Backend - Save Draft Checklist Endpoint (AC: #2)
  - [ ] Create PATCH /proposals/:id/handover-checklist endpoint
  - [ ] Validate proposal.state = HANDOVER
  - [ ] Validate user.id = proposal.ownerId
  - [ ] Update proposal.formData với checklist draft
  - [ ] Return updated checklist data
  - [ ] Enable auto-save functionality

- [ ] Task 5: Frontend - Handover Checklist Panel (AC: #1, #2, #8)
  - [ ] Create HandoverChecklistPanel component
  - [ ] Display checklist items with checkboxes
  - [ ] Add optional note field for each item
  - [ ] Implement select/deselect functionality
  - [ ] Show read-only view when COMPLETED
  - [ ] Implement auto-save for draft state

- [ ] Task 6: Frontend - Complete Button Integration (AC: #3, #6)
  - [ ] Add CompleteHandoverButton to ProposalDetail
  - [ ] Show "Hoàn thành bàn giao" text with primary style
  - [ ] Disable when proposal.state ≠ HANDOVER
  - [ ] Disable when no checklist items selected
  - [ ] Show confirm dialog before submission
  - [ ] Invalidate queries after success to refresh UI

- [ ] Task 7: Frontend - Timeline & Completed Display (AC: #6, #8)
  - [ ] Timeline component refetches proposal data after action
  - [ ] Add HANDOVER_COMPLETE timeline entry display
  - [ ] Show: "Đã hoàn thành bàn giao" + timestamp + actor name
  - [ ] Display completedDate in proposal detail
  - [ ] Show "Đã hoàn thành" badge with completed date

- [ ] Task 8: Unit Tests (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [ ] Test completeHandover() service method
  - [ ] Test state transition only from HANDOVER
  - [ ] Test permission check (only owner)
  - [ ] Test validation (at least one item selected)
  - [ ] Test idempotency (duplicate requests)
  - [ ] Test workflow_log entry creation
  - [ ] Test completedDate is set correctly
  - [ ] Test formData update with checklist data
  - [ ] Test read-only state when COMPLETED

## Dev Notes

### Epic 6 Context

**Epic 6: Acceptance & Handover + Dossier Pack**
- FRs covered: FR28, FR29, FR30, FR31, FR32, FR33, FR41, FR42
- Story 6.1: Start Project (done)
- Story 6.2: Submit Faculty Acceptance Review (done)
- Story 6.3: Faculty Acceptance Vote (done)
- Story 6.4: School Acceptance Vote (done)
- **Story 6.5: Handover + Dossier Pack Checklist (THIS STORY)** - Owner completes handover
- Story 6.6: ZIP Dossier Pack Export

### Dependencies

**Depends on:**
- Story 6.4 (School Acceptance Vote) - Must have HANDOVER state
- Story 3.8 (Idempotency Keys) - Reuse IdempotencyInterceptor pattern
- Story 2.3 (Auto-save Draft) - Reuse auto-save pattern for checklist

**Enables:**
- Story 6.6 (ZIP Dossier Pack Export) - Requires COMPLETED state

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  proposals/
    proposals.controller.ts   # Add GET/PATCH/POST endpoints
    proposals.service.ts      # Add completeHandover() method
    dto/
      complete-handover.dto.ts        # New: Complete DTO
      handover-checklist.dto.ts       # New: Checklist DTO
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    proposal/
      HandoverChecklistPanel.tsx   # New: Checklist panel
      CompleteHandoverButton.tsx   # New: Complete button
      ProposalDetail.tsx            # Add HandoverChecklistPanel
  lib/api/
    proposals.ts                    # Add completeHandover(), saveChecklist() API methods
```

### Epic 5 Retro Learnings to Apply

From `epic-5-retro-2026-01-07.md`:

1. **IdempotencyInterceptor Pattern (Story 5.4 fix):**
   ```typescript
   @UseInterceptors(IdempotencyInterceptor) // Reused from Epic 3
   @Controller('proposals')
   export class ProposalsController {
     @Post(':id/complete-handover')
     async completeHandover(@Param('id') id: string) { ... }
   }
   ```
   - Critical: Must apply interceptor at controller level or endpoint level
   - Client must send X-Idempotency-Key header with UUID v4

2. **Atomic Transaction Pattern (Story 5.4):**
   ```typescript
   return this.prisma.$transaction(async (tx) => {
     // 1. Update proposal state
     const proposal = await tx.proposal.update({
       where: { id: proposalId },
       data: {
         state: ProjectState.COMPLETED,
         completedDate: new Date(),
       },
     });

     // 2. Update formData with checklist data
     await tx.proposal.update({...});

     // 3. Create workflow log entry
     await tx.workflowLog.create({
       action: 'HANDOVER_COMPLETE',
       fromState: 'HANDOVER',
       toState: 'COMPLETED',
       // ...
     });

     return proposal;
   });
   ```

3. **RBAC Pattern from Story 5.6:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(ProjectOwnerGuard) // Ensures user.id === proposal.ownerId
   @Post(':id/complete-handover')
   async completeHandover(@Param('id') id: string, @CurrentUser() user: User) {
     // Guard handles authorization, service handles business logic
   }
   ```

### Architecture Compliance

**State Machine Rules (from architecture.md):**
- HANDOVER → COMPLETED is valid transition (Phase E → Terminal)
- holderUnit = facultyId, holderUser = ownerId (returns to PI for record)
- SLA tracking ends when reaching COMPLETED
- COMPLETED is a terminal state (no further transitions except admin actions)

**WorkflowAction Enum:**
- HANDOVER_COMPLETE action added in Epic 6
- Must be logged to workflow_logs for audit trail

**API Response Format:**
```typescript
// Success
{ success: true, data: { proposal: {...} }, meta: {...} }

// Error
{ success: false, error: { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện hành động này" } }
```

### Data Model

**Prisma Schema Addition:**
```prisma
model Proposal {
  // ... existing fields ...
  completedDate DateTime? @map("completed_date") // NEW: Set when completing project
}

enum SectionId {
  // ... existing sections ...

  // Phase E: Handover (MAU_17B)
  SEC_HANDOVER_CHECKLIST   // Checklist bàn giao
}
```

**Service Method Signature:**
```typescript
/**
 * Complete handover and mark project as completed
 * @param proposalId - Proposal UUID
 * @param userId - User ID (owner)
 * @param dto - Handover checklist data
 * @returns Updated proposal
 */
async completeHandover(
  proposalId: string,
  userId: string,
  dto: CompleteHandoverDto
): Promise<Proposal>
```

**DTO Structure:**
```typescript
export class CompleteHandoverDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandoverChecklistItemDto)
  checklist: HandoverChecklistItemDto[];
}

export class HandoverChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  id: string; // Item identifier

  @IsBoolean()
  checked: boolean; // Item completion status

  @IsString()
  @IsOptional()
  note?: string; // Optional note for item
}

// Predefined checklist items
export const HANDOVER_CHECKLIST_ITEMS = [
  { id: 'bao_cao_ket_qua', label: 'Báo cáo kết quả', required: true },
  { id: 'san_pham_dau_ra', label: 'Sản phẩm đầu ra', required: true },
  { id: 'tai_lieu_huong_dan', label: 'Tài liệu hướng dẫn', required: false },
  { id: 'source_code', label: 'File source code', required: false },
  { id: 'tai_lieu_khac', label: 'Các tài liệu khác', required: false },
] as const;
```

**Workflow Log Entry:**
```typescript
await tx.workflowLog.create({
  proposalId,
  action: 'HANDOVER_COMPLETE',
  fromState: 'HANDOVER',
  toState: 'COMPLETED',
  actorId: userId,
  actorName: user.displayName,
  timestamp: new Date(),
});
```

**FormData Structure:**
```typescript
// proposal.formData after complete
{
  // ... existing sections ...

  [SectionId.SEC_HANDOVER_CHECKLIST]: {
    completedAt: "2026-01-10T15:00:00Z",
    checklist: [
      {
        id: 'bao_cao_ket_qua',
        label: 'Báo cáo kết quả',
        checked: true,
        note: 'Đã nộp báo cáo đầy đủ'
      },
      {
        id: 'san_pham_dau_ra',
        label: 'Sản phẩm đầu ra',
        checked: true,
        note: null
      },
      {
        id: 'tai_lieu_huong_dan',
        label: 'Tài liệu hướng dẫn',
        checked: false,
        note: null
      },
      // ...
    ]
  }
}
```

### RBAC Authorization

**Permission Check:**
```typescript
// PROJECT_OWNER is contextual: user.id === proposal.ownerId
// Only the owner of the proposal can complete handover

// ProjectOwnerGuard implementation:
@Injectable()
export class ProjectOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const proposalId = request.params.id;
    const userId = request.user?.id;

    if (!userId) return false;

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { ownerId: true },
    });

    if (!proposal) return false;

    return proposal.ownerId === userId;
  }
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock Prisma transaction
- Test idempotency with duplicate requests
- Test permission check (non-owner cannot complete)
- Test state validation (only HANDOVER → COMPLETED)
- Test validation (at least one item checked)
- Test workflow log creation
- Test completedDate is set correctly
- Test formData update with checklist data

**Frontend Tests:**
- Test panel visibility based on state
- Test checkbox select/deselect functionality
- Test complete button disabled when no items selected
- Test confirm dialog before submission
- Test loading state during API call
- Test UI refresh after success
- Test read-only state when COMPLETED
- Test auto-save for draft checklist

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Bàn giao" (HANDOVER state display)
- "Đã hoàn thành" (COMPLETED state display)
- "Hoàn thành bàn giao" (Complete button)
- "Checklist bàn giao" (Panel title)
- "Báo cáo kết quả" (Checklist item 1)
- "Sản phẩm đầu ra" (Checklist item 2)
- "Tài liệu hướng dẫn" (Checklist item 3)
- "File source code" (Checklist item 4)
- "Các tài liệu khác" (Checklist item 5)
- "Xác nhận hoàn thành bàn giao?" (Confirm dialog)
- "Đã hoàn thành bàn giao" (Timeline entry)
- "Bạn không có quyền thực hiện hành động này" (403 error)
- "Đề tài chưa ở trạng thái bàn giao" (400 error when not HANDOVER)
- "Vui lòng chọn ít nhất một mục" (400 error when no items selected)

### Code Patterns to Follow

**From Story 3.8 (Idempotency):**
```typescript
// Client-side: Generate idempotency key
const idempotencyKey = crypto.randomUUID();

// API call with header
await proposalsApi.completeHandover(proposalId, checklistData, {
  headers: { 'X-Idempotency-Key': idempotencyKey }
});
```

**From Story 2.3 (Auto-save Draft):**
- Reuse debounced auto-save pattern
- Save checklist draft to formData
- Use PATCH endpoint for draft saves

**From Story 5.4 (Atomic Transaction):**
- State change happens atomically with workflow log
- Use Prisma transaction for consistency
- Return complete updated proposal to client

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 6-5 created via create-story workflow. Status: ready-for-dev
- Epic 5 retrospective learnings applied
- IdempotencyInterceptor pattern included
- Atomic transaction pattern specified
- RBAC with ProjectOwnerGuard defined
- Handover checklist structure defined
- completedDate field for Proposal model
- Read-only state after completion
- Auto-save pattern for checklist draft

### File List

**To Create:**
- `qlnckh/apps/src/modules/proposals/dto/complete-handover.dto.ts` - Complete DTO
- `qlnckh/apps/src/modules/proposals/dto/handover-checklist.dto.ts` - Checklist DTO
- `qlnckh/web-apps/src/components/proposal/HandoverChecklistPanel.tsx` - Checklist panel
- `qlnckh/web-apps/src/components/proposal/CompleteHandoverButton.tsx` - Complete button

**To Modify:**
- `qlnckh/apps/src/modules/proposals/proposals.controller.ts` - Add PATCH/POST endpoints
- `qlnckh/apps/src/modules/proposals/proposals.service.ts` - Add completeHandover() method
- `qlnckh/prisma/schema.prisma` - Add completedDate field, SEC_HANDOVER_CHECKLIST
- `qlnckh/web-apps/src/components/proposal/ProposalDetail.tsx` - Add HandoverChecklistPanel
- `qlnckh/web-apps/src/lib/api/proposals.ts` - Add completeHandover(), saveChecklist() API methods
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 5 retrospective learnings incorporated
  - IdempotencyInterceptor pattern from Story 3.8/5.4 applied
  - Atomic transaction pattern from Story 5.4 specified
  - RBAC pattern with ProjectOwnerGuard defined
  - Handover checklist structure with predefined items
  - Auto-save pattern from Story 2.3 referenced
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 6.5](../../planning-artifacts/epics.md#L1852-L1876) - Full requirements
- [epic-5-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-5-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 3.8](../5-6-evaluation-pdf-export.md#L38) - Idempotency pattern reference
- [Story 2.3](../2-3-auto-save-draft.md) - Auto-save draft pattern reference
- [Story 5.4](../5-4-preview-pdf-confirm.md) - Atomic transaction pattern reference
- [Story 6.4](./6-4-school-acceptance-vote.md) - Previous story with HANDOVER state
