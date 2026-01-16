/**
 * Form 6b Context Builder
 *
 * Biên bản họp Hội đồng (Council Meeting Minutes)
 * Used in: OUTLINE_COUNCIL_REVIEW state
 */

import {
  ProposalContextInput,
  getBaseContext,
  getCheckbox,
  getCurrentDateComponents,
} from './base.builder';

/**
 * Build context for Form 6b (Council Meeting Minutes)
 */
export function buildForm6bContext(
  input: ProposalContextInput,
  options?: {
    isApproved?: boolean;
    noiDungDaChinhSua?: string;
    noiDungBoSung?: string;
    noiDungKhongPhuHop?: string;
  },
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;
  const dateComponents = getCurrentDateComponents();

  const isApproved = options?.isApproved ?? true;

  return {
    ...base,

    // Decision reference
    qd_so: formData.qd_so || '',
    qd_sp: formData.qd_so || '',
    QD_so: formData.qd_so || '',

    // Meeting info
    thoi_gian_hop: formData.meeting_time || '',
    thoi_gian_ket_thuc: formData.meeting_end_time || '',
    dia_diem: formData.meeting_location || 'Phòng họp Khoa',

    // Chair info
    ten_nguoi_chu_tri: input.councilChair || formData.ten_chu_tich || '',
    ten_thu_ky: input.councilSecretary || formData.ten_thu_ky || '',

    // Attendance
    co_mat_tren_tong: formData.attendance || '05/05',
    vang_mat: formData.absent || '0',

    // Academic year
    nam_hoc: formData.nam_hoc || `${dateComponents.nam}-${parseInt(dateComponents.nam) + 1}`,

    // Conditional content - based on approval status
    noi_dung_da_chinh_sua: isApproved
      ? options?.noiDungDaChinhSua || ''
      : ' ',
    noi_dung_bo_sung: isApproved
      ? options?.noiDungBoSung || ''
      : ' ',
    noi_dung_khong_phu_hop: isApproved
      ? ' '
      : options?.noiDungKhongPhuHop || '',

    // Date components
    ngay_ht: dateComponents.ngay,
    ngay: dateComponents.ngay,
    thang: dateComponents.thang,
    nam: dateComponents.nam,
  };
}
