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
/**
 * Available form for current user (from role + state filtering)
 */
export interface AvailableForm {
  formType: string;
  name: string;
  description: string;
  phase: string;
  isRequired: boolean;
  isGenerated: boolean;
  documentId?: string;
}

/**
 * Response from getAvailableForms API
 */
export interface AvailableFormsResponse {
  available: AvailableForm[];
  proposalState: string;
  canCreateForms: boolean;
}

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

// =====================================================
// Form Engine Direct Integration Types
// =====================================================

/**
 * Template info từ Form Engine service
 * Returned by GET /api/v1/forms/templates
 */
export interface EngineTemplate {
  name: string;           // e.g., "1b.docx"
  path?: string;          // Full path (may be omitted)
  size: number;           // file size in bytes
  modified: string;       // ISO date string
  variables?: string[];   // extracted variables (optional)
}

/**
 * Result từ generate-test endpoint
 */
export interface GenerateTestResult {
  formId: string;
  isApproved: boolean;
  docx_path: string;
  pdf_path?: string;
  docx_url: string;
  pdf_url?: string;
  sha256_docx: string;
  sha256_pdf?: string;
  template: string;
  timestamp: string;
  user_id: string;
  proposal_id?: string;
}

/**
 * Request body cho generate-test
 */
export interface GenerateTestRequest {
  formId: string;
  isApproved?: boolean;   // cho checkbox forms (Đạt/Không đạt)
}

/**
 * Valid form IDs for Form Engine
 */
export const VALID_FORM_IDS = [
  '1b', '2b', '3b', '4b', '5b', '6b', '7b', '8b', '9b',
  '10b', '11b', '12b', '13b', '14b', '15b', '16b', '17b', '18b',
  'pl1', 'pl2', 'pl3', 'phuluc',
] as const;

export type ValidFormId = typeof VALID_FORM_IDS[number];

/**
 * Form ID descriptions (Vietnamese)
 */
export const FORM_ID_DESCRIPTIONS: Record<string, string> = {
  '1b': 'Phiếu đề xuất đề tài NCKH',
  '2b': 'Phiếu đánh giá đề xuất',
  '3b': 'Biên bản họp xét chọn Khoa',
  '4b': 'Danh mục tổng hợp',
  '5b': 'Phiếu đánh giá cấp Trường',
  '6b': 'Biên bản họp Hội đồng',
  '7b': 'Phiếu yêu cầu chỉnh sửa',
  '8b': 'Phiếu đánh giá nghiệm thu Khoa',
  '9b': 'Biên bản nghiệm thu Khoa',
  '10b': 'Báo cáo tổng kết',
  '11b': 'Quyết định nghiệm thu Khoa',
  '12b': 'Phiếu đánh giá nghiệm thu Trường',
  '13b': 'Biên bản nghiệm thu Trường',
  '14b': 'Quyết định nghiệm thu Trường',
  '15b': 'Danh sách sản phẩm',
  '16b': 'Phụ lục sản phẩm',
  '17b': 'Biên bản bàn giao',
  '18b': 'Đơn xin gia hạn',
  'pl1': 'Phụ lục 1',
  'pl2': 'Phụ lục 2',
  'pl3': 'Phụ lục 3',
  'phuluc': 'Phụ lục chung',
};

/**
 * ProposalDocument - Biểu mẫu NCKH đã tạo
 */
export interface ProposalDocument {
  id: string;
  proposalId: string;
  formType: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'FINALIZED';
  version: number;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  sha256Hash?: string;
  formData?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

/**
 * Mapping FormType -> Tên tiếng Việt
 */
export const FORM_TYPE_NAMES: Record<string, string> = {
  FORM_1B: 'Phiếu đề xuất (1B)',
  FORM_PL1: 'Đề cương chi tiết (PL1)',
  FORM_2B: 'Phiếu đánh giá Khoa (2B)',
  FORM_3B: 'Biên bản họp Khoa (3B)',
  FORM_4B: 'Danh mục tổng hợp (4B)',
  FORM_5B: 'Biên bản xét chọn Trường (5B)',
  FORM_6B: 'Biên bản Hội đồng (6B)',
  FORM_7B: 'Báo cáo hoàn thiện (7B)',
  FORM_8B: 'Đề nghị lập HĐ NT Khoa (8B)',
  FORM_9B: 'Phiếu đánh giá NT Khoa (9B)',
  FORM_10B: 'Biên bản họp NT Khoa (10B)',
  FORM_11B: 'Báo cáo hoàn thiện NT Khoa (11B)',
  FORM_PL2: 'Báo cáo tổng kết (PL2)',
  FORM_12B: 'Nhận xét phản biện (12B)',
  FORM_13B: 'Đề nghị lập HĐ NT Trường (13B)',
  FORM_14B: 'Phiếu đánh giá NT Trường (14B)',
  FORM_15B: 'Biên bản họp NT Trường (15B)',
  FORM_16B: 'Báo cáo hoàn thiện NT Trường (16B)',
  FORM_PL3: 'Nhận xét phản biện chi tiết (PL3)',
  FORM_17B: 'Biên bản giao nhận (17B)',
  FORM_18B: 'Đơn xin gia hạn (18B)',
};

/**
 * Mapping trạng thái -> các biểu mẫu được tạo ở trạng thái đó
 * Dùng để lọc hiển thị biểu mẫu của các trạng thái đã qua
 */
export const STATE_FORM_MAPPING: Record<string, string[]> = {
  DRAFT: ['FORM_1B', 'FORM_PL1'],
  FACULTY_REVIEW: ['FORM_2B', 'FORM_3B', 'FORM_4B'],
  SCHOOL_SELECTION_REVIEW: ['FORM_5B'],
  OUTLINE_COUNCIL_REVIEW: ['FORM_6B', 'FORM_7B'],
  IN_PROGRESS: ['FORM_18B'],
  FACULTY_ACCEPTANCE_REVIEW: ['FORM_8B', 'FORM_9B', 'FORM_10B', 'FORM_11B', 'FORM_PL2'],
  SCHOOL_ACCEPTANCE_REVIEW: ['FORM_12B', 'FORM_13B', 'FORM_14B', 'FORM_15B', 'FORM_16B', 'FORM_PL3'],
  HANDOVER: ['FORM_17B'],
};

/**
 * Thứ tự các trạng thái trong quy trình
 */
export const STATE_ORDER: string[] = [
  'DRAFT',
  'FACULTY_REVIEW',
  'SCHOOL_SELECTION_REVIEW',
  'OUTLINE_COUNCIL_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'IN_PROGRESS',
  'FACULTY_ACCEPTANCE_REVIEW',
  'SCHOOL_ACCEPTANCE_REVIEW',
  'HANDOVER',
  'COMPLETED',
];
