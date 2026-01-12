import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectState, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as archiver from 'archiver';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Dossier Pack Type
 * Different types of dossier packs for different stages
 */
export enum DossierPackType {
  FACULTY_ACCEPTANCE = 'FACULTY_ACCEPTANCE',   // Story 6.2
  SCHOOL_ACCEPTANCE = 'SCHOOL_ACCEPTANCE',     // Story 6.4
  HANDOVER = 'HANDOVER',                       // Story 6.5
  FINAL = 'FINAL',                             // Story 6.6 - Complete pack
}

/**
 * Dossier export configuration
 */
interface DossierExportConfig {
  exportDir?: string;      // Default: '/tmp/qlnckh-exports'
  uploadDir?: string;      // Default: '/tmp/qlnckh-uploads' - for reading attachments
  includeAttachments?: boolean;
  includeFormData?: boolean;
}

/**
 * Dossier export result
 */
interface DossierExportResult {
  zipId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Request context for audit logging
 */
interface RequestContext {
  userId: string;
  userDisplayName?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_EXPORT_DIR = '/tmp/qlnckh-exports';
const DEFAULT_UPLOAD_DIR = '/tmp/qlnckh-uploads';
const ZIP_EXPIRY_HOURS = 24; // ZIP files expire after 24 hours

/**
 * Dossier Export Service
 *
 * Story 6.6: ZIP Dossier Pack Export
 *
 * Generates ZIP files containing:
 * - Proposal PDF (if available)
 * - Attachments (general, faculty acceptance, school acceptance, handover)
 * - Form data (JSON export)
 * - Metadata (README file with proposal info)
 *
 * Features:
 * - RBAC protection for downloading
 * - Async generation with status tracking
 * - Auto-cleanup of expired files
 * - Support for different pack types
 */
@Injectable()
export class DossierExportService {
  private readonly logger = new Logger(DossierExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate a dossier pack ZIP file
   *
   * @param proposalId - Proposal ID
   * @param packType - Type of dossier pack to generate
   * @param userId - Current user ID
   * @param userRole - Current user role
   * @param ctx - Request context for audit
   * @param config - Export configuration
   * @returns Dossier export result with download URL
   */
  async generateDossierPack(
    proposalId: string,
    packType: DossierPackType,
    userId: string,
    userRole: UserRole,
    ctx: RequestContext,
    config: DossierExportConfig = {},
  ): Promise<DossierExportResult> {
    const {
      exportDir = DEFAULT_EXPORT_DIR,
      uploadDir = DEFAULT_UPLOAD_DIR,
      includeAttachments = true,
      includeFormData = true,
    } = config;

    // Get proposal with all related data
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
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check access based on pack type
    this.validateAccessForPackType(proposal, packType, userId, userRole);

    // Check state for pack type
    this.validateStateForPackType(proposal.state, packType);

    // Generate unique ZIP ID
    const zipId = randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${proposal.code}_${packType}_${timestamp}.zip`;
    const zipPath = join(exportDir, fileName);

    // Create ZIP file
    await this.createZipFile(
      proposal,
      packType,
      zipPath,
      { uploadDir, includeAttachments, includeFormData },
    );

    // Get file size
    const stats = await fs.stat(zipPath);

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ZIP_EXPIRY_HOURS);

    const result: DossierExportResult = {
      zipId,
      fileName,
      fileUrl: `/exports/${fileName}`,
      fileSize: stats.size,
      createdAt: new Date(),
      expiresAt,
    };

    // Log audit event
    await this.auditService.logEvent({
      action: 'DOSSIER_EXPORT' as AuditAction,
      actorUserId: userId,
      entityType: 'dossier_pack',
      entityId: zipId,
      metadata: {
        proposalId,
        proposalCode: proposal.code,
        packType,
        fileName,
        fileSize: stats.size,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(
      `Generated dossier pack ${zipId} for proposal ${proposal.code} (${packType})`,
    );

    return result;
  }

  /**
   * Validate user access for pack type
   *
   * @param proposal - Proposal with owner info
   * @param packType - Type of dossier pack
   * @param userId - Current user ID
   * @param userRole - Current user role
   */
  private validateAccessForPackType(
    proposal: { ownerId: string; facultyId: string; state: ProjectState },
    packType: DossierPackType,
    userId: string,
    userRole: UserRole,
  ): void {
    const isOwner = proposal.ownerId === userId;
    const isFacultyMember = userRole === UserRole.QUAN_LY_KHOA;
    const isSchoolAdmin = [UserRole.PHONG_KHCN, UserRole.THU_KY_HOI_DONG, UserRole.ADMIN].includes(userRole as any);

    switch (packType) {
      case DossierPackType.FACULTY_ACCEPTANCE:
        // Owner (submitting), QUAN_LY_KHOA (reviewing), PHONG_KHCN, ADMIN
        if (!isOwner && !isFacultyMember && !isSchoolAdmin) {
          throw new ForbiddenException({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Bạn không có quyền xuất hồ sơ nghiệm thu Khoa',
            },
          });
        }
        break;

      case DossierPackType.SCHOOL_ACCEPTANCE:
        // Owner, PHONG_KHCN, THU_KY_HOI_DONG, ADMIN
        if (!isOwner && !isSchoolAdmin) {
          throw new ForbiddenException({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Bạn không có quyền xuất hồ sơ nghiệm thu Trường',
            },
          });
        }
        break;

      case DossierPackType.HANDOVER:
      case DossierPackType.FINAL:
        // Owner and admins can access
        if (!isOwner && !isSchoolAdmin) {
          throw new ForbiddenException({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Bạn không có quyền xuất hồ sơ bàn giao',
            },
          });
        }
        break;
    }
  }

  /**
   * Validate proposal state for pack type
   *
   * @param state - Current proposal state
   * @param packType - Type of dossier pack
   */
  private validateStateForPackType(
    state: ProjectState,
    packType: DossierPackType,
  ): void {
    switch (packType) {
      case DossierPackType.FACULTY_ACCEPTANCE:
        if (
          state !== ProjectState.FACULTY_ACCEPTANCE_REVIEW &&
          state !== ProjectState.SCHOOL_ACCEPTANCE_REVIEW &&
          state !== ProjectState.HANDOVER &&
          state !== ProjectState.COMPLETED
        ) {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'Hồ sơ nghiệm thu Khoa chưa sẵn sàng. Vui lòng nộp hồ sơ trước.',
            },
          });
        }
        break;

      case DossierPackType.SCHOOL_ACCEPTANCE:
        if (
          state !== ProjectState.SCHOOL_ACCEPTANCE_REVIEW &&
          state !== ProjectState.HANDOVER &&
          state !== ProjectState.COMPLETED
        ) {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'Hồ sơ nghiệm thu Trường chưa sẵn sàng. Vui lòng đợi Khoa nghiệm thu xong.',
            },
          });
        }
        break;

      case DossierPackType.HANDOVER:
        if (state !== ProjectState.HANDOVER && state !== ProjectState.COMPLETED) {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'Hồ sơ bàn giao chưa sẵn sàng.',
            },
          });
        }
        break;

      case DossierPackType.FINAL:
        if (state !== ProjectState.COMPLETED) {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'Hồ sơ cuối cùng chỉ có thể xuất khi đề tài đã hoàn thành.',
            },
          });
        }
        break;
    }
  }

  /**
   * Create ZIP file with dossier contents
   *
   * @param proposal - Proposal data
   * @param packType - Type of dossier pack
   * @param zipPath - Output ZIP file path
   * @param config - Export configuration
   */
  private async createZipFile(
    proposal: any,
    packType: DossierPackType,
    zipPath: string,
    config: {
      uploadDir: string;
      includeAttachments: boolean;
      includeFormData: boolean;
    },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      output.on('close', () => {
        this.logger.debug(`ZIP file created: ${zipPath} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', (err: Error) => {
        this.logger.error(`Archive error: ${err.message}`);
        reject(err);
      });

      // Pipe archive to output
      archive.pipe(output);

      // Add README with metadata
      const readmeContent = this.generateReadmeContent(proposal, packType);
      archive.append(readmeContent, { name: 'README.txt' });

      // Add form data as JSON
      if (config.includeFormData && proposal.formData) {
        const formDataJson = JSON.stringify(proposal.formData, null, 2);
        archive.append(formDataJson, { name: 'form_data.json' });
      }

      // Add attachments if requested
      if (config.includeAttachments) {
        this.addAttachmentsToArchive(archive, proposal.id, packType, config.uploadDir).catch((err) => {
          this.logger.warn(`Failed to add some attachments: ${err.message}`);
          // Continue without attachments rather than failing
        });
      }

      // Finalize archive
      archive.finalize();
    });
  }

  /**
   * Generate README content for dossier pack
   *
   * @param proposal - Proposal data
   * @param packType - Type of dossier pack
   * @returns README content as string
   */
  private generateReadmeContent(proposal: any, packType: DossierPackType): string {
    const lines = [
      '==================================================',
      `HỒ SƠ ĐỀ TÀI - ${proposal.code}`,
      '==================================================',
      '',
      `Tên đề tài: ${proposal.title}`,
      `Mã đề tài: ${proposal.code}`,
      `Trạng thái: ${this.translateState(proposal.state)}`,
      `Loại hồ sơ: ${this.translatePackType(packType)}`,
      '',
      '--------------------------------------------------',
      'THÔNG TIN CHỦ NHIỆM',
      '--------------------------------------------------',
      `Họ tên: ${proposal.owner?.displayName || 'N/A'}`,
      `Email: ${proposal.owner?.email || 'N/A'}`,
      '',
      '--------------------------------------------------',
      'THÔNG TIN KHOA',
      '--------------------------------------------------',
      `Khoa: ${proposal.faculty?.name || 'N/A'}`,
      `Mã khoa: ${proposal.faculty?.code || 'N/A'}`,
      '',
      '--------------------------------------------------',
      'THỜI GIAN',
      '--------------------------------------------------',
      `Ngày tạo: ${new Date(proposal.createdAt).toLocaleString('vi-VN')}`,
      `Ngày bắt đầu: ${proposal.actualStartDate ? new Date(proposal.actualStartDate).toLocaleString('vi-VN') : 'Chưa bắt đầu'}`,
      `Ngày hoàn thành: ${proposal.completedDate ? new Date(proposal.completedDate).toLocaleString('vi-VN') : 'Chưa hoàn thành'}`,
      '',
      '--------------------------------------------------',
      'NỘI DUNG HỒ SƠ',
      '--------------------------------------------------',
    ];

    // Add specific contents based on pack type
    switch (packType) {
      case DossierPackType.FACULTY_ACCEPTANCE:
        lines.push('- Kết quả thực hiện');
        lines.push('- Danh sách sản phẩm');
        lines.push('- Tài liệu đính kèm');
        break;
      case DossierPackType.SCHOOL_ACCEPTANCE:
        lines.push('- Kết quả nghiệm thu cấp Khoa');
        lines.push('- Kết quả thực hiện');
        lines.push('- Danh sách sản phẩm');
        lines.push('- Tài liệu đính kèm');
        break;
      case DossierPackType.HANDOVER:
        lines.push('- Checklist bàn giao');
        lines.push('- Tài liệu bàn giao');
        lines.push('- Sản phẩm hoàn thành');
        break;
      case DossierPackType.FINAL:
        lines.push('- Hồ sơ đầy đủ từ đầu đến khi hoàn thành');
        lines.push('- Báo cáo kết quả');
        lines.push('- Sản phẩm');
        lines.push('- Tài liệu bàn giao');
        break;
    }

    lines.push('', '==================================================');
    lines.push(`Hồ sơ được tạo lúc: ${new Date().toLocaleString('vi-VN')}`);
    lines.push('==================================================');

    return lines.join('\n');
  }

  /**
   * Add attachments to archive
   *
   * @param archive - Archiver instance
   * @param proposalId - Proposal ID
   * @param packType - Type of dossier pack (for filtering attachments)
   * @param uploadDir - Upload directory path
   */
  private async addAttachmentsToArchive(
    archive: archiver.Archiver,
    proposalId: string,
    packType: DossierPackType,
    uploadDir: string,
  ): Promise<void> {
    // Get attachments for this proposal
    const attachments = await this.prisma.attachment.findMany({
      where: {
        proposalId,
        deletedAt: null,
      },
    });

    if (attachments.length === 0) {
      return;
    }

    // Filter attachments based on pack type
    const filteredAttachments = this.filterAttachmentsByPackType(attachments, packType);

    for (const attachment of filteredAttachments) {
      try {
        const filePath = join(uploadDir, attachment.fileName);

        // Check if file exists
        await fs.access(filePath);

        // Add file to archive with original name
        const folderName = this.getAttachmentFolder(attachment.type || 'GENERAL');
        const archivePath = `attachments/${folderName}/${attachment.fileName}`;

        archive.file(filePath, { name: archivePath });

        this.logger.debug(`Added attachment to archive: ${archivePath}`);
      } catch (err) {
        this.logger.warn(`Failed to add attachment ${attachment.id}: ${err.message}`);
      }
    }
  }

  /**
   * Filter attachments based on pack type
   *
   * @param attachments - All attachments
   * @param packType - Type of dossier pack
   * @returns Filtered attachments
   */
  private filterAttachmentsByPackType(
    attachments: any[],
    packType: DossierPackType,
  ): any[] {
    switch (packType) {
      case DossierPackType.FACULTY_ACCEPTANCE:
        // Include general and faculty acceptance attachments
        return attachments.filter(
          (a) => !a.type || a.type === 'GENERAL' || a.type === 'FACULTY_ACCEPTANCE',
        );

      case DossierPackType.SCHOOL_ACCEPTANCE:
        // Include all except handover
        return attachments.filter(
          (a) => a.type !== 'HANDOVER',
        );

      case DossierPackType.HANDOVER:
        // Include all attachments
        return attachments;

      case DossierPackType.FINAL:
        // Include all attachments
        return attachments;

      default:
        return attachments;
    }
  }

  /**
   * Get folder name for attachment type
   *
   * @param type - Attachment type
   * @returns Folder name
   */
  private getAttachmentFolder(type: string): string {
    const folderMap: Record<string, string> = {
      'GENERAL': 'tai_lieu_chung',
      'FACULTY_ACCEPTANCE': 'nghiem_thu_khoa',
      'SCHOOL_ACCEPTANCE': 'nghiem_thu_truong',
      'HANDOVER': 'ban_giao',
    };
    return folderMap[type] || 'khac';
  }

  /**
   * Translate project state to Vietnamese
   *
   * @param state - Project state
   * @returns Vietnamese text
   */
  private translateState(state: ProjectState): string {
    const stateMap: Record<ProjectState, string> = {
      [ProjectState.DRAFT]: 'Nháp',
      [ProjectState.FACULTY_REVIEW]: 'Xét duyệt Khoa',
      [ProjectState.SCHOOL_SELECTION_REVIEW]: 'Chọn Hội đồng',
      [ProjectState.OUTLINE_COUNCIL_REVIEW]: 'Họp Hội đồng',
      [ProjectState.CHANGES_REQUESTED]: 'Yêu cầu sửa',
      [ProjectState.APPROVED]: 'Đã duyệt',
      [ProjectState.REJECTED]: 'Đã từ chối',
      [ProjectState.IN_PROGRESS]: 'Đang thực hiện',
      [ProjectState.FACULTY_ACCEPTANCE_REVIEW]: 'Nghiệm thu Khoa',
      [ProjectState.SCHOOL_ACCEPTANCE_REVIEW]: 'Nghiệm thu Trường',
      [ProjectState.HANDOVER]: 'Bàn giao',
      [ProjectState.COMPLETED]: 'Hoàn thành',
      [ProjectState.CANCELLED]: 'Đã hủy',
      [ProjectState.WITHDRAWN]: 'Đã rút',
      [ProjectState.PAUSED]: 'Đã tạm dừng',
    };
    return stateMap[state] || state;
  }

  /**
   * Translate pack type to Vietnamese
   *
   * @param packType - Pack type
   * @returns Vietnamese text
   */
  private translatePackType(packType: DossierPackType): string {
    const typeMap: Record<DossierPackType, string> = {
      [DossierPackType.FACULTY_ACCEPTANCE]: 'Hồ sơ nghiệm thu cấp Khoa',
      [DossierPackType.SCHOOL_ACCEPTANCE]: 'Hồ sơ nghiệm thu cấp Trường',
      [DossierPackType.HANDOVER]: 'Hồ sơ bàn giao',
      [DossierPackType.FINAL]: 'Hồ sơ hoàn chỉnh',
    };
    return typeMap[packType] || packType;
  }

  /**
   * Cleanup expired ZIP files
   * Should be run periodically (e.g., via cron job)
   *
   * @param exportDir - Export directory path
   * @returns Number of files deleted
   */
  async cleanupExpiredFiles(exportDir: string = DEFAULT_EXPORT_DIR): Promise<number> {
    try {
      const files = await fs.readdir(exportDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.zip')) {
          continue;
        }

        const filePath = join(exportDir, file);
        const stats = await fs.stat(filePath);

        // Check if file is older than expiry hours
        const fileAge = now - stats.mtimeMs;
        const expiryMs = ZIP_EXPIRY_HOURS * 60 * 60 * 1000;

        if (fileAge > expiryMs) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.debug(`Deleted expired export file: ${file}`);
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} expired export files`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup expired files: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get dossier pack status
   * Check if a proposal is ready for a specific pack type
   *
   * @param proposalId - Proposal ID
   * @param packType - Type of dossier pack
   * @returns Status info
   */
  async getDossierPackStatus(
    proposalId: string,
    packType: DossierPackType,
  ): Promise<{
    ready: boolean;
    state: ProjectState;
    message: string;
  }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    if (!proposal) {
      return {
        ready: false,
        state: ProjectState.DRAFT,
        message: 'Đề tài không tồn tại',
      };
    }

    try {
      this.validateStateForPackType(proposal.state, packType);
      return {
        ready: true,
        state: proposal.state,
        message: 'Đã sẵn sàng xuất hồ sơ',
      };
    } catch (error) {
      return {
        ready: false,
        state: proposal.state,
        message: error.message || 'Chưa sẵn sàng xuất hồ sơ',
      };
    }
  }
}
