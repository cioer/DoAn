/**
 * Audit Query DTO
 *
 * Query parameters for filtering audit logs
 */
import { IsOptional, IsString, IsDateString, Max, Min } from 'class-validator';

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  entity_type?: string;

  @IsOptional()
  @IsString()
  entity_id?: string;

  @IsOptional()
  @IsString()
  actor_user_id?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @Min(1)
  page?: number;

  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Audit Events List Response
 */
export interface AuditEventsListResponse {
  events: Array<{
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
  }>;
  meta: PaginationMeta;
}
