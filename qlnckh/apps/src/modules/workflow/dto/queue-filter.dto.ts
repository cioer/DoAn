import { IsEnum, IsOptional, IsInt, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Queue Filter Types
 * Story 3.5: Queue filter types for worklist/queue page
 */
export enum QueueFilterType {
  MY_QUEUE = 'my-queue', // "Đang chờ tôi"
  MY_PROPOSALS = 'my-proposals', // "Của tôi"
  ALL = 'all', // "Tất cả"
  OVERDUE = 'overdue', // "Quá hạn"
  UPCOMING = 'upcoming', // "Sắp đến hạn (T-2)"
}

/**
 * Queue Filter Query DTO
 * Query parameters for GET /workflow/queue endpoint
 */
export class QueueFilterDto {
  @ApiProperty({
    description: 'Loại bộ lọc queue',
    enum: QueueFilterType,
    example: QueueFilterType.MY_QUEUE,
  })
  @IsEnum(QueueFilterType)
  filter: QueueFilterType;

  @ApiPropertyOptional({
    description: 'Số trang (mặc định: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({
    description: 'Số item mỗi trang (mặc định: 20)',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tiêu đề hoặc mã đề tài',
    example: 'Nghiên cứu AI',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Proposal Queue Item DTO
 * Simplified proposal data for queue display
 */
export class ProposalQueueItemDto {
  @ApiProperty({
    description: 'ID của đề tài',
    example: 'proposal-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Mã đề tài',
    example: 'DT-2024-001',
  })
  code: string;

  @ApiProperty({
    description: 'Tiêu đề đề tài',
    example: 'Nghiên cứu ứng dụng AI trong giáo dục',
  })
  title: string;

  @ApiProperty({
    description: 'Trạng thái hiện tại',
    enum: ['DRAFT', 'FACULTY_COUNCIL_OUTLINE_REVIEW', 'SCHOOL_COUNCIL_OUTLINE_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'IN_PROGRESS'],
    example: 'FACULTY_COUNCIL_OUTLINE_REVIEW',
  })
  state: string;

  @ApiProperty({
    description: 'Người nắm giữ (holder)',
    example: 'Khoa CNTT',
    nullable: true,
  })
  holderUnit: string | null;

  @ApiProperty({
    description: 'SLA deadline',
    example: '2026-01-10T17:00:00.000Z',
    nullable: true,
  })
  slaDeadline: Date | null;

  @ApiProperty({
    description: 'SLA start date',
    example: '2026-01-06T10:00:00.000Z',
    nullable: true,
  })
  slaStartDate: Date | null;

  @ApiProperty({
    description: 'Ngày tạo',
    example: '2026-01-01T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'ID của chủ nhiệm đề tài',
    example: 'user-uuid',
  })
  ownerId: string;
}

/**
 * Queue Response DTO
 * Response format for GET /workflow/queue
 */
export interface QueueResponseDto {
  success: true;
  data: ProposalQueueItemDto[];
  meta: {
    filter: QueueFilterType;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Queue Error Response DTO
 */
export interface QueueErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
