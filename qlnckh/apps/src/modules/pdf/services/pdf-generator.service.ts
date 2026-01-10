import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { chromium, Browser } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * PDF generation options
 */
export interface PdfOptions {
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
 * PDF Generator Service
 *
 * Handles Playwright browser management and PDF rendering.
 * Extracted from pdf.service.ts for reusability.
 *
 * Phase 4 Refactor: Extract PDF generation engine
 */
@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly defaultTimeout = 10000; // 10 seconds SLA
  private readonly seedPdfDir = path.join(process.cwd(), 'apps', 'public', 'pdfs', 'seed');

  constructor() {
    this.ensureSeedPdfDirectory();
  }

  /**
   * Generate PDF from HTML content
   *
   * @param html - HTML content to convert to PDF
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generatePdfFromHtml(html: string, options: PdfOptions = {}): Promise<Buffer> {
    const startTime = Date.now();

    try {
      // Launch browser
      const browser = await this.launchBrowser();

      try {
        // Create page and generate PDF
        const pdfBuffer = await this.generatePdfOnPage(browser, html, options);

        const duration = Date.now() - startTime;
        this.logger.log(`PDF generated in ${duration}ms`);

        return pdfBuffer;
      } catch (browserError) {
        this.logger.error('Failed to generate PDF page', browserError);
        throw browserError;
      } finally {
        // Always close browser to prevent memory leaks
        await this.closeBrowser(browser);
      }
    } catch (error) {
      this.logger.error('PDF generation failed', error);
      throw new InternalServerErrorException(
        `Không thể tạo PDF: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
    }
  }

  /**
   * Launch Playwright browser with consistent configuration
   *
   * @returns Browser instance
   */
  private async launchBrowser(): Promise<Browser> {
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
   *
   * @param browser - Browser instance
   * @param html - HTML content
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  private async generatePdfOnPage(
    browser: Browser,
    html: string,
    options: PdfOptions = {},
  ): Promise<Buffer> {
    const page = await browser.newPage();

    try {
      // Set timeout
      const timeout = options.timeout || this.defaultTimeout;
      page.setDefaultTimeout(timeout);

      // Set content and wait for network idle
      await page.setContent(html, {
        waitUntil: 'networkidle',
        timeout,
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        margin: options.margin || {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px',
        },
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        landscape: options.landscape || false,
      });

      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  /**
   * Close browser safely
   *
   * @param browser - Browser instance
   */
  private async closeBrowser(browser: Browser): Promise<void> {
    try {
      await browser.close();
    } catch (error) {
      this.logger.warn('Failed to close browser', error);
    }
  }

  /**
   * Ensure seed PDF directory exists
   */
  private async ensureSeedPdfDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.seedPdfDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }
  }

  /**
   * Save pre-generated PDF for seed data
   *
   * @param proposalId - Proposal UUID
   * @param pdfBuffer - PDF buffer
   */
  async saveSeedPdf(proposalId: string, pdfBuffer: Buffer): Promise<void> {
    const filePath = path.join(this.seedPdfDir, `${proposalId}.pdf`);
    await fs.writeFile(filePath, pdfBuffer);
    this.logger.log(`Saved pre-generated PDF for proposal ${proposalId}`);
  }

  /**
   * Check if pre-generated PDF exists
   *
   * @param proposalId - Proposal UUID
   * @returns true if PDF exists
   */
  async hasSeedPdf(proposalId: string): Promise<boolean> {
    const filePath = path.join(this.seedPdfDir, `${proposalId}.pdf`);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get pre-generated PDF
   *
   * @param proposalId - Proposal UUID
   * @returns PDF buffer
   */
  async getSeedPdf(proposalId: string): Promise<Buffer> {
    const filePath = path.join(this.seedPdfDir, `${proposalId}.pdf`);
    return await fs.readFile(filePath);
  }
}
