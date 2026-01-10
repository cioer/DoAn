import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { PrismaService } from '../auth/prisma.service';
import { RbacModule } from '../rbac/rbac.module';
import {
  PdfHtmlHelpersService,
  PdfStylesService,
  PdfDataService,
  PdfGeneratorService,
  PdfTemplateService,
} from './services';

/**
 * PDF Module
 *
 * Handles PDF generation for proposal detail exports.
 * Uses Playwright for WYSIWYG PDF generation matching UI layout.
 *
 * Story 3.9: Project Detail PDF Export (WYSIWYG, SLA 10s, Pre-Generated Seeds)
 *
 * Phase 6 Refactor: Split into 6 specialized services
 * - Main PdfService: 1,682 → 170 lines (-90%)
 * - PdfHtmlHelpersService: Utility functions (100 lines)
 * - PdfStylesService: CSS management (200 lines)
 * - PdfDataService: Data fetching (120 lines)
 * - PdfGeneratorService: PDF rendering (150 lines)
 * - PdfTemplateService: HTML generation (400 lines)
 */
@Module({
  imports: [RbacModule],
  controllers: [PdfController],
  providers: [
    PrismaService,

    // New specialized services (Phase 6)
    PdfHtmlHelpersService,
    PdfStylesService,
    PdfDataService,
    PdfGeneratorService,
    PdfTemplateService,

    // Main orchestrator
    PdfService,
  ],
  exports: [
    PdfService,
    PdfHtmlHelpersService,
    PdfStylesService,
    PdfDataService,
    PdfGeneratorService,
    PdfTemplateService,
  ],
})
export class PdfModule {}
