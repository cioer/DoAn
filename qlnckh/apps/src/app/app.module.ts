import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { AuditModule } from '../modules/audit/audit.module';
import { DemoModule } from '../modules/demo/demo.module';
import { BusinessCalendarModule } from '../modules/calendar/calendar.module';
import { FormTemplatesModule } from '../modules/form-templates/form-templates.module';
import { ProposalsModule } from '../modules/proposals/proposals.module';
import { AttachmentsModule } from '../modules/attachments/attachments.module';
import { PdfModule } from '../modules/pdf/pdf.module';
import { CouncilModule } from '../modules/council/council.module';

/**
 * Application Module
 *
 * Story 3.9: Added PdfModule for proposal detail PDF export
 * Story 5.2: Added CouncilModule for council assignment
 */

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    AuditModule,
    DemoModule,
    BusinessCalendarModule,
    FormTemplatesModule,
    ProposalsModule,
    AttachmentsModule,
    PdfModule,
    CouncilModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
