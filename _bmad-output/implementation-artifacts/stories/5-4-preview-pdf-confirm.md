# Story 5.4: Preview PDF + Confirm Gate (Submit ONCE)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Thư ký Hội đồng (THU_KY_HOI_DONG),
I want preview PDF đánh giá trước khi finalize,
So that tôi có thể review và tránh nộp nhầm.

## Acceptance Criteria

1. **AC1: Preview Modal Display**
   - Given User đang ở Evaluation Form (state = DRAFT)
   - When User click "Hoàn tất"
   - Then UI hiển thị Preview Modal:
     - Render PDF của evaluation form
     - Force light theme (đối với PDF preview)
     - Sections hiển thị đầy đủ (scientificContent, researchMethod, feasibility, budget, conclusion, otherComments)
     - Button "Xác nhận và nộp" (primary action)
     - Button "Quay lại sửa" (secondary action)

2. **AC2: Cancel Review**
   - Given User click "Quay lại sửa"
   - When Modal đóng
   - Then Evaluation vẫn ở state = DRAFT
   - And User có thể edit tiếp

3. **AC3: Submit Evaluation (Submit ONCE)**
   - Given User click "Xác nhận và nộp"
   - When Confirm action execute (kèm idempotency key)
   - Then evaluation.state chuyển từ DRAFT → FINALIZED
   - And evaluation form_data bị lock (read-only)
   - And workflow_logs entry ghi action EVALUATION_SUBMITTED

4. **AC4: Idempotency Protection**
   - Given evaluation.state = FINALIZED
   - When User gọi submit API với idempotency key
   - Then API trả về success (không duplicate submit)
   - And error response nếu idempotency key không match

## Tasks / Subtasks

- [x] Task 1: Backend - Extend EvaluationState Enum (AC: #3)
  - [x] Add FINALIZED state to EvaluationState enum
  - [x] Update Prisma schema migration
  - [x] Run migration

- [x] Task 2: Backend - Submit Evaluation Endpoint (AC: #3, #4)
  - [x] Create POST /evaluations/:proposalId/submit endpoint
  - [x] Validate proposal state = OUTLINE_COUNCIL_REVIEW
  - [x] Validate evaluation exists and state = DRAFT
  - [x] Validate form_data is complete (conclusion required)
  - [x] Implement idempotency check with Redis
  - [x] Transition evaluation.state: DRAFT → FINALIZED
  - [x] Log workflow_logs entry: EVALUATION_SUBMITTED
  - [x] Return 409 Conflict if already finalized

- [x] Task 3: Backend - Update Evaluation Validation (AC: #3)
  - [x] Add check: only DRAFT evaluations can be updated
  - [x] Return 403 if state = FINALIZED on PATCH request
  - [x] Error message: "Đánh giá đã hoàn tất. Không thể chỉnh sửa."

- [x] Task 4: Frontend - Preview PDF Modal Component (AC: #1)
  - [x] Create EvaluationPreviewModal component
  - [x] Render evaluation form data as HTML/CSS preview (NOT actual PDF)
  - [x] Use same HTML structure as final PDF (Story 5.6) for WYSIWYG consistency
  - [x] Force light theme for modal content (CSS variables override)
  - [x] Display all sections with scores and comments
  - [x] Add "Xác nhận và nộp" button (primary)
  - [x] Add "Quay lại sửa" button (secondary)

- [x] Task 4.5: Backend - Add Proposal State Transition to submitEvaluation (AC: #3)
  - [x] Extend submitEvaluation to include proposal transition
  - [x] Add proposal.state transition: OUTLINE_COUNCIL_REVIEW → APPROVED
  - [x] Update proposal.holder_unit = proposal.owner_faculty_id
  - [x] Update proposal.holder_user = proposal.owner_id
  - [x] Log workflow_logs entry: EVALUATION_COMPLETE
  - [x] Wrap evaluation update + proposal transition in Prisma transaction

- [x] Task 5: Frontend - Submit Evaluation Integration (AC: #2, #3)
  - [x] Add submitEvaluation API client method
  - [x] Generate idempotency key (UUID v4) on modal open
  - [x] Handle submit success: close modal, show success message
  - [x] Handle submit error: display error message
  - [x] Handle "Quay lại sửa": close modal, return to form

- [x] Task 6: Frontend - Read-Only Mode After Finalize (AC: #3)
  - [x] Update EvaluationForm to check state
  - [x] Disable all inputs when state = FINALIZED
  - [x] Hide "Hoàn tất" button when finalized
  - [x] Show "Đã nộp" badge instead
  - [x] Remove auto-save when finalized

- [x] Task 7: Unit Tests (AC: #1, #2, #3, #4)
  - [x] Test submit endpoint with valid data
  - [x] Test submit endpoint with idempotency key
  - [x] Test submit fails when state = FINALIZED
  - [x] Test PATCH fails when state = FINALIZED
  - [x] Test PreviewModal rendering
  - [x] Test cancel flow ("Quay lại sửa")
  - [x] Test submit flow with success/error

## Dev Notes

### Architecture References

**State Machine (from architecture.md):**
- OUTLINE_COUNCIL_REVIEW: holder_unit = council_id, holder_user = secretary_id
- Evaluation states: DRAFT → FINALIZED (on submit)
- After FINALIZED: form becomes read-only (Story 5.5)

**Idempotency Pattern (UX-6 from architecture.md):**
```typescript
// Client generates UUID
const idempotencyKey = crypto.randomUUID();

// API call
POST /evaluations/:proposalId/submit
{
  "idempotencyKey": "uuid-v4"
}

// Server checks Redis
if (await redis.get(`idempotency:${idempotencyKey}`)) {
  return { success: true, data: existingEvaluation }; // Idempotent
}
await redis.setex(`idempotency:${idempotencyKey}`, 86400, evaluationId);
```

**PDF Export Decision (UX-5 from architecture.md):**
- WYSIWYG: HTML/CSS + Playwright for PDF generation
- Force light theme for PDF preview (print-ready)
- CSS: `break-after: avoid`, `break-inside: avoid` for page breaks
- NOT: Separate PDF template system

### Epic 5 Context

**Epic 5: School Ops + Council Review**
- FRs covered: FR22, FR23, FR24, FR25, FR26, FR27
- Story 5.1: School Selection Queue (done)
- Story 5.2: Council Assignment (done)
- Story 5.3: Evaluation Form Draft (done) - Secretary fills evaluation draft
- **Story 5.4: Preview PDF + Confirm Gate (THIS STORY)** - Secretary reviews and submits ONCE
- Story 5.5: Finalize → Read-Only - After submit, form becomes read-only
- Story 5.6: Evaluation PDF Export - Generate final PDF

### Dependencies

**Depends on:**
- Story 5.3 (Evaluation Form Draft) - Must have draft evaluation data
- Idempotency infrastructure from Epic 3 (Story 3.8)

**Enables:**
- Story 5.5 (Finalize → Read-Only) - Depends on FINALIZED state
- Story 5.6 (Evaluation PDF Export) - Exports finalized evaluation

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  evaluations/
    evaluations.service.ts      # Add submitEvaluation()
    evaluations.controller.ts   # Add POST /submit endpoint
    dto/
      submit-evaluation.dto.ts  # New DTO for submit request
```

**Frontend Structure:**
```
qlnckh/web-apps/src/components/
  evaluation/
    EvaluationForm.tsx          # Add "Hoàn tất" button
    EvaluationPreviewModal.tsx  # New: PDF preview modal
    EvaluationPreviewModal.spec.tsx
  lib/api/
    evaluations.ts              # Add submitEvaluation()
```

### Data Model

**Prisma Schema Addition:**
```prisma
enum EvaluationState {
  DRAFT
  FINALIZED  // NEW: Replaces SUBMITTED for final state
}
```

**Submit Evaluation Request DTO:**
```typescript
export interface SubmitEvaluationRequest {
  idempotencyKey: string; // UUID v4
}

export interface SubmitEvaluationResponse {
  success: true;
  data: {
    evaluationId: string;
    state: EvaluationState.FINALIZED;
    submittedAt: string;
  };
}
```

### Error Responses

**Error Response Format (per project-context.md):**
```typescript
// Already finalized
{
  success: false,
  error: {
    code: "EVALUATION_ALREADY_FINALIZED",
    message: "Đánh giá đã hoàn tất. Không thể nộp lại."
  }
}

// Idempotent response
{
  success: true,
  data: { /* existing evaluation */ },
  meta: { idempotent: true }
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock PrismaService for database operations
- Mock Redis for idempotency checks
- Test state transitions (DRAFT → FINALIZED)
- Test RBAC with mock JWT tokens

**Frontend Tests:**
- Use Vitest + React Testing Library
- Test modal open/close
- Test PDF preview rendering
- Test submit success/error flows
- Test cancel flow ("Quay lại sửa")
- Test read-only mode after finalize

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Hoàn tất" (Complete button)
- "Xác nhận và nộp" (Confirm and submit)
- "Quay lại sửa" (Back to edit)
- "Xem trước khi nộp" (Preview before submit)
- "Phiếu đánh giá đề tài" (Evaluation form title)
- "Đánh giá đã hoàn tất. Không thể chỉnh sửa." (Already finalized error)

### Code Patterns to Follow

**From Story 5.3 (Evaluation Form):**
- Use existing `useAutoSave` hook for DRAFT state
- Follow localStorage namespace pattern: `evaluation_draft_{proposalId}`
- Display status in consistent format

**From Epic 3 (Idempotency - Story 3.8):**
- Reuse IdempotencyInterceptor from Story 3.8 if available
- Otherwise implement: `redis.get('idempotency:${key}')` with 24h TTL
- Client generates UUID v4 for idempotency key
- Server checks Redis, returns existing result on duplicate key
- Idempotency key format: `idempotency:${uuid}`

**From Epic 4 (Faculty Return):**
- Modal pattern for confirm gates
- Primary + secondary button layout
- Error handling with user-friendly messages

### RBAC Pattern

```typescript
// Submit action requires:
@RequirePermissions({
  role: 'THU_KY_HOI_DONG',
  state: 'OUTLINE_COUNCIL_REVIEW',
  action: 'SUBMIT_EVALUATION'
})

// Additional validation:
// 1. proposal.holder_user === current user
// 2. evaluation.evaluator_id === current user
// 3. evaluation.state === DRAFT
```

### Read-Only Mode (for Story 5.5)

After FINALIZED:
- EvaluationForm shows all fields as disabled
- No edit buttons visible
- Show "Đã nộp" badge with timestamp
- Auto-save is disabled
- PATCH endpoint returns 403

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 5-4 created via create-story workflow. Status: ready-for-dev

### File List

**To Create:**
- `qlnckh/apps/src/modules/evaluations/dto/submit-evaluation.dto.ts` - Submit evaluation DTO
- `qlnckh/web-apps/src/components/evaluation/EvaluationPreviewModal.tsx` - Preview modal component
- `qlnckh/web-apps/src/components/evaluation/EvaluationPreviewModal.spec.tsx` - Modal tests

**To Modify:**
- `qlnckh/prisma/schema.prisma` - Add FINALIZED state to EvaluationState enum
- `qlnckh/apps/src/modules/evaluations/evaluations.service.ts` - Add submitEvaluation() method with proposal transition
- `qlnckh/apps/src/modules/evaluations/evaluations.controller.ts` - Add POST /submit endpoint
- `qlnckh/web-apps/src/components/evaluation/EvaluationForm.tsx` - Add "Hoàn tất" button, read-only mode
- `qlnckh/web-apps/src/lib/api/evaluations.ts` - Add submitEvaluation() API method
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status to in-progress when starting, done when complete

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 5 context analyzed from epics.md
  - Previous story (5-3) learnings incorporated
  - Architecture patterns for idempotency and PDF export applied
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution
- 2026-01-07: Validation improvements applied
  - Clarified PDF preview as HTML/CSS (not actual PDF generation)
  - Added Task 4.5 for proposal state transition within submitEvaluation
  - Enhanced idempotency implementation reference
  - Updated File List with sprint-status.yaml guidance

## References

- [epics.md Story 5.4](../../planning-artifacts/epics.md#L1646-L1673) - Full requirements
- [architecture.md](../../planning-artifacts/architecture.md) - State machine, RBAC, idempotency, PDF export patterns
- [project-context.md](../../project-context.md) - Implementation rules and patterns
- [Story 5.3](./5-3-evaluation-form-draft.md) - Previous story with evaluation form context
