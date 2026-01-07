import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentTemplate, DocumentType, Proposal } from '@prisma/client';

/**
 * Evaluation form data structure
 * Defines the shape of evaluation form data stored in formData JSON
 */
interface EvaluationFormData {
  scientificContent?: { score?: number; comments?: string };
  researchMethod?: { score?: number; comments?: string };
  feasibility?: { score?: number; comments?: string };
  budget?: { score?: number; comments?: string };
  otherComments?: string;
  conclusion?: string;
}

/**
 * Proposal data for DOCX generation
 *
 * Contains all proposal-related fields that can be used in templates.
 */
export interface ProposalDataForDocx {
  // Project info
  code: string;
  title: string;
  ownerName: string;
  ownerEmail: string;
  facultyName: string;
  facultyCode: string;
  state: string;
  createdAt: string;
  actualStartDate?: string | null;
  completedDate?: string | null;

  // Council info
  councilName?: string;
  councilType?: string;
  councilSecretary?: string;
  councilChair?: string;
  councilMembers?: string;

  // Evaluation info
  evaluationScientificContentScore?: number;
  evaluationScientificContentComments?: string;
  evaluationResearchMethodScore?: number;
  evaluationResearchMethodComments?: string;
  evaluationFeasibilityScore?: number;
  evaluationFeasibilityComments?: string;
  evaluationBudgetScore?: number;
  evaluationBudgetComments?: string;
  evaluationOtherComments?: string;
  evaluationConclusion?: string;

  // Acceptance info
  acceptanceResults?: string;
  acceptanceProducts?: string;
  acceptanceDate?: string;

  // Handover info
  handoverDate?: string;
  handoverChecklist?: string;

  // Timeline
  startDate?: string;
  endDate?: string;
  duration?: string;

  // Budget
  budgetTotal?: string;
  budgetApproved?: string;
  budgetUsed?: string;
  budgetRemaining?: string;

  // Formatting helpers
  currentDate: string;
  currentYear: string;
  currentMonth: string;
  currentTime: string;
}

/**
 * DOCX Generation Service
 *
 * Generates DOCX documents from templates with placeholder replacement.
 * Uses docxtemplater for variable substitution.
 *
 * Epic 7 Story 7.3: DOCX Generation
 *
 * Features:
 * - Template loading from DocumentTemplate
 * - Placeholder replacement with proposal data
 * - Table row generation
 * - Conditional sections
 */
@Injectable()
export class DocxService {
  private readonly logger = new Logger(DocxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate DOCX from template
   *
   * @param template - Document template
   * @param proposalData - Proposal data for placeholder replacement
   * @returns Generated DOCX buffer
   */
  async generateFromTemplate(
    template: DocumentTemplate,
    proposalData: ProposalDataForDocx,
  ): Promise<Buffer> {
    try {
      // Read template file
      const content = await fs.readFile(template.filePath);

      // Unzip DOCX
      const zip = new PizZip(content);

      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Build data map for placeholders
      const dataMap = this.buildDataMap(proposalData);

      // Render template with data
      doc.render(dataMap);

      // Generate output
      return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (error) {
      this.logger.error('DOCX generation failed', error);
      throw new Error(`DOCX generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build data map for template rendering
   *
   * Converts proposal data into the format expected by templates.
   *
   * @param data - Proposal data
   * @returns Data map for docxtemplater
   */
  private buildDataMap(data: ProposalDataForDocx): Record<string, unknown> {
    return {
      proposal: {
        code: data.code,
        title: data.title,
        owner: data.ownerName,
        ownerEmail: data.ownerEmail,
        faculty: data.facultyName,
        facultyCode: data.facultyCode,
        state: data.state,
        createdAt: data.createdAt,
        actualStartDate: data.actualStartDate || '',
        completedDate: data.completedDate || '',
      },
      council: {
        name: data.councilName || '',
        type: data.councilType || '',
        secretary: data.councilSecretary || '',
        chair: data.councilChair || '',
        members: data.councilMembers || '',
      },
      evaluation: {
        council: data.councilName || '',
        secretary: data.councilSecretary || '',
        decision: data.evaluationConclusion || '',
        date: data.acceptanceDate || '',
        scientificContent: {
          score: data.evaluationScientificContentScore || 0,
          comments: data.evaluationScientificContentComments || '',
        },
        researchMethod: {
          score: data.evaluationResearchMethodScore || 0,
          comments: data.evaluationResearchMethodComments || '',
        },
        feasibility: {
          score: data.evaluationFeasibilityScore || 0,
          comments: data.evaluationFeasibilityComments || '',
        },
        budget: {
          score: data.evaluationBudgetScore || 0,
          comments: data.evaluationBudgetComments || '',
        },
        otherComments: data.evaluationOtherComments || '',
      },
      acceptance: {
        results: data.acceptanceResults || '',
        products: data.acceptanceProducts || '',
        date: data.acceptanceDate || '',
      },
      schoolAcceptance: {
        results: data.acceptanceResults || '',
        products: data.acceptanceProducts || '',
        date: data.acceptanceDate || '',
      },
      handover: {
        date: data.handoverDate || '',
        checklist: data.handoverChecklist || '',
      },
      timeline: {
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        duration: data.duration || '',
      },
      budget: {
        total: data.budgetTotal || '',
        approved: data.budgetApproved || '',
        used: data.budgetUsed || '',
        remaining: data.budgetRemaining || '',
      },
      currentDate: data.currentDate,
      currentYear: data.currentYear,
      currentMonth: data.currentMonth,
      currentTime: data.currentTime,
    };
  }

  /**
   * Fetch proposal data for DOCX generation
   *
   * @param proposalId - Proposal ID
   * @returns Proposal data formatted for DOCX
   */
  async fetchProposalData(proposalId: string): Promise<ProposalDataForDocx> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        owner: true,
        faculty: true,
        council: true,
        template: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Không tìm thấy đề tài');
    }

    // Get latest evaluation if exists
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { proposalId },
      include: { evaluator: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Type-safe evaluation form data access (Epic 6 pattern)
    const formData = (evaluation?.formData as EvaluationFormData) || {};

    // Extract acceptance/handover data from proposal formData
    const proposalFormData = (proposal.formData as Record<string, unknown>) || {};
    const acceptanceData = (proposalFormData.acceptance as Record<string, unknown>) || {};
    const handoverData = (proposalFormData.handover as Record<string, unknown>) || {};

    // Format date helpers
    const now = new Date();
    const currentDate = now.toLocaleDateString('vi-VN');
    const currentYear = now.getFullYear().toString();
    const currentMonth = (now.getMonth() + 1).toString();
    const currentTime = now.toLocaleTimeString('vi-VN');

    return {
      code: proposal.code,
      title: proposal.title,
      ownerName: proposal.owner.displayName || proposal.owner.email,
      ownerEmail: proposal.owner.email,
      facultyName: proposal.faculty.name,
      facultyCode: proposal.faculty.code,
      state: proposal.state,
      createdAt: new Date(proposal.createdAt).toLocaleDateString('vi-VN'),
      actualStartDate: proposal.actualStartDate
        ? new Date(proposal.actualStartDate).toLocaleDateString('vi-VN')
        : null,
      completedDate: proposal.completedDate
        ? new Date(proposal.completedDate).toLocaleDateString('vi-VN')
        : null,

      // Council info
      councilName: proposal.council?.name,
      councilType: proposal.council?.type,
      councilSecretary: evaluation?.evaluator?.displayName,
      councilChair: proposal.council?.name, // Simplified
      councilMembers: '',

      // Evaluation info - type-safe access (Epic 6 pattern)
      evaluationScientificContentScore: formData.scientificContent?.score,
      evaluationScientificContentComments: formData.scientificContent?.comments || '',
      evaluationResearchMethodScore: formData.researchMethod?.score,
      evaluationResearchMethodComments: formData.researchMethod?.comments || '',
      evaluationFeasibilityScore: formData.feasibility?.score,
      evaluationFeasibilityComments: formData.feasibility?.comments || '',
      evaluationBudgetScore: formData.budget?.score,
      evaluationBudgetComments: formData.budget?.comments || '',
      evaluationOtherComments: formData.otherComments || '',
      evaluationConclusion: formData.conclusion || '',

      // Acceptance info - extracted from proposal formData
      acceptanceResults: (acceptanceData.results as string) || '',
      acceptanceProducts: (acceptanceData.products as string) || '',
      acceptanceDate: proposal.actualStartDate
        ? new Date(proposal.actualStartDate).toLocaleDateString('vi-VN')
        : '',

      // Handover info - extracted from proposal formData
      handoverDate: proposal.completedDate
        ? new Date(proposal.completedDate).toLocaleDateString('vi-VN')
        : '',
      handoverChecklist: (handoverData.checklist as string) || '',

      // Timeline
      startDate: proposal.slaStartDate
        ? new Date(proposal.slaStartDate).toLocaleDateString('vi-VN')
        : undefined,
      endDate: proposal.slaDeadline
        ? new Date(proposal.slaDeadline).toLocaleDateString('vi-VN')
        : undefined,

      // Formatting helpers
      currentDate,
      currentYear,
      currentMonth,
      currentTime,
    };
  }

  /**
   * Get filename for generated document
   *
   * Uses timestamp + random component to prevent collisions (Epic 6 retro fix)
   *
   * @param proposalCode - Proposal code
   * @param documentType - Type of document
   * @returns Generated filename with collision prevention
   */
  getFilename(proposalCode: string, documentType: DocumentType): string {
    const typeLabels: Record<DocumentType, string> = {
      PROPOSAL_OUTLINE: 'De_cuong',
      EVALUATION_FORM: 'Phieu_danh_gia',
      FINAL_REPORT: 'Bao_cao_cuoi',
      FACULTY_ACCEPTANCE: 'Bien_ban_nghiem_thu_khoa',
      SCHOOL_ACCEPTANCE: 'Bien_ban_nghiem_thu_truong',
      HANDOVER_CHECKLIST: 'Bien_ban_ban_giao',
    };

    const typeLabel = typeLabels[documentType] || 'Document';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8); // Collision prevention

    return `${proposalCode}_${typeLabel}_${timestamp}_${random}.docx`;
  }

  /**
   * Map DocumentTemplateType to DocumentType
   *
   * @param templateType - Template type
   * @returns Document type
   */
  templateTypeToDocumentType(templateType: string): DocumentType {
    const mapping: Record<string, DocumentType> = {
      PROPOSAL_OUTLINE: DocumentType.PROPOSAL_OUTLINE,
      EVALUATION_FORM: DocumentType.EVALUATION_FORM,
      FINAL_REPORT: DocumentType.FINAL_REPORT,
      FACULTY_ACCEPTANCE: DocumentType.FACULTY_ACCEPTANCE,
      SCHOOL_ACCEPTANCE: DocumentType.SCHOOL_ACCEPTANCE,
      HANDOVER_CHECKLIST: DocumentType.HANDOVER_CHECKLIST,
    };

    return mapping[templateType] || DocumentType.PROPOSAL_OUTLINE;
  }
}
