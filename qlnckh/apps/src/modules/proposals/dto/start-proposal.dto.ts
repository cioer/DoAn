import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Start Project DTO
 * Story 6.1: Start project execution (APPROVED → IN_PROGRESS)
 *
 * No request body needed - only idempotency key via header
 */
export class StartProjectDto {
  @ApiProperty({
    description: 'Idempotency key for duplicate request prevention',
    required: false,
  })
  @IsOptional()
  @IsUUID()
    idempotencyKey?: string;
}

/**
 * Start Project Response DTO
 * Returns the updated proposal with actualStartDate set
 */
export class StartProjectResponseDto {
  @ApiProperty({ description: 'Proposal ID' })
  id: string;

  @ApiProperty({ description: 'Proposal code' })
  code: string;

  @ApiProperty({ description: 'Proposal state (should be IN_PROGRESS)' })
  state: string;

  @ApiProperty({ description: 'Actual start date (now)' })
  actualStartDate: Date;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
