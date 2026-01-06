import {
  Controller,
  Get,
  Post,
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
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../auth/prisma.service';
import { SlaService } from '../calendar/sla.service';
import {
  WorkflowLogDto,
  WorkflowLogsResponseDto,
  WorkflowLogsErrorResponseDto,
} from './dto/workflow-log.dto';
import {
  QueueFilterDto,
  QueueFilterType,
  ProposalQueueItemDto,
  QueueResponseDto,
  QueueErrorResponseDto,
} from './dto/queue-filter.dto';
import {
  getMyQueueProposalsFilter,
  getMyProposalsFilter,
  getOverdueProposalsFilter,
  getUpcomingProposalsFilter,
  isTerminalQueueState,
  TERMINAL_QUEUE_STATES,
} from './helpers/holder-rules.helper';
import { ProjectState, Prisma } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors';
import { UserRole } from '@prisma/client';
import {
  ApproveFacultyReviewDto,
  ReturnFacultyReviewDto,
  TransitionResponseDto,
} from './dto/transition.dto';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

@ApiTags('workflow')
@Controller('workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly prisma: PrismaService,
    private readonly slaService: SlaService,
  ) {}

  /**
   * GET /api/workflow/workflow-logs/:proposalId
   * Story 3.4: Get workflow logs for timeline display
   *
   * Returns all workflow log entries for a proposal, sorted by timestamp DESC
   * (newest first) for UI timeline display.
   *
   * Authenticated users can read logs (no role restriction).
   */
  @Get('workflow-logs/:proposalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy lịch sử workflow của đề tài',
    description:
      'Lấy tất cả workflow log entries của một đề tài, sắp xếp theo thời gian giảm dần (mới nhất lên đầu) để hiển thị timeline.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách workflow log entries',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'log-uuid-2',
            proposalId: 'proposal-uuid',
            action: 'APPROVE',
            fromState: 'FACULTY_REVIEW',
            toState: 'SCHOOL_SELECTION_REVIEW',
            actorId: 'user-uuid',
            actorName: 'Trần Văn B',
            returnTargetState: null,
            returnTargetHolderUnit: null,
            reasonCode: null,
            comment: null,
            timestamp: '2026-01-07T14:30:00.000Z',
          },
          {
            id: 'log-uuid-1',
            proposalId: 'proposal-uuid',
            action: 'SUBMIT',
            fromState: 'DRAFT',
            toState: 'FACULTY_REVIEW',
            actorId: 'user-uuid',
            actorName: 'Nguyễn Văn A',
            returnTargetState: null,
            returnTargetHolderUnit: null,
            reasonCode: null,
            comment: null,
            timestamp: '2026-01-06T10:00:00.000Z',
          },
        ],
        meta: {
          proposalId: 'proposal-uuid',
          total: 2,
        },
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
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
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
  async getWorkflowLogs(
    @Param('proposalId') proposalId: string,
    @CurrentUser() _user: RequestUser,
  ): Promise<WorkflowLogsResponseDto> {
    // Verify proposal exists before fetching logs (Story 3.4 code review fix)
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true }, // Only check existence, don't load full data
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

    const logs = await this.workflowService.getWorkflowLogs(proposalId);

    // Sort by timestamp DESC (newest first) for UI display
    const sortedLogs = logs.sort((a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime(),
    );

    return {
      success: true,
      data: sortedLogs as unknown as WorkflowLogDto[],
      meta: {
        proposalId,
        total: sortedLogs.length,
      },
    };
  }

  /**
   * GET /api/workflow/queue?filter={filterType}&page={page}&pageSize={pageSize}&search={search}
   * Story 3.5: Queue filters for worklist/queue page
   *
   * Returns proposals filtered by queue type with pagination.
   *
   * Authenticated users can access queue endpoint.
   */
  @Get('queue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách đề tài theo bộ lọc queue',
    description:
      'Lấy danh sách đề tài theo bộ lọc: my-queue (Đang chờ tôi), my-proposals (Của tôi), all (Tất cả), overdue (Quá hạn), upcoming (Sắp đến hạn T-2).',
  })
  @ApiQuery({
    name: 'filter',
    description: 'Loại bộ lọc queue',
    enum: QueueFilterType,
    example: QueueFilterType.MY_QUEUE,
  })
  @ApiQuery({
    name: 'page',
    description: 'Số trang (mặc định: 1)',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Số item mỗi trang (mặc định: 20)',
    required: false,
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    description: 'Tìm kiếm theo tiêu đề hoặc mã đề tài',
    required: false,
    example: 'Nghiên cứu AI',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đề tài theo bộ lọc',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'proposal-uuid',
            code: 'DT-2024-001',
            title: 'Nghiên cứu ứng dụng AI trong giáo dục',
            state: 'FACULTY_REVIEW',
            holderUnit: 'faculty-uuid',
            slaDeadline: '2026-01-10T17:00:00.000Z',
            slaStartDate: '2026-01-06T10:00:00.000Z',
            createdAt: '2026-01-01T10:00:00.000Z',
            ownerId: 'user-uuid',
          },
        ],
        meta: {
          filter: 'my-queue',
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid query parameters',
    schema: {
      example: {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Tham số không hợp lệ',
        },
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
  async getQueue(
    @Query('filter') filter: QueueFilterType,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @CurrentUser() user: RequestUser,
  ): Promise<QueueResponseDto> {
    // Parse and validate pagination parameters (Story 3.5 code review fix)
    let pageNum = page ? parseInt(page, 10) : 1;
    let pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;

    // Validate parsed numbers - reset to defaults if invalid
    if (isNaN(pageNum) || pageNum < 1) {
      pageNum = 1;
    }
    if (isNaN(pageSizeNum) || pageSizeNum < 1) {
      pageSizeNum = 20;
    }
    // Cap pageSize at 100 to prevent excessive queries
    if (pageSizeNum > 100) {
      pageSizeNum = 100;
    }

    // Build base where clause based on filter type
    let whereClause: Prisma.ProposalWhereInput;

    switch (filter) {
      case QueueFilterType.MY_QUEUE: {
        whereClause = getMyQueueProposalsFilter(
          user.id,
          user.facultyId,
          user.role,
        );
        break;
      }

      case QueueFilterType.MY_PROPOSALS: {
        whereClause = getMyProposalsFilter(user.id);
        break;
      }

      case QueueFilterType.ALL: {
        // All non-terminal proposals
        whereClause = {
          state: { notIn: TERMINAL_QUEUE_STATES },
        };
        break;
      }

      case QueueFilterType.OVERDUE: {
        whereClause = getOverdueProposalsFilter();
        break;
      }

      case QueueFilterType.UPCOMING: {
        // Calculate +2 working days from now
        const startDate = new Date();
        const endDate = this.slaService.addBusinessDays(startDate, 2);
        whereClause = getUpcomingProposalsFilter(startDate, endDate);
        break;
      }

      default: {
        // Fallback to my-queue
        whereClause = getMyQueueProposalsFilter(
          user.id,
          user.facultyId,
          user.role,
        );
        break;
      }
    }

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { code: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      };
    }

    // Get total count for pagination
    const total = await this.prisma.proposal.count({ where: whereClause });

    // Fetch paginated results
    const proposals = await this.prisma.proposal.findMany({
      where: whereClause,
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        title: true,
        state: true,
        holderUnit: true,
        slaDeadline: true,
        slaStartDate: true,
        createdAt: true,
        ownerId: true,
      },
    });

    const totalPages = Math.ceil(total / pageSizeNum);

    return {
      success: true,
      data: proposals as unknown as ProposalQueueItemDto[],
      meta: {
        filter,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/approve-faculty
   * Story 4.1: Faculty Approve Action
   *
   * Approves a proposal at FACULTY_REVIEW state, transitioning it to
   * SCHOOL_SELECTION_REVIEW. Only QUAN_LY_KHOA and THU_KY_KHOA roles
   * can perform this action.
   *
   * AC3: When approver approves:
   * - State transitions FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW
   * - holder_unit = "PHONG_KHCN"
   * - workflow_logs entry with action=APPROVE
   */
  @Post(':proposalId/approve-faculty')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)
  @ApiOperation({
    summary: 'Duyệt đề tài ở cấp Khoa',
    description:
      'Chuyển đề tài từ trạng thái FACULTY_REVIEW sang SCHOOL_SELECTION_REVIEW. Chỉ QUAN_LY_KHOA và THU_KY_KHOA mới có thể duyệt.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được duyệt thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'FACULTY_REVIEW',
          currentState: 'SCHOOL_SELECTION_REVIEW',
          action: 'APPROVE',
          holderUnit: 'PHONG_KHCN',
          holderUser: null,
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in FACULTY_REVIEW state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FACULTY_REVIEW',
          message: 'Chỉ có thể duyệt đề tài ở trạng thái FACULTY_REVIEW',
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
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền duyệt đề tài',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
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
  async approveFacultyReview(
    @Param('proposalId') proposalId: string,
    @Body() dto: ApproveFacultyReviewDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    // Verify proposal exists
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

    // Validate state: must be FACULTY_REVIEW
    if (proposal.state !== ProjectState.FACULTY_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FACULTY_REVIEW',
          message: `Chỉ có thể duyệt đề tài ở trạng thái FACULTY_REVIEW. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Execute transition via workflow service
    const result = await this.workflowService.approveFacultyReview(proposalId, {
      userId: user.id,
      userRole: user.role,
      userFacultyId: user.facultyId,
      idempotencyKey: dto.idempotencyKey,
      ip,
      userAgent,
      requestId,
    });

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        previousState: result.previousState,
        currentState: result.currentState,
        action: 'APPROVE',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/return-faculty
   * Story 4.2: Faculty Return Action (Reason Code + Sections)
   *
   * Returns a proposal at FACULTY_REVIEW state with changes requested,
   * transitioning it to CHANGES_REQUESTED. Only QUAN_LY_KHOA and
   * THU_KY_KHOA roles can perform this action.
   *
   * AC3: When faculty returns:
   * - State transitions FACULTY_REVIEW → CHANGES_REQUESTED
   * - holder_unit = owner_faculty_id (back to PI)
   * - workflow_logs entry with action=RETURN, return_target_state, reason_code
   */
  @Post(':proposalId/return-faculty')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)
  @ApiOperation({
    summary: 'Yêu cầu sửa hồ sơ ở cấp Khoa',
    description:
      'Trả về đề tài từ trạng thái FACULTY_REVIEW sang CHANGES_REQUESTED với lý do và phần cần sửa. Chỉ QUAN_LY_KHOA và THU_KY_KHOA mới có thể trả về.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được trả về thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'FACULTY_REVIEW',
          currentState: 'CHANGES_REQUESTED',
          action: 'RETURN',
          holderUnit: 'faculty-uuid',
          holderUser: 'user-uuid',
          returnTargetState: 'FACULTY_REVIEW',
          returnTargetHolderUnit: 'faculty-uuid',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in FACULTY_REVIEW state or invalid return data',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FACULTY_REVIEW',
          message: 'Chỉ có thể trả về đề tài ở trạng thái FACULTY_REVIEW',
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
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền trả về đề tài',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
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
  async returnFacultyReview(
    @Param('proposalId') proposalId: string,
    @Body() dto: ReturnFacultyReviewDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    // Verify proposal exists
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

    // Validate state: must be FACULTY_REVIEW
    if (proposal.state !== ProjectState.FACULTY_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FACULTY_REVIEW',
          message: `Chỉ có thể trả về đề tài ở trạng thái FACULTY_REVIEW. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Execute transition via workflow service
    const result = await this.workflowService.returnFacultyReview(
      proposalId,
      dto.reason,
      dto.reasonCode,
      dto.reasonSections,
      {
        userId: user.id,
        userRole: user.role,
        userFacultyId: user.facultyId,
        idempotencyKey: dto.idempotencyKey,
        ip,
        userAgent,
        requestId,
      },
    );

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        previousState: result.previousState,
        currentState: result.currentState,
        action: 'RETURN',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }
}
