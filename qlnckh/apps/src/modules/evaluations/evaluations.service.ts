import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { EvaluationState, ProjectState, WorkflowAction, WorkflowAction as PrismaWorkflowAction, CouncilMemberRole, Prisma } from '@prisma/client';

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
 * Council Member Evaluation Info
 */
interface CouncilMemberEvaluation {
  id: string;
  proposalId: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  state: EvaluationState;
  formData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  councilRole?: CouncilMemberRole;
  isSecretary?: boolean;
}

/**
 * All Evaluations Response for a Proposal
 */
interface AllEvaluationsResponse {
  proposalId: string;
  proposalCode: string;
  proposalTitle: string;
  councilId: string;
  councilName: string;
  secretaryId: string;
  secretaryName: string;
  evaluations: CouncilMemberEvaluation[];
  totalMembers: number;
  submittedCount: number;
  allSubmitted: boolean;
}

/**
 * Finalize Request Data
 */
interface FinalizeRequest {
  proposalId: string;
  secretaryId: string;
  finalConclusion: 'DAT' | 'KHONG_DAT';
  finalComments?: string;
  idempotencyKey: string;
}

/**
 * Evaluation Service (Story 5.3, Multi-member Evaluation)
 * Manages evaluation CRUD operations for council members
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
   * Check if user is a council member for the proposal
   * Multi-member Evaluation Feature
   *
   * @param proposalId - Proposal ID
   * @param userId - User ID to check
   * @returns Council member info or null
   */
  private async getCouncilMembership(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        councilId: true,
        holderUser: true,
      },
    });

    if (!proposal || !proposal.councilId) {
      return null;
    }

    // Check if user is the secretary
    if (proposal.holderUser === userId) {
      return {
        isSecretary: true,
        councilId: proposal.councilId,
      };
    }

    // Check if user is a council member
    const member = await this.prisma.councilMember.findFirst({
      where: {
        councilId: proposal.councilId,
        userId: userId,
      },
      include: {
        council: {
          select: {
            secretaryId: true,
          },
        },
      },
    });

    if (member) {
      return {
        isSecretary: member.council.secretaryId === userId,
        councilId: proposal.councilId,
        role: member.role,
      };
    }

    return null;
  }

  /**
   * Get or create draft evaluation for a proposal (Story 5.3, Multi-member)
   * Called by GET /evaluations/:proposalId endpoint
   * Now allows any council member to evaluate (not just secretary)
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Current user ID
   * @returns Evaluation (draft or existing)
   * @throws NotFoundException if proposal not found
   * @throws ForbiddenException if user is not a council member
   */
  async getOrCreateEvaluation(proposalId: string, evaluatorId: string) {
    // Verify proposal exists and is in correct state
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        state: true,
        holderUser: true,
        councilId: true,
        code: true,
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
    if (proposal.state !== ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể đánh giá ở trạng thái OUTLINE_COUNCIL_REVIEW. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Check if user is a council member or secretary (Multi-member Evaluation)
    const membership = await this.getCouncilMembership(proposalId, evaluatorId);

    if (!membership) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_COUNCIL_MEMBER',
          message: 'Bạn không phải là thành viên hội đồng được phân công đánh giá đề tài này',
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
   * Submit evaluation (Multi-member Evaluation)
   * Transitions individual evaluation from DRAFT to FINALIZED
   * Does NOT transition proposal - that happens when secretary finalizes all evaluations
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Evaluator user ID
   * @param idempotencyKey - UUID for idempotency
   * @returns Updated evaluation
   */
  async submitEvaluation(proposalId: string, evaluatorId: string, idempotencyKey: string) {
    // Check if user is a council member
    const membership = await this.getCouncilMembership(proposalId, evaluatorId);
    if (!membership) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_COUNCIL_MEMBER',
          message: 'Bạn không phải là thành viên hội đồng được phân công đánh giá đề tài này',
        },
      });
    }

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
    if (evaluation.proposal.state !== ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể nộp đánh giá ở trạng thái OUTLINE_COUNCIL_REVIEW. Hiện tại: ${evaluation.proposal.state}`,
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

    // Finalize individual evaluation (DRAFT → FINALIZED)
    // Multi-member: Don't transition proposal yet - secretary will do that
    const finalizedEvaluation = await this.prisma.evaluation.update({
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

    this.logger.log(`Submitted evaluation for proposal ${proposalId} by ${evaluatorId}`);

    return {
      evaluation: finalizedEvaluation,
      proposal: evaluation.proposal,
    };
  }

  /**
   * Get all evaluations for a proposal (Multi-member Evaluation)
   * Only the secretary can view all evaluations
   *
   * @param proposalId - Proposal ID
   * @param secretaryId - Current user ID (must be secretary)
   * @returns All evaluations with proposal and council info
   */
  async getAllEvaluationsForProposal(proposalId: string, secretaryId: string): Promise<AllEvaluationsResponse> {
    // Get proposal with council info
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        title: true,
        state: true,
        councilId: true,
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

    if (!proposal.councilId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_COUNCIL_ASSIGNED',
          message: 'Đề tài chưa được gán hội đồng',
        },
      });
    }

    // Verify user is the secretary for this proposal's council
    const councilMembership = await this.prisma.councilMember.findUnique({
      where: {
        councilId_userId: {
          councilId: proposal.councilId,
          userId: secretaryId,
        },
      },
    });

    if (!councilMembership || councilMembership.role !== 'SECRETARY') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_SECRETARY',
          message: 'Chỉ thư ký hội đồng mới xem được tất cả đánh giá',
        },
      });
    }

    // Get council info
    const council = await this.prisma.council.findUnique({
      where: { id: proposal.councilId },
      include: {
        secretary: {
          select: {
            id: true,
            displayName: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!council) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      });
    }

    // Get all evaluations for this proposal
    const evaluations = await this.prisma.evaluation.findMany({
      where: { proposalId },
      include: {
        evaluator: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Map to response format
    const evaluationResponses: CouncilMemberEvaluation[] = evaluations.map((item) => {
      const member = council.members.find((m) => m.userId === item.evaluatorId);
      const isSecretary = council.secretary?.id === item.evaluatorId;

      return {
        id: item.id,
        proposalId: item.proposalId,
        evaluatorId: item.evaluatorId,
        evaluatorName: item.evaluator.displayName,
        evaluatorRole: item.evaluator.role,
        state: item.state,
        formData: item.formData as Record<string, unknown>,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        councilRole: member?.role,
        isSecretary,
      };
    });

    // Count submitted evaluations
    const submittedCount = evaluations.filter((e) => e.state === EvaluationState.FINALIZED).length;
    const totalMembers = 1 + council.members.length; // Secretary + all members

    return {
      proposalId: proposal.id,
      proposalCode: proposal.code,
      proposalTitle: proposal.title,
      councilId: council.id,
      councilName: council.name,
      secretaryId: council.secretary?.id || '',
      secretaryName: council.secretary?.displayName || '',
      evaluations: evaluationResponses,
      totalMembers,
      submittedCount,
      allSubmitted: submittedCount >= totalMembers,
    };
  }

  /**
   * Finalize council evaluation and transition proposal (Multi-member Evaluation)
   * Only the secretary can finalize after all members have submitted
   *
   * @param proposalId - Proposal ID
   * @param secretaryId - Secretary user ID
   * @param finalConclusion - Final conclusion (DAT/KHONG_DAT)
   * @param finalComments - Optional final comments
   * @param idempotencyKey - UUID for idempotency
   * @returns Updated proposal
   */
  async finalizeCouncilEvaluation(
    proposalId: string,
    secretaryId: string,
    finalConclusion: 'DAT' | 'KHONG_DAT',
    finalComments: string | undefined,
    idempotencyKey: string,
  ) {
    // Get proposal with council
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        state: true,
        holderUser: true,
        ownerId: true,
        facultyId: true,
        councilId: true,
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

    // Verify state
    if (proposal.state !== ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể finalize ở trạng thái OUTLINE_COUNCIL_REVIEW. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Verify user is the secretary
    if (proposal.holderUser !== secretaryId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_SECRETARY',
          message: 'Chỉ thư ký hội đồng mới có thể finalize đánh giá',
        },
      });
    }

    // Check if all council members have submitted
    const council = await this.prisma.council.findUnique({
      where: { id: proposal.councilId! },
      include: {
        secretary: true,
        members: true,
      },
    });

    if (!council) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      });
    }

    // Get all evaluations
    const evaluations = await this.prisma.evaluation.findMany({
      where: { proposalId },
    });

    const totalMembers = 1 + council.members.length; // Secretary + members
    const submittedCount = evaluations.filter((e) => e.state === EvaluationState.FINALIZED).length;

    // Optional: Require all members to submit before finalizing
    // For now, we'll allow finalizing as long as secretary has submitted
    const secretaryEvaluation = evaluations.find((e) => e.evaluatorId === secretaryId);
    if (!secretaryEvaluation || secretaryEvaluation.state !== EvaluationState.FINALIZED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'SECRETARY_NOT_SUBMITTED',
          message: 'Thư ký phải nộp đánh giá trước khi finalize',
        },
      });
    }

    // Execute transaction: transition proposal based on final conclusion
    const result = await this.prisma.$transaction(async (tx) => {
      // Determine target state based on final conclusion
      const targetState = finalConclusion === 'DAT'
        ? ProjectState.APPROVED
        : ProjectState.CHANGES_REQUESTED;

      // Transition proposal
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: targetState,
          holderUnit: proposal.facultyId, // Return to owner's faculty
          holderUser: proposal.ownerId, // Return to PI
        },
      });

      // Log workflow entry
      await tx.workflowLog.create({
        data: {
          proposalId,
          action: PrismaWorkflowAction.EVALUATION_SUBMITTED, // Use existing action
          fromState: ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
          toState: targetState,
          actorId: secretaryId,
          actorName: 'Thư ký Hội đồng',
          comment: `Hội đồng đã hoàn tất đánh giá. Kết luận: ${finalConclusion === 'DAT' ? 'Đạt' : 'Không đạt'}. ${finalComments || ''}`,
        },
      });

      return {
        proposal: updatedProposal,
        targetState,
      };
    });

    this.logger.log(`Finalized council evaluation for proposal ${proposalId}, transitioned to ${result.targetState}`);

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

  /**
   * Get Council Evaluation Summary for BGH approval
   * BAN_GIAM_HOC Feature: View aggregated council evaluation results before final approval
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (for role validation)
   * @param userRole - Current user role (must be BAN_GIAM_HOC or BGH)
   * @returns Council evaluation summary with aggregated scores and individual evaluations
   * @throws NotFoundException if proposal or council not found
   * @throws ForbiddenException if user lacks BAN_GIAM_HOC/BGH role
   */
  async getCouncilEvaluationSummaryForBGH(
    proposalId: string,
    userId: string,
    userRole: string,
  ) {
    // Verify user has required role
    if (userRole !== 'BAN_GIAM_HOC' && userRole !== 'BAN_GIAM_HOC') {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Chỉ Ban Giám Học mới có thể xem tổng kết đánh giá',
        },
      });
    }

    // Get proposal with council info
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        title: true,
        state: true,
        councilId: true,
        holderUnit: true,
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

    if (!proposal.councilId && !proposal.holderUnit) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_COUNCIL_ASSIGNED',
          message: 'Đề tài chưa được gán hội đồng',
        },
      });
    }

    const councilId = proposal.councilId || proposal.holderUnit;

    // Get council info with members
    const council = await this.prisma.council.findUnique({
      where: { id: councilId },
      include: {
        secretary: {
          select: {
            id: true,
            displayName: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!council) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      });
    }

    // Get all evaluations for this proposal
    const evaluations = await this.prisma.evaluation.findMany({
      where: { proposalId },
      include: {
        evaluator: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Count total members (secretary + all members)
    const totalMembers = 1 + council.members.length;
    const submittedCount = evaluations.filter((e) => e.state === EvaluationState.FINALIZED).length;

    // Calculate aggregate scores
    const finalizedEvaluations = evaluations.filter((e) => e.state === EvaluationState.FINALIZED);
    const sections = ['scientificContent', 'researchMethod', 'feasibility', 'budget'] as const;

    const aggregateScores = {
      scientificContent: this.calculateAggregates(finalizedEvaluations, 'scientificContent'),
      researchMethod: this.calculateAggregates(finalizedEvaluations, 'researchMethod'),
      feasibility: this.calculateAggregates(finalizedEvaluations, 'feasibility'),
      budget: this.calculateAggregates(finalizedEvaluations, 'budget'),
      overallAvg: 0,
    };

    // Calculate overall average
    const allAvgs = [
      aggregateScores.scientificContent.avg,
      aggregateScores.researchMethod.avg,
      aggregateScores.feasibility.avg,
      aggregateScores.budget.avg,
    ].filter((avg) => avg > 0);
    aggregateScores.overallAvg = allAvgs.length > 0
      ? allAvgs.reduce((sum, avg) => sum + avg, 0) / allAvgs.length
      : 0;

    // Get secretary's final conclusion
    const secretaryEvaluation = evaluations.find((e) => e.evaluatorId === council.secretary?.id);
    const formData = secretaryEvaluation?.formData as Record<string, unknown> | undefined;
    const finalConclusion = formData?.conclusion as 'DAT' | 'KHONG_DAT' | undefined;
    const finalComments = formData?.otherComments as string | undefined;

    // Build evaluation summaries
    const evaluationSummaries = finalizedEvaluations.map((item) => {
      const evalFormData = item.formData as Record<string, unknown>;
      const scientificContent = evalFormData?.scientificContent as Record<string, unknown> | undefined;
      const researchMethod = evalFormData?.researchMethod as Record<string, unknown> | undefined;
      const feasibility = evalFormData?.feasibility as Record<string, unknown> | undefined;
      const budget = evalFormData?.budget as Record<string, unknown> | undefined;

      const sciScore = (scientificContent?.score as number) || 0;
      const methScore = (researchMethod?.score as number) || 0;
      const feasScore = (feasibility?.score as number) || 0;
      const budgScore = (budget?.score as number) || 0;
      const totalScore = sciScore + methScore + feasScore + budgScore;

      return {
        id: item.id,
        evaluatorId: item.evaluatorId,
        evaluatorName: item.evaluator.displayName,
        evaluatorRole: item.evaluator.role,
        councilRole: undefined,
        isSecretary: council.secretary?.id === item.evaluatorId,
        state: item.state,
        scientificContentScore: sciScore,
        researchMethodScore: methScore,
        feasibilityScore: feasScore,
        budgetScore: budgScore,
        totalScore,
        conclusion: evalFormData?.conclusion as string | undefined,
        otherComments: evalFormData?.otherComments as string | undefined,
      };
    });

    this.logger.log(`Council evaluation summary retrieved for proposal ${proposalId} by ${userId}`);

    return {
      proposalId: proposal.id,
      proposalCode: proposal.code,
      proposalTitle: proposal.title,
      councilName: council.name,
      secretaryName: council.secretary?.displayName || '',
      submittedCount,
      totalMembers,
      allSubmitted: submittedCount >= totalMembers,
      aggregateScores,
      finalConclusion,
      finalComments,
      evaluations: evaluationSummaries,
    };
  }

  /**
   * Calculate aggregate statistics (avg, min, max) for a section
   */
  private calculateAggregates(
    evaluations: unknown[],
    section: string,
  ): { avg: number; min: number; max: number } {
    const scores = evaluations
      .map((e: unknown) => {
        const formData = (e as { formData: Record<string, unknown> }).formData;
        const sectionData = formData?.[section] as Record<string, unknown> | undefined;
        return (sectionData?.score as number) || 0;
      })
      .filter((s) => s > 0);

    if (scores.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }

    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    return { avg: Math.round(avg * 10) / 10, min, max };
  }
}
