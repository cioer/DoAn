# Story 3.2: Holder Rules (holder_unit + holder_user)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Hệ thống,
I want assign holder_unit và holder_user cho mỗi state transition,
so that queue filters "Đang chờ tôi" hoạt động đúng.

## Acceptance Criteria

1. **AC1: getHolderForState helper covers all 15 states**
   - Phase A (Proposal): DRAFT, FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW
   - Phase B (Changes & Approval): CHANGES_REQUESTED, APPROVED, IN_PROGRESS
   - Phase C (Acceptance & Handover): FACULTY_ACCEPTANCE_REVIEW, SCHOOL_ACCEPTANCE_REVIEW, HANDOVER, COMPLETED
   - Exception states: PAUSED, CANCELLED, REJECTED, WITHDRAWN
   - Each state returns correct holderUnit + holderUser combination

2. **AC2: WorkflowService uses holder rules on ALL transitions**
   - submitProposal() sets holderUnit = faculty_id, holderUser = null
   - approveFacultyReview() sets holderUnit = "PHONG_KHCN", holderUser = null
   - returnFacultyReview() sets holderUnit = owner_faculty_id, holderUser = owner_id
   - transitionState() uses getHolderForState for all other transitions
   - Terminal states (CANCELLED, REJECTED, WITHDRAWN) track decision maker

3. **AC3: Queue filter "Đang chờ tôi" works correctly**
   - Given proposal có holderUnit = "Khoa CNTT"
   - When user với role QUAN_LY_KHOA và faculty_id = "Khoa CNTT" query queue
   - Then proposal xuất hiện trong "Đang chờ tôi"

   - Given proposal có holderUnit = "Khoa CNTT"
   - When user với role QUAN_LY_KHOA nhưng faculty_id = "Khoa KT" query queue
   - Then proposal KHÔNG xuất hiện trong "Đang chờ tôi"

   - Given proposal có holderUnit = "PHONG_KHCN"
   - When user với role PHONG_KHCN query queue
   - Then proposal xuất hiện trong "Đang chờ tôi"

4. **AC4: canUserActOnProposal validation helper**
   - Returns true if user matches holderUnit OR holderUser
   - Returns false for terminal states (no action allowed)
   - DRAFT state: only owner can act
   - Specific holderUser: only that user can act
   - Faculty/unit assignment: users in matching faculty can act

5. **AC5: Tests for all holder rule scenarios**
   - Unit test for getHolderForState with all 15 states
   - Unit test for canUserActOnProposal with various user/holder combos
   - Integration test for submit → holder assignment
   - Integration test for approve → holder assignment
   - Integration test for return → holder assignment

## Tasks / Subtasks

- [x] Task 1: Verify and enhance getHolderForState (AC: #1, #2)
  - [x] Verify all 15 states have correct holder assignments
  - [x] Ensure OUTLINE_COUNCIL_REVIEW handles council_id + council_secretary_id
  - [x] Ensure exception states track actor_unit + actor_id
  - [x] Review JSDoc comments match Epic 3.2 requirements

- [x] Task 2: Verify WorkflowService uses holder rules correctly (AC: #2)
  - [x] Verify submitProposal() calls getHolderForState
  - [x] Verify approveFacultyReview() calls getHolderForState
  - [x] Verify returnFacultyReview() calls getHolderForState
  - [x] Verify transitionState() calls getHolderForState
  - [x] Check database updates include holderUnit + holderUser

- [x] Task 3: Implement queue filter helper (AC: #3, #4)
  - [x] Add getMyQueueProposals() helper function
  - [x] Filter by holderUnit matching user faculty
  - [x] Filter by holderUnit = "PHONG_KHCN" for PHONG_KHCN role
  - [x] Filter by holderUser matching user.id
  - [x] Exclude terminal states from queue

- [x] Task 4: Write comprehensive tests (AC: #5)
  - [x] Unit test: getHolderForState for all 15 states
  - [x] Unit test: canUserActOnProposal scenarios
  - [x] Integration test: submit flow holder assignment
  - [x] Integration test: approve flow holder assignment
  - [x] Integration test: return flow holder assignment

- [x] Task 5: Update WorkflowService spec for new coverage (AC: #5)
  - [x] Add tests for queue filter scenarios
  - [x] Add test for PHONG_KHCN holder matching
  - [x] Add test for faculty-specific holder matching
  - [x] Verify all tests pass

## Dev Notes

### Architecture References

**Holder Rules Table (from Epic 3.2):**

| State | holder_unit | holder_user | Logic |
|-------|-------------|-------------|-------|
| DRAFT | null | null | Chưa ai nắm giữ |
| FACULTY_REVIEW | faculty_id | null | Khoa duyệt, chưa gán người |
| SCHOOL_SELECTION_REVIEW | PHONG_KHCN | null | PKHCN phân bổ |
| OUTLINE_COUNCIL_REVIEW | council_id | council_secretary_id | Hội đồng + thư ký |
| CHANGES_REQUESTED | owner_faculty_id | owner_id | Về lại giảng viên |
| APPROVED | owner_faculty_id | owner_id | Giảng viên thực hiện |
| IN_PROGRESS | owner_faculty_id | owner_id | Giảng viên đang làm |
| PAUSED | PKHCN | null | PKHCN tạm dừng |
| CANCELLED | actor_unit | actor_id | Người hủy |

**Queue Filter Logic (from Epic 3.5, used here):**
- "Đang chờ tôi": holderUnit matches user faculty OR holderUnit = "PHONG_KHCN" for PHONG_KHCN role
- "Của tôi": ownerId = user.id
- Exclude terminal states: COMPLETED, CANCELLED, REJECTED, WITHDRAWN

**Source:** [epics.md](../../../_bmad-output/planning-artifacts/epics.md#L812-L844)

### Previous Story Intelligence (Story 3.1)

**What Story 3.1 Already Implemented:**
- Created `holder-rules.helper.ts` with getHolderForState() function
- Implemented basic holder assignment for main transitions
- Implemented canUserActOnProposal() helper
- Created SPECIAL_UNIT_CODES.PHONG_KHCN constant

**Story 3.1 Completion Notes:**
- 47/47 tests passing
- Manual DI bypass pattern used for testing
- RBAC validation added
- User display name fetched for workflow logs

**What Story 3.2 Must Complete:**
- Verify getHolderForState covers ALL 15 states (not just main transitions)
- Ensure OUTLINE_COUNCIL_REVIEW properly handles council_id/council_secretary_id parameters
- Add comprehensive tests for queue filtering scenarios
- Document any edge cases in holder assignment

### Project Structure Notes

**Module Location:** `apps/src/modules/workflow/helpers/holder-rules.helper.ts`

**Existing Functions to Verify/Enhance:**
```typescript
export function getHolderForState(
  state: ProjectState,
  proposal: Pick<Proposal, 'ownerId' | 'facultyId' | 'holderUnit' | 'holderUser'>,
  actorId?: string,
  actorFacultyId?: string,
): HolderAssignment

export function canUserActOnProposal(
  proposal: Pick<Proposal, 'holderUnit' | 'holderUser' | 'state' | 'ownerId'>,
  userId: string,
  userFacultyId: string | null,
  userRole: string,
): boolean
```

**New Functions to Add:**
```typescript
// Queue filter helper for "Đang chờ tôi"
export function getMyQueueProposalsFilter(
  userId: string,
  userFacultyId: string | null,
  userRole: string,
): Prisma.ProposalWhereInput
```

### Implementation Considerations

1. **OUTLINE_COUNCIL_REVIEW Edge Case:**
   - Council assignment happens in Epic 5 (council-assign action)
   - getHolderForState should keep existing holderUnit/holderUser if already set
   - If not set, return null (awaiting assignment)

2. **Terminal State Handling:**
   - COMPLETED: holderUnit = null, holderUser = null
   - CANCELLED/REJECTED/WITHDRAWN: track actor for audit trail
   - These should NOT appear in queue filters

3. **PHONG_KHCN Special Handling:**
   - SPECIAL_UNIT_CODES.PHONG_KHCN constant
   - Match by role (PHONG_KHCN) not faculty_id
   - Applies to: SCHOOL_SELECTION_REVIEW, SCHOOL_ACCEPTANCE_REVIEW, PAUSED

4. **Testing Standards:**
   - Use manual DI bypass pattern (Epic 2 lesson learned)
   - Mock Prisma client with jest.fn()
   - Test holder assignment for ALL 15 states
   - Test queue filter scenarios

### References

- [epics.md Story 3.2](../../../_bmad-output/planning-artifacts/epics.md#L812-L844) - Full acceptance criteria
- [architecture.md Holder Rules](../../../_bmad-output/planning-artifacts/architecture.md#L89-L93) - UX-3 decision
- [holder-rules.helper.ts](../../../qlnckh/apps/src/modules/workflow/helpers/holder-rules.helper.ts) - Existing implementation
- [Story 3.1 Completion Notes](../3-1-16-canonical-states-plus-transitions.md) - Previous story learnings

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 3.2 implementation complete. All 5 acceptance criteria satisfied:

**AC1: getHolderForState covers all 15 states**
- Verified all ProjectState enum values have correct holder assignments
- OUTLINE_COUNCIL_REVIEW keeps existing holderUnit/holderUser when set
- Exception states track actor_unit + actor_id correctly

**AC2: WorkflowService uses holder rules correctly**
- Verified submitProposal() calls getHolderForState
- Verified approveFacultyReview() calls getHolderForState
- Verified returnFacultyReview() calls getHolderForState
- Verified transitionState() calls getHolderForState
- All database updates include holderUnit + holderUser

**AC3: Queue filter "Đang chờ tôi" works correctly**
- Added getMyQueueProposalsFilter() helper function
- Filters by holderUnit matching user faculty
- Filters by holderUnit = "PHONG_KHCN" for PHONG_KHCN role
- Filters by holderUser matching user.id
- Excludes terminal states (COMPLETED, CANCELLED, REJECTED, WITHDRAWN)

**AC4: canUserActOnProposal validation helper**
- Already implemented in Story 3.1
- Tests verify all scenarios work correctly

**AC5: Tests for all holder rule scenarios**
- 15 tests for getHolderForState (all states covered)
- 5 tests for canUserActOnProposal
- 8 tests for queue filter helpers
- Total: 78/78 tests passing

### File List

**Files Modified:**
- `apps/src/modules/workflow/helpers/holder-rules.helper.ts` - Added queue filter helpers (isTerminalQueueState, getMyQueueProposalsFilter, getMyProposalsFilter, getOverdueProposalsFilter)
- `apps/src/modules/workflow/workflow.service.spec.ts` - Added 31 new tests for Story 3.2

**Files Verified (No Changes):**
- `apps/src/modules/workflow/workflow.service.ts` - Confirmed uses getHolderForState correctly
- `prisma/schema.prisma` - Confirmed holderUnit, holderUser fields exist

## Change Log

- 2026-01-06: Story created. Ready for dev.
- 2026-01-06: Story implementation complete. All 5 ACs satisfied. 78/78 tests passing. Ready for code review.
- 2026-01-06: Code review complete. Fixed magic string inconsistency. Story marked as done.
