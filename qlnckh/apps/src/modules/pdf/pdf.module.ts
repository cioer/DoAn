import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { PrismaService } from '../auth/prisma.service';

/**
 * PDF Module
 *
 * Handles PDF generation for proposal detail exports.
 * Uses Playwright for WYSIWYG PDF generation matching UI layout.
 *
 * Story 3.9: Project Detail PDF Export (WYSIWYG, SLA 10s, Pre-Generated Seeds)
 */
@Module({
  controllers: [PdfController],
  providers: [PdfService, PrismaService],
  exports: [PdfService],
})
export class PdfModule {}
