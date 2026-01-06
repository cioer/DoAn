import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import {
  ProposalDto,
  ProposalWithTemplateDto,
  CreateProposalDto,
  UpdateProposalDto,
  PaginatedProposalsDto,
} from './dto';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ProjectState } from '@prisma/client';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  facultyId: string | null;
}

@ApiTags('proposals')
@Controller('proposals')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  /**
   * POST /api/proposals - Create new proposal (DRAFT)
   * Only GIANG_VIEN can create proposals
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Tạo đề tài mới',
    description: 'Tạo đề tài mới ở trạng thái NHÁP (DRAFT). Chỉ giảng viên mới có thể tạo đề tài.',
  })
  @ApiResponse({
    status: 201,
    description: 'Đề tài được tạo thành công',
    type: ProposalWithTemplateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - template or faculty not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Mẫu đơn không tồn tại',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - chưa đăng nhập',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - không phải giảng viên',
  })
  async create(
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<ProposalWithTemplateDto> {
    return this.proposalsService.create(dto, {
      userId: user.id,
      ip,
      userAgent,
      requestId,
    });
  }

  /**
   * GET /api/proposals - List proposals with filters
   * Authenticated users can view
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Danh sách đề tài',
    description: 'Lấy danh sách đề tài với bộ lọc và phân trang',
  })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Lọc theo người tạo' })
  @ApiQuery({ name: 'state', required: false, enum: ProjectState, description: 'Lọc theo trạng thái' })
  @ApiQuery({ name: 'facultyId', required: false, description: 'Lọc theo khoa' })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Số trang' })
  @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Số items mỗi trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đề tài',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            code: 'DT-001',
            title: 'Nghiên cứu AI',
            state: 'DRAFT',
            ownerId: 'user-uuid',
            facultyId: 'faculty-uuid',
            holderUnit: null,
            holderUser: null,
            slaStartDate: null,
            slaDeadline: null,
            templateId: 'template-uuid',
            templateVersion: 'v1.0',
            formData: null,
            createdAt: '2026-01-06T00:00:00.000Z',
            updatedAt: '2026-01-06T00:00:00.000Z',
            template: {
              id: 'template-uuid',
              code: 'MAU_01B',
              name: 'Mẫu Đề Tài Cấp Trường',
              version: 'v1.0',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query('ownerId') ownerId?: string,
    @Query('state') state?: ProjectState,
    @Query('facultyId') facultyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedProposalsDto> {
    return this.proposalsService.findAll({
      ownerId,
      state,
      facultyId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /api/proposals/:id - Get proposal by ID
   * Authenticated users can view
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chi tiết đề tài',
    description: 'Lấy thông tin chi tiết một đề tài theo ID',
  })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin đề tài',
    type: ProposalWithTemplateDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đề tài',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Đề tài với ID không tồn tại',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ProposalWithTemplateDto> {
    return this.proposalsService.findOne(id, user.id);
  }

  /**
   * PUT /api/proposals/:id - Update proposal (DRAFT only)
   * Only owner can update their own DRAFT proposals
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Cập nhật đề tài',
    description: 'Cập nhật thông tin đề tài. Chỉ đề tài ở trạng thái NHÁP (DRAFT) mới có thể chỉnh sửa.',
  })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được cập nhật thành công',
    type: ProposalWithTemplateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - proposal not in DRAFT state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: 'Chỉ có thể chỉnh sửa đề tài ở trạng thái NHÁP (DRAFT)',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not owner',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền chỉnh sửa đề tài này',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<ProposalWithTemplateDto> {
    return this.proposalsService.update(id, dto, {
      userId: user.id,
      ip,
      userAgent,
      requestId,
    });
  }

  /**
   * DELETE /api/proposals/:id - Delete proposal (DRAFT only)
   * Only owner can delete their own DRAFT proposals
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Xóa đề tài',
    description: 'Xóa đề tài. Chỉ đề tài ở trạng thái NHÁP (DRAFT) mới có thể xóa.',
  })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({
    status: 204,
    description: 'Đề tài đã được xóa thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - proposal not in DRAFT state',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.proposalsService.remove(id, user.id);
  }
}
