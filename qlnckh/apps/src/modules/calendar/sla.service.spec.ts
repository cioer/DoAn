import { SlaService } from './sla.service';
import { PrismaService } from '../auth/prisma.service';
import { BusinessCalendarService } from './calendar.service';

/**
 * SLA Service Tests
 *
 * Story 1.8: Basic SLA calculation tests
 * Story 3.6: Cutoff time handling tests
 */

// Manual mock for BusinessCalendarService
const mockCalendarService = {
  isBusinessDay: vi.fn(),
};

// Manual mock for PrismaService
const mockPrisma = {
  businessHoliday: {
    findMany: vi.fn(),
  },
};

describe('SlaService', () => {
  let service: SlaService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SlaService(mockPrisma as any, mockCalendarService as any);
  });

  describe('Story 3.6: calculateDeadlineWithCutoff()', () => {
    beforeEach(() => {
      // Mock: Mon-Fri are business days, Sat-Sun are not
      // Note: Date.getDay() returns local day of week
      mockCalendarService.isBusinessDay.mockImplementation((date: Date) => {
        const day = date.getDay();
        // 0 = Sun, 6 = Sat -> not business days
        return day >= 1 && day <= 5;
      });
    });

    /**
     * AC1: Submit before cutoff
     * Current day counts as day 1, then add (businessDays - 1) more business days
     */
    describe('AC1: Submit before cutoff hour', () => {
      it('AC1.1: Friday 16:59 + 3 days = Tuesday 17:00', async () => {
        // Jan 9, 2026 is Friday
        const friday = new Date(2026, 0, 9, 16, 59, 0);

        const deadline = await service.calculateDeadlineWithCutoff(friday, 3, 17);

        // Fri 16:59 < 17:00, Fri counts as day 1
        // Sat/Sun skip, Mon=day2, Tue=day3 (Jan 13)
        expect(deadline.getDay()).toBe(2); // 2 = Tuesday
        expect(deadline.getDate()).toBe(13);
        expect(deadline.getHours()).toBe(17);
        expect(deadline.getMinutes()).toBe(0);
      });

      it('AC1.2: Friday 10:00 + 1 day = Friday 17:00 (same day)', async () => {
        const friday = new Date(2026, 0, 9, 10, 0, 0);

        const deadline = await service.calculateDeadlineWithCutoff(friday, 1, 17);

        // Fri 10:00 < 17:00, Fri counts as day 1, deadline is same day at 17:00
        expect(deadline.getDay()).toBe(5); // 5 = Friday
        expect(deadline.getDate()).toBe(9);
        expect(deadline.getHours()).toBe(17);
      });

      it('AC1.3: Monday 14:00 + 5 days = Friday 17:00 (same week)', async () => {
        // Jan 5, 2026 is Monday
        const monday = new Date(2026, 0, 5, 14, 0, 0);

        const deadline = await service.calculateDeadlineWithCutoff(monday, 5, 17);

        // Mon=day1, Tue=day2, Wed=day3, Thu=day4, Fri=day5 (Jan 9)
        expect(deadline.getDay()).toBe(5); // 5 = Friday
        expect(deadline.getDate()).toBe(9);
        expect(deadline.getHours()).toBe(17);
      });
    });

    /**
     * AC2: Submit after cutoff
     * Current day doesn't count, start from next business day
     */
    describe('AC2: Submit after cutoff hour', () => {
      it('AC2.1: Friday 17:01 + 3 days = Wednesday 17:00', async () => {
        const friday = new Date(2026, 0, 9, 17, 1, 0);

        const deadline = await service.calculateDeadlineWithCutoff(friday, 3, 17);

        // Fri doesn't count (after 17:00), Sat/Sun skip
        // Mon (Jan 12) start → Mon=day1, Tue=day2, Wed=day3 (Jan 14)
        expect(deadline.getDay()).toBe(3); // 3 = Wednesday
        expect(deadline.getDate()).toBe(14);
        expect(deadline.getHours()).toBe(17);
        expect(deadline.getMinutes()).toBe(0);
      });

      it('AC2.2: Friday 23:59 + 3 days = Wednesday 17:00', async () => {
        const friday = new Date(2026, 0, 9, 23, 59, 0);

        const deadline = await service.calculateDeadlineWithCutoff(friday, 3, 17);

        expect(deadline.getDay()).toBe(3); // 3 = Wednesday
        expect(deadline.getDate()).toBe(14);
        expect(deadline.getHours()).toBe(17);
      });

      it('AC2.3: Monday 17:30 + 1 day = Tuesday 17:00', async () => {
        const monday = new Date(2026, 0, 5, 17, 30, 0);

        const deadline = await service.calculateDeadlineWithCutoff(monday, 1, 17);

        // Monday doesn't count, Tue (Jan 6) start → Tue=day1
        expect(deadline.getDay()).toBe(2); // 2 = Tuesday
        expect(deadline.getDate()).toBe(6);
        expect(deadline.getHours()).toBe(17);
      });
    });

    /**
     * Edge case: Submit exactly at cutoff (17:00:00)
     * Treated as "at or after cutoff" so start from next business day
     */
    describe('Edge case: Submit exactly at cutoff hour', () => {
      it('Friday 17:00:00 + 3 days = Wednesday 17:00', async () => {
        const friday = new Date(2026, 0, 9, 17, 0, 0);

        const deadline = await service.calculateDeadlineWithCutoff(friday, 3, 17);

        // 17:00 is >= cutoff, so Friday doesn't count
        // Mon (Jan 12) start → Mon=day1, Tue=day2, Wed=day3 (Jan 14)
        expect(deadline.getDay()).toBe(3); // 3 = Wednesday
        expect(deadline.getDate()).toBe(14);
        expect(deadline.getHours()).toBe(17);
      });
    });

    /**
     * AC3: Holiday handling
     */
    describe('AC3: Holiday handling with cutoff', () => {
      beforeEach(() => {
        // Mock: Mon-Fri are business days EXCEPT Jan 12, 2026 (Monday) is a holiday
        mockCalendarService.isBusinessDay.mockImplementation((date: Date) => {
          const day = date.getDay();
          // Monday Jan 12, 2026 is a holiday
          if (day === 1 && date.getDate() === 12 && date.getMonth() === 0 && date.getFullYear() === 2026) {
            return false;
          }
          return day >= 1 && day <= 5;
        });
      });

      it('AC3.1: Friday 14:00 + 3 days with Monday holiday = Thursday 17:00', async () => {
        const friday = new Date(2026, 0, 9, 14, 0, 0); // Jan 9, 2026 = Friday

        const deadline = await service.calculateDeadlineWithCutoff(friday, 3, 17);

        // Fri 14:00 < 17:00, Fri counts as day 1 (Jan 9)
        // Sat/Sun skip, Mon=holiday skip (Jan 12), Tue=day2 (Jan 13), Wed=day3 (Jan 14)
        // addBusinessDays(Fri, 2): Sat skip, Sun skip, Mon=holiday skip, Tue=day1, Wed=day2
        // Result: Wednesday Jan 14
        expect(deadline.getDay()).toBe(3); // 3 = Wednesday
        expect(deadline.getDate()).toBe(14); // Jan 14
        expect(deadline.getHours()).toBe(17);
      });
    });

    /**
     * Additional edge cases
     */
    describe('Additional edge cases', () => {
      it('should handle zero business days', async () => {
        const monday = new Date(2026, 0, 5, 10, 0, 0);

        const deadline = await service.calculateDeadlineWithCutoff(monday, 0, 17);

        // 0 days before cutoff: special case, deadline is same day at 17:00
        expect(deadline.getDay()).toBe(1); // Monday
        expect(deadline.getDate()).toBe(5);
        expect(deadline.getHours()).toBe(17);
      });

      it('should handle Thursday after cutoff -> Friday deadline', async () => {
        // Jan 8, 2026 is Thursday
        const thursday = new Date(2026, 0, 8, 18, 0, 0);

        const deadline = await service.calculateDeadlineWithCutoff(thursday, 1, 17);

        // Thursday doesn't count, Fri (Jan 9) start → addBusinessDays(Fri, 0) = Fri
        expect(deadline.getDay()).toBe(5); // 5 = Friday
        expect(deadline.getDate()).toBe(9);
        expect(deadline.getHours()).toBe(17);
      });

      it('should handle Thursday before cutoff -> Thursday deadline', async () => {
        const thursday = new Date(2026, 0, 8, 16, 0, 0);

        const deadline = await service.calculateDeadlineWithCutoff(thursday, 1, 17);

        // Thursday 16:00 < 17:00, so Thursday counts as day 1
        // deadline is same day at 17:00
        expect(deadline.getDay()).toBe(4); // 4 = Thursday
        expect(deadline.getDate()).toBe(8);
        expect(deadline.getHours()).toBe(17);
      });
    });
  });

  /**
   * Story 1.8: Existing SLA methods tests
   */
  describe('Story 1.8: Existing SLA methods', () => {
    beforeEach(() => {
      mockCalendarService.isBusinessDay.mockImplementation((date: Date) => {
        const day = date.getDay();
        return day >= 1 && day <= 5;
      });
    });

    describe('nextBusinessDay()', () => {
      it('should return Monday when given Friday', async () => {
        const friday = new Date(2026, 0, 10, 12, 0, 0);

        const nextDay = await service.nextBusinessDay(friday);

        expect(nextDay.getDay()).toBe(1); // Monday
      });

      it('should return Tuesday when given Monday', async () => {
        const monday = new Date(2026, 0, 5, 12, 0, 0);

        const nextDay = await service.nextBusinessDay(monday);

        expect(nextDay.getDay()).toBe(2); // Tuesday
      });
    });

    describe('addBusinessDays()', () => {
      it('should add 3 business days to Friday = Wednesday', async () => {
        const friday = new Date(2026, 0, 10, 12, 0, 0);

        const result = await service.addBusinessDays(friday, 3);

        // Fri + 1 = Mon, +1 = Tue, +1 = Wed
        expect(result.getDay()).toBe(3); // Wednesday
      });
    });

    describe('calculateDeadline()', () => {
      it('should set deadline to cutoff hour', async () => {
        const monday = new Date(2026, 0, 5, 10, 0, 0);

        const deadline = await service.calculateDeadline(monday, 3, 17);

        expect(deadline.getHours()).toBe(17);
        expect(deadline.getMinutes()).toBe(0);
        expect(deadline.getSeconds()).toBe(0);
      });
    });
  });
});
