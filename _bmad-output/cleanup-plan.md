# Phase 1 Cleanup Plan - Remove Old Code

**Date:** 2026-01-10
**Branch Strategy:**
- **main** → Clean code with only new implementations
- **backup-with-old-code** → Full code with old + new + feature flag

---

## 📋 Current Status

**File:** `qlnckh/apps/src/modules/workflow/workflow.service.ts`
- **Lines:** 4,232
- **Feature Flag:** `WORKFLOW_USE_NEW_SERVICES`
- **Methods:** 13 methods with both old and new implementations

---

## 🎯 Cleanup Goals

### 1. Remove Feature Flag
- [ ] Remove `useNewServices` property (line 83-84)
- [ ] Remove all `if (this.useNewServices)` checks (14 locations)
- [ ] Remove all old method implementations (~2,000 lines)
- [ ] Rename all `*New` methods to original names

### 2. Clean Up Code
Estimated reduction: **~2,000 lines (47%)**

### 3. Update Tests
- [ ] Remove `WORKFLOW_USE_NEW_SERVICES=true` from test commands
- [ ] Update test expectations for direct method calls

---

## 🔧 Manual Cleanup Steps

### Step 1: Remove Feature Flag Property

**Location:** Lines 83-84

**Remove:**
```typescript
// Phase 1 Refactor: Feature flag to enable new refactored implementations
// Set to true in .env: WORKFLOW_USE_NEW_SERVICES=true
private readonly useNewServices = process.env.WORKFLOW_USE_NEW_SERVICES === 'true';
```

---

### Step 2: Refactor Each Method

For each of the 13 methods, do the following:

#### Pattern:
```typescript
// OLD (TO BE REMOVED)
async methodName(proposalId, context, ...) {
  if (this.useNewServices) {
    this.logger.debug('Using NEW refactored methodName implementation');
    return this.methodNameNew(proposalId, context, ...);
  }

  this.logger.debug('Using ORIGINAL methodName implementation');
  // ... old implementation (~100-150 lines)
}

// NEW (TO BE RENAMED)
async methodNameNew(proposalId, context, ...) {
  // ... new implementation (~120 lines)
}
```

#### Transform to:
```typescript
// CLEAN (FINAL)
async methodName(proposalId, context, ...) {
  // ... new implementation (~120 lines)
}
```

---

### Step 3: Methods to Cleanup

| # | Method | Old Lines | *New Lines | Action |
|---|--------|-----------|------------|--------|
| 1 | submitProposal | ~130 | 122 | Remove old, rename submitProposalNew |
| 2 | approveFacultyReview | ~120 | 120 | Remove old, rename approveFacultyReviewNew |
| 3 | approveCouncilReview | ~120 | 116 | Remove old, rename approveCouncilReviewNew |
| 4 | acceptSchoolReview | ~120 | 116 | Remove old, rename acceptSchoolReviewNew |
| 5 | returnFacultyReview | ~145 | 142 | Remove old, rename returnFacultyReviewNew |
| 6 | returnSchoolReview | ~135 | 129 | Remove old, rename returnSchoolReviewNew |
| 7 | returnCouncilReview | ~135 | 129 | Remove old, rename returnCouncilReviewNew |
| 8 | resubmitProposal | ~190 | 170 | Remove old, rename resubmitProposalNew |
| 9 | cancelProposal | ~110 | 107 | Remove old, rename cancelProposalNew |
| 10 | withdrawProposal | ~150 | 144 | Remove old, rename withdrawProposalNew |
| 11 | rejectProposal | ~160 | 152 | Remove old, rename rejectProposalNew |
| 12 | pauseProposal | ~140 | 133 | Remove old, rename pauseProposalNew |
| 13 | resumeProposal | ~150 | 145 | Remove old, rename resumeProposalNew |

**Total estimated removal:** ~1,805 lines of old code

---

### Step 4: Update Tests

**File:** `qlnckh/apps/src/modules/workflow/workflow.service.spec.ts`

**Changes:**
1. Remove all `WORKFLOW_USE_NEW_SERVICES=true` prefixes
2. Tests should already be updated (checking TransactionService instead of Prisma)

**Test command change:**
```bash
# BEFORE
WORKFLOW_USE_NEW_SERVICES=true npm test -- workflow.service.spec.ts

# AFTER
npm test -- workflow.service.spec.ts
```

---

### Step 5: Remove Feature Flag from package.json

**File:** `qlnckh/package.json`

**Remove:**
```json
"WORKFLOW_USE_NEW_SERVICES": "true"
```

---

### Step 6: Update Documentation

**Files to update:**
- `_bmad-output/phase1-complete-final-summary.md`
- `_bmad-output/phase1-test-report.md`
- Any other docs mentioning feature flag

---

## 📊 Expected Results

### Before Cleanup
- **Lines:** 4,232
- **Methods:** 13 methods × 2 versions = 26 method implementations
- **Feature Flag:** Yes
- **Code Duplication:** High (old + new)

### After Cleanup
- **Lines:** ~2,400 (estimated -43%)
- **Methods:** 13 methods × 1 version = 13 method implementations
- **Feature Flag:** No
- **Code Duplication:** Low (only new implementations)

---

## 🚀 Execution Plan

### Option 1: Manual Cleanup (Recommended for Safety)
**Time:** 2-3 hours
**Risk:** Low

1. Backup current state
2. For each method:
   - Find old implementation
   - Find `*New` implementation
   - Remove old implementation
   - Rename `*New` to original name
   - Remove `if (this.useNewServices)` check
3. Test after each method
4. Commit changes

### Option 2: Scripted Cleanup (Faster but Riskier)
**Time:** 30-60 minutes
**Risk:** Medium

Create a script to:
1. Parse the file
2. Extract `*New` methods
3. Remove old methods and feature flag checks
4. Rename `*New` methods
5. Write cleaned file
6. Manual review of changes

---

## ✅ Verification Checklist

After cleanup, verify:

- [ ] All 13 methods exist (no `*New` suffix)
- [ ] No `useNewServices` references remain
- [ ] No `WORKFLOW_USE_NEW_SERVICES` references remain
- [ ] All tests pass: `npm test -- workflow.service.spec.ts`
- [ ] All extracted services tests pass
- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] File size reduced by ~40-45%

---

## 🔄 Rollback Plan

If cleanup causes issues:

```bash
# Reset to backup state
git reset --hard backup-with-old-code

# Or restore from backup branch
git checkout backup-with-old-code -- qlnckh/apps/src/modules/workflow/workflow.service.ts
```

---

## 📝 Notes

- **Backup branch:** `backup-with-old-code` - contains all old + new code
- **Main branch:** After cleanup will contain only new code
- **Feature flag:** Removed completely after cleanup
- **Backward compatibility:** No longer needed (only new code exists)

---

**Created:** 2026-01-10
**Status:** Ready for execution
**Estimated Time:** 2-3 hours (manual) or 30-60 min (scripted)
