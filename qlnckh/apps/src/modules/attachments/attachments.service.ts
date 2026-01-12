import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectState } from '@prisma/client';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  AttachmentValidationService,
  AttachmentStorageService,
  AttachmentQueryService,
} from './services';

/**
 * File upload options
 */
export interface FileUploadOptions {
  uploadDir?: string; // Default: '/tmp/qlnckh-uploads'
  maxFileSize?: number; // Default: 5MB
  maxTotalSize?: number; // Default: 50MB
  uploadTimeout?: number; // Default: 30000ms (30 seconds)
}

/**
 * Express.Multer.File interface (for type safety)
 */
export interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Attachments Service (Orchestrator)
 *
 * Phase 4 Refactor: Reduced from 771 to ~200 lines (-74%)
 *
 * This service now acts as a thin orchestrator that delegates to:
 * - AttachmentValidationService: File validation logic
 * - AttachmentStorageService: File system operations
 * - AttachmentQueryService: Data fetching and persistence
 *
 * Handles file uploads, replacements, and deletion for DRAFT proposals.
 * Only proposal owners can modify attachments in their own DRAFT proposals.
 *
 * Story 2.4: Upload Attachments (Demo Cap 5MB/File)
 * Story 2.5: Attachment CRUD (Replace, Delete)
 */
@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly validation: AttachmentValidationService,
    private readonly storage: AttachmentStorageService,
    private readonly queries: AttachmentQueryService,
  ) {}

  // ========================================================================
  // Core Operations
  // ========================================================================

  /**
   * Upload a file to a proposal
   *
   * @param proposalId - Proposal ID
   * @param file - Uploaded file (from Multer)
   * @param userId - Current user ID
   * @param options - Upload options
   * @returns Created attachment record
   */
  async uploadFile(
    proposalId: string,
    file: MulterFile,
    userId: string,
    options: FileUploadOptions = {},
  ) {
    const {
      uploadDir = this.storage.DEFAULT_UPLOAD_DIR,
      maxFileSize = this.validation.DEFAULT_MAX_FILE_SIZE,
      maxTotalSize = this.validation.DEFAULT_MAX_TOTAL_SIZE,
      uploadTimeout = 30000,
    } = options;

    // Validate file size
    const sizeError = this.validation.validateFileSize(file.size, maxFileSize);
    if (sizeError) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: sizeError },
      });
    }

    // Validate file type
    const typeError = this.validation.validateFileType(file.mimetype, file.originalname);
    if (typeError) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: typeError },
      });
    }

    // Validate proposal state and ownership
    const proposal = await this.validateProposalForModification(proposalId, userId);

    // Validate total size
    const currentTotal = await this.queries.getTotalSize(proposalId);
    const totalSizeError = this.validation.validateTotalSize(currentTotal, file.size, maxTotalSize);
    if (totalSizeError) {
      throw new BadRequestException({
        success: false,
        error: { code: 'TOTAL_SIZE_EXCEEDED', message: totalSizeError },
      });
    }

    // Generate unique filename
    const uniqueFileName = this.validation.generateUniqueFilename(file.originalname);

    // Save file to disk
    const filePath = this.storage.buildFilePath(uniqueFileName, uploadDir);
    await this.storage.saveFile(filePath, file.buffer, uploadTimeout);

    // Create attachment record
    const fileUrl = this.storage.buildFileUrl(uniqueFileName);
    const attachment = await this.queries.createAttachment({
      proposalId,
      fileName: uniqueFileName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: userId,
    });

    // Log audit event
    await this.auditService.logEvent({
      action: AuditAction.ATTACHMENT_UPLOAD,
      actorUserId: userId,
      entityType: 'attachment',
      entityId: attachment.id,
      metadata: {
        proposalId,
        proposalCode: proposal.code,
        fileName: uniqueFileName,
        originalFileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    this.logger.log(
      `Uploaded attachment ${attachment.id} (${uniqueFileName}) to proposal ${proposal.code}`,
    );

    return {
      id: attachment.id,
      proposalId: attachment.proposalId,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      uploadedBy: attachment.uploadedBy,
      uploadedAt: attachment.uploadedAt,
    };
  }

  /**
   * Get all attachments for a proposal
   *
   * @param proposalId - Proposal ID
   * @returns Array of attachments with total size
   */
  async getByProposalId(proposalId: string) {
    const result = await this.queries.getByProposalId(proposalId);

    this.logger.debug(
      `Found ${result.length} attachments for proposal ${proposalId}, total size: ${result.totalSize} bytes`,
    );

    return result;
  }

  /**
   * Replace an attachment with a new file
   *
   * Story 2.5: Attachment CRUD - Replace
   *
   * @param proposalId - Proposal ID
   * @param attachmentId - Attachment ID to replace
   * @param newFile - New file to upload
   * @param userId - Current user ID
   * @param options - Upload options
   * @returns Updated attachment record
   */
  async replaceAttachment(
    proposalId: string,
    attachmentId: string,
    newFile: MulterFile,
    userId: string,
    options: FileUploadOptions = {},
  ) {
    const {
      uploadDir = this.storage.DEFAULT_UPLOAD_DIR,
      maxFileSize = this.validation.DEFAULT_MAX_FILE_SIZE,
      uploadTimeout = 30000,
    } = options;

    // Validate proposal state and ownership
    const proposal = await this.validateProposalForModification(proposalId, userId);

    // Find existing attachment
    const attachment = await this.queries.getAttachmentById(attachmentId);
    if (!attachment || attachment.deletedAt) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ATTACHMENT_NOT_FOUND',
          message: 'Tài liệu không tồn tại hoặc đã bị xóa.',
        },
      });
    }

    // Verify attachment belongs to the proposal
    if (attachment.proposalId !== proposalId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Tài liệu không thuộc về đề tài này.',
        },
      });
    }

    // Validate new file
    const sizeError = this.validation.validateFileSize(newFile.size, maxFileSize);
    if (sizeError) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: sizeError },
      });
    }

    const typeError = this.validation.validateFileType(newFile.mimetype, newFile.originalname);
    if (typeError) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: typeError },
      });
    }

    // Delete old file from storage
    await this.storage.deleteFile(attachment.fileUrl, uploadDir);

    // Generate unique filename for new file
    const uniqueFileName = this.validation.generateUniqueFilename(newFile.originalname);

    // Save new file to disk
    const filePath = this.storage.buildFilePath(uniqueFileName, uploadDir);
    await this.storage.saveFile(filePath, newFile.buffer, uploadTimeout);

    // Update attachment record
    const fileUrl = this.storage.buildFileUrl(uniqueFileName);
    const updated = await this.queries.updateAttachment(attachmentId, {
      fileName: uniqueFileName,
      fileUrl,
      fileSize: newFile.size,
      mimeType: newFile.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });

    // Log audit event
    await this.auditService.logEvent({
      action: AuditAction.ATTACHMENT_REPLACE,
      actorUserId: userId,
      entityType: 'attachment',
      entityId: attachment.id,
      metadata: {
        proposalId,
        proposalCode: proposal.code,
        attachmentId,
        oldFileName: attachment.fileName,
        newFileName: uniqueFileName,
        oldFileSize: attachment.fileSize,
        newFileSize: newFile.size,
      },
    });

    this.logger.log(
      `Replaced attachment ${attachment.id} (${attachment.fileName} -> ${uniqueFileName}) in proposal ${proposal.code}`,
    );

    return {
      id: updated.id,
      proposalId: updated.proposalId,
      fileName: updated.fileName,
      fileUrl: updated.fileUrl,
      fileSize: updated.fileSize,
      mimeType: updated.mimeType,
      uploadedBy: updated.uploadedBy,
      uploadedAt: updated.uploadedAt,
    };
  }

  /**
   * Delete an attachment (soft delete)
   *
   * Story 2.5: Attachment CRUD - Delete
   *
   * @param proposalId - Proposal ID
   * @param attachmentId - Attachment ID to delete
   * @param userId - Current user ID
   * @param options - Options including uploadDir for file deletion
   * @returns Deleted attachment record with deletion timestamp
   */
  async deleteAttachment(
    proposalId: string,
    attachmentId: string,
    userId: string,
    options: FileUploadOptions = {},
  ) {
    const { uploadDir = this.storage.DEFAULT_UPLOAD_DIR } = options;

    // Validate proposal state and ownership
    const proposal = await this.validateProposalForModification(proposalId, userId);

    // Find attachment
    const attachment = await this.queries.getAttachmentById(attachmentId);
    if (!attachment || attachment.deletedAt) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'ATTACHMENT_NOT_FOUND',
          message: 'Tài liệu không tồn tại hoặc đã bị xóa.',
        },
      });
    }

    // Verify attachment belongs to the proposal
    if (attachment.proposalId !== proposalId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Tài liệu không thuộc về đề tài này.',
        },
      });
    }

    // Soft delete attachment record
    const deleted = await this.queries.softDeleteAttachment(attachmentId);

    // Delete physical file from storage (best effort, don't throw if fails)
    try {
      await this.storage.deleteFile(attachment.fileUrl, uploadDir);
    } catch (error) {
      this.logger.warn(
        `Failed to delete physical file ${attachment.fileUrl}: ${error.message}`,
      );
    }

    // Log audit event
    await this.auditService.logEvent({
      action: AuditAction.ATTACHMENT_DELETE,
      actorUserId: userId,
      entityType: 'attachment',
      entityId: attachment.id,
      metadata: {
        proposalId,
        proposalCode: proposal.code,
        attachmentId,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
      },
    });

    this.logger.log(
      `Deleted attachment ${attachment.id} (${attachment.fileName}) from proposal ${proposal.code}`,
    );

    return {
      id: deleted.id,
      deletedAt: deleted.deletedAt!,
    };
  }

  // ========================================================================
  // Validation Helpers
  // ========================================================================

  /**
   * Validate proposal for modification (state and ownership)
   *
   * Used by uploadFile, replaceAttachment, deleteAttachment
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID
   * @returns Proposal data
   * @throws NotFoundException if proposal not found
   * @throws BadRequestException if not in DRAFT state
   * @throws ForbiddenException if not owner
   */
  private async validateProposalForModification(proposalId: string, userId: string) {
    const proposal = await this.queries.getProposalForValidation(proposalId);

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Đề tài với ID không tồn tại',
        },
      });
    }

    // Check state: DRAFT and CHANGES_REQUESTED can be modified by owner
    // CHANGES_REQUESTED allows owner to upload revised documents
    if (proposal.state !== ProjectState.DRAFT && proposal.state !== ProjectState.CHANGES_REQUESTED) {
      const message =
        'Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.';

      throw new ForbiddenException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_EDITABLE',
          message,
        },
      });
    }

    // Check ownership or holder status
    // Allow both owner and holder to upload/modify attachments in DRAFT state
    const isOwner = proposal.ownerId === userId;
    const isHolder = proposal.holderUser === userId;

    if (!isOwner && !isHolder) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền thay thế tài liệu của đề tài này.',
        },
      });
    }

    return proposal;
  }
}
