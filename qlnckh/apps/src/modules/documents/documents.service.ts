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
import { GenerateDocDto } from './dto/generate-doc.dto';

/**
 * Documents Storage Directory
 */
const DOCUMENTS_STORAGE_DIR = path.join(process.cwd(), 'apps', 'public', 'documents');

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

    // Read file
    const buffer = await fs.readFile(doc.filePath);

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
