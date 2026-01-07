# Story 6.4: School Acceptance (Vote)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a PKHCN/Thư ký HĐ,
I want nghiệm thu đề tài cấp Trường,
So that dự án được xác nhận hoàn thành cấp Trường.

## Acceptance Criteria

1. **AC1: School Acceptance Button Visibility**
   - Given Proposal state = SCHOOL_ACCEPTANCE_REVIEW
   - When User với role phù hợp (PHONG_KHCN, THU_KY_HOI_DONG, ADMIN) mở proposal detail
   - Then UI hiển thị button "Nghiệm thu Trường" (primary action)
   - And button disabled khi state ≠ SCHOOL_ACCEPTANCE_REVIEW
   - And chỉ user với roles phù hợp mới thấy button này

2. **AC2: School Acceptance Form Display**
   - Given User click "Nghiệm thu Trường"
   - Then Modal hiển thị School Acceptance Review Form với:
     - **Faculty Acceptance Section (read-only):**
       - Kết quả cấp Khoa (từ facultyDecision trong SEC_FACULTY_ACCEPTANCE_RESULTS)
       - Kết luận cấp Khoa (Đạt/Không đạt)
       - Ý kiến cấp Khoa (nếu có)
     - **School Decision Section:**
       - Kết luận nghiệm thu cấp Trường (radio: Đạt/Không đạt)
       - Ý kiến đánh giá (textarea, optional)
     - Action buttons: "Xác nhận Đạt", "Xác nhận Không đạt", "Hủy"

3. **AC3: Form Validation**
   - Given User đã mở School Acceptance Form
   - When User click confirm button mà chưa chọn kết luận
   - Then UI hiển thị validation error:
     - "Vui lòng chọn kết luận nghiệm thu"
   - And form không submit

4. **AC4: State Transition - Accept (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)**
   - Given User chọn "Đạt" và click "Xác nhận Đạt"
   - When action execute (kèm idempotency key)
   - Then proposal.state chuyển từ SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
   - And proposal.holderUnit = owner_faculty_id
   - And proposal.holderUser = owner_id
   - And formData được lưu với kết luận nghiệm thu cấp Trường
   - And workflow_logs entry ghi action SCHOOL_ACCEPT

5. **AC5: State Transition - Reject (SCHOOL_ACCEPTANCE_REVIEW → IN_PROGRESS)**
   - Given User chọn "Không đạt" và click "Xác nhận Không đạt"
   - When action execute (kèm idempotency key)
   - Then proposal.state chuyển từ SCHOOL_ACCEPTANCE_REVIEW → IN_PROGRESS
   - And proposal.holderUnit = owner_faculty_id
   - And proposal.holderUser = owner_id
   - And formData được lưu với kết luận và lý do không đạt
   - And workflow_logs entry ghi action SCHOOL_REJECT với reason

6. **AC6: Idempotency**
   - Given User click confirm nhiều lần
   - When các request có cùng idempotency key
   - Then chỉ thực hiện transition một lần
   - And các request sau đó trả về kết quả đã cached (200 OK)

7. **AC7: UI Update After Decision**
   - Given School acceptance decision thành công
   - When transition hoàn tất
   - Then UI update state badge:
     - "Đạt" → "Bàn giao" (HANDOVER)
     - "Không đạt" → "Đang thực hiện" (IN_PROGRESS)
   - And "Nghiệm thu Trường" button không còn hiển thị
   - And Timeline hiển thị entry mới với kết luận
   - And Decision badge hiển thị trong proposal detail

8. **AC8: Permission Check**
   - Given User không có role phù hợp (PHONG_KHCN, THU_KY_HOI_DONG, ADMIN)
   - When User cố gọi school acceptance API
   - Then API trả về 403 Forbidden
   - And error message: "Bạn không có quyền nghiệm thu cấp Trường"

## Tasks / Subtasks

- [ ] Task 1: Backend - School Acceptance Service (AC: #3, #4, #5, #6, #8)
  - [ ] Add schoolAcceptance() method to ProposalsService
  - [ ] Validate proposal.state = SCHOOL_ACCEPTANCE_REVIEW
  - [ ] Validate user.role in [PHONG_KHCN, THU_KY_HOI_DONG, ADMIN]
  - [ ] Validate decision (DAT or KHONG_DAT)
  - [ ] Validate Ý kiến is required when KHONG_DAT
  - [ ] Use @UseInterceptors(IdempotencyInterceptor) on controller
  - [ ] Wrap transition in Prisma transaction
  - [ ] Handle DAT case: SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
  - [ ] Handle KHONG_DAT case: SCHOOL_ACCEPTANCE_REVIEW → IN_PROGRESS
  - [ ] Update proposal.formData với school decision
  - [ ] Update holder rules (both cases return to owner)
  - [ ] Create workflow_logs entry (SCHOOL_ACCEPT hoặc SCHOOL_REJECT)
  - [ ] Return updated proposal

- [ ] Task 2: Backend - Acceptance Endpoint (AC: #1, #4, #5, #8)
  - [ ] Create POST /proposals/:id/school-acceptance-decision endpoint
  - [ ] Add @UseGuards(JwtAuthGuard) for authentication
  - [ ] Add @UseGuards(RolesGuard) with allowed roles
  - [ ] Apply IdempotencyInterceptor at controller level
  - [ ] Handle idempotency key from X-Idempotency-Key header
  - [ ] Create SchoolAcceptanceDecisionDto
  - [ ] Return 403 if user is not in allowed roles
  - [ ] Return 400 if state ≠ SCHOOL_ACCEPTANCE_REVIEW
  - [ ] Return 400 if validation fails (no decision, no reason for reject)
  - [ ] Return 200 with updated proposal on success

- [ ] Task 3: Backend - Get School Acceptance Data Endpoint (AC: #2)
  - [ ] Create GET /proposals/:id/school-acceptance-data endpoint
  - [ ] Fetch proposal formData for faculty decision
  - [ ] Fetch workflow logs for faculty acceptance action
  - [ ] Return combined data for display
  - [ ] Add role-based access control (PHONG_KHCN, THU_KY_HOI_DONG, ADMIN, owner)

- [ ] Task 4: Frontend - School Acceptance Modal (AC: #2, #3)
  - [ ] Create SchoolAcceptanceDecisionModal component
  - [ ] Display faculty acceptance section (read-only)
    - Kết quả cấp Khoa
    - Kết luận cấp Khoa (Đạt/Không đạt badge)
    - Ý kiến cấp Khoa
  - [ ] Add school decision section
    - Radio buttons: Đạt/Không đạt
    - Textarea: Ý kiến đánh giá (required when Không đạt)
  - [ ] Implement form validation with Zod
  - [ ] Show loading state during API call
  - [ ] Handle errors gracefully
  - [ ] Close modal on success or cancel

- [ ] Task 5: Frontend - Accept Button Integration (AC: #1, #7)
  - [ ] Add SchoolAcceptanceButton to ProposalDetail
  - [ ] Show "Nghiệm thu Trường" text with primary style
  - [ ] Disable when proposal.state ≠ SCHOOL_ACCEPTANCE_REVIEW
  - [ ] Show only for users with allowed roles
  - [ ] Open SchoolAcceptanceDecisionModal on click
  - [ ] Invalidate queries after success to refresh UI

- [ ] Task 6: Frontend - Timeline & Decision Display (AC: #7)
  - [ ] Timeline component refetches proposal data after action
  - [ ] Add SCHOOL_ACCEPT / SCHOOL_REJECT timeline entry display
  - [ ] Show decision badge in proposal detail
    - Đạt: green badge with check icon
    - Không đạt: red badge with x icon
  - [ ] Display Ý kiến đánh giá if provided

- [ ] Task 7: Unit Tests (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [ ] Test schoolAcceptance() service method
  - [ ] Test state transition DAT: SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
  - [ ] Test state transition KHONG_DAT: SCHOOL_ACCEPTANCE_REVIEW → IN_PROGRESS
  - [ ] Test permission check (only PHONG_KHCN, THU_KY_HOI_DONG, ADMIN)
  - [ ] Test form validation (decision required, reason required for reject)
  - [ ] Test idempotency (duplicate requests)
  - [ ] Test workflow_log entry creation
  - [ ] Test holder rules (both return to owner)
  - [ ] Test formData update with school decision

## Dev Notes

### Epic 6 Context

**Epic 6: Acceptance & Handover + Dossier Pack**
- FRs covered: FR28, FR29, FR30, FR31, FR32, FR33, FR41, FR42
- Story 6.1: Start Project (done)
- Story 6.2: Submit Faculty Acceptance Review (done)
- Story 6.3: Faculty Acceptance Vote (done)
- **Story 6.4: School Acceptance Vote (THIS STORY)** - School decides
- Story 6.5: Handover + Dossier Pack Checklist
- Story 6.6: ZIP Dossier Pack Export

### Dependencies

**Depends on:**
- Story 6.3 (Faculty Acceptance Vote) - Must have SCHOOL_ACCEPTANCE_REVIEW state
- Story 3.8 (Idempotency Keys) - Reuse IdempotencyInterceptor pattern
- Story 4.1 (Faculty Approve Action) - Reuse approval pattern
- Story 6.3 (Faculty Acceptance) - Reference faculty decision data

**Enables:**
- Story 6.5 (Handover + Dossier Pack Checklist) - Requires HANDOVER state

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  proposals/
    proposals.controller.ts   # Add GET/POST endpoints
    proposals.service.ts      # Add schoolAcceptance() method
    dto/
      school-acceptance-decision.dto.ts   # New: Decision DTO
  guards/
    roles.guard.ts            # Reuse for role check
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    proposal/
      SchoolAcceptanceDecisionModal.tsx  # New: Decision modal
      SchoolAcceptanceButton.tsx         # New: Accept button
      ProposalDetail.tsx                  # Add SchoolAcceptanceButton
  lib/api/
    proposals.ts                            # Add schoolAcceptance() API method
```

### Epic 5 Retro Learnings to Apply

From `epic-5-retro-2026-01-07.md`:

1. **IdempotencyInterceptor Pattern (Story 5.4 fix):**
   ```typescript
   @UseInterceptors(IdempotencyInterceptor) // Reused from Epic 3
   @Controller('proposals')
   export class ProposalsController {
     @Post(':id/school-acceptance-decision')
     async schoolAcceptance(@Param('id') id: string) { ... }
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
           ? ProjectState.HANDOVER
           : ProjectState.IN_PROGRESS,
         holderUnit: proposal.facultyId,
         holderUser: proposal.ownerId,
       },
     });

     // 2. Update formData with school decision
     await tx.proposal.update({...});

     // 3. Create workflow log entry
     await tx.workflowLog.create({
       action: decision === 'DAT'
         ? WorkflowAction.SCHOOL_ACCEPT
         : WorkflowAction.SCHOOL_REJECT,
       // ...
     });

     return proposal;
   });
   ```

3. **RBAC Pattern from Story 5.6:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(RolesGuard)
   @RequireRoles(UserRole.PHONG_KHCN, UserRole.THU_KY_HOI_DONG, UserRole.ADMIN)
   @Post(':id/school-acceptance-decision')
   async schoolAcceptance(@Param('id') id: string, @CurrentUser() user: User) {
     // Guard handles authorization, service handles business logic
   }
   ```

### Architecture Compliance

**State Machine Rules (from architecture.md):**
- SCHOOL_ACCEPTANCE_REVIEW → HANDOVER (Đạt - Phase D → Phase E)
- SCHOOL_ACCEPTANCE_REVIEW → IN_PROGRESS (Không đạt - return to Phase B)
- holderUnit = facultyId, holderUser = ownerId (both cases return to PI)
- SLA tracking completes when reaching HANDOVER

**WorkflowAction Enum:**
- SCHOOL_ACCEPT action added in Epic 6 (when Đạt)
- SCHOOL_REJECT action added in Epic 6 (when Không đạt)
- Both must be logged to workflow_logs for audit trail

**API Response Format:**
```typescript
// Success
{ success: true, data: { proposal: {...} }, meta: {...} }

// Error
{ success: false, error: { code: "FORBIDDEN", message: "Bạn không có quyền nghiệm thu cấp Trường" } }
```

### Data Model

**Service Method Signature:**
```typescript
/**
 * Process school acceptance decision
 * @param proposalId - Proposal UUID
 * @param userId - User ID (PHONG_KHCN, THU_KY_HOI_DONG, or ADMIN)
 * @param dto - School acceptance decision
 * @returns Updated proposal
 */
async schoolAcceptance(
  proposalId: string,
  userId: string,
  dto: SchoolAcceptanceDecisionDto
): Promise<Proposal>
```

**DTO Structure:**
```typescript
export class SchoolAcceptanceDecisionDto {
  @IsEnum(SchoolDecision)
  @IsNotEmpty()
  decision: SchoolDecision; // DAT or KHONG_DAT

  @IsString()
  @IsOptional()
  comments?: string; // Ý kiến đánh giá (required when KHONG_DAT)
}

enum SchoolDecision {
  DAT = 'DAT',                // Đạt
  KHONG_DAT = 'KHONG_DAT',    // Không đạt
}
```

**Workflow Log Entry (Đạt):**
```typescript
await tx.workflowLog.create({
  proposalId,
  action: 'SCHOOL_ACCEPT',
  fromState: 'SCHOOL_ACCEPTANCE_REVIEW',
  toState: 'HANDOVER',
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
  action: 'SCHOOL_REJECT',
  fromState: 'SCHOOL_ACCEPTANCE_REVIEW',
  toState: 'IN_PROGRESS',
  actorId: userId,
  actorName: user.displayName,
  comment: dto.comments, // Required for reject
  timestamp: new Date(),
});
```

**FormData Structure (after decision):**
```typescript
// proposal.formData after school decision
{
  // ... existing sections ...

  [SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS]: {
    results: "Kết quả thực hiện đề tài...",
    submittedAt: "2026-01-07T10:00:00Z",
    facultyDecision: {
      decision: "DAT",
      decidedBy: "user-id",
      decidedByName: "Nguyễn Văn A",
      decidedAt: "2026-01-08T14:30:00Z",
      comments: "Đề tài đạt yêu cầu"
    },
    schoolDecision: {
      decision: "DAT", // or "KHONG_DAT"
      decidedBy: "user-id-2",
      decidedByName: "Trần Thị B",
      decidedAt: "2026-01-10T09:15:00Z",
      comments: "Đồng ý với kết luận của Khoa"
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
// PHONG_KHCN, THU_KY_HOI_DONG, or ADMIN can perform school acceptance
// Using RolesGuard with multiple roles

@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PHONG_KHCN, UserRole.THU_KY_HOI_DONG, UserRole.ADMIN)
@Post(':id/school-acceptance-decision')
async schoolAcceptance(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Body() dto: SchoolAcceptanceDecisionDto
) {
  // Guard handles authorization, service handles business logic
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock Prisma transaction
- Test idempotency with duplicate requests
- Test permission check (only PHONG_KHCN, THU_KY_HOI_DONG, ADMIN)
- Test state validation (only SCHOOL_ACCEPTANCE_REVIEW)
- Test form validation (decision required, comments required for KHONG_DAT)
- Test workflow log creation for both DAT and KHONG_DAT
- Test holder rules (both return to owner)

**Frontend Tests:**
- Test modal visibility based on role
- Test form validation (decision required)
- Test comments required when KHONG_DAT
- Test loading state during API call
- Test UI refresh after success
- Test error handling (403, 400)

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Nghiệm thu Trường" (Accept button)
- "Bàn giao" (HANDOVER state display)
- "Đang thực hiện" (IN_PROGRESS state display when rejected)
- "Đã nghiệm thu cấp Trường" / "Đã trả về yêu cầu sửa" (Timeline entry)
- "Bạn không có quyền nghiệm thu cấp Trường" (403 error)
- "Đề tài chưa ở trạng thái nghiệm thu Trường" (400 error when not SCHOOL_ACCEPTANCE_REVIEW)
- "Kết quả cấp Khoa" (Faculty results label)
- "Kết luận cấp Khoa" (Faculty decision label)
- "Kết luận nghiệm thu cấp Trường" (School decision label)
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
await proposalsApi.schoolAcceptance(proposalId, decision, {
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

**From Story 6.3 (Faculty Acceptance):**
- Similar decision modal pattern
- Display previous level decision (faculty)
- Comments required for reject

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 6-4 created via create-story workflow. Status: ready-for-dev
- Epic 5 retrospective learnings applied
- IdempotencyInterceptor pattern included
- Atomic transaction pattern specified
- RBAC with RolesGuard for multiple roles defined
- Dual state transitions (accept → handover, reject → back to progress)
- School decision data structure defined
- Both accept/reject return to owner (unlike faculty accept)

### File List

**To Create:**
- `qlnckh/apps/src/modules/proposals/dto/school-acceptance-decision.dto.ts` - Decision DTO
- `qlnckh/web-apps/src/components/proposal/SchoolAcceptanceDecisionModal.tsx` - Decision modal
- `qlnckh/web-apps/src/components/proposal/SchoolAcceptanceButton.tsx` - Accept button

**To Modify:**
- `qlnckh/apps/src/modules/proposals/proposals.controller.ts` - Add GET/POST endpoints
- `qlnckh/apps/src/modules/proposals/proposals.service.ts` - Add schoolAcceptance() method
- `qlnckh/apps/src/modules/proposals/guards/roles.guard.ts` - Verify multi-role check
- `qlnckh/web-apps/src/components/proposal/ProposalDetail.tsx` - Add SchoolAcceptanceButton
- `qlnckh/web-apps/src/lib/api/proposals.ts` - Add schoolAcceptance() API method
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 5 retrospective learnings incorporated
  - IdempotencyInterceptor pattern from Story 3.8/5.4 applied
  - Atomic transaction pattern from Story 5.4 specified
  - RBAC pattern with RolesGuard for multiple roles defined
  - Dual outcome design (accept → handover, reject → back to progress)
  - Both outcomes return to owner (PI)
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 6.4](../../planning-artifacts/epics.md#L1819-L1849) - Full requirements
- [epic-5-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-5-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 3.8](../5-6-evaluation-pdf-export.md#L38) - Idempotency pattern reference
- [Story 4.1](../4-1-faculty-approve-action.md) - Approval pattern reference
- [Story 5.4](../5-4-preview-pdf-confirm.md) - Atomic transaction pattern reference
- [Story 6.3](./6-3-faculty-acceptance-vote.md) - Previous story with faculty acceptance
