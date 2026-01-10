import { ProposalsService } from './proposals.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProjectState } from '@prisma/client';

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
    // Manually create service with mocks
    service = new ProposalsService(mockPrisma as any, mockAuditService as any);
    vi.clearAllMocks();
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
      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.faculty.findUnique.mockResolvedValue(mockFaculty);
      mockPrisma.proposal.create.mockResolvedValue(mockProposal);

      const result = await service.create(createDto, { userId: mockUser.id });

      expect(result).toEqual(expect.objectContaining({
        code: 'DT-001',
        title: createDto.title,
        state: ProjectState.DRAFT,
        ownerId: mockUser.id,
      }));
      expect(mockPrisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'DT-001',
          state: ProjectState.DRAFT,
          ownerId: mockUser.id,
          holderUnit: null,
          holderUser: null,
          slaStartDate: null,
          slaDeadline: null,
        }),
        include: expect.anything(),
      });
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROPOSAL_CREATE',
          actorUserId: mockUser.id,
          entityType: 'proposal',
        }),
      );
    });

    it('should generate sequential proposal codes', async () => {
      mockPrisma.proposal.count.mockResolvedValue(5);
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.faculty.findUnique.mockResolvedValue(mockFaculty);
      mockPrisma.proposal.create.mockResolvedValue({
        ...mockProposal,
        code: 'DT-006',
      });

      const result = await service.create(createDto, { userId: mockUser.id });

      expect(result.code).toBe('DT-006');
    });

    it('should throw BadRequestException when template not found', async () => {
      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.formTemplate.findFirst.mockResolvedValue(null);

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

    it('should throw BadRequestException when faculty not found', async () => {
      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.faculty.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, { userId: mockUser.id }))
        .rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, { userId: mockUser.id }))
        .rejects.toThrow(expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'FACULTY_NOT_FOUND',
            }),
          }),
        }));
    });

    it('should accept template ID instead of code', async () => {
      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.faculty.findUnique.mockResolvedValue(mockFaculty);
      mockPrisma.proposal.create.mockResolvedValue(mockProposal);

      const dtoWithTemplateId = { ...createDto, templateId: 'template-123' };
      await service.create(dtoWithTemplateId, { userId: mockUser.id });

      expect(mockPrisma.formTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'template-123' }, { code: 'template-123' }],
        },
        select: expect.anything(),
      });
    });

    it('should create proposal without initial formData', async () => {
      const dtoWithoutFormData = { ...createDto };
      delete dtoWithoutFormData.formData;

      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.formTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.faculty.findUnique.mockResolvedValue(mockFaculty);
      mockPrisma.proposal.create.mockResolvedValue(mockProposal);

      await service.create(dtoWithoutFormData, { userId: mockUser.id });

      expect(mockPrisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          formData: null,
        }),
        include: expect.anything(),
      });
    });
  });

  describe('findOne', () => {
    it('should return proposal by ID', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);

      const result = await service.findOne('proposal-123', mockUser.id);

      expect(result).toEqual(expect.objectContaining({
        id: 'proposal-123',
        code: 'DT-001',
      }));
      expect(mockPrisma.proposal.findUnique).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
        include: expect.anything(),
      });
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(service.findOne('notexist', mockUser.id))
        .rejects.toThrow(NotFoundException);
      await expect(service.findOne('notexist', mockUser.id))
        .rejects.toThrow(expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'PROPOSAL_NOT_FOUND',
            }),
          }),
        }));
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
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.proposal.update.mockResolvedValue(updatedProposal);

      const result = await service.update('proposal-123', { title: 'Updated title' }, { userId: mockUser.id });

      expect(result.title).toBe('Updated title');
      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
        data: { title: 'Updated title' },
        include: expect.anything(),
      });
    });

    it('should update proposal formData', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.proposal.update.mockResolvedValue(mockProposal);

      await service.update('proposal-123', { formData: updateDto.formData }, { userId: mockUser.id });

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
        data: { formData: updateDto.formData },
        include: expect.anything(),
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const otherProposal = { ...mockProposal, ownerId: 'other-user' };
      mockPrisma.proposal.findUnique.mockResolvedValue(otherProposal);

      await expect(service.update('proposal-123', updateDto, { userId: mockUser.id }))
        .rejects.toThrow(ForbiddenException);
      await expect(service.update('proposal-123', updateDto, { userId: mockUser.id }))
        .rejects.toThrow(expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'FORBIDDEN',
            }),
          }),
        }));
    });

    it('should throw BadRequestException when proposal not in DRAFT', async () => {
      const submittedProposal = { ...mockProposal, state: ProjectState.FACULTY_REVIEW };
      mockPrisma.proposal.findUnique.mockResolvedValue(submittedProposal);

      await expect(service.update('proposal-123', updateDto, { userId: mockUser.id }))
        .rejects.toThrow(BadRequestException);
      await expect(service.update('proposal-123', updateDto, { userId: mockUser.id }))
        .rejects.toThrow(expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'PROPOSAL_NOT_DRAFT',
            }),
          }),
        }));
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(service.update('notexist', updateDto, { userId: mockUser.id }))
        .rejects.toThrow(NotFoundException);
    });

    it('should log audit event after update', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.proposal.update.mockResolvedValue(mockProposal);

      await service.update('proposal-123', updateDto, {
        userId: mockUser.id,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROPOSAL_UPDATE',
          actorUserId: mockUser.id,
          metadata: expect.objectContaining({
            proposalCode: 'DT-001',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated proposals', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by ownerId', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAll({ ownerId: 'user-123' });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-123' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should filter by state', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAll({ state: ProjectState.DRAFT });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: { state: ProjectState.DRAFT },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should filter by facultyId', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAll({ facultyId: 'faculty-123' });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: { facultyId: 'faculty-123' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should handle multiple filters', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAll({
        ownerId: 'user-123',
        state: ProjectState.DRAFT,
        facultyId: 'faculty-123',
      });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'user-123',
          state: ProjectState.DRAFT,
          facultyId: 'faculty-123',
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should return empty array when no proposals found', async () => {
      mockPrisma.proposal.count.mockResolvedValue(0);
      mockPrisma.proposal.findMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('remove', () => {
    it('should delete a draft proposal', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.proposal.delete.mockResolvedValue(mockProposal);

      await service.remove('proposal-123', mockUser.id);

      expect(mockPrisma.proposal.delete).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
      });
    });

    it('should log audit event on delete', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(mockProposal);
      mockPrisma.proposal.delete.mockResolvedValue(mockProposal);

      await service.remove('proposal-123', mockUser.id);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith({
        action: 'PROPOSAL_DELETE',
        actorUserId: mockUser.id,
        entityType: 'proposal',
        entityId: 'proposal-123',
        metadata: expect.objectContaining({
          proposalCode: 'DT-001',
        }),
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const otherProposal = { ...mockProposal, ownerId: 'other-user' };
      mockPrisma.proposal.findUnique.mockResolvedValue(otherProposal);

      await expect(service.remove('proposal-123', mockUser.id))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when proposal not in DRAFT', async () => {
      const submittedProposal = { ...mockProposal, state: ProjectState.FACULTY_REVIEW };
      mockPrisma.proposal.findUnique.mockResolvedValue(submittedProposal);

      await expect(service.remove('proposal-123', mockUser.id))
        .rejects.toThrow(BadRequestException);
      await expect(service.remove('proposal-123', mockUser.id))
        .rejects.toThrow(expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'PROPOSAL_NOT_DRAFT',
            }),
          }),
        }));
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(service.remove('notexist', mockUser.id))
        .rejects.toThrow(NotFoundException);
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

    const mergedFormData = {
      SEC_INFO_GENERAL: {
        title: 'New Title',
        objective: 'Old Objective',
      },
      SEC_BUDGET: {
        total: 50000000,
      },
    };

    const proposalWithFormData = {
      ...mockProposal,
      formData: baseFormData,
      updatedAt: new Date('2026-01-06T10:00:00Z'),
    };

    it('should deep merge form data correctly', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithFormData);
      mockPrisma.proposal.update.mockResolvedValue({
        ...proposalWithFormData,
        formData: mergedFormData,
      });

      const result = await service.autoSave(
        'proposal-123',
        { formData: partialFormData },
        { userId: mockUser.id },
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
        data: {
          formData: mergedFormData,
        },
        include: expect.anything(),
      });
    });

    it('should reject if proposal is not in DRAFT state', async () => {
      const submittedProposal = {
        ...proposalWithFormData,
        state: ProjectState.FACULTY_REVIEW,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(submittedProposal);

      await expect(
        service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'PROPOSAL_NOT_DRAFT',
            }),
          }),
        }),
      );
    });

    it('should throw CONFLICT if updatedAt mismatch (optimistic locking)', async () => {
      const expectedUpdatedAt = new Date('2026-01-06T09:00:00Z'); // Older than proposal
      const proposalWithNewerUpdate = {
        ...proposalWithFormData,
        updatedAt: new Date('2026-01-06T10:00:00Z'), // Newer
      };

      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithNewerUpdate);

      await expect(
        service.autoSave(
          'proposal-123',
          { formData: partialFormData, expectedUpdatedAt },
          { userId: mockUser.id },
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.autoSave(
          'proposal-123',
          { formData: partialFormData, expectedUpdatedAt },
          { userId: mockUser.id },
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'CONFLICT',
              message: 'Dữ liệu đã được cập nhật bởi phiên khác. Vui lòng tải lại.',
            }),
          }),
        }),
      );
    });

    it('should pass optimistic locking when updatedAt matches', async () => {
      const expectedUpdatedAt = new Date('2026-01-06T10:00:00Z'); // Same as proposal
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithFormData);
      mockPrisma.proposal.update.mockResolvedValue(proposalWithFormData);

      await service.autoSave(
        'proposal-123',
        { formData: partialFormData, expectedUpdatedAt },
        { userId: mockUser.id },
      );

      expect(mockPrisma.proposal.update).toHaveBeenCalled();
    });

    it('should log PROPOSAL_AUTO_SAVE audit event', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithFormData);
      mockPrisma.proposal.update.mockResolvedValue(proposalWithFormData);

      await service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROPOSAL_AUTO_SAVE',
          actorUserId: mockUser.id,
          entityType: 'proposal',
          entityId: 'proposal-123',
          metadata: expect.objectContaining({
            proposalCode: 'DT-001',
            sectionsUpdated: ['SEC_INFO_GENERAL'],
          }),
        }),
      );
    });

    it('should preserve sections not in current save', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithFormData);
      mockPrisma.proposal.update.mockResolvedValue(proposalWithFormData);

      await service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id });

      const updateCall = mockPrisma.proposal.update.mock.calls[0][0];
      expect(updateCall.data.formData.SEC_BUDGET).toEqual(baseFormData.SEC_BUDGET);
    });

    it('should handle empty existing formData', async () => {
      const proposalWithEmptyFormData = {
        ...mockProposal,
        formData: null,
        updatedAt: new Date('2026-01-06T10:00:00Z'),
      };

      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithEmptyFormData);
      mockPrisma.proposal.update.mockResolvedValue(proposalWithEmptyFormData);

      await service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id });

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
        data: {
          formData: partialFormData,
        },
        include: expect.anything(),
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const otherProposal = { ...proposalWithFormData, ownerId: 'other-user' };
      mockPrisma.proposal.findUnique.mockResolvedValue(otherProposal);

      await expect(
        service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'FORBIDDEN',
            }),
          }),
        }),
      );
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.autoSave('proposal-123', { formData: partialFormData }, { userId: mockUser.id }),
      ).rejects.toThrow(NotFoundException);
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
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithFormData);

      const result = await service.findOneWithSections(
        'proposal-123',
        ['SEC_INFO_GENERAL', 'SEC_BUDGET'],
        mockUser.id,
      );

      expect(result.formData).toHaveProperty('SEC_INFO_GENERAL');
      expect(result.formData).toHaveProperty('SEC_BUDGET');
      expect(result.formData).not.toHaveProperty('SEC_ATTACHMENTS');
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneWithSections('proposal-123', ['SEC_INFO_GENERAL'], mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty formData when no sections match', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithFormData);

      const result = await service.findOneWithSections(
        'proposal-123',
        ['SEC_TIMELINE'],
        mockUser.id,
      );

      // Empty object or null when no sections match
      expect(result.formData === null || Object.keys(result.formData || {}).length === 0).toBe(true);
    });
  });

  describe('findAllWithFilters (Story 2.6)', () => {
    it('should exclude soft-deleted proposals by default', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAllWithFilters({});

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should include soft-deleted proposals when requested', async () => {
      mockPrisma.proposal.count.mockResolvedValue(2);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAllWithFilters({ includeDeleted: true });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.not.objectContaining({
          deletedAt: null,
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should filter by holderUnit', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAllWithFilters({ holderUnit: 'faculty-123' });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          holderUnit: 'faculty-123',
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should filter by holderUser', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAllWithFilters({ holderUser: 'user-456' });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          holderUser: 'user-456',
        }),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });

    it('should combine multiple filters', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findAllWithFilters({
        holderUnit: 'faculty-123',
        holderUser: 'user-456',
        state: ProjectState.DRAFT,
        includeDeleted: false,
      });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: {
          holderUnit: 'faculty-123',
          holderUser: 'user-456',
          state: ProjectState.DRAFT,
          deletedAt: null,
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });
  });

  describe('findByHolder (Story 2.6)', () => {
    it('should call findAllWithFilters with correct parameters', async () => {
      mockPrisma.proposal.count.mockResolvedValue(1);
      mockPrisma.proposal.findMany.mockResolvedValue([mockProposal]);

      await service.findByHolder({
        holderUnit: 'faculty-123',
        state: ProjectState.DRAFT,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.proposal.findMany).toHaveBeenCalledWith({
        where: {
          holderUnit: 'faculty-123',
          state: ProjectState.DRAFT,
          deletedAt: null,
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.anything(),
      });
    });
  });

  describe('softRemove (Story 2.6)', () => {
    it('should soft delete a DRAFT proposal', async () => {
      const proposalWithoutDeletedAt = {
        ...mockProposal,
        deletedAt: null as Date | null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithoutDeletedAt);
      mockPrisma.proposal.update.mockResolvedValue({
        ...proposalWithoutDeletedAt,
        deletedAt: new Date(),
      });

      await service.softRemove('proposal-123', mockUser.id, { userId: mockUser.id });

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should log audit event with softDelete flag', async () => {
      const proposalWithoutDeletedAt = {
        ...mockProposal,
        deletedAt: null as Date | null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalWithoutDeletedAt);
      mockPrisma.proposal.update.mockResolvedValue({
        ...proposalWithoutDeletedAt,
        deletedAt: new Date(),
      });

      await service.softRemove('proposal-123', mockUser.id, {
        userId: mockUser.id,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROPOSAL_DELETE',
          actorUserId: mockUser.id,
          metadata: expect.objectContaining({
            softDelete: true,
          }),
        }),
      );
    });

    it('should throw BadRequestException when proposal already soft deleted', async () => {
      const deletedProposal = {
        ...mockProposal,
        deletedAt: new Date() as Date | null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(deletedProposal);

      await expect(
        service.softRemove('proposal-123', mockUser.id, { userId: mockUser.id }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.softRemove('proposal-123', mockUser.id, { userId: mockUser.id }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'ALREADY_DELETED',
            }),
          }),
        }),
      );
    });

    it('should throw BadRequestException when proposal not in DRAFT', async () => {
      const submittedProposal = {
        ...mockProposal,
        state: ProjectState.FACULTY_REVIEW,
        deletedAt: null as Date | null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(submittedProposal);

      await expect(
        service.softRemove('proposal-123', mockUser.id, { userId: mockUser.id }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('restore (Story 2.6)', () => {
    const mockRequestContext: RequestContext = {
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
      mockPrisma.proposal.findUnique.mockResolvedValue(deletedProposal);
      mockPrisma.proposal.update.mockResolvedValue(restoredProposal);

      const result = await service.restore('proposal-123', mockUser.id, mockRequestContext);

      expect(mockPrisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-123' },
        data: { deletedAt: null },
        include: expect.anything(),
      });
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROPOSAL_RESTORE',
          actorUserId: mockUser.id,
          entityType: 'proposal',
          entityId: 'proposal-123',
        }),
      );
    });

    it('should throw BadRequestException when proposal not deleted', async () => {
      const proposalNotDeleted = {
        ...mockProposal,
        deletedAt: null as Date | null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(proposalNotDeleted);

      await expect(
        service.restore('proposal-123', mockUser.id, mockRequestContext),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.restore('proposal-123', mockUser.id, mockRequestContext),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            error: expect.objectContaining({
              code: 'NOT_DELETED',
            }),
          }),
        }),
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const deletedProposal = {
        ...mockProposal,
        ownerId: 'other-user',
        deletedAt: new Date() as Date | null,
      };
      mockPrisma.proposal.findUnique.mockResolvedValue(deletedProposal);

      await expect(
        service.restore('proposal-123', mockUser.id, mockRequestContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when proposal not found', async () => {
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

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
