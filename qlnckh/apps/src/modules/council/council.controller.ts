import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CouncilService } from './council.service';
import {
  AssignCouncilDto,
  AssignCouncilResponse,
  CreateCouncilDto,
  UpdateCouncilDto,
  ErrorResponseDto,
  ChangeCouncilDto,
  ChangeCouncilResponse,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors';
import { UserRole, ProjectState } from '@prisma/client';
import { PrismaService } from '../auth/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { WorkflowAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

@ApiTags('council')
@Controller('council')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CouncilController {
  constructor(
    private readonly councilService: CouncilService,
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * GET /api/councils?type={type}
   * Story 5.2: List available councils for PKHCN
   *
   * Returns councils with their members for dropdown display.
   *
   * @param type - Optional council type filter (OUTLINE, ACCEPTANCE, etc.)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách hội đồng',
    description:
      'Lấy danh sách các hội đồng có sẵn cho PKHCN phân bổ. Có thể lọc theo loại hội đồng (OUTLINE, ACCEPTANCE, etc.).',
  })
  @ApiQuery({
    name: 'type',
    description: 'Loại hội đồng (tùy chọn)',
    enum: ['OUTLINE', 'ACCEPTANCE', 'EXTENSION'],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách hội đồng',
    schema: {
      example: {
        councils: [
          {
            id: 'council-uuid',
            name: 'Hội đồng khoa CNTT #1',
            type: 'OUTLINE',
            secretaryId: 'secretary-uuid',
            secretaryName: 'Nguyễn Văn X',
            members: [
              {
                id: 'member-uuid',
                councilId: 'council-uuid',
                userId: 'user-uuid',
                displayName: 'Trần Văn Y',
                role: 'MEMBER',
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - chưa đăng nhập',
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Chưa đăng nhập',
        },
      },
    },
  })
  async listCouncils(
    @Query('type') type?: string,
  ): Promise<{ councils: unknown[]; total: number }> {
    const councils = await this.councilService.listCouncils(
      type as any,
    );
    return {
      councils,
      total: councils.length,
    };
  }

  /**
   * GET /api/councils/members
   * Story 5.2: Get eligible council members for dropdown
   *
   * Returns users with HOI_DONG or THANH_TRUNG roles
   * who can be added as council members.
   */
  @Get('members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách thành viên có thể tham gia hội đồng',
    description:
      'Lấy danh sách người dùng có vai trò HOI_DONG hoặc THANH_TRUNG để hiển thị trong dropdown chọn thành viên.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thành viên hội đồng',
    schema: {
      example: {
        members: [
          {
            id: 'user-uuid',
            displayName: 'Nguyễn Văn A',
            email: 'nguyenvana@example.com',
            role: 'HOI_DONG',
            facultyId: 'faculty-uuid',
          },
        ],
        total: 1,
      },
    },
  })
  async getEligibleCouncilMembers(): Promise<{
    members: unknown[];
    total: number;
  }> {
    const members = await this.councilService.getEligibleCouncilMembers();
    return {
      members,
      total: members.length,
    };
  }

  /**
   * GET /api/councils/:id
   * Story 5.2: Get council by ID
   *
   * Returns council details with all members
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy thông tin hội đồng',
    description: 'Lấy thông tin chi tiết của một hội đồng bao gồm tất cả thành viên.',
  })
  @ApiParam({
    name: 'id',
    description: 'Council ID (UUID)',
    example: 'council-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin hội đồng',
  })
  @ApiResponse({
    status: 404,
    description: 'Council not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      },
    },
  })
  async getCouncilById(@Param('id') id: string) {
    return this.councilService.getCouncilById(id);
  }

  /**
   * POST /api/councils
   * Create a new council
   *
   * Only ADMIN and PHONG_KHCN can create councils
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  @ApiOperation({
    summary: 'Tạo hội đồng mới',
    description: 'Tạo hội đồng mới với thông tin và danh sách thành viên. Chỉ ADMIN và PHONG_KHCN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 201,
    description: 'Hội đồng được tạo thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - không có quyền tạo hội đồng',
  })
  async createCouncil(
    @Body() dto: CreateCouncilDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.councilService.createCouncil(
      dto.name,
      dto.type,
      dto.secretaryId,
      dto.memberIds,
      user.id,
    );
  }

  /**
   * PUT /api/councils/:id
   * Update an existing council
   *
   * Only ADMIN and PHONG_KHCN can update councils
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  @ApiOperation({
    summary: 'Cập nhật hội đồng',
    description: 'Cập nhật thông tin hội đồng và danh sách thành viên. Chỉ ADMIN và PHONG_KHCN mới có thể thực hiện.',
  })
  @ApiParam({
    name: 'id',
    description: 'Council ID (UUID)',
    example: 'council-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Hội đồng được cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Council not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - không có quyền cập nhật hội đồng',
  })
  async updateCouncil(
    @Param('id') id: string,
    @Body() dto: UpdateCouncilDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.councilService.updateCouncil(
      id,
      dto.name,
      dto.type,
      dto.secretaryId,
      dto.memberIds,
      user.id,
    );
  }

  /**
   * DELETE /api/councils/:id
   * Delete a council
   *
   * Only ADMIN and PHONG_KHCN can delete councils
   * Cannot delete councils that are assigned to proposals
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
  @ApiOperation({
    summary: 'Xóa hội đồng',
    description: 'Xóa hội đồng (chỉ có thể xóa nếu chưa được gán cho đề tài nào). Chỉ ADMIN và PHONG_KHCN mới có thể thực hiện.',
  })
  @ApiParam({
    name: 'id',
    description: 'Council ID (UUID)',
    example: 'council-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Hội đồng được xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Council not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - council is assigned to proposals',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - không có quyền xóa hội đồng',
  })
  async deleteCouncil(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.councilService.deleteCouncil(id, user.id);
  }

  /**
   * POST /api/workflow/:proposalId/assign-council
   * Story 5.2, Task 2: Assign Council Endpoint
   *
   * Assigns a council to a proposal and transitions state
   * from SCHOOL_SELECTION_REVIEW to OUTLINE_COUNCIL_REVIEW.
   * Only PHONG_KHCN role can perform this action.
   */
  @Post(':proposalId/assign-council')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({
    summary: 'Phân bổ hội đồng xét duyệt',
    description:
      'Gán hội đồng cho đề tài và chuyển trạng thái từ SCHOOL_SELECTION_REVIEW sang OUTLINE_COUNCIL_REVIEW. Chỉ PHONG_KHCN mới có thể thực hiện hành động này.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Hội đồng được phân bổ thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'SCHOOL_SELECTION_REVIEW',
          currentState: 'OUTLINE_COUNCIL_REVIEW',
          holderUnit: 'council-uuid',
          holderUser: 'secretary-uuid',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in SCHOOL_SELECTION_REVIEW state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_SCHOOL_SELECTION_REVIEW',
          message: 'Chỉ có thể phân bổ hội đồng ở trạng thái SCHOOL_SELECTION_REVIEW',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks PHONG_KHCN role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền phân bổ hội đồng',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal or council not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - duplicate idempotency key',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ALREADY_PROCESSED',
          message: 'Yêu cầu đã được xử lý',
        },
      },
    },
  })
  async assignCouncil(
    @Param('proposalId') proposalId: string,
    @Body() dto: AssignCouncilDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<AssignCouncilResponse> {
    // Verify proposal exists and is in correct state
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true, state: true },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài',
        },
      });
    }

    // Validate state: must be SCHOOL_SELECTION_REVIEW
    if (proposal.state !== ProjectState.SCHOOL_SELECTION_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_SCHOOL_SELECTION_REVIEW',
          message: `Chỉ có thể phân bổ hội đồng ở trạng thái SCHOOL_SELECTION_REVIEW. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // First, assign council to proposal (sets councilId)
    await this.councilService.assignCouncilToProposal(
      proposalId,
      dto.councilId,
      dto.secretaryId,
      dto.memberIds,
    );

    // Then, execute state transition via workflow service
    const result = await this.workflowService.transitionState(
      proposalId,
      ProjectState.OUTLINE_COUNCIL_REVIEW,
      WorkflowAction.ASSIGN_COUNCIL,
      {
        userId: user.id,
        userRole: user.role,
        userFacultyId: user.facultyId,
        idempotencyKey: dto.idempotencyKey,
        ip,
        userAgent,
        requestId,
        councilId: dto.councilId,
        councilSecretaryId: dto.secretaryId,
      },
    );

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        previousState: result.previousState,
        currentState: result.currentState,
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/council/:proposalId/change-council
   * Change Council Endpoint
   *
   * Changes the council assigned to a proposal that is already in a council review state.
   * Only PHONG_KHCN role can perform this action.
   *
   * Use cases:
   * - Council member is unavailable
   * - Proposal needs to be reviewed by a different council
   * - Council composition needs to be updated
   */
  @Post(':proposalId/change-council')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({
    summary: 'Thay đổi hội đồng xét duyệt',
    description:
      'Thay đổi hội đồng được gán cho đề tài đang trong trạng thái xét duyệt của hội đồng. ' +
      'Chỉ PHONG_KHCN mới có thể thực hiện hành động này. ' +
      'Hành động này ghi nhận audit log và cập nhật holder cho đề tài.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Hội đồng được thay đổi thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousCouncilId: 'old-council-uuid',
          newCouncilId: 'new-council-uuid',
          councilName: 'Hội đồng khoa CNTT #2',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal has no council or same council selected',
    schema: {
      example: {
        success: false,
        error: {
          code: 'SAME_COUNCIL',
          message: 'Hội đồng mới phải khác với hội đồng hiện tại',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks PHONG_KHCN role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền thay đổi hội đồng',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal or council not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - duplicate idempotency key',
    schema: {
      example: {
        success: false,
        error: {
          code: 'ALREADY_PROCESSED',
          message: 'Yêu cầu đã được xử lý',
        },
      },
    },
  })
  async changeCouncil(
    @Param('proposalId') proposalId: string,
    @Body() dto: ChangeCouncilDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<ChangeCouncilResponse> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true, state: true, councilId: true },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài',
        },
      });
    }

    // Verify proposal has a council assigned
    if (!proposal.councilId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_COUNCIL_ASSIGNED',
          message: 'Đề tài chưa được gán hội đồng. Sử dụng tính năng gán hội đồng.',
        },
      });
    }

    // Optionally validate state - should be in a council review state
    // Allow changing council in any state, just log info if not in typical council review state
    if (proposal.state !== ProjectState.OUTLINE_COUNCIL_REVIEW) {
      console.info(
        `Changing council for proposal ${proposalId} in state ${proposal.state}`,
      );
    }

    // Change council via service
    const result = await this.councilService.changeCouncilForProposal(
      proposalId,
      dto.councilId,
      dto.secretaryId,
      dto.memberIds,
      user.id,
    );

    // Create audit log for the change
    await this.auditService.logEvent({
      action: 'COUNCIL_CHANGE' as any,
      actorUserId: user.id,
      entityType: 'Proposal',
      entityId: proposalId,
      metadata: {
        previousCouncilId: result.previousCouncilId,
        newCouncilId: dto.councilId,
        newCouncilName: result.council.name,
        newSecretaryId: dto.secretaryId,
        reason: dto.reason || 'Council changed by PHONG_KHCN',
        ip,
        userAgent,
        requestId,
      },
    });

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        previousCouncilId: result.previousCouncilId,
        newCouncilId: result.council.id,
        councilName: result.council.name,
        workflowLogId: 'audit-created',
      },
    };
  }
}
