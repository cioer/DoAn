import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Workflow Module
 *
 * Handles state machine transitions for proposals.
 * Provides workflow service to other modules that need to transition states.
 *
 * This module does NOT export a controller - state transitions are triggered
 * through domain-specific endpoints (e.g., proposals/:id/submit) to maintain
 * clear semantic API boundaries.
 */
@Module({
  imports: [AuditModule],
  providers: [WorkflowService, PrismaService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
