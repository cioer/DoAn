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
import {
  AttachmentValidationService,
  AttachmentStorageService,
  AttachmentQueryService,
} from './services';

// Manual mock - bypass DI (following pattern from proposals.service.spec.ts)
const mockPrismaService = {
  attachment: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  proposal: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock Audit Service
const mockAuditService = {
  logEvent: vi.fn().mockResolvedValue(undefined),
};

// Mock Validation Service
const mockValidationService = {
  DEFAULT_MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  DEFAULT_MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
  validateFileSize: vi.fn(),
  validateFileType: vi.fn(),
  validateTotalSize: vi.fn(),
  generateUniqueFilename: vi.fn(),
};

// Mock Storage Service
const mockStorageService = {
  DEFAULT_UPLOAD_DIR: '/tmp/qlnckh-uploads',
  saveFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  buildFilePath: vi.fn(),
  buildFileUrl: vi.fn(),
};

// Mock Query Service
const mockQueryService = {
  getProposalForValidation: vi.fn(),
  getAttachmentById: vi.fn(),
  getByProposalId: vi.fn(),
  getTotalSize: vi.fn(),
  createAttachment: vi.fn(),
  updateAttachment: vi.fn(),
  softDeleteAttachment: vi.fn(),
};

describe('AttachmentsService', () => {
  let service: AttachmentsService;

  // Manually create service with mocks (following pattern from proposals.service.spec.ts)
  beforeEach(() => {
    service = new AttachmentsService(
      mockPrismaService as any,
      mockAuditService as any,
      mockValidationService as any,
      mockStorageService as any,
      mockQueryService as any,
    );

    // Default mock implementations
    mockStorageService.buildFilePath.mockImplementation((filename: string, uploadDir: string) => {
      return `${uploadDir}/${filename}`;
    });

    mockStorageService.buildFileUrl.mockImplementation((filename: string) => {
      return `/uploads/${filename}`;
    });

    mockValidationService.generateUniqueFilename.mockImplementation((originalName: string) => {
      return `uuid-${originalName}`;
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

      mockValidationService.validateFileSize.mockReturnValue('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');

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

      expect(mockValidationService.validateFileSize).toHaveBeenCalledWith(
        largeFile.size,
        mockValidationService.DEFAULT_MAX_FILE_SIZE,
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

      mockValidationService.validateFileSize.mockReturnValue(null);
      mockValidationService.validateFileType.mockReturnValue('Định dạng file không được hỗ trợ.');
      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId, // Same as uploader
      });
      mockQueryService.getTotalSize.mockResolvedValue(0);

      // Act & Assert
      await expect(
        service.uploadFile('proposal-uuid', invalidFile, mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Định dạng file không được hỗ trợ.',
          },
        }),
      );

      expect(mockValidationService.validateFileType).toHaveBeenCalledWith(
        invalidFile.mimetype,
        invalidFile.originalname,
      );
    });

    it('should reject when total size exceeds 50MB', async () => {
      // Arrange - use a proposal where the user IS the owner
      mockValidationService.validateFileSize.mockReturnValue(null);
      mockValidationService.validateFileType.mockReturnValue(null);
      mockValidationService.validateTotalSize.mockReturnValue('Tổng dung lượng đã vượt giới hạn (50MB/proposal).');
      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId, // Same as uploader
      });
      mockQueryService.getTotalSize.mockResolvedValue(49 * 1024 * 1024); // 49MB already used

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

      expect(mockValidationService.validateTotalSize).toHaveBeenCalledWith(
        49 * 1024 * 1024,
        newFile.size,
        mockValidationService.DEFAULT_MAX_TOTAL_SIZE,
      );
    });

    it('should reject when proposal not found', async () => {
      // Arrange
      mockValidationService.validateFileSize.mockReturnValue(null);
      mockQueryService.getProposalForValidation.mockResolvedValue(null);

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
        state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      };

      mockValidationService.validateFileSize.mockReturnValue(null);
      mockQueryService.getProposalForValidation.mockResolvedValue(nonDraftProposal);

      // Act & Assert
      await expect(
        service.uploadFile('proposal-uuid', mockFile, mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new ForbiddenException({
          success: false,
          error: {
            code: 'PROPOSAL_NOT_DRAFT',
            message: 'Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.',
          },
        }),
      );
    });

    it('should reject when user is not the owner', async () => {
      // Arrange
      const differentUserId = 'different-user-uuid';

      mockValidationService.validateFileSize.mockReturnValue(null);
      mockQueryService.getProposalForValidation.mockResolvedValue(mockProposal);

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
            message: 'Bạn không có quyền thay thế tài liệu của đề tài này.',
          },
        }),
      );
    });

    it('should upload valid file and create attachment record', async () => {
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

      mockValidationService.validateFileSize.mockReturnValue(null);
      mockValidationService.validateFileType.mockReturnValue(null);
      mockValidationService.validateTotalSize.mockReturnValue(null);
      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId, // Same as uploader
      });
      mockQueryService.getTotalSize.mockResolvedValue(0);
      mockQueryService.createAttachment.mockResolvedValue(createdAttachment);

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

      expect(mockStorageService.saveFile).toHaveBeenCalledWith(
        `${mockUploadDir}/uuid-document.pdf`,
        mockFile.buffer,
        30000,
      );

      expect(mockQueryService.createAttachment).toHaveBeenCalledWith({
        proposalId: 'proposal-uuid',
        fileName: 'uuid-document.pdf',
        fileUrl: '/uploads/uuid-document.pdf',
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
        uploadedBy: mockUserId,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.ATTACHMENT_UPLOAD,
        actorUserId: mockUserId,
        entityType: 'attachment',
        entityId: createdAttachment.id,
        metadata: expect.objectContaining({
          proposalId: 'proposal-uuid',
          proposalCode: 'DT-001',
          fileName: 'uuid-document.pdf',
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

      mockValidationService.validateFileSize.mockReturnValue(null);
      mockValidationService.validateFileType.mockReturnValue(null);
      mockValidationService.validateTotalSize.mockReturnValue(null);
      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getTotalSize.mockResolvedValue(0);
      mockQueryService.createAttachment.mockResolvedValue(createdAttachment);

      // Act
      await service.uploadFile('proposal-uuid', mockFile, mockUserId, {
        uploadDir: mockUploadDir,
      });

      // Assert - verify unique filename generation
      expect(mockValidationService.generateUniqueFilename).toHaveBeenCalledWith('document.pdf');
      expect(mockStorageService.buildFilePath).toHaveBeenCalledWith('uuid-document.pdf', mockUploadDir);
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

      mockValidationService.validateFileSize.mockReturnValue(null);
      mockValidationService.validateFileType.mockReturnValue(null);
      mockValidationService.validateTotalSize.mockReturnValue(null);
      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getTotalSize.mockResolvedValue(0);
      mockQueryService.createAttachment.mockResolvedValue(createdAttachment);

      // Act
      await service.uploadFile(
        'proposal-uuid',
        fileWithMultipleDots,
        mockUserId,
        { uploadDir: mockUploadDir },
      );

      // Assert - should preserve original filename with UUID prefix
      expect(mockValidationService.generateUniqueFilename).toHaveBeenCalledWith('my.document.backup.pdf');
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

      mockQueryService.getByProposalId.mockResolvedValue(
        Object.assign(mockAttachments, { totalSize: 3 * 1024 * 1024 }),
      );

      // Act
      const result = await service.getByProposalId('proposal-uuid');

      // Assert - result is array-like with totalSize property
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].fileName).toBe('document1.pdf');
      expect(result[1].fileName).toBe('document2.pdf');
      expect((result as typeof result & { totalSize: number }).totalSize).toBe(3 * 1024 * 1024); // 3MB total
      expect(mockQueryService.getByProposalId).toHaveBeenCalledWith('proposal-uuid');
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
      ];

      mockQueryService.getByProposalId.mockResolvedValue(
        Object.assign(mockAttachments, { totalSize: 1024 * 1024 }),
      );

      // Act
      const result = await service.getByProposalId('proposal-uuid');

      // Assert - should return non-deleted attachments
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(mockQueryService.getByProposalId).toHaveBeenCalledWith('proposal-uuid');
    });

    it('should return empty array when no attachments found', async () => {
      // Arrange
      mockQueryService.getByProposalId.mockResolvedValue(
        Object.assign([], { totalSize: 0 }),
      );

      // Act
      const result = await service.getByProposalId('proposal-uuid');

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect((result as typeof result & { totalSize: number }).totalSize).toBe(0);
    });
  });

  // Story 2.5: Attachment CRUD - Replace
  describe('replaceAttachment', () => {
    const mockProposal = {
      id: 'proposal-uuid',
      code: 'DT-001',
      title: 'Test Proposal',
      state: ProjectState.DRAFT,
      ownerId: 'owner-uuid',
      facultyId: 'faculty-uuid',
    };

    const mockExistingAttachment = {
      id: 'attachment-uuid',
      proposalId: 'proposal-uuid',
      fileName: 'old-document.pdf',
      fileUrl: '/uploads/old-document.pdf',
      fileSize: 1024 * 1024, // 1MB
      mimeType: 'application/pdf',
      uploadedBy: 'owner-uuid',
      uploadedAt: new Date(),
      deletedAt: null,
    };

    const mockNewFile = {
      originalname: 'new-document.pdf',
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('new test file content'),
    } as Express.Multer.File;

    const mockUserId = 'owner-uuid';
    const mockUploadDir = '/uploads';

    it('should reject when proposal is not in DRAFT state', async () => {
      // Arrange
      const nonDraftProposal = {
        ...mockProposal,
        state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      };

      mockQueryService.getProposalForValidation.mockResolvedValue(nonDraftProposal);

      // Act & Assert
      await expect(
        service.replaceAttachment(
          'proposal-uuid',
          'attachment-uuid',
          mockNewFile,
          mockUserId,
          { uploadDir: mockUploadDir },
        ),
      ).rejects.toThrow(
        new ForbiddenException({
          success: false,
          error: {
            code: 'PROPOSAL_NOT_DRAFT',
            message: 'Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.',
          },
        }),
      );
    });

    it('should reject when attachment not found', async () => {
      // Arrange
      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getAttachmentById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.replaceAttachment(
          'proposal-uuid',
          'nonexistent-attachment',
          mockNewFile,
          mockUserId,
          { uploadDir: mockUploadDir },
        ),
      ).rejects.toThrow(
        new NotFoundException({
          success: false,
          error: {
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Tài liệu không tồn tại hoặc đã bị xóa.',
          },
        }),
      );
    });

    it('should reject when attachment already soft-deleted', async () => {
      // Arrange
      const deletedAttachment = {
        ...mockExistingAttachment,
        deletedAt: new Date(),
      };

      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getAttachmentById.mockResolvedValue(deletedAttachment);

      // Act & Assert
      await expect(
        service.replaceAttachment(
          'proposal-uuid',
          'attachment-uuid',
          mockNewFile,
          mockUserId,
          { uploadDir: mockUploadDir },
        ),
      ).rejects.toThrow(
        new NotFoundException({
          success: false,
          error: {
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Tài liệu không tồn tại hoặc đã bị xóa.',
          },
        }),
      );
    });

    it('should reject when user is not the owner', async () => {
      // Arrange
      const differentUserId = 'different-user-uuid';

      mockQueryService.getProposalForValidation.mockResolvedValue(mockProposal);
      mockQueryService.getAttachmentById.mockResolvedValue(
        mockExistingAttachment,
      );

      // Act & Assert
      await expect(
        service.replaceAttachment(
          'proposal-uuid',
          'attachment-uuid',
          mockNewFile,
          differentUserId,
          { uploadDir: mockUploadDir },
        ),
      ).rejects.toThrow(
        new ForbiddenException({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Bạn không có quyền thay thế tài liệu của đề tài này.',
          },
        }),
      );
    });

    it('should reject when new file is too large', async () => {
      // Arrange
      const largeFile = {
        ...mockNewFile,
        size: 6 * 1024 * 1024, // 6MB - over limit
      } as Express.Multer.File;

      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getAttachmentById.mockResolvedValue(
        mockExistingAttachment,
      );
      mockValidationService.validateFileSize.mockReturnValue('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');

      // Act & Assert
      await expect(
        service.replaceAttachment(
          'proposal-uuid',
          'attachment-uuid',
          largeFile,
          mockUserId,
          { uploadDir: mockUploadDir },
        ),
      ).rejects.toThrow(
        new BadRequestException({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File quá 5MB. Vui lòng nén hoặc chia nhỏ.',
          },
        }),
      );

      expect(mockValidationService.validateFileSize).toHaveBeenCalledWith(
        largeFile.size,
        mockValidationService.DEFAULT_MAX_FILE_SIZE,
      );
    });

    it('should replace file and update attachment record', async () => {
      // Arrange
      const updatedAttachment = {
        ...mockExistingAttachment,
        fileName: 'uuid-new-document.pdf',
        fileUrl: '/uploads/uuid-new-document.pdf',
        fileSize: mockNewFile.size,
        mimeType: mockNewFile.mimetype,
        uploadedBy: mockUserId,
        uploadedAt: new Date(),
      };

      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getAttachmentById.mockResolvedValue(
        mockExistingAttachment,
      );
      mockValidationService.validateFileSize.mockReturnValue(null);
      mockValidationService.validateFileType.mockReturnValue(null);
      mockQueryService.updateAttachment.mockResolvedValue(updatedAttachment);

      // Act
      const result = await service.replaceAttachment(
        'proposal-uuid',
        'attachment-uuid',
        mockNewFile,
        mockUserId,
        { uploadDir: mockUploadDir },
      );

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: mockExistingAttachment.id,
        proposalId: mockExistingAttachment.proposalId,
        fileSize: mockNewFile.size,
        mimeType: mockNewFile.mimetype,
        uploadedBy: mockUserId,
      }));

      // Verify old file was deleted
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        mockExistingAttachment.fileUrl,
        mockUploadDir,
      );

      // Verify new file was saved
      expect(mockStorageService.saveFile).toHaveBeenCalledWith(
        `${mockUploadDir}/uuid-new-document.pdf`,
        mockNewFile.buffer,
        30000,
      );

      // Verify audit event was logged
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.ATTACHMENT_REPLACE,
        actorUserId: mockUserId,
        entityType: 'attachment',
        entityId: mockExistingAttachment.id,
        metadata: expect.objectContaining({
          proposalId: 'proposal-uuid',
          proposalCode: 'DT-001',
          attachmentId: 'attachment-uuid',
          oldFileName: 'old-document.pdf',
          newFileName: 'uuid-new-document.pdf',
        }),
      });
    });
  });

  // Story 2.5: Attachment CRUD - Delete
  describe('deleteAttachment', () => {
    const mockProposal = {
      id: 'proposal-uuid',
      code: 'DT-001',
      title: 'Test Proposal',
      state: ProjectState.DRAFT,
      ownerId: 'owner-uuid',
      facultyId: 'faculty-uuid',
    };

    const mockAttachment = {
      id: 'attachment-uuid',
      proposalId: 'proposal-uuid',
      fileName: 'document.pdf',
      fileUrl: '/uploads/document.pdf',
      fileSize: 1024 * 1024, // 1MB
      mimeType: 'application/pdf',
      uploadedBy: 'owner-uuid',
      uploadedAt: new Date(),
      deletedAt: null,
    };

    const mockUserId = 'owner-uuid';
    const mockUploadDir = '/uploads';

    it('should reject when proposal is not in DRAFT state', async () => {
      // Arrange
      const nonDraftProposal = {
        ...mockProposal,
        state: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
      };

      mockQueryService.getProposalForValidation.mockResolvedValue(nonDraftProposal);

      // Act & Assert
      await expect(
        service.deleteAttachment('proposal-uuid', 'attachment-uuid', mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new ForbiddenException({
          success: false,
          error: {
            code: 'PROPOSAL_NOT_DRAFT',
            message: 'Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.',
          },
        }),
      );
    });

    it('should reject when attachment not found', async () => {
      // Arrange
      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getAttachmentById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteAttachment('proposal-uuid', 'nonexistent-attachment', mockUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new NotFoundException({
          success: false,
          error: {
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Tài liệu không tồn tại hoặc đã bị xóa.',
          },
        }),
      );
    });

    it('should reject when user is not the owner', async () => {
      // Arrange
      const differentUserId = 'different-user-uuid';

      mockQueryService.getProposalForValidation.mockResolvedValue(mockProposal);
      mockQueryService.getAttachmentById.mockResolvedValue(mockAttachment);

      // Act & Assert
      await expect(
        service.deleteAttachment('proposal-uuid', 'attachment-uuid', differentUserId, {
          uploadDir: mockUploadDir,
        }),
      ).rejects.toThrow(
        new ForbiddenException({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Bạn không có quyền thay thế tài liệu của đề tài này.',
          },
        }),
      );
    });

    it('should soft delete attachment record', async () => {
      // Arrange
      const deletedAttachment = {
        ...mockAttachment,
        deletedAt: new Date(),
      };

      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getAttachmentById.mockResolvedValue(mockAttachment);
      mockQueryService.softDeleteAttachment.mockResolvedValue(deletedAttachment);

      // Act
      const result = await service.deleteAttachment(
        'proposal-uuid',
        'attachment-uuid',
        mockUserId,
        { uploadDir: mockUploadDir },
      );

      // Assert
      expect(result).toEqual({
        id: mockAttachment.id,
        deletedAt: deletedAttachment.deletedAt,
      });

      // Verify soft delete was called
      expect(mockQueryService.softDeleteAttachment).toHaveBeenCalledWith('attachment-uuid');

      // Verify physical file was deleted
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        mockAttachment.fileUrl,
        mockUploadDir,
      );

      // Verify audit event was logged
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.ATTACHMENT_DELETE,
        actorUserId: mockUserId,
        entityType: 'attachment',
        entityId: mockAttachment.id,
        metadata: expect.objectContaining({
          proposalId: 'proposal-uuid',
          proposalCode: 'DT-001',
          attachmentId: 'attachment-uuid',
          fileName: 'document.pdf',
          fileSize: mockAttachment.fileSize,
        }),
      });
    });

    it('should handle file deletion errors gracefully', async () => {
      // Arrange - simulate file deletion error
      mockStorageService.deleteFile.mockRejectedValue(new Error('File not found'));

      const deletedAttachment = {
        ...mockAttachment,
        deletedAt: new Date(),
      };

      mockQueryService.getProposalForValidation.mockResolvedValue({
        ...mockProposal,
        ownerId: mockUserId,
      });
      mockQueryService.getAttachmentById.mockResolvedValue(mockAttachment);
      mockQueryService.softDeleteAttachment.mockResolvedValue(deletedAttachment);

      // Act - should not throw even if file deletion fails
      const result = await service.deleteAttachment(
        'proposal-uuid',
        'attachment-uuid',
        mockUserId,
        { uploadDir: mockUploadDir },
      );

      // Assert - soft delete should still succeed
      expect(result).toEqual({
        id: mockAttachment.id,
        deletedAt: deletedAttachment.deletedAt,
      });

      // Verify audit event was still logged
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });
  });
});
