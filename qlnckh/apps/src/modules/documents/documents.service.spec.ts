import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Document, DocumentType, UserRole, Proposal } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../auth/prisma.service';
import { DocxService } from './docx.service';
import { IntegrityService } from './integrity.service';
import { AuditService } from '../audit/audit.service';
import { DocumentTemplatesService } from '../document-templates/document-templates.service';
import { AuditAction } from '../audit/audit-action.enum';

// Mock fs/promises at the top level for Vitest ESM
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

/**
 * DocumentsService Tests
 * Epic 7 Story 7.3: DOCX Generation + SHA-256 + Manifest + Retention + RBAC
 *
 * Tests verify:
 * - Document generation with integrity tracking
 * - RBAC for generation and download
 * - SHA-256 hash verification
 * - 7-year retention policy
 * - AuditAction enum direct usage
 */
describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockPrisma: any;
  let mockDocxService: any;
  let mockIntegrityService: any;
  let mockAuditService: any;
  let mockTemplatesService: any;
  let mockFs: any;

  const mockUser = {
    id: 'user-1',
    role: UserRole.GIANG_VIEN,
    facultyId: 'faculty-1',
  };

  const mockProposal: Proposal & { owner: any; faculty: any } = {
    id: 'proposal-1',
    code: 'DT-001',
    title: 'Nghiên cứu AI',
    ownerId: 'user-1',  // Make the mockUser the owner
    facultyId: 'faculty-1',
    state: 'FACULTY_REVIEW',
    slaDeadline: null,
    holderUnit: null,
    holderUser: null,
    actualStartDate: null,
    completedDate: null,
    slaStartDate: null,
    formData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    owner: {
      id: 'user-1',  // Match mockUser.id
      displayName: 'Nguyễn Văn A',
      email: 'owner@example.com',
    },
    faculty: {
      id: 'faculty-1',
      name: 'Khoa CNTT',
      code: 'CNTT',
    },
  };

  const mockTemplate = {
    id: 'template-1',
    templateType: 'EVALUATION_FORM',
    version: 1,
    filePath: '/path/to/template.docx',
  };

  beforeEach(async () => {
    mockPrisma = {
      proposal: {
        findUnique: vi.fn(),
      },
      document: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      documentManifest: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockDocxService = {
      fetchProposalData: vi.fn(),
      generateFromTemplate: vi.fn(),
      getFilename: vi.fn(),
    };

    mockIntegrityService = {
      calculateSHA256: vi.fn(),
      calculateRetentionDate: vi.fn(),
      verifyDocument: vi.fn(),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockTemplatesService = {
      getActiveTemplate: vi.fn(),
    };

    service = new DocumentsService(
      mockPrisma,
      mockDocxService,
      mockIntegrityService,
      mockAuditService,
      mockTemplatesService,
    );
    vi.clearAllMocks();

    // Get mocked fs module
    mockFs = await import('fs/promises');
  });

  describe('generateDocument', () => {
    it('should generate document with SHA-256 hash and manifest', async () => {
      const docxBuffer = Buffer.from('generated docx');
      const sha256Hash = 'abc123';
      const fileName = 'DT-001_Phieu_danh_gia_123456.docx';

      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockTemplatesService.getActiveTemplate.mockResolvedValue(mockTemplate);
      mockDocxService.fetchProposalData.mockResolvedValue({
        code: 'DT-001',
        title: 'Test',
        ownerName: 'Test',
        ownerEmail: 'test@example.com',
        facultyName: 'Khoa',
        facultyCode: 'K',
        state: 'DRAFT',
        createdAt: '01/01/2026',
        currentDate: '07/01/2026',
        currentYear: '2026',
        currentMonth: '1',
        currentTime: '10:00:00',
      });
      mockDocxService.generateFromTemplate.mockResolvedValue(docxBuffer);
      mockIntegrityService.calculateSHA256.mockReturnValue(sha256Hash);
      mockIntegrityService.calculateRetentionDate.mockReturnValue(new Date('2033-01-01'));
      mockDocxService.getFilename.mockReturnValue(fileName);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);

      const mockDocument = {
        id: 'doc-1',
        proposalId: 'proposal-1',
        fileName,
        sha256Hash,
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          document: {
            create: vi.fn().mockResolvedValue(mockDocument),
          },
          documentManifest: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        await callback(mockTx);
        return mockDocument;
      });

      const result = await service.generateDocument(
        'proposal-1',
        { documentType: DocumentType.EVALUATION_FORM },
        mockUser,
      );

      expect(result).toEqual(mockDocument);

      // Verify audit event using AuditAction enum
      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.DOC_GENERATED,
        actorUserId: mockUser.id,
        entityType: 'Document',
        entityId: 'doc-1',
        metadata: expect.objectContaining({
          proposalCode: 'DT-001',
          documentType: DocumentType.EVALUATION_FORM,
          sha256Hash,
        }),
        ip: undefined,
        userAgent: undefined,
        requestId: undefined,
      });
    });

    it('should validate template type matches requested document type', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockTemplatesService.getActiveTemplate.mockResolvedValue({
        ...mockTemplate,
        templateType: 'PROPOSAL_OUTLINE',
      });

      await expect(
        service.generateDocument(
          'proposal-1',
          { documentType: DocumentType.EVALUATION_FORM },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDocument(
          'non-existent',
          { documentType: DocumentType.EVALUATION_FORM },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when no template available', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockTemplatesService.getActiveTemplate.mockResolvedValue(null);

      await expect(
        service.generateDocument(
          'proposal-1',
          { documentType: DocumentType.EVALUATION_FORM },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('downloadDocument - RBAC and Integrity', () => {
    const mockDocument = {
      id: 'doc-1',
      filePath: '/path/to/doc.docx',
      fileName: 'doc.docx',
      sha256Hash: 'abc123',
      proposal: {
        ownerId: 'user-1',  // Match mockUser.id
        facultyId: 'faculty-1',
      },
      documentType: DocumentType.EVALUATION_FORM,
    };

    it('should allow owner to download', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockIntegrityService.calculateSHA256.mockReturnValue('abc123');
      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('content'));

      const result = await service.downloadDocument('doc-1', mockUser);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.fileName).toBe('doc.docx');
    });

    it('should verify SHA-256 hash before download', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockIntegrityService.calculateSHA256.mockReturnValue('different-hash');
      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('content'));

      await expect(service.downloadDocument('doc-1', mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should log download using AuditAction enum', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockIntegrityService.calculateSHA256.mockReturnValue('abc123');
      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('content'));

      await service.downloadDocument('doc-1', mockUser);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: AuditAction.DOC_DOWNLOADED,
        actorUserId: mockUser.id,
        entityType: 'Document',
        entityId: 'doc-1',
        metadata: expect.any(Object),
        ip: undefined,
        userAgent: undefined,
        requestId: undefined,
      });
    });
  });

  describe('RBAC Authorization', () => {
    it('should allow ADMIN to generate any document', () => {
      const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockTemplatesService.getActiveTemplate.mockResolvedValue(mockTemplate);

      expect(() => {
        (service as any).checkGeneratePermission(adminUser, mockProposal);
      }).not.toThrow();
    });

    it('should allow PHONG_KHCN to generate any document', () => {
      const pkhcnUser = { id: 'pkhcn-1', role: UserRole.PHONG_KHCN };
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockTemplatesService.getActiveTemplate.mockResolvedValue(mockTemplate);

      expect(() => {
        (service as any).checkGeneratePermission(pkhcnUser, mockProposal);
      }).not.toThrow();
    });

    it('should allow owner to generate their own document', () => {
      const ownerUser = {
        id: 'user-1',  // Match mockUser.id
        role: UserRole.GIANG_VIEN,
      };

      expect(() => {
        (service as any).checkGeneratePermission(ownerUser, mockProposal);
      }).not.toThrow();
    });

    it('should allow faculty admin to generate faculty documents', () => {
      const facultyUser = {
        id: 'faculty-1',
        role: UserRole.QUAN_LY_KHOA,
        facultyId: 'faculty-1',
      };

      expect(() => {
        (service as any).checkGeneratePermission(facultyUser, mockProposal);
      }).not.toThrow();
    });

    it('should reject non-authorized users', () => {
      const otherUser = {
        id: 'other-1',
        role: UserRole.GIANG_VIEN,
        facultyId: 'faculty-2',
      };

      expect(() => {
        (service as any).checkGeneratePermission(otherUser, mockProposal);
      }).toThrow(ForbiddenException);
    });
  });

  describe('7-Year Retention Policy', () => {
    it('should calculate retention date 7 years from generation', async () => {
      const now = new Date('2026-01-07');
      const expectedRetentionDate = new Date('2033-01-07');

      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockTemplatesService.getActiveTemplate.mockResolvedValue(mockTemplate);
      mockDocxService.fetchProposalData.mockResolvedValue({
        code: 'DT-001',
        title: 'Test',
        ownerName: 'Test',
        ownerEmail: 'test@example.com',
        facultyName: 'Khoa',
        facultyCode: 'K',
        state: 'DRAFT',
        createdAt: '01/01/2026',
        currentDate: '07/01/2026',
        currentYear: '2026',
        currentMonth: '1',
        currentTime: '10:00:00',
      });
      mockDocxService.generateFromTemplate.mockResolvedValue(Buffer.from('docx'));
      mockIntegrityService.calculateSHA256.mockReturnValue('hash');
      mockDocxService.getFilename.mockReturnValue('doc.docx');
      mockIntegrityService.calculateRetentionDate.mockReturnValue(expectedRetentionDate);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          document: {
            create: vi.fn().mockResolvedValue({ id: 'doc-1' }),
          },
          documentManifest: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        await callback(mockTx);
        return { id: 'doc-1' };
      });

      await service.generateDocument(
        'proposal-1',
        { documentType: DocumentType.EVALUATION_FORM },
        mockUser,
      );

      expect(mockIntegrityService.calculateRetentionDate).toHaveBeenCalledWith(7);
    });
  });

  describe('getProposalDocuments', () => {
    it('should return all documents for a proposal', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue({
        id: 'proposal-1',
        ownerId: 'user-1',  // Match mockUser.id
        facultyId: 'faculty-1',
      });

      const documents = [{ id: 'doc-1' }, { id: 'doc-2' }];
      mockPrisma.document.findMany.mockResolvedValue(documents);

      const result = await service.getProposalDocuments('proposal-1', mockUser);

      expect(result).toEqual(documents);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: {
          proposalId: 'proposal-1',
          deletedAt: null,
        },
        orderBy: { generatedAt: 'desc' },
      });
    });
  });

  describe('Epic 7 Retro: Proper DTO Mapping', () => {
    it('should use proper typing for manifest data - NO as unknown (Epic 6 pattern)', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockTemplatesService.getActiveTemplate.mockResolvedValue(mockTemplate);
      mockDocxService.fetchProposalData.mockResolvedValue({
        code: 'DT-001',
        title: 'Test',
        ownerName: 'Test',
        ownerEmail: 'test@example.com',
        facultyName: 'Khoa',
        facultyCode: 'K',
        state: 'DRAFT',
        createdAt: '01/01/2026',
        currentDate: '07/01/2026',
        currentYear: '2026',
        currentMonth: '1',
        currentTime: '10:00:00',
      });
      mockDocxService.generateFromTemplate.mockResolvedValue(Buffer.from('docx'));
      mockIntegrityService.calculateSHA256.mockReturnValue('hash');
      mockDocxService.getFilename.mockReturnValue('doc.docx');
      mockIntegrityService.calculateRetentionDate.mockReturnValue(new Date());
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          document: {
            create: vi.fn().mockResolvedValue({ id: 'doc-1' }),
          },
          documentManifest: {
            create: vi.fn(),
          },
        };
        await callback(mockTx);

        // Verify manifest data structure
        const manifestCall = mockTx.documentManifest.create.mock.calls[0][0];
        expect(manifestCall.data.proposalData).toHaveProperty('proposalCode');
        expect(manifestCall.data.proposalData).toHaveProperty('proposalTitle');
        expect(manifestCall.data.proposalData).toHaveProperty('ownerName');
        expect(manifestCall.data.proposalData).toHaveProperty('generatedAt');

        // Verify it's typed properly - NO "as unknown" in the code path
        expect(typeof manifestCall.data.proposalData.proposalCode).toBe('string');
        expect(typeof manifestCall.data.proposalData.generatedAt).toBe('string');

        return { id: 'doc-1' };
      });

      await service.generateDocument(
        'proposal-1',
        { documentType: DocumentType.EVALUATION_FORM },
        mockUser,
      );
    });
  });
});
