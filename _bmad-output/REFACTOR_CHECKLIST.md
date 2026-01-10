# Checklist Refactor Proposals Service

## ⚡ Quick Start

```bash
# 1. Create branch
git checkout -b refactor/proposals-service-split

# 2. Create file structure
mkdir -p apps/src/modules/proposals/services
touch apps/src/modules/proposals/services/proposals-crud.service.ts
touch apps/src/modules/proposals/services/proposals-validation.service.ts
touch apps/src/modules/proposals/services/proposals-workflow.service.ts
touch apps/src/modules/proposals/services/proposals-query.service.ts

# 3. Implement each service (follow plan)
# 4. Update main service
# 5. Update tests
# 6. Verify all passing
# 7. Commit & push
```

---

## 📋 Method Mapping

### → proposals-crud.service.ts (7 methods)
- [ ] createProposal
- [ ] getProposalById
- [ ] getProposals
- [ ] updateProposal
- [ ] deleteProposal
- [ ] autoSaveProposal
- [ ] generateProposalCode

### → proposals-validation.service.ts (7 methods)
- [ ] validateProposalAccess
- [ ] validateProposalEditable
- [ ] validateTemplateVersion
- [ ] validateFormData
- [ ] validateAttachments
- [ ] validateStateTransition
- [ ] validateOwnership

### → proposals-workflow.service.ts (6 methods)
- [ ] submitProposal
- [ ] syncProposalWithWorkflow
- [ ] updateProposalFromWorkflow
- [ ] handleWorkflowTransition
- [ ] getProposalWorkflowState
- [ ] getProposalWorkflowLogs

### → proposals-query.service.ts (6 methods)
- [ ] getProposalsByFaculty
- [ ] getProposalsByState
- [ ] getProposalsByOwner
- [ ] searchProposals
- [ ] getProposalStatistics
- [ ] getProposalTimeline

### → proposals.service.ts (orchestrator) - Keep all 26 methods
- [ ] Update constructor (inject 4 new services)
- [ ] Update each method to delegate
- [ ] Keep public API unchanged

---

## ✅ Verification

```bash
# Run tests
npm test -- proposals.service.spec.ts

# Check file sizes
wc -l apps/src/modules/proposals/services/*.service.ts

# Check imports (no circular deps)
grep -r "from.*proposals.service" apps/src/modules/proposals/services/
```

---

**Expected Results:**
- proposals-crud.service.ts: ~400 lines
- proposals-validation.service.ts: ~350 lines
- proposals-workflow.service.ts: ~400 lines
- proposals-query.service.ts: ~500 lines
- proposals.service.ts: ~400 lines
- **Total:** ~2,050 lines (better organized)
- **Tests:** ALL PASSING ✅

---

**Time:** 5-6 hours | **Priority:** HIGH ⚠️
