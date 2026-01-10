import { Injectable } from '@nestjs/common';

/**
 * PDF HTML Helpers Service
 *
 * Provides utility functions for HTML generation in PDF templates.
 * Extracted from pdf.service.ts for reusability across all PDF types.
 *
 * Phase 1 Refactor: Extract helper methods
 */
@Injectable()
export class PdfHtmlHelpersService {
  /**
   * Escape HTML to prevent XSS attacks
   *
   * @param text - Text to escape
   * @returns Escaped HTML string
   */
  escapeHtml(text: string): string {
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
   * Format field label from snake_case or camelCase to Title Case
   *
   * Examples:
   * - research_field → Research Field
   * - researchField → Research Field
   * - research_field_name → Research Field Name
   *
   * @param key - Field key to format
   * @returns Formatted label
   */
  formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\s/, '')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format field value for display in HTML
   *
   * Handles different data types:
   * - Strings: Escape HTML
   * - Numbers: Convert to string
   * - Booleans: Convert to Vietnamese (Có/Không)
   * - Arrays: Join with comma
   * - Objects: JSON.stringify
   *
   * @param value - Value to format
   * @returns Formatted value string
   */
  formatValue(value: any): string {
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
   * Format date in Vietnamese locale
   *
   * @param date - Date to format
   * @returns Formatted date string (dd/mm/yyyy) or empty string
   */
  formatDate(date: Date | string | null | undefined): string {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString('vi-VN');
  }

  /**
   * Format date time in Vietnamese locale
   *
   * @param date - Date to format
   * @returns Formatted datetime string or empty string
   */
  formatDateTime(date: Date | string | null | undefined): string {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleString('vi-VN');
  }

  /**
   * Truncate text with ellipsis
   *
   * @param text - Text to truncate
   * @param maxLength - Maximum length (default: 100)
   * @returns Truncated text
   */
  truncate(text: string, maxLength = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Render form data as HTML
   *
   * Converts formData object to HTML with labels and values.
   * Skips null/undefined values.
   *
   * @param formData - Form data object
   * @returns HTML string
   */
  renderFormData(formData: any): string {
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
}
