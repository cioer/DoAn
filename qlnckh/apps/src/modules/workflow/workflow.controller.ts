import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import {
  WorkflowLogDto,
  WorkflowLogsResponseDto,
  WorkflowLogsErrorResponseDto,
} from './dto/workflow-log.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';

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
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

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
}
