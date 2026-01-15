import sys
import os
import datetime

# Add path
sys.path.append(os.path.join(os.path.dirname(__file__), 'form_engine/src'))

from form_engine.src.core.engine import FormEngine
# Mock schema classes directly here to ensure keys match exactly what scan found
class DynamicInput:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
    def dict(self):
        return self.__dict__

def main():
    print("--- FILLING DATA INTO USER TEMPLATES ---")
    engine = FormEngine()
    
    now = datetime.datetime.now()

    # --- 1. MẪU 1B (Phiếu đề xuất) ---
    print("\n[1] Processing 1b.docx...")
    
    # Map data to EXACT keys found in scan
    data_1b = {
        "khoa": "Công nghệ Thông tin",
        "ten_de_tai": "Xây dựng hệ thống Chatbot tư vấn tuyển sinh tự động",
        "tinh_cap_thiet": "Nhu cầu tư vấn trực tuyến ngày càng cao, nhân sự không đủ đáp ứng 24/7.",
        "muc_tieu_de_tai": "Tạo ra Chatbot trả lời tự động 80% câu hỏi thường gặp của sinh viên.",
        "noi_dung_chinh": "- Thu thập dữ liệu câu hỏi\n- Huấn luyện mô hình NLP\n- Tích hợp lên Website trường",
        "ket_qua_du_kien": "01 Chatbot hoạt động trên Web, tài liệu kỹ thuật, báo cáo tổng kết.",
        "kha_nang_va_dia_chi_ung_dung": "Phòng Đào tạo, Phòng Công tác sinh viên.",
        "du_kien_hieu_qua_tuong_lai": "Tiết kiệm 500 giờ làm việc/năm cho cán bộ tư vấn.",
        "thoi_gian_bat_dau": "01/2024",
        "thoi_gian_ket_thuc": "12/2024",
        "nhu_cau_kinh_phi_du_kien": "25.000.000 VNĐ",
        
        # Date Signature
        "ngay": str(now.day),
        "thang": str(now.month),
        "nam": str(now.year),
        "ten_ca_nha_de_xuat": "TS. Nguyễn Văn Code"
    }

    try:
        res_1b = engine.render("1b.docx", data_1b, user_id="user_demo")
        print(f"✅ Success 1b:")
        print(f"   DOCX: {res_1b['docx']}")
        print(f"   PDF:  {res_1b['pdf']}")
    except Exception as e:
        print(f"❌ Error 1b: {e}")

    # --- 2. MẪU 2B (Phiếu đánh giá) ---
    print("\n[2] Processing 2b.docx...")
    
    # Logic đánh giá: Đạt
    is_pass = True
    
    data_2b = {
        "khoa": "Công nghệ Thông tin",
        "ten_nguoi_danh_gia": "PGS.TS. Lê Thẩm Định",
        "ten_de_tai": "Xây dựng hệ thống Chatbot tư vấn tuyển sinh tự động",
        "ten_nguoi_de_xuat": "TS. Nguyễn Văn Code",
        "don_vi_chu_tri": "Bộ môn Kỹ thuật phần mềm",
        "thoi_gian_hop": "08:30 ngày 20/05/2024",
        "dia_diem": "Phòng họp số 2 - Nhà A1",
        
        # Checkbox logic (Assuming {{dat}} and {{ko_dat}} are placeholders for "X" or "V")
        "dat": "X" if is_pass else "",
        "ko_dat": "" if is_pass else "X"
    }

    try:
        res_2b = engine.render("2b.docx", data_2b, user_id="user_demo")
        print(f"✅ Success 2b:")
        print(f"   DOCX: {res_2b['docx']}")
        print(f"   PDF:  {res_2b['pdf']}")
    except Exception as e:
        print(f"❌ Error 2b: {e}")

if __name__ == "__main__":
    main()
