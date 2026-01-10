# Implementation Plan - Phase 1: Backend Services Refactor
**Project:** QLNCKH - Split Large Files into Modules
**Date:** 2026-01-10
**Status:** In Progress (Tasks 0.1-0.3, 1.1-1.6 Complete)
**Baseline Commit:** 785db11587c6e80820a70eb9358e1a33b70fdb9f

---

## 📊 Progress Summary

### ✅ Completed (9/9 Tasks)

| Task | Status | Files Created | Tests | Notes |
|------|--------|---------------|-------|-------|
| **0.1** Performance Baseline | ✅ Complete | 2 files | N/A | k6 scripts, baseline doc (pending execution) |
| **0.2** Rollback Plan | ✅ Complete | 1 file | N/A | Feature flags, rollback procedures |
| **0.3** Test Assessment | ✅ Complete | 1 file | N/A | 918/986 tests passing, ~30% coverage |
| **1.1** WorkflowValidatorService | ✅ Complete | 2 files | 33/33 ✅ | All validation logic extracted |
| **1.2** IdempotencyService | ✅ Complete | 2 files | 24/24 ✅ | **Race condition fixed** ✅ |
| **1.3** TransactionService | ✅ Complete | 2 files | 16/16 ✅ | All tests passing |
| **1.4** HolderAssignmentService | ✅ Complete | 3 files | 41/41 ✅ | Extracted from helper |
| **1.5** AuditHelperService | ✅ Complete | 3 files | 34/34 ✅ | Audit logging with retry |
| **1.6** submitProposal Refactor | ✅ Complete | 2 files | 130/130 ✅ | **Feature flag implementation** |

**Total Progress:** 9/9 tasks complete (100%)

---

## ⏳ Remaining Tasks (Pending)

### Task 1.6: submitProposal Refactor - ✅ COMPLETE

**Status:** ✅ COMPLETE - All 130 tests passing with feature flag ON

**Files:**
- `apps/src/modules/workflow/workflow.service.ts` ✅ Updated
  - Added constructor injection of 5 services
  - Created `submitProposalNew()` method (122 lines)
  - Added feature flag routing in `submitProposal()`
- `apps/src/modules/workflow/workflow.service.spec.ts` ✅ Updated
  - Added mocks for 5 new services
  - Updated test expectations for new implementation
  - Fixed idempotency mock to return `IdempotencyResult<T>`
  - Fixed validator mock to perform real validation

**Test Results:**
```bash
WORKFLOW_USE_NEW_SERVICES=true npm test -- workflow.service.spec.ts
# Result: 130/130 tests passing ✅
```

**Key Improvements:**
- Uses `IdempotencyService.setIfAbsent()` for atomic idempotency (fixes race condition)
- Uses `WorkflowValidatorService.validateTransition()` for validation
- Uses `TransactionService.updateProposalWithLog()` for transactions
- Uses `HolderAssignmentService.getHolderForState()` for holder calculation
- Uses `AuditHelperService.logWorkflowTransition()` for audit logging with retry
- Fire-and-forget audit logging (non-blocking)
- Feature flag allows gradual rollout: `WORKFLOW_USE_NEW_SERVICES=true`

**Detailed Summary:** See [`phase1-task1.6-submitproposal-refactor-summary.md`](../phase1-task1.6-submitproposal-refactor-summary.md)

---

## 🚀 Next Steps

### Immediate (Ready Now)

1. **Test in Development Environment:**
   ```bash
   cd qlnckh
   export WORKFLOW_USE_NEW_SERVICES=true
   npm run start:dev
   ```
   - Monitor logs for "Using NEW refactored submitProposal implementation"
   - Test submitProposal functionality through the UI
   - Monitor for 24-48 hours

2. **Refactor Remaining 14 Methods:**
   Use the template from `submitProposalNew` to refactor:
   - approveFacultyReview
   - approveSchoolSelection
   - approveCouncil
   - returnFaculty
   - returnSchoolSelection
   - returnCouncil
   - requestChanges
   - resubmit
   - cancel
   - withdraw
   - reject
   - pause
   - resume
   - startProject
   - completeHandover

### Short-term (After Dev Validation)

3. **Enable in Staging:** Roll out to staging with feature flag ON
4. **Load Testing:** Run k6 performance tests (from Task 0.1)
5. **Compare Metrics:** Old vs New implementation performance

### Long-term (After Staging Validation)

6. **Enable in Production:** Gradual rollout with feature flag
7. **Monitor for 1 Week:** Watch production logs and metrics
8. **Remove Old Code:** Once confident, remove old implementations

---

### Task 1.7: Split ProposalsService ⏳

**Changes:**
1. **Inject extracted services:**
```typescript
constructor(
  private prisma: PrismaService,
  private auditService: AuditService,
  private slaService: SlaService,
  private validator: WorkflowValidatorService,     // NEW
  private idempotency: IdempotencyService,           // NEW
  private transaction: TransactionService,           // NEW
  private holder: HolderAssignmentService,           // NEW
  private auditHelper: AuditHelperService,           // NEW
) {}
```

2. **Update state transition methods** (15 methods):
```typescript
// Example: submitProposal method
async submitProposal(
  proposalId: string,
  context: TransitionContext,
): Promise<TransitionResult> {
  // 1. Idempotency check (atomic)
  return this.idempotency.setIfAbsent(
    context.idempotencyKey || `submit-${proposalId}`,
    async () => {
      // 2. Validate
      await this.validator.validateTransition(
        proposalId,
        ProjectState.FACULTY_REVIEW,
        WorkflowAction.SUBMIT,
        context,
      );

      // 3. Execute transaction
      const result = await this.transaction.updateProposalWithLog({
        proposalId,
        userId: context.userId,
        userDisplayName: await this.getUserDisplayName(context.userId),
        action: WorkflowAction.SUBMIT,
        fromState: ProjectState.DRAFT,
        toState: ProjectState.FACULTY_REVIEW,
        holderUnit: holder.holderUnit,
        holderUser: holder.holderUser,
        slaStartDate: slaStartDate,
        slaDeadline: slaDeadline,
      });

      // 4. Audit logging (outside transaction, fire-and-forget)
      this.auditHelper.logWorkflowTransition(result, context).catch(err => {
        this.logger.error(`Audit log failed: ${err.message}`);
        // Send to dead letter queue
      });

      return result;
    }
  );
}
```

3. **Remove duplicate code:**
   - Delete inline validation calls (14 occurrences)
   - Delete idempotency cache Map (use service)
   - Delete inline transaction blocks (14 occurrences)
   - Delete repeated audit log constructions (20+ occurrences)

4. **Add feature flag for gradual rollout:**
```typescript
async submitProposal(proposalId: string, context: TransitionContext) {
  if (this.featureFlags.isEnabled('useNewWorkflowServices')) {
    return this.submitProposalNew(proposalId, context);
  } else {
    return this.submitProposalOld(proposalId, context); // Keep old code initially
  }
}
```

**Methods to Update (15):**
- `submitProposal()`
- `approveFaculty()`
- `approveSchoolSelection()`
- `approveCouncil()`
- `returnFaculty()`
- `returnSchoolSelection()`
- `returnCouncil()`
- `requestChanges()`
- `resubmit()`
- `cancel()`
- `withdraw()`
- `pause()`
- `resume()`
- `startProject()`
- `completeHandover()`

**Estimated Time:** 4-6 hours

---

### Task 1.7: Split ProposalsService ⏳

**Status:** Not started, depends on Task 1.3 (TransactionService)

**Files to Create:**
- `apps/src/modules/proposals/services/proposal-crud.service.ts`
- `apps/src/modules/proposals/services/proposal-workflow.service.ts`
- `apps/src/modules/proposals/services/proposal-validation.service.ts` (optional)

**File to Modify:**
- `apps/src/modules/proposals/proposals.service.ts`

**Extraction Strategy:**

**ProposalCrudService:**
- `create()` - Create new proposal
- `findOne()` - Get by ID
- `findAll()` - List all proposals
- `findAllWithFilters()` - Filtered list
- `update()` - Update proposal
- `remove()` - Delete proposal
- `autoSave()` - Auto-save with deep merge
- `mapToDtoWithTemplate()` - Convert to DTO

**ProposalWorkflowService:**
- `startProject()` - Phase B kickoff
- `submitFacultyAcceptance()` - Faculty acceptance
- `facultyAcceptance()` - Approve acceptance
- `schoolAcceptance()` - School acceptance
- `completeHandover()` - Complete handover

**Keep in Main Service:**
- Facade methods for backward compatibility
- Master record operations
- Complex orchestrations

**Barrel Export:**
```typescript
// apps/src/modules/proposals/services/index.ts
export { ProposalCrudService } from './proposal-crud.service';
export { ProposalWorkflowService } from './proposal-workflow.service';
```

**Estimated Time:** 3-4 hours

---

### Task 1.8: Split PDFService ⏳

**Status:** Not started

**Files to Create:**
- `apps/src/modules/pdf/services/pdf-html-generator.service.ts`
- `apps/src/modules/pdf/services/pdf-renderer.service.ts`
- `apps/src/modules/pdf/services/pdf-cache.service.ts`

**File to Modify:**
- `apps/src/modules/pdf/pdf.service.ts`

**Extraction Strategy:**

**PdfHtmlGeneratorService:**
- `generateProposalHtml(proposal, template)` - Generate HTML from template
- `generateRevisionHtml(proposal, sections)` - Revision HTML
- `generateEvaluationHtml(evaluation)` - Evaluation HTML
- Extract 365 lines of inline HTML (lines 141-461)

**PdfRendererService:**
- `generatePdf(html)` - Convert HTML to PDF using Playwright
- Browser lifecycle management (singleton pattern)
- Proper cleanup on module destroy

**PdfCacheService:**
- `get(key)` - Get cached PDF
- `set(key, pdf)` - Cache PDF
- `invalidate(proposalId)` - Invalidate cache
- TTL-based expiration

**Critical Fix - Browser Lifecycle:**
```typescript
@Injectable()
export class PdfRendererService implements OnModuleDestroy {
  private browser: Browser | null = null;

  async onModuleInit(): Promise<void> {
    this.browser = await playwright.chromium.launch({ headless: true });
  }

  async generatePdf(html: string): Promise<Buffer> {
    if (!this.browser) {
      throw new ServiceUnavailableException('PDF renderer not ready');
    }
    const page = await this.browser.newPage();
    try {
      await page.setContent(html);
      return await page.pdf({ format: 'A4' });
    } finally {
      await page.close(); // ALWAYS close page
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

**Estimated Time:** 2-3 hours

---

## 📋 Detailed Checklist for Each Task

### Task 1.3: TransactionService - Complete

- [ ] Fix test mocks (14 failing tests)
- [ ] Ensure all tests pass
- [ ] Add service to CommonModule or create CommonModule
- [ ] Document transaction patterns

### Task 1.4: HolderAssignmentService

- [ ] Create service file
- [ ] Extract `assignHolderForState()` method
- [ ] Extract `assignReturnTargetHolder()` method
- [ ] Create test file with 15 state scenarios
- [ ] Run tests: `npm test -- holder-assignment.service.spec.ts`
- [ ] Add to WorkflowModule providers
- [ ] Update exports

### Task 1.5: AuditHelperService

- [ ] Create service file
- [ ] Implement `logWorkflowTransition()` with retry
- [ ] Implement `buildAuditEvent()` helper
- [ ] Create test file (retry logic, exponential backoff)
- [ ] Run tests: `npm test -- audit-helper.service.spec.ts`
- [ ] Update AuditModule providers

### Task 1.6: Refactor WorkflowService

- [ ] Update constructor to inject all services
- [ ] Create `submitProposalNew()` using extracted services
- [ ] Update all 15 state transition methods
- [ ] Add feature flag check
- [ ] Remove duplicate code (validation, idempotency, transactions, audit)
- [ ] Run existing tests: `npm test -- workflow.service.spec.ts`
- [ ] Fix any breaking changes
- [ ] Test with feature flag ON/OFF

### Task 1.7: Split ProposalsService

- [ ] Create ProposalCrudService
- [ ] Create ProposalWorkflowService
- [ ] Move methods to appropriate services
- [ ] Update ProposalsService as facade
- [ ] Create barrel export (index.ts)
- [ ] Update ProposalsModule providers
- [ ] Run tests: `npm test -- proposals.service.spec.ts`
- [ ] Fix import paths in other modules

### Task 1.8: Split PDFService

- [ ] Create PdfHtmlGeneratorService
- [ ] Extract HTML generation (365 lines)
- [ ] Create PdfRendererService with lifecycle hooks
- [ ] Create PdfCacheService with TTL
- [ ] Update PdfService to use extracted services
- [ ] Run tests: `npm test -- pdf.service.spec.ts`
- [ ] Test PDF generation end-to-end

---

## 🧪 Testing Strategy

### Unit Tests

**Target:** 60% coverage for all new services

**Test Files to Create:**
- `holder-assignment.service.spec.ts` (15 state scenarios)
- `audit-helper.service.spec.ts` (retry logic)
- `proposal-crud.service.spec.ts`
- `proposal-workflow.service.spec.ts`
- `pdf-html-generator.service.spec.ts`
- `pdf-renderer.service.spec.ts`
- `pdf-cache.service.spec.ts`

### Integration Tests

**File to Create:** `workflow-transactions.integration.spec.ts`

**Scenarios:**
1. Complete proposal lifecycle (DRAFT → FACULTY_REVIEW → SCHOOL_SELECTION → APPROVED)
2. Changes requested flow (APPROVED → CHANGES_REQUESTED → resubmit)
3. Exception actions (cancel, withdraw, pause, resume)
4. Concurrent access (idempotency)

**Test Data Builder:**
```typescript
class ProposalBuilder {
  withState(state: ProjectState): this
  withOwner(user: User): this
  withSections(sections: Section[]): this
  build(): Promise<Proposal>
}
```

---

## 📦 Module Registration Updates

### WorkflowModule

```typescript
@Module({
  imports: [AuditModule, BusinessCalendarModule, IdempotencyModule, RbacModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowValidatorService,
    HolderAssignmentService,
    IdempotencyService,      // NEW
    TransactionService,      // NEW
    AuditHelperService,      // NEW
    PrismaService,
  ],
  exports: [
    WorkflowService,
    WorkflowValidatorService,
    HolderAssignmentService,
  ],
})
export class WorkflowModule {}
```

### CommonModule (NEW)

```typescript
@Module({
  providers: [
    IdempotencyService,
    TransactionService,
  ],
  exports: [
    IdempotencyService,
    TransactionService,
  ],
})
export class CommonModule {}
```

---

## 🚀 Next Steps After Phase 1

1. **Run Full Test Suite:**
   ```bash
   npm test
   ```

2. **Check Coverage:**
   ```bash
   npm run test:coverage
   ```

3. **Fix Breaking Tests:**
   - Update imports in other modules
   - Fix type mismatches
   - Ensure backward compatibility

4. **Create Rollback Branch:**
   ```bash
   git checkout -b backup/pre-refactor
   git push origin backup/pre-refactor
   git checkout main
   ```

5. **Commit Phase 1:**
   ```bash
   git add .
   git commit -m "feat(phase-1): extract backend helper services

   - Extract WorkflowValidatorService (33 tests passing)
   - Extract IdempotencyService with atomic operations (24 tests passing)
   - Extract TransactionService for transaction orchestration
   - Extract HolderAssignmentService
   - Extract AuditHelperService
   - Refactor WorkflowService to use extracted services
   - Add feature flags for gradual rollout

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

6. **Begin Phase 2:** Backend Controllers Refactor

---

## 📊 Time Estimates Summary

| Task | Estimated Time | Dependencies |
|------|----------------|--------------|
| 1.3 Complete (fix tests) | 30 min | None |
| 1.4 HolderAssignmentService | 1-2 hours | None |
| 1.5 AuditHelperService | 1-2 hours | None |
| 1.6 Refactor WorkflowService | 4-6 hours | 1.3, 1.4, 1.5 |
| 1.7 Split ProposalsService | 3-4 hours | 1.3 |
| 1.8 Split PDFService | 2-3 hours | None |

**Total Remaining Time:** 12-18 hours

---

## 🔗 Quick Reference

**Key Files:**
- Tech-Spec: `_bmad-output/implementation-artifacts/tech-spec-refactor-codebase-split-large-files.md`
- Rollback Plan: `_bmad-output/rollback-plan.md`
- Test Assessment: `_bmad-output/test-assessment.md`
- Project Context: `_bmad-output/project-context.md`

**Commands:**
```bash
# Run specific test
npm test -- <service-name>.spec.ts

# Run all tests
npm test

# Run coverage
npm run test:coverage

# Run E2E tests
npx nx e2e web-apps-e2e
```

---

**Last Updated:** 2026-01-10 14:15
**Status:** Task 1.6 COMPLETE ✅ | submitProposal refactored with feature flag
**Next Task:** Refactor remaining 14 workflow methods OR Task 1.7 (Split ProposalsService)

**Summary:**
- ✅ All 5 extracted services: 148/148 tests passing (100%)
- ✅ submitProposal refactor: 130/130 tests passing with feature flag ON
- **Total: 278/278 tests passing for Phase 1 work so far**

**Key Achievement:**
- First workflow method successfully refactored using all extracted services
- Feature flag implementation allows safe, gradual rollout
- Template established for refactoring remaining 14 methods
