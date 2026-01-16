import sys
import os
import datetime

# Add path
sys.path.append(os.path.join(os.path.dirname(__file__), 'form_engine/src'))

from form_engine.src.core.engine import FormEngine

def main():
    print("--- GENERATING FORM 1B (DRAFT) ---")
    engine = FormEngine()
    now = datetime.datetime.now()

    # Dữ liệu mẫu (Test Data)
    data_1b = {
        "khoa": "Công nghệ Thông tin",
        "ten_de_tai": "Nghiên cứu xây dựng hệ thống quản lý văn bản thông minh sử dụng AI",
        "tinh_cap_thiet": "Trong bối cảnh chuyển đổi số, lượng văn bản hành chính ngày càng lớn. Việc quản lý thủ công gây tốn kém thời gian và dễ thất lạc. Do đó, việc ứng dụng AI để tự động phân loại và trích xuất thông tin là vô cùng cấp thiết, giúp tiết kiệm 70% thời gian xử lý cho chuyên viên.",
        "muc_tieu_de_tai": "- Xây dựng CSDL văn bản tập trung.\n- Tích hợp công cụ tìm kiếm ngữ nghĩa (Semantic Search).",
        "noi_dung_chinh": "- Giai đoạn 1: Thu thập và số hóa 10.000 văn bản mẫu.\n- Giai đoạn 2: Huấn luyện mô hình NLP.\n- Giai đoạn 3: Xây dựng Web App tích hợp.",
        "ket_qua_du_kien": "01 Phần mềm hoàn chỉnh; 02 Bài báo khoa học; 01 Báo cáo tổng kết.",
        "kha_nang_va_dia_chi_ung_dung": "Áp dụng tại Phòng Hành chính Tổng hợp và các Khoa chuyên môn.",
        "du_kien_hieu_qua_tuong_lai": "Nâng cao chỉ số chuyển đổi số của nhà trường.",
        "thoi_gian_bat_dau": "01/2024",
        "thoi_gian_ket_thuc": "12/2024",
        "nhu_cau_kinh_phi_du_kien": "50.000.000 VNĐ",
        "ngay": str(now.day),
        "thang": str(now.month),
        "nam": str(now.year),
        "ten_ca_nha_de_xuat": "TS. Nguyễn Văn AI"
    }

    try:
        # Render
        res_1b = engine.render("1b.docx", data_1b, user_id="user_tuning")
        
        print(f"✅ Đã tạo file Mẫu 1b:")
        print(f"   DOCX: {res_1b['docx']}")
        print(f"   PDF:  {res_1b['pdf']}")
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    main()
