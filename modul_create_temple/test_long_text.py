import sys
import os
import datetime

# Add path
sys.path.append(os.path.join(os.path.dirname(__file__), 'form_engine/src'))

from form_engine.src.core.engine import FormEngine

def main():
    print("--- TESTING LONG TEXT WRAPPING ---")
    engine = FormEngine()
    now = datetime.datetime.now()

    # Tạo văn bản siêu dài
    long_text = (
        "Đây là một đoạn văn bản thử nghiệm độ dài cực lớn để kiểm tra khả năng xuống dòng tự động của hệ thống. "
        "Trong các văn bản hành chính, phần 'Tính cấp thiết' hoặc 'Nội dung chi tiết' thường rất dài, có thể kéo dài sang nhiều trang. "
        "Hệ thống cần đảm bảo rằng văn bản không bị cắt cụt, không bị tràn lề ngang mà phải tự động ngắt dòng xuống dưới (word wrap). "
        "Ngoài ra, nếu đoạn văn quá dài vượt quá khổ giấy A4, nó phải tự động đẩy sang trang tiếp theo mà không làm vỡ bố cục header/footer. "
        "Thử nghiệm lặp lại: "
    ) * 10  # Nhân bản lên 10 lần (~500 từ)

    print(f"-> Độ dài văn bản thử nghiệm: {len(long_text)} ký tự.")

    # --- MẪU 1B ---
    data_1b = {
        "khoa": "Công nghệ Thông tin",
        "ten_de_tai": "Thử nghiệm Stress Test hệ thống tạo văn bản",
        "tinh_cap_thiet": long_text,  # <--- CHÈN VĂN BẢN DÀI VÀO ĐÂY
        "muc_tieu_de_tai": "Kiểm tra giới hạn hiển thị.",
        "noi_dung_chinh": "- Test xuống dòng\n- Test tràn trang\n- Test font chữ",
        "ket_qua_du_kien": "Báo cáo không bị vỡ layout.",
        "kha_nang_va_dia_chi_ung_dung": "Hệ thống Form Engine.",
        "du_kien_hieu_qua_tuong_lai": "Đảm bảo tính ổn định.",
        "thoi_gian_bat_dau": "01/2024",
        "thoi_gian_ket_thuc": "02/2024",
        "nhu_cau_kinh_phi_du_kien": "0 VNĐ",
        "ngay": str(now.day),
        "thang": str(now.month),
        "nam": str(now.year),
        "ten_ca_nha_de_xuat": "Robot Test"
    }

    try:
        res_1b = engine.render("1b.docx", data_1b, user_id="tester_long_text")
        print(f"✅ Đã xuất file thử nghiệm:")
        print(f"   DOCX: {res_1b['docx']}")
        print(f"   PDF:  {res_1b['pdf']}")
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    main()
