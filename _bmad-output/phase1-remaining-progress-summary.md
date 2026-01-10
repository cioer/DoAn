# Phase 1 Remaining Methods Refactor - Progress Summary

**Branch:** `feature/refactor-remaining-workflow-methods`
**Last Updated:** 2026-01-10 14:42
**Status:** Phase 1 Complete ✅ | 4/13 methods refactored (31%)

---

## 🎯 Tổng Quan

Refactor các workflow methods còn lại để sử dụng extracted services,
giảm code duplication và tăng khả năng maintain.

---

## ✅ Hoàn Thành (4 methods - Phase 1)

### 1. submitProposal (DRAFT → FACULTY_REVIEW)
**Status:** ✅ Complete (from Task 1.6)
**File:** `workflow.service.ts:320-441`
**Lines:** 122 lines (vs 128 old)
**Services:**
- `IdempotencyService.setIfAbsent()` - Atomic idempotency
- `WorkflowValidatorService.validateTransition()` - Validation
- `HolderAssignmentService.getHolderForState()` - Holder calculation
- `TransactionService.updateProposalWithLog()` - Transaction orchestration
- `AuditHelperService.logWorkflowTransition()` - Audit logging

**SLA:** 3 business days, 17:00 cutoff

### 2. approveFacultyReview (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
**Status:** ✅ Complete (from Task 1.6)
**File:** `workflow.service.ts:588-707`
**Lines:** 120 lines
**Services:** All 5 extracted services
**SLA:** 3 business days, 17:00 cutoff
**Holder:** PHONG_KHCN

### 3. approveCouncilReview (OUTLINE_COUNCIL_REVIEW → APPROVED)
**Status:** ✅ Complete (this branch)
**File:** `workflow.service.ts:2219-2334`
**Lines:** 116 lines
**Services:** All 5 extracted services
**SLA:** None (terminal state)
**Holder:** null (no holder after approval)

**Special Note:** Terminal state (APPROVED) - no SLA deadline needed

### 4. acceptSchoolReview (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
**Status:** ✅ Complete (this branch)
**File:** `workflow.service.ts:2617-2732`
**Lines:** 116 lines
**Services:** All 5 extracted services
**SLA:** None (handover phase)
**Holder:** PHONG_KHCN (fixed)

---

## 📊 Test Results

```bash
WORKFLOW_USE_NEW_SERVICES=true npm test -- workflow.service.spec.ts
```

**Result:** ✅ **130/130 tests passing**

```
Test Files: 1 passed (1)
Tests: 130 passed (130)
Duration: 1.36s
```

**Log Evidence:**
```
[WorkflowService] Using NEW refactored submitProposal implementation
[WorkflowService] Using NEW refactored approveFacultyReview implementation
[WorkflowService] Using NEW refactored approveCouncilReview implementation
[WorkflowService] Using NEW refactored acceptSchoolReview implementation
```

---

## 🔄 Còn Lại (9 methods)

### Phase 2: Return Actions (3 methods) - HIGH COMPLEXITY

| Method | Transition | Complexity | Notes |
|--------|-----------|------------|-------|
| returnFacultyReview | FACULTY_REVIEW → CHANGES_REQUESTED | HIGH | Has reason, reasonCode, reasonSections |
| returnSchoolReview | SCHOOL_SELECTION_REVIEW → CHANGES_REQUESTED | HIGH | Has reason, reasonCode, reasonSections |
| returnCouncilReview | OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED | HIGH | Has reason, reasonCode, reasonSections |

**Additional logic needed:**
- Validate return reason (min 10 characters)
- Validate revision sections array
- Store returnTargetState for resubmit
- Store returnSections in metadata

### Phase 3: Resubmit (1 method) - HIGH COMPLEXITY

| Method | Transition | Complexity | Notes |
|--------|-----------|------------|-------|
| resubmitProposal | CHANGES_REQUESTED → FACULTY_REVIEW | HIGH | Fetch return target from last RETURN log |

**Additional logic needed:**
- Fetch latest RETURN workflow log
- Extract returnTargetState and returnTargetHolderUnit
- Validate checkedSections against revisionSections
- Dynamic target state based on return target

### Phase 4: Exception Actions (5 methods) - LOW COMPLEXITY

| Method | Transition | Complexity | Notes |
|--------|-----------|------------|-------|
| cancelProposal | DRAFT/PAUSED → CANCELLED | LOW | Terminal state |
| withdrawProposal | DRAFT → WITHDRAWN | LOW | Terminal state |
| rejectProposal | APPROVED → REJECTED | LOW | Terminal state |
| pauseProposal | IN_PROGRESS → PAUSED | LOW | Store prePauseState |
| resumeProposal | PAUSED → IN_PROGRESS | LOW | Restore prePauseState |

**Simpler because:**
- No SLA needed (terminal states)
- Straightforward state transitions
- Minimal additional logic

---

## 📈 Code Metrics

### Lines of Code Reduction

| Metric | Before (4 methods) | After (4 methods) | Reduction |
|--------|-------------------|-------------------|-----------|
| Total Lines | ~512 | ~474 | -7.4% |
| Validation Logic | 4 duplicates | 1 service | -75% |
| Transaction Blocks | 4 duplicates | 1 service | -75% |
| Audit Log Constructions | 4 duplicates | 1 service | -75% |
| Idempotency Safety | Manual (buggy) | Atomic | Fixed ✅ |

### Extrapolated to All 13 Methods

| Metric | Before (13 methods) | After (13 methods) | Reduction |
|--------|---------------------|---------------------|-----------|
| Total Lines | ~1664 | ~1540 | **-7.4%** |
| Validation Logic | 13 duplicates | 1 service | **-92%** |
| Transaction Blocks | 13 duplicates | 1 service | **-92%** |
| Audit Log Constructions | 13+ duplicates | 1 service | **-95%** |

---

## 🎯 Refactor Pattern

All refactored methods follow this pattern:

```typescript
async methodNameNew(
  proposalId: string,
  context: TransitionContext,
): Promise<TransitionResult> {
  const toState = ProjectState.TARGET_STATE;
  const action = WorkflowAction.ACTION_NAME;

  // Atomic idempotency
  const idempotencyResult = await this.idempotency.setIfAbsent(
    context.idempotencyKey || `action-${proposalId}`,
    async () => {
      // 1. Get proposal
      const proposal = await this.prisma.proposal.findUnique({...});

      // 2. Validate
      await this.validator.validateTransition(proposalId, toState, action, {...});

      // 3. Calculate holder
      const holder = this.holder.getHolderForState(toState, proposal, ...);

      // 4. Get user display name
      const actorDisplayName = await this.getUserDisplayName(context.userId);

      // 5. Calculate SLA (if applicable)
      const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(...);

      // 6. Execute transaction
      const result = await this.transaction.updateProposalWithLog({...});

      // 7. Audit logging (fire-and-forget)
      this.auditHelper.logWorkflowTransition(result, context).catch(...);

      return transitionResult;
    },
  );

  return idempotencyResult.data;
}
```

### Then add feature flag routing:

```typescript
async methodName(proposalId, context) {
  if (this.useNewServices) {
    this.logger.debug('Using NEW refactored methodName implementation');
    return this.methodNameNew(proposalId, context);
  }

  this.logger.debug('Using ORIGINAL methodName implementation');
  // ... existing code
}
```

---

## 🚀 Commits

### Commit 1: `f17c624`
```
feat(phase-1): refactor approveCouncilReview and acceptSchoolReview

- Add feature flag routing
- Create New methods using extracted services
- approveCouncilReview: Terminal state, no SLA
- acceptSchoolReview: Fixed holder PHONG_KHCN
- Phase 1 Complete: 4/4 approve/accept methods ✅
```

### Commit 2: `df10c00`
```
fix(tests): update approveFacultyReview test to check transaction service

Phase 1 Refactor: Update test to verify mockTransaction.updateProposalWithLog
instead of mockPrisma.workflowLog.create.

All 130 tests passing with feature flag ON ✅
```

---

## 📋 Next Steps

### Option 1: Continue with Remaining Methods (Recommended)

```bash
# Stay on branch
git checkout feature/refactor-remaining-workflow-methods

# Follow phases in order:
# Phase 2: Return actions (3 methods) - complex
# Phase 3: Resubmit (1 method) - complex
# Phase 4: Exception actions (5 methods) - simpler
```

**Estimated Time:**
- Phase 2: 2-3 hours (complex return logic)
- Phase 3: 1 hour (return target logic)
- Phase 4: 1-2 hours (simpler logic)
- **Total: 4-6 hours**

### Option 2: Merge to Main & Continue Later

```bash
# Merge current progress to main
git checkout main
git merge feature/refactor-remaining-workflow-methods

# Create new branch for remaining work
git checkout -b feature/refactor-phase-2-3-4
```

**Benefits:**
- ✅ Safe, incremental progress
- ✅ 31% complete (4/13 methods)
- ✅ All tests passing
- ✅ Pattern validated
- ✅ Ready for production (with feature flag)

---

## 📚 Documentation

- **Guide:** [`phase1-remaining-methods-refactor-guide.md`](../phase1-remaining-methods-refactor-guide.md)
- **Implementation Plan:** [`implementation-artifacts/implementation-plan-phase1.md`](../implementation-artifacts/implementation-plan-phase1.md)
- **Task 1.6 Summary:** [`phase1-task1.6-submitproposal-refactor-summary.md`](../phase1-task1.6-submitproposal-refactor-summary.md)

---

## ✅ Validation Checklist

### For Each Refactored Method:

- [x] Method signature matches original
- [x] Feature flag routing added
- [x] Uses `IdempotencyService.setIfAbsent()`
- [x] Uses `WorkflowValidatorService.validateTransition()`
- [x] Uses `HolderAssignmentService.getHolderForState()`
- [x] Uses `TransactionService.updateProposalWithLog()`
- [x] Uses `AuditHelperService.logWorkflowTransition()`
- [x] Audit logging is fire-and-forget (non-blocking)
- [x] Returns `idempotencyResult.data`
- [x] Logger shows which implementation is used
- [x] Original implementation preserved
- [x] All tests passing (130/130) ✅

---

**Last Updated:** 2026-01-10 14:42
**Branch:** feature/refactor-remaining-workflow-methods
**Progress:** 4/13 methods complete (31%)
**Test Status:** 130/130 passing ✅
**Next Phase:** Phase 2 - Return Actions (3 methods)
