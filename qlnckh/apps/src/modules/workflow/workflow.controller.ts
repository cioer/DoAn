import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  NotFoundException,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors';

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
}
