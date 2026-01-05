import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { CreateHolidayDto, UpdateHolidayDto, HolidayResponseDto, HolidayQueryDto } from './dto';

/**
 * Audit context interface
 * Passed from controller to service for audit logging
 */
export interface AuditContext {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Business Calendar Service
 *
 * Manages holidays and business days for SLA calculations.
 * Provides CRUD operations for holidays in the business_calendar table.
 *
 * Story 1.8: Business Calendar Basic
 */
@Injectable()
export class BusinessCalendarService {
  private readonly logger = new Logger(BusinessCalendarService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private auditService?: AuditService,
  ) {}

  /**
   * Get all holidays with optional filtering
   * Story 1.8 AC1: View Holidays List
   */
  async getHolidays(query?: HolidayQueryDto): Promise<HolidayResponseDto[]> {
    const where: any = {};

    if (query?.year) {
      const startDate = new Date(query.year, 0, 1);
      const endDate = new Date(query.year, 11, 31);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (query?.month) {
      const year = query?.year || new Date().getFullYear();
      const startDate = new Date(year, query.month - 1, 1);
      const endDate = new Date(year, query.month, 0, 23, 59, 59);
      where.date = {
        ...where.date,
        gte: startDate,
        lte: endDate,
      };
    }

    if (query?.isHoliday !== undefined) {
      where.isHoliday = query.isHoliday;
    }

    const holidays = await this.prisma.businessCalendar.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return holidays.map((h) => this.toResponseDto(h));
  }

  /**
   * Get a single holiday by ID
   */
  async getHolidayById(id: string): Promise<HolidayResponseDto> {
    const holiday = await this.prisma.businessCalendar.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'HOLIDAY_NOT_FOUND',
          message: 'Không tìm thấy ngày lễ',
        },
      });
    }

    return this.toResponseDto(holiday);
  }

  /**
   * Create a new holiday
   * Story 1.8 AC2: Add New Holiday
   * Story 1.8 AC8: Holiday Uniqueness (conflict handled)
   */
  async createHoliday(
    dto: CreateHolidayDto,
    actorUserId: string,
    auditContext?: AuditContext,
  ): Promise<HolidayResponseDto> {
    // Check if date already exists (AC8)
    const existing = await this.prisma.businessCalendar.findUnique({
      where: { date: new Date(dto.date) },
    });

    if (existing) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'HOLIDAY_DATE_EXISTS',
          message: 'Ngày này đã tồn tại trong hệ thống',
        },
      });
    }

    const holiday = await this.prisma.businessCalendar.create({
      data: {
        date: new Date(dto.date),
        name: dto.name,
        isHoliday: dto.isHoliday ?? true,
        isWorkingDay: dto.isWorkingDay ?? false,
        recurring: dto.recurring ?? false,
      },
    });

    // Log audit event
    if (this.auditService) {
      await this.auditService.logEvent({
        action: AuditAction.HOLIDAY_CREATE,
        actorUserId,
        entityType: 'business_calendar',
        entityId: holiday.id,
        metadata: {
          date: holiday.date.toISOString(),
          name: holiday.name,
          isHoliday: holiday.isHoliday,
        },
        ...auditContext,
      });
    }

    this.logger.log(`Holiday created: ${holiday.name} on ${holiday.date.toISOString()}`);

    return this.toResponseDto(holiday);
  }

  /**
   * Update an existing holiday
   * Story 1.8 AC3: Update Existing Holiday
   */
  async updateHoliday(
    id: string,
    dto: UpdateHolidayDto,
    actorUserId: string,
    auditContext?: AuditContext,
  ): Promise<HolidayResponseDto> {
    const existing = await this.prisma.businessCalendar.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'HOLIDAY_NOT_FOUND',
          message: 'Không tìm thấy ngày lễ',
        },
      });
    }

    const holiday = await this.prisma.businessCalendar.update({
      where: { id },
      data: dto,
    });

    // Log audit event
    if (this.auditService) {
      await this.auditService.logEvent({
        action: AuditAction.HOLIDAY_UPDATE,
        actorUserId,
        entityType: 'business_calendar',
        entityId: holiday.id,
        metadata: {
          date: holiday.date.toISOString(),
          changes: dto,
        },
        ...auditContext,
      });
    }

    this.logger.log(`Holiday updated: ${holiday.id}`);

    return this.toResponseDto(holiday);
  }

  /**
   * Delete a holiday
   * Story 1.8 AC4: Delete Holiday
   */
  async deleteHoliday(
    id: string,
    actorUserId: string,
    auditContext?: AuditContext,
  ): Promise<void> {
    const existing = await this.prisma.businessCalendar.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'HOLIDAY_NOT_FOUND',
          message: 'Không tìm thấy ngày lễ',
        },
      });
    }

    await this.prisma.businessCalendar.delete({
      where: { id },
    });

    // Log audit event
    if (this.auditService) {
      await this.auditService.logEvent({
        action: AuditAction.HOLIDAY_DELETE,
        actorUserId,
        entityType: 'business_calendar',
        entityId: id,
        metadata: {
          date: existing.date.toISOString(),
          name: existing.name,
        },
        ...auditContext,
      });
    }

    this.logger.log(`Holiday deleted: ${id}`);
  }

  /**
   * Convert Prisma model to Response DTO
   */
  private toResponseDto(holiday: {
    id: string;
    date: Date;
    name: string;
    isHoliday: boolean;
    isWorkingDay: boolean;
    recurring: boolean;
  }): HolidayResponseDto {
    return {
      id: holiday.id,
      date: holiday.date.toISOString().split('T')[0], // YYYY-MM-DD format
      name: holiday.name,
      isHoliday: holiday.isHoliday,
      isWorkingDay: holiday.isWorkingDay,
      recurring: holiday.recurring,
    };
  }

  /**
   * Check if a given date is a business day
   * Used by SlaService for SLA calculations
   * Business day = NOT weekend (Sat/Sun) AND NOT a holiday
   *
   * @param date - Date to check
   * @returns true if business day, false otherwise
   */
  async isBusinessDay(date: Date): Promise<boolean> {
    const dayOfWeek = date.getDay();

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check if it's a holiday
    const holiday = await this.prisma.businessCalendar.findUnique({
      where: {
        date: this.stripTime(date),
      },
    });

    // If holiday exists and isHoliday=true, not a business day
    if (holiday && holiday.isHoliday) {
      return false;
    }

    // If explicitly marked as working day (compensatory day), it's a business day
    if (holiday && holiday.isWorkingDay) {
      return true;
    }

    return true;
  }

  /**
   * Strip time from date, keep only date portion
   * Used for matching with database Date type
   */
  private stripTime(date: Date): Date {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }
}
