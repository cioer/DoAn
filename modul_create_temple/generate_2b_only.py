import sys
import os
import datetime

# Add path
sys.path.append(os.path.join(os.path.dirname(__file__), 'form_engine/src'))

from form_engine.src.core.engine import FormEngine

def main():
    print("--- GENERATING FORM 2B (EVALUATION) ---")
    engine = FormEngine()
    
    # Logic kết quả (Thử đổi thành False để xem Không Đạt)
    is_pass = True 
    
    data_2b = {
        "khoa": "Công nghệ Thông tin",
        "ten_nguoi_danh_gia": "PGS.TS. Trần Thẩm Định",
        "ten_de_tai": "Nghiên cứu xây dựng hệ thống quản lý văn bản thông minh sử dụng AI",
        "ten_nguoi_de_xuat": "TS. Nguyễn Văn AI",
        "don_vi_chu_tri": "Bộ môn Hệ thống thông tin",
        "thoi_gian_hop": "08:00 ngày 20/01/2024",
        "dia_diem": "Phòng họp số 1 - Nhà A1",
        
        # 1. Checkbox Kết quả (Dùng chữ 'x' để lồng vào khung Table trong Word)
        "dat": "x" if is_pass else " ",
        "ko_dat": " " if is_pass else "x",
        
        # 2. Checkbox Đề nghị (Dùng Icon Unicode hiển thị trực tiếp)
        "box_de_nghi": "☑" if is_pass else "☐",
        "box_khong_de_nghi": "☐" if is_pass else "☑"
    }

    try:
        res = engine.render("2b.docx", data_2b, user_id="user_test_2b")
        print(f"✅ Đã tạo file Mẫu 2b:")
        print(f"   DOCX: {res['docx']}")
        print(f"   PDF:  {res['pdf']}")
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    main()
