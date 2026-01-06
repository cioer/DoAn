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
   * Calculate SLA deadline with cutoff time handling
   * Story 3.6: If submit time is after cutoff hour, start counting from next business day
   *
   * Algorithm:
   * 1. If startDate.getHours() >= cutoffHour → find next business day first
   * 2. Add business days from the count start date
   * 3. Set deadline time to cutoffHour
   *
   * Examples:
   * - Friday 16:59 + 3 days = Tuesday 17:00 (Fri counts as day 1)
   * - Friday 17:01 + 3 days = Wednesday 17:00 (Fri doesn't count, start from Mon)
   *
   * @param startDate - Start date for SLA calculation (usually proposal submission time)
   * @param businessDays - Number of business days for SLA
   * @param cutoffHour - Hour when business day ends (default 17 = 5 PM)
   * @returns Deadline as Date with time set to cutoffHour
   */
  async calculateDeadlineWithCutoff(
    startDate: string | Date,
    businessDays: number,
    cutoffHour = 17,
  ): Promise<Date> {
    const submitDate = new Date(startDate);
    let countFromDate = new Date(submitDate);

    // Check if submit time is at or after cutoff hour
    // If submitted at or after cutoff, start counting from NEXT business day
    if (submitDate.getHours() >= cutoffHour) {
      // Find next business day to start counting
      countFromDate = await this.nextBusinessDay(submitDate);
      // Reset to midnight (start of business day)
      countFromDate.setHours(0, 0, 0, 0);
    }

    let deadline: Date;
    if (businessDays <= 0) {
      // Special case: 0 business days
      // Deadline is countFromDate (same day or next business day) at cutoff hour
      deadline = new Date(countFromDate);
    } else {
      // Add (businessDays - 1) because addBusinessDays starts counting from NEXT day
      // So if we want Monday to be day 1, we call addBusinessDays(Monday, 0)
      deadline = await this.addBusinessDays(countFromDate, businessDays - 1);
    }
    // Set deadline time to cutoff hour
    deadline.setHours(cutoffHour, 0, 0, 0);

    this.logger.debug(
      `calculateDeadlineWithCutoff(${startDate}, ${businessDays}bd, ${cutoffHour}h) = ${deadline.toISOString()}`,
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
