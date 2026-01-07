/**
 * PDF Base Service
 *
 * Abstract base class for all PDF generation services.
 * Provides common functionality for Playwright-based PDF generation.
 *
 * Epic 7 Story 7.1: Document Export Completion (Refinement)
 *
 * Features:
 * - Shared Playwright configuration
 * - Consistent browser lifecycle management
 * - Common error handling
 * - Font loading for Vietnamese support
 * - Dark mode handling for PDF exports
 * - Page break control utilities
 */

import { Logger, InternalServerErrorException } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { PDF_CONFIG, PDF_CSS_UTILITIES, FONT_CONFIG } from './pdf.config';

/**
 * PDF generation options that can be overridden by subclasses
 */
export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  timeout?: number;
  landscape?: boolean;
}

/**
 * Result type for PDF generation
 */
export interface PdfGenerationResult {
  buffer: Buffer;
  duration: number; // milliseconds
}

/**
 * Abstract base service for PDF generation
 * All PDF services should extend this class for consistent behavior
 *
 * Note: Abstract classes should NOT have @Injectable() decorator
 * because NestJS cannot instantiate abstract classes directly.
 * Subclasses that extend this should add @Injectable().
 */
export abstract class PdfBaseService {
  protected readonly logger: Logger;
  protected readonly config = PDF_CONFIG;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Generate PDF from HTML content
   *
   * @param html - HTML content to convert to PDF
   * @param options - Optional PDF generation overrides
   * @returns PDF buffer
   */
  protected async generatePdfFromHtml(
    html: string,
    options: PdfGenerationOptions = {},
  ): Promise<PdfGenerationResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      // Launch browser
      browser = await this.launchBrowser();

      // Create page and generate PDF
      const pdfBuffer = await this.generatePdfOnPage(browser, html, options);

      const duration = Date.now() - startTime;
      this.logger.log(`PDF generated in ${duration}ms`);

      return {
        buffer: pdfBuffer,
        duration,
      };
    } catch (error) {
      this.logger.error('PDF generation failed', error);
      throw new InternalServerErrorException(
        `Không thể tạo PDF: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
    } finally {
      // Always close browser to prevent memory leaks
      await this.closeBrowser(browser);
    }
  }

  /**
   * Launch Playwright browser with consistent configuration
   */
  protected async launchBrowser(): Promise<Browser> {
    return await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
  }

  /**
   * Generate PDF on a browser page
   */
  protected async generatePdfOnPage(
    browser: Browser,
    html: string,
    options: PdfGenerationOptions = {},
  ): Promise<Buffer> {
    const page = await browser.newPage();

    try {
      // Set viewport
      await page.setViewportSize(this.config.viewport);

      // Set timeout
      const timeout = options.timeout || this.config.timeout;
      page.setDefaultTimeout(timeout);

      // Set content and wait for network idle
      await page.setContent(html, {
        waitUntil: this.config.waitUntil,
        timeout,
      });

      // Generate PDF with merged options
      const pdfBuffer = await page.pdf({
        ...this.config.pdfOptions,
        ...options,
        margin: {
          ...this.config.pdfOptions.margin,
          ...options.margin,
        },
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  /**
   * Close browser safely
   */
  protected async closeBrowser(browser: Browser | null): Promise<void> {
    if (!browser) {
      return;
    }

    try {
      await browser.close();
    } catch (error) {
      this.logger.warn('Failed to close browser', error);
    }
  }

  /**
   * Generate HTML with PDF-specific CSS utilities
   *
   * @param content - Main HTML content
   * @param title - Document title
   * @param additionalStyles - Optional additional CSS
   * @returns Complete HTML document
   */
  protected generateHtmlDocument(
    content: string,
    title = 'Document',
    additionalStyles = '',
  ): string {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${FONT_CONFIG.googleFontsUrl}" rel="stylesheet">
  <style>
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${FONT_CONFIG.fontFamily}, ${FONT_CONFIG.fallbackFonts};
      font-size: 12px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
    }

    /* Container */
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Section */
    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }

    /* Info rows */
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .info-label {
      flex: 0 0 180px;
      font-weight: 600;
      color: #4b5563;
    }

    .info-value {
      flex: 1;
      color: #1f2937;
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #6b7280;
      text-align: center;
    }

    /* Empty state */
    .empty-value {
      color: #9ca3af;
      font-style: italic;
    }

    /* PDF-specific utilities */
    ${PDF_CSS_UTILITIES}

    /* Additional styles */
    ${additionalStyles}
  </style>
</head>
<body>
  ${content}
  <div class="footer">
    Hệ thống Quản lý Nghiên cứu Khoa học - Generated on ${new Date().toLocaleString('vi-VN')}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Escape HTML to prevent XSS
   */
  protected escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
  }

  /**
   * Format date in Vietnamese locale
   */
  protected formatDate(date: Date | string | null | undefined): string {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString('vi-VN');
  }

  /**
   * Format date time in Vietnamese locale
   */
  protected formatDateTime(date: Date | string | null | undefined): string {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleString('vi-VN');
  }

  /**
   * Truncate text with ellipsis
   */
  protected truncate(text: string, maxLength = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Format file size in human-readable format
   */
  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Abstract method: Subclasses must implement PDF generation
   */
  abstract generatePdf(entityId: string, options?: PdfGenerationOptions): Promise<PdfGenerationResult>;

  /**
   * Abstract method: Subclasses must implement HTML generation
   */
  protected abstract generateHtmlContent(entityId: string): Promise<string>;

  /**
   * Abstract method: Get filename for the PDF
   */
  protected abstract getFilename(entityId: string): Promise<string>;
}
