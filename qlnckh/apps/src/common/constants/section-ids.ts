/**
 * Canonical Section IDs for Form Templates
 *
 * CRITICAL: These IDs must NEVER change meaning - they are referenced in:
 * - Revision requests (Epic 4 - CHANGES_REQUESTED state)
 * - Form field validation
 * - PDF export templates
 * - Data migration scripts
 *
 * When adding new sections:
 * - Always append at the end
 * - Use SEC_ prefix followed by descriptive name in PascalCase
 * - Never modify or remove existing section IDs
 *
 * @module common/constants/section-ids
 */

export const SECTION_IDS = {
  // Phase A: Proposal Forms (MAU_01B - MAU_07B)
  SEC_INFO_GENERAL: 'SEC_INFO_GENERAL',
  SEC_CONTENT_METHOD: 'SEC_CONTENT_METHOD',
  SEC_RESEARCH_METHOD: 'SEC_RESEARCH_METHOD',
  SEC_EXPECTED_RESULTS: 'SEC_EXPECTED_RESULTS',
  SEC_BUDGET: 'SEC_BUDGET',
  SEC_ATTACHMENTS: 'SEC_ATTACHMENTS',
  SEC_RESEARCHERS: 'SEC_RESEARCHERS',
  SEC_FACILITIES: 'SEC_FACILITIES',
  SEC_TIMELINE: 'SEC_TIMELINE',
  SEC_REFERENCES: 'SEC_REFERENCES',

  // Phase C: Faculty Acceptance (MAU_08B - MAU_11B)
  SEC_FACULTY_ACCEPTANCE_RESULTS: 'SEC_FACULTY_ACCEPTANCE_RESULTS',
  SEC_FACULTY_ACCEPTANCE_PRODUCTS: 'SEC_FACULTY_ACCEPTANCE_PRODUCTS',

  // Phase D: School Acceptance (MAU_12B - MAU_16B)
  SEC_SCHOOL_ACCEPTANCE_RESULTS: 'SEC_SCHOOL_ACCEPTANCE_RESULTS',
  SEC_SCHOOL_ACCEPTANCE_PRODUCTS: 'SEC_SCHOOL_ACCEPTANCE_PRODUCTS',

  // Phase E: Handover (MAU_17B)
  SEC_HANDOVER_CHECKLIST: 'SEC_HANDOVER_CHECKLIST',

  // Phase B: Extension (MAU_18B)
  SEC_EXTENSION_REASON: 'SEC_EXTENSION_REASON',
  SEC_EXTENSION_DURATION: 'SEC_EXTENSION_DURATION',

  // Adding new sections is OK
  // NEVER modify or remove existing section IDs
} as const;

export type SectionId = typeof SECTION_IDS[keyof typeof SECTION_IDS];

/**
 * Mapping of section IDs to Vietnamese labels
 */
export const SECTION_LABELS: Record<SectionId, string> = {
  SEC_INFO_GENERAL: 'Thông tin chung',
  SEC_CONTENT_METHOD: 'Nội dung nghiên cứu',
  SEC_RESEARCH_METHOD: 'Phương pháp nghiên cứu',
  SEC_EXPECTED_RESULTS: 'Kết quả mong đợi',
  SEC_BUDGET: 'Kinh phí',
  SEC_ATTACHMENTS: 'Tài liệu đính kèm',
  SEC_RESEARCHERS: 'Đội ngũ nghiên cứu',
  SEC_FACILITIES: 'Cơ sở vật chất',
  SEC_TIMELINE: 'Kế hoạch thời gian',
  SEC_REFERENCES: 'Tài liệu tham khảo',
  SEC_FACULTY_ACCEPTANCE_RESULTS: 'Kết quả nghiên cứu',
  SEC_FACULTY_ACCEPTANCE_PRODUCTS: 'Sản phẩm nghiên cứu',
  SEC_SCHOOL_ACCEPTANCE_RESULTS: 'Kết quả nghiên cứu',
  SEC_SCHOOL_ACCEPTANCE_PRODUCTS: 'Sản phẩm nghiên cứu',
  SEC_HANDOVER_CHECKLIST: 'Checklist bàn giao',
  SEC_EXTENSION_REASON: 'Lý do gia hạn',
  SEC_EXTENSION_DURATION: 'Thời gian gia hạn',
};

/**
 * Mapping of section IDs to React component names
 */
export const SECTION_COMPONENTS: Record<SectionId, string> = {
  SEC_INFO_GENERAL: 'InfoGeneralSection',
  SEC_CONTENT_METHOD: 'ContentMethodSection',
  SEC_RESEARCH_METHOD: 'ResearchMethodSection',
  SEC_EXPECTED_RESULTS: 'ExpectedResultsSection',
  SEC_BUDGET: 'BudgetSection',
  SEC_ATTACHMENTS: 'AttachmentsSection',
  SEC_RESEARCHERS: 'ResearchersSection',
  SEC_FACILITIES: 'FacilitiesSection',
  SEC_TIMELINE: 'TimelineSection',
  SEC_REFERENCES: 'ReferencesSection',
  SEC_FACULTY_ACCEPTANCE_RESULTS: 'FacultyAcceptanceResultsSection',
  SEC_FACULTY_ACCEPTANCE_PRODUCTS: 'FacultyAcceptanceProductsSection',
  SEC_SCHOOL_ACCEPTANCE_RESULTS: 'SchoolAcceptanceResultsSection',
  SEC_SCHOOL_ACCEPTANCE_PRODUCTS: 'SchoolAcceptanceProductsSection',
  SEC_HANDOVER_CHECKLIST: 'HandoverChecklistSection',
  SEC_EXTENSION_REASON: 'ExtensionReasonSection',
  SEC_EXTENSION_DURATION: 'ExtensionDurationSection',
};

/**
 * Default sections for each form template
 */
export const FORM_TEMPLATE_SECTIONS: Record<string, SectionId[]> = {
  MAU_01B: [
    'SEC_INFO_GENERAL',
    'SEC_CONTENT_METHOD',
    'SEC_RESEARCH_METHOD',
    'SEC_EXPECTED_RESULTS',
    'SEC_BUDGET',
    'SEC_ATTACHMENTS',
    'SEC_RESEARCHERS',
    'SEC_FACILITIES',
    'SEC_TIMELINE',
    'SEC_REFERENCES',
  ],
  MAU_02B: [
    'SEC_INFO_GENERAL',
    'SEC_CONTENT_METHOD',
    'SEC_RESEARCH_METHOD',
    'SEC_EXPECTED_RESULTS',
    'SEC_BUDGET',
    'SEC_ATTACHMENTS',
    'SEC_RESEARCHERS',
    'SEC_FACILITIES',
    'SEC_TIMELINE',
  ],
  // Additional templates will be added in seed data
};
