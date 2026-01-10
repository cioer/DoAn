import { Injectable, Logger, NotFoundException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma.service';
import { EvaluationState } from '@prisma/client';
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
          select: { id: true, email: true, displayName: true },
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

  /**
   * Generate PDF for revision request (Story 4.6)
   *
   * Creates a PDF document showing revision request details including:
   * - Proposal information
   * - Revision reason and sections
   * - Timeline (who requested, when)
   *
   * @param proposalId - Proposal UUID
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generateRevisionPdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer> {
    const startTime = Date.now();

    // Fetch proposal data
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        title: true,
        owner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Không tìm thấy đề tài ${proposalId}`);
    }

    // Fetch latest RETURN workflow log
    const returnLog = await this.prisma.workflowLog.findFirst({
      where: {
        proposalId,
        action: 'RETURN',
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!returnLog) {
      throw new NotFoundException(`Không tìm thấy thông tin yêu cầu sửa cho đề tài ${proposalId}`);
    }

    // Fix #9: Launch browser and ensure it's closed properly with try/finally
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      // Generate HTML content
      const html = await this.generateRevisionHtml(proposal, returnLog);

      try {
        const page = await browser.newPage();

        // Set timeout for PDF generation (Fix #15: 10s SLA from Story 3.9)
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

        const duration = Date.now() - startTime;
        this.logger.log(`Revision PDF generated for proposal ${proposalId} in ${duration}ms`);

        return pdfBuffer;
      } catch (browserError) {
        this.logger.error(`Failed to generate PDF page for proposal ${proposalId}`, browserError);
        throw browserError;
      }
    } catch (error) {
      this.logger.error(`Failed to generate revision PDF for proposal ${proposalId}`, error);
      throw new InternalServerErrorException(
        `Không thể tạo PDF yêu cầu sửa: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
    } finally {
      // Fix #9: Ensure browser is always closed, even if errors occur
      try {
        await browser.close();
      } catch (closeError) {
        this.logger.warn(`Failed to close browser for proposal ${proposalId}`, closeError);
      }
    }
  }

  /**
   * Get proposal code for filename (Fix #8: Proper encapsulation)
   * Provides a public method to get proposal code without accessing private prisma property
   *
   * @param proposalId - Proposal UUID
   * @returns Proposal code or default string
   */
  async getProposalCode(proposalId: string): Promise<string> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { code: true },
    });
    return proposal?.code || 'proposal';
  }

  /**
   * Get proposal for export with ownership verification (GIANG_VIEN Feature)
   * Fetches minimal proposal data needed for export authorization
   *
   * @param proposalId - Proposal UUID
   * @returns Proposal with code and ownerId
   * @throws NotFoundException if proposal not found
   */
  async getProposalForExport(proposalId: string): Promise<{
    id: string;
    code: string;
    ownerId: string;
  }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        code: true,
        ownerId: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Không tìm thấy đề tài ${proposalId}`);
    }

    return proposal;
  }

  /**
   * Generate HTML for revision PDF (Story 4.6)
   *
   * @param proposal - Proposal data
   * @param returnLog - RETURN workflow log
   * @returns HTML string
   */
  private async generateRevisionHtml(proposal: any, returnLog: any): Promise<string> {
    // Parse revision details from log comment
    let revisionDetails = { reason: '', revisionSections: [] };
    try {
      if (returnLog.comment) {
        revisionDetails = JSON.parse(returnLog.comment);
      }
    } catch {
      // Use empty details if parsing fails
    }

    // Get reason label
    const reasonLabels: Record<string, string> = {
      THIEU_TAI_LIEU: 'Thiếu tài liệu',
      NOI_DUNG_KHONG_RO_RANG: 'Nội dung không rõ ràng',
      PHUONG_PHAP_KHONG_KHA_THI: 'Phương pháp không khả thi',
      KINH_PHI_KHONG_HOP_LE: 'Kinh phí không hợp lý',
      KHAC: 'Khác',
    };
    const reasonLabel = reasonLabels[returnLog.reasonCode] || returnLog.reasonCode || 'Không xác định';

    // Get section labels
    const sectionLabels: Record<string, string> = {
      SEC_INFO_GENERAL: 'Thông tin chung',
      SEC_CONTENT_METHOD: 'Nội dung nghiên cứu',
      SEC_METHOD: 'Phương pháp nghiên cứu',
      SEC_EXPECTED_RESULTS: 'Kết quả mong đợi',
      SEC_BUDGET: 'Kinh phí',
      SEC_ATTACHMENTS: 'Tài liệu đính kèm',
    };
    const revisionSectionLabels = (revisionDetails.revisionSections || [])
      .map((id: string) => sectionLabels[id] || id);

    // Format dates
    const requestDate = returnLog.timestamp ? new Date(returnLog.timestamp).toLocaleDateString('vi-VN') : '';
    const requestTime = returnLog.timestamp ? new Date(returnLog.timestamp).toLocaleString('vi-VN') : '';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bản Yêu Cầu Sửa Đổi - ${proposal.code}</title>
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
      border-bottom: 2px solid #dc2626;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .header-title {
      font-size: 20px;
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 8px;
    }

    .header-subtitle {
      font-size: 12px;
      color: #6b7280;
    }

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

    /* Alert box */
    .alert-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .alert-title {
      font-size: 14px;
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 8px;
    }

    .alert-content {
      color: #991b1b;
    }

    /* Section list */
    .section-list {
      list-style: none;
      padding-left: 0;
    }

    .section-list-item {
      padding: 10px 16px;
      margin-bottom: 8px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      font-weight: 500;
    }

    /* Notes box */
    .notes-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }

    .notes-label {
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 8px;
    }

    .notes-content {
      color: #1f2937;
      white-space: pre-wrap;
      font-style: italic;
    }

    /* Timeline */
    .timeline-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
    }

    /* Empty state */
    .empty-value {
      color: #9ca3af;
      font-style: italic;
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

    /* Page break control */
    .page-break-before {
      page-break-before: always;
    }

    .no-break {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-title">BẢN YÊU CẦU SỬA ĐỔI HỒ SƠ</div>
      <div class="header-subtitle">Hệ thống Quản lý Nghiên cứu Khoa học</div>
    </div>

    <!-- Alert Box -->
    <div class="alert-box">
      <div class="alert-title">⚠️ YÊU CẦU SỬA ĐỔI</div>
      <div class="alert-content">
        Đề tài này cần được sửa đổi trước khi có thể tiếp tục quy trình xét duyệt.
      </div>
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
        <div class="info-value">${this.escapeHtml(proposal.title || 'Chưa đặt tên')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Chủ nhiệm:</div>
        <div class="info-value">${this.escapeHtml(proposal.owner?.name || proposal.owner?.email || '')}</div>
      </div>
    </div>

    <!-- Revision Info Section -->
    <div class="section">
      <div class="section-title">Thông tin yêu cầu sửa</div>

      <div class="info-row">
        <div class="info-label">Lý do:</div>
        <div class="info-value">${this.escapeHtml(reasonLabel)}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Người yêu cầu:</div>
        <div class="info-value">${this.escapeHtml(returnLog.actorName || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Ngày yêu cầu:</div>
        <div class="info-value">${requestDate}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Thời gian:</div>
        <div class="info-value">${requestTime}</div>
      </div>
    </div>

    <!-- Sections to Revision -->
    <div class="section">
      <div class="section-title">Các phần cần sửa</div>
      ${revisionSectionLabels.length > 0 ? `
        <ul class="section-list">
          ${revisionSectionLabels.map((label: string, index: number) => `
            <li class="section-list-item">${index + 1}. ${this.escapeHtml(label)}</li>
          `).join('')}
        </ul>
      ` : '<div class="empty-value">Không có section cụ thể nào được yêu cầu sửa.</div>'}
    </div>

    <!-- Notes -->
    ${revisionDetails.reason ? `
    <div class="section">
      <div class="section-title">Ghi chú</div>
      <div class="notes-box">
        <div class="notes-content">${this.escapeHtml(revisionDetails.reason)}</div>
      </div>
    </div>
    ` : ''}

    <!-- Timeline -->
    <div class="section">
      <div class="section-title">Timeline</div>
      <div class="timeline-box">
        <div class="info-row">
          <div class="info-label">Ngày tạo yêu cầu:</div>
          <div class="info-value">${requestTime}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Người xử lý:</div>
          <div class="info-value">${this.escapeHtml(returnLog.actorName || '')}</div>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="section">
      <div class="section-title">Hướng dẫn</div>
      <div class="notes-box">
        <div class="notes-content">
1. Xem lại các phần được đánh dấu ở trên
2. Sửa đổi nội dung theo yêu cầu
3. Đánh dấu "Đã sửa" cho các phần đã hoàn thành
4. Nhấn "Nộp lại" để gửi hồ sơ xét duyệt lại
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Hệ thống Quản lý Nghiên cứu Khoa học - Generated on ${new Date().toLocaleString('vi-VN')}<br>
      Trang này được tạo tự động từ hệ thống.
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate PDF for evaluation (Story 5.6)
   *
   * Creates a PDF document showing evaluation details including:
   * - Proposal information
   * - Evaluation scores and comments for all sections
   * - Conclusion (Đạt/Không đạt)
   * - Evaluator information and signature
   *
   * @param proposalId - Proposal UUID
   * @param options - PDF generation options
   * @returns PDF buffer
   */
  async generateEvaluationPdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer> {
    const startTime = Date.now();

    // Fetch evaluation with proposal, evaluator, and council data
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { proposalId },
      include: {
        proposal: {
          select: {
            id: true,
            code: true,
            title: true,
            ownerId: true,
            councilId: true,
          },
        },
        evaluator: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(`Không tìm thấy phiếu đánh giá cho đề tài ${proposalId}`);
    }

    // Validate evaluation is finalized
    if (evaluation.state !== EvaluationState.FINALIZED) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'EVALUATION_NOT_FINALIZED',
          message: 'Chỉ có thể xuất PDF cho phiếu đánh giá đã hoàn tất',
        },
      });
    }

    // Fetch council name if exists
    let councilName = 'N/A';
    if (evaluation.proposal.councilId) {
      const council = await this.prisma.council.findUnique({
        where: { id: evaluation.proposal.councilId },
        select: { name: true },
      });
      councilName = council?.name || 'N/A';
    }

    // Fix #9: Launch browser and ensure it's closed properly with try/finally
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      // Generate HTML content
      const html = await this.generateEvaluationHtml(evaluation, councilName);

      try {
        const page = await browser.newPage();

        // Set timeout for PDF generation (10s SLA from Story 3.9)
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

        const duration = Date.now() - startTime;
        this.logger.log(`Evaluation PDF generated for proposal ${proposalId} in ${duration}ms`);

        return pdfBuffer;
      } catch (browserError) {
        this.logger.error(`Failed to generate PDF page for evaluation ${proposalId}`, browserError);
        throw browserError;
      }
    } catch (error) {
      this.logger.error(`Failed to generate evaluation PDF for proposal ${proposalId}`, error);
      throw new InternalServerErrorException(
        `Không thể tạo PDF đánh giá: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
    } finally {
      // Ensure browser is always closed, even if errors occur
      try {
        await browser.close();
      } catch (closeError) {
        this.logger.warn(`Failed to close browser for evaluation ${proposalId}`, closeError);
      }
    }
  }

  /**
   * Generate HTML for evaluation PDF (Story 5.6)
   *
   * @param evaluation - Evaluation data with relations
   * @param councilName - Council name
   * @returns HTML string
   */
  private async generateEvaluationHtml(evaluation: any, councilName: string): Promise<string> {
    const formData = evaluation.formData as Record<string, unknown> || {};

    // Helper to render score dots
    const renderScoreDots = (score: number): string => {
      let dots = '';
      for (let i = 1; i <= 5; i++) {
        const filled = i <= score;
        dots += `<span class="score-dot ${filled ? 'filled' : 'empty'}"></span>`;
      }
      return dots;
    };

    // Format submitted timestamp
    const submittedAt = evaluation.updatedAt
      ? new Date(evaluation.updatedAt).toLocaleString('vi-VN')
      : '';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PHIẾU ĐÁNH GIÁ - ${evaluation.proposal.code}</title>
  <style>
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000000;
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
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .header-title {
      font-size: 18px;
      font-weight: 700;
      color: #000;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .header-subtitle {
      font-size: 12px;
      color: #333;
      margin-bottom: 4px;
    }

    /* Section */
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #000;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #000;
    }

    /* Info rows */
    .info-row {
      display: flex;
      padding: 6px 0;
      border-bottom: 1px dotted #ccc;
    }

    .info-label {
      flex: 0 0 150px;
      font-weight: 600;
      color: #000;
    }

    .info-value {
      flex: 1;
      color: #000;
    }

    /* Evaluation section */
    .evaluation-section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .evaluation-section-title {
      font-size: 13px;
      font-weight: 700;
      color: #000;
      margin-bottom: 8px;
    }

    .score-display {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .score-label {
      font-weight: 600;
    }

    .score-dots {
      display: flex;
      gap: 4px;
    }

    .score-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .score-dot.filled {
      background: #000;
    }

    .score-dot.empty {
      border: 1px solid #000;
      background: #fff;
    }

    .score-text {
      font-weight: 600;
    }

    .comments-box {
      background: #f5f5f5;
      padding: 10px;
      border-left: 3px solid #000;
      margin-top: 6px;
    }

    .comments-label {
      font-weight: 600;
      margin-bottom: 4px;
    }

    /* Conclusion section */
    .conclusion-section {
      background: #f0f0f0;
      border: 2px solid #000;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    .conclusion-label {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .conclusion-value {
      font-size: 20px;
      font-weight: 700;
      padding: 8px 16px;
      display: inline-block;
      border-radius: 4px;
    }

    .conclusion-dat {
      background: #10b981;
      color: #fff;
    }

    .conclusion-khong-dat {
      background: #ef4444;
      color: #fff;
    }

    /* Signature section */
    .signature-section {
      margin-top: 32px;
      page-break-inside: avoid;
    }

    .signature-box {
      display: flex;
      gap: 40px;
      margin-top: 16px;
    }

    .signature-item {
      flex: 1;
    }

    .signature-label {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .signature-placeholder {
      height: 60px;
      border-bottom: 1px solid #000;
      margin: 12px 0 8px 0;
    }

    .timestamp {
      font-size: 11px;
      color: #666;
      font-style: italic;
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #ccc;
      font-size: 10px;
      color: #666;
      text-align: center;
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

    /* Empty state */
    .empty-value {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-title">PHIẾU ĐÁNH GIÁ ĐỀ TÀI</div>
      <div class="header-subtitle">Hệ thống Quản lý Nghiên cứu Khoa học</div>
    </div>

    <!-- Proposal Info Section -->
    <div class="section no-break">
      <div class="section-title">THÔNG TIN ĐỀ TÀI</div>

      <div class="info-row">
        <div class="info-label">Mã số:</div>
        <div class="info-value">${this.escapeHtml(evaluation.proposal.code || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Tên đề tài:</div>
        <div class="info-value">${this.escapeHtml(evaluation.proposal.title || 'Chưa đặt tên')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Hội đồng:</div>
        <div class="info-value">${this.escapeHtml(councilName)}</div>
      </div>
    </div>

    <!-- Evaluation Sections -->
    <div class="section no-break">
      <div class="section-title">KẾT QUẢ ĐÁNH GIÁ</div>

      <!-- Section 1: Scientific Content -->
      <div class="evaluation-section no-break">
        <div class="evaluation-section-title">1. Đánh giá nội dung khoa học</div>
        <div class="score-display">
          <span class="score-label">Điểm:</span>
          <div class="score-dots">${renderScoreDots((formData.scientificContent as any)?.score || 0)}</div>
          <span class="score-text">${(formData.scientificContent as any)?.score || 0}/5</span>
        </div>
        <div class="comments-box">
          <div class="comments-label">Nhận xét:</div>
          <div>${this.escapeHtml((formData.scientificContent as any)?.comments || 'Không có')}</div>
        </div>
      </div>

      <!-- Section 2: Research Method -->
      <div class="evaluation-section no-break">
        <div class="evaluation-section-title">2. Đánh giá phương pháp nghiên cứu</div>
        <div class="score-display">
          <span class="score-label">Điểm:</span>
          <div class="score-dots">${renderScoreDots((formData.researchMethod as any)?.score || 0)}</div>
          <span class="score-text">${(formData.researchMethod as any)?.score || 0}/5</span>
        </div>
        <div class="comments-box">
          <div class="comments-label">Nhận xét:</div>
          <div>${this.escapeHtml((formData.researchMethod as any)?.comments || 'Không có')}</div>
        </div>
      </div>

      <!-- Section 3: Feasibility -->
      <div class="evaluation-section no-break">
        <div class="evaluation-section-title">3. Đánh giá tính khả thi</div>
        <div class="score-display">
          <span class="score-label">Điểm:</span>
          <div class="score-dots">${renderScoreDots((formData.feasibility as any)?.score || 0)}</div>
          <span class="score-text">${(formData.feasibility as any)?.score || 0}/5</span>
        </div>
        <div class="comments-box">
          <div class="comments-label">Nhận xét:</div>
          <div>${this.escapeHtml((formData.feasibility as any)?.comments || 'Không có')}</div>
        </div>
      </div>

      <!-- Section 4: Budget -->
      <div class="evaluation-section no-break">
        <div class="evaluation-section-title">4. Đánh giá kinh phí</div>
        <div class="score-display">
          <span class="score-label">Điểm:</span>
          <div class="score-dots">${renderScoreDots((formData.budget as any)?.score || 0)}</div>
          <span class="score-text">${(formData.budget as any)?.score || 0}/5</span>
        </div>
        <div class="comments-box">
          <div class="comments-label">Nhận xét:</div>
          <div>${this.escapeHtml((formData.budget as any)?.comments || 'Không có')}</div>
        </div>
      </div>

      <!-- Other Comments (if provided) -->
      ${(formData.otherComments as string) ? `
      <div class="evaluation-section no-break">
        <div class="evaluation-section-title">5. Ý kiến khác</div>
        <div class="comments-box">
          <div>${this.escapeHtml(formData.otherComments as string)}</div>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Conclusion Section -->
    <div class="conclusion-section no-break">
      <div class="conclusion-label">KẾT LUẬN</div>
      <div class="conclusion-value ${formData.conclusion === 'DAT' ? 'conclusion-dat' : 'conclusion-khong-dat'}">
        ${formData.conclusion === 'DAT' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
      </div>
    </div>

    <!-- Signature Section -->
    <div class="signature-section no-break">
      <div class="section-title">CHỮ KÝ</div>

      <div class="signature-box">
        <div class="signature-item">
          <div class="signature-label">Người đánh giá:</div>
          <div>${this.escapeHtml(evaluation.evaluator?.name || evaluation.evaluator?.email || '')}</div>
          <div class="signature-label">Chức vụ:</div>
          <div>Thư ký Hội đồng</div>
          <div class="signature-placeholder"></div>
          <div class="timestamp">Ngày nộp: ${submittedAt}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Hệ thống Quản lý Nghiên cứu Khoa học - Generated on ${new Date().toLocaleString('vi-VN')}<br>
      Trang này được tạo tự động từ hệ thống.
    </div>
  </div>
</body>
</html>
    `;
  }
}
