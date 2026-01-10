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
   */
  async validateAccess(
    proposalId: string,
    userId: string,
    userRole?: string,
  ): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true, ownerId: true, deletedAt: true },
    });

    if (!proposal || proposal.deletedAt) {
      throw new NotFoundException('Proposal not found');
    }

    // Owner can always access
    if (proposal.ownerId === userId) {
      return;
    }

    // Add role-based access logic here if needed
    // For now, only owner can access their own proposals

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
   */
  validateFormData(formData: Record<string, unknown>): void {
    if (!formData || typeof formData !== 'object') {
      throw new BadRequestException('Form data must be a valid object');
    }

    // Validate required sections
    if (!formData.infoGeneral || typeof formData.infoGeneral !== 'object') {
      throw new BadRequestException('infoGeneral section is required');
    }

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

    // Validate required fields in formData
    const formData = proposal.formData as Record<string, unknown> | null;
    if (!formData || !formData.infoGeneral) {
      throw new BadRequestException('Proposal must have infoGeneral section filled');
    }

    const infoGeneral = formData.infoGeneral as Record<string, unknown>;
    if (!infoGeneral.projectName || !infoGeneral.researchField) {
      throw new BadRequestException('Project name and research field are required');
    }
  }
}
