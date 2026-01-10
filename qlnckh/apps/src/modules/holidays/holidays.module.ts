import { Module } from '@nestjs/common';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Holidays Module
 * Story 10.5: Holiday Management (Full CRUD)
 *
 * Handles holiday management operations:
 * - Create, Read, Update, Delete holidays
 * - Vietnamese holiday seed data
 * - SLA integration
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 */
@Module({
  imports: [AuditModule, RbacModule],
  controllers: [HolidaysController],
  providers: [HolidaysService, PrismaService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
