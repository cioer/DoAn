/**
 * Return Reason Code Enum (Story 4.2)
 *
 * Standardized reason codes for faculty returning proposals to PI.
 * These codes are used for both validation and UI display.
 *
 * IMPORTANT: Keep in sync with frontend RETURN_REASON_CODES in
 * web-apps/src/lib/api/workflow.ts
 */
export enum ReturnReasonCode {
  /** Thiếu tài liệu */
  THIEU_TAI_LIEU = 'THIEU_TAI_LIEU',
  /** Nội dung không rõ ràng */
  NOI_DUNG_KHONG_RO_RANG = 'NOI_DUNG_KHONG_RO_RANG',
  /** Phương pháp không khả thi */
  PHUONG_PHAP_KHONG_KHA_THI = 'PHUONG_PHAP_KHONG_KHA_THI',
  /** Kinh phí không hợp lý */
  KINH_PHI_KHONG_HOP_LE = 'KINH_PHI_KHONG_HOP_LE',
  /** Khác */
  KHAC = 'KHAC',
}

/**
 * Human-readable labels for return reason codes (Vietnamese)
 */
export const RETURN_REASON_LABELS: Record<ReturnReasonCode, string> = {
  [ReturnReasonCode.THIEU_TAI_LIEU]: 'Thiếu tài liệu',
  [ReturnReasonCode.NOI_DUNG_KHONG_RO_RANG]: 'Nội dung không rõ ràng',
  [ReturnReasonCode.PHUONG_PHAP_KHONG_KHA_THI]: 'Phương pháp không khả thi',
  [ReturnReasonCode.KINH_PHI_KHONG_HOP_LE]: 'Kinh phí không hợp lý',
  [ReturnReasonCode.KHAC]: 'Khác',
};

/**
 * Canonical Section IDs for revision tracking (Story 4.2)
 *
 * These sections align with the proposal form structure.
 * When faculty returns a proposal, they select which sections need revision.
 */
export enum CanonicalSectionId {
  INFO_GENERAL = 'SEC_INFO_GENERAL',
  CONTENT_METHOD = 'SEC_CONTENT_METHOD',
  METHOD = 'SEC_METHOD',
  EXPECTED_RESULTS = 'SEC_EXPECTED_RESULTS',
  BUDGET = 'SEC_BUDGET',
  ATTACHMENTS = 'SEC_ATTACHMENTS',
}

/**
 * Human-readable labels for canonical sections (Vietnamese)
 */
export const CANONICAL_SECTION_LABELS: Record<CanonicalSectionId, string> = {
  [CanonicalSectionId.INFO_GENERAL]: 'Thông tin chung',
  [CanonicalSectionId.CONTENT_METHOD]: 'Nội dung nghiên cứu',
  [CanonicalSectionId.METHOD]: 'Phương pháp nghiên cứu',
  [CanonicalSectionId.EXPECTED_RESULTS]: 'Kết quả mong đợi',
  [CanonicalSectionId.BUDGET]: 'Kinh phí',
  [CanonicalSectionId.ATTACHMENTS]: 'Tài liệu đính kèm',
};
