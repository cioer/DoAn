import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ProjectState, SectionId, WorkflowAction } from '@prisma/client';
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
import {
  ProposalsCrudService,
  ProposalsValidationService,
  ProposalsQueryService,
  ProposalsWorkflowService,
} from './services';

/**
 * Request context for audit logging
 */
interface RequestContext {
  userId: string;
  userDisplayName?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Proposals Service (Orchestrator)
 *
 * Main service that orchestrates other specialized services.
 * Maintains backward compatibility while delegating to focused services.
 */
@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly crud: ProposalsCrudService,
    private readonly validation: ProposalsValidationService,
    private readonly workflow: ProposalsWorkflowService,
    private readonly queries: ProposalsQueryService,
  ) {}

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
    this.logger.log(`Creating proposal for user ${ctx.userId}`);

    // Validate input data
    await this.validation.validateCreateData(dto, ctx.userId);

    // Generate proposal code
    const code = await this.crud.generateProposalCode();

    // Get template info
    const template = await this.validation.validateTemplateVersion(dto.templateId);
    if (!template) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Mẫu đơn '${dto.templateId}' không tồn tại`,
        },
      });
    }

    // Create proposal
    const proposal = await this.crud.create(dto, ctx.userId, code);

    // Audit log
    this.auditService
      .logEvent({
        action: AuditAction.CREATE,
        userId: ctx.userId,
        userDisplayName: ctx.userDisplayName,
        targetType: 'proposal',
        targetId: proposal.id,
        targetCode: proposal.code,
        changes: { state: null, newValue: ProjectState.DRAFT },
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
      })
      .catch((err) => {
        this.logger.error(`Failed to log audit event: ${err.message}`);
      });

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Get proposal by ID
   */
  async findOne(
    id: string,
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    await this.validation.validateAccess(id, userId);

    const proposal = await this.crud.findById(id);

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Update proposal
   */
  async update(
    id: string,
    dto: UpdateProposalDto,
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.log(`Updating proposal ${id}`);

    // Validate access and editable state
    await this.validation.validateAccess(id, userId);
    await this.validation.validateEditable(id);

    // Validate update data
    this.validation.validateUpdateData(dto);

    // Update proposal
    const proposal = await this.crud.update(id, dto);

    // Audit log
    this.auditService
      .logEvent({
        action: AuditAction.UPDATE,
        userId,
        targetType: 'proposal',
        targetId: id,
        targetCode: proposal.code,
        changes: { formData: dto.formData },
      })
      .catch((err) => {
        this.logger.error(`Failed to log audit event: ${err.message}`);
      });

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * List proposals with filters
   */
  async findAll(filters: {
    skip?: number;
    take?: number;
    facultyId?: string;
    ownerId?: string;
    state?: ProjectState;
    search?: string;
  }): Promise<PaginatedProposalsDto> {
    this.logger.log(`Finding proposals with filters: ${JSON.stringify(filters)}`);

    const result = await this.crud.findAll(filters);

    return {
      data: result.data.map((p) => this.mapToDto(p)),
      meta: result.meta,
    };
  }

  /**
   * Delete proposal (soft delete)
   */
  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Removing proposal ${id}`);

    // Validate access and ownership
    await this.validation.validateAccess(id, userId);
    await this.validation.validateOwnership(id, userId);

    // Check if can be deleted (only DRAFT or CANCELLED)
    await this.validation.validateExpectedState(id, [
      ProjectState.DRAFT,
      ProjectState.CANCELLED,
    ]);

    // Soft delete
    await this.crud.softDelete(id);

    // Audit log
    this.auditService
      .logEvent({
        action: AuditAction.DELETE,
        userId,
        targetType: 'proposal',
        targetId: id,
      })
      .catch((err) => {
        this.logger.error(`Failed to log audit event: ${err.message}`);
      });
  }

  /**
   * Auto-save draft proposal
   */
  async autoSave(
    id: string,
    dto: AutoSaveProposalDto,
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.debug(`Auto-saving proposal ${id}`);

    // Validate access and editable state
    await this.validation.validateAccess(id, userId);
    await this.validation.validateEditable(id);

    // Auto-save
    const proposal = await this.crud.autoSave(id, dto, userId);

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Get proposal with section details
   */
  async findOneWithSections(
    id: string,
    sections: SectionId[],
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    await this.validation.validateAccess(id, userId);

    const proposal = await this.crud.findById(id);

    // Filter sections if needed
    // This is a placeholder - implement based on your needs

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Find all with advanced filters
   */
  async findAllWithFilters(filters: {
    skip?: number;
    take?: number;
    facultyId?: string;
    ownerId?: string;
    state?: ProjectState;
    search?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PaginatedProposalsDto> {
    const result = await this.queries.search(filters.search || '', {
      skip: filters.skip,
      take: filters.take,
      facultyId: filters.facultyId,
      state: filters.state,
    });

    return {
      data: result.data.map((p) => this.mapToDto(p)),
      meta: result.meta,
    };
  }

  /**
   * Find by holder (review queue)
   */
  async findByHolder(holderFilters: {
    holderUnit?: string;
    holderUser?: string;
    state?: ProjectState;
    skip?: number;
    take?: number;
  }): Promise<PaginatedProposalsDto> {
    const result = await this.queries.getReviewQueue({
      holderUnit: holderFilters.holderUnit,
      holderUser: holderFilters.holderUser,
      state: holderFilters.state,
      skip: holderFilters.skip,
      take: holderFilters.take,
    });

    return {
      data: result.data.map((p) => this.mapToDto(p)),
      meta: result.meta,
    };
  }

  /**
   * Soft remove (deprecated - use remove)
   */
  async softRemove(
    id: string,
    userId: string,
    ctx: RequestContext,
  ): Promise<void> {
    return this.remove(id, userId);
  }

  /**
   * Restore soft-deleted proposal
   */
  async restore(
    id: string,
    userId: string,
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.log(`Restoring proposal ${id}`);

    await this.validation.validateAccess(id, userId);

    const proposal = await this.crud.restore(id);

    // Audit log
    this.auditService
      .logEvent({
        action: AuditAction.RESTORE,
        userId,
        userDisplayName: ctx.userDisplayName,
        targetType: 'proposal',
        targetId: id,
        targetCode: proposal.code,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
      })
      .catch((err) => {
        this.logger.error(`Failed to log audit event: ${err.message}`);
      });

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Start project (APPROVED → IN_PROGRESS)
   */
  async startProject(
    id: string,
    userId: string,
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.log(`Starting project for proposal ${id}`);

    await this.validation.validateAccess(id, userId);

    const context = {
      userId,
      userRole: ctx.userDisplayName,
      userFacultyId: ctx.userDisplayName,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    };

    const result = await this.workflow.startProject(id, context);

    return this.mapToDtoWithTemplate(result.proposal);
  }

  /**
   * Submit faculty acceptance
   */
  async submitFacultyAcceptance(
    id: string,
    data: any,
    userId: string,
    ctx: RequestContext,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.log(`Submitting faculty acceptance for proposal ${id}`);

    await this.validation.validateAccess(id, userId);

    const context = {
      userId,
      userRole: ctx.userDisplayName,
      userFacultyId: ctx.userDisplayName,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
    };

    const result = await this.workflow.facultyAcceptance(id, data, context);

    return this.mapToDtoWithTemplate(result.proposal);
  }

  /**
   * Faculty acceptance (deprecated)
   */
  async facultyAcceptance(
    proposalId: string,
    acceptanceData: any,
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    return this.submitFacultyAcceptance(
      proposalId,
      acceptanceData,
      userId,
      {} as RequestContext,
    );
  }

  /**
   * School acceptance
   */
  async schoolAcceptance(
    proposalId: string,
    acceptanceData: any,
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.log(`Submitting school acceptance for proposal ${proposalId}`);

    await this.validation.validateAccess(proposalId, userId);

    const context = {
      userId,
      ip: '',
      userAgent: '',
      requestId: '',
    };

    const result = await this.workflow.schoolAcceptance(
      proposalId,
      acceptanceData,
      context,
    );

    return this.mapToDtoWithTemplate(result.proposal);
  }

  /**
   * Complete handover
   */
  async completeHandover(
    proposalId: string,
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.log(`Completing handover for proposal ${proposalId}`);

    await this.validation.validateAccess(proposalId, userId);

    const context = {
      userId,
      ip: '',
      userAgent: '',
      requestId: '',
    };

    const result = await this.workflow.completeHandover(proposalId, context);

    return this.mapToDtoWithTemplate(result.proposal);
  }

  /**
   * Save handover checklist
   */
  async saveHandoverChecklist(
    proposalId: string,
    checklistData: any,
    userId: string,
  ): Promise<ProposalWithTemplateDto> {
    this.logger.log(`Saving handover checklist for proposal ${proposalId}`);

    await this.validation.validateAccess(proposalId, userId);

    const proposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        handoverChecklist: checklistData,
      },
      include: {
        owner: true,
        faculty: true,
        template: true,
      },
    });

    return this.mapToDtoWithTemplate(proposal);
  }

  /**
   * Get faculty acceptance data
   */
  async getFacultyAcceptanceData(proposalId: string): Promise<any> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { facultyAcceptanceData: true },
    });

    return proposal?.facultyAcceptanceData;
  }

  /**
   * Get school acceptance data
   */
  async getSchoolAcceptanceData(proposalId: string): Promise<any> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { schoolAcceptanceData: true },
    });

    return proposal?.schoolAcceptanceData;
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Deep merge form data
   */
  private deepMerge(
    existingData: Record<string, unknown> | null,
    newData: Record<string, unknown>,
  ): Record<string, unknown> {
    return deepMergeFormData(existingData, newData);
  }

  /**
   * Map proposal entity to DTO (without template)
   */
  private mapToDto(proposal: any): ProposalDto {
    return {
      id: proposal.id,
      code: proposal.code,
      title: proposal.title,
      description: proposal.description,
      state: proposal.state,
      ownerId: proposal.ownerId,
      owner: proposal.owner,
      facultyId: proposal.facultyId,
      faculty: proposal.faculty,
      templateId: proposal.templateId,
      templateVersion: proposal.templateVersion,
      formData: proposal.formData as unknown as Record<string, unknown>,
      attachments: proposal.attachments,
      holderUnit: proposal.holderUnit,
      holderUser: proposal.holderUser,
      slaStartDate: proposal.slaStartDate,
      slaDeadline: proposal.slaDeadline,
      facultyAcceptanceData: proposal.facultyAcceptanceData,
      schoolAcceptanceData: proposal.schoolAcceptanceData,
      handoverChecklist: proposal.handoverChecklist,
      startedAt: proposal.startedAt,
      completedAt: proposal.completedAt,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      deletedAt: proposal.deletedAt,
    };
  }

  /**
   * Map proposal entity to DTO with template
   */
  private mapToDtoWithTemplate(proposal: any): ProposalWithTemplateDto {
    return {
      ...this.mapToDto(proposal),
      template: proposal.template,
    };
  }
}
