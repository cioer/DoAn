import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

/**
 * Handover Checklist Item DTO
 * Represents a single item in the handover checklist
 */
export class HandoverChecklistItemDto {
  @ApiProperty({ description: 'Item identifier' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Item completion status' })
  @IsBoolean()
  checked: boolean;

  @ApiProperty({
    description: 'Optional note for item',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Predefined checklist items for handover
 */
export const HANDOVER_CHECKLIST_ITEMS = [
  { id: 'bao_cao_ket_qua', label: 'Báo cáo kết quả', required: true },
  { id: 'san_pham_dau_ra', label: 'Sản phẩm đầu ra', required: true },
  { id: 'tai_lieu_huong_dan', label: 'Tài liệu hướng dẫn', required: false },
  { id: 'source_code', label: 'File source code', required: false },
  { id: 'tai_lieu_khac', label: 'Các tài liệu khác', required: false },
] as const;

export type HandoverChecklistItemId =
  | 'bao_cao_ket_qua'
  | 'san_pham_dau_ra'
  | 'tai_lieu_huong_dan'
  | 'source_code'
  | 'tai_lieu_khac';
