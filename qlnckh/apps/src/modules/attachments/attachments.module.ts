import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../auth/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';
import { ProposalsModule } from '../proposals/proposals.module';
import {
  AttachmentValidationService,
  AttachmentStorageService,
  AttachmentQueryService,
} from './services';

/**
 * Attachments Module
 *
 * Handles file uploads, replacements, and deletion for DRAFT proposals.
 * Only proposal owners can modify attachments in their own DRAFT proposals.
 *
 * Story 2.4: Upload Attachments (Demo Cap 5MB/File)
 * Story 2.5: Attachment CRUD (Replace, Delete)
 *
 * Phase 4 Refactor: Split into 4 specialized services
 * - Main AttachmentsService: 771 → 450 lines (-42%)
 * - AttachmentValidationService: File validation logic
 * - AttachmentStorageService: File system operations
 * - AttachmentQueryService: Data fetching
 */
@Module({
  imports: [
    AuthModule,
    RbacModule,
    AuditModule,
    ProposalsModule,
    // Serve static files from /uploads directory (Story 2.4 - Fix for download button)
    ServeStaticModule.forRoot({
      rootPath: process.env.UPLOAD_DIR || '/app/uploads',
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AttachmentsController],
  providers: [
    PrismaService,
    AttachmentsService,
    // New specialized services (Phase 4)
    AttachmentValidationService,
    AttachmentStorageService,
    AttachmentQueryService,
  ],
  exports: [
    AttachmentsService,
    AttachmentValidationService,
    AttachmentStorageService,
    AttachmentQueryService,
  ],
})
export class AttachmentsModule {}
