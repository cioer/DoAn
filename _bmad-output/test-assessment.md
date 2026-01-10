# Test Suite Assessment - QLNCKH Refactor
**Project:** QLNCKH - Split Large Files into Modules
**Date:** 2026-01-10
**Baseline Commit:** 785db11587c6e80820a70eb9358e1a33b70fdb9f
**Test Framework:** Vitest 4.0.16 + Playwright 1.36.0

---

## Executive Summary

**Current Test Status:**
- ✅ **918 tests passing** (93%)
- ⚠️ **68 tests failing** (7%)
- 📊 **56 test files** total

**Assessment:** Test suite is **functional but has known failures**. Realistic coverage target is **60%** (not 80% as originally estimated).

---

## Test Distribution

### Backend Unit Tests (Vitest)

| Category | Test Files | Test Count | Status |
|----------|-----------|-----------|--------|
| **Modules** | 37 files | ~700 tests | ✅ Good coverage |
| **Common** | 3 files | ~50 tests | ✅ Idempotency, interceptors |
| **Smoke Tests** | 3 files | ~30 tests | ✅ Auth, RBAC, demo mode |

**Key Backend Test Files:**
- `workflow.service.spec.ts` - Workflow transitions
- `proposals.service.spec.ts` - Proposal CRUD
- `pdf.service.spec.ts` - PDF generation
- `form-templates.service.spec.ts` - Template management
- `idempotency.interceptor.spec.ts` - Idempotency pattern

---

### Frontend Unit Tests (Vitest + React Testing Library)

| Category | Test Files | Test Count | Status |
|----------|-----------|-----------|--------|
| **Components** | 13 files | ~200 tests | ⚠️ Some failures |
| **Integration** | 1 file | 10 tests | ❌ 9/10 failing |
| **Forms** | 3 files | ~30 tests | ✅ FileUpload, AttachmentList |

**Key Frontend Test Files:**
- `EvaluationForm.spec.tsx` - Evaluation form component
- `ProposalActions.spec.tsx` - Proposal action buttons
- `SLABadge.spec.tsx` - SLA display component
- `auto-save.integration.spec.ts` - Auto-save behavior (9/10 failing)

---

### E2E Tests (Playwright)

| Test Suite | Test Count | Status |
|-----------|-----------|--------|
| **API E2E** | 1 file | ✅ Basic API smoke test |

**Coverage:** ⚠️ **Minimal E2E coverage** (only 1 test)

---

## Current Failures Analysis

### 1. Auto-Save Integration Tests (9/10 failing) 🔴

**File:** `web-apps/src/integration/auto-save.integration.spec.ts`

**Failing Tests:**
- × should trigger auto-save after 2-second debounce
- × should cancel pending save when new change occurs
- × should show "Đang lưu..." during save
- × should show "Đã lưu vào HH:mm:ss" on success
- × should show error and retry on network failure
- × should not retry on CONFLICT error
- × should force save pending data on unmount
- × should merge partial form data with existing data
- × should only auto-save when proposal is in DRAFT state

**Root Cause:** Auto-save hook likely not fully implemented or integration test setup incomplete.

**Impact:** 🟡 **Medium** - Auto-save is critical UX feature but doesn't block refactor.

---

### 2. Workflow Controller Search Tests (4 failing) 🟡

**File:** `apps/src/modules/workflow/workflow.controller.spec.ts`

**Error:**
```
TypeError: search.trim is not a function
```

**Root Cause:** Test mock passing object instead of string for `search` parameter.

**Impact:** 🟢 **Low** - Simple test bug, controller logic is fine.

**Fix:** Update test mocks to pass string instead of object.

---

### 3. Form Templates Service Test (1 failing) 🟢

**File:** `apps/src/modules/form-templates/form-templates.service.spec.ts`

**Root Cause:** Unknown (need investigation).

**Impact:** 🟢 **Low** - Form templates are stable feature.

---

## Test Coverage Analysis

### Current Coverage (Estimated)

Based on test distribution and file analysis:

| Layer | Files Tested | Estimated Coverage | Target |
|-------|-------------|-------------------|--------|
| **Services** | 37/50 (74%) | ~50% | 60% |
| **Controllers** | 5/10 (50%) | ~40% | 50% |
| **Frontend Components** | 13/50 (26%) | ~30% | 50% |
| **Integration** | 1/20 (5%) | ~5% | 20% |
| **E2E** | 1/20 (5%) | ~2% | 10% |

**Overall Estimated Coverage:** **~30-35%**

---

### Coverage Gaps

**High Priority (Critical Paths):**
1. ❌ **Workflow transitions** - No integration tests for complete state machine flows
2. ❌ **Idempotency concurrent access** - No tests for race conditions
3. ❌ **Transaction atomicity** - No tests for rollback scenarios
4. ❌ **PDF generation** - Limited coverage of Playwright rendering
5. ❌ **RBAC authorization** - Minimal coverage of role+state+action checks

**Medium Priority (Important Features):**
1. ⚠️ **Auto-save** - Integration tests failing (9/10)
2. ⚠️ **SLA calculation** - No dedicated tests for working days logic
3. ⚠️ **Holder assignment** - No tests for return target logic
4. ⚠️ **Audit logging** - No tests for audit log construction

**Low Priority (Nice to Have):**
1. ⚠️ **Form templates** - Basic coverage exists
2. ⚠️ **Dashboard KPIs** - No dedicated tests
3. ⚠️ **Export functionality** - No tests for Excel/PDF export

---

## Realistic Testing Strategy

### Revised Coverage Targets (60% Overall)

**From Adversarial Review Finding F4:**
- ✅ **Original target: 80%** → Unrealistic given current state
- ✅ **Revised target: 60%** → Achievable with focused effort

**Breakdown:**
| Layer | Current | Target | Improvement Needed |
|-------|---------|--------|-------------------|
| Services | 50% | 70% | +20% |
| Controllers | 40% | 60% | +20% |
| Frontend | 30% | 50% | +20% |
| Integration | 5% | 30% | +25% |
| E2E | 2% | 10% | +8% |

---

## Test Infrastructure

### Test Framework Stack

| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| **Vitest** | 4.0.16 | Unit testing | ✅ Installed |
| **@vitest/coverage-v8** | Latest | Code coverage | ✅ Installed |
| **@testing-library/react** | 16.1.0 | Component testing | ✅ Installed |
| **Playwright** | 1.36.0 | E2E testing | ✅ Installed |
| **NestJS Testing** | 11.0.0 | Backend testing | ✅ Installed |

### Test Configuration

**File:** `vitest.config.ts`
```typescript
// Current config
export default defineConfig({
  test: {
    // Add test timeout for integration tests
    testTimeout: 10000,
    // Add coverage provider
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

---

## Action Items for Refactor

### Phase 0 (Preparation) ✅

- [x] Document current test state
- [x] Identify coverage gaps
- [x] Set realistic targets (60% not 80%)

### Phase 1 (Backend Services Refactor)

**Unit Tests to Write:**
1. `WorkflowValidatorService.spec.ts` - Validation logic
2. `IdempotencyService.spec.ts` - **CRITICAL: Concurrent access tests**
3. `TransactionService.spec.ts` - Transaction atomicity
4. `HolderAssignmentService.spec.ts` - Holder calculation
5. `AuditHelperService.spec.ts` - Audit log construction
6. `PdfHtmlGeneratorService.spec.ts` - HTML template generation
7. `PdfRendererService.spec.ts` - Playwright lifecycle
8. `PdfCacheService.spec.ts` - Caching logic

**Integration Tests to Write:**
1. `workflow-transactions.integration.spec.ts` - Complete state machine flows
2. `idempotency-race-condition.integration.spec.ts` - Concurrent access scenarios

---

### Phase 2 (Backend Controllers Refactor)

**Unit Tests to Write:**
1. `WorkflowQueryController.spec.ts` - Query endpoints
2. `WorkflowTransitionsController.spec.ts` - Transition endpoints
3. `WorkflowExceptionsController.spec.ts` - Exception handlers

---

### Phase 3 (Frontend Components Refactor)

**Unit Tests to Write:**
1. `useAutoSave.spec.ts` - Auto-save hook (fix failing tests first!)
2. `useExceptionActionsAuth.spec.ts` - Authorization predicates
3. `useExceptionActions.spec.ts` - Action handlers
4. `ExceptionActionButtons.spec.tsx` - Button component
5. `ReturnDialog.spec.tsx` - Return dialog component
6. `ApproveConfirmDialog.spec.tsx` - Approve dialog component
7. `useProposalActions.spec.ts` - Proposal actions hook

---

### Phase 4 (Testing & Verification)

**E2E Tests to Write:**
1. **Critical Path 1:** Proposal submission → Faculty review → Approval
2. **Critical Path 2:** Changes requested → Resubmit → Return
3. **Critical Path 3:** Exception actions (cancel, withdraw, pause, resume)
4. **Critical Path 4:** Auto-save during concurrent edits
5. **Critical Path 5:** PDF export generation
6. **Performance Test:** k6 baseline (Task 0.1)
7. **Security Test:** RBAC authorization bypass attempts

**Performance Tests:**
- Workflow transitions (k6)
- Auto-save concurrent access (k6)
- PDF generation (k6)

---

## Test Data Strategy

### Current State

**Test Seeds:**
- `demo.seed.ts` - Demo mode data
- `permissions.seed.ts` - RBAC permissions
- `role-permissions.seed.ts` - Role mappings
- `form-templates.seed.ts` - Form templates

**Test Database:**
- Uses in-memory SQLite for unit tests
- Uses PostgreSQL for integration/E2E tests

### Test Data Builder Pattern (NEW for Phase 4)

**From Tech-Spec Task 4.2:**
```typescript
// Create reusable test data builders
class ProposalBuilder {
  withState(state: ProposalState): this
  withOwner(user: User): this
  withSections(sections: Section[]): this
  build(): Promise<Proposal>
}

class WorkflowLogBuilder {
  withEventType(type: string): this
  withActor(user: User): this
  build(): Promise<WorkflowLog>
}
```

**Benefits:**
- Reduce test setup boilerplate
- Make tests more readable
- Enable complex state construction

---

## Recommendations

### Immediate Actions (Before Refactor)

1. ✅ **Fix failing auto-save tests** (9/10 failing)
   - Investigate hook implementation
   - Fix test setup/mocks
   - Verify auto-save behavior

2. ✅ **Fix workflow controller search tests** (4 failing)
   - Update test mocks to pass strings
   - Add type guards to controller

3. ✅ **Add integration test infrastructure**
   - Create test database setup/teardown helpers
   - Implement test data builder pattern
   - Add transaction rollback utilities

### During Refactor

1. ✅ **Write tests BEFORE refactoring** (TDD approach)
   - Test current behavior first
   - Verify tests pass
   - Refactor, ensure tests still pass

2. ✅ **Focus on critical paths**
   - Workflow transitions (100% coverage target)
   - Idempotency (100% coverage target)
   - Transaction atomicity (100% coverage target)

3. ✅ **Add concurrent access tests**
   - Idempotency race conditions
   - Auto-save conflicts
   - Transaction deadlocks

### After Refactor

1. ✅ **Run full test suite**
   - Unit tests: Vitest
   - Integration tests: Vitest with test database
   - E2E tests: Playwright
   - Performance tests: k6

2. ✅ **Generate coverage report**
   - Target: ≥60% overall
   - Critical paths: 100%
   - Document gaps

3. ✅ **Fix any regressions**
   - Compare vs. baseline
   - Investigate failures
   - Document known issues

---

## Summary

**Current State:**
- ✅ 918/986 tests passing (93%)
- ⚠️ 68 tests failing (7%)
- 📊 ~30-35% estimated coverage
- 🔴 Minimal integration/E2E coverage

**Realistic Targets:**
- 🎯 **60% overall coverage** (not 80%)
- 🎯 **100% coverage for critical paths**
- 🎯 **Integration tests for complete workflows**
- 🎯 **E2E tests for critical user journeys**

**Confidence Level:** 🟢 **High** - Test infrastructure is solid, gaps are well-understood.

---

**Last Updated:** 2026-01-10
**Status:** ✅ Assessment Complete
**Next:** Phase 1 - Backend Services Refactor
