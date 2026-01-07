# Story 6.1: Start Project (APPROVED → IN_PROGRESS)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên (PROJECT_OWNER),
I want bắt đầu thực hiện đề tài sau khi được duyệt,
So that tôi có thể bắt đầu thực hiện dự án.

## Acceptance Criteria

1. **AC1: Start Button Visibility**
   - Given Proposal state = APPROVED
   - When Owner (PROJECT_OWNER) mở proposal detail
   - Then UI hiển thị button "Bắt đầu thực hiện" (primary action)
   - And button disabled khi state ≠ APPROVED
   - And chỉ owner của proposal mới thấy button này

2. **AC2: State Transition (APPROVED → IN_PROGRESS)**
   - Given Proposal state = APPROVED
   - When Owner click "Bắt đầu thực hiện" (kèm idempotency key)
   - Then proposal.state chuyển từ APPROVED → IN_PROGRESS
   - And proposal.actualStartDate = now()
   - And proposal.holderUnit giữ nguyên = owner_faculty_id
   - And proposal.holderUser giữ nguyên = owner_id
   - And workflow_logs entry ghi action START_PROJECT

3. **AC3: Idempotency**
   - Given User click "Bắt đầu thực hiện" nhiều lần
   - When các request có cùng idempotency key
   - Then chỉ thực hiện transition một lần
   - And các request sau đó trả về kết quả đã cached (200 OK)

4. **AC4: Permission Check**
   - Given User không phải owner của proposal
   - When User cố gọi start project API
   - Then API trả về 403 Forbidden
   - And error message: "Bạn không có quyền thực hiện hành động này"

5. **AC5: UI Update After Start**
   - Given Start project thành công
   - When transition hoàn tất
   - Then UI update state badge hiển thị "Đang thực hiện"
   - And "Bắt đầu thực hiện" button không còn hiển thị
   - And Timeline hiển thị entry mới: "Đã bắt đầu thực hiện"

## Tasks / Subtasks

- [ ] Task 1: Backend - Start Project Service (AC: #2, #3, #4)
  - [ ] Add startProject() method to ProposalsService
  - [ ] Validate proposal.state = APPROVED
  - [ ] Validate user.id = proposal.ownerId (PROJECT_OWNER check)
  - [ ] Use @UseInterceptors(IdempotencyInterceptor) on controller
  - [ ] Wrap transition in Prisma transaction
  - [ ] Update proposal: APPROVED → IN_PROGRESS, set actualStartDate
  - [ ] Create workflow_logs entry with START_PROJECT action
  - [ ] Return updated proposal

- [ ] Task 2: Backend - Start Project Endpoint (AC: #1, #4, #5)
  - [ ] Create POST /proposals/:id/start endpoint
  - [ ] Add @UseGuards(JwtAuthGuard) for authentication
  - [ ] Add @UseGuards(ProjectOwnerGuard) for authorization
  - [ ] Apply IdempotencyInterceptor at controller level
  - [ ] Handle idempotency key from X-Idempotency-Key header
  - [ ] Return 403 if user is not owner
  - [ ] Return 400 if state ≠ APPROVED
  - [ ] Return 200 with updated proposal on success

- [ ] Task 3: Frontend - Start Project Button (AC: #1, #5)
  - [ ] Add StartProjectButton component to ProposalDetail
  - [ ] Show "Bắt đầu thực hiện" text with primary style
  - [ ] Disable when proposal.state ≠ APPROVED
  - [ ] Disable when current user is not owner
  - [ ] Show loading state during API call
  - [ ] Invalidate queries after success to refresh UI
  - [ ] Handle errors gracefully

- [ ] Task 4: Frontend - Timeline Update (AC: #5)
  - [ ] Timeline component refetches proposal data after action
  - [ ] Add START_PROJECT timeline entry display
  - [ ] Show: "Đã bắt đầu thực hiện" + timestamp + actor name
  - [ ] Use Play (triangle) icon for positive action

- [ ] Task 5: Database Schema Update (AC: #2)
  - [ ] Add actualStartDate DateTime? field to Proposal model
  - [ ] Create migration for new field
  - [ ] Update Prisma client generation

- [ ] Task 6: Unit Tests (AC: #1, #2, #3, #4, #5)
  - [ ] Test startProject() service method
  - [ ] Test state transition only from APPROVED
  - [ ] Test permission check (only owner)
  - [ ] Test idempotency (duplicate requests)
  - [ ] Test workflow_log entry creation
  - [ ] Test actualStartDate is set

## Dev Notes

### Epic 6 Context

**Epic 6: Acceptance & Handover + Dossier Pack**
- FRs covered: FR28, FR29, FR30, FR31, FR32, FR33, FR41, FR42
- **Story 6.1: Start Project (THIS STORY)** - Transition APPROVED → IN_PROGRESS
- Story 6.2: Submit Faculty Acceptance Review
- Story 6.3: Faculty Acceptance (Vote)
- Story 6.4: School Acceptance (Vote)
- Story 6.5: Handover + Dossier Pack Checklist
- Story 6.6: ZIP Dossier Pack Export

### Dependencies

**Depends on:**
- Epic 5 completion - APPROVED state is starting point
- Story 3.8 (Idempotency Keys) - Reuse IdempotencyInterceptor pattern

**Enables:**
- Story 6.2 (Submit Faculty Acceptance Review) - Requires IN_PROGRESS state

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  proposals/
    proposals.controller.ts   # Add POST /:id/start endpoint
    proposals.service.ts      # Add startProject() method
    dto/
      start-proposal.dto.ts    # New: StartProjectDto
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    proposal/
      StartProjectButton.tsx   # New: Start button component
      ProposalDetail.tsx        # Add StartProjectButton
  lib/api/
    proposals.ts                # Add startProject() API method
```

### Epic 5 Retro Learnings to Apply

From `epic-5-retro-2026-01-07.md`:

1. **IdempotencyInterceptor Pattern (Story 5.4 fix):**
   ```typescript
   @UseInterceptors(IdempotencyInterceptor) // Reused from Epic 3
   @Controller('proposals')
   export class ProposalsController {
     @Post(':id/start')
     async startProject(@Param('id') id: string) { ... }
   }
   ```
   - Critical: Must apply interceptor at controller level or endpoint level
   - Client must send X-Idempotency-Key header with UUID v4

2. **Atomic Transaction Pattern (Story 5.4):**
   ```typescript
   return this.prisma.$transaction(async (tx) => {
     // 1. Update proposal state
     const proposal = await tx.proposal.update({...});

     // 2. Create workflow log entry
     await tx.workflowLog.create({
       action: 'START_PROJECT',
       fromState: 'APPROVED',
       toState: 'IN_PROGRESS',
       // ...
     });

     return proposal;
   });
   ```

3. **RBAC Pattern from Story 5.6:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(ProjectOwnerGuard) // Ensures user.id === proposal.ownerId
   @Post(':id/start')
   async startProject(@Param('id') id: string, @CurrentUser() user: User) {
     // Guard handles authorization, service handles business logic
   }
   ```

### Architecture Compliance

**State Machine Rules (from architecture.md):**
- APPROVED → IN_PROGRESS is valid transition (Phase A → Phase B)
- holderUnit and holderUser remain with owner (PI keeps control)
- SLA tracking paused during IN_PROGRESS (not active review state)

**WorkflowAction Enum:**
- START_PROJECT action added in Epic 6
- Must be logged to workflow_logs for audit trail

**API Response Format:**
```typescript
// Success
{ success: true, data: { proposal: {...} }, meta: {...} }

// Error
{ success: false, error: { code: "FORBIDDEN", message: "Bạn không có quyền thực hiện hành động này" } }
```

### Data Model

**Prisma Schema Addition:**
```prisma
model Proposal {
  // ... existing fields ...
  actualStartDate DateTime? @map("actual_start_date") // NEW: Set when starting project
}
```

**Service Method Signature:**
```typescript
/**
 * Start project execution
 * @param proposalId - Proposal UUID
 * @param userId - User ID (owner)
 * @returns Updated proposal
 */
async startProject(proposalId: string, userId: string): Promise<Proposal>
```

**Workflow Log Entry:**
```typescript
await tx.workflowLog.create({
  proposalId,
  action: 'START_PROJECT',
  fromState: 'APPROVED',
  toState: 'IN_PROGRESS',
  actorId: userId,
  actorName: user.displayName,
  timestamp: new Date(),
});
```

### RBAC Authorization

**Permission Check:**
```typescript
// PROJECT_OWNER is contextual: user.id === proposal.ownerId
// Only the owner of the proposal can start it

// ProjectOwnerGuard implementation:
@Injectable()
export class ProjectOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const proposalId = request.params.id;
    const userId = request.user?.id;

    if (!userId) return false;

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { ownerId: true },
    });

    if (!proposal) return false;

    return proposal.ownerId === userId;
  }
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock Prisma transaction
- Test idempotency with duplicate requests
- Test permission check (non-owner cannot start)
- Test state validation (only APPROVED → IN_PROGRESS)
- Test workflow log creation

**Frontend Tests:**
- Test button visibility based on state
- Test button visibility based on ownership
- Test loading state during API call
- Test UI refresh after success
- Test error handling (403, 400)

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Bắt đầu thực hiện" (Start button)
- "Đang thực hiện" (IN_PROGRESS state display)
- "Đã bắt đầu thực hiện" (Timeline entry)
- "Bạn không có quyền thực hiện hành động này" (403 error)
- "Đề tài chưa ở trạng thái được duyệt" (400 error when not APPROVED)

### Code Patterns to Follow

**From Story 3.8 (Idempotency):**
```typescript
// Client-side: Generate idempotency key
const idempotencyKey = crypto.randomUUID();

// API call with header
await proposalsApi.startProject(proposalId, {
  headers: { 'X-Idempotency-Key': idempotencyKey }
});
```

**From Story 5.5 (Finalize → Read-Only):**
- State change happens atomically with workflow log
- Use Prisma transaction for consistency
- Return complete updated proposal to client

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 6-1 created via create-story workflow. Status: ready-for-dev
- Epic 5 retrospective learnings applied
- IdempotencyInterceptor pattern included
- Atomic transaction pattern specified
- RBAC with ProjectOwnerGuard defined
- Database schema change for actualStartDate documented

### File List

**To Create:**
- `qlnckh/apps/src/modules/proposals/dto/start-proposal.dto.ts` - DTO for start action
- `qlnckh/web-apps/src/components/proposal/StartProjectButton.tsx` - Start button component

**To Modify:**
- `qlnckh/apps/src/modules/proposals/proposals.controller.ts` - Add POST /:id/start endpoint
- `qlnckh/apps/src/modules/proposals/proposals.service.ts` - Add startProject() method
- `qlnckh/apps/src/modules/proposals/guards/project-owner.guard.ts` - Create owner guard (if not exists)
- `qlnckh/prisma/schema.prisma` - Add actualStartDate field to Proposal model
- `qlnckh/web-apps/src/components/proposal/ProposalDetail.tsx` - Add StartProjectButton
- `qlnckh/web-apps/src/lib/api/proposals.ts` - Add startProject() API method
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 5 retrospective learnings incorporated
  - IdempotencyInterceptor pattern from Story 3.8/5.4 applied
  - Atomic transaction pattern from Story 5.4 specified
  - RBAC pattern with ProjectOwnerGuard defined
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 6.1](../../planning-artifacts/epics.md#L1733-L1755) - Full requirements
- [epic-5-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-5-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 3.8](../5-6-evaluation-pdf-export.md#L38) - Idempotency pattern reference
- [Story 5.4](../5-4-preview-pdf-confirm.md) - Atomic transaction pattern reference
