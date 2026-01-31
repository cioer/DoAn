import { IsString, IsEnum, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationState, EvaluationLevel } from '@prisma/client';

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
  @IsOptional()
  formData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsEnum(EvaluationState, { message: 'State must be one of: DRAFT, FINALIZED' })
  @IsOptional()
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

  @ApiProperty({ enum: EvaluationLevel, description: 'Evaluation level (FACULTY or SCHOOL)' })
  level: EvaluationLevel;

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

/**
 * Evaluator Info DTO (GIANG_VIEN Feature)
 */
export class EvaluatorInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;
}

/**
 * Evaluation Results DTO (GIANG_VIEN Feature)
 * Extended evaluation DTO with evaluator information
 */
export class EvaluationResultsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  proposalId: string;

  @ApiProperty()
  evaluatorId: string;

  @ApiProperty({ enum: EvaluationLevel, description: 'Evaluation level (FACULTY or SCHOOL)' })
  level: EvaluationLevel;

  @ApiProperty({ enum: EvaluationState })
  state: EvaluationState;

  @ApiProperty()
  formData: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: EvaluatorInfoDto })
  evaluator?: EvaluatorInfoDto;
}

/**
 * Brief evaluation summary for multi-evaluation response
 */
export class EvaluationSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: EvaluationLevel })
  level: EvaluationLevel;

  @ApiProperty({ enum: EvaluationState })
  state: EvaluationState;

  @ApiProperty()
  formData: Record<string, unknown>;

  @ApiPropertyOptional()
  evaluator?: {
    displayName: string;
    role: string;
  };
}

/**
 * Get Evaluation Results Response DTO (GIANG_VIEN Feature)
 */
export class GetEvaluationResultsResponse {
  @ApiProperty()
  success: true;

  @ApiProperty()
  data: EvaluationResultsDto;

  @ApiPropertyOptional({ type: [EvaluationSummaryDto], description: 'All evaluations for the proposal' })
  allEvaluations?: EvaluationSummaryDto[];
}
