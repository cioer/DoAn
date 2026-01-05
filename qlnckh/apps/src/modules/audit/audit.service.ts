import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { AuditAction } from './audit-action.enum';
import { AuditEventResponse, PaginationMeta } from './entities/audit-event.entity';
import { AuditQueryDto } from './dto';

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
          action: dto.action,
          actorUserId: dto.actorUserId,
          actingAsUserId: dto.actingAsUserId || null,
          entityType: dto.entityType || null,
          entityId: dto.entityId || null,
          metadata: dto.metadata || null,
          ip: dto.ip || null,
          userAgent: dto.userAgent || null,
          requestId: dto.requestId || null,
        },
      });

      this.logger.debug(
        `Audit event logged: ${dto.action} by ${dto.actorUserId}` +
        (dto.entityId ? ` on ${dto.entityType}:${dto.entityId}` : ''),
      );
    } catch (error) {
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
        where.occurredAt = {
          ...where.occurredAt as object,
          gte: new Date(from_date),
        };
      }
      if (to_date) {
        where.occurredAt = {
          ...where.occurredAt as object,
          lte: new Date(to_date),
        };
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
}
