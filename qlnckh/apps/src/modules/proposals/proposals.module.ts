import { Module } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import {
  ProposalsCrudController,
  ProposalsAcceptanceController,
  ProposalsQueryController,
} from './controllers';
import { ProposalsService } from './proposals.service';
import { FormDataValidationService } from './form-data-validation.service';
import { DossierExportService } from './dossier-export.service';
import { PrismaService } from '../auth/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { FormTemplatesModule } from '../form-templates/form-templates.module';
import { IdempotencyModule } from '../../common/interceptors';
import { WorkflowModule } from '../workflow/workflow.module';
import {
  ProposalsCrudService,
  ProposalsValidationService,
  ProposalsQueryService,
  ProposalsWorkflowService,
} from './services';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    AuditModule,
    FormTemplatesModule,
    IdempotencyModule,
    WorkflowModule,
  ],
  controllers: [
    // New split controllers (order matters for route matching)
    ProposalsQueryController, // Must come first for /filter and /holder/my-queue routes
    ProposalsCrudController,
    ProposalsAcceptanceController,
    // Original controller kept for backward compatibility during transition
    // ProposalsController,
  ],
  providers: [
    ProposalsService,
    ProposalsCrudService,
    ProposalsValidationService,
    ProposalsQueryService,
    ProposalsWorkflowService,
    FormDataValidationService,
    DossierExportService,
    PrismaService,
  ],
  exports: [
    ProposalsService,
    ProposalsCrudService,
    ProposalsValidationService,
    ProposalsQueryService,
    ProposalsWorkflowService,
    FormDataValidationService,
    DossierExportService,
  ],
})
export class ProposalsModule { }
