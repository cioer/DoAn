import { AuditEvent as PrismaAuditEvent } from '@prisma/client';
import { AuditAction } from '../audit-action.enum';

/**
 * Audit Event Entity
 *
 * Represents an audit log entry in the system.
 * Append-only - no updates or deletes allowed.
 */
export class AuditEvent implements PrismaAuditEvent {
  id: string;
  occurredAt: Date;
  actorUserId: string;
  actingAsUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;

  constructor(partial: Partial<AuditEvent>) {
    Object.assign(this, partial);
  }
}

/**
 * Audit Event Response DTO
 *
 * Used for API responses - includes related user data
 */
export interface AuditEventResponse {
  id: string;
  occurredAt: Date;
  actorUserId: string;
  actorEmail?: string;
  actorDisplayName?: string;
  actingAsUserId: string | null;
  actingAsEmail?: string | null;
  actingAsDisplayName?: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

/**
 * Create Audit Event DTO
 *
 * Used when creating a new audit event
 */
export interface CreateAuditEventDto {
  action: AuditAction;  // Type-safe: must be valid AuditAction enum value
  actorUserId: string;
  actingAsUserId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}
