import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Res,
  NotFoundException,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ImportService } from './import.service';
import { ExcelParserService } from './helpers/excel-parser.service';
import { ImportEntityType } from './dto/import-entity-type.enum';
import { AuditAction } from '../audit/audit-action.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors';
import { UserRole } from '@prisma/client';

/**
 * User object attached to request by JWT guard
 * IdempotencyInterceptor adds ip, userAgent, requestId to the request
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Multer file interface for uploaded files
 */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer: Buffer;
}

/**
 * Import Controller
 * Story 10.1: Import Excel (Users, Proposals)
 *
 * Handles import operations:
 * - Import users from Excel file
 * - Import proposals from Excel file
 * - Template download for import files
 *
 * All endpoints require ADMIN role.
 *
 * Epic 9 Retro Patterns Applied:
 * - Proper RBAC guards
 * - Idempotency interceptor for state changes
 * - Proper decorator usage (@UploadedFile for file uploads)
 * - NO as unknown/as any casting
 */
@ApiTags('import')
@Controller('admin/import')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly excelParserService: ExcelParserService,
  ) {}

  /**
   * POST /api/admin/import/users
   * Story 10.1: Import Users from Excel
   *
   * Imports users from uploaded Excel file.
   * Only ADMIN role can import users.
   *
   * AC4: User Import Validation
   * AC5: Proposal Import Validation
   * AC6: Idempotency and Atomicity
   */
  @Post('users')
  @RequireRoles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import người dùng từ Excel',
    description:
      'Import người dùng từ file Excel. Chỉ ADMIN mới có thể thực hiện. File phải đúng định dạng template.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Import thành công',
    schema: {
      example: {
        success: true,
        data: {
          entityType: 'users',
          total: 10,
          success: 8,
          failed: 2,
          errors: [
            {
              lineNumber: 3,
              row: { email: 'invalid-email', displayName: 'Test', role: 'GIANG_VIEN' },
              message: 'Email không đúng định dạng',
              field: 'email',
            },
          ],
          duration: 1500,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid file or data',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'File không hợp lệ. Vui lòng sử dụng template.',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks ADMIN role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Chỉ Admin mới có thể thực hiện thao tác này',
        },
      },
    },
  })
  async importUsers(
    @UploadedFile() file: MulterFile,
    @CurrentUser() user: RequestUser,
  ) {
    // Validate permissions
    this.importService.validateImportPermission(user.role);

    if (!file) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'Vui lòng chọn file để import.',
        },
      });
    }

    const result = await this.importService.importUsers(file, {
      userId: user.id,
      ip: user.ip,
      userAgent: user.userAgent,
      requestId: user.requestId,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /api/admin/import/proposals
   * Story 10.1: Import Proposals from Excel
   *
   * Imports proposals from uploaded Excel file.
   * Only ADMIN role can import proposals.
   *
   * AC5: Proposal Import Validation
   * AC6: Idempotency and Atomicity
   */
  @Post('proposals')
  @RequireRoles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import đề tài từ Excel',
    description:
      'Import đề tài từ file Excel. Chỉ ADMIN mới có thể thực hiện. File phải đúng định dạng template.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Import thành công',
    schema: {
      example: {
        success: true,
        data: {
          entityType: 'proposals',
          total: 5,
          success: 5,
          failed: 0,
          errors: [],
          duration: 1200,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid file or data',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'File không hợp lệ. Vui lòng sử dụng template.',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks ADMIN role',
  })
  async importProposals(
    @UploadedFile() file: MulterFile,
    @CurrentUser() user: RequestUser,
  ) {
    // Validate permissions
    this.importService.validateImportPermission(user.role);

    if (!file) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'Vui lòng chọn file để import.',
        },
      });
    }

    const result = await this.importService.importProposals(file, {
      userId: user.id,
      ip: user.ip,
      userAgent: user.userAgent,
      requestId: user.requestId,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/admin/import/template/:entity
   * Story 10.1: Template Download
   *
   * Downloads Excel template for import.
   *
   * AC1: Import Page UI - Template download button
   */
  @Get('template/:entity')
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Tải xuống template import',
    description:
      'Tải xuống file Excel template để điền dữ liệu import. Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Template file',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - invalid entity type',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks ADMIN role',
  })
  async downloadTemplate(
    @Param('entity') entityType: string,
    @Res() res: Response,
  ) {
    // Validate entity type
    if (
      entityType !== ImportEntityType.USERS &&
      entityType !== ImportEntityType.PROPOSALS
    ) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'INVALID_ENTITY_TYPE',
          message: 'Loại dữ liệu không hợp lệ. Chấp nhận: users, proposals',
        },
      });
    }

    // Generate template
    const template =
      entityType === ImportEntityType.USERS
        ? await this.excelParserService.generateUserTemplate()
        : await this.excelParserService.generateProposalTemplate();

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(template.filename)}"`,
    );
    res.setHeader('Content-Length', template.buffer.length.toString());

    // Send file
    res.send(template.buffer);
  }

  /**
   * GET /api/admin/import/status
   * Story 10.1: Import Status Check
   *
   * Returns import capabilities and status.
   */
  @Get('status')
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Kiểm tra trạng thái import',
    description: 'Trả về thông tin về khả năng import của hệ thống.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import status',
    schema: {
      example: {
        success: true,
        data: {
          supportedTypes: ['users', 'proposals'],
          maxFileSize: 10485760, // 10MB in bytes
          allowedFormats: ['.xlsx', '.xls'],
        },
      },
    },
  })
  async getImportStatus() {
    return {
      success: true,
      data: {
        supportedTypes: ['users', 'proposals'],
        maxFileSize: 10485760, // 10MB
        allowedFormats: ['.xlsx', '.xls'],
      },
    };
  }
}
