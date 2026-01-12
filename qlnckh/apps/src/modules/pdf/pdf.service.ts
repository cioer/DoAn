import { Injectable } from '@nestjs/common';
import {
  PdfHtmlHelpersService,
  PdfStylesService,
  PdfDataService,
  PdfGeneratorService,
  PdfTemplateService,
} from './services';

/**
 * PDF generation options
 */
export interface PdfOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  timeout?: number; // milliseconds
}

/**
 * PDF Service (Orchestrator)
 *
 * Phase 6 Refactor: Reduced from 1,682 to ~150 lines (-91%)
 *
 * This service now acts as a thin orchestrator that delegates to:
 * - PdfGeneratorService: PDF rendering with Playwright
 * - PdfTemplateService: HTML template generation
 * - PdfDataService: Data fetching from Prisma
 * - PdfHtmlHelpersService: HTML utility functions
 * - PdfStylesService: CSS style management
 *
 * All business logic has been extracted to specialized services.
 * This maintains backward compatibility - same public API.
 */
@Injectable()
export class PdfService {
  constructor(
    private readonly data: PdfDataService,
    private readonly generator: PdfGeneratorService,
    private readonly templates: PdfTemplateService,
    private readonly helpers: PdfHtmlHelpersService,
    private readonly styles: PdfStylesService,
  ) {}

  // ========================================================================
  // Core PDF Generation Methods
  // ========================================================================

  /**
   * Generate PDF for a proposal
   *
   * @param proposalId - Proposal UUID
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generateProposalPdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer> {
    // Check for pre-generated seed PDF first
    if (await this.generator.hasSeedPdf(proposalId)) {
      return this.generator.getSeedPdf(proposalId);
    }

    // Fetch proposal data
    const proposal = await this.data.getProposalForPdf(proposalId);

    // Generate HTML content
    const html = this.templates.generateProposalHtml(proposal);

    // Generate PDF
    return this.generator.generatePdfFromHtml(html, options);
  }

  /**
   * Generate PDF for revision request (Story 4.6)
   *
   * @param proposalId - Proposal UUID
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generateRevisionPdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer> {
    // Fetch proposal data
    const proposal = await this.data.getProposalForPdf(proposalId);

    // Fetch latest RETURN workflow log
    const returnLog = await this.data.getRevisionLog(proposalId);

    // Generate HTML content
    const html = this.templates.generateRevisionHtml(proposal, returnLog);

    // Generate PDF
    return this.generator.generatePdfFromHtml(html, options);
  }

  /**
   * Generate PDF for evaluation (Story 5.6)
   *
   * @param proposalId - Proposal UUID
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generateEvaluationPdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer> {
    // Fetch evaluation with proposal, evaluator, and council data
    const evaluation = await this.data.getEvaluationForPdf(proposalId);

    // Fetch council name if exists
    const councilName = await this.data.getCouncilName(evaluation.proposal.councilId);

    // Generate HTML content
    const html = this.templates.generateEvaluationHtml(evaluation, councilName);

    // Generate PDF
    return this.generator.generatePdfFromHtml(html, options);
  }

  // ========================================================================
  // Seed PDF Management
  // ========================================================================

  /**
   * Save pre-generated PDF for seed data
   *
   * @param proposalId - Proposal UUID
   * @param pdfBuffer - PDF buffer
   */
  async saveSeedPdf(proposalId: string, pdfBuffer: Buffer): Promise<void> {
    return this.generator.saveSeedPdf(proposalId, pdfBuffer);
  }

  /**
   * Check if pre-generated PDF exists
   *
   * @param proposalId - Proposal UUID
   * @returns true if PDF exists
   */
  async hasSeedPdf(proposalId: string): Promise<boolean> {
    return this.generator.hasSeedPdf(proposalId);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get proposal code for filename
   *
   * @param proposalId - Proposal UUID
   * @returns Proposal code or default string
   */
  async getProposalCode(proposalId: string): Promise<string> {
    return this.data.getProposalCode(proposalId);
  }

  /**
   * Get proposal for export with ownership verification
   *
   * @param proposalId - Proposal UUID
   * @returns Proposal with code, ownerId, and facultyId
   */
  async getProposalForExport(proposalId: string): Promise<{
    id: string;
    code: string;
    ownerId: string;
    facultyId: string | null;
  }> {
    return this.data.getProposalForExport(proposalId);
  }
}
