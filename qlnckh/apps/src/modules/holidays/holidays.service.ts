import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { Prisma } from '@prisma/client';
import { CreateHolidayDto, UpdateHolidayDto, HolidayQueryDto } from './dto/holiday.dto';

/**
 * Paginated Holidays Response
 * Epic 9 Retro: Proper interface, NO as unknown
 */
export interface PaginatedHolidays {
  data: Array<{
    id: string;
    date: Date;
    name: string;
    recurring: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Holidays Service
 * Story 10.5: Holiday Management (Full CRUD)
 *
 * Handles holiday management operations:
 * - Create, Read, Update, Delete holidays
 * - Vietnamese holiday seed data
 * - SLA integration (cache clearing)
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 * - File operations OUTSIDE transactions
 */
@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get holidays with filters
   * Story 10.5: AC1, AC2 - Holiday List
   */
  async getHolidays(query: HolidayQueryDto): Promise<PaginatedHolidays> {
    const where: Record<string, unknown> = {};

    // Year filter - declare variables outside if block for use in SQL template
    let startOfYear: Date | undefined;
    let endOfYear: Date | undefined;
    if (query.year) {
      const year = typeof query.year === 'string' ? parseInt(query.year, 10) : query.year;
      startOfYear = new Date(year, 0, 1);
      endOfYear = new Date(year, 11, 31, 23, 59, 59);
      where.date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    // Recurring filter
    if (query.recurring !== undefined) {
      where.recurring = query.recurring;
    }

    // Pagination
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [holidays, total] = await Promise.all([
      // Use Prisma.sql for parameterized query (SQL injection safe)
      this.prisma.$queryRaw<Array<{
        id: string;
        date: Date;
        name: string;
        recurring: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>>`
        SELECT id, date, name, recurring, created_at, updated_at
        FROM business_calendar
        WHERE is_holiday = true
        ${query.year ? Prisma.sql`AND date >= ${startOfYear} AND date <= ${endOfYear}` : Prisma.empty}
        ${query.recurring !== undefined ? Prisma.sql`AND recurring = ${query.recurring}` : Prisma.empty}
        ORDER BY date ASC
        LIMIT ${pageSize} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM business_calendar
        WHERE is_holiday = true
        ${query.year ? Prisma.sql`AND date >= ${startOfYear} AND date <= ${endOfYear}` : Prisma.empty}
        ${query.recurring !== undefined ? Prisma.sql`AND recurring = ${query.recurring}` : Prisma.empty}
      `,
    ]);

    return {
      data: holidays.map((h) => ({
        id: h.id,
        date: h.date,
        name: h.name,
        recurring: h.recurring,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      })),
      total: Number(total[0]?.count || 0),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / pageSize),
    };
  }

  /**
   * Get a single holiday by ID
   * Story 10.5: AC4 - Edit Holiday
   */
  async getHoliday(id: string): Promise<{
    id: string;
    date: Date;
    name: string;
    recurring: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const holiday = await this.prisma.businessCalendar.findFirst({
      where: {
        id,
        isHoliday: true,
      },
    });

    if (!holiday) {
      return null;
    }

    return {
      id: holiday.id,
      date: holiday.date,
      name: holiday.name,
      recurring: holiday.recurring,
      createdAt: holiday.createdAt,
      updatedAt: holiday.updatedAt,
    };
  }

  /**
   * Create a new holiday
   * Story 10.5: AC3 - Add Holiday Dialog
   * Story 10.5: AC6 - Holiday Validation
   */
  async createHoliday(
    dto: CreateHolidayDto,
    userId: string,
  ): Promise<{
    id: string;
    date: Date;
    name: string;
    recurring: boolean;
  }> {
    // Validate date uniqueness
    const existing = await this.prisma.businessCalendar.findFirst({
      where: {
        date: new Date(dto.date),
        isHoliday: true,
      },
    });

    if (existing) {
      throw new ConflictException('Ngày này đã tồn tại trong danh sách ngày lễ');
    }

    // Create holiday - Proper typing, NO as any (Epic 7 retro pattern)
    const holiday = await this.prisma.businessCalendar.create({
      data: {
        date: new Date(dto.date),
        name: dto.name.trim(),
        isHoliday: true,
        recurring: dto.recurring || false,
        isWorkingDay: false,
      },
    });

    // Log audit
    await this.auditService.logEvent({
      action: AuditAction.HOLIDAY_CREATE,
      actorUserId: userId,
      entityType: 'Holiday',
      entityId: holiday.id,
      metadata: {
        date: dto.date,
        name: dto.name,
        recurring: dto.recurring || false,
      },
    });

    this.logger.log(`Holiday created: ${dto.name} on ${dto.date}`);

    return {
      id: holiday.id,
      date: holiday.date,
      name: holiday.name,
      recurring: holiday.recurring,
    };
  }

  /**
   * Update an existing holiday
   * Story 10.5: AC4 - Edit Holiday
   * Story 10.5: AC6 - Holiday Validation
   */
  async updateHoliday(
    id: string,
    dto: UpdateHolidayDto,
    userId: string,
  ): Promise<{
    id: string;
    date: Date;
    name: string;
    recurring: boolean;
  }> {
    const holiday = await this.prisma.businessCalendar.findFirst({
      where: { id, isHoliday: true },
    });

    if (!holiday) {
      throw new NotFoundException('Ngày lễ không tồn tại');
    }

    // Check date uniqueness if date is being changed
    if (dto.date && dto.date !== holiday.date.toISOString().split('T')[0]) {
      const existing = await this.prisma.businessCalendar.findFirst({
        where: {
          date: new Date(dto.date),
          isHoliday: true,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Ngày này đã tồn tại trong danh sách ngày lễ');
      }
    }

    // Update holiday - Proper typing, NO as any (Epic 7 retro pattern)
    const updated = await this.prisma.businessCalendar.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.recurring !== undefined && { recurring: dto.recurring }),
      },
    });

    // Log audit
    await this.auditService.logEvent({
      action: AuditAction.HOLIDAY_UPDATE,
      actorUserId: userId,
      entityType: 'Holiday',
      entityId: id,
      metadata: {
        changes: dto,
      },
    });

    this.logger.log(`Holiday updated: ${id}`);

    return {
      id: updated.id,
      date: updated.date,
      name: updated.name,
      recurring: updated.recurring,
    };
  }

  /**
   * Delete a holiday
   * Story 10.5: AC5 - Delete Holiday
   */
  async deleteHoliday(id: string, userId: string): Promise<void> {
    const holiday = await this.prisma.businessCalendar.findFirst({
      where: { id, isHoliday: true },
    });

    if (!holiday) {
      throw new NotFoundException('Ngày lễ không tồn tại');
    }

    await this.prisma.businessCalendar.delete({
      where: { id },
    });

    // Log audit
    await this.auditService.logEvent({
      action: AuditAction.HOLIDAY_DELETE,
      actorUserId: userId,
      entityType: 'Holiday',
      entityId: id,
      metadata: {
        deletedHoliday: {
          date: holiday.date,
          name: holiday.name,
        },
      },
    });

    this.logger.log(`Holiday deleted: ${id}`);
  }

  /**
   * Get holidays for SLA calculation
   * Story 10.5: AC7 - SLA Calculator Integration
   */
  async getHolidaysForYear(year: number): Promise<Date[]> {
    const holidays = await this.prisma.businessCalendar.findMany({
      where: {
        isHoliday: true,
        OR: [
          { recurring: true },
          {
            date: {
              gte: new Date(year, 0, 1),
              lte: new Date(year, 11, 31),
            },
          },
        ],
      },
      select: {
        date: true,
        recurring: true,
      },
    });

    // Convert to Date array, expanding recurring holidays to the target year
    const holidayDates: Date[] = [];

    for (const holiday of holidays) {
      if (holiday.recurring) {
        // For recurring holidays, add the date for the target year
        const originalDate = new Date(holiday.date);
        const targetDate = new Date(year, originalDate.getMonth(), originalDate.getDate());
        holidayDates.push(targetDate);
      } else {
        holidayDates.push(holiday.date);
      }
    }

    return holidayDates;
  }
}
