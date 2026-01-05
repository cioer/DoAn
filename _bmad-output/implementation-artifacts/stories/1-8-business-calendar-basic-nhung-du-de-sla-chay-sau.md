# Story 1.8: Business Calendar (Basic Nhưng Đủ Để SLA Chạy Sau)

Status: ready-for-dev

## Story

As a Admin,
I want quản lý danh sách ngày lễ,
So that SLA calculator tính đúng ngày làm việc.

**Định nghĩa basic nhưng đủ:** Story này implement Business Calendar CRUD và SLA helper functions. Không cần UI phức tạp - chỉ cần API endpoints để admin quản lý holidays và service functions để SLA calculator sử dụng sau này.

## Acceptance Criteria

**AC1: View Holidays List**
- Given Admin authenticated và có quyền CALENDAR_MANAGE
- When Admin gọi GET /api/calendar/holidays
- Then server trả về danh sách tất cả holidays từ business_calendar table
- And mỗi holiday có: date, name, isHoliday, isWorkingDay, recurring

**AC2: Add New Holiday**
- Given Admin authenticated và có quyền CALENDAR_MANAGE
- When Admin gọi POST /api/calendar/holidays với body { date, name, isHoliday, recurring }
- Then holiday mới được tạo trong business_calendar table
- And response trả về holiday đã tạo
- And audit event được log với action HOLIDAY_CREATE

**AC3: Update Existing Holiday**
- Given Admin authenticated và có quyền CALENDAR_MANAGE
- When Admin gọi PATCH /api/calendar/holidays/:id với body cập nhật
- Then holiday được cập nhật trong business_calendar table
- And response trả về holiday đã cập nhật
- And audit event được log với action HOLIDAY_UPDATE

**AC4: Delete Holiday**
- Given Admin authenticated và có quyền CALENDAR_MANAGE
- When Admin gọi DELETE /api/calendar/holidays/:id
- Then holiday được xóa khỏi business_calendar table
- And response trả về 204 No Content
- And audit event được log với action HOLIDAY_DELETE

**AC5: SLA Helper - nextBusinessDay()**
- Given SLA service đã được implement
- When gọi slaService.nextBusinessDay(date)
- Then trả về ngày làm việc tiếp theo (bỏ Sat/Sun + holidays)
- And deterministic (không random, cùng input -> cùng output)

**AC6: SLA Helper - addBusinessDays()**
- Given SLA service đã được implement
- When gọi slaService.addBusinessDays(date, n)
- Then trả về date sau n ngày làm việc (bỏ Sat/Sun + holidays)
- And deterministic (cùng input -> cùng output)

**AC7: SLA Deadline - Skip Holidays**
- Given SLA deadline rơi vào holiday hoặc weekend
- When tính deadline với addBusinessDays()
- Then deadline được dời sang ngày làm việc tiếp theo
- And logic consistent (không thay đổi giữa các lần gọi)

**AC8: Holiday Uniqueness**
- Given Admin thử tạo holiday với date đã tồn tại
- When gọi POST /api/calendar/holidays với date trùng
- Then server trả về 400 Bad Request
- And message: "Ngày này đã tồn tại trong hệ thống"

**AC9: Demo Data - Holidays Seeded**
- Given demo seed đã chạy
- When query business_calendar table
- Then có ít nhất 7 holidays từ DEMO_HOLIDAYS
- And bao gồm các ngày lễ Việt Nam chính (Tết, 30/4, 1/5, 2/9)

## Tasks / Subtasks

- [ ] Task 1: Backend - Business Calendar Module (AC: 1, 2, 3, 4, 8, 9)
  - [ ] Subtask 1.1: Create BusinessCalendarService with CRUD methods
  - [ ] Subtask 1.2: Create DTOs (CreateHolidayDto, UpdateHolidayDto, HolidayResponseDto)
  - [ ] Subtask 1.3: Create BusinessCalendarController with REST endpoints
  - [ ] Subtask 1.4: Add CALENDAR_MANAGE permission check
  - [ ] Subtask 1.5: Add audit logging for all mutations

- [ ] Task 2: Backend - SLA Helper Service (AC: 5, 6, 7)
  - [ ] Subtask 2.1: Create SlaService with nextBusinessDay() method
  - [ ] Subtask 2.2: Add addBusinessDays() method to SlaService
  - [ ] Subtask 2.3: Implement holiday lookup from BusinessCalendar
  - [ ] Subtask 2.4: Handle weekend (Sat/Sun) skip logic
  - [ ] Subtask 2.5: Ensure deterministic behavior

- [ ] Task 3: Testing & Validation (AC: All)
  - [ ] Subtask 3.1: Test holiday CRUD operations
  - [ ] Subtask 3.2: Test SLA helper functions with various inputs
  - [ ] Subtask 3.3: Test holiday uniqueness constraint
  - [ ] Subtask 3.4: Verify demo seed data contains holidays
  - [ ] Subtask 3.5: Test deterministic behavior of SLA functions

## Dev Notes

### Architecture Context

**Relevant Patterns from Story 1.2 (RBAC):**
- CALENDAR_MANAGE permission exists in Permission enum
- Use @UseGuards(JwtAuthGuard) for authentication
- Use RBAC checks for CALENDAR_MANAGE permission

**Relevant Patterns from Story 1.4 (Audit):**
- AuditService.logEvent() for tracking mutations
- HOLIDAY_CREATE, HOLIDAY_UPDATE, HOLIDAY_DELETE actions already defined

**Relevant Patterns from Story 1.6 (Seed Data):**
- BusinessCalendar model already exists in Prisma schema
- DEMO_HOLIDAYS already defined in demo-seed-data.constants.ts
- 7 Vietnamese holidays for 2026 are seeded

**Database Schema:**
```prisma
model BusinessCalendar {
  id            String    @id @default(uuid())
  date          DateTime  @db.Date
  name          String
  isHoliday     Boolean   @default(true)
  isWorkingDay  Boolean   @default(false) // For compensatory days
  recurring     Boolean   @default(false) // Yearly recurring
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([date])
  @@map("business_calendar")
}
```

### Backend API Design

**GET /api/calendar/holidays**
- Query params: year (optional), month (optional), isHoliday (optional)
- Response: Array of HolidayResponseDto

**POST /api/calendar/holidays**
- Body: CreateHolidayDto { date, name, isHoliday?, recurring? }
- Response: HolidayResponseDto
- Error: 400 if date already exists

**PATCH /api/calendar/holidays/:id**
- Body: UpdateHolidayDto { name?, isHoliday?, isWorkingDay?, recurring? }
- Response: HolidayResponseDto
- Error: 404 if holiday not found

**DELETE /api/calendar/holidays/:id**
- Response: 204 No Content
- Error: 404 if holiday not found

### Backend Implementation

**File: `apps/src/modules/calendar/dto/create-holiday.dto.ts`**

```typescript
import { IsDateString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateHolidayDto {
  @IsNotEmpty({ message: 'Ngày không được để trống' })
  @IsDateString({}, { message: 'Ngày phải ở định dạng ISO 8601' })
  date: string;

  @IsNotEmpty({ message: 'Tên ngày lễ không được để trống' })
  name: string;

  @IsOptional()
  @IsBoolean({ message: 'isHoliday phải là boolean' })
  isHoliday?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'recurring phải là boolean' })
  recurring?: boolean = false;
}
```

**File: `apps/src/modules/calendar/entities/holiday.entity.ts`**

```typescript
export interface HolidayResponseDto {
  id: string;
  date: string; // ISO 8601 format
  name: string;
  isHoliday: boolean;
  isWorkingDay: boolean;
  recurring: boolean;
}

export interface UpdateHolidayDto {
  name?: string;
  isHoliday?: boolean;
  isWorkingDay?: boolean;
  recurring?: boolean;
}
```

**File: `apps/src/modules/calendar/sla.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';

/**
 * SLA Service
 *
 * Calculates business days for SLA deadlines.
 * Skips weekends (Sat/Sun) and holidays from BusinessCalendar.
 *
 * All methods are deterministic - same input always produces same output.
 */
@Injectable()
export class SlaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the next business day after the given date
   * Skips Saturday, Sunday, and holidays
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

    return nextDay;
  }

  /**
   * Add n business days to the given date
   * Skips Saturday, Sunday, and holidays
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

    return resultDate;
  }

  /**
   * Check if a given date is a business day
   * Business day = NOT weekend (Sat/Sun) AND NOT a holiday
   *
   * @param date - Date to check
   * @returns true if business day, false otherwise
   */
  private async isBusinessDay(date: Date): Promise<boolean> {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

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

  /**
   * Calculate SLA deadline from start date with given business days
   * Cutoff time is 17:00 - if deadline falls after cutoff, move to next business day
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
    return deadline;
  }
}
```

### Project Structure Notes

**Backend files to create:**
- `apps/src/modules/calendar/calendar.module.ts` - Calendar module definition
- `apps/src/modules/calendar/calendar.controller.ts` - REST API endpoints
- `apps/src/modules/calendar/calendar.service.ts` - Business logic for holiday CRUD
- `apps/src/modules/calendar/sla.service.ts` - SLA helper service
- `apps/src/modules/calendar/dto/create-holiday.dto.ts` - Create DTO
- `apps/src/modules/calendar/dto/update-holiday.dto.ts` - Update DTO
- `apps/src/modules/calendar/entities/holiday.entity.ts` - Response types

**Backend files to modify:**
- `apps/src/modules/calendar/sla.service.ts` - May be referenced by other modules later
- `apps/src/app.module.ts` - Import CalendarModule

**Testing files to create:**
- `apps/src/modules/calendar/calendar.service.spec.ts` - Unit tests for holiday CRUD
- `apps/src/modules/calendar/sla.service.spec.ts` - Unit tests for SLA helpers

### Testing Standards

**Unit Tests:**
- Test CRUD operations for holidays
- Test nextBusinessDay() with various inputs (weekday, friday, holiday)
- Test addBusinessDays() with various n values
- Test uniqueness constraint on date
- Test deterministic behavior (same input → same output)

**Integration Tests:**
- Test full holiday lifecycle (create → read → update → delete)
- Test SLA functions with actual database holidays
- Test audit logging for all mutations

**Test Cases for SLA Helpers:**
1. nextBusinessDay():
   - Monday → Tuesday
   - Friday → Monday (skip weekend)
   - Day before holiday → next business day after holiday
   - Holiday → next business day after holiday

2. addBusinessDays():
   - Monday + 1 day → Tuesday
   - Friday + 1 day → Monday
   - Monday + 5 days → next Monday (skip weekend)
   - Holiday period handling

3. calculateDeadline():
   - Start date + business days → deadline at 17:00
   - Verify cutoff time is respected

### Party Mode Decision

**Decision #8: Business Calendar Basic**
- REST API for holiday CRUD (no complex UI needed yet)
- SLA helper service as injectable dependency
- Deterministic behavior (same input = same output)
- Audit logging for all mutations

### Risk Mitigation

**Risk 1: Non-deterministic SLA calculations**
- Mitigation: Use pure functions with database lookup, no random factors
- Test: Verify same input produces same output across multiple calls

**Risk 2: Holiday conflicts**
- Mitigation: Unique constraint on date in Prisma schema
- Test: Try creating duplicate holiday, expect 400 error

**Risk 3: SLA calculations with holidays near weekends**
- Mitigation: Comprehensive test cases for edge cases
- Test: Test with holidays on Friday, Monday, and extended weekends

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.8](../planning-artifacts/epics.md#story-18-business-calendar-basic-nhung-du-de-sla-chay-sau)
- [Source: _bmad-output/implementation-artifacts/stories/1-2-authorization-rbac-engine-ui-gating.md](./1-2-authorization-rbac-engine-ui-gating.md) - RBAC patterns
- [Source: _bmad-output/implementation-artifacts/stories/1-4-audit-log-foundation-auth-admin-actions.md](./1-4-audit-log-foundation-auth-admin-actions.md) - Audit patterns
- [Source: _bmad-output/implementation-artifacts/stories/1-6-deterministic-seed-data-du-cho-demo-flow.md](./1-6-deterministic-seed-data-du-cho-demo-flow.md) - BusinessCalendar schema

## Dev Agent Record

### Agent Model Used

_Created on: 2026-01-05_

### Debug Log References

_Initial story creation_

### Completion Notes List

_Story created and marked as ready-for-dev_

**Context Analysis Completed:**
- Epic 1.8 requirements extracted from epics.md
- BusinessCalendar model exists in Prisma schema
- DEMO_HOLIDAYS already defined in demo-seed-data.constants.ts
- CALENDAR_MANAGE permission exists in Permission enum
- Holiday audit actions (HOLIDAY_CREATE, UPDATE, DELETE) already defined

**Developer Guidance Provided:**
- REST API design for holiday CRUD
- SLA service with nextBusinessDay(), addBusinessDays(), calculateDeadline()
- Deterministic behavior requirements
- Testing strategies for edge cases

**Implementation Plan:**
1. Create calendar module with service and controller
2. Create DTOs for holiday operations
3. Implement SLA helper service
4. Add comprehensive unit and integration tests
5. Verify demo seed data contains holidays

### File List

_Created at story creation - no files modified yet_
