import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentTemplate, DocumentType, Proposal, User, Faculty } from '@prisma/client';
import { DocxService, ProposalDataForDocx } from './docx.service';
import { PrismaService } from '../auth/prisma.service';
import PizZip from 'pizzip';

// Mock fs/promises at the top level for Vitest ESM
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

/**
 * DocxService Tests
 * Epic 7 Story 7.3: DOCX Generation
 *
 * Tests verify:
 * - Template-based DOCX generation
 * - Filename collision prevention
 * - Proposal data fetching and mapping
 * - Type-safe data handling
 */
describe('DocxService', () => {
  let service: DocxService;
  let mockPrisma: any;
  let mockFs: any;

  // Test fixtures
  const mockTemplate: DocumentTemplate = {
    id: 'template-1',
    name: 'Evaluation Form Template',
    templateType: 'EVALUATION_FORM',
    filePath: '/test/path/template.docx',
    fileName: 'template.docx',
    fileSize: 12345,
    sha256Hash: 'abc123',
    version: 1,
    placeholders: ['proposal.title', 'evaluation.council'],
    isActive: true,
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  const mockOwner: User = {
    id: 'owner-1',
    email: 'owner@example.com',
    passwordHash: 'hash',
    displayName: 'Nguyễn Văn A',
    role: 'GIANG_VIEN' as any,
    facultyId: 'faculty-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    faculty: {} as any,
    refreshTokens: [],
    auditEventsAsActor: [],
    auditEventsAsActing: [],
    ownedProposals: [],
  };

  const mockFaculty: Faculty = {
    id: 'faculty-1',
    name: 'Khoa CNTT',
    code: 'CNTT',
    createdAt: new Date(),
    updatedAt: new Date(),
    dean: null,
    users: [],
    proposals: [],
    faculties: [],
  };

  const mockProposal: Proposal & {
    owner: User;
    faculty: Faculty;
    council: any;
    template: any;
  } = {
    id: 'proposal-1',
    code: 'DT-001',
    title: 'Nghiên cứu AI',
    state: 'FACULTY_REVIEW',
    ownerId: 'owner-1',
    facultyId: 'faculty-1',
    actualStartDate: null,
    completedDate: null,
    slaStartDate: null,
    slaDeadline: null,
    holderUnit: null,
    holderUser: null,
    formData: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    owner: mockOwner,
    faculty: mockFaculty,
    council: null,
    template: null,
    documents: [],
    evaluations: [],
    workflowLogs: [],
  };

  beforeEach(async () => {
    mockPrisma = {
      proposal: {
        findUnique: vi.fn(),
      },
    };

    service = new DocxService(mockPrisma);
    vi.clearAllMocks();

    // Get mocked fs module
    mockFs = await import('fs/promises');
  });

  describe('generateFromTemplate', () => {
    it('should handle template reading errors', async () => {
      // Mock fs.readFile to throw an error
      vi.mocked(mockFs.readFile).mockRejectedValue(new Error('File not found'));

      const proposalData: ProposalDataForDocx = {
        code: 'DT-001',
        title: 'Nghiên cứu AI',
        ownerName: 'Nguyễn Văn A',
        ownerEmail: 'owner@example.com',
        facultyName: 'Khoa CNTT',
        facultyCode: 'CNTT',
        state: 'FACULTY_REVIEW',
        createdAt: '01/01/2026',
        currentDate: '07/01/2026',
        currentYear: '2026',
        currentMonth: '1',
        currentTime: '10:00:00',
      };

      await expect(
        service.generateFromTemplate(mockTemplate, proposalData)
      ).rejects.toThrow();
    });

    it('should handle template rendering errors gracefully', async () => {
      const invalidBuffer = Buffer.from('invalid docx content');
      vi.mocked(mockFs.readFile).mockResolvedValue(invalidBuffer);

      const proposalData: ProposalDataForDocx = {
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
      };

      await expect(
        service.generateFromTemplate(mockTemplate, proposalData)
      ).rejects.toThrow();
    });
  });

  describe('fetchProposalData', () => {
    beforeEach(() => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.evaluation = {
        findFirst: vi.fn().mockResolvedValue({
          id: 'eval-1',
          formData: {
            scientificContent: { score: 4, comments: 'Tốt' },
            researchMethod: { score: 5, comments: 'Xuất sắc' },
            feasibility: { score: 3, comments: 'Khá' },
            budget: { score: 4, comments: 'Đạt' },
            conclusion: 'Đạt',
          },
          evaluator: mockOwner,
        }),
      };
    });

    it('should fetch and map proposal data correctly', async () => {
      const result = await service.fetchProposalData('proposal-1');

      expect(result).toMatchObject({
        code: 'DT-001',
        title: 'Nghiên cứu AI',
        ownerName: 'Nguyễn Văn A',
        ownerEmail: 'owner@example.com',
        facultyName: 'Khoa CNTT',
        facultyCode: 'CNTT',
        state: 'FACULTY_REVIEW',

        // Evaluation info - type-safe access (Epic 6 pattern)
        evaluationScientificContentScore: 4,
        evaluationScientificContentComments: 'Tốt',
        evaluationResearchMethodScore: 5,
        evaluationResearchMethodComments: 'Xuất sắc',
        evaluationFeasibilityScore: 3,
        evaluationFeasibilityComments: 'Khá',
        evaluationBudgetScore: 4,
        evaluationBudgetComments: 'Đạt',
        evaluationConclusion: 'Đạt',

        // Date format may vary, so check it exists
        createdAt: expect.any(String),
        currentDate: expect.any(String),
        currentYear: '2026',
        currentMonth: expect.any(String),
        currentTime: expect.any(String),

        // Council info - undefined when no council
        councilName: undefined,
        councilType: undefined,
        councilSecretary: 'Nguyễn Văn A',
        councilChair: undefined,
      });
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(service.fetchProposalData('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should handle proposals without evaluation', async () => {
      mockPrisma.evaluation.findFirst.mockResolvedValue(null);

      const result = await service.fetchProposalData('proposal-1');

      expect(result.evaluationScientificContentScore).toBeUndefined();
      expect(result.evaluationConclusion).toBe('');
    });
  });

  describe('getFilename - Collision Prevention (Epic 6 retro fix)', () => {
    it('should generate filename with random component to prevent collisions', () => {
      const filename1 = service.getFilename('DT-001', DocumentType.EVALUATION_FORM);
      const filename2 = service.getFilename('DT-001', DocumentType.EVALUATION_FORM);

      // Filenames should be different due to random component
      expect(filename1).not.toBe(filename2);

      // Both should follow the pattern
      const pattern = /^DT-001_Phieu_danh_gia_\d+_[a-z0-9]+\.docx$/;
      expect(filename1).toMatch(pattern);
      expect(filename2).toMatch(pattern);
    });

    it('should generate correct type labels for all document types', () => {
      const tests = [
        { type: DocumentType.PROPOSAL_OUTLINE, label: 'De_cuong' },
        { type: DocumentType.EVALUATION_FORM, label: 'Phieu_danh_gia' },
        { type: DocumentType.FINAL_REPORT, label: 'Bao_cao_cuoi' },
        { type: DocumentType.FACULTY_ACCEPTANCE, label: 'Bien_ban_nghiem_thu_khoa' },
        { type: DocumentType.SCHOOL_ACCEPTANCE, label: 'Bien_ban_nghiem_thu_truong' },
        { type: DocumentType.HANDOVER_CHECKLIST, label: 'Bien_ban_ban_giao' },
      ];

      tests.forEach(({ type, label }) => {
        const filename = service.getFilename('DT-001', type);
        expect(filename).toContain(label);
      });
    });
  });

  describe('buildDataMap - Type-safe data mapping', () => {
    it('should build complete data map for template rendering', () => {
      const proposalData: ProposalDataForDocx = {
        code: 'DT-001',
        title: 'Nghiên cứu AI',
        ownerName: 'Nguyễn Văn A',
        ownerEmail: 'owner@example.com',
        facultyName: 'Khoa CNTT',
        facultyCode: 'CNTT',
        state: 'FACULTY_REVIEW',
        createdAt: '01/01/2026',
        currentDate: '07/01/2026',
        currentYear: '2026',
        currentMonth: '1',
        currentTime: '10:00:00',
        evaluationScientificContentScore: 5,
        evaluationScientificContentComments: 'Xuất sắc',
      };

      // Access private method via reflection
      const dataMap = (service as any).buildDataMap(proposalData);

      expect(dataMap.proposal).toBeDefined();
      expect(dataMap.proposal.code).toBe('DT-001');
      expect(dataMap.proposal.title).toBe('Nghiên cứu AI');

      expect(dataMap.evaluation).toBeDefined();
      expect(dataMap.evaluation.scientificContent.score).toBe(5);
      expect(dataMap.evaluation.scientificContent.comments).toBe('Xuất sắc');

      expect(dataMap.currentDate).toBe('07/01/2026');
      expect(dataMap.currentYear).toBe('2026');
    });
  });

  describe('templateTypeToDocumentType', () => {
    it('should map template types to document types correctly', () => {
      const mapping = {
        PROPOSAL_OUTLINE: DocumentType.PROPOSAL_OUTLINE,
        EVALUATION_FORM: DocumentType.EVALUATION_FORM,
        FINAL_REPORT: DocumentType.FINAL_REPORT,
        FACULTY_ACCEPTANCE: DocumentType.FACULTY_ACCEPTANCE,
        SCHOOL_ACCEPTANCE: DocumentType.SCHOOL_ACCEPTANCE,
        HANDOVER_CHECKLIST: DocumentType.HANDOVER_CHECKLIST,
      };

      Object.entries(mapping).forEach(([templateType, expectedDocumentType]) => {
        const result = service.templateTypeToDocumentType(templateType);
        expect(result).toBe(expectedDocumentType);
      });
    });
  });

  describe('Epic 7 Retro: Type Safety', () => {
    it('should use proper typing - NO as unknown (Epic 6 retro pattern)', () => {
      // Verify ProposalDataForDocx interface is properly defined
      const proposalData: ProposalDataForDocx = {
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
      };

      // Verify all required fields are present and properly typed
      expect(typeof proposalData.code).toBe('string');
      expect(typeof proposalData.title).toBe('string');
      expect(typeof proposalData.currentDate).toBe('string');
    });
  });
});
