# Story 10.4: Full Audit Log Viewer

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 9 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Admin,
I want xem toàn bộ audit logs,
So that tôi có full visibility.

## Acceptance Criteria

1. **AC1: Audit Log Page Access (Admin only)**
   - Given User có role = ADMIN
   - When User mở Audit Log page (/admin/audit-logs)
   - Then UI hiển thị audit logs table with filters

2. **AC2: Filter Panel**
   - Given Audit Log page loaded
   - When Filter panel hiển thị
   - Then filters available:
     - Entity type (User, Proposal, WorkflowLog, Evaluation, etc.)
     - Entity ID (text input)
     - Actor ID (dropdown or text)
     - Action (dropdown: CREATE, UPDATE, DELETE, etc.)
     - Date range (from, to)
     - Log level (INFO, WARNING, ERROR)

3. **AC3: Audit Logs Table**
   - Given Audit Log page loaded
   - When logs displayed
   - Then table columns:
     - Timestamp (dd/MM/yyyy HH:mm:ss)
     - Actor name
     - Action
     - Entity type
     - Entity info (e.g., proposal code)
     - Shortened metadata preview

4. **AC4: Detail Modal**
   - Given Admin click vào log entry
   - When Detail modal mở
   - Then hiển thị full metadata:
     - IP address
     - User agent
     - Request ID
     - Full metadata JSON (formatted, collapsible)
     - Related entities (links to proposal, user, etc.)

5. **AC5: Pagination**
   - Given Audit log có nhiều entries (>1000)
   - When Admin browse logs
   - Then:
     - Pagination controls at bottom (page size: 20, 50, 100)
     - URL contains query params (page, pageSize, filters)
     - Browser back/forward works correctly

6. **AC6: Export Audit Logs**
   - Given Admin filtered logs
   - When click "Xuất Excel"
   - Then:
     - Export current filtered result
     - Include all columns + metadata
     - File name: audit-logs-{from}-{to}.xlsx

7. **AC7: Real-Time Updates**
   - Given Audit Log page mở
   - When new audit event occurs
   - Then:
     - Show badge "Có logs mới" (if not at latest)
     - Click to refresh to latest
     - Or auto-refresh every 60 seconds (optional setting)

8. **AC8: Search Full Text**
   - Given Admin muốn tìm specific log
   - When type in search box
   - Then:
     - Search across: actor name, action, entity info, metadata
     - Debounce 300ms
     - Highlight matching text in results

## Tasks / Subtasks

- [ ] Task 1: Backend - Audit Log Module Setup (AC: #1)
  - [ ] Create AuditLogModule in qlnckh/apps/src/modules/audit-logs/
  - [ ] Create AuditLogController with /admin/audit-logs endpoints
  - [ ] RBAC: @RequireRoles(UserRole.ADMIN)

- [ ] Task 2: Backend - Audit Log Query DTOs (AC: #2)
  - [ ] Create AuditLogQueryDto (entityType, entityId, actorId, action, dateRange, level)
  - [ ] Create PaginationDto (page, pageSize, sortBy, sortOrder)
  - [ ] Add proper validation decorators
  - [ ] NO as unknown/as any casts (Epic 9 retro pattern)

- [ ] Task 3: Backend - Audit Log Service (AC: #2, #3, #5)
  - [ ] Create getAuditLogs() method with filters
  - [ ] Build dynamic where clause based on filters
  - [ ] Implement pagination with total count
  - [ ] Return PaginatedAuditLogs interface

- [ ] Task 4: Backend - Audit Log Detail (AC: #4)
  - [ ] Create getAuditLogDetail() method
  - [ ] Fetch full log with related entities
  - [ ] Return AuditLogDetail interface

- [ ] Task 5: Backend - Audit Log Export (AC: #6)
  - [ ] Create exportAuditLogs() method
  - [ ] Generate Excel from filtered results
  - [ ] Include formatted metadata JSON
  - [ ] Return streaming file download

- [ ] Task 6: Backend - Search Implementation (AC: #8)
  - [ ] Create searchAuditLogs() method
  - [ ] Full text search across relevant fields
  - [ ] Use database LIKE or full-text search
  - [ ] Return filtered results

- [ ] Task 7: Backend - Audit Log Interfaces (All ACs)
  - [ ] Create AuditLogItem interface (table row)
  - [ ] Create AuditLogDetail interface (modal)
  - [ ] Create PaginatedAuditLogs interface
  - [ ] Create AuditLogFilter interface

- [ ] Task 8: Frontend - Audit Log Page (AC: #1, #5)
  - [ ] Create /admin/audit-logs/page.tsx
  - [ ] URL sync with filters and pagination
  - [ ] Browser history support

- [ ] Task 9: Frontend - Filter Panel (AC: #2)
  - [ ] AuditLogFilterPanel component
  - [ ] Entity type dropdown
  - [ ] Date range picker
  - [ ] Action dropdown
  - [ ] Clear filters button

- [ ] Task 10: Frontend - Audit Logs Table (AC: #3)
  - [ ] AuditLogsTable component
  - [ ] Sortable columns
  - [ ] Click row → open detail modal
  - [ ] Highlight search results

- [ ] Task 11: Frontend - Detail Modal (AC: #4)
  - [ ] AuditLogDetailModal component
  - [ ] Formatted metadata JSON (syntax highlighted)
  - [ ] Links to related entities
  - [ ] Copy JSON button

- [ ] Task 12: Frontend - Real-Time Updates (AC: #7)
  - [ ] Polling or WebSocket for new logs
  - [ ] "New logs available" badge
  - [ ] Refresh button

- [ ] Task 13: Frontend - Search (AC: #8)
  - [ ] Search input with debounce
  - [ ] Highlight matching text
  - [ ] Clear search button

- [ ] Task 14: Unit Tests (All ACs)
  - [ ] Test filter combinations
  - [ ] Test pagination
  - [ ] Test search functionality
  - [ ] Test export generation

## Dev Notes

### Epic 10 Context

**Epic 10: Admin & System Configuration**
- FRs covered: FR46 (Import/Export), FR47 (Holiday Mgmt), FR48 (Audit Logs)
- Story 10.1: Import Excel (Users, Proposals)
- Story 10.2: Export Excel (Full Dump)
- Story 10.3: System Health Dashboard
- Story 10.4: Full Audit Log Viewer (THIS STORY)
- Story 10.5: Holiday Management (Full CRUD)
- Story 10.6: DB Restore + State Recompute

**Epic Objective:**
Enable full system administration with import/export, health monitoring, audit logs, and backup/restore.

### Dependencies

**Depends on:**
- Story 1.2 (RBAC) - For ADMIN role
- Story 1.4 (Audit Log Foundation) - Base audit_events table
- Story 3.4 (Workflow Logs) - For workflow audit patterns
- Epic 9 (Exception Actions) - For exception action logging

**Enables:**
- Story 10.6 (DB Restore) - For verifying restore operations

### Epic 9 Retro Learnings to Apply (CRITICAL)

From `epic-9-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const metadata = log.metadata as unknown as AuditMetadata;

// ✅ CORRECT - Epic 9 retro pattern:
interface AuditMetadata {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  changes?: Record<string, unknown>;
}
// Parse from JSON with proper typing
const metadata: AuditMetadata = typeof log.metadata === 'string'
  ? JSON.parse(log.metadata)
  : log.metadata;
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG:
const filters = (query as any).filters;

// ✅ CORRECT - Define proper interface:
interface AuditLogQuery {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
  level?: LogLevel;
  search?: string;
}
const filters: AuditLogQuery = {
  entityType: query.entityType,
  entityId: query.entityId,
  // ... all fields properly typed
};
```

**3. Use WorkflowAction Enum Directly** ⚠️ MANDATORY
```typescript
// ✅ CORRECT - Filter by action using enum:
const actions: WorkflowAction[] = [
  WorkflowAction.CANCEL,
  WorkflowAction.WITHDRAW,
  WorkflowAction.REJECT,
  WorkflowAction.PAUSE,
  WorkflowAction.RESUME,
];

where: {
  action: { in: actions }
}
```

**4. Proper Decorator Usage** ⚠️ Epic 8 Finding
```typescript
// ✅ CORRECT - Parse query parameters:
@Get()
async getAuditLogs(
  @Query('entityType') entityType?: string,
  @Query('entityId') entityId?: string,
  @Query('actorId') actorId?: string,
  @Query('action') action?: string,
  @Query('dateFrom') dateFrom?: string,
  @Query('dateTo') dateTo?: string,
  @Query('level') level?: string,
  @Query('page') page?: string,
  @Query('pageSize') pageSize?: string,
  @Query('search') search?: string,
): Promise<PaginatedAuditLogs> {
  // Build filters from query params
}
```

**5. Tests MUST Be Written**
```typescript
// Epic 9 achievement: 130 tests passing with 0 type violations
// Epic 10 REQUIREMENT: Write tests for audit log filtering scenarios
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  audit-logs/
    audit-logs.module.ts         # New: Module definition
    audit-logs.controller.ts     # New: Audit log endpoints
    audit-logs.service.ts        # New: Query and export logic
    dto/
      audit-log-query.dto.ts     # New: Filter query DTO
      pagination.dto.ts          # New: Pagination DTO (or reuse if exists)
    interfaces/
      audit-log-item.interface.ts    # New: Table row interface
      audit-log-detail.interface.ts  # New: Detail modal interface
      paginated-logs.interface.ts    # New: Paginated response interface
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    admin/
      audit-logs/
        page.tsx                  # New: Audit log viewer page
        components/
          AuditLogFilterPanel.tsx # New: Filter panel
          AuditLogsTable.tsx      # New: Logs table
          AuditLogDetailModal.tsx # New: Detail modal
  lib/
    api/
      audit-logs.ts              # New: Audit logs API client
    hooks/
      useAuditLogs.ts            # New: Audit logs query hook
      useAuditLogFilters.ts      # New: Filter state hook
```

### Architecture Compliance

**Audit Log Interfaces:**
```typescript
// Table row item
interface AuditLogItem {
  id: string;
  timestamp: Date;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityInfo: string;  // Display info (e.g., proposal code)
  level: LogLevel;
  metadataPreview: string;  // Truncated for preview
}

// Detail modal
interface AuditLogDetail extends AuditLogItem {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata: Record<string, unknown>;  // Full metadata
  relatedEntities?: {
    proposal?: { id: string; code: string; title: string };
    user?: { id: string; email: string; displayName: string };
  };
}

// Paginated response
interface PaginatedAuditLogs {
  data: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter query
interface AuditLogQuery {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
  level?: LogLevel;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}
```

**RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
@Controller('admin/audit-logs')
export class AuditLogController {
  @Get()
  async getAuditLogs(@Query() query: AuditLogQueryDto): Promise<PaginatedAuditLogs> {
    // Only ADMIN can access
  }

  @Get(':id')
  async getAuditLogDetail(@Param('id') id: string): Promise<AuditLogDetail> {
    // Get single log with full detail
  }
}
```

### Vietnamese Localization

All UI text in Vietnamese:

**UI Text:**
- "Nhật ký kiểm toán" (Audit Logs)
- "Bộ lọc" (Filters)
- "Tìm kiếm" (Search)
- "Loại thực thể" (Entity Type)
- "ID thực thể" (Entity ID)
- "Người thực hiện" (Actor)
- "Hành động" (Action)
- "Ngày bắt đầu" (From Date)
- "Ngày kết thúc" (To Date)
- "Mức độ" (Level)
- "Xuất Excel" (Export Excel)
- "Chi tiết" (Details)

**Entity Type Labels:**
- "Người dùng" (Users)
- "Đề tài" (Proposals)
- "Nhật ký workflow" (Workflow Logs)
- "Đánh giá" (Evaluations)
- "Hệ thống" (System)

**Action Labels:**
- "Tạo mới" (CREATE)
- "Cập nhật" (UPDATE)
- "Xóa" (DELETE)
- "Hủy bỏ" (CANCEL)
- "Rút hồ sơ" (WITHDRAW)
- "Từ chối" (REJECT)
- "Tạm dừng" (PAUSE)
- "Tiếp tục" (RESUME)

### Code Patterns to Follow

**Proper Audit Log Service (Epic 9 Retro Pattern):**
```typescript
// AuditLogsService.getAuditLogs()
async getAuditLogs(query: AuditLogQueryDto): Promise<PaginatedAuditLogs> {
  // Build where clause with proper typing
  const where: Prisma.AuditEventWhereInput = {};

  // Entity type filter
  if (query.entityType) {
    where.entityType = query.entityType;
  }

  // Entity ID filter
  if (query.entityId) {
    where.entityId = query.entityId;
  }

  // Actor filter
  if (query.actorId) {
    where.actorId = query.actorId;
  }

  // Action filter - support WorkflowAction enum
  if (query.action) {
    where.action = query.action;
  }

  // Date range filter
  if (query.dateFrom || query.dateTo) {
    where.timestamp = {};
    if (query.dateFrom) {
      where.timestamp.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      where.timestamp.lte = new Date(query.dateTo);
    }
  }

  // Level filter
  if (query.level) {
    where.level = query.level;
  }

  // Search - full text across multiple fields
  if (query.search) {
    where.OR = [
      { actorName: { contains: query.search, mode: 'insensitive' } },
      { action: { contains: query.search, mode: 'insensitive' } },
      { entityId: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Pagination params
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // Sort
  const sortBy = query.sortBy || 'timestamp';
  const sortOrder = query.sortOrder || 'desc';

  // Execute query with proper typing
  const [logs, total] = await Promise.all([
    this.prisma.auditEvent.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        timestamp: true,
        actorId: true,
        actorName: true,
        action: true,
        entityType: true,
        entityId: true,
        entityInfo: true,
        level: true,
        metadata: true,
      },
    }),
    this.prisma.auditEvent.count({ where }),
  ]);

  // Map to interface with proper typing - NO as any
  const data: AuditLogItem[] = logs.map(log => {
    // Parse metadata safely
    let metadata: Record<string, unknown> = {};
    try {
      metadata = typeof log.metadata === 'string'
        ? JSON.parse(log.metadata)
        : (log.metadata as Record<string, unknown>);
    } catch {
      metadata = {};
    }

    // Create preview (first 100 chars of metadata)
    const metadataPreview = JSON.stringify(metadata)
      .substring(0, 100);

    return {
      id: log.id,
      timestamp: log.timestamp,
      actorId: log.actorId,
      actorName: log.actorName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityInfo: log.entityInfo || `${log.entityType}:${log.entityId}`,
      level: log.level as LogLevel,
      metadataPreview,
    };
  });

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Get audit log detail
async getAuditLogDetail(id: string): Promise<AuditLogDetail> {
  const log = await this.prisma.auditEvent.findUnique({
    where: { id },
  });

  if (!log) {
    throw new NotFoundException('Nhật ký không tồn tại');
  }

  // Parse metadata safely
  let metadata: Record<string, unknown> = {};
  try {
    metadata = typeof log.metadata === 'string'
      ? JSON.parse(log.metadata)
      : (log.metadata as Record<string, unknown>);
  } catch {
    metadata = {};
  }

  // Load related entities based on entity type
  let relatedEntities: AuditLogDetail['relatedEntities'];

  if (log.entityType === 'Proposal' && log.entityId) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: log.entityId },
      select: { id: true, code: true, title: true },
    });
    if (proposal) {
      relatedEntities = {
        proposal: {
          id: proposal.id,
          code: proposal.code,
          title: proposal.title,
        },
      };
    }
  }

  return {
    id: log.id,
    timestamp: log.timestamp,
    actorId: log.actorId,
    actorName: log.actorName,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    entityInfo: log.entityInfo || `${log.entityType}:${log.entityId}`,
    level: log.level as LogLevel,
    ip: (metadata.ip as string) || undefined,
    userAgent: (metadata.userAgent as string) || undefined,
    requestId: (metadata.requestId as string) || undefined,
    metadata,
    relatedEntities,
  };
}
```

**Controller Implementation:**
```typescript
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
async getAuditLogs(@Query() query: AuditLogQueryDto): Promise<PaginatedAuditLogs> {
  return this.auditLogsService.getAuditLogs(query);
}

@Get('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
@Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
async exportAuditLogs(
  @Query() query: AuditLogQueryDto,
  @Res() res: Response,
): Promise<void> {
  const workbook = await this.auditLogsService.exportAuditLogs(query);
  const buffer = write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

@Get(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
async getAuditLogDetail(@Param('id') id: string): Promise<AuditLogDetail> {
  return this.auditLogsService.getAuditLogDetail(id);
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 9 Retro):**
```typescript
describe('AuditLogsService', () => {
  describe('getAuditLogs', () => {
    it('should filter by entity type', async () => {
      await createAuditLog({ entityType: 'User' });
      await createAuditLog({ entityType: 'Proposal' });

      const result = await service.getAuditLogs({ entityType: 'User' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].entityType).toBe('User');
    });

    it('should filter by date range', async () => {
      await createAuditLog({ timestamp: new Date('2026-01-01') });
      await createAuditLog({ timestamp: new Date('2026-01-10') });

      const result = await service.getAuditLogs({
        dateFrom: '2026-01-05',
        dateTo: '2026-01-15',
      });

      expect(result.data).toHaveLength(1);
    });

    it('should search across actor name and action', async () => {
      await createAuditLog({ actorName: 'Nguyen Van A', action: 'CREATE' });
      await createAuditLog({ actorName: 'Tran Thi B', action: 'DELETE' });

      const result = await service.getAuditLogs({ search: 'Nguyen' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].actorName).toContain('Nguyen');
    });

    it('should paginate correctly', async () => {
      await createAuditLogs(25);  // Create 25 logs

      const page1 = await service.getAuditLogs({ page: 1, pageSize: 10 });
      const page2 = await service.getAuditLogs({ page: 2, pageSize: 10 });

      expect(page1.data).toHaveLength(10);
      expect(page2.data).toHaveLength(10);
      expect(page1.total).toBe(25);
    });
  });
});
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 10-4 created via create-story workflow. Status: ready-for-dev
- Epic 9 retrospective learnings applied (type safety, no as unknown/as any)
- Proper interfaces for audit log items and details
- Type-safe filter query building
- Pagination with proper types
- Vietnamese localization for all labels
- Full text search implementation
- Export to Excel functionality
- Tests mandated per Epic 9 retro lessons

### File List

**To Create:**
- `qlnckh/apps/src/modules/audit-logs/audit-logs.module.ts` - Audit logs module
- `qlnckh/apps/src/modules/audit-logs/audit-logs.controller.ts` - Audit log endpoints
- `qlnckh/apps/src/modules/audit-logs/audit-logs.service.ts` - Query and export logic
- `qlnckh/apps/src/modules/audit-logs/dto/audit-log-query.dto.ts` - Filter query DTO
- `qlnckh/apps/src/modules/audit-logs/interfaces/audit-log-item.interface.ts` - Table row interface
- `qlnckh/apps/src/modules/audit-logs/interfaces/audit-log-detail.interface.ts` - Detail modal interface
- `qlnckh/apps/src/modules/audit-logs/interfaces/paginated-logs.interface.ts` - Paginated response interface
- `qlnckh/web-apps/src/app/admin/audit-logs/page.tsx` - Audit log viewer page
- `qlnckh/web-apps/src/app/admin/audit-logs/components/AuditLogFilterPanel.tsx` - Filter panel
- `qlnckh/web-apps/src/app/admin/audit-logs/components/AuditLogsTable.tsx` - Logs table
- `qlnckh/web-apps/src/app/admin/audit-logs/components/AuditLogDetailModal.tsx` - Detail modal
- `qlnckh/web-apps/src/lib/api/audit-logs.ts` - Audit logs API client
- `qlnckh/web-apps/src/lib/hooks/useAuditLogs.ts` - Audit logs query hook
- `qlnckh/web-apps/src/lib/hooks/useAuditLogFilters.ts` - Filter state hook

**To Modify:**
- `qlnckh/apps/src/app.module.ts` - Register AuditLogModule
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 9 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper interfaces for all audit log types
  - Type-safe filter query building
  - Pagination with proper types
  - Vietnamese localization for all labels
  - Full text search implementation
  - Export to Excel functionality
  - Tests mandated per Epic 9 retro lessons
  - Ready for dev-story workflow execution

## References

- [epics.md Story 10.4](../../planning-artifacts/epics.md#L2360-L2383) - Full requirements
- [epic-9-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-9-retro-2026-01-07.md) - Lessons learned
- [Story 1.4](./1-4-audit-log-foundation-auth-admin-actions.md) - Audit log foundation
- [Story 3.4](./3-4-workflow-logs-timeline-thread-view.md) - Workflow log patterns
- [Story 10.2](./10-2-export-excel-full-dump.md) - Export Excel patterns
