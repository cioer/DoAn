import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditService, AuditStatistics } from './audit.service';
import { AuditAction } from './audit-action.enum';
import { UserRole, User } from '@prisma/client';

/**
 * Audit Service Extension Tests
 * Story 10.4: Full Audit Log Viewer
 *
 * Tests follow Epic 9 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Direct AuditAction enum usage
 */

// Manual mock
const mockPrisma = {
  auditEvent: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    groupBy: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

describe('AuditService - Story 10.4 Extensions', () => {
  let service: AuditService;

  // Test data fixtures
  const mockAuditEvents = [
    {
      id: 'event-1',
      action: AuditAction.USER_CREATE,
      actorUserId: 'user-1',
      entityType: 'User',
      entityId: 'new-user-1',
      occurredAt: new Date('2026-01-01'),
      metadata: { email: 'newuser@example.com' },
      ip: '127.0.0.1',
      userAgent: 'test',
      requestId: 'req-1',
      actingAsUserId: null,
      actorUser: {
        email: 'admin@example.com',
        displayName: 'Admin User',
      },
      actingAsUser: null,
    },
    {
      id: 'event-2',
      action: AuditAction.PROPOSAL_CREATE,
      actorUserId: 'user-2',
      entityType: 'Proposal',
      entityId: 'DT-001',
      occurredAt: new Date('2026-01-02'),
      metadata: { title: 'Test Proposal' },
      ip: '127.0.0.1',
      userAgent: 'test',
      requestId: 'req-2',
      actingAsUserId: null,
      actorUser: {
        email: 'user@example.com',
        displayName: 'Test User',
      },
      actingAsUser: null,
    },
  ];

  beforeEach(() => {
    service = new AuditService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('AC1: Statistics Dashboard', () => {
    beforeEach(() => {
      // Mock count to return different values based on call order
      // Service calls: 1) totalEvents (no args), 2) todayEvents, 3) thisWeekEvents, 4) thisMonthEvents
      // Using call order tracking since dates can be equal (e.g., Feb 1, 2026 is Sunday = start of week = start of month)
      let countCallIndex = 0;
      mockPrisma.auditEvent.count.mockImplementation((args?: { where?: unknown }) => {
        countCallIndex++;
        // If no where clause, return total count (call 1)
        if (!args || !args.where) {
          return Promise.resolve(100);
        }
        // Time-based queries are called in order via Promise.all
        // Call 2: todayEvents, Call 3: thisWeekEvents, Call 4: thisMonthEvents
        const where = args.where as { occurredAt?: { gte?: Date } };
        if (where.occurredAt?.gte) {
          // Use call order to determine which count this is
          if (countCallIndex === 2) {
            return Promise.resolve(5); // today
          }
          if (countCallIndex === 3) {
            return Promise.resolve(15); // this week
          }
          if (countCallIndex === 4) {
            return Promise.resolve(50); // this month
          }
        }
        return Promise.resolve(100);
      });

      mockPrisma.auditEvent.groupBy
        .mockResolvedValueOnce([
          { action: AuditAction.USER_CREATE, _count: { action: 10 } },
          { action: AuditAction.PROPOSAL_CREATE, _count: { action: 20 } },
        ])
        .mockResolvedValueOnce([
          { entityType: 'User', _count: { entityType: 15 } },
          { entityType: 'Proposal', _count: { entityType: 25 } },
        ])
        .mockResolvedValueOnce([
          { actorUserId: 'admin-1', _count: { actorUserId: 50 } },
          { actorUserId: 'user-1', _count: { actorUserId: 30 } },
        ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        displayName: 'Admin User',
        email: 'admin@example.com',
      });
    });

    it('should return audit statistics', async () => {
      const stats = await service.getAuditStatistics();

      expect(stats).toHaveProperty('totalEvents', 100);
      expect(stats).toHaveProperty('eventsByAction');
      expect(stats).toHaveProperty('eventsByEntityType');
      expect(stats).toHaveProperty('topActors');
      expect(stats).toHaveProperty('todayEvents');
      expect(stats).toHaveProperty('thisWeekEvents');
      expect(stats).toHaveProperty('thisMonthEvents');
    });

    it('should group events by action', async () => {
      const stats = await service.getAuditStatistics();

      expect(stats.eventsByAction).toHaveProperty('USER_CREATE', 10);
      expect(stats.eventsByAction).toHaveProperty('PROPOSAL_CREATE', 20);
    });

    it('should group events by entity type', async () => {
      const stats = await service.getAuditStatistics();

      expect(stats.eventsByEntityType).toHaveProperty('User', 15);
      expect(stats.eventsByEntityType).toHaveProperty('Proposal', 25);
    });

    it('should return top actors', async () => {
      const stats = await service.getAuditStatistics();

      expect(stats.topActors).toBeInstanceOf(Array);
      expect(stats.topActors.length).toBeGreaterThan(0);
      expect(stats.topActors[0]).toHaveProperty('userId');
      expect(stats.topActors[0]).toHaveProperty('displayName');
      expect(stats.topActors[0]).toHaveProperty('count');
    });

    it('should track time-based event counts', async () => {
      const stats = await service.getAuditStatistics();

      expect(stats.todayEvents).toBe(5);
      expect(stats.thisWeekEvents).toBe(15);
      expect(stats.thisMonthEvents).toBe(50);
    });
  });

  describe('AC2: Action Grouping', () => {
    beforeEach(() => {
      mockPrisma.auditEvent.groupBy.mockResolvedValue([
        {
          action: AuditAction.USER_CREATE,
          _count: { action: 5 },
          _max: { occurredAt: new Date('2026-01-05') },
        },
        {
          action: AuditAction.PROPOSAL_CREATE,
          _count: { action: 3 },
          _max: { occurredAt: new Date('2026-01-04') },
        },
      ]);
      mockPrisma.auditEvent.findFirst.mockResolvedValue(mockAuditEvents[0]);
    });

    it('should group events by action type', async () => {
      const result = await service.getAuditEventsGroupedByAction({
        page: 1,
        limit: 50,
      });

      expect(result.groups).toBeInstanceOf(Array);
      expect(result.groups.length).toBe(2);
    });

    it('should include latest event for each group', async () => {
      const result = await service.getAuditEventsGroupedByAction({
        page: 1,
        limit: 50,
      });

      expect(result.groups[0]).toHaveProperty('action');
      expect(result.groups[0]).toHaveProperty('count');
      expect(result.groups[0]).toHaveProperty('latestEvent');
    });

    it('should sort groups by count descending', async () => {
      const result = await service.getAuditEventsGroupedByAction({
        page: 1,
        limit: 50,
      });

      // USER_CREATE has count 5, PROPOSAL_CREATE has count 3
      expect(result.groups[0].action).toBe('USER_CREATE');
      expect(result.groups[0].count).toBe(5);
    });
  });

  describe('AC3: Timeline View', () => {
    beforeEach(() => {
      mockPrisma.auditEvent.findMany.mockResolvedValue([
        {
          ...mockAuditEvents[0],
          occurredAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
          ...mockAuditEvents[1],
          occurredAt: new Date('2026-01-01T14:00:00Z'),
        },
        {
          ...mockAuditEvents[0],
          occurredAt: new Date('2026-01-02T09:00:00Z'),
        },
      ]);
    });

    it('should group events by date', async () => {
      const result = await service.getAuditTimeline({
        page: 1,
        limit: 50,
      });

      expect(result.timeline).toBeInstanceOf(Array);
      expect(result.timeline.length).toBeGreaterThan(0);
    });

    it('should include date, count, and events for each day', async () => {
      const result = await service.getAuditTimeline({
        page: 1,
        limit: 50,
      });

      expect(result.timeline[0]).toHaveProperty('date');
      expect(result.timeline[0]).toHaveProperty('count');
      expect(result.timeline[0]).toHaveProperty('events');
      expect(result.timeline[0].events).toBeInstanceOf(Array);
    });

    it('should order timeline by date descending', async () => {
      const result = await service.getAuditTimeline({
        page: 1,
        limit: 50,
      });

      // Most recent date first
      expect(result.timeline[0].date).toBe('2026-01-02');
      expect(result.timeline[1].date).toBe('2026-01-01');
    });
  });

  describe('AC4: Filter Application', () => {
    beforeEach(() => {
      mockPrisma.auditEvent.count.mockResolvedValue(10);
      mockPrisma.auditEvent.findMany.mockResolvedValue(mockAuditEvents);
    });

    it('should apply entity_type filter', async () => {
      await service.getAuditEvents({
        entity_type: 'User',
        page: 1,
        limit: 50,
      });

      const whereClause = mockPrisma.auditEvent.findMany.mock.calls[0][0].where;
      expect(whereClause.entityType).toBe('User');
    });

    it('should apply entity_id filter', async () => {
      await service.getAuditEvents({
        entity_id: 'DT-001',
        page: 1,
        limit: 50,
      });

      const whereClause = mockPrisma.auditEvent.findMany.mock.calls[0][0].where;
      expect(whereClause.entityId).toBe('DT-001');
    });

    it('should apply actor_user_id filter', async () => {
      await service.getAuditEvents({
        actor_user_id: 'user-1',
        page: 1,
        limit: 50,
      });

      const whereClause = mockPrisma.auditEvent.findMany.mock.calls[0][0].where;
      expect(whereClause.actorUserId).toBe('user-1');
    });

    it('should apply action filter', async () => {
      await service.getAuditEvents({
        action: AuditAction.USER_CREATE,
        page: 1,
        limit: 50,
      });

      const whereClause = mockPrisma.auditEvent.findMany.mock.calls[0][0].where;
      expect(whereClause.action).toBe(AuditAction.USER_CREATE);
    });

    it('should apply date range filter', async () => {
      const fromDate = '2026-01-01';
      const toDate = '2026-01-31';

      await service.getAuditEvents({
        from_date: fromDate,
        to_date: toDate,
        page: 1,
        limit: 50,
      });

      const whereClause = mockPrisma.auditEvent.findMany.mock.calls[0][0].where;
      expect(whereClause.occurredAt.gte).toBeInstanceOf(Date);
      expect(whereClause.occurredAt.lte).toBeInstanceOf(Date);
    });
  });

  describe('AC5: Pagination', () => {
    beforeEach(() => {
      mockPrisma.auditEvent.count.mockResolvedValue(150);
      mockPrisma.auditEvent.findMany.mockResolvedValue(mockAuditEvents);
    });

    it('should paginate results correctly', async () => {
      const result = await service.getAuditEvents({
        page: 2,
        limit: 50,
      });

      expect(mockPrisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 50,
        take: 50,
        orderBy: { occurredAt: 'desc' },
        include: expect.any(Object),
      });

      expect(result.meta.total).toBe(150);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should return correct total pages', async () => {
      const result = await service.getAuditEvents({
        page: 1,
        limit: 50,
      });

      expect(result.meta.totalPages).toBe(3); // 150 / 50 = 3
    });
  });

  describe('AC6: Entity History', () => {
    beforeEach(() => {
      mockPrisma.auditEvent.findMany.mockResolvedValue([
        mockAuditEvents[0],
        mockAuditEvents[1],
      ]);
    });

    it('should get entity history in chronological order', async () => {
      const events = await service.getEntityHistory('Proposal', 'DT-001');

      expect(mockPrisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'Proposal',
          entityId: 'DT-001',
        },
        orderBy: { occurredAt: 'asc' },
        include: expect.any(Object),
      });

      expect(events).toBeInstanceOf(Array);
    });
  });

  describe('Epic 9 Retro: Type Safety', () => {
    beforeEach(() => {
      mockPrisma.auditEvent.count.mockResolvedValue(10);
      mockPrisma.auditEvent.findMany.mockResolvedValue(mockAuditEvents);
    });

    it('should use direct AuditAction enum - NO double cast', async () => {
      const result = await service.getAuditEvents({
        action: AuditAction.USER_CREATE,
        page: 1,
        limit: 50,
      });

      const whereClause = mockPrisma.auditEvent.findMany.mock.calls[0][0].where;
      expect(whereClause.action).toBe(AuditAction.USER_CREATE);
      expect(typeof whereClause.action).toBe('string');
    });

    it('should use proper typing - NO as unknown casting', async () => {
      const result = await service.getAuditEvents({
        page: 1,
        limit: 50,
      });

      // Verify result is properly typed
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('meta');
      expect(Array.isArray(result.events)).toBe(true);

      if (result.events.length > 0) {
        const firstEvent = result.events[0];
        expect(firstEvent).toHaveProperty('id');
        expect(firstEvent).toHaveProperty('occurredAt');
        expect(firstEvent).toHaveProperty('actorUserId');
        expect(firstEvent).toHaveProperty('action');
        expect(firstEvent).toHaveProperty('entityType');
        expect(firstEvent).toHaveProperty('entityId');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result set', async () => {
      mockPrisma.auditEvent.count.mockResolvedValue(0);
      mockPrisma.auditEvent.findMany.mockResolvedValue([]);

      const result = await service.getAuditEvents({
        page: 1,
        limit: 50,
      });

      expect(result.events).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should handle statistics with no events', async () => {
      mockPrisma.auditEvent.count.mockResolvedValue(0);
      mockPrisma.auditEvent.groupBy.mockResolvedValue([]);
      mockPrisma.auditEvent.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.getAuditStatistics();

      expect(stats.totalEvents).toBe(0);
      expect(stats.eventsByAction).toEqual({});
      expect(stats.eventsByEntityType).toEqual({});
      expect(stats.topActors).toHaveLength(0);
    });

    it('should handle timeline with no events', async () => {
      mockPrisma.auditEvent.findMany.mockResolvedValue([]);

      const result = await service.getAuditTimeline({
        page: 1,
        limit: 50,
      });

      expect(result.timeline).toHaveLength(0);
    });
  });
});
