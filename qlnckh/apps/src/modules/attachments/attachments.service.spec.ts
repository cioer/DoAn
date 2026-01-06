import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectState, UserRole } from '@prisma/client';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

// Manual mock - bypass DI (following pattern from proposals.service.spec.ts)
const mockPrismaService = {
  attachment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  proposal: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock Audit Service
const mockAuditService = {
  logEvent: jest.fn().mockResolvedValue(undefined),
};

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('AttachmentsService', () => {
  let service: AttachmentsService;

  // Spy on saveFileToDisk method to avoid actual file I/O
  let saveFileToDiskSpy: jest.SpyInstance;

  // Manually create service with mocks (following pattern from proposals.service.spec.ts)
  beforeEach(() => {
    service = new AttachmentsService(
      mockPrismaService as any,
      mockAuditService as any,
    );

    // Mock saveFileToDisk to avoid actual file I/O
    saveFileToDiskSpy = jest
      .spyOn(service as any, 'saveFileToDisk')
      .mockResolvedValue(undefined);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
    saveFileToDiskSpy.mockRestore();
  });

  describe('uploadFile', () => {
    const mockProposal = {
      id: 'proposal-uuid',
      code: 'DT-001',
      title: 'Test Proposal',
      state: ProjectState.DRAFT,
      ownerId: 'owner-uuid',
      facultyId: 'faculty-uuid',
    };

    const mockFile = {
      originalname: 'document.pdf',
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test file content'),
    } as Express.Multer.File;

    const mockUserId = 'user-uuid';
    const mockUploadDir = '/uploads';

    it('should reject file larger than 5MB', async () => {
      // Arrange
      const largeFile = {
        ...mockFile,
        size: 6 * 1024 * 1024, // 6MB - over limit
      } as Express.Multer.File;

      mockPrismaService.proposal.findUnique.mockResolvedValue(mockProposal);

      // Act & Assert
      await expect(
        service.uploadFile('proposal-uuid', largeFile, mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new BadRequestException({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File quá 5MB. Vui lòng nén hoặc chia nhỏ.',
          },
        }),
      );
    });

    it('should reject file with invalid mime type', async () => {
      // Arrange
      const invalidFile = {
        originalname: 'document.zip', // Extension not allowed
        mimetype: 'application/zip', // MIME type not allowed
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from('test file content'),
      } as Express.Multer.File;

      mockPrismaService.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId, // Same as uploader
      });
      mockPrismaService.attachment.aggregate.mockResolvedValue({
        _sum: { fileSize: 0 },
      });

      // Act & Assert
      await expect(
        async () =>
          service.uploadFile('proposal-uuid', invalidFile, mockUserId, {
            uploadDir: mockUploadDir,
          }),
      ).rejects.toThrow(
        BadRequestException,
      );

      // Verify the error code
      try {
        await service.uploadFile('proposal-uuid', invalidFile, mockUserId, {
          uploadDir: mockUploadDir,
        });
      } catch (error) {
        expect((error as BadRequestException).response).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Định dạng file không được hỗ trợ.',
          },
        });
      }
    });

    it('should reject when total size exceeds 50MB', async () => {
      // Arrange - use a proposal where the user IS the owner
      mockPrismaService.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId, // Same as uploader
      });
      mockPrismaService.attachment.aggregate.mockResolvedValue({
        _sum: { fileSize: 49 * 1024 * 1024 }, // 49MB already used
      });

      const newFile = {
        ...mockFile,
        size: 2 * 1024 * 1024, // 2MB - would exceed 50MB
      } as Express.Multer.File;

      // Act & Assert
      await expect(
        service.uploadFile('proposal-uuid', newFile, mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new BadRequestException({
          success: false,
          error: {
            code: 'TOTAL_SIZE_EXCEEDED',
            message: 'Tổng dung lượng đã vượt giới hạn (50MB/proposal).',
          },
        }),
      );
    });

    it('should reject when proposal not found', async () => {
      // Arrange
      mockPrismaService.proposal.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.uploadFile('nonexistent-uuid', mockFile, mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new NotFoundException({
          success: false,
          error: {
            code: 'PROPOSAL_NOT_FOUND',
            message: 'Đề tài với ID không tồn tại',
          },
        }),
      );
    });

    it('should reject when proposal is not in DRAFT state', async () => {
      // Arrange
      const nonDraftProposal = {
        ...mockProposal,
        state: ProjectState.FACULTY_REVIEW,
      };

      mockPrismaService.proposal.findUnique.mockResolvedValue(nonDraftProposal);

      // Act & Assert
      await expect(
        service.uploadFile('proposal-uuid', mockFile, mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new BadRequestException({
          success: false,
          error: {
            code: 'PROPOSAL_NOT_DRAFT',
            message: 'Không thể tải lên khi hồ sơ không ở trạng thái nháp.',
          },
        }),
      );
    });

    it('should reject when user is not the owner', async () => {
      // Arrange
      const differentUserId = 'different-user-uuid';

      mockPrismaService.proposal.findUnique.mockResolvedValue(mockProposal);

      // Act & Assert
      await expect(
        service.uploadFile('proposal-uuid', mockFile, differentUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new ForbiddenException({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Bạn không có quyền tải tài liệu lên đề tài này.',
          },
        }),
      );
    });

    it('should upload valid file and create attachment record', async () => {
      // Arrange
      const createdAttachment = {
        id: 'attachment-uuid',
        proposalId: 'proposal-uuid',
        // The service generates UUID-prefixed filename
        fileName: expect.stringMatching(/^[a-f0-9-]+-document\.pdf$/),
        fileUrl: expect.stringMatching(/^\/uploads\/[a-f0-9-]+-document\.pdf$/),
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
        uploadedBy: mockUserId,
        uploadedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId, // Same as uploader
      });
      mockPrismaService.attachment.aggregate.mockResolvedValue({
        _sum: { fileSize: 0 },
      });
      mockPrismaService.attachment.create.mockResolvedValue(createdAttachment);

      // Act
      const result = await service.uploadFile(
        'proposal-uuid',
        mockFile,
        mockUserId,
        { uploadDir: mockUploadDir },
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: createdAttachment.id,
        proposalId: createdAttachment.proposalId,
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
        uploadedBy: mockUserId,
      }));

      expect(mockPrismaService.attachment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          proposalId: 'proposal-uuid',
          fileName: expect.stringMatching(/^[a-f0-9-]+-document\.pdf$/),
          fileSize: mockFile.size,
          mimeType: mockFile.mimetype,
          uploadedBy: mockUserId,
        }),
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.ATTACHMENT_UPLOAD,
        actorUserId: mockUserId,
        entityType: 'attachment',
        entityId: createdAttachment.id,
        metadata: expect.objectContaining({
          proposalId: 'proposal-uuid',
          fileName: expect.stringMatching(/^[a-f0-9-]+-document\.pdf$/),
          originalFileName: 'document.pdf',
          fileSize: mockFile.size,
        }),
      });
    });

    it('should generate unique file names with UUID', async () => {
      // Arrange
      const createdAttachment = {
        id: 'attachment-uuid',
        proposalId: 'proposal-uuid',
        fileName: 'uuid-document.pdf',
        fileUrl: '/uploads/uuid-document.pdf',
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
        uploadedBy: mockUserId,
        uploadedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockPrismaService.attachment.aggregate.mockResolvedValue({
        _sum: { fileSize: 0 },
      });
      mockPrismaService.attachment.create.mockResolvedValue(createdAttachment);

      // Act
      await service.uploadFile('proposal-uuid', mockFile, mockUserId, {
        uploadDir: mockUploadDir,
      });

      // Assert - verify file name is prefixed with UUID
      const createCall = mockPrismaService.attachment.create.mock.calls[0][0];
      // Should match pattern: UUID-document.pdf
      expect(createCall.data.fileName).toMatch(
        /^[a-f0-9-]+-document\.pdf$/,
      );
    });

    it('should handle files with multiple extensions correctly', async () => {
      // Arrange
      const fileWithMultipleDots = {
        ...mockFile,
        originalname: 'my.document.backup.pdf',
      } as Express.Multer.File;

      const createdAttachment = {
        id: 'attachment-uuid',
        proposalId: 'proposal-uuid',
        fileName: 'uuid-my.document.backup.pdf',
        fileUrl: '/uploads/uuid-my.document.backup.pdf',
        fileSize: fileWithMultipleDots.size,
        mimeType: fileWithMultipleDots.mimetype,
        uploadedBy: mockUserId,
        uploadedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.proposal.findUnique.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockPrismaService.attachment.aggregate.mockResolvedValue({
        _sum: { fileSize: 0 },
      });
      mockPrismaService.attachment.create.mockResolvedValue(createdAttachment);

      // Act
      await service.uploadFile(
        'proposal-uuid',
        fileWithMultipleDots,
        mockUserId,
        { uploadDir: mockUploadDir },
      );

      // Assert - should preserve original filename with UUID prefix
      const createCall = mockPrismaService.attachment.create.mock.calls[0][0];
      expect(createCall.data.fileName).toContain('.pdf');
      expect(createCall.data.fileName).toContain('my.document.backup');
      // Should have UUID prefix - original filename - .pdf extension
      expect(createCall.data.fileName).toMatch(/^[a-f0-9-]+-my\.document\.backup\.pdf$/);
    });
  });

  describe('getByProposalId', () => {
    it('should return list of attachments for proposal', async () => {
      // Arrange
      const mockAttachments = [
        {
          id: 'attachment-1',
          proposalId: 'proposal-uuid',
          fileName: 'document1.pdf',
          fileUrl: '/uploads/uuid-document1.pdf',
          fileSize: 1024 * 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-uuid',
          uploadedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'attachment-2',
          proposalId: 'proposal-uuid',
          fileName: 'document2.pdf',
          fileUrl: '/uploads/uuid-document2.pdf',
          fileSize: 2 * 1024 * 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-uuid',
          uploadedAt: new Date(),
          deletedAt: null,
        },
      ];

      mockPrismaService.attachment.findMany.mockResolvedValue(mockAttachments);

      // Act
      const result = await service.getByProposalId('proposal-uuid');

      // Assert - result is array-like with totalSize property
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].fileName).toBe('document1.pdf');
      expect(result[1].fileName).toBe('document2.pdf');
      expect((result as typeof result & { totalSize: number }).totalSize).toBe(3 * 1024 * 1024); // 3MB total
    });

    it('should exclude soft-deleted attachments', async () => {
      // Arrange
      const mockAttachments = [
        {
          id: 'attachment-1',
          proposalId: 'proposal-uuid',
          fileName: 'document1.pdf',
          fileUrl: '/uploads/uuid-document1.pdf',
          fileSize: 1024 * 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-uuid',
          uploadedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'attachment-2',
          proposalId: 'proposal-uuid',
          fileName: 'document2.pdf',
          fileUrl: '/uploads/uuid-document2.pdf',
          fileSize: 2 * 1024 * 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-uuid',
          uploadedAt: new Date(),
          deletedAt: new Date(), // Soft-deleted
        },
      ];

      mockPrismaService.attachment.findMany.mockResolvedValue(mockAttachments);

      // Act
      const result = await service.getByProposalId('proposal-uuid');

      // Assert - should return all attachments (filtering happens at query level)
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      // Note: The service relies on Prisma query to filter deletedAt, not post-filter
      expect(mockPrismaService.attachment.findMany).toHaveBeenCalledWith({
        where: {
          proposalId: 'proposal-uuid',
          deletedAt: null,
        },
        orderBy: {
          uploadedAt: 'desc',
        },
      });
    });

    it('should return empty array when no attachments found', async () => {
      // Arrange
      mockPrismaService.attachment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getByProposalId('proposal-uuid');

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect((result as typeof result & { totalSize: number }).totalSize).toBe(0);
    });
  });
});
