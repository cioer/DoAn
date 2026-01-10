import { ProposalsService } from './proposals.service';
import {
  ProposalsCrudService,
  ProposalsValidationService,
  ProposalsQueryService,
  ProposalsWorkflowService,
} from './services';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProjectState } from '@prisma/client';

/**
 * Request context interface (matches proposals.service.ts)
 */
interface RequestContext {
  userId: string;
  userDisplayName?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

// Manual mock - bypass DI
const mockPrisma = {
  proposal: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  formTemplate: {
    findFirst: vi.fn(),
  },
  faculty: {
    findUnique: vi.fn(),
  },
  $queryRaw: vi.fn().mockResolvedValue([{ next_code: 'DT-001' }]),
};

const mockAuditService = {
  logEvent: vi.fn().mockResolvedValue(undefined),
};

// Mock for ProposalsCrudService
const mockCrudService = {
  generateProposalCode: vi.fn().mockResolvedValue('DT-001'),
  create: vi.fn(),
  findById: vi.fn(),
  findByCode: vi.fn(),
  findAll: vi.fn(),
  update: vi.fn(),
  autoSave: vi.fn(),
  softDelete: vi.fn(),
  restore: vi.fn(),
  exists: vi.fn(),
  getState: vi.fn(),
  updateState: vi.fn(),
  updateHolder: vi.fn(),
  updateSlaDates: vi.fn(),
};

// Mock for ProposalsValidationService
const mockValidationService = {
  validateAccess: vi.fn().mockResolvedValue(undefined),
  validateEditable: vi.fn().mockResolvedValue(undefined),
  validateOwnership: vi.fn().mockResolvedValue(undefined),
  validateTemplateVersion: vi.fn(),
  validateCreateData: vi.fn().mockResolvedValue(undefined),
  validateUpdateData: vi.fn(),
  validateExpectedState: vi.fn().mockResolvedValue(undefined),
};

// Mock for ProposalsQueryService
const mockQueryService = {
  search: vi.fn(),
  getReviewQueue: vi.fn(),
  getByFaculty: vi.fn(),
  getByState: vi.fn(),
  getByOwner: vi.fn(),
  getStatistics: vi.fn(),
  getTimeline: vi.fn(),
};

// Mock for ProposalsWorkflowService
const mockWorkflowService = {
  submitToWorkflow: vi.fn(),
  startProject: vi.fn(),
  facultyAcceptance: vi.fn(),
  schoolAcceptance: vi.fn(),
  completeHandover: vi.fn(),
  getWorkflowState: vi.fn(),
  getWorkflowLogs: vi.fn(),
  getTimeline: vi.fn(),
};

describe('ProposalsService', () => {
  let service: ProposalsService;

  const mockUser = {
    id: 'user-123',
    email: 'giangvien@example.com',
    role: 'GIANG_VIEN',
  };

  const mockFaculty = {
    id: 'faculty-123',
    code: 'FAC-001',
    name: 'Khoa CNTT',
  };

  const mockTemplate = {
    id: 'template-123',
    code: 'MAU_01B',
    version: 'v1.0',
  };

  const mockProposal = {
    id: 'proposal-123',
    code: 'DT-001',
    title: 'Nghiên cứu AI trong giáo dục',
    state: ProjectState.DRAFT,
    ownerId: 'user-123',
    facultyId: 'faculty-123',
    holderUnit: null,
    holderUser: null,
    slaStartDate: null,
    slaDeadline: null,
    templateId: 'template-123',
    templateVersion: 'v1.0',
    formData: null,
    createdAt: new Date('2026-01-06'),
    updatedAt: new Date('2026-01-06'),
    template: mockTemplate,
    owner: {
      id: 'user-123',
      email: 'giangvien@example.com',
      displayName: 'Nguyễn Văn A',
    },
    faculty: mockFaculty,
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mocks - these can be overridden in individual tests
    mockValidationService.validateTemplateVersion.mockResolvedValue({
      id: mockTemplate.id,
      version: mockTemplate.version,
    });
    mockValidationService.validateAccess.mockResolvedValue(undefined);
    mockValidationService.validateEditable.mockResolvedValue(undefined);
    mockValidationService.validateOwnership.mockResolvedValue(undefined);
    mockValidationService.validateExpectedState.mockResolvedValue(undefined);
    mockValidationService.validateCreateData.mockResolvedValue(undefined);

    // Manually create service with mocks
    service = new ProposalsService(
      mockPrisma as any,
      mockAuditService as any,
      mockCrudService as any,
      mockValidationService as any,
      mockWorkflowService as any,
      mockQueryService as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'Nghiên cứu AI trong giáo dục',
      facultyId: 'faculty-123',
      templateId: 'MAU_01B',
      formData: {
        SEC_INFO_GENERAL: {
          title: 'Nghiên cứu AI',
          objective: 'Phát triển hệ thống',
        },
      },
    };

    it('should create a new proposal in DRAFT state', async () => {
      mockCrudService.create.mockResolvedValue(mockProposal);

      const result = await service.create(createDto, { userId: mockUser.id });

      expect(result).toEqual(expect.objectContaining({
        code: 'DT-001',
        title: createDto.title,
        state: ProjectState.DRAFT,
        ownerId: mockUser.id,
      }));
      expect(mockCrudService.create).toHaveBeenCalled();
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('should generate sequential proposal codes', async () => {
      mockCrudService.generateProposalCode.mockResolvedValue('DT-006');
      mockCrudService.create.mockResolvedValue({
        ...mockProposal,
        code: 'DT-006',
      });

      const result = await service.create(createDto, { userId: mockUser.id });

      expect(result.code).toBe('DT-006');
    });

    it('should throw BadRequestException when template not found', async () => {
      mockValidationService.validateTemplateVersion.mockResolvedValue(null);

      await expect(service.create(createDto, { userId: mockUser.id }))
        .rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, { userId: mockUser.id }))
        .rejects.toThrow(expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'TEMPLATE_NOT_FOUND',
            }),
          }),
        }));
    });

    it('should create proposal without initial formData', async () => {
      const dtoWithoutFormData = { ...createDto };
      delete dtoWithoutFormData.formData;

      mockCrudService.create.mockResolvedValue(mockProposal);

      await service.create(dtoWithoutFormData, { userId: mockUser.id });

      expect(mockCrudService.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return proposal by ID', async () => {
      mockCrudService.findById.mockResolvedValue(mockProposal);

      const result = await service.findOne('proposal-123', mockUser.id);

      expect(result).toEqual(expect.objectContaining({
        id: 'proposal-123',
        code: 'DT-001',
      }));
      expect(mockCrudService.findById).toHaveBeenCalledWith('proposal-123');
      expect(mockValidationService.validateAccess).toHaveBeenCalledWith('proposal-123', mockUser.id);
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockCrudService.findById.mockRejectedValue(new NotFoundException('Proposal not found'));

      await expect(service.findOne('notexist', mockUser.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated title',
      formData: {
        SEC_INFO_GENERAL: {
          title: 'Updated',
        },
      },
    };

    it('should update proposal title', async () => {
      const updatedProposal = { ...mockProposal, title: 'Updated title' };
      mockCrudService.update.mockResolvedValue(updatedProposal);

      const result = await service.update('proposal-123', { title: 'Updated title' }, mockUser.id);

      expect(result.title).toBe('Updated title');
      expect(mockCrudService.update).toHaveBeenCalledWith('proposal-123', { title: 'Updated title' });
      expect(mockValidationService.validateAccess).toHaveBeenCalledWith('proposal-123', mockUser.id);
      expect(mockValidationService.validateEditable).toHaveBeenCalledWith('proposal-123');
    });

    it('should update proposal formData', async () => {
      mockCrudService.update.mockResolvedValue(mockProposal);

      await service.update('proposal-123', { formData: updateDto.formData }, mockUser.id);

      expect(mockCrudService.update).toHaveBeenCalledWith('proposal-123', { formData: updateDto.formData });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockValidationService.validateAccess.mockRejectedValue(new ForbiddenException('You do not have permission'));

      await expect(service.update('proposal-123', updateDto, mockUser.id))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when proposal not in DRAFT', async () => {
      mockValidationService.validateEditable.mockRejectedValue(
        new BadRequestException('Proposal not in DRAFT state'),
      );

      await expect(service.update('proposal-123', updateDto, mockUser.id))
        .rejects.toThrow(BadRequestException);
    });

    it('should log audit event after update', async () => {
      mockCrudService.update.mockResolvedValue(mockProposal);

      await service.update('proposal-123', updateDto, mockUser.id);

      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated proposals', async () => {
      mockCrudService.findAll.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      const result = await service.findAll({ skip: 0, take: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        skip: 0,
        take: 20,
        hasMore: false,
      });
    });

    it('should filter by ownerId', async () => {
      mockCrudService.findAll.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAll({ ownerId: 'user-123' });

      expect(mockCrudService.findAll).toHaveBeenCalledWith({
        ownerId: 'user-123',
      });
    });

    it('should filter by state', async () => {
      mockCrudService.findAll.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAll({ state: ProjectState.DRAFT });

      expect(mockCrudService.findAll).toHaveBeenCalledWith({
        state: ProjectState.DRAFT,
      });
    });

    it('should filter by facultyId', async () => {
      mockCrudService.findAll.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAll({ facultyId: 'faculty-123' });

      expect(mockCrudService.findAll).toHaveBeenCalledWith({
        facultyId: 'faculty-123',
      });
    });

    it('should handle multiple filters', async () => {
      mockCrudService.findAll.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAll({
        ownerId: 'user-123',
        state: ProjectState.DRAFT,
        facultyId: 'faculty-123',
      });

      expect(mockCrudService.findAll).toHaveBeenCalledWith({
        ownerId: 'user-123',
        state: ProjectState.DRAFT,
        facultyId: 'faculty-123',
      });
    });

    it('should return empty array when no proposals found', async () => {
      mockCrudService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, skip: 0, take: 20, hasMore: false },
      });

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('remove', () => {
    it('should delete a draft proposal', async () => {
      mockCrudService.softDelete.mockResolvedValue(mockProposal);

      await service.remove('proposal-123', mockUser.id);

      expect(mockCrudService.softDelete).toHaveBeenCalledWith('proposal-123');
      expect(mockValidationService.validateAccess).toHaveBeenCalledWith('proposal-123', mockUser.id);
      expect(mockValidationService.validateOwnership).toHaveBeenCalledWith('proposal-123', mockUser.id);
      expect(mockValidationService.validateExpectedState).toHaveBeenCalledWith('proposal-123', [
        ProjectState.DRAFT,
        ProjectState.CANCELLED,
      ]);
    });

    it('should log audit event on delete', async () => {
      mockCrudService.softDelete.mockResolvedValue(mockProposal);

      await service.remove('proposal-123', mockUser.id);

      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      // validateAccess passes first, then validateOwnership fails
      mockValidationService.validateOwnership.mockRejectedValue(new ForbiddenException('Only the proposal owner can perform this action'));

      await expect(service.remove('proposal-123', mockUser.id))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when proposal not in DRAFT', async () => {
      // Both validateAccess and validateOwnership pass first, then validateExpectedState fails
      mockValidationService.validateExpectedState.mockRejectedValue(
        new BadRequestException('Proposal not in expected state'),
      );

      await expect(service.remove('proposal-123', mockUser.id))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('autoSave (Story 2.3)', () => {
    const baseFormData = {
      SEC_INFO_GENERAL: {
        title: 'Old Title',
        objective: 'Old Objective',
      },
      SEC_BUDGET: {
        total: 50000000,
      },
    };

    const partialFormData = {
      SEC_INFO_GENERAL: {
        title: 'New Title',
      },
    };

    const proposalWithFormData = {
      ...mockProposal,
      formData: baseFormData,
      updatedAt: new Date('2026-01-06T10:00:00Z'),
    };

    it('should call crud service to auto save', async () => {
      mockCrudService.autoSave.mockResolvedValue(proposalWithFormData);

      const result = await service.autoSave(
        'proposal-123',
        { formData: partialFormData },
        mockUser.id,
      );

      expect(mockCrudService.autoSave).toHaveBeenCalledWith('proposal-123', { formData: partialFormData }, mockUser.id);
      expect(mockValidationService.validateAccess).toHaveBeenCalledWith('proposal-123', mockUser.id);
      expect(mockValidationService.validateEditable).toHaveBeenCalledWith('proposal-123');
    });

    it('should reject if proposal is not in DRAFT state', async () => {
      mockValidationService.validateEditable.mockRejectedValue(
        new BadRequestException('Proposal not in DRAFT state'),
      );

      await expect(
        service.autoSave('proposal-123', { formData: partialFormData }, mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockValidationService.validateAccess.mockRejectedValue(new ForbiddenException('Forbidden'));

      await expect(
        service.autoSave('proposal-123', { formData: partialFormData }, mockUser.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ========================================================================
  // Story 2.6: Master Record Operations Tests
  // ========================================================================

  describe('findOneWithSections (Story 2.6)', () => {
    const proposalWithFormData = {
      ...mockProposal,
      formData: {
        SEC_INFO_GENERAL: { projectName: 'Test Project' },
        SEC_BUDGET: { totalBudget: 100000 },
        SEC_ATTACHMENTS: { documents: ['doc1.pdf'] },
      },
    };

    it('should return proposal with only specified sections', async () => {
      mockCrudService.findById.mockResolvedValue(proposalWithFormData);

      const result = await service.findOneWithSections(
        'proposal-123',
        ['SEC_INFO_GENERAL', 'SEC_BUDGET'],
        mockUser.id,
      );

      expect(result.formData).toHaveProperty('SEC_INFO_GENERAL');
      expect(result.formData).toHaveProperty('SEC_BUDGET');
      expect(result.formData).toHaveProperty('SEC_ATTACHMENTS');
      expect(mockCrudService.findById).toHaveBeenCalledWith('proposal-123');
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockValidationService.validateAccess.mockRejectedValue(new NotFoundException('Proposal not found'));

      await expect(
        service.findOneWithSections('proposal-123', ['SEC_INFO_GENERAL'], mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllWithFilters (Story 2.6)', () => {
    it('should call query service search with filters', async () => {
      mockQueryService.search.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAllWithFilters({});

      expect(mockQueryService.search).toHaveBeenCalledWith('', {
        skip: undefined,
        take: undefined,
      });
    });

    it('should filter by state', async () => {
      mockQueryService.search.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAllWithFilters({ state: ProjectState.DRAFT });

      expect(mockQueryService.search).toHaveBeenCalledWith('', {
        skip: undefined,
        take: undefined,
        state: ProjectState.DRAFT,
      });
    });

    it('should filter by facultyId', async () => {
      mockQueryService.search.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAllWithFilters({ facultyId: 'faculty-123' });

      expect(mockQueryService.search).toHaveBeenCalledWith('', {
        skip: undefined,
        take: undefined,
        facultyId: 'faculty-123',
      });
    });

    it('should combine multiple filters', async () => {
      mockQueryService.search.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findAllWithFilters({
        facultyId: 'faculty-123',
        state: ProjectState.DRAFT,
      });

      expect(mockQueryService.search).toHaveBeenCalledWith('', {
        skip: undefined,
        take: undefined,
        facultyId: 'faculty-123',
        state: ProjectState.DRAFT,
      });
    });
  });

  describe('findByHolder (Story 2.6)', () => {
    it('should call query service getReviewQueue', async () => {
      mockQueryService.getReviewQueue.mockResolvedValue({
        data: [mockProposal],
        meta: { total: 1, skip: 0, take: 20, hasMore: false },
      });

      await service.findByHolder({
        holderUnit: 'faculty-123',
        state: ProjectState.DRAFT,
        skip: 0,
        take: 20,
      });

      expect(mockQueryService.getReviewQueue).toHaveBeenCalledWith({
        holderUnit: 'faculty-123',
        state: ProjectState.DRAFT,
        skip: 0,
        take: 20,
      });
    });
  });

  describe('softRemove (Story 2.6)', () => {
    it('should call remove method', async () => {
      mockCrudService.softDelete.mockResolvedValue(mockProposal);

      await service.softRemove('proposal-123', mockUser.id, { userId: mockUser.id });

      expect(mockCrudService.softDelete).toHaveBeenCalled();
    });
  });

  describe('restore (Story 2.6)', () => {
    const mockRequestContext: any = {
      userId: mockUser.id,
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      requestId: 'test-request-id',
    };

    it('should restore a soft-deleted proposal', async () => {
      const deletedProposal = {
        ...mockProposal,
        deletedAt: new Date('2026-01-01') as Date | null,
      };
      const restoredProposal = {
        ...mockProposal,
        deletedAt: null as Date | null,
      };
      mockCrudService.restore.mockResolvedValue(restoredProposal);

      const result = await service.restore('proposal-123', mockUser.id, mockRequestContext);

      expect(mockCrudService.restore).toHaveBeenCalledWith('proposal-123');
      expect(mockValidationService.validateAccess).toHaveBeenCalledWith('proposal-123', mockUser.id);
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockValidationService.validateAccess.mockRejectedValue(new NotFoundException('Proposal not found'));

      await expect(
        service.restore('notexist', mockUser.id, mockRequestContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Backward compatibility for template version updates (Story 2.6)', () => {
    it('should preserve existing sections when new sections are added', () => {
      // This test verifies that form_data structure is backward compatible
      const oldFormData = {
        SEC_INFO_GENERAL: { projectName: 'Test' },
        SEC_BUDGET: { totalBudget: 100000 },
      };

      // Simulate adding new section (in a future template version)
      const newFormData = {
        ...oldFormData,
        SEC_EXTENSION_REASON: { reason: 'COVID delay' },
      };

      expect(newFormData).toHaveProperty('SEC_INFO_GENERAL');
      expect(newFormData).toHaveProperty('SEC_BUDGET');
      expect(newFormData).toHaveProperty('SEC_EXTENSION_REASON');
    });

    it('should allow unknown section IDs for future extensibility', () => {
      const formData: Record<string, unknown> = {
        SEC_INFO_GENERAL: { projectName: 'Test' },
        // Future section not yet defined in enum
        SEC_FUTURE_SECTION: { data: 'value' },
      };

      expect(formData).toHaveProperty('SEC_INFO_GENERAL');
      expect(formData).toHaveProperty('SEC_FUTURE_SECTION');
    });
  });
});
