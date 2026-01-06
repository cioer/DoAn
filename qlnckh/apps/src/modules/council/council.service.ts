import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { CouncilType, CouncilMemberRole, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Council Service (Story 5.2)
 * Manages council-related operations for PKHCN
 */
@Injectable()
export class CouncilService {
  private readonly logger = new Logger(CouncilService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all available councils for PKHCN (Story 5.2)
   * Returns councils with their members, suitable for dropdown display
   *
   * @param type - Optional filter by council type (OUTLINE, ACCEPTANCE, etc.)
   * @returns List of councils with members
   */
  async listCouncils(type?: CouncilType) {
    const where: Prisma.CouncilWhereInput = type ? { type } : {};

    const councils = await this.prisma.council.findMany({
      where,
      include: {
        secretary: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to DTO format with member display names
    return councils.map((council) => ({
      id: council.id,
      name: council.name,
      type: council.type,
      secretaryId: council.secretaryId,
      secretaryName: council.secretary?.displayName || null,
      members: council.members.map((member) => ({
        id: member.id,
        councilId: member.councilId,
        userId: member.userId,
        displayName: member.user.displayName,
        role: member.role,
        createdAt: member.createdAt,
      })),
      createdAt: council.createdAt,
      updatedAt: council.updatedAt,
    }));
  }

  /**
   * Get council by ID with full details (Story 5.2)
   *
   * @param id - Council ID
   * @returns Council with members
   * @throws NotFoundException if council not found
   */
  async getCouncilById(id: string) {
    const council = await this.prisma.council.findUnique({
      where: { id },
      include: {
        secretary: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!council) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      });
    }

    return {
      id: council.id,
      name: council.name,
      type: council.type,
      secretaryId: council.secretaryId,
      secretaryName: council.secretary?.displayName || null,
      members: council.members.map((member) => ({
        id: member.id,
        councilId: member.councilId,
        userId: member.userId,
        displayName: member.user.displayName,
        role: member.role,
        createdAt: member.createdAt,
      })),
      createdAt: council.createdAt,
      updatedAt: council.updatedAt,
    };
  }

  /**
   * Get council members for dropdown (Story 5.2)
   * Returns users who can be council members (HOI_DONG, THANH_TRUNG roles)
   *
   * @returns List of eligible users for council membership
   */
  async getEligibleCouncilMembers() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['HOI_DONG', 'THANH_TRUNG'],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        facultyId: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    return users;
  }

  /**
   * Assign council to proposal (Story 5.2, Task 2)
   * Called by workflow controller as part of state transition
   * This method updates the proposal with council assignment
   *
   * @param proposalId - Proposal ID
   * @param councilId - Council ID to assign
   * @param secretaryId - Secretary user ID
   * @param memberIds - Optional array of member IDs
   * @returns Updated proposal with council assignment
   */
  async assignCouncilToProposal(
    proposalId: string,
    councilId: string,
    secretaryId: string,
    memberIds?: string[],
  ) {
    // Verify council exists
    const council = await this.prisma.council.findUnique({
      where: { id: councilId },
      include: {
        secretary: true,
        members: true,
      },
    });

    if (!council) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      });
    }

    // Verify secretary exists
    const secretary = await this.prisma.user.findUnique({
      where: { id: secretaryId },
    });

    if (!secretary) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'SECRETARY_NOT_FOUND',
          message: 'Không tìm thấy thư ký',
        },
      });
    }

    // Update proposal with council assignment
    const updatedProposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        councilId,
      },
    });

    this.logger.log(
      `Council ${council.name} assigned to proposal ${updatedProposal.code}`,
    );

    return {
      proposal: updatedProposal,
      council,
      secretary,
    };
  }

  /**
   * Create new council (for future "Tạo hội đồng mới" feature - Story 5.2)
   *
   * @param name - Council name
   * @param type - Council type
   * @param secretaryId - Secretary user ID
   * @param memberIds - Array of member IDs
   * @param actorId - User creating the council (for audit)
   * @returns Created council with members
   */
  async createCouncil(
    name: string,
    type: CouncilType,
    secretaryId: string | undefined,
    memberIds: string[] | undefined,
    actorId: string,
  ) {
    // Create council with members in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create council
      const council = await tx.council.create({
        data: {
          name,
          type,
          secretaryId,
        },
      });

      // Create council members if provided
      if (memberIds && memberIds.length > 0) {
        const memberData = memberIds.map((userId) => ({
          councilId: council.id,
          userId,
          role: CouncilMemberRole.MEMBER,
        }));

        await tx.councilMember.createMany({
          data: memberData,
        });
      }

      // Fetch created council with members
      const createdCouncil = await tx.council.findUnique({
        where: { id: council.id },
        include: {
          secretary: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      return createdCouncil;
    });

    // Log audit event
    await this.auditService.logEvent({
      action: 'COUNCIL_CREATE' as AuditAction,
      actorUserId: actorId,
      entityType: 'Council',
      entityId: result.id,
      metadata: {
        councilName: name,
        councilType: type,
        secretaryId,
        memberIds,
      },
    });

    this.logger.log(`Council created: ${name} (${type})`);

    return result;
  }

  /**
   * Get council for a proposal (Story 5.2)
   *
   * @param proposalId - Proposal ID
   * @returns Council with members or null if not assigned
   */
  async getCouncilForProposal(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        councilId: true,
      },
    });

    if (!proposal || !proposal.councilId) {
      return null;
    }

    return this.getCouncilById(proposal.councilId);
  }
}
