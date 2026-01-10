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
  UseInterceptors,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto, UpdateHolidayDto, HolidayQueryDto } from './dto/holiday.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors';
import { UserRole } from '@prisma/client';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

/**
 * Holidays Controller
 * Story 10.5: Holiday Management (Full CRUD)
 *
 * All endpoints require ADMIN role.
 *
 * Epic 9 Retro Patterns Applied:
 * - Proper RBAC guards
 * - Idempotency interceptor for state changes
 * - Proper decorator usage
 * - NO as unknown/as any casting
 */
@ApiTags('holidays')
@Controller('admin/holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  /**
   * GET /api/admin/holidays
   * Story 10.5: AC1, AC2 - Holiday List Display
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách ngày lễ',
    description: 'Trả về danh sách ngày lễ với bộ lọc. Chỉ ADMIN mới có thể truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Holiday list retrieved successfully',
  })
  async getHolidays(@Query() query: HolidayQueryDto) {
    const result = await this.holidaysService.getHolidays(query);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/admin/holidays/:id
   * Story 10.5: AC4 - Get single holiday
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy chi tiết ngày lễ',
    description: 'Trả về thông tin chi tiết của một ngày lễ.',
  })
  @ApiResponse({
    status: 200,
    description: 'Holiday retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Holiday not found',
  })
  async getHoliday(@Param('id') id: string) {
    const holiday = await this.holidaysService.getHoliday(id);

    if (!holiday) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'HOLIDAY_NOT_FOUND',
          message: 'Ngày lễ không tồn tại',
        },
      });
    }

    return {
      success: true,
      data: holiday,
    };
  }

  /**
   * POST /api/admin/holidays
   * Story 10.5: AC3, AC6 - Add Holiday with Validation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Tạo ngày lễ mới',
    description: 'Tạo một ngày lễ mới. Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 201,
    description: 'Holiday created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - date already exists',
  })
  async createHoliday(
    @Body() dto: CreateHolidayDto,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.holidaysService.createHoliday(dto, user.id);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * PATCH /api/admin/holidays/:id
   * Story 10.5: AC4, AC6 - Update Holiday with Validation
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật ngày lễ',
    description: 'Cập nhật thông tin ngày lễ. Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Holiday updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Holiday not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - date already exists',
  })
  async updateHoliday(
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.holidaysService.updateHoliday(id, dto, user.id);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * DELETE /api/admin/holidays/:id
   * Story 10.5: AC5 - Delete Holiday
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Xóa ngày lễ',
    description: 'Xóa một ngày lễ. Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Holiday deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Holiday not found',
  })
  async deleteHoliday(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.holidaysService.deleteHoliday(id, user.id);

    return {
      success: true,
      data: {
        message: 'Đã xóa ngày lễ thành công',
      },
    };
  }

  /**
   * GET /api/admin/holidays/year/:year
   * Story 10.5: AC7 - Get holidays for SLA calculation
   */
  @Get('year/:year')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy ngày lễ cho năm',
    description: 'Trả về danh sách ngày lễ cho năm được chỉ định (dùng cho tính SLA).',
  })
  @ApiResponse({
    status: 200,
    description: 'Holidays retrieved successfully',
  })
  async getHolidaysForYear(@Param('year') year: string) {
    const yearNum = parseInt(year, 10);
    const holidays = await this.holidaysService.getHolidaysForYear(yearNum);

    return {
      success: true,
      data: {
        year: yearNum,
        holidays,
        count: holidays.length,
      },
    };
  }
}
