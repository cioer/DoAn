import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HandoverChecklistItemDto } from './handover-checklist.dto';

/**
 * Complete Handover DTO
 * Story 6.5: Complete handover and mark project as completed (HANDOVER → COMPLETED)
 */
export class CompleteHandoverDto {
  @ApiProperty({
    description: 'Handover checklist items',
    type: [HandoverChecklistItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandoverChecklistItemDto)
  checklist: HandoverChecklistItemDto[];
}

/**
 * Save Handover Checklist Draft DTO
 * Story 6.5: Auto-save handover checklist draft
 */
export class SaveHandoverChecklistDto {
  @ApiProperty({
    description: 'Handover checklist items (draft)',
    type: [HandoverChecklistItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandoverChecklistItemDto)
  checklist: HandoverChecklistItemDto[];
}
