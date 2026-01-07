import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * Faculty Decision Enum
 * Decision options for faculty acceptance review
 */
export enum FacultyDecision {
  DAT = 'DAT',                // Đạt
  KHONG_DAT = 'KHONG_DAT',    // Không đạt
}

/**
 * Faculty Acceptance Decision DTO
 * Story 6.3: Faculty acceptance vote (FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW or IN_PROGRESS)
 */
export class FacultyAcceptanceDecisionDto {
  @ApiProperty({
    description: 'Kết luận nghiệm thu',
    enum: FacultyDecision,
  })
  @IsEnum(FacultyDecision)
  decision: FacultyDecision;

  @ApiProperty({
    description: 'Ý kiến đánh giá (required when KHONG_DAT)',
    required: false,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
