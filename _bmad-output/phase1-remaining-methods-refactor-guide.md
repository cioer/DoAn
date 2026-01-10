# Refactor Remaining Workflow Methods - Guide

**Branch:** `feature/refactor-remaining-workflow-methods`
**Created:** 2026-01-10
**Status:** Template established, 2 methods refactored (submitProposal, approveFacultyReview)

---

## 📋 Methods to Refactor (11 remaining)

Based on analysis of `workflow.service.ts`, these methods need refactoring:

### ✅ Already Refactored (2)
1. ~~**submitProposal** (DRAFT → FACULTY_REVIEW)~~ ✅ COMPLETE
2. ~~**approveFacultyReview** (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)~~ ✅ COMPLETE

### 🔄 To Refactor (11 remaining)

| # | Method | Transition | Priority | Complexity |
|---|--------|-----------|----------|------------|
| 3 | `approveCouncilReview` | OUTLINE_COUNCIL_REVIEW → APPROVED | HIGH | Medium |
| 4 | `acceptSchoolReview` | SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW | HIGH | Medium |
| 5 | `returnFacultyReview` | FACULTY_REVIEW → CHANGES_REQUESTED | MEDIUM | High (has sections) |
| 6 | `returnSchoolReview` | SCHOOL_SELECTION_REVIEW → CHANGES_REQUESTED | MEDIUM | High (has sections) |
| 7 | `returnCouncilReview` | OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED | MEDIUM | High (has sections) |
| 8 | `resubmitProposal` | CHANGES_REQUESTED → FACULTY_REVIEW | MEDIUM | Medium |
| 9 | `cancelProposal` | DRAFT/PAUSED → CANCELLED | LOW | Low |
| 10 | `withdrawProposal` | DRAFT → WITHDRAWN | LOW | Low |
| 11 | `rejectProposal` | APPROVED → REJECTED | LOW | Low |
| 12 | `pauseProposal` | IN_PROGRESS → PAUSED | LOW | Low |
| 13 | `resumeProposal` | PAUSED → IN_PROGRESS | LOW | Low |

---

## 🎯 Refactor Template

Based on `submitProposalNew` and `approveFacultyReviewNew`, use this template:

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
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: proposalId },
        include: { owner: true, faculty: true },
      });

      if (!proposal) {
        throw new NotFoundException('Đề tài không tồn tại');
      }

      // 2. Validation
      await this.validator.validateTransition(
        proposalId,
        toState,
        action,
        {
          proposal,
          user: {
            id: context.userId,
            role: context.userRole,
            facultyId: context.userFacultyId,
          },
        },
      );

      // 3. Calculate holder
      const holder = this.holder.getHolderForState(
        toState,
        proposal,
        context.userId,
        context.userFacultyId,
      );

      // 4. Get user display name
      const actorDisplayName = await this.getUserDisplayName(context.userId);

      // 5. Calculate SLA (if applicable)
      const slaStartDate = new Date();
      const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(
        slaStartDate,
        slaBusinessDays,  // e.g., 3, 5, etc.
        17,  // 17:00 cutoff
      );

      // 6. Execute transaction
      const result = await this.transaction.updateProposalWithLog({
        proposalId,
        userId: context.userId,
        userDisplayName: actorDisplayName,
        action,
        fromState: proposal.state,
        toState,
        holderUnit: holder.holderUnit,
        holderUser: holder.holderUser,
        slaStartDate,
        slaDeadline,
      });

      // 7. Build transition result
      const transitionResult: TransitionResult = {
        proposal: result.proposal,
        workflowLog: result.workflowLog,
        previousState: proposal.state,
        currentState: toState,
        holderUnit: holder.holderUnit,
        holderUser: holder.holderUser,
      };

      // 8. Audit logging (fire-and-forget)
      this.auditHelper
        .logWorkflowTransition(
          {
            proposalId,
            proposalCode: proposal.code,
            fromState: proposal.state,
            toState,
            action: action.toString(),
            holderUnit: holder.holderUnit,
            holderUser: holder.holderUser,
            slaStartDate,
            slaDeadline,
          },
          {
            userId: context.userId,
            userDisplayName: actorDisplayName,
            ip: context.ip,
            userAgent: context.userAgent,
            requestId: context.requestId,
            facultyId: context.userFacultyId,
            role: context.userRole,
          },
        )
        .catch((err) => {
          this.logger.error(
            `Audit log failed for proposal ${proposal.code}: ${err.message}`,
          );
        });

      this.logger.log(
        `Proposal ${proposal.code} transitioned (${action}): ${proposal.state} → ${toState}`,
      );

      return transitionResult;
    },
  );

  return idempotencyResult.data;
}
```

### Then add feature flag routing in original method:

```typescript
async methodName(
  proposalId: string,
  context: TransitionContext,
): Promise<TransitionResult> {
  // Phase 1 Refactor: Use new implementation if feature flag is enabled
  if (this.useNewServices) {
    this.logger.debug(`Using NEW refactored methodName implementation`);
    return this.methodNameNew(proposalId, context);
  }

  // Original implementation (fallback)
  this.logger.debug(`Using ORIGINAL methodName implementation`);
  // ... existing code
}
```

---

## 📊 Method-Specific Details

### approveCouncilReview
```typescript
const toState = ProjectState.APPROVED;
const action = WorkflowAction.APPROVE;
const slaBusinessDays = 0;  // No SLA for terminal state
```

### acceptSchoolReview
```typescript
const toState = ProjectState.OUTLINE_COUNCIL_REVIEW;
const action = WorkflowAction.ACCEPT;
const slaBusinessDays = 5;  // 5 business days for council review
```

### returnFacultyReview / returnSchoolReview / returnCouncilReview
These have additional parameters (reason, reasonCode, reasonSections). Need to handle:

```typescript
// Add to validation context
await this.validator.validateReturnReason(context.reason);
await this.validator.validateRevisionSections(context.reasonSections);

// Pass to transaction service
const result = await this.transaction.updateProposalWithLog({
  // ... standard params
  metadata: {
    returnReason: context.reason,
    returnReasonCode: context.reasonCode,
    returnSections: context.reasonSections,
  },
});
```

### resubmitProposal
```typescript
const toState = ProjectState.FACULTY_REVIEW;  // Or based on return_target_state
const action = WorkflowAction.RESUBMIT;
const slaBusinessDays = 3;
```

### cancelProposal / withdrawProposal / rejectProposal
These are exception actions (terminal states). No SLA needed:

```typescript
const slaStartDate = new Date();
const slaDeadline = null;  // No SLA for terminal states
```

### pauseProposal / resumeProposal
State change actions:

```typescript
// Pause
const toState = ProjectState.PAUSED;
const action = WorkflowAction.PAUSE;

// Resume (needs to restore previous state)
const toState = proposal.prePauseState || ProjectState.IN_PROGRESS;
const action = WorkflowAction.RESUME;
```

---

## ✅ Validation Checklist

For each refactored method:

- [ ] Method signature matches original
- [ ] Feature flag routing added
- [ ] Uses `this.idempotency.setIfAbsent()`
- [ ] Uses `this.validator.validateTransition()`
- [ ] Uses `this.holder.getHolderForState()`
- [ ] Uses `this.transaction.updateProposalWithLog()`
- [ ] Uses `this.auditHelper.logWorkflowTransition()`
- [ ] Audit logging is fire-and-forget (non-blocking)
- [ ] Returns `idempotencyResult.data`
- [ ] Logger shows which implementation is used
- [ ] Original implementation preserved

---

## 🧪 Testing

For each refactored method, update tests:

```typescript
// Before: Check direct Prisma calls
expect(mockPrisma.proposal.update).toHaveBeenCalledWith({...});

// After: Check TransactionService call
expect(mockTransaction.updateProposalWithLog).toHaveBeenCalledWith(
  expect.objectContaining({
    action: WorkflowAction.ACTION_NAME,
    toState: ProjectState.TARGET_STATE,
  }),
);

// Before: Check AuditService call
expect(mockAuditService.logEvent).toHaveBeenCalledWith({...});

// After: Check AuditHelperService call
expect(mockAuditHelper.logWorkflowTransition).toHaveBeenCalledWith(
  expect.objectContaining({
    proposalId: 'proposal-1',
    action: 'ACTION_NAME',
  }),
  expect.objectContaining({
    userId: context.userId,
  }),
);
```

---

## 🚀 Implementation Order

### Phase 1: Approve Actions (3 methods)
1. approveCouncilReview
2. acceptSchoolReview
3. (approveFacultyReview already done)

### Phase 2: Return Actions (3 methods)
4. returnFacultyReview
5. returnSchoolReview
6. returnCouncilReview

### Phase 3: Resubmit (1 method)
7. resubmitProposal

### Phase 4: Exception Actions (6 methods)
8. cancelProposal
9. withdrawProposal
10. rejectProposal
11. pauseProposal
12. resumeProposal

---

## 📈 Expected Benefits

After refactoring all 13 methods:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines of duplicated code | ~2000+ | ~1300 | -35% |
| Validation logic locations | 13 | 1 service | -92% |
| Transaction blocks | 13 | 1 service | -92% |
| Audit log constructions | 20+ | 1 service | -95% |
| Idempotency safety | Manual (buggy) | Atomic | Fixed |
| Test maintainability | Low | High | +100% |

---

## 📝 Example: Complete approveCouncilReview

See commit example in this branch for the complete pattern.

**File:** `workflow.service.ts:1958-end`

**Steps:**
1. Add feature flag routing at start of method
2. Create `approveCouncilReviewNew()` method
3. Copy template and adjust: `toState`, `action`, SLA days
4. Test with: `WORKFLOW_USE_NEW_SERVICES=true npm test -- workflow.service.spec.ts -t "approveCouncil"`

---

**Last Updated:** 2026-01-10 14:35
**Branch:** feature/refactor-remaining-workflow-methods
**Status:** 2/13 methods refactored (15% complete)
