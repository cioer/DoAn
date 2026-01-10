import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { BusinessCalendarModule } from '../calendar/calendar.module';
import { IdempotencyModule } from '../../common/interceptors';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Workflow Module
 *
 * Handles state machine transitions for proposals.
 * Provides workflow service to other modules that need to transition states.
 *
 * Story 3.3: Added BusinessCalendarModule import for SLA calculation
 * Story 3.4: Added WorkflowController for workflow logs endpoint
 * Story 3.5: Added queue filter endpoint with SlaService integration
 * Story 3.8: Added IdempotencyModule for idempotency on state-changing actions
 */
@Module({
  imports: [AuditModule, BusinessCalendarModule, IdempotencyModule, RbacModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, PrismaService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
