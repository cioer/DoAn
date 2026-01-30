import { ApiProperty } from '@nestjs/swagger';
import { WorkflowAction, ProjectState } from '@prisma/client';

/**
 * Workflow Log DTO
 * Represents a single workflow log entry for timeline display
 */
export class WorkflowLogDto {
  @ApiProperty({
    description: 'ID của workflow log entry',
    example: 'uuid-v4',
  })
  id: string;

  @ApiProperty({
    description: 'ID của đề tài',
    example: 'proposal-uuid',
  })
  proposalId: string;

  @ApiProperty({
    description: 'Hành động workflow',
    enum: WorkflowAction,
    example: WorkflowAction.SUBMIT,
  })
  action: WorkflowAction;

  @ApiProperty({
    description: 'Trạng thái trước khi chuyển',
    enum: ProjectState,
    required: false,
    nullable: true,
    example: ProjectState.DRAFT,
  })
  fromState: ProjectState | null;

  @ApiProperty({
    description: 'Trạng thái sau khi chuyển',
    enum: ProjectState,
    example: ProjectState.FACULTY_COUNCIL_OUTLINE_REVIEW,
  })
  toState: ProjectState;

  @ApiProperty({
    description: 'ID của người thực hiện hành động',
    example: 'user-uuid',
  })
  actorId: string;

  @ApiProperty({
    description: 'Tên hiển thị của người thực hiện hành động',
    example: 'Nguyễn Văn A',
  })
  actorName: string;

  @ApiProperty({
    description: 'Trạng thái mục tiêu để trả về sau resubmit (cho RETURN action)',
    enum: ProjectState,
    required: false,
    nullable: true,
  })
  returnTargetState: ProjectState | null;

  @ApiProperty({
    description: 'Holder unit mục tiêu để trả về sau resubmit (cho RETURN action)',
    required: false,
    nullable: true,
    example: 'KHOA.CNTT',
  })
  returnTargetHolderUnit: string | null;

  @ApiProperty({
    description: 'Mã lý do trả về (cho RETURN action)',
    required: false,
    nullable: true,
    example: 'MISSING_DOCUMENTS',
  })
  reasonCode: string | null;

  @ApiProperty({
    description: 'Nội dung bình luận/ghi chú',
    required: false,
    nullable: true,
    example: 'Cần bổ sung tài liệu',
  })
  comment: string | null;

  @ApiProperty({
    description: 'Thời gian thực hiện hành động',
    example: '2026-01-06T10:00:00.000Z',
  })
  timestamp: Date;
}

/**
 * Workflow Logs Response DTO
 * Response format for GET /workflow-logs/:proposalId
 */
export interface WorkflowLogsResponseDto {
  success: true;
  data: WorkflowLogDto[];
  meta: {
    proposalId: string;
    total: number;
  };
}

/**
 * Workflow Logs Error Response DTO
 */
export interface WorkflowLogsErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
