import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { EvaluationState, ProjectState, WorkflowAction, WorkflowAction as PrismaWorkflowAction, Prisma } from '@prisma/client';

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

    // Only allow updating DRAFT evaluations (Story 5.4, Story 5.5)
    if (evaluation.state !== EvaluationState.DRAFT) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'EVALUATION_FINALIZED',
          message: 'Đánh giá đã hoàn tất. Không thể chỉnh sửa.',
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
        formData: mergedData as Prisma.InputJsonValue,
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
   * Submit evaluation (Story 5.4, Story 5.5)
   * Transitions evaluation from DRAFT to FINALIZED
   * Also transitions proposal from OUTLINE_COUNCIL_REVIEW to APPROVED
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Evaluator user ID
   * @param idempotencyKey - UUID for idempotency
   * @returns Updated evaluation and proposal
   */
  async submitEvaluation(proposalId: string, evaluatorId: string, idempotencyKey: string) {
    // Get evaluation with proposal for validation
    const evaluation = await this.prisma.evaluation.findUnique({
      where: {
        proposalId_evaluatorId: {
          proposalId,
          evaluatorId,
        },
      },
      include: {
        proposal: {
          select: {
            id: true,
            state: true,
            holderUser: true,
            ownerId: true,
            facultyId: true,
          },
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

    // Check if already finalized (idempotency path)
    if (evaluation.state === EvaluationState.FINALIZED) {
      // Return existing result for idempotency
      return {
        evaluation,
        proposal: evaluation.proposal,
      };
    }

    // Validate proposal state must be OUTLINE_COUNCIL_REVIEW
    if (evaluation.proposal.state !== ProjectState.OUTLINE_COUNCIL_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể nộp đánh giá ở trạng thái OUTLINE_COUNCIL_REVIEW. Hiện tại: ${evaluation.proposal.state}`,
        },
      });
    }

    // Validate holder_user must be current user (secretary assigned to evaluate)
    if (evaluation.proposal.holderUser !== evaluatorId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_ASSIGNED_EVALUATOR',
          message: 'Bạn không phải là người được phân bổ đánh giá đề tài này',
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

    // Execute transaction: finalize evaluation + transition proposal (Story 5.4 Task 4.5)
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Finalize evaluation: DRAFT → FINALIZED
      const finalizedEvaluation = await tx.evaluation.update({
        where: {
          proposalId_evaluatorId: {
            proposalId,
            evaluatorId,
          },
        },
        data: {
          state: EvaluationState.FINALIZED,
        },
      });

      // 2. Transition proposal: OUTLINE_COUNCIL_REVIEW → APPROVED (Story 5.4 Task 4.5)
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: ProjectState.APPROVED,
          holderUnit: evaluation.proposal.facultyId, // Return to owner's faculty
          holderUser: evaluation.proposal.ownerId, // Return to PI
        },
      });

      // 3. Log workflow entry: EVALUATION_SUBMITTED (Story 5.4 AC3)
      await tx.workflowLog.create({
        data: {
          proposalId,
          action: PrismaWorkflowAction.EVALUATION_SUBMITTED, // Story 5.4: Use specific action for evaluation submission
          fromState: ProjectState.OUTLINE_COUNCIL_REVIEW,
          toState: ProjectState.APPROVED,
          actorId: evaluatorId,
          actorName: 'Thư ký Hội đồng', // Will be updated with actual user name
          comment: 'Đánh giá hội đồng đã hoàn tất',
        },
      });

      return {
        evaluation: finalizedEvaluation,
        proposal: updatedProposal,
      };
    });

    this.logger.log(`Submitted evaluation for proposal ${proposalId} by ${evaluatorId}, transitioned to APPROVED`);

    return result;
  }

  /**
   * Get evaluation results for proposal owner (GIANG_VIEN Feature)
   * Allows proposal owners to view finalized evaluation results
   *
   * @param proposalId - Proposal ID
   * @param ownerId - Proposal owner ID (current user)
   * @returns Evaluation with evaluator details
   * @throws NotFoundException if proposal or evaluation not found
   * @throws ForbiddenException if user is not the proposal owner
   */
  async getEvaluationResultsForOwner(proposalId: string, ownerId: string) {
    // Verify proposal exists and user is the owner
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        ownerId: true,
        code: true,
        title: true,
        state: true,
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

    // Verify user is the proposal owner
    if (proposal.ownerId !== ownerId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_PROPOSAL_OWNER',
          message: 'Bạn không có quyền xem kết quả đánh giá của đề tài này',
        },
      });
    }

    // Get finalized evaluation for this proposal
    const evaluation = await this.prisma.evaluation.findFirst({
      where: {
        proposalId,
        state: EvaluationState.FINALIZED,
      },
      include: {
        evaluator: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!evaluation) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FOUND',
          message: 'Đề tài này chưa có kết quả đánh giá hoặc đánh giá chưa hoàn tất',
        },
      });
    }

    this.logger.log(`Evaluation results retrieved for proposal ${proposalId} by owner ${ownerId}`);

    return evaluation;
  }
}
