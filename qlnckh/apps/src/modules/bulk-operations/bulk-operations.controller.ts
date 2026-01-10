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
import { BulkOperationsService } from './bulk-operations.service';
import {
  BulkAssignDto,
  BulkAssignResultDto,
  BulkAssignErrorResponseDto,
} from './dto/bulk-assign.dto';
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
 * Bulk Operations Controller
 * Story 8.1: Bulk Actions & Reports
 *
 * Handles bulk operations on multiple proposals:
 * - Bulk assign holder_user to multiple proposals
 *
 * All endpoints require PHONG_KHCN or ADMIN role.
 */
@ApiTags('bulk-operations')
@Controller('bulk-operations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class BulkOperationsController {
  constructor(private readonly bulkOperationsService: BulkOperationsService) {}

  /**
   * POST /api/bulk-operations/bulk-assign
   * Story 8.1: Bulk Assign (Gán holder_user hàng loạt)
   *
   * Assigns a user to multiple proposals at once.
   * Only PHONG_KHCN and ADMIN roles can perform bulk assign.
   *
   * AC3: When user confirms bulk assign:
   * - All selected proposals are updated with holder_user = selected user
   * - workflow_logs entry created for each proposal
   * - Returns success/failed counts and error details
   */
  @Post('bulk-assign')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Gán người xử lý hàng loạt',
    description:
      'Gán holder_user cho nhiều đề tài cùng lúc. Chỉ PHONG_KHCN và ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gán thành công',
    schema: {
      example: {
        success: true,
        data: {
          success: 3,
          failed: 1,
          total: 4,
          errors: [
            {
              proposalId: 'uuid-4',
              proposalCode: 'DT-004',
              reason: 'Không tìm thấy đề tài',
            },
          ],
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
          message: 'Phải chọn ít nhất một đề tài',
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
  @ApiResponse({
    status: 404,
    description: 'Not Found - target user not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Người dùng không tồn tại',
        },
      },
    },
  })
  async bulkAssign(
    @Body() dto: BulkAssignDto,
    @CurrentUser() user: RequestUser,
    @Body('ip') ip?: string,
    @Body('userAgent') userAgent?: string,
    @Body('requestId') requestId?: string,
  ): Promise<BulkAssignResultDto | BulkAssignErrorResponseDto> {
    // Validate permissions
    this.bulkOperationsService.validateBulkPermission(user.role);

    // Validate: proposalIds array must have at least one element
    if (!dto.proposalIds || dto.proposalIds.length === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EMPTY_PROPOSAL_LIST',
          message: 'Phải chọn ít nhất một đề tài',
        },
      });
    }

    // Execute bulk assign
    const result = await this.bulkOperationsService.bulkAssign(
      dto.proposalIds,
      dto.userId,
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
