import { IsString, IsEnum, IsUUID, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationState, CouncilMemberRole } from '@prisma/client';

/**
 * Council Member Evaluation Info (for multi-member evaluation)
 */
export class CouncilMemberEvaluationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  proposalId: string;

  @ApiProperty()
  evaluatorId: string;

  @ApiProperty()
  evaluatorName: string;

  @ApiProperty()
  evaluatorRole: string;

  @ApiProperty({ enum: EvaluationState })
  state: EvaluationState;

  @ApiProperty()
  formData: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ enum: CouncilMemberRole })
  councilRole?: CouncilMemberRole;

  @ApiPropertyOptional()
  isSecretary?: boolean;
}

/**
 * All Evaluations Response Data
 */
export class AllEvaluationsDataDto {
  @ApiProperty()
  proposalId: string;

  @ApiProperty()
  proposalCode: string;

  @ApiProperty()
  proposalTitle: string;

  @ApiProperty()
  councilId: string;

  @ApiProperty()
  councilName: string;

  @ApiProperty()
  secretaryId: string;

  @ApiProperty()
  secretaryName: string;

  @ApiProperty({ type: [CouncilMemberEvaluationDto] })
  evaluations: CouncilMemberEvaluationDto[];

  @ApiProperty()
  totalMembers: number;

  @ApiProperty()
  submittedCount: number;

  @ApiProperty()
  allSubmitted: boolean;
}

/**
 * Get All Evaluations Response DTO
 */
export class GetAllEvaluationsResponseDto {
  @ApiProperty()
  success: true;

  @ApiProperty({ type: AllEvaluationsDataDto })
  data: AllEvaluationsDataDto;
}

/**
 * Finalize Council Evaluation Request DTO
 */
export class FinalizeCouncilEvaluationRequestDto {
  @ApiProperty({
    description: 'Kết luận cuối cùng của hội đồng',
    enum: ['DAT', 'KHONG_DAT'],
  })
  @IsEnum(['DAT', 'KHONG_DAT'], { message: 'Kết luận phải là DAT hoặc KHONG_DAT' })
  finalConclusion: 'DAT' | 'KHONG_DAT';

  @ApiPropertyOptional({
    description: 'Nhận xét thêm của thư ký',
  })
  @IsOptional()
  @IsString()
  finalComments?: string;

  @ApiProperty({
    description: 'Idempotency key để tránh trùng lặp',
  })
  @IsUUID()
  idempotencyKey: string;
}

/**
 * Finalize Council Evaluation Response Data
 */
export class FinalizeCouncilEvaluationDataDto {
  @ApiProperty()
  proposalId: string;

  @ApiProperty()
  proposalState: string;

  @ApiProperty()
  targetState: string;

  @ApiProperty()
  finalizedAt: Date;
}

/**
 * Finalize Council Evaluation Response DTO
 */
export class FinalizeCouncilEvaluationResponseDto {
  @ApiProperty()
  success: true;

  @ApiProperty({ type: FinalizeCouncilEvaluationDataDto })
  data: FinalizeCouncilEvaluationDataDto;
}
