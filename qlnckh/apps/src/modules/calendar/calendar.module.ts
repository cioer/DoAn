import { Module } from '@nestjs/common';
import { BusinessCalendarController } from './calendar.controller';
import { BusinessCalendarService } from './calendar.service';
import { SlaService } from './sla.service';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../auth/prisma.service';

/**
 * Business Calendar Module
 *
 * Provides holiday management and SLA calculation services.
 * Story 1.8: Business Calendar Basic
 */
@Module({
  imports: [RbacModule, AuditModule, AuthModule],
  controllers: [BusinessCalendarController],
  providers: [BusinessCalendarService, SlaService, PrismaService],
  exports: [BusinessCalendarService, SlaService],
})
export class BusinessCalendarModule {}
