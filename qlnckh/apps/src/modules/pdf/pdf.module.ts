import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { PrismaService } from '../auth/prisma.service';
import { RbacModule } from '../rbac/rbac.module';

/**
 * PDF Module
 *
 * Handles PDF generation for proposal detail exports.
 * Uses Playwright for WYSIWYG PDF generation matching UI layout.
 *
 * Story 3.9: Project Detail PDF Export (WYSIWYG, SLA 10s, Pre-Generated Seeds)
 */
@Module({
  imports: [RbacModule],
  controllers: [PdfController],
  providers: [PdfService, PrismaService],
  exports: [PdfService],
})
export class PdfModule {}
