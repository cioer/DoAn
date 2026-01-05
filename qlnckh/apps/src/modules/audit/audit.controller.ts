import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { Permission } from '../rbac/permissions.enum';
import { Request } from 'express';

/**
 * Audit Controller
 *
 * Provides audit log query endpoints for admin users.
 * All endpoints require AUDIT_VIEW permission.
 */
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.AUDIT_VIEW)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Query audit logs with filters and pagination
   *
   * Query parameters:
   * - entity_type: Filter by entity type (e.g., "users", "holidays")
   * - entity_id: Filter by entity ID
   * - actor_user_id: Filter by actor user ID
   * - action: Filter by action type
   * - from_date: ISO date string for start date
   * - to_date: ISO date string for end date
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50, max: 200)
   *
   * @param query - Query parameters
   * @returns Paginated audit events
   */
  @Get()
  async getAuditLogs(@Query() query: AuditQueryDto) {
    const result = await this.auditService.getAuditEvents(query);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get audit history for a specific entity
   *
   * Returns chronological audit events for the specified entity.
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Chronological audit events
   */
  @Get('entity/:entityType/:entityId')
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const events = await this.auditService.getEntityHistory(entityType, entityId);

    return {
      success: true,
      data: {
        events,
        meta: {
          total: events.length,
        },
      },
    };
  }
}
