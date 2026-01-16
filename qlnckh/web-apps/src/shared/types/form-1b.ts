/**
 * Form 1b Data Structure
 * Phiếu đề xuất đề tài NCKH
 *
 * Field names match backend form-1b.builder.ts expectations
 */
export interface Form1bData {
  /** Tính cấp thiết của đề tài */
  tinh_cap_thiet: string;
  /** Mục tiêu đề tài */
  muc_tieu_de_tai: string;
  /** Nội dung chính */
  noi_dung_chinh: string;
  /** Kết quả dự kiến */
  ket_qua_du_kien: string;
  /** Khả năng và địa chỉ ứng dụng */
  kha_nang_va_dia_chi_ung_dung: string;
  /** Dự kiến hiệu quả tương lai */
  du_kien_hieu_qua_tuong_lai: string;
  /** Thời gian bắt đầu (YYYY-MM-DD) */
  thoi_gian_bat_dau: string;
  /** Thời gian kết thúc (YYYY-MM-DD) */
  thoi_gian_ket_thuc: string;
  /** Nhu cầu kinh phí dự kiến */
  nhu_cau_kinh_phi_du_kien: string;
}

/**
 * Default empty form data
 */
export const EMPTY_FORM_1B: Form1bData = {
  tinh_cap_thiet: '',
  muc_tieu_de_tai: '',
  noi_dung_chinh: '',
  ket_qua_du_kien: '',
  kha_nang_va_dia_chi_ung_dung: '',
  du_kien_hieu_qua_tuong_lai: '',
  thoi_gian_bat_dau: '',
  thoi_gian_ket_thuc: '',
  nhu_cau_kinh_phi_du_kien: '',
};

/**
 * Field definitions for Form 1b
 */
export const FORM_1B_FIELDS = [
  {
    key: 'tinh_cap_thiet' as const,
    label: 'Tính cấp thiết của đề tài',
    type: 'textarea' as const,
    required: true,
    minLength: 50,
    rows: 4,
    placeholder: 'Trình bày tính cấp thiết, lý do cần thực hiện đề tài nghiên cứu...',
    helperText: 'Mô tả bối cảnh, vấn đề cần giải quyết và lý do nghiên cứu (tối thiểu 50 ký tự)',
  },
  {
    key: 'muc_tieu_de_tai' as const,
    label: 'Mục tiêu đề tài',
    type: 'textarea' as const,
    required: true,
    minLength: 30,
    rows: 5,
    placeholder: '- Mục tiêu tổng quát:\n- Mục tiêu cụ thể 1:\n- Mục tiêu cụ thể 2:',
    helperText: 'Liệt kê mục tiêu tổng quát và cụ thể, sử dụng dấu (-) để liệt kê',
  },
  {
    key: 'noi_dung_chinh' as const,
    label: 'Nội dung chính',
    type: 'textarea' as const,
    required: true,
    minLength: 50,
    rows: 6,
    placeholder: '- Nội dung 1: Nghiên cứu lý thuyết...\n- Nội dung 2: Thiết kế hệ thống...\n- Nội dung 3: Thực nghiệm và đánh giá...',
    helperText: 'Mô tả các nội dung nghiên cứu chính, phương pháp thực hiện',
  },
  {
    key: 'ket_qua_du_kien' as const,
    label: 'Kết quả dự kiến',
    type: 'textarea' as const,
    required: true,
    minLength: 30,
    rows: 4,
    placeholder: 'Ví dụ: 01 Phần mềm hoàn chỉnh; 02 Bài báo khoa học; 01 Báo cáo tổng kết',
    helperText: 'Liệt kê các sản phẩm, kết quả cụ thể sau khi hoàn thành đề tài',
  },
  {
    key: 'kha_nang_va_dia_chi_ung_dung' as const,
    label: 'Khả năng và địa chỉ ứng dụng',
    type: 'textarea' as const,
    required: true,
    minLength: 20,
    rows: 3,
    placeholder: 'Nêu rõ khả năng ứng dụng và đơn vị/địa chỉ có thể áp dụng kết quả nghiên cứu...',
    helperText: 'Mô tả nơi có thể triển khai, đối tượng hưởng lợi',
  },
  {
    key: 'du_kien_hieu_qua_tuong_lai' as const,
    label: 'Dự kiến hiệu quả tương lai',
    type: 'textarea' as const,
    required: false,
    rows: 3,
    placeholder: 'Đánh giá hiệu quả về mặt khoa học, kinh tế, xã hội...',
    helperText: 'Đánh giá tác động dài hạn của nghiên cứu (không bắt buộc)',
  },
] as const;

/**
 * Validation function for Form 1b
 */
export function validateForm1b(data: Form1bData): Record<string, string> {
  const errors: Record<string, string> = {};

  // Validate textarea fields
  for (const field of FORM_1B_FIELDS) {
    const value = data[field.key];
    if (field.required && !value.trim()) {
      errors[field.key] = `Vui lòng nhập ${field.label.toLowerCase()}`;
    } else if (field.minLength && value.trim().length < field.minLength) {
      errors[field.key] = `${field.label} cần ít nhất ${field.minLength} ký tự`;
    }
  }

  // Validate start date
  if (!data.thoi_gian_bat_dau) {
    errors.thoi_gian_bat_dau = 'Vui lòng chọn thời gian bắt đầu';
  }

  // Validate end date
  if (!data.thoi_gian_ket_thuc) {
    errors.thoi_gian_ket_thuc = 'Vui lòng chọn thời gian kết thúc';
  }

  // Validate date order
  if (data.thoi_gian_bat_dau && data.thoi_gian_ket_thuc) {
    const start = new Date(data.thoi_gian_bat_dau);
    const end = new Date(data.thoi_gian_ket_thuc);
    if (end <= start) {
      errors.thoi_gian_ket_thuc = 'Thời gian kết thúc phải sau thời gian bắt đầu';
    }
  }

  // Validate budget
  if (!data.nhu_cau_kinh_phi_du_kien.trim()) {
    errors.nhu_cau_kinh_phi_du_kien = 'Vui lòng nhập kinh phí dự kiến';
  }

  return errors;
}
