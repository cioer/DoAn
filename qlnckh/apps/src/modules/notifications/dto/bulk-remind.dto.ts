import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowAction, ProjectState } from '@prisma/client';

/**
 * Proposal Reminder Info
 * Information about a proposal for reminder email
 * Proper typing - NO as unknown (Epic 7 retro pattern)
 */
export interface ProposalReminderInfo {
  id: string;
  code: string;
  title: string;
  slaStatus: 'ok' | 'warning' | 'overdue';
  slaDeadline?: Date;
  daysRemaining?: number;
  overdueDays?: number;
}

/**
 * Recipient Group
 * Grouped recipient with their proposals
 * Proper typing - NO as unknown (Epic 7 retro pattern)
 */
export interface RecipientGroup {
  userId: string;
  userName: string;
  userEmail: string;
  proposals: ProposalReminderInfo[];
}

/**
 * Bulk Remind Request DTO
 * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
 */
export class BulkRemindDto {
  @ApiProperty({
    description: 'Danh sách ID đề tài cần gửi nhắc',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsArray({ message: 'proposalIds phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi proposalId phải là chuỗi' })
  @IsUUID('4', { each: true, message: 'Mỗi proposalId phải là UUID v4' })
  @IsNotEmpty({ each: true, message: 'proposalIds không được chứa chuỗi rỗng' })
  @MinLength(1, { message: 'Phải chọn ít nhất một hồ sơ' })
  @MaxLength(100, { message: 'Chỉ có thể gửi tối đa 100 hồ sơ cùng lúc' })
  proposalIds: string[];

  @ApiPropertyOptional({
    description: 'Chỉ validate, không gửi email thực sự',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'dryRun phải là boolean' })
  dryRun?: boolean;
}

/**
 * Remind Recipient Result
 * Result of sending reminder to a single recipient
 */
export interface RemindRecipientResult {
  userId: string;
  userName: string;
  emailSent: boolean;
  error?: string;
}

/**
 * Bulk Remind Result DTO
 * Response format for bulk remind operation
 */
export interface BulkRemindResultDto {
  success: true;
  data: {
    success: number;
    failed: number;
    total: number;
    recipients: RemindRecipientResult[];
    dryRun?: boolean;
  };
}

/**
 * Bulk Remind Error Response DTO
 */
export interface BulkRemindErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
