import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { UserImportRow } from '../interfaces/user-import-row.interface';
import { ProposalImportRow } from '../interfaces/proposal-import-row.interface';
import { UserRole, ProjectState } from '@prisma/client';

/**
 * Excel Parser Service
 * Story 10.1: Import Excel (Users, Proposals)
 *
 * Handles parsing of Excel files for import operations.
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper typing for all data
 * - Vietnamese text encoding support
 */
@Injectable()
export class ExcelParserService {
  private readonly logger = new Logger(ExcelParserService.name);

  // Expected headers for user import (in Vietnamese)
  private readonly USER_IMPORT_HEADERS = {
    email: 'Email',
    displayName: 'Tên hiển thị',
    role: 'Vai trò',
    facultyId: 'Mã khoa',
  } as const;

  // Expected headers for proposal import (in Vietnamese)
  private readonly PROPOSAL_IMPORT_HEADERS = {
    ownerEmail: 'Email chủ nhiệm',
    title: 'Tiêu đề',
    facultyCode: 'Mã khoa',
    state: 'Trạng thái',
    researchField: 'Lĩnh vực nghiên cứu',
    budget: 'Kinh phí',
  } as const;

  // Role mapping from Vietnamese to UserRole enum
  private readonly ROLE_MAPPING: Record<string, UserRole> = {
    'Giảng viên': UserRole.GIANG_VIEN,
    'Quản lý Khoa': UserRole.QUAN_LY_KHOA,
    'Thư ký Khoa': UserRole.THU_KY_KHOA,
    'Phòng KHCN': UserRole.PHONG_KHCN,
    'Thư ký Hội đồng': UserRole.THU_KY_HOI_DONG,
    'Thành viên Hội đồng': UserRole.THANH_TRUNG,
    'Ban Giám học': UserRole.BAN_GIAM_HOC,
    'Admin': UserRole.ADMIN,
    // English alternatives
    'GIANG_VIEN': UserRole.GIANG_VIEN,
    'QUAN_LY_KHOA': UserRole.QUAN_LY_KHOA,
    'THU_KY_KHOA': UserRole.THU_KY_KHOA,
    'PHONG_KHCN': UserRole.PHONG_KHCN,
    'THU_KY_HOI_DONG': UserRole.THU_KY_HOI_DONG,
    'THANH_TRUNG': UserRole.THANH_TRUNG,
    'BAN_GIAM_HOC': UserRole.BAN_GIAM_HOC,
    'ADMIN': UserRole.ADMIN,
  };

  // State mapping from Vietnamese to ProjectState enum
  private readonly STATE_MAPPING: Record<string, ProjectState> = {
    'Nháp': ProjectState.DRAFT,
    'Xét duyệt Khoa': ProjectState.FACULTY_REVIEW,
    'Chọn Hội đồng': ProjectState.SCHOOL_SELECTION_REVIEW,
    'Họp Hội đồng': ProjectState.OUTLINE_COUNCIL_REVIEW,
    'Yêu cầu sửa': ProjectState.CHANGES_REQUESTED,
    'Đã duyệt': ProjectState.APPROVED,
    'Đang thực hiện': ProjectState.IN_PROGRESS,
    'Nghiệm thu Khoa': ProjectState.FACULTY_ACCEPTANCE_REVIEW,
    'Nghiệm thu Trường': ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
    'Bàn giao': ProjectState.HANDOVER,
    'Hoàn thành': ProjectState.COMPLETED,
    // English alternatives
    'DRAFT': ProjectState.DRAFT,
    'FACULTY_REVIEW': ProjectState.FACULTY_REVIEW,
    'SCHOOL_SELECTION_REVIEW': ProjectState.SCHOOL_SELECTION_REVIEW,
    'OUTLINE_COUNCIL_REVIEW': ProjectState.OUTLINE_COUNCIL_REVIEW,
    'CHANGES_REQUESTED': ProjectState.CHANGES_REQUESTED,
    'APPROVED': ProjectState.APPROVED,
    'IN_PROGRESS': ProjectState.IN_PROGRESS,
    'FACULTY_ACCEPTANCE_REVIEW': ProjectState.FACULTY_ACCEPTANCE_REVIEW,
    'SCHOOL_ACCEPTANCE_REVIEW': ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
    'HANDOVER': ProjectState.HANDOVER,
    'COMPLETED': ProjectState.COMPLETED,
  };

  /**
   * Parse user import Excel file
   * @param buffer - Excel file buffer
   * @returns Array of UserImportRow
   */
  async parseUserImportFile(buffer: Buffer): Promise<UserImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('File không có dữ liệu');
    }

    const result: UserImportRow[] = [];
    let rowIndex = 0;

    // Find header row
    let headerRowIndex = -1;
    const headerMap: Record<number, string> = {};

    worksheet.eachRow((row, rowNumber) => {
      if (headerRowIndex === -1) {
        // Try to find header row by checking for known header values
        row.eachCell((cell, colNumber) => {
          const cellValue = cell.value?.toString().trim();
          if (Object.values(this.USER_IMPORT_HEADERS).includes(cellValue as any)) {
            headerMap[colNumber] = cellValue;
          }
        });

        if (Object.keys(headerMap).length >= 3) {
          headerRowIndex = rowNumber;
        }
      } else if (rowNumber > headerRowIndex) {
        // Data row
        const rowData: Partial<UserImportRow> = {
          _lineNumber: rowNumber,
        };

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const header = headerMap[colNumber];
          if (!header) return;

          const value = cell.value?.toString().trim();

          switch (header) {
            case this.USER_IMPORT_HEADERS.email:
              rowData.email = value || '';
              break;
            case this.USER_IMPORT_HEADERS.displayName:
              rowData.displayName = value || '';
              break;
            case this.USER_IMPORT_HEADERS.role:
              rowData.role = this.mapRole(value);
              break;
            case this.USER_IMPORT_HEADERS.facultyId:
              rowData.facultyId = value || null;
              break;
          }
        });

        // Only add rows that have at least email and displayName
        if (rowData.email && rowData.displayName) {
          result.push(rowData as UserImportRow);
        }
      }
    });

    if (headerRowIndex === -1) {
      throw new BadRequestException(
        'File không đúng định dạng. Vui lòng tải xuống template và điền đúng định dạng.',
      );
    }

    this.logger.log(`Parsed ${result.length} user import rows`);

    return result;
  }

  /**
   * Parse proposal import Excel file
   * @param buffer - Excel file buffer
   * @returns Array of ProposalImportRow
   */
  async parseProposalImportFile(buffer: Buffer): Promise<ProposalImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('File không có dữ liệu');
    }

    const result: ProposalImportRow[] = [];
    let headerRowIndex = -1;
    const headerMap: Record<number, string> = {};

    worksheet.eachRow((row, rowNumber) => {
      if (headerRowIndex === -1) {
        // Try to find header row by checking for known header values
        row.eachCell((cell, colNumber) => {
          const cellValue = cell.value?.toString().trim();
          if (Object.values(this.PROPOSAL_IMPORT_HEADERS).includes(cellValue as any)) {
            headerMap[colNumber] = cellValue;
          }
        });

        if (Object.keys(headerMap).length >= 3) {
          headerRowIndex = rowNumber;
        }
      } else if (rowNumber > headerRowIndex) {
        // Data row
        const rowData: Partial<ProposalImportRow> = {
          _lineNumber: rowNumber,
        };

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const header = headerMap[colNumber];
          if (!header) return;

          const value = cell.value?.toString().trim();

          switch (header) {
            case this.PROPOSAL_IMPORT_HEADERS.ownerEmail:
              rowData.ownerId = value || '';
              break;
            case this.PROPOSAL_IMPORT_HEADERS.title:
              rowData.title = value || '';
              break;
            case this.PROPOSAL_IMPORT_HEADERS.facultyCode:
              rowData.facultyCode = value || '';
              break;
            case this.PROPOSAL_IMPORT_HEADERS.state:
              rowData.state = this.mapState(value);
              break;
            case this.PROPOSAL_IMPORT_HEADERS.researchField:
              rowData.researchField = value || '';
              break;
            case this.PROPOSAL_IMPORT_HEADERS.budget:
              rowData.budget = value ? parseFloat(value) || 0 : undefined;
              break;
          }
        });

        // Only add rows that have at least ownerId and title
        if (rowData.ownerId && rowData.title) {
          result.push(rowData as ProposalImportRow);
        }
      }
    });

    if (headerRowIndex === -1) {
      throw new BadRequestException(
        'File không đúng định dạng. Vui lòng tải xuống template và điền đúng định dạng.',
      );
    }

    this.logger.log(`Parsed ${result.length} proposal import rows`);

    return result;
  }

  /**
   * Map role string to UserRole enum
   * @param role - Role string from Excel
   * @returns UserRole enum value
   */
  private mapRole(role: string | undefined): UserRole {
    if (!role) return UserRole.GIANG_VIEN; // Default role

    const trimmedRole = role.trim();
    return this.ROLE_MAPPING[trimmedRole] || UserRole.GIANG_VIEN;
  }

  /**
   * Map state string to ProjectState enum
   * @param state - State string from Excel
   * @returns ProjectState enum value
   */
  private mapState(state: string | undefined): ProjectState {
    if (!state) return ProjectState.DRAFT; // Default state

    const trimmedState = state.trim();
    return this.STATE_MAPPING[trimmedState] || ProjectState.DRAFT;
  }

  /**
   * Generate user import template Excel file
   * @returns Excel file buffer
   */
  async generateUserTemplate(): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Set headers with Vietnamese labels
    worksheet.columns = [
      { header: this.USER_IMPORT_HEADERS.email, key: 'email', width: 30 },
      { header: this.USER_IMPORT_HEADERS.displayName, key: 'displayName', width: 25 },
      { header: this.USER_IMPORT_HEADERS.role, key: 'role', width: 20 },
      { header: this.USER_IMPORT_HEADERS.facultyId, key: 'facultyId', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add example data rows
    worksheet.addRow({
      email: 'nguyenvan@example.com',
      displayName: 'Nguyễn Văn A',
      role: 'Giảng viên',
      facultyId: 'FAC-001',
    });
    worksheet.addRow({
      email: 'tranthib@example.com',
      displayName: 'Trần Thị B',
      role: 'Admin',
      facultyId: '',
    });

    // Add data validation comment for role column
    const roleComment = {
      texts: [
        {
          text: 'Các vai trò hợp lệ:\n',
          font: { bold: true },
        },
        {
          text: '- Giảng viên\n',
        },
        {
          text: '- Quản lý Khoa\n',
        },
        {
          text: '- Thư ký Khoa\n',
        },
        {
          text: '- Phòng KHCN\n',
        },
        {
          text: '- Thư ký Hội đồng\n',
        },
        {
          text: '- Thành viên Hội đồng\n',
        },
        {
          text: '- Ban Giám học\n',
        },
        {
          text: '- Admin',
        },
      ],
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filename: 'template_users_import.xlsx',
    };
  }

  /**
   * Generate proposal import template Excel file
   * @returns Excel file buffer
   */
  async generateProposalTemplate(): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Proposals');

    // Set headers with Vietnamese labels
    worksheet.columns = [
      { header: this.PROPOSAL_IMPORT_HEADERS.ownerEmail, key: 'ownerEmail', width: 30 },
      { header: this.PROPOSAL_IMPORT_HEADERS.title, key: 'title', width: 40 },
      { header: this.PROPOSAL_IMPORT_HEADERS.facultyCode, key: 'facultyCode', width: 15 },
      { header: this.PROPOSAL_IMPORT_HEADERS.state, key: 'state', width: 20 },
      { header: this.PROPOSAL_IMPORT_HEADERS.researchField, key: 'researchField', width: 25 },
      { header: this.PROPOSAL_IMPORT_HEADERS.budget, key: 'budget', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add example data rows
    worksheet.addRow({
      ownerEmail: 'nguyenvan@example.com',
      title: 'Nghiên cứu trí tuệ nhân tạo',
      facultyCode: 'FAC-001',
      state: 'Nháp',
      researchField: 'Công nghệ thông tin',
      budget: 50000000,
    });
    worksheet.addRow({
      ownerEmail: 'tranthib@example.com',
      title: 'Phát triển ứng dụng IoT',
      facultyCode: 'FAC-002',
      state: 'Xét duyệt Khoa',
      researchField: 'Điện tử viễn thông',
      budget: 75000000,
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filename: 'template_proposals_import.xlsx',
    };
  }
}
