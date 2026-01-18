import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { FacultiesModule } from '../modules/faculties/faculties.module';
import { AuditModule } from '../modules/audit/audit.module';
import { DemoModule } from '../modules/demo/demo.module';
import { BusinessCalendarModule } from '../modules/calendar/calendar.module';
import { FormTemplatesModule } from '../modules/form-templates/form-templates.module';
import { ProposalsModule } from '../modules/proposals/proposals.module';
import { AttachmentsModule } from '../modules/attachments/attachments.module';
import { PdfModule } from '../modules/pdf/pdf.module';
import { CouncilModule } from '../modules/council/council.module';
import { EvaluationModule } from '../modules/evaluations/evaluations.module';
import { BulkOperationsModule } from '../modules/bulk-operations/bulk-operations.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { ExportsModule } from '../modules/exports/exports.module';
import { DashboardModule } from '../modules/dashboard/dashboard.module';
import { ImportModule } from '../modules/import/import.module';
import { HolidaysModule } from '../modules/holidays/holidays.module';
import { BackupModule } from '../modules/backup/backup.module';
import { DocumentTemplatesModule } from '../modules/document-templates/document-templates.module';
import { DocumentsModule } from '../modules/documents/documents.module';
import { FormEngineModule } from '../modules/form-engine/form-engine.module';
import { ProposalDocumentsModule } from '../modules/proposal-documents/proposal-documents.module';

/**
 * Application Module
 *
 * Story 3.9: Added PdfModule for proposal detail PDF export
 * Story 5.2: Added CouncilModule for council assignment
 * Story 5.3: Added EvaluationModule for evaluation form draft
 * Story 8.1: Added BulkOperationsModule for bulk operations
 * Story 8.2: Added NotificationsModule for bulk remind
 * Story 8.3: Added ExportsModule for Excel export
 * Story 8.4: Added DashboardModule for morning check
 * Story 10.1: Added ImportModule for Excel import
 * Story 10.5: Added HolidaysModule for holiday management
 * Story 10.6: Added BackupModule for database restore and state verification
 */

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web-apps'),
      exclude: ['/api*'],
    }),
    AuthModule,
    UsersModule,
    FacultiesModule,
    AuditModule,
    DemoModule,
    BusinessCalendarModule,
    FormTemplatesModule,
    ProposalsModule,
    AttachmentsModule,
    PdfModule,
    CouncilModule,
    EvaluationModule,
    BulkOperationsModule,
    NotificationsModule,
    ExportsModule,
    DashboardModule,
    ImportModule,
    HolidaysModule,
    BackupModule,
    DocumentTemplatesModule,
    DocumentsModule,
    FormEngineModule,
    ProposalDocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
