import { Controller, Get, Patch, HttpCode, HttpStatus, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EvaluationService } from './evaluations.service';
import {
  UpdateEvaluationDto,
  EvaluationDto,
  GetOrCreateEvaluationResponse,
  UpdateEvaluationResponse,
  ErrorResponseDto,
} from './dto/evaluation.dto';

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
}
