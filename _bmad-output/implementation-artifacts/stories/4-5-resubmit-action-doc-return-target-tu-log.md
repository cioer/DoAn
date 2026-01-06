# Story 4.5: Resubmit Action (Đọc Return Target từ Log)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên,
I want nộp lại hồ sơ sau khi đã sửa,
So that hồ sơ quay về state trước (FACULTY_REVIEW), không về DRAFT.

## Acceptance Criteria

1. **AC1: Read Return Target from Workflow Log**
   - Given Proposal state = CHANGES_REQUESTED
   - And Giảng viên has ticked ≥ 1 checkbox "Đã sửa"
   - When System processes resubmit
   - Then System reads latest RETURN workflow log entry:
   ```typescript
   const lastReturnLog = await workflowLog
     .where({ proposalId, toState: 'CHANGES_REQUESTED' })
     .orderBy({ timestamp: 'desc' })
     .first();
   const targetState = lastReturnLog.returnTargetState; // FACULTY_REVIEW
   const targetHolder = lastReturnLog.returnTargetHolderUnit;
   ```

2. **AC2: State Transition to Return Target**
   - Given Resubmit action executed (kèm idempotency key)
   - When proposal is updated
   - Then proposal.state = targetState (FACULTY_REVIEW)
   - And proposal.holder_unit = targetHolder (Khoa đã trả)
   - And proposal.sla_start_date = now() (reset SLA)
   - And proposal.sla_deadline = now() + 3 working days

3. **AC3: Workflow Log Entry for Resubmit**
   - Given Resubmit thành công
   - When workflow_logs entry created
   - Then log contains:
     - action = "RESUBMIT"
     - from_state = "CHANGES_REQUESTED"
     - to_state = return_target_state (FACULTY_REVIEW)
     - metadata.return_info references the return log

4. **AC4: Revision Panel Disappears After Resubmit**
   - Given Resubmit thành công
   - When Giảng viên views proposal
   - Then Revision Panel is hidden (state != CHANGES_REQUESTED)
   - And ChangesRequestedBanner is hidden
   - And Form data is preserved (not lost)

5. **AC5: Idempotency Key (Anti-Double-Submit)**
   - Given Giảng viên submits resubmit
   - When request contains idempotency key
   - Then backend validates key uniqueness
   - And duplicate key returns 409 Conflict

## Tasks / Subtasks

- [ ] Task 1: Backend - Resubmit DTO (AC: #1, #5)
  - [ ] Create `ResubmitProposalDto` class
  - [ ] Add `idempotencyKey` field (UUID v4)
  - [ ] Add `checkedSections` field (string[] - sections marked as fixed)
  - [ ] Add validation decorators

- [ ] Task 2: Backend - Service Method (AC: #1, #2)
  - [ ] Create `WorkflowService.resubmitProposal()` method
  - [ ] Fetch latest RETURN log: `toState = CHANGES_REQUESTED`
  - [ ] Extract returnTargetState and returnTargetHolderUnit
  - [ ] Validate: proposal must be CHANGES_REQUESTED
  - [ ] Update proposal state, holder, SLA dates
  - [ ] Create workflow log entry with RESUBMIT action
  - [ ] Handle idempotency key

- [ ] Task 3: Backend - Controller Endpoint (AC: #1, #2, #5)
  - [ ] Add POST `/api/workflow/:proposalId/resubmit` endpoint
  - [ ] Apply `@RequireRoles` with GIANG_VIEN, QUAN_LY_KHOA (owner can resubmit)
  - [ ] Return TransitionResponseDto with new state
  - [ ] Apply IdempotencyInterceptor

- [ ] Task 4: Frontend - Resubmit API Method (AC: #1, #5)
  - [ ] Add `resubmitProposal()` to workflowApi
  - [ ] Parameters: proposalId, idempotencyKey, checkedSections
  - [ ] Include X-Idempotency-Key header
  - [ ] Return TransitionResult

- [ ] Task 5: Frontend - Resubmit Button (AC: #4, #5)
  - [ ] Add "Nộp lại" button to RevisionPanel (Story 4.4)
  - [ ] Disable when checkedSections.length === 0
  - [ ] Enable when ≥ 1 section checked
  - [ ] Show confirmation dialog before submit
  - [ ] Display success/error messages
  - [ ] Refresh proposal state after success

- [ ] Task 6: Unit Tests (AC: #1, #2, #3, #4, #5)
  - [ ] Test resubmit reads return_target from workflow log
  - [ ] Test state transitions to FACULTY_REVIEW (not DRAFT)
  - [ ] Test SLA dates reset correctly
  - [ ] Test workflow log entry created with RESUBMIT action
  - [ ] Test idempotency key validation

- [ ] Task 7: Integration Tests
  - [ ] Test full flow: Return → Revision Panel → Resubmit
  - [ ] Test revision panel hidden after resubmit
  - [ ] Test form data preserved after resubmit

## Dev Notes

### Architecture References

**State Transition (Critical):**
```
CHANGES_REQUESTED → [Resubmit] → return_target_state (FACULTY_REVIEW)
                                     ↑
                                Read from workflow log
```

**Why NOT to DRAFT:**
- Traditional edit flow returns to DRAFT
- But faculty already reviewed; resubmit goes back to THEM
- `return_target_state` is the SOURCE OF TRUTH

**Workflow Log Query:**
```typescript
// Get the latest RETURN log for this proposal
const lastReturnLog = await prisma.workflowLog.findFirst({
  where: {
    proposalId,
    toState: 'CHANGES_REQUESTED',
    action: 'RETURN',
  },
  orderBy: { timestamp: 'desc' },
});

// Return target fields from the RETURN log
const targetState = lastReturnLog.returnTargetState; // FACULTY_REVIEW
const targetHolder = lastReturnLog.returnTargetHolderUnit; // CNTT-KHOA
```

**SLA Reset:**
- `sla_start_date = now()` - Reset timer
- `sla_deadline = now() + 3 working days` - Fresh 3-day SLA for review

### Previous Story Intelligence

**Story 4.2 (Faculty Return)** stored:
- `return_target_state` in workflow log
- `return_target_holder_unit` in workflow log

**Story 4.3 (Changes Requested Banner)** created:
- `workflowApi.getLatestReturn()` method
- Returns the latest RETURN log with target fields

**Story 4.4 (Revision Panel)** will create:
- Checkbox state for sections marked as fixed
- `checkedSections` array to pass to resubmit

### Project Structure Notes

**Files to Create:**
- `qlnckh/apps/src/modules/workflow/dto/resubmit-proposal.dto.ts` - Resubmit DTO
- `qlnckh/web-apps/src/components/workflow/ResubmitButton.tsx` - Optional separate component

**Files to Modify:**
- `qlnckh/apps/src/modules/workflow/dto/transition.dto.ts` - Add ResubmitProposalDto
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Add resubmitProposal() method
- `qlnckh/apps/src/modules/workflow/workflow.controller.ts` - Add POST /:proposalId/resubmit endpoint
- `qlnckh/apps/src/modules/workflow/workflow.controller.spec.ts` - Add tests
- `qlnckh/web-apps/src/lib/api/workflow.ts` - Add resubmitProposal() method
- `qlnckh/web-apps/src/components/workflow/RevisionPanel.tsx` - Add Resubmit button (Story 4.4)

**Files to Use (No Changes):**
- `qlnckh/apps/src/common/interceptors/idempotency.interceptor.ts` - Idempotency handling (Story 3.8)

### Data Flow

**API Request:**
```http
POST /api/workflow/{proposalId}/resubmit
X-Idempotency-Key: {uuid}

{
  "idempotencyKey": "uuid-v4",
  "checkedSections": ["SEC_METHOD", "SEC_BUDGET"]
}

Response 200:
{
  "success": true,
  "data": {
    "proposalId": "...",
    "previousState": "CHANGES_REQUESTED",
    "currentState": "FACULTY_REVIEW",
    "action": "RESUBMIT",
    "holderUnit": "CNTT-KHOA",
    "holderUser": null,
    "workflowLogId": "log-uuid"
  }
}
```

**Service Logic:**
```typescript
async resubmitProposal(
  proposalId: string,
  checkedSections: string[],
  context: TransitionContext,
): Promise<TransitionResult> {
  // 1. Get latest RETURN log
  const lastReturnLog = await this.prisma.workflowLog.findFirst({
    where: {
      proposalId,
      toState: ProjectState.CHANGES_REQUESTED,
      action: WorkflowAction.RETURN,
    },
    orderBy: { timestamp: 'desc' },
  });

  if (!lastReturnLog) {
    throw new BadRequestException('Cannot find return log for resubmit');
  }

  // 2. Extract return target
  const targetState = lastReturnLog.returnTargetState!;
  const targetHolder = lastReturnLog.returnTargetHolderUnit!;

  // 3. Update proposal
  const now = new Date();
  const slaDeadline = await this.slaCalculator.calculateDeadline(
    now,
    targetState,
  );

  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      state: targetState,
      holderUnit: targetHolder,
      holderUser: lastReturnLog.actorId, // Back to reviewer
      slaStartDate: now,
      slaDeadline,
    },
  });

  // 4. Create workflow log
  const workflowLog = await this.prisma.workflowLog.create({
    data: {
      proposalId,
      action: WorkflowAction.RESUBMIT,
      fromState: ProjectState.CHANGES_REQUESTED,
      toState: targetState,
      actorId: context.userId,
      actorName: actorDisplayName,
      metadata: {
        returnLogId: lastReturnLog.id,
        checkedSections,
      },
    },
  });

  return { ... };
}
```

### Testing Considerations

**Unit Tests:**
1. Resubmit reads return_target from latest RETURN log
2. State transitions to return_target_state (FACULTY_REVIEW)
3. SLA dates reset correctly
4. Workflow log created with RESUBMIT action
5. Idempotency key validation
6. Error when no RETURN log found

**Integration Tests:**
1. Full flow: Return → Revision Panel → Resubmit
2. Revision panel hidden after resubmit
3. Form data preserved after resubmit
4. Resubmit to different holders (different faculties)

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 4.5 created via create-story workflow. Status: ready-for-dev

### File List

**Story File Created:**
- `_bmad-output/implementation-artifacts/stories/4-5-resubmit-action-doc-return-target-tu-log.md`

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev

## References

- [epics.md Story 4.5](../../planning-artifacts/epics.md#L1320-L1364) - Full acceptance criteria
- [architecture.md Return Target](../../planning-artifacts/architecture.md#L267-L296) - Return target fields
- [Story 4.2](./4-2-faculty-return-dialog-reason-code-plus-sections.md) - Faculty return implementation
- [Story 4.3](./4-3-execute-return-changes-requested-plus-return-target.md) - Changes requested banner
