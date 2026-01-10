import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExcelExportService } from './excel-export.service';
import { FullDumpExportService } from './helpers/full-dump-export.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { BusinessCalendarModule } from '../calendar/calendar.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Exports Module
 * Story 8.3: Export Excel (Xuất Excel theo filter)
 * Story 10.2: Export Excel (Full Dump)
 *
 * Handles export operations:
 * - Export proposals to Excel with filters
 * - Export full database dump with all entities
 */
@Module({
  imports: [AuditModule, BusinessCalendarModule, RbacModule],
  controllers: [ExportsController],
  providers: [ExportsService, ExcelExportService, FullDumpExportService, PrismaService],
  exports: [ExportsService, ExcelExportService, FullDumpExportService],
})
export class ExportsModule {}
