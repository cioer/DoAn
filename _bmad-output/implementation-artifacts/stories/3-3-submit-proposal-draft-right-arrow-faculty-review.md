# Story 3.3: Submit Proposal (DRAFT → FACULTY_REVIEW)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên (PROJECT_OWNER),
I want nộp hồ sơ đề tài,
so that hồ sơ được gửi đến Khoa duyệt.

## Acceptance Criteria

1. **AC1: Required field validation before submit**
   - Given Giảng viên đang ở màn hình Edit Proposal với state = DRAFT
   - When click button "Nộp hồ sơ"
   - Then UI validate tất cả required fields
   - And nếu có field thiếu, highlight và show error

2. **AC2: State transition DRAFT → FACULTY_REVIEW**
   - Given Tất cả required fields đã điền đủ
   - When Giảng viên click "Nộp hồ sơ"
   - Then proposal.state chuyển từ DRAFT → FACULTY_REVIEW
   - And proposal.holder_unit = proposal.faculty_id

3. **AC3: SLA dates calculated on submit**
   - Given Giảng viên click "Nộp hồ sơ"
   - Then proposal.sla_start_date = now()
   - And proposal.sla_deadline = sla_start_date + 3 working days
   - And deadline uses 17:00 cutoff hour

4. **AC4: Workflow log entry created**
   - Given Giảng viên click "Nộp hồ sơ"
   - Then workflow_logs entry được tạo:
     - action = SUBMIT
     - from_state = DRAFT
     - to_state = FACULTY_REVIEW

5. **AC5: Idempotency - prevent double submit**
   - Given Giảng viên click "Nộp hồ sơ" 2 lần với cùng idempotency key
   - When request thứ 2 đến
   - Then server trả về result đã cached từ request thứ 1
   - And KHÔNG tạo duplicate workflow_logs entry

## Tasks / Subtasks

- [x] Task 1: Inject SlaService into WorkflowService (AC: #3)
  - [x] Add SlaService to WorkflowService constructor
  - [x] Import SlaService from calendar module
  - [x] Verify SlaService.calculateDeadline() is available

- [x] Task 2: Integrate SLA calculation into submitProposal (AC: #2, #3, #4)
  - [x] Call slaService.calculateDeadline() in submitProposal()
  - [x] Set sla_start_date = now() when submitting
  - [x] Set sla_deadline = calculateDeadline(now, 3, 17)
  - [x] Update Prisma transaction to include slaStartDate and slaDeadline

- [x] Task 3: Verify existing submitProposal functionality (AC: #2, #4, #5)
  - [x] Verify DRAFT → FACULTY_REVIEW transition works
  - [x] Verify holder_unit = faculty_id assignment
  - [x] Verify workflow_logs entry creation
  - [x] Verify idempotency cache returns cached result

- [x] Task 4: Write tests for SLA integration (AC: #3)
  - [x] Test sla_start_date is set to current time
  - [x] Test sla_deadline is 3 business days + 17:00 cutoff
  - [x] Test deadline skips weekends correctly
  - [x] Test deadline skips holidays (if test holidays exist)

- [x] Task 5: Verify all tests pass
  - [x] Run workflow.service.spec.ts
  - [x] Ensure no regressions in existing tests

## Dev Notes

### Architecture References

**SLA Calculation (from Epic 3.3):**
- sla_start_date = now() (timestamp khi submit)
- sla_deadline = sla_start_date + 3 working days (not calendar days)
- Cutoff hour = 17:00 (5 PM)
- SlaService already implements business day calculation

**Source:** [epics.md Story 3.3](../../../_bmad-output/planning-artifacts/epics.md#L848-L877)

### Previous Story Intelligence (Story 3.1 & 3.2)

**What Story 3.1 Already Implemented:**
- Created `WorkflowService` with `submitProposal()` method
- State transition: DRAFT → FACULTY_REVIEW (direct, no SUBMITTED state)
- Idempotency support with in-memory Map (to be Redis in Epic 3.8)
- Workflow log entry creation with action=SUBMIT
- RBAC validation via `validateActionPermission()`
- User display name fetched for audit logs

**What Story 3.2 Already Implemented:**
- `getHolderForState()` helper for holder assignment
- Queue filter helpers: `getMyQueueProposalsFilter()`, `getMyProposalsFilter()`, `getOverdueProposalsFilter()`

**What Story 3.3 Must Add:**
- SLA date calculation integration into submitProposal()
- Set `sla_start_date` and `sla_deadline` on proposal submission

### Project Structure Notes

**Existing Files to Modify:**
- `apps/src/modules/workflow/workflow.service.ts` - Add SLA calculation
- `apps/src/modules/workflow/workflow.service.spec.ts` - Add SLA tests

**Existing Services to Use:**
- `apps/src/modules/calendar/sla.service.ts` - Has `calculateDeadline(startDate, businessDays, cutoffHour)`
- `apps/src/modules/calendar/calendar.service.ts` - Business calendar (weekends + holidays)

### Implementation Considerations

1. **SLA Service Integration:**
   - Import: `import { SlaService } from '../calendar/sla.service';`
   - Inject into constructor: `constructor(private prisma: PrismaService, private auditService: AuditService, private slaService: SlaService)`
   - WorkflowModule needs to import CalendarModule (or provide SlaService)

2. **SLA Calculation in submitProposal():**
   ```typescript
   const now = new Date();
   const slaDeadline = await this.slaService.calculateDeadline(now, 3, 17); // 3 business days, 17:00 cutoff
   ```

3. **Database Update:**
   ```typescript
   const updated = await tx.proposal.update({
     where: { id: proposalId },
     data: {
       state: toState,
       holderUnit: holder.holderUnit,
       holderUser: holder.holderUser,
       slaStartDate: now,        // NEW for Story 3.3
       slaDeadline: slaDeadline,  // NEW for Story 3.3
     },
   });
   ```

4. **Module Dependencies:**
   - WorkflowModule may need to import CalendarModule for SlaService
   - Alternative: Provide SlaService directly if circular dependency issues

5. **Testing Standards:**
   - Use manual DI bypass pattern (Epic 2 lesson learned)
   - Mock SlaService.calculateDeadline() to return predictable dates
   - Test with both date assertions and business day logic

6. **Idempotency Note:**
   - Cached results should include SLA dates from original submit
   - Second submit with same idempotency key returns same SLA dates

### References

- [epics.md Story 3.3](../../../_bmad-output/planning-artifacts/epics.md#L848-L877) - Full acceptance criteria
- [sla.service.ts](../../../qlnckh/apps/src/modules/calendar/sla.service.ts) - SLA calculation service
- [Story 3.1 Completion Notes](../3-1-16-canonical-states-plus-transitions.md) - Previous story context
- [Story 3.2 Completion Notes](../3-2-holder-rules-holder-unit-plus-holder-user.md) - Previous story context

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 3.3 created from Epic 3 requirements. Key points:
- submitProposal() already exists (Story 3.1) but lacks SLA dates
- SlaService.calculateDeadline() already available (Story 1.8)
- Main task: Integrate SLA calculation into submit flow
- Frontend validation (AC1) is out of scope for backend story

### File List

**Files to Modify:**
- `apps/src/modules/workflow/workflow.module.ts` - Import CalendarModule or provide SlaService
- `apps/src/modules/workflow/workflow.service.ts` - Inject SlaService, add SLA calculation
- `apps/src/modules/workflow/workflow.service.spec.ts` - Add SLA tests

**Files to Use (No Changes):**
- `apps/src/modules/calendar/sla.service.ts` - Use calculateDeadline()
- `apps/src/modules/calendar/calendar.service.ts` - Use business day logic

## Change Log

- 2026-01-06: Story created. Ready for dev.
