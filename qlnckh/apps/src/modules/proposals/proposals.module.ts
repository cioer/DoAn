import { Module } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { FormDataValidationService } from './form-data-validation.service';
import { PrismaService } from '../auth/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { FormTemplatesModule } from '../form-templates/form-templates.module';

@Module({
  imports: [AuthModule, RbacModule, AuditModule, FormTemplatesModule],
  controllers: [ProposalsController],
  providers: [
    ProposalsService,
    FormDataValidationService,
    PrismaService,
  ],
  exports: [ProposalsService, FormDataValidationService],
})
export class ProposalsModule {}
