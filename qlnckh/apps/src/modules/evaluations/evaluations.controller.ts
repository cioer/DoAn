import { Controller, Get, Patch, Post, HttpCode, HttpStatus, Param, Body, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EvaluationService } from './evaluations.service';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { IdempotencyInterceptor } from '../../common/interceptors';
import {
  UpdateEvaluationDto,
  EvaluationDto,
  GetOrCreateEvaluationResponse,
  UpdateEvaluationResponse,
  ErrorResponseDto,
  GetEvaluationResultsResponse,
} from './dto/evaluation.dto';
import {
  SubmitEvaluationRequestDto,
  SubmitEvaluationResponseDto,
} from './dto/submit-evaluation.dto';
import {
  GetAllEvaluationsResponseDto,
  FinalizeCouncilEvaluationRequestDto,
  FinalizeCouncilEvaluationResponseDto,
  CouncilEvaluationSummaryResponseDto,
} from './dto/council-evaluation.dto';
import { Permission } from '../rbac/permissions.enum';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

interface RequestWithUser extends Request {
  user: RequestUser;
}

/**
 * Evaluation Controller (Story 5.3)
 * Manages evaluation CRUD operations for council secretaries
 */
@ApiTags('evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(IdempotencyInterceptor) // Story 5.4: Enable idempotency for state-changing actions
@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  /**
   * Get or create draft evaluation for a proposal (Story 5.3)
   * Auto-creates draft if it doesn't exist
   *
   * @param proposalId - Proposal ID
   * @param req - Request with user info
   * @returns Evaluation (draft or existing)
   */
  @Get(':proposalId')
  @ApiOperation({
    summary: 'Get or create draft evaluation',
    description: 'Returns existing evaluation or creates new draft for assigned secretary',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluation retrieved or created',
    type: GetOrCreateEvaluationResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state - proposal not in OUTLINE_COUNCIL_REVIEW',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the assigned secretary',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal not found',
    type: ErrorResponseDto,
  })
  async getOrCreateEvaluation(
    @Param('proposalId') proposalId: string,
    @Req() req: RequestWithUser,
  ): Promise<GetOrCreateEvaluationResponse> {
    const evaluation = await this.evaluationService.getOrCreateEvaluation(
      proposalId,
      req.user.id,
    );

    return {
      success: true,
      data: {
        id: evaluation.id,
        proposalId: evaluation.proposalId,
        evaluatorId: evaluation.evaluatorId,
        state: evaluation.state,
        formData: evaluation.formData as Record<string, unknown>,
        createdAt: evaluation.createdAt,
        updatedAt: evaluation.updatedAt,
      },
    };
  }

  /**
   * Update evaluation form data (Story 5.3)
   * Only allows updating DRAFT evaluations
   *
   * @param proposalId - Proposal ID
   * @param updateDto - Form data to update
   * @param req - Request with user info
   * @returns Updated evaluation
   */
  @Patch(':proposalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update evaluation draft',
    description: 'Updates evaluation form data. Only allowed for DRAFT evaluations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluation updated',
    type: UpdateEvaluationResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Evaluation is not in DRAFT state',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
    type: ErrorResponseDto,
  })
  async updateEvaluation(
    @Param('proposalId') proposalId: string,
    @Body() updateDto: UpdateEvaluationDto,
    @Req() req: RequestWithUser,
  ): Promise<UpdateEvaluationResponse> {
    const evaluation = await this.evaluationService.updateEvaluation(
      proposalId,
      req.user.id,
      updateDto.formData || {},
    );

    return {
      success: true,
      data: {
        id: evaluation.id,
        proposalId: evaluation.proposalId,
        evaluatorId: evaluation.evaluatorId,
        state: evaluation.state,
        formData: evaluation.formData as Record<string, unknown>,
        createdAt: evaluation.createdAt,
        updatedAt: evaluation.updatedAt,
      },
    };
  }

  /**
   * Submit evaluation (Story 5.4)
   * Transitions evaluation from DRAFT to FINALIZED
   * Transitions proposal from OUTLINE_COUNCIL_REVIEW to APPROVED
   * Requires idempotency key via X-Idempotency-Key header
   *
   * @param proposalId - Proposal ID
   * @param submitDto - Submit request with idempotency key
   * @param req - Request with user info
   * @returns Submitted evaluation and updated proposal
   */
  @Post(':proposalId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit evaluation',
    description: 'Submits evaluation for finalization. Transitions evaluation to FINALIZED and proposal to APPROVED.',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluation submitted successfully',
    type: SubmitEvaluationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state or incomplete form data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the assigned secretary',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
    type: ErrorResponseDto,
  })
  async submitEvaluation(
    @Param('proposalId') proposalId: string,
    @Body() submitDto: SubmitEvaluationRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<SubmitEvaluationResponseDto> {
    const result = await this.evaluationService.submitEvaluation(
      proposalId,
      req.user.id,
      submitDto.idempotencyKey,
    );

    return {
      success: true,
      data: {
        evaluationId: result.evaluation.id,
        state: result.evaluation.state,
        proposalId: result.proposal.id,
        proposalState: result.proposal.state,
        submittedAt: result.evaluation.updatedAt,
      },
    };
  }

  /**
   * GET /api/evaluations/:proposalId/results
   * GIANG_VIEN Feature: Get evaluation results for proposal owners
   * Allows proposal owners to view finalized evaluation results
   *
   * @param proposalId - Proposal ID
   * @param req - Request with user info
   * @returns Finalized evaluation with evaluator details
   */
  @Get(':proposalId/results')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.VIEW_EVALUATION_RESULTS)
  @ApiOperation({
    summary: 'Lấy kết quả đánh giá đề tài',
    description: 'Chủ đề tài có thể xem kết quả đánh giá đã hoàn tất của đề tài.',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluation results retrieved successfully',
    type: GetEvaluationResultsResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the proposal owner',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal or evaluation not found',
    type: ErrorResponseDto,
  })
  async getEvaluationResults(
    @Param('proposalId') proposalId: string,
    @Req() req: RequestWithUser,
  ): Promise<GetEvaluationResultsResponse> {
    const evaluation = await this.evaluationService.getEvaluationResultsForOwner(
      proposalId,
      req.user.id,
    );

    return {
      success: true,
      data: {
        id: evaluation.id,
        proposalId: evaluation.proposalId,
        evaluatorId: evaluation.evaluatorId,
        state: evaluation.state,
        formData: evaluation.formData as Record<string, unknown>,
        createdAt: evaluation.createdAt,
        updatedAt: evaluation.updatedAt,
        evaluator: evaluation.evaluator ? {
          id: evaluation.evaluator.id,
          displayName: evaluation.evaluator.displayName,
          email: evaluation.evaluator.email,
          role: evaluation.evaluator.role,
        } : undefined,
      },
    };
  }

  /**
   * GET /api/evaluations/:proposalId/all
   * Multi-member Evaluation: Get all evaluations for a proposal
   * Only the secretary can view all evaluations
   *
   * @param proposalId - Proposal ID
   * @param req - Request with user info
   * @returns All evaluations with proposal and council info
   */
  @Get(':proposalId/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy tất cả đánh giá của đề tài',
    description: 'Chỉ thư ký hội đồng mới có thể xem tất cả đánh giá của các thành viên.',
  })
  @ApiResponse({
    status: 200,
    description: 'All evaluations retrieved successfully',
    type: GetAllEvaluationsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the secretary',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal or council not found',
    type: ErrorResponseDto,
  })
  async getAllEvaluations(
    @Param('proposalId') proposalId: string,
    @Req() req: RequestWithUser,
  ): Promise<GetAllEvaluationsResponseDto> {
    const result = await this.evaluationService.getAllEvaluationsForProposal(
      proposalId,
      req.user.id,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /api/evaluations/:proposalId/finalize
   * Multi-member Evaluation: Finalize council evaluation and transition proposal
   * Only the secretary can finalize after reviewing all member evaluations
   *
   * @param proposalId - Proposal ID
   * @param finalizeDto - Finalize request with conclusion and idempotency key
   * @param req - Request with user info
   * @returns Updated proposal with new state
   */
  @Post(':proposalId/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hoàn tất đánh giá hội đồng',
    description: 'Thư ký hội đồng xem tất cả đánh giá và đưa ra kết luận cuối cùng. Đề tài sẽ chuyển sang APPROVED hoặc CHANGES_REQUESTED.',
  })
  @ApiResponse({
    status: 200,
    description: 'Council evaluation finalized successfully',
    type: FinalizeCouncilEvaluationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state or secretary has not submitted',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the secretary',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal or council not found',
    type: ErrorResponseDto,
  })
  async finalizeCouncilEvaluation(
    @Param('proposalId') proposalId: string,
    @Body() finalizeDto: FinalizeCouncilEvaluationRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<FinalizeCouncilEvaluationResponseDto> {
    const result = await this.evaluationService.finalizeCouncilEvaluation(
      proposalId,
      req.user.id,
      finalizeDto.finalConclusion,
      finalizeDto.finalComments,
      finalizeDto.idempotencyKey,
    );

    return {
      success: true,
      data: {
        proposalId: result.proposal.id,
        proposalState: result.proposal.state,
        targetState: result.targetState,
        finalizedAt: new Date(),
      },
    };
  }

  /**
   * GET /api/evaluations/:proposalId/summary
   * BAN_GIAM_HOC Feature: Get council evaluation summary for approval decision
   * Allows BGH to view aggregated council evaluation results before final approval
   *
   * @param proposalId - Proposal ID
   * @param req - Request with user info
   * @returns Council evaluation summary with aggregate scores and individual evaluations
   */
  @Get(':proposalId/summary')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.BAN_GIAM_HOC, UserRole.BGH)
  @ApiOperation({
    summary: 'Lấy tổng kết đánh giá hội đồng',
    description: 'Ban Giám Học xem tổng kết đánh giá của hội đồng trước khi ra quyết định cuối cùng. Hiển thị điểm trung bình, đánh giá chi tiết từng thành viên và kết luận cuối cùng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Council evaluation summary retrieved successfully',
    type: CouncilEvaluationSummaryResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not BAN_GIAM_HOC or BGH',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proposal or council not found',
    type: ErrorResponseDto,
  })
  async getCouncilEvaluationSummary(
    @Param('proposalId') proposalId: string,
    @Req() req: RequestWithUser,
  ): Promise<CouncilEvaluationSummaryResponseDto> {
    const summary = await this.evaluationService.getCouncilEvaluationSummaryForBGH(
      proposalId,
      req.user.id,
      req.user.role,
    );

    return {
      success: true,
      data: summary,
    };
  }
}
