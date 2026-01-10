import { Module } from '@nestjs/common';
import { BulkOperationsController } from './bulk-operations.controller';
import { BulkOperationsService } from './bulk-operations.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Bulk Operations Module
 * Story 8.1: Bulk Actions & Reports
 *
 * Handles bulk operations on multiple proposals:
 * - Bulk assign holder_user to multiple proposals
 * - Bulk remind (Story 8.2 - to be added)
 */
@Module({
  imports: [AuditModule, RbacModule],
  controllers: [BulkOperationsController],
  providers: [BulkOperationsService, PrismaService],
  exports: [BulkOperationsService],
})
export class BulkOperationsModule {}
