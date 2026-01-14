import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProposalsService } from '../proposals.service';
import {
  ProposalWithTemplateDto,
  CreateProposalDto,
  UpdateProposalDto,
  AutoSaveProposalDto,
  PaginatedProposalsDto,
} from '../dto';
import { RequireRoles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, ProjectState } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../../common/interceptors';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  facultyId: string | null;
}

/**
 * ProposalsCrudController
 * Handles basic CRUD operations for proposals.
 * Split from the original ProposalsController for better maintainability.
 */
@ApiTags('proposals')
@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class ProposalsCrudController {
  constructor(private readonly proposalsService: ProposalsService) {}

  /**
   * POST /api/proposals - Create new proposal (DRAFT)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Tạo đề tài mới',
    description: 'Tạo đề tài mới ở trạng thái NHÁP (DRAFT). Chỉ giảng viên mới có thể tạo đề tài.',
  })
  @ApiResponse({ status: 201, description: 'Đề tài được tạo thành công', type: ProposalWithTemplateDto })
  @ApiResponse({ status: 400, description: 'Bad request - template or faculty not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - không phải giảng viên' })
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
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Danh sách đề tài', description: 'Lấy danh sách đề tài với bộ lọc và phân trang' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Lọc theo người tạo' })
  @ApiQuery({ name: 'state', required: false, enum: ProjectState, description: 'Lọc theo trạng thái' })
  @ApiQuery({ name: 'facultyId', required: false, description: 'Lọc theo khoa' })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Số trang' })
  @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Số items mỗi trang' })
  @ApiResponse({ status: 200, description: 'Danh sách đề tài' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('ownerId') ownerId?: string,
    @Query('state') state?: string,
    @Query('facultyId') facultyId?: string,
    @Query('overdue') overdue?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedProposalsDto> {
    const pageSize = limit ? parseInt(limit, 10) : 20;
    const pageNum = page ? parseInt(page, 10) : 1;
    const skip = (pageNum - 1) * pageSize;

    let stateFilter: ProjectState | ProjectState[] | undefined = undefined;
    if (state) {
      const states = state.split(',').map(s => s.trim() as ProjectState);
      stateFilter = states.length === 1 ? states[0] : states;
    }

    return this.proposalsService.findAll({
      ownerId,
      state: stateFilter,
      facultyId,
      overdue: overdue === 'true',
      skip,
      take: pageSize,
      user,
    });
  }

  /**
   * GET /api/proposals/:id - Get proposal by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chi tiết đề tài', description: 'Lấy thông tin chi tiết một đề tài theo ID' })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Thông tin đề tài', type: ProposalWithTemplateDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đề tài' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ProposalWithTemplateDto> {
    return this.proposalsService.findOne(id, user.id);
  }

  /**
   * PUT /api/proposals/:id - Update proposal (DRAFT only)
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({ summary: 'Cập nhật đề tài', description: 'Cập nhật thông tin đề tài. Chỉ DRAFT mới chỉnh sửa được.' })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Đề tài được cập nhật thành công', type: ProposalWithTemplateDto })
  @ApiResponse({ status: 400, description: 'Bad request - proposal not in DRAFT state' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ProposalWithTemplateDto> {
    return this.proposalsService.update(id, dto, user.id);
  }

  /**
   * PATCH /api/proposals/:id/auto-save - Auto-save proposal form data
   */
  @Patch(':id/auto-save')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({ summary: 'Tự động lưu form dữ liệu', description: 'Auto-save partial form data với deep merge.' })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Form data được auto-save thành công', type: ProposalWithTemplateDto })
  @ApiResponse({ status: 400, description: 'Bad request - proposal not in DRAFT state' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 409, description: 'Conflict - optimistic locking failed' })
  async autoSave(
    @Param('id') id: string,
    @Body() dto: AutoSaveProposalDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ProposalWithTemplateDto> {
    return this.proposalsService.autoSave(id, dto, user.id);
  }

  /**
   * DELETE /api/proposals/:id - Delete proposal (DRAFT only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({ summary: 'Xóa đề tài', description: 'Xóa đề tài. Chỉ DRAFT mới xóa được.' })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Đề tài đã được xóa thành công' })
  @ApiResponse({ status: 400, description: 'Bad request - proposal not in DRAFT state' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.proposalsService.remove(id, user.id);
  }

  /**
   * PATCH /api/proposals/:id/restore - Restore soft-deleted proposal
   */
  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({ summary: 'Khôi phục đề tài đã xóa', description: 'Khôi phục đề tài đã bị soft delete.' })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Đề tài được khôi phục thành công', type: ProposalWithTemplateDto })
  @ApiResponse({ status: 400, description: 'Bad request - proposal not deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<ProposalWithTemplateDto> {
    return this.proposalsService.restore(id, user.id, {
      userId: user.id,
      userDisplayName: user.displayName,
      ip,
      userAgent,
      requestId,
    });
  }

  /**
   * DELETE /api/proposals/:id/hard - Soft delete proposal
   */
  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({ summary: 'Xóa mềm đề tài', description: 'Soft delete proposal (sets deletedAt timestamp).' })
  @ApiParam({ name: 'id', description: 'Proposal ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Đề tài đã được soft delete thành công' })
  @ApiResponse({ status: 400, description: 'Bad request - proposal not in DRAFT state' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  async softRemove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    return this.proposalsService.remove(id, user.id);
  }
}
