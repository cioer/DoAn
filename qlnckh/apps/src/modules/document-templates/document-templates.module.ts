import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentTemplatesController } from './document-templates.controller';
import { DocumentTemplatesService } from './document-templates.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Document Templates Module
 *
 * Epic 7 Story 7.2: Template Upload & Registry
 *
 * Manages DOCX template uploads, validation, and activation.
 */
@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
    AuditModule,
  ],
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService, PrismaService],
  exports: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
