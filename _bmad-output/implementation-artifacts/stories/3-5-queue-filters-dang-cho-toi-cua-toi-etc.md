# Story 3.5: Queue Filters ("Đang chờ tôi", "Của tôi", etc.)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User (bất kỳ vai trò),
I want filter proposals theo holder và state,
so that tôi thấy những hồ sơ cần tôi xử lý.

## Acceptance Criteria

1. **AC1: Filter tabs display (frontend story - API only)**
   - Given User đang ở Worklist/Queue page
   - When UI load
   - Then API hỗ trợ các filter types:
     - "my-queue" (Đang chờ tôi)
     - "my-proposals" (Của tôi)
     - "all" (Tất cả)
     - "overdue" (Quá hạn)
     - "upcoming" (Sắp đến hạn T-2)

2. **AC2: "Đang chờ tôi" (my-queue) filter endpoint**
   - Given User call GET /proposals?filter=my-queue
   - When user có role = QUAN_LY_KHOA
   - Then proposals trả về thỏa điều kiện:
     - proposal.holder_unit = user.faculty_id
     - HOẶC proposal.holder_user = user.id
     - AND proposal.state NOT IN (COMPLETED, CANCELLED, REJECTED, WITHDRAWN)
   - Given User có role = PHONG_KHCN
   - When call GET /proposals?filter=my-queue
   - Then proposals trả về thỏa điều kiện:
     - proposal.holder_unit = "PHONG_KHCN"
     - OR proposal.holder_user = user.id
     - AND proposal.state NOT IN terminal states

3. **AC3: "Của tôi" (my-proposals) filter endpoint**
   - Given User có role = PROJECT_OWNER
   - When call GET /proposals?filter=my-proposals
   - Then proposals trả về thỏa điều kiện:
     - proposal.owner_id = user.id

4. **AC4: "Quá hạn" (overdue) filter endpoint**
   - Given User call GET /proposals?filter=overdue
   - When API được gọi
   - Then proposals trả về thỏa điều kiện:
     - proposal.sla_deadline < now()
     - proposal.state NOT IN (COMPLETED, CANCELLED, PAUSED)

5. **AC5: "Sắp đến hạn" (upcoming) filter endpoint**
   - Given User call GET /proposals?filter=upcoming
   - When API được gọi
   - Then proposals trả về thỏa điều kiện:
     - proposal.sla_deadline >= NOW() AND <= NOW() + 2 working days
     - proposal.state NOT IN (COMPLETED, CANCELLED, PAUSED)

## Tasks / Subtasks

- [ ] Task 1: Create queue filter DTOs (AC: #1)
  - [ ] Create QueueFilterType enum: MY_QUEUE, MY_PROPOSALS, ALL, OVERDUE, UPCOMING
  - [ ] Create QueueFilterDto with filter query parameter
  - [ ] Add pagination support (page, pageSize)
  - [ ] Add optional search query parameter

- [ ] Task 2: Add queue filter endpoint to WorkflowController (AC: #2, #3, #4, #5)
  - [ ] Add GET /workflow/queue endpoint with filter query param
  - [ ] Inject PrismaService for queries
  - [ ] Implement filterType switch logic
  - [ ] Use existing helper functions from holder-rules.helper.ts
  - [ ] Add RBAC: authenticated users can access

- [ ] Task 3: Implement each filter type (AC: #2, #3, #4, #5)
  - [ ] MY_QUEUE: Use getMyQueueProposalsFilter()
  - [ ] MY_PROPOSALS: Use getMyProposalsFilter()
  - [ ] ALL: Return all non-terminal proposals for user's unit
  - [ ] OVERDUE: Use getOverdueProposalsFilter()
  - [ ] UPCOMING: Calculate slaDeadline between now and now + 2 working days

- [ ] Task 4: Add upcoming filter helper (AC: #5)
  - [ ] Add getUpcomingProposalsFilter() to holder-rules.helper.ts
  - [ ] Use SlaService to calculate +2 working days
  - [ ] Filter by sla_deadline in range [now, now + 2 working days]

- [ ] Task 5: Write comprehensive tests (AC: #2, #3, #4, #5)
  - [ ] Test MY_QUEUE filter for QUAN_LY_KHOA role
  - [ ] Test MY_QUEUE filter for PHONG_KHCN role
  - [ ] Test MY_PROPOSALS filter for PROJECT_OWNER
  - [ ] Test OVERDUE filter logic
  - [ ] Test UPCOMING filter with SlaService integration

- [ ] Task 6: Run all tests and verify no regressions
  - [ ] Run workflow.controller.spec.ts
  - [ ] Ensure no regressions in existing tests

## Dev Notes

### Architecture References

**Queue Filter Requirements (from Epic 3.5):**
- FR10: Queue Display — "Đang chờ tôi" filter theo holder_unit
- FR11: My Projects — Filter "Của tôi" cho PROJECT_OWNER
- FR12: State Filters — Filter theo state, SLA, overdue

**Source:** [epics.md Story 3.5](../../../_bmad-output/planning-artifacts/epics.md#L912-L948)

### Previous Story Intelligence (Story 3.1, 3.2, 3.3, 3.4)

**What Story 3.1 Already Implemented:**
- 16 canonical states defined in ProjectState enum
- WorkflowService with transition methods
- State machine transitions with holder assignment

**What Story 3.2 Already Implemented:**
- `getHolderForState()` helper for holder assignment
- `getMyQueueProposalsFilter()` - Prisma.WhereInput for "Đang chờ tôi"
- `getMyProposalsFilter()` - Prisma.WhereInput for "Của tôi"
- `getOverdueProposalsFilter()` - Prisma.WhereInput for "Quá hạn"
- `isTerminalQueueState()` - Check if state is terminal
- `canUserActOnProposal()` - Validation helper

**What Story 3.3 Already Implemented:**
- SlaService.calculateDeadline() for business day calculations
- slaStartDate and slaDeadline on proposal submit

**What Story 3.4 Already Implemented:**
- WorkflowController with GET /workflow-logs endpoint
- Pattern for adding new endpoints to WorkflowController

### Implementation Considerations

1. **Backend helpers ALREADY EXIST** from Story 3.2:
   - `getMyQueueProposalsFilter(userId, userFacultyId, userRole)`
   - `getMyProposalsFilter(userId)`
   - `getOverdueProposalsFilter(currentDate)`

2. **NEW endpoint needed:**
   - GET /workflow/queue?filter={filterType}
   - Returns proposals matching filter criteria
   - Supports pagination (page, pageSize)

3. **NEW helper needed:**
   - `getUpcomingProposalsFilter()` - for T-2 (2 working days before deadline)
   - Must use SlaService for business day calculation

4. **Filter Types:**
   - `my-queue`: Use getMyQueueProposalsFilter()
   - `my-proposals`: Use getMyProposalsFilter()
   - `all`: All non-terminal proposals user can access
   - `overdue`: Use getOverdueProposalsFilter()
   - `upcoming`: slaDeadline between now and now + 2 working days (NEW)

5. **RBAC:**
   - All authenticated users can access queue endpoint
   - Filter logic applies based on user's role and faculty/unit

6. **Response Format:**
   - Follow existing pattern from workflow-logs endpoint
   - Include success, data, meta structure

### Project Structure Notes

**Existing Files to Modify:**
- `apps/src/modules/workflow/workflow.controller.ts` - Add GET /queue endpoint
- `apps/src/modules/workflow/helpers/holder-rules.helper.ts` - Add getUpcomingProposalsFilter()

**New Files to Create:**
- `apps/src/modules/workflow/dto/queue-filter.dto.ts` - Filter DTOs and enums

**Files to Use (No Changes):**
- `apps/src/modules/workflow/workflow.service.ts` - Use existing methods
- `apps/src/modules/calendar/sla.service.ts` - Use calculateDeadline() for upcoming filter

### References

- [epics.md Story 3.5](../../../_bmad-output/planning-artifacts/epics.md#L912-L948) - Full acceptance criteria
- [holder-rules.helper.ts](../../../qlnckh/apps/src/modules/workflow/helpers/holder-rules.helper.ts) - Existing filter helpers
- [Story 3.2](../3-2-holder-rules-holder-unit-plus-holder-user.md) - Previous story context
- [Story 3.3](../3-3-submit-proposal-draft-right-arrow-faculty-review.md) - SlaService integration
- [Story 3.4](../3-4-workflow-logs-timeline-thread-view.md) - Controller pattern reference

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 3.5 created from Epic 3 requirements. Key points:
- Queue filter helper functions ALREADY EXIST from Story 3.2
- Main task: Create REST API endpoints using existing helpers
- NEW: getUpcomingProposalsFilter() helper needed
- Follow WorkflowController pattern from Story 3.4
- Frontend filter tabs UI is separate concern

### File List

**Files Modified:**
- `apps/src/modules/workflow/workflow.controller.ts` - Add GET /queue endpoint with pagination validation
- `apps/src/modules/workflow/helpers/holder-rules.helper.ts` - Add getUpcomingProposalsFilter(), export TERMINAL_QUEUE_STATES
- `apps/src/modules/workflow/workflow.controller.spec.ts` - Add queue endpoint tests + pagination validation tests
- `apps/src/modules/workflow/workflow.module.ts` - Update module comment for Story 3.5

**Files Created:**
- `apps/src/modules/workflow/dto/queue-filter.dto.ts` - Filter DTOs and enums

**Files Used (No Changes):**
- `apps/src/modules/workflow/workflow.service.ts` - Use existing methods
- `apps/src/modules/calendar/sla.service.ts` - Use addBusinessDays()

## Change Log

- 2026-01-06: Story created. Ready for dev.
- 2026-01-06: Implementation complete. Code review fixes applied:
  - H1: Added pagination parameter validation (NaN, negative, max cap at 100)
  - L1: Added 400 @ApiResponse documentation
  - Added 5 new tests for pagination validation
  - All 31 tests passing

## Code Review Fixes

### HIGH Issues Fixed
- **H1: Missing pagination parameter validation**
  - Fixed: Added isNaN(), negative, and max (100) validation for page/pageSize
  - Location: workflow.controller.ts:283-297

### LOW Issues Fixed
- **L1: Missing 400 @ApiResponse documentation**
  - Fixed: Added 400 Bad Request response documentation
  - Location: workflow.controller.ts:263-275

### MEDIUM Issues Noted (Not Fixed)
- **M1: QueueFilterDto created but not used** - Using raw @Query() params with manual validation instead (valid approach for this use case)
- **M2: Git vs Story File List discrepancy** - Fixed by updating this File List
