import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  BulkRemindDto,
  BulkRemindResultDto,
  BulkRemindErrorResponseDto,
} from './dto/bulk-remind.dto';
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
 * Notifications Controller
 * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
 *
 * Handles notification operations:
 * - Bulk remind - Send reminder emails to multiple proposal holders
 *
 * All endpoints require PHONG_KHCN or ADMIN role.
 */
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * POST /api/notifications/bulk-remind
   * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
   *
   * Sends reminder emails to holders of selected proposals.
   * Only PHONG_KHCN and ADMIN roles can perform bulk remind.
   *
   * AC3: Dry-run validation before sending
   * AC4: Send emails to grouped recipients
   */
  @Post('bulk-remind')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Gửi email nhắc hàng loạt',
    description:
      'Gửi email nhắc nhở cho người xử lý của các đề tài được chọn. Chỉ PHONG_KHCN và ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi email thành công',
    schema: {
      example: {
        success: true,
        data: {
          success: 2,
          failed: 0,
          total: 2,
          recipients: [
            {
              userId: 'user-uuid-1',
              userName: 'Nguyễn Văn A',
              emailSent: true,
            },
            {
              userId: 'user-uuid-2',
              userName: 'Trần Văn B',
              emailSent: true,
            },
          ],
          dryRun: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid input',
    schema: {
      example: {
        success: false,
        error: {
          code: 'EMPTY_PROPOSAL_LIST',
          message: 'Phải chọn ít nhất một hồ sơ',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks required role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      },
    },
  })
  async bulkRemind(
    @Body() dto: BulkRemindDto,
    @CurrentUser() user: RequestUser,
    @Body('ip') ip?: string,
    @Body('userAgent') userAgent?: string,
    @Body('requestId') requestId?: string,
  ): Promise<BulkRemindResultDto | BulkRemindErrorResponseDto> {
    // Validate permissions
    this.notificationsService.validateBulkPermission(user.role);

    // Validate: proposalIds array must have at least one element
    if (!dto.proposalIds || dto.proposalIds.length === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EMPTY_PROPOSAL_LIST',
          message: 'Phải chọn ít nhất một hồ sơ',
        },
      });
    }

    // Execute bulk remind
    const result = await this.notificationsService.bulkRemind(
      dto.proposalIds,
      dto.dryRun ?? false,
      {
        userId: user.id,
        userRole: user.role,
        ip,
        userAgent,
        requestId,
      },
    );

    return {
      success: true,
      data: result,
    };
  }
}
