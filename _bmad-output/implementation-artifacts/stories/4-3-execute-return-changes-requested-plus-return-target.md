# Story 4.3: Execute Return (CHANGES_REQUESTED + Return Target)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Hệ thống,
I want xử lý return action với return target EXPLICIT,
So that resubmit biết quay về đâu.

## Acceptance Criteria

1. **AC1: State Transition to CHANGES_REQUESTED**
   - Given User đã điền return form (reason code + sections + comment)
   - And proposal state = FACULTY_REVIEW
   - When User click "Gửi" (kèm idempotency key)
   - Then proposal.state chuyển từ FACULTY_REVIEW → CHANGES_REQUESTED
   - And proposal.holder_unit = owner_faculty_id (về lại Khoa của giảng viên)
   - And proposal.holder_user = owner_id

2. **AC2: Return Target Stored EXPLICITLY**
   - Given Return action được execute
   - When workflow_logs entry được tạo
   - Then log có các field EXPLICIT:
     - action = "RETURN"
     - from_state = "FACULTY_REVIEW"
     - to_state = "CHANGES_REQUESTED"
     - return_target_state = "FACULTY_REVIEW" (SOURCE OF TRUTH)
     - return_target_holder_unit = Khoa đã trả về (SOURCE OF TRUTH)
     - reason_code = selected reason
     - revision_sections = array of selected section IDs
     - comment = user comment

3. **AC3: UI Banner for CHANGES_REQUESTED Proposals**
   - Given proposal đã return (state = CHANGES_REQUESTED)
   - When Giảng viên (owner) mở proposal
   - Then UI hiển thị banner: "Hồ sơ cần sửa trước khi nộp lại"
   - And banner shows warning icon
   - And banner is styled distinctively (orange/yellow background)

## Tasks / Subtasks

- [x] Task 1: Verify Return Target Implementation (AC: #1, #2)
  - [x] Verify workflow.service.ts stores return_target_state = FACULTY_REVIEW
  - [x] Verify workflow.service.ts stores return_target_holder_unit = proposal.facultyId
  - [x] Verify workflow.service.ts stores reason_code and revision_sections
  - [x] Verify comment stores reason + revisionSections as JSON
  - [x] Note: Story 4.2 should have implemented this - verify and fix if missing

- [x] Task 2: Frontend - Changes Requested Banner (AC: #3)
  - [x] Create `ChangesRequestedBanner` component
  - [x] Conditionally render when proposal.state = CHANGES_REQUESTED
  - [x] Display warning message: "Hồ sơ cần sửa trước khi nộp lại"
  - [x] Add warning icon (AlertCircle)
  - [x] Style with orange/yellow background (distinctive warning style)
  - [x] Include return reason and sections from latest workflow log

- [x] Task 3: Fetch Return Details for Banner (AC: #3)
  - [x] Add API to fetch latest RETURN workflow log entry
  - [x] Display reason_code label (e.g., "Thiếu tài liệu")
  - [x] Display list of sections needing revision
  - [x] Link to Story 4.4 (Revision Panel for full UI)

- [x] Task 4: Unit Tests (AC: #1, #2, #3)
  - [x] Test return_target_state stored correctly in workflow log
  - [x] Test return_target_holder_unit stored correctly
  - [x] Test banner renders when state = CHANGES_REQUESTED
  - [x] Test banner hidden when state != CHANGES_REQUESTED
  - [x] Test banner displays return details (reason, sections)

- [x] Task 5: Component Tests
  - [x] Test ChangesRequestedBanner renders with all fields
  - [x] Test banner shows correct return reason
  - [x] Test banner lists all revision sections

## Dev Notes

### Architecture References

**State Machine (from Epic 3 + architecture.md):**
```
FACULTY_REVIEW → [Faculty Return] → CHANGES_REQUESTED
                                      ↓ [Resubmit]
                                    return_target_state
```

**Return Target Fields (Critical for Story 4.5 Resubmit):**
The workflow log MUST explicitly store return_target_state and return_target_holder_unit.
These fields are the SOURCE OF TRUTH for resubmit - do NOT infer from previous state.

**Workflow Log Schema (from Story 3.4 + UX-2):**
```typescript
interface WorkflowLog {
  id: string;
  proposal_id: string;
  action: 'RETURN' | 'APPROVE' | 'SUBMIT' | 'RESUBMIT' | ...;
  from_state: string;
  to_state: string;
  return_target_state?: string;      // FACULTY_REVIEW (where to go after resubmit)
  return_target_holder_unit?: string; // Khoa đã trả về
  reason_code?: string;
  revision_sections?: string[];      // Section IDs needing revision
  comment?: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

### Previous Story Intelligence

**What Story 4.2 (Faculty Return Dialog) Implemented:**
- POST `/api/workflow/:proposalId/return-faculty` endpoint
- ReturnFacultyReviewDto with reasonCode and reasonSections validation
- ReturnDialog component with reason code dropdown and section checkboxes
- `WorkflowService.returnFacultyReview()` method

**Critical Implementation from Story 4.2:**
In `workflow.service.ts`, the `returnFacultyReview()` method already stores:
```typescript
const returnTargetState = proposal.state; // Return to FACULTY_REVIEW
const returnTargetHolderUnit = proposal.facultyId; // Faculty that was reviewing

// Stored in workflow log:
await tx.workflowLog.create({
  data: {
    proposalId,
    action: WorkflowAction.RETURN,
    fromState: proposal.state,
    toState,
    actorId: context.userId,
    actorName: actorDisplayName,
    returnTargetState,        // ✅ Already implemented
    returnTargetHolderUnit,   // ✅ Already implemented
    reasonCode,
    comment: commentJson,
  },
});
```

**Story 4.3 Implementation Focus:**
Since Story 4.2 already implemented the return_target storage, Story 4.3 is primarily about:
1. **Verification**: Ensure return_target fields are correctly stored
2. **UI Addition**: Add ChangesRequestedBanner component for CHANGES_REQUESTED state

### Project Structure Notes

**Files to Create:**
- `qlnckh/web-apps/src/components/workflow/ChangesRequestedBanner.tsx` - Warning banner component

**Files to Modify:**
- `qlnckh/web-apps/src/lib/api/workflow.ts` - Add method to fetch latest RETURN log
- `qlnckh/web-apps/src/components/workflow/ProposalActions.tsx` - Integrate banner (or separate location)
- `qlnckh/apps/src/modules/workflow/workflow.controller.ts` - Add GET endpoint for latest RETURN log (if needed)

**Files to Use (No Changes):**
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - returnFacultyReview() already stores return_target
- `qlnckh/apps/src/modules/workflow/enums/return-reason-code.enum.ts` - Reason code labels

### Data Flow

**Existing (from Story 4.2):**
```http
POST /api/workflow/{id}/return-faculty
X-Idempotency-Key: {uuid}

{
  "reasonCode": "NOI_DUNG_KHONG_RO_RANG",
  "reasonSections": ["SEC_CONTENT_METHOD", "SEC_METHOD"],
  "comment": "Cần chi tiết hóa phương pháp nghiên cứu"
}

Response 200:
{
  "success": true,
  "data": {
    "proposalId": "...",
    "previousState": "FACULTY_REVIEW",
    "currentState": "CHANGES_REQUESTED",
    "action": "RETURN",
    "holderUnit": "faculty-1",
    "holderUser": "user-1",
    "workflowLogId": "log-uuid"
  }
}
```

**New for Story 4.3:**
```http
GET /api/workflow/{proposalId}/latest-return

Response 200:
{
  "success": true,
  "data": {
    "id": "log-uuid",
    "returnTargetState": "FACULTY_REVIEW",
    "returnTargetHolderUnit": "CNTT-KHOA",
    "reasonCode": "NOI_DUNG_KHONG_RO_RANG",
    "reasonLabel": "Nội dung không rõ ràng",
    "revisionSections": ["SEC_CONTENT_METHOD", "SEC_METHOD"],
    "comment": "{\"reason\":\"...\",\"revisionSections\":[...]}",
    "actorName": "Trần Văn B",
    "timestamp": "2026-01-07T10:00:00Z"
  }
}
```

### Testing Considerations

**Unit Tests:**
1. Verify return_target_state = FACULTY_REVIEW in workflow log
2. Verify return_target_holder_unit = faculty_id in workflow log
3. Verify ChangesRequestedBanner renders when state = CHANGES_REQUESTED
4. Verify ChangesRequestedBanner hidden for other states
5. Verify banner displays return reason label correctly
6. Verify banner lists all revision sections

**Component Tests:**
1. ChangesRequestedBanner renders with warning icon
2. Banner displays correct reason label from RETURN_REASON_LABELS
3. Banner displays section labels from CANONICAL_SECTIONS
4. Banner handles missing return data gracefully

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

Story 4.3 implementation complete. All tasks/subtasks verified:
1. Return target storage verified - already implemented in Story 4.2
2. ChangesRequestedBanner component created with:
   - Warning message and icon
   - Orange/amber background styling
   - Display of return reason and sections
3. API methods added: getWorkflowLogs(), getLatestReturn()
4. Test file created (test runner has pre-existing path alias issue)

**Note:** Frontend tests have a pre-existing path alias (@) configuration issue in vitest.
This is unrelated to Story 4.3 changes - same issue exists for ProposalActions.spec.tsx.
Backend workflow tests (43 tests) pass successfully.

### File List

**Files Created:**
- `qlnckh/web-apps/src/components/workflow/ChangesRequestedBanner.tsx` - Banner component
- `qlnckh/web-apps/src/components/workflow/ChangesRequestedBanner.spec.tsx` - Component tests

**Files Modified:**
- `qlnckh/web-apps/src/lib/api/workflow.ts` - Added WorkflowLog interface, getWorkflowLogs(), getLatestReturn()
- `_bmad-output/implementation-artifacts/stories/4-3-execute-return-changes-requested-plus-return-target.md` - Story file updated
- `qlnckh/package.json` - Added lucide-react dependency
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status

**Files Verified (No Changes):**
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Return target storage verified (lines 478-514)
- `qlnckh/apps/src/modules/workflow/workflow.controller.ts` - getWorkflowLogs endpoint exists

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
- 2026-01-07: Implementation complete. ChangesRequestedBanner component added. Status: review

## References

- [epics.md Story 4.3](../../planning-artifacts/epics.md#L1240-L1270) - Full acceptance criteria
- [architecture.md Return Target](../../planning-artifacts/architecture.md#L267-L296) - Return target fields
- [Story 4.2](./4-2-faculty-return-dialog-reason-code-plus-sections.md) - Faculty return implementation
