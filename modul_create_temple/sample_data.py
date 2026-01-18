"""
Sample data for all form templates (1b -> 18b, PL1, PL2, PL3)
Each form has a function that returns sample context data.
"""
import datetime
from form_engine.src.core.engine import CHECKBOX_CHECKED, CHECKBOX_UNCHECKED

now = datetime.datetime.now()

# Common defaults
DEFAULTS = {
    "ngay": str(now.day),
    "thang": str(now.month),
    "nam": str(now.year),
    "nam_hoc": f"{now.year}-{now.year+1}",
    "khoa": "Công nghệ Thông tin",
    "ten_khoa": "CÔNG NGHỆ THÔNG TIN",
    "ten_de_tai": "Nghiên cứu ứng dụng Blockchain trong quản lý văn bằng",
    "ma_so_de_tai": "NCKH-2024-01",
    "ma_de_tai": "NCKH-2024-01",
    "don_vi_chu_tri": "Khoa Công nghệ thông tin",
    "ten_chu_nhiem": "TS. Nguyễn Văn AI",
    "ho_ten_chu_nhiem": "TS. Nguyễn Văn AI",
    "chu_nhiem": "TS. Nguyễn Văn AI",
    "ten_chu_tich": "PGS.TS. Lê Văn Chủ Tịch",
    "ten_thu_ky": "ThS. Nguyễn Văn Thư Ký",
    "qd_so": "123/QĐ-ĐHSPKT",
    "dia_diem": "Phòng họp Khoa CNTT",
    "thoi_gian_hop": "14:00 ngày 30/01/2024",
    "thoi_gian_ket_thuc": "16:30",
    "co_mat_tren_tong": "05/05",
    "vang_mat": "0",
}


def get_sample_data(form_id: str, is_approved: bool = True) -> dict:
    """Get sample data for a specific form."""
    form_id = form_id.lower()

    # Get form-specific data
    if form_id in FORM_DATA:
        data = {**DEFAULTS, **FORM_DATA[form_id](is_approved)}
    else:
        data = {**DEFAULTS}

    # Apply checkbox logic
    data["box_dat"] = CHECKBOX_CHECKED if is_approved else CHECKBOX_UNCHECKED
    data["box_khong_dat"] = CHECKBOX_UNCHECKED if is_approved else CHECKBOX_CHECKED
    data["dat"] = CHECKBOX_CHECKED if is_approved else CHECKBOX_UNCHECKED
    data["ko_dat"] = CHECKBOX_UNCHECKED if is_approved else CHECKBOX_CHECKED
    data["khong_dat"] = CHECKBOX_UNCHECKED if is_approved else CHECKBOX_CHECKED  # alias
    data["box_de_nghi"] = CHECKBOX_CHECKED if is_approved else CHECKBOX_UNCHECKED
    data["box_khong_de_nghi"] = CHECKBOX_UNCHECKED if is_approved else CHECKBOX_CHECKED

    return data


# Form-specific data generators
FORM_DATA = {
    "1b": lambda _: {
        "tinh_cap_thiet": "Trong bối cảnh chuyển đổi số, việc ứng dụng AI để tự động phân loại và trích xuất thông tin là vô cùng cấp thiết.",
        "muc_tieu_de_tai": "- Xây dựng CSDL văn bản tập trung.\n- Tích hợp công cụ tìm kiếm ngữ nghĩa.",
        "noi_dung_chinh": "- Giai đoạn 1: Thu thập và số hóa văn bản mẫu.\n- Giai đoạn 2: Huấn luyện mô hình NLP.\n- Giai đoạn 3: Xây dựng Web App.",
        "ket_qua_du_kien": "01 Phần mềm hoàn chỉnh; 02 Bài báo khoa học; 01 Báo cáo tổng kết.",
        "kha_nang_va_dia_chi_ung_dung": "Áp dụng tại Phòng Hành chính Tổng hợp và các Khoa chuyên môn.",
        "du_kien_hieu_qua_tuong_lai": "Nâng cao chỉ số chuyển đổi số của nhà trường.",
        "thoi_gian_bat_dau": "01/2024",
        "thoi_gian_ket_thuc": "12/2024",
        "nhu_cau_kinh_phi_du_kien": "50.000.000 VNĐ",
        "ten_ca_nha_de_xuat": "TS. Nguyễn Văn AI",
    },

    "2b": lambda is_approved: {
        "ten_nguoi_danh_gia": "PGS.TS. Trần Thẩm Định",
        "ten_nguoi_de_xuat": "TS. Nguyễn Văn AI",
    },

    "3b": lambda is_approved: {
        "ten_khoa": "CÔNG NGHỆ THÔNG TIN",
        "QD_so": "1001/QĐ-ĐHSPKT",
        "ngay_cua_hieu_truong": "15/01/2024",
        "chu_nhiem": "• Chủ nhiệm: ThS. Phan Đức Thiện\t\tĐơn vị: Trung tâm Thực hành",
        "thanh_vien": "• Thành viên:\n\t◦ ThS. Nguyễn Văn Trung\t\tĐơn vị: Khoa CNTT\n\t◦ ThS. Trần Thị Hồng Nhung\t\tĐơn vị: Phòng KH-HTQT",
        "co_mat_tren_tong_so": "05/05",
        "so_phieu_phat_ra": "5",
        "so_phieu_thu_vao": "5",
        "so_phieu_dong_y": "5" if is_approved else "0",
        "so_phieu_phan_doi": "0" if is_approved else "5",
        "nhung_noi_dung_chinh_sua": "- Bổ sung tài liệu." if is_approved else "",
        "nhung_noi_dung_bo_sung": "- Thêm module báo cáo." if is_approved else "",
        "nhung_noi_dung_khong_phu_hop_sau": "" if is_approved else "- Tính cấp thiết chưa rõ.",
    },

    "4b": lambda _: {
        "so_de_tai": "5",
        # Table data handled separately
    },

    "5b": lambda _: {
        "dia_diem_hop": "Phòng họp A1 - Nhà Hiệu bộ",
    },

    "6b": lambda is_approved: {
        "qd_sp": "123/QĐ-ĐHSPKT",
        "QD_so": "123/QĐ-ĐHSPKT",
        "ten_nguoi_chu_tri": "TS. Trưởng Khoa",
        "ngay_ht": "26",
        "noi_dung_da_chinh_sua": "- Đã cập nhật lại tên đề tài.\n- Đã bổ sung phương pháp." if is_approved else " ",
        "noi_dung_bo_sung": "- Thêm thành viên nghiên cứu." if is_approved else " ",
        "noi_dung_khong_phu_hop": " " if is_approved else "- Đề cương sơ sài, không đạt yêu cầu khoa học.",
    },

    "7b": lambda _: {
        "nguoi_de_xuat": "TS. Nguyễn Văn AI",
        "noi_dung_chinh_sua": "- Đã cập nhật theo góp ý của Hội đồng.",
    },

    "8b": lambda _: {
        "ten_khoa": "CÔNG NGHỆ THÔNG TIN",
    },

    "9b": lambda _: {
        "ten_thanh_vien": "TS. Phạm Văn D",
    },

    "10b": lambda is_approved: {
        "chu_nhiem_de_tai": "TS. Nguyễn Văn AI",
        "tong_phieu_phat_ra": "5",
        "tong_phieu_thu_vao": "5",
        "so_phieu_dat": "5" if is_approved else "0",
        "so_phieu_khong_dat": "0" if is_approved else "5",
        "ngay_ht": "30",
        "thanh_vien": "- TS. Phạm Văn C - Khoa Điện\n- TS. Hoàng Văn D - Khoa Cơ khí",
        "cac_chi_tieu_chu_yeu_cac_yeu_cau_khoa_hoc_cua_ket_qua": "- Đề tài đáp ứng các chỉ tiêu khoa học cơ bản.\n- Phương pháp nghiên cứu phù hợp.",
        "phuong_phap_nghien_cuu": "- Khảo sát thực trạng tại 3 đơn vị đại học.\n- Thiết kế và xây dựng hệ thống.",
        "so_luong_chung_loai_khoi_luong_san_pham": "- 01 hệ thống quản lý văn bằng.\n- 02 bài báo khoa học.",
        "noi_dung_da_chinh_sua": "- Đã chỉnh sửa lại tên đề tài theo kết luận của Hội đồng." if is_approved else "",
        "noi_dung_bo_sung": "- Đã bổ sung 01 thành viên nghiên cứu." if is_approved else "",
        "noi_dung_khong_phu_hop": "" if is_approved else "- Nội dung không phù hợp với mục tiêu đề ra.",
        "nhan_xet_ve_muc_do_hoan_thanh": "Đề tài đã hoàn thành đầy đủ các nội dung theo đề xuất.",
    },

    "11b": lambda _: {
        "nguoi_de_xuat": "TS. Nguyễn Văn AI",
    },

    "12b": lambda _: {
        "ho_ten_phan_bien": "PGS.TS. Trần Phản Biện",
    },

    "13b": lambda _: {},

    "14b": lambda is_approved: {
        "ho_ten": "TS. Phạm Văn D",
        "don_vi_cong_tac": "Khoa Điện",
        "y_kien_khac": "Đề nghị chủ nhiệm đề tài tiếp tục phát triển và mở rộng hệ thống.",
        "ten_nguoi_danh_gia": "TS. Phạm Văn D",
    },

    "15b": lambda is_approved: {
        "so_phieu_dat": "5" if is_approved else "0",
        "so_phieu_khong_dat": "0" if is_approved else "5",
    },

    "16b": lambda _: {},

    "17b": lambda _: {},

    "18b": lambda _: {
        "ly_do_gia_han": "Do ảnh hưởng của dịch bệnh, nhóm nghiên cứu không thể tiến hành khảo sát thực tế đúng tiến độ.",
        "thoi_gian_gia_han": "3 tháng",
    },

    "pl1": lambda _: {
        "thoi_gian_bat_dau": "01/2024",
        "thoi_gian_ket_thuc": "12/2024",
    },

    "pl2": lambda _: {
        "ban_chu_nhiem": "TS. Nguyễn Văn AI (Chủ nhiệm)\nThS. Trần Thị B (Thành viên)",
    },

    "pl3": lambda _: {
        "ho_ten_phan_bien": "PGS.TS. Trần Phản Biện",
    },
}


# Table data for form 4b
TABLE_DATA_4B = [
    {"stt": 1, "ten": "Nghiên cứu xây dựng Chatbot AI tư vấn tuyển sinh", "cn": "TS. Nguyễn Văn A", "mt": "Tự động hóa 90% câu trả lời", "tm": "Mới", "kq": "Phần mềm + Báo cáo", "ud": "Phòng Đào tạo", "kp": "15.000.000"},
    {"stt": 2, "ten": "Hệ thống điểm danh sinh viên bằng khuôn mặt", "cn": "ThS. Trần Thị B", "mt": "Chính xác 99%", "tm": "Cải tiến", "kq": "Thiết bị + App", "ud": "Giảng đường", "kp": "20.000.000"},
    {"stt": 3, "ten": "Ứng dụng Blockchain trong quản lý văn bằng", "cn": "KS. Lê Văn C", "mt": "Chống làm giả", "tm": "Mới", "kq": "Website tra cứu", "ud": "Phòng CTSV", "kp": "12.000.000"},
    {"stt": 4, "ten": "Phân tích dữ liệu học tập Big Data", "cn": "TS. Phạm Văn D", "mt": "Dự báo sinh viên bỏ học", "tm": "Sáng tạo", "kq": "Báo cáo phân tích", "ud": "Ban Giám hiệu", "kp": "10.000.000"},
    {"stt": 5, "ten": "Xây dựng Lab thực hành ảo Cloud Computing", "cn": "ThS. Hoàng Văn E", "mt": "Tiết kiệm chi phí phần cứng", "tm": "Cải tiến", "kq": "Hệ thống Lab Online", "ud": "Sinh viên CNTT", "kp": "30.000.000"},
]
