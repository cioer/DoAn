import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ExcelParserService } from './helpers/excel-parser.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Import Module
 * Story 10.1: Import Excel (Users, Proposals)
 *
 * Handles import operations:
 * - Import users from Excel file
 * - Import proposals from Excel file
 * - Template download for import files
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 * - File operations OUTSIDE transactions
 */
@Module({
  imports: [AuditModule, RbacModule],
  controllers: [ImportController],
  providers: [ImportService, ExcelParserService, PrismaService],
  exports: [ImportService, ExcelParserService],
})
export class ImportModule {}
