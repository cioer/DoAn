import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { Document, DocumentType, UserRole, WorkflowAction } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { DocxService, ProposalDataForDocx } from './docx.service';
import { IntegrityService } from './integrity.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { DocumentTemplatesService } from '../document-templates/document-templates.service';
import { DocumentTemplateType } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GenerateDocDto, GenerateFormDto } from './dto/generate-doc.dto';
import { FormEngineService, FormContextService, ProposalContextInput } from '../form-engine';

/**
 * Documents Storage Directory
 * Note: When running from dist/apps with `node main.js`, process.cwd() is already
 * the apps directory, so we don't add 'apps' again to avoid path duplication.
 */
const DOCUMENTS_STORAGE_DIR = path.join(process.cwd(), 'public', 'documents');

/**
 * Request user interface
 */
interface RequestUser {
  id: string;
  role: UserRole;
  facultyId?: string | null;
}

/**
 * Documents Service
 *
 * Manages generated documents with integrity tracking.
 * Handles DOCX generation, RBAC, and retention policies.
 *
 * Epic 7 Story 7.3: DOCX Generation + SHA-256 + Manifest + Retention + RBAC
 *
 * Epic 6 Retro Learnings Applied:
 * 1. Proper DTO mapping (no `as unknown`)
 * 2. WorkflowAction enum for all actions
 * 3. Atomic transactions for state changes
 * 4. RBAC guards for download authorization
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docxService: DocxService,
    private readonly integrityService: IntegrityService,
    private readonly auditService: AuditService,
    private readonly templatesService: DocumentTemplatesService,
    private readonly formEngineService: FormEngineService,
    private readonly formContextService: FormContextService,
  ) {
    this.ensureStorageDir();
  }

  /**
   * Generate DOCX document for a proposal
   *
   * @param proposalId - Proposal ID
   * @param dto - Generation request
   * @param user - User requesting generation
   * @returns Generated document info
   */
  async generateDocument(
    proposalId: string,
    dto: GenerateDocDto,
    user: RequestUser,
  ): Promise<Document> {
    // Check proposal exists
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true },
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

    // RBAC check
    this.checkGeneratePermission(user, proposal);

    // Get active template for document type
    const templateType = this.documentTypeToTemplateType(dto.documentType);
    const template = dto.templateId
      ? await this.prisma.documentTemplate.findUnique({
          where: { id: dto.templateId },
        })
      : await this.templatesService.getActiveTemplate(templateType);

    if (!template) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_TEMPLATE',
          message: 'Không có template nào cho loại tài liệu này',
        },
      });
    }

    // Validate template type matches requested document type (Epic 6 retro fix)
    if (template.templateType !== templateType) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TEMPLATE_TYPE_MISMATCH',
          message: `Loại template không khớp. Yêu cầu: ${dto.documentType}, Template: ${template.templateType}`,
        },
      });
    }

    // Fetch proposal data for DOCX
    const proposalData = await this.docxService.fetchProposalData(proposalId);

    // Generate DOCX
    const docxBuffer = await this.docxService.generateFromTemplate(
      template,
      proposalData,
    );

    // Calculate SHA-256
    const sha256Hash = this.integrityService.calculateSHA256(docxBuffer);

    // Generate filename
    const fileName = this.docxService.getFilename(proposal.code, dto.documentType);

    // Save file
    const filePath = path.join(DOCUMENTS_STORAGE_DIR, fileName);
    await fs.writeFile(filePath, docxBuffer);

    // Atomic transaction following Epic 6 pattern
    const result = await this.prisma.$transaction(async (tx) => {
      // Create document record
      const document = await tx.document.create({
        data: {
          proposalId,
          documentType: dto.documentType,
          templateId: template.id,
          templateVersion: template.version,
          filePath,
          fileName,
          fileSize: docxBuffer.length,
          sha256Hash,
          generatedBy: user.id,
          retentionUntil: this.integrityService.calculateRetentionDate(7),
        },
      });

      // Create manifest with proper data mapping (Epic 6 pattern)
      await tx.documentManifest.create({
        data: {
          documentId: document.id,
          templateId: template.id,
          templateVersion: template.version,
          proposalData: {
            proposalCode: proposalData.code,
            proposalTitle: proposalData.title,
            ownerName: proposalData.ownerName,
            ownerEmail: proposalData.ownerEmail,
            facultyName: proposalData.facultyName,
            facultyCode: proposalData.facultyCode,
            state: proposalData.state,
            councilName: proposalData.councilName,
            councilType: proposalData.councilType,
            evaluationConclusion: proposalData.evaluationConclusion,
            acceptanceResults: proposalData.acceptanceResults,
            acceptanceProducts: proposalData.acceptanceProducts,
            handoverChecklist: proposalData.handoverChecklist,
            generatedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          generatedBy: user.id,
          generatedAt: new Date(),
        },
      });

      return document;
    });

    // Log audit event using AuditAction enum (Epic 6 pattern)
    await this.auditService.logEvent({
      action: AuditAction.DOC_GENERATED,
      actorUserId: user.id,
      entityType: 'Document',
      entityId: result.id,
      metadata: {
        proposalCode: proposal.code,
        documentType: dto.documentType,
        templateId: template.id,
        templateVersion: template.version,
        fileName,
        fileSize: docxBuffer.length,
        sha256Hash,
      },
    });

    this.logger.log(
      `Document generated: ${fileName} for proposal ${proposal.code} by ${user.id}`,
    );

    return result;
  }

  /**
   * Download document
   *
   * @param documentId - Document ID
   * @param user - User requesting download
   * @returns File buffer and metadata
   */
  async downloadDocument(
    documentId: string,
    user: RequestUser,
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { proposal: true },
    });

    if (!doc) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Không tìm thấy tài liệu',
        },
      });
    }

    // RBAC check
    this.checkDownloadPermission(user, doc.proposal.ownerId, doc.proposal.facultyId);

    // Read file with proper error handling
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(doc.filePath);
    } catch (error) {
      this.logger.error(
        `Failed to read document file: ${doc.filePath} - ${(error as Error).message}`,
      );
      throw new NotFoundException({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File tài liệu không tồn tại trên server. Vui lòng tạo lại tài liệu.',
        },
      });
    }

    // Verify SHA-256
    const currentHash = this.integrityService.calculateSHA256(buffer);
    if (currentHash !== doc.sha256Hash) {
      this.logger.error(
        `Document hash mismatch for ${documentId}: expected ${doc.sha256Hash}, got ${currentHash}`,
      );
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_INTEGRITY_ERROR',
          message: 'File đã bị thay đổi. Không thể tải xuống.',
        },
      });
    }

    // Log download using AuditAction enum (Epic 6 pattern)
    await this.auditService.logEvent({
      action: AuditAction.DOC_DOWNLOADED,
      actorUserId: user.id,
      entityType: 'Document',
      entityId: doc.id,
      metadata: {
        fileName: doc.fileName,
        documentType: doc.documentType,
      },
    });

    return {
      buffer,
      fileName: doc.fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  /**
   * Get documents for a proposal
   *
   * @param proposalId - Proposal ID
   * @param user - User requesting
   * @returns List of documents
   */
  async getProposalDocuments(
    proposalId: string,
    user: RequestUser,
  ): Promise<Document[]> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true, ownerId: true, facultyId: true },
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

    // RBAC check
    this.checkDownloadPermission(user, proposal.ownerId, proposal.facultyId);

    return this.prisma.document.findMany({
      where: {
        proposalId,
        deletedAt: null,
      },
      orderBy: { generatedAt: 'desc' },
    });
  }

  /**
   * Verify document integrity
   *
   * @param documentId - Document ID
   * @param userId - User verifying
   * @returns Verification result
   */
  async verifyIntegrity(documentId: string, userId: string) {
    return this.integrityService.verifyDocument(documentId, userId);
  }

  /**
   * Check if user can generate document
   */
  private checkGeneratePermission(user: RequestUser, proposal: any): void {
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = proposal.ownerId === user.id;
    const isFaculty =
      user.role === UserRole.QUAN_LY_KHOA &&
      user.facultyId === proposal.facultyId;
    const isPKHCN = user.role === UserRole.PHONG_KHCN;

    if (!isAdmin && !isOwner && !isFaculty && !isPKHCN) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền tạo tài liệu cho đề tài này',
        },
      });
    }
  }

  /**
   * Check if user can download document
   * Following Epic 6 RBAC pattern
   */
  private checkDownloadPermission(
    user: RequestUser,
    ownerId: string,
    facultyId: string,
  ): void {
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = ownerId === user.id;
    const isFaculty =
      user.role === UserRole.QUAN_LY_KHOA && user.facultyId === facultyId;
    const isPKHCN = user.role === UserRole.PHONG_KHCN;

    if (!isAdmin && !isOwner && !isFaculty && !isPKHCN) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền tải tài liệu này',
        },
      });
    }
  }

  /**
   * Map DocumentType to DocumentTemplateType
   */
  private documentTypeToTemplateType(
    documentType: DocumentType,
  ): DocumentTemplateType {
    const mapping: Record<DocumentType, DocumentTemplateType> = {
      PROPOSAL_OUTLINE: DocumentTemplateType.PROPOSAL_OUTLINE,
      EVALUATION_FORM: DocumentTemplateType.EVALUATION_FORM,
      FINAL_REPORT: DocumentTemplateType.FINAL_REPORT,
      FACULTY_ACCEPTANCE: DocumentTemplateType.FACULTY_ACCEPTANCE,
      SCHOOL_ACCEPTANCE: DocumentTemplateType.SCHOOL_ACCEPTANCE,
      HANDOVER_CHECKLIST: DocumentTemplateType.HANDOVER_CHECKLIST,
    };

    return mapping[documentType];
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(DOCUMENTS_STORAGE_DIR, {
        recursive: true,
      });
    } catch (error) {
      // Directory might already exist
    }
  }

  // =========================================================================
  // FORM ENGINE METHODS (Advanced document generation)
  // =========================================================================

  /**
   * Generate document using FormEngine microservice
   *
   * Provides advanced features:
   * - Smart variable replacement
   * - PDF conversion via LibreOffice
   * - Dynamic table generation
   * - List alignment preservation
   *
   * @param proposalId - Proposal ID
   * @param dto - Form generation options
   * @param user - User requesting generation
   * @returns Generated document info with DOCX and PDF paths
   */
  async generateFormDocument(
    proposalId: string,
    dto: GenerateFormDto,
    user: RequestUser,
  ): Promise<{
    document: Document;
    pdfPath?: string;
    docxUrl: string;
    pdfUrl?: string;
  }> {
    // Check proposal exists
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true, faculty: true, council: true },
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

    // RBAC check
    this.checkGeneratePermission(user, proposal);

    // Check FormEngine availability
    const isAvailable = await this.formEngineService.isAvailable();
    if (!isAvailable) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FORM_ENGINE_UNAVAILABLE',
          message: 'Form Engine service không khả dụng. Vui lòng thử lại sau.',
        },
      });
    }

    // Fetch proposal data
    const proposalData = await this.docxService.fetchProposalData(proposalId);

    // Convert to context input
    const contextInput: ProposalContextInput = {
      ...proposalData,
      formData: {
        ...(proposal.formData as Record<string, unknown>),
        ...dto.additionalData,
      },
    };

    // Build context for template
    const context = this.formContextService.buildContext(
      dto.templateType,
      contextInput,
      {
        isPass: dto.isPass,
        isApproved: dto.isApproved,
        evaluatorName: dto.evaluatorName,
        soPhieuDongY: dto.soPhieuDongY,
        soPhieuPhanDoi: dto.soPhieuPhanDoi,
        noiDungChinhSua: dto.noiDungChinhSua,
        noiDungBoSung: dto.noiDungBoSung,
        noiDungKhongPhuHop: dto.noiDungKhongPhuHop,
        revisionContent: dto.revisionContent,
        chuNhiem: dto.chuNhiem,
        hoiDong: dto.hoiDong,
      },
    );

    // Get template name
    const templateName = this.formContextService.getTemplateName(dto.templateType);

    // Call FormEngine
    const result = await this.formEngineService.renderForm({
      templateName,
      context,
      userId: user.id,
      proposalId,
    });

    // Copy files to public directory
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const baseFileName = `${proposal.code}_${dto.templateType}_${timestamp}_${random}`;
    const docxFileName = `${baseFileName}.docx`;
    const pdfFileName = `${baseFileName}.pdf`;

    const docxDestPath = path.join(DOCUMENTS_STORAGE_DIR, docxFileName);
    const pdfDestPath = path.join(DOCUMENTS_STORAGE_DIR, pdfFileName);

    // Download and save DOCX with proper error handling
    let docxBuffer: Buffer;
    try {
      this.logger.log(`Fetching DOCX from: ${result.docx_url}`);
      const docxResponse = await fetch(result.docx_url);
      if (!docxResponse.ok) {
        throw new Error(`HTTP ${docxResponse.status}: ${docxResponse.statusText}`);
      }
      docxBuffer = Buffer.from(await docxResponse.arrayBuffer());
      if (docxBuffer.length === 0) {
        throw new Error('Received empty file from Form Engine');
      }
      await fs.writeFile(docxDestPath, docxBuffer);
      this.logger.log(`DOCX saved to: ${docxDestPath} (${docxBuffer.length} bytes)`);
    } catch (error) {
      this.logger.error(`Failed to download DOCX from Form Engine: ${(error as Error).message}`);
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DOCX_DOWNLOAD_FAILED',
          message: `Không thể tải file DOCX từ Form Engine: ${(error as Error).message}`,
        },
      });
    }

    // Download and save PDF if available
    let pdfSaved = false;
    if (result.pdf_url) {
      try {
        this.logger.log(`Fetching PDF from: ${result.pdf_url}`);
        const pdfResponse = await fetch(result.pdf_url);
        if (!pdfResponse.ok) {
          throw new Error(`HTTP ${pdfResponse.status}: ${pdfResponse.statusText}`);
        }
        const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
        if (pdfBuffer.length === 0) {
          throw new Error('Received empty PDF file');
        }
        await fs.writeFile(pdfDestPath, pdfBuffer);
        this.logger.log(`PDF saved to: ${pdfDestPath} (${pdfBuffer.length} bytes)`);
        pdfSaved = true;
      } catch (error) {
        this.logger.warn(`Failed to download PDF: ${error}`);
      }
    }

    // Map to DocumentType enum (for database)
    const documentType = this.templateTypeToDocumentType(dto.templateType);

    // Get or find a default template for this document type
    const dbTemplateType = this.documentTypeToTemplateType(documentType);
    let template = await this.templatesService.getActiveTemplate(dbTemplateType);

    // If no active template, try to find any template of this type
    if (!template) {
      template = await this.prisma.documentTemplate.findFirst({
        where: { templateType: dbTemplateType },
      });
    }

    // If still no template, create a placeholder for FormEngine
    if (!template) {
      template = await this.prisma.documentTemplate.create({
        data: {
          name: `FormEngine ${dto.templateType}`,
          description: `Auto-created template for FormEngine ${dto.templateType}`,
          templateType: dbTemplateType,
          filePath: 'form-engine',
          fileName: `${dto.templateType}.docx`,
          fileSize: 0,
          sha256Hash: `form-engine-${dto.templateType}-placeholder`,
          version: 1,
          isActive: false,
          createdBy: user.id,
        },
      });
    }

    // Save to database
    const document = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          proposalId,
          documentType,
          templateId: template!.id,
          templateVersion: template!.version,
          filePath: docxDestPath,
          fileName: docxFileName,
          fileSize: docxBuffer.length,
          sha256Hash: result.sha256_docx,
          generatedBy: user.id,
          retentionUntil: this.integrityService.calculateRetentionDate(7),
        },
      });

      // Create manifest
      await tx.documentManifest.create({
        data: {
          documentId: doc.id,
          templateId: template!.id,
          templateVersion: template!.version,
          proposalData: {
            proposalCode: proposalData.code,
            proposalTitle: proposalData.title,
            formEngineTemplateType: dto.templateType,
            formEngineTemplateName: templateName,
            formEngineTimestamp: result.timestamp,
            sha256Docx: result.sha256_docx,
            sha256Pdf: result.sha256_pdf,
          } as Prisma.InputJsonValue,
          generatedBy: user.id,
          generatedAt: new Date(),
        },
      });

      return doc;
    });

    // Audit log
    await this.auditService.logEvent({
      action: AuditAction.DOC_GENERATED,
      actorUserId: user.id,
      entityType: 'Document',
      entityId: document.id,
      metadata: {
        proposalCode: proposal.code,
        templateType: dto.templateType,
        templateName,
        fileName: docxFileName,
        fileSize: docxBuffer.length,
        sha256Hash: result.sha256_docx,
        usedFormEngine: true,
        pdfGenerated: pdfSaved,
      },
    });

    this.logger.log(
      `FormEngine document generated: ${docxFileName} for proposal ${proposal.code} by ${user.id}`,
    );

    return {
      document,
      pdfPath: pdfSaved ? pdfDestPath : undefined,
      docxUrl: `/documents/${document.id}/download`,
      pdfUrl: pdfSaved ? `/documents/${document.id}/download-pdf` : undefined,
    };
  }

  /**
   * Check FormEngine service health
   */
  async checkFormEngineHealth() {
    const health = await this.formEngineService.healthCheck();
    return {
      available: health?.status === 'healthy',
      version: health?.version,
      templatesCount: health?.templates_available,
      libreofficeAvailable: health?.libreoffice_available,
    };
  }

  /**
   * Get available template types from FormEngine
   */
  async getAvailableFormTemplates() {
    const types = this.formContextService.getAvailableTemplateTypes();
    const templates = await this.formEngineService.getTemplates();

    return types.map((type) => {
      const templateName = this.formContextService.getTemplateName(type);
      const template = templates.find((t) => t.name === templateName);

      return {
        type,
        name: templateName,
        description: this.getTemplateDescription(type),
        available: !!template,
        size: template?.size,
      };
    });
  }

  /**
   * Get template description
   */
  private getTemplateDescription(templateType: string): string {
    const descriptions: Record<string, string> = {
      PROPOSAL_OUTLINE: 'Phiếu đề xuất đề tài NCKH (Mẫu 1b)',
      EVALUATION_FORM: 'Phiếu đánh giá đề xuất (Mẫu 2b)',
      FACULTY_MEETING_MINUTES: 'Biên bản họp xét chọn Khoa (Mẫu 3b)',
      SUMMARY_CATALOG: 'Danh mục tổng hợp (Mẫu 4b)',
      SCHOOL_EVALUATION: 'Phiếu đánh giá cấp Trường (Mẫu 5b)',
      COUNCIL_MEETING_MINUTES: 'Biên bản họp Hội đồng (Mẫu 6b)',
      REVISION_REQUEST: 'Phiếu yêu cầu chỉnh sửa (Mẫu 7b)',
      FACULTY_ACCEPTANCE_EVAL: 'Phiếu đánh giá nghiệm thu Khoa (Mẫu 8b)',
      FACULTY_ACCEPTANCE_MINUTES: 'Biên bản nghiệm thu Khoa (Mẫu 9b)',
      FINAL_REPORT: 'Báo cáo tổng kết (Mẫu 10b)',
      FACULTY_ACCEPTANCE_DECISION: 'Quyết định nghiệm thu Khoa (Mẫu 11b)',
      FACULTY_ACCEPTANCE: 'Quyết định nghiệm thu Khoa (Mẫu 11b)',
      SCHOOL_ACCEPTANCE_EVAL: 'Phiếu đánh giá nghiệm thu Trường (Mẫu 12b)',
      SCHOOL_ACCEPTANCE_MINUTES: 'Biên bản nghiệm thu Trường (Mẫu 13b)',
      SCHOOL_ACCEPTANCE_DECISION: 'Quyết định nghiệm thu Trường (Mẫu 14b)',
      SCHOOL_ACCEPTANCE: 'Quyết định nghiệm thu Trường (Mẫu 14b)',
      PRODUCT_LIST: 'Danh sách sản phẩm (Mẫu 15b)',
      PRODUCT_APPENDIX: 'Phụ lục sản phẩm (Mẫu 16b)',
      HANDOVER_CHECKLIST: 'Biên bản bàn giao (Mẫu 17b)',
      EXTENSION_REQUEST: 'Đơn xin gia hạn (Mẫu 18b)',
    };

    return descriptions[templateType] || templateType;
  }

  /**
   * Map extended template type to DocumentType enum
   */
  private templateTypeToDocumentType(templateType: string): DocumentType {
    const mapping: Record<string, DocumentType> = {
      PROPOSAL_OUTLINE: DocumentType.PROPOSAL_OUTLINE,
      EVALUATION_FORM: DocumentType.EVALUATION_FORM,
      FINAL_REPORT: DocumentType.FINAL_REPORT,
      FACULTY_ACCEPTANCE: DocumentType.FACULTY_ACCEPTANCE,
      FACULTY_ACCEPTANCE_DECISION: DocumentType.FACULTY_ACCEPTANCE,
      SCHOOL_ACCEPTANCE: DocumentType.SCHOOL_ACCEPTANCE,
      SCHOOL_ACCEPTANCE_DECISION: DocumentType.SCHOOL_ACCEPTANCE,
      HANDOVER_CHECKLIST: DocumentType.HANDOVER_CHECKLIST,
    };

    // Default to PROPOSAL_OUTLINE for unmapped types
    return mapping[templateType] || DocumentType.PROPOSAL_OUTLINE;
  }

  /**
   * Download PDF version of document
   *
   * @param documentId - Document ID
   * @param user - User requesting download
   * @returns PDF buffer and filename
   */
  async downloadFormPdf(
    documentId: string,
    user: RequestUser,
  ): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { proposal: true, manifest: true },
    });

    if (!doc) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Không tìm thấy tài liệu',
        },
      });
    }

    // RBAC check
    this.checkDownloadPermission(user, doc.proposal.ownerId, doc.proposal.facultyId);

    // Check if PDF exists (replace .docx with .pdf)
    const pdfPath = doc.filePath.replace(/\.docx$/, '.pdf');

    try {
      const buffer = await fs.readFile(pdfPath);

      // Log download
      await this.auditService.logEvent({
        action: AuditAction.DOC_DOWNLOADED,
        actorUserId: user.id,
        entityType: 'Document',
        entityId: doc.id,
        metadata: {
          fileName: doc.fileName.replace(/\.docx$/, '.pdf'),
          documentType: doc.documentType,
          format: 'pdf',
        },
      });

      return {
        buffer,
        fileName: doc.fileName.replace(/\.docx$/, '.pdf'),
      };
    } catch (error) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PDF_NOT_FOUND',
          message: 'Không tìm thấy file PDF. Tài liệu này có thể chưa được tạo PDF.',
        },
      });
    }
  }

  /**
   * Map Document to ResponseDto
   */
  toResponseDto(document: Document, baseUrl = '') {
    return {
      id: document.id,
      proposalId: document.proposalId,
      documentType: document.documentType,
      fileName: document.fileName,
      fileSize: document.fileSize,
      sha256Hash: document.sha256Hash,
      generatedBy: document.generatedBy,
      generatedAt: document.generatedAt,
      downloadUrl: `${baseUrl}/documents/${document.id}/download`,
    };
  }
}
