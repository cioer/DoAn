import { Controller, Get, Patch, Post, HttpCode, HttpStatus, Param, Body, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EvaluationService } from './evaluations.service';
import { IdempotencyInterceptor } from '../../common/interceptors';
import {
  UpdateEvaluationDto,
  EvaluationDto,
  GetOrCreateEvaluationResponse,
  UpdateEvaluationResponse,
  ErrorResponseDto,
} from './dto/evaluation.dto';
import {
  SubmitEvaluationRequestDto,
  SubmitEvaluationResponseDto,
} from './dto/submit-evaluation.dto';

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
}
