import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { HealthService } from './health.service';
import { PrismaService } from '../auth/prisma.service';
import { BusinessCalendarModule } from '../calendar/calendar.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Dashboard Module
 * Story 8.4: Morning Check Dashboard (KPI + Overdue List)
 * Story 10.3: System Health Dashboard
 *
 * Handles dashboard operations:
 * - Calculate KPI metrics
 * - Get overdue proposals list
 * - Bulk remind overdue proposals
 * - System health monitoring
 */
@Module({
  imports: [BusinessCalendarModule, NotificationsModule, RbacModule],
  controllers: [DashboardController],
  providers: [DashboardService, HealthService, PrismaService],
  exports: [DashboardService, HealthService],
})
export class DashboardModule {}
