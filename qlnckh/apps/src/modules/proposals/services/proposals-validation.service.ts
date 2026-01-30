import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../auth/prisma.service';
import { ProjectState, SectionId } from '@prisma/client';
import { CreateProposalDto, UpdateProposalDto } from '../dto';

/**
 * Proposals Validation Service
 *
 * Handles all validation logic for proposals.
 * Focus: Read-only validation, no database mutations.
 */
@Injectable()
export class ProposalsValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate user can access proposal
   *
   * Access rules:
   * - Owner: Full access (view + edit)
   * - Same faculty users: Read-only access (for viewing/reviewing)
   * - ADMIN/PHONG_KHCN/BAN_GIAM_HOC/BGH: Read-only access to all proposals
   */
  async validateAccess(
    proposalId: string,
    userId: string,
    userRole?: string,
    userFacultyId?: string | null,
  ): Promise<void> {
    const [proposal, user] = await Promise.all([
      this.prisma.proposal.findUnique({
        where: { id: proposalId },
        select: { id: true, ownerId: true, facultyId: true, deletedAt: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, facultyId: true, role: true },
      }),
    ]);

    if (!proposal || proposal.deletedAt) {
      throw new NotFoundException('Proposal not found');
    }

    // Owner can always access
    if (proposal.ownerId === userId) {
      return;
    }

    // Users in the same faculty can access (for review/management)
    const facultyId = userFacultyId || user?.facultyId;
    if (facultyId && proposal.facultyId === facultyId) {
      return;
    }

    // ADMIN, PHONG_KHCN, BAN_GIAM_HOC, GIANG_VIEN (council members) can access all proposals
    if (
      user?.role === 'ADMIN' ||
      user?.role === 'PHONG_KHCN' ||
      user?.role === 'BAN_GIAM_HOC' ||
      user?.role === 'GIANG_VIEN'
    ) {
      return;
    }

    throw new ForbiddenException('You do not have permission to access this proposal');
  }

  /**
   * Validate proposal is editable (only DRAFT state can be edited)
   */
  async validateEditable(proposalId: string): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.state !== ProjectState.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT proposals can be edited. Current state: ${proposal.state}`,
      );
    }
  }

  /**
   * Validate proposal ownership
   */
  async validateOwnership(proposalId: string, userId: string): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { ownerId: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.ownerId !== userId) {
      throw new ForbiddenException('Only the proposal owner can perform this action');
    }
  }

  /**
   * Validate template version exists
   */
  async validateTemplateVersion(
    templateIdOrCode: string,
  ): Promise<{ id: string; version: string } | null> {
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
   * Validate form data structure
   *
   * Note: Frontend uses section IDs (e.g., SEC_INFO_GENERAL) as keys,
   * not camelCase names (e.g., infoGeneral). This validation is kept minimal
   * to allow flexibility in form data structure.
   */
  validateFormData(formData: Record<string, unknown>): void {
    if (!formData || typeof formData !== 'object') {
      throw new BadRequestException('Form data must be a valid object');
    }

    // Form data structure is flexible - frontend uses section IDs as keys
    // Specific field validation is done at template level
    // Add more validation as needed based on your schema
  }

  /**
   * Validate attachments
   */
  validateAttachments(attachments: unknown[]): void {
    if (!Array.isArray(attachments)) {
      throw new BadRequestException('Attachments must be an array');
    }

    for (const attachment of attachments) {
      if (!attachment || typeof attachment !== 'object') {
        throw new BadRequestException('Each attachment must be a valid object');
      }

      // Validate attachment structure
      const att = attachment as Record<string, unknown>;
      if (!att.id || !att.fileName) {
        throw new BadRequestException('Attachment must have id and fileName');
      }
    }
  }

  /**
   * Validate state transition
   */
  async validateStateTransition(
    proposalId: string,
    fromState: ProjectState,
    toState: ProjectState,
  ): Promise<void> {
    // Add state machine validation logic here
    // For now, allow all transitions
    // In production, you'd integrate with WorkflowValidatorService

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.state !== fromState) {
      throw new BadRequestException(
        `Invalid state transition. Expected: ${fromState}, Actual: ${proposal.state}`,
      );
    }
  }

  /**
   * Validate proposal is in expected state
   */
  async validateExpectedState(
    proposalId: string,
    expectedStates: ProjectState[],
  ): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { state: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (!expectedStates.includes(proposal.state)) {
      throw new BadRequestException(
        `Proposal must be in one of these states: ${expectedStates.join(', ')}. Current: ${proposal.state}`,
      );
    }
  }

  /**
   * Validate faculty access
   */
  async validateFacultyAccess(
    proposalId: string,
    facultyId: string,
  ): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { facultyId: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.facultyId !== facultyId) {
      throw new ForbiddenException('Proposal does not belong to your faculty');
    }
  }

  /**
   * Validate proposal is not deleted
   */
  async validateNotDeleted(proposalId: string): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { deletedAt: true },
    });

    if (!proposal || proposal.deletedAt) {
      throw new NotFoundException('Proposal not found or has been deleted');
    }
  }

  /**
   * Validate create proposal data
   */
  async validateCreateData(
    data: CreateProposalDto,
    userId: string,
  ): Promise<void> {
    // Validate template
    const template = await this.validateTemplateVersion(data.templateId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Validate form data
    if (data.formData) {
      this.validateFormData(data.formData);
    }

    // Validate faculty exists
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: data.facultyId },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }
  }

  /**
   * Validate update proposal data
   */
  validateUpdateData(data: UpdateProposalDto): void {
    if (data.formData) {
      this.validateFormData(data.formData);
    }
  }

  /**
   * Check if proposal can be submitted
   */
  async validateCanBeSubmitted(proposalId: string): Promise<void> {
    await this.validateNotDeleted(proposalId);
    await this.validateEditable(proposalId);

    // Add more validation:
    // - Required fields populated
    // - Required sections filled
    // - Minimum attachments
    // etc.

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { formData: true, attachments: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Validate that form data exists and has some content
    const formData = proposal.formData as Record<string, unknown> | null;
    if (!formData || Object.keys(formData).length === 0) {
      throw new BadRequestException('Proposal must have form data filled');
    }

    // Check for at least one required section with content
    // Note: Frontend uses section IDs (e.g., SEC_INFO_GENERAL) as keys
    const hasContent = Object.values(formData).some(
      value => value && typeof value === 'string' && value.trim().length > 0
    );

    if (!hasContent) {
      throw new BadRequestException('Proposal must have at least one section filled');
    }
  }
}
