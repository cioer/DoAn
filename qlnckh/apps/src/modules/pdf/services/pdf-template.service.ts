import { Injectable } from '@nestjs/common';
import { PdfHtmlHelpersService } from './pdf-html-helpers.service';
import { PdfStylesService } from './pdf-styles.service';

/**
 * PDF Template Service
 *
 * Generates HTML templates for different PDF types.
 * Extracted from pdf.service.ts for separation of concerns.
 *
 * Phase 5 Refactor: Extract HTML generation logic
 */
@Injectable()
export class PdfTemplateService {
  constructor(
    private readonly helpers: PdfHtmlHelpersService,
    private readonly styles: PdfStylesService,
  ) {}

  /**
   * Generate HTML for proposal PDF
   *
   * @param proposal - Proposal data with relations
   * @returns HTML string
   */
  generateProposalHtml(proposal: any): string {
    const stateBadge = this.styles.getStateBadge(proposal.state);
    const slaInfo = this.getSlaInfo(proposal);

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proposal.code} - ${proposal.title}</title>
  <style>
    ${this.styles.getProposalCss()}
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="proposal-code">${proposal.code || ''}</div>
      <div class="proposal-title">${this.helpers.escapeHtml(proposal.title || 'Chưa đặt tên')}</div>
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
        <div class="info-value">${this.helpers.escapeHtml(proposal.title || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Trạng thái:</div>
        <div class="info-value">${stateBadge.label}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Chủ nhiệm:</div>
        <div class="info-value">${this.helpers.escapeHtml(proposal.owner?.displayName || proposal.owner?.email || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Người tạo:</div>
        <div class="info-value">${this.helpers.escapeHtml(proposal.owner?.displayName || proposal.owner?.email || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Mẫu đơn:</div>
        <div class="info-value">${proposal.template?.code || ''} - ${this.helpers.escapeHtml(proposal.template?.name || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Phiên bản:</div>
        <div class="info-value">${proposal.templateVersion || ''}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Ngày tạo:</div>
        <div class="info-value">${this.helpers.formatDate(proposal.createdAt)}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Cập nhật lần cuối:</div>
        <div class="info-value">${this.helpers.formatDateTime(proposal.updatedAt)}</div>
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

      ${proposal.formData ? this.helpers.renderFormData(proposal.formData) : '<div class="empty-value">Chưa có dữ liệu</div>'}
    </div>

    <!-- Footer -->
    <div class="footer">
      Hệ thống Quản lý Nghiên cứu Khoa học - Generated on ${this.helpers.formatDateTime(new Date())}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for revision request PDF
   *
   * @param proposal - Proposal data
   * @param returnLog - RETURN workflow log
   * @returns HTML string
   */
  generateRevisionHtml(proposal: any, returnLog: any): string {
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

    const requestDate = this.helpers.formatDate(returnLog.timestamp);
    const requestTime = this.helpers.formatDateTime(returnLog.timestamp);

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bản Yêu Cầu Sửa Đổi - ${proposal.code}</title>
  <style>
    ${this.styles.getBaseStyles()}

    .header {
      border-bottom: 2px solid #dc2626;
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

    .timeline-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
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
        <div class="info-value">${this.helpers.escapeHtml(proposal.title || 'Chưa đặt tên')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Chủ nhiệm:</div>
        <div class="info-value">${this.helpers.escapeHtml(proposal.owner?.displayName || proposal.owner?.email || '')}</div>
      </div>
    </div>

    <!-- Revision Info Section -->
    <div class="section">
      <div class="section-title">Thông tin yêu cầu sửa</div>

      <div class="info-row">
        <div class="info-label">Lý do:</div>
        <div class="info-value">${this.helpers.escapeHtml(reasonLabel)}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Người yêu cầu:</div>
        <div class="info-value">${this.helpers.escapeHtml(returnLog.actorName || '')}</div>
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
            <li class="section-list-item">${index + 1}. ${this.helpers.escapeHtml(label)}</li>
          `).join('')}
        </ul>
      ` : '<div class="empty-value">Không có section cụ thể nào được yêu cầu sửa.</div>'}
    </div>

    <!-- Notes -->
    ${revisionDetails.reason ? `
    <div class="section">
      <div class="section-title">Ghi chú</div>
      <div class="notes-box">
        <div class="notes-content">${this.helpers.escapeHtml(revisionDetails.reason)}</div>
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
          <div class="info-value">${this.helpers.escapeHtml(returnLog.actorName || '')}</div>
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
      Hệ thống Quản lý Nghiên cứu Khoa học - Generated on ${this.helpers.formatDateTime(new Date())}<br>
      Trang này được tạo tự động từ hệ thống.
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for evaluation PDF
   *
   * @param evaluation - Evaluation data with relations
   * @param councilName - Council name
   * @returns HTML string
   */
  generateEvaluationHtml(evaluation: any, councilName: string): string {
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

    const submittedAt = this.helpers.formatDateTime(evaluation.updatedAt);

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PHIẾU ĐÁNH GIÁ - ${evaluation.proposal.code}</title>
  <style>
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

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

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

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #ccc;
      font-size: 10px;
      color: #666;
      text-align: center;
    }

    .page-break-before {
      page-break-before: always;
    }

    .page-break-after {
      page-break-after: always;
    }

    .no-break {
      page-break-inside: avoid;
    }

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
        <div class="info-value">${this.helpers.escapeHtml(evaluation.proposal.code || '')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Tên đề tài:</div>
        <div class="info-value">${this.helpers.escapeHtml(evaluation.proposal.title || 'Chưa đặt tên')}</div>
      </div>

      <div class="info-row">
        <div class="info-label">Hội đồng:</div>
        <div class="info-value">${this.helpers.escapeHtml(councilName)}</div>
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
          <div>${this.helpers.escapeHtml((formData.scientificContent as any)?.comments || 'Không có')}</div>
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
          <div>${this.helpers.escapeHtml((formData.researchMethod as any)?.comments || 'Không có')}</div>
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
          <div>${this.helpers.escapeHtml((formData.feasibility as any)?.comments || 'Không có')}</div>
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
          <div>${this.helpers.escapeHtml((formData.budget as any)?.comments || 'Không có')}</div>
        </div>
      </div>

      <!-- Other Comments (if provided) -->
      ${(formData.otherComments as string) ? `
      <div class="evaluation-section no-break">
        <div class="evaluation-section-title">5. Ý kiến khác</div>
        <div class="comments-box">
          <div>${this.helpers.escapeHtml(formData.otherComments as string)}</div>
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
          <div>${this.helpers.escapeHtml(evaluation.evaluator?.displayName || evaluation.evaluator?.email || '')}</div>
          <div class="signature-label">Chức vụ:</div>
          <div>Thư ký Hội đồng</div>
          <div class="signature-placeholder"></div>
          <div class="timestamp">Ngày nộp: ${submittedAt}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Hệ thống Quản lý Nghiên cứu Khoa học - Generated on ${this.helpers.formatDateTime(new Date())}<br>
      Trang này được tạo tự động từ hệ thống.
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get SLA information for proposal
   *
   * @param proposal - Proposal data
   * @returns SLA info or null
   */
  private getSlaInfo(proposal: any): {
    text: string;
    className: string;
    icon: string;
    startDate: string;
    deadline: string;
  } | null {
    if (!proposal.slaStartDate && !proposal.slaDeadline) {
      return null;
    }

    const deadline = proposal.slaDeadline ? new Date(proposal.slaDeadline) : null;

    if (!deadline) {
      return null;
    }

    const status = this.styles.calculateSlaStatus(deadline);
    if (!status) {
      return null;
    }

    const badge = this.styles.getSlaBadge(status);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let text: string;
    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      text = `Quá hạn ${overdueDays} ngày`;
    } else if (diffDays <= 2) {
      text = `T-2 (Còn ${diffDays} ngày)`;
    } else {
      text = `Còn ${diffDays} ngày`;
    }

    return {
      text,
      className: badge.className,
      icon: badge.icon,
      startDate: this.helpers.formatDate(proposal.slaStartDate),
      deadline: this.helpers.formatDate(deadline),
    };
  }
}
