import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { EvaluationState, EvaluationLevel, ProjectState, WorkflowAction, WorkflowAction as PrismaWorkflowAction, CouncilMemberRole, Prisma } from '@prisma/client';

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
        council_id: true,
        holder_user: true,
      },
    });

    if (!proposal || !proposal.council_id) {
      return null;
    }

    // Check if user is the secretary
    if (proposal.holder_user === userId) {
      return {
        isSecretary: true,
        councilId: proposal.council_id,
      };
    }

    // Check if user is a council member
    const member = await this.prisma.councilMember.findFirst({
      where: {
        council_id: proposal.council_id,
        user_id: userId,
      },
      include: {
        councils: {
          select: {
            secretary_id: true,
          },
        },
      },
    });

    if (member) {
      return {
        isSecretary: member.councils.secretary_id === userId,
        councilId: proposal.council_id,
        role: member.role,
      };
    }

    return null;
  }

  /**
   * Determine evaluation level based on proposal state
   */
  private getEvaluationLevelFromState(state: ProjectState): EvaluationLevel {
    switch (state) {
      case ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW:
      case ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW:
        return EvaluationLevel.FACULTY;
      case ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW:
      case ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW:
        return EvaluationLevel.SCHOOL;
      default:
        return EvaluationLevel.SCHOOL;
    }
  }

  /**
   * Get valid council review states for evaluation
   */
  private readonly VALID_EVALUATION_STATES: ProjectState[] = [
    ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
    ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW,
    ProjectState.FACULTY_COUNCIL_ACCEPTANCE_REVIEW,
    ProjectState.SCHOOL_COUNCIL_ACCEPTANCE_REVIEW,
  ];

  /**
   * Get or create draft evaluation for a proposal (Story 5.3, Multi-member)
   * Called by GET /evaluations/:proposalId endpoint
   * Now allows any council member to evaluate (not just secretary)
   * Supports both FACULTY and SCHOOL level evaluations
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
        holder_user: true,
        council_id: true,
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

    // Validate state must be a council review state (FACULTY or SCHOOL level)
    if (!this.VALID_EVALUATION_STATES.includes(proposal.state)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể đánh giá ở trạng thái xét duyệt hội đồng. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Determine evaluation level based on state
    const level = this.getEvaluationLevelFromState(proposal.state);

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

    // Try to get existing evaluation for this level
    let evaluation = await this.prisma.evaluation.findUnique({
      where: {
        proposal_id_evaluator_id_level: {
          proposal_id: proposalId,
          evaluator_id: evaluatorId,
          level,
        },
      },
    });

    // Create draft if doesn't exist
    if (!evaluation) {
      evaluation = await this.prisma.evaluation.create({
        data: {
          proposal_id: proposalId,
          evaluator_id: evaluatorId,
          level,
          state: EvaluationState.DRAFT,
          form_data: {
            scientificContent: { score: 3, comments: '' },
            researchMethod: { score: 3, comments: '' },
            feasibility: { score: 3, comments: '' },
            budget: { score: 3, comments: '' },
            conclusion: null,
            otherComments: '',
          },
        },
      });

      this.logger.log(`Created draft evaluation (level=${level}) for proposal ${proposalId} by ${evaluatorId}`);
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
   * @param level - Evaluation level (FACULTY or SCHOOL)
   * @returns Updated evaluation
   * @throws NotFoundException if evaluation not found
   * @throws BadRequestException if evaluation is not in DRAFT state
   */
  async updateEvaluation(
    proposalId: string,
    evaluatorId: string,
    formData: Record<string, unknown>,
    level?: EvaluationLevel,
  ) {
    // If level not provided, try to infer from proposal state
    let evalLevel = level;
    if (!evalLevel) {
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: proposalId },
        select: { state: true },
      });
      evalLevel = proposal ? this.getEvaluationLevelFromState(proposal.state) : EvaluationLevel.SCHOOL;
    }

    const evaluation = await this.prisma.evaluation.findUnique({
      where: {
        proposal_id_evaluator_id_level: {
          proposal_id: proposalId,
          evaluator_id: evaluatorId,
          level: evalLevel,
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
      ...(evaluation.form_data as Record<string, unknown>),
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
        proposal_id_evaluator_id_level: {
          proposal_id: proposalId,
          evaluator_id: evaluatorId,
          level: evalLevel,
        },
      },
      data: {
        form_data: mergedData as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Updated evaluation (level=${evalLevel}) for proposal ${proposalId} by ${evaluatorId}`);

    return updatedEvaluation;
  }

  /**
   * Get evaluation by proposal ID (for query purposes)
   *
   * @param proposalId - Proposal ID
   * @param level - Optional evaluation level filter
   * @returns Evaluation or null
   */
  async getEvaluationByProposalId(proposalId: string, level?: EvaluationLevel) {
    return this.prisma.evaluation.findFirst({
      where: {
        proposal_id: proposalId,
        ...(level && { level }),
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  /**
   * Get evaluation by proposal and evaluator
   *
   * @param proposalId - Proposal ID
   * @param evaluatorId - Evaluator user ID
   * @param level - Evaluation level
   * @returns Evaluation or null
   */
  async getEvaluation(proposalId: string, evaluatorId: string, level: EvaluationLevel = EvaluationLevel.SCHOOL) {
    return this.prisma.evaluation.findUnique({
      where: {
        proposal_id_evaluator_id_level: {
          proposal_id: proposalId,
          evaluator_id: evaluatorId,
          level,
        },
      },
    });
  }

  /**
   * Submit evaluation (Multi-member Evaluation)
   * Transitions individual evaluation from DRAFT to SUBMITTED (then secretary finalizes)
   * Does NOT transition proposal - that happens when secretary finalizes all evaluations
   * Supports both FACULTY and SCHOOL level evaluations
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

    // Get proposal to determine level
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        state: true,
        holder_user: true,
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

    // Validate proposal state must be a council review state
    if (!this.VALID_EVALUATION_STATES.includes(proposal.state)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể nộp đánh giá ở trạng thái xét duyệt hội đồng. Hiện tại: ${proposal.state}`,
        },
      });
    }

    const level = this.getEvaluationLevelFromState(proposal.state);

    // Get evaluation for this level
    const evaluation = await this.prisma.evaluation.findUnique({
      where: {
        proposal_id_evaluator_id_level: {
          proposal_id: proposalId,
          evaluator_id: evaluatorId,
          level,
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

    // Check if already submitted (idempotency path)
    if (evaluation.state === EvaluationState.SUBMITTED || evaluation.state === EvaluationState.FINALIZED) {
      // Return existing result for idempotency
      return {
        evaluation,
        proposal,
      };
    }

    // Validate form data is complete before submitting
    const formData = evaluation.form_data as Record<string, unknown>;
    if (!formData.conclusion) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INCOMPLETE_FORM',
          message: 'Vui lòng điền đầy đủ thông tin, đặc biệt là kết luận đánh giá',
        },
      });
    }

    // Submit evaluation (DRAFT → SUBMITTED)
    // Multi-member: Don't transition proposal yet - secretary will finalize
    const submittedEvaluation = await this.prisma.evaluation.update({
      where: {
        proposal_id_evaluator_id_level: {
          proposal_id: proposalId,
          evaluator_id: evaluatorId,
          level,
        },
      },
      data: {
        state: EvaluationState.SUBMITTED,
        submitted_at: new Date(),
      },
    });

    this.logger.log(`Submitted evaluation (level=${level}) for proposal ${proposalId} by ${evaluatorId}`);

    return {
      evaluation: submittedEvaluation,
      proposal,
    };
  }

  /**
   * Get all evaluations for a proposal (Multi-member Evaluation)
   * Only the secretary can view all evaluations
   * Supports both FACULTY and SCHOOL level evaluations
   *
   * @param proposalId - Proposal ID
   * @param secretaryId - Current user ID (must be secretary)
   * @param level - Optional evaluation level filter
   * @returns All evaluations with proposal and council info
   */
  async getAllEvaluationsForProposal(proposalId: string, secretaryId: string, level?: EvaluationLevel): Promise<AllEvaluationsResponse> {
    // Get proposal with council info
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        title: true,
        state: true,
        council_id: true,
        holder_user: true,
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

    if (!proposal.council_id) {
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
        council_id_user_id: {
          council_id: proposal.council_id,
          user_id: secretaryId,
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
      where: { id: proposal.council_id },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
          },
        },
        council_members: {
          include: {
            users: {
              select: {
                id: true,
                display_name: true,
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

    // Determine level from proposal state if not provided
    const evalLevel = level || this.getEvaluationLevelFromState(proposal.state);

    // Get all evaluations for this proposal at this level
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        proposal_id: proposalId,
        level: evalLevel,
      },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            role: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    // Map to response format
    const evaluationResponses: CouncilMemberEvaluation[] = evaluations.map((item) => {
      const member = council.council_members.find((m) => m.user_id === item.evaluator_id);
      const isSecretary = council.users?.id === item.evaluator_id;

      return {
        id: item.id,
        proposalId: item.proposal_id,
        evaluatorId: item.evaluator_id,
        evaluatorName: item.users.display_name,
        evaluatorRole: item.users.role,
        state: item.state,
        formData: item.form_data as Record<string, unknown>,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        councilRole: member?.role,
        isSecretary,
      };
    });

    // Count submitted evaluations
    const submittedCount = evaluations.filter((e) => e.state === EvaluationState.SUBMITTED || e.state === EvaluationState.FINALIZED).length;
    const totalMembers = council.council_members.length;

    return {
      proposalId: proposal.id,
      proposalCode: proposal.code,
      proposalTitle: proposal.title,
      councilId: council.id,
      councilName: council.name,
      secretaryId: council.users?.id || '',
      secretaryName: council.users?.display_name || '',
      evaluations: evaluationResponses,
      totalMembers,
      submittedCount,
      allSubmitted: submittedCount >= totalMembers,
    };
  }

  /**
   * Finalize council evaluation and transition proposal (Multi-member Evaluation)
   * Only the secretary can finalize after all members have submitted
   * Supports both FACULTY and SCHOOL level evaluations
   *
   * For FACULTY level: transitions to SCHOOL_COUNCIL_OUTLINE_REVIEW (if approved) or CHANGES_REQUESTED (if rejected)
   * For SCHOOL level: transitions to APPROVED (if approved) or CHANGES_REQUESTED (if rejected)
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
        holder_user: true,
        owner_id: true,
        faculty_id: true,
        council_id: true,
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

    // Verify state is a council review state
    if (!this.VALID_EVALUATION_STATES.includes(proposal.state)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể finalize ở trạng thái xét duyệt hội đồng. Hiện tại: ${proposal.state}`,
        },
      });
    }

    const level = this.getEvaluationLevelFromState(proposal.state);

    // Verify user is the secretary
    if (proposal.holder_user !== secretaryId) {
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
      where: { id: proposal.council_id! },
      include: {
        users: true,
        council_members: true,
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

    // Get all evaluations for this level
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        proposal_id: proposalId,
        level,
      },
    });

    const totalMembers = council.council_members.length;
    const submittedCount = evaluations.filter((e) => e.state === EvaluationState.SUBMITTED || e.state === EvaluationState.FINALIZED).length;

    // Require minimum submissions before finalizing (at least secretary)
    if (submittedCount === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_SUBMISSIONS',
          message: 'Phải có ít nhất một đánh giá được nộp trước khi finalize',
        },
      });
    }

    // Execute transaction: finalize evaluations and transition proposal
    const result = await this.prisma.$transaction(async (tx) => {
      // Finalize all submitted evaluations
      await tx.evaluations.updateMany({
        where: {
          proposal_id: proposalId,
          level,
          state: EvaluationState.SUBMITTED,
        },
        data: {
          state: EvaluationState.FINALIZED,
        },
      });

      // Determine target state based on level and conclusion
      let targetState: ProjectState;
      if (level === EvaluationLevel.FACULTY) {
        // Faculty level: if approved, move to school level; if rejected, return for changes
        targetState = finalConclusion === 'DAT'
          ? ProjectState.SCHOOL_COUNCIL_OUTLINE_REVIEW
          : ProjectState.CHANGES_REQUESTED;
      } else {
        // School level: if approved, mark as approved; if rejected, return for changes
        targetState = finalConclusion === 'DAT'
          ? ProjectState.APPROVED
          : ProjectState.CHANGES_REQUESTED;
      }

      // Transition proposal
      const updatedProposal = await tx.proposals.update({
        where: { id: proposalId },
        data: {
          state: targetState,
          holder_unit: proposal.faculty_id, // Return to owner's faculty
          holder_user: proposal.owner_id, // Return to PI
        },
      });

      // Log workflow entry
      await tx.workflow_logs.create({
        data: {
          proposal_id: proposalId,
          action: PrismaWorkflowAction.EVALUATION_SUBMITTED,
          from_state: proposal.state,
          to_state: targetState,
          actor_id: secretaryId,
          actor_name: level === EvaluationLevel.FACULTY ? 'Thư ký Hội đồng Khoa' : 'Thư ký Hội đồng Trường',
          comment: `Hội đồng đã hoàn tất đánh giá. Kết luận: ${finalConclusion === 'DAT' ? 'Đạt' : 'Không đạt'}. ${finalComments || ''}`,
        },
      });

      return {
        proposal: updatedProposal,
        targetState,
        level,
      };
    });

    this.logger.log(`Finalized ${level} council evaluation for proposal ${proposalId}, transitioned to ${result.targetState}`);

    return result;
  }

  /**
   * Get evaluation results for proposal owner (GIANG_VIEN Feature)
   * Allows proposal owners to view finalized evaluation results
   * Returns all finalized evaluations for all levels
   *
   * @param proposalId - Proposal ID
   * @param ownerId - Proposal owner ID (current user)
   * @param level - Optional level filter
   * @returns Evaluations with evaluator details
   * @throws NotFoundException if proposal or evaluation not found
   * @throws ForbiddenException if user is not the proposal owner
   */
  async getEvaluationResultsForOwner(proposalId: string, ownerId: string, level?: EvaluationLevel) {
    // Verify proposal exists and user is the owner
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        owner_id: true,
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
    if (proposal.owner_id !== ownerId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'NOT_PROPOSAL_OWNER',
          message: 'Bạn không có quyền xem kết quả đánh giá của đề tài này',
        },
      });
    }

    // Get finalized evaluations for this proposal
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        proposal_id: proposalId,
        state: EvaluationState.FINALIZED,
        ...(level && { level }),
      },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    if (evaluations.length === 0) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FOUND',
          message: 'Đề tài này chưa có kết quả đánh giá hoặc đánh giá chưa hoàn tất',
        },
      });
    }

    this.logger.log(`Evaluation results retrieved for proposal ${proposalId} by owner ${ownerId}`);

    return evaluations;
  }

  /**
   * Get Council Evaluation Summary for BGH or Faculty Manager approval
   * BAN_GIAM_HOC Feature: View aggregated council evaluation results before final approval
   * Also supports QUAN_LY_KHOA for faculty-level evaluations
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (for role validation)
   * @param userRole - Current user role
   * @param level - Optional level filter
   * @returns Council evaluation summary with aggregated scores and individual evaluations
   * @throws NotFoundException if proposal or council not found
   * @throws ForbiddenException if user lacks required role
   */
  async getCouncilEvaluationSummaryForBGH(
    proposalId: string,
    userId: string,
    userRole: string,
    level?: EvaluationLevel,
  ) {
    // Verify user has required role (BAN_GIAM_HOC, BGH, QUAN_LY_KHOA, or PHONG_KHCN)
    const allowedRoles = ['BAN_GIAM_HOC', 'BGH', 'QUAN_LY_KHOA', 'PHONG_KHCN', 'ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền xem tổng kết đánh giá',
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
        council_id: true,
        holder_unit: true,
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

    if (!proposal.council_id && !proposal.holder_unit) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_COUNCIL_ASSIGNED',
          message: 'Đề tài chưa được gán hội đồng',
        },
      });
    }

    const councilId = proposal.council_id || proposal.holder_unit;

    // Get council info with members
    const council = await this.prisma.council.findUnique({
      where: { id: councilId },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
          },
        },
        council_members: {
          include: {
            users: {
              select: {
                id: true,
                display_name: true,
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

    // Determine level from proposal state if not provided
    const evalLevel = level || this.getEvaluationLevelFromState(proposal.state);

    // Get all evaluations for this proposal and level
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        proposal_id: proposalId,
        level: evalLevel,
      },
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            role: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    // Count total members
    const totalMembers = council.council_members.length;
    const submittedCount = evaluations.filter((e) => e.state === EvaluationState.SUBMITTED || e.state === EvaluationState.FINALIZED).length;

    // Calculate aggregate scores from finalized evaluations
    const finalizedEvaluations = evaluations.filter((e) => e.state === EvaluationState.FINALIZED);

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
    const secretaryEvaluation = evaluations.find((e) => e.evaluator_id === council.users?.id);
    const formData = secretaryEvaluation?.form_data as Record<string, unknown> | undefined;
    const finalConclusion = formData?.conclusion as 'DAT' | 'KHONG_DAT' | undefined;
    const finalComments = formData?.otherComments as string | undefined;

    // Build evaluation summaries
    const evaluationSummaries = finalizedEvaluations.map((item) => {
      const evalFormData = item.form_data as Record<string, unknown>;
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
        evaluatorId: item.evaluator_id,
        evaluatorName: item.users.display_name,
        evaluatorRole: item.users.role,
        councilRole: undefined,
        isSecretary: council.users?.id === item.evaluator_id,
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

    this.logger.log(`Council evaluation summary (level=${evalLevel}) retrieved for proposal ${proposalId} by ${userId}`);

    return {
      proposalId: proposal.id,
      proposalCode: proposal.code,
      proposalTitle: proposal.title,
      councilName: council.name,
      secretaryName: council.users?.display_name || '',
      level: evalLevel,
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
        const formData = (e as { form_data: Record<string, unknown> }).form_data;
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
