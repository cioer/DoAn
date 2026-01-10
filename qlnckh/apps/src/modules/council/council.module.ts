import { Module } from '@nestjs/common';
import { CouncilController } from './council.controller';
import { CouncilService } from './council.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [WorkflowModule, RbacModule],
  controllers: [CouncilController],
  providers: [CouncilService, PrismaService, AuditService],
  exports: [CouncilService],
})
export class CouncilModule {}
