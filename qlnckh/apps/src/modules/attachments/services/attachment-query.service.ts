import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';

/**
 * Attachment Query Service
 *
 * Handles data fetching for attachments.
 * Extracted from attachments.service.ts for separation of concerns.
 *
 * Phase 3 Refactor: Extract query operations
 */
@Injectable()
export class AttachmentQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get proposal for validation
   *
   * @param proposalId - Proposal ID
   * @returns Proposal with id, code, state, ownerId
   */
  async getProposalForValidation(proposalId: string) {
    return this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        state: true,
        ownerId: true,
      },
    });
  }

  /**
   * Get attachment by ID
   *
   * @param attachmentId - Attachment ID
   * @returns Attachment or null
   */
  async getAttachmentById(attachmentId: string) {
    return this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
  }

  /**
   * Get all attachments for a proposal
   *
   * @param proposalId - Proposal ID
   * @returns Array of attachments with total size
   */
  async getByProposalId(proposalId: string): Promise<
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
   * Get total file size for a proposal
   *
   * @param proposalId - Proposal ID
   * @returns Total file size in bytes
   */
  async getTotalSize(proposalId: string): Promise<number> {
    const result = await this.prisma.attachment.aggregate({
      where: {
        proposalId,
        deletedAt: null,
      },
      _sum: {
        fileSize: true,
      },
    });

    return result._sum.fileSize || 0;
  }

  /**
   * Create attachment record
   *
   * @param data - Attachment data
   * @returns Created attachment
   */
  async createAttachment(data: {
    proposalId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
  }) {
    return this.prisma.attachment.create({
      data,
    });
  }

  /**
   * Update attachment record
   *
   * @param attachmentId - Attachment ID
   * @param data - Update data
   * @returns Updated attachment
   */
  async updateAttachment(
    attachmentId: string,
    data: {
      fileName?: string;
      fileUrl?: string;
      fileSize?: number;
      mimeType?: string;
      uploadedBy?: string;
      uploadedAt?: Date;
    },
  ) {
    return this.prisma.attachment.update({
      where: { id: attachmentId },
      data,
    });
  }

  /**
   * Soft delete attachment
   *
   * @param attachmentId - Attachment ID
   * @returns Updated attachment with deletedAt timestamp
   */
  async softDeleteAttachment(attachmentId: string) {
    return this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
  }
}
