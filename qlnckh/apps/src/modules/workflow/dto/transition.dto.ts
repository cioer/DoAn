import { IsEnum, IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectState, WorkflowAction } from '@prisma/client';

/**
 * Base Transition DTO
 * Common fields for all state transition requests
 */
export class TransitionDto {
  @ApiProperty({
    description: 'ID của đề tài cần chuyển trạng thái',
    example: 'uuid-v4',
  })
  @IsUUID()
  proposalId: string;

  @ApiProperty({
    description: 'Hành động workflow',
    enum: WorkflowAction,
    example: WorkflowAction.SUBMIT,
  })
  @IsEnum(WorkflowAction)
  action: WorkflowAction;

  @ApiPropertyOptional({
    description: 'Trạng thái mục tiêu (tùy chọn - sẽ tính toán tự động từ action)',
    enum: ProjectState,
  })
  @IsOptional()
  @IsEnum(ProjectState)
  toState?: ProjectState;

  @ApiPropertyOptional({
    description: 'Idempotency key để tránh duplicate submission',
    example: 'uuid-v4',
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'Lý do (bắt buộc cho các action: RETURN, REJECT, WITHDRAW)',
    example: 'Cần bổ sung tài liệu',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Mã lý do (cho RETURN action)',
    example: 'MISSING_DOCUMENTS',
  })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional({
    description: 'Danh sách section IDs cần sửa (cho RETURN action)',
    example: ['SEC_INFO_GENERAL', 'SEC_BUDGET'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  reasonSections?: string[];

  @ApiPropertyOptional({
    description: 'ID hội đồng (cho ASSIGN_COUNCIL action)',
    example: 'council-uuid',
  })
  @IsOptional()
  @IsUUID()
  councilId?: string;

  @ApiPropertyOptional({
    description: 'ID thư ký hội đồng (cho ASSIGN_COUNCIL action)',
    example: 'secretary-uuid',
  })
  @IsOptional()
  @IsUUID()
  councilSecretaryId?: string;
}

/**
 * Submit Proposal DTO
 * Specific DTO for submitting a proposal (DRAFT → FACULTY_REVIEW)
 */
export class SubmitProposalDto {
  @ApiProperty({
    description: 'ID của đề tài cần nộp',
    example: 'uuid-v4',
  })
  @IsUUID()
  proposalId: string;

  @ApiPropertyOptional({
    description: 'Idempotency key để tránh double-submit',
    example: 'uuid-v4',
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

/**
 * Approve Faculty Review DTO
 * Specific DTO for faculty approval (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
 */
export class ApproveFacultyReviewDto {
  @ApiProperty({
    description: 'ID của đề tài cần duyệt',
    example: 'uuid-v4',
  })
  @IsUUID()
  proposalId: string;

  @ApiPropertyOptional({
    description: 'Idempotency key',
    example: 'uuid-v4',
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

/**
 * Return Faculty Review DTO
 * Specific DTO for returning proposal with changes requested
 * (FACULTY_REVIEW → CHANGES_REQUESTED)
 */
export class ReturnFacultyReviewDto {
  @ApiProperty({
    description: 'ID của đề tài cần trả về',
    example: 'uuid-v4',
  })
  @IsUUID()
  proposalId: string;

  @ApiProperty({
    description: 'Lý do trả về',
    example: 'Cần bổ sung tài liệu ngân sách',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Mã lý do',
    example: 'MISSING_DOCUMENTS',
  })
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiPropertyOptional({
    description: 'Danh sách section IDs cần sửa',
    example: ['SEC_INFO_GENERAL', 'SEC_BUDGET'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  reasonSections?: string[];

  @ApiPropertyOptional({
    description: 'Idempotency key',
    example: 'uuid-v4',
  })
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}

/**
 * Transition Response DTO
 * Response format for successful state transitions
 */
export interface TransitionResponseDto {
  success: true;
  data: {
    proposalId: string;
    previousState: ProjectState;
    currentState: ProjectState;
    action: WorkflowAction;
    holderUnit: string | null;
    holderUser: string | null;
    workflowLogId: string;
  };
}

/**
 * Transition Error Response DTO
 * Response format for failed transitions
 */
export interface TransitionErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
