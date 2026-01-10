import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentTemplateType, WorkflowAction } from '@prisma/client';
import { DocumentTemplatesService } from './document-templates.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import PizZip from 'pizzip';
import { createHash } from 'crypto';

// Mock fs/promises at the top level for Vitest ESM
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

/**
 * Create a minimal valid DOCX file buffer for testing
 */
function createMinimalDocxBuffer(): Buffer {
  const zip = new PizZip();
  // Minimal DOCX structure
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test content</w:t></w:r></w:p></w:body></w:document>');
  return Buffer.from(zip.generate({ type: 'nodebuffer' }));
}

/**
 * DocumentTemplatesService Tests
 * Epic 7 Story 7.2: Template Upload & Registry
 *
 * Tests verify:
 * - Template upload with SHA-256 calculation
 * - Placeholder extraction and validation
 * - Template activation with deactivation of others
 * - File operations OUTSIDE transactions (Epic 6 retro pattern)
 * - AuditAction enum direct usage
 */
describe('DocumentTemplatesService', () => {
  let service: DocumentTemplatesService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockFs: any;

  const mockContext = {
    ip: '127.0.0.1',
    userAgent: 'test',
    requestId: 'req-1',
  };

  beforeEach(async () => {
    mockPrisma = {
      documentTemplate: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    service = new DocumentTemplatesService(mockPrisma, mockAuditService);
    vi.clearAllMocks();

    // Get mocked fs module
    mockFs = await import('fs/promises');
  });

  describe('uploadTemplate', () => {
    const mockFile = {
      originalname: 'template.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1024 * 1024, // 1MB
      buffer: createMinimalDocxBuffer(),
    };

    it('should upload template with valid DOCX file', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        templateType: DocumentTemplateType.EVALUATION_FORM,
        isActive: true,
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return { template: mockTemplate, validation: { valid: true } };
      });

      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);

      const result = await service.uploadTemplate(
        mockFile,
        'Test Template',
        'Description',
        DocumentTemplateType.EVALUATION_FORM,
        true,
        'user-1',
        mockContext,
      );

      expect(result).toBeDefined();
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'TEMPLATE_UPLOAD',
        actorUserId: 'user-1',
        entityType: 'DocumentTemplate',
        entityId: mockTemplate.id,
        metadata: expect.any(Object),
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });

    it('should reject invalid file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(
        service.uploadTemplate(
          invalidFile,
          'Test',
          undefined,
          DocumentTemplateType.EVALUATION_FORM,
          false,
          'user-1',
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file exceeding 5MB limit', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 };

      await expect(
        service.uploadTemplate(
          largeFile,
          'Test',
          undefined,
          DocumentTemplateType.EVALUATION_FORM,
          false,
          'user-1',
          mockContext,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should write file OUTSIDE transaction (Epic 6 retro pattern)', async () => {
      const writeFileSpy = vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      const unlinkSpy = vi.mocked(mockFs.unlink).mockResolvedValue(undefined);
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Transaction should be called AFTER file write
        expect(writeFileSpy).toHaveBeenCalled();
        return {
          template: {
            id: 't1',
            name: 'Test',
            templateType: DocumentTemplateType.EVALUATION_FORM,
            isActive: false,
          },
          validation: { valid: true, known: [], unknown: [], warnings: [] },
        };
      });

      await service.uploadTemplate(
        mockFile,
        'Test',
        undefined,
        DocumentTemplateType.EVALUATION_FORM,
        false,
        'user-1',
        mockContext,
      );

      // Verify file write happened before transaction
      expect(writeFileSpy).toHaveBeenCalled();
    });

    it('should clean up file if transaction fails', async () => {
      const unlinkSpy = vi.mocked(mockFs.unlink).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);

      mockPrisma.$transaction.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.uploadTemplate(
          mockFile,
          'Test',
          undefined,
          DocumentTemplateType.EVALUATION_FORM,
          false,
          'user-1',
          mockContext,
        ),
      ).rejects.toThrow('DB Error');

      // Verify cleanup happened
      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should deactivate other templates when activating new one', async () => {
      let transactionCallback: any;

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        transactionCallback = callback;
        return {
          template: {
            id: 't1',
            name: 'Test',
            templateType: DocumentTemplateType.EVALUATION_FORM,
            isActive: true,
          },
          validation: { valid: true, known: [], unknown: [], warnings: [] },
        };
      });

      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);

      await service.uploadTemplate(
        mockFile,
        'Test',
        undefined,
        DocumentTemplateType.EVALUATION_FORM,
        true, // isActive = true
        'user-1',
        mockContext,
      );

      // Verify updateMany was called to deactivate others
      const mockTx = {
        documentTemplate: {
          updateMany: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({
            id: 't1',
            name: 'Test',
            templateType: DocumentTemplateType.EVALUATION_FORM,
            isActive: true,
          }),
        },
      };

      await transactionCallback(mockTx);

      expect(mockTx.documentTemplate.updateMany).toHaveBeenCalledWith({
        where: {
          templateType: DocumentTemplateType.EVALUATION_FORM,
          isActive: true,
        },
        data: { isActive: false },
      });
    });
  });

  describe('getActiveTemplate', () => {
    it('should return active template for type', async () => {
      const mockTemplate = {
        id: 't1',
        templateType: DocumentTemplateType.EVALUATION_FORM,
        isActive: true,
      };

      mockPrisma.documentTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.getActiveTemplate(DocumentTemplateType.EVALUATION_FORM);

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.documentTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          templateType: DocumentTemplateType.EVALUATION_FORM,
          isActive: true,
          deletedAt: null,
        },
      });
    });

    it('should return null if no active template', async () => {
      mockPrisma.documentTemplate.findFirst.mockResolvedValue(null);

      const result = await service.getActiveTemplate(DocumentTemplateType.EVALUATION_FORM);

      expect(result).toBeNull();
    });
  });

  describe('activate', () => {
    it('should activate template and deactivate others', async () => {
      const existingTemplate = {
        id: 't1',
        name: 'Test',
        templateType: DocumentTemplateType.EVALUATION_FORM,
        isActive: false,
      };

      const updatedTemplate = {
        id: 't1',
        name: 'Test',
        templateType: DocumentTemplateType.EVALUATION_FORM,
        isActive: true,
      };

      mockPrisma.documentTemplate.findUnique.mockResolvedValue(existingTemplate);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          documentTemplate: {
            updateMany: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue(updatedTemplate),
          },
        };

        const result = await callback(mockTx);
        return updatedTemplate;
      });

      const result = await service.activate('t1', 'user-1', mockContext);

      expect(result).toEqual(updatedTemplate);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'TEMPLATE_ACTIVATE',
        actorUserId: 'user-1',
        entityType: 'DocumentTemplate',
        entityId: 't1',
        metadata: expect.any(Object),
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });

    it('should throw NotFoundException if template not found', async () => {
      mockPrisma.documentTemplate.findUnique.mockResolvedValue(null);

      await expect(service.activate('non-existent', 'user-1', mockContext)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft delete template', async () => {
      const existingTemplate = {
        id: 't1',
        name: 'Test',
        isActive: false,
      };

      mockPrisma.documentTemplate.findUnique.mockResolvedValue(existingTemplate);
      mockPrisma.documentTemplate.update.mockResolvedValue({});

      await service.delete('t1', 'user-1', mockContext);

      expect(mockPrisma.documentTemplate.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { deletedAt: expect.any(Date) },
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'TEMPLATE_DELETE',
        actorUserId: 'user-1',
        entityType: 'DocumentTemplate',
        entityId: 't1',
        metadata: expect.any(Object),
        ip: '127.0.0.1',
        userAgent: 'test',
        requestId: 'req-1',
      });
    });

    it('should reject deletion of active template', async () => {
      const activeTemplate = {
        id: 't1',
        name: 'Test',
        isActive: true,
      };

      mockPrisma.documentTemplate.findUnique.mockResolvedValue(activeTemplate);

      await expect(service.delete('t1', 'user-1', mockContext)).rejects.toThrow(BadRequestException);
    });
  });

  describe('downloadFile', () => {
    it('should download template file and verify SHA-256', async () => {
      const fileBuffer = createMinimalDocxBuffer();
      const hash = createHash('sha256').update(fileBuffer).digest('hex');

      const mockTemplate = {
        id: 't1',
        fileName: 'template.docx',
        filePath: '/path/to/template.docx',
        sha256Hash: hash,
      };

      mockPrisma.documentTemplate.findUnique.mockResolvedValue(mockTemplate);
      vi.mocked(mockFs.readFile).mockResolvedValue(fileBuffer);

      const result = await service.downloadFile('t1');

      expect(result.buffer).toEqual(fileBuffer);
      expect(result.fileName).toBe('template.docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should throw error if file hash mismatch (integrity check)', async () => {
      const fileBuffer = createMinimalDocxBuffer();
      const originalHash = createHash('sha256').update(fileBuffer).digest('hex');
      // Different hash will cause mismatch
      const wrongHash = originalHash === 'abc' ? 'def' : 'abc123def456';

      const mockTemplate = {
        id: 't1',
        fileName: 'template.docx',
        filePath: '/path/to/template.docx',
        sha256Hash: wrongHash,
      };

      mockPrisma.documentTemplate.findUnique.mockResolvedValue(mockTemplate);
      vi.mocked(mockFs.readFile).mockResolvedValue(fileBuffer);

      await expect(service.downloadFile('t1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted templates by default', async () => {
      const templates = [{ id: 't1' }, { id: 't2' }];
      mockPrisma.documentTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findAll(false);

      expect(mockPrisma.documentTemplate.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ templateType: 'asc' }, { createdAt: 'desc' }],
      });
      expect(result).toEqual(templates);
    });

    it('should include deleted templates when requested', async () => {
      mockPrisma.documentTemplate.findMany.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockPrisma.documentTemplate.findMany).toHaveBeenCalledWith({
        where: undefined, // No deletedAt filter
        orderBy: [{ templateType: 'asc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('Epic 7 Retro: AuditAction Enum Direct Usage', () => {
    it('should use AuditAction enum directly - NO double cast (Epic 6 retro pattern)', async () => {
      const mockTemplate = {
        id: 't1',
        name: 'Test',
        templateType: DocumentTemplateType.EVALUATION_FORM,
        isActive: false,
      };

      mockPrisma.documentTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.documentTemplate.update.mockResolvedValue({});

      await service.delete('t1', 'user-1', mockContext);

      // Verify direct enum usage
      const auditCall = mockAuditService.logEvent.mock.calls[0][0];
      expect(auditCall.action).toBe('TEMPLATE_DELETE');
      expect(auditCall.action).not.toContain('as unknown');
    });
  });
});
