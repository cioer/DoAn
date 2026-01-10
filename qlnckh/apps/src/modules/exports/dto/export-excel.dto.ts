import { IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Export Excel Request DTO
 * Story 8.3: Export Excel (Xuất Excel theo filter)
 *
 * Used for exporting proposals to Excel with filters applied.
 * Only PHONG_KHCN and ADMIN roles can export.
 */
export class ExportExcelDto {
  @ApiPropertyOptional({
    description: 'Bộ lọc để áp dụng cho export',
    example: { state: 'FACULTY_REVIEW', facultyId: 'faculty-uuid' },
  })
  @IsOptional()
  @IsObject({ message: 'filter phải là object' })
  filter?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Nếu true, bỏ qua filter và export tất cả',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'includeAll phải là boolean' })
  includeAll?: boolean;
}

/**
 * Proposal Row Data Interface
 * Proper typing - NO as unknown (Epic 7 retro pattern)
 */
export interface ProposalRowData {
  code: string;
  title: string;
  ownerName: string;
  ownerEmail: string;
  state: string;
  holderName: string;
  slaDeadline: string | null;
  daysRemaining: number | null;
  facultyName: string;
  createdAt: string;
}

/**
 * Excel Export Result
 */
export interface ExcelExportResult {
  buffer: Buffer;
  filename: string;
  rowCount: number;
}
