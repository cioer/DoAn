import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditService } from './audit.service';
import { AuditAction } from './audit-action.enum';
import { Prisma } from '@prisma/client';

describe('AuditService', () => {
  let service: AuditService;

  // Manual mock - bypass DI
  const mockPrisma = {
    auditEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };

  beforeEach(() => {
    // Manually create service with mock prisma - bypass DI
    service = new AuditService(mockPrisma as any);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logEvent', () => {
    it('should create an audit event with all fields', async () => {
      const createDto = {
        action: AuditAction.USER_CREATE,
        actorUserId: 'user-123',
        entityType: 'users',
        entityId: 'user-456',
        metadata: { email: 'test@example.com' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
      };

      mockPrisma.auditEvent.create.mockResolvedValue({
        id: 'audit-1',
        ...createDto,
        occurredAt: new Date(),
        createdAt: new Date(),
      });

      await service.logEvent(createDto);

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.USER_CREATE,
          actorUserId: 'user-123',
          entityType: 'users',
          entityId: 'user-456',
          metadata: { email: 'test@example.com' },
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        }),
      });
    });

    it('should create an audit event with minimal fields', async () => {
      const createDto = {
        action: AuditAction.LOGOUT,
        actorUserId: 'user-123',
      };

      mockPrisma.auditEvent.create.mockResolvedValue({
        id: 'audit-1',
        ...createDto,
        occurredAt: new Date(),
        createdAt: new Date(),
        entityType: null,
        entityId: null,
        metadata: Prisma.JsonNull,
        ip: null,
        userAgent: null,
        requestId: null,
      });

      await service.logEvent(createDto);

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.LOGOUT,
          actorUserId: 'user-123',
          entityType: null,
          entityId: null,
          metadata: Prisma.JsonNull,
        }),
      });
    });

    it('should handle errors gracefully without throwing', async () => {
      const createDto = {
        action: AuditAction.USER_CREATE,
        actorUserId: 'user-123',
      };

      mockPrisma.auditEvent.create.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(service.logEvent(createDto)).resolves.toBeUndefined();
    });
  });

  describe('getAuditEvents', () => {
    it('should return paginated audit events', async () => {
      const mockEvents = [
        {
          id: 'audit-1',
          occurredAt: new Date('2026-01-05T10:00:00Z'),
          actorUserId: 'user-1',
          action: AuditAction.USER_CREATE,
          entityType: 'users',
          entityId: 'user-2',
          metadata: { email: 'test@example.com' },
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-1',
          actorUser: {
            email: 'admin@example.com',
            displayName: 'Admin User',
          },
          actingAsUser: null,
        },
      ];

      mockPrisma.auditEvent.findMany.mockResolvedValue(mockEvents);
      mockPrisma.auditEvent.count.mockResolvedValue(1);

      const result = await service.getAuditEvents({
        page: 1,
        limit: 50,
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        action: AuditAction.USER_CREATE,
        actorEmail: 'admin@example.com',
      });
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      mockPrisma.auditEvent.findMany.mockResolvedValue([]);
      mockPrisma.auditEvent.count.mockResolvedValue(0);

      await service.getAuditEvents({
        entity_type: 'users',
        entity_id: 'user-123',
        action: AuditAction.USER_UPDATE,
        actor_user_id: 'admin-123',
        page: 1,
        limit: 50,
      });

      expect(mockPrisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          entityType: 'users',
          entityId: 'user-123',
          action: AuditAction.USER_UPDATE,
          actorUserId: 'admin-123',
        }),
        skip: 0,
        take: 50,
        orderBy: { occurredAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should apply date range filters', async () => {
      mockPrisma.auditEvent.findMany.mockResolvedValue([]);
      mockPrisma.auditEvent.count.mockResolvedValue(0);

      await service.getAuditEvents({
        from_date: '2026-01-01T00:00:00Z',
        to_date: '2026-01-31T23:59:59Z',
        page: 1,
        limit: 50,
      });

      expect(mockPrisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          occurredAt: {
            gte: new Date('2026-01-01T00:00:00Z'),
            lte: new Date('2026-01-31T23:59:59Z'),
          },
        }),
        skip: 0,
        take: 50,
        orderBy: { occurredAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('getEntityHistory', () => {
    it('should return chronological audit events for an entity', async () => {
      const mockEvents = [
        {
          id: 'audit-1',
          occurredAt: new Date('2026-01-05T09:00:00Z'),
          action: AuditAction.USER_CREATE,
          actorUser: { email: 'admin@example.com', displayName: 'Admin' },
          actingAsUser: null,
        },
        {
          id: 'audit-2',
          occurredAt: new Date('2026-01-05T10:00:00Z'),
          action: AuditAction.USER_UPDATE,
          actorUser: { email: 'admin@example.com', displayName: 'Admin' },
          actingAsUser: null,
        },
      ];

      mockPrisma.auditEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getEntityHistory('users', 'user-123');

      expect(result).toHaveLength(2);
      expect(mockPrisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'users',
          entityId: 'user-123',
        },
        orderBy: { occurredAt: 'asc' },
        include: expect.any(Object),
      });
    });
  });
});
