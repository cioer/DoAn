import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectState } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * File upload options
 */
interface FileUploadOptions {
  uploadDir?: string; // Default: '/app/uploads'
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
 * Allowed MIME types for attachments
 */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]);

/**
 * Allowed file extensions (fallback for MIME type detection)
 */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
]);

/**
 * Default configuration values
 */
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_UPLOAD_DIR = '/app/uploads';

/**
 * Attachments Service
 *
 * Handles file uploads for DRAFT proposals.
 * Only proposal owners can upload to their own DRAFT proposals.
 *
 * Story 2.4: Upload Attachments (Demo Cap 5MB/File)
 */
@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Upload a file to a proposal
   *
   * Features:
   * - File size validation (5MB per file, configurable)
   * - Total size validation (50MB per proposal, configurable)
   * - MIME type validation
   * - State validation (DRAFT only)
   * - Ownership validation (owner only)
   * - Unique filename generation (UUID + original name)
   * - Audit logging
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
  ): Promise<{
    id: string;
    proposalId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    uploadedAt: Date;
  }> {
    const {
      uploadDir = DEFAULT_UPLOAD_DIR,
      maxFileSize = DEFAULT_MAX_FILE_SIZE,
      maxTotalSize = DEFAULT_MAX_TOTAL_SIZE,
      uploadTimeout = 30000,
    } = options;

    // Validate file size
    if (file.size > maxFileSize) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File quá 5MB. Vui lòng nén hoặc chia nhỏ.',
        },
      });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      // Fallback: check extension if MIME type is not recognized
      const ext = this.getFileExtension(file.originalname);
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Định dạng file không được hỗ trợ.',
          },
        });
      }
    }

    // Get proposal to validate state and ownership
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        state: true,
        ownerId: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Đề tài với ID không tồn tại',
        },
      });
    }

    // Check state: only DRAFT can receive uploads
    if (proposal.state !== ProjectState.DRAFT) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: 'Không thể tải lên khi hồ sơ không ở trạng thái nháp.',
        },
      });
    }

    // Check ownership
    if (proposal.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền tải tài liệu lên đề tài này.',
        },
      });
    }

    // Validate total size for proposal
    const currentTotal = await this.prisma.attachment.aggregate({
      where: {
        proposalId,
        deletedAt: null,
      },
      _sum: {
        fileSize: true,
      },
    });

    const existingTotalSize = (currentTotal._sum.fileSize || 0);
    if (existingTotalSize + file.size > maxTotalSize) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TOTAL_SIZE_EXCEEDED',
          message: 'Tổng dung lượng đã vượt giới hạn (50MB/proposal).',
        },
      });
    }

    // Generate unique filename (UUID + original name)
    const fileExtension = this.getFileExtension(file.originalname);
    const baseFileName = this.removeFileExtension(file.originalname);
    const uniqueFileName = `${randomUUID()}-${baseFileName}${fileExtension}`;

    // Save file to disk with timeout (Story 2.4 - AC4)
    const filePath = join(uploadDir, uniqueFileName);
    await this.saveFileToDisk(filePath, file.buffer, uploadTimeout);

    // Create attachment record
    const attachment = await this.prisma.attachment.create({
      data: {
        proposalId,
        fileName: uniqueFileName,
        fileUrl: `/uploads/${uniqueFileName}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
      },
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
  async getByProposalId(
    proposalId: string,
  ): Promise<
    Array<{
      id: string;
      proposalId: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      uploadedBy: string;
      uploadedAt: Date;
      deletedAt: Date | null;
    }> & { totalSize: number }
  > {
    const attachments = await this.prisma.attachment.findMany({
      where: {
        proposalId,
        deletedAt: null,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    // Calculate total size
    const totalSize = attachments.reduce(
      (sum, att) => sum + att.fileSize,
      0,
    );

    this.logger.debug(
      `Found ${attachments.length} attachments for proposal ${proposalId}, total size: ${totalSize} bytes`,
    );

    // Return attachments with totalSize property attached
    return Object.assign(
      attachments.map((att) => ({
        id: att.id,
        proposalId: att.proposalId,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        uploadedBy: att.uploadedBy,
        uploadedAt: att.uploadedAt,
        deletedAt: att.deletedAt,
      })),
      { totalSize },
    );
  }

  /**
   * Get file extension from filename
   *
   * @param filename - Original filename
   * @returns File extension with dot (e.g., ".pdf")
   */
  private getFileExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    return ext ? `.${ext}` : '';
  }

  /**
   * Remove file extension from filename
   *
   * @param filename - Original filename
   * @returns Filename without extension
   */
  private removeFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  }

  /**
   * Save file buffer to disk with timeout (Story 2.4 - AC4)
   *
   * @param filePath - Full file path
   * @param buffer - File buffer
   * @param timeoutMs - Timeout in milliseconds (default: 30000)
   */
  private async saveFileToDisk(
    filePath: string,
    buffer: Buffer,
    timeoutMs: number = 30000,
  ): Promise<void> {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('FILE_WRITE_TIMEOUT'));
        }, timeoutMs);
      });

      // Ensure directory exists
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      await fs.mkdir(dir, { recursive: true });

      // Race between file write and timeout
      await Promise.race([
        fs.writeFile(filePath, buffer),
        timeoutPromise,
      ]);

      this.logger.debug(`Saved file to disk: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save file to disk: ${error.message}`);
      if (error.message === 'FILE_WRITE_TIMEOUT') {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'UPLOAD_TIMEOUT',
            message: 'Upload quá hạn. Vui lòng thử lại.',
          },
        });
      }
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_SAVE_FAILED',
          message: 'Không thể lưu file. Vui lòng thử lại.',
        },
      });
    }
  }
}
