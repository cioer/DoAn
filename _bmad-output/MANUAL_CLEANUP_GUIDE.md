# Manual Cleanup Guide - Remove Old Code from workflow.service.ts

## Strategy

Because the file is 4,232 lines with complex logic, **manual cleanup is the safest approach**.

---

## Pre-Cleanup Checklist

- [x] Backup branch created: `backup-with-old-code`
- [x] Current branch: `main`
- [x] All tests passing with feature flag ON
- [ ] Ready to begin cleanup

---

## Step-by-Step Cleanup Instructions

### Overview
For each of the 13 methods, you'll:
1. Remove the `if (this.useNewServices)` check
2. Remove the old implementation
3. Rename the `*New` method to the original name
4. Test to verify

---

## Method 1: submitProposal

**Location:** Lines ~155-450

### Current Structure:
```typescript
async submitProposal(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
  // Phase 1 Refactor: Use new implementation if feature flag is enabled
  if (this.useNewServices) {
    this.logger.debug('Using NEW refactored submitProposal implementation');
    return this.submitProposalNew(proposalId, context);
  }

  // Original implementation (fallback)
  this.logger.debug('Using ORIGINAL submitProposal implementation');
  // ... ~150 lines of old code
}

async submitProposalNew(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
  // ... ~122 lines of new code
}
```

### Cleanup Actions:

1. **Remove lines 155-319** (old submitProposal implementation)
   - Keep only: `async submitProposalNew(...)`

2. **Rename method** at line 320:
   - FROM: `async submitProposalNew(`
   - TO: `async submitProposal(`

3. **Update JSDoc** at line 322-324:
   - Change comment to remove "New" references

4. **Remove old method completely** (lines 155-319)

### Result:
```typescript
async submitProposal(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
  // Only the new implementation (~122 lines)
}
```

---

## Method 2: approveFacultyReview

**Location:** Lines ~450-720

### Cleanup Actions:
1. Remove old implementation (lines ~460-590)
2. Rename `approveFacultyReviewNew` → `approveFacultyReview`
3. Update JSDoc

---

## Method 3: approveCouncilReview

**Location:** Lines ~1615-1900

### Cleanup Actions:
1. Remove old implementation
2. Rename `approveCouncilReviewNew` → `approveCouncilReview`
3. Update JSDoc

---

## Method 4: acceptSchoolReview

**Location:** Lines ~1890-2200

### Cleanup Actions:
1. Remove old implementation
2. Rename `acceptSchoolReviewNew` → `acceptSchoolReview`
3. Update JSDoc

---

## Method 5: returnFacultyReview

**Location:** Lines ~720-1020

### Cleanup Actions:
1. Remove old implementation
2. Rename `returnFacultyReviewNew` → `returnFacultyReview`
3. Update JSDoc

---

## Method 6: returnSchoolReview

**Location:** Lines ~3630-3910

### Cleanup Actions:
1. Remove old implementation
2. Rename `returnSchoolReviewNew` → `returnSchoolReview`
3. Update JSDoc

---

## Method 7: returnCouncilReview

**Location:** Lines ~3230-3510

### Cleanup Actions:
1. Remove old implementation
2. Rename `returnCouncilReviewNew` → `returnCouncilReview`
3. Update JSDoc

---

## Method 8: resubmitProposal

**Location:** Lines ~1020-1400

### Cleanup Actions:
1. Remove old implementation
2. Rename `resubmitProposalNew` → `resubmitProposal`
3. Update JSDoc

---

## Method 9: cancelProposal

**Location:** Lines ~2030-2340

### Cleanup Actions:
1. Remove old implementation
2. Rename `cancelProposalNew` → `cancelProposal`
3. Update JSDoc

---

## Method 10: withdrawProposal

**Location:** Lines ~2340-2670

### Cleanup Actions:
1. Remove old implementation
2. Rename `withdrawProposalNew` → `withdrawProposal`
3. Update JSDoc

---

## Method 11: rejectProposal

**Location:** Lines ~2660-2860

### Cleanup Actions:
1. Remove old implementation
2. Rename `rejectProposalNew` → `rejectProposal`
3. Update JSDoc

---

## Method 12: pauseProposal

**Location:** Lines ~3000-3170

### Cleanup Actions:
1. Remove old implementation
2. Rename `pauseProposalNew` → `pauseProposal`
3. Update JSDoc

---

## Method 13: resumeProposal

**Location:** Lines ~3420-3630

### Cleanup Actions:
1. Remove old implementation
2. Rename `resumeProposalNew` → `resumeProposal`
3. Update JSDoc

---

## Final Cleanup Steps

### 1. Remove Feature Flag Property

**Lines 83-84:**
```typescript
// DELETE THESE LINES:
// Phase 1 Refactor: Feature flag to enable new refactored implementations
// Set to true in .env: WORKFLOW_USE_NEW_SERVICES=true
private readonly useNewServices = process.env.WORKFLOW_USE_NEW_SERVICES === 'true';
```

### 2. Remove from package.json

**File:** `qlnckh/package.json`

**Find and remove:**
```json
"WORKFLOW_USE_NEW_SERVICES": "true"
```

### 3. Update Tests

**File:** `qlnckh/apps/src/modules/workflow/workflow.service.spec.ts`

**Remove all instances of:**
```typescript
WORKFLOW_USE_NEW_SERVICES=true
```

### 4. Update Documentation

**Files to update:**
- `_bmad-output/phase1-complete-final-summary.md`
- Remove all mentions of feature flag
- Update to reflect that only new code exists

---

## Testing After Cleanup

```bash
# Run workflow service tests
npm test -- workflow.service.spec.ts

# Run extracted services tests
npm test -- validator.service.spec.ts
npm test -- transaction.service.spec.ts
npm test -- holder-assignment.service.spec.ts
npm test -- audit-helper.service.spec.ts
npm test -- idempotency.service.spec.ts
```

**Expected Result:** All tests pass ✅

---

## Commit Changes

```bash
git add qlnckh/apps/src/modules/workflow/workflow.service.ts
git add qlnckh/apps/src/modules/workflow/workflow.service.spec.ts
git add qlnckh/package.json

git commit -m "chore: remove old implementations and feature flag

- Remove all 13 old method implementations (~2,000 lines)
- Rename *New methods to original names
- Remove WORKFLOW_USE_NEW_SERVICES feature flag
- Update tests to remove feature flag references
- Code reduction: ~47% (4,232 → ~2,400 lines)

All tests passing with clean new code only.

Backup available in branch: backup-with-old-code
"
```

---

## Expected Results

### Before Cleanup
- **File Size:** 4,232 lines
- **Methods:** 26 (13 old + 13 new)
- **Feature Flag:** Yes
- **Code Duplication:** High

### After Cleanup
- **File Size:** ~2,400 lines (-43%)
- **Methods:** 13 (only new implementations)
- **Feature Flag:** No
- **Code Duplication:** Low

---

## Rollback if Needed

```bash
# Restore from backup branch
git checkout backup-with-old-code -- qlnckh/apps/src/modules/workflow/workflow.service.ts

# Or reset entire branch
git reset --hard backup-with-old-code
```

---

## Time Estimate

- **Per method:** 5-10 minutes
- **Total cleanup:** 1-2 hours
- **Testing:** 30 minutes
- **Total time:** 1.5-2.5 hours

---

## Safety Tips

1. ✅ **Commit after each method** - easy to rollback if needed
2. ✅ **Test after each method** - catch issues early
3. ✅ **Keep backup branch** - safety net
4. ✅ **Review diff before committing** - ensure nothing important is removed

---

**Created:** 2026-01-10
**Status:** Ready for manual execution
**Priority:** HIGH (cleaner code base)
