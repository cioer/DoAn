import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { WorkflowAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { ExcelExportService } from './excel-export.service';
import { FullDumpExportService, FullExportResult } from './helpers/full-dump-export.service';
import { ExportExcelDto, ProposalRowData, ExcelExportResult } from './dto/export-excel.dto';
import { SlaService } from '../calendar/sla.service';
import { ProjectState, Prisma } from '@prisma/client';

/**
 * Context for export operations
 */
interface ExportContext {
  userId: string;
  userRole: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Exports Service
 * Story 8.3: Export Excel (Xuất Excel theo filter)
 * Story 10.2: Export Excel (Full Dump)
 *
 * Handles export operations for proposals:
 * - Export proposals to Excel with filters
 * - Export full database dump with all entities
 *
 * Critical: Follows Epic 7 retro patterns:
 * - NO as unknown casting
 * - NO as any casting
 * - File operations OUTSIDE transactions
 * - Proper DTO mapping
 */
@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private excelExportService: ExcelExportService,
    private fullDumpExportService: FullDumpExportService,
    private slaService: SlaService,
  ) {}

  /**
   * Build Prisma where clause from filter object
   * Proper typing - NO as any (Epic 7 retro pattern)
   *
   * @param filter - Filter object from request
   * @returns Prisma.WhereInput for proposals
   */
  private async buildFilter(filter?: Record<string, unknown>): Promise<Prisma.ProposalWhereInput> {
    const whereClause: Prisma.ProposalWhereInput = {
      deletedAt: null, // Exclude soft-deleted proposals
    };

    if (!filter) {
      return whereClause;
    }

    // Apply state filter
    if (filter.state && typeof filter.state === 'string') {
      whereClause.state = filter.state as ProjectState;
    }

    // Apply faculty filter
    if (filter.facultyId && typeof filter.facultyId === 'string') {
      whereClause.facultyId = filter.facultyId;
    }

    // Apply holder_user filter
    if (filter.holderUser && typeof filter.holderUser === 'string') {
      whereClause.holderUser = filter.holderUser;
    }

    // Apply overdue filter
    if (filter.overdue === true) {
      const now = new Date();
      whereClause.slaDeadline = { lt: now };
    }

    // Apply upcoming filter (within 2 days)
    if (filter.upcoming === true) {
      const now = new Date();
      const endDate = await this.slaService.addBusinessDays(now, 2);
      whereClause.slaDeadline = {
        gt: now,
        lte: endDate,
      };
    }

    return whereClause;
  }

  /**
   * Export proposals to Excel
   * Story 8.3: AC2 - Excel Generation with Current Filter
   *
   * @param dto - Export Excel DTO with filter
   * @param context - Export context
   * @returns ExcelExportResult with buffer and filename
   */
  async exportProposalsExcel(
    dto: ExportExcelDto,
    context: ExportContext,
  ): Promise<ExcelExportResult> {
    // Build filter
    const whereClause = dto.includeAll
      ? { deletedAt: null }
      : await this.buildFilter(dto.filter);

    // Query data - NO DB transaction needed for read operation
    const proposals = await this.prisma.proposal.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { displayName: true, email: true },
        },
        faculty: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get holder users for all proposals
    const holderUserIds = proposals
      .map((p) => p.holderUser)
      .filter((id): id is string => id !== null);

    const holders = holderUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: holderUserIds } },
          select: { id: true, displayName: true },
        })
      : [];

    const holderMap = new Map(holders.map((h) => [h.id, h]));

    // Transform to row data - Proper typing, NO as unknown (Epic 7 retro pattern)
    const rowData: ProposalRowData[] = proposals.map((p) => {
      // Calculate days remaining
      const daysRemaining = p.slaDeadline
        ? Math.ceil((new Date(p.slaDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const holder = p.holderUser ? holderMap.get(p.holderUser) : null;

      return {
        code: p.code,
        title: p.title,
        ownerName: p.owner?.displayName || 'N/A',
        ownerEmail: p.owner?.email || 'N/A',
        state: this.excelExportService.getStateLabel(p.state),
        holderName: holder?.displayName || 'Chưa gán',
        facultyName: p.faculty?.name || 'N/A',
        slaDeadline: this.excelExportService.formatDate(p.slaDeadline),
        daysRemaining,
        createdAt: this.excelExportService.formatDate(p.createdAt) || '',
      };
    });

    // Generate filter name for filename
    const filterName = this.getFilterName(dto.filter, dto.includeAll);

    // Generate Excel - File generation OUTSIDE transaction (Epic 7 retro pattern)
    const { buffer, filename } = await this.excelExportService.generateProposalsExcel(
      rowData,
      filterName,
    );

    // Log audit event - Separate operation, not in transaction
    await this.auditService.logEvent({
      action: AuditAction.EXPORT_EXCEL,
      actorUserId: context.userId,
      entityType: 'Export',
      entityId: filename,
      metadata: {
        filename,
        rowCount: proposals.length,
        filter: dto.filter,
        includeAll: dto.includeAll,
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(`Exported ${proposals.length} proposals to ${filename}`);

    return {
      buffer,
      filename,
      rowCount: proposals.length,
    };
  }

  /**
   * Generate a readable filter name for filename
   *
   * @param filter - Filter object
   * @param includeAll - Whether all records are included
   * @returns Filter name string
   */
  private getFilterName(filter?: Record<string, unknown>, includeAll?: boolean): string {
    if (includeAll) {
      return 'all';
    }

    if (!filter) {
      return 'all';
    }

    if (filter.state) {
      return String(filter.state).toLowerCase();
    }

    if (filter.overdue) {
      return 'overdue';
    }

    if (filter.upcoming) {
      return 'upcoming';
    }

    return 'filtered';
  }

  /**
   * Validate user has permission to export
   * Only PHONG_KHCN and ADMIN can export
   *
   * @param userRole - User's role
   * @throws BadRequestException if user lacks permission
   */
  validateExportPermission(userRole: string): void {
    const allowedRoles = ['PHONG_KHCN', 'ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Bạn không có quyền thực hiện thao tác này',
        },
      });
    }
  }

  /**
   * Export Full Database Dump
   * Story 10.2: Export Excel (Full Dump)
   *
   * Generates a multi-sheet Excel file with all system data:
   * - Users sheet
   * - Proposals sheet (with exception states from Epic 9)
   * - Workflow Logs sheet
   * - Evaluations sheet
   *
   * Epic 9 Retro Patterns Applied:
   * - NO as unknown casting
   * - NO as any casting
   * - File operations OUTSIDE transactions
   * - Proper typing for all data
   *
   * @param context - Export context
   * @returns FullExportResult with buffer, filename, and record counts
   */
  async exportFullDump(context: ExportContext): Promise<FullExportResult> {
    this.logger.log('Starting full database dump export');

    // Generate full export - NO DB transaction needed for read operation
    const result = await this.fullDumpExportService.generateFullExport(this.prisma);

    // Log audit event - Separate operation, not in transaction
    await this.auditService.logEvent({
      action: AuditAction.EXPORT_EXCEL,
      actorUserId: context.userId,
      entityType: 'FullDump',
      entityId: result.filename,
      metadata: {
        filename: result.filename,
        recordCounts: result.recordCounts,
      },
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    this.logger.log(
      `Full dump export completed: ${result.recordCounts.users} users, ${result.recordCounts.proposals} proposals, ${result.recordCounts.workflowLogs} logs, ${result.recordCounts.evaluations} evaluations`,
    );

    return result;
  }
}
