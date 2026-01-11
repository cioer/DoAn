import { Module } from '@nestjs/common';
import { FacultiesController } from './faculties.controller';
import { FacultiesService } from './faculties.service';
import { PrismaService } from '../auth/prisma.service';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Faculties Module
 *
 * Handles faculty management operations:
 * - Create, read, update, delete faculties
 * - List faculties with filtering and pagination
 * - Faculty validation for users and proposals
 *
 * Requires USER_MANAGE permission for all operations
 */
@Module({
  imports: [RbacModule, AuditModule],
  controllers: [FacultiesController],
  providers: [FacultiesService, PrismaService],
  exports: [FacultiesService],
})
export class FacultiesModule {}
