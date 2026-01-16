/**
 * Form 2b Context Builder
 *
 * Phiếu đánh giá đề xuất (Evaluation Form)
 * Used in: FACULTY_REVIEW state
 */

import {
  ProposalContextInput,
  getBaseContext,
  getCheckbox,
} from './base.builder';

/**
 * Build context for Form 2b (Evaluation Form)
 */
export function buildForm2bContext(
  input: ProposalContextInput,
  evaluatorName?: string,
  isPass = true,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,

    // Evaluator info
    ten_nguoi_danh_gia: evaluatorName || input.councilSecretary || '',
    ten_nguoi_de_xuat: input.ownerName || '',
    don_vi_chu_tri: input.facultyName || '',

    // Meeting info
    thoi_gian_hop: formData.meeting_time || '',
    dia_diem: formData.meeting_location || 'Phòng họp Khoa',

    // Evaluation scores
    diem_noi_dung_khoa_hoc: input.evaluationScientificContentScore || 0,
    nhan_xet_noi_dung: input.evaluationScientificContentComments || '',
    diem_phuong_phap: input.evaluationResearchMethodScore || 0,
    nhan_xet_phuong_phap: input.evaluationResearchMethodComments || '',
    diem_tinh_kha_thi: input.evaluationFeasibilityScore || 0,
    nhan_xet_kha_thi: input.evaluationFeasibilityComments || '',
    diem_kinh_phi: input.evaluationBudgetScore || 0,
    nhan_xet_kinh_phi: input.evaluationBudgetComments || '',
    y_kien_khac: input.evaluationOtherComments || '',
    ket_luan: input.evaluationConclusion || '',

    // Checkbox results - Use ASCII [x]/[ ] to avoid font issues
    dat: isPass ? 'x' : ' ',
    ko_dat: isPass ? ' ' : 'x',

    // Recommendation checkboxes (Unicode style for display)
    box_de_nghi: getCheckbox(isPass),
    box_khong_de_nghi: getCheckbox(!isPass),
  };
}
