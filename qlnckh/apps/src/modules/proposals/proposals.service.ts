import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ProjectState, SectionId, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  ProposalDto,
  ProposalWithTemplateDto,
  CreateProposalDto,
  UpdateProposalDto,
  AutoSaveProposalDto,
  PaginatedProposalsDto,
  PaginationMeta,
} from './dto';
import { deepMergeFormData } from './helpers/form-data.helper';

/**
 * Request context for audit logging
 */
interface RequestContext {
  userId: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Proposals Service
 *
 * Handles proposal CRUD operations for DRAFT state.
 * Only DRAFT proposals can be edited.
 */
@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate next proposal code (DT-XXX format)
   * Uses max existing code to avoid race conditions
   */
  private async generateProposalCode(): Promise<string> {
    // Use transaction to safely get the next code
    const result = await this.prisma.$queryRaw<Array<{ next_code: string }>>`
      SELECT 'DT-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) + 1)::TEXT, 3, '0') AS next_code
      FROM proposals
      WHERE code LIKE 'DT-%'
    `;

    if (result && result.length > 0 && result[0].next_code) {
      return result[0].next_code;
    }

    // Default to DT-001 if no proposals exist
    return 'DT-001';
  }

  /**
   * Get form template version by ID or code
   */
  private async getTemplateVersion(templateIdOrCode: string): Promise<{
    id: string;
    version: string;
  } | null> {
    const template = await this.prisma.formTemplate.findFirst({
      where: {
        OR: [{ id: templateIdOrCode }, { code: templateIdOrCode }],
      },
      select: {
        id: true,
        version: true,
      },
    });

    return template;
  }

  /**
   * Create a new proposal (DRAFT state)
   *
   * @param dto - Create proposal data
   * @param ctx - Request context for audit
   * @returns Created proposal
   */
  async create(
    dto: CreateProposalDto,
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get template info
    const template = await this.getTemplateVersion(dto.templateId);
    if (!template) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Mẫu đơn '${dto.templateId}' không tồn tại`,
        },
      });
    }

    // Verify faculty exists
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: dto.facultyId },
    });
    if (!faculty) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FACULTY_NOT_FOUND',
          message: `Khoa với ID '${dto.facultyId}' không tồn tại`,
        },
      });
    }

    // Generate proposal code
    const code = await this.generateProposalCode();

    // Create proposal
    const proposal = await this.prisma.proposal.create({
      data: {
        code,
        title: dto.title,
        state: ProjectState.DRAFT,
        ownerId: ctx.userId,
        facultyId: dto.facultyId,
        templateId: template.id,
        templateVersion: template.version,
        formData: (dto.formData || null) as unknown as Record<string, never>,
        // DRAFT state: no holder, no SLA
        holderUnit: null,
        holderUser: null,
        slaStartDate: null,
        slaDeadline: null,
      },
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Log audit event
    await this.auditService.logEvent({
      action: 'PROPOSAL_CREATE' as AuditAction,
      actorUserId: ctx.userId,
      entityType: 'proposal',
      entityId: proposal.id,
      metadata: {
        proposalCode: proposal.code,
        templateId: template.id,
        templateCode: dto.templateId,
        facultyId: dto.facultyId,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`Created proposal ${proposal.code} for user ${ctx.userId}`);

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Get proposal by ID
   *
   * @param id - Proposal ID
   * @param userId - Current user ID (for ownership check)
   * @returns Proposal details
   */
  async findOne(id: string, userId: string): Promise<ProposalWithTemplateDto> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${id}' không tồn tại`,
        },
      });
    }

    // Check ownership: only owner or admin can view
    // For MVP, allow all authenticated users to view (simpler RBAC)
    // In production, you'd check: proposal.ownerId === userId || user.role === ADMIN

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Update proposal (DRAFT only)
   *
   * @param id - Proposal ID
   * @param dto - Update data
   * @param ctx - Request context
   * @returns Updated proposal
   */
  async update(
    id: string,
    dto: UpdateProposalDto,
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${id}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== ctx.userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền chỉnh sửa đề tài này',
        },
      });
    }

    // Check state: only DRAFT can be edited
    if (existing.state !== ProjectState.DRAFT) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: `Chỉ có thể chỉnh sửa đề tài ở trạng thái NHÁP (DRAFT). Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (dto.formData !== undefined) {
      updateData.formData = dto.formData as unknown as Record<string, never>;
    }

    // Update proposal
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: updateData,
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Log audit event for update
    await this.auditService.logEvent({
      action: 'PROPOSAL_UPDATE' as AuditAction,
      actorUserId: ctx.userId,
      entityType: 'proposal',
      entityId: proposal.id,
      metadata: {
        proposalCode: proposal.code,
        updatedFields: Object.keys(dto),
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`Updated proposal ${proposal.code}`);

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * List proposals with filters and pagination
   *
   * @param filters - Filter options
   * @returns Paginated proposal list
   */
  async findAll(filters: {
    ownerId?: string;
    state?: ProjectState;
    facultyId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedProposalsDto> {
    const { ownerId, state, facultyId, page = 1, limit = 20 } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (state) {
      where.state = state;
    }

    if (facultyId) {
      where.facultyId = facultyId;
    }

    // Get total count and proposals in parallel
    const [total, proposals] = await Promise.all([
      this.prisma.proposal.count({ where }),
      this.prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              version: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      data: proposals.map(p => this.mapToDtoWithTemplate(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete proposal (DRAFT only, owner only)
   *
   * @param id - Proposal ID
   * @param userId - Current user ID
   */
  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${id}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền xóa đề tài này',
        },
      });
    }

    // Check state: only DRAFT can be deleted
    if (existing.state !== ProjectState.DRAFT) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: `Chỉ có thể xóa đề tài ở trạng thái NHÁP (DRAFT). Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Log audit event BEFORE delete
    await this.auditService.logEvent({
      action: 'PROPOSAL_DELETE' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: id,
      metadata: {
        proposalCode: existing.code,
        title: existing.title,
      },
    });

    await this.prisma.proposal.delete({
      where: { id },
    });

    this.logger.log(`Deleted proposal ${existing.code}`);
  }

  /**
   * Deep merge two objects
   * Preserves nested properties from target that are not in source
   *
   * Merge Strategy (Story 2.3):
   * - Objects: Deep merged (recursive merge of nested properties)
   * - Arrays: REPLACED (not merged) - incoming array completely replaces existing
   * - Primitives/Null: Overwritten
   *
   * Rationale: For form data, arrays represent lists (e.g., attachments, team members).
   * Auto-save should preserve the complete list from the client, not attempt to merge.
   * (Story 2.3 - Auto-save)
   *
   * Story 2.6: Now uses shared helper function from form-data.helper.ts
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    return deepMergeFormData(target, source);
  }

  /**
   * Auto-save proposal form data (Story 2.3)
   *
   * Features:
   * - Deep merge partial form data with existing data
   * - Optimistic locking with expectedUpdatedAt
   * - Only DRAFT proposals can be auto-saved
   * - Only owner can auto-save their own proposals
   *
   * @param id - Proposal ID
   * @param dto - Auto-save data with partial formData and optional expectedUpdatedAt
   * @param ctx - Request context for audit
   * @returns Updated proposal with merged form data
   */
  async autoSave(
    id: string,
    dto: AutoSaveProposalDto,
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${id}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== ctx.userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền chỉnh sửa đề tài này',
        },
      });
    }

    // Check state: only DRAFT can be auto-saved
    if (existing.state !== ProjectState.DRAFT) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: `Chỉ có thể auto-save đề tài ở trạng thái NHÁP (DRAFT). Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Optimistic locking: check updatedAt if provided
    if (dto.expectedUpdatedAt) {
      const expectedTime = new Date(dto.expectedUpdatedAt).getTime();
      const actualTime = existing.updatedAt.getTime();

      if (actualTime > expectedTime) {
        throw new ConflictException({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Dữ liệu đã được cập nhật bởi phiên khác. Vui lòng tải lại.',
            details: [
              `Phiên của bạn: ${new Date(dto.expectedUpdatedAt).toISOString()}`,
              `Phi bản hiện tại: ${existing.updatedAt.toISOString()}`,
            ],
          },
        });
      }
    }

    // Deep merge form data
    const existingFormData = (existing.formData as Record<string, unknown>) || {};
    const mergedFormData = this.deepMerge(existingFormData, dto.formData);

    // Update proposal with merged form data
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        formData: mergedFormData as unknown as Record<string, never>,
      },
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Log audit event for auto-save
    await this.auditService.logEvent({
      action: AuditAction.PROPOSAL_AUTO_SAVE,
      actorUserId: ctx.userId,
      entityType: 'proposal',
      entityId: proposal.id,
      metadata: {
        proposalCode: proposal.code,
        sectionsUpdated: Object.keys(dto.formData),
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`Auto-saved proposal ${proposal.code}`);

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDtoWithTemplate(
    proposal: {
      id: string;
      code: string;
      title: string;
      state: ProjectState;
      ownerId: string;
      facultyId: string;
      holderUnit: string | null;
      holderUser: string | null;
      slaStartDate: Date | null;
      slaDeadline: Date | null;
      actualStartDate: Date | null;
      completedDate: Date | null;
      templateId: string | null;
      templateVersion: string | null;
      formData: Record<string, unknown> | null;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      template?: {
        id: string;
        code: string;
        name: string;
        version: string;
      } | null;
      owner?: {
        id: string;
        email: string;
        displayName: string;
        role?: string;
      } | null;
      faculty?: {
        id: string;
        code: string;
        name: string;
      } | null;
    },
  ): ProposalWithTemplateDto {
    return {
      id: proposal.id,
      code: proposal.code,
      title: proposal.title,
      state: proposal.state,
      ownerId: proposal.ownerId,
      facultyId: proposal.facultyId,
      holderUnit: proposal.holderUnit,
      holderUser: proposal.holderUser,
      slaStartDate: proposal.slaStartDate,
      slaDeadline: proposal.slaDeadline,
      actualStartDate: proposal.actualStartDate,
      completedDate: proposal.completedDate,
      templateId: proposal.templateId,
      templateVersion: proposal.templateVersion,
      formData: proposal.formData as Record<string, unknown> | null,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      deletedAt: proposal.deletedAt,
      template: proposal.template
        ? {
            id: proposal.template.id,
            code: proposal.template.code,
            name: proposal.template.name,
            version: proposal.template.version,
          }
        : null,
      owner: proposal.owner
        ? {
            id: proposal.owner.id,
            email: proposal.owner.email,
            displayName: proposal.owner.displayName,
            role: proposal.owner.role as UserRole | undefined,
          }
        : null,
      faculty: proposal.faculty
        ? {
            id: proposal.faculty.id,
            code: proposal.faculty.code,
            name: proposal.faculty.name,
          }
        : null,
    };
  }

  // ========================================================================
  // Story 2.6: Master Record Operations
  // ========================================================================

  /**
   * Get proposal by ID with specific section data only
   * Story 2.6: Query proposals filtered by section data
   *
   * @param id - Proposal ID
   * @param sectionIds - Array of section IDs to include in response
   * @param userId - Current user ID
   * @returns Proposal with only specified sections in form_data
   */
  async findOneWithSections(
    id: string,
    sectionIds: SectionId[],
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${id}' không tồn tại`,
        },
      });
    }

    // Filter form_data to include only specified sections
    const filteredFormData: Record<string, unknown> = {};
    if (proposal.formData && typeof proposal.formData === 'object') {
      const sectionIdSet = new Set(sectionIds);
      for (const [key, value] of Object.entries(proposal.formData)) {
        if (sectionIdSet.has(key as SectionId)) {
          filteredFormData[key] = value;
        }
      }
    }

    // Use mapToDtoWithTemplate with filtered form_data
    const dto = this.mapToDtoWithTemplate({
      ...proposal,
      formData: Object.keys(filteredFormData).length > 0 ? filteredFormData : null,
    });

    return dto;
  }

  /**
   * List proposals with soft delete filtering
   * Story 2.6: Support soft delete pattern
   *
   * @param filters - Filter options including includeDeleted
   * @returns Paginated proposal list
   */
  async findAllWithFilters(filters: {
    ownerId?: string;
    state?: ProjectState;
    facultyId?: string;
    holderUnit?: string;
    holderUser?: string;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedProposalsDto> {
    const {
      ownerId,
      state,
      facultyId,
      holderUnit,
      holderUser,
      includeDeleted = false,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (state) {
      where.state = state;
    }

    if (facultyId) {
      where.facultyId = facultyId;
    }

    if (holderUnit) {
      where.holderUnit = holderUnit;
    }

    if (holderUser) {
      where.holderUser = holderUser;
    }

    // Soft delete filtering (Story 2.6)
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Get total count and proposals in parallel
    const [total, proposals] = await Promise.all([
      this.prisma.proposal.count({ where }),
      this.prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              version: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      data: proposals.map(p => this.mapToDtoWithTemplate(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get proposals by holder (Story 2.6)
   * Returns proposals that are waiting for a specific holder unit or user
   *
   * @param holderFilters - Holder unit or user filters
   * @returns List of proposals waiting for the holder
   */
  async findByHolder(holderFilters: {
    holderUnit?: string;
    holderUser?: string;
    state?: ProjectState;
    page?: number;
    limit?: number;
  }): Promise<PaginatedProposalsDto> {
    return this.findAllWithFilters({
      ...holderFilters,
      includeDeleted: false,
    });
  }

  /**
   * Soft delete a proposal (Story 2.6)
   * Sets deletedAt timestamp instead of permanently deleting
   *
   * @param id - Proposal ID
   * @param userId - Current user ID
   * @param ctx - Request context for audit
   */
  async softRemove(id: string, userId: string, ctx: RequestContext): Promise<void> {
    const existing = await this.prisma.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${id}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền xóa đề tài này',
        },
      });
    }

    // Check state: only DRAFT can be deleted
    if (existing.state !== ProjectState.DRAFT) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_DRAFT',
          message: `Chỉ có thể xóa đề tài ở trạng thái NHÁP (DRAFT). Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Check if already soft deleted
    if (existing.deletedAt !== null) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ALREADY_DELETED',
          message: 'Đề tài này đã bị xóa',
        },
      });
    }

    // Log audit event BEFORE soft delete
    await this.auditService.logEvent({
      action: 'PROPOSAL_DELETE' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: id,
      metadata: {
        proposalCode: existing.code,
        title: existing.title,
        softDelete: true,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    await this.prisma.proposal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Soft deleted proposal ${existing.code}`);
  }

  /**
   * Restore a soft-deleted proposal (Story 2.6)
   *
   * @param id - Proposal ID
   * @param userId - Current user ID
   * @param ctx - Request context for audit
   */
  async restore(id: string, userId: string, ctx: RequestContext): Promise<ProposalWithTemplateDto> {
    const existing = await this.prisma.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${id}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền khôi phục đề tài này',
        },
      });
    }

    // Check if already soft deleted
    if (existing.deletedAt === null) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NOT_DELETED',
          message: 'Đề tài này chưa bị xóa',
        },
      });
    }

    // Log audit event BEFORE restore
    await this.auditService.logEvent({
      action: 'PROPOSAL_RESTORE' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: id,
      metadata: {
        proposalCode: existing.code,
        title: existing.title,
        restoredFromDeletedAt: existing.deletedAt,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Restored proposal ${proposal.code}`);

    return this.mapToDtoWithTemplate(proposal);
  }

  // ========================================================================
  // Epic 6: Acceptance & Handover Operations
  // ========================================================================

  /**
   * Start Project Execution (Story 6.1)
   * Transition proposal from APPROVED to IN_PROGRESS
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (must be owner)
   * @param ctx - Request context for audit
   * @returns Updated proposal with actualStartDate set
   */
  async startProject(
    proposalId: string,
    userId: string,
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền thực hiện hành động này',
        },
      });
    }

    // Check state: only APPROVED can start
    if (existing.state !== ProjectState.APPROVED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Đề tài chưa ở trạng thái được duyệt. Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Use atomic transaction for state transition and workflow log
    const result = await this.prisma.$transaction(async (tx) => {
      // Update proposal state and set actualStartDate
      const proposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: ProjectState.IN_PROGRESS,
          actualStartDate: new Date(),
          // holderUnit and holderUser remain with owner
        },
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              version: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      // Create workflow log entry
      await tx.workflowLog.create({
        data: {
          proposalId,
          action: 'START_PROJECT',
          fromState: ProjectState.APPROVED,
          toState: ProjectState.IN_PROGRESS,
          actorId: userId,
          actorName: existing.owner.displayName,
          timestamp: new Date(),
        },
      });

      return proposal;
    });

    // Log audit event
    await this.auditService.logEvent({
      action: 'PROPOSAL_START' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: proposalId,
      metadata: {
        proposalCode: existing.code,
        fromState: ProjectState.APPROVED,
        toState: ProjectState.IN_PROGRESS,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`Started project ${existing.code}`);

    return this.mapToDtoWithTemplate(result);
  }

  /**
   * Submit Faculty Acceptance Review (Story 6.2)
   * Transition proposal from IN_PROGRESS to FACULTY_ACCEPTANCE_REVIEW
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (must be owner)
   * @param dto - Faculty acceptance data
   * @param ctx - Request context for audit
   * @returns Updated proposal
   */
  async submitFacultyAcceptance(
    proposalId: string,
    userId: string,
    dto: {
      results: string;
      products: Array<{ name: string; type: string; note?: string; attachmentId?: string }>;
      attachmentIds?: string[];
    },
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền thực hiện hành động này',
        },
      });
    }

    // Check state: only IN_PROGRESS can submit faculty acceptance
    if (existing.state !== ProjectState.IN_PROGRESS) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Đề tài chưa ở trạng thái đang thực hiện. Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Validate form data
    if (!dto.results || dto.results.trim() === '') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Kết quả thực hiện không được để trống',
        },
      });
    }

    if (!dto.products || dto.products.length === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phải có ít nhất một sản phẩm',
        },
      });
    }

    // Use atomic transaction for state transition
    const result = await this.prisma.$transaction(async (tx) => {
      // Update formData with faculty acceptance data
      const currentFormData = (existing.formData as Record<string, unknown>) || {};
      const updatedFormData = {
        ...currentFormData,
        [SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS]: {
          results: dto.results,
          submittedAt: new Date().toISOString(),
        },
        [SectionId.SEC_FACULTY_ACCEPTANCE_PRODUCTS]: {
          products: dto.products.map((p, idx) => ({
            id: `product-${idx}`,
            name: p.name,
            type: p.type,
            note: p.note || null,
            attachmentId: p.attachmentId || null,
          })),
        },
      };

      // Update proposal
      const proposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
          formData: updatedFormData as unknown as Record<string, never>,
          holderUnit: existing.facultyId,
          holderUser: null,
        },
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              version: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      // Create workflow log entry
      await tx.workflowLog.create({
        data: {
          proposalId,
          action: 'SUBMIT_FACULTY_ACCEPTANCE',
          fromState: ProjectState.IN_PROGRESS,
          toState: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
          actorId: userId,
          actorName: existing.owner.displayName,
          timestamp: new Date(),
        },
      });

      return proposal;
    });

    // Log audit event
    await this.auditService.logEvent({
      action: 'FACULTY_ACCEPTANCE_SUBMIT' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: proposalId,
      metadata: {
        proposalCode: existing.code,
        productsCount: dto.products.length,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`Submitted faculty acceptance for ${existing.code}`);

    return this.mapToDtoWithTemplate(result);
  }

  /**
   * Faculty Acceptance Decision (Story 6.3)
   * Transition proposal from FACULTY_ACCEPTANCE_REVIEW to SCHOOL_ACCEPTANCE_REVIEW or IN_PROGRESS
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (must be QUAN_LY_KHOA)
   * @param userRole - User role for authorization
   * @param dto - Faculty decision data
   * @param ctx - Request context for audit
   * @returns Updated proposal
   */
  async facultyAcceptance(
    proposalId: string,
    userId: string,
    userRole: UserRole,
    dto: { decision: 'DAT' | 'KHONG_DAT'; comments?: string },
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check role: only QUAN_LY_KHOA can perform faculty acceptance
    if (userRole !== UserRole.QUAN_LY_KHOA && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Chỉ Quản lý Khoa mới có quyền nghiệm thu',
        },
      });
    }

    // Check state: only FACULTY_ACCEPTANCE_REVIEW can be decided
    if (existing.state !== ProjectState.FACULTY_ACCEPTANCE_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Đề tài chưa ở trạng thái nghiệm thu Khoa. Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Validate: comments required when KHONG_DAT
    if (dto.decision === 'KHONG_DAT' && (!dto.comments || dto.comments.trim() === '')) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Vui lòng nhập lý do không đạt',
        },
      });
    }

    const isAccept = dto.decision === 'DAT';
    const nextState = isAccept ? ProjectState.SCHOOL_ACCEPTANCE_REVIEW : ProjectState.IN_PROGRESS;
    const action = isAccept ? 'FACULTY_ACCEPT' : 'FACULTY_REJECT';
    const nextHolderUnit = isAccept ? null : existing.facultyId; // null = PHONG_KHCN, facultyId = back to PI
    const nextHolderUser = isAccept ? null : existing.ownerId;

    // Use atomic transaction for state transition
    const result = await this.prisma.$transaction(async (tx) => {
      // Update formData with faculty decision
      const currentFormData = (existing.formData as Record<string, unknown>) || {};
      const facultyResultsSection = currentFormData[SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS] as Record<string, unknown> || {};

      const updatedFormData = {
        ...currentFormData,
        [SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS]: {
          ...facultyResultsSection,
          facultyDecision: {
            decision: dto.decision,
            decidedBy: userId,
            decidedAt: new Date().toISOString(),
            comments: dto.comments || null,
          },
        },
      };

      // Update proposal
      const proposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: nextState,
          formData: updatedFormData as unknown as Record<string, never>,
          ...(nextHolderUnit !== null && { holderUnit: nextHolderUnit }),
          ...(nextHolderUser !== null && { holderUser: nextHolderUser }),
        },
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              version: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      // Create workflow log entry
      await tx.workflowLog.create({
        data: {
          proposalId,
          action: action as any,
          fromState: ProjectState.FACULTY_ACCEPTANCE_REVIEW,
          toState: nextState,
          actorId: userId,
          actorName: (ctx as any).userDisplayName || 'Quản lý Khoa',
          comment: dto.comments || null,
          timestamp: new Date(),
        },
      });

      return proposal;
    });

    // Log audit event
    await this.auditService.logEvent({
      action: isAccept ? 'FACULTY_ACCEPT' : 'FACULTY_REJECT' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: proposalId,
      metadata: {
        proposalCode: existing.code,
        decision: dto.decision,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`Faculty acceptance ${dto.decision} for ${existing.code}`);

    return this.mapToDtoWithTemplate(result);
  }

  /**
   * School Acceptance Decision (Story 6.4)
   * Transition proposal from SCHOOL_ACCEPTANCE_REVIEW to HANDOVER or IN_PROGRESS
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (must be PHONG_KHCN, THU_KY_HOI_DONG, or ADMIN)
   * @param userRole - User role for authorization
   * @param dto - School decision data
   * @param ctx - Request context for audit
   * @returns Updated proposal
   */
  async schoolAcceptance(
    proposalId: string,
    userId: string,
    userRole: UserRole,
    dto: { decision: 'DAT' | 'KHONG_DAT'; comments?: string },
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check role: only PHONG_KHCN, THU_KY_HOI_DONG, or ADMIN can perform school acceptance
    const allowedRoles = [UserRole.PHONG_KHCN, UserRole.THU_KY_HOI_DONG, UserRole.ADMIN];
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền nghiệm thu cấp Trường',
        },
      });
    }

    // Check state: only SCHOOL_ACCEPTANCE_REVIEW can be decided
    if (existing.state !== ProjectState.SCHOOL_ACCEPTANCE_REVIEW) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Đề tài chưa ở trạng thái nghiệm thu Trường. Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Validate: comments required when KHONG_DAT
    if (dto.decision === 'KHONG_DAT' && (!dto.comments || dto.comments.trim() === '')) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Vui lòng nhập lý do không đạt',
        },
      });
    }

    const isAccept = dto.decision === 'DAT';
    const nextState = isAccept ? ProjectState.HANDOVER : ProjectState.IN_PROGRESS;
    const action = isAccept ? 'SCHOOL_ACCEPT' : 'SCHOOL_REJECT';

    // Use atomic transaction for state transition
    const result = await this.prisma.$transaction(async (tx) => {
      // Update formData with school decision
      const currentFormData = (existing.formData as Record<string, unknown>) || {};
      const facultyResultsSection = currentFormData[SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS] as Record<string, unknown> || {};

      const updatedFormData = {
        ...currentFormData,
        [SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS]: {
          ...facultyResultsSection,
          schoolDecision: {
            decision: dto.decision,
            decidedBy: userId,
            decidedAt: new Date().toISOString(),
            comments: dto.comments || null,
          },
        },
      };

      // Update proposal - both accept and reject return to owner
      const proposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: nextState,
          formData: updatedFormData as unknown as Record<string, never>,
          holderUnit: existing.facultyId,
          holderUser: existing.ownerId,
        },
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              version: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      // Create workflow log entry
      await tx.workflowLog.create({
        data: {
          proposalId,
          action: action as any,
          fromState: ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
          toState: nextState,
          actorId: userId,
          actorName: (ctx as any).userDisplayName || 'Quản trị viên',
          comment: dto.comments || null,
          timestamp: new Date(),
        },
      });

      return proposal;
    });

    // Log audit event
    await this.auditService.logEvent({
      action: isAccept ? 'SCHOOL_ACCEPT' : 'SCHOOL_REJECT' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: proposalId,
      metadata: {
        proposalCode: existing.code,
        decision: dto.decision,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`School acceptance ${dto.decision} for ${existing.code}`);

    return this.mapToDtoWithTemplate(result);
  }

  /**
   * Complete Handover (Story 6.5)
   * Transition proposal from HANDOVER to COMPLETED
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (must be owner)
   * @param dto - Handover checklist data
   * @param ctx - Request context for audit
   * @returns Updated proposal with completedDate set
   */
  async completeHandover(
    proposalId: string,
    userId: string,
    dto: {
      checklist: Array<{ id: string; checked: boolean; note?: string }>;
    },
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền thực hiện hành động này',
        },
      });
    }

    // Check state: only HANDOVER can be completed
    if (existing.state !== ProjectState.HANDOVER) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Đề tài chưa ở trạng thái bàn giao. Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Validate: at least one item checked
    const checkedItems = dto.checklist.filter(item => item.checked);
    if (checkedItems.length === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Vui lòng chọn ít nhất một mục',
        },
      });
    }

    // Use atomic transaction for state transition
    const result = await this.prisma.$transaction(async (tx) => {
      // Update formData with handover checklist
      const currentFormData = (existing.formData as Record<string, unknown>) || {};
      const updatedFormData = {
        ...currentFormData,
        [SectionId.SEC_HANDOVER_CHECKLIST]: {
          completedAt: new Date().toISOString(),
          checklist: dto.checklist,
        },
      };

      // Update proposal
      const proposal = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          state: ProjectState.COMPLETED,
          completedDate: new Date(),
          formData: updatedFormData as unknown as Record<string, never>,
          holderUnit: existing.facultyId,
          holderUser: existing.ownerId,
        },
        include: {
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              version: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
          faculty: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      // Create workflow log entry
      await tx.workflowLog.create({
        data: {
          proposalId,
          action: 'HANDOVER_COMPLETE' as any,
          fromState: ProjectState.HANDOVER,
          toState: ProjectState.COMPLETED,
          actorId: userId,
          actorName: existing.owner.displayName,
          timestamp: new Date(),
        },
      });

      return proposal;
    });

    // Log audit event
    await this.auditService.logEvent({
      action: 'HANDOVER_COMPLETE' as AuditAction,
      actorUserId: userId,
      entityType: 'proposal',
      entityId: proposalId,
      metadata: {
        proposalCode: existing.code,
        checklistItemsCount: dto.checklist.length,
        checkedItemsCount: checkedItems.length,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    });

    this.logger.log(`Completed handover for ${existing.code}`);

    return this.mapToDtoWithTemplate(result);
  }

  /**
   * Save Handover Checklist Draft (Story 6.5)
   * Auto-save handover checklist before completion
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID (must be owner)
   * @param dto - Handover checklist data (draft)
   * @param ctx - Request context for audit
   * @returns Updated proposal
   */
  async saveHandoverChecklist(
    proposalId: string,
    userId: string,
    dto: {
      checklist: Array<{ id: string; checked: boolean; note?: string }>;
    },
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    // Get existing proposal
    const existing = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { owner: true },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check ownership
    if (existing.ownerId !== userId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền chỉnh sửa checklist này',
        },
      });
    }

    // Check state: only HANDOVER can save checklist
    if (existing.state !== ProjectState.HANDOVER) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể lưu checklist ở trạng thái bàn giao. Trạng thái hiện tại: ${existing.state}`,
        },
      });
    }

    // Update formData with handover checklist draft
    const currentFormData = (existing.formData as Record<string, unknown>) || {};
    const updatedFormData = {
      ...currentFormData,
      [SectionId.SEC_HANDOVER_CHECKLIST]: {
        draft: true,
        lastSavedAt: new Date().toISOString(),
        checklist: dto.checklist,
      },
    };

    // Update proposal
    const proposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        formData: updatedFormData as unknown as Record<string, never>,
      },
      include: {
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Auto-saved handover checklist for ${existing.code}`);

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Get Faculty Acceptance Data (Story 6.3)
   * Returns faculty acceptance data for review display
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID
   * @param userRole - User role for authorization
   * @returns Faculty acceptance data
   */
  async getFacultyAcceptanceData(
    proposalId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    results?: string;
    products?: Array<{ id: string; name: string; type: string; note?: string }>;
    submittedAt?: string;
  }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        state: true,
        ownerId: true,
        formData: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check access: QUAN_LY_KHOA, owner, PHONG_KHCN, ADMIN
    const allowedRoles = [UserRole.QUAN_LY_KHOA, UserRole.PHONG_KHCN, UserRole.ADMIN];
    const isOwner = proposal.ownerId === userId;
    const hasAccess = allowedRoles.includes(userRole) || isOwner;

    if (!hasAccess) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền xem thông tin này',
        },
      });
    }

    const formData = (proposal.formData as Record<string, unknown>) || {};
    const resultsSection = formData[SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS] as Record<string, unknown> | undefined;
    const productsSection = formData[SectionId.SEC_FACULTY_ACCEPTANCE_PRODUCTS] as Record<string, unknown> | undefined;

    return {
      results: resultsSection?.results as string | undefined,
      products: productsSection?.products as Array<{ id: string; name: string; type: string; note?: string }> | undefined,
      submittedAt: resultsSection?.submittedAt as string | undefined,
    };
  }

  /**
   * Get School Acceptance Data (Story 6.4)
   * Returns school acceptance data for review display
   *
   * @param proposalId - Proposal ID
   * @param userId - Current user ID
   * @param userRole - User role for authorization
   * @returns School acceptance data including faculty decision
   */
  async getSchoolAcceptanceData(
    proposalId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    facultyDecision?: { decision: string; decidedAt: string; comments?: string };
    results?: string;
    products?: Array<{ id: string; name: string; type: string; note?: string }>;
  }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        state: true,
        ownerId: true,
        formData: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: `Đề tài với ID '${proposalId}' không tồn tại`,
        },
      });
    }

    // Check access: PHONG_KHCN, THU_KY_HOI_DONG, ADMIN, owner
    const allowedRoles = [UserRole.PHONG_KHCN, UserRole.THU_KY_HOI_DONG, UserRole.ADMIN];
    const isOwner = proposal.ownerId === userId;
    const hasAccess = allowedRoles.includes(userRole) || isOwner;

    if (!hasAccess) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền xem thông tin này',
        },
      });
    }

    const formData = (proposal.formData as Record<string, unknown>) || {};
    const resultsSection = formData[SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS] as Record<string, unknown> | undefined;
    const productsSection = formData[SectionId.SEC_FACULTY_ACCEPTANCE_PRODUCTS] as Record<string, unknown> | undefined;

    return {
      facultyDecision: resultsSection?.facultyDecision as { decision: string; decidedAt: string; comments?: string } | undefined,
      results: resultsSection?.results as string | undefined,
      products: productsSection?.products as Array<{ id: string; name: string; type: string; note?: string }> | undefined,
    };
  }
}
