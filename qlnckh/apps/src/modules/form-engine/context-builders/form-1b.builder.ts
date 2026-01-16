/**
 * Form 1b Context Builder
 *
 * Phiếu đề xuất đề tài NCKH (Proposal Form)
 * Used in: DRAFT state
 */

import {
  ProposalContextInput,
  getBaseContext,
  getDateLine,
} from './base.builder';

/**
 * Build context for Form 1b (Proposal Outline)
 */
export function buildForm1bContext(
  input: ProposalContextInput,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,

    // Form-specific fields (Vietnamese field names match frontend Form1bData)
    tinh_cap_thiet: formData.tinh_cap_thiet || formData.urgency || '',
    muc_tieu_de_tai: formData.muc_tieu_de_tai || formData.objectives || formData.muc_tieu || '',
    noi_dung_chinh: formData.noi_dung_chinh || formData.mainContent || '',
    ket_qua_du_kien: formData.ket_qua_du_kien || formData.expectedResults || '',
    kha_nang_va_dia_chi_ung_dung:
      formData.kha_nang_va_dia_chi_ung_dung || formData.applicationAddress || formData.kha_nang_ung_dung || '',
    du_kien_hieu_qua_tuong_lai:
      formData.du_kien_hieu_qua_tuong_lai || formData.futureEfficiency || formData.hieu_qua_tuong_lai || '',

    // Timeline
    thoi_gian_bat_dau: formData.thoi_gian_bat_dau || input.startDate || '',
    thoi_gian_ket_thuc: formData.thoi_gian_ket_thuc || input.endDate || '',
    thoi_gian_thuc_hien: formData.thoi_gian_thuc_hien || input.duration || '12 tháng',

    // Budget (Vietnamese field name from frontend Form1bData)
    nhu_cau_kinh_phi_du_kien:
      formData.nhu_cau_kinh_phi_du_kien || input.budgetTotal || formData.kinh_phi || '',

    // Signature
    ten_ca_nha_de_xuat: input.ownerName || '',
    diadiem_thoigian: getDateLine(),
  };
}
