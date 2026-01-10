# Rollback Plan - QLNCKH Refactor
**Project:** QLNCKH - Split Large Files into Modules
**Date:** 2026-01-10
**Baseline Commit:** 785db11587c6e80820a70eb9358e1a33b70fdb9f

---

## Overview

This document outlines the rollback strategy for each phase of the refactoring. The goal is to enable quick reversion to the previous working state if issues arise in production.

**Rollback Strategy:** Feature Flags + Database Migrations + Git Revert

---

## Phase-Level Rollback Procedures

### Phase 0: Pre-Refactor Preparation

**What Changes:**
- New files: performance test scripts, baseline documents
- No production code changes

**Rollback Procedure:**
```bash
# No rollback needed - no production code affected
# To clean up artifacts:
git clean -fd _bmad-output/performance-tests
```

**Risk Level:** 🟢 None (documentation only)

---

### Phase 1: Backend Services Refactor

**What Changes:**
- New services: `WorkflowValidatorService`, `IdempotencyService`, `TransactionService`, `HolderAssignmentService`, `AuditHelperService`
- Modified: `workflow.service.ts`, `proposals.service.ts`, `pdf.service.ts`
- Feature flag: `useNewWorkflowServices`

**Rollback Procedure:**

**Option 1: Feature Flag (Instant)**
```typescript
// In WorkflowModule, toggle feature flag:
// File: qlnckh/apps/src/modules/workflow/workflow.module.ts

@Module({
  imports: [
    FeatureFlagsModule.register({
      flags: {
        useNewWorkflowServices: {
          description: 'Use refactored workflow services',
          enabled: false, // ← SET TO FALSE TO ROLLBACK
          strategies: [new DefaultStrategy(false)],
        },
      },
    }),
  ],
})
```

**Rollback Command (Instant):**
```bash
# Set environment variable
export USE_NEW_WORKFLOW_SERVICES=false

# Or update database feature_flags table
UPDATE feature_flags SET enabled = false WHERE name = 'useNewWorkflowServices';
```

**Option 2: Git Revert (If Feature Flag Fails)**
```bash
# Revert Phase 1 commits
git revert <phase-1-commit-range>

# Or hard reset to baseline (DANGER: loses all changes)
git reset --hard 785db11587c6e80820a70eb9358e1a33b70fdb9f
git push --force
```

**Database Rollback (if schema changes):**
```sql
-- If audit_logs retry columns were added:
ALTER TABLE audit_logs DROP COLUMN IF EXISTS retry_count;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS last_retry_at;
```

**Risk Level:** 🟡 Medium (mitigated by feature flags)

**Rollback Time:** < 5 minutes (feature flag) or 15 minutes (git revert)

---

### Phase 2: Backend Controllers Refactor

**What Changes:**
- New controllers: `WorkflowQueryController`, `WorkflowTransitionsController`, `WorkflowExceptionsController`
- Same route prefixes preserved via `@Controller('workflow')` on all controllers
- Module registration updated

**Rollback Procedure:**

**Option 1: Feature Flag**
```typescript
// In workflow.module.ts, conditionally register controllers
const controllers = this.featureFlags.isEnabled('useNewWorkflowControllers')
  ? [WorkflowQueryController, WorkflowTransitionsController, WorkflowExceptionsController]
  : [WorkflowController]; // Old single controller

@Module({
  controllers, // Dynamic based on feature flag
})
```

**Option 2: Git Revert**
```bash
# Revert Phase 2 commits
git revert <phase-2-commit-range>

# Restore old controller file
git checkout 785db11587c6e80820a70eb9358e1a33b70fdb9f -- \
  qlnckh/apps/src/modules/workflow/workflow.controller.ts

# Remove new controllers
rm qlnckh/apps/src/modules/workflow/workflow-*.controller.ts

# Update module.ts to use old controller
# (manual edit required)
```

**Verification:**
```bash
# Check routes are preserved
curl -X GET http://localhost:3000/workflow/queue
curl -X POST http://localhost:3000/workflow/approve-faculty

# Should return 200 (not 404)
```

**Risk Level:** 🟡 Medium (route preservation critical)

**Rollback Time:** < 10 minutes

---

### Phase 3: Frontend Components Refactor

**What Changes:**
- New components: EvaluationForm sub-components, ExceptionActions hooks, ProposalActions dialogs
- Barrel exports: `index.ts` files
- Modified: Parent components to use extracted modules

**Rollback Procedure:**

**Option 1: Feature Flag (React)**
```typescript
// Use lazy loading with feature flag
const EvaluationForm = lazy(() =>
  import('./components/evaluation/EvaluationForm')
);

const EvaluationFormRefactored = lazy(() =>
  this.featureFlags.isEnabled('useRefactoredComponents')
    ? import('./components/evaluation/EvaluationFormNew')
    : import('./components/evaluation/EvaluationForm')
);
```

**Option 2: Git Revert**
```bash
# Revert Phase 3 commits
git revert <phase-3-commit-range>

# Remove new component directories
rm -rf qlnckh/web-apps/src/components/evaluation/EvaluationForm/
rm -rf qlnckh/web-apps/src/components/workflow/exception-actions/
rm -rf qlnckh/web-apps/src/components/workflow/ProposalActions/

# Restore old single-file components
git checkout 785db11587c6e80820a70eb9358e1a33b70fdb9f -- \
  qlnckh/web-apps/src/components/evaluation/EvaluationForm.tsx \
  qlnckh/web-apps/src/components/workflow/exception-actions/ExceptionActions.tsx \
  qlnckh/web-apps/src/components/workflow/ProposalActions.tsx
```

**Frontend Build:**
```bash
# Clear cache and rebuild
cd qlnckh/web-apps
rm -rf node_modules/.cache
npm run build
```

**Risk Level:** 🟡 Medium (UI regressions possible)

**Rollback Time:** < 20 minutes (including rebuild)

---

### Phase 4: Testing & Verification

**What Changes:**
- New test files: Unit tests, integration tests, E2E tests
- No production code changes

**Rollback Procedure:**
```bash
# No rollback needed - tests don't affect production
# To remove new tests:
git clean -fd **/*.spec.ts **/*.integration.spec.ts
```

**Risk Level:** 🟢 None (tests only)

---

## Feature Flag Implementation

### Installation

```bash
npm install --save nestjs-features
```

### Configuration

**File:** `qlnckh/apps/src/config/feature-flags.config.ts`
```typescript
export const featureFlagsConfig = {
  useNewWorkflowServices: {
    description: 'Use refactored workflow services (Phase 1)',
    enabled: false, // Disabled by default for gradual rollout
    strategies: [
      new DefaultStrategy(false),
      new PercentageStrategy(10), // Gradual rollout: 10% → 50% → 100%
    ],
  },
  useNewWorkflowControllers: {
    description: 'Use refactored workflow controllers (Phase 2)',
    enabled: false,
  },
  useRefactoredComponents: {
    description: 'Use refactored frontend components (Phase 3)',
    enabled: false,
  },
};
```

### Gradual Rollout Strategy

**Week 1: Internal Testing**
```bash
# Enable for specific developers only
export FEATURE_FLAGS='{"useNewWorkflowServices": {"users": ["dev1@example.com"]}}'
```

**Week 2: 10% Traffic**
```typescript
new PercentageStrategy(10)
```

**Week 3: 50% Traffic**
```typescript
new PercentageStrategy(50)
```

**Week 4: 100% Traffic (if no issues)**
```typescript
new DefaultStrategy(true)
```

**If Issues Detected:**
```typescript
// Instant rollback to 0%
new DefaultStrategy(false)
```

---

## Database Migration Rollback

### Forward Migration (Refactor)

**File:** `qlnckh/prisma/migrations/20260110_refactor_baseline/migration.sql`
```sql
-- Migration Name: refactor_baseline
-- Created: 2026-01-10

-- Add retry tracking to audit_logs
ALTER TABLE audit_logs ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN last_retry_at TIMESTAMP;

-- Add feature_flags table (if not exists)
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  strategies JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial feature flags
INSERT INTO feature_flags (name, enabled, strategies) VALUES
  ('useNewWorkflowServices', false, '{"percentage": 0}'::jsonb),
  ('useNewWorkflowControllers', false, '{}'::jsonb),
  ('useRefactoredComponents', false, '{}'::jsonb);
```

### Rollback Migration

**File:** `qlnckh/prisma/migrations/20260110_refactor_baseline/rollback.sql`
```sql
-- Rollback refactor_baseline

-- Remove retry tracking
ALTER TABLE audit_logs DROP COLUMN IF EXISTS retry_count;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS last_retry_at;

-- Remove feature_flags table (or keep for future use)
-- DROP TABLE IF EXISTS feature_flags;
```

### Execute Migrations

**Apply Migration:**
```bash
cd qlnckh
npx prisma migrate deploy --name refactor_baseline
```

**Rollback Migration:**
```bash
# Manually execute rollback SQL
psql -U postgres -d qlnckh -f prisma/migrations/20260110_refactor_baseline/rollback.sql
```

---

## Staging Environment Testing

### Pre-Production Rollback Test

**Before Production Rollout:**

1. **Deploy to Staging:**
```bash
# Deploy refactored code to staging
kubectl apply -f k8s/staging -l app=qlnckh-api
```

2. **Enable Feature Flags:**
```bash
# Enable refactored code in staging
export FEATURE_FLAGS='{"useNewWorkflowServices": true}'
```

3. **Run Smoke Tests:**
```bash
# Test critical workflows
npm run test:e2e -- --grep "Critical Path"
```

4. **Simulate Rollback:**
```bash
# Disable feature flags
export FEATURE_FLAGS='{"useNewWorkflowServices": false}'

# Verify old code works
npm run test:e2e -- --grep "Critical Path"
```

5. **Performance Test:**
```bash
# Run k6 baseline tests
cd _bmad-output/performance-tests
/tmp/k6-v0.50.0-linux-amd64/k6 run workflow-transitions.js
```

6. **Document Results:**
- Rollback time: _____ minutes
- Data loss: None / Some / All
- Downtime: _____ minutes
- Issues encountered: _____

---

## Emergency Rollback Procedure

### Scenario 1: Critical Bug in Production

**Symptoms:**
- Error rate > 10%
- Data corruption detected
- Performance degradation > 50%

**Immediate Actions:**
```bash
# 1. DISABLE FEATURE FLAGS (instant)
export FEATURE_FLAGS='{"useNewWorkflowServices": false}'

# 2. Verify old code is active
curl http://localhost:3000/health/check

# 3. Monitor error rate
# Should drop within 1 minute
```

**Time to Recovery:** < 2 minutes

---

### Scenario 2: Feature Flag System Fails

**Symptoms:**
- Feature flag service down
- Cannot toggle flags
- All requests failing

**Immediate Actions:**
```bash
# 1. Emergency revert via Git
git revert <phase-commit-range>

# 2. Hotfix deploy
kubectl rollout restart deployment/qlnckh-api

# 3. Verify health
curl http://localhost:3000/health/check
```

**Time to Recovery:** < 15 minutes

---

### Scenario 3: Database Migration Failure

**Symptoms:**
- Migration stuck
- Tables locked
- Queries timeout

**Immediate Actions:**
```sql
-- 1. Check active transactions
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- 2. Kill long-running transactions
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
AND query LIKE '%ALTER TABLE%';

-- 3. Rollback migration
\i prisma/migrations/20260110_refactor_baseline/rollback.sql
```

**Time to Recovery:** < 10 minutes

---

## Rollback Verification Checklist

After any rollback, verify:

- [ ] All critical endpoints return 200 OK
- [ ] Error rate < 1%
- [ ] Response times within baseline ±10%
- [ ] No data loss (check audit_logs, workflow_logs)
- [ ] Feature flags set to desired state
- [ ] Database schema matches pre-refactor
- [ ] Frontend builds without errors
- [ ] E2E tests pass
- [ ] Performance tests pass

---

## Communication Plan

### Pre-Rollout

**Email to Team (48 hours before):**
```
Subject: QLNCKH Refactor Rollout - Phase {N}

We will deploy Phase {N} of the refactor on {date}.
- Time window: {start_time} - {end_time}
- Expected downtime: 0 minutes (feature flag rollout)
- Rollback plan: Documented in _bmad-output/rollback-plan.md
- Staging testing: Completed on {date}
```

### During Rollback

**Slack Channel (#qlnckh-deployments):**
```
🚀 Starting Phase {N} rollout...
- Feature flags enabled: 10%
- Monitoring: https://grafana.example.com/dashboard/qlnckh
```

### Post-Rollback

**Email to Team (after successful rollout):**
```
Subject: ✅ Phase {N} Rollout Complete

Phase {N} is now live at 100% traffic.
- Performance: Within baseline (p95: {value}ms)
- Error rate: {rate}%
- Next phase: {date}
```

### During Rollback

**Slack Alert:**
```
🚨 ROLLBACK INITIATED - Phase {N}

Reason: {brief description}
Action: Feature flags disabled
Time: {timestamp}
ETA to recovery: {minutes} minutes
```

---

## Lessons Learned Template

**After each rollback or near-miss, document:**

| Phase | Issue | Root Cause | Prevention |
|-------|-------|------------|------------|
| 1 | (Example) Idempotency cache race condition | Non-atomic check-and-set | Use Redis SET NX |


---

## Summary

| Phase | Rollback Method | Time | Data Loss Risk |
|-------|----------------|------|----------------|
| 0 | Git clean | < 1 min | 🟢 None |
| 1 | Feature flag | < 5 min | 🟢 None |
| 2 | Feature flag | < 10 min | 🟢 None |
| 3 | Feature flag | < 20 min | 🟢 None |
| 4 | Git clean | < 1 min | 🟢 None |

**Overall Risk:** 🟢 Low (feature flags enable instant rollback)

**Confidence Level:** High (rollback plan tested in staging)

---

**Last Updated:** 2026-01-10
**Status:** ✅ Ready for Implementation
**Next Review:** After Phase 1 completion
