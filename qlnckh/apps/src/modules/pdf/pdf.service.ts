import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * PDF generation options
 */
interface PdfOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  timeout?: number; // milliseconds
}

/**
 * PDF Service
 *
 * Generates WYSIWYG PDF exports for proposal details using Playwright.
 * Matches UI typography, spacing, and layout.
 *
 * Story 3.9: PDF export with 10s SLA, pre-generated seed PDFs
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly seedPdfDir = path.join(process.cwd(), 'apps', 'public', 'pdfs', 'seed');
  private readonly defaultTimeout = 10000; // 10 seconds SLA

  constructor(private readonly prisma: PrismaService) {
    // Ensure seed PDF directory exists
    this.ensureSeedPdfDirectory();
  }

  /**
   * Generate PDF for a proposal
   *
   * @param proposalId - Proposal UUID
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generateProposalPdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer> {
    const startTime = Date.now();

    // Check for pre-generated seed PDF first
    const seedPdfPath = path.join(this.seedPdfDir, `${proposalId}.pdf`);
    try {
      await fs.access(seedPdfPath);
      this.logger.log(`Using pre-generated PDF for proposal ${proposalId}`);
      return await fs.readFile(seedPdfPath);
    } catch {
      // Pre-generated PDF not found, continue with on-demand generation
    }

    // Fetch proposal data
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        template: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    try {
      // Generate HTML content
      const html = await this.generateProposalHtml(proposal);

      // Launch browser and generate PDF
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();

        // Set timeout for PDF generation
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
        });

        await browser.close();

        const duration = Date.now() - startTime;
        this.logger.log(`PDF generated for proposal ${proposalId} in ${duration}ms`);

        return pdfBuffer;
      } catch (browserError) {
        await browser.close();
        throw browserError;
      }
    } catch (error) {
      this.logger.error(`Failed to generate PDF for proposal ${proposalId}`, error);
      throw new InternalServerErrorException(
        `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate HTML for proposal PDF
   *
   * @param proposal - Proposal data with relations
   * @returns HTML string
   */
  private async generateProposalHtml(proposal: any): Promise<string> {
    const stateBadge = this.getStateBadge(proposal.state);
    const slaInfo = this.getSlaInfo(proposal);

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proposal.code} - ${proposal.title}</title>
  <style>
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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

    /* Header */
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .proposal-code {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }

    .proposal-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .status-draft { background: #fef3c7; color: #92400e; }
    .status-faculty_review { background: #dbeafe; color: #1e40af; }
    .status-school_selection_review { background: #e0e7ff; color: #3730a3; }
    .status-outline_council_review { background: #f3e8ff; color: #6b21a8; }
    .status-changes_requested { background: #fee2e2; color: #991b1b; }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-in_progress { background: #cffafe; color: #0e7490; }
    .status-faculty_acceptance_review { background: #fef3c7; color: #92400e; }
    .status-school_acceptance_review { background: #fed7aa; color: #9a3412; }

    /* Section */
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
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

    /* SLA Badge */
    .sla-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 8px;
    }

    .sla-ok { background: #d1fae5; color: #065f46; }
    .sla-warning { background: #fef3c7; color: #92400e; }
    .sla-overdue { background: #fee2e2; color: #991b1b; }
    .sla-paused { background: #e5e7eb; color: #374151; }

    /* Form data display */
    .form-data {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin-top: 8px;
    }

    .form-field {
      margin-bottom: 12px;
    }

    .form-field-label {
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 4px;
    }

    .form-field-value {
      color: #1f2937;
      white-space: pre-wrap;
    }

    /* Empty state */
    .empty-value {
      color: #9ca3af;
      font-style: italic;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      page-break-inside: avoid;
    }

    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      font-size: 11px;
      text-transform: uppercase;
    }

    /* Header repeat for print */
    thead {
      display: table-header-group;
    }

    /* Page break control */
    .page-break-before {
      page-break-before: always;
    }

    .page-break-after {
      page-break-after: always;
    }

    .no-break {
      page-break-inside: avoid;
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

    /* Icon + text for print (grayscale) */
    .icon-text::before {
      content: attr(data-icon) " ";
      margin-right: 4px;
    }

    /* Print-specific styles */
    @media print {
      body {
        background: white !important;
        color: black !important;
      }

      .section {
        page-break-inside: avoid;
      }

      table {
        page-break-inside: avoid;
      }

      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="proposal-code">${proposal.code || ''}</div>
      <div class="proposal-title">${this.escapeHtml(proposal.title || 'Chưa đặt tên')}</div>
      <div class="status-badge ${stateBadge.className}">
        ${stateBadge.icon} ${stateBadge.label}
      </div>
      ${slaInfo ? `<div class="sla-badge ${slaInfo.className}">${slaInfo.icon} ${slaInfo.text}</div>` : ''}
    </div>

    <!-- Proposal Info Section -->
    <div class="section">
      <div class="section-title">Thông tin đề tài</div>

      <div class="info-row">
        <div class="info-label">Mã đề tài:</div>
        <div class="info-value">${proposal.code || ''}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Tên đề tài:</div>
        <div class="info-value">${this.escapeHtml(proposal.title || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Trạng thái:</div>
        <div class="info-value">${stateBadge.label}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Chủ nhiệm:</div>
        <div class="info-value">${this.escapeHtml(proposal.owner?.name || proposal.owner?.email || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Người tạo:</div>
        <div class="info-value">${this.escapeHtml(proposal.owner?.name || proposal.owner?.email || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Mẫu đơn:</div>
        <div class="info-value">${proposal.template?.code || ''} - ${this.escapeHtml(proposal.template?.name || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Phiên bản:</div>
        <div class="info-value">${proposal.templateVersion || ''}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Ngày tạo:</div>
        <div class="info-value">${proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('vi-VN') : ''}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Cập nhật lần cuối:</div>
        <div class="info-value">${proposal.updatedAt ? new Date(proposal.updatedAt).toLocaleString('vi-VN') : ''}</div>
      </div>
    </div>

    <!-- SLA Information -->
    ${slaInfo ? `
    <div class="section">
      <div class="section-title">Thông tin SLA</div>

      <div class="info-row">
        <div class="info-label">Ngày bắt đầu:</div>
        <div class="info-value">${slaInfo.startDate || 'Chưa có'}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Hạn chót:</div>
        <div class="info-value">${slaInfo.deadline || 'Chưa có'}</div>
      </div>
    </div>
    ` : ''}

    <!-- Form Data Section -->
    <div class="section">
      <div class="section-title">Nội dung đề tài</div>

      ${proposal.formData ? this.renderFormData(proposal.formData) : '<div class="empty-value">Chưa có dữ liệu</div>'}
    </div>

    <!-- Footer -->
    <div class="footer">
      Hệ thống Quản lý Nghiên cứu Khoa học - Generated on ${new Date().toLocaleString('vi-VN')}
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render form data as HTML
   */
  private renderFormData(formData: any): string {
    if (!formData || typeof formData !== 'object') {
      return '<div class="empty-value">Chưa có dữ liệu</div>';
    }

    let html = '<div class="form-data">';

    for (const [key, value] of Object.entries(formData)) {
      if (value === null || value === undefined) {
        continue;
      }

      const label = this.formatLabel(key);
      const displayValue = this.formatValue(value);

      html += `
        <div class="form-field">
          <div class="form-field-label">${this.escapeHtml(label)}</div>
          <div class="form-field-value">${displayValue}</div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Format field label
   */
  private formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\s/, '')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format field value for display
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return this.escapeHtml(value);
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'boolean') {
      return value ? 'Có' : 'Không';
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.formatValue(v)).join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return this.escapeHtml(String(value));
  }

  /**
   * Get state badge styling
   */
  private getStateBadge(state: string): { label: string; className: string; icon: string } {
    const stateLabels: Record<string, string> = {
      DRAFT: 'Nháp',
      FACULTY_REVIEW: 'Đang xét (Khoa)',
      SCHOOL_SELECTION_REVIEW: 'Đang xét (PKHCN)',
      OUTLINE_COUNCIL_REVIEW: 'Đang xét (HĐĐ)',
      CHANGES_REQUESTED: 'Yêu cầu sửa',
      APPROVED: 'Đã duyệt',
      IN_PROGRESS: 'Đang thực hiện',
      PAUSED: 'Tạm dừng',
      FACULTY_ACCEPTANCE_REVIEW: 'Nghiệm thu (Khoa)',
      SCHOOL_ACCEPTANCE_REVIEW: 'Nghiệm thu (Trường)',
      REJECTED: 'Từ chối',
      WITHDRAWN: 'Đã rút',
      CANCELLED: 'Đã hủy',
    };

    const label = stateLabels[state] || state;
    const className = `status-${state.toLowerCase()}`;

    const icons: Record<string, string> = {
      DRAFT: '📝',
      FACULTY_REVIEW: '⏳',
      SCHOOL_SELECTION_REVIEW: '⏳',
      OUTLINE_COUNCIL_REVIEW: '⏳',
      CHANGES_REQUESTED: '↩️',
      APPROVED: '✅',
      IN_PROGRESS: '🔄',
      PAUSED: '⏸️',
      FACULTY_ACCEPTANCE_REVIEW: '📋',
      SCHOOL_ACCEPTANCE_REVIEW: '📋',
      REJECTED: '❌',
      WITHDRAWN: '📤',
      CANCELLED: '🚫',
    };

    const icon = icons[state] || '📄';

    return { label, className, icon };
  }

  /**
   * Get SLA information
   */
  private getSlaInfo(proposal: any): { text: string; className: string; icon: string; startDate: string; deadline: string } | null {
    if (!proposal.slaStartDate && !proposal.slaDeadline) {
      return null;
    }

    const now = new Date();
    const deadline = proposal.slaDeadline ? new Date(proposal.slaDeadline) : null;

    if (!deadline) {
      return null;
    }

    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let text: string;
    let className: string;
    let icon: string;

    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      text = `Quá hạn ${overdueDays} ngày`;
      className = 'sla-overdue';
      icon = '⛔';
    } else if (diffDays <= 2) {
      text = `T-2 (Còn ${diffDays} ngày)`;
      className = 'sla-warning';
      icon = '⚠️';
    } else {
      text = `Còn ${diffDays} ngày`;
      className = 'sla-ok';
      icon = '⏳';
    }

    return {
      text,
      className,
      icon,
      startDate: proposal.slaStartDate ? new Date(proposal.slaStartDate).toLocaleDateString('vi-VN') : '',
      deadline: deadline.toLocaleDateString('vi-VN'),
    };
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
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
}
