import { Test, TestingModule } from '@nestjs/testing';
import { FormTemplatesService } from './form-templates.service';
import { PrismaService } from '../auth/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('FormTemplatesService', () => {
  let service: FormTemplatesService;
  let prismaService: any;

  const mockPrismaService = {
    formTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    formSection: {
      findMany: jest.fn(),
    },
  };

  const mockTemplate = {
    id: 'uuid-1',
    code: 'MAU_01B',
    name: 'Đề tài NCKH cấp trường',
    version: 'v1.0',
    description: 'Mẫu đề tài NCKH cấp trường đầy đủ',
    isActive: true,
    projectType: 'CAP_TRUONG',
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [
      {
        id: 'section-1',
        templateId: 'uuid-1',
        sectionId: 'SEC_INFO_GENERAL',
        label: 'Thông tin chung',
        component: 'InfoGeneralSection',
        displayOrder: 1,
        isRequired: true,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'section-2',
        templateId: 'uuid-1',
        sectionId: 'SEC_BUDGET',
        label: 'Kinh phí',
        component: 'BudgetSection',
        displayOrder: 5,
        isRequired: true,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormTemplatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FormTemplatesService>(FormTemplatesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all active templates with sections', async () => {
      mockPrismaService.formTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.findAll();

      expect(result).toEqual([expect.objectContaining({
        id: 'uuid-1',
        code: 'MAU_01B',
        name: 'Đề tài NCKH cấp trường',
        sections: expect.any(Array),
      })]);
      expect(prismaService.formTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          sections: {
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { code: 'asc' },
      });
    });

    it('should return all templates including inactive when requested', async () => {
      mockPrismaService.formTemplate.findMany.mockResolvedValue([mockTemplate]);

      await service.findAll(true);

      expect(prismaService.formTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          sections: {
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { code: 'asc' },
      });
    });

    it('should return empty array when no templates exist', async () => {
      mockPrismaService.formTemplate.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return template by ID', async () => {
      mockPrismaService.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(expect.objectContaining({
        id: 'uuid-1',
        code: 'MAU_01B',
      }));
      expect(prismaService.formTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'uuid-1' }, { code: 'uuid-1' }],
        },
        include: {
          sections: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    });

    it('should return template by code', async () => {
      mockPrismaService.formTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.findOne('MAU_01B');

      expect(result).toEqual(expect.objectContaining({
        code: 'MAU_01B',
      }));
    });

    it('should throw NotFoundException when template not found', async () => {
      mockPrismaService.formTemplate.findFirst.mockResolvedValue(null);

      await expect(service.findOne('NOTEXIST')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('NOTEXIST')).rejects.toThrow("Form template 'NOTEXIST' not found");
    });
  });

  describe('findSections', () => {
    it('should return sections for a template by ID', async () => {
      mockPrismaService.formTemplate.findFirst.mockResolvedValue({
        id: 'uuid-1',
      });
      mockPrismaService.formSection.findMany.mockResolvedValue(mockTemplate.sections);

      const result = await service.findSections('uuid-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        sectionId: 'SEC_INFO_GENERAL',
        label: 'Thông tin chung',
      }));
      expect(prismaService.formSection.findMany).toHaveBeenCalledWith({
        where: { templateId: 'uuid-1' },
        orderBy: { displayOrder: 'asc' },
      });
    });

    it('should return sections for a template by code', async () => {
      mockPrismaService.formTemplate.findFirst.mockResolvedValue({
        id: 'uuid-1',
      });
      mockPrismaService.formSection.findMany.mockResolvedValue(mockTemplate.sections);

      const result = await service.findSections('MAU_01B');

      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException when template not found', async () => {
      mockPrismaService.formTemplate.findFirst.mockResolvedValue(null);

      await expect(service.findSections('NOTEXIST')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      code: 'MAU_01B',
      name: 'Đề tài NCKH cấp trường',
      description: 'Mẫu đề tài NCKH cấp trường đầy đủ',
      sections: [
        {
          sectionId: 'SEC_INFO_GENERAL',
          label: 'Thông tin chung',
          component: 'InfoGeneralSection',
          displayOrder: 1,
          isRequired: true,
        },
      ],
    };

    it('should create a new template', async () => {
      mockPrismaService.formTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.create(createDto);

      expect(result).toEqual(expect.objectContaining({
        code: 'MAU_01B',
        name: 'Đề tài NCKH cấp trường',
      }));
      expect(prismaService.formTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'MAU_01B',
          name: 'Đề tài NCKH cấp trường',
          version: 'v1.0',
          isActive: true,
          projectType: 'CAP_TRUONG',
        }),
        include: {
          sections: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    });

    it('should create template with custom version', async () => {
      const dtoWithVersion = { ...createDto, version: 'v2.0' };
      mockPrismaService.formTemplate.create.mockResolvedValue(mockTemplate);

      await service.create(dtoWithVersion);

      expect(prismaService.formTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: 'v2.0',
        }),
        include: expect.anything(),
      });
    });

    it('should create template with empty sections array', async () => {
      const dtoWithEmptySections = { ...createDto, sections: [] };
      const templateWithEmptySections = { ...mockTemplate, sections: [] };
      mockPrismaService.formTemplate.create.mockResolvedValue(templateWithEmptySections);

      const result = await service.create(dtoWithEmptySections);

      expect(result.sections).toEqual([]);
    });

    it('should create template with null config for sections', async () => {
      const dtoWithNullConfig = {
        ...createDto,
        sections: [{
          ...createDto.sections[0],
          config: null,
        }],
      };
      mockPrismaService.formTemplate.create.mockResolvedValue(mockTemplate);

      await service.create(dtoWithNullConfig);

      expect(prismaService.formTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sections: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                config: null,
              }),
            ]),
          }),
        }),
        include: expect.anything(),
      });
    });

    it('should handle concurrent template creation', async () => {
      mockPrismaService.formTemplate.create
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce({ ...mockTemplate, id: 'uuid-2', code: 'MAU_02B' });

      const results = await Promise.all([
        service.create(createDto),
        service.create({ ...createDto, code: 'MAU_02B' }),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].code).toBe('MAU_01B');
      expect(results[1].code).toBe('MAU_02B');
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated name',
      description: 'Updated description',
      isActive: false,
    };

    it('should update a template', async () => {
      const updatedTemplate = { ...mockTemplate, ...updateDto };
      mockPrismaService.formTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.formTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await service.update('uuid-1', updateDto);

      expect(result).toEqual(expect.objectContaining({
        name: 'Updated name',
        description: 'Updated description',
        isActive: false,
      }));
      expect(prismaService.formTemplate.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: updateDto,
        include: {
          sections: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    });

    it('should throw NotFoundException when updating non-existent template', async () => {
      mockPrismaService.formTemplate.findUnique.mockResolvedValue(null);

      await expect(service.update('notexist', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a template', async () => {
      mockPrismaService.formTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.formTemplate.delete.mockResolvedValue(mockTemplate);

      await service.remove('uuid-1');

      expect(prismaService.formTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent template', async () => {
      mockPrismaService.formTemplate.findUnique.mockResolvedValue(null);

      await expect(service.remove('notexist')).rejects.toThrow(NotFoundException);
    });
  });
});
