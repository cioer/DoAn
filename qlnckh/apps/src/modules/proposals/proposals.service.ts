import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ProjectState } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import {
  ProposalDto,
  ProposalWithTemplateDto,
  CreateProposalDto,
  UpdateProposalDto,
  PaginatedProposalsDto,
  PaginationMeta,
} from './dto';

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
      templateId: string | null;
      templateVersion: string | null;
      formData: Record<string, unknown> | null;
      createdAt: Date;
      updatedAt: Date;
      template?: {
        id: string;
        code: string;
        name: string;
        version: string;
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
      templateId: proposal.templateId,
      templateVersion: proposal.templateVersion,
      formData: proposal.formData as Record<string, unknown> | null,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      template: proposal.template
        ? {
            id: proposal.template.id,
            code: proposal.template.code,
            name: proposal.template.name,
            version: proposal.template.version,
          }
        : null,
    };
  }
}
