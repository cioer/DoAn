import { IsString, IsEnum, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationState } from '@prisma/client';

/**
 * Evaluation Form Data Structure (Story 5.3)
 */
export class EvaluationFormDataDto {
  @ApiProperty()
  scientificContent: {
    score: number;
    comments: string;
  };

  @ApiProperty()
  researchMethod: {
    score: number;
    comments: string;
  };

  @ApiProperty()
  feasibility: {
    score: number;
    comments: string;
  };

  @ApiProperty()
  budget: {
    score: number;
    comments: string;
  };

  @ApiProperty({ enum: ['DAT', 'KHONG_DAT'] })
  conclusion: 'DAT' | 'KHONG_DAT';

  @ApiPropertyOptional()
  otherComments?: string;
}

/**
 * Create Evaluation DTO (Story 5.3)
 */
export class CreateEvaluationDto {
  @ApiProperty()
  @IsUUID()
  proposalId: string;

  @ApiPropertyOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}

/**
 * Update Evaluation DTO (Story 5.3)
 */
export class UpdateEvaluationDto {
  @ApiPropertyOptional()
  @IsObject()
  formData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsEnum(EvaluationState)
  state?: EvaluationState;
}

/**
 * Evaluation Response DTO (Story 5.3)
 */
export class EvaluationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  proposalId: string;

  @ApiProperty()
  evaluatorId: string;

  @ApiProperty({ enum: EvaluationState })
  state: EvaluationState;

  @ApiProperty()
  formData: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/**
 * Get or Create Evaluation Response DTO (Story 5.3)
 */
export class GetOrCreateEvaluationResponse {
  @ApiProperty()
  success: true;

  @ApiProperty()
  data: EvaluationDto;
}

/**
 * Update Evaluation Response DTO (Story 5.3)
 */
export class UpdateEvaluationResponse {
  @ApiProperty()
  success: true;

  @ApiProperty()
  data: EvaluationDto;
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
