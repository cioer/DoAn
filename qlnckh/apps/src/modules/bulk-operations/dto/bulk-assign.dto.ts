import {
  IsArray,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Bulk Assign Request DTO
 * Story 8.1: Bulk Assign (Gán holder_user hàng loạt)
 *
 * Used for assigning a user to multiple proposals at once.
 * Only PHONG_KHCN role can perform bulk assign.
 */
export class BulkAssignDto {
  @ApiProperty({
    description: 'Danh sách ID đề tài cần gán',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsArray({ message: 'proposalIds phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi proposalId phải là chuỗi' })
  @IsUUID('4', { each: true, message: 'Mỗi proposalId phải là UUID v4' })
  @IsNotEmpty({ each: true, message: 'proposalIds không được chứa chuỗi rỗng' })
  @MinLength(1, { message: 'Phải chọn ít nhất một đề tài' })
  @MaxLength(100, { message: 'Chỉ có thể gán tối đa 100 đề tài cùng lúc' })
  proposalIds: string[];

  @ApiProperty({
    description: 'ID người dùng được gán',
    example: 'user-uuid',
  })
  @IsString({ message: 'userId phải là chuỗi' })
  @IsUUID('4', { message: 'userId phải là UUID v4' })
  @IsNotEmpty({ message: 'userId không được để trống' })
  userId: string;
}

/**
 * Bulk Assign Error Detail
 * Information about a single proposal that failed to assign
 */
export interface BulkAssignError {
  proposalId: string;
  proposalCode: string;
  reason: string;
}

/**
 * Bulk Assign Result DTO
 * Response format for bulk assign operation
 */
export interface BulkAssignResultDto {
  success: true;
  data: {
    success: number;
    failed: number;
    total: number;
    errors: BulkAssignError[];
  };
}

/**
 * Bulk Assign Error Response DTO
 * Response format for failed bulk assign operation (validation errors)
 */
export interface BulkAssignErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
