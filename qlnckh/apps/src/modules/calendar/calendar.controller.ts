import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { BusinessCalendarService, AuditContext } from './calendar.service';
import { CreateHolidayDto, UpdateHolidayDto, HolidayResponseDto, HolidayQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../rbac/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

/**
 * Current User Interface from JWT
 */
interface CurrentUserData {
  id: string;
  email: string;
  role: string;
  facultyId?: string | null;
}

/**
 * Business Calendar Controller
 *
 * Handles holiday management endpoints:
 * - GET /api/calendar/holidays - List all holidays
 * - GET /api/calendar/holidays/:id - Get holiday by ID
 * - POST /api/calendar/holidays - Create new holiday
 * - PATCH /api/calendar/holidays/:id - Update holiday
 * - DELETE /api/calendar/holidays/:id - Delete holiday
 *
 * Story 1.8: Business Calendar Basic
 * All endpoints require CALENDAR_MANAGE permission
 */
@Controller('calendar/holidays')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CALENDAR_MANAGE)
export class BusinessCalendarController {
  constructor(private readonly calendarService: BusinessCalendarService) {}

  /**
   * Extract audit context from request
   */
  private extractAuditContext(req: Request): AuditContext {
    return {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      requestId: typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined,
    };
  }

  /**
   * GET /api/calendar/holidays
   * List all holidays with optional filtering
   *
   * Story 1.8 AC1: View Holidays List
   *
   * Query params:
   * - year: Filter by year (e.g., 2026)
   * - month: Filter by month (1-12)
   * - isHoliday: Filter by isHoliday flag
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getHolidays(
    @Query('year', new DefaultValuePipe(null), ParseIntPipe) year?: number | null,
    @Query('month', new DefaultValuePipe(null), ParseIntPipe) month?: number | null,
    @Query('isHoliday') isHoliday?: string,
  ) {
    const query: HolidayQueryDto = {};
    if (year !== null) query.year = year;
    if (month !== null) query.month = month;
    if (isHoliday !== undefined) query.isHoliday = isHoliday === 'true';

    const holidays = await this.calendarService.getHolidays(query);

    return {
      success: true,
      data: holidays,
    };
  }

  /**
   * GET /api/calendar/holidays/:id
   * Get holiday by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getHolidayById(@Param('id') id: string) {
    const holiday = await this.calendarService.getHolidayById(id);

    return {
      success: true,
      data: holiday,
    };
  }

  /**
   * POST /api/calendar/holidays
   * Create a new holiday
   *
   * Story 1.8 AC2: Add New Holiday
   * Story 1.8 AC8: Holiday Uniqueness (returns 409 if date exists)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createHoliday(
    @Body() createHolidayDto: CreateHolidayDto,
    @CurrentUser() currentUser: CurrentUserData,
    @Req() req: Request,
  ) {
    const auditContext = this.extractAuditContext(req);
    const holiday = await this.calendarService.createHoliday(
      createHolidayDto,
      currentUser.id,
      auditContext,
    );

    return {
      success: true,
      data: holiday,
    };
  }

  /**
   * PATCH /api/calendar/holidays/:id
   * Update an existing holiday
   *
   * Story 1.8 AC3: Update Existing Holiday
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateHoliday(
    @Param('id') id: string,
    @Body() updateHolidayDto: UpdateHolidayDto,
    @CurrentUser() currentUser: CurrentUserData,
    @Req() req: Request,
  ) {
    const auditContext = this.extractAuditContext(req);
    const holiday = await this.calendarService.updateHoliday(
      id,
      updateHolidayDto,
      currentUser.id,
      auditContext,
    );

    return {
      success: true,
      data: holiday,
    };
  }

  /**
   * DELETE /api/calendar/holidays/:id
   * Delete a holiday
   *
   * Story 1.8 AC4: Delete Holiday
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHoliday(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserData,
    @Req() req: Request,
  ) {
    const auditContext = this.extractAuditContext(req);
    await this.calendarService.deleteHoliday(id, currentUser.id, auditContext);

    // No response body for 204
  }
}
