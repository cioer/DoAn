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
import { ProjectState, Prisma, UserRole } from '@prisma/client';
import { Permission } from '../rbac/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors';
import {
  SubmitProposalDto,
  ApproveFacultyReviewDto,
  ReturnFacultyReviewDto,
  ResubmitProposalDto,
  TransitionResponseDto,
  CancelProposalDto,
  WithdrawProposalDto,
  RejectProposalDto,
  PauseProposalDto,
  ResumeProposalDto,
  ApproveCouncilReviewDto,
  ReturnCouncilReviewDto,
  AcceptSchoolReviewDto,
  ReturnSchoolReviewDto,
  StartProjectDto,
  SubmitAcceptanceDto,
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
    @CurrentUser() user: RequestUser,
    @Query('filter') filter: QueueFilterType,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
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
        const endDate = await this.slaService.addBusinessDays(startDate, 2);
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
   * POST /api/workflow/:proposalId/submit
   * GIANG_VIEN Feature: Submit Proposal Action
   *
   * Submits a proposal at DRAFT state, transitioning it to
   * FACULTY_REVIEW. Only GIANG_VIEN (proposal owner) can perform this action.
   *
   * AC3: When owner submits:
   * - State transitions DRAFT → FACULTY_REVIEW
   * - holder_unit = faculty_id of proposal
   * - workflow_logs entry with action=SUBMIT
   */
  @Post(':proposalId/submit')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Gửi duyệt đề tài',
    description:
      'Gửi đề tài từ trạng thái DRAFT sang FACULTY_REVIEW để Quản lý khoa duyệt. Chỉ GIANG_VIEN (chủ đề tài) mới có thể gửi.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được gửi thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'DRAFT',
          currentState: 'FACULTY_REVIEW',
          action: 'SUBMIT',
          holderUnit: 'faculty-id',
          holderUser: null,
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in DRAFT state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: 'Chỉ có thể gửi đề tài ở trạng thái DRAFT',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user not owner or lacks required role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền gửi đề tài này',
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
  async submitProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: SubmitProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
  ): Promise<
    | TransitionResponseDto
    | {
        success: false;
        error: { code: string; message: string; details?: Record<string, unknown> };
      }
  > {
    const context = {
      userId: user.id,
      userRole: user.role,
      userFacultyId: user.facultyId,
      idempotencyKey: dto.idempotencyKey,
      ip,
      userAgent,
      requestId: `submit-${proposalId}-${Date.now()}`,
    };

    const result = await this.workflowService.submitProposal(
      proposalId,
      context,
    );

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        previousState: result.previousState,
        currentState: result.currentState,
        action: 'SUBMIT',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/start-project
   * GIANG_VIEN Feature: Start Project Implementation
   *
   * Starts implementation of an approved proposal, transitioning it from
   * APPROVED to IN_PROGRESS. Only GIANG_VIEN (proposal owner) or PHONG_KHCN
   * can perform this action.
   *
   * When owner starts:
   * - State transitions APPROVED → IN_PROGRESS
   * - holder_unit = owner_faculty_id (faculty of the owner)
   * - holder_user = owner_id (the researcher)
   * - workflow_logs entry with action=START_PROJECT
   */
  @Post(':proposalId/start-project')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN, UserRole.PHONG_KHCN)
  @ApiOperation({
    summary: 'Bắt đầu thực hiện đề tài',
    description:
      'Chuyển đề tài từ trạng thái APPROVED sang IN_PROGRESS để bắt đầu thực hiện. Chỉ GIANG_VIEN (chủ đề tài) hoặc PHONG_KHCN mới có thể bắt đầu.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được bắt đầu thực hiện thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'APPROVED',
          currentState: 'IN_PROGRESS',
          action: 'START_PROJECT',
          holderUnit: 'faculty-id',
          holderUser: 'user-id',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in APPROVED state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_APPROVED',
          message: 'Chỉ có thể bắt đầu thực hiện đề tài ở trạng thái APPROVED',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user not owner or lacks required role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền bắt đầu thực hiện đề tài này',
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
  async startProject(
    @Param('proposalId') proposalId: string,
    @Body() dto: StartProjectDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
  ): Promise<
    | TransitionResponseDto
    | {
        success: false;
        error: { code: string; message: string; details?: Record<string, unknown> };
      }
  > {
    const context = {
      userId: user.id,
      userRole: user.role,
      userFacultyId: user.facultyId,
      idempotencyKey: dto.idempotencyKey,
      ip,
      userAgent,
      requestId: `start-project-${proposalId}-${Date.now()}`,
    };

    const result = await this.workflowService.startProject(
      proposalId,
      context,
    );

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        previousState: result.previousState,
        currentState: result.currentState,
        action: 'START_PROJECT',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/submit-acceptance
   * GIANG_VIEN Feature: Submit Project for Acceptance Review
   *
   * Submits an in-progress proposal for faculty acceptance review,
   * transitioning it from IN_PROGRESS to FACULTY_ACCEPTANCE_REVIEW.
   * Only GIANG_VIEN (proposal owner) can perform this action.
   *
   * When owner submits:
   * - State transitions IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW
   * - holder_unit = owner_faculty_id (faculty of the owner)
   * - holder_user = null (faculty QA will review)
   * - workflow_logs entry with action=SUBMIT_ACCEPTANCE
   */
  @Post(':proposalId/submit-acceptance')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Nộp nghiệm thu đề tài',
    description:
      'Chuyển đề tài từ trạng thái IN_PROGRESS sang FACULTY_ACCEPTANCE_REVIEW để nghiệm thu. Chỉ GIANG_VIEN (chủ đề tài) mới có thể nộp.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được nộp nghiệm thu thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'IN_PROGRESS',
          currentState: 'FACULTY_ACCEPTANCE_REVIEW',
          action: 'SUBMIT_ACCEPTANCE',
          holderUnit: 'faculty-id',
          holderUser: null,
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in IN_PROGRESS state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_IN_PROGRESS',
          message: 'Chỉ có thể nộp nghiệm thu đề tài ở trạng thái IN_PROGRESS',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user not owner or lacks required role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền nộp nghiệm thu đề tài này',
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
  async submitAcceptance(
    @Param('proposalId') proposalId: string,
    @Body() dto: SubmitAcceptanceDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
  ): Promise<
    | TransitionResponseDto
    | {
        success: false;
        error: { code: string; message: string; details?: Record<string, unknown> };
      }
  > {
    const context = {
      userId: user.id,
      userRole: user.role,
      userFacultyId: user.facultyId,
      idempotencyKey: dto.idempotencyKey,
      ip,
      userAgent,
      requestId: `submit-acceptance-${proposalId}-${Date.now()}`,
    };

    const result = await this.workflowService.submitAcceptance(
      proposalId,
      context,
    );

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        previousState: result.previousState,
        currentState: result.currentState,
        action: 'SUBMIT_ACCEPTANCE',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
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
  @RequirePermissions(Permission.FACULTY_APPROVE)
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
  @RequirePermissions(Permission.FACULTY_RETURN)
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

  /**
   * POST /api/workflow/:proposalId/resubmit
   * Story 4.5: Resubmit Action (Read Return Target from Log)
   *
   * Resubmits a proposal after changes, transitioning from CHANGES_REQUESTED
   * back to the return_target_state (e.g., FACULTY_REVIEW). NOT to DRAFT.
   * Only proposal owners (GIANG_VIEN) can perform this action.
   *
   * AC1: Reads return_target from workflow log
   * AC2: State transitions to return_target_state (FACULTY_REVIEW)
   * AC3: Workflow log entry with RESUBMIT action
   */
  @Post(':proposalId/resubmit')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN, UserRole.QUAN_LY_KHOA)
  @ApiOperation({
    summary: 'Nộp lại hồ sơ sau khi sửa',
    description:
      'Chuyển đề tài từ trạng thái CHANGES_REQUESTED về return_target_state (FACULTY_REVIEW) - KHÔNG quay về DRAFT. Chỉ chủ nhiệm đề tài mới có thể nộp lại.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được nộp lại thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'CHANGES_REQUESTED',
          currentState: 'FACULTY_REVIEW',
          action: 'RESUBMIT',
          holderUnit: 'faculty-uuid',
          holderUser: 'reviewer-uuid',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in CHANGES_REQUESTED state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_CHANGES_REQUESTED',
          message: 'Chỉ có thể nộp lại đề tài ở trạng thái CHANGES_REQUESTED',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user not owner of proposal',
    schema: {
      example: {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Chỉ chủ nhiệm đề tài mới có thể nộp lại hồ sơ',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found or no return log found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài hoặc thông tin yêu cầu sửa',
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
  async resubmitProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: ResubmitProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    // Verify proposal exists
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true, state: true, ownerId: true },
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

    // Validate state: must be CHANGES_REQUESTED
    if (proposal.state !== ProjectState.CHANGES_REQUESTED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_CHANGES_REQUESTED',
          message: `Chỉ có thể nộp lại đề tài ở trạng thái CHANGES_REQUESTED. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Execute transition via workflow service
    const result = await this.workflowService.resubmitProposal(
      proposalId,
      dto.checkedSections,
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
        action: 'RESUBMIT',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  // ============================================================
  // Epic 9: Exception Action Endpoints (Stories 9.1, 9.2, 9.3)
  // ============================================================

  /**
   * POST /api/workflow/:proposalId/cancel
   * Story 9.1: Cancel Action - Owner can cancel DRAFT proposals
   *
   * Cancels a proposal in DRAFT state.
   */
  @Post(':proposalId/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Hủy đề tài',
    description:
      'Hủy đề tài ở trạng thái Nháp (DRAFT). Chỉ chủ nhiệm (GIANG_VIEN) mới có thể hủy.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được hủy thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'DRAFT',
          currentState: 'CANCELLED',
          action: 'CANCEL',
          cancelledAt: '2026-01-07T10:00:00.000Z',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in DRAFT state',
    schema: {
      example: {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Chỉ có thể hủy đề tài ở trạng thái Nháp (DRAFT)',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not owner of proposal',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  async cancelProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: CancelProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.cancelProposal(
      proposalId,
      dto.reason,
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
        action: 'CANCEL',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/withdraw
   * Story 9.1: Withdraw Action - Owner can withdraw before APPROVED
   *
   * Withdraws a proposal that's in review but not yet approved.
   */
  @Post(':proposalId/withdraw')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.GIANG_VIEN)
  @ApiOperation({
    summary: 'Rút hồ sơ đề tài',
    description:
      'Rút hồ sơ đề tài đang xem xét (trước khi APPROVED). Chỉ chủ nhiệm (GIANG_VIEN) mới có thể rút.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được rút thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'FACULTY_REVIEW',
          currentState: 'WITHDRAWN',
          action: 'WITHDRAW',
          withdrawnAt: '2026-01-07T10:00:00.000Z',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not withdrawable',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not owner of proposal',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  async withdrawProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: WithdrawProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.withdrawProposal(
      proposalId,
      dto.reason,
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
        action: 'WITHDRAW',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/reject
   * Story 9.2: Reject Action - Decision makers can reject proposals
   *
   * Rejects a proposal in review state with a reason.
   */
  @Post(':proposalId/reject')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(
    UserRole.QUAN_LY_KHOA,
    UserRole.PHONG_KHCN,
    UserRole.THU_KY_HOI_DONG,
    UserRole.THANH_TRUNG,
    UserRole.BAN_GIAM_HOC,
  )
  @ApiOperation({
    summary: 'Từ chối đề tài',
    description:
      'Từ chối đề tài đang ở trạng thái xem xét. Các vai trò được phép tùy theo trạng thái.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài bị từ chối thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'FACULTY_REVIEW',
          currentState: 'REJECTED',
          action: 'REJECT',
          rejectedAt: '2026-01-07T10:00:00.000Z',
          rejectedBy: 'user-uuid',
          reasonCode: 'NOT_SCIENTIFIC',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not rejectable',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  async rejectProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: RejectProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.rejectProposal(
      proposalId,
      dto.reasonCode,
      dto.comment,
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
        action: 'REJECT',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/pause
   * Story 9.3: Pause Action - PHONG_KHCN can pause proposals
   *
   * Temporarily pauses a proposal.
   */
  @Post(':proposalId/pause')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN)
  @ApiOperation({
    summary: 'Tạm dừng đề tài',
    description:
      'Tạm dừng tạm thời đề tài. Chỉ PKHCN mới có quyền tạm dừng/tiếp tục.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được tạm dừng thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'IN_PROGRESS',
          currentState: 'PAUSED',
          action: 'PAUSE',
          pausedAt: '2026-01-07T10:00:00.000Z',
          prePauseState: 'IN_PROGRESS',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal cannot be paused',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not PHONG_KHCN',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  async pauseProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: PauseProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const expectedResumeAt = dto.expectedResumeAt
      ? new Date(dto.expectedResumeAt)
      : undefined;

    const result = await this.workflowService.pauseProposal(
      proposalId,
      dto.reason,
      expectedResumeAt,
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
        action: 'PAUSE',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * POST /api/workflow/:proposalId/resume
   * Story 9.3: Resume Action - PHONG_KHCN can resume paused proposals
   *
   * Resumes a paused proposal back to its pre-pause state.
   */
  @Post(':proposalId/resume')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN)
  @ApiOperation({
    summary: 'Tiếp tục đề tài',
    description:
      'Tiếp tục đề tài đang tạm dừng. Chỉ PKHCN mới có quyền tạm dừng/tiếp tục.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được tiếp tục thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'PAUSED',
          currentState: 'IN_PROGRESS',
          action: 'RESUME',
          resumedAt: '2026-01-07T10:00:00.000Z',
          newSlaDeadline: '2026-02-07T17:00:00.000Z',
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not paused',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not PHONG_KHCN',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  async resumeProposal(
    @Param('proposalId') proposalId: string,
    @Body() dto: ResumeProposalDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.resumeProposal(
      proposalId,
      dto.comment,
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
        action: 'RESUME',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * Approve Council Review (OUTLINE_COUNCIL_REVIEW → APPROVED)
   * BAN_GIAM_HOC: High-level decision to approve proposal after Council Review
   *
   * AC1: When BAN_GIAM_HOC approves:
   * - State transitions OUTLINE_COUNCIL_REVIEW → APPROVED
   * - holder_user = null (no specific holder needed)
   * - workflow_logs entry with action=APPROVE
   */
  @Post(':proposalId/approve-council')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.BAN_GIAM_HOC)
  @ApiOperation({
    summary: 'Duyệt đề tài ở cấp Hội đồng',
    description:
      'Chuyển đề tài từ trạng thái OUTLINE_COUNCIL_REVIEW sang APPROVED. Chỉ BAN_GIAM_HOC mới có thể duyệt.',
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
          previousState: 'OUTLINE_COUNCIL_REVIEW',
          currentState: 'APPROVED',
          action: 'APPROVE',
          holderUnit: null,
          holderUser: null,
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in OUTLINE_COUNCIL_REVIEW state',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks BAN_GIAM_HOC role',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - duplicate idempotency key',
  })
  async approveCouncilReview(
    @Param('proposalId') proposalId: string,
    @Body() dto: ApproveCouncilReviewDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.approveCouncilReview(
      proposalId,
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
        action: 'APPROVE',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * Return Council Review (OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal for changes during Council Review
   *
   * AC1: When BAN_GIAM_HOC returns:
   * - State transitions OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED
   * - holder_unit = owner_faculty_id (back to PI)
   * - return_target_state stored in workflow_logs
   */
  @Post(':proposalId/return-council')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.BAN_GIAM_HOC)
  @ApiOperation({
    summary: 'Yêu cầu sửa đổi từ Hội đồng',
    description:
      'Chuyển đề tài từ trạng thái OUTLINE_COUNCIL_REVIEW sang CHANGES_REQUESTED. Chỉ BAN_GIAM_HOC mới có thể trả về.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được trả về thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in OUTLINE_COUNCIL_REVIEW state',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks BAN_GIAM_HOC role',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  async returnCouncilReview(
    @Param('proposalId') proposalId: string,
    @Body() dto: ReturnCouncilReviewDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.returnCouncilReview(
      proposalId,
      dto.reason,
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

  /**
   * Accept School Acceptance (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
   * BAN_GIAM_HOC: Final acceptance after School Acceptance Review
   *
   * AC1: When BAN_GIAM_HOC accepts:
   * - State transitions SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
   * - holder_unit = "PHONG_KHCN"
   * - workflow_logs entry with action=ACCEPT
   */
  @Post(':proposalId/accept-school')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.BAN_GIAM_HOC)
  @ApiOperation({
    summary: 'Nghiệm thu cấp Trường',
    description:
      'Chuyển đề tài từ trạng thái SCHOOL_ACCEPTANCE_REVIEW sang HANDOVER. Chỉ BAN_GIAM_HOC mới có thể nghiệm thu.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được nghiệm thu thành công',
    schema: {
      example: {
        success: true,
        data: {
          proposalId: 'proposal-uuid',
          previousState: 'SCHOOL_ACCEPTANCE_REVIEW',
          currentState: 'HANDOVER',
          action: 'ACCEPT',
          holderUnit: 'PHONG_KHCN',
          holderUser: null,
          workflowLogId: 'log-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in SCHOOL_ACCEPTANCE_REVIEW state',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks BAN_GIAM_HOC role',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - duplicate idempotency key',
  })
  async acceptSchoolReview(
    @Param('proposalId') proposalId: string,
    @Body() dto: AcceptSchoolReviewDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.acceptSchoolReview(
      proposalId,
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
        action: 'ACCEPT',
        holderUnit: result.holderUnit,
        holderUser: result.holderUser,
        workflowLogId: result.workflowLog.id,
      },
    };
  }

  /**
   * Return School Acceptance (SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED)
   * BAN_GIAM_HOC: Return proposal for changes during School Acceptance Review
   *
   * AC1: When BAN_GIAM_HOC returns:
   * - State transitions SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED
   * - holder_unit = owner_faculty_id (back to PI)
   * - return_target_state stored in workflow_logs
   */
  @Post(':proposalId/return-school')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.BAN_GIAM_HOC)
  @ApiOperation({
    summary: 'Yêu cầu sửa đổi từ nghiệm thu cấp Trường',
    description:
      'Chuyển đề tài từ trạng thái SCHOOL_ACCEPTANCE_REVIEW sang CHANGES_REQUESTED. Chỉ BAN_GIAM_HOC mới có thể trả về.',
  })
  @ApiParam({
    name: 'proposalId',
    description: 'Proposal ID (UUID)',
    example: 'proposal-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Đề tài được trả về thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - proposal not in SCHOOL_ACCEPTANCE_REVIEW state',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks BAN_GIAM_HOC role',
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
  })
  async returnSchoolReview(
    @Param('proposalId') proposalId: string,
    @Body() dto: ReturnSchoolReviewDto,
    @CurrentUser() user: RequestUser,
    @Query('ip') ip?: string,
    @Query('userAgent') userAgent?: string,
    @Query('requestId') requestId?: string,
  ): Promise<TransitionResponseDto> {
    const result = await this.workflowService.returnSchoolReview(
      proposalId,
      dto.reason,
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
