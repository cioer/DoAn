# Branch Strategy - Phase 1 Refactor

## 🌳 Branch Structure

```
main (clean, production-ready)
├── Only new implementations
├── No feature flag
├── ~2,400 lines (-47% reduction)
└── All tests passing

backup-with-old-code (backup/safety)
├── Both old and new implementations
├── Feature flag routing
├── 4,232 lines (full code)
└── Instant rollback capability

feature/refactor-remaining-workflow-methods (development - archived)
├── Original refactor work
├── Commits: 7138656 → ea87386
└── Can be deleted after main is stable
```

---

## 📋 Branch Details

### 1. main Branch

**Purpose:** Production-ready code with only new implementations

**Characteristics:**
- ✅ Only new refactored code (13 methods)
- ✅ No feature flag (`WORKFLOW_USE_NEW_SERVICES` removed)
- ✅ Cleaner code base (-47% lines)
- ✅ All tests passing
- ✅ Production-ready

**Status:** 🔨 IN PROGRESS - Currently has both old + new + feature flag
**Goal:** Remove old code and feature flag

**Commands:**
```bash
# Switch to main
git checkout main

# View current state
git log --oneline -5

# After cleanup, this will be the clean production branch
```

---

### 2. backup-with-old-code Branch

**Purpose:** Safety backup with all code (old + new + feature flag)

**Characteristics:**
- ✅ Contains all old implementations
- ✅ Contains all new implementations
- ✅ Feature flag routing intact
- ✅ Instant rollback capability
- ✅ Never deleted (permanent backup)

**Status:** ✅ COMPLETE - Created from feature branch
**Commit:** `ea87386` (same as feature branch)

**Commands:**
```bash
# View backup
git checkout backup-with-old-code

# Compare with main
git diff main backup-with-old-code

# Restore from backup if needed
git checkout backup-with-old-code -- qlnckh/apps/src/modules/workflow/workflow.service.ts
```

**When to use:**
- If cleanup causes issues
- If bugs found in new implementations
- If need to reference old logic
- Emergency rollback

---

### 3. feature/refactor-remaining-workflow-methods (Archived)

**Purpose:** Original development branch for refactor

**Characteristics:**
- 📝 Historical record of refactor work
- 📝 Commits from 7138656 to ea87386
- 📝 Can be deleted after main is stable

**Status:** 📦 ARCHIVED - Work merged to main
**Commits:**
1. `7138656` - Initial progress summary
2. `df10c00` - Fix approveFacultyReview test
3. `28c1fcd` - Refactor cancelProposal
4. `ab8a6ce` - Phase 4 exception actions
5. `ea87386` - Complete all 13 methods

**Commands:**
```bash
# View original refactor work
git checkout feature/refactor-remaining-workflow-methods

# Can be deleted after cleanup is verified:
# git branch -D feature/refactor-remaining-workflow-methods
```

---

## 🔄 Workflow

### Phase 1: Development (COMPLETE ✅)
```
feature/refactor-remaining-workflow-methods
    ↓
    Refactor all 13 methods
    ↓
    All tests passing
    ↓
    Commit ea87386
```

### Phase 2: Merge to Main (COMPLETE ✅)
```
feature branch → main (fast-forward merge)
    ↓
    Create backup-with-old-code
    ↓
    main now has all code (old + new + feature flag)
```

### Phase 3: Cleanup Main (IN PROGRESS 🔨)
```
main (current state)
    ↓
    Remove old implementations
    ↓
    Remove feature flag
    ↓
    Rename *New methods
    ↓
    Test thoroughly
    ↓
    Commit clean code
```

### Phase 4: Production Ready (PENDING ⏳)
```
main (clean code)
    ↓
    Deploy to staging
    ↓
    Monitor 24-48 hours
    ↓
    Deploy to production
    ↓
    Monitor 1 week
    ↓
    Delete feature branch (optional)
```

---

## 📊 File Comparison

### workflow.service.ts

| Branch | Lines | Methods | Feature Flag | Status |
|--------|-------|---------|--------------|--------|
| feature/refactor-remaining-workflow-methods | 4,232 | 26 (13×2) | Yes | Archived |
| backup-with-old-code | 4,232 | 26 (13×2) | Yes | Backup |
| main (current) | 4,232 | 26 (13×2) | Yes | Needs cleanup |
| main (target) | ~2,400 | 13 | No | Clean |

---

## 🚀 Deployment Strategy

### Development → Staging
```bash
# From main (after cleanup)
git checkout main
git pull

# Deploy to staging
npm run start:dev

# Monitor logs for errors
# Verify all 13 methods work correctly
```

### Staging → Production
```bash
# When staging is stable
git checkout main
git pull

# Deploy to production
npm run start:prod

# Monitor for 1 week
# Keep backup branch for safety
```

### Rollback Plan
```bash
# If production has issues
git checkout backup-with-old-code
# Deploy backup branch

# Or restore specific file
git checkout backup-with-old-code -- qlnckh/apps/src/modules/workflow/workflow.service.ts
```

---

## 🛡️ Safety Measures

### Multiple Layers of Protection

1. **Branch Protection:**
   - backup-with-old-code never deleted
   - Can always restore from backup

2. **Feature Flag (before cleanup):**
   - Instant toggle between old/new
   - No code changes needed

3. **Testing:**
   - All tests pass before cleanup
   - All tests pass after cleanup
   - Manual testing in staging

4. **Gradual Rollout:**
   - Staging first (24-48 hours)
   - Production monitoring (1 week)
   - Keep backup ready

---

## 📝 Commands Reference

### Branch Management
```bash
# List all branches
git branch -a

# Compare branches
git diff main backup-with-old-code --stat

# View specific file in branch
git show backup-with-old-code:qlnckh/apps/src/modules/workflow/workflow.service.ts

# Restore file from backup
git checkout backup-with-old-code -- <file-path>
```

### Cleanup Verification
```bash
# Check for feature flag references
grep -r "WORKFLOW_USE_NEW_SERVICES" qlnckh/apps/src/

# Check for old method references
grep -r "useNewServices" qlnckh/apps/src/

# Count lines in file
wc -l qlnckh/apps/src/modules/workflow/workflow.service.ts
```

### Testing
```bash
# Run all workflow tests
npm test -- workflow.service.spec.ts

# Run extracted services tests
npm test -- validator.service.spec.ts
npm test -- transaction.service.spec.ts
npm test -- holder-assignment.service.spec.ts
npm test -- audit-helper.service.spec.ts
npm test -- idempotency.service.spec.ts
```

---

## ✅ Decision Tree

### When to use each branch:

**Use main when:**
- ✅ Developing new features
- ✅ Production deployment
- ✅ After cleanup is complete

**Use backup-with-old-code when:**
- ⚠️ Emergency rollback needed
- ⚠️ Bugs found in new implementation
- ⚠️ Need to reference old logic
- ⚠️ Testing shows issues

**Use feature branch when:**
- 📝 Reviewing refactor history
- 📝 Understanding what changed
- 📝 Can be deleted after main is stable

---

## 🎯 Next Steps

1. ✅ Branch structure created
2. 🔨 Clean up main branch (remove old code)
3. ⏳ Test cleaned code thoroughly
4. ⏳ Deploy to staging
5. ⏳ Deploy to production
6. ⏳ Delete feature branch (optional)

---

**Last Updated:** 2026-01-10
**Current Branch:** main
**Backup Branch:** backup-with-old-code ✅
**Status:** Ready for cleanup
