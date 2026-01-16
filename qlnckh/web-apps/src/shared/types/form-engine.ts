/**
 * Form Engine Types
 *
 * Types for FormEngine integration (Python microservice)
 * Supports all 18 form templates (1b-18b)
 */

/**
 * Available template types
 */
export type FormTemplateType =
  | 'PROPOSAL_OUTLINE' // 1b - Phiếu đề xuất
  | 'EVALUATION_FORM' // 2b - Phiếu đánh giá
  | 'FACULTY_MEETING_MINUTES' // 3b - Biên bản họp Khoa
  | 'SUMMARY_CATALOG' // 4b - Danh mục tổng hợp
  | 'SCHOOL_EVALUATION' // 5b - Phiếu đánh giá cấp Trường
  | 'COUNCIL_MEETING_MINUTES' // 6b - Biên bản họp Hội đồng
  | 'REVISION_REQUEST' // 7b - Phiếu yêu cầu chỉnh sửa
  | 'FACULTY_ACCEPTANCE_EVAL' // 8b - Phiếu đánh giá nghiệm thu Khoa
  | 'FACULTY_ACCEPTANCE_MINUTES' // 9b - Biên bản nghiệm thu Khoa
  | 'FINAL_REPORT' // 10b - Báo cáo tổng kết
  | 'FACULTY_ACCEPTANCE_DECISION' // 11b - Quyết định nghiệm thu Khoa
  | 'SCHOOL_ACCEPTANCE_EVAL' // 12b - Phiếu đánh giá nghiệm thu Trường
  | 'SCHOOL_ACCEPTANCE_MINUTES' // 13b - Biên bản nghiệm thu Trường
  | 'SCHOOL_ACCEPTANCE_DECISION' // 14b - Quyết định nghiệm thu Trường
  | 'PRODUCT_LIST' // 15b - Danh sách sản phẩm
  | 'PRODUCT_APPENDIX' // 16b - Phụ lục sản phẩm
  | 'HANDOVER_CHECKLIST' // 17b - Biên bản bàn giao
  | 'EXTENSION_REQUEST'; // 18b - Đơn xin gia hạn

/**
 * Council member info
 */
export interface CouncilMember {
  ten: string;
  don_vi: string;
}

/**
 * Generate form request DTO
 */
export interface GenerateFormRequest {
  templateType: FormTemplateType;
  isPass?: boolean;
  isApproved?: boolean;
  evaluatorName?: string;
  soPhieuDongY?: number;
  soPhieuPhanDoi?: number;
  noiDungChinhSua?: string;
  noiDungBoSung?: string;
  noiDungKhongPhuHop?: string;
  revisionContent?: string;
  chuNhiem?: CouncilMember;
  hoiDong?: CouncilMember[];
  additionalData?: Record<string, unknown>;
  generatePdf?: boolean;
}

/**
 * Document info from database
 */
export interface FormDocument {
  id: string;
  proposalId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  sha256Hash: string;
  generatedBy: string;
  generatedAt: string;
}

/**
 * Form generation response from backend
 */
export interface FormGenerationResult {
  document: FormDocument;
  pdfPath?: string;
  docxUrl: string;
  pdfUrl?: string;
}

/**
 * Template info from FormEngine
 */
export interface FormEngineTemplate {
  type: FormTemplateType;
  name: string;
  description: string;
  available: boolean;
  size?: number;
}

/**
 * FormEngine health status
 */
export interface FormEngineHealth {
  available: boolean;
  version?: string;
  templatesCount?: number;
  libreofficeAvailable?: boolean;
}

/**
 * Form generation status
 */
export type FormGenerationStatus = 'idle' | 'generating' | 'success' | 'error';

/**
 * Form generation state
 */
export interface FormGenerationState {
  status: FormGenerationStatus;
  error?: string;
  result?: FormGenerationResult;
  progress?: number;
}

/**
 * Template descriptions (Vietnamese)
 */
export const TEMPLATE_DESCRIPTIONS: Record<FormTemplateType, string> = {
  PROPOSAL_OUTLINE: 'Phiếu đề xuất đề tài NCKH (Mẫu 1b)',
  EVALUATION_FORM: 'Phiếu đánh giá đề xuất (Mẫu 2b)',
  FACULTY_MEETING_MINUTES: 'Biên bản họp xét chọn Khoa (Mẫu 3b)',
  SUMMARY_CATALOG: 'Danh mục tổng hợp (Mẫu 4b)',
  SCHOOL_EVALUATION: 'Phiếu đánh giá cấp Trường (Mẫu 5b)',
  COUNCIL_MEETING_MINUTES: 'Biên bản họp Hội đồng (Mẫu 6b)',
  REVISION_REQUEST: 'Phiếu yêu cầu chỉnh sửa (Mẫu 7b)',
  FACULTY_ACCEPTANCE_EVAL: 'Phiếu đánh giá nghiệm thu Khoa (Mẫu 8b)',
  FACULTY_ACCEPTANCE_MINUTES: 'Biên bản nghiệm thu Khoa (Mẫu 9b)',
  FINAL_REPORT: 'Báo cáo tổng kết (Mẫu 10b)',
  FACULTY_ACCEPTANCE_DECISION: 'Quyết định nghiệm thu Khoa (Mẫu 11b)',
  SCHOOL_ACCEPTANCE_EVAL: 'Phiếu đánh giá nghiệm thu Trường (Mẫu 12b)',
  SCHOOL_ACCEPTANCE_MINUTES: 'Biên bản nghiệm thu Trường (Mẫu 13b)',
  SCHOOL_ACCEPTANCE_DECISION: 'Quyết định nghiệm thu Trường (Mẫu 14b)',
  PRODUCT_LIST: 'Danh sách sản phẩm (Mẫu 15b)',
  PRODUCT_APPENDIX: 'Phụ lục sản phẩm (Mẫu 16b)',
  HANDOVER_CHECKLIST: 'Biên bản bàn giao (Mẫu 17b)',
  EXTENSION_REQUEST: 'Đơn xin gia hạn (Mẫu 18b)',
};

/**
 * Template groups for UI organization
 */
export const TEMPLATE_GROUPS = {
  proposal: {
    label: 'Đề xuất & Đánh giá',
    templates: [
      'PROPOSAL_OUTLINE',
      'EVALUATION_FORM',
      'FACULTY_MEETING_MINUTES',
      'SUMMARY_CATALOG',
      'SCHOOL_EVALUATION',
      'COUNCIL_MEETING_MINUTES',
      'REVISION_REQUEST',
    ] as FormTemplateType[],
  },
  acceptance: {
    label: 'Nghiệm thu',
    templates: [
      'FACULTY_ACCEPTANCE_EVAL',
      'FACULTY_ACCEPTANCE_MINUTES',
      'FINAL_REPORT',
      'FACULTY_ACCEPTANCE_DECISION',
      'SCHOOL_ACCEPTANCE_EVAL',
      'SCHOOL_ACCEPTANCE_MINUTES',
      'SCHOOL_ACCEPTANCE_DECISION',
    ] as FormTemplateType[],
  },
  other: {
    label: 'Khác',
    templates: [
      'PRODUCT_LIST',
      'PRODUCT_APPENDIX',
      'HANDOVER_CHECKLIST',
      'EXTENSION_REQUEST',
    ] as FormTemplateType[],
  },
};
