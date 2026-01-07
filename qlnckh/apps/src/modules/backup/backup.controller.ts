import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BackupService } from './backup.service';
import {
  RestoreJob,
  VerificationReport,
  StateMismatch,
} from './dto/upload-backup.dto';
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
 * Backup Controller
 * Story 10.6: DB Restore + State Recompute
 *
 * All endpoints require ADMIN role.
 *
 * Epic 9 Retro Patterns Applied:
 * - Proper RBAC guards
 * - Idempotency interceptor for state changes
 * - Proper decorator usage
 */
@ApiTags('backup')
@Controller('admin/database')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * GET /api/admin/database
   * Story 10.6: AC1, AC2 - Database Management Page
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách bản sao lưu',
    description: 'Trả về danh sách các bản sao lưu cơ sở dữ liệu. Chỉ ADMIN mới có thể truy cập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Backup list retrieved successfully',
  })
  async listBackups() {
    const result = await this.backupService.listBackups();

    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /api/admin/database/upload
   * Story 10.6: AC3 - Upload Backup
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Tải lên bản sao lưu',
    description: 'Tải lên file bản sao lưu cơ sở dữ liệu (.sql). Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 201,
    description: 'Backup uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - file too large or invalid format',
  })
  async uploadBackup(
    @Body() body: { file?: { buffer: Buffer; originalname: string } },
    @CurrentUser() user: RequestUser,
  ) {
    const file = body.file;
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'Vui lòng chọn file để tải lên.',
        },
      });
    }

    const result = await this.backupService.uploadBackup(file, user.id);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * DELETE /api/admin/database/:id
   * Story 10.6: AC2, AC5 - Delete Backup
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Xóa bản sao lưu',
    description: 'Xóa một bản sao lưu. Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Backup deleted successfully',
  })
  async deleteBackup(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.backupService.deleteBackup(id, user.id);

    return {
      success: true,
      data: {
        message: 'Đã xóa bản sao lưu thành công',
      },
    };
  }

  /**
   * POST /api/admin/database/restore/:backupId
   * Story 10.6: AC4, AC5, AC6, AC7, AC8 - Restore Execution
   */
  @Post('restore/:backupId')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Khôi phục cơ sở dữ liệu',
    description: 'Khôi phục cơ sở dữ liệu từ bản sao lưu. Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Restore job started',
    schema: {
      example: {
        success: true,
        data: {
          jobId: 'restore_1234567890',
          message: 'Đã bắt đầu quá trình khôi phục',
        },
      },
    },
  })
  async startRestore(
    @Param('backupId') backupId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { confirm?: string },
  ) {
    // Require "RESTORE" confirmation
    if (body.confirm !== 'RESTORE') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Vui lòng nhập "RESTORE" để xác nhận.',
        },
      });
    }

    const jobId = await this.backupService.restoreDatabase(backupId, user.id);

    return {
      success: true,
      data: {
        jobId,
        message: 'Đã bắt đầu quá trình khôi phục',
      },
    };
  }

  /**
   * GET /api/admin/database/restore/job/:jobId
   * Story 10.6: AC6 - Restore Progress Tracking
   */
  @Get('restore/job/:jobId')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy trạng thái khôi phục',
    description: 'Trả về tiến trình khôi phục cơ sở dữ liệu.',
  })
  @ApiResponse({
    status: 200,
    description: 'Restore job status retrieved',
  })
  async getRestoreJob(@Param('jobId') jobId: string) {
    const job = await this.backupService.getRestoreJob(jobId);

    if (!job) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Không tìm thấy công việc khôi phục',
        },
      });
    }

    return {
      success: true,
      data: job,
    };
  }

  /**
   * GET /api/admin/database/verify
   * Story 10.6: AC9, AC10 - State Integrity Verification
   */
  @Get('verify')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Xác minh tính toàn vẹn trạng thái',
    description: 'Kiểm tra và xác minh trạng thái của tất cả đề tài.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification report generated',
  })
  async verifyStateIntegrity() {
    const report = await this.backupService.verifyStateIntegrity();

    return {
      success: true,
      data: report,
    };
  }

  /**
   * POST /api/admin/database/correct
   * Story 10.6: AC11 - Auto-Correct States
   */
  @Post('correct')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Tự động sửa trạng thái',
    description: 'Sửa tự động các trạng thái không khớp.',
  })
  @ApiResponse({
    status: 200,
    description: 'States corrected successfully',
  })
  async autoCorrectStates(
    @Body() body: { mismatches?: StateMismatch[] },
  ) {
    // If no mismatches provided, get them from verification
    let mismatches = body.mismatches;
    if (!mismatches) {
      const report = await this.backupService.verifyStateIntegrity();
      mismatches = report.mismatches;
    }

    const result = await this.backupService.autoCorrectStates(mismatches);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/admin/database/maintenance
   * Story 10.6: AC5, AC12 - Maintenance Mode
   */
  @Get('maintenance')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy trạng thái bảo trì',
    description: 'Kiểm tra xem hệ thống có đang ở chế độ bảo trì không.',
  })
  @ApiResponse({
    status: 200,
    description: 'Maintenance mode status',
  })
  async getMaintenanceMode() {
    const isEnabled = await this.backupService.getMaintenanceMode();

    return {
      success: true,
      data: {
        maintenanceMode: isEnabled,
      },
    };
  }
}
