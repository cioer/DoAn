/**
 * Form 3b Context Builder
 *
 * Biên bản họp xét chọn đề tài (Faculty Meeting Minutes)
 * Used in: FACULTY_REVIEW state
 */

import {
  ProposalContextInput,
  getBaseContext,
  getCheckbox,
  getCurrentDateComponents,
} from './base.builder';

/**
 * Council member structure
 */
interface CouncilMember {
  ten: string;
  don_vi: string;
}

/**
 * Build context for Form 3b (Faculty Meeting Minutes)
 */
export function buildForm3bContext(
  input: ProposalContextInput,
  options?: {
    chuNhiem?: { ten: string; don_vi: string };
    hoiDong?: CouncilMember[];
    isApproved?: boolean;
    soPhieuDongY?: number;
    soPhieuPhanDoi?: number;
    noiDungChinhSua?: string;
    noiDungBoSung?: string;
    noiDungKhongPhuHop?: string;
  },
): Record<string, unknown> {
  const base = getBaseContext(input);
  const formData = (input.formData || {}) as Record<string, unknown>;
  const dateComponents = getCurrentDateComponents();

  const isApproved = options?.isApproved ?? true;
  const soPhieuDongY = options?.soPhieuDongY ?? 5;
  const soPhieuPhanDoi = options?.soPhieuPhanDoi ?? 0;

  // Format chu nhiem
  const chuNhiem = options?.chuNhiem || {
    ten: input.ownerName || '',
    don_vi: input.facultyName || '',
  };
  const txtChuNhiem = `• Chủ nhiệm: ${chuNhiem.ten}\t\tĐơn vị: ${chuNhiem.don_vi}`;

  // Format thanh vien
  const hoiDong = options?.hoiDong || [];
  let txtThanhVien = '• Thành viên:';
  for (const mem of hoiDong) {
    txtThanhVien += `\n\t◦ ${mem.ten}\t\tĐơn vị: ${mem.don_vi}`;
  }

  return {
    ...base,

    // Faculty info
    ten_khoa: input.facultyName?.toUpperCase() || 'CÔNG NGHỆ THÔNG TIN',

    // Decision reference
    QD_so: formData.qd_so || '',
    qd_so: formData.qd_so || '',
    ngay_cua_hieu_truong: formData.ngay_qd || '',

    // Meeting info
    thoi_gian_hop: formData.meeting_time || '',
    thoi_gian_ket_thuc: formData.meeting_end_time || '',
    dia_diem: formData.meeting_location || 'Phòng họp Khoa',

    // Members
    chu_nhiem: txtChuNhiem,
    thanh_vien: txtThanhVien,

    // Attendance
    co_mat_tren_tong_so: formData.attendance || '05/05',
    vang_mat: formData.absent || '0',

    // Voting
    so_phieu_phat_ra: formData.ballots_issued || '5',
    so_phieu_thu_vao: formData.ballots_collected || '5',
    so_phieu_dong_y: soPhieuDongY.toString(),
    so_phieu_phan_doi: soPhieuPhanDoi.toString(),

    // Result checkboxes
    box_de_nghi: getCheckbox(isApproved),
    box_khong_de_nghi: getCheckbox(!isApproved),

    // Conditional content
    nhung_noi_dung_chinh_sua: isApproved
      ? options?.noiDungChinhSua || ''
      : '',
    nhung_noi_dung_bo_sung: isApproved
      ? options?.noiDungBoSung || ''
      : '',
    nhung_noi_dung_khong_phu_hop_sau: isApproved
      ? ''
      : options?.noiDungKhongPhuHop || '',

    // Signatures
    ten_chu_tich: input.councilChair || formData.ten_chu_tich || '',
    ten_thu_ky: input.councilSecretary || formData.ten_thu_ky || '',

    // Date
    ngay: dateComponents.ngay,
    thang: dateComponents.thang,
    nam: dateComponents.nam,
  };
}
