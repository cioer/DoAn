# Story 8.4: Morning Check Dashboard (KPI + Overdue List)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 7 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required -->

## Story

As a PKHCN/Admin,
I want xem dashboard tổng quan vào buổi sáng,
So that tôi biết bao nhiêu hồ sơ quá hạn.

## Acceptance Criteria

1. **AC1: Dashboard Access**
   - Given User có role = PHONG_KHCN hoặc ADMIN
   - When User mở Dashboard page
   - Then UI hiển thị Morning Check Dashboard

2. **AC2: KPI Cards**
   - Given Dashboard page mở
   - When User xem dashboard
   - Then UI hiển thị KPI cards:
     - Tổng hồ sơ đang chờ (proposals in review states)
     - Hồ sơ quá hạn (overdue proposals)
     - Hồ sơ sắp đến hạn T-2 (within 2 working days)
     - Hồ sơ hoàn thành trong tháng (completed this month)

3. **AC3: KPI Card Interaction**
   - Given KPI cards hiển thị
   - When User click vào KPI card
   - Then UI filter worklist theo KPI đó:
     - "Tổng hồ sơ đang chờ" → Worklist với filter states
     - "Hồ sơ quá hạn" → Worklist với filter overdue
     - "Hồ sơ sắp đến hạn" → Worklist với filter T-2
     - "Hồ sơ hoàn thành trong tháng" → Worklist completed this month

4. **AC4: Overdue List Table**
   - Given Dashboard hiển thị
   - When User scroll xuống
   - Then hiển thị Overdue List table với:
     - Columns: Code, Title, Holder, Overdue Days, SLA Status
     - Button "Gửi nhắc" per row (reuses Story 8.2 functionality)

5. **AC5: Real-time Data**
   - Given Dashboard hiển thị
   - When User refresh page
   - Then KPI numbers updated với latest data

6. **AC6: RBAC Authorization**
   - Given User KHÔNG có role PHONG_KHCN hoặc ADMIN
   - When User cố gắng truy cập Dashboard
   - Then return 403 Forbidden hoặc hide Dashboard menu item

7. **AC7: Quick Actions**
   - Given Dashboard hiển thị
   - When User view dashboard
   - Then UI hiển thị quick actions:
     - "Gửi nhắc tất cả hồ sơ quá hạn" button
     - "Xuất báo cáo" button

## Tasks / Subtasks

- [ ] Task 1: Backend - Dashboard KPI Service (AC: #2, #5)
  - [ ] Create DashboardService
  - [ ] Implement getKpiData() method
  - [ ] Calculate: total waiting, overdue, T-2 warning, completed this month
  - [ ] Return DashboardKpiDto with proper typing

- [ ] Task 2: Backend - Overdue List Query (AC: #4)
  - [ ] Implement getOverdueList() method
  - [ ] Query proposals with slaDeadline < now
  - [ ] Calculate overdue days per proposal
  - [ ] Include holder info
  - [ ] Return OverdueProposalDto[]

- [ ] Task 3: Backend - Dashboard Endpoint (AC: #1, #6)
  - [ ] Create GET /dashboard endpoint
  - [ ] Add RBAC guard: @RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
  - [ ] Return DashboardDataDto (KPI + overdue list)

- [ ] Task 4: Backend - Bulk Remind Overdue (AC: #7)
  - [ ] Create POST /dashboard/remind-overdue endpoint
  - [ ] Get all overdue proposal IDs
  - [ ] Call bulkRemind() from NotificationService
  - [ ] Return remind result

- [ ] Task 5: Frontend - Dashboard Page (AC: #1, #2)
  - [ ] Create Dashboard page component
  - [ ] Add to navigation menu (PHONG_KHCN, ADMIN only)
  - [ ] Create KpiCard components (4 cards)

- [ ] Task 6: Frontend - Overdue List Table (AC: #4)
  - [ ] Create OverdueListTable component
  - [ ] Display overdue proposals
  - [ ] Add "Gửi nhắc" button per row
  - [ ] Integrate with Story 8.2 bulk remind

- [ ] Task 7: Frontend - KPI Card Navigation (AC: #3)
  - [ ] Make KPI cards clickable
  - [ ] Navigate to Worklist with appropriate filter
  - [ ] Pass filter state to worklist

- [ ] Task 8: Frontend - Quick Actions (AC: #7)
  - [ ] Add "Gửi nhắc tất cả quá hạn" button
  - [ ] Add "Xuất báo cáo" button (links to Story 8.3)

- [ ] Task 9: Unit Tests (AC: #2, #4, #5, #6)
  - [ ] Test KPI calculations (total waiting, overdue, T-2, completed)
  - [ ] Test overdue list query
  - [ ] Test overdue days calculation
  - [ ] Test RBAC for unauthorized users
  - [ ] Test KPI updates on refresh

- [ ] Task 10: Integration Tests (AC: #4, #7)
  - [ ] Test full dashboard flow
  - [ ] Test KPI card click navigation
  - [ ] Test bulk remind overdue flow

## Dev Notes

### Epic 8 Context

**Epic 8: Bulk Actions & Reports**
- FRs covered: FR34 (KPI tracking), FR35 (Overdue management), FR36 (Morning check), FR37 (Bulk Assign), FR38 (Bulk Remind), FR39 (Export Excel)
- Story 8.1: Bulk Assign (done)
- Story 8.2: Bulk Remind (done)
- Story 8.3: Export Excel (done)
- **Story 8.4: Morning Check Dashboard (THIS STORY) - Completes Epic 8**

### Dependencies

**Depends on:**
- Story 3.5 (queue filters) - For state filtering
- Story 3.6 (SLA calculator) - For SLA status, overdue calculation
- Story 8.2 (Bulk Remind) - Reuses bulk remind functionality

**Enables:**
- Complete Epic 8 deliverables

### Epic 7 Retro Learnings to Apply (CRITICAL)

From `epic-7-retro-2026-01-07.md`:

**1. NO `as unknown` Casting**
```typescript
// ❌ WRONG:
const kpiData = rawKpi as unknown as Prisma.InputJsonValue;

// ✅ CORRECT:
interface DashboardKpiData {
  totalWaiting: number;
  overdueCount: number;
  t2WarningCount: number;
  completedThisMonth: number;
  lastUpdated: Date;
}
const kpiData: DashboardKpiData = {
  totalWaiting: waitingCount,
  overdueCount: overdueCount,
  t2WarningCount: t2Count,
  completedThisMonth: completedCount,
  lastUpdated: new Date(),
};
```

**2. NO `as any` Casting**
```typescript
// ❌ WRONG:
const overdueDays = (proposal as any).overdueDays;

// ✅ CORRECT:
const overdueDays = this.slaService.calculateOverdueDays(proposal);
```

**3. Use WorkflowAction Enum Directly**
```typescript
// ❌ WRONG:
action: WorkflowAction.DASHBOARD_VIEW as unknown as AuditAction

// ✅ CORRECT:
import { WorkflowAction } from '@prisma/client';
// No WorkflowAction for dashboard view - use AuditAction if needed
```

**4. Tests MUST Be Written**
```typescript
// Epic 7 retro: No tests → bugs not caught
// Test KPI calculations
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  dashboard/
    dashboard.controller.ts   # New: Dashboard endpoints
    dashboard.service.ts      # New: KPI calculation
    dto/
      dashboard.dto.ts         # New: Dashboard DTOs
    dashboard.module.ts        # New: Module definition
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    dashboard/
      page.tsx                 # New: Dashboard page
  components/
    dashboard/
      KpiCard.tsx              # New: KPI card component
      OverdueListTable.tsx     # New: Overdue list table
  lib/api/
    dashboard.ts               # New: Dashboard API client
```

### Architecture Compliance

**KPI Calculations:**
```typescript
interface DashboardKpiDto {
  totalWaiting: number;       // Proposals in review states
  overdueCount: number;       // Proposals past SLA deadline
  t2WarningCount: number;     // Proposals within 2 working days of deadline
  completedThisMonth: number; // Proposals completed this month
}

// Review states (waiting for action)
const REVIEW_STATES: ProjectState[] = [
  ProjectState.FACULTY_REVIEW,
  ProjectState.SCHOOL_SELECTION_REVIEW,
  ProjectState.OUTLINE_COUNCIL_REVIEW,
  ProjectState.FACULTY_ACCEPTANCE_REVIEW,
  ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
  ProjectState.HANDOVER,
];

@Injectable()
export class DashboardService {
  async getKpiData(): Promise<DashboardKpiDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total waiting - proper typing, NO as unknown
    const totalWaiting = await this.prisma.proposal.count({
      where: {
        state: { in: REVIEW_STATES },
      },
    });

    // Overdue - SLA deadline < now
    const overdueCount = await this.prisma.proposal.count({
      where: {
        slaDeadline: { lt: now },
        state: { in: REVIEW_STATES },
      },
    });

    // T-2 warning - within 2 working days
    const t2WarningCount = await this.prisma.proposal.count({
      where: {
        state: { in: REVIEW_STATES },
        slaDeadline: {
          gt: now,
          lte: this.slaService.addWorkingDays(now, 2),
        },
      },
    });

    // Completed this month
    const completedThisMonth = await this.prisma.proposal.count({
      where: {
        state: ProjectState.COMPLETED,
        completedDate: { gte: startOfMonth, lt: now },
      },
    });

    return {
      totalWaiting,
      overdueCount,
      t2WarningCount,
      completedThisMonth,
    };
  }
}
```

**Overdue List Query:**
```typescript
interface OverdueProposalDto {
  id: string;
  code: string;
  title: string;
  holderName: string;
  overdueDays: number;
  slaDeadline: Date;
  slaStatus: 'warning' | 'overdue';
}

async getOverdueList(): Promise<OverdueProposalDto[]> {
  const now = new Date();

  const proposals = await this.prisma.proposal.findMany({
    where: {
      state: { in: REVIEW_STATES },
      slaDeadline: { lt: now },
    },
    include: {
      holder: {
        select: { id: true, displayName: true },
      },
    },
    orderBy: {
      slaDeadline: 'asc',
    },
  });

  // Map to DTO - Proper typing, NO as unknown
  const result: OverdueProposalDto[] = proposals.map(p => {
    const overdueDays = this.slaService.calculateOverdueDays(p);

    return {
      id: p.id,
      code: p.code,
      title: p.title,
      holderName: p.holder?.displayName || 'Chưa gán',
      overdueDays,
      slaDeadline: p.slaDeadline,
      slaStatus: overdueDays > 0 ? 'overdue' : 'warning',
    };
  });

  return result;
}
```

### Data Model

**Dashboard Data DTO:**
```typescript
export class DashboardDataDto {
  kpi: DashboardKpiDto;
  overdueList: OverdueProposalDto[];
}

export class DashboardKpiDto {
  totalWaiting!: number;
  overdueCount!: number;
  t2WarningCount!: number;
  completedThisMonth!: number;
}

export class OverdueProposalDto {
  id!: string;
  code!: string;
  title!: string;
  holderName!: string;
  overdueDays!: number;
  slaDeadline!: Date;
  slaStatus!: 'warning' | 'overdue';
}
```

### RBAC Authorization

```typescript
@Get('dashboard')
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
async getDashboard(@CurrentUser() user: User) {
  // ... implementation
}
```

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Tổng quan" (Dashboard)
- "Tổng hồ sơ đang chờ" (Total Waiting)
- "Hồ sơ quá hạn" (Overdue)
- "Sắp đến hạn (T-2)" (Warning)
- "Hoàn thành tháng này" (Completed This Month)
- "Danh sách quá hạn" (Overdue List)
- "Gửi nhắc" (Send Reminder)
- "Gửi nhắc tất cả quá hạn" (Remind All Overdue)

### KPI Card Styling

**KPI Card Pattern:**
```typescript
interface KpiCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'red' | 'yellow' | 'green';
  onClick?: () => void;
}

// Example cards:
const KPI_CARDS = [
  {
    title: 'Tổng hồ sơ đang chờ',
    key: 'totalWaiting',
    icon: 'clock',
    color: 'blue',
    filter: { states: REVIEW_STATES },
  },
  {
    title: 'Hồ sơ quá hạn',
    key: 'overdueCount',
    icon: 'alert-circle',
    color: 'red',
    filter: { overdue: true },
  },
  {
    title: 'Sắp đến hạn (T-2)',
    key: 't2WarningCount',
    icon: 'alert-triangle',
    color: 'yellow',
    filter: { t2Warning: true },
  },
  {
    title: 'Hoàn thành tháng này',
    key: 'completedThisMonth',
    icon: 'check-circle',
    color: 'green',
    filter: { state: 'COMPLETED', thisMonth: true },
  },
] as const;
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 7 Retro):**
```typescript
describe('DashboardService', () => {
  it('should calculate total waiting correctly', async () => {
    // Test count of proposals in review states
  });

  it('should calculate overdue count correctly', async () => {
    // Test SLA deadline < now
  });

  it('should calculate T-2 warning count correctly', async () => {
    // Test within 2 working days
  });

  it('should calculate completed this month correctly', async () => {
    // Test completedDate within current month
  });

  it('should calculate overdue days correctly', async () => {
    // Test SLA service integration
  });

  it('should return 403 for unauthorized users', async () => {
    // Test RBAC
  });
});
```

### Quick Actions

**Remind All Overdue:**
```typescript
@Post('dashboard/remind-overdue')
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
async remindAllOverdue(@CurrentUser() user: User) {
  // 1. Get all overdue proposal IDs
  const overdueProposals = await this.getOverdueList();
  const proposalIds = overdueProposals.map(p => p.id);

  // 2. Call bulk remind from Story 8.2
  const result = await this.notificationService.bulkRemind({
    proposalIds,
    dryRun: false,
  }, user);

  return result;
}
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 8-4 created. Status: ready-for-dev
- Epic 7 retro learnings applied (type safety, no as unknown/as any)
- Complete Epic 8 deliverables
- Dashboard KPI calculations
- Overdue list with remind actions
- Vietnamese localization
- RBAC for PHONG_KHCN and ADMIN
- Tests required

### File List

**To Create:**
- `qlnckh/apps/src/modules/dashboard/dashboard.controller.ts` - Dashboard endpoints
- `qlnckh/apps/src/modules/dashboard/dashboard.service.ts` - KPI service
- `qlnckh/apps/src/modules/dashboard/dto/dashboard.dto.ts` - DTOs
- `qlnckh/apps/src/modules/dashboard/dashboard.module.ts` - Module
- `qlnckh/web-apps/src/app/dashboard/page.tsx` - Dashboard page
- `qlnckh/web-apps/src/components/dashboard/KpiCard.tsx` - KPI card
- `qlnckh/web-apps/src/components/dashboard/OverdueListTable.tsx` - Overdue table
- `qlnckh/web-apps/src/lib/api/dashboard.ts` - API client

**To Modify:**
- `qlnckh/apps/src/app.module.ts` - Import DashboardModule
- Navigation menu - Add Dashboard link (PHONG_KHCN, ADMIN only)

## Change Log

- 2026-01-07: Story created. Status: ready-for-dev
  - Epic 8 final story
  - Epic 7 retro learnings applied
  - KPI calculations with proper typing
  - Overdue list with remind actions
  - Vietnamese localization
  - Tests mandated

## References

- [epics.md Story 8.4](../../planning-artifacts/epics.md#L2162-L2184) - Full requirements
- [epic-7-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-7-retro-2026-01-07.md) - Lessons learned
- [Story 8.2](./8-2-bulk-remind-preview-plus-dry-run-plus-execute.md) - Bulk remind patterns
