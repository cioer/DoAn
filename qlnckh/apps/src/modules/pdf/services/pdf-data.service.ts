import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { EvaluationState } from '@prisma/client';

/**
 * PDF Data Service
 *
 * Handles data fetching for PDF generation.
 * Extracted from pdf.service.ts for separation of concerns.
 *
 * Phase 3 Refactor: Extract data fetching logic
 */
@Injectable()
export class PdfDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get proposal with all relations needed for PDF generation
   *
   * @param proposalId - Proposal UUID
   * @returns Proposal with owner and template
   * @throws NotFoundException if proposal not found
   */
  async getProposalForPdf(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        template: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    return proposal;
  }

  /**
   * Get evaluation with relations for PDF generation
   *
   * @param proposalId - Proposal UUID
   * @returns Evaluation with proposal and evaluator
   * @throws NotFoundException if evaluation not found or not finalized
   */
  async getEvaluationForPdf(proposalId: string) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { proposalId },
      include: {
        proposal: {
          select: {
            id: true,
            code: true,
            title: true,
            ownerId: true,
            councilId: true,
          },
        },
        evaluator: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(`Không tìm thấy phiếu đánh giá cho đề tài ${proposalId}`);
    }

    if (evaluation.state !== EvaluationState.FINALIZED) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FINALIZED',
          message: 'Chỉ có thể xuất PDF cho phiếu đánh giá đã hoàn tất',
        },
      });
    }

    return evaluation;
  }

  /**
   * Get latest RETURN workflow log for revision PDF
   *
   * @param proposalId - Proposal UUID
   * @returns Latest RETURN workflow log
   * @throws NotFoundException if no RETURN log found
   */
  async getRevisionLog(proposalId: string) {
    const returnLog = await this.prisma.workflowLog.findFirst({
      where: {
        proposalId,
        action: 'RETURN',
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!returnLog) {
      throw new NotFoundException(`Không tìm thấy thông tin yêu cầu sửa cho đề tài ${proposalId}`);
    }

    return returnLog;
  }

  /**
   * Get council name by ID
   *
   * @param councilId - Council UUID
   * @returns Council name or 'N/A'
   */
  async getCouncilName(councilId: string | null): Promise<string> {
    if (!councilId) {
      return 'N/A';
    }

    const council = await this.prisma.council.findUnique({
      where: { id: councilId },
      select: { name: true },
    });

    return council?.name || 'N/A';
  }

  /**
   * Get proposal minimal info for export authorization
   *
   * @param proposalId - Proposal UUID
   * @returns Proposal with code and ownerId
   * @throws NotFoundException if proposal not found
   */
  async getProposalForExport(proposalId: string): Promise<{
    id: string;
    code: string;
    ownerId: string;
  }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        ownerId: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Không tìm thấy đề tài ${proposalId}`);
    }

    return proposal;
  }

  /**
   * Get proposal code for filename
   *
   * @param proposalId - Proposal UUID
   * @returns Proposal code or default string
   */
  async getProposalCode(proposalId: string): Promise<string> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { code: true },
    });
    return proposal?.code || 'proposal';
  }
}
