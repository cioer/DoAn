import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
          in: ['GIANG_VIEN', 'GIANG_VIEN'],
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
   * Update council (for council management feature)
   *
   * @param id - Council ID
   * @param name - Council name (optional)
   * @param type - Council type (optional)
   * @param secretaryId - Secretary user ID (optional)
   * @param memberIds - Array of member IDs (optional)
   * @param actorId - User updating the council (for audit)
   * @returns Updated council with members
   */
  async updateCouncil(
    id: string,
    name?: string,
    type?: CouncilType,
    secretaryId?: string,
    memberIds?: string[],
    actorId?: string,
  ) {
    // Verify council exists
    const existingCouncil = await this.prisma.council.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!existingCouncil) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      });
    }

    // Update council with members in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update council basic info
      const council = await tx.council.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(type && { type }),
          ...(secretaryId !== undefined && { secretaryId }),
        },
      });

      // Update members if provided
      if (memberIds !== undefined) {
        // Delete existing members
        await tx.councilMember.deleteMany({
          where: { councilId: id },
        });

        // Create new members if provided
        if (memberIds.length > 0) {
          const memberData = memberIds.map((userId) => ({
            councilId: council.id,
            userId,
            role: CouncilMemberRole.MEMBER,
          }));

          await tx.councilMember.createMany({
            data: memberData,
          });
        }
      }

      // Fetch updated council with members
      const updatedCouncil = await tx.council.findUnique({
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

      return updatedCouncil;
    });

    // Log audit event if actorId provided
    if (actorId) {
      await this.auditService.logEvent({
        action: 'COUNCIL_UPDATE' as AuditAction,
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
    }

    this.logger.log(`Council updated: ${result.name} (${result.type})`);

    return result;
  }

  /**
   * Delete council (for council management feature)
   *
   * @param id - Council ID
   * @param actorId - User deleting the council (for audit)
   * @throws NotFoundException if council not found
   * @throws BadRequestException if council is assigned to proposals
   */
  async deleteCouncil(id: string, actorId: string) {
    // Verify council exists
    const existingCouncil = await this.prisma.council.findUnique({
      where: { id },
      include: {
        proposals: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    if (!existingCouncil) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng',
        },
      });
    }

    // Check if council is assigned to any proposals
    if (existingCouncil.proposals.length > 0) {
      const proposalCodes = existingCouncil.proposals.map((p) => p.code).join(', ');
      throw new Error(
        `Không thể xóa hội đồng đã được gán cho đề tài: ${proposalCodes}`,
      );
    }

    // Delete council (members will be cascade deleted)
    await this.prisma.council.delete({
      where: { id },
    });

    // Log audit event
    await this.auditService.logEvent({
      action: 'COUNCIL_DELETE' as AuditAction,
      actorUserId: actorId,
      entityType: 'Council',
      entityId: id,
      metadata: {
        councilName: existingCouncil.name,
        councilType: existingCouncil.type,
      },
    });

    this.logger.log(`Council deleted: ${existingCouncil.name} (${existingCouncil.type})`);

    return {
      success: true,
      message: 'Hội đồng đã được xóa thành công',
    };
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

  /**
   * Change council for a proposal
   * Used when proposal is already in a council review state and needs council reassignment
   *
   * @param proposalId - Proposal ID
   * @param newCouncilId - New council ID to assign
   * @param newSecretaryId - New secretary user ID
   * @param newMemberIds - Optional array of new member IDs
   * @param actorId - User performing the change (for audit)
   * @returns Updated proposal with new council assignment
   */
  async changeCouncilForProposal(
    proposalId: string,
    newCouncilId: string,
    newSecretaryId: string,
    newMemberIds?: string[],
    actorId?: string,
  ) {
    // Verify proposal exists and has a council assigned
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        councilId: true,
        title: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Không tìm thấy đề tài',
        },
      });
    }

    if (!proposal.councilId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_COUNCIL_ASSIGNED',
          message: 'Đề tài chưa được gán hội đồng. Sử dụng tính năng gán hội đồng.',
        },
      });
    }

    // Verify new council exists
    const newCouncil = await this.prisma.council.findUnique({
      where: { id: newCouncilId },
      include: {
        secretary: true,
        members: true,
      },
    });

    if (!newCouncil) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'COUNCIL_NOT_FOUND',
          message: 'Không tìm thấy hội đồng mới',
        },
      });
    }

    // Verify new secretary exists
    const newSecretary = await this.prisma.user.findUnique({
      where: { id: newSecretaryId },
    });

    if (!newSecretary) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'SECRETARY_NOT_FOUND',
          message: 'Không tìm thấy thư ký mới',
        },
      });
    }

    // Check if trying to assign the same council
    if (proposal.councilId === newCouncilId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'SAME_COUNCIL',
          message: 'Hội đồng mới phải khác với hội đồng hiện tại',
        },
      });
    }

    const previousCouncilId = proposal.councilId;

    // Update proposal with new council assignment
    const updatedProposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        councilId: newCouncilId,
        holderUnit: newCouncilId,
        holderUser: newSecretaryId,
      },
    });

    this.logger.log(
      `Council changed for proposal ${updatedProposal.code}: ${previousCouncilId} -> ${newCouncilId}`,
    );

    // Log audit event if actorId provided
    if (actorId) {
      await this.auditService.logEvent({
        action: 'COUNCIL_CHANGE' as AuditAction,
        actorUserId: actorId,
        entityType: 'Proposal',
        entityId: proposalId,
        metadata: {
          proposalCode: proposal.code,
          proposalTitle: proposal.title,
          previousCouncilId,
          newCouncilId,
          newCouncilName: newCouncil.name,
          newSecretaryId,
          reason: 'Council changed by PHONG_KHCN',
        },
      });
    }

    return {
      proposal: updatedProposal,
      council: newCouncil,
      secretary: newSecretary,
      previousCouncilId,
    };
  }
}