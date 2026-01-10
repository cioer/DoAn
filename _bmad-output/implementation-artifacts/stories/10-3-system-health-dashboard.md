# Story 10.3: System Health Dashboard

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 9 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Admin,
I want xem system health metrics,
So that tôi biết hệ thống có ổn định không.

## Acceptance Criteria

1. **AC1: Health Dashboard Access (Admin only)**
   - Given User có role = ADMIN
   - When User mở System Health page (/admin/health)
   - Then UI hiển thị metrics dashboard

2. **AC2: User Metrics**
   - Given Dashboard loaded
   - When User metrics section hiển thị
   - Then show:
     - Active users count (logged in within 24h)
     - Total users count
     - New users today
     - Users by role breakdown (pie chart)

3. **AC3: Proposal State Distribution**
   - Given Dashboard loaded
   - When Proposal metrics section hiển thị
   - Then show bar chart:
     - Proposals by state (all 16 states)
     - Color coding: green (healthy), yellow (attention), red (overdue)
     - Click bar → filter to proposals in that state

4. **AC4: API Performance Metrics**
   - Given Dashboard loaded
   - When Performance section hiển thị
   - Then show:
     - Response time p95 (95th percentile)
     - Response time p99 (99th percentile)
     - Request rate (requests/min)
     - Error rate (% errors, last 24h)
     - Timeline chart (last 24h)

5. **AC5: Infrastructure Status**
   - Given Dashboard loaded
   - When Infrastructure section hiển thị
   - Then show status indicators:
     - Database connection (healthy/down/slow)
     - Redis status (connected/disconnected)
     - Disk usage (%)
     - Memory usage (%)

6. **AC6: Real-Time Updates**
   - Given Dashboard mở
   - When metrics change
   - Then UI refresh every 30 seconds
   - And show "Last updated: HH:MM:SS" timestamp

7. **AC7: Error Log Summary**
   - Given Dashboard loaded
   - When Error section hiển thị
   - Then show:
     - Recent errors (last 10, from audit_events)
     - Error count by type
     - "View all errors" link → Full Audit Log page (Story 10.4)

## Tasks / Subtasks

- [ ] Task 1: Backend - Health Module Setup (AC: #1)
  - [ ] Create HealthModule in qlnckh/apps/src/modules/health/
  - [ ] Create HealthController with /admin/health endpoints
  - [ ] RBAC: @RequireRoles(UserRole.ADMIN)

- [ ] Task 2: Backend - User Metrics Service (AC: #2)
  - [ ] Create getUserMetrics() method
  - [ ] Query active users (lastLoginAt within 24h)
  - [ ] Count users by role
  - [ ] Count new users today
  - [ ] Return properly typed response (NO as any)

- [ ] Task 3: Backend - Proposal Metrics Service (AC: #3)
  - [ ] Create getProposalMetrics() method
  - [ ] Count proposals by state (all 16 states)
  - [ ] Calculate overdue proposals (past SLA deadline)
  - [ ] Return ProposalMetricsDistribution interface

- [ ] Task 4: Backend - API Performance Tracking (AC: #4)
  - [ ] Create PerformanceMetricsService
  - [ ] Track request duration in middleware
  - [ ] Store metrics in Redis or database
  - [ ] Calculate p95, p99 percentiles
  - [ ] Return PerformanceMetrics interface

- [ ] Task 5: Backend - Infrastructure Health Checks (AC: #5)
  - [ ] Create InfrastructureService
  - [ ] Database health check (ping query)
  - [ ] Redis health check (ping)
  - [ ] Disk usage check
  - [ ] Memory usage check
  - [ ] Return InfrastructureHealth interface

- [ ] Task 6: Backend - Error Log Summary (AC: #7)
  - [ ] Create getRecentErrors() method
  - [ ] Query audit_events for ERROR level events
  - [ ] Group errors by type
  - [ ] Return ErrorSummary interface

- [ ] Task 7: Backend - Health Metrics DTOs (All ACs)
  - [ ] Create UserMetricsDto interface
  - [ ] Create ProposalMetricsDto interface
  - [ ] Create PerformanceMetricsDto interface
  - [ ] Create InfrastructureHealthDto interface
  - [ ] Create ErrorSummaryDto interface
  - [ ] NO as unknown/as any casts (Epic 9 retro pattern)

- [ ] Task 8: Frontend - Health Dashboard Page (AC: #1, #6)
  - [ ] Create /admin/health/page.tsx
  - [ ] Layout with metric cards
  - [ ] Auto-refresh every 30 seconds
  - [ ] Show "Last updated" timestamp

- [ ] Task 9: Frontend - User Metrics Component (AC: #2)
  - [ ] UserMetricsCard component
  - [ ] Active users, total users, new users display
  - [ ] Users by role pie chart (use chart library)

- [ ] Task 10: Frontend - Proposal State Chart (AC: #3)
  - [ ] ProposalStateChart component
  - [ ] Bar chart with state distribution
  - [ ] Color coding (green/yellow/red)
  - [ ] Click to navigate to filtered proposals

- [ ] Task 11: Frontend - Performance Metrics Component (AC: #4)
  - [ ] PerformanceMetricsCard component
  - [ ] P95, P99, request rate, error rate display
  - [ ] Timeline chart (last 24h)

- [ ] Task 12: Frontend - Infrastructure Status (AC: #5)
  - [ ] InfrastructureStatusCard component
  - [ ] Status indicators (healthy/down/slow)
  - [ ] Progress bars for disk/memory usage

- [ ] Task 13: Frontend - Error Summary Component (AC: #7)
  - [ ] ErrorSummary component
  - [ ] Recent errors list
  - [ ] "View all errors" link

- [ ] Task 14: Unit Tests (All ACs)
  - [ ] Test user metrics calculation
  - [ ] Test proposal state distribution
  - [ ] Test performance percentile calculation
  - [ ] Test infrastructure health checks
  - [ ] Test error summary generation

## Dev Notes

### Epic 10 Context

**Epic 10: Admin & System Configuration**
- FRs covered: FR46 (Import/Export), FR47 (Holiday Mgmt), FR48 (Audit Logs)
- Story 10.1: Import Excel (Users, Proposals)
- Story 10.2: Export Excel (Full Dump)
- Story 10.3: System Health Dashboard (THIS STORY)
- Story 10.4: Full Audit Log Viewer
- Story 10.5: Holiday Management (Full CRUD)
- Story 10.6: DB Restore + State Recompute

**Epic Objective:**
Enable full system administration with import/export, health monitoring, audit logs, and backup/restore.

### Dependencies

**Depends on:**
- Story 1.2 (RBAC) - For ADMIN role
- Story 3.1 (16 canonical states) - For proposal state distribution
- Story 3.6 (SLA Calculator) - For overdue proposal detection
- Story 8.4 (Morning Check Dashboard) - Reuse dashboard patterns

**Enables:**
- Story 10.4 (Full Audit Log Viewer) - Error summary links to audit logs

### Epic 9 Retro Learnings to Apply (CRITICAL)

From `epic-9-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const metrics = data as unknown as HealthMetrics;

// ✅ CORRECT - Epic 9 retro pattern:
interface UserMetrics {
  activeCount: number;
  totalCount: number;
  newTodayCount: number;
  byRole: Record<UserRole, number>;
}
const metrics: UserMetrics = {
  activeCount: activeUsers.length,
  totalCount: allUsers.length,
  newTodayCount: newUsers.length,
  byRole: roleCounts,
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG:
const stateCounts = (proposals as any).groupBy('state');

// ✅ CORRECT - Proper type-safe aggregation:
const stateCounts: Record<ProjectState, number> = proposals.reduce(
  (acc, p) => {
    acc[p.state] = (acc[p.state] || 0) + 1;
    return acc;
  },
  {} as Record<ProjectState, number>
);
```

**3. Use ProjectState Enum Directly** ⚠️ MANDATORY
```typescript
// ✅ CORRECT - Direct enum usage:
const STATE_DISTRIBUTION: Record<ProjectState, number> = {
  [ProjectState.DRAFT]: 0,
  [ProjectState.FACULTY_REVIEW]: 0,
  // ... all 16 states initialized
};

// After aggregation:
const distribution = Object.entries(STATE_DISTRIBUTION).map(([state, count]) => ({
  state: state as ProjectState,
  count,
}));
```

**4. Proper Decorator Usage** ⚠️ Epic 8 Finding
```typescript
// ✅ CORRECT - Cache header for health endpoint:
@Get('metrics')
@Header('Cache-Control', 'max-age=30')  // 30 second cache
async getMetrics(@CurrentUser() user: User): Promise<HealthMetricsDto> {
  // Return metrics
}
```

**5. Tests MUST Be Written**
```typescript
// Epic 9 achievement: 130 tests passing with 0 type violations
// Epic 10 REQUIREMENT: Write tests for health calculation scenarios
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  health/
    health.module.ts              # New: Module definition
    health.controller.ts          # New: Health endpoints
    health.service.ts             # New: Metrics aggregation
    dto/
      user-metrics.dto.ts         # New: User metrics interface
      proposal-metrics.dto.ts     # New: Proposal metrics interface
      performance-metrics.dto.ts  # New: Performance metrics interface
      infrastructure-health.dto.ts # New: Infrastructure health interface
      error-summary.dto.ts        # New: Error summary interface
    middleware/
      performance-tracking.middleware.ts  # New: Request duration tracking
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    admin/
      health/
        page.tsx                  # New: Health dashboard page
        components/
          UserMetricsCard.tsx      # New: User metrics display
          ProposalStateChart.tsx   # New: Proposal state distribution
          PerformanceMetricsCard.tsx  # New: API performance
          InfrastructureStatus.tsx # New: Infrastructure health
          ErrorSummary.tsx         # New: Error summary
  lib/
    api/
      health.ts                   # New: Health metrics API client
    hooks/
      useHealthMetrics.ts         # New: Auto-refresh hook
```

### Architecture Compliance

**Health Metrics Interfaces:**
```typescript
// User Metrics
interface UserMetrics {
  activeCount: number;
  totalCount: number;
  newTodayCount: number;
  byRole: Record<UserRole, number>;
}

// Proposal Metrics
interface ProposalMetrics {
  totalCount: number;
  byState: ProposalStateCount[];
  overdueCount: number;
  stateDistribution: {
    healthy: number;   // On track for SLA
    attention: number; // Warning zone
    overdue: number;   // Past SLA deadline
  };
}

interface ProposalStateCount {
  state: ProjectState;
  count: number;
  label: string;  // Vietnamese label
  color: 'green' | 'yellow' | 'red';
}

// Performance Metrics
interface PerformanceMetrics {
  responseTimeP95: number;  // milliseconds
  responseTimeP99: number;  // milliseconds
  requestRate: number;      // requests per minute
  errorRate: number;        // percentage (0-100)
  timeline: TimelinePoint[];  // Last 24h, hourly buckets
}

interface TimelinePoint {
  timestamp: string;  // ISO string
  avgResponseTime: number;
  requestCount: number;
  errorCount: number;
}

// Infrastructure Health
interface InfrastructureHealth {
  database: HealthStatus;
  redis: HealthStatus;
  diskUsage: {
    usedPercent: number;
    freeGB: number;
  };
  memoryUsage: {
    usedPercent: number;
    usedGB: number;
    totalGB: number;
  };
}

type HealthStatus = 'healthy' | 'degraded' | 'down';

// Error Summary
interface ErrorSummary {
  totalCount: number;
  recentErrors: RecentError[];
  errorsByType: Record<string, number>;
}

interface RecentError {
  id: string;
  type: string;
  message: string;
  occurredAt: Date;
}
```

**RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
@Controller('admin/health')
export class HealthController {
  @Get('metrics')
  async getMetrics(@CurrentUser() user: User): Promise<HealthMetricsDto> {
    // Only ADMIN can access
  }
}
```

### Vietnamese Localization

All UI text in Vietnamese:

**UI Text:**
- "Tình trạng hệ thống" (System Health)
- "Người dùng" (Users)
- "Đề tài" (Proposals)
- "Hiệu suất API" (API Performance)
- "Cơ sở hạ tầng" (Infrastructure)
- "Lỗi gần đây" (Recent Errors)
- "Cập nhật lần cuối: {time}" (Last updated: {time})

**User Metrics Labels:**
- "Đang hoạt động" (Active)
- "Tổng số" (Total)
- "Mới hôm nay" (New today)
- "Theo vai trò" (By role)

**Infrastructure Status Labels:**
- "Khỏe" (Healthy)
- "Chậm" (Degraded)
- "Mất kết nối" (Down)
- "Sử dụng disk" (Disk usage)
- "Sử dụng bộ nhớ" (Memory usage)

**Performance Labels:**
- "Thời gian phản hồi (P95)" (Response time P95)
- "Thời gian phản hồi (P99)" (Response time P99)
- "Tỷ lệ yêu cầu" (Request rate)
- "Tỷ lệ lỗi" (Error rate)

### Code Patterns to Follow

**Proper Health Service (Epic 9 Retro Pattern):**
```typescript
// HealthService.getMetrics()
async getMetrics(): Promise<HealthMetricsDto> {
  const [userMetrics, proposalMetrics, performance, infra, errors] =
    await Promise.all([
      this.getUserMetrics(),
      this.getProposalMetrics(),
      this.getPerformanceMetrics(),
      this.getInfrastructureHealth(),
      this.getErrorSummary(),
    ]);

  return {
    user: userMetrics,
    proposals: proposalMetrics,
    performance,
    infrastructure: infra,
    errors,
    timestamp: new Date(),
  };
}

// User metrics with proper typing
async getUserMetrics(): Promise<UserMetrics> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  const [totalCount, activeUsers, newUsers, allUsers] = await Promise.all([
    this.prisma.user.count(),
    this.prisma.user.count({
      where: { lastLoginAt: { gte: yesterday } },
    }),
    this.prisma.user.count({
      where: { createdAt: { gte: todayStart } },
    }),
    this.prisma.user.findMany({
      select: { role: true },
    }),
  ]);

  // Count by role - proper typing
  const byRole: Record<UserRole, number> = {
    [UserRole.ADMIN]: 0,
    [UserRole.GIANG_VIEN]: 0,
    [UserRole.QUAN_LY_KHOA]: 0,
    [UserRole.PHONG_KHCN]: 0,
    [UserRole.THU_KY_HOI_DONG]: 0,
    [UserRole.THANH_TRUNG]: 0,
    [UserRole.BGH]: 0,
  };

  for (const user of allUsers) {
    byRole[user.role] = (byRole[user.role] || 0) + 1;
  }

  return {
    activeCount: activeUsers,
    totalCount,
    newTodayCount: newUsers,
    byRole,
  };
}

// Proposal metrics with state distribution
async getProposalMetrics(): Promise<ProposalMetrics> {
  const proposals = await this.prisma.proposal.findMany({
    select: {
      state: true,
      slaDeadline: true,
    },
  });

  const now = new Date();

  // Count by state - proper typing
  const byState: ProposalStateCount[] = Object.values(ProjectState).map(state => {
    const count = proposals.filter(p => p.state === state).length;

    // Determine color based on state
    let color: 'green' | 'yellow' | 'red' = 'green';
    if ([ProjectState.CHANGES_REQUESTED, ProjectState.PAUSED].includes(state)) {
      color = 'yellow';
    } else if ([ProjectState.CANCELLED, ProjectState.WITHDRAWN, ProjectState.REJECTED].includes(state)) {
      color = 'red';
    }

    return {
      state,
      count,
      label: STATE_LABELS[state],  // Vietnamese
      color,
    };
  });

  // Count overdue (past SLA deadline, excluding terminal states)
  const terminalStates = [
    ProjectState.COMPLETED,
    ProjectState.CANCELLED,
    ProjectState.WITHDRAWN,
    ProjectState.REJECTED,
  ];

  const overdueCount = proposals.filter(p =>
    !terminalStates.includes(p.state) &&
    p.slaDeadline &&
    new Date(p.slaDeadline) < now
  ).length;

  // Calculate distribution
  const stateDistribution = {
    healthy: proposals.filter(p =>
      !terminalStates.includes(p.state) &&
      (!p.slaDeadline || new Date(p.slaDeadline) >= new Date(now.getTime() + 24 * 60 * 60 * 1000))
    ).length,
    attention: proposals.filter(p =>
      !terminalStates.includes(p.state) &&
      p.slaDeadline &&
      new Date(p.slaDeadline) >= now &&
      new Date(p.slaDeadline) < new Date(now.getTime() + 24 * 60 * 60 * 1000)
    ).length,
    overdue: overdueCount,
  };

  return {
    totalCount: proposals.length,
    byState,
    overdueCount,
    stateDistribution,
  };
}

// Infrastructure health checks
async getInfrastructureHealth(): Promise<InfrastructureHealth> {
  const [dbStatus, redisStatus, disk, memory] = await Promise.all([
    this.checkDatabase(),
    this.checkRedis(),
    this.checkDisk(),
    this.checkMemory(),
  ]);

  return {
    database: dbStatus,
    redis: redisStatus,
    diskUsage: disk,
    memoryUsage: memory,
  };
}

private async checkDatabase(): Promise<HealthStatus> {
  try {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    if (duration > 1000) return 'degraded';  // > 1s is slow
    return 'healthy';
  } catch {
    return 'down';
  }
}

private async checkRedis(): Promise<HealthStatus> {
  try {
    // Assuming RedisService exists with ping method
    await this.redisService.ping();
    return 'healthy';
  } catch {
    return 'down';
  }
}
```

**Performance Tracking Middleware:**
```typescript
// performance-tracking.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PerformanceTrackingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', async () => {
      const duration = Date.now() - start;
      const isError = res.statusCode >= 400;

      // Store metrics (in Redis or database)
      await this.metricsService.recordRequest({
        duration,
        isError,
        path: req.path,
        method: req.method,
        timestamp: new Date(),
      });
    });

    next();
  }
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 9 Retro):**
```typescript
describe('HealthService', () => {
  describe('getUserMetrics', () => {
    it('should count active users correctly', async () => {
      await createTestUser({ lastLoginAt: new Date() });  // Active
      await createTestUser({ lastLoginAt: new Date('2025-01-01') });  // Inactive

      const metrics = await service.getUserMetrics();

      expect(metrics.activeCount).toBe(1);
      expect(metrics.totalCount).toBe(2);
    });

    it('should count users by role correctly', async () => {
      await createTestUser({ role: UserRole.GIANG_VIEN });
      await createTestUser({ role: UserRole.GIANG_VIEN });
      await createTestUser({ role: UserRole.ADMIN });

      const metrics = await service.getUserMetrics();

      expect(metrics.byRole[UserRole.GIANG_VIEN]).toBe(2);
      expect(metrics.byRole[UserRole.ADMIN]).toBe(1);
    });
  });

  describe('getProposalMetrics', () => {
    it('should count proposals by state', async () => {
      await createTestProposal({ state: ProjectState.DRAFT });
      await createTestProposal({ state: ProjectState.DRAFT });
      await createTestProposal({ state: ProjectState.FACULTY_REVIEW });

      const metrics = await service.getProposalMetrics();

      const draftCount = metrics.byState.find(s => s.state === ProjectState.DRAFT);
      expect(draftCount?.count).toBe(2);
    });

    it('should identify overdue proposals', async () => {
      await createTestProposal({
        state: ProjectState.FACULTY_REVIEW,
        slaDeadline: new Date('2025-01-01'),  // Past
      });
      await createTestProposal({
        state: ProjectState.FACULTY_REVIEW,
        slaDeadline: new Date(Date.now() + 86400000),  // Future
      });

      const metrics = await service.getProposalMetrics();

      expect(metrics.overdueCount).toBe(1);
    });
  });
});

describe('PerformanceTrackingMiddleware', () => {
  it('should record request duration', async () => {
    const recordSpy = jest.spyOn(metricsService, 'recordRequest');

    await request(app.get('/api/test'))
      .expect(200);

    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: expect.any(Number),
        isError: false,
      })
    );
  });
});
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 10-3 created via create-story workflow. Status: ready-for-dev
- Epic 9 retrospective learnings applied (type safety, no as unknown/as any)
- Proper interfaces for all metrics types
- Type-safe aggregation patterns
- Vietnamese localization for all labels
- Performance tracking middleware defined
- Infrastructure health checks
- Real-time dashboard refresh pattern
- Tests mandated per Epic 9 retro lessons

### File List

**To Create:**
- `qlnckh/apps/src/modules/health/health.module.ts` - Health module
- `qlnckh/apps/src/modules/health/health.controller.ts` - Health endpoints
- `qlnckh/apps/src/modules/health/health.service.ts` - Metrics aggregation
- `qlnckh/apps/src/modules/health/dto/user-metrics.dto.ts` - User metrics interface
- `qlnckh/apps/src/modules/health/dto/proposal-metrics.dto.ts` - Proposal metrics interface
- `qlnckh/apps/src/modules/health/dto/performance-metrics.dto.ts` - Performance metrics interface
- `qlnckh/apps/src/modules/health/dto/infrastructure-health.dto.ts` - Infrastructure health interface
- `qlnckh/apps/src/modules/health/dto/error-summary.dto.ts` - Error summary interface
- `qlnckh/apps/src/modules/health/middleware/performance-tracking.middleware.ts` - Request duration tracking
- `qlnckh/web-apps/src/app/admin/health/page.tsx` - Health dashboard page
- `qlnckh/web-apps/src/app/admin/health/components/UserMetricsCard.tsx` - User metrics display
- `qlnckh/web-apps/src/app/admin/health/components/ProposalStateChart.tsx` - Proposal state distribution
- `qlnckh/web-apps/src/app/admin/health/components/PerformanceMetricsCard.tsx` - API performance
- `qlnckh/web-apps/src/app/admin/health/components/InfrastructureStatus.tsx` - Infrastructure health
- `qlnckh/web-apps/src/app/admin/health/components/ErrorSummary.tsx` - Error summary
- `qlnckh/web-apps/src/lib/api/health.ts` - Health metrics API client
- `qlnckh/web-apps/src/lib/hooks/useHealthMetrics.ts` - Auto-refresh hook

**To Modify:**
- `qlnckh/apps/src/app.module.ts` - Register HealthModule and middleware
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 9 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper interfaces for all metrics types
  - Type-safe aggregation patterns
  - Vietnamese localization for all labels
  - Performance tracking middleware
  - Infrastructure health checks
  - Tests mandated per Epic 9 retro lessons
  - Ready for dev-story workflow execution

## References

- [epics.md Story 10.3](../../planning-artifacts/epics.md#L2338-L2357) - Full requirements
- [epic-9-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-9-retro-2026-01-07.md) - Lessons learned
- [Story 3.1](./3-1-16-canonical-states-plus-transitions.md) - State machine reference
- [Story 3.6](./3-6-sla-calculator-business-days-plus-cutoff-17-00.md) - SLA calculation
- [Story 8.4](./8-4-morning-check-dashboard-kpi-plus-overdue-list.md) - Dashboard patterns
