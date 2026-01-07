import { BadRequestException } from '@nestjs/common';
import PizZip from 'pizzip';

/**
 * Known Proposal Data Fields for Placeholder Validation
 *
 * These are the known placeholders that can be used in document templates.
 * Templates can reference proposal data using {{placeholder}} syntax.
 *
 * Epic 7 Story 7.2: Template Upload & Registry
 */
export const KNOWN_PLACEHOLDERS: Record<string, string> = {
  // Project info
  'proposal.code': 'Mã đề tài',
  'proposal.title': 'Tên đề tài',
  'proposal.owner': 'Chủ nhiệm đề tài',
  'proposal.ownerEmail': 'Email chủ nhiệm',
  'proposal.faculty': 'Khoa/Đơn vị',
  'proposal.facultyCode': 'Mã khoa',
  'proposal.state': 'Trạng thái',
  'proposal.createdAt': 'Ngày tạo',
  'proposal.actualStartDate': 'Ngày bắt đầu thực hiện',
  'proposal.completedDate': 'Ngày hoàn thành',

  // Council info
  'council.name': 'Tên hội đồng',
  'council.type': 'Loại hội đồng',
  'council.secretary': 'Thư ký hội đồng',
  'council.chair': 'Chủ tịch hội đồng',
  'council.members': 'Thành viên hội đồng',

  // Evaluation info
  'evaluation.council': 'Hội đồng đánh giá',
  'evaluation.secretary': 'Thư ký',
  'evaluation.decision': 'Kết luận (Đạt/Không đạt)',
  'evaluation.date': 'Ngày đánh giá',
  'evaluation.scientificContent.score': 'Điểm nội dung khoa học',
  'evaluation.scientificContent.comments': 'Nhận xét nội dung khoa học',
  'evaluation.researchMethod.score': 'Điểm phương pháp nghiên cứu',
  'evaluation.researchMethod.comments': 'Nhận xét phương pháp',
  'evaluation.feasibility.score': 'Điểm tính khả thi',
  'evaluation.feasibility.comments': 'Nhận xét tính khả thi',
  'evaluation.budget.score': 'Điểm kinh phí',
  'evaluation.budget.comments': 'Nhận xét kinh phí',
  'evaluation.otherComments': 'Ý kiến khác',

  // Faculty Acceptance info
  'acceptance.results': 'Kết quả thực hiện',
  'acceptance.products': 'Sản phẩm đầu ra',
  'acceptance.date': 'Ngày nghiệm thu',
  'acceptance.facultyDecision': 'Quyết định khoa',
  'acceptance.facultyComments': 'Nhận xét khoa',

  // School Acceptance info
  'schoolAcceptance.results': 'Kết quả thực hiện',
  'schoolAcceptance.products': 'Sản phẩm đầu ra',
  'schoolAcceptance.date': 'Ngày nghiệm thu',
  'schoolAcceptance.schoolDecision': 'Quyết định trường',
  'schoolAcceptance.schoolComments': 'Nhận xét trường',

  // Handover info
  'handover.date': 'Ngày bàn giao',
  'handover.checklist': 'Checklist bàn giao',
  'handover.completedBy': 'Người hoàn thành',
  'handover.receivedBy': 'Người nhận',

  // Timeline info
  'timeline.startDate': 'Ngày bắt đầu',
  'timeline.endDate': 'Ngày kết thúc',
  'timeline.duration': 'Thời gian thực hiện (tháng)',

  // Budget info
  'budget.total': 'Tổng kinh phí',
  'budget.approved': 'Kinh phí được duyệt',
  'budget.used': 'Kinh phí đã sử dụng',
  'budget.remaining': 'Kinh phí còn lại',

  // Formatting helpers
  'currentDate': 'Ngày hiện tại',
  'currentYear': 'Năm hiện tại',
  'currentMonth': 'Tháng hiện tại',
  'currentTime': 'Giờ hiện tại',
};

/**
 * Placeholder Extractor Service
 *
 * Extracts placeholders from .docx template files.
 * Validates placeholders against known proposal data fields.
 *
 * Epic 7 Story 7.2: Placeholder Extraction
 */
export class PlaceholderExtractor {
  /**
   * Extract placeholders from .docx file buffer
   *
   * @param docxBuffer - Buffer containing .docx file content
   * @returns Array of placeholder names found in the document
   */
  static extractPlaceholders(docxBuffer: Buffer): string[] {
    try {
      // 1. Unzip the .docx file (it's a ZIP archive)
      const zip = new PizZip(docxBuffer);

      // 2. Extract word/document.xml (main content)
      const documentXml = zip.file('word/document.xml')?.asText();
      if (!documentXml) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_DOCX',
            message: 'File DOCX không hợp lệ: thiếu document.xml',
          },
        });
      }

      // 3. Also check header/footer files for placeholders
      // PizZip doesn't support wildcards, so iterate through files (Epic 6 retro fix)
      const headerXml = Object.keys(zip.files)
        .filter((f) => f.startsWith('word/header') && f.endsWith('.xml'))
        .map((f) => zip.file(f)?.asText())
        .filter(Boolean)
        .join('');

      const footerXml = Object.keys(zip.files)
        .filter((f) => f.startsWith('word/footer') && f.endsWith('.xml'))
        .map((f) => zip.file(f)?.asText())
        .filter(Boolean)
        .join('');

      // Combine all XML content
      const combinedXml = documentXml + headerXml + footerXml;

      // 4. Extract placeholders using regex
      // Pattern: {{placeholder_name}}
      const placeholderRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
      const placeholders = new Set<string>();
      let match;

      while ((match = placeholderRegex.exec(combinedXml)) !== null) {
        placeholders.add(match[1]);
      }

      return Array.from(placeholders);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DOCX_PARSE_ERROR',
          message: 'Không thể phân tích file DOCX',
        },
      });
    }
  }

  /**
   * Validate extracted placeholders against known fields
   *
   * @param placeholders - Array of placeholder names
   * @returns Validation result with known/unknown placeholders
   */
  static validatePlaceholders(placeholders: string[]): {
    valid: boolean;
    known: string[];
    unknown: string[];
    warnings: string[];
  } {
    const unknown = placeholders.filter((p) => !KNOWN_PLACEHOLDERS[p]);
    const known = placeholders.filter((p) => KNOWN_PLACEHOLDERS[p]);

    const warnings = unknown.map(
      (p) => `Placeholder không xác định: {{${p}}}`,
    );

    return {
      valid: unknown.length === 0,
      known,
      unknown,
      warnings,
    };
  }

  /**
   * Get Vietnamese label for a placeholder
   *
   * @param placeholder - Placeholder name
   * @returns Vietnamese label or null if not found
   */
  static getPlaceholderLabel(placeholder: string): string | null {
    return KNOWN_PLACEHOLDERS[placeholder] || null;
  }

  /**
   * Check if a placeholder is known
   *
   * @param placeholder - Placeholder name
   * @returns true if placeholder is known
   */
  static isKnownPlaceholder(placeholder: string): boolean {
    return placeholder in KNOWN_PLACEHOLDERS;
  }

  /**
   * Get all known placeholders
   *
   * @returns Map of placeholder to Vietnamese label
   */
  static getAllKnownPlaceholders(): Record<string, string> {
    return { ...KNOWN_PLACEHOLDERS };
  }
}
