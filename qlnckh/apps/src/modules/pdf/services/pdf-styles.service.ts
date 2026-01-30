import { Injectable } from '@nestjs/common';

/**
 * PDF Styles Service
 *
 * Manages CSS styles for PDF generation.
 * Extracted from pdf.service.ts to eliminate CSS duplication.
 *
 * Phase 2 Refactor: Extract CSS management
 */
@Injectable()
export class PdfStylesService {
  /**
   * State badge configurations
   * Maps state to CSS class, label, and icon
   */
  private readonly stateBadges: Record<string, { label: string; className: string; icon: string; css: string }> = {
    DRAFT: {
      label: 'Nháp',
      className: 'status-draft',
      icon: '📝',
      css: 'background: #fef3c7; color: #92400e;',
    },
    FACULTY_COUNCIL_OUTLINE_REVIEW: {
      label: 'Đang xét (Khoa)',
      className: 'status-faculty_review',
      icon: '⏳',
      css: 'background: #dbeafe; color: #1e40af;',
    },
    SCHOOL_COUNCIL_OUTLINE_REVIEW: {
      label: 'Hội đồng Trường - Đề cương',
      className: 'status-school_council_outline_review',
      icon: '⏳',
      css: 'background: #f3e8ff; color: #6b21a8;',
    },
    CHANGES_REQUESTED: {
      label: 'Yêu cầu sửa',
      className: 'status-changes_requested',
      icon: '↩️',
      css: 'background: #fee2e2; color: #991b1b;',
    },
    APPROVED: {
      label: 'Đã duyệt',
      className: 'status-approved',
      icon: '✅',
      css: 'background: #d1fae5; color: #065f46;',
    },
    IN_PROGRESS: {
      label: 'Đang thực hiện',
      className: 'status-in_progress',
      icon: '🔄',
      css: 'background: #cffafe; color: #0e7490;',
    },
    PAUSED: {
      label: 'Tạm dừng',
      className: 'status-paused',
      icon: '⏸️',
      css: 'background: #e5e7eb; color: #374151;',
    },
    FACULTY_COUNCIL_ACCEPTANCE_REVIEW: {
      label: 'Nghiệm thu (Khoa)',
      className: 'status-faculty_acceptance_review',
      icon: '📋',
      css: 'background: #fef3c7; color: #92400e;',
    },
    SCHOOL_COUNCIL_ACCEPTANCE_REVIEW: {
      label: 'Nghiệm thu (Trường)',
      className: 'status-school_acceptance_review',
      icon: '📋',
      css: 'background: #fed7aa; color: #9a3412;',
    },
    REJECTED: {
      label: 'Từ chối',
      className: 'status-rejected',
      icon: '❌',
      css: 'background: #fee2e2; color: #991b1b;',
    },
    WITHDRAWN: {
      label: 'Đã rút',
      className: 'status-withdrawn',
      icon: '📤',
      css: 'background: #f3f4f6; color: #374151;',
    },
    CANCELLED: {
      label: 'Đã hủy',
      className: 'status-cancelled',
      icon: '🚫',
      css: 'background: #f3f4f6; color: #374151;',
    },
  };

  /**
   * SLA badge configurations
   */
  private readonly slaBadges = {
    ok: {
      className: 'sla-ok',
      icon: '⏳',
      css: 'background: #d1fae5; color: #065f46;',
    },
    warning: {
      className: 'sla-warning',
      icon: '⚠️',
      css: 'background: #fef3c7; color: #92400e;',
    },
    overdue: {
      className: 'sla-overdue',
      icon: '⛔',
      css: 'background: #fee2e2; color: #991b1b;',
    },
    paused: {
      className: 'sla-paused',
      icon: '⏸️',
      css: 'background: #e5e7eb; color: #374151;',
    },
  };

  /**
   * Get state badge styling
   *
   * @param state - Project state
   * @returns Badge configuration with label, className, icon, and CSS
   */
  getStateBadge(state: string): { label: string; className: string; icon: string; css: string } {
    return this.stateBadges[state] || {
      label: state,
      className: `status-${state.toLowerCase()}`,
      icon: '📄',
      css: 'background: #f3f4f6; color: #374151;',
    };
  }

  /**
   * Get SLA badge styling
   *
   * @param status - SLA status (ok, warning, overdue, paused)
   * @returns Badge configuration with className, icon, and CSS
   */
  getSlaBadge(status: 'ok' | 'warning' | 'overdue' | 'paused'): {
    className: string;
    icon: string;
    css: string;
  } {
    return this.slaBadges[status];
  }

  /**
   * Calculate SLA status from dates
   *
   * @param deadline - SLA deadline
   * @returns SLA status (ok, warning, overdue) or null if no deadline
   */
  calculateSlaStatus(deadline: Date | null): 'ok' | 'warning' | 'overdue' | null {
    if (!deadline) {
      return null;
    }

    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return 'overdue';
    } else if (diffDays <= 2) {
      return 'warning';
    } else {
      return 'ok';
    }
  }

  /**
   * Get base CSS styles for all PDF templates
   *
   * Includes reset, container, sections, info rows, footer, and empty states.
   *
   * @returns CSS string
   */
  getBaseStyles(): string {
    return `
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
    `.trim();
  }

  /**
   * Get state-specific CSS for all states
   *
   * @returns CSS string with all state badge styles
   */
  getStateBadgeStyles(): string {
    let css = '';
    for (const state of Object.keys(this.stateBadges)) {
      const badge = this.stateBadges[state];
      css += `.${badge.className} { ${badge.css} }\n`;
    }
    return css.trim();
  }

  /**
   * Get SLA-specific CSS for all SLA statuses
   *
   * @returns CSS string with all SLA badge styles
   */
  getSlaBadgeStyles(): string {
    let css = '';
    for (const status of Object.keys(this.slaBadges)) {
      const badge = this.slaBadges[status as keyof typeof this.slaBadges];
      css += `.${badge.className} { ${badge.css} }\n`;
    }
    return css.trim();
  }

  /**
   * Get complete CSS for proposal PDF
   *
   * Combines base styles, state badges, and SLA badges.
   *
   * @returns Complete CSS string
   */
  getProposalCss(): string {
    return `
    ${this.getBaseStyles()}
    ${this.getStateBadgeStyles()}
    ${this.getSlaBadgeStyles()}
    `.trim();
  }
}
