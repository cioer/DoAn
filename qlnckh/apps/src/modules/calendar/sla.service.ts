import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { BusinessCalendarService } from './calendar.service';

/**
 * SLA Service
 *
 * Calculates business days for SLA deadlines.
 * Skips weekends (Sat/Sun) and holidays from BusinessCalendar.
 *
 * Story 1.8 AC5: SLA Helper - nextBusinessDay()
 * Story 1.8 AC6: SLA Helper - addBusinessDays()
 * Story 1.8 AC7: SLA Deadline - Skip Holidays
 *
 * All methods are deterministic - same input always produces same output.
 */
@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private prisma: PrismaService,
    private calendarService: BusinessCalendarService,
  ) {}

  /**
   * Get the next business day after the given date
   * Skips Saturday, Sunday, and holidays
   *
   * Story 1.8 AC5: nextBusinessDay() returns next business day
   *
   * @param date - Starting date (ISO string or Date)
   * @returns Next business day as Date
   */
  async nextBusinessDay(date: string | Date): Promise<Date> {
    const currentDate = new Date(date);
    let nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Keep adding days until we hit a business day
    while (!(await this.isBusinessDay(nextDay))) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    this.logger.debug(`nextBusinessDay(${date}) = ${nextDay.toISOString()}`);

    return nextDay;
  }

  /**
   * Add n business days to the given date
   * Skips Saturday, Sunday, and holidays
   *
   * Story 1.8 AC6: addBusinessDays() returns date after n business days
   *
   * @param date - Starting date (ISO string or Date)
   * @param n - Number of business days to add
   * @returns Date after n business days
   */
  async addBusinessDays(date: string | Date, n: number): Promise<Date> {
    const startDate = new Date(date);
    let resultDate = new Date(startDate);
    let businessDaysAdded = 0;

    while (businessDaysAdded < n) {
      resultDate.setDate(resultDate.getDate() + 1);
      if (await this.isBusinessDay(resultDate)) {
        businessDaysAdded++;
      }
    }

    this.logger.debug(`addBusinessDays(${date}, ${n}) = ${resultDate.toISOString()}`);

    return resultDate;
  }

  /**
   * Calculate SLA deadline from start date with given business days
   * Cutoff time is 17:00 - deadline is set to the cutoff hour
   *
   * Story 1.8 AC7: SLA Deadline - Skip Holidays
   *
   * @param startDate - Start date for SLA calculation
   * @param businessDays - Number of business days for SLA
   * @param cutoffHour - Hour when business day ends (default 17)
   * @returns Deadline as Date
   */
  async calculateDeadline(
    startDate: string | Date,
    businessDays: number,
    cutoffHour = 17,
  ): Promise<Date> {
    const deadline = await this.addBusinessDays(startDate, businessDays);
    deadline.setHours(cutoffHour, 0, 0, 0);

    this.logger.debug(
      `calculateDeadline(${startDate}, ${businessDays}bd, ${cutoffHour}h) = ${deadline.toISOString()}`,
    );

    return deadline;
  }

  /**
   * Calculate business days between two dates
   * Counts only business days (excludes weekends and holidays)
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Number of business days between dates
   */
  async countBusinessDays(startDate: string | Date, endDate: string | Date): Promise<number> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    let current = new Date(start);

    while (current < end) {
      current.setDate(current.getDate() + 1);
      if (await this.isBusinessDay(current)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if a given date is a business day
   * Business day = NOT weekend (Sat/Sun) AND NOT a holiday
   *
   * @param date - Date to check
   * @returns true if business day, false otherwise
   */
  private async isBusinessDay(date: Date): Promise<boolean> {
    return this.calendarService.isBusinessDay(date);
  }

  /**
   * Check if a deadline is overdue
   * Compares current time with deadline
   *
   * @param deadline - The deadline to check
   * @returns true if deadline has passed, false otherwise
   */
  isDeadlineOverdue(deadline: Date): boolean {
    return new Date() > deadline;
  }

  /**
   * Get remaining business days until deadline
   *
   * @param deadline - The deadline
   * @returns Number of remaining business days, or 0 if overdue
   */
  async getRemainingBusinessDays(deadline: Date): Promise<number> {
    if (this.isDeadlineOverdue(deadline)) {
      return 0;
    }
    return this.countBusinessDays(new Date(), deadline);
  }
}
