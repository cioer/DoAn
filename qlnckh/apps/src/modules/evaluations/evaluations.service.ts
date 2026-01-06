import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService, EvaluationState } from '../auth/prisma.service';
import { ProjectState } from '@prisma/client';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

/**
 * Evaluation Service (Story 5.3)
 * Manages evaluation CRUD operations for council secretaries
 */
@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Validate score is within valid range (1-5)
   * @param score - Score to validate
   * @param sectionName - Section name for error message
   * @throws BadRequestException if score is invalid
   */
  private validateScore(score: unknown, sectionName: string): void {
    if (typeof score !== 'number' || score < 1 || score > 5) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_SCORE',
          message: `Điểm đánh giá ${sectionName} phải từ 1 đến 5`,
        },
      });
    }
  }

  /**
   * Get or create draft evaluation for a proposal (Story 5.3)
   * Called by GET /evaluations/:proposalId endpoint
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Current user ID
   * @returns Evaluation (draft or existing)
   * @throws NotFoundException if proposal not found
   * @throws ForbiddenException if user is not the assigned secretary
   */
  async getOrCreateEvaluation(proposalId: string, evaluatorId: string) {
    // Verify proposal exists and is in correct state
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        state: true,
        holderUser: true,
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

    // Validate state must be OUTLINE_COUNCIL_REVIEW
    if (proposal.state !== ProjectState.OUTLINE_COUNCIL_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể đánh giá ở trạng thái OUTLINE_COUNCIL_REVIEW. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Validate holder_user must be current user (secretary assigned to evaluate)
    if (proposal.holderUser !== evaluatorId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_ASSIGNED_EVALUATOR',
          message: 'Bạn không phải là người được phân bổ đánh giá đề tài này',
        },
      });
    }

    // Try to get existing evaluation
    let evaluation = await this.prisma.evaluation.findUnique({
      where: {
        proposalId_evaluatorId: {
          proposalId,
          evaluatorId,
        },
      },
    });

    // Create draft if doesn't exist
    if (!evaluation) {
      evaluation = await this.prisma.evaluation.create({
        data: {
          proposalId,
          evaluatorId,
          state: EvaluationState.DRAFT,
          formData: {
            scientificContent: { score: 3, comments: '' },
            researchMethod: { score: 3, comments: '' },
            feasibility: { score: 3, comments: '' },
            budget: { score: 3, comments: '' },
            conclusion: null,
            otherComments: '',
          },
        },
      });

      this.logger.log(`Created draft evaluation for proposal ${proposalId} by ${evaluatorId}`);
    }

    return evaluation;
  }

  /**
   * Update evaluation form data (Story 5.3)
   * Called by PATCH /evaluations/:proposalId endpoint
   * Only allows updating DRAFT evaluations
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Current user ID
   * @param formData - Form data to update
   * @returns Updated evaluation
   * @throws NotFoundException if evaluation not found
   * @throws BadRequestException if evaluation is not in DRAFT state
   */
  async updateEvaluation(
    proposalId: string,
    evaluatorId: string,
    formData: Record<string, unknown>,
  ) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: {
        proposalId_evaluatorId: {
          proposalId,
          evaluatorId,
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FOUND',
          message: 'Không tìm thấy phiếu đánh giá',
        },
      });
    }

    // Only allow updating DRAFT evaluations
    if (evaluation.state !== EvaluationState.DRAFT) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'EVALUATION_NOT_DRAFT',
          message: 'Chỉ có thể sửa phiếu đánh giá ở trạng thái DRAFT',
        },
      });
    }

    // Validate scores if provided (Story 5.3: scores must be 1-5)
    const mergedData = {
      ...(evaluation.formData as Record<string, unknown>),
      ...formData,
    };

    // Validate each section's score
    const sections = ['scientificContent', 'researchMethod', 'feasibility', 'budget'] as const;
    const sectionNames: Record<typeof sections[number], string> = {
      scientificContent: 'nội dung khoa học',
      researchMethod: 'phương pháp nghiên cứu',
      feasibility: 'tính khả thi',
      budget: 'kinh phí',
    };

    for (const section of sections) {
      const sectionData = mergedData[section] as Record<string, unknown> | undefined;
      if (sectionData?.score !== undefined) {
        this.validateScore(sectionData.score, sectionNames[section]);
      }
    }

    // Merge form data (partial update)
    const updatedEvaluation = await this.prisma.evaluation.update({
      where: {
        proposalId_evaluatorId: {
          proposalId,
          evaluatorId,
        },
      },
      data: {
        formData: mergedData,
      },
    });

    this.logger.log(`Updated evaluation for proposal ${proposalId} by ${evaluatorId}`);

    return updatedEvaluation;
  }

  /**
   * Get evaluation by proposal ID (for query purposes)
   *
   * @param proposalId - Proposal ID
   * @returns Evaluation or null
   */
  async getEvaluationByProposalId(proposalId: string) {
    return this.prisma.evaluation.findFirst({
      where: { proposalId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get evaluation by proposal and evaluator
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Evaluator user ID
   * @returns Evaluation or null
   */
  async getEvaluation(proposalId: string, evaluatorId: string) {
    return this.prisma.evaluation.findUnique({
      where: {
        proposalId_evaluatorId: {
          proposalId,
          evaluatorId,
        },
      },
    });
  }

  /**
   * Submit evaluation (Story 5.4, Story 5.5 - future)
   * Transitions evaluation from DRAFT to SUBMITTED
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Evaluator user ID
   * @param idempotencyKey - UUID for idempotency
   * @returns Updated evaluation
   */
  async submitEvaluation(proposalId: string, evaluatorId: string, idempotencyKey: string) {
    const evaluation = await this.getEvaluation(proposalId, evaluatorId);

    if (!evaluation) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FOUND',
          message: 'Không tìm thấy phiếu đánh giá',
        },
      });
    }

    // Validate form data is complete before submitting
    const formData = evaluation.formData as Record<string, unknown>;
    if (!formData.conclusion) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INCOMPLETE_FORM',
          message: 'Vui lòng điền đầy đủ thông tin, đặc biệt là kết luận đánh giá',
        },
      });
    }

    // Update state to SUBMITTED
    const updatedEvaluation = await this.prisma.evaluation.update({
      where: {
        proposalId_evaluatorId: {
          proposalId,
          evaluatorId,
        },
      },
      data: {
        state: EvaluationState.SUBMITTED,
      },
    });

    this.logger.log(`Submitted evaluation for proposal ${proposalId} by ${evaluatorId}`);

    return updatedEvaluation;
  }
}
