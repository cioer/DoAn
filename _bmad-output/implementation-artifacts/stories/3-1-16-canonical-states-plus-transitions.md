# Story 3.1: 16 Canonical States Plus Transitions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Hệ thống,
I want định nghĩa 16 canonical states và transitions giữa chúng (và enforce rằng SUBMITTED là EVENT, không phải STATE),
so that workflow engine có thể manage proposal lifecycle chính xác.

## Acceptance Criteria

1. **AC1: Enum ProjectState có 15 canonical states**
   - Phase A (Proposal): `DRAFT`, `FACULTY_REVIEW`, `SCHOOL_SELECTION_REVIEW`, `OUTLINE_COUNCIL_REVIEW`
   - Phase B (Changes & Approval): `CHANGES_REQUESTED`, `APPROVED`, `IN_PROGRESS`
   - Phase C (Acceptance & Handover): `FACULTY_ACCEPTANCE_REVIEW`, `SCHOOL_ACCEPTANCE_REVIEW`, `HANDOVER`, `COMPLETED`
   - Exception states: `PAUSED`, `CANCELLED`, `REJECTED`, `WITHDRAWN`

2. **AC2: SUBMITTED là EVENT (WorkflowAction), không phải STATE**
   - `projects.state` KHÔNG BAO GIỜ có giá trị `SUBMITTED`
   - Khi submit: `DRAFT → FACULTY_REVIEW` (direct transition)
   - `workflow_logs.action = SUBMIT` được ghi lại để audit

3. **AC3: State transition DRAFT → FACULTY_REVIEW**
   - Given proposal ở state `DRAFT`
   - When owner submit proposal
   - Then state chuyển từ `DRAFT → FACULTY_REVIEW` (KHÔNG qua SUBMITTED)
   - And `holder_unit = faculty_id` của proposal
   - And `workflow_logs` entry được tạo với action=SUBMIT

4. **AC4: State transition FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW**
   - Given proposal ở `FACULTY_REVIEW`
   - When approver approve
   - Then state chuyển từ `FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW`

5. **AC5: State transition FACULTY_REVIEW → CHANGES_REQUESTED**
   - Given proposal ở `FACULTY_REVIEW`
   - When approver return
   - Then state chuyển từ `FACULTY_REVIEW → CHANGES_REQUESTED`
   - And `holder_unit = faculty_id` của owner (về lại giảng viên)
   - And `return_target_state` được lưu trong workflow_logs

6. **AC6: WorkflowService class để handle transitions**
   - Service method `transitionState(proposalId, toState, actorId, context)` được implement
   - Validate transition hợp lệ (state machine rules)
   - Update holder_unit, holder_user theo rules
   - Ghi workflow_logs entry

7. **AC7: TypeScript types và helpers**
   - `StateTransition` type định nghĩa các valid transitions
   - Helper function `isValidTransition(fromState, toState)` trả về boolean
   - Helper function `getNextHolder(state, proposal)` trả về holder_unit + holder_user

8. **AC8: Tests**
   - Unit tests cho `isValidTransition()` với tất cả combinations
   - Unit tests cho `getNextHolder()` với mỗi state
   - Integration test cho submit action (DRAFT → FACULTY_REVIEW)
   - Test đảm bảo SUBMITTED không phải là state

## Tasks / Subtasks

- [x] Task 1: Review và verify ProjectState enum (AC: #1)
  - [x] Verify prisma/schema.prisma has all 15 states
  - [x] Verify WorkflowAction enum includes SUBMIT
  - [x] Document states by phase (A, B, C, Exception)

- [x] Task 2: Create workflow service module (AC: #6)
  - [x] Create `apps/src/modules/workflow/` directory structure
  - [x] Create `workflow.service.ts` với transition logic
  - [x] Create `workflow.controller.ts` (nếu cần endpoint riêng)
  - [x] Create DTOs cho state transitions

- [x] Task 3: Implement state transition validation (AC: #7)
  - [x] Define StateTransition type/rules
  - [x] Implement `isValidTransition(fromState, toState)` helper
  - [x] Implement `getNextHolder(state, proposal)` helper
  - [x] Add error class `InvalidTransitionError`

- [x] Task 4: Implement submit action (DRAFT → FACULTY_REVIEW) (AC: #3)
  - [x] Add `submitProposal()` method trong WorkflowService
  - [x] Update holder_unit = proposal.facultyId
  - [x] Create workflow_logs entry với action=SUBMIT
  - [x] Add audit event logging

- [x] Task 5: Implement faculty approve (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW) (AC: #4)
  - [x] Add `approveFacultyReview()` method
  - [x] Update holder_unit = "PHONG_KHCN"
  - [x] Create workflow_logs entry với action=APPROVE

- [x] Task 6: Implement faculty return (FACULTY_REVIEW → CHANGES_REQUESTED) (AC: #5)
  - [x] Add `returnFacultyReview()` method với reasonCode
  - [x] Update holder_unit = owner's facultyId
  - [x] Store return_target_state + return_target_holder_unit trong workflow_logs

- [x] Task 7: Write tests (AC: #8)
  - [x] Unit tests cho transition validation helpers
  - [x] Unit tests cho holder assignment logic
  - [x] Integration tests cho complete submit flow
  - [x] Test SUBMITTED không được dùng như state value

## Dev Notes

### Architecture References

**Critical Design Decision (UX-1):** SUBMITTED là EVENT, không phải STATE
- Source: [ux-design-specification-part-ab.md#163-191](../../../_bmad-output/planning-artifacts/ux-design-specification-part-ab.md#L163-L191)
- `projects.state` NEVER = 'SUBMITTED'
- Transition: DRAFT → FACULTY_REVIEW (direct)
- Timeline logs action='SUBMIT' for audit trail

**State Machine Definition:** [architecture.md](../../../_bmad-output/planning-artifacts/architecture.md)
- 16 canonical states terminology = 15 states + 1 event (SUBMITTED)
- State transitions follow role-based authorization (RBAC + State)

**Current Database Schema:** [prisma/schema.prisma](../../../prisma/schema.prisma)
- `ProjectState` enum (lines 131-147): Already has all 15 states
- `WorkflowAction` enum (lines 149-166): Includes SUBMIT, APPROVE, RETURN, etc.
- `WorkflowLog` model (lines 204-223): Has return_target_state, return_target_holder_unit

### Project Structure Notes

**New Module Location:**
```
apps/src/modules/workflow/
├── workflow.module.ts
├── workflow.service.ts          # Main transition logic
├── workflow.controller.ts       # If needed (may use proposals controller)
├── dto/
│   ├── transition.dto.ts
│   └── state-transition.dto.ts
├── helpers/
│   ├── state-machine.helper.ts  # Transition rules, validation
│   └── holder-rules.helper.ts   # holder_unit, holder_user assignment
└── workflow.spec.ts             # Tests
```

**Alignment with Project Structure:**
- Follow NestJS module pattern (like proposals/, auth/)
- Use Prisma-generated types (ProjectState, WorkflowAction)
- Integrate with AuditService for logging

### Implementation Considerations

1. **State Transition Table** (from Epic 3.1 requirements):
   | From State | Action | To State | Actor |
   |------------|--------|----------|-------|
   | DRAFT | SUBMIT | FACULTY_REVIEW | Owner |
   | FACULTY_REVIEW | APPROVE | SCHOOL_SELECTION_REVIEW | QUAN_LY_KHOA |
   | FACULTY_REVIEW | RETURN | CHANGES_REQUESTED | QUAN_LY_KHOA |

2. **Holder Assignment Rules** (preparation for Story 3.2):
   | State | holder_unit | holder_user |
   |-------|-------------|-------------|
   | DRAFT | null | null |
   | FACULTY_REVIEW | faculty_id (từ proposal) | null |
   | SCHOOL_SELECTION_REVIEW | "PHONG_KHCN" | null |
   | CHANGES_REQUESTED | owner_faculty_id | owner_id |

3. **Error Handling:**
   - Throw `InvalidTransitionError` khi transition không hợp lệ
   - Return 400 Bad Request với error code `INVALID_STATE_TRANSITION`
   - Log failed transition attempts trong audit_logs

4. **Testing Standards:**
   - Use manual DI bypass pattern (Epic 2 lesson learned)
   - Mock Prisma client with jest.fn()
   - Test both success and failure paths
   - Verify workflow_logs entries are created correctly

### References

- [epics.md Story 3.1](../../../_bmad-output/planning-artifacts/epics.md#L778-L808) - Full acceptance criteria
- [architecture.md State Machine](../../../_bmad-output/planning-artifacts/architecture.md#L1598-L1600) - 16 canonical states
- [ux-design-specification-part-ab.md SUBMITTED Decision](../../../_bmad-output/planning-artifacts/ux-design-specification-part-ab.md#L163-L191) - Critical UX decision
- [proposals.controller.ts](../../../qlnckh/apps/src/modules/proposals/proposals.controller.ts) - Existing controller pattern
- [Epic 2 Retrospective](../../../_bmad-output/implementation-artifacts/retrospectives/epic-2-retro-2026-01-06.md) - Test infrastructure lessons

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

No debugging sessions required. Implementation followed established patterns from Epic 2.

### Completion Notes List

**Story 3-1 Implementation Complete**

All 8 acceptance criteria satisfied:
- AC1: Verified Prisma schema has all 15 canonical states organized by phase
- AC2: Enforced SUBMITTED as EVENT (not STATE) - DRAFT → FACULTY_REVIEW is direct transition
- AC3: Implemented submitProposal() with holder assignment and workflow logging
- AC4: Implemented approveFacultyReview() with PHONG_KHCN holder assignment
- AC5: Implemented returnFacultyReview() with return_target_state storage for resubmit logic
- AC6: Created WorkflowService with transitionState() general method
- AC7: Implemented TypeScript helpers (isValidTransition, getHolderForState, etc.)
- AC8: Wrote 42 tests, all passing (manual DI bypass pattern per Epic 2 lessons)

**Technical Highlights:**
- Followed Epic 2 lesson: manual DI bypass in tests for reliable mocking
- State machine defined in state-machine.helper.ts with 25+ valid transitions
- Holder rules implemented in holder-rules.helper.ts with state-based assignment
- Idempotency support with in-memory Map (Redis to be added in Epic 3.8)
- Audit logging integrated via AuditService

**Test Results:**
- 42/42 workflow tests passing
- No regressions in existing test suite (294 total tests passing)

### Code Review Fixes Applied (2026-01-06)

**M1: RBAC Validation Added**
- Created `workflow.constants.ts` with ACTION_ROLE_PERMISSIONS matrix
- Added `validateActionPermission()` method to WorkflowService
- All state transition methods now validate user role before execution
- Added 3 RBAC tests for submit/approve/return actions

**M2: Fixed canUserActOnProposal Pick Type**
- Added `ownerId` to the Pick type to fix TypeScript error
- Function now correctly references all required properties

**M3: Idempotency Warning Added**
- Added warning comment about in-memory cache not surviving restarts
- Documents risk until Redis is implemented in Epic 3.8

**M4: User Display Name Fetched**
- Added `getUserDisplayName()` private method
- Workflow logs now store actual user display name instead of role string
- Fallback to userId if user not found
- Added 2 tests for display name handling

**M5 & L2: Extracted PHONG_KHCN to Constant**
- Created SPECIAL_UNIT_CODES.PHONG_KHCN constant
- All holder assignments now use constant instead of magic string
- Updated holder-rules.helper.ts throughout

**L1: Removed Unused Imports**
- Removed `Test, TestingModule` from workflow.service.spec.ts
- Manual DI bypass pattern doesn't use NestJS testing utilities

**Updated Test Count:**
- 47/47 workflow tests passing (added 5 new tests for RBAC and display name)

### File List

**New Files Created:**
- `apps/src/modules/workflow/workflow.module.ts`
- `apps/src/modules/workflow/workflow.service.ts`
- `apps/src/modules/workflow/workflow.service.spec.ts`
- `apps/src/modules/workflow/dto/transition.dto.ts`
- `apps/src/modules/workflow/helpers/state-machine.helper.ts`
- `apps/src/modules/workflow/helpers/holder-rules.helper.ts`
- `apps/src/modules/workflow/helpers/workflow.constants.ts`
- `apps/src/modules/workflow/index.ts`

**Files Verified (No Changes):**
- `prisma/schema.prisma` - Verified ProjectState enum has all 15 states
- `apps/src/modules/audit/audit.service.ts` - Used for audit logging

## Change Log

- 2026-01-06: Story implementation completed. All tasks and acceptance criteria satisfied. Ready for code review.
- 2026-01-06: Code review completed. Fixed 5 MEDIUM and 2 LOW issues. All 47 tests passing. Story marked as done.
