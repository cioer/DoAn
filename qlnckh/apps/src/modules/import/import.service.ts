import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { ExcelParserService } from './helpers/excel-parser.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { UserRole, ProjectState, WorkflowAction } from '@prisma/client';
import {
  ImportResult,
  ImportError,
} from './dto/import-result.dto';
import {
  UserImportRow,
  UserImportValidationResult,
} from './interfaces/user-import-row.interface';
import {
  ProposalImportRow,
  ProposalImportValidationResult,
} from './interfaces/proposal-import-row.interface';

/**
 * Context for import operations
 * Epic 9 Retro: Proper interface, NO as unknown
 */
interface ImportContext {
  userId: string;
  userDisplayName?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Helper to convert import row to Record<string, unknown> for error reporting
 * Epic 9 Retro: NO as unknown casting - proper type conversion
 */
function rowToErrorRecord(row: UserImportRow | ProposalImportRow): Record<string, unknown> {
  return {
    ...(row as Record<string, unknown>),
    _lineNumber: row._lineNumber,
  };
}

/**
 * Import Service
 * Story 10.1: Import Excel (Users, Proposals)
 *
 * Handles import operations:
 * - Import users from Excel file
 * - Import proposals from Excel file
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 * - File operations OUTSIDE transactions (file parsing before transaction)
 * - Atomic transaction for database inserts
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private prisma: PrismaService,
    private excelParserService: ExcelParserService,
    private auditService: AuditService,
  ) {}

  /**
   * Import users from Excel file
   * Story 10.1: AC4, AC5, AC6 - User Import Validation and Processing
   *
   * @param file - Uploaded Excel file buffer
   * @param context - Import context
   * @returns ImportResult with success/failed counts and errors
   */
  async importUsers(
    file: { buffer: Buffer; originalname: string },
    context: ImportContext,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    let successCount = 0;

    this.logger.log(
      `Starting user import from file: ${file.originalname}`,
    );

    // Parse Excel file OUTSIDE transaction (Epic 7 retro pattern)
    let rows: UserImportRow[];
    try {
      rows = await this.excelParserService.parseUserImportFile(file.buffer);
    } catch (error) {
      this.logger.error(`Failed to parse user import file: ${error}`);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'File không hợp lệ. Vui lòng sử dụng template.',
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        'File không có dữ liệu. Vui lòng kiểm tra lại file.',
      );
    }

    // Validate all rows first (fail-fast for critical errors)
    const validRows: UserImportRow[] = [];
    for (const row of rows) {
      const validationResult = await this.validateUserImportRow(row);
      if (!validationResult.valid) {
        errors.push({
          lineNumber: row._lineNumber || 0,
          row: rowToErrorRecord(row),
          message: validationResult.message || 'Dữ liệu không hợp lệ',
          field: validationResult.field,
        });
      } else {
        validRows.push(row);
      }
    }

    // Import valid rows in transaction (atomic)
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          // Check email uniqueness again in case of race condition
          const existing = await tx.user.findUnique({
            where: { email: row.email },
          });
          if (existing) {
            errors.push({
              lineNumber: row._lineNumber || 0,
              row: rowToErrorRecord(row),
              message: `Email đã tồn tại: ${row.email}`,
              field: 'email',
            });
            continue;
          }

          // Validate faculty exists if provided
          let facultyId = row.facultyId;
          if (row.facultyId) {
            const faculty = await tx.faculty.findUnique({
              where: { id: row.facultyId },
            });
            if (!faculty) {
              // Try to find by code
              const facultyByCode = await tx.faculty.findFirst({
                where: { code: row.facultyId },
              });
              if (facultyByCode) {
                facultyId = facultyByCode.id;
              } else {
                errors.push({
                  lineNumber: row._lineNumber || 0,
                  row: rowToErrorRecord(row),
                  message: `Khoa không tồn tại: ${row.facultyId}`,
                  field: 'facultyId',
                });
                continue;
              }
            }
          }

          // Create user - Proper typing, NO as any
          await tx.user.create({
            data: {
              email: row.email,
              displayName: row.displayName,
              role: row.role,
              facultyId: facultyId,
              passwordHash: '', // Will need to be set via password reset flow
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          successCount++;
        }
      });
    } catch (error) {
      this.logger.error(`Transaction failed during user import: ${error}`);
      throw new BadRequestException(
        'Import thất bại. Vui lòng thử lại.',
      );
    }

    const duration = Date.now() - startTime;

    // Log audit event
    await this.auditService.logEvent({
      action: AuditAction.USER_CREATE,
      actorUserId: context.userId,
      entityType: 'User',
      entityId: `import_${Date.now()}`,
      metadata: {
        importType: 'users',
        filename: file.originalname,
        totalRows: rows.length,
        successCount,
        failedCount: errors.length,
        errors: errors.slice(0, 10), // Only include first 10 errors
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(
      `User import completed: ${successCount}/${rows.length} successful, ${errors.length} failed in ${duration}ms`,
    );

    return {
      entityType: 'users',
      total: rows.length,
      success: successCount,
      failed: errors.length,
      errors,
      duration,
    };
  }

  /**
   * Import proposals from Excel file
   * Story 10.1: AC5 - Proposal Import Validation
   *
   * @param file - Uploaded Excel file buffer
   * @param context - Import context
   * @returns ImportResult with success/failed counts and errors
   */
  async importProposals(
    file: { buffer: Buffer; originalname: string },
    context: ImportContext,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    let successCount = 0;

    this.logger.log(
      `Starting proposal import from file: ${file.originalname}`,
    );

    // Parse Excel file OUTSIDE transaction (Epic 7 retro pattern)
    let rows: ProposalImportRow[];
    try {
      rows = await this.excelParserService.parseProposalImportFile(file.buffer);
    } catch (error) {
      this.logger.error(`Failed to parse proposal import file: ${error}`);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'File không hợp lệ. Vui lòng sử dụng template.',
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        'File không có dữ liệu. Vui lòng kiểm tra lại file.',
      );
    }

    // Validate all rows first
    const validRows: Array<ProposalImportRow & { ownerId: string; facultyId: string }> = [];
    for (const row of rows) {
      const validationResult = await this.validateProposalImportRow(row);
      if (!validationResult.valid) {
        errors.push({
          lineNumber: row._lineNumber || 0,
          row: rowToErrorRecord(row),
          message: validationResult.message || 'Dữ liệu không hợp lệ',
          field: validationResult.field,
        });
      } else {
        // After validation, we have resolved IDs
        const user = await this.prisma.user.findUnique({
          where: { email: row.ownerId },
        });
        const faculty = await this.prisma.faculty.findFirst({
          where: { code: row.facultyCode },
        });
        if (user && faculty) {
          validRows.push({
            ...row,
            ownerId: user.id,
            facultyId: faculty.id,
          });
        }
      }
    }

    // Import valid rows in transaction (atomic)
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          // Generate proposal code
          const proposalCount = await tx.proposal.count();
          const code = `DT-${String(proposalCount + 1).padStart(3, '0')}`;

          // Determine holder based on state (Story 10.1: AC5)
          let holderUnit: string | null = row.facultyId;
          if (row.state === ProjectState.DRAFT) {
            holderUnit = null; // No holder for draft
          } else if (
            row.state === ProjectState.FACULTY_REVIEW ||
            row.state === ProjectState.SCHOOL_SELECTION_REVIEW
          ) {
            holderUnit = row.facultyId;
          } else if (
            row.state === ProjectState.OUTLINE_COUNCIL_REVIEW ||
            row.state === ProjectState.APPROVED ||
            row.state === ProjectState.IN_PROGRESS
          ) {
            holderUnit = 'PHONG_KHCN';
          }

          // Create proposal - Proper typing, NO as any
          await tx.proposal.create({
            data: {
              code,
              title: row.title,
              state: row.state || ProjectState.DRAFT,
              ownerId: row.ownerId,
              facultyId: row.facultyId,
              holderUnit,
              slaStartDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Log workflow action
          if (row.state && row.state !== ProjectState.DRAFT) {
            await tx.workflowLog.create({
              data: {
                proposalId: code,
                action: WorkflowAction.START_PROJECT, // Use proper enum
                fromState: null,
                toState: row.state,
                actorId: context.userId,
                actorName: context.userDisplayName || context.userId,
                comment: 'Import từ Excel',
                timestamp: new Date(),
              },
            });
          }

          successCount++;
        }
      });
    } catch (error) {
      this.logger.error(`Transaction failed during proposal import: ${error}`);
      throw new BadRequestException(
        'Import thất bại. Vui lòng thử lại.',
      );
    }

    const duration = Date.now() - startTime;

    // Log audit event
    await this.auditService.logEvent({
      action: AuditAction.PROPOSAL_CREATE,
      actorUserId: context.userId,
      entityType: 'Proposal',
      entityId: `import_${Date.now()}`,
      metadata: {
        importType: 'proposals',
        filename: file.originalname,
        totalRows: rows.length,
        successCount,
        failedCount: errors.length,
        errors: errors.slice(0, 10), // Only include first 10 errors
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(
      `Proposal import completed: ${successCount}/${rows.length} successful, ${errors.length} failed in ${duration}ms`,
    );

    return {
      entityType: 'proposals',
      total: rows.length,
      success: successCount,
      failed: errors.length,
      errors,
      duration,
    };
  }

  /**
   * Validate a single user import row
   * Story 10.1: AC4 - User Import Validation
   *
   * @param row - User import row to validate
   * @returns Validation result
   */
  private async validateUserImportRow(
    row: UserImportRow,
  ): Promise<UserImportValidationResult> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!row.email || !emailRegex.test(row.email)) {
      return {
        valid: false,
        message: 'Email không đúng định dạng',
        field: 'email',
      };
    }

    // Validate email uniqueness (will be checked again in transaction)
    const existing = await this.prisma.user.findUnique({
      where: { email: row.email },
    });
    if (existing) {
      return {
        valid: false,
        message: `Email đã tồn tại: ${row.email}`,
        field: 'email',
      };
    }

    // Validate displayName presence
    if (!row.displayName || row.displayName.trim().length < 2) {
      return {
        valid: false,
        message: 'Tên hiển thị phải có ít nhất 2 ký tự',
        field: 'displayName',
      };
    }

    // Validate role is valid enum (already mapped by parser)
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(row.role)) {
      return {
        valid: false,
        message: `Vai trò không hợp lệ: ${row.role}`,
        field: 'role',
      };
    }

    // Validate faculty exists if provided (will be checked again in transaction)
    if (row.facultyId) {
      const faculty = await this.prisma.faculty.findUnique({
        where: { id: row.facultyId },
      });
      if (!faculty) {
        const facultyByCode = await this.prisma.faculty.findFirst({
          where: { code: row.facultyId },
        });
        if (!facultyByCode) {
          return {
            valid: false,
            message: `Khoa không tồn tại: ${row.facultyId}`,
            field: 'facultyId',
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validate a single proposal import row
   * Story 10.1: AC5 - Proposal Import Validation
   *
   * @param row - Proposal import row to validate
   * @returns Validation result
   */
  private async validateProposalImportRow(
    row: ProposalImportRow,
  ): Promise<ProposalImportValidationResult> {
    // Validate owner exists (ownerId is email in import)
    const owner = await this.prisma.user.findUnique({
      where: { email: row.ownerId },
    });
    if (!owner) {
      return {
        valid: false,
        message: `Chủ đề tài không tồn tại: ${row.ownerId}`,
        field: 'ownerId',
      };
    }

    // Validate title present
    if (!row.title || row.title.trim().length < 5) {
      return {
        valid: false,
        message: 'Tiêu đề đề tài phải có ít nhất 5 ký tự',
        field: 'title',
      };
    }

    // Validate faculty exists (facultyCode in import)
    const faculty = await this.prisma.faculty.findFirst({
      where: { code: row.facultyCode },
    });
    if (!faculty) {
      return {
        valid: false,
        message: `Khoa không tồn tại: ${row.facultyCode}`,
        field: 'facultyCode',
      };
    }

    // Validate state if provided
    if (row.state) {
      const validStates = Object.values(ProjectState);
      if (!validStates.includes(row.state)) {
        return {
          valid: false,
          message: `Trạng thái không hợp lệ: ${row.state}`,
          field: 'state',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate user has ADMIN role
   * @param userRole - User's role
   * @throws BadRequestException if user lacks permission
   */
  validateImportPermission(userRole: string): void {
    if (userRole !== UserRole.ADMIN) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Chỉ Admin mới có thể thực hiện thao tác này',
        },
      });
    }
  }
}
