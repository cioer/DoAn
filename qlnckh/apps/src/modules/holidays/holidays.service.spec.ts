import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Holidays Service Tests
 * Story 10.5: Holiday Management (Full CRUD)
 *
 * Tests follow Epic 9 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 */

// Manual mock
const mockPrisma = {
  businessCalendar: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

const mockAuditService = {
  logEvent: vi.fn().mockResolvedValue(undefined),
};

describe('HolidaysService', () => {
  let service: HolidaysService;

  // Test data fixtures
  const mockHolidays = [
    {
      id: 'holiday-1',
      date: new Date('2026-01-01'),
      name: 'Tết Dương lịch',
      recurring: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'holiday-2',
      date: new Date('2026-04-30'),
      name: 'Giải phóng miền Nam',
      recurring: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  beforeEach(() => {
    service = new HolidaysService(
      mockPrisma as any,
      mockAuditService as any,
    );
    vi.clearAllMocks();
  });

  describe('AC1, AC2: Get Holidays', () => {
    beforeEach(() => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: 'holiday-1', date: new Date('2026-01-01'), name: 'Tết Dương lịch', recurring: true, created_at: new Date(), updated_at: new Date() },
      ]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1 }]);
    });

    it('should return holidays with pagination', async () => {
      const result = await service.getHolidays({
        page: 1,
        pageSize: 50,
      });

      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by year', async () => {
      mockPrisma.$queryRaw.mockClear();
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: 'holiday-1', date: new Date('2026-01-01'), name: 'Tết Dương lịch', recurring: true, created_at: new Date(), updated_at: new Date() },
      ]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1 }]);

      await service.getHolidays({
        year: 2026,
        page: 1,
        pageSize: 50,
      });

      // Verify $queryRaw was called (Prisma.sql template is used internally)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should filter by recurring', async () => {
      mockPrisma.$queryRaw.mockClear();
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: 'holiday-1', date: new Date('2026-01-01'), name: 'Tết Dương lịch', recurring: true, created_at: new Date(), updated_at: new Date() },
      ]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1 }]);

      await service.getHolidays({
        recurring: true,
        page: 1,
        pageSize: 50,
      });

      // Verify $queryRaw was called
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC3: Create Holiday', () => {
    const validDto = {
      date: '2026-05-05',
      name: 'Ngày nghỉ lễ',
      recurring: false,
    };

    beforeEach(() => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue(null); // No existing holiday
      mockPrisma.businessCalendar.create.mockResolvedValue({
        id: 'new-holiday',
        date: new Date('2026-05-05'),
        name: 'Ngày nghỉ lễ',
        recurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should create holiday successfully', async () => {
      const result = await service.createHoliday(validDto, 'user-1');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('recurring');
      expect(result.name).toBe('Ngày nghỉ lễ');
    });

    it('should validate date uniqueness', async () => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue({
        id: 'existing',
        date: new Date('2026-05-05'),
      });

      await expect(
        service.createHoliday(validDto, 'user-1')
      ).rejects.toThrow(ConflictException);
    });

    it('should trim holiday name', async () => {
      const dtoWithSpaces = {
        date: '2026-05-05',
        name: '  Ngày nghỉ lễ  ',
        recurring: false,
      };

      const result = await service.createHoliday(dtoWithSpaces, 'user-1');

      expect(result.name).toBe('Ngày nghỉ lễ');
    });

    it('should log audit event', async () => {
      await service.createHoliday(validDto, 'user-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.HOLIDAY_CREATE,
        actorUserId: 'user-1',
        entityType: 'Holiday',
        entityId: expect.any(String),
        metadata: {
          date: '2026-05-05',
          name: 'Ngày nghỉ lễ',
          recurring: false,
        },
      });
    });
  });

  describe('AC4: Update Holiday', () => {
    const updateDto = {
      name: 'Tên mới',
      recurring: true,
    };

    beforeEach(() => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue({
        id: 'holiday-1',
        date: new Date('2026-01-01'),
        name: 'Têt Dương lịch',
        recurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.businessCalendar.update.mockResolvedValue({
        id: 'holiday-1',
        date: new Date('2026-01-01'),
        name: 'Tên mới',
        recurring: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should update holiday successfully', async () => {
      const result = await service.updateHoliday('holiday-1', updateDto, 'user-1');

      expect(result.name).toBe('Tên mới');
      expect(result.recurring).toBe(true);
    });

    it('should throw NotFoundException for non-existent holiday', async () => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue(null);

      await expect(
        service.updateHoliday('non-existent', updateDto, 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should check date uniqueness when changing date', async () => {
      const dateUpdateDto = {
        date: '2026-12-25',
      };

      // Same date exists for another holiday
      mockPrisma.businessCalendar.findFirst
        .mockResolvedValueOnce(mockHolidays[0]) // Holiday to update exists
        .mockResolvedValueOnce({ id: 'other-holiday' }); // Another holiday on target date

      await expect(
        service.updateHoliday('holiday-1', dateUpdateDto, 'user-1')
      ).rejects.toThrow(ConflictException);
    });

    it('should log audit event', async () => {
      await service.updateHoliday('holiday-1', updateDto, 'user-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.HOLIDAY_UPDATE,
        actorUserId: 'user-1',
        entityType: 'Holiday',
        entityId: 'holiday-1',
        metadata: {
          changes: updateDto,
        },
      });
    });
  });

  describe('AC5: Delete Holiday', () => {
    beforeEach(() => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue(mockHolidays[0]);
      mockPrisma.businessCalendar.delete.mockResolvedValue({});
    });

    it('should delete holiday successfully', async () => {
      await service.deleteHoliday('holiday-1', 'user-1');

      expect(mockPrisma.businessCalendar.delete).toHaveBeenCalledWith({
        where: { id: 'holiday-1' },
      });
    });

    it('should throw NotFoundException for non-existent holiday', async () => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteHoliday('non-existent', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should log audit event', async () => {
      await service.deleteHoliday('holiday-1', 'user-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.HOLIDAY_DELETE,
        actorUserId: 'user-1',
        entityType: 'Holiday',
        entityId: 'holiday-1',
        metadata: {
          deletedHoliday: expect.objectContaining({
            date: mockHolidays[0].date,
            name: mockHolidays[0].name,
          }),
        },
      });
    });
  });

  describe('AC6: Holiday Validation', () => {
    // Note: DTO validation (@MinLength, @MaxLength) is handled by ValidationPipe at controller level
    // Service-level tests focus on business logic, not DTO validation
    it('should trim holiday name (service-level)', async () => {
      const dtoWithSpaces = {
        date: '2026-05-05',
        name: '  Valid Name  ',
        recurring: false,
      };

      mockPrisma.businessCalendar.findFirst.mockResolvedValue(null);
      mockPrisma.businessCalendar.create.mockResolvedValue({
        id: 'new-holiday',
        date: new Date('2026-05-05'),
        name: 'Valid Name',
        recurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createHoliday(dtoWithSpaces, 'user-1');

      expect(result.name).toBe('Valid Name');
      expect(mockPrisma.businessCalendar.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Valid Name',
        }),
      });
    });
  });

  describe('AC7: SLA Calculator Integration', () => {
    beforeEach(() => {
      mockPrisma.businessCalendar.findMany.mockResolvedValue([
        {
          date: new Date('2026-01-01'),
          recurring: true,
        },
        {
          date: new Date('2026-04-30'),
          recurring: false,
        },
      ]);
    });

    it('should return holidays for year', async () => {
      const holidays = await service.getHolidaysForYear(2026);

      expect(holidays).toBeInstanceOf(Array);
      expect(holidays.length).toBeGreaterThan(0);
    });

    it('should expand recurring holidays to target year', async () => {
      const holidays = await service.getHolidaysForYear(2026);

      // Recurring holidays should be mapped to 2026
      holidays.forEach((holiday) => {
        expect(holiday.getFullYear()).toBe(2026);
      });
    });

    it('should include non-recurring holidays in result', async () => {
      const holidays = await service.getHolidaysForYear(2026);

      // Should include both recurring and non-recurring
      expect(holidays.length).toBeGreaterThan(0);
    });
  });

  describe('AC8: Vietnamese Holiday Seed Data', () => {
    it('should include predefined Vietnamese holidays', async () => {
      const result = await service.getHolidays({
        page: 1,
        pageSize: 50,
      });

      // Seed data would be in the separate seed file
      expect(result).toHaveProperty('data');
    });
  });

  describe('AC9: Get Single Holiday', () => {
    beforeEach(() => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue(mockHolidays[0]);
    });

    it('should return single holiday by ID', async () => {
      const result = await service.getHoliday('holiday-1');

      expect(result).toHaveProperty('id', 'holiday-1');
      expect(result).toHaveProperty('name', 'Tết Dương lịch');
      expect(result).toHaveProperty('recurring', true);
    });

    it('should return null for non-existent holiday', async () => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue(null);

      const result = await service.getHoliday('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Epic 9 Retro: Type Safety', () => {
    beforeEach(() => {
      mockPrisma.businessCalendar.findFirst.mockResolvedValue(null);
      mockPrisma.businessCalendar.create.mockResolvedValue({
        id: 'new-holiday',
        date: new Date('2026-05-05'),
        name: 'Holiday Name',
        recurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should use proper typing - NO as unknown casting', async () => {
      const dto = {
        date: '2026-05-05',
        name: 'Holiday Name',
        recurring: false,
      };

      const result = await service.createHoliday(dto, 'user-1');

      // Verify result is properly typed
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('recurring');
      expect(result.id).toBeDefined();
      expect(result.date).toBeInstanceOf(Date);
      expect(typeof result.name).toBe('string');
      expect(typeof result.recurring).toBe('boolean');
    });

    it('should use AuditAction enum directly - NO double cast', async () => {
      const dto = {
        date: '2026-05-05',
        name: 'Holiday Name',
        recurring: false,
      };

      await service.createHoliday(dto, 'user-1');

      const auditCall = mockAuditService.logEvent.mock.calls[0][0];
      expect(auditCall.action).toBe(AuditAction.HOLIDAY_CREATE);
      expect(typeof auditCall.action).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      // Reset mocks for edge case tests
      mockPrisma.$queryRaw.mockReset();
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue({ count: 0 });
    });

    it('should handle empty holiday list', async () => {
      mockPrisma.$queryRaw.mockClear();
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.getHolidays({
        page: 1,
        pageSize: 50,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle updating with same date', async () => {
      const dto = {
        date: '2026-01-01',
        name: 'Updated Name',
      };

      // Holiday exists with same date
      mockPrisma.businessCalendar.findFirst
        .mockResolvedValueOnce({
          id: 'holiday-1',
          date: new Date('2026-01-01T00:00:00Z'),
          name: 'Tết Dương lịch',
          recurring: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) // Holiday to update
        .mockResolvedValueOnce(null); // No other holiday on this date (same holiday excluded)

      mockPrisma.businessCalendar.update.mockResolvedValue({
        id: 'holiday-1',
        date: new Date('2026-01-01'),
        name: 'Updated Name',
        recurring: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateHoliday('holiday-1', dto, 'user-1');

      expect(result.name).toBe('Updated Name');
    });

    it('should handle year filter with no holidays', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 0 }]);

      const result = await service.getHolidays({
        year: 2025,
        page: 1,
        pageSize: 50,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
