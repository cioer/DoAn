import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { StateVerificationService } from './helpers/state-verification.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Backup Module
 * Story 10.6: DB Restore + State Recompute
 *
 * Handles backup and restore operations:
 * - Backup file management
 * - Database restore
 * - State integrity verification
 * - State correction
 *
 * Epic 9 Retro Patterns Applied:
 * - NO as unknown casting
 * - NO as any casting
 * - Proper DTO mapping
 * - File operations OUTSIDE transactions
 */
@Module({
  imports: [AuditModule],
  controllers: [BackupController],
  providers: [BackupService, StateVerificationService, PrismaService],
  exports: [BackupService, StateVerificationService],
})
export class BackupModule {}
