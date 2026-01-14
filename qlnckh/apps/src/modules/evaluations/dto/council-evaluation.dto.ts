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

/**
 * Aggregate Score Statistics
 */
export class AggregateScoreDto {
  @ApiProperty({ description: 'Trung bình cộng' })
  avg: number;

  @ApiProperty({ description: 'Điểm thấp nhất' })
  min: number;

  @ApiProperty({ description: 'Điểm cao nhất' })
  max: number;
}

/**
 * Aggregate Scores for all criteria
 */
export class AggregateScoresDto {
  @ApiProperty({ description: 'Nội dung khoa học', type: AggregateScoreDto })
  scientificContent: AggregateScoreDto;

  @ApiProperty({ description: 'Phương pháp nghiên cứu', type: AggregateScoreDto })
  researchMethod: AggregateScoreDto;

  @ApiProperty({ description: 'Tính khả thi', type: AggregateScoreDto })
  feasibility: AggregateScoreDto;

  @ApiProperty({ description: 'Kinh phí', type: AggregateScoreDto })
  budget: AggregateScoreDto;

  @ApiProperty({ description: 'Điểm tổng trung bình' })
  overallAvg: number;
}

/**
 * Council Member Evaluation Summary
 */
export class EvaluationSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  evaluatorId: string;

  @ApiProperty()
  evaluatorName: string;

  @ApiProperty()
  evaluatorRole: string;

  @ApiPropertyOptional({ description: 'Vai trò trong hội đồng' })
  councilRole?: string;

  @ApiPropertyOptional({ description: 'Là thư ký hội đồng' })
  isSecretary?: boolean;

  @ApiProperty({ enum: EvaluationState })
  state: EvaluationState;

  @ApiProperty({ description: 'Điểm nội dung khoa học' })
  scientificContentScore: number;

  @ApiProperty({ description: 'Điểm phương pháp' })
  researchMethodScore: number;

  @ApiProperty({ description: 'Điểm tính khả thi' })
  feasibilityScore: number;

  @ApiProperty({ description: 'Điểm kinh phí' })
  budgetScore: number;

  @ApiProperty({ description: 'Tổng điểm' })
  totalScore: number;

  @ApiPropertyOptional({ description: 'Kết luận' })
  conclusion?: string;

  @ApiPropertyOptional({ description: 'Nhận xét khác' })
  otherComments?: string;
}

/**
 * Council Evaluation Summary Data
 * For BAN_GIAM_HOC to review before approval
 */
export class CouncilEvaluationSummaryDataDto {
  @ApiProperty()
  proposalId: string;

  @ApiProperty()
  proposalCode: string;

  @ApiProperty()
  proposalTitle: string;

  @ApiProperty()
  councilName: string;

  @ApiProperty()
  secretaryName: string;

  @ApiProperty({ description: 'Số thành viên đã nộp đánh giá' })
  submittedCount: number;

  @ApiProperty({ description: 'Tổng số thành viên hội đồng' })
  totalMembers: number;

  @ApiProperty({ description: 'Tất cả đã nộp' })
  allSubmitted: boolean;

  @ApiProperty({ type: AggregateScoresDto, description: 'Điểm thống kê' })
  aggregateScores: AggregateScoresDto;

  @ApiProperty({ description: 'Kết luận cuối cùng của thư ký' })
  finalConclusion?: 'DAT' | 'KHONG_DAT' | null;

  @ApiPropertyOptional({ description: 'Nhận xét cuối cùng' })
  finalComments?: string;

  @ApiProperty({ type: [EvaluationSummaryDto], description: 'Danh sách đánh giá chi tiết' })
  evaluations: EvaluationSummaryDto[];
}

/**
 * Council Evaluation Summary Response DTO
 */
export class CouncilEvaluationSummaryResponseDto {
  @ApiProperty()
  success: true;

  @ApiProperty({ type: CouncilEvaluationSummaryDataDto })
  data: CouncilEvaluationSummaryDataDto;
}
