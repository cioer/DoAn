import { FormDataValidationService } from './form-data-validation.service';
import { SectionId } from '@prisma/client';

// Manual mock - bypass PrismaService type
const mockPrisma = {
  formTemplate: {
    findFirst: vi.fn(),
  },
  formSection: {
    findMany: vi.fn(),
  },
};

describe('FormDataValidationService', () => {
  let service: FormDataValidationService;

  const mockTemplate = {
    id: 'template-123',
    code: 'MAU_01B',
    name: 'Mẫu đề tài',
    version: 'v1.0',
    sections: [
      {
        id: 'section-1',
        templateId: 'template-123',
        sectionId: SectionId.SEC_INFO_GENERAL,
        label: 'Thông tin chung',
        component: 'InfoGeneralSection',
        displayOrder: 1,
        isRequired: true,
        config: null,
      },
      {
        id: 'section-2',
        templateId: 'template-123',
        sectionId: SectionId.SEC_BUDGET,
        label: 'Kinh phí',
        component: 'BudgetSection',
        displayOrder: 2,
        isRequired: true,
        config: null,
      },
      {
        id: 'section-3',
        templateId: 'template-123',
        sectionId: SectionId.SEC_CONTENT_METHOD,
        label: 'Nội dung',
        component: 'ContentSection',
        displayOrder: 3,
        isRequired: false,
        config: null,
      },
    ],
  };

  beforeEach(() => {
    // Manually create service with mock prisma
    service = new FormDataValidationService(mockPrisma as any);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should return valid when no form data provided', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.validate('template-123', null);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.missingRequiredSections).toEqual([]);
    });

    it('should return valid when form data is empty object', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.validate('template-123', {});

      expect(result.isValid).toBe(true);
    });

    it('should validate required sections are present', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const formData = {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Test',
          objective: 'Test objective',
          field: 'CNTT',
          duration: 12,
          startDate: '2026-01-01',
        },
      };

      const result = await service.validate('template-123', formData);

      expect(result.isValid).toBe(false);
      expect(result.missingRequiredSections).toContain(SectionId.SEC_BUDGET);
    });

    it('should validate SEC_INFO_GENERAL required fields', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const incompleteInfo = {
        title: 'Test',
        // missing: objective, field, duration, startDate
      };

      const result = await service.validate('template-123', {
        [SectionId.SEC_INFO_GENERAL]: incompleteInfo,
        [SectionId.SEC_BUDGET]: {
          total: 50000000,
          sources: [{ name: 'Ngân sách', amount: 50000000 }],
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionId: SectionId.SEC_INFO_GENERAL,
            field: 'objective',
          }),
          expect.objectContaining({
            sectionId: SectionId.SEC_INFO_GENERAL,
            field: 'field',
          }),
          expect.objectContaining({
            sectionId: SectionId.SEC_INFO_GENERAL,
            field: 'duration',
          }),
          expect.objectContaining({
            sectionId: SectionId.SEC_INFO_GENERAL,
            field: 'startDate',
          }),
        ]),
      );
    });

    it('should validate SEC_BUDGET structure', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.validate('template-123', {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Test',
          objective: 'Test',
          field: 'CNTT',
          duration: 12,
          startDate: '2026-01-01',
        },
        [SectionId.SEC_BUDGET]: {
          total: 50000000,
          sources: [], // empty sources
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionId: SectionId.SEC_BUDGET,
            field: 'sources',
            message: expect.stringContaining('ít nhất một nguồn'),
          }),
        ]),
      );
    });

    it('should validate budget source structure', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.validate('template-123', {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Test',
          objective: 'Test',
          field: 'CNTT',
          duration: 12,
          startDate: '2026-01-01',
        },
        [SectionId.SEC_BUDGET]: {
          total: 50000000,
          sources: [
            { name: '', amount: 30000000 }, // empty name
            { name: 'Ngân sách trường', amount: 'not-a-number' }, // invalid amount
          ],
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionId: SectionId.SEC_BUDGET,
            field: 'sources[0].name',
          }),
          expect.objectContaining({
            sectionId: SectionId.SEC_BUDGET,
            field: 'sources[1].amount',
          }),
        ]),
      );
    });

    it('should validate SEC_TIMELINE phases', async () => {
      const templateWithTimeline = {
        ...mockTemplate,
        sections: [
          ...mockTemplate.sections,
          {
            id: 'section-4',
            templateId: 'template-123',
            sectionId: SectionId.SEC_TIMELINE,
            label: 'Kế hoạch',
            component: 'TimelineSection',
            displayOrder: 4,
            isRequired: true,
            config: null,
          },
        ],
      };
      mockPrisma.formTemplate.findFirst.mockResolvedValue(templateWithTimeline);

      const result = await service.validate('template-123', {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Test',
          objective: 'Test',
          field: 'CNTT',
          duration: 12,
          startDate: '2026-01-01',
        },
        [SectionId.SEC_BUDGET]: {
          total: 50000000,
          sources: [{ name: 'Ngân sách', amount: 50000000 }],
        },
        [SectionId.SEC_TIMELINE]: {
          phases: [], // empty phases
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionId: SectionId.SEC_TIMELINE,
            field: 'phases',
          }),
        ]),
      );
    });

    it('should validate timeline phase dates', async () => {
      const templateWithTimeline = {
        ...mockTemplate,
        sections: [
          ...mockTemplate.sections,
          {
            id: 'section-4',
            templateId: 'template-123',
            sectionId: SectionId.SEC_TIMELINE,
            label: 'Kế hoạch',
            component: 'TimelineSection',
            displayOrder: 4,
            isRequired: true,
            config: null,
          },
        ],
      };
      mockPrisma.formTemplate.findFirst.mockResolvedValue(templateWithTimeline);

      const result = await service.validate('template-123', {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Test',
          objective: 'Test',
          field: 'CNTT',
          duration: 12,
          startDate: '2026-01-01',
        },
        [SectionId.SEC_BUDGET]: {
          total: 50000000,
          sources: [{ name: 'Ngân sách', amount: 50000000 }],
        },
        [SectionId.SEC_TIMELINE]: {
          phases: [
            { name: 'Giai đoạn 1' }, // missing dates
          ],
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionId: SectionId.SEC_TIMELINE,
            field: 'phases[0].dates',
          }),
        ]),
      );
    });

    it('should return valid for complete form data', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const validFormData = {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Nghiên cứu AI',
          objective: 'Phát triển hệ thống',
          field: 'Công nghệ thông tin',
          duration: 12,
          startDate: '2026-01-01',
        },
        [SectionId.SEC_BUDGET]: {
          total: 50000000,
          sources: [
            { name: 'Ngân sách trường', amount: 30000000 },
            { name: 'Khác', amount: 20000000 },
          ],
        },
      };

      const result = await service.validate('template-123', validFormData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.missingRequiredSections).toEqual([]);
    });

    it('should handle template not found gracefully', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(null);

      const result = await service.validate('not-exist', {
        [SectionId.SEC_INFO_GENERAL]: { title: 'Test' },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([]);
    });

    it('should validate duration is positive number', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.validate('template-123', {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Test',
          objective: 'Test',
          field: 'CNTT',
          duration: -1, // negative duration
          startDate: '2026-01-01',
        },
        [SectionId.SEC_BUDGET]: {
          total: 50000000,
          sources: [{ name: 'Ngân sách', amount: 50000000 }],
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionId: SectionId.SEC_INFO_GENERAL,
            field: 'duration',
          }),
        ]),
      );
    });

    it('should validate budget total is positive', async () => {
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.validate('template-123', {
        [SectionId.SEC_INFO_GENERAL]: {
          title: 'Test',
          objective: 'Test',
          field: 'CNTT',
          duration: 12,
          startDate: '2026-01-01',
        },
        [SectionId.SEC_BUDGET]: {
          total: 0, // zero total
          sources: [{ name: 'Ngân sách', amount: 0 }],
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionId: SectionId.SEC_BUDGET,
            field: 'total',
          }),
        ]),
      );
    });
  });

  describe('getRequiredSections', () => {
    it('should return required section IDs', async () => {
      mockPrisma.formSection.findMany.mockResolvedValue([
        { sectionId: SectionId.SEC_INFO_GENERAL },
        { sectionId: SectionId.SEC_BUDGET },
      ]);

      const result = await service.getRequiredSections('template-123');

      expect(result).toEqual([
        SectionId.SEC_INFO_GENERAL,
        SectionId.SEC_BUDGET,
      ]);
      expect(mockPrisma.formSection.findMany).toHaveBeenCalledWith({
        where: {
          templateId: 'template-123',
          isRequired: true,
        },
        select: {
          sectionId: true,
        },
      });
    });

    it('should return empty array when no required sections', async () => {
      mockPrisma.formSection.findMany.mockResolvedValue([]);

      const result = await service.getRequiredSections('template-123');

      expect(result).toEqual([]);
    });
  });
});
