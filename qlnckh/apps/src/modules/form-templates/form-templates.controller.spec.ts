import { FormTemplatesController } from './form-templates.controller';
import { NotFoundException } from '@nestjs/common';

describe('FormTemplatesController', () => {
  let controller: FormTemplatesController;
  let mockService: any;

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

  beforeEach(() => {
    // Create mock service
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findSections: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    // Manually create controller with mock service - bypass DI
    controller = new FormTemplatesController(mockService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of templates', async () => {
      mockService.findAll.mockResolvedValue([mockTemplate]);

      const result = await controller.findAll();

      expect(result).toEqual([mockTemplate]);
      expect(mockService.findAll).toHaveBeenCalledWith();
    });

    it('should return empty array when no templates', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single template', async () => {
      mockService.findOne.mockResolvedValue(mockTemplate);

      const result = await controller.findOne('MAU_01B');

      expect(result).toEqual(mockTemplate);
      expect(mockService.findOne).toHaveBeenCalledWith('MAU_01B');
    });

    it('should throw NotFoundException when template not found', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException("Form template 'NOTEXIST' not found")
      );

      await expect(controller.findOne('NOTEXIST')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSections', () => {
    it('should return sections of a template', async () => {
      mockService.findSections.mockResolvedValue(mockTemplate.sections);

      const result = await controller.findSections('MAU_01B');

      expect(result).toEqual(mockTemplate.sections);
      expect(mockService.findSections).toHaveBeenCalledWith('MAU_01B');
    });

    it('should throw NotFoundException when template not found', async () => {
      mockService.findSections.mockRejectedValue(
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
      mockService.create.mockResolvedValue(mockTemplate);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTemplate);
      expect(mockService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated name',
      description: 'Updated description',
    };

    it('should update a template', async () => {
      const updatedTemplate = { ...mockTemplate, ...updateDto };
      mockService.update.mockResolvedValue(updatedTemplate);

      const result = await controller.update('uuid-1', updateDto);

      expect(result).toEqual(updatedTemplate);
      expect(mockService.update).toHaveBeenCalledWith('uuid-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a template', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('uuid-1');

      expect(mockService.remove).toHaveBeenCalledWith('uuid-1');
    });
  });
});
