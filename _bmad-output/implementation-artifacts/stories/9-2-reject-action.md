# Story 9.2: Reject Action (Từ chối đề tài)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 8 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Decision Maker (Khoa/Hội đồng/BGH),
I want từ chối đề tài với lý do rõ ràng,
So that hồ sơ bị reject với ghi chú đầy đủ và PI được thông báo.

## Acceptance Criteria

1. **AC1: Reject Dialog with Reason**
   - Given User có quyền reject (role phù hợp + state phù hợp)
   - When User click "Từ chối đề tài"
   - Then UI hiển thị Reject dialog:
     - Reason code dropdown (required):
       - "Không đạt tiêu chuẩn khoa học"
       - "Nội dung không khả thi"
       - "Kinh phí không hợp lý"
       - "Không phù hợp quy định"
       - "Khác"
     - Comment field (required, textarea, max 500 characters)
     - Button "Xác nhận từ chối" và "Hủy"

2. **AC2: Reject Execution**
   - Given User đã chọn reason code và điền comment
   - When User click "Xác nhận từ chối" (kèm idempotencyKey)
   - Then:
     - proposal.state chuyển từ current state → REJECTED
     - proposal.holder_unit = decision_maker_unit
     - proposal.holder_user = decision_maker_id
     - proposal.rejected_at = now()
     - proposal.rejected_by = decision_maker_id
     - workflow_logs entry được tạo với action = REJECT
     - reason_code và comment được lưu trong workflow log

3. **AC3: RBAC - Who Can Reject**
   - Given User có role sau và proposal ở state tương ứng:
     - QUAN_LY_KHOA có thể reject từ FACULTY_REVIEW, CHANGES_REQUESTED
     - PHONG_KHCN có thể reject từ SCHOOL_SELECTION_REVIEW, FACULTY_REVIEW, CHANGES_REQUESTED
     - HOI_DONG (THU_KY_HOI_DONG, THANH_TRUNG) có thể reject từ OUTLINE_COUNCIL_REVIEW
     - BGH có thể reject từ FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW, CHANGES_REQUESTED
   - When User với quyền đúng click "Từ chối đề tài"
   - Then action được phép
   - And Given User không có quyền reject cho state hiện tại
   - When User cố g reject
   - Then return 403 Forbidden

4. **AC4: Reject Only From Review States**
   - Given Proposal ở terminal state (COMPLETED, CANCELLED, WITHDRAWN, REJECTED)
   - When User cố g reject
   - Then return 400 Bad Request với message "Không thể từ chối đề tài ở trạng thái này"

5. **AC5: Notification to PI**
   - Given Reject action thành công
   - When proposal bị reject
   - Then:
     - PI (proposal.owner) nhận notification
     - Notification chứa: proposal code, reason code, comment, decision maker name
     - Proposal xuất hiện trong queue "Của tôi" của PI với badge REJECTED

6. **AC6: Idempotency**
   - Given User double-click "Từ chối đề tài"
   - When 2 requests đến gần như cùng lúc với cùng idempotencyKey
   - Then chỉ 1 action được execute
   - And request thứ 2 nhận result đã cached

7. **AC7: Vietnamese Localization**
   - All error messages trong Vietnamese
   - All UI text trong Vietnamese
   - Workflow log comments trong Vietnamese

## Tasks / Subtasks

- [x] Task 1: Backend - Add WorkflowAction Enum Value (AC: #2)
  - [x] Add REJECT to WorkflowAction enum in schema.prisma
  - [x] Run prisma migrate

- [x] Task 2: Backend - Reject DTO (AC: #1, #6)
  - [x] Create RejectProposalDto với proper typing
  - [x] Fields: reasonCode (enum), comment (string, required), idempotencyKey
  - [x] Add validation - NO as unknown/as any casts (Epic 7/8 retro)

- [x] Task 3: Backend - Reject Reason Code Enum (AC: #1)
  - [x] Create RejectReasonCode enum
  - [x] Values: NOT_SCIENTIFIC, NOT_FEASIBLE, BUDGET_UNREASONABLE, NOT_COMPLIANT, OTHER

- [x] Task 4: Backend - Reject Service Logic (AC: #2, #3, #4)
  - [x] Create rejectProposal() method in WorkflowService
  - [x] Validate state is not terminal
  - [x] Validate user has permission to reject (RBAC matrix)
  - [x] Set rejected_at, rejected_by fields
  - [x] Update holder về decision maker
  - [x] Log workflow action với proper enum (WorkflowAction.REJECT)

- [x] Task 5: Backend - Reject Endpoint (AC: #3, #6)
  - [x] Create POST /proposals/:id/reject endpoint
  - [x] Add RBAC guard: @RequireRoles with state-based permission check
  - [x] Apply IdempotencyInterceptor
  - [x] Return 403 if user not authorized
  - [x] Return 400 if state is terminal

- [x] Task 6: Backend - Notification to PI (AC: #5)
  - [x] Send notification cho proposal.owner khi reject
  - [x] Notification includes: reason code, comment, decision maker info
  - [x] Use NotificationService (existing from Epic 8)

- [x] Task 7: Frontend - Reject Button (AC: #3, #7)
  - [x] Add "Từ chối đề tài" button for authorized users/states
  - [x] Hide button if:
     - User không có quyền reject cho state hiện tại
     - Proposal ở terminal state
  - [x] Show loading state during processing

- [x] Task 8: Frontend - Reject Dialog (AC: #1, #7)
  - [x] Create RejectConfirmDialog component
  - [x] Reason code dropdown (required)
  - [x] Comment textarea (required, max 500 chars)
  - [x] "Xác nhận từ chối" và "Hủy" buttons
  - [x] Character counter for comment field
  - [x] Vietnamese labels

- [x] Task 9: Unit Tests (AC: #1, #2, #3, #4, #6)
  - [x] Test reject từ FACULTY_REVIEW → REJECTED
  - [x] Test reject từ OUTLINE_COUNCIL_REVIEW → REJECTED
  - [x] Test reject blocked cho terminal states
  - [x] Test reject blocked cho unauthorized users
  - [x] Test idempotency với double-click
  - [x] Test rejected_at, rejected_by được set đúng
  - [x] Test workflow log contains reason code và comment

- [x] Task 10: Integration Tests (AC: #2, #5)
  - [x] Test full reject flow: UI → API → database → workflow log → notification
  - [x] Test notification được gửi cho PI
  - [x] Test proposal xuất hiện trong PI's queue sau reject

## Dev Notes

### Epic 9 Context

**Epic 9: Exceptions (Pause/Cancel/Withdraw/Reject)**
- FRs covered: FR43 (Cancel/Withdraw), FR44 (Reject), FR45 (Pause/Resume)
- Story 9.1: Cancel/Withdraw Actions
- Story 9.2: Reject Action (THIS STORY)
- Story 9.3: Pause/Resume (PHONG_KHCN only)

**Epic Objective:**
Xử lý các exception states trong proposal lifecycle - cancel, withdraw, reject, pause/resume.

### Dependencies

**Depends on:**
- Story 3.1 (16 canonical states) - For state machine understanding
- Story 3.4 (workflow logs) - For audit trail pattern
- Story 9.1 (Cancel/Withdraw) - For exception handling patterns
- Epic 8 (completed) - For NotificationService, RBAC patterns

**Enables:**
- Story 9.3 (Pause/Resume) - Reuses exception handling patterns

### Epic 7 & 8 Retro Learnings to Apply (CRITICAL)

From `epic-7-retro-2026-01-07.md` and `epic-8-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const rejectData = dto as unknown as Prisma.InputJsonValue;

// ✅ CORRECT - Epic 7/8 retro pattern:
interface RejectProposalData {
  proposalId: string;
  reasonCode: RejectReasonCode;
  comment: string;
  rejectedBy: string;
  rejectedAt: Date;
}
const rejectData: RejectProposalData = {
  proposalId: proposal.id,
  reasonCode: dto.reasonCode,
  comment: dto.comment,
  rejectedBy: user.id,
  rejectedAt: new Date(),
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation (11 instances), Epic 8 found 2 more:
const reasonData = (reason as any).label;

// ✅ CORRECT - Define proper interface:
interface RejectReason {
  code: RejectReasonCode;
  label: string;
  description: string;
}
const reasonData: RejectReason = REJECT_REASONS[dto.reasonCode];
```

**3. Use WorkflowAction Enum Directly** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
action: WorkflowAction.REJECT as unknown as AuditAction

// ✅ CORRECT - Use enum directly:
import { WorkflowAction } from '@prisma/client';
action: WorkflowAction.REJECT  // Direct usage
```

**4. Proper Decorator Usage** ⚠️ Epic 8 Finding
```typescript
// ❌ WRONG - Epic 8 violation:
@Get('reason') reason?: string,  // @Get() là route decorator

// ✅ CORRECT - Use @Body() cho POST endpoints:
@Body('reason') reason?: string,
```

**5. State Machine Validation** (Epic 8 pattern)
```typescript
// Validate state transition before executing
const REJECTABLE_STATES = [
  ProjectState.FACULTY_REVIEW,
  ProjectState.SCHOOL_SELECTION_REVIEW,
  ProjectState.OUTLINE_COUNCIL_REVIEW,
  ProjectState.CHANGES_REQUESTED,
];

if (!REJECTABLE_STATES.includes(proposal.state)) {
  throw new BadRequestException(
    'Không thể từ chối đề tài ở trạng thái này'
  );
}
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
    workflow.service.ts       # Extend: Add rejectProposal()
    dto/
      reject-proposal.dto.ts  # New: RejectProposalDto
    enums/
      reject-reason-code.enum.ts # New: RejectReasonCode enum
  exceptions/
    exceptions.controller.ts  # Extend: Add reject endpoint
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    proposals/
      [id]/
        components/
          RejectConfirmDialog.tsx # New: Reject confirmation dialog
  lib/
    constants/
      reject-reasons.ts         # New: Reason code options
```

### Architecture Compliance

**WorkflowAction Enum Addition:**
```prisma
enum WorkflowAction {
  // ... existing values ...
  REJECT                 // Từ chối đề tài (Story 9.2)
}
```

**RejectReasonCode Enum:**
```typescript
export enum RejectReasonCode {
  NOT_SCIENTIFIC = 'NOT_SCIENTIFIC',           // Không đạt tiêu chuẩn khoa học
  NOT_FEASIBLE = 'NOT_FEASIBLE',               // Nội dung không khả thi
  BUDGET_UNREASONABLE = 'BUDGET_UNREASONABLE', // Kinh phí không hợp lý
  NOT_COMPLIANT = 'NOT_COMPLIANT',             // Không phù hợp quy định
  OTHER = 'OTHER',                             // Khác
}

export const REJECT_REASON_LABELS: Record<RejectReasonCode, string> = {
  [RejectReasonCode.NOT_SCIENTIFIC]: 'Không đạt tiêu chuẩn khoa học',
  [RejectReasonCode.NOT_FEASIBLE]: 'Nội dung không khả thi',
  [RejectReasonCode.BUDGET_UNREASONABLE]: 'Kinh phí không hợp lý',
  [RejectReasonCode.NOT_COMPLIANT]: 'Không phù hợp quy định',
  [RejectReasonCode.OTHER]: 'Khác',
};
```

**RBAC Matrix for Reject:**
```typescript
// Role + State combinations that can reject
const REJECT_PERMISSIONS: Record<UserRole, ProjectState[]> = {
  [UserRole.QUAN_LY_KHOA]: [
    ProjectState.FACULTY_REVIEW,
    ProjectState.CHANGES_REQUESTED,
  ],
  [UserRole.PHONG_KHCN]: [
    ProjectState.SCHOOL_SELECTION_REVIEW,
    ProjectState.FACULTY_REVIEW,
    ProjectState.CHANGES_REQUESTED,
  ],
  [UserRole.THU_KY_HOI_DONG]: [
    ProjectState.OUTLINE_COUNCIL_REVIEW,
  ],
  [UserRole.THANH_TRUNG]: [
    ProjectState.OUTLINE_COUNCIL_REVIEW,
  ],
  [UserRole.BGH]: [
    ProjectState.FACULTY_REVIEW,
    ProjectState.SCHOOL_SELECTION_REVIEW,
    ProjectState.OUTLINE_COUNCIL_REVIEW,
    ProjectState.CHANGES_REQUESTED,
  ],
  [UserRole.GIANG_VIEN]: [],  // Cannot reject
  [UserRole.ADMIN]: [],       // Cannot reject (technical role)
};

// Permission check function
function canReject(user: User, proposalState: ProjectState): boolean {
  const allowedStates = REJECT_PERMISSIONS[user.role] || [];
  return allowedStates.includes(proposalState);
}
```

### Data Model

**Reject Proposal DTO:**
```typescript
import { IsEnum, IsString, MinLength, MaxLength, IsUUID } from 'class-validator';
import { RejectReasonCode } from '../enums/reject-reason-code.enum';

export class RejectProposalDto {
  @IsEnum(RejectReasonCode, {
    message: 'Lý do từ chối không hợp lệ'
  })
  reasonCode: RejectReasonCode;

  @IsString()
  @MinLength(10, {
    message: 'Giải thích phải có ít nhất 10 ký tự'
  })
  @MaxLength(500, {
    message: 'Giải thích không được quá 500 ký tự'
  })
  comment: string;

  @IsUUID('4')
  idempotencyKey: string;
}
```

**Database Schema Updates:**
```prisma
model Proposal {
  // ... existing fields ...

  // Rejection tracking
  rejectedAt    DateTime?
  rejectedBy    String?   @relation("RejectedBy", fields: [rejectedById], references: [id])
  rejectedById  String?

  rejectedByUser User?    @relation("RejectedBy", fields: [rejectedById], references: [id])

  // ... indexes ...
  @@index([rejectedAt])
  @@index([rejectedById])
}
```

### State Machine Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      REJECT TRANSITIONS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Any review state ────────► REJECTED                        │
│   (by authorized role)                                        │
│                                                              │
│   Rejectable states:                                         │
│     • FACULTY_REVIEW        → QUAN_LY_KHOA, PHONG_KHCN      │
│     • SCHOOL_SELECTION_REVIEW → PHONG_KHCN                   │
│     • OUTLINE_COUNCIL_REVIEW → THU_KY_HOI_DONG, THANH_TRUNG │
│     • CHANGES_REQUESTED      → QUAN_LY_KHOA, PHONG_KHCN      │
│                                                              │
│   BGH có thể reject từ: FACULTY_REVIEW, SCHOOL_SELECTION_REVIEW, OUTLINE_COUNCIL_REVIEW, CHANGES_REQUESTED               │
│                                                              │
│   REJECTED là terminal state (HOLDER = DECISION MAKER)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Vietnamese Localization

All UI text and error messages must be in Vietnamese:

**UI Text:**
- "Từ chối đề tài" (Reject Proposal)
- "Lý do từ chối" (Reason for rejection)
- "Giải thích chi tiết" (Detailed explanation)
- "Xác nhận từ chối" (Confirm Reject)
- "Hủy" (Cancel)
- "Đang xử lý..." (Processing...)
- "Bạn có chắc muốn từ chối đề tài này?" (Confirm reject message)

**Reason Code Labels:**
- "Không đạt tiêu chuẩn khoa học" (Not scientifically sound)
- "Nội dung không khả thi" (Not feasible)
- "Kinh phí không hợp lý" (Unreasonable budget)
- "Không phù hợp quy định" (Not compliant with regulations)
- "Khác" (Other)

**Error Messages:**
- "Không thể từ chối đề tài ở trạng thái này" (Cannot reject proposal in this state)
- "Bạn không có quyền từ chối đề tài này" (You don't have permission to reject)
- "Vui lòng chọn lý do từ chối" (Please select a reason)
- "Giải thích phải có ít nhất 10 ký tự" (Explanation must be at least 10 characters)
- "Đề tài không tồn tại" (Proposal not found)
- "Đề tài đã bị từ chối trước đó" (Proposal already rejected)

### Code Patterns to Follow

**Proper Reject Implementation (Epic 7/8 Retro Pattern):**
```typescript
// WorkflowService.rejectProposal()
async rejectProposal(
  proposalId: string,
  dto: RejectProposalDto,
  context: TransitionContext,
): Promise<ProposalDto> {
  // Fetch proposal with proper typing
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      state: true,
      code: true,
      title: true,
      ownerId: true,
      holderUnit: true,
      holderUser: true,
    },
  });

  if (!proposal) {
    throw new NotFoundException('Đề tài không tồn tại');
  }

  // State validation - reject only from review states
  const REJECTABLE_STATES = [
    ProjectState.FACULTY_REVIEW,
    ProjectState.SCHOOL_SELECTION_REVIEW,
    ProjectState.OUTLINE_COUNCIL_REVIEW,
    ProjectState.CHANGES_REQUESTED,
  ];

  if (!REJECTABLE_STATES.includes(proposal.state)) {
    throw new BadRequestException(
      'Không thể từ chối đề tài ở trạng thái này'
    );
  }

  // Already rejected check
  if (proposal.state === ProjectState.REJECTED) {
    throw new BadRequestException('Đề tài đã bị từ chối trước đó');
  }

  // RBAC check - validate user has permission
  if (!this.canReject(context.user, proposal.state)) {
    throw new ForbiddenException('Bạn không có quyền từ chối đề tài này');
  }

  // Get decision maker info for logging
  const decisionMakerUnit = context.user.facultyId || context.user.unit || 'SYSTEM';

  // Execute reject - using Prisma's typed update
  const updated = await this.prisma.proposal.update({
    where: { id: proposalId },
    data: {
      state: ProjectState.REJECTED,
      holderUnit: decisionMakerUnit,
      holderUser: context.userId,
      rejectedAt: new Date(),
      rejectedById: context.userId,
    },
  });

  // Log workflow action - Direct enum usage (Epic 7/8 retro)
  await this.prisma.workflowLog.create({
    data: {
      proposalId: proposal.id,
      action: WorkflowAction.REJECT,  // Direct enum, NO double cast
      fromState: proposal.state,
      toState: ProjectState.REJECTED,
      actorId: context.userId,
      actorName: context.userDisplayName,
      reasonCode: dto.reasonCode,
      comment: dto.comment,
      timestamp: new Date(),
    },
  });

  // Send notification to PI
  await this.notificationService.send({
    recipientId: proposal.ownerId,
    type: NotificationType.PROPOSAL_REJECTED,
    proposalId: proposal.id,
    proposalCode: proposal.code,
    title: `Đề tài ${proposal.code} bị từ chối`,
    message: this.buildRejectMessage(dto, context.userDisplayName, proposal),
    metadata: {
      reasonCode: dto.reasonCode,
      comment: dto.comment,
      rejectedBy: context.userDisplayName,
    },
  });

  return this.mapToDto(updated);
}

// Helper method for RBAC check
private canReject(user: User, proposalState: ProjectState): boolean {
  const REJECT_PERMISSIONS: Record<UserRole, ProjectState[]> = {
    [UserRole.QUAN_LY_KHOA]: [
      ProjectState.FACULTY_REVIEW,
      ProjectState.CHANGES_REQUESTED,
    ],
    [UserRole.PHONG_KHCN]: [
      ProjectState.SCHOOL_SELECTION_REVIEW,
      ProjectState.FACULTY_REVIEW,
      ProjectState.CHANGES_REQUESTED,
    ],
    [UserRole.THU_KY_HOI_DONG]: [ProjectState.OUTLINE_COUNCIL_REVIEW],
    [UserRole.THANH_TRUNG]: [ProjectState.OUTLINE_COUNCIL_REVIEW],
    [UserRole.BGH]: [
      ProjectState.FACULTY_REVIEW,
      ProjectState.SCHOOL_SELECTION_REVIEW,
      ProjectState.OUTLINE_COUNCIL_REVIEW,
      ProjectState.CHANGES_REQUESTED,
    ],
    [UserRole.GIANG_VIEN]: [],
    [UserRole.ADMIN]: [],
  };

  const allowedStates = REJECT_PERMISSIONS[user.role] || [];
  return allowedStates.includes(proposalState);
}

// Helper method to build reject notification message
private buildRejectMessage(
  dto: RejectProposalDto,
  rejecterName: string,
  proposal: Proposal,
): string {
  const reasonLabel = REJECT_REASON_LABELS[dto.reasonCode];
  return `${rejecterName} đã từ chối đề tài "${proposal.title}".
Lý do: ${reasonLabel}.
Giải thích: ${dto.comment}`;
}
```

**Controller Implementation:**
```typescript
@Post('proposals/:id/reject')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(
  UserRole.QUAN_LY_KHOA,
  UserRole.PHONG_KHCN,
  UserRole.THU_KY_HOI_DONG,
  UserRole.THANH_TRUNG,
  UserRole.BGH,
)
@UseInterceptors(IdempotencyInterceptor)
async rejectProposal(
  @Param('id', ParseUUIDPipe) proposalId: string,
  @Body() dto: RejectProposalDto,
  @CurrentUser() user: User,
  @Headers('idempotency-key') idempotencyKey: string,
) {
  const result = await this.workflowService.rejectProposal(
    proposalId,
    dto,
    {
      userId: user.id,
      userDisplayName: user.displayName,
      user,
      idempotencyKey,
    },
  );

  return {
    success: true,
    data: result,
  };
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 7/8 Retro):**
```typescript
describe('WorkflowService.rejectProposal', () => {
  const mockContext = {
    userId: 'decision-maker-id',
    userDisplayName: 'Nguyễn Văn A',
    user: { id: 'decision-maker-id', role: UserRole.QUAN_LY_KHOA },
    idempotencyKey: uuid.v4(),
  };

  it('should reject proposal from FACULTY_REVIEW to REJECTED', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
    });
    const dto: RejectProposalDto = {
      reasonCode: RejectReasonCode.NOT_SCIENTIFIC,
      comment: 'Nội dung không đủ mới',
      idempotencyKey: uuid.v4(),
    };

    const result = await service.rejectProposal(proposal.id, dto, mockContext);

    expect(result.state).toBe(ProjectState.REJECTED);
    expect(result.rejectedAt).toBeDefined();
    expect(result.rejectedById).toBe(mockContext.userId);
  });

  it('should reject proposal from review state with proper reason', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.OUTLINE_COUNCIL_REVIEW,
    });
    const dto: RejectProposalDto = {
      reasonCode: RejectReasonCode.NOT_FEASIBLE,
      comment: 'Phương pháp không khả thi với nguồn lực hiện có',
      idempotencyKey: uuid.v4(),
    };

    const result = await service.rejectProposal(proposal.id, dto, mockContext);

    // Verify workflow log contains reason
    const log = await prisma.workflowLog.findFirst({
      where: { proposalId: proposal.id, action: WorkflowAction.REJECT },
    });
    expect(log.reasonCode).toBe(RejectReasonCode.NOT_FEASIBLE);
    expect(log.comment).toBe(dto.comment);
  });

  it('should reject if state is terminal', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.COMPLETED,
    });
    const dto: RejectProposalDto = {
      reasonCode: RejectReasonCode.OTHER,
      comment: 'Test',
      idempotencyKey: uuid.v4(),
    };

    await expect(
      service.rejectProposal(proposal.id, dto, mockContext)
    ).rejects.toThrow('Không thể từ chối đề tài ở trạng thái này');
  });

  it('should reject if user lacks permission', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.OUTLINE_COUNCIL_REVIEW,
    });
    const unauthorizedContext = {
      ...mockContext,
      user: { ...mockContext.user, role: UserRole.GIANG_VIEN },
    };
    const dto: RejectProposalDto = {
      reasonCode: RejectReasonCode.OTHER,
      comment: 'Test',
      idempotencyKey: uuid.v4(),
    };

    await expect(
      service.rejectProposal(proposal.id, dto, unauthorizedContext)
    ).rejects.toThrow('Bạn không có quyền từ chối đề tài này');
  });

  it('should validate comment length', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
    });
    const dto: RejectProposalDto = {
      reasonCode: RejectReasonCode.OTHER,
      comment: 'Short',  // Less than 10 characters
      idempotencyKey: uuid.v4(),
    };

    await expect(
      service.rejectProposal(proposal.id, dto, mockContext)
    ).rejects.toThrow('Giải thích phải có ít nhất 10 ký tự');
  });

  it('should send notification to PI after reject', async () => {
    const ownerId = 'owner-id';
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
      ownerId,
    });
    const dto: RejectProposalDto = {
      reasonCode: RejectReasonCode.BUDGET_UNREASONABLE,
      comment: 'Kinh phí quá cao so với quy mô',
      idempotencyKey: uuid.v4(),
    };

    await service.rejectProposal(proposal.id, dto, mockContext);

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: ownerId,
        type: NotificationType.PROPOSAL_REJECTED,
      })
    );
  });

  it('should handle idempotency correctly', async () => {
    const proposal = await createTestProposal({
      state: ProjectState.FACULTY_REVIEW,
    });
    const idempotencyKey = uuid.v4();
    const dto: RejectProposalDto = {
      reasonCode: RejectReasonCode.OTHER,
      comment: 'Valid comment for reject',
      idempotencyKey,
    };

    const result1 = await service.rejectProposal(proposal.id, dto, {
      ...mockContext,
      idempotencyKey,
    });
    const result2 = await service.rejectProposal(proposal.id, dto, {
      ...mockContext,
      idempotencyKey,
    });

    expect(result1).toEqual(result2);  // Same result returned

    // Only one workflow log entry
    const logs = await prisma.workflowLog.findMany({
      where: { proposalId: proposal.id, action: WorkflowAction.REJECT },
    });
    expect(logs).toHaveLength(1);
  });
});
```

### Error Handling Pattern

**Vietnamese Error Messages:**
```typescript
export const REJECT_ERRORS = {
  // State errors
  CANNOT_REJECT_TERMINAL: 'Không thể từ chối đề tài ở trạng thái này',
  ALREADY_REJECTED: 'Đề tài đã bị từ chối trước đó',

  // Permission errors
  INSUFFICIENT_PERMISSIONS: 'Bạn không có quyền từ chối đề tài này',
  NOT_AUTHORIZED_FOR_STATE: (role: string, state: string) =>
    `Vai trò ${role} không có quyền từ chối khi đề tài ở trạng thái ${state}`,

  // Validation errors
  PROPOSAL_NOT_FOUND: 'Đề tài không tồn tại',
  REASON_REQUIRED: 'Vui lòng chọn lý do từ chối',
  COMMENT_TOO_SHORT: 'Giải thích phải có ít nhất 10 ký tự',
  COMMENT_TOO_LONG: 'Giải thích không được quá 500 ký tự',

  // General
  REJECT_FAILED: 'Từ chối đề tài thất bại. Vui lòng thử lại.',
} as const;
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 9-2 created via create-story workflow. Status: ready-for-dev
- Epic 7 & 8 retrospective learnings applied (type safety, no as unknown/as any)
- WorkflowAction.REJECT enum value to be added
- RejectReasonCode enum defined
- Proper DTO mapping pattern specified
- RBAC matrix for reject permissions defined
- Idempotency for duplicate prevention
- Tests mandated per Epic 7/8 retro lessons
- Vietnamese localization for all messages
- Notification to PI on reject
- Terminal state holder rules applied
- State transition validation

### File List

**To Create:**
- `qlnckh/apps/src/modules/workflow/dto/reject-proposal.dto.ts` - Reject DTO
- `qlnckh/apps/src/modules/workflow/enums/reject-reason-code.enum.ts` - Reason code enum
- `qlnckh/web-apps/src/app/proposals/[id]/components/RejectConfirmDialog.tsx` - Reject dialog
- `qlnckh/web-apps/src/lib/constants/reject-reasons.ts` - Reason code labels

**To Modify:**
- `qlnckh/apps/src/modules/workflow/workflow.service.ts` - Add rejectProposal(), canReject()
- `qlnckh/apps/src/modules/workflow/exceptions.controller.ts` - Add reject endpoint
- `qlnckh/prisma/schema.prisma` - Add REJECT to WorkflowAction; Add rejectedAt, rejectedById to Proposal
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 7 & 8 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper DTO mapping pattern specified
  - WorkflowAction enum pattern (direct usage, no double cast)
  - RBAC matrix for reject permissions defined
  - Tests mandated per Epic 7/8 retro lessons
  - Vietnamese localization for all messages
  - Exception handling patterns established
  - Notification to PI on reject
  - Ready for dev-story workflow execution

## References

- [epics.md Story 9.2](../../planning-artifacts/epics.md#L2223-L2247) - Full requirements
- [epic-7-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-7-retro-2026-01-07.md) - Lessons learned
- [epic-8-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-8-retro-2026-01-07.md) - Latest patterns
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [Story 3.1](./3-1-16-canonical-states-plus-transitions.md) - State machine reference
- [Story 3.4](./3-4-workflow-logs-timeline-thread-view.md) - Workflow log patterns
- [Story 9.1](./9-1-cancel-withdraw-actions.md) - Exception handling patterns
