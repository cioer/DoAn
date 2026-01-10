# Story 9.3: Pause/Resume (Tạm dừng/Tiếp tục - PKHCN Only)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 8 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a PKHCN (Phòng Khoa học Công nghệ),
I want tạm dừng/tiếp tục proposal khi cần,
So that tôi có thể hold hồ sơ tạm thời (ví dụ: chờ bổ sung tài liệu, chờ ý kiến thêm) và resume khi sẵn sàng.

## Acceptance Criteria

1. **AC1: Pause Action (PKHCN only)**
   - Given User có role = PHONG_KHCN
   - And Proposal ở state có thể pause (non-terminal, not already paused)
   - When User click "Tạm dừng"
   - Then UI hiển thị Pause dialog:
     - Reason field (required, textarea, max 500 characters)
     - Expected resume date (optional, date picker)
     - Button "Xác nhận tạm dừng" và "Hủy"
   - And sau khi confirm:
     - proposal.state chuyển từ current state → PAUSED
     - proposal.holder_unit = PHONG_KHCN
     - proposal.holder_user = null
     - proposal.paused_at = now()
     - proposal.pause_reason được lưu
     - proposal.expected_resume_at được lưu (nếu có)
     - workflow_logs entry được tạo với action = PAUSE

2. **AC2: Resume Action (PKHCN only)**
   - Given Proposal ở state = PAUSED
   - When User có role = PHONG_KHCN click "Tiếp tục"
   - Then UI hiển thị Resume dialog với thông tin:
     - State trước khi pause (pre-pause state)
     - Pause reason
     - Expected resume date (nếu có)
   - And sau khi confirm "Tiếp tục":
     - proposal.state chuyển từ PAUSED về state trước khi pause (pre_pause_state)
     - proposal.holder_unit được restore về giá trị trước pause
     - proposal.holder_user được restore về giá trị trước pause
     - proposal.paused_at = null
     - proposal.resumed_at = now()
     - proposal.sla_deadline được recalculate (add paused duration)
     - workflow_logs entry được tạo với action = RESUME

3. **AC3: RBAC - Only PKHCN Can Pause/Resume**
   - Given User KHÔNG có role = PHONG_KHCN
   - When User cố gắng pause/resume
   - Then return 403 Forbidden với message "Chỉ PKHCN mới có quyền tạm dừng/tiếp tục đề tài"

4. **AC4: Cannot Pause Terminal States**
   - Given Proposal ở terminal state (COMPLETED, CANCELLED, WITHDRAWN, REJECTED)
   - When User (PKHCN) cố gắng pause
   - Then return 400 Bad Request với message "Không thể tạm dừng đề tài ở trạng thái này"

5. **AC5: SLA Pause/Resume Behavior**
   - Given Proposal có sla_deadline = future date
   - When Proposal bị pause
   - Then SLA badge hiển thị "Đã tạm dừng" (không countdown)
   - And Given Proposal được resume
   - Then sla_deadline được recalculate:
     - sla_deadline mới = sla_deadline cũ + (now - paused_at)
     - Tức là thêm thời gian đã pause vào deadline gốc

6. **AC6: Idempotency**
   - Given User double-click "Tạm dừng" hoặc "Tiếp tục"
   - When 2 requests đến gần như cùng lúc với cùng idempotencyKey
   - Then chỉ 1 action được execute
   - And request thứ 2 nhận result đã cached

7. **AC7: Vietnamese Localization**
   - All error messages trong Vietnamese
   - All UI text trong Vietnamese
   - Workflow log comments trong Vietnamese

8. **AC8: State Before Pause Tracking**
   - Given Proposal bị pause
   - When pause action execute
   - Then pre_pause_state được lưu để có thể resume về đúng state
   - And pre_pause_holder_unit được lưu
   - And pre_pause_holder_user được lưu

## Tasks / Subtasks

- [x] Task 1: Backend - Add WorkflowAction Enum Values (AC: #1, #2)
  - [x] Add PAUSE to WorkflowAction enum in schema.prisma
  - [x] Add RESUME to WorkflowAction enum in schema.prisma
  - [x] Run prisma migrate

- [x] Task 2: Backend - Pause/Resume DTOs (AC: #1, #2, #6)
  - [x] Create PauseProposalDto với proper typing
  - [x] Fields: reason (string, required), expectedResumeAt (date, optional), idempotencyKey
  - [x] Create ResumeProposalDto với proper typing
  - [x] NO as unknown/as any casts (Epic 7/8 retro)

- [x] Task 3: Backend - Database Schema Updates (AC: #8)
  - [x] Add paused_at, resumed_at, pause_reason, expected_resume_at to Proposal
  - [x] Add pre_pause_state, pre_pause_holder_unit, pre_pause_holder_user to Proposal
  - [x] Add indexes cho pause tracking

- [x] Task 4: Backend - Pause Service Logic (AC: #1, #4, #8)
  - [x] Create pauseProposal() method in WorkflowService
  - [x] Validate state is not terminal
  - [x] Store pre_pause state và holder info
  - [x] Set paused_at, pause_reason, expected_resume_at
  - [x] Update holder về PHONG_KHCN
  - [x] Log workflow action với proper enum (WorkflowAction.PAUSE)

- [x] Task 5: Backend - Resume Service Logic (AC: #2, #5, #8)
  - [x] Create resumeProposal() method in WorkflowService
  - [x] Validate state is PAUSED
  - [x] Restore pre_pause state, holder_unit, holder_user
  - [x] Recalculate sla_deadline (add paused duration)
  - [x] Set resumed_at, clear paused_at
  - [x] Log workflow action với proper enum (WorkflowAction.RESUME)

- [x] Task 6: Backend - Pause/Resume Endpoints (AC: #3, #6)
  - [x] Create POST /proposals/:id/pause endpoint
  - [x] Create POST /proposals/:id/resume endpoint
  - [x] Add RBAC guard: @RequireRoles(UserRole.PHONG_KHCN)
  - [x] Apply IdempotencyInterceptor
  - [x] Return 403 for non-PKHCN users
  - [x] Return 400 for invalid states

- [x] Task 7: Frontend - Pause Button (AC: #1, #7)
  - [x] Add "Tạm dừng" button cho PHONG_KHCN on eligible proposals
  - [x] Hide button cho:
     - Non-PKHCN users
     - Terminal states
     - Already paused proposals
  - [x] Show loading state during processing

- [x] Task 8: Frontend - Pause Dialog (AC: #1, #7)
  - [x] Create PauseConfirmDialog component
  - [x] Reason textarea (required, max 500 chars)
  - [x] Expected resume date picker (optional)
  - [x] "Xác nhận tạm dừng" và "Hủy" buttons
  - [x] Vietnamese labels

- [x] Task 9: Frontend - Resume Button and Dialog (AC: #2, #7)
  - [x] Add "Tiếp tục" button cho PAUSED proposals (PKHCN only)
  - [x] Create ResumeConfirmDialog component
  - [x] Show pre-pause state info
  - [x] Show pause reason and expected resume date
  - [x] Vietnamese labels

- [x] Task 10: Unit Tests (AC: #1, #2, #3, #4, #5, #8)
  - [x] Test pause từ FACULTY_REVIEW → PAUSED
  - [x] Test pause stores pre_pause_state correctly
  - [x] Test resume từ PAUSED về FACULTY_REVIEW
  - [x] Test resume restores holder info correctly
  - [x] Test sla_deadline recalculation after resume
  - [x] Test pause blocked cho terminal states
  - [x] Test pause/resume blocked cho non-PKHCN users (403)
  - [x] Test idempotency với double-click

- [x] Task 11: Integration Tests (AC: #1, #2, #5)
  - [x] Test full pause flow: UI → API → database → workflow log
  - [x] Test full resume flow: UI → API → database → workflow log → SLA update
  - [x] Test concurrent pause/resume operations

## Dev Notes

### Epic 9 Context

**Epic 9: Exceptions (Pause/Cancel/Withdraw/Reject)**
- FRs covered: FR43 (Cancel/Withdraw), FR44 (Reject), FR45 (Pause/Resume)
- Story 9.1: Cancel/Withdraw Actions
- Story 9.2: Reject Action
- Story 9.3: Pause/Resume (PKHCN only) (THIS STORY)

**Epic Objective:**
Xử lý các exception states trong proposal lifecycle - cancel, withdraw, reject, pause/resume.

### Dependencies

**Depends on:**
- Story 3.1 (16 canonical states) - For state machine understanding
- Story 3.4 (workflow logs) - For audit trail pattern
- Story 3.6 (SLA calculator) - For SLA pause/resume behavior
- Story 9.1, 9.2 - For exception handling patterns
- Epic 8 (completed) - For NotificationService, RBAC patterns

**No Dependencies On:**
- This is the final story in Epic 9

### Epic 7 & 8 Retro Learnings to Apply (CRITICAL)

From `epic-7-retro-2026-01-07.md` and `epic-8-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const pauseData = dto as unknown as Prisma.InputJsonValue;

// ✅ CORRECT - Epic 7/8 retro pattern:
interface PauseProposalData {
  proposalId: string;
  reason: string;
  expectedResumeAt?: Date;
  pausedBy: string;
  pausedAt: Date;
}
const pauseData: PauseProposalData = {
  proposalId: proposal.id,
  reason: dto.reason,
  expectedResumeAt: dto.expectedResumeAt,
  pausedBy: user.id,
  pausedAt: new Date(),
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation (11 instances), Epic 8 found 2 more:
const prePauseState = (proposal as any).prePauseState;

// ✅ CORRECT - Define proper interface:
interface ProposalWithPauseTracking {
  id: string;
  state: ProjectState;
  pausedAt?: Date | null;
  resumedAt?: Date | null;
  prePauseState?: ProjectState | null;
  prePauseHolderUnit?: string | null;
  prePauseHolderUser?: string | null;
}
const proposalData: ProposalWithPauseTracking = proposal;
```

**3. Use WorkflowAction Enum Directly** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
action: WorkflowAction.PAUSE as unknown as AuditAction

// ✅ CORRECT - Use enum directly:
import { WorkflowAction } from '@prisma/client';
action: WorkflowAction.PAUSE   // Direct usage
action: WorkflowAction.RESUME
```

**4. Proper Decorator Usage** ⚠️ Epic 8 Finding
```typescript
// ❌ WRONG - Epic 8 violation:
@Get('reason') reason?: string,  // @Get() là route decorator

// ✅ CORRECT - Use @Body() cho POST endpoints:
@Body('reason') reason?: string,
@Body('expectedResumeAt') expectedResumeAt?: Date,
```

**5. SLA Recalculation Pattern** (Epic 8 pattern)
```typescript
// When resuming, recalculate SLA deadline
const pausedDuration = Date.now() - proposal.pausedAt.getTime();
const currentDeadline = proposal.slaDeadline.getTime();
const newDeadline = new Date(currentDeadline + pausedDuration);
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
    workflow.service.ts       # Extend: Add pauseProposal(), resumeProposal()
    dto/
      pause-proposal.dto.ts   # New: PauseProposalDto
      resume-proposal.dto.ts  # New: ResumeProposalDto
  exceptions/
    exceptions.controller.ts  # Extend: Add pause/resume endpoints
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    proposals/
      [id]/
        components/
          PauseConfirmDialog.tsx  # New: Pause confirmation dialog
          ResumeConfirmDialog.tsx # New: Resume confirmation dialog
```

### Architecture Compliance

**WorkflowAction Enum Addition:**
```prisma
enum WorkflowAction {
  // ... existing values ...
  PAUSE                  // Tạm dừng (Story 9.3)
  RESUME                 // Tiếp tục sau暂停 (Story 9.3)
}
```

**RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PHONG_KHCN)  // ONLY PKHCN can pause/resume
@Controller('exceptions')
export class ExceptionsController {
  @Post('proposals/:id/pause')
  async pauseProposal(...) { }

  @Post('proposals/:id/resume')
  async resumeProposal(...) { }
}
```

### Data Model

**Pause Proposal DTO:**
```typescript
import { IsString, IsOptional, IsDate, MaxLength, IsUUID, IsDateString } from 'class-validator';

export class PauseProposalDto {
  @IsString()
  @MinLength(10, {
    message: 'Lý do phải có ít nhất 10 ký tự'
  })
  @MaxLength(500, {
    message: 'Lý do không được quá 500 ký tự'
  })
  reason: string;

  @IsOptional()
  @IsDateString()
  expectedResumeAt?: string;  // ISO date string

  @IsUUID('4')
  idempotencyKey: string;
}
```

**Resume Proposal DTO:**
```typescript
export class ResumeProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;  // Optional comment when resuming

  @IsUUID('4')
  idempotencyKey: string;
}
```

**Database Schema Updates:**
```prisma
model Proposal {
  // ... existing fields ...

  // Pause/Resume tracking
  pausedAt            DateTime?
  resumedAt           DateTime?  // Set once on first resume, preserved for audit trail
  pauseReason         String?   @db.Text
  expectedResumeAt    DateTime?

  // Pre-pause state for resume
  prePauseState       ProjectState?
  prePauseHolderUnit  String?
  prePauseHolderUser  String?

  // ... indexes ...
  @@index([pausedAt])
  @@index([resumedAt])
  @@index([expectedResumeAt])
}

// Note on re-pause behavior:
// - If a paused proposal is resumed, then paused again, the original resumedAt
//   timestamp is preserved for audit history
// - Each pause/resume cycle creates a new workflow log entry
// - The latest pausedAt is always the active pause timestamp
```

### State Machine Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PAUSE/RESUME TRANSITIONS                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Any non-terminal state ────► PAUSED (by PKHCN only)       │
│     (except CANCELLED, WITHDRAWN,                            │
│      REJECTED, COMPLETED, PAUSED)                            │
│                                                              │
│   PAUSED ──────────────────────► Pre-pause state            │
│         (by PKHCN only)           (holder restored)          │
│                                                              │
│   Pauseable states:                                          │
│     • FACULTY_REVIEW                                          │
│     • SCHOOL_SELECTION_REVIEW                                │
│     • OUTLINE_COUNCIL_REVIEW                                 │
│     • CHANGES_REQUESTED                                      │
│     • APPROVED                                                │
│     • IN_PROGRESS                                            │
│     • FACULTY_ACCEPTANCE_REVIEW                              │
│     • SCHOOL_ACCEPTANCE_REVIEW                               │
│     • HANDOVER                                                │
│                                                              │
│   SLA behavior:                                              │
│     • Paused: SLA badge shows "Đã tạm dừng"                 │
│     • Resumed: Deadline extended by pause duration          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### SLA Pause/Resume Calculation

**SLA Recalculation Formula:**
```typescript
// When pausing: Store original deadline
// sla_deadline unchanged

// When resuming: Add paused duration to deadline
interface SLACalculation {
  originalDeadline: Date;
  pausedAt: Date;
  resumedAt: Date;
  pausedDuration: number;  // milliseconds
  newDeadline: Date;
}

// Example:
// - sla_deadline = 2026-01-15 17:00:00
// - paused_at = 2026-01-07 10:00:00
// - resumed_at = 2026-01-10 10:00:00
// - paused_duration = 3 days = 259200000 ms
// - new_deadline = 2026-01-15 + 3 days = 2026-01-18 17:00:00

function calculateNewDeadline(
  originalDeadline: Date,
  pausedAt: Date,
  resumedAt: Date,
): Date {
  const pausedDuration = resumedAt.getTime() - pausedAt.getTime();
  return new Date(originalDeadline.getTime() + pausedDuration);
}

// Account for business days (optional enhancement)
function calculateNewDeadlineBusinessDays(
  originalDeadline: Date,
  pausedAt: Date,
  resumedAt: Date,
  slaService: SLAService,
): Date {
  const pausedBusinessDays = slaService.countBusinessDays(pausedAt, resumedAt);
  return slaService.addBusinessDays(originalDeadline, pausedBusinessDays);
}
```

### Vietnamese Localization

All UI text and error messages must be in Vietnamese:

**UI Text (Pause):**
- "Tạm dừng" (Pause)
- "Tiếp tục" (Resume)
- "Lý do tạm dừng" (Pause reason)
- "Ngày dự kiến tiếp tục" (Expected resume date)
- "Xác nhận tạm dừng" (Confirm Pause)
- "Đang xử lý..." (Processing...)

**UI Text (Resume):**
- "Tiếp tục đề tài" (Resume Proposal)
- "Thông tin tạm dừng" (Pause Information)
- "Trạng thái trước khi tạm dừng" (Pre-pause state)
- "Lý do tạm dừng" (Pause reason)
- "Xác nhận tiếp tục" (Confirm Resume)

**Error Messages:**
- "Chỉ PKHCN mới có quyền tạm dừng/tiếp tục đề tài" (Only PKHCN can pause/resume)
- "Không thể tạm dừng đề tài ở trạng thái này" (Cannot pause in this state)
- "Đề tài đang bị tạm dừng" (Proposal is paused)
- "Đề tài không ở trạng thái tạm dừng" (Proposal not paused)
- "Không tìm thấy đề tài" (Proposal not found)
- "Lý do phải có ít nhất 10 ký tự" (Reason must be at least 10 characters)

**State Labels (Vietnamese):**
- "Đã tạm dừng" (Paused)
- "Tạm dừng từ DD/MM/YYYY" (Paused since DD/MM/YYYY)

### Code Patterns to Follow

**Proper Pause Implementation (Epic 7/8 Retro Pattern):**
```typescript
// WorkflowService.pauseProposal()
async pauseProposal(
  proposalId: string,
  dto: PauseProposalDto,
  context: TransitionContext,
): Promise<ProposalDto> {
  // Fetch proposal with proper typing
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      state: true,
      code: true,
      holderUnit: true,
      holderUser: true,
      slaDeadline: true,
    },
  });

  if (!proposal) {
    throw new NotFoundException('Đề tài không tồn tại');
  }

  // State validation - cannot pause terminal states
  const TERMINAL_STATES = [
    ProjectState.COMPLETED,
    ProjectState.CANCELLED,
    ProjectState.WITHDRAWN,
    ProjectState.REJECTED,
  ];

  if (TERMINAL_STATES.includes(proposal.state)) {
    throw new BadRequestException(
      'Không thể tạm dừng đề tài ở trạng thái này'
    );
  }

  // Already paused check
  if (proposal.state === ProjectState.PAUSED) {
    throw new BadRequestException('Đề tài đang bị tạm dừng');
  }

  // Parse expected resume date if provided
  let expectedResumeAt: Date | undefined;
  if (dto.expectedResumeAt) {
    expectedResumeAt = new Date(dto.expectedResumeAt);
    if (expectedResumeAt <= new Date()) {
      throw new BadRequestException(
        'Ngày dự kiến tiếp tục phải trong tương lai'
      );
    }
  }

  // Execute pause - using Prisma's typed update
  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      state: ProjectState.PAUSED,
      holderUnit: 'PHONG_KHCN',
      holderUser: null,
      pausedAt: new Date(),
      pauseReason: dto.reason,
      expectedResumeAt,
      // Store pre-pause state for resume
      prePauseState: proposal.state,
      prePauseHolderUnit: proposal.holderUnit,
      prePauseHolderUser: proposal.holderUser,
    },
  });

  // Log workflow action - Direct enum usage (Epic 7/8 retro)
  await this.prisma.workflowLog.create({
    data: {
      proposalId: proposal.id,
      action: WorkflowAction.PAUSE,  // Direct enum, NO double cast
      fromState: proposal.state,
      toState: ProjectState.PAUSED,
      actorId: context.userId,
      actorName: context.userDisplayName,
      comment: this.buildPauseComment(dto.reason, expectedResumeAt),
      timestamp: new Date(),
    },
  });

  return this.mapToDto(updated);
}

// Helper method to build pause comment
private buildPauseComment(reason: string, expectedResumeAt?: Date): string {
  let comment = `Tạm dừng: ${reason}`;
  if (expectedResumeAt) {
    const formatted = this.dateFormat.format(expectedResumeAt);
    comment += `. Dự kiến tiếp tục: ${formatted}`;
  }
  return comment;
}
```

**Proper Resume Implementation:**
```typescript
// WorkflowService.resumeProposal()
async resumeProposal(
  proposalId: string,
  dto: ResumeProposalDto,
  context: TransitionContext,
): Promise<ProposalDto> {
  // Fetch proposal with pause tracking info
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      state: true,
      code: true,
      holderUnit: true,
      holderUser: true,
      pausedAt: true,
      slaDeadline: true,
      prePauseState: true,
      prePauseHolderUnit: true,
      prePauseHolderUser: true,
    },
  });

  if (!proposal) {
    throw new NotFoundException('Đề tài không tồn tại');
  }

  // Must be paused to resume
  if (proposal.state !== ProjectState.PAUSED) {
    throw new BadRequestException('Đề tài không ở trạng thái tạm dừng');
  }

  // Validate pre-pause state exists
  if (!proposal.prePauseState) {
    throw new BadRequestException(
      'Không thể xác định trạng thái trước khi tạm dừng'
    );
  }

  const resumedAt = new Date();
  let newSlaDeadline = proposal.slaDeadline;

  // Recalculate SLA deadline if was paused
  if (proposal.pausedAt) {
    const pausedDuration = resumedAt.getTime() - proposal.pausedAt.getTime();
    newSlaDeadline = new Date(
      proposal.slaDeadline.getTime() + pausedDuration
    );
  }

  // Execute resume - restore pre-pause state
  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      state: proposal.prePauseState,
      holderUnit: proposal.prePauseHolderUnit,
      holderUser: proposal.prePauseHolderUser,
      slaDeadline: newSlaDeadline,
      resumedAt,
      pausedAt: null,
      // Clear pause tracking fields
      prePauseState: null,
      prePauseHolderUnit: null,
      prePauseHolderUser: null,
    },
  });

  // Log workflow action - Direct enum usage (Epic 7/8 retro)
  await this.prisma.workflowLog.create({
    data: {
      proposalId: proposal.id,
      action: WorkflowAction.RESUME,  // Direct enum, NO double cast
      fromState: ProjectState.PAUSED,
      toState: proposal.prePauseState,
      actorId: context.userId,
      actorName: context.userDisplayName,
      comment: dto.comment || 'Tiếp tục đề tài sau tạm dừng',
      timestamp: resumedAt,
    },
  });

  return this.mapToDto(updated);
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 7/8 Retro):**
```typescript
describe('WorkflowService.pauseProposal', () => {
  const mockContext = {
    userId: 'pkhcn-user-id',
    userDisplayName: 'PKHCN User',
    user: { id: 'pkhcn-user-id', role: UserRole.PHONG_KHCN },
    idempotencyKey: uuid.v4(),
  };

  it('should pause proposal from FACULTY_REVIEW to PAUSED', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
    });
    const dto: PauseProposalDto = {
      reason: 'Chờ bổ sung tài liệu',
      idempotencyKey: uuid.v4(),
    };

    const result = await service.pauseProposal(proposal.id, dto, mockContext);

    expect(result.state).toBe(ProjectState.PAUSED);
    expect(result.pausedAt).toBeDefined();
    expect(result.holderUnit).toBe('PHONG_KHCN');
    expect(result.holderUser).toBeNull();
  });

  it('should store pre_pause_state for resume', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.SCHOOL_SELECTION_REVIEW,
      holderUnit: 'FACULTY_A',
      holderUser: 'user-123',
    });
    const dto: PauseProposalDto = {
      reason: 'Chờ ý kiến BGH',
      idempotencyKey: uuid.v4(),
    };

    const result = await service.pauseProposal(proposal.id, dto, mockContext);

    expect(result.prePauseState).toBe(ProjectState.SCHOOL_SELECTION_REVIEW);
    expect(result.prePauseHolderUnit).toBe('FACULTY_A');
    expect(result.prePauseHolderUser).toBe('user-123');
  });

  it('should reject pause for terminal states', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.COMPLETED,
    });
    const dto: PauseProposalDto = {
      reason: 'Test',
      idempotencyKey: uuid.v4(),
    };

    await expect(
      service.pauseProposal(proposal.id, dto, mockContext)
    ).rejects.toThrow('Không thể tạm dừng đề tài ở trạng thái này');
  });

  it('should reject pause from non-PKHCN user', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
    });
    const unauthorizedContext = {
      ...mockContext,
      user: { ...mockContext.user, role: UserRole.GIANG_VIEN },
    };
    const dto: PauseProposalDto = {
      reason: 'Test',
      idempotencyKey: uuid.v4(),
    };

    await expect(
      service.pauseProposal(proposal.id, dto, unauthorizedContext)
    ).rejects.toThrow('Chỉ PKHCN mới có quyền tạm dừng/tiếp tục đề tài');
  });
});

describe('WorkflowService.resumeProposal', () => {
  it('should resume from PAUSED to pre-pause state', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.PAUSED,
      prePauseState: ProjectState.FACULTY_REVIEW,
      prePauseHolderUnit: 'FACULTY_A',
      prePauseHolderUser: 'user-123',
      pausedAt: new Date('2026-01-01T10:00:00Z'),
      slaDeadline: new Date('2026-01-15T17:00:00Z'),
    });
    const dto: ResumeProposalDto = {
      idempotencyKey: uuid.v4(),
    };

    const result = await service.resumeProposal(proposal.id, dto, mockContext);

    expect(result.state).toBe(ProjectState.FACULTY_REVIEW);
    expect(result.holderUnit).toBe('FACULTY_A');
    expect(result.holderUser).toBe('user-123');
    expect(result.resumedAt).toBeDefined();
    expect(result.pausedAt).toBeNull();
  });

  it('should recalculate SLA deadline after resume', async () => {
    const pausedAt = new Date('2026-01-01T10:00:00Z');
    const originalDeadline = new Date('2026-01-15T17:00:00Z');
    const proposal = await createTestProposal({
      state: ProjectState.PAUSED,
      pausedAt,
      slaDeadline: originalDeadline,
      prePauseState: ProjectState.FACULTY_REVIEW,
    });

    // Simulate 3 days have passed
    const mockNow = new Date('2026-01-04T10:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());

    const dto: ResumeProposalDto = {
      idempotencyKey: uuid.v4(),
    };

    const result = await service.resumeProposal(proposal.id, dto, mockContext);

    // 3 days = 259200000 ms
    const expectedDeadline = new Date(
      originalDeadline.getTime() + (3 * 24 * 60 * 60 * 1000)
    );
    expect(result.slaDeadline).toEqual(expectedDeadline);
  });

  it('should reject resume if proposal not paused', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
    });
    const dto: ResumeProposalDto = {
      idempotencyKey: uuid.v4(),
    };

    await expect(
      service.resumeProposal(proposal.id, dto, mockContext)
    ).rejects.toThrow('Đề tài không ở trạng thái tạm dừng');
  });
});
```

### Error Handling Pattern

**Vietnamese Error Messages:**
```typescript
export const PAUSE_RESUME_ERRORS = {
  // Pause errors
  CANNOT_PAUSE_TERMINAL: 'Không thể tạm dừng đề tài ở trạng thái này',
  ALREADY_PAUSED: 'Đề tài đang bị tạm dừng',
  EXPECTED_DATE_IN_PAST: 'Ngày dự kiến tiếp tục phải trong tương lai',

  // Resume errors
  NOT_PAUSED: 'Đề tài không ở trạng thái tạm dừng',
  MISSING_PRE_PAUSE_STATE: 'Không thể xác định trạng thái trước khi tạm dừng',

  // Permission errors
  INSUFFICIENT_PERMISSIONS: 'Chỉ PKHCN mới có quyền tạm dừng/tiếp tục đề tài',

  // Validation errors
  REASON_TOO_SHORT: 'Lý do phải có ít nhất 10 ký tự',
  REASON_TOO_LONG: 'Lý do không được quá 500 ký tự',
  PROPOSAL_NOT_FOUND: 'Đề tài không tồn tại',

  // General
  PAUSE_FAILED: 'Tạm dừng đề tài thất bại. Vui lòng thử lại.',
  RESUME_FAILED: 'Tiếp tục đề tài thất bại. Vui lòng thử lại.',
} as const;
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 9-3 created via create-story workflow. Status: ready-for-dev
- Epic 7 & 8 retrospective learnings applied (type safety, no as unknown/as any)
- WorkflowAction.PAUSE and WorkflowAction.RESUME enum values to be added
- Pre-pause state tracking pattern for resume
- Proper DTO mapping pattern specified
- RBAC for PHONG_KHCN only
- Idempotency for duplicate prevention
- Tests mandated per Epic 7/8 retro lessons
- Vietnamese localization for all messages
- SLA pause/resume behavior defined
- Database schema updates for pause tracking

### File List

**To Create:**
- `qlnckh/apps/src/modules/workflow/dto/pause-proposal.dto.ts` - Pause DTO
- `qlnckh/apps/src/modules/workflow/dto/resume-proposal.dto.ts` - Resume DTO
- `qlnckh/web-apps/src/app/proposals/[id]/components/PauseConfirmDialog.tsx` - Pause dialog
- `qlnckh/web-apps/src/app/proposals/[id]/components/ResumeConfirmDialog.tsx` - Resume dialog

**To Modify:**
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Add pauseProposal(), resumeProposal()
- `qlnckh/apps/src/modules/workflow/exceptions.controller.ts` - Add pause/resume endpoints
- `qlnckh/prisma/schema.prisma` - Add PAUSE, RESUME to WorkflowAction; Add pause tracking fields to Proposal
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 7 & 8 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper DTO mapping pattern specified
  - WorkflowAction enum pattern (direct usage, no double cast)
  - RBAC authorization for PHONG_KHCN only
  - Tests mandated per Epic 7/8 retro lessons
  - Vietnamese localization for all messages
  - Exception handling patterns established
  - SLA pause/resume calculation defined
  - Pre-pause state tracking for resume
  - Ready for dev-story workflow execution

## References

- [epics.md Story 9.3](../../planning-artifacts/epics.md#L2249-L2276) - Full requirements
- [epic-7-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-7-retro-2026-01-07.md) - Lessons learned
- [epic-8-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-8-retro-2026-01-07.md) - Latest patterns
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [Story 3.1](./3-1-16-canonical-states-plus-transitions.md) - State machine reference
- [Story 3.4](./3-4-workflow-logs-timeline-thread-view.md) - Workflow log patterns
- [Story 3.6](./3-6-sla-calculator-business-days-plus-cutoff-17-00.md) - SLA calculation reference
- [Story 9.1](./9-1-cancel-withdraw-actions.md) - Exception handling patterns
- [Story 9.2](./9-2-reject-action.md) - Exception handling patterns
