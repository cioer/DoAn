import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluations.controller';
import { EvaluationService } from './evaluations.service';
import { PrismaService } from '../auth/prisma.service';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Evaluation Module (Story 5.3)
 * Provides evaluation CRUD operations for council secretaries
 *
 * GIANG_VIEN Feature: Added RbacModule import for PermissionsGuard support
 */
@Module({
  imports: [RbacModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, PrismaService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
