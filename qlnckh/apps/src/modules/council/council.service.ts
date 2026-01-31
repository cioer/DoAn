import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { CouncilType, CouncilMemberRole, CouncilScope, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

/**
 * Faculty Council Validation Result
 */
interface FacultyCouncilValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Eligible Voters Info for a Proposal
 */
interface EligibleVotersInfo {
  eligibleVoters: string[];
  excludedMembers: { id: string; reason: string }[];
  totalEligible: number;
  warning?: string;
}

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
    const where: Prisma.councilsWhereInput = type ? { type } : {};

    const councils = await this.prisma.council.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        council_members: {
          include: {
            users: {
              select: {
                id: true,
                display_name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
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
      secretaryId: council.secretary_id,
      secretaryName: council.users?.display_name || null,
      members: council.council_members.map((member) => ({
        id: member.id,
        councilId: member.council_id,
        userId: member.user_id,
        displayName: member.users.display_name,
        role: member.role,
        createdAt: member.created_at,
      })),
      createdAt: council.created_at,
      updatedAt: council.updated_at,
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
        users: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        council_members: {
          include: {
            users: {
              select: {
                id: true,
                display_name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
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
      secretaryId: council.secretary_id,
      secretaryName: council.users?.display_name || null,
      members: council.council_members.map((member) => ({
        id: member.id,
        councilId: member.council_id,
        userId: member.user_id,
        displayName: member.users.display_name,
        role: member.role,
        createdAt: member.created_at,
      })),
      createdAt: council.created_at,
      updatedAt: council.updated_at,
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
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        email: true,
        role: true,
        faculty_id: true,
      },
      orderBy: {
        display_name: 'asc',
      },
    });

    return users.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      email: u.email,
      role: u.role,
      facultyId: u.faculty_id,
    }));
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
        users: true,
        council_members: true,
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
        council_id: councilId,
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
      const council = await tx.councils.create({
        data: {
          name,
          type,
          secretary_id: secretaryId,
        },
      });

      // Create council members if provided
      if (memberIds && memberIds.length > 0) {
        const memberData = memberIds.map((userId) => ({
          council_id: council.id,
          user_id: userId,
          role: CouncilMemberRole.MEMBER,
        }));

        await tx.council_members.createMany({
          data: memberData,
        });
      }

      // Fetch created council with members
      const createdCouncil = await tx.councils.findUnique({
        where: { id: council.id },
        include: {
          users: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
          council_members: {
            include: {
              users: {
                select: {
                  id: true,
                  display_name: true,
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
        council_members: true,
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
      const council = await tx.councils.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(type && { type }),
          ...(secretaryId !== undefined && { secretary_id: secretaryId }),
        },
      });

      // Update members if provided
      if (memberIds !== undefined) {
        // Delete existing members
        await tx.council_members.deleteMany({
          where: { council_id: id },
        });

        // Create new members if provided
        if (memberIds.length > 0) {
          const memberData = memberIds.map((userId) => ({
            council_id: council.id,
            user_id: userId,
            role: CouncilMemberRole.MEMBER,
          }));

          await tx.council_members.createMany({
            data: memberData,
          });
        }
      }

      // Fetch updated council with members
      const updatedCouncil = await tx.councils.findUnique({
        where: { id: council.id },
        include: {
          users: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
          council_members: {
            include: {
              users: {
                select: {
                  id: true,
                  display_name: true,
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
        council_id: true,
      },
    });

    if (!proposal || !proposal.council_id) {
      return null;
    }

    return this.getCouncilById(proposal.council_id);
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
        council_id: true,
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

    if (!proposal.council_id) {
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
        users: true,
        council_members: true,
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
    if (proposal.council_id === newCouncilId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'SAME_COUNCIL',
          message: 'Hội đồng mới phải khác với hội đồng hiện tại',
        },
      });
    }

    const previousCouncilId = proposal.council_id;

    // Update proposal with new council assignment
    const updatedProposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        council_id: newCouncilId,
        holder_unit: newCouncilId,
        holder_user: newSecretaryId,
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

  // ============================================
  // FACULTY COUNCIL METHODS
  // ============================================

  /**
   * Validate faculty council members
   * Rules:
   * - All members must belong to the same faculty
   * - Minimum 3 voting members (excluding secretary)
   * - Voting members count must be odd
   * - Secretary must be a member
   *
   * @param facultyId - Faculty ID
   * @param memberIds - Array of member user IDs
   * @param secretaryId - Secretary user ID
   * @returns Validation result with errors/warnings
   */
  async validateFacultyCouncilMembers(
    facultyId: string,
    memberIds: string[],
    secretaryId: string,
  ): Promise<FacultyCouncilValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get all users
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, display_name: true, faculty_id: true, role: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Rule 1: All members must belong to the same faculty
    for (const memberId of memberIds) {
      const user = userMap.get(memberId);
      if (!user) {
        errors.push(`Không tìm thấy người dùng với ID: ${memberId}`);
        continue;
      }
      if (user.faculty_id !== facultyId) {
        errors.push(`${user.display_name} không thuộc khoa này`);
      }
      if (user.role !== UserRole.GIANG_VIEN) {
        errors.push(`${user.display_name} không phải giảng viên`);
      }
    }

    // Rule 2: Voting members = all members except secretary
    const votingMembers = memberIds.filter((id) => id !== secretaryId);

    // Rule 3: Minimum 3 voting members
    if (votingMembers.length < 3) {
      errors.push(
        `Hội đồng phải có tối thiểu 3 thành viên bỏ phiếu (không tính thư ký). Hiện tại: ${votingMembers.length}`,
      );
    }

    // Rule 4: Voting members count must be odd
    if (votingMembers.length >= 3 && votingMembers.length % 2 === 0) {
      errors.push(
        `Số thành viên bỏ phiếu phải là số lẻ (hiện tại: ${votingMembers.length})`,
      );
    }

    // Rule 5: Secretary must be in member list
    if (!memberIds.includes(secretaryId)) {
      errors.push('Thư ký phải là thành viên của hội đồng');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate council assignment for a specific proposal
   * Checks if the number of eligible voters is odd after excluding owner
   *
   * @param councilMembers - Array of council member IDs
   * @param secretaryId - Secretary ID
   * @param proposalOwnerId - Proposal owner ID
   * @returns Eligible voters info with warnings
   */
  getEligibleVotersForProposal(
    councilMembers: string[],
    secretaryId: string,
    proposalOwnerId: string,
  ): EligibleVotersInfo {
    const excludedMembers: { id: string; reason: string }[] = [];

    // Exclude secretary
    if (councilMembers.includes(secretaryId)) {
      excludedMembers.push({ id: secretaryId, reason: 'Thư ký (chỉ tổng hợp)' });
    }

    // Exclude proposal owner
    if (councilMembers.includes(proposalOwnerId)) {
      excludedMembers.push({
        id: proposalOwnerId,
        reason: 'Chủ nhiệm đề tài (không tự đánh giá)',
      });
    }

    const eligibleVoters = councilMembers.filter(
      (id) => id !== secretaryId && id !== proposalOwnerId,
    );

    let warning: string | undefined;

    if (eligibleVoters.length < 3) {
      warning = `Không đủ thành viên bỏ phiếu (cần tối thiểu 3, có ${eligibleVoters.length})`;
    } else if (eligibleVoters.length % 2 === 0) {
      warning = `Số thành viên bỏ phiếu là số chẵn (${eligibleVoters.length}). Có thể xảy ra hòa.`;
    }

    return {
      eligibleVoters,
      excludedMembers,
      totalEligible: eligibleVoters.length,
      warning,
    };
  }

  /**
   * List faculty councils for a specific faculty
   *
   * @param facultyId - Faculty ID
   * @param type - Optional council type filter
   * @returns List of faculty councils
   */
  async listFacultyCouncils(facultyId: string, type?: CouncilType) {
    const where: Prisma.councilsWhereInput = {
      scope: CouncilScope.FACULTY,
      faculty_id: facultyId,
      ...(type && { type }),
    };

    const councils = await this.prisma.council.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
        council_members: {
          include: {
            users: {
              select: {
                id: true,
                display_name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            created_at: 'asc',
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
      orderBy: {
        name: 'asc',
      },
    });

    return councils.map((council) => ({
      id: council.id,
      name: council.name,
      type: council.type,
      scope: council.scope,
      facultyId: council.faculty_id,
      facultyName: council.faculty?.name || null,
      secretaryId: council.secretary_id,
      secretaryName: council.users?.display_name || null,
      members: council.council_members.map((member) => ({
        id: member.id,
        councilId: member.council_id,
        userId: member.user_id,
        displayName: member.users.display_name,
        role: member.role,
        createdAt: member.created_at,
      })),
      votingMemberCount: council.council_members.filter(
        (m) => m.user_id !== council.secretary_id,
      ).length,
      createdAt: council.created_at,
      updatedAt: council.updated_at,
    }));
  }

  /**
   * Get eligible faculty members for council membership
   * Returns lecturers from the same faculty
   *
   * @param facultyId - Faculty ID
   * @param excludeOwnerId - Optional proposal owner ID to exclude
   * @returns List of eligible users
   */
  async getEligibleFacultyMembers(facultyId: string, excludeOwnerId?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        faculty_id: facultyId,
        role: UserRole.GIANG_VIEN,
        deleted_at: null,
        ...(excludeOwnerId && { id: { not: excludeOwnerId } }),
      },
      select: {
        id: true,
        display_name: true,
        email: true,
        role: true,
        faculty_id: true,
      },
      orderBy: {
        display_name: 'asc',
      },
    });

    return users.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      email: u.email,
      role: u.role,
      facultyId: u.faculty_id,
    }));
  }

  /**
   * Create a faculty council
   *
   * @param name - Council name
   * @param type - Council type
   * @param facultyId - Faculty ID
   * @param secretaryId - Secretary user ID
   * @param memberIds - Array of member IDs
   * @param actorId - User creating the council
   * @returns Created council
   */
  async createFacultyCouncil(
    name: string,
    type: CouncilType,
    facultyId: string,
    secretaryId: string,
    memberIds: string[],
    actorId: string,
  ) {
    // Validate members
    const validation = await this.validateFacultyCouncilMembers(
      facultyId,
      memberIds,
      secretaryId,
    );

    if (!validation.valid) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_COUNCIL_MEMBERS',
          message: 'Danh sách thành viên không hợp lệ',
          details: validation.errors,
        },
      });
    }

    // Create council with members in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create council
      const council = await tx.councils.create({
        data: {
          name,
          type,
          scope: CouncilScope.FACULTY,
          faculty_id: facultyId,
          secretary_id: secretaryId,
        },
      });

      // Create council members
      const memberData = memberIds.map((userId) => ({
        council_id: council.id,
        user_id: userId,
        role: userId === secretaryId ? CouncilMemberRole.SECRETARY : CouncilMemberRole.MEMBER,
      }));

      await tx.council_members.createMany({
        data: memberData,
      });

      // Fetch created council with members
      const createdCouncil = await tx.councils.findUnique({
        where: { id: council.id },
        include: {
          users: {
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          },
          council_members: {
            include: {
              users: {
                select: {
                  id: true,
                  display_name: true,
                  email: true,
                  role: true,
                },
              },
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
        councilScope: 'FACULTY',
        facultyId,
        secretaryId,
        memberIds,
        votingMemberCount: memberIds.filter((id) => id !== secretaryId).length,
      },
    });

    this.logger.log(`Faculty council created: ${name} (${type}) for faculty ${facultyId}`);

    return {
      ...result,
      votingMemberCount: memberIds.filter((id) => id !== secretaryId).length,
      warnings: validation.warnings,
    };
  }

  /**
   * Assign faculty council to proposal
   *
   * @param proposalId - Proposal ID
   * @param councilId - Council ID
   * @param actorId - User assigning the council
   * @param actorFacultyId - Actor's faculty ID
   * @returns Assignment result with warnings
   */
  async assignFacultyCouncilToProposal(
    proposalId: string,
    councilId: string,
    actorId: string,
    actorFacultyId: string,
  ) {
    // Get proposal
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        state: true,
        owner_id: true,
        faculty_id: true,
        council_id: true,
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

    // Validate state
    if (proposal.state !== 'FACULTY_COUNCIL_OUTLINE_REVIEW') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Chỉ có thể phân công hội đồng ở trạng thái FACULTY_COUNCIL_OUTLINE_REVIEW. Hiện tại: ${proposal.state}`,
        },
      });
    }

    // Validate faculty match
    if (proposal.faculty_id !== actorFacultyId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FACULTY_MISMATCH',
          message: 'Bạn chỉ có thể phân công hội đồng cho đề tài thuộc khoa của mình',
        },
      });
    }

    // Get council
    const council = await this.prisma.council.findUnique({
      where: { id: councilId },
      include: {
        users: true,
        council_members: {
          include: {
            users: {
              select: { id: true, display_name: true },
            },
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

    // Validate council is faculty council for same faculty
    if (council.scope !== CouncilScope.FACULTY) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_COUNCIL_SCOPE',
          message: 'Hội đồng này không phải hội đồng cấp khoa',
        },
      });
    }

    if (council.faculty_id !== proposal.faculty_id) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'COUNCIL_FACULTY_MISMATCH',
          message: 'Hội đồng khoa không thuộc khoa của đề tài',
        },
      });
    }

    // Get eligible voters info
    const memberIds = council.council_members.map((m) => m.user_id);
    const votersInfo = this.getEligibleVotersForProposal(
      memberIds,
      council.secretary_id || '',
      proposal.owner_id,
    );

    // Update proposal
    const updatedProposal = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        council_id: councilId,
        holder_unit: councilId,
        holder_user: council.secretary_id,
      },
    });

    // Log audit
    await this.auditService.logEvent({
      action: 'ASSIGN_COUNCIL' as AuditAction,
      actorUserId: actorId,
      entityType: 'Proposal',
      entityId: proposalId,
      metadata: {
        proposalCode: proposal.code,
        councilId,
        councilName: council.name,
        councilScope: 'FACULTY',
        secretaryId: council.secretary_id,
        eligibleVoters: votersInfo.totalEligible,
        excludedMembers: votersInfo.excludedMembers,
        warning: votersInfo.warning,
      },
    });

    this.logger.log(
      `Faculty council ${council.name} assigned to proposal ${proposal.code}`,
    );

    return {
      success: true,
      data: {
        proposalId: updatedProposal.id,
        proposalCode: proposal.code,
        councilId: council.id,
        councilName: council.name,
        secretaryId: council.secretary_id,
        secretaryName: council.users?.display_name,
        eligibleVoters: votersInfo.eligibleVoters,
        excludedMembers: votersInfo.excludedMembers,
        totalEligibleVoters: votersInfo.totalEligible,
        warning: votersInfo.warning,
      },
    };
  }
}