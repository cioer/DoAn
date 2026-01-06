import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluations.controller';
import { EvaluationService } from './evaluations.service';
import { PrismaService } from '../auth/prisma.service';

/**
 * Evaluation Module (Story 5.3)
 * Provides evaluation CRUD operations for council secretaries
 */
@Module({
  controllers: [EvaluationController],
  providers: [EvaluationService, PrismaService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
