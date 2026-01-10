import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { BusinessCalendarModule } from '../calendar/calendar.module';
import { IdempotencyModule } from '../../common/interceptors';
import { RbacModule } from '../rbac/rbac.module';
import {
  WorkflowValidatorService,
  HolderAssignmentService,
  AuditHelperService,
  SlaService,
  TransactionService,
  IdempotencyService,
  WorkflowStateMachineService,
  WorkflowActionsService,
  WorkflowQueryService,
  WorkflowOrchestrationService,
} from './services';

/**
 * Workflow Module
 *
 * Phase 2 Refactor: Split workflow.service.ts into 4 specialized services
 * - WorkflowStateMachineService: Generic transition executor
 * - WorkflowActionsService: Semantic API for workflow actions
 * - WorkflowQueryService: Read operations for workflow data
 * - WorkflowOrchestrationService: Complex multi-step workflows (future)
 *
 * Main WorkflowService reduced from 2,303 to 409 lines (-82%)
 */
@Module({
  imports: [
    AuditModule,
    BusinessCalendarModule,
    IdempotencyModule,
    RbacModule,
  ],
  controllers: [WorkflowController],
  providers: [
    PrismaService,

    // Core services (Phase 1)
    WorkflowValidatorService,
    HolderAssignmentService,
    AuditHelperService,
    SlaService,
    TransactionService,
    IdempotencyService,

    // New services (Phase 2)
    WorkflowStateMachineService,
    WorkflowActionsService,
    WorkflowQueryService,
    WorkflowOrchestrationService,

    // Main orchestrator
    WorkflowService,
  ],
  exports: [
    WorkflowService,
    WorkflowValidatorService,
    HolderAssignmentService,
    AuditHelperService,
    SlaService,
    TransactionService,
    IdempotencyService,
    // Export new services for testing/reuse
    WorkflowStateMachineService,
    WorkflowActionsService,
    WorkflowQueryService,
  ],
})
export class WorkflowModule {}
