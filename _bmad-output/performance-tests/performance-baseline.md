# Performance Baseline Report
**Project:** QLNCKH Refactor - Split Large Files
**Date:** 2026-01-10
**Baseline Commit:** 785db11587c6e80820a70eb9358e1a33b70fdb9f
**Status:** ⚠️ PENDING - Requires running environment

---

## Purpose

Document current performance metrics BEFORE refactoring to enable comparison after changes. This baseline will be used to detect any performance regressions > 10% (AC7 from tech-spec).

---

## Test Scenarios

### 1. Workflow Transitions (`workflow-transitions.js`)

**Endpoints Tested:**
- POST `/workflow/approve-faculty` - Primary state transition
- GET `/proposals/:id` - Query operation

**Load Profile:**
- Warm-up: 30s → 5 VUs
- Ramp-up: 1m → 20 VUs
- Sustained: 2m → 50 VUs
- Ramp-down: 30s → 0 VUs

**Current Thresholds (to be measured):**
- p50 response time: TBD
- p95 response time: TBD
- p99 response time: TBD
- Error rate: TBD

**Acceptance Criteria (After Refactor):**
- p95 < 500ms (no regression > 10%)
- Error rate < 5%

---

### 2. Auto-Save (`auto-save.js`)

**Endpoint Tested:**
- POST `/proposals/auto-save` - Concurrent edits with idempotency

**Load Profile:**
- Warm-up: 30s → 10 VUs
- Sustained: 2m → 30 VUs (simulates multiple users editing simultaneously)
- Ramp-down: 30s → 0 VUs

**Current Thresholds (to be measured):**
- p50 response time: TBD
- p95 response time: TBD
- Idempotency cache hit rate: TBD
- Conflict detection rate: TBD

**Acceptance Criteria (After Refactor):**
- p95 < 1000ms (no regression > 10%)
- Error rate < 2%
- Idempotency prevents 100% of duplicate operations

---

## How to Run Baseline Tests

### Prerequisites

1. **Start API Server:**
```bash
cd qlnckh/apps
npm run start:dev  # or production build
```

2. **Set Environment Variables:**
```bash
export BASE_URL="http://localhost:3000"
export AUTH_TOKEN="<valid JWT token from dev environment>"
export PROPOSAL_ID="<valid proposal ID in DRAFT state>"
```

3. **Install k6:**
```bash
# Already downloaded to: /tmp/k6-v0.50.0-linux-amd64/k6
# Or add to PATH:
export PATH="/tmp/k6-v0.50.0-linux-amd64:$PATH"
```

### Execute Tests

**Workflow Transitions:**
```bash
cd _bmad-output/performance-tests
/tmp/k6-v0.50.0-linux-amd64/k6 run workflow-transitions.js \
  --out json=baseline-workflow.json
```

**Auto-Save:**
```bash
/tmp/k6-v0.50.0-linux-amd64/k6 run auto-save.js \
  --out json=baseline-autosave.json
```

### Extract Metrics

```bash
# After tests complete, parse JSON output for key metrics:
# - http_req_duration (p50, p95, p99)
# - http_req_failed (error rate)
# - vus (virtual users)
# - checks (pass/fail rates)
```

---

## Current Baseline Metrics

### ⚠️ NOT YET MEASURED

**Status:** Tests created but NOT yet executed. Requires:
1. Running development/staging environment
2. Valid authentication token
3. Test data (proposal in DRAFT state)

**Next Steps:**
1. Start dev environment: `cd qlnckh && npm run dev`
2. Seed test data if needed
3. Run tests and record metrics below
4. Update this document with actual values

---

## Baseline Results Template

**After running tests, fill in these values:**

### Workflow Transitions
| Metric | Baseline (Pre-Refactor) | Post-Refactor | Regression |
|--------|------------------------|---------------|------------|
| p50 (ms) | TBD | TBD | TBD |
| p95 (ms) | TBD | TBD | TBD |
| p99 (ms) | TBD | TBD | TBD |
| Error Rate (%) | TBD | TBD | TBD |
| Throughput (req/s) | TBD | TBD | TBD |

### Auto-Save
| Metric | Baseline (Pre-Refactor) | Post-Refactor | Regression |
|--------|------------------------|---------------|------------|
| p50 (ms) | TBD | TBD | TBD |
| p95 (ms) | TBD | TBD | TBD |
| Idempotency Hit Rate (%) | TBD | TBD | TBD |
| Conflicts Detected | TBD | TBD | TBD |

---

## Performance Regression Criteria

**From AC7 (tech-spec):**
- ✅ **PASS:** p95 response time within ±10% of baseline
- ⚠️ **WARNING:** p95 between 10-20% regression (investigate)
- ❌ **FAIL:** p95 > 20% regression or error rate increase > 5%

**Example Calculation:**
```
Baseline p95 = 300ms
Max acceptable = 300ms × 1.10 = 330ms
Warning threshold = 300ms × 1.20 = 360ms

Post-refactor p95 = 280ms → ✅ PASS (7% improvement)
Post-refactor p95 = 340ms → ⚠️ WARNING (13% regression)
Post-refactor p95 = 400ms → ❌ FAIL (33% regression)
```

---

## Environment Information

**System:**
- OS: Linux 5.15.0-164-generic
- Node.js: (check with `node --version`)
- Database: PostgreSQL (local/staging)

**Application:**
- Commit: 785db11587c6e80820a70eb9358e1a33b70fdb9f
- Branch: main
- Build: Development/Production

**k6 Version:**
- k6 v0.50.0 (commit/f18209a5e3, go1.21.8, linux/amd64)

---

## Next Steps

1. ✅ Created k6 test scripts
2. ✅ Created baseline document template
3. ⏳ **RUN TESTS** in staging environment
4. ⏳ Record metrics in this document
5. ⏳ Use baseline for post-refactor comparison (Task 4.4)

---

**Last Updated:** 2026-01-10
**Status:** ⚠️ PENDING EXECUTION
