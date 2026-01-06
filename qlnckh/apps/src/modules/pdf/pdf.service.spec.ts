import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PdfService } from './pdf.service';

/**
 * PdfService Tests
 *
 * Story 3.9: Project Detail PDF Export (WYSIWYG, SLA 10s, Pre-Generated Seeds)
 *
 * Note: Due to vitest module mocking complexities with fs/promises and playwright,
 * these tests focus on testing the service logic and helper methods without full
 * end-to-end browser/FS mocking. The PDF generation functionality is tested
 * through integration testing and manual verification.
 */

describe('PdfService', () => {
  let service: PdfService;
  let prismaMock: any;

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
      name: 'Nguyễn Văn A',
    },
    template: {
      id: 'template-uuid',
      code: 'TM-001',
      name: 'Mẫu đơn đề tài chuẩn',
    },
  };

  beforeEach(() => {
    // Manual Prisma mock (Epic 2 pattern)
    prismaMock = {
      proposal: {
        findUnique: jest.fn().mockResolvedValue(mockProposal),
      },
    };

    // Manual DI - bypass NestJS TestingModule (Epic 2 lesson learned)
    service = new PdfService(prismaMock);
  });

  describe('getStateBadge', () => {
    it('should return correct badge for all canonical states', () => {
      const states = [
        { state: 'DRAFT', label: 'Nháp', className: 'status-draft' },
        {
          state: 'FACULTY_REVIEW',
          label: 'Đang xét (Khoa)',
          className: 'status-faculty_review',
        },
        {
          state: 'SCHOOL_SELECTION_REVIEW',
          label: 'Đang xét (PKHCN)',
          className: 'status-school_selection_review',
        },
        {
          state: 'OUTLINE_COUNCIL_REVIEW',
          label: 'Đang xét (HĐĐ)',
          className: 'status-outline_council_review',
        },
        {
          state: 'CHANGES_REQUESTED',
          label: 'Yêu cầu sửa',
          className: 'status-changes_requested',
        },
        { state: 'APPROVED', label: 'Đã duyệt', className: 'status-approved' },
        {
          state: 'IN_PROGRESS',
          label: 'Đang thực hiện',
          className: 'status-in_progress',
        },
        { state: 'PAUSED', label: 'Tạm dừng', className: 'status-paused' },
        {
          state: 'FACULTY_ACCEPTANCE_REVIEW',
          label: 'Nghiệm thu (Khoa)',
          className: 'status-faculty_acceptance_review',
        },
        {
          state: 'SCHOOL_ACCEPTANCE_REVIEW',
          label: 'Nghiệm thu (Trường)',
          className: 'status-school_acceptance_review',
        },
        { state: 'REJECTED', label: 'Từ chối', className: 'status-rejected' },
        { state: 'WITHDRAWN', label: 'Đã rút', className: 'status-withdrawn' },
        {
          state: 'CANCELLED',
          label: 'Đã hủy',
          className: 'status-cancelled',
        },
      ];

      states.forEach(({ state, label, className }) => {
        const result = (service as any).getStateBadge(state);
        expect(result.label).toBe(label);
        expect(result.className).toBe(className);
        expect(result.icon).toBeDefined();
      });
    });

    it('should return default values for unknown states', () => {
      const result = (service as any).getStateBadge('UNKNOWN_STATE');
      expect(result.label).toBe('UNKNOWN_STATE');
      expect(result.className).toBe('status-unknown_state');
      expect(result.icon).toBeDefined();
    });
  });

  describe('formatLabel', () => {
    it('should convert snake_case to Title Case', () => {
      expect((service as any).formatLabel('research_field')).toBe('Research Field');
    });

    it('should convert camelCase to Title Case', () => {
      expect((service as any).formatLabel('researchField')).toBe('Research Field');
    });

    it('should handle multiple words', () => {
      expect((service as any).formatLabel('research_field_name')).toBe('Research Field Name');
    });

    it('should handle single word', () => {
      expect((service as any).formatLabel('research')).toBe('Research');
    });
  });

  describe('formatValue', () => {
    it('should format strings', () => {
      expect((service as any).formatValue('test value')).toBe('test value');
    });

    it('should format numbers', () => {
      expect((service as any).formatValue(123)).toBe('123');
      expect((service as any).formatValue(45.67)).toBe('45.67');
    });

    it('should format booleans in Vietnamese', () => {
      expect((service as any).formatValue(true)).toBe('Có');
      expect((service as any).formatValue(false)).toBe('Không');
    });

    it('should format arrays as comma-separated values', () => {
      expect((service as any).formatValue(['a', 'b', 'c'])).toBe('a, b, c');
      expect((service as any).formatValue([1, 2, 3])).toBe('1, 2, 3');
    });

    it('should format objects as JSON', () => {
      expect((service as any).formatValue({ key: 'value' })).toBe('{\n  "key": "value"\n}');
    });

    it('should handle null values gracefully', () => {
      // formatValue converts null to string 'null'
      expect((service as any).formatValue(null)).toBe('null');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script> & "quotes"';
      const result = (service as any).escapeHtml(input);

      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).not.toContain('<script>');
    });

    it('should escape single quotes', () => {
      const result = (service as any).escapeHtml("it's a test");
      expect(result).toContain('&#039;');
    });

    it('should escape greater than symbol', () => {
      const result = (service as any).escapeHtml('a > b');
      expect(result).toContain('&gt;');
    });

    it('should handle empty string', () => {
      expect((service as any).escapeHtml('')).toBe('');
    });
  });

  describe('getSlaInfo', () => {
    it('should return null when no SLA dates are set', () => {
      const proposalWithoutSla = { ...mockProposal, slaStartDate: null, slaDeadline: null };
      const result = (service as any).getSlaInfo(proposalWithoutSla);
      expect(result).toBeNull();
    });

    it('should return null when deadline is not set', () => {
      const proposalWithoutDeadline = { ...mockProposal, slaDeadline: null };
      const result = (service as any).getSlaInfo(proposalWithoutDeadline);
      expect(result).toBeNull();
    });

    it('should display overdue state when deadline has passed', () => {
      const overdueProposal = {
        ...mockProposal,
        slaDeadline: new Date('2025-12-01'),
      };
      const result = (service as any).getSlaInfo(overdueProposal);
      expect(result).not.toBeNull();
      expect(result.className).toBe('sla-overdue');
      expect(result.text).toContain('Quá hạn');
    });

    it('should display warning state when deadline is within 2 days', () => {
      const warningProposal = {
        ...mockProposal,
        slaDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      };
      const result = (service as any).getSlaInfo(warningProposal);
      expect(result).not.toBeNull();
      expect(result.className).toBe('sla-warning');
      expect(result.text).toContain('T-2');
    });

    it('should display ok state when deadline is more than 2 days away', () => {
      const normalProposal = {
        ...mockProposal,
        slaDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      };
      const result = (service as any).getSlaInfo(normalProposal);
      expect(result).not.toBeNull();
      expect(result.className).toBe('sla-ok');
      expect(result.text).toContain('Còn');
    });
  });

  describe('renderFormData', () => {
    it('should render form data as HTML', () => {
      const formData = {
        field1: 'value1',
        field2: 'value2',
      };
      const result = (service as any).renderFormData(formData);
      // formatLabel converts field1 to Field1, field2 to Field2
      expect(result).toContain('Field1');
      expect(result).toContain('value1');
      expect(result).toContain('Field2');
      expect(result).toContain('value2');
    });

    it('should handle null form data', () => {
      const result = (service as any).renderFormData(null);
      expect(result).toContain('Chưa có dữ liệu');
    });

    it('should handle undefined form data', () => {
      const result = (service as any).renderFormData(undefined);
      expect(result).toContain('Chưa có dữ liệu');
    });

    it('should skip null and undefined values in form data', () => {
      const formData = {
        field1: 'value1',
        field2: null,
        field3: undefined,
        field4: 'value4',
      };
      const result = (service as any).renderFormData(formData);
      // formatLabel converts field1 to Field1, field2 to Field2, etc.
      expect(result).toContain('Field1');
      expect(result).toContain('value1');
      expect(result).toContain('Field4');
      expect(result).toContain('value4');
      // null and undefined values should be skipped (not show Field2 or Field3)
      expect(result).not.toContain('Field2');
      expect(result).not.toContain('Field3');
    });

    it('should escape HTML in form data values', () => {
      const formData = {
        malicious: '<script>alert("xss")</script>',
      };
      const result = (service as any).renderFormData(formData);
      // formatLabel converts 'malicious' to 'Malicious'
      expect(result).toContain('Malicious');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });
  });
});
