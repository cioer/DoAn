import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { BusinessCalendarModule } from '../calendar/calendar.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Notifications Module
 * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
 *
 * Handles notification operations:
 * - Bulk remind - Send reminder emails to multiple proposal holders
 */
@Module({
  imports: [AuditModule, BusinessCalendarModule, RbacModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, PrismaService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
