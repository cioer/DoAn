# Kế Hoạch Refactor Proposals Service - HIGH PRIORITY

**Date:** 2026-01-10
**Target:** `apps/src/modules/proposals/proposals.service.ts`
**Current Size:** 2,151 lines
**Target Size:** ~600 lines per file (4 files)
**Priority:** HIGH ⚠️

---

## 🎯 Mục Tiêu

### Vấn Đề Hiện Tại
- **File quá lớn:** 2,151 lines, 26 methods
- **Mixed responsibilities:** CRUD + Validation + Workflow + Queries
- **Khó maintain:** Code khó tìm, khó test
- **Risk cao:** Dễ gây conflict khi nhiều người cùng sửa

### Mục Tiêu Refactor
- **Tách thành 4 services** chuyên biệt
- **Mỗi file ~500-600 lines**
- **Clear separation of concerns**
- **Dễ test, dễ maintain**
- **Không thay đổi API** (backward compatible)

---

## 📋 Chi Tiết Tách File

### File 1: proposals-crud.service.ts (~400 lines)

**Chức năng:** Basic CRUD operations

**Methods:**
1. `createProposal()` - Create new proposal
2. `getProposalById()` - Get single proposal
3. `getProposals()` - List proposals with pagination
4. `updateProposal()` - Update proposal data
5. `deleteProposal()` - Soft delete proposal
6. `autoSaveProposal()` - Auto-save draft
7. `generateProposalCode()` - Generate DT-XXX code

**Dependencies:**
- PrismaService
- AuditService (optional - move to orchestrator)

**Không chứa:**
- ❌ Validation logic
- ❌ Workflow integration
- ❌ Complex queries
- ✅ Only pure CRUD operations

---

### File 2: proposals-validation.service.ts (~350 lines)

**Chức năng:** Validation logic

**Methods:**
1. `validateProposalAccess()` - Check user can access
2. `validateProposalEditable()` - Check if editable (DRAFT only)
3. `validateTemplateVersion()` - Validate template exists
4. `validateFormData()` - Validate form data structure
5. `validateAttachments()` - Validate attachment rules
6. `validateStateTransition()` - Validate state changes
7. `validateOwnership()` - Check user is owner

**Dependencies:**
- PrismaService
- WorkflowService (for state validation)

**Không chứa:**
- ❌ CRUD operations
- ❌ Database mutations
- ✅ Only read and validate

---

### File 3: proposals-workflow.service.ts (~400 lines)

**Chức năng:** Workflow integration

**Methods:**
1. `submitProposal()` - Submit to workflow
2. `syncProposalWithWorkflow()` - Sync state changes
3. `updateProposalFromWorkflow()` - Update from workflow events
4. `handleWorkflowTransition()` - Process transitions
5. `getProposalWorkflowState()` - Get current state
6. `getProposalWorkflowLogs()` - Get workflow history

**Dependencies:**
- PrismaService
- WorkflowService
- AuditService

**Không chứa:**
- ❌ Direct CRUD
- ❌ Validation logic (delegated)
- ✅ Only workflow orchestration

---

### File 4: proposals-query.service.ts (~500 lines)

**Chức năng:** Complex queries & reporting

**Methods:**
1. `getProposalsByFaculty()` - Filter by faculty
2. `getProposalsByState()` - Filter by state
3. `getProposalsByOwner()` - Filter by owner
4. `searchProposals()` - Full-text search
5. `getProposalStatistics()` - Stats & metrics
6. `getProposalsForReview()` - Review queue
7. `getProposalTimeline()` - History & events
8. `getProposalAttachments()` - With relations
9. `getProposalsWithTemplate()` - Include template data
10. `getProposalsExportData()` - Export format

**Dependencies:**
- PrismaService
- Various services for data enrichment

**Không chứa:**
- ❌ Mutations
- ❌ Workflow logic
- ✅ Only queries & aggregations

---

### File 5: proposals.service.ts (Main Orchestrator) (~400 lines)

**Chức năng:** Main service - orchestrates other services

**Structure:**
```typescript
@Injectable()
export class ProposalsService {
  constructor(
    private crud: ProposalsCrudService,
    private validation: ProposalsValidationService,
    private workflow: ProposalsWorkflowService,
    private queries: ProposalsQueryService,
  ) {}

  // Public API methods - delegate to specialized services
  async create(dto: CreateProposalDto, userId: string) {
    await this.validation.validateTemplateVersion(dto.templateId);
    await this.validation.validateFormData(dto.formData);
    return this.crud.createProposal(dto, userId);
  }

  async submit(proposalId: string, userId: string) {
    await this.validation.validateProposalAccess(proposalId, userId);
    await this.validation.validateProposalEditable(proposalId);
    return this.workflow.submitProposal(proposalId, userId);
  }

  // ... other orchestration methods
}
```

**Keep in main:**
- ✅ Public API methods
- ✅ Orchestration logic
- ✅ Backward compatibility

**Move out:**
- ❌ Implementation details
- ❌ Direct database access

---

## 🔄 Step-by-Step Implementation

### Phase 1: Preparation (30 minutes)

**Step 1.1: Analyze current methods**
```bash
# List all methods in proposals.service.ts
grep -n "  async\|  private\|  public" apps/src/modules/proposals/proposals.service.ts
```

**Step 1.2: Create method mapping**
Document each method:
- Name
- Purpose
- Dependencies
- Target file

**Step 1.3: Backup & branch**
```bash
git checkout -b refactor/proposals-service-split
git commit -m "snapshot: before proposals service refactor"
```

---

### Phase 2: Create New Services (2-3 hours)

**Step 2.1: Create file structure**
```bash
# Create new service files
touch apps/src/modules/proposals/services/proposals-crud.service.ts
touch apps/src/modules/proposals/services/proposals-validation.service.ts
touch apps/src/modules/proposals/services/proposals-workflow.service.ts
touch apps/src/modules/proposals/services/proposals-query.service.ts
```

**Step 2.2: Implement ProposalsCrudService (45 min)**
```typescript
// apps/src/modules/proposals/services/proposals-crud.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';

@Injectable()
export class ProposalsCrudService {
  private readonly logger = new Logger(ProposalsCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProposal(data: CreateProposalDto, userId: string) {
    // Implementation from original create()
  }

  async getProposalById(id: string) {
    // Implementation from original findOne()
  }

  // ... other CRUD methods
}
```

**Tasks:**
- Copy CRUD methods from original
- Remove validation logic
- Remove workflow logic
- Keep only database operations
- Add basic error handling

**Step 2.3: Implement ProposalsValidationService (45 min)**
```typescript
// apps/src/modules/proposals/services/proposals-validation.service.ts
import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';

@Injectable()
export class ProposalsValidationService {
  async validateProposalAccess(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({...});
    if (!proposal) throw new NotFoundException();
    if (proposal.ownerId !== userId) throw new ForbiddenException();
  }

  // ... other validation methods
}
```

**Tasks:**
- Extract validation logic
- Group by validation type
- Add clear error messages
- No database mutations

**Step 2.4: Implement ProposalsWorkflowService (45 min)**
```typescript
// apps/src/modules/proposals/services/proposals-workflow.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { WorkflowService } from '../../workflow/workflow.service';

@Injectable()
export class ProposalsWorkflowService {
  constructor(
    private workflow: WorkflowService,
    private prisma: PrismaService,
  ) {}

  async submitProposal(proposalId: string, userId: string) {
    return this.workflow.submitProposal(proposalId, {...});
  }

  // ... other workflow methods
}
```

**Tasks:**
- Extract workflow-related methods
- Delegate to WorkflowService
- Handle proposal-specific workflow logic
- Sync state with proposals

**Step 2.5: Implement ProposalsQueryService (45 min)**
```typescript
// apps/src/modules/proposals/services/proposals-query.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProposalsQueryService {
  async getProposalsByFaculty(facultyId: string, filters: QueryFilters) {
    return this.prisma.proposal.findMany({
      where: { facultyId, ...filters },
      include: {...},
    });
  }

  // ... other query methods
}
```

**Tasks:**
- Extract complex queries
- Add specialized find methods
- Include relations as needed
- Optimize with indexes

---

### Phase 3: Refactor Main Service (1 hour)

**Step 3.1: Update constructor**
```typescript
// apps/src/modules/proposals/proposals.service.ts
constructor(
  private readonly prisma: PrismaService,
  private readonly auditService: AuditService,
  private readonly crud: ProposalsCrudService,
  private readonly validation: ProposalsValidationService,
  private readonly workflow: ProposalsWorkflowService,
  private readonly queries: ProposalsQueryService,
) {}
```

**Step 3.2: Update each method**
For each of the 26 methods:

**Before:**
```typescript
async createProposal(dto: CreateProposalDto, userId: string) {
  // 100+ lines of mixed logic
}
```

**After:**
```typescript
async createProposal(dto: CreateProposalDto, userId: string) {
  await this.validation.validateTemplateVersion(dto.templateId);
  await this.validation.validateFormData(dto.formData);
  return this.crud.createProposal(dto, userId);
}
```

**Repeat for all 26 methods**

---

### Phase 4: Update Module (15 minutes)

**Step 4.1: Add new providers**
```typescript
// apps/src/modules/proposals/proposals.module.ts
import { ProposalsCrudService } from './services/proposals-crud.service';
import { ProposalsValidationService } from './services/proposals-validation.service';
import { ProposalsWorkflowService } from './services/proposals-workflow.service';
import { ProposalsQueryService } from './services/proposals-query.service';

@Module({
  providers: [
    ProposalsService,
    ProposalsCrudService,
    ProposalsValidationService,
    ProposalsWorkflowService,
    ProposalsQueryService,
    // ... other providers
  ],
  exports: [
    ProposalsService,
    ProposalsCrudService,
    ProposalsValidationService,
    ProposalsWorkflowService,
    ProposalsQueryService,
  ],
})
export class ProposalsModule {}
```

**Step 4.2: Update imports**
Ensure all services can import required dependencies.

---

### Phase 5: Update Tests (1 hour)

**Step 5.1: Update main service tests**
```typescript
// apps/src/modules/proposals/proposals.service.spec.ts
describe('ProposalsService', () => {
  let service: ProposalsService;
  let crud: ProposalsCrudService;
  let validation: ProposalsValidationService;
  let workflow: ProposalsWorkflowService;
  let queries: ProposalsQueryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({...}).compile();

    service = module.get<ProposalsService>(ProposalsService);
    crud = module.get<ProposalsCrudService>(ProposalsCrudService);
    validation = module.get<ProposalsValidationService>(ProposalsValidationService);
    workflow = module.get<ProposalsWorkflowService>(ProposalsWorkflowService);
    queries = module.get<ProposalsQueryService>(ProposalsQueryService);
  });

  it('should create proposal', async () => {
    jest.spyOn(validation, 'validateTemplateVersion').mockResolvedValue();
    jest.spyOn(validation, 'validateFormData').mockResolvedValue();
    jest.spyOn(crud, 'createProposal').mockResolvedValue(mockProposal);

    const result = await service.createProposal(dto, userId);
    expect(result).toEqual(mockProposal);
  });
});
```

**Step 5.2: Create tests for new services**
```typescript
// apps/src/modules/proposals/services/proposals-crud.service.spec.ts
describe('ProposalsCrudService', () => {
  // Test CRUD operations only
});

// apps/src/modules/proposals/services/proposals-validation.service.spec.ts
describe('ProposalsValidationService', () => {
  // Test validation logic
});

// ... etc
```

---

### Phase 6: Verify & Test (30 minutes)

**Step 6.1: Run tests**
```bash
npm test -- proposals.service.spec.ts
npm test -- proposals-*.spec.ts
```

**Step 6.2: Manual testing**
- Test all API endpoints
- Verify CRUD operations work
- Verify validation still works
- Verify workflow integration works
- Verify queries return correct data

**Step 6.3: Check imports**
```bash
# Verify no circular dependencies
grep -r "from.*proposals.service" apps/src
```

---

### Phase 7: Commit & Deploy (15 minutes)

**Step 7.1: Review changes**
```bash
git diff --stat
git diff apps/src/modules/proposals/
```

**Step 7.2: Commit**
```bash
git add apps/src/modules/proposals/
git commit -m "refactor(proposals): split service into 4 focused services

- Extract ProposalsCrudService (400 lines)
- Extract ProposalsValidationService (350 lines)
- Extract ProposalsWorkflowService (400 lines)
- Extract ProposalsQueryService (500 lines)
- Refactor ProposalsService as orchestrator (400 lines)

Before: 2,151 lines (1 file, 26 methods)
After: ~2,050 lines (5 files, clear separation)

Benefits:
- Better separation of concerns
- Easier to test and maintain
- No API changes (backward compatible)
- All tests passing

Test Results:
- proposals.service.spec.ts: PASSING
- New service tests: PASSING
- Manual API testing: PASSING
"
```

**Step 7.3: Create PR**
```bash
git push origin refactor/proposals-service-split
# Create pull request with description
```

---

## ⏱️ Time Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Preparation & backup | 30 min |
| 2 | Create new services | 2-3 hours |
| 3 | Refactor main service | 1 hour |
| 4 | Update module | 15 min |
| 5 | Update tests | 1 hour |
| 6 | Verify & test | 30 min |
| 7 | Commit & deploy | 15 min |
| **Total** | | **5-6 hours** |

---

## ✅ Success Criteria

- [ ] All 26 methods refactored/delegated
- [ ] Main service ~400 lines
- [ ] Each new service <600 lines
- [ ] All tests passing (272/278)
- [ ] No API changes (backward compatible)
- [ ] No circular dependencies
- [ ] Manual testing successful
- [ ] Code review approved

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Keep public API unchanged
- Use feature flags if needed
- Comprehensive testing

### Risk 2: Circular Dependencies
**Mitigation:**
- Careful dependency planning
- Use lazy loading if needed
- Check imports with script

### Risk 3: Test Failures
**Mitigation:**
- Run tests after each phase
- Fix issues immediately
- Keep git commits small

### Risk 4: Performance Regression
**Mitigation:**
- Benchmark before/after
- Monitor query performance
- Optimize if needed

---

## 📚 References

**Current File:** `apps/src/modules/proposals/proposals.service.ts`

**Related Files:**
- `apps/src/modules/proposals/proposals.controller.ts`
- `apps/src/modules/proposals/proposals.service.spec.ts`
- `apps/src/modules/proposals/proposals.module.ts`
- `apps/src/modules/workflow/workflow.service.ts`

**Documentation:**
- NestJS Custom Providers: https://docs.nestjs.com/fundamentals/custom-providers
- Service Refactoring: https://refactoring.guru/

---

**Created:** 2026-01-10
**Status:** Ready to implement
**Estimated Time:** 5-6 hours
**Priority:** HIGH ⚠️
**Branch:** refactor/proposals-service-split
