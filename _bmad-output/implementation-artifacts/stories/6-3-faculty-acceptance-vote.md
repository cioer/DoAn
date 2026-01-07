# Story 6.3: Faculty Acceptance (Vote)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Quản lý Khoa,
I want nghiệm thu đề tài cấp Khoa,
So that dự án được xác nhận hoàn thành cấp Khoa.

## Acceptance Criteria

1. **AC1: Faculty Acceptance Button Visibility**
   - Given Proposal state = FACULTY_ACCEPTANCE_REVIEW
   - When User với role = QUAN_LY_KHOA mở proposal detail
   - Then UI hiển thị button "Nghiệm thu Khoa" (primary action)
   - And button disabled khi state ≠ FACULTY_ACCEPTANCE_REVIEW
   - And chỉ user với role QUAN_LY_KHOA mới thấy button này

2. **AC2: Faculty Acceptance Form Display**
   - Given User click "Nghiệm thu Khoa"
   - Then Modal hiển thị Faculty Acceptance Review Form với:
     - **Owner Submission Section (read-only):**
       - Kết quả thực hiện (từ SEC_FACULTY_ACCEPTANCE_RESULTS)
       - Sản phẩm đầu ra (từ SEC_FACULTY_ACCEPTANCE_PRODUCTS)
       - Files đính kèm (từ attachments với type="FACULTY_ACCEPTANCE")
     - **Faculty Decision Section:**
       - Kết luận nghiệm thu (radio: Đạt/Không đạt)
       - Ý kiến đánh giá (textarea, optional)
     - Action buttons: "Xác nhận Đạt", "Xác nhận Không đạt", "Hủy"

3. **AC3: Form Validation**
   - Given User đã mở Faculty Acceptance Form
   - When User click confirm button mà chưa chọn kết luận
   - Then UI hiển thị validation error:
     - "Vui lòng chọn kết luận nghiệm thu"
   - And form không submit

4. **AC4: State Transition - Accept (FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW)**
   - Given User chọn "Đạt" và click "Xác nhận Đạt"
   - When action execute (kèm idempotency key)
   - Then proposal.state chuyển từ FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
   - And proposal.holderUnit = PHONG_KHCN
   - And proposal.holderUser = null
   - And formData được lưu với kết luận nghiệm thu
   - And workflow_logs entry ghi action FACULTY_ACCEPT với comments

5. **AC5: State Transition - Reject (FACULTY_ACCEPTANCE_REVIEW → IN_PROGRESS)**
   - Given User chọn "Không đạt" và click "Xác nhận Không đạt"
   - When action execute (kèm idempotency key)
   - Then proposal.state chuyển từ FACULTY_ACCEPTANCE_REVIEW → IN_PROGRESS
   - And proposal.holderUnit = owner_faculty_id
   - And proposal.holderUser = owner_id
   - And formData được lưu với kết luận và lý do không đạt
   - And workflow_logs entry ghi action FACULTY_REJECT với reason

6. **AC6: Idempotency**
   - Given User click confirm nhiều lần
   - When các request có cùng idempotency key
   - Then chỉ thực hiện transition một lần
   - And các request sau đó trả về kết quả đã cached (200 OK)

7. **AC7: UI Update After Decision**
   - Given Faculty acceptance decision thành công
   - When transition hoàn tất
   - Then UI update state badge:
     - "Đạt" → "Nghiệm thu Trường" (SCHOOL_ACCEPTANCE_REVIEW)
     - "Không đạt" → "Đang thực hiện" (IN_PROGRESS)
   - And "Nghiệm thu Khoa" button không còn hiển thị
   - And Timeline hiển thị entry mới với kết luận
   - And Decision badge hiển thị trong proposal detail

8. **AC8: Permission Check**
   - Given User không có role = QUAN_LY_KHOA
   - When User cố gọi faculty acceptance API
   - Then API trả về 403 Forbidden
   - And error message: "Chỉ Quản lý Khoa mới có quyền nghiệm thu"

## Tasks / Subtasks

- [ ] Task 1: Backend - Faculty Acceptance Service (AC: #3, #4, #5, #6, #8)
  - [ ] Add facultyAcceptance() method to ProposalsService
  - [ ] Validate proposal.state = FACULTY_ACCEPTANCE_REVIEW
  - [ ] Validate user.role = QUAN_LY_KHOA
  - [ ] Validate decision (DAT or KHONG_DAT)
  - [ ] Validate Ý kiến is required when KHONG_DAT
  - [ ] Use @UseInterceptors(IdempotencyInterceptor) on controller
  - [ ] Wrap transition in Prisma transaction
  - [ ] Handle DAT case: FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
  - [ ] Handle KHONG_DAT case: FACULTY_ACCEPTANCE_REVIEW → IN_PROGRESS
  - [ ] Update proposal.formData với faculty decision
  - [ ] Update holder rules based on decision
  - [ ] Create workflow_logs entry (FACULTY_ACCEPT hoặc FACULTY_REJECT)
  - [ ] Return updated proposal

- [ ] Task 2: Backend - Acceptance Endpoint (AC: #1, #4, #5, #8)
  - [ ] Create POST /proposals/:id/faculty-acceptance-decision endpoint
  - [ ] Add @UseGuards(JwtAuthGuard) for authentication
  - [ ] Add @UseGuards(RolesGuard) with QUAN_LY_KHOA role check
  - [ ] Apply IdempotencyInterceptor at controller level
  - [ ] Handle idempotency key from X-Idempotency-Key header
  - [ ] Create FacultyAcceptanceDecisionDto
  - [ ] Return 403 if user is not QUAN_LY_KHOA
  - [ ] Return 400 if state ≠ FACULTY_ACCEPTANCE_REVIEW
  - [ ] Return 400 if validation fails (no decision, no reason for reject)
  - [ ] Return 200 with updated proposal on success

- [ ] Task 3: Backend - Get Faculty Acceptance Data Endpoint (AC: #2)
  - [ ] Create GET /proposals/:id/faculty-acceptance-data endpoint
  - [ ] Fetch proposal formData for SEC_FACULTY_ACCEPTANCE_RESULTS và SEC_FACULTY_ACCEPTANCE_PRODUCTS
  - [ ] Fetch attachments with type="FACULTY_ACCEPTANCE"
  - [ ] Return combined data for display
  - [ ] Add role-based access control (QUAN_LY_KHOA, owner, PHONG_KHCN, ADMIN)

- [ ] Task 4: Frontend - Faculty Acceptance Modal (AC: #2, #3)
  - [ ] Create FacultyAcceptanceDecisionModal component
  - [ ] Display owner submission section (read-only)
    - Kết quả thực hiện
    - Sản phẩm đầu ra list
    - Files đính kèm với download links
  - [ ] Add faculty decision section
    - Radio buttons: Đạt/Không đạt
    - Textarea: Ý kiến đánh giá (required when Không đạt)
  - [ ] Implement form validation with Zod
  - [ ] Show loading state during API call
  - [ ] Handle errors gracefully
  - [ ] Close modal on success or cancel

- [ ] Task 5: Frontend - Accept Button Integration (AC: #1, #7)
  - [ ] Add FacultyAcceptanceButton to ProposalDetail
  - [ ] Show "Nghiệm thu Khoa" text with primary style
  - [ ] Disable when proposal.state ≠ FACULTY_ACCEPTANCE_REVIEW
  - [ ] Show only for users with role = QUAN_LY_KHOA
  - [ ] Open FacultyAcceptanceDecisionModal on click
  - [ ] Invalidate queries after success to refresh UI

- [ ] Task 6: Frontend - Timeline & Decision Display (AC: #7)
  - [ ] Timeline component refetches proposal data after action
  - [ ] Add FACULTY_ACCEPT / FACULTY_REJECT timeline entry display
  - [ ] Show decision badge in proposal detail
    - Đạt: green badge with check icon
    - Không đạt: red badge with x icon
  - [ ] Display Ý kiến đánh giá if provided

- [ ] Task 7: Unit Tests (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [ ] Test facultyAcceptance() service method
  - [ ] Test state transition DAT: FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
  - [ ] Test state transition KHONG_DAT: FACULTY_ACCEPTANCE_REVIEW → IN_PROGRESS
  - [ ] Test permission check (only QUAN_LY_KHOA)
  - [ ] Test form validation (decision required, reason required for reject)
  - [ ] Test idempotency (duplicate requests)
  - [ ] Test workflow_log entry creation
  - [ ] Test holder rules for accept (PHONG_KHCN) and reject (owner)
  - [ ] Test formData update with faculty decision

## Dev Notes

### Epic 6 Context

**Epic 6: Acceptance & Handover + Dossier Pack**
- FRs covered: FR28, FR29, FR30, FR31, FR32, FR33, FR41, FR42
- Story 6.1: Start Project (done)
- Story 6.2: Submit Faculty Acceptance Review (done)
- **Story 6.3: Faculty Acceptance Vote (THIS STORY)** - Faculty decides
- Story 6.4: School Acceptance (Vote)
- Story 6.5: Handover + Dossier Pack Checklist
- Story 6.6: ZIP Dossier Pack Export

### Dependencies

**Depends on:**
- Story 6.2 (Submit Faculty Acceptance Review) - Must have FACULTY_ACCEPTANCE_REVIEW state
- Story 3.8 (Idempotency Keys) - Reuse IdempotencyInterceptor pattern
- Story 4.1 (Faculty Approve Action) - Reuse approval pattern

**Enables:**
- Story 6.4 (School Acceptance Vote) - Requires SCHOOL_ACCEPTANCE_REVIEW state

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  proposals/
    proposals.controller.ts   # Add GET/POST endpoints
    proposals.service.ts      # Add facultyAcceptance() method
    dto/
      faculty-acceptance-decision.dto.ts  # New: Decision DTO
  guards/
    roles.guard.ts            # Reuse for QUAN_LY_KHOA check
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    proposal/
      FacultyAcceptanceDecisionModal.tsx  # New: Decision modal
      FacultyAcceptanceButton.tsx         # New: Accept button
      ProposalDetail.tsx                   # Add FacultyAcceptanceButton
  lib/api/
    proposals.ts                            # Add facultyAcceptance() API method
```

### Epic 5 Retro Learnings to Apply

From `epic-5-retro-2026-01-07.md`:

1. **IdempotencyInterceptor Pattern (Story 5.4 fix):**
   ```typescript
   @UseInterceptors(IdempotencyInterceptor) // Reused from Epic 3
   @Controller('proposals')
   export class ProposalsController {
     @Post(':id/faculty-acceptance-decision')
     async facultyAcceptance(@Param('id') id: string) { ... }
   }
   ```
   - Critical: Must apply interceptor at controller level or endpoint level
   - Client must send X-Idempotency-Key header with UUID v4

2. **Atomic Transaction Pattern (Story 5.4):**
   ```typescript
   return this.prisma.$transaction(async (tx) => {
     // 1. Update proposal state based on decision
     const proposal = await tx.proposal.update({
       where: { id: proposalId },
       data: {
         state: decision === 'DAT'
           ? ProjectState.SCHOOL_ACCEPTANCE_REVIEW
           : ProjectState.IN_PROGRESS,
         holderUnit: decision === 'DAT' ? 'PHONG_KHCN' : proposal.facultyId,
         holderUser: decision === 'DAT' ? null : proposal.ownerId,
       },
     });

     // 2. Update formData with faculty decision
     await tx.proposal.update({...});

     // 3. Create workflow log entry
     await tx.workflowLog.create({
       action: decision === 'DAT'
         ? WorkflowAction.FACULTY_ACCEPT
         : WorkflowAction.FACULTY_REJECT,
       // ...
     });

     return proposal;
   });
   ```

3. **RBAC Pattern from Story 5.6:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(RolesGuard)
   @RequireRoles(UserRole.QUAN_LY_KHOA)
   @Post(':id/faculty-acceptance-decision')
   async facultyAcceptance(@Param('id') id: string, @CurrentUser() user: User) {
     // Guard handles authorization, service handles business logic
   }
   ```

### Architecture Compliance

**State Machine Rules (from architecture.md):**
- FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW (Đạt - Phase C → Phase D)
- FACULTY_ACCEPTANCE_REVIEW → IN_PROGRESS (Không đạt - return to Phase B)
- holderUnit = PHONG_KHCN (when Đạt - passes to school level)
- holderUnit = facultyId, holderUser = ownerId (when Không đạt - returns to PI)
- SLA tracking resets for school-level acceptance

**WorkflowAction Enum:**
- FACULTY_ACCEPT action added in Epic 6 (when Đạt)
- FACULTY_REJECT action added in Epic 6 (when Không đạt)
- Both must be logged to workflow_logs for audit trail

**API Response Format:**
```typescript
// Success
{ success: true, data: { proposal: {...} }, meta: {...} }

// Error
{ success: false, error: { code: "FORBIDDEN", message: "Chỉ Quản lý Khoa mới có quyền nghiệm thu" } }
```

### Data Model

**Service Method Signature:**
```typescript
/**
 * Process faculty acceptance decision
 * @param proposalId - Proposal UUID
 * @param userId - User ID (QUAN_LY_KHOA)
 * @param dto - Faculty acceptance decision
 * @returns Updated proposal
 */
async facultyAcceptance(
  proposalId: string,
  userId: string,
  dto: FacultyAcceptanceDecisionDto
): Promise<Proposal>
```

**DTO Structure:**
```typescript
export class FacultyAcceptanceDecisionDto {
  @IsEnum(FacultyDecision)
  @IsNotEmpty()
  decision: FacultyDecision; // DAT or KHONG_DAT

  @IsString()
  @IsOptional()
  comments?: string; // Ý kiến đánh giá (required when KHONG_DAT)
}

enum FacultyDecision {
  DAT = 'DAT',                // Đạt
  KHONG_DAT = 'KHONG_DAT',    // Không đạt
}
```

**Workflow Log Entry (Đạt):**
```typescript
await tx.workflowLog.create({
  proposalId,
  action: 'FACULTY_ACCEPT',
  fromState: 'FACULTY_ACCEPTANCE_REVIEW',
  toState: 'SCHOOL_ACCEPTANCE_REVIEW',
  actorId: userId,
  actorName: user.displayName,
  comment: dto.comments || null,
  timestamp: new Date(),
});
```

**Workflow Log Entry (Không đạt):**
```typescript
await tx.workflowLog.create({
  proposalId,
  action: 'FACULTY_REJECT',
  fromState: 'FACULTY_ACCEPTANCE_REVIEW',
  toState: 'IN_PROGRESS',
  actorId: userId,
  actorName: user.displayName,
  comment: dto.comments, // Required for reject
  timestamp: new Date(),
});
```

**FormData Structure (after decision):**
```typescript
// proposal.formData after faculty decision
{
  // ... existing sections ...

  [SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS]: {
    results: "Kết quả thực hiện đề tài...",
    submittedAt: "2026-01-07T10:00:00Z",
    facultyDecision: {
      decision: "DAT", // or "KHONG_DAT"
      decidedBy: "user-id",
      decidedByName: "Nguyễn Văn A",
      decidedAt: "2026-01-08T14:30:00Z",
      comments: "Đề tài đạt yêu cầu, cho phép nghiệm thu cấp Trường"
    }
  },

  [SectionId.SEC_FACULTY_ACCEPTANCE_PRODUCTS]: {
    products: [...]
  }
}
```

### RBAC Authorization

**Permission Check:**
```typescript
// Only QUAN_LY_KHOA can perform faculty acceptance
// Using RolesGuard with role check

@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.QUAN_LY_KHOA)
@Post(':id/faculty-acceptance-decision')
async facultyAcceptance(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Body() dto: FacultyAcceptanceDecisionDto
) {
  // Guard handles authorization, service handles business logic
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock Prisma transaction
- Test idempotency with duplicate requests
- Test permission check (only QUAN_LY_KHOA)
- Test state validation (only FACULTY_ACCEPTANCE_REVIEW)
- Test form validation (decision required, comments required for KHONG_DAT)
- Test workflow log creation for both DAT and KHONG_DAT
- Test holder rules (accept → PHONG_KHCN, reject → owner)

**Frontend Tests:**
- Test modal visibility based on role
- Test form validation (decision required)
- Test comments required when KHONG_DAT
- Test loading state during API call
- Test UI refresh after success
- Test error handling (403, 400)

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Nghiệm thu Khoa" (Accept button)
- "Nghiệm thu Trường" (SCHOOL_ACCEPTANCE_REVIEW state display)
- "Đang thực hiện" (IN_PROGRESS state display when rejected)
- "Đã nghiệm thu cấp Khoa" / "Đã trả về yêu cầu sửa" (Timeline entry)
- "Chỉ Quản lý Khoa mới có quyền nghiệm thu" (403 error)
- "Đề tài chưa ở trạng thái nghiệm thu Khoa" (400 error when not FACULTY_ACCEPTANCE_REVIEW)
- "Kết quả thực hiện" (Results label)
- "Sản phẩm đầu ra" (Products label)
- "Kết luận nghiệm thu" (Decision label)
- "Đạt", "Không đạt" (Decision options)
- "Ý kiến đánh giá" (Comments label)
- "Xác nhận Đạt", "Xác nhận Không đạt" (Confirm buttons)
- "Vui lòng chọn kết luận nghiệm thu" (Validation error)
- "Vui lòng nhập lý do không đạt" (Validation error)

### Code Patterns to Follow

**From Story 3.8 (Idempotency):**
```typescript
// Client-side: Generate idempotency key
const idempotencyKey = crypto.randomUUID();

// API call with header
await proposalsApi.facultyAcceptance(proposalId, decision, {
  headers: { 'X-Idempotency-Key': idempotencyKey }
});
```

**From Story 4.1 (Faculty Approve Action):**
- Similar approval pattern
- Role-based access control
- State transition with workflow log

**From Story 5.4 (Atomic Transaction):**
- State change happens atomically with workflow log
- Use Prisma transaction for consistency
- Return complete updated proposal to client

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 6-3 created via create-story workflow. Status: ready-for-dev
- Epic 5 retrospective learnings applied
- IdempotencyInterceptor pattern included
- Atomic transaction pattern specified
- RBAC with RolesGuard for QUAN_LY_KHOA defined
- Dual state transitions (accept → school, reject → back to progress)
- Faculty decision data structure defined
- Comments required for reject pattern

### File List

**To Create:**
- `qlnckh/apps/src/modules/proposals/dto/faculty-acceptance-decision.dto.ts` - Decision DTO
- `qlnckh/web-apps/src/components/proposal/FacultyAcceptanceDecisionModal.tsx` - Decision modal
- `qlnckh/web-apps/src/components/proposal/FacultyAcceptanceButton.tsx` - Accept button

**To Modify:**
- `qlnckh/apps/src/modules/proposals/proposals.controller.ts` - Add GET/POST endpoints
- `qlnckh/apps/src/modules/proposals/proposals.service.ts` - Add facultyAcceptance() method
- `qlnckh/apps/src/modules/proposals/guards/roles.guard.ts` - Verify QUAN_LY_KHOA role check
- `qlnckh/web-apps/src/components/proposal/ProposalDetail.tsx` - Add FacultyAcceptanceButton
- `qlnckh/web-apps/src/lib/api/proposals.ts` - Add facultyAcceptance() API method
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 5 retrospective learnings incorporated
  - IdempotencyInterceptor pattern from Story 3.8/5.4 applied
  - Atomic transaction pattern from Story 5.4 specified
  - RBAC pattern with RolesGuard defined
  - Dual outcome design (accept → school, reject → back to progress)
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 6.3](../../planning-artifacts/epics.md#L1785-L1816) - Full requirements
- [epic-5-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-5-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 3.8](../5-6-evaluation-pdf-export.md#L38) - Idempotency pattern reference
- [Story 4.1](../4-1-faculty-approve-action.md) - Faculty approval pattern reference
- [Story 5.4](../5-4-preview-pdf-confirm.md) - Atomic transaction pattern reference
- [Story 6.2](./6-2-submit-faculty-acceptance-review.md) - Previous story with acceptance data
