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
  CreateFacultyCouncilDto,
  CreateFacultyCouncilResponse,
  AssignFacultyCouncilDto,
  AssignFacultyCouncilResponse,
  FacultyCouncilDto,
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
            role: 'GIANG_VIEN',
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
    if (proposal.state !== ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW) {
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
      ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
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
    if (proposal.state !== ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW) {
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

  // ==========================================
  // FACULTY COUNCIL ENDPOINTS
  // ==========================================

  /**
   * GET /api/council/faculty/:facultyId
   * List faculty councils for a specific faculty
   *
   * Only faculty members and faculty management can access
   */
  @Get('faculty/:facultyId')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN, UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA, UserRole.PHONG_KHCN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách hội đồng khoa',
    description: 'Lấy danh sách hội đồng cấp khoa cho một khoa cụ thể.',
  })
  @ApiParam({
    name: 'facultyId',
    description: 'Faculty ID (UUID)',
    example: 'faculty-uuid',
  })
  @ApiQuery({
    name: 'type',
    description: 'Loại hội đồng (FACULTY_OUTLINE, FACULTY_ACCEPTANCE)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách hội đồng khoa',
  })
  async listFacultyCouncils(
    @Param('facultyId') facultyId: string,
    @Query('type') type?: string,
    @CurrentUser() user?: RequestUser,
  ): Promise<{ councils: FacultyCouncilDto[]; total: number }> {
    // Verify user has access to this faculty (unless admin/PHONG_KHCN)
    if (
      user &&
      user.role !== 'ADMIN' &&
      user.role !== 'PHONG_KHCN' &&
      user.facultyId !== facultyId
    ) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FACULTY_ACCESS_DENIED',
          message: 'Bạn chỉ có thể xem hội đồng thuộc khoa của mình',
        },
      });
    }

    const councils = await this.councilService.listFacultyCouncils(
      facultyId,
      type as any,
    );
    return {
      councils: councils as FacultyCouncilDto[],
      total: councils.length,
    };
  }

  /**
   * GET /api/council/faculty/:facultyId/members
   * Get eligible faculty members for council membership
   */
  @Get('faculty/:facultyId/members')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA, UserRole.PHONG_KHCN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách giảng viên có thể tham gia hội đồng khoa',
    description: 'Lấy danh sách giảng viên thuộc khoa để chọn thành viên hội đồng.',
  })
  @ApiParam({
    name: 'facultyId',
    description: 'Faculty ID (UUID)',
    example: 'faculty-uuid',
  })
  @ApiQuery({
    name: 'excludeOwnerId',
    description: 'ID chủ nhiệm đề tài để loại khỏi danh sách (nếu cần)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách giảng viên',
  })
  async getEligibleFacultyMembers(
    @Param('facultyId') facultyId: string,
    @Query('excludeOwnerId') excludeOwnerId?: string,
    @CurrentUser() user?: RequestUser,
  ): Promise<{ members: unknown[]; total: number }> {
    // Verify user has access to manage this faculty (unless admin/PHONG_KHCN)
    if (
      user &&
      user.role !== 'ADMIN' &&
      user.role !== 'PHONG_KHCN' &&
      user.facultyId !== facultyId
    ) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FACULTY_ACCESS_DENIED',
          message: 'Bạn chỉ có thể quản lý hội đồng thuộc khoa của mình',
        },
      });
    }

    const members = await this.councilService.getEligibleFacultyMembers(
      facultyId,
      excludeOwnerId,
    );
    return {
      members,
      total: members.length,
    };
  }

  /**
   * POST /api/council/faculty
   * Create a new faculty council
   *
   * Only QUAN_LY_KHOA and THU_KY_KHOA can create faculty councils
   * Members must all belong to the same faculty
   */
  @Post('faculty')
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)
  @ApiOperation({
    summary: 'Tạo hội đồng khoa mới',
    description:
      'Tạo hội đồng cấp khoa với danh sách thành viên. ' +
      'Chỉ QUAN_LY_KHOA và THU_KY_KHOA mới có thể thực hiện. ' +
      'Tất cả thành viên phải thuộc cùng một khoa.',
  })
  @ApiResponse({
    status: 201,
    description: 'Hội đồng khoa được tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - thành viên không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - không có quyền tạo hội đồng',
  })
  async createFacultyCouncil(
    @Body() dto: CreateFacultyCouncilDto,
    @CurrentUser() user: RequestUser,
  ): Promise<CreateFacultyCouncilResponse> {
    if (!user.facultyId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_FACULTY',
          message: 'Bạn chưa được gán vào khoa nào',
        },
      });
    }

    const result = await this.councilService.createFacultyCouncil(
      dto.name,
      dto.type,
      user.facultyId,
      dto.secretaryId,
      dto.memberIds,
      user.id,
    );

    return {
      success: true,
      data: result as unknown as FacultyCouncilDto,
      warnings: (result as any).warnings,
    };
  }

  /**
   * POST /api/council/faculty/:proposalId/assign
   * Assign a faculty council to a proposal
   *
   * Only QUAN_LY_KHOA and THU_KY_KHOA can assign faculty councils
   * Proposal must be in FACULTY_COUNCIL_OUTLINE_REVIEW state
   */
  @Post('faculty/:proposalId/assign')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({
    summary: 'Phân công hội đồng khoa cho đề tài',
    description:
      'Gán hội đồng khoa cho đề tài ở trạng thái FACULTY_COUNCIL_OUTLINE_REVIEW. ' +
      'Chỉ QUAN_LY_KHOA và THU_KY_KHOA mới có thể thực hiện.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Hội đồng khoa được phân công thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          proposalCode: 'DT-2026-001',
          councilId: 'council-uuid',
          councilName: 'Hội đồng CNTT #1',
          secretaryId: 'secretary-uuid',
          secretaryName: 'Nguyễn Văn A',
          eligibleVoters: ['user-1', 'user-2', 'user-3'],
          excludedMembers: [
            { id: 'owner-uuid', reason: 'Chủ nhiệm đề tài (không tự đánh giá)' },
          ],
          totalEligibleVoters: 3,
          warning: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal không ở trạng thái phù hợp hoặc không thuộc khoa',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - không có quyền phân công hội đồng',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal hoặc council không tồn tại',
  })
  async assignFacultyCouncil(
    @Param('proposalId') proposalId: string,
    @Body() dto: AssignFacultyCouncilDto,
    @CurrentUser() user: RequestUser,
  ): Promise<AssignFacultyCouncilResponse> {
    if (!user.facultyId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_FACULTY',
          message: 'Bạn chưa được gán vào khoa nào',
        },
      });
    }

    const result = await this.councilService.assignFacultyCouncilToProposal(
      proposalId,
      dto.councilId,
      user.id,
      user.facultyId,
    );

    return result as AssignFacultyCouncilResponse;
  }

  /**
   * GET /api/council/faculty/:proposalId/voters
   * Get eligible voters for a proposal in faculty council review
   *
   * Returns which council members can vote, and which are excluded (owner, secretary)
   */
  @Get('faculty/:proposalId/voters')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN, UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA, UserRole.PHONG_KHCN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách thành viên có quyền bỏ phiếu cho đề tài',
    description:
      'Trả về danh sách thành viên hội đồng có quyền bỏ phiếu cho đề tài cụ thể. ' +
      'Loại trừ thư ký (chỉ tổng hợp) và chủ nhiệm đề tài (không tự đánh giá).',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách eligible voters',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal không tồn tại hoặc chưa có hội đồng',
  })
  async getEligibleVotersForProposal(
    @Param('proposalId') proposalId: string,
  ): Promise<{
    success: boolean;
    data: {
      eligibleVoters: string[];
      excludedMembers: { id: string; reason: string }[];
      totalEligible: number;
      warning?: string;
    };
  }> {
    // Get proposal with council and owner
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        ownerId: true,
        councilId: true,
        council: {
          include: {
            members: {
              select: { userId: true },
            },
          },
        },
      },
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

    if (!proposal.council) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_COUNCIL_ASSIGNED',
          message: 'Đề tài chưa được gán hội đồng',
        },
      });
    }

    const memberIds = proposal.council.members.map((m) => m.userId);
    const votersInfo = this.councilService.getEligibleVotersForProposal(
      memberIds,
      proposal.council.secretaryId || '',
      proposal.ownerId,
    );

    return {
      success: true,
      data: votersInfo,
    };
  }
}
