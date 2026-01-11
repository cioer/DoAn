import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService, AuditStatistics } from './audit.service';
import { AuditQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../rbac/permissions.enum';
import { Request } from 'express';

/**
 * Audit Controller
 *
 * Provides audit log query endpoints for admin users.
 * All endpoints require AUDIT_VIEW permission.
 *
 * Story 10.4: Full Audit Log Viewer
 * - Statistics dashboard
 * - Advanced filtering
 * - Action grouping
 * - Timeline view
 */
@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.AUDIT_VIEW)
@ApiBearerAuth()
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
  async getAuditLogs(
    @Query('entity_type') entity_type?: string,
    @Query('entity_id') entity_id?: string,
    @Query('actor_user_id') actor_user_id?: string,
    @Query('action') action?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const query: AuditQueryDto = {
      entity_type,
      entity_id,
      actor_user_id,
      action,
      from_date,
      to_date,
      page,
      limit,
    };

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

  /**
   * GET /api/audit/statistics
   * Story 10.4: AC2 - Statistics Dashboard
   *
   * Returns aggregated statistics about audit events.
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Lấy thống kê audit logs',
    description: 'Trả về thống kê tổng hợp về các sự kiện audit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    const stats = await this.auditService.getAuditStatistics();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /api/audit/grouped
   * Story 10.4: AC4 - Action Grouping
   *
   * Returns audit events grouped by action type.
   */
  @Get('grouped')
  @ApiOperation({
    summary: 'Lấy audit logs được nhóm theo hành động',
    description: 'Trả về các sự kiện audit được nhóm theo loại hành động.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grouped audit events retrieved successfully',
  })
  async getGroupedAuditLogs(
    @Query('entity_type') entity_type?: string,
    @Query('entity_id') entity_id?: string,
    @Query('actor_user_id') actor_user_id?: string,
    @Query('action') action?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const query: AuditQueryDto = {
      entity_type,
      entity_id,
      actor_user_id,
      action,
      from_date,
      to_date,
      page,
      limit,
    };

    const result = await this.auditService.getAuditEventsGroupedByAction(query);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/audit/timeline
   * Story 10.4: AC5 - Timeline View
   *
   * Returns audit events in timeline view grouped by date.
   */
  @Get('timeline')
  @ApiOperation({
    summary: 'Lấy audit logs dạng timeline',
    description: 'Trả về các sự kiện audit được nhóm theo ngày dưới dạng timeline.',
  })
  @ApiResponse({
    status: 200,
    description: 'Timeline retrieved successfully',
  })
  async getAuditTimeline(
    @Query('entity_type') entity_type?: string,
    @Query('entity_id') entity_id?: string,
    @Query('actor_user_id') actor_user_id?: string,
    @Query('action') action?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const query: AuditQueryDto = {
      entity_type,
      entity_id,
      actor_user_id,
      action,
      from_date,
      to_date,
      page,
      limit,
    };

    const result = await this.auditService.getAuditTimeline(query);

    return {
      success: true,
      data: result,
    };
  }
}
