import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { DocumentTemplate, DocumentTemplateType, WorkflowAction } from '@prisma/client';
import { createHash } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PlaceholderExtractor } from './utils/placeholder-extractor';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  TemplateResponseDto,
  TemplateDetailResponseDto,
  PlaceholderValidationResult,
} from './dto';

/**
 * Template storage directory
 */
const TEMPLATE_STORAGE_DIR = path.join(process.cwd(), 'apps', 'public', 'templates');

/**
 * Interface for upload result
 */
interface UploadResult {
  template: DocumentTemplate;
  validation: PlaceholderValidationResult;
}

/**
 * Document Templates Service
 *
 * Manages DOCX template uploads, validation, and activation.
 * Implements atomic transactions following Epic 6 retro patterns.
 *
 * Epic 7 Story 7.2: Template Upload & Registry
 *
 * Epic 6 Retro Learnings Applied:
 * 1. Proper DTO mapping (no `as unknown`)
 * 2. WorkflowAction enum for all actions
 * 3. Atomic transactions for state changes
 * 4. RBAC guards on all endpoints
 */
@Injectable()
export class DocumentTemplatesService {
  private readonly logger = new Logger(DocumentTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    // Ensure template storage directory exists
    this.ensureStorageDir();
  }

  /**
   * Upload a new document template
   *
   * @param file - Uploaded DOCX file
   * @param name - Template name
   * @param description - Template description
   * @param templateType - Type of document template
   * @param isActive - Whether to activate immediately
   * @param userId - User uploading the template
   * @param context - Request context for audit
   * @returns Uploaded template with validation results
   */
  async uploadTemplate(
    file: any,
    name: string,
    description: string | undefined,
    templateType: DocumentTemplateType,
    isActive: boolean,
    userId: string,
    context: {
      ip?: string;
      userAgent?: string;
      requestId?: string;
    },
  ): Promise<UploadResult> {
    // Validate file type
    if (!file.mimetype.includes('wordprocessingml')) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Chỉ chấp nhận file .docx',
        },
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File không được quá 5MB',
        },
      });
    }

    // Extract placeholders from DOCX
    const placeholders = PlaceholderExtractor.extractPlaceholders(file.buffer);
    const validation = PlaceholderExtractor.validatePlaceholders(placeholders);

    // Calculate SHA-256 hash for integrity
    const sha256Hash = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Generate unique filename FIRST (before transaction)
    const timestamp = Date.now();
    const fileName = `template_${templateType}_${timestamp}.docx`;
    const filePath = path.join(TEMPLATE_STORAGE_DIR, fileName);

    // Save file to disk BEFORE transaction (Epic 6 retro fix)
    // This prevents orphaned files if transaction rolls back
    let template: DocumentTemplate;
    try {
      await fs.writeFile(filePath, file.buffer);

      // Atomic transaction following Epic 6 pattern
      const result = await this.prisma.$transaction(async (tx) => {
        // If activating, deactivate other templates of same type
        if (isActive) {
          await tx.documentTemplate.updateMany({
            where: {
              templateType,
              isActive: true,
            },
            data: {
              isActive: false,
            },
          });
        }

        // Create template record
        template = await tx.documentTemplate.create({
          data: {
            name,
            description,
            templateType,
            filePath,
            fileName: file.originalname,
            fileSize: file.size,
            sha256Hash,
            version: 1,
            placeholders,
            isActive,
            createdBy: userId,
          },
        });

        return { template, validation };
      });
    } catch (error) {
      // Clean up file if transaction fails
      try {
        await fs.unlink(filePath);
      } catch {
        // File might not exist, ignore
      }
      throw error;
    }

    // Log audit event using WorkflowAction enum
    await this.auditService.logEvent({
      action: AuditAction.TEMPLATE_UPLOAD,
      actorUserId: userId,
      entityType: 'DocumentTemplate',
      entityId: result.template.id,
      metadata: {
        templateName: result.template.name,
        templateType: result.template.templateType,
        placeholderCount: placeholders.length,
        unknownPlaceholders: validation.unknown,
        isActive: result.template.isActive,
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(
      `Template uploaded: ${result.template.name} (${result.template.templateType}) by ${userId}`,
    );

    return result;
  }

  /**
   * Get all templates
   *
   * @param includeDeleted - Include soft-deleted templates
   * @returns Array of templates
   */
  async findAll(includeDeleted = false): Promise<DocumentTemplate[]> {
    return this.prisma.documentTemplate.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      orderBy: [{ templateType: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get active template by type
   *
   * @param templateType - Type of template
   * @returns Active template or null
   */
  async getActiveTemplate(
    templateType: DocumentTemplateType,
  ): Promise<DocumentTemplate | null> {
    return this.prisma.documentTemplate.findFirst({
      where: {
        templateType,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  /**
   * Get template by ID
   *
   * @param id - Template ID
   * @returns Template with details
   */
  async findOne(id: string): Promise<TemplateDetailResponseDto> {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Không tìm thấy template',
        },
      });
    }

    // Validate placeholders
    const validation = PlaceholderExtractor.validatePlaceholders(
      template.placeholders,
    );

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      templateType: template.templateType,
      fileName: template.fileName,
      fileSize: template.fileSize,
      sha256Hash: template.sha256Hash,
      version: template.version,
      placeholders: template.placeholders,
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      unknownPlaceholders: validation.unknown,
      knownPlaceholders: validation.known,
      placeholderWarnings: validation.warnings,
    };
  }

  /**
   * Activate a template
   *
   * Deactivates other templates of the same type in a transaction.
   * Following Epic 6 atomic transaction pattern.
   *
   * @param id - Template ID
   * @param userId - User activating the template
   * @param context - Request context for audit
   * @returns Updated template
   */
  async activate(
    id: string,
    userId: string,
    context: {
      ip?: string;
      userAgent?: string;
      requestId?: string;
    },
  ): Promise<DocumentTemplate> {
    // Check template exists
    const existing = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Không tìm thấy template',
        },
      });
    }

    // Atomic transaction following Epic 6 pattern
    const result = await this.prisma.$transaction(async (tx) => {
      // Deactivate all templates of same type
      await tx.documentTemplate.updateMany({
        where: {
          templateType: existing.templateType,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Activate this template
      const updated = await tx.documentTemplate.update({
        where: { id },
        data: {
          isActive: true,
        },
      });

      return updated;
    });

    // Log audit event using WorkflowAction enum
    await this.auditService.logEvent({
      action: AuditAction.TEMPLATE_ACTIVATE,
      actorUserId: userId,
      entityType: 'DocumentTemplate',
      entityId: result.id,
      metadata: {
        templateName: result.name,
        templateType: result.templateType,
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(
      `Template activated: ${result.name} (${result.templateType}) by ${userId}`,
    );

    return result;
  }

  /**
   * Delete a template (soft delete)
   *
   * @param id - Template ID
   * @param userId - User deleting the template
   * @param context - Request context for audit
   */
  async delete(
    id: string,
    userId: string,
    context: {
      ip?: string;
      userAgent?: string;
      requestId?: string;
    },
  ): Promise<void> {
    const existing = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Không tìm thấy template',
        },
      });
    }

    // Prevent deletion if active
    if (existing.isActive) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CANNOT_DELETE_ACTIVE',
          message: 'Không thể xóa template đang hoạt động. Vui lòng kích hoạt template khác trước.',
        },
      });
    }

    // Soft delete
    await this.prisma.documentTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log audit event
    await this.auditService.logEvent({
      action: AuditAction.TEMPLATE_DELETE,
      actorUserId: userId,
      entityType: 'DocumentTemplate',
      entityId: id,
      metadata: {
        templateName: existing.name,
        templateType: existing.templateType,
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(`Template deleted: ${id} by ${userId}`);
  }

  /**
   * Download template file
   *
   * @param id - Template ID
   * @returns File buffer and metadata
   */
  async downloadFile(id: string): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Không tìm thấy template',
        },
      });
    }

    // Read file from disk
    const buffer = await fs.readFile(template.filePath);

    // Verify SHA-256 hash
    const currentHash = createHash('sha256').update(buffer).digest('hex');
    if (currentHash !== template.sha256Hash) {
      this.logger.error(
        `Template hash mismatch for ${id}: expected ${template.sha256Hash}, got ${currentHash}`,
      );
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_INTEGRITY_ERROR',
          message: 'File đã bị thay đổi. Không thể tải xuống.',
        },
      });
    }

    return {
      buffer,
      fileName: template.fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  /**
   * Get all known placeholders for reference
   *
   * @returns Map of placeholder to Vietnamese label
   */
  getKnownPlaceholders(): Record<string, string> {
    return PlaceholderExtractor.getAllKnownPlaceholders();
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(TEMPLATE_STORAGE_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Map DocumentTemplate to ResponseDto
   * Following Epic 6 proper DTO mapping pattern
   */
  toResponseDto(template: DocumentTemplate): TemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      templateType: template.templateType,
      fileName: template.fileName,
      fileSize: template.fileSize,
      sha256Hash: template.sha256Hash,
      version: template.version,
      placeholders: template.placeholders,
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
