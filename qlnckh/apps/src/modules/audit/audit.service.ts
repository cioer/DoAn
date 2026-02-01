import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditAction } from './audit-action.enum';
import { AuditEventResponse, PaginationMeta } from './entities/audit-event.entity';
import { AuditQueryDto } from './dto';

/**
 * Audit Statistics Interface
 * Story 10.4: AC2 - Statistics Dashboard
 */
export interface AuditStatistics {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByEntityType: Record<string, number>;
  topActors: Array<{
    userId: string;
    displayName: string;
    email: string;
    count: number;
  }>;
  todayEvents: number;
  thisWeekEvents: number;
  thisMonthEvents: number;
}

/**
 * Create Audit Event DTO (internal interface for logEvent)
 * Separated from entities to allow AuditAction enum type
 */
interface CreateAuditEventDto {
  action: AuditAction;
  actorUserId: string;
  actingAsUserId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Audit Service
 *
 * Handles audit event logging and querying.
 * Audit events are append-only - no updates or deletes allowed.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event
   *
   * @param dto - Audit event data
   * @returns Created audit event
   */
  async logEvent(dto: CreateAuditEventDto): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          action: dto.action,
          actorUser: {
            connect: { id: dto.actorUserId },
          },
          actingAsUser: dto.actingAsUserId ? { connect: { id: dto.actingAsUserId } } : undefined,
          entityType: dto.entityType || null,
          entityId: dto.entityId || null,
          metadata: (dto.metadata ?? Prisma.JsonNull) as any,
          ip: dto.ip || null,
          userAgent: dto.userAgent || null,
          requestId: dto.requestId || null,
        },
      });

      this.logger.debug(
        `Audit event logged: ${dto.action} by ${dto.actorUserId}` +
        (dto.entityId ? ` on ${dto.entityType}:${dto.entityId}` : ''),
      );
    } catch (error: any) {
      // Check for foreign key constraint error
      // Prisma error code for foreign key constraint is P2003
      if (error.code === 'P2003' || error.message?.includes('foreign key')) {
        this.logger.warn(
          `Audit event skipped due to foreign key constraint: ${dto.action} by actorUserId=${dto.actorUserId}. ` +
          `This can happen when using a system/anonymous user ID that doesn't exist in the database. ` +
          `To fix, run: npm run seed:anonymous-user`
        );
        return; // Don't throw - allow the main flow to continue
      }

      // Log error but don't throw - audit logging should not break the main flow
      this.logger.error(
        `Failed to log audit event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Query audit events with filters and pagination
   *
   * @param query - Query parameters
   * @returns Paginated audit events
   */
  async getAuditEvents(query: AuditQueryDto): Promise<{
    events: AuditEventResponse[];
    meta: PaginationMeta;
  }> {
    const {
      entity_type,
      entity_id,
      actor_user_id,
      action,
      from_date,
      to_date,
      page = 1,
      limit = 50,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (entity_type) {
      where.entityType = entity_type;
    }

    if (entity_id) {
      where.entityId = entity_id;
    }

    if (actor_user_id) {
      where.actorUserId = actor_user_id;
    }

    if (action) {
      where.action = action;
    }

    if (from_date || to_date) {
      where.occurredAt = {};
      if (from_date) {
        (where.occurredAt as { gte?: Date; lte?: Date }).gte = new Date(from_date);
      }
      if (to_date) {
        (where.occurredAt as { gte?: Date; lte?: Date }).lte = new Date(to_date);
      }
    }

    // Get total count and events in parallel
    const [total, events] = await Promise.all([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          actorUser: {
            select: {
              email: true,
              displayName: true,
            },
          },
          actingAsUser: {
            select: {
              email: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    // Map to response format
    const eventResponses: AuditEventResponse[] = events.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      actorUserId: event.actorUserId,
      actorEmail: event.actorUser?.email,
      actorDisplayName: event.actorUser?.displayName,
      actingAsUserId: event.actingAsUserId,
      actingAsEmail: event.actingAsUser?.email,
      actingAsDisplayName: event.actingAsUser?.displayName,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
      ip: event.ip,
      userAgent: event.userAgent,
      requestId: event.requestId,
    }));

    return {
      events: eventResponses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit events for a specific entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Chronological audit events for the entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
  ): Promise<AuditEventResponse[]> {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { occurredAt: 'asc' },
      include: {
        actorUser: {
          select: {
            email: true,
            displayName: true,
          },
        },
        actingAsUser: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    return events.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      actorUserId: event.actorUserId,
      actorEmail: event.actorUser?.email,
      actorDisplayName: event.actorUser?.displayName,
      actingAsUserId: event.actingAsUserId,
      actingAsEmail: event.actingAsUser?.email,
      actingAsDisplayName: event.actingAsUser?.displayName,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
      ip: event.ip,
      userAgent: event.userAgent,
      requestId: event.requestId,
    }));
  }

  /**
   * Get audit statistics
   * Story 10.4: AC2 - Statistics Dashboard
   *
   * Returns aggregated statistics about audit events.
   *
   * @returns Audit statistics
   */
  async getAuditStatistics(): Promise<AuditStatistics> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total events
    const totalEvents = await this.prisma.auditEvent.count();

    // Get events by action
    const eventsByActionRaw = await this.prisma.auditEvent.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    });
    const eventsByAction: Record<string, number> = {};
    eventsByActionRaw.forEach((item) => {
      eventsByAction[item.action] = item._count.action;
    });

    // Get events by entity type
    const eventsByEntityRaw = await this.prisma.auditEvent.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
      where: { entityType: { not: null } },
      orderBy: { _count: { entityType: 'desc' } },
    });
    const eventsByEntityType: Record<string, number> = {};
    eventsByEntityRaw.forEach((item) => {
      if (item.entityType) {
        eventsByEntityType[item.entityType] = item._count.entityType;
      }
    });

    // Get top actors
    const topActorsRaw = await this.prisma.auditEvent.groupBy({
      by: ['actorUserId'],
      _count: { actorUserId: true },
      orderBy: { _count: { actorUserId: 'desc' } },
      take: 10,
    });
    const topActors = await Promise.all(
      topActorsRaw.map(async (item) => {
        const user = await this.prisma.user.findUnique({
          where: { id: item.actorUserId },
          select: { displayName: true, email: true },
        });
        return {
          userId: item.actorUserId,
          displayName: user?.displayName || 'Unknown',
          email: user?.email || 'Unknown',
          count: item._count.actorUserId,
        };
      }),
    );

    // Get time-based counts
    const [todayEvents, thisWeekEvents, thisMonthEvents] = await Promise.all([
      this.prisma.auditEvent.count({
        where: { occurredAt: { gte: startOfDay } },
      }),
      this.prisma.auditEvent.count({
        where: { occurredAt: { gte: startOfWeek } },
      }),
      this.prisma.auditEvent.count({
        where: { occurredAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalEvents,
      eventsByAction,
      eventsByEntityType,
      topActors,
      todayEvents,
      thisWeekEvents,
      thisMonthEvents,
    };
  }

  /**
   * Get audit events grouped by action
   * Story 10.4: AC4 - Action Grouping
   *
   * @param query - Query parameters
   * @returns Grouped audit events
   */
  async getAuditEventsGroupedByAction(query: AuditQueryDto): Promise<{
    groups: Array<{
      action: string;
      count: number;
      latestEvent: AuditEventResponse;
    }>;
  }> {
    // Apply same filters as getAuditEvents
    const where = this.buildWhereClause(query);

    // Group by action
    const grouped = await this.prisma.auditEvent.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
      _max: { occurredAt: true },
      orderBy: { _count: { action: 'desc' } },
    });

    // For each group, get the latest event
    const groups = await Promise.all(
      grouped.map(async (group) => {
        const latestEvent = await this.prisma.auditEvent.findFirst({
          where: {
            ...where,
            action: group.action,
          },
          orderBy: { occurredAt: 'desc' },
          include: {
            actorUser: {
              select: { email: true, displayName: true },
            },
          },
        });

        return {
          action: group.action,
          count: group._count.action,
          latestEvent: latestEvent
            ? {
                id: latestEvent.id,
                occurredAt: latestEvent.occurredAt,
                actorUserId: latestEvent.actorUserId,
                actorEmail: latestEvent.actorUser?.email,
                actorDisplayName: latestEvent.actorUser?.displayName,
                actingAsUserId: latestEvent.actingAsUserId,
                actingAsEmail: null,
                actingAsDisplayName: null,
                action: latestEvent.action,
                entityType: latestEvent.entityType,
                entityId: latestEvent.entityId,
                metadata: latestEvent.metadata,
                ip: latestEvent.ip,
                userAgent: latestEvent.userAgent,
                requestId: latestEvent.requestId,
              }
            : null,
        };
      }),
    );

    return { groups };
  }

  /**
   * Get timeline view of audit events
   * Story 10.4: AC5 - Timeline View
   *
   * @param query - Query parameters
   * @returns Timeline grouped by date
   */
  async getAuditTimeline(query: AuditQueryDto): Promise<{
    timeline: Array<{
      date: string;
      count: number;
      events: AuditEventResponse[];
    }>;
  }> {
    const where = this.buildWhereClause(query);
    const limit = query.limit || 100;

    // Get events ordered by date descending
    const events = await this.prisma.auditEvent.findMany({
      where,
      take: limit,
      orderBy: { occurredAt: 'desc' },
      include: {
        actorUser: {
          select: { email: true, displayName: true },
        },
        actingAsUser: {
          select: { email: true, displayName: true },
        },
      },
    });

    // Group by date
    const timelineMap: Record<string, AuditEventResponse[]> = {};

    events.forEach((event) => {
      const dateKey = event.occurredAt.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = [];
      }

      timelineMap[dateKey].push({
        id: event.id,
        occurredAt: event.occurredAt,
        actorUserId: event.actorUserId,
        actorEmail: event.actorUser?.email,
        actorDisplayName: event.actorUser?.displayName,
        actingAsUserId: event.actingAsUserId,
        actingAsEmail: event.actingAsUser?.email,
        actingAsDisplayName: event.actingAsUser?.displayName,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
        ip: event.ip,
        userAgent: event.userAgent,
        requestId: event.requestId,
      });
    });

    // Convert to array and sort by date descending
    const timeline = Object.entries(timelineMap)
      .map(([date, events]) => ({
        date,
        count: events.length,
        events,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return { timeline };
  }

  /**
   * Build Prisma where clause from query DTO
   * Extracted for reuse across methods
   */
  private buildWhereClause(query: AuditQueryDto): Prisma.AuditEventWhereInput {
    const {
      entity_type,
      entity_id,
      actor_user_id,
      action,
      from_date,
      to_date,
    } = query;

    const where: Prisma.AuditEventWhereInput = {};

    if (entity_type) {
      where.entityType = entity_type;
    }

    if (entity_id) {
      where.entityId = entity_id;
    }

    if (actor_user_id) {
      where.actorUserId = actor_user_id;
    }

    if (action) {
      where.action = action;
    }

    if (from_date || to_date) {
      where.occurredAt = {};
      if (from_date) {
        (where.occurredAt as { gte?: Date; lte?: Date }).gte = new Date(from_date);
      }
      if (to_date) {
        (where.occurredAt as { gte?: Date; lte?: Date }).lte = new Date(to_date);
      }
    }

    return where;
  }
}
