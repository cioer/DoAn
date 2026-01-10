/**
 * Reject Reason Code Enum
 * Story 9.2: Reject Action
 *
 * Defines standardized reason codes for proposal rejection.
 */
export enum RejectReasonCode {
  NOT_SCIENTIFIC = 'NOT_SCIENTIFIC',
  NOT_FEASIBLE = 'NOT_FEASIBLE',
  BUDGET_UNREASONABLE = 'BUDGET_UNREASONABLE',
  NOT_COMPLIANT = 'NOT_COMPLIANT',
  OTHER = 'OTHER',
}

/**
 * Vietnamese labels for reject reason codes
 */
export const REJECT_REASON_LABELS: Record<RejectReasonCode, string> = {
  [RejectReasonCode.NOT_SCIENTIFIC]: 'Không đạt tiêu chuẩn khoa học',
  [RejectReasonCode.NOT_FEASIBLE]: 'Nội dung không khả thi',
  [RejectReasonCode.BUDGET_UNREASONABLE]: 'Kinh phí không hợp lý',
  [RejectReasonCode.NOT_COMPLIANT]: 'Không phù hợp quy định',
  [RejectReasonCode.OTHER]: 'Khác',
} as const;

/**
 * Vietnamese descriptions for reject reason codes
 */
export const REJECT_REASON_DESCRIPTIONS: Record<RejectReasonCode, string> = {
  [RejectReasonCode.NOT_SCIENTIFIC]:
    'Đề tài không đạt yêu cầu về tính mới, tính khoa học hoặc giá trị thực tiễn',
  [RejectReasonCode.NOT_FEASIBLE]:
    'Phương pháp nghiên cứu không khả thi với nguồn lực và thời gian hiện có',
  [RejectReasonCode.BUDGET_UNREASONABLE]:
    'Kinh phí đề xuất không hợp lý, không tương xứng với quy mô đề tài',
  [RejectReasonCode.NOT_COMPLIANT]:
    'Đề tài không tuân thủ các quy định và quy định hiện hành',
  [RejectReasonCode.OTHER]:
    'Lý do khác được nêu chi tiết trong phần giải thích',
} as const;
