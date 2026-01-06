# Story 5.2: Council Assignment

Status: done

## Story

As a PKHCN,
I want gán hội đồng trường đánh giá,
So that hồ sơ được chuyển sang hội đồng.

## Acceptance Criteria

1. **AC1: Council Assignment Dialog**
   - Given User has role = PHONG_KHCN
   - When User clicks "Phân bổ hội đồng" on proposal
   - Then UI displays Council Assignment dialog with:
     - Select council dropdown (list of available councils)
     - Option to "Tạo hội đồng mới"
     - Secretary assignment (required)
     - Members list (optional)

2. **AC2: Assign Council Action**
   - Given User has selected council + secretary
   - When User clicks "Xác nhận" (with idempotency key)
   - Then proposal.state transitions SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW
   - And proposal.holder_unit = council_id
   - And proposal.holder_user = council_secretary_id
   - And workflow_logs entry records action ASSIGN_COUNCIL

3. **AC3: Secretary Notification**
   - Given Secretary is assigned
   - When assignment completes
   - Then Secretary receives notification (mock in MVP)

## Tasks / Subtasks

- [x] Task 1: Backend - Council Model & Query (AC: #1)
  - [x] Create Council model (id, name, type, secretary_id, members)
  - [x] Create CouncilMember model (council_id, user_id, role)
  - [x] Add query to list available councils for PKHCN
  - [x] Add query to get council members for dropdown

- [x] Task 2: Backend - Assign Council Endpoint (AC: #2)
  - [x] POST /council/:proposalId/assign-council endpoint (created in CouncilController)
  - [x] Validate PHONG_KHCN role
  - [x] Validate proposal is in SCHOOL_SELECTION_REVIEW state
  - [x] Transition state to OUTLINE_COUNCIL_REVIEW
  - [x] Set holder_unit = council_id, holder_user = secretary_id
  - [x] Create workflow_log with ASSIGN_COUNCIL action
  - [x] Handle idempotency for duplicate submissions

- [x] Task 3: Frontend - Council Assignment Dialog (AC: #1)
  - [x] Create CouncilAssignmentDialog component
  - [x] Add council selection dropdown
  - [x] Add "Tạo hội đồng mới" button (placeholder for future)
  - [x] Add secretary selection dropdown
  - [x] Add members multi-select (optional)

- [x] Task 4: Frontend - Assign Council Action (AC: #2)
  - [x] Wire up "Phân bổ hội đồng" button to open dialog
  - [x] Call assign-council API with idempotency key
  - [x] Handle success/error responses
  - [x] Refresh proposal data on success

- [x] Task 5: Frontend - Notification Mock (AC: #3)
  - [x] Show toast notification on successful assignment
  - [x] Display message: "Đã phân bổ hội đồng {council_name}"

- [x] Task 6: Unit Tests (AC: #1, #2)
  - [x] Test council assignment dialog renders correctly
  - [x] Test API call with idempotency key
  - [x] Test state transition to OUTLINE_COUNCIL_REVIEW
  - [x] Test holder assignment (council_id, secretary_id)
  - [x] Test RBAC - only PHONG_KHCN can assign council

## Dev Notes

### Architecture References

**State Machine (from architecture.md):**
- SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW via ASSIGN_COUNCIL action
- Allowed roles: PHONG_KHCN
- Holder Rules: holder_unit = council_id, holder_user = council_secretary_id

**RBAC Pattern:**
```typescript
@RequirePermissions({
  role: 'PHONG_KHCN',
  state: 'SCHOOL_SELECTION_REVIEW',
  action: 'ASSIGN_COUNCIL'
})
```

### Epic 5 Context

**Epic 5: School Ops + Council Review**
- FRs covered: FR22, FR23, FR24, FR25, FR26, FR27
- Story 5.1: School Selection Queue (completed) - PKHCN sees proposals
- **Story 5.2: Council Assignment (THIS STORY)** - PKHCN assigns council
- Story 5.3: Evaluation Form - Secretary fills evaluation draft

### Key Patterns for Epic 5

**1. Return Target Pattern:**
- For return actions, store return_target_state in workflow_logs
- return_target_holder_unit: holder for return state

**2. Promise Caching (Idempotency):**
- Client generates UUID v4 idempotency key
- Server checks cache before processing
- Prevents double-submit on race conditions

**3. localStorage Cleanup:**
- Namespace keys: `qlnckh:{feature}:{key}`
- Cleanup on component unmount

**4. Vietnamese Localization:**
- All UI text in Vietnamese
- Technical terms remain English

### Data Model

**Council Model (to be created):**
```typescript
model Council {
  id           String   @id @default(uuid())
  name         String   // "Hội đồng khoa CNTT #1"
  type         CouncilType // OUTLINE, ACCEPTANCE, etc.
  secretaryId  String?  @map("secretary_id")
  secretary    User?    @relation("CouncilSecretary", fields: [secretaryId])
  members      CouncilMember[]
  proposals    Proposal[]
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("councils")
}

model CouncilMember {
  id         String   @id @default(uuid())
  councilId  String   @map("council_id")
  council    Council  @relation(fields: [councilId], references: [id])
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id])
  role       String   // CHAIR, SECRETARY, MEMBER
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([councilId, userId])
  @@map("council_members")
}
```

**API Request/Response:**
```typescript
POST /workflow/:proposalId/assign-council
Headers: X-Idempotency-Key: uuid

Request:
{
  "councilId": "council-uuid",
  "secretaryId": "secretary-uuid",
  "memberIds": ["member-1", "member-2"] // optional
}

Response 200:
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "previousState": "SCHOOL_SELECTION_REVIEW",
    "currentState": "OUTLINE_COUNCIL_REVIEW",
    "holderUnit": "council-uuid",
    "holderUser": "secretary-uuid"
  }
}
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 5.2 implemented via dev-story workflow. Status: done

### File List

**Created:**
- `qlnckh/apps/src/modules/council/` - New council module (service, controller, module, dto)
  - `council.service.ts` - Council management service
  - `council.controller.ts` - Council endpoints including assign-council
  - `council.module.ts` - Council module definition
  - `dto/council.dto.ts` - Council DTOs
- `qlnckh/web-apps/src/components/workflow/CouncilAssignmentDialog.tsx` - Assignment dialog
- `qlnckh/web-apps/src/components/workflow/CouncilAssignmentDialog.spec.tsx` - Tests

**Modified:**
- `qlnckh/prisma/schema.prisma` - Added CouncilType, CouncilMemberRole enums, Council and CouncilMember models, updated User and Proposal models
- `qlnckh/apps/src/app/app.module.ts` - Imported CouncilModule
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Added ASSIGN_COUNCIL action handling with councilId/councilSecretaryId context
- `qlnckh/web-apps/src/lib/api/workflow.ts` - Added assignCouncil function and types
- `qlnckh/web-apps/src/components/workflow/SchoolSelectionActions.tsx` - Integrated CouncilAssignmentDialog and real API call
- `qlnckh/web-apps/src/components/workflow/index.ts` - Exported CouncilAssignmentDialog

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
- 2026-01-07: Story implemented via dev-story workflow. Status: done
  - Created Council module (service, controller, module, dto)
  - Added Council and CouncilMember models to Prisma schema
  - Updated workflow.service.ts for ASSIGN_COUNCIL action
  - Created CouncilAssignmentDialog component with tests
  - Added assignCouncil API client function
  - Code review completed: 4 HIGH issues fixed (mock API replaced, story file updated, API client added, file list corrected)

## References

- [epics.md Story 5.2](../../planning-artifacts/epics.md#L1578-L1606) - Full requirements
- [architecture.md](../../planning-artifacts/architecture.md) - State machine and RBAC patterns
- [project-context.md](../../project-context.md) - Implementation rules and patterns
- [Story 5.1](./5-1-school-selection-queue.md) - Previous story
