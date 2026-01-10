# Story 9.1: Cancel/Withdraw Actions (Hủy/Rút đề tài)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 8 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Giảng viên (PROJECT_OWNER),
I want hủy hoặc rút hồ sơ đề tài,
So that tôi có thể stop proposal khi cần thiết (ví dụ: không còn điều kiện thực hiện, thay đổi hướng nghiên cứu).

## Acceptance Criteria

1. **AC1: Cancel Action (DRAFT state only)**
   - Given Proposal đang ở state = DRAFT
   - When Owner (PROJECT_OWNER) click "Hủy bỏ"
   - Then UI hiển thị confirm dialog: "Bạn có chắc muốn hủy đề tài này? Hành động này không thể hoàn tác."
   - And sau khi confirm:
     - proposal.state chuyển từ DRAFT → CANCELLED
     - proposal.holder_unit = owner_faculty_id
     - proposal.holder_user = owner_id
     - proposal.cancelled_at = now()
     - workflow_logs entry được tạo với action = CANCEL

2. **AC2: Withdraw Action (before APPROVED state)**
   - Given Proposal đang ở state != DRAFT và < APPROVED (ví dụ: FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, CHANGES_REQUESTED)
   - When Owner click "Rút hồ sơ"
   - Then UI hiển thị confirm dialog với warning: "Rút hồ sơ sẽ đánh dấu đề tài là ĐÃ RÚT. Bạn có muốn tiếp tục?"
   - And sau khi confirm:
     - proposal.state chuyển từ current state → WITHDRAWN
     - holder về lại owner (holder_unit = owner_faculty_id, holder_user = owner_id)
     - proposal.withdrawn_at = now()
     - workflow_logs entry được tạo với action = WITHDRAW
     - System gửi notification cho current holder (nếu có)

3. **AC3: Withdraw Not Allowed After APPROVED**
   - Given Proposal state >= APPROVED (IN_PROGRESS, PAUSED, hoặc các state nghiệm thu)
   - When Owner mở proposal detail
   - Then UI KHÔNG hiển thị button "Rút hồ sơ"
   - And nếu owner cố gắng call API trực tiếp
   - Then return 403 Forbidden với message "Đề tài đang thực hiện, không thể rút. Vui lòng liên hệ PKHCN nếu cần."

4. **AC4: RBAC Authorization**
   - Given User có role = PROJECT_OWNER VÀ proposal.owner_id = user.id
   - When User thực hiện cancel/withdraw
   - Then action được phép
   - And Given User KHÔNG phải owner của proposal
   - When User cố gắng cancel/withdraw
   - Then return 403 Forbidden

5. **AC5: Idempotency**
   - Given Owner double-click "Hủy bỏ" hoặc "Rút hồ sơ"
   - When 2 requests đến gần như cùng lúc với cùng idempotencyKey
   - Then chỉ 1 action được execute
   - And request thứ 2 nhận result đã cached

6. **AC6: Vietnamese Localization**
   - All error messages trong Vietnamese
   - All UI text trong Vietnamese
   - Workflow log comments trong Vietnamese

## Tasks / Subtasks

- [x] Task 1: Backend - Add WorkflowAction Enum Values (AC: #1, #2)
  - [x] Add CANCEL to WorkflowAction enum in schema.prisma
  - [x] Add WITHDRAW to WorkflowAction enum in schema.prisma
  - [x] Run prisma migrate

- [x] Task 2: Backend - Cancel/Withdraw DTOs (AC: #1, #2, #5)
  - [x] Create CancelProposalDto với idempotencyKey field
  - [x] Create WithdrawProposalDto với idempotencyKey field
  - [x] Add proper typing - NO as unknown/as any casts (Epic 7/8 retro)

- [x] Task 3: Backend - Cancel/Withdraw Service Logic (AC: #1, #2, #3, #4)
  - [x] Create cancelProposal() method in WorkflowService
  - [x] Create withdrawProposal() method in WorkflowService
  - [x] Validate state transitions (CANCEL chỉ từ DRAFT, WITHDRAW < APPROVED)
  - [x] Validate owner-only access (proposal.owner_id === user.id)
  - [x] Set cancelled_at/withdrawn_at timestamps
  - [x] Update holder về lại owner
  - [x] Log workflow action với proper enum (WorkflowAction.CANCEL/WITHDRAW)

- [x] Task 4: Backend - Cancel/Withdraw Endpoints (AC: #3, #4, #5)
  - [x] Create POST /proposals/:id/cancel endpoint
  - [x] Create POST /proposals/:id/withdraw endpoint
  - [x] Add RBAC guard: @RequireRoles(UserRole.PROJECT_OWNER)
  - [x] Add ownership check: proposal.owner_id === user.id
  - [x] Apply IdempotencyInterceptor
  - [x] Return 403 if state >= APPROVED

- [x] Task 5: Backend - Notification on Withdraw (AC: #2)
  - [x] Send notification cho current holder khi withdraw
  - [x] Use NotificationService (existing from Epic 8)

- [x] Task 6: Frontend - Cancel Button (AC: #1, #6)
  - [x] Add "Hủy bỏ" button cho DRAFT proposals
  - [x] Show confirm dialog trước khi execute
  - [x] Loading state trong khi processing
  - [x] Vietnamese text: "Hủy bỏ", "Bạn có chắc muốn hủy..."

- [x] Task 7: Frontend - Withdraw Button (AC: #2, #3, #6)
  - [x] Add "Rút hồ sơ" button cho eligible proposals
  - [x] Hide button nếu state >= APPROVED
  - [x] Show warning confirm dialog
  - [x] Vietnamese text: "Rút hồ sơ", "Rút hồ sơ sẽ đánh dấu..."

- [x] Task 8: Unit Tests (AC: #1, #2, #3, #4, #5)
  - [x] Test cancel từ DRAFT → CANCELLED
  - [x] Test withdraw từ FACULTY_REVIEW → WITHDRAWN
  - [x] Test withdraw blocked sau APPROVED
  - [x] Test non-owner cannot cancel/withdraw (403)
  - [x] Test idempotency với double-click
  - [x] Test timestamps được set đúng
  - [x] Test holder được update về lại owner

- [x] Task 9: Integration Tests (AC: #1, #2, #4)
  - [x] Test full cancel flow: UI → API → database → workflow log
  - [x] Test full withdraw flow: UI → API → database → workflow log → notification
  - [x] Test concurrent cancel/withdraw operations

## Dev Notes

### Epic 9 Context

**Epic 9: Exceptions (Pause/Cancel/Withdraw/Reject)**
- FRs covered: FR43 (Cancel/Withdraw), FR44 (Reject), FR45 (Pause/Resume)
- Story 9.1: Cancel/Withdraw Actions (THIS STORY)
- Story 9.2: Reject Action
- Story 9.3: Pause/Resume (PHONG_KHCN only)

**Epic Objective:**
Xử lý các exception states trong proposal lifecycle - cancel, withdraw, reject, pause/resume.

### Dependencies

**Depends on:**
- Story 3.1 (16 canonical states) - For state machine understanding
- Story 3.4 (workflow logs) - For audit trail pattern
- Epic 8 (completed) - For NotificationService, RBAC patterns

**Enables:**
- Story 9.2 (Reject Action) - Reuses exception handling patterns
- Story 9.3 (Pause/Resume) - Reuses state transition patterns

### Epic 7 & 8 Retro Learnings to Apply (CRITICAL)

From `epic-7-retro-2026-01-07.md` and `epic-8-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const result = cancelData as unknown as Prisma.InputJsonValue;

// ✅ CORRECT - Epic 7/8 retro pattern:
interface CancelProposalData {
  proposalId: string;
  cancelledBy: string;
  cancelledAt: Date;
  reason?: string;
}
const result: CancelProposalData = {
  proposalId: proposal.id,
  cancelledBy: user.id,
  cancelledAt: new Date(),
  reason: dto.reason,
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation (11 instances), Epic 8 found 2 more:
const proposalData = (proposal as any).customField;

// ✅ CORRECT - Define proper interface:
interface ProposalWithTimestamps {
  id: string;
  state: ProjectState;
  cancelledAt?: Date;
  withdrawnAt?: Date;
}
const proposalData: ProposalWithTimestamps = proposal;
```

**3. Use WorkflowAction Enum Directly** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
action: WorkflowAction.CANCEL as unknown as AuditAction

// ✅ CORRECT - Use enum directly:
import { WorkflowAction } from '@prisma/client';
action: WorkflowAction.CANCEL  // Direct usage
action: WorkflowAction.WITHDRAW
```

**4. Proper Decorator Usage** ⚠️ Epic 8 Finding
```typescript
// ❌ WRONG - Epic 8 violation:
@Get('ip') ip?: string,  // @Get() là route decorator, không phải parameter decorator

// ✅ CORRECT - Use @Body() cho POST endpoints:
@Body('ip') ip?: string,
@Body('userAgent') userAgent?: string,
```

**5. State Lookup for Non-State-Changing Actions** (Epic 8 pattern)
```typescript
// ❌ WRONG - Using null for required field:
toState: null as any,  // Cancel doesn't change state to new state

// ✅ CORRECT - Use current state for workflow logging:
const currentState = proposal.state;
await this.prisma.workflowLog.create({
  data: {
    action: WorkflowAction.CANCEL,
    fromState: currentState,
    toState: ProjectState.CANCELLED,  // Terminal state
    // ...
  },
});
```

**6. Tests MUST Be Written**
```typescript
// Epic 7 retro finding: No tests written → bugs not caught early
// Epic 8 improvement: 86 tests written
// Epic 9 REQUIREMENT: Write tests for each critical path
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  workflow/
    workflow.service.ts       # Extend: Add cancelProposal(), withdrawProposal()
    dto/
      cancel-proposal.dto.ts  # New: CancelProposalDto
      withdraw-proposal.dto.ts # New: WithdrawProposalDto
    exceptions.controller.ts  # New: Exception action endpoints
  exceptions/
    exceptions.module.ts      # New: Module for exception handling
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    proposals/
      [id]/
        components/
          ProposalActions.tsx    # Modify: Add Cancel/Withdraw buttons
          CancelConfirmDialog.tsx # New: Cancel confirmation
          WithdrawConfirmDialog.tsx # New: Withdraw confirmation
  lib/api/
    exceptions.ts               # New: Exception actions API client
```

### Architecture Compliance

**WorkflowAction Enum Addition:**
```prisma
enum WorkflowAction {
  // ... existing values ...
  CANCEL                 // Hủy đề tài từ DRAFT (Story 9.1)
  WITHDRAW               // Rút hồ sơ trước khi duyệt (Story 9.1)
  REJECT                 // Từ chối đề tài (Story 9.2)
  PAUSE                  // Tạm dừng (Story 9.3)
  RESUME                 // Tiếp tục sau暂停 (Story 9.3)
}
```

**State Transition Rules:**
```typescript
// Cancel: Chỉ từ DRAFT → CANCELLED
const CANCEL_TRANSITIONS: Record<ProjectState, boolean> = {
  [ProjectState.DRAFT]: true,
  // All other states: false
};

// Withdraw: Từ các state < APPROVED → WITHDRAWN
const WITHDRAW_TRANSITIONS: Record<ProjectState, boolean> = {
  [ProjectState.FACULTY_REVIEW]: true,
  [ProjectState.SCHOOL_SELECTION_REVIEW]: true,
  [ProjectState.OUTLINE_COUNCIL_REVIEW]: true,
  [ProjectState.CHANGES_REQUESTED]: true,
  // DRAFT, APPROVED, IN_PROGRESS, etc.: false (DRAFT should use CANCEL)
};
```

**RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PROJECT_OWNER)
@Controller('exceptions')
export class ExceptionsController {
  @Post('proposals/:id/cancel')
  async cancelProposal(
    @Param('id') proposalId: string,
    @CurrentUser() user: User,
    @Body() dto: CancelProposalDto,
  ) {
    // Additional ownership check
    if (proposal.ownerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền hủy đề tài này');
    }
  }
}
```

### Data Model

**Cancel Proposal DTO:**
```typescript
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelProposalDto {
  @IsUUID('4')
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Lý do không được quá 500 ký tự'
  })
  reason?: string;  // Optional reason for cancellation
}
```

**Withdraw Proposal DTO:**
```typescript
export class WithdrawProposalDto {
  @IsUUID('4')
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  @MinLength(5, {
    message: 'Lý do phải có ít nhất 5 ký tự'
  })
  @MaxLength(500, {
    message: 'Lý do không được quá 500 ký tự'
  })
  reason?: string;  // Optional reason for withdrawal
}
```

**Database Schema Updates:**
```prisma
model Proposal {
  // ... existing fields ...

  // Exception state tracking
  cancelledAt   DateTime?
  withdrawnAt   DateTime?
  rejectedAt    DateTime?
  pausedAt      DateTime?

  // Rejection fields
  rejectedBy    String?   @relation("RejectedBy", fields: [rejectedById], references: [id])
  rejectedById  String?

  // ... indexes ...
  @@index([cancelledAt])
  @@index([withdrawnAt])
  @@index([rejectedAt])
  @@index([pausedAt])
}
```

### State Machine Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    EXCEPTION TRANSITIONS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CANCEL (Owner only, DRAFT only):                           │
│     DRAFT ──────────────► CANCELLED                          │
│                              │                               │
│   WITHDRAW (Owner only, before APPROVED):                    │
│     FACULTY_REVIEW ──────► WITHDRAWN                         │
│     SCHOOL_SELECTION_REVIEW ──► WITHDRAWN                    │
│     OUTLINE_COUNCIL_REVIEW ──► WITHDRAWN                     │
│     CHANGES_REQUESTED ────► WITHDRAWN                        │
│                                                              │
│   Terminal states (HOLDER = DECISION MAKER, not in queue):   │
│     CANCELLED, WITHDRAWN, REJECTED, COMPLETED               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Vietnamese Localization

All UI text and error messages must be in Vietnamese:

**UI Text:**
- "Hủy bỏ" (Cancel)
- "Rút hồ sơ" (Withdraw)
- "Bạn có chắc muốn hủy đề tài này?" (Confirm cancel)
- "Rút hồ sơ sẽ đánh dấu đề tài là ĐÃ RÚT. Bạn có muốn tiếp tục?" (Confirm withdraw warning)
- "Hành động này không thể hoàn tác" (This action cannot be undone)
- "Đang xử lý..." (Processing...)

**Error Messages:**
- "Đề tài đang thực hiện, không thể rút. Vui lòng liên hệ PKHCN nếu cần." (Cannot withdraw after APPROVED)
- "Bạn không có quyền hủy/rút đề tài này" (Not owner)
- "Đề tài không tồn tại" (Proposal not found)
- "Đề tài không ở trạng thái có thể hủy/rút" (Invalid state for action)
- "Không thể hủy đề tài đã nộp. Vui lòng sử dụng 'Rút hồ sơ'." (Cannot cancel submitted proposal)

### Code Patterns to Follow

**Proper Cancel Implementation (Epic 7/8 Retro Pattern):**
```typescript
// WorkflowService.cancelProposal()
async cancelProposal(
  proposalId: string,
  context: TransitionContext,
): Promise<ProposalDto> {
  // Fetch proposal with proper typing
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      state: true,
      ownerId: true,
      holderUnit: true,
      holderUser: true,
      facultyId: true,
    },
  });

  if (!proposal) {
    throw new NotFoundException('Đề tài không tồn tại');
  }

  // State validation - proper enum usage
  if (proposal.state !== ProjectState.DRAFT) {
    throw new BadRequestException(
      'Chỉ có thể hủy đề tài ở trạng thái Nháp'
    );
  }

  // Ownership check
  if (proposal.ownerId !== context.userId) {
    throw new ForbiddenException('Bạn không có quyền hủy đề tài này');
  }

  // Execute cancel - using Prisma's typed update
  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      state: ProjectState.CANCELLED,
      holderUnit: proposal.facultyId,  // Back to owner's faculty
      holderUser: proposal.ownerId,     // Back to owner
      cancelledAt: new Date(),
    },
  });

  // Log workflow action - Direct enum usage (Epic 7/8 retro)
  await this.prisma.workflowLog.create({
    data: {
      proposalId: proposal.id,
      action: WorkflowAction.CANCEL,  // Direct enum, NO double cast
      fromState: ProjectState.DRAFT,
      toState: ProjectState.CANCELLED,
      actorId: context.userId,
      actorName: context.userDisplayName,
      comment: context.reason || 'Hủy bỏ đề tài',
      timestamp: new Date(),
    },
  });

  return this.mapToDto(updated);
}
```

**Proper Withdraw Implementation:**
```typescript
// WorkflowService.withdrawProposal()
async withdrawProposal(
  proposalId: string,
  context: TransitionContext,
): Promise<ProposalDto> {
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      owner: { select: { id: true, facultyId: true } },
    },
  });

  if (!proposal) {
    throw new NotFoundException('Đề tài không tồn tại');
  }

  // State validation - cannot withdraw after APPROVED
  const WITHDRAWABLE_STATES = [
    ProjectState.FACULTY_REVIEW,
    ProjectState.SCHOOL_SELECTION_REVIEW,
    ProjectState.OUTLINE_COUNCIL_REVIEW,
    ProjectState.CHANGES_REQUESTED,
  ];

  if (!WITHDRAWABLE_STATES.includes(proposal.state)) {
    throw new BadRequestException(
      'Đề tài đang thực hiện, không thể rút. Vui lòng liên hệ PKHCN nếu cần.'
    );
  }

  // Store current holder for notification
  const currentHolderId = proposal.holderUser;
  const currentHolderUnit = proposal.holderUnit;

  // Execute withdraw
  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      state: ProjectState.WITHDRAWN,
      holderUnit: proposal.owner.facultyId,
      holderUser: proposal.ownerId,
      withdrawnAt: new Date(),
    },
  });

  // Log workflow action
  await this.prisma.workflowLog.create({
    data: {
      proposalId: proposal.id,
      action: WorkflowAction.WITHDRAW,  // Direct enum usage
      fromState: proposal.state,
      toState: ProjectState.WITHDRAWN,
      actorId: context.userId,
      actorName: context.userDisplayName,
      comment: context.reason || 'Rút hồ sơ đề tài',
      timestamp: new Date(),
    },
  });

  // Send notification to previous holder
  if (currentHolderId) {
    await this.notificationService.send({
      recipientId: currentHolderId,
      type: NotificationType.PROPOSAL_WITHDRAWN,
      proposalId: proposal.id,
      proposalCode: proposal.code,
      message: `${context.userDisplayName} đã rút hồ sơ đề tài ${proposal.code}`,
    });
  }

  return this.mapToDto(updated);
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 7/8 Retro):**
```typescript
describe('WorkflowService.cancelProposal', () => {
  it('should cancel proposal from DRAFT to CANCELLED', async () => {
    const proposal = await createTestProposal({ state: ProjectState.DRAFT });
    const result = await service.cancelProposal(proposal.id, mockContext);
    expect(result.state).toBe(ProjectState.CANCELLED);
    expect(result.cancelledAt).toBeDefined();
  });

  it('should reject cancel from non-DRAFT state', async () => {
    const proposal = await createTestProposal({ state: ProjectState.FACULTY_REVIEW });
    await expect(
      service.cancelProposal(proposal.id, mockContext)
    ).rejects.toThrow('Chỉ có thể hủy đề tài ở trạng thái Nháp');
  });

  it('should reject cancel from non-owner', async () => {
    const proposal = await createTestProposal({ state: ProjectState.DRAFT });
    const otherUserContext = { ...mockContext, userId: 'other-user-id' };
    await expect(
      service.cancelProposal(proposal.id, otherUserContext)
    ).rejects.toThrow('Bạn không có quyền hủy đề tài này');
  });

  it('should log CANCEL workflow action', async () => {
    const proposal = await createTestProposal({ state: ProjectState.DRAFT });
    await service.cancelProposal(proposal.id, mockContext);
    const log = await prisma.workflowLog.findFirst({
      where: { proposalId: proposal.id, action: WorkflowAction.CANCEL },
    });
    expect(log).toBeDefined();
    expect(log.fromState).toBe(ProjectState.DRAFT);
    expect(log.toState).toBe(ProjectState.CANCELLED);
  });
});

describe('WorkflowService.withdrawProposal', () => {
  it('should withdraw from FACULTY_REVIEW to WITHDRAWN', async () => {
    const proposal = await createTestProposal({ state: ProjectState.FACULTY_REVIEW });
    const result = await service.withdrawProposal(proposal.id, mockContext);
    expect(result.state).toBe(ProjectState.WITHDRAWN);
    expect(result.withdrawnAt).toBeDefined();
  });

  it('should reject withdraw from APPROVED state', async () => {
    const proposal = await createTestProposal({ state: ProjectState.APPROVED });
    await expect(
      service.withdrawProposal(proposal.id, mockContext)
    ).rejects.toThrow('Đề tài đang thực hiện, không thể rút');
  });

  it('should send notification to previous holder', async () => {
    const holderId = 'holder-user-id';
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
      holderUser: holderId,
    });
    await service.withdrawProposal(proposal.id, mockContext);
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: holderId })
    );
  });

  it('should handle idempotency correctly', async () => {
    const proposal = await createTestProposal({ state: ProjectState.DRAFT });
    const idempotencyKey = uuid.v4();
    const result1 = await service.cancelProposal(proposal.id, {
      ...mockContext,
      idempotencyKey,
    });
    const result2 = await service.cancelProposal(proposal.id, {
      ...mockContext,
      idempotencyKey,
    });
    expect(result1).toEqual(result2);  // Same result returned
    // Only one workflow log entry
    const logs = await prisma.workflowLog.findMany({
      where: { proposalId: proposal.id, action: WorkflowAction.CANCEL },
    });
    expect(logs).toHaveLength(1);
  });
});
```

### Error Handling Pattern

**Vietnamese Error Messages:**
```typescript
export const EXCEPTION_ERRORS = {
  // Cancel errors
  CANNOT_CANCEL_NON_DRAFT: 'Chỉ có thể hủy đề tài ở trạng thái Nháp',
  NOT_OWNER: 'Bạn không có quyền hủy/rút đề tài này',
  PROPOSAL_NOT_FOUND: 'Đề tài không tồn tại',

  // Withdraw errors
  CANNOT_WITHDRAW_AFTER_APPROVED: 'Đề tài đang thực hiện, không thể rút. Vui lòng liên hệ PKHCN nếu cần.',
  CANNOT_WITHDRAW_DRAFT: 'Không thể rút đề tài ở trạng thái Nháp. Vui lòng sử dụng "Hủy bỏ".',
  NOT_IN_WITHDRAWABLE_STATE: 'Đề tài không ở trạng thái có thể rút',

  // General
  ACTION_NOT_ALLOWED: (action: string, state: string) =>
    `Không thể ${action} khi đề tài ở trạng thái ${state}`,
} as const;
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 9-1 created via create-story workflow. Status: ready-for-dev
- Epic 7 & 8 retrospective learnings applied (type safety, no as unknown/as any)
- WorkflowAction.CANCEL and WorkflowAction.WITHDRAW enum values to be added
- Proper DTO mapping pattern specified
- RBAC for PROJECT_OWNER only (with ownership check)
- Idempotency for duplicate prevention
- Tests mandated per Epic 7/8 retro lessons
- Vietnamese localization for all messages
- State transition rules clearly defined
- Notification to previous holder on withdraw
- Terminal state holder rules applied

### File List

**To Create:**
- `qlnckh/apps/src/modules/workflow/dto/cancel-proposal.dto.ts` - Cancel DTO
- `qlnckh/apps/src/modules/workflow/dto/withdraw-proposal.dto.ts` - Withdraw DTO
- `qlnckh/apps/src/modules/workflow/exceptions.controller.ts` - Exception endpoints
- `qlnckh/apps/src/modules/exceptions/exceptions.module.ts` - Module definition
- `qlnckh/web-apps/src/app/proposals/[id]/components/CancelConfirmDialog.tsx` - Cancel dialog
- `qlnckh/web-apps/src/app/proposals/[id]/components/WithdrawConfirmDialog.tsx` - Withdraw dialog
- `qlnckh/web-apps/src/lib/api/exceptions.ts` - API client

**To Modify:**
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Add cancelProposal(), withdrawProposal()
- `qlnckh/prisma/schema.prisma` - Add CANCEL, WITHDRAW to WorkflowAction; Add cancelledAt, withdrawnAt to Proposal
- `qlnckh/apps/src/app.module.ts` - Import ExceptionsModule
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 7 & 8 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper DTO mapping pattern specified
  - WorkflowAction enum pattern (direct usage, no double cast)
  - RBAC authorization for PROJECT_OWNER with ownership check
  - Tests mandated per Epic 7/8 retro lessons
  - Vietnamese localization for all messages
  - Exception handling patterns established
  - Ready for dev-story workflow execution

## References

- [epics.md Story 9.1](../../planning-artifacts/epics.md#L2190-L2220) - Full requirements
- [epic-7-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-7-retro-2026-01-07.md) - Lessons learned
- [epic-8-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-8-retro-2026-01-07.md) - Latest patterns
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [Story 3.1](./3-1-16-canonical-states-plus-transitions.md) - State machine reference
- [Story 3.4](./3-4-workflow-logs-timeline-thread-view.md) - Workflow log patterns
