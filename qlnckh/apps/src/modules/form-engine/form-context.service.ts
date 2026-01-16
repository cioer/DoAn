import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';

import {
  ProposalContextInput,
  getBaseContext,
} from './context-builders/base.builder';
import { buildForm1bContext } from './context-builders/form-1b.builder';
import { buildForm2bContext } from './context-builders/form-2b.builder';
import { buildForm3bContext } from './context-builders/form-3b.builder';
import { buildForm6bContext } from './context-builders/form-6b.builder';
import {
  buildForm7bContext,
  buildForm8bContext,
  buildForm9bContext,
  buildForm10bContext,
  buildForm11bContext,
  buildForm12bContext,
  buildForm13bContext,
  buildForm14bContext,
  buildForm17bContext,
  buildForm18bContext,
} from './context-builders/form-generic.builder';

/**
 * Template name mapping
 */
export const TEMPLATE_MAP: Record<string, string> = {
  // Phase A: Proposal & Selection
  PROPOSAL_OUTLINE: '1b.docx',
  EVALUATION_FORM: '2b.docx',
  FACULTY_MEETING_MINUTES: '3b.docx',
  SUMMARY_CATALOG: '4b.docx',
  SCHOOL_EVALUATION: '5b.docx',
  COUNCIL_MEETING_MINUTES: '6b.docx',
  REVISION_REQUEST: '7b.docx',

  // Phase C: Faculty Acceptance
  FACULTY_ACCEPTANCE_EVAL: '8b.docx',
  FACULTY_ACCEPTANCE_MINUTES: '9b.docx',
  FINAL_REPORT: '10b.docx',
  FACULTY_ACCEPTANCE_DECISION: '11b.docx',

  // Phase D: School Acceptance
  SCHOOL_ACCEPTANCE_EVAL: '12b.docx',
  SCHOOL_ACCEPTANCE_MINUTES: '13b.docx',
  SCHOOL_ACCEPTANCE_DECISION: '14b.docx',
  PRODUCT_LIST: '15b.docx',
  PRODUCT_APPENDIX: '16b.docx',

  // Phase E: Handover
  HANDOVER_CHECKLIST: '17b.docx',

  // Special
  EXTENSION_REQUEST: '18b.docx',

  // Legacy mapping for DocumentType enum
  FACULTY_ACCEPTANCE: '11b.docx',
  SCHOOL_ACCEPTANCE: '14b.docx',
};

/**
 * Extended template type including all 18 forms
 */
export type ExtendedTemplateType =
  | 'PROPOSAL_OUTLINE'
  | 'EVALUATION_FORM'
  | 'FACULTY_MEETING_MINUTES'
  | 'SUMMARY_CATALOG'
  | 'SCHOOL_EVALUATION'
  | 'COUNCIL_MEETING_MINUTES'
  | 'REVISION_REQUEST'
  | 'FACULTY_ACCEPTANCE_EVAL'
  | 'FACULTY_ACCEPTANCE_MINUTES'
  | 'FINAL_REPORT'
  | 'FACULTY_ACCEPTANCE_DECISION'
  | 'SCHOOL_ACCEPTANCE_EVAL'
  | 'SCHOOL_ACCEPTANCE_MINUTES'
  | 'SCHOOL_ACCEPTANCE_DECISION'
  | 'PRODUCT_LIST'
  | 'PRODUCT_APPENDIX'
  | 'HANDOVER_CHECKLIST'
  | 'EXTENSION_REQUEST'
  | 'FACULTY_ACCEPTANCE'
  | 'SCHOOL_ACCEPTANCE';

/**
 * Options for context building
 */
export interface ContextBuildOptions {
  evaluatorName?: string;
  isPass?: boolean;
  isApproved?: boolean;
  soPhieuDongY?: number;
  soPhieuPhanDoi?: number;
  noiDungChinhSua?: string;
  noiDungBoSung?: string;
  noiDungKhongPhuHop?: string;
  revisionContent?: string;
  chuNhiem?: { ten: string; don_vi: string };
  hoiDong?: Array<{ ten: string; don_vi: string }>;
}

/**
 * Form Context Service
 *
 * Builds template-specific context from proposal data.
 * Maps ProposalDataForDocx to the format expected by each template.
 *
 * Usage:
 * ```typescript
 * const context = formContextService.buildContext(
 *   'PROPOSAL_OUTLINE',
 *   proposalData,
 *   { isPass: true }
 * );
 * ```
 */
@Injectable()
export class FormContextService {
  private readonly logger = new Logger(FormContextService.name);

  /**
   * Build context for a specific template type
   *
   * @param templateType - Type of template (e.g., 'PROPOSAL_OUTLINE', 'EVALUATION_FORM')
   * @param input - Proposal data for context building
   * @param options - Additional options for context building
   * @returns Context object ready for template rendering
   */
  buildContext(
    templateType: ExtendedTemplateType | string,
    input: ProposalContextInput,
    options: ContextBuildOptions = {},
  ): Record<string, unknown> {
    this.logger.debug(`Building context for template: ${templateType}`);

    switch (templateType) {
      // Phase A forms
      case 'PROPOSAL_OUTLINE':
        return buildForm1bContext(input);

      case 'EVALUATION_FORM':
        return buildForm2bContext(input, options.evaluatorName, options.isPass);

      case 'FACULTY_MEETING_MINUTES':
        return buildForm3bContext(input, {
          chuNhiem: options.chuNhiem,
          hoiDong: options.hoiDong,
          isApproved: options.isApproved,
          soPhieuDongY: options.soPhieuDongY,
          soPhieuPhanDoi: options.soPhieuPhanDoi,
          noiDungChinhSua: options.noiDungChinhSua,
          noiDungBoSung: options.noiDungBoSung,
          noiDungKhongPhuHop: options.noiDungKhongPhuHop,
        });

      case 'COUNCIL_MEETING_MINUTES':
        return buildForm6bContext(input, {
          isApproved: options.isApproved,
          noiDungDaChinhSua: options.noiDungChinhSua,
          noiDungBoSung: options.noiDungBoSung,
          noiDungKhongPhuHop: options.noiDungKhongPhuHop,
        });

      case 'REVISION_REQUEST':
        return buildForm7bContext(input, options.revisionContent);

      // Phase C forms
      case 'FACULTY_ACCEPTANCE_EVAL':
        return buildForm8bContext(input, options.isPass);

      case 'FACULTY_ACCEPTANCE_MINUTES':
        return buildForm9bContext(input, options.isPass);

      case 'FINAL_REPORT':
        return buildForm10bContext(input);

      case 'FACULTY_ACCEPTANCE_DECISION':
      case 'FACULTY_ACCEPTANCE':
        return buildForm11bContext(input, options.isPass);

      // Phase D forms
      case 'SCHOOL_ACCEPTANCE_EVAL':
        return buildForm12bContext(input, options.isPass);

      case 'SCHOOL_ACCEPTANCE_MINUTES':
        return buildForm13bContext(input, options.isPass);

      case 'SCHOOL_ACCEPTANCE_DECISION':
      case 'SCHOOL_ACCEPTANCE':
        return buildForm14bContext(input, options.isPass);

      // Phase E forms
      case 'HANDOVER_CHECKLIST':
        return buildForm17bContext(input);

      // Special forms
      case 'EXTENSION_REQUEST':
        return buildForm18bContext(input);

      // Default: use base context
      default:
        this.logger.warn(`No specific builder for ${templateType}, using base context`);
        return getBaseContext(input);
    }
  }

  /**
   * Get template filename for a template type
   *
   * @param templateType - Type of template
   * @returns Template filename (e.g., '1b.docx')
   */
  getTemplateName(templateType: ExtendedTemplateType | string): string {
    const name = TEMPLATE_MAP[templateType];
    if (!name) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_TYPE',
          message: `Unknown template type: ${templateType}`,
        },
      });
    }
    return name;
  }

  /**
   * Map DocumentType enum to template name
   *
   * @param documentType - Prisma DocumentType enum
   * @returns Template filename
   */
  documentTypeToTemplateName(documentType: DocumentType): string {
    const mapping: Record<DocumentType, string> = {
      PROPOSAL_OUTLINE: '1b.docx',
      EVALUATION_FORM: '2b.docx',
      FINAL_REPORT: '10b.docx',
      FACULTY_ACCEPTANCE: '11b.docx',
      SCHOOL_ACCEPTANCE: '14b.docx',
      HANDOVER_CHECKLIST: '17b.docx',
    };

    return mapping[documentType] || '1b.docx';
  }

  /**
   * Get all available template types
   */
  getAvailableTemplateTypes(): string[] {
    return Object.keys(TEMPLATE_MAP);
  }
}
