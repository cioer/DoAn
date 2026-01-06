import { IsString, IsEnum, IsOptional, IsUUID, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouncilType, CouncilMemberRole } from '@prisma/client';

/**
 * Council Member DTO (Story 5.2)
 * Represents a member of a council
 */
export class CouncilMemberDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  councilId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ description: 'User display name' })
  displayName?: string;

  @ApiProperty({ enum: CouncilMemberRole })
  role: CouncilMemberRole;

  @ApiProperty()
  createdAt: Date;
}

/**
 * Council DTO (Story 5.2)
 * Represents a council with members
 */
export class CouncilDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CouncilType })
  type: CouncilType;

  @ApiPropertyOptional()
  secretaryId?: string;

  @ApiPropertyOptional({ description: 'Secretary display name' })
  secretaryName?: string;

  @ApiProperty({ type: [CouncilMemberDto] })
  members: CouncilMemberDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/**
 * List Councils Response DTO (Story 5.2)
 */
export class ListCouncilsResponseDto {
  @ApiProperty({ type: [CouncilDto] })
  councils: CouncilDto[];

  @ApiProperty()
  total: number;
}

/**
 * Create Council DTO (Story 5.2)
 * For future "Tạo hội đồng mới" feature
 */
export class CreateCouncilDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: CouncilType })
  @IsEnum(CouncilType)
  type: CouncilType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  secretaryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  memberIds?: string[];
}

/**
 * Assign Council DTO (Story 5.2)
 * Request body for assigning a council to a proposal
 */
export class AssignCouncilDto {
  @ApiProperty()
  @IsUUID()
  councilId: string;

  @ApiProperty()
  @IsUUID()
  secretaryId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  memberIds?: string[];

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  idempotencyKey?: string;
}

/**
 * Assign Council Response DTO (Story 5.2)
 */
export interface AssignCouncilResponse {
  success: true;
  data: {
    proposalId: string;
    previousState: string;
    currentState: string;
    holderUnit: string;
    holderUser: string;
    workflowLogId: string;
  };
}

/**
 * Error Response DTO
 */
export class ErrorResponseDto {
  @ApiProperty()
  success: false;

  @ApiProperty()
  error: {
    code: string;
    message: string;
  };
}
