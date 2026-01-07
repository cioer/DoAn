import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * School Decision Enum
 * Decision options for school acceptance review
 */
export enum SchoolDecision {
  DAT = 'DAT',                // Đạt
  KHONG_DAT = 'KHONG_DAT',    // Không đạt
}

/**
 * School Acceptance Decision DTO
 * Story 6.4: School acceptance vote (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER or IN_PROGRESS)
 */
export class SchoolAcceptanceDecisionDto {
  @ApiProperty({
    description: 'Kết luận nghiệm thu cấp Trường',
    enum: SchoolDecision,
  })
  @IsEnum(SchoolDecision)
  decision: SchoolDecision;

  @ApiProperty({
    description: 'Ý kiến đánh giá (required when KHONG_DAT)',
    required: false,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
