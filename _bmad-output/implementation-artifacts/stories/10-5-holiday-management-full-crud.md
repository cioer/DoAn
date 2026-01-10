# Story 10.5: Holiday Management (Full CRUD)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Epic 9 Retro Applied: Type safety enforced, no as unknown/as any casts, proper DTO mapping, tests required, proper decorator usage -->

## Story

As a Admin,
I want quản lý toàn bộ holidays,
So rằng SLA tính chính xác.

## Acceptance Criteria

1. **AC1: Holiday Management Page (Admin only)**
   - Given User có role = ADMIN
   - When User vào Holiday Management page (/admin/holidays)
   - Then UI hiển thị:
     - Danh sách holidays (table)
     - Button "Thêm ngày lễ"
     - Filter by year
     - Filter by recurring (all/one-time/recurring only)

2. **AC2: Holiday List Table**
   - Given Holiday Management page loaded
   - When holidays displayed
   - Then table columns:
     - Date (dd/MM/yyyy)
     - Name (Vietnamese)
     - Recurring (Yes/No icon)
     - Actions (Edit, Delete buttons)

3. **AC3: Add Holiday Dialog**
   - Given User click "Thêm ngày lễ"
   - When Form modal opens
   - Then form fields:
     - Date (date picker, required)
     - Name (text input, required, max 100 characters)
     - Recurring (checkbox, default unchecked)
     - "Lưu" và "Hủy" buttons

4. **AC4: Edit Holiday**
   - Given User click Edit on holiday row
   - When Update form modal opens
   - Then form pre-filled with existing data
   - And User can modify date, name, recurring
   - And sau khi update → holiday được update
   - And SLA calculator dùng holiday mới

5. **AC5: Delete Holiday**
   - Given User click Delete on holiday row
   - When Confirm dialog opens
   - Then show warning: "Bạn có chắc muốn xóa ngày lễ này?"
   - And sau khi confirm → holiday được xóa
   - And SLA calculator không còn tính ngày này

6. **AC6: Holiday Validation**
   - Given User try to add/update holiday
   - When validation fails
   - Then errors:
     - Date là required
     - Name là required (min 2 chars, max 100)
     - Không được trùng date với holiday đã tồn tại
     - Cannot delete holiday trong quá khứ (optional warning)

7. **AC7: SLA Calculator Integration**
   - Given Holiday được thêm/sửa/xóa
   - When SLA được calculate
   - Then SLA service sử dụng updated holiday list
   - And cache cleared (if using cache)

8. **AC8: Vietnamese Holidays Seed Data**
   - Given System khởi tạo
   - When seed data chạy
   - Then Vietnamese holidays được tạo:
     - 01/01: Tết Dương lịch
     - 30/04-01/05: Giải phóng
     - 01/05: Quốc tế Lao động
     - 02/09: Quốc khánh
     - Tet holidays (động, calculate based on year)

## Tasks / Subtasks

- [ ] Task 1: Backend - Holiday Module Setup (AC: #1)
  - [ ] Create HolidayModule in qlnckh/apps/src/modules/holidays/
  - [ ] Create HolidayController with /admin/holidays endpoints
  - [ ] RBAC: @RequireRoles(UserRole.ADMIN)

- [ ] Task 2: Backend - Holiday Model (AC: #1, #2)
  - [ ] Add Holiday model to schema.prisma
  - [ ] Fields: id, date, name, recurring, createdAt, updatedAt
  - [ ] Add index on date and recurring
  - [ ] Run prisma migrate

- [ ] Task 3: Backend - Holiday DTOs (AC: #3, #4, #6)
  - [ ] Create CreateHolidayDto (date, name, recurring)
  - [ ] Create UpdateHolidayDto (date, name, recurring)
  - [ ] Add validation decorators
  - [ ] NO as unknown/as any casts (Epic 9 retro pattern)

- [ ] Task 4: Backend - CRUD Service (AC: #2, #3, #4, #5)
  - [ ] Create getHolidays() method (with filters)
  - [ ] Create getHoliday() method (by ID)
  - [ ] Create createHoliday() method
  - [ ] Create updateHoliday() method
  - [ ] Create deleteHoliday() method
  - [ ] Implement date uniqueness check

- [ ] Task 5: Backend - SLA Integration (AC: #7)
  - [ ] Extend SLAService to fetch holidays from database
  - [ ] Clear holiday cache when holidays change
  - [ ] Recalculate SLA when holidays change (optional)

- [ ] Task 6: Backend - Seed Data (AC: #8)
  - [ ] Add Vietnamese holidays to form-templates.seed.ts
  - [ ] Include: 01/01, 30/04-01/05, 01/05, 02/09
  - [ ] Add Tet holidays calculation logic

- [ ] Task 7: Frontend - Holiday Management Page (AC: #1)
  - [ ] Create /admin/holidays/page.tsx
  - [ ] Year filter dropdown
  - [ ] Recurring filter toggle
  - [ ] "Add Holiday" button

- [ ] Task 8: Frontend - Holiday Table (AC: #2)
  - [ ] HolidayTable component
  - [ ] Date, name, recurring columns
  - [ ] Edit/Delete action buttons
  - [ ] Empty state illustration

- [ ] Task 9: Frontend - Add/Edit Dialog (AC: #3, #4)
  - [ ] HolidayFormDialog component (shared for add/edit)
  - [ ] Form validation
  - [ ] Date picker component
  - [ ] Recurring checkbox
  - [ ] Save/Cancel buttons

- [ ] Task 10: Frontend - Delete Confirmation (AC: #5)
  - [ ] DeleteHolidayDialog component
  - [ ] Warning message
  - [ ] Confirm/Cancel buttons

- [ ] Task 11: Unit Tests (All ACs)
  - [ ] Test holiday CRUD operations
  - [ ] Test date uniqueness validation
  - [ ] Test recurring filter
  - [ ] Test SLA integration
  - [ ] Test seed data

## Dev Notes

### Epic 10 Context

**Epic 10: Admin & System Configuration**
- FRs covered: FR46 (Import/Export), FR47 (Holiday Mgmt), FR48 (Audit Logs)
- Story 10.1: Import Excel (Users, Proposals)
- Story 10.2: Export Excel (Full Dump)
- Story 10.3: System Health Dashboard
- Story 10.4: Full Audit Log Viewer
- Story 10.5: Holiday Management (Full CRUD) (THIS STORY)
- Story 10.6: DB Restore + State Recompute

**Epic Objective:**
Enable full system administration with import/export, health monitoring, audit logs, and backup/restore.

### Dependencies

**Depends on:**
- Story 1.2 (RBAC) - For ADMIN role
- Story 1.8 (Business Calendar) - Base holiday calendar
- Story 3.6 (SLA Calculator) - For SLA integration

**Enables:**
- Accurate SLA calculations with up-to-date holidays

### Epic 9 Retro Learnings to Apply (CRITICAL)

From `epic-9-retro-2026-01-07.md`:

**1. NO `as unknown` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG - Epic 7 violation:
const holiday = data as unknown as Holiday;

// ✅ CORRECT - Epic 9 retro pattern:
interface CreateHolidayDto {
  date: string;  // ISO date string
  name: string;
  recurring: boolean;
}
const holiday: CreateHolidayDto = {
  date: dto.date,
  name: dto.name.trim(),
  recurring: dto.recurring || false,
};
```

**2. NO `as any` Casting** ⚠️ MANDATORY
```typescript
// ❌ WRONG:
const holidays = (result as any).data;

// ✅ CORRECT - Define proper interface:
interface HolidayListResponse {
  data: Holiday[];
  total: number;
}
const holidays: Holiday[] = result.data;
```

**3. Proper DTO Validation** ⚠️ Epic 8 Finding
```typescript
// ✅ CORRECT - Use class-validator decorators:
export class CreateHolidayDto {
  @IsDateString({}, { message: 'Ngày không hợp lệ' })
  date: string;

  @IsString()
  @MinLength(2, { message: 'Tên ngày lễ phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên ngày lễ không được quá 100 ký tự' })
  name: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}
```

**4. Tests MUST Be Written**
```typescript
// Epic 9 achievement: 130 tests passing with 0 type violations
// Epic 10 REQUIREMENT: Write tests for holiday CRUD scenarios
```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  holidays/
    holidays.module.ts           # New: Module definition
    holidays.controller.ts       # New: Holiday endpoints
    holidays.service.ts          # New: CRUD logic
    dto/
      create-holiday.dto.ts      # New: Create DTO
      update-holiday.dto.ts      # New: Update DTO
      holiday-query.dto.ts       # New: Query/filter DTO
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    admin/
      holidays/
        page.tsx                  # New: Holiday management page
        components/
          HolidayTable.tsx        # New: Holiday list table
          HolidayFormDialog.tsx   # New: Add/Edit form
          DeleteHolidayDialog.tsx # New: Delete confirmation
  lib/
    api/
      holidays.ts                # New: Holiday API client
    hooks/
      useHolidays.ts             # New: Holiday CRUD hook
```

### Architecture Compliance

**Database Schema:**
```prisma
model Holiday {
  id        String   @id @default(uuid())
  date      DateTime @db.Date
  name      String
  recurring Boolean   @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([date])
  @@index([recurring])
  @@index([date])
}
```

**Holiday Interfaces:**
```typescript
interface Holiday {
  id: string;
  date: Date;  // YYYY-MM-DD
  name: string;
  recurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateHolidayDto {
  date: string;  // ISO date string
  name: string;
  recurring: boolean;
}

interface UpdateHolidayDto {
  date?: string;
  name?: string;
  recurring?: boolean;
}

interface HolidayQuery {
  year?: number;
  recurring?: boolean;
  page?: number;
  pageSize?: number;
}
```

**RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
@Controller('admin/holidays')
export class HolidaysController {
  @Get()
  async getHolidays(@Query() query: HolidayQueryDto): Promise<PaginatedHolidays> {
    // Only ADMIN can access
  }

  @Post()
  async createHoliday(@Body() dto: CreateHolidayDto): Promise<Holiday> {
    // Create new holiday
  }

  @Patch(':id')
  async updateHoliday(
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
  ): Promise<Holiday> {
    // Update holiday
  }

  @Delete(':id')
  async deleteHoliday(@Param('id') id: string): Promise<void> {
    // Delete holiday
  }
}
```

### Vietnamese Localization

All UI text in Vietnamese:

**UI Text:**
- "Quản lý ngày lễ" (Holiday Management)
- "Thêm ngày lễ" (Add Holiday)
- "Chỉnh sửa ngày lễ" (Edit Holiday)
- "Xóa ngày lễ" (Delete Holiday)
- "Danh sách ngày lễ" (Holiday List)
- "Ngày" (Date)
- "Tên ngày lễ" (Holiday Name)
- "Lặp lại hàng năm" (Recurring)

**Filter Labels:**
- "Lọc theo năm" (Filter by Year)
- "Tất cả" (All)
- "Ngày lễ lặp lại" (Recurring Holidays)
- "Ngày lễ một lần" (One-time Holidays)

**Dialog Messages:**
- "Thêm ngày lễ mới" (Add New Holiday)
- "Chỉnh sửa ngày lễ" (Edit Holiday)
- "Bạn có chắc muốn xóa ngày lễ này?" (Are you sure you want to delete this holiday?)
- "Ngày lễ này sẽ bị xóa vĩnh viễn." (This holiday will be permanently deleted.)

**Validation Messages:**
- "Ngày là bắt buộc" (Date is required)
- "Tên ngày lễ là bắt buộc" (Holiday name is required)
- "Tên phải có ít nhất 2 ký tự" (Name must be at least 2 characters)
- "Tên không được quá 100 ký tự" (Name must not exceed 100 characters)
- "Ngày này đã tồn tại trong danh sách" (This date already exists in the list)

**Vietnamese Holiday Names (Seed Data):**
- "Tết Dương lịch" (New Year's Day) - 01/01
- "Giải phóng miền Nam, thống nhất đất nước" (Liberation Day) - 30/04
- "Ngày Quốc tế Lao động" (International Labor Day) - 01/05
- "Ngày Quốc khánh" (National Day) - 02/09
- "Tết Nguyên Đán" (Lunar New Year) - calculated based on year

### Code Patterns to Follow

**Proper Holiday Service (Epic 9 Retro Pattern):**
```typescript
// HolidaysService.createHoliday()
async createHoliday(dto: CreateHolidayDto): Promise<Holiday> {
  // Validate date uniqueness
  const existing = await this.prisma.holiday.findUnique({
    where: { date: new Date(dto.date) },
  });

  if (existing) {
    throw new ConflictException('Ngày này đã tồn tại trong danh sách');
  }

  // Create with proper typing - NO as any
  const holiday = await this.prisma.holiday.create({
    data: {
      date: new Date(dto.date),
      name: dto.name.trim(),
      recurring: dto.recurring || false,
    },
  });

  // Clear SLA cache if exists
  await this.slaService.clearHolidayCache();

  // Log audit
  await this.auditService.log({
    action: 'HOLIDAY_CREATED',
    entityType: 'Holiday',
    entityId: holiday.id,
    message: `Đã tạo ngày lễ: ${dto.name}`,
  });

  return holiday;
}

// Get holidays with filters
async getHolidays(query: HolidayQueryDto): Promise<PaginatedHolidays> {
  const where: Prisma.HolidayWhereInput = {};

  // Year filter
  if (query.year) {
    const startOfYear = new Date(query.year, 0, 1);
    const endOfYear = new Date(query.year, 11, 31);
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
    this.prisma.holiday.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: 'asc' },
    }),
    this.prisma.holiday.count({ where }),
  ]);

  return {
    data: holidays,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Update holiday
async updateHoliday(id: string, dto: UpdateHolidayDto): Promise<Holiday> {
  const holiday = await this.prisma.holiday.findUnique({
    where: { id },
  });

  if (!holiday) {
    throw new NotFoundException('Ngày lễ không tồn tại');
  }

  // Check date uniqueness if date is being changed
  if (dto.date && dto.date !== holiday.date.toISOString().split('T')[0]) {
    const existing = await this.prisma.holiday.findUnique({
      where: { date: new Date(dto.date) },
    });

    if (existing) {
      throw new ConflictException('Ngày này đã tồn tại trong danh sách');
    }
  }

  // Update with proper typing
  const updated = await this.prisma.holiday.update({
    where: { id },
    data: {
      ...(dto.date && { date: new Date(dto.date) }),
      ...(dto.name && { name: dto.name.trim() }),
      ...(dto.recurring !== undefined && { recurring: dto.recurring }),
    },
  });

  // Clear SLA cache
  await this.slaService.clearHolidayCache();

  return updated;
}

// Delete holiday
async deleteHoliday(id: string): Promise<void> {
  const holiday = await this.prisma.holiday.findUnique({
    where: { id },
  });

  if (!holiday) {
    throw new NotFoundException('Ngày lễ không tồn tại');
  }

  await this.prisma.holiday.delete({
    where: { id },
  });

  // Clear SLA cache
  await this.slaService.clearHolidayCache();
}
```

**SLA Integration:**
```typescript
// Extend SLAService to fetch holidays from database
async getHolidaysForYear(year: number): Promise<Date[]> {
  // Try cache first
  const cacheKey = `holidays:${year}`;
  const cached = await this.cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as Date[];
  }

  // Fetch from database
  const holidays = await this.prisma.holiday.findMany({
    where: {
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
  });

  // Convert to Date array
  const holidayDates = holidays.map(h => new Date(h.date));

  // Cache for 1 hour
  await this.cache.set(cacheKey, JSON.stringify(holidayDates), 3600);

  return holidayDates;
}

// Clear cache when holidays change
async clearHolidayCache(): Promise<void> {
  const pattern = 'holidays:*';
  await this.cache.deletePattern(pattern);
}
```

**Seed Data:**
```typescript
// form-templates.seed.ts
async function seedVietnameseHolidays(prisma: PrismaClient) {
  const currentYear = new Date().getFullYear();

  const holidays = [
    { date: `${currentYear}-01-01`, name: 'Tết Dương lịch', recurring: true },
    { date: `${currentYear}-04-30`, name: 'Giải phóng miền Nam, thống nhất đất nước', recurring: true },
    { date: `${currentYear}-05-01`, name: 'Ngày Quốc tế Lao động', recurring: true },
    { date: `${currentYear}-09-02`, name: 'Ngày Quốc khánh', recurring: true },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.upsert({
      where: { date: new Date(holiday.date) },
      update: { name: holiday.name, recurring: holiday.recurring },
      create: holiday,
    });
  }

  // Tet holidays (calculated based on lunar calendar)
  const tetDates = calculateTetHolidays(currentYear);
  for (const tet of tetDates) {
    await prisma.holiday.upsert({
      where: { date: new Date(tet.date) },
      update: {},
      create: tet,
    });
  }
}
```

### Testing Standards

**Unit Tests (REQUIRED per Epic 9 Retro):**
```typescript
describe('HolidaysService', () => {
  describe('createHoliday', () => {
    it('should create holiday with valid data', async () => {
      const dto: CreateHolidayDto = {
        date: '2026-05-20',
        name: 'Test Holiday',
        recurring: false,
      };

      const result = await service.createHoliday(dto);

      expect(result.name).toBe('Test Holiday');
      expect(result.date).toEqual(new Date('2026-05-20'));
    });

    it('should reject duplicate date', async () => {
      await createHoliday({ date: '2026-05-20' });

      const dto: CreateHolidayDto = {
        date: '2026-05-20',
        name: 'Duplicate',
        recurring: false,
      };

      await expect(service.createHoliday(dto)).rejects.toThrow('đã tồn tại');
    });

    it('should validate name length', async () => {
      const dto: CreateHolidayDto = {
        date: '2026-05-20',
        name: 'A',  // Too short
        recurring: false,
      };

      await expect(service.createHoliday(dto)).rejects.toThrow();
    });
  });

  describe('updateHoliday', () => {
    it('should update holiday name', async () => {
      const holiday = await createHoliday({ name: 'Old Name' });

      const result = await service.updateHoliday(holiday.id, {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteHoliday', () => {
    it('should delete holiday', async () => {
      const holiday = await createHoliday();

      await service.deleteHoliday(holiday.id);

      const found = await prisma.holiday.findUnique({
        where: { id: holiday.id },
      });
      expect(found).toBeNull();
    });
  });
});
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 10-5 created via create-story workflow. Status: ready-for-dev
- Epic 9 retrospective learnings applied (type safety, no as unknown/as any)
- Proper interfaces for holiday CRUD
- Type-safe DTO validation
- Database schema defined
- SLA integration with cache clearing
- Vietnamese holiday seed data
- Vietnamese localization for all messages
- Tests mandated per Epic 9 retro lessons

### File List

**To Create:**
- `qlnckh/apps/src/modules/holidays/holidays.module.ts` - Holiday module
- `qlnckh/apps/src/modules/holidays/holidays.controller.ts` - Holiday endpoints
- `qlnckh/apps/src/modules/holidays/holidays.service.ts` - CRUD logic
- `qlnckh/apps/src/modules/holidays/dto/create-holiday.dto.ts` - Create DTO
- `qlnckh/apps/src/modules/holidays/dto/update-holiday.dto.ts` - Update DTO
- `qlnckh/apps/src/modules/holidays/dto/holiday-query.dto.ts` - Query/filter DTO
- `qlnckh/web-apps/src/app/admin/holidays/page.tsx` - Holiday management page
- `qlnckh/web-apps/src/app/admin/holidays/components/HolidayTable.tsx` - Holiday list table
- `qlnckh/web-apps/src/app/admin/holidays/components/HolidayFormDialog.tsx` - Add/Edit form
- `qlnckh/web-apps/src/app/admin/holidays/components/DeleteHolidayDialog.tsx` - Delete confirmation
- `qlnckh/web-apps/src/lib/api/holidays.ts` - Holiday API client
- `qlnckh/web-apps/src/lib/hooks/useHolidays.ts` - Holiday CRUD hook

**To Modify:**
- `qlnckh/apps/src/app.module.ts` - Register HolidayModule
- `qlnckh/apps/src/modules/sla/sla.service.ts` - Extend to fetch holidays from DB
- `qlnckh/prisma/schema.prisma` - Add Holiday model
- `qlnckh/apps/src/seeds/form-templates.seed.ts` - Add Vietnamese holidays seed
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 9 retro analysis applied
  - Type safety patterns enforced (no as unknown, no as any)
  - Proper interfaces for holiday CRUD
  - Type-safe DTO validation
  - Database schema defined
  - SLA integration with cache clearing
  - Vietnamese holiday seed data
  - Vietnamese localization for all messages
  - Tests mandated per Epic 9 retro lessons
  - Ready for dev-story workflow execution

## References

- [epics.md Story 10.5](../../planning-artifacts/epics.md#L2386-L2411) - Full requirements
- [epic-9-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-9-retro-2026-01-07.md) - Lessons learned
- [Story 1.8](./1-8-business-calendar-basic-nhung-du-de-sla-chay-sau.md) - Business calendar foundation
- [Story 3.6](./3-6-sla-calculator-business-days-plus-cutoff-17-00.md) - SLA calculation
