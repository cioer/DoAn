# Story 5.5: Finalize → Read-Only (Submit ONCE Lock)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Hệ thống,
I want khóa evaluation sau khi finalized,
So that không ai có thể edit sau khi đã nộp.

## Acceptance Criteria

1. **AC1: Read-Only UI Mode**
   - Given Evaluation state = FINALIZED
   - When User (bao gồm secretary) mở evaluation form
   - Then UI hiển thị form ở read-only mode
   - And tất cả input fields bị disabled
   - And không có button "Lưu" hay "Sửa"
   - And hiển thị "Đã nộp" badge với timestamp

2. **AC2: API Write Protection**
   - Given Evaluation state = FINALIZED
   - When User cố gọi PATCH API để sửa
   - Then API trả 403 Forbidden
   - And error message: "Đánh giá đã hoàn tất. Không thể chỉnh sửa."

3. **AC3: Proposal State Transition (Already Implemented in Story 5.4)**
   - Note: The proposal state transition happens during submitEvaluation (Story 5.4)
   - When evaluation finalize completes, proposal.state → APPROVED
   - proposal.holder_unit → owner_faculty_id (về lại giảng viên)
   - proposal.holder_user → owner_id
   - workflow_logs entry: EVALUATION_COMPLETE

## Tasks / Subtasks

- [x] Task 1: Backend - Verify Proposal State Transition (AC: #3)
  - [x] Verify submitEvaluation includes proposal transition (from Story 5.4)
  - [x] Test transaction rollback on error
  - [x] Verify workflow_logs entry: EVALUATION_COMPLETE
  - [x] NO CODE CHANGES NEEDED if Story 5.4 completed correctly

- [x] Task 2: Backend - Enforce Read-Only at API Level (AC: #2)
  - [x] Add state check in updateEvaluation method
  - [x] Return 403 Forbidden if evaluation.state = FINALIZED
  - [x] Error message: "Đánh giá đã hoàn tất. Không thể chỉnh sửa."
  - [x] Add unit test for 403 response

- [x] Task 3: Frontend - Read-Only Mode Display (AC: #1)
  - [x] Update EvaluationForm to check evaluation.state
  - [x] Disable all sliders (inputs) when FINALIZED
  - [x] Disable all textareas when FINALIZED
  - [x] Disable radio buttons when FINALIZED
  - [x] Hide "Hoàn tất" button when FINALIZED
  - [x] Hide auto-save status when FINALIZED

- [x] Task 4: Frontend - Submitted Badge Display (AC: #1)
  - [x] Create SubmittedBadge component
  - [x] Display "Đã nộp" text with green checkmark
  - [x] Show submittedAt timestamp in Vietnamese format
  - [x] Position badge prominently at top of form

- [x] Task 5: Frontend - Auto-Save Disable (AC: #1)
  - [x] Disable auto-save when state = FINALIZED
  - [x] Clear localStorage draft if exists
  - [x] Prevent save API calls

- [x] Task 6: Unit Tests (AC: #1, #2, #3)
  - [x] Test proposal state transition on evaluation finalize
  - [x] Test holder rules: holder_unit → owner_faculty_id
  - [x] Test holder_user → owner_id
  - [x] Test workflow_logs entry: EVALUATION_COMPLETE
  - [x] Test PATCH returns 403 when FINALIZED
  - [x] Test read-only UI rendering
  - [x] Test SubmittedBadge display

## Dev Notes

### Architecture References

**State Machine (from architecture.md):**
```
OUTLINE_COUNCIL_REVIEW → (evaluation finalized) → APPROVED
```

**Holder Rules (UX-3 from architecture.md):**
- After council evaluation completes: holder returns to PROJECT_OWNER
- This allows PI to see "Đã duyệt" status and proceed with implementation

**API Response Format (from project-context.md):**
```typescript
// Error when trying to edit finalized evaluation
{
  success: false,
  error: {
    code: "EVALUATION_FINALIZED",
    message: "Đánh giá đã hoàn tất. Không thể chỉnh sửa."
  }
}
```

### Epic 5 Context

**Epic 5: School Ops + Council Review**
- FRs covered: FR22, FR23, FR24, FR25, FR26, FR27, FR28
- Story 5.1: School Selection Queue (done)
- Story 5.2: Council Assignment (done)
- Story 5.3: Evaluation Form Draft (done)
- Story 5.4: Preview PDF + Confirm Gate (done) - Submit ONCE
- **Story 5.5: Finalize → Read-Only (THIS STORY)** - Lock evaluation, transition proposal
- Story 5.6: Evaluation PDF Export - Generate final PDF

### Dependencies

**Depends on:**
- Story 5.4 (Preview PDF + Confirm) - Must have FINALIZED state and submit endpoint

**Enables:**
- Story 5.6 (Evaluation PDF Export) - Finalized evaluations can be exported
- Epic 6 (Acceptance & Handover) - Proposal in APPROVED state

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  evaluations/
    evaluations.service.ts      # Update updateEvaluation() for 403 check
                                # submitEvaluation() already has proposal transition from Story 5.4
```

**Frontend Structure:**
```
qlnckh/web-apps/src/components/
  evaluation/
    EvaluationForm.tsx          # Add read-only mode
    SubmittedBadge.tsx          # New: "Đã nộp" badge
```

### Data Flow

**Submit Flow (Story 5.4 → Story 5.5):**
```
1. User clicks "Xác nhận và nộp" in Preview Modal
2. Client calls POST /evaluations/:proposalId/submit
3. Server validates:
   - proposal.state = OUTLINE_COUNCIL_REVIEW
   - evaluation.state = DRAFT
   - proposal.holder_user = current user
4. Server executes transaction:
   a. evaluation.state: DRAFT → FINALIZED
   b. proposal.state: OUTLINE_COUNCIL_REVIEW → APPROVED
   c. proposal.holder_unit → owner_faculty_id
   d. proposal.holder_user → owner_id
   e. workflow_logs: EVALUATION_COMPLETE
5. Return success with updated data
```

### Proposal State Transition

**Before (Story 5.3):**
```
proposal.state = OUTLINE_COUNCIL_REVIEW
proposal.holder_unit = council_id
proposal.holder_user = secretary_id
```

**After (Story 5.5):**
```
proposal.state = APPROVED
proposal.holder_unit = owner_faculty_id (Khoa của PI)
proposal.holder_user = owner_id (PI)
```

This transition allows the PI to:
- See the proposal in their queue
- View the evaluation result
- Proceed to start implementation (Story 6.1)

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Test transaction rollback on error
- Test proposal state transition
- Test holder rules application
- Test workflow_logs entry

**Frontend Tests:**
- Test read-only mode rendering
- Test all inputs are disabled
- Test SubmittedBadge display
- Test "Hoàn tất" button is hidden
- Test auto-save is disabled

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Đã nộp" (Submitted badge)
- "Đánh giá đã hoàn tất. Không thể chỉnh sửa." (Error message)
- "Đã nộp vào HH:mm:ss ngày dd/mm/yyyy" (Full timestamp)
- "Phiếu đánh giá" (Evaluation form title)

### Code Patterns to Follow

**From Story 5.4 (Submit ONCE):**
- Idempotency key already implemented
- FINALIZED state already added to enum
- Submit endpoint already exists

**From Epic 4 (Faculty Return):**
- Read-only mode pattern from RevisionPanel
- Badge component styling

**Transaction Pattern (NestJS + Prisma):**
```typescript
async submitEvaluation(proposalId: string, evaluatorId: string, idempotencyKey: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Finalize evaluation
    const evaluation = await tx.evaluation.update({...});

    // 2. Transition proposal
    const proposal = await tx.proposal.update({
      where: { id: proposalId },
      data: {
        state: ProjectState.APPROVED,
        holderUnit: evaluation.proposal.ownerFacultyId,
        holderUser: evaluation.proposal.ownerId,
      },
    });

    // 3. Log workflow
    await tx.workflowLog.create({
      data: {
        eventType: 'EVALUATION_COMPLETE',
        entityId: proposalId,
        // ...
      },
    });

    return { evaluation, proposal };
  });
}
```

### RBAC Pattern

```typescript
// Read-only display is available to all authenticated users
// Only THU_KY_HOI_DONG could submit (Story 5.4)
// After FINALIZED, no one can edit regardless of role
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 5-5 created via create-story workflow. Status: ready-for-dev

### File List

**To Create:**
- `qlnckh/web-apps/src/components/evaluation/SubmittedBadge.tsx` - "Đã nộp" badge component

**To Modify:**
- `qlnckh/apps/src/modules/evaluations/evaluations.service.ts` - Add 403 check in updateEvaluation()
- `qlnckh/web-apps/src/components/evaluation/EvaluationForm.tsx` - Add read-only mode
- `qlnckh/web-apps/src/lib/api/evaluations.ts` - Update types if needed
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status to in-progress when starting, done when complete

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 5 context analyzed from epics.md
  - Previous story (5-4) learnings incorporated
  - Architecture patterns for state transitions applied
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution
- 2026-01-07: Validation improvements applied
  - Fixed Task 1 to verify (not implement) proposal transition from Story 5.4
  - Corrected workflow.service.ts reference to evaluations.service.ts
  - Updated File List with sprint-status.yaml guidance

## References

- [epics.md Story 5.5](../../planning-artifacts/epics.md#L1676-L1702) - Full requirements
- [architecture.md](../../planning-artifacts/architecture.md) - State machine, holder rules, workflow patterns
- [project-context.md](../../project-context.md) - Implementation rules and patterns
- [Story 5.4](./5-4-preview-pdf-confirm.md) - Previous story with submit context
