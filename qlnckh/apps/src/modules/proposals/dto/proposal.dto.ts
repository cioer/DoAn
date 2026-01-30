import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ProjectState, UserRole } from '@prisma/client';

/**
 * Base Proposal DTO
 * Contains common proposal fields
 */
export class ProposalDto {
  @ApiProperty({ description: 'Proposal ID' })
  id: string;

  @ApiProperty({ description: 'Proposal code (e.g., DT-001)' })
  code: string;

  @ApiProperty({ description: 'Proposal title' })
  title: string;

  @ApiProperty({ description: 'Proposal state', enum: ProjectState })
  state: ProjectState;

  @ApiProperty({ description: 'Owner user ID' })
  ownerId: string;

  @ApiProperty({ description: 'Faculty ID' })
  facultyId: string;

  @ApiProperty({ description: 'Holder unit (faculty or special unit)', required: false })
  holderUnit: string | null;

  @ApiProperty({ description: 'Holder user ID (specific user)', required: false })
  holderUser: string | null;

  @ApiProperty({ description: 'SLA start date', required: false })
  slaStartDate: Date | null;

  @ApiProperty({ description: 'SLA deadline', required: false })
  slaDeadline: Date | null;

  @ApiProperty({ description: 'Actual start date (Story 6.1)', required: false })
  actualStartDate: Date | null;

  @ApiProperty({ description: 'Completed date (Story 6.5)', required: false })
  completedDate: Date | null;

  @ApiProperty({ description: 'Form template ID', required: false })
  templateId: string | null;

  @ApiProperty({ description: 'Template version', required: false })
  templateVersion: string | null;

  @ApiProperty({ description: 'Form data (JSON)', required: false })
  formData: Record<string, unknown> | null;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Soft delete timestamp', required: false })
  deletedAt: Date | null;
}

/**
 * Proposal with Template Details DTO
 * Extends ProposalDto with template information
 */
export class ProposalWithTemplateDto extends ProposalDto {
  @ApiProperty({ description: 'Form template details', required: false })
  template?: {
    id: string;
    code: string;
    name: string;
    version: string;
  } | null;

  @ApiProperty({ description: 'Owner user details', required: false })
  owner?: {
    id: string;
    email: string;
    displayName: string;
    role?: UserRole;
  } | null;

  @ApiProperty({ description: 'Faculty details', required: false })
  faculty?: {
    id: string;
    code: string;
    name: string;
  } | null;

  @ApiProperty({ description: 'Holder user details (person assigned to process)', required: false })
  holderUserInfo?: {
    id: string;
    displayName: string;
    email: string;
    role: string;
  } | null;

  @ApiProperty({ description: 'Whether current user is a member of the assigned council', required: false })
  isUserCouncilMember?: boolean;

  @ApiProperty({ description: 'Whether current user is the secretary of the assigned council', required: false })
  isUserCouncilSecretary?: boolean;
}

/**
 * Create Proposal DTO
 * Used for creating a new proposal draft
 */
export class CreateProposalDto {
  @ApiProperty({ description: 'Proposal title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Faculty ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  facultyId: string;

  @ApiProperty({ description: 'Form template ID (e.g., MAU_01B or UUID)' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: 'Initial form data (optional)',
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}

/**
 * Update Proposal DTO
 * Used for updating an existing proposal draft
 */
export class UpdateProposalDto {
  @ApiProperty({ description: 'Proposal title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Form data (partial update)',
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}

/**
 * Auto Save Proposal DTO
 * Used for auto-saving partial form data (Story 2.3)
 */
export class AutoSaveProposalDto {
  @ApiProperty({
    description: 'Partial form data to auto-save',
    type: Object,
  })
  @IsObject()
  formData: Record<string, unknown>;

  @ApiProperty({
    description: 'Expected version for optimistic locking',
    required: false,
  })
  @IsOptional()
  expectedUpdatedAt?: Date;
}

/**
 * Proposal List Query DTO
 * Used for filtering and pagination
 */
export class ProposalQueryDto {
  @ApiProperty({ description: 'Filter by owner ID', required: false })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({ description: 'Filter by state', required: false, enum: ProjectState })
  @IsOptional()
  @IsString()
  state?: ProjectState;

  @ApiProperty({ description: 'Filter by faculty ID', required: false })
  @IsOptional()
  @IsString()
  facultyId?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @IsString()
  limit?: string;
}

/**
 * Pagination Meta DTO
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated Proposals Response
 */
export interface PaginatedProposalsDto {
  data: ProposalWithTemplateDto[];
  meta: PaginationMeta;
}
