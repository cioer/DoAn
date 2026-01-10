import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState } from '@prisma/client';

/**
 * Proposals Query Service
 *
 * Handles complex queries and data retrieval for proposals.
 * Focus: Read operations, aggregations, and reporting.
 */
@Injectable()
export class ProposalsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get proposals by faculty
   */
  async getByFaculty(
    facultyId: string,
    filters: {
      skip?: number;
      take?: number;
      state?: ProjectState;
      includeDeleted?: boolean;
    } = {},
  ) {
    const { skip = 0, take = 20, state, includeDeleted = false } = filters;

    const where: any = { facultyId };

    if (state) {
      where.state = state;
    }

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          faculty: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
              version: true,
            },
          },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: proposals,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get proposals by state
   */
  async getByState(
    state: ProjectState,
    filters: {
      skip?: number;
      take?: number;
      facultyId?: string;
    } = {},
  ) {
    const { skip = 0, take = 20, facultyId } = filters;

    const where: any = { state, deletedAt: null };

    if (facultyId) {
      where.facultyId = facultyId;
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
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get proposals by owner
   */
  async getByOwner(
    ownerId: string,
    filters: {
      skip?: number;
      take?: number;
      state?: ProjectState;
    } = {},
  ) {
    const { skip = 0, take = 20, state } = filters;

    const where: any = { ownerId, deletedAt: null };

    if (state) {
      where.state = state;
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
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Search proposals
   */
  async search(query: string, filters: {
    skip?: number;
    take?: number;
    facultyId?: string;
    state?: ProjectState;
  } = {}) {
    const { skip = 0, take = 20, facultyId, state } = filters;

    const where: any = {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (facultyId) {
      where.facultyId = facultyId;
    }

    if (state) {
      where.state = state;
    }

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          faculty: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: proposals,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get proposal statistics
   */
  async getStatistics(filters: {
    facultyId?: string;
    ownerId?: string;
  } = {}) {
    const { facultyId, ownerId } = filters;

    const where: any = { deletedAt: null };

    if (facultyId) {
      where.facultyId = facultyId;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    const [
      total,
      byState,
      byFaculty,
    ] = await Promise.all([
      this.prisma.proposal.count({ where }),

      // Count by state
      this.prisma.proposal.groupBy({
        by: ['state'],
        where,
        _count: true,
      }),

      // Count by faculty (if not filtered by faculty)
      facultyId
        ? Promise.resolve([])
        : this.prisma.proposal.groupBy({
            by: ['facultyId'],
            where,
            _count: true,
          }),
    ]);

    return {
      total,
      byState: byState.reduce((acc, item) => {
        acc[item.state] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byFaculty: byFaculty.reduce((acc, item) => {
        acc[item.facultyId] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get proposals for review queue
   */
  async getReviewQueue(filters: {
    holderUnit?: string;
    holderUser?: string;
    state?: ProjectState;
    skip?: number;
    take?: number;
  } = {}) {
    const { holderUnit, holderUser, state, skip = 0, take = 20 } = filters;

    const where: any = { deletedAt: null };

    if (holderUnit) {
      where.holderUnit = holderUnit;
    }

    if (holderUser) {
      where.holderUser = holderUser;
    }

    if (state) {
      where.state = state;
    }

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' }, // Oldest first
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          faculty: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: proposals,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get proposal with full details
   */
  async getWithFullDetails(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        owner: true,
        faculty: true,
        template: true,
        workflowLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    return proposal;
  }

  /**
   * Get proposals with template data
   */
  async getWithTemplate(filters: {
    templateId?: string;
    skip?: number;
    take?: number;
  } = {}) {
    const { templateId, skip = 0, take = 20 } = filters;

    const where: any = { deletedAt: null };

    if (templateId) {
      where.templateId = templateId;
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
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get proposals export data
   */
  async getExportData(filters: {
    facultyId?: string;
    state?: ProjectState;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const { facultyId, state, startDate, endDate } = filters;

    const where: any = { deletedAt: null };

    if (facultyId) {
      where.facultyId = facultyId;
    }

    if (state) {
      where.state = state;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const proposals = await this.prisma.proposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        faculty: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
      },
    });

    return proposals;
  }

  /**
   * Get overdue proposals
   */
  async getOverdue(filters: {
    facultyId?: string;
    skip?: number;
    take?: number;
  } = {}) {
    const { facultyId, skip = 0, take = 20 } = filters;

    const now = new Date();
    const where: any = {
      deletedAt: null,
      slaDeadline: { lt: now },
      state: {
        notIn: [
          ProjectState.DRAFT,
          ProjectState.APPROVED,
          ProjectState.REJECTED,
          ProjectState.CANCELLED,
          ProjectState.WITHDRAWN,
          ProjectState.COMPLETED,
        ],
      },
    };

    if (facultyId) {
      where.facultyId = facultyId;
    }

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        orderBy: { slaDeadline: 'asc' },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          faculty: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      data: proposals,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}
