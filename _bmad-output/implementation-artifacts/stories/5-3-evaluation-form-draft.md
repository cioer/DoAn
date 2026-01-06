# Story 5.3: Evaluation Form Draft

Status: done

## Story

As a Thư ký Hội đồng (THU_KY_HOI_DONG),
I want điền form đánh giá đề tài,
So that tôi có thể đánh giá và kết luận.

## Acceptance Criteria

1. **AC1: Evaluation Form Display**
   - Given User có role = THU_KY_HOI_DONG
   - When User mở proposal với state = OUTLINE_COUNCIL_REVIEW
   - And proposal.holder_user = current user id
   - Then UI hiển thị Evaluation Form với sections:
     - Đánh giá nội dung khoa học
     - Đánh giá phương pháp nghiên cứu
     - Đánh giá tính khả thi
     - Đánh giá kinh phí
     - Kết luận (Đạt/Không đạt)
     - Ý kiến khác (optional)

2. **AC2: Auto-save Functionality**
   - Given User đang điền evaluation form
   - When user thay đổi field
   - Then auto-save sau 2 giây debounce
   - And UI hiển thị "Đã lưu vào HH:mm:ss"

3. **AC3: Database Persistence**
   - Given Evaluation form đã được create
   - When inspect database
   - Then table evaluations có record:
     - proposal_id (FK)
     - evaluator_id (current user)
     - state = DRAFT
     - form_data (JSON)
     - created_at, updated_at

## Tasks / Subtasks

- [x] Task 1: Backend - Evaluation Model (AC: #1, #3)
  - [x] Create Evaluation model in Prisma schema
  - [x] Create EvaluationState enum (DRAFT, SUBMITTED)
  - [x] Add relation between Proposal and Evaluation
  - [x] Add relation between User (evaluator) and Evaluation

- [x] Task 2: Backend - Evaluation CRUD Endpoints (AC: #1, #3)
  - [x] GET /evaluations/:proposalId - Get or create draft evaluation
  - [x] POST /evaluations/:proposalId - Create evaluation
  - [x] PATCH /evaluations/:proposalId - Update evaluation (draft only)
  - [x] Validate THU_KY_HOI_DONG role
  - [x] Validate proposal state = OUTLINE_COUNCIL_REVIEW
  - [x] Validate holder_user = current user

- [x] Task 3: Frontend - Evaluation Form Component (AC: #1)
  - [x] Create EvaluationForm component with all sections
  - [x] Add form fields for each evaluation section
  - [x] Add validation for required fields
  - [x] Style with Tailwind to match existing forms

- [x] Task 4: Frontend - Auto-save Integration (AC: #2)
  - [x] Integrate with existing auto-save hook (useAutoSave from Epic 2)
  - [x] Configure 2-second debounce
  - [x] Display "Đã lưu vào HH:mm:ss" status message
  - [x] Handle save errors gracefully

- [x] Task 5: Frontend - Evaluation Form Layout (AC: #1)
  - [x] Add EvaluationForm to proposal detail page
  - [x] Conditionally show when state = OUTLINE_COUNCIL_REVIEW
  - [x] Conditionally show when holder_user = current user
  - [x] Add "Tiếp tục" button for navigation to next step (Story 5.4)

- [x] Task 6: Unit Tests (AC: #1, #2, #3)
  - [x] Test evaluation model creation and relationships
  - [x] Test GET /evaluations/:proposalId endpoint
  - [x] Test PATCH /evaluations/:proposalId endpoint
  - [x] Test auto-save debounce timing
  - [x] Test RBAC - only secretary can access

## Dev Notes

### Architecture References

**State Machine (from architecture.md):**
- OUTLINE_COUNCIL_REVIEW: holder_unit = council_id, holder_user = secretary_id
- Evaluation form is accessible by assigned secretary
- Next: Story 5.4 → Preview PDF + Confirm → SUBMITTED state

**RBAC Pattern:**
```typescript
@RequirePermissions({
  role: 'THU_KY_HOI_DONG',
  state: 'OUTLINE_COUNCIL_REVIEW',
  action: 'EVALUATE_DRAFT'
})
```

**Auto-save Pattern (from Epic 2):**
- Use existing `useAutoSave` hook from `/hooks/useAutoSave.ts`
- 2-second debounce configured in hook
- localStorage namespace: `evaluation_draft_{proposalId}`
- Status display: "Đã lưu vào HH:mm:ss"

### Epic 5 Context

**Epic 5: School Ops + Council Review**
- FRs covered: FR22, FR23, FR24, FR25, FR26, FR27
- Story 5.1: School Selection Queue (done) - PKHCN sees proposals
- Story 5.2: Council Assignment (done) - PKHCN assigns council, sets holder_user
- **Story 5.3: Evaluation Form (THIS STORY)** - Secretary fills evaluation draft
- Story 5.4: Preview PDF + Confirm Gate - Secretary reviews and submits ONCE
- Story 5.5: Finalize → Read-Only - After submit, form becomes read-only
- Story 5.6: Evaluation PDF Export - Generate final PDF

### Dependencies

**Depends on:**
- Story 5.2 (Council Assignment) - Must have council_id and holder_user set
- Epic 2 (Auto-save) - Reuse existing auto-save infrastructure

**Enables:**
- Story 5.4 (Preview PDF + Confirm) - Needs draft evaluation data for preview

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  evaluations/
    evaluations.service.ts
    evaluations.controller.ts
    evaluations.module.ts
    dto/
      evaluation.dto.ts
```

**Frontend Structure:**
```
qlnckh/web-apps/src/components/
  evaluation/
    EvaluationForm.tsx
    EvaluationForm.spec.tsx
  lib/api/
    evaluations.ts
```

### Data Model

**Prisma Schema Addition:**
```prisma
enum EvaluationState {
  DRAFT
  SUBMITTED
}

model Evaluation {
  id          String         @id @default(uuid())
  proposalId  String         @map("proposal_id")
  proposal    Proposal       @relation(fields: [proposalId], references: [id])
  evaluatorId String         @map("evaluator_id")
  evaluator   User           @relation("EvaluationEvaluator", fields: [evaluatorId], references: [id])
  state       EvaluationState @default(DRAFT)
  formData    Json           @map("form_data")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  @@unique([proposalId, evaluatorId])
  @@index([proposalId])
  @@index([evaluatorId])
  @@index([state])
  @@map("evaluations")
}
```

**Form Data Structure (JSON):**
```typescript
interface EvaluationFormData {
  scientificContent: {
    score: number; // 1-5 scale
    comments: string;
  };
  researchMethod: {
    score: number;
    comments: string;
  };
  feasibility: {
    score: number;
    comments: string;
  };
  budget: {
    score: number;
    comments: string;
  };
  conclusion: "DAT" | "KHONG_DAT";
  otherComments?: string;
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock PrismaService for database operations
- Test RBAC with mock JWT tokens
- Test state transitions (DRAFT → SUBMITTED in future story)

**Frontend Tests:**
- Use Vitest + React Testing Library
- Mock API responses for evaluation endpoints
- Test auto-save debounce with fake timers
- Test form validation and submission

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Đánh giá nội dung khoa học"
- "Đánh giá phương pháp nghiên cứu"
- "Đánh giá tính khả thi"
- "Đánh giá kinh phí"
- "Kết luận" (Đạt/Không đạt)
- "Ý kiến khác" (optional)
- "Đã lưu vào HH:mm:ss"

### Code Patterns to Follow

**From Story 5.2 (Council Assignment):**
- Use `@RequireRoles` decorator for role checks
- Use IdempotencyInterceptor for state-changing actions (future Story 5.5)
- Return consistent error response format: `{ success: false, error: { code, message } }`
- Frontend: Use existing error handling patterns from SchoolSelectionActions

**From Epic 2 (Auto-save):**
- Reuse `useAutoSave` hook without modification
- Follow localStorage namespace pattern: `evaluation_draft_{proposalId}`
- Display status in consistent format

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 5.3 created via create-story workflow. Status: ready-for-dev

### File List

**Created:**
- `qlnckh/apps/src/modules/evaluations/evaluations.service.ts` - Evaluation CRUD service
- `qlnckh/apps/src/modules/evaluations/evaluations.controller.ts` - Evaluation endpoints
- `qlnckh/apps/src/modules/evaluations/evaluations.module.ts` - Evaluation module
- `qlnckh/apps/src/modules/evaluations/dto/evaluation.dto.ts` - Evaluation DTOs
- `qlnckh/apps/src/modules/evaluations/dto/index.ts` - DTO barrel export
- `qlnckh/web-apps/src/components/evaluation/EvaluationForm.tsx` - Evaluation form component
- `qlnckh/web-apps/src/components/evaluation/EvaluationForm.spec.tsx` - Component tests
- `qlnckh/web-apps/src/components/evaluation/index.ts` - Component barrel export
- `qlnckh/web-apps/src/lib/api/evaluations.ts` - Evaluation API client
- `qlnckh/web-apps/src/app/proposals/[id]/page.tsx` - Proposal detail page with EvaluationForm

**Modified:**
- `qlnckh/prisma/schema.prisma` - Added EvaluationState enum and Evaluation model
- `qlnckh/apps/src/app/app.module.ts` - Imported EvaluationModule
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 5 context analyzed from epics.md
  - Previous story (5-2) learnings incorporated
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution
- 2026-01-07: Code review fixes applied
  - Removed unused AuditService dependency
  - Added score validation (1-5 range) to updateEvaluation
  - Fixed default score from 0 to 3 (middle value)
  - Updated story File List to include sprint-status.yaml

## References

- [epics.md Story 5.3](../../planning-artifacts/epics.md#L1609-L1642) - Full requirements
- [architecture.md](../../planning-artifacts/architecture.md) - State machine and RBAC patterns
- [project-context.md](../../project-context.md) - Implementation rules and patterns
- [Story 5.2](./5-2-council-assignment.md) - Previous story with council assignment context
