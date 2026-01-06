import { Test, TestingModule } from '@nestjs/testing';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';
import { NotFoundException } from '@nestjs/common';

describe('FormTemplatesController', () => {
  let controller: FormTemplatesController;
  let service: FormTemplatesService;

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
    ],
  };

  const mockFormTemplatesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findSections: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormTemplatesController],
      providers: [
        {
          provide: FormTemplatesService,
          useValue: mockFormTemplatesService,
        },
      ],
    }).compile();

    controller = module.get<FormTemplatesController>(FormTemplatesController);
    service = module.get<FormTemplatesService>(FormTemplatesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of templates', async () => {
      mockFormTemplatesService.findAll.mockResolvedValue([mockTemplate]);

      const result = await controller.findAll();

      expect(result).toEqual([mockTemplate]);
      expect(service.findAll).toHaveBeenCalledWith();
    });

    it('should return empty array when no templates', async () => {
      mockFormTemplatesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single template', async () => {
      mockFormTemplatesService.findOne.mockResolvedValue(mockTemplate);

      const result = await controller.findOne('MAU_01B');

      expect(result).toEqual(mockTemplate);
      expect(service.findOne).toHaveBeenCalledWith('MAU_01B');
    });

    it('should throw NotFoundException when template not found', async () => {
      mockFormTemplatesService.findOne.mockRejectedValue(
        new NotFoundException("Form template 'NOTEXIST' not found")
      );

      await expect(controller.findOne('NOTEXIST')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSections', () => {
    it('should return sections of a template', async () => {
      mockFormTemplatesService.findSections.mockResolvedValue(mockTemplate.sections);

      const result = await controller.findSections('MAU_01B');

      expect(result).toEqual(mockTemplate.sections);
      expect(service.findSections).toHaveBeenCalledWith('MAU_01B');
    });

    it('should throw NotFoundException when template not found', async () => {
      mockFormTemplatesService.findSections.mockRejectedValue(
        new NotFoundException("Form template 'NOTEXIST' not found")
      );

      await expect(controller.findSections('NOTEXIST')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      code: 'MAU_01B',
      name: 'Đề tài NCKH cấp trường',
      description: 'Mẫu đề tài NCKH cấp trường đầy đủ',
    };

    it('should create a new template', async () => {
      mockFormTemplatesService.create.mockResolvedValue(mockTemplate);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTemplate);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated name',
      description: 'Updated description',
    };

    it('should update a template', async () => {
      const updatedTemplate = { ...mockTemplate, ...updateDto };
      mockFormTemplatesService.update.mockResolvedValue(updatedTemplate);

      const result = await controller.update('uuid-1', updateDto);

      expect(result).toEqual(updatedTemplate);
      expect(service.update).toHaveBeenCalledWith('uuid-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a template', async () => {
      mockFormTemplatesService.remove.mockResolvedValue(undefined);

      await controller.remove('uuid-1');

      expect(service.remove).toHaveBeenCalledWith('uuid-1');
    });
  });
});
