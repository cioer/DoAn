import { SectionId } from '@prisma/client';

/**
 * Canonical Section IDs for Proposal Form Data
 * Story 2.6: Type-safe form data structure with backward compatibility
 *
 * These match the SectionId enum in Prisma schema and define the structure
 * of form_data JSON stored in proposals table.
 */

// ============================================================================
// Section Data Types
// ============================================================================

/**
 * General Information Section (SEC_INFO_GENERAL)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface InfoGeneralSection {
  projectName: string;           // Tên đề tài
  researchField: string;         // Lĩnh vực nghiên cứu
  executionTime: string;         // Thời gian thực hiện
  principalInvestigator?: string; // Chủ nhiệm đề tài
  coInvestigators?: string[];   // Các thành viên tham gia
  address?: string;              // Địa chỉ thực hiện
  phone?: string;                // Điện thoại liên hệ
}

/**
 * Content and Method Section (SEC_CONTENT_METHOD)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface ContentMethodSection {
  scientificContent?: string;    // Nội dung khoa học
  researchMethod?: string;       // Phương pháp nghiên cứu
  theoreticalBasis?: string;     // Cơ sở lý luận
  implementationPlan?: string;   // Kế hoạch thực hiện
}

/**
 * Research Method Section (SEC_RESEARCH_METHOD)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface ResearchMethodSection {
  methodology?: string;          // Phương pháp nghiên cứu
  sampleSize?: number;           // Quy mô mẫu
  dataCollection?: string;       // Phương pháp thu thập dữ liệu
  dataAnalysis?: string;         // Phương pháp phân tích dữ liệu
}

/**
 * Expected Results Section (SEC_EXPECTED_RESULTS)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface ExpectedResultsSection {
  expectedProducts: string[];    // Sản phẩm mong đợi
  scientificOutput?: string;     // Đầu ra khoa học
  practicalApplication?: string; // Ứng dụng thực tiễn
  publications?: {              // Công bố khoa học
    journal?: string;
    quantity?: number;
  };
}

/**
 * Budget Section (SEC_BUDGET)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface BudgetSection {
  totalBudget: number;           // Tổng kinh phí
  budgetBreakdown: BudgetItem[]; // Chi tiết kinh phí
  fundingSource?: string;        // Nguồn kinh phí
}

export interface BudgetItem {
  category: string;              // Hạng mục chi phí
  amount: number;                // Số tiền
  description?: string;          // Ghi chú
}

/**
 * Attachments Section (SEC_ATTACHMENTS)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface AttachmentsSection {
  requiredDocuments: string[];   // Tài liệu bắt buộc
  additionalDocuments?: string[]; // Tài liệu bổ sung
  cvUrls?: string[];             // Link CV thành viên
}

/**
 * Researchers Section (SEC_RESEARCHERS)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface ResearchersSection {
  principalInvestigator: Researcher;
  coResearchers?: Researcher[];
  students?: Researcher[];
}

export interface Researcher {
  name: string;
  email?: string;
  phone?: string;
  qualification?: string;
  role?: string;
}

/**
 * Facilities Section (SEC_FACILITIES)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface FacilitiesSection {
  laboratory?: string;           // Phòng thí nghiệm
  equipment?: string[];          // Thiết bị
  otherFacilities?: string[];    // Cơ sở vật chất khác
}

/**
 * Timeline Section (SEC_TIMELINE)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface TimelineSection {
  milestones: Milestone[];
  startDate?: string;            // Ngày bắt đầu
  endDate?: string;              // Ngày kết thúc
}

export interface Milestone {
  name: string;
  targetDate: string;
  deliverables?: string[];
}

/**
 * References Section (SEC_REFERENCES)
 * Phase A: Proposal Forms (MAU_01B)
 */
export interface ReferencesSection {
  references: Reference[];
}

export interface Reference {
  authors?: string;
  title: string;
  year?: number;
  source?: string;
}

// ============================================================================
// Phase C: Faculty Acceptance Sections
// ============================================================================

/**
 * Faculty Acceptance Results Section (SEC_FACULTY_ACCEPTANCE_RESULTS)
 * Phase C: Faculty Acceptance (MAU_08B - MAU_11B)
 */
export interface FacultyAcceptanceResultsSection {
  implementationSummary?: string;
  outcomes?: string;
  deviations?: string;
  completionPercentage?: number;
}

/**
 * Faculty Acceptance Products Section (SEC_FACULTY_ACCEPTANCE_PRODUCTS)
 * Phase C: Faculty Acceptance (MAU_08B - MAU_11B)
 */
export interface FacultyAcceptanceProductsSection {
  products: Product[];
  deliveredProducts?: Product[];
}

export interface Product {
  name: string;
  type: string;
  quantity?: number;
  description?: string;
}

// ============================================================================
// Phase D: School Acceptance Sections
// ============================================================================

/**
 * School Acceptance Results Section (SEC_SCHOOL_ACCEPTANCE_RESULTS)
 * Phase D: School Acceptance (MAU_12B - MAU_16B)
 */
export interface SchoolAcceptanceResultsSection {
  facultyAcceptanceNote?: string;
  schoolReviewNote?: string;
  finalRecommendation?: string;
}

/**
 * School Acceptance Products Section (SEC_SCHOOL_ACCEPTANCE_PRODUCTS)
 * Phase D: School Acceptance (MAU_12B - MAU_16B)
 */
export interface SchoolAcceptanceProductsSection {
  verifiedProducts: Product[];
  additionalNotes?: string;
}

// ============================================================================
// Phase E: Handover Section
// ============================================================================

/**
 * Handover Checklist Section (SEC_HANDOVER_CHECKLIST)
 * Phase E: Handover (MAU_17B)
 */
export interface HandoverChecklistSection {
  reportIncluded?: boolean;
  sourceCodeIncluded?: boolean;
  documentsIncluded?: boolean;
  otherItems?: string[];
  handoverNotes?: string;
}

// ============================================================================
// Phase B: Extension Sections
// ============================================================================

/**
 * Extension Reason Section (SEC_EXTENSION_REASON)
 * Phase B: Extension (MAU_18B)
 */
export interface ExtensionReasonSection {
  reason?: string;
  justification?: string;
  unforeseenCircumstances?: string;
}

/**
 * Extension Duration Section (SEC_EXTENSION_DURATION)
 * Phase B: Extension (MAU_18B)
 */
export interface ExtensionDurationSection {
  additionalMonths?: number;
  newEndDate?: string;
  resourceRequirements?: string;
}

// ============================================================================
// Master Form Data Type
// ============================================================================

/**
 * Proposal Form Data Structure
 * Story 2.6: Canonical section IDs with backward compatibility
 *
 * This structure allows:
 * - Type-safe access to form data sections
 * - Backward compatibility when new sections are added
 * - Template versioning support
 */
export interface ProposalFormData {
  // Phase A: Proposal Forms
  [SectionId.SEC_INFO_GENERAL]?: InfoGeneralSection;
  [SectionId.SEC_CONTENT_METHOD]?: ContentMethodSection;
  [SectionId.SEC_RESEARCH_METHOD]?: ResearchMethodSection;
  [SectionId.SEC_EXPECTED_RESULTS]?: ExpectedResultsSection;
  [SectionId.SEC_BUDGET]?: BudgetSection;
  [SectionId.SEC_ATTACHMENTS]?: AttachmentsSection;
  [SectionId.SEC_RESEARCHERS]?: ResearchersSection;
  [SectionId.SEC_FACILITIES]?: FacilitiesSection;
  [SectionId.SEC_TIMELINE]?: TimelineSection;
  [SectionId.SEC_REFERENCES]?: ReferencesSection;

  // Phase C: Faculty Acceptance
  [SectionId.SEC_FACULTY_ACCEPTANCE_RESULTS]?: FacultyAcceptanceResultsSection;
  [SectionId.SEC_FACULTY_ACCEPTANCE_PRODUCTS]?: FacultyAcceptanceProductsSection;

  // Phase D: School Acceptance
  [SectionId.SEC_SCHOOL_ACCEPTANCE_RESULTS]?: SchoolAcceptanceResultsSection;
  [SectionId.SEC_SCHOOL_ACCEPTANCE_PRODUCTS]?: SchoolAcceptanceProductsSection;

  // Phase E: Handover
  [SectionId.SEC_HANDOVER_CHECKLIST]?: HandoverChecklistSection;

  // Phase B: Extension
  [SectionId.SEC_EXTENSION_REASON]?: ExtensionReasonSection;
  [SectionId.SEC_EXTENSION_DURATION]?: ExtensionDurationSection;

  // Allow additional sections for future template versions (backward compatibility)
  [key: string]: unknown;
}

/**
 * Section ID type for type-safe form data access
 */
export type SectionIdType = `${SectionId}`;

/**
 * Helper type to extract section data type from section ID
 */
export type SectionDataType<T extends SectionId> = T extends 'SEC_INFO_GENERAL'
  ? InfoGeneralSection
  : T extends 'SEC_CONTENT_METHOD'
  ? ContentMethodSection
  : T extends 'SEC_RESEARCH_METHOD'
  ? ResearchMethodSection
  : T extends 'SEC_EXPECTED_RESULTS'
  ? ExpectedResultsSection
  : T extends 'SEC_BUDGET'
  ? BudgetSection
  : T extends 'SEC_ATTACHMENTS'
  ? AttachmentsSection
  : T extends 'SEC_RESEARCHERS'
  ? ResearchersSection
  : T extends 'SEC_FACILITIES'
  ? FacilitiesSection
  : T extends 'SEC_TIMELINE'
  ? TimelineSection
  : T extends 'SEC_REFERENCES'
  ? ReferencesSection
  : T extends 'SEC_FACULTY_ACCEPTANCE_RESULTS'
  ? FacultyAcceptanceResultsSection
  : T extends 'SEC_FACULTY_ACCEPTANCE_PRODUCTS'
  ? FacultyAcceptanceProductsSection
  : T extends 'SEC_SCHOOL_ACCEPTANCE_RESULTS'
  ? SchoolAcceptanceResultsSection
  : T extends 'SEC_SCHOOL_ACCEPTANCE_PRODUCTS'
  ? SchoolAcceptanceProductsSection
  : T extends 'SEC_HANDOVER_CHECKLIST'
  ? HandoverChecklistSection
  : T extends 'SEC_EXTENSION_REASON'
  ? ExtensionReasonSection
  : T extends 'SEC_EXTENSION_DURATION'
  ? ExtensionDurationSection
  : Record<string, unknown>;
