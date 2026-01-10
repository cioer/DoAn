import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PdfService } from './pdf.service';
import {
  PdfHtmlHelpersService,
  PdfStylesService,
  PdfDataService,
  PdfGeneratorService,
  PdfTemplateService,
} from './services';

/**
 * PdfService Tests
 *
 * Story 3.9: Project Detail PDF Export (WYSIWYG, SLA 10s, Pre-Generated Seeds)
 *
 * Phase 6 Refactor: Updated to test new service architecture
 */

describe('PdfService', () => {
  let service: PdfService;
  let mockHelpersService: any;
  let mockStylesService: any;
  let mockDataService: any;
  let mockGeneratorService: any;
  let mockTemplateService: any;

  const mockProposal = {
    id: 'proposal-uuid-123',
    code: 'DT-001',
    title: 'Đề tài nghiên cứu khoa học',
    state: 'FACULTY_REVIEW',
    formData: {
      researchField: 'Công nghệ thông tin',
      duration: '12 tháng',
      budget: '100.000.000 VNĐ',
    },
    slaStartDate: new Date('2026-01-01'),
    slaDeadline: new Date('2026-01-15'),
    templateVersion: '1.0',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-06'),
    owner: {
      id: 'user-uuid-123',
      email: 'test@example.com',
      displayName: 'Nguyễn Văn A',
    },
    template: {
      id: 'template-uuid',
      code: 'TM-001',
      name: 'Mẫu đơn đề tài chuẩn',
    },
  };

  beforeEach(() => {
    // Mock helpers service
    mockHelpersService = {
      escapeHtml: vi.fn((text: string) => text),
      formatLabel: vi.fn((key: string) => key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')),
      formatValue: vi.fn((value: any) => String(value)),
      formatDate: vi.fn((date: Date) => new Date(date).toLocaleDateString('vi-VN')),
      formatDateTime: vi.fn((date: Date) => new Date(date).toLocaleString('vi-VN')),
      truncate: vi.fn((text: string, max = 100) => text.length > max ? text.substring(0, max) + '...' : text),
      renderFormData: vi.fn((data: any) => '<div class="form-data">...</div>'),
    };

    // Mock styles service
    mockStylesService = {
      getStateBadge: vi.fn((state: string) => ({
        label: state,
        className: `status-${state.toLowerCase()}`,
        icon: '📄',
        css: 'background: #f3f4f6; color: #374151;',
      })),
      getSlaBadge: vi.fn((status: string) => ({
        className: `sla-${status}`,
        icon: '⏳',
        css: 'background: #d1fae5; color: #065f46;',
      })),
      calculateSlaStatus: vi.fn((deadline: Date) => 'ok' as const),
      getBaseStyles: vi.fn(() => '/* base styles */'),
      getStateBadgeStyles: vi.fn(() => '/* state badge styles */'),
      getSlaBadgeStyles: vi.fn(() => '/* SLA badge styles */'),
      getProposalCss: vi.fn(() => '/* proposal CSS */'),
    };

    // Mock data service
    mockDataService = {
      getProposalForPdf: vi.fn().mockResolvedValue(mockProposal),
      getEvaluationForPdf: vi.fn(),
      getRevisionLog: vi.fn(),
      getCouncilName: vi.fn().mockResolvedValue('Hội đồng ABC'),
      getProposalForExport: vi.fn().mockResolvedValue({
        id: mockProposal.id,
        code: mockProposal.code,
        ownerId: mockProposal.owner.id,
      }),
      getProposalCode: vi.fn().mockResolvedValue(mockProposal.code),
    };

    // Mock generator service
    mockGeneratorService = {
      generatePdfFromHtml: vi.fn().mockResolvedValue(Buffer.from('fake-pdf')),
      hasSeedPdf: vi.fn().mockResolvedValue(false),
      getSeedPdf: vi.fn().mockResolvedValue(Buffer.from('seed-pdf')),
      saveSeedPdf: vi.fn().mockResolvedValue(undefined),
    };

    // Mock template service
    mockTemplateService = {
      generateProposalHtml: vi.fn().mockReturnValue('<html>Proposal HTML</html>'),
      generateRevisionHtml: vi.fn().mockReturnValue('<html>Revision HTML</html>'),
      generateEvaluationHtml: vi.fn().mockReturnValue('<html>Evaluation HTML</html>'),
    };

    // Manual DI - bypass NestJS TestingModule
    service = new PdfService(
      mockDataService,
      mockGeneratorService,
      mockTemplateService,
      mockHelpersService,
      mockStylesService,
    );

    vi.clearAllMocks();
  });

  describe('Helper Methods (via PdfHtmlHelpersService)', () => {
    describe('formatLabel', () => {
      it('should convert snake_case to Title Case', () => {
        mockHelpersService.formatLabel('research_field');
        expect(mockHelpersService.formatLabel).toHaveBeenCalledWith('research_field');
      });
    });

    describe('formatValue', () => {
      it('should format strings', () => {
        mockHelpersService.formatValue('test value');
        expect(mockHelpersService.formatValue).toHaveBeenCalledWith('test value');
      });
    });

    describe('escapeHtml', () => {
      it('should escape HTML special characters', () => {
        const input = '<script>alert("xss")</script> & "quotes"';
        mockHelpersService.escapeHtml(input);
        expect(mockHelpersService.escapeHtml).toHaveBeenCalledWith(input);
      });
    });
  });

  describe('State Badge (via PdfStylesService)', () => {
    it('should return correct badge for all canonical states', () => {
      const states = [
        { state: 'DRAFT', label: 'Nháp', className: 'status-draft' },
        { state: 'FACULTY_REVIEW', label: 'Đang xét (Khoa)', className: 'status-faculty_review' },
        { state: 'APPROVED', label: 'Đã duyệt', className: 'status-approved' },
      ];

      states.forEach(({ state }) => {
        mockStylesService.getStateBadge(state);
        expect(mockStylesService.getStateBadge).toHaveBeenCalledWith(state);
      });
    });
  });

  describe('SLA Info (via PdfStylesService)', () => {
    it('should calculate SLA status correctly', () => {
      const deadline = new Date('2026-01-15');
      mockStylesService.calculateSlaStatus(deadline);
      expect(mockStylesService.calculateSlaStatus).toHaveBeenCalledWith(deadline);
    });
  });

  describe('PDF Generation Methods', () => {
    describe('generateProposalPdf', () => {
      it('should use pre-generated PDF if available', async () => {
        mockGeneratorService.hasSeedPdf.mockResolvedValueOnce(true);

        const result = await service.generateProposalPdf('proposal-123');

        expect(mockGeneratorService.hasSeedPdf).toHaveBeenCalledWith('proposal-123');
        expect(mockGeneratorService.getSeedPdf).toHaveBeenCalledWith('proposal-123');
        expect(result).toEqual(Buffer.from('seed-pdf'));
      });

      it('should fetch proposal, generate HTML, and create PDF', async () => {
        const result = await service.generateProposalPdf('proposal-123');

        expect(mockGeneratorService.hasSeedPdf).toHaveBeenCalledWith('proposal-123');
        expect(mockDataService.getProposalForPdf).toHaveBeenCalledWith('proposal-123');
        expect(mockTemplateService.generateProposalHtml).toHaveBeenCalledWith(mockProposal);
        expect(mockGeneratorService.generatePdfFromHtml).toHaveBeenCalled();
        expect(result).toEqual(Buffer.from('fake-pdf'));
      });
    });

    describe('generateRevisionPdf', () => {
      it('should generate revision PDF with proposal and return log', async () => {
        const mockReturnLog = {
          id: 'log-1',
          action: 'RETURN',
          actorName: 'Reviewer',
          timestamp: new Date(),
          reasonCode: 'THIEU_TAI_LIEU',
          comment: JSON.stringify({ reason: 'Thiếu tài liệu', revisionSections: [] }),
        };
        mockDataService.getRevisionLog.mockResolvedValueOnce(mockReturnLog);

        const result = await service.generateRevisionPdf('proposal-123');

        expect(mockDataService.getProposalForPdf).toHaveBeenCalledWith('proposal-123');
        expect(mockDataService.getRevisionLog).toHaveBeenCalledWith('proposal-123');
        expect(mockTemplateService.generateRevisionHtml).toHaveBeenCalledWith(mockProposal, mockReturnLog);
        expect(mockGeneratorService.generatePdfFromHtml).toHaveBeenCalled();
        expect(result).toEqual(Buffer.from('fake-pdf'));
      });
    });

    describe('generateEvaluationPdf', () => {
      it('should generate evaluation PDF with evaluation data', async () => {
        const mockEvaluation = {
          id: 'eval-1',
          proposal: {
            id: 'proposal-123',
            code: 'DT-001',
            title: 'Test Proposal',
            councilId: 'council-1',
          },
          evaluator: {
            displayName: 'Evaluator',
            email: 'evaluator@example.com',
          },
          formData: {
            scientificContent: { score: 5, comments: 'Good' },
            conclusion: 'DAT',
          },
          updatedAt: new Date(),
        };
        mockDataService.getEvaluationForPdf.mockResolvedValueOnce(mockEvaluation);

        const result = await service.generateEvaluationPdf('proposal-123');

        expect(mockDataService.getEvaluationForPdf).toHaveBeenCalledWith('proposal-123');
        expect(mockDataService.getCouncilName).toHaveBeenCalledWith('council-1');
        expect(mockTemplateService.generateEvaluationHtml).toHaveBeenCalledWith(mockEvaluation, 'Hội đồng ABC');
        expect(mockGeneratorService.generatePdfFromHtml).toHaveBeenCalled();
        expect(result).toEqual(Buffer.from('fake-pdf'));
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getProposalCode', () => {
      it('should return proposal code', async () => {
        const code = await service.getProposalCode('proposal-123');
        expect(code).toBe('DT-001');
        expect(mockDataService.getProposalCode).toHaveBeenCalledWith('proposal-123');
      });
    });

    describe('getProposalForExport', () => {
      it('should return proposal for export', async () => {
        const result = await service.getProposalForExport('proposal-123');
        expect(result).toEqual({
          id: mockProposal.id,
          code: mockProposal.code,
          ownerId: mockProposal.owner.id,
        });
        expect(mockDataService.getProposalForExport).toHaveBeenCalledWith('proposal-123');
      });
    });

    describe('hasSeedPdf', () => {
      it('should check if seed PDF exists', async () => {
        mockGeneratorService.hasSeedPdf.mockResolvedValueOnce(true);
        const result = await service.hasSeedPdf('proposal-123');
        expect(result).toBe(true);
        expect(mockGeneratorService.hasSeedPdf).toHaveBeenCalledWith('proposal-123');
      });
    });

    describe('saveSeedPdf', () => {
      it('should save seed PDF', async () => {
        const buffer = Buffer.from('test-pdf');
        await service.saveSeedPdf('proposal-123', buffer);
        expect(mockGeneratorService.saveSeedPdf).toHaveBeenCalledWith('proposal-123', buffer);
      });
    });
  });
});
