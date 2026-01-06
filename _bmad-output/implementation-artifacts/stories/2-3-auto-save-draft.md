# Story 2.3: Auto-Save DRAFT

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Giảng viên (PROJECT_OWNER)**,
I want **form tự động save khi tôi điền dữ liệu**,
So that **tôi không mất dữ liệu khi browser crash hoặc mất điện**.

## Acceptance Criteria

1. **AC1: Auto-save Trigger** - Giảng viên đang ở màn hình Edit Proposal (DRAFT state), khi thay đổi bất kỳ field nào, system trigger auto-save sau 2 giây debounce
2. **AC2: Save Indicator** - UI hiển thị indicator "Đang lưu..." khi auto-save đang chạy
3. **AC3: Success Indicator** - Khi save thành công, UI hiển thị "Đã lưu vào HH:mm:ss" và proposal data được update trong database
4. **AC4: Error Handling** - Khi auto-save thất bại (network error), UI hiển thị toast "Lưu thất bại. Đang thử lại..." và system retry lên đến 3 lần với exponential backoff
5. **AC5: Data Persistence** - Giảng viên đóng tab khi đang edit, khi mở lại proposal, dữ liệu được preserve (không mất)

## Tasks / Subtasks

- [x] **Task 1: Backend - Auto-save API Endpoint** (AC: 3, 4, 5)
  - [x] Subtask 1.1: Create PATCH /api/proposals/:id/auto-save endpoint (accepts partial form_data)
  - [x] Subtask 1.2: Implement optimistic locking with updatedAt check (prevent overwrite newer data)
  - [x] Subtask 1.3: Add auto-save detection logging (audit event: PROPOSAL_AUTO_SAVE)
  - [x] Subtask 1.4: Ensure only DRAFT proposals can be auto-saved (other states rejected)

- [x] **Task 2: Backend - Merge Strategy for form_data** (AC: 3, 5)
  - [x] Subtask 2.1: Implement deep merge strategy (preserve sections not in current save)
  - [x] Subtask 2.2: Add validation for form_data structure (based on template)
  - [x] Subtask 2.3: Handle partial section updates (single field vs entire section)

- [x] **Task 3: Frontend - Auto-save Hook** (AC: 1, 2, 3, 4)
  - [x] Subtask 3.1: Create useAutoSave hook with 2-second debounce
  - [x] Subtask 3.2: Implement save state management (idle, saving, success, error)
  - [x] Subtask 3.3: Add exponential backoff retry logic (3 attempts: 1s, 2s, 4s delays)
  - [x] Subtask 3.4: Implement queue-based auto-save (discard pending saves on new changes)

- [x] **Task 4: Frontend - Auto-save Indicator Component** (AC: 2, 3, 4)
  - [x] Subtask 4.1: Create SaveIndicator component (states: saving, saved, error)
  - [x] Subtask 4.2: Display "Đang lưu..." with spinner animation
  - [x] Subtask 4.3: Display "Đã lưu vào HH:mm:ss" timestamp on success
  - [x] Subtask 4.4: Display error toast with retry button on failure

- [x] **Task 5: Integration with Proposal Form** (AC: 1, 5)
  - [x] Subtask 5.1: Integrate useAutoSave hook with ProposalForm component
  - [x] Subtask 5.2: Trigger auto-save on form field changes (onChange/onBlur)
  - [x] Subtask 5.3: Show SaveIndicator in form header (visible indicator)
  - [x] Subtask 5.4: Handle unmount/component cleanup (force save on unmount - FIXED)

- [x] **Task 6: Testing** (AC: All)
  - [x] Subtask 6.1: Unit tests for auto-save API endpoint (merge, validation, optimistic locking)
  - [x] Subtask 6.2: Unit tests for useAutoSave hook (debounce, retry, queue)
  - [x] Subtask 6.3: Integration tests for auto-save flow
  - [x] Subtask 6.4: E2E test for auto-save with browser close/reopen

## Dev Notes

### EPIC ANALYSIS

**Epic 2: Proposal Draft + Attachments + Form Registry**
- **Objective:** Giảng viên tạo đề tài, lưu nháp với auto-save, upload tài liệu đính kèm, Form Registry chuẩn
- **FRs covered:** FR5 (Auto-save DRAFT với timestamp)
- **Epic Status:** In-progress (Stories 2.1 and 2.2 completed)

**Our Story Position in Epic:**
- Story 2.1 (Form Registry) ✅ Done - Provides canonical section IDs and form templates
- Story 2.2 (Create Proposal) ✅ Done - Provides proposal CRUD with form_data structure
- **Story 2.3 (Auto-Save) 🎯 Current Story** - Adds auto-save capability for DRAFT proposals
- Story 2.4 (Upload Attachments) - Next story (depends on form_data being stable)

**Story Foundation (from epics.md lines 610-638):**

**User Story:**
```
As a Giảng viên,
I want form tự động save khi tôi điền dữ liệu,
So that tôi không mất dữ liệu khi browser crash hoặc mất điện.
```

**Acceptance Criteria (from epics):**
- AC1: 2-second debounce trigger when field changes
- AC2: "Đang lưu..." indicator during save
- AC3: "Đã lưu vào HH:mm:ss" on success
- AC4: Error handling with 3x retry exponential backoff
- AC5: Data preserved on tab close/reopen

### PREVIOUS STORY INTELLIGENCE

**Story 2.1 (Form Registry) - Done:**
- Created `FormTemplate` and `FormSection` models with canonical section IDs
- API endpoints: GET /api/form-templates, GET /api/form-templates/:id
- Seed data: MAU_01B through MAU_18B templates
- Form sections defined with `section_id`, `label`, `component`, `displayOrder`, `isRequired`
- **Key file:** `apps/src/modules/form-templates/form-templates.service.ts`

**Story 2.2 (Create Proposal) - Done:**
- Created `Proposals` module with CRUD operations
- Database schema includes: `form_data` (JSON), `template_id`, `template_version`
- API endpoints: POST /api/proposals, GET /api/proposals/:id, PUT /api/proposals/:id
- FormDataValidationService validates form data against template requirements
- Proposal code generation: DT-001, DT-002, etc.
- **Key files:**
  - `apps/src/modules/proposals/proposals.service.ts`
  - `apps/src/modules/proposals/form-data-validation.service.ts`
  - `apps/src/modules/proposals/dto/proposal.dto.ts`

**Learnings from Previous Stories:**
1. **Test Infrastructure Fix:** Bypass NestJS DI in tests by manually creating service instances with mocks - all 146 tests passing
2. **Code Quality Fixes from Review:**
   - Fixed race condition in code generation using atomic `$queryRaw()` with SQL `MAX()`
   - Fixed lost `this` context in array `map()` callbacks
   - Added missing audit event logging for DELETE operations
3. **Form Data Structure:** The `form_data` column stores JSON with canonical section IDs as keys:
   ```typescript
   {
     "SEC_INFO_GENERAL": { title: "...", objective: "..." },
     "SEC_BUDGET": { total: 50000000, sources: [...] },
     // ... other sections
   }
   ```

### ARCHITECTURE COMPLIANCE

**Tech Stack:**
- Backend: NestJS 10.x + Prisma 5.x + PostgreSQL 16
- Frontend: React 18 + TypeScript 5.x + TanStack Query 5.x + shadcn/ui
- Module location: `apps/api/src/modules/proposals/` (reuse existing module)

**Key Architectural Patterns to Follow:**

1. **API Response Format (CRITICAL):**
   ```typescript
   // Success
   { success: true, data: {...}, meta: {...} }

   // Error
   { success: false, error: { code: "ERROR_CODE", message: "...", details: [...] } }
   ```

2. **Database Naming (CRITICAL):**
   - Tables/Columns: `snake_case` (updated_at, form_data, proposal_id)
   - JavaScript/TypeScript: `camelCase` (updatedAt, formData, proposalId)

3. **Use Prisma Types (REQUIRED):**
   ```typescript
   import { Proposal, ProjectState } from '@prisma/client';
   // NEVER redefine types that Prisma generates
   ```

4. **RBAC Authorization:**
   - Auto-save endpoint: Only owner (PROJECT_OWNER context) can auto-save their own DRAFT proposals
   - Use `@RequirePermissions()` or equivalent guard from Story 1.2

5. **Audit Event Logging:**
   - Log `PROPOSAL_AUTO_SAVE` action when auto-save occurs
   - Include: proposal_id, actor_user_id, metadata: { sections_updated: [...] }

**SLA & State Machine Context:**
- Auto-save ONLY works for `ProjectState.DRAFT`
- Once proposal transitions to `FACULTY_REVIEW`, form data becomes read-only
- No auto-save needed for other states (not editable)

### TECHNICAL REQUIREMENTS

**Backend Implementation Details:**

**1. Auto-save Endpoint Design:**
```typescript
// PATCH /api/proposals/:id/auto-save
// Purpose: Incremental save of form_data without full validation
Request: {
  formData: Record<string, unknown>; // Partial form data (deep merge)
  expectedVersion?: number; // Optimistic concurrency (updatedAt timestamp)
}
Response: {
  success: true,
  data: {
    id: "uuid",
    formData: { ... }, // Merged form data
    updatedAt: "2026-01-06T10:30:00Z"
  }
}

Error: {
  success: false,
  error: {
    code: "CONFLICT", // If version mismatch
    message: "Dữ liệu đã được cập nhật bởi phiên khác. Vui lòng tải lại.",
    details: []
  }
}
```

**2. Deep Merge Strategy:**
- Incoming `formData` should be DEEP MERGED with existing `formData`
- Preserve sections not included in current save
- Example:
  ```typescript
  // Existing form_data
  { "SEC_INFO_GENERAL": { title: "Old", ... }, "SEC_BUDGET": { ... } }

  // Incoming partial save (only updating SEC_INFO_GENERAL.title)
  { "SEC_INFO_GENERAL": { title: "New Title" } }

  // Result after deep merge
  {
    "SEC_INFO_GENERAL": { title: "New Title", /* other fields preserved */ },
    "SEC_BUDGET": { /* unchanged */ }
  }
  ```

**3. Optimistic Locking:**
```typescript
// In proposals.service.ts
async autoSave(id: string, formData: Record<string, unknown>, expectedUpdatedAt?: Date) {
  const existing = await this.prisma.proposal.findUnique({ where: { id } });

  // Check version if provided
  if (expectedUpdatedAt && existing.updatedAt > expectedUpdatedAt) {
    throw new ConflictException('Dữ liệu đã được cập nhật bởi phiên khác');
  }

  // Deep merge form_data
  const mergedFormData = this.deepMerge(existing.formData, formData);

  // Update with timestamp check
  return this.prisma.proposal.update({
    where: { id },
    data: {
      formData: mergedFormData,
      // updatedAt handled automatically by Prisma @updatedAt
    }
  });
}
```

**Frontend Implementation Details:**

**1. useAutoSave Hook Pattern:**
```typescript
// apps/web/src/hooks/useAutoSave.ts
interface UseAutoSaveOptions {
  proposalId: string;
  enabled?: boolean; // Only auto-save if DRAFT
  debounceMs?: number; // Default: 2000ms
  maxRetries?: number; // Default: 3
}

interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: Date;
  error?: Error;
}

const useAutoSave = ({
  proposalId,
  enabled = true,
  debounceMs = 2000,
  maxRetries = 3
}: UseAutoSaveOptions) => {
  const [state, setState] = useState<AutoSaveState>({ status: 'idle' });
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingDataRef = useRef<Record<string, unknown>>();

  // Trigger auto-save with debounce
  const triggerSave = useCallback((formData: Record<string, unknown>) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Store pending data
    pendingDataRef.current = formData;

    // Set timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      if (!enabled || !pendingDataRef.current) return;

      setState({ status: 'saving' });

      try {
        await proposalsApi.autoSave(proposalId, pendingDataRef.current);
        setState({
          status: 'saved',
          lastSavedAt: new Date()
        });

        // Reset to idle after 2 seconds
        setTimeout(() => setState({ status: 'idle' }), 2000);
      } catch (error) {
        setState({
          status: 'error',
          error: error as Error
        });
      }
    }, debounceMs);
  }, [proposalId, enabled, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { state, triggerSave };
};
```

**2. SaveIndicator Component:**
```typescript
// apps/web/src/components/SaveIndicator.tsx
interface SaveIndicatorProps {
  state: AutoSaveState;
}

const SaveIndicator: React.FC<SaveIndicatorProps> = ({ state }) => {
  if (state.status === 'idle') return null;

  if (state.status === 'saving') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Đang lưu...</span>
      </div>
    );
  }

  if (state.status === 'saved' && state.lastSavedAt) {
    const time = new Date(state.lastSavedAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Đã lưu vào {time}</span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>Lưu thất bại. Đang thử lại...</span>
      </div>
    );
  }

  return null;
};
```

**3. Integration with ProposalForm:**
```typescript
// apps/web/src/app/proposals/[id]/edit/page.tsx
const ProposalEditPage = () => {
  const { proposal } = useProposal(params.id);
  const { state, triggerSave } = useAutoSave({
    proposalId: params.id,
    enabled: proposal?.state === 'DRAFT'
  });

  const handleFieldChange = (sectionId: string, field: string, value: unknown) => {
    // Update local form state
    setFormData((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value
      }
    }));

    // Trigger auto-save
    triggerSave(formData);
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1>Chỉnh sửa đề tài</h1>
        <SaveIndicator state={state} />
      </div>
      <ProposalForm data={formData} onChange={handleFieldChange} />
    </div>
  );
};
```

### FILE STRUCTURE REQUIREMENTS

**Backend Module (extend existing proposals module):**
```
apps/api/src/modules/proposals/
├── proposals.controller.ts       // Add auto-save endpoint
├── proposals.service.ts          // Add autoSave() method
├── dto/
│   └── proposal.dto.ts           // Add AutoSaveProposalDto
└── proposals.service.spec.ts     // Add tests for auto-save
```

**Frontend Components (new for this story):**
```
apps/web/src/
├── hooks/
│   └── useAutoSave.ts            // Auto-save hook with debounce
├── components/
│   └── SaveIndicator.tsx         // Save status indicator
└── app/proposals/[id]/
    └── edit/
        └── page.tsx              // Edit page with auto-save
```

### TESTING REQUIREMENTS

**Unit Tests (Backend):**
```typescript
// proposals.service.spec.ts
describe('autoSave', () => {
  it('should deep merge form data correctly');
  it('should reject if proposal is not in DRAFT state');
  it('should throw CONFLICT if updatedAt mismatch (optimistic locking)');
  it('should log PROPOSAL_AUTO_SAVE audit event');
  it('should preserve sections not in current save');
});
```

**Unit Tests (Frontend):**
```typescript
// useAutoSave.spec.ts
describe('useAutoSave', () => {
  it('should debounce save calls by 2 seconds');
  it('should cancel previous pending save on new change');
  it('should show saving status during save');
  it('should show saved timestamp on success');
  it('should retry on failure with exponential backoff');
  it('should cleanup on unmount');
});
```

**Integration Tests:**
```typescript
// auto-save.e2e.ts
describe('Auto-save flow', () => {
  it('should auto-save after field change');
  it('should preserve data on page reload');
  it('should handle concurrent edits (optimistic locking)');
  it('should show correct indicators throughout flow');
});
```

### VALIDATION RULES

**Auto-save is lenient (vs submit validation):**
- Auto-save: Accept any valid JSON structure (store as-is, validate later on submit)
- Submit: Full validation required (all required fields present)

**Rationale:** Auto-save happens while typing, so we don't want to block with validation errors. Full validation happens when user clicks "Nộp hồ sơ".

### ERROR HANDLING

**Network Error Scenarios:**
1. **First failure:** Retry after 1 second (exponential backoff)
2. **Second failure:** Retry after 2 seconds
3. **Third failure:** Show error toast, stop retrying
4. **User can continue editing:** New changes trigger new save attempt

**Error Message (Vietnamese):**
```
Toast: "Lưu thất bại. Đang thử lại..."
Icon: AlertCircle (Lucide)
Action: Auto-retry (max 3 attempts)
```

### DEPENDENCIES

**Prerequisites (Completed):**
- ✅ Story 1.1 (Authentication) - User auth required
- ✅ Story 1.2 (RBAC) - Owner-only access control
- ✅ Story 2.1 (Form Registry) - Form template structure
- ✅ Story 2.2 (Create Proposal) - Proposals module with form_data

**Blocking:**
- Story 2.4 (Upload Attachments) - Can add attachments to stable draft

### REFERENCES

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.3](../planning-artifacts/epics.md) - Epic 2 stories breakdown
- [Source: _bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) - Architecture decisions
- [Source: _bmad-output/project-context.md](../project-context.md) - Project rules and patterns
- Story 2.1: Form Registry (prerequisite for form templates)
- Story 2.2: Create Proposal (proposals module foundation)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

#### Backend Implementation (Complete)

1. **PATCH /api/proposals/:id/auto-save endpoint** created in `apps/src/modules/proposals/proposals.controller.ts`
   - Accepts partial `formData` with deep merge strategy
   - Optimistic locking with `expectedUpdatedAt` parameter
   - Only DRAFT proposals can be auto-saved (validated via state check)
   - Logs `PROPOSAL_AUTO_SAVE` audit event with sections_updated metadata

2. **Deep Merge Strategy** implemented in `ProposalsService.deepMerge()`
   - Recursively merges nested objects
   - Preserves sections not in current save
   - Overwrites arrays and primitives (not merged)
   - Handles null/empty formData gracefully

3. **AutoSaveProposalDto** added in `apps/src/modules/proposals/dto/proposal.dto.ts`
   - `formData`: Partial form data to save
   - `expectedUpdatedAt`: Optional optimistic locking timestamp

4. **Audit Action** `PROPOSAL_AUTO_SAVE` added to `AuditAction` enum

5. **Unit Tests**: 10 new tests for auto-save functionality
   - Deep merge correctness
   - DRAFT state validation
   - Optimistic locking (CONFLICT error)
   - Audit event logging
   - Preservation of non-saved sections

#### Frontend Implementation (Complete)

1. **Proposals API Client** created at `web-apps/src/lib/api/proposals.ts`
   - Full CRUD operations for proposals
   - `autoSave()` method for partial form data updates
   - TypeScript types matching backend DTOs

2. **useAutoSave Hook** created at `web-apps/src/hooks/useAutoSave.ts`
   - 2-second debounce (configurable)
   - Queue-based saves (new changes cancel pending saves)
   - Exponential backoff retry (1s, 2s, 4s delays, max 3 attempts)
   - No retry on CONFLICT errors (optimistic locking)
   - Cleanup on unmount
   - State: idle, saving, saved, error
   - Callbacks: `onRetryAttempt`, `onAutoSaveSuccess`, `onAutoSaveError`

3. **SaveIndicator Component** created at `web-apps/src/components/forms/SaveIndicator.tsx`
   - Vietnamese labels: "Đang lưu...", "Đã lưu vào HH:mm:ss", "Lưu thất bại..."
   - Icons: Loader2 (spinning), CheckCircle, AlertCircle from lucide-react

4. **Unit Tests**: 9 tests for hook utilities and deep merge logic

### File List

**Backend Files Created/Modified:**
- `apps/src/modules/audit/audit-action.enum.ts` - Added PROPOSAL_AUTO_SAVE
- `apps/src/modules/proposals/dto/proposal.dto.ts` - Added AutoSaveProposalDto
- `apps/src/modules/proposals/dto/index.ts` - Exported AutoSaveProposalDto
- `apps/src/modules/proposals/proposals.service.ts` - Added autoSave() method and deepMerge()
- `apps/src/modules/proposals/proposals.controller.ts` - Added PATCH /:id/auto-save endpoint
- `apps/src/modules/proposals/proposals.service.spec.ts` - Added 10 auto-save tests

**Frontend Files Created:**
- `web-apps/src/lib/api/proposals.ts` - Proposals API client with autoSave()
- `web-apps/src/hooks/useAutoSave.ts` - useAutoSave hook with debounce, retry, cleanup
- `web-apps/src/hooks/useAutoSave.spec.ts` - Hook unit tests
- `web-apps/src/components/forms/SaveIndicator.tsx` - Save status indicator
- `web-apps/src/components/forms/index.ts` - Export SaveIndicator
- `web-apps/src/app/proposals/[id]/edit/page.tsx` - Proposal edit page with auto-save integration
- `web-apps/src/integration/auto-save.integration.spec.ts` - Integration tests for auto-save flow
- `web-apps/src/e2e/auto-save.e2e.spec.ts` - E2E tests for browser close/reopen

**Config Files Modified:**
- `qlnckh/vitest.config.ts` - Added `.spec.ts` include for web-apps
- `web-apps/src/shared/types/permissions.ts` - Added PROPOSAL_CREATE, PROPOSAL_EDIT permissions
- `web-apps/src/app/app.tsx` - Added `/proposals/:id/edit` route

### Review Follow-ups (AI Code Review - 2026-01-06)

**Fixed Issues:**
- [x] [AI-Review][HIGH] AC5 Data Persistence - Changed `cancelSave()` to `forceSave()` on unmount (useAutoSave.ts:224)
- [x] [AI-Review][HIGH] Task 5 Integration - Created ProposalForm page component and integrated useAutoSave hook (app/proposals/[id]/edit/page.tsx)
- [x] [AI-Review][MEDIUM] Misleading optimistic locking comment - Updated to clarify API layer handling (useAutoSave.ts:91-95)
- [x] [AI-Review][MEDIUM] Brittle error detection - Added `response.status === 409` check alongside string matching (useAutoSave.ts:114-131)
- [x] [AI-Review][MEDIUM] Subtask 6.3 - Created integration tests for auto-save flow (integration/auto-save.integration.spec.ts)
- [x] [AI-Review][MEDIUM] Subtask 6.4 - Created E2E test for auto-save with browser close/reopen (e2e/auto-save.e2e.spec.ts)
- [x] [AI-Review][MEDIUM] Array replacement behavior - Documented in deepMerge() JSDoc (proposals.service.ts:498-510)
- [x] [AI-Review][LOW] Incomplete TypeScript type - Added `owner` and `faculty` to mapToDtoWithTemplate parameter (proposals.service.ts:678-754)

**Remaining Action Items:**
- [ ] [AI-Review][LOW] Git commit needed - All new files should be committed to version control

**Code Quality Improvements Applied:**
1. Added `UserRole` import to proposals.service.ts for complete type safety
2. Updated `mapToDtoWithTemplate()` to properly map `owner` and `faculty` objects
3. Enhanced error type definition to include `response.status` property
4. Improved comments to accurately reflect implementation behavior
