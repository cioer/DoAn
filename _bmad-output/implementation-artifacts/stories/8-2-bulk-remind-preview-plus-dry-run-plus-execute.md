# Story 8.2: Bulk Remind (Preview + Dry-Run + Execute)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 7 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required -->

## Story

As a PKHCN (Phòng Khoa học Công nghệ),
I want gửi email nhắc nhở hàng loạt,
So that tôi nhắc nhiều người cùng lúc.

## Acceptance Criteria

1. **AC1: Bulk Remind Dialog**
   - Given User có role = PHONG_KHCN
   - When User chọn ≥ 1 proposals và click "Gửi email nhắc"
   - Then UI hiển thị Bulk Remind dialog:
     - Danh sách recipients (unique holder_users grouped)
     - Email template preview (fixed trong MVP)
     - Button "Gửi"

2. **AC2: Recipient Grouping**
   - Given User đã chọn multiple proposals
   - When Bulk Remind dialog opens
   - Then system nhóm recipients theo holder_user:
     - Mỗi recipient nhận một email với tất cả proposals của họ
     - Không gửi trùng email cho cùng recipient

3. **AC3: Dry-Run Validation**
   - Given User click "Gửi"
   - When server receives request
   - Then server thực hiện dry-run:
     - Validate tất cả recipients có email address
     - Validate email service available
     - Return validation result trước khi gửi thực

4. **AC4: Email Execution**
   - Given Dry-run pass
   - When Email sending execute
   - Then server:
     - Gửi email cho từng recipient
     - Track sent vs failed
     - Return report: `{ sent: X, failed: Y, errors: [...] }`

5. **AC5: Email Content**
   - Given Email được gửi
   - When recipient nhận email
   - Then Email chứa:
     - Greeting: "Kính gửi {recipient_name}"
     - Proposal list (title + SLA status)
     - Deadline info
     - Link trực tiếp đến proposal

6. **AC6: RBAC Authorization**
   - Given User KHÔNG có role = PHONG_KHCN
   - When User cố gắng gửi bulk remind
   - Then return 403 Forbidden với Vietnamese message

7. **AC7: Audit Trail**
   - Given Email được gửi thành công
   - When operation complete
   - Then system ghi audit log:
     - action: BULK_REMIND
     - sent_count, failed_count
     - recipient list

## Tasks / Subtasks

- [ ] Task 1: Backend - Add WorkflowAction Enum (AC: #7)
  - [ ] Add BULK_REMIND to WorkflowAction enum in schema.prisma
  - [ ] Run prisma migrate

- [ ] Task 2: Backend - Email Service (AC: #4, #5)
  - [ ] Create EmailService with sendReminder() method
  - [ ] Implement email template for reminders (Vietnamese)
  - [ ] Integrate with email provider (SendGrid/Nodemailer/Mailgun)
  - [ ] Handle email sending errors gracefully

- [ ] Task 3: Backend - Bulk Remind DTO (AC: #1, #2, #3)
  - [ ] Create BulkRemindDto with proper typing
  - [ ] Fields: proposalIds (string[]), dryRun (boolean)
  - [ ] Add validation: proposalIds min 1, max 100

- [ ] Task 4: Backend - Recipient Grouping Logic (AC: #2)
  - [ ] Implement groupRecipientsByHolder() method
  - [ ] Query proposals with their holder_user
  - [ ] Group by holder_user, collect proposal details
  - [ ] Return RecipientGroup[] with user info + proposals

- [ ] Task 5: Backend - Bulk Remind Service (AC: #3, #4, #7)
  - [ ] Create bulkRemind() method in NotificationService
  - [ ] Perform dry-run validation first
  - [ ] Send emails sequentially for each recipient
  - [ ] Collect results: sent, failed, errors
  - [ ] Log audit action with proper enum (WorkflowAction.BULK_REMIND)
  - [ ] Return BulkRemindResult

- [ ] Task 6: Backend - Bulk Remind Endpoint (AC: #1, #6)
  - [ ] Create POST /notifications/bulk-remind endpoint
  - [ ] Add RBAC guard: @RequireRoles(UserRole.PHONG_KHCN)
  - [ ] Apply IdempotencyInterceptor
  - [ ] Return BulkRemindResult response

- [ ] Task 7: Frontend - Bulk Remind Dialog (AC: #1, #2)
  - [ ] Create BulkRemindDialog component
  - [ ] Show grouped recipients list
  - [ ] Show email preview
  - [ ] "Gửi" and "Hủy" buttons
  - [ ] Loading state during sending

- [ ] Task 8: Frontend - Result Display (AC: #4)
  - [ ] Display sent/failed counts
  - [ ] Show error details for failed sends
  - [ ] Success notification

- [ ] Task 9: Unit Tests (AC: #3, #4, #5, #6, #7)
  - [ ] Test recipient grouping logic
  - [ ] Test dry-run validation with invalid emails
  - [ ] Test email sending success scenario
  - [ ] Test email sending partial failure
  - [ ] Test RBAC for non-PKHCN users
  - [ ] Test audit log creation

- [ ] Task 10: Integration Tests (AC: #4, #5)
  - [ ] Test full flow: select → preview → send
  - [ ] Test email content rendering
  - [ ] Test concurrent bulk remind operations

## Dev Notes

### Epic 8 Context

**Epic 8: Bulk Actions & Reports**
- FRs covered: FR37 (Bulk Assign), FR38 (Bulk Remind), FR39 (Export Excel)
- Story 8.1: Bulk Assign (done)
- **Story 8.2: Bulk Remind (THIS STORY)**
- Story 8.3: Export Excel (pending)
- Story 8.4: Morning Check Dashboard (pending)

### Dependencies

**Depends on:**
- Story 3.5 (queue filters) - For holder_user context
- Story 3.6 (SLA calculator) - For SLA status in email
- Story 8.1 (Bulk Assign) - Reuses bulk operation patterns

**Enables:**
- Story 8.4 (Morning Check Dashboard) - May use remind functionality

### Epic 7 Retro Learnings to Apply (CRITICAL)

From `epic-7-retro-2026-01-07.md`:

**1. NO `as unknown` Casting**
```typescript
// ❌ WRONG:
const emailData = reminderData as unknown as Prisma.InputJsonValue;

// ✅ CORRECT:
interface ReminderEmailData {
  recipientName: string;
  recipientEmail: string;
  proposals: ProposalReminderInfo[];
  sendDate: Date;
}
const emailData: ReminderEmailData = {
  recipientName: user.displayName,
  recipientEmail: user.email,
  proposals: proposalInfos,
  sendDate: new Date(),
};
```

**2. NO `as any` Casting**
```typescript
// ❌ WRONG:
const userEmail = (user as any).email;

// ✅ CORRECT:
interface UserWithEmail {
  id: string;
  displayName: string;
  email: string;
}
const userEmail: UserWithEmail = user;
```

**3. Use WorkflowAction Enum Directly**
```typescript
// ❌ WRONG:
action: WorkflowAction.BULK_REMIND as unknown as AuditAction

// ✅ CORRECT:
import { WorkflowAction } from '@prisma/client';
action: WorkflowAction.BULK_REMIND
```

**4. File Operations OUTSIDE Transactions**
```typescript
// For email sending: Not a file operation, but external API
// Pattern: Validate first (dry-run), then execute
// If execution fails, log error but don't rollback
```

**5. Tests MUST Be Written**
```typescript
// Epic 7 retro finding: No tests → bugs not caught
// Epic 8 REQUIREMENT: Tests for email service
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  notifications/
    notifications.controller.ts  # New: Notification endpoints
    notifications.service.ts     # New: Bulk remind service
    email/
      email.service.ts           # New: Email sending
      email.template.ts          # New: Email templates (Vietnamese)
    dto/
      bulk-remind.dto.ts         # New: BulkRemindDto, BulkRemindResultDto
    notifications.module.ts      # New: Module definition
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    notifications/
      BulkRemindDialog.tsx       # New: Remind dialog with preview
  lib/api/
    notifications.ts             # New: Notifications API client
```

### Architecture Compliance

**WorkflowAction Enum Addition:**
```prisma
enum WorkflowAction {
  // ... existing values ...
  BULK_ASSIGN           // Gán holder_user hàng loạt (Story 8.1)
  BULK_REMIND           // Gửi email nhắc hàng loạt (Story 8.2)
  REMIND_SENT           // Email nhắc đã gửi (per recipient)
}
```

**Email Service Pattern:**
```typescript
@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransporter({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendReminder(
    to: string,
    recipientName: string,
    proposals: ProposalReminderInfo[],
  ): Promise<boolean> {
    const html = this.generateReminderTemplate(recipientName, proposals);

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM'),
        to,
        subject: 'Nhắc nhở hồ sơ nghiên cứu khoa học',
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }
}
```

### Data Model

**Bulk Remind DTO:**
```typescript
import { IsArray, IsString, IsUUID, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class BulkRemindDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  @MinLength(1)
  @MaxLength(100)
  proposalIds: string[];

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;  // If true, only validate, don't send
}
```

**Recipient Group:**
```typescript
interface RecipientGroup {
  userId: string;
  userName: string;
  userEmail: string;
  proposals: ProposalReminderInfo[];
}

interface ProposalReminderInfo {
  id: string;
  code: string;
  title: string;
  slaStatus: 'ok' | 'warning' | 'overdue';
  slaDeadline?: Date;
  daysRemaining?: number;
  overdueDays?: number;
}
```

**Bulk Remind Result DTO:**
```typescript
export class BulkRemindResultDto {
  success: number;           // Emails sent successfully
  failed: number;            // Emails failed to send
  total: number;             // Total unique recipients
  recipients: RemindRecipientResult[];
}

export class RemindRecipientResult {
  userId: string;
  userName: string;
  emailSent: boolean;
  error?: string;
}
```

### Email Template (Vietnamese)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif;">
  <h2>Thông báo nhắc nhở hồ sơ nghiên cứu khoa học</h2>

  <p>Kính gửi <strong>{{recipientName}}</strong>,</p>

  <p>Bạn có <strong>{{proposalCount}}</strong> hồ sơ cần xử lý:</p>

  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
    <tr style="background-color: #f0f0f0;">
      <th>Mã hồ sơ</th>
      <th>Tên đề tài</th>
      <th>Trạng thái SLA</th>
      <th>Thời hạn</th>
    </tr>
    {{#each proposals}}
    <tr>
      <td>{{code}}</td>
      <td>{{title}}</td>
      <td>{{slaStatus}}</td>
      <td>{{deadline}}</td>
    </tr>
    {{/each}}
  </table>

  <p>Vui lòng đăng nhập hệ thống để xử lý: <a href="{{appUrl}}">{{appUrl}}</a></p>

  <p>Trân trọng,<br>Phòng Khoa học Công nghệ</p>
</body>
</html>
```

### Recipient Grouping Logic

```typescript
// Group proposals by holder_user
async groupRecipientsByHolder(
  proposalIds: string[],
): Promise<RecipientGroup[]> {
  // 1. Get all proposals with their holders
  const proposals = await this.prisma.proposal.findMany({
    where: { id: { in: proposalIds } },
    include: {
      holder: {  // holder_user relation
        select: { id: true, displayName: true, email: true },
      },
    },
    select: {
      id: true,
      code: true,
      title: true,
      holderUser: true,
      slaDeadline: true,
    },
  });

  // 2. Group by holder_user - NO as any casting
  const grouped = new Map<string, ProposalReminderInfo[]>();

  for (const proposal of proposals) {
    if (!proposal.holderUser) continue;

    if (!grouped.has(proposal.holderUser)) {
      grouped.set(proposal.holderUser, []);
    }

    const info: ProposalReminderInfo = {
      id: proposal.id,
      code: proposal.code,
      title: proposal.title,
      slaStatus: this.calculateSlaStatus(proposal),
      slaDeadline: proposal.slaDeadline ?? undefined,
    };

    grouped.get(proposal.holderUser)!.push(info);
  }

  // 3. Create recipient groups - proper typing
  const result: RecipientGroup[] = [];

  for (const [holderUserId, proposalInfos] of grouped.entries()) {
    const user = await this.prisma.user.findUnique({
      where: { id: holderUserId },
      select: { id: true, displayName: true, email: true },
    });

    if (!user || !user.email) continue;

    result.push({
      userId: user.id,
      userName: user.displayName,
      userEmail: user.email,
      proposals: proposalInfos,
    });
  }

  return result;
}
```

### RBAC Authorization

**Authorization Rules:**
- Only PHONG_KHCN can send bulk reminders
- Other roles receive 403 Forbidden

```typescript
@Post('bulk-remind')
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PHONG_KHCN)
async bulkRemind(
  @Body() dto: BulkRemindDto,
  @CurrentUser() user: User,
) {
  // ... implementation
}
```

### Vietnamese Localization

All UI text and error messages must be in Vietnamese:
- "Gửi email nhắc" (Send Reminder)
- "Người nhận" (Recipients)
- "Xem trước" (Preview)
- "Đang gửi..." (Sending...)
- "Đã gửi: X, Thất bại: Y" (Sent: X, Failed: Y)
- "Bạn không có quyền thực hiện thao tác này" (Insufficient permissions)
- "Không tìm thấy email của người dùng" (User email not found)
- "Lỗi gửi email" (Email sending error)

### Testing Standards

**Unit Tests (REQUIRED per Epic 7 Retro):**
```typescript
describe('NotificationService.bulkRemind', () => {
  it('should group recipients by holder_user', async () => {
    // Test grouping logic
  });

  it('should perform dry-run validation', async () => {
    // Test dry-run mode
  });

  it('should send emails to all recipients', async () => {
    // Test email sending
  });

  it('should handle partial email failure', async () => {
    // Test some emails fail
  });

  it('should return 403 for non-PKHCN users', async () => {
    // Test RBAC
  });

  it('should log audit action', async () => {
    // Verify WorkflowAction.BULK_REMIND logged
  });
});
```

### Error Handling Pattern

```typescript
export const BULK_REMIND_ERRORS = {
  EMPTY_LIST: 'Phải chọn ít nhất một hồ sơ',
  NO_RECIPIENTS: 'Không tìm thấy người nhận (không có holder_user)',
  INVALID_EMAIL: (userId: string) => `Người dùng không có email: ${userId}`,
  EMAIL_SERVICE_DOWN: 'Dịch vụ email không khả dụng',
  SEND_FAILED: (email: string) => `Gửi email thất bại cho: ${email}`,
} as const;
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 8-2 created via create-story workflow. Status: ready-for-dev
- Epic 7 retrospective learnings applied (type safety, no as unknown/as any)
- WorkflowAction.BULK_REMIND enum value to be added
- Proper DTO mapping pattern specified
- RBAC for PHONG_KHCN only
- Recipient grouping by holder_user
- Dry-run validation before sending
- Email template in Vietnamese
- Tests required (Epic 7 retro lesson)

### File List

**To Create:**
- `qlnckh/apps/src/modules/notifications/notifications.controller.ts` - Notification endpoints
- `qlnckh/apps/src/modules/notifications/notifications.service.ts` - Bulk remind service
- `qlnckh/apps/src/modules/notifications/email/email.service.ts` - Email sending
- `qlnckh/apps/src/modules/notifications/email/email.template.ts` - Email templates
- `qlnckh/apps/src/modules/notifications/dto/bulk-remind.dto.ts` - DTOs
- `qlnckh/apps/src/modules/notifications/notifications.module.ts` - Module
- `qlnckh/web-apps/src/components/notifications/BulkRemindDialog.tsx` - Dialog
- `qlnckh/web-apps/src/lib/api/notifications.ts` - API client

**To Modify:**
- `qlnckh/prisma/schema.prisma` - Add BULK_REMIND to WorkflowAction enum
- `qlnckh/apps/src/app.module.ts` - Import NotificationsModule

## Change Log

- 2026-01-07: Story created. Status: ready-for-dev
  - Epic 7 retro learnings applied
  - Email service pattern with dry-run validation
  - Recipient grouping by holder_user
  - Vietnamese email template
  - Tests mandated

## References

- [epics.md Story 8.2](../../planning-artifacts/epics.md#L2103-L2134) - Full requirements
- [epic-7-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-7-retro-2026-01-07.md) - Lessons learned
- [Story 8.1](./8-1-bulk-assign-gan-holder-user-hang-loat.md) - Bulk operation patterns
