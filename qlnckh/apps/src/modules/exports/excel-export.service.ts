import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ProposalRowData } from './dto/export-excel.dto';

/**
 * Excel Export Service
 * Story 8.3: Export Excel (Xuất Excel theo filter)
 *
 * Handles Excel file generation using ExcelJS library.
 *
 * Critical: Follows Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - File generation OUTSIDE transactions
 * - Proper typing for all data
 */
@Injectable()
export class ExcelExportService {
  private readonly logger = new Logger(ExcelExportService.name);

  // Vietnamese headers for Excel columns
  private readonly EXCEL_HEADERS = {
    code: 'Mã hồ sơ',
    title: 'Tên đề tài',
    ownerName: 'Chủ nhiệm',
    ownerEmail: 'Email chủ nhiệm',
    state: 'Trạng thái',
    holderName: 'Người xử lý',
    facultyName: 'Khoa',
    slaDeadline: 'Thời hạn SLA',
    daysRemaining: 'Còn lại (ngày)',
    createdAt: 'Ngày tạo',
  } as const;

  // State labels in Vietnamese
  private readonly STATE_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    FACULTY_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Khoa - Đề cương',
    SCHOOL_COUNCIL_OUTLINE_REVIEW: 'Hội đồng Trường - Đề cương',
    CHANGES_REQUESTED: 'Yêu cầu sửa',
    APPROVED: 'Đã duyệt',
    IN_PROGRESS: 'Đang thực hiện',
    FACULTY_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Khoa - Nghiệm thu',
    SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: 'Hội đồng Trường - Nghiệm thu',
    HANDOVER: 'Bàn giao',
    COMPLETED: 'Hoàn thành',
    REJECTED: 'Từ chối',
    WITHDRAWN: 'Đã rút',
    CANCELLED: 'Đã hủy',
    PAUSED: 'Tạm dừng',
  };

  /**
   * Generate Excel buffer from proposal data
   * Story 8.3: AC3 - Excel Format
   *
   * @param data - Array of proposal row data
   * @param filterName - Name of the filter for filename
   * @returns ExcelExportResult with buffer and filename
   */
  async generateProposalsExcel(
    data: ProposalRowData[],
    filterName: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Hồ sơ');

    // Define columns - Proper typing, NO as unknown
    worksheet.columns = [
      { header: this.EXCEL_HEADERS.code, key: 'code', width: 15 },
      { header: this.EXCEL_HEADERS.title, key: 'title', width: 40 },
      { header: this.EXCEL_HEADERS.ownerName, key: 'ownerName', width: 25 },
      { header: this.EXCEL_HEADERS.ownerEmail, key: 'ownerEmail', width: 30 },
      { header: this.EXCEL_HEADERS.state, key: 'state', width: 20 },
      { header: this.EXCEL_HEADERS.holderName, key: 'holderName', width: 25 },
      { header: this.EXCEL_HEADERS.facultyName, key: 'facultyName', width: 20 },
      { header: this.EXCEL_HEADERS.slaDeadline, key: 'slaDeadline', width: 20 },
      { header: this.EXCEL_HEADERS.daysRemaining, key: 'daysRemaining', width: 15 },
      { header: this.EXCEL_HEADERS.createdAt, key: 'createdAt', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 25;

    // Add data rows - NO as any casting (Epic 7 retro pattern)
    for (const row of data) {
      worksheet.addRow(row);
    }

    // Auto-fit column widths slightly better
    worksheet.columns.forEach((column) => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      }
    });

    // Generate filename
    const timestamp = new Date().getTime();
    const filename = `proposals_${filterName}_${timestamp}.xlsx`;

    // Generate buffer - OUTSIDE any DB transaction (Epic 7 retro pattern)
    const buffer = await workbook.xlsx.writeBuffer();

    this.logger.log(`Generated Excel file: ${filename} with ${data.length} rows`);

    return {
      buffer: Buffer.from(buffer),
      filename,
    };
  }

  /**
   * Format date to Vietnamese locale string
   *
   * @param date - Date to format
   * @returns Formatted date string or null
   */
  formatDate(date: Date | null | undefined): string | null {
    if (!date) return null;
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Get state label in Vietnamese
   *
   * @param state - State key
   * @returns Vietnamese state label
   */
  getStateLabel(state: string): string {
    return this.STATE_LABELS[state] || state;
  }
}
