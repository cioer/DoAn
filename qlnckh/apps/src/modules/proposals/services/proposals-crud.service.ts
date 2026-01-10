import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState, Prisma } from '@prisma/client';
import { CreateProposalDto, UpdateProposalDto, AutoSaveProposalDto } from '../dto';

/**
 * Proposals CRUD Service
 *
 * Handles basic CRUD operations for proposals.
 * Focus: Pure database operations without validation or workflow logic.
 */
@Injectable()
export class ProposalsCrudService {
  private readonly logger = new Logger(ProposalsCrudService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate next proposal code (DT-XXX format)
   * Uses max existing code to avoid race conditions
   */
  async generateProposalCode(): Promise<string> {
    const result = await this.prisma.$queryRaw<
      Array<{ next_code: string }>
    >`
      SELECT 'DT-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) + 1)::TEXT, 3, '0') AS next_code
      FROM proposals
      WHERE code LIKE 'DT-%'
    `;

    if (result && result.length > 0 && result[0].next_code) {
      return result[0].next_code;
    }

    return 'DT-001';
  }

  /**
   * Create a new proposal
   */
  async create(
    data: CreateProposalDto,
    userId: string,
    code: string,
  ) {
    const proposal = await this.prisma.proposal.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        ownerId: userId,
        facultyId: data.facultyId,
        templateId: data.templateId,
        templateVersion: data.templateVersion,
        formData: data.formData as Prisma.InputJsonValue,
        state: ProjectState.DRAFT,
        attachments: data.attachments || [],
        holderUnit: data.facultyId,
        holderUser: userId,
      },
      include: {
        owner: true,
        faculty: true,
        template: true,
      },
    });

    this.logger.log(`Proposal created: ${proposal.code} by user ${userId}`);

    return proposal;
  }

  /**
   * Find proposal by ID
   */
  async findById(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        owner: true,
        faculty: true,
        template: true,
        attachments: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    return proposal;
  }

  /**
   * Find proposal by code
   */
  async findByCode(code: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { code },
      include: {
        owner: true,
        faculty: true,
        template: true,
      },
    });

    return proposal;
  }

  /**
   * List proposals with pagination
   */
  async findAll(filters: {
    skip?: number;
    take?: number;
    facultyId?: string;
    ownerId?: string;
    state?: ProjectState;
    search?: string;
  }) {
    const {
      skip = 0,
      take = 20,
      facultyId,
      ownerId,
      state,
      search,
    } = filters;

    const where: Prisma.ProposalWhereInput = {};

    if (facultyId) {
      where.facultyId = facultyId;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (state) {
      where.state = state;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: true,
          faculty: true,
          template: true,
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: proposals,
      meta: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  /**
   * Update proposal data
   */
  async update(id: string, data: UpdateProposalDto) {
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        formData: data.formData as Prisma.InputJsonValue,
        attachments: data.attachments,
      },
      include: {
        owner: true,
        faculty: true,
        template: true,
      },
    });

    this.logger.log(`Proposal updated: ${proposal.code}`);

    return proposal;
  }

  /**
   * Auto-save draft proposal
   */
  async autoSave(id: string, data: AutoSaveProposalDto, userId: string) {
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        formData: data.formData as Prisma.InputJsonValue,
        attachments: data.attachments,
      },
      include: {
        owner: true,
        faculty: true,
        template: true,
      },
    });

    this.logger.log(`Proposal auto-saved: ${proposal.code} by user ${userId}`);

    return proposal;
  }

  /**
   * Soft delete proposal
   */
  async softDelete(id: string) {
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Proposal soft-deleted: ${proposal.code}`);

    return proposal;
  }

  /**
   * Restore soft-deleted proposal
   */
  async restore(id: string) {
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      include: {
        owner: true,
        faculty: true,
        template: true,
      },
    });

    this.logger.log(`Proposal restored: ${proposal.code}`);

    return proposal;
  }

  /**
   * Permanently delete proposal (use with caution)
   */
  async delete(id: string) {
    const proposal = await this.prisma.proposal.delete({
      where: { id },
    });

    this.logger.log(`Proposal permanently deleted: ${proposal.code}`);

    return proposal;
  }

  /**
   * Check if proposal exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.proposal.count({
      where: { id },
    });

    return count > 0;
  }

  /**
   * Get proposal state
   */
  async getState(id: string): Promise<ProjectState | null> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      select: { state: true },
    });

    return proposal?.state || null;
  }

  /**
   * Update proposal state
   */
  async updateState(id: string, state: ProjectState) {
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: { state },
    });

    this.logger.log(`Proposal state updated: ${proposal.code} → ${state}`);

    return proposal;
  }

  /**
   * Update proposal holder
   */
  async updateHolder(id: string, holderUnit: string | null, holderUser: string | null) {
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        holderUnit,
        holderUser,
      },
    });

    return proposal;
  }

  /**
   * Update SLA dates
   */
  async updateSlaDates(id: string, slaStartDate: Date, slaDeadline: Date | null) {
    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        slaStartDate,
        slaDeadline,
      },
    });

    return proposal;
  }
}
