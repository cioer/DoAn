import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocxService } from './docx.service';
import { IntegrityService } from './integrity.service';
import { PrismaService } from '../auth/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { DocumentTemplatesModule } from '../document-templates/document-templates.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * Documents Module
 *
 * Epic 7 Story 7.3: DOCX Generation + SHA-256 + Manifest + Retention
 *
 * Manages generated DOCX documents with:
 * - Template-based generation
 * - SHA-256 integrity tracking
 * - Document manifests
 * - 7-year retention policy
 * - RBAC for downloads
 */
@Module({
  imports: [AuditModule, DocumentTemplatesModule, RbacModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocxService,
    IntegrityService,
    PrismaService,
  ],
  exports: [DocumentsService, DocxService, IntegrityService],
})
export class DocumentsModule {}
