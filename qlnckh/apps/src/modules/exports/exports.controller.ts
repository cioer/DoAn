import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { FullExportResult } from './helpers/full-dump-export.service';
import {
  ExportExcelDto,
  ExcelExportResult,
} from './dto/export-excel.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { UserRole } from '@prisma/client';

/**
 * User object attached to request by JWT guard
 */
interface RequestUser {
  id: string;
  email: string;
  role: string;
  facultyId: string | null;
}

/**
 * Exports Controller
 * Story 8.3: Export Excel (Xuất Excel theo filter)
 *
 * Handles export operations:
 * - Export proposals to Excel with filters
 *
 * All endpoints require PHONG_KHCN or ADMIN role.
 */
@ApiTags('exports')
@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  /**
   * POST /api/exports/excel
   * Story 8.3: Export Excel (Xuất Excel theo filter)
   *
   * Exports proposals to Excel file with applied filters.
   * Only PHONG_KHCN and ADMIN roles can export.
   *
   * AC2: Generate Excel with current filter
   * AC3: Excel format with styling
   * AC4: Trigger download
   */
  @Post('excel')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.PHONG_KHCN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Xuất danh sách hồ sơ ra Excel',
    description:
      'Xuất danh sách hồ sơ ra file Excel theo bộ lọc. Chỉ PHONG_KHCN và ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated',
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
    status: 400,
    description: 'Bad Request - invalid input',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_FILTER',
          message: 'Bộ lọc không hợp lệ',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user lacks required role',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      },
    },
  })
  async exportExcel(
    @Body() dto: ExportExcelDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
    @Body('ip') ip?: string,
    @Body('userAgent') userAgent?: string,
    @Body('requestId') requestId?: string,
  ): Promise<void> {
    // Validate permissions
    this.exportsService.validateExportPermission(user.role);

    // Execute export
    const result: ExcelExportResult = await this.exportsService.exportProposalsExcel(
      dto,
      {
        userId: user.id,
        userRole: user.role,
        ip,
        userAgent,
        requestId,
      },
    );

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename)}"`,
    );
    res.setHeader('Content-Length', result.buffer.length.toString());

    // Send file
    res.send(result.buffer);
  }

  /**
   * POST /api/exports/full-dump
   * Story 10.2: Export Excel (Full Dump)
   *
   * Exports all system data to a multi-sheet Excel file.
   * Only ADMIN role can perform full dump export.
   *
   * AC1: Full Dump Endpoint
   * AC2: Multi-Sheet Excel Structure (Users, Proposals, Workflow Logs, Evaluations)
   * AC4: Exception State Handling
   * AC5: Vietnamese Headers
   */
  @Post('full-dump')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Xuất toàn bộ dữ liệu hệ thống',
    description:
      'Xuất toàn bộ dữ liệu ra file Excel với nhiều sheet. Chỉ ADMIN mới có thể thực hiện.',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated',
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
    status: 403,
    description: 'Forbidden - user lacks ADMIN role',
  })
  async exportFullDump(
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
    @Body('ip') ip?: string,
    @Body('userAgent') userAgent?: string,
    @Body('requestId') requestId?: string,
  ): Promise<void> {
    // Validate permissions
    this.exportsService.validateExportPermission(user.role);

    // Execute export
    const result: FullExportResult = await this.exportsService.exportFullDump({
      userId: user.id,
      userRole: user.role,
      ip,
      userAgent,
      requestId,
    });

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename)}"`,
    );
    res.setHeader('Content-Length', result.buffer.length.toString());

    // Send file
    res.send(result.buffer);
  }
}
