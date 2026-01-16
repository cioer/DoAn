/**
 * Generic Form Context Builders
 *
 * Builders for forms 7b-18b that follow similar patterns
 * with checkbox-based results and standard fields.
 */

import {
  ProposalContextInput,
  getBaseContext,
  getCheckbox,
  getCurrentDateComponents,
} from './base.builder';

/**
 * Build context for Form 7b (Revision Request)
 * Phiếu yêu cầu chỉnh sửa
 */
export function buildForm7bContext(
  input: ProposalContextInput,
  revisionContent?: string,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,
    noi_dung_yeu_cau_chinh_sua:
      revisionContent || formData.revision_content || '',
    ly_do: formData.revision_reason || '',
    thoi_han_chinh_sua: formData.revision_deadline || '7 ngày',
    ten_nguoi_yeu_cau: input.councilSecretary || '',
  };
}

/**
 * Build context for Form 8b (Faculty Acceptance Evaluation)
 * Phiếu đánh giá nghiệm thu cấp Khoa
 */
export function buildForm8bContext(
  input: ProposalContextInput,
  isPass = true,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,
    ten_nguoi_danh_gia: input.councilSecretary || '',
    ket_qua_nghiem_thu: input.acceptanceResults || '',
    san_pham: input.acceptanceProducts || '',
    nhan_xet_chung: formData.general_comments || '',
    box_dat: getCheckbox(isPass),
    box_khong_dat: getCheckbox(!isPass),
    so_phieu_dat: formData.pass_votes || '5',
    so_phieu_khong_dat: formData.fail_votes || '0',
  };
}

/**
 * Build context for Form 9b (Faculty Acceptance Minutes)
 * Biên bản nghiệm thu cấp Khoa
 */
export function buildForm9bContext(
  input: ProposalContextInput,
  isPass = true,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;
  const dateComponents = getCurrentDateComponents();

  return {
    ...base,
    thoi_gian_hop: formData.meeting_time || '',
    dia_diem: formData.meeting_location || 'Phòng họp Khoa',
    co_mat_tren_tong: formData.attendance || '05/05',
    ket_qua_bo_phieu: isPass ? 'Đạt' : 'Không đạt',
    box_dat: getCheckbox(isPass),
    box_khong_dat: getCheckbox(!isPass),
    ten_chu_tich: input.councilChair || '',
    ten_thu_ky: input.councilSecretary || '',
    ngay: dateComponents.ngay,
    thang: dateComponents.thang,
    nam: dateComponents.nam,
  };
}

/**
 * Build context for Form 10b (Final Report)
 * Báo cáo tổng kết đề tài
 */
export function buildForm10bContext(
  input: ProposalContextInput,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,
    tom_tat_de_tai: formData.summary || '',
    ket_qua_dat_duoc: input.acceptanceResults || formData.results || '',
    san_pham_khoa_hoc: input.acceptanceProducts || formData.products || '',
    danh_gia_muc_do_hoan_thanh: formData.completion_level || '',
    kien_nghi: formData.recommendations || '',
    thoi_gian_bat_dau: input.startDate || '',
    thoi_gian_ket_thuc: input.endDate || '',
    tong_kinh_phi: input.budgetTotal || '',
    kinh_phi_da_su_dung: input.budgetUsed || '',
  };
}

/**
 * Build context for Form 11b (Faculty Acceptance Decision)
 * Quyết định nghiệm thu cấp Khoa
 */
export function buildForm11bContext(
  input: ProposalContextInput,
  isPass = true,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,
    qd_so: formData.qd_so || '',
    ket_qua: isPass ? 'Đạt' : 'Không đạt',
    box_dat: getCheckbox(isPass),
    box_khong_dat: getCheckbox(!isPass),
    ten_truong_khoa: formData.faculty_head || '',
    ngay_quyet_dinh: input.acceptanceDate || '',
  };
}

/**
 * Build context for Form 12b (School Acceptance Evaluation)
 * Phiếu đánh giá nghiệm thu cấp Trường
 */
export function buildForm12bContext(
  input: ProposalContextInput,
  isPass = true,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,
    ten_nguoi_danh_gia: input.councilSecretary || '',
    ket_qua_nghiem_thu: input.acceptanceResults || '',
    san_pham: input.acceptanceProducts || '',
    box_dat: getCheckbox(isPass),
    box_khong_dat: getCheckbox(!isPass),
    so_phieu_dat: formData.pass_votes || '5',
    so_phieu_khong_dat: formData.fail_votes || '0',
  };
}

/**
 * Build context for Form 13b (School Acceptance Minutes)
 * Biên bản nghiệm thu cấp Trường
 */
export function buildForm13bContext(
  input: ProposalContextInput,
  isPass = true,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;
  const dateComponents = getCurrentDateComponents();

  return {
    ...base,
    thoi_gian_hop: formData.meeting_time || '',
    dia_diem: formData.meeting_location || 'Phòng họp Trường',
    co_mat_tren_tong: formData.attendance || '07/07',
    ket_qua_bo_phieu: isPass ? 'Đạt' : 'Không đạt',
    box_dat: getCheckbox(isPass),
    box_khong_dat: getCheckbox(!isPass),
    ten_chu_tich_hoi_dong: input.councilChair || '',
    ten_thu_ky_hoi_dong: input.councilSecretary || '',
    ngay: dateComponents.ngay,
    thang: dateComponents.thang,
    nam: dateComponents.nam,
  };
}

/**
 * Build context for Form 14b (School Acceptance Decision)
 * Quyết định nghiệm thu cấp Trường
 */
export function buildForm14bContext(
  input: ProposalContextInput,
  isPass = true,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;

  return {
    ...base,
    qd_so: formData.qd_so || '',
    ket_qua: isPass ? 'Đạt' : 'Không đạt',
    box_dat: getCheckbox(isPass),
    box_khong_dat: getCheckbox(!isPass),
    ten_hieu_truong: formData.principal || '',
    ngay_quyet_dinh: input.acceptanceDate || '',
  };
}

/**
 * Build context for Form 17b (Handover Checklist)
 * Biên bản bàn giao hồ sơ
 */
export function buildForm17bContext(
  input: ProposalContextInput,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;
  const dateComponents = getCurrentDateComponents();

  return {
    ...base,
    ngay_ban_giao: input.handoverDate || dateComponents.currentDate,
    danh_sach_ho_so: input.handoverChecklist || formData.checklist || '',
    ten_nguoi_ban_giao: input.ownerName || '',
    ten_nguoi_nhan: formData.receiver || '',
    ghi_chu: formData.notes || '',
    ngay: dateComponents.ngay,
    thang: dateComponents.thang,
    nam: dateComponents.nam,
  };
}

/**
 * Build context for Form 18b (Extension Request)
 * Đơn xin gia hạn
 */
export function buildForm18bContext(
  input: ProposalContextInput,
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;
  const dateComponents = getCurrentDateComponents();

  return {
    ...base,
    ly_do_gia_han: formData.extension_reason || '',
    thoi_gian_gia_han: formData.extension_duration || '3 tháng',
    ngay_ket_thuc_cu: input.endDate || '',
    ngay_ket_thuc_moi: formData.new_end_date || '',
    cam_ket: formData.commitment || 'Tôi cam kết hoàn thành đề tài đúng thời hạn gia hạn.',
    ngay: dateComponents.ngay,
    thang: dateComponents.thang,
    nam: dateComponents.nam,
  };
}
