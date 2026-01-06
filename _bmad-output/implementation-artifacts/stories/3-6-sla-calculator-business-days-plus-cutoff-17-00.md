# Story 3.6: SLA Calculator (Business Days + Cutoff 17:00)

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Hệ thống,
I want tính toán SLA deadline theo ngày làm việc + cutoff 17:00,
So that SLA badge hiển thị chính xác.

## Acceptance Criteria

1. **AC1: Cutoff time 17:00 logic**
   - Given submit_time = Friday 16:59
   - When workingDays = 3
   - Then deadline = Tuesday 17:00
     - Fri = day 1 (16:59 < 17:00, count as day 1)
     - Sat = skip (non-working)
     - Sun = skip (non-working)
     - Mon = day 2
     - Tue = day 3, 17:00

2. **AC2: Submit after cutoff**
   - Given submit_time = Friday 17:01
   - When workingDays = 3
   - Then deadline = Wednesday 17:00
     - Fri = không count (sau 17:00)
     - Sat = skip
     - Sun = skip
     - Mon = day 1
     - Tue = day 2
     - Wed = day 3, 17:00

3. **AC3: Holiday handling**
   - Given business_calendar has holiday on Monday
   - And submit_time = Friday 14:00
   - And workingDays = 3
   - Then deadline = Wednesday 17:00
     - Fri = day 1
     - Sat/Sun = skip
     - Mon = skip (holiday)
     - Tue = day 2
     - Wed = day 3, 17:00

4. **AC4: calculateDeadlineWithCutoff() method**
   - Given SlaService is called
   - When calculateDeadlineWithCutoff(startDate, businessDays, cutoffHour)
   - Then returns deadline accounting for:
     - If startDate time > cutoffHour → start from next business day
     - Add business days excluding weekends and holidays
     - Set deadline time to cutoffHour

## Tasks / Subtasks

- [ ] Task 1: Add calculateDeadlineWithCutoff method to SlaService (AC: #1, #2, #4)
  - [ ] Check if startDate time is after cutoffHour
  - [ ] If after cutoff, find next business day to start counting
  - [ ] Add business days excluding weekends and holidays
  - [ ] Set deadline time to cutoffHour (17:00)

- [ ] Task 2: Update workflow submit to use new cutoff-aware method (AC: #1, #2)
  - [ ] Update submitProposal() to use calculateDeadlineWithCutoff()
  - [ ] Verify existing tests still pass

- [ ] Task 3: Add comprehensive tests for cutoff logic (AC: #1, #2, #3)
  - [ ] Test submit before cutoff (Friday 16:59 + 3 days = Tuesday 17:00)
  - [ ] Test submit after cutoff (Friday 17:01 + 3 days = Wednesday 17:00)
  - [ ] Test submit exactly at cutoff (Friday 17:00 + 3 days = Tuesday 17:00)
  - [ ] Test with holiday on business day
  - [ ] Test weekend edge cases

- [ ] Task 4: Run all tests and verify no regressions
  - [ ] Run sla.service.spec.ts
  - [ ] Run workflow.service.spec.ts
  - [ ] Ensure no regressions in existing tests

## Dev Notes

### Architecture References

**SLA Requirements (from Epic 3.6):**
- FR16: Cutoff Time — 17:00 (5 PM) — submissions after this count from next business day
- FR17: Working Days — Mon–Fri working, Sat–Sun non-working, holidays non-working

**Source:** [epics.md Story 3.6](../../planning-artifacts/epics.md#L951-L991)

### Previous Story Intelligence

**What Story 1.8 Already Implemented:**
- `addBusinessDays(date, n)` - Add n business days to date
- `calculateDeadline(startDate, businessDays, cutoffHour)` - Basic deadline calculation
- `isBusinessDay(date)` - Check if date is a business day (NOT weekend AND NOT holiday)
- `countBusinessDays(startDate, endDate)` - Count business days between dates
- `isDeadlineOverdue(deadline)` - Check if deadline is overdue
- `getRemainingBusinessDays(deadline)` - Get remaining business days until deadline

**What's Missing for Story 3.6:**
- Cutoff time handling: If submit time > cutoffHour, start counting from NEXT business day
- Current `calculateDeadline()` does NOT check submit time vs cutoff

### Implementation Considerations

1. **New method needed: `calculateDeadlineWithCutoff()`**
   - Check if `startDate.getHours() > cutoffHour`
   - If after cutoff: find next business day first, then add business days
   - If before/at cutoff: add business days directly (current behavior)

2. **Algorithm:**
   ```typescript
   async calculateDeadlineWithCutoff(
     startDate: Date,
     businessDays: number,
     cutoffHour = 17
   ): Promise<Date> {
     let countFromDate = new Date(startDate);

     // Check if submit time is after cutoff
     if (startDate.getHours() >= cutoffHour) {
       // Find next business day to start counting
       countFromDate = await this.nextBusinessDay(startDate);
       countFromDate.setHours(0, 0, 0, 0); // Reset to midnight
     }

     // Add business days from countFromDate
     const deadline = await this.addBusinessDays(countFromDate, businessDays);
     deadline.setHours(cutoffHour, 0, 0, 0);
     return deadline;
   }
   ```

3. **Edge cases to test:**
   - Submit at exactly 17:00:00 (should count as day 1)
   - Submit at 16:59:59 (should count as day 1)
   - Submit at 17:00:01 (should start from next business day)
   - Submit on Friday before/after cutoff
   - Holiday falls on counting day

### Project Structure Notes

**Files to Modify:**
- `apps/src/modules/calendar/sla.service.ts` - Add calculateDeadlineWithCutoff() method
- `apps/src/modules/workflow/workflow.service.ts` - Update submitProposal() to use new method

**Files to Use (No Changes):**
- `apps/src/modules/calendar/calendar.service.ts` - Use existing isBusinessDay()
- `apps/src/modules/calendar/sla.service.spec.ts` - Add new tests

### References

- [epics.md Story 3.6](../../planning-artifacts/epics.md#L951-L991) - Full acceptance criteria
- [Story 1.8](../1-8-business-calendar-basic-nhung-du-de-sla-chay-sau.md) - Previous SLA implementation
- [SlaService](../../../qlnckh/apps/src/modules/calendar/sla.service.ts) - Existing SLA methods

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 3.6 created from Epic 3 requirements. Key points:
- SlaService already has basic SLA calculation from Story 1.8
- Main task: Add cutoff time handling (submit after 17:00 starts from next business day)
- New method: calculateDeadlineWithCutoff() will handle cutoff logic
- Update submitProposal() to use the new method

### File List

**Files to Modify:**
- `apps/src/modules/calendar/sla.service.ts` - Add calculateDeadlineWithCutoff() method
- `apps/src/modules/calendar/sla.service.spec.ts` - Add cutoff logic tests
- `apps/src/modules/workflow/workflow.service.ts` - Update submitProposal() to use new method

**Files to Use (No Changes):**
- `apps/src/modules/calendar/calendar.service.ts` - Use existing isBusinessDay()
- `apps/src/modules/workflow/workflow.service.spec.ts` - May need test updates

## Change Log

- 2026-01-06: Story created. Ready for dev.
