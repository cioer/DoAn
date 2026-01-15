import sys
import os

# Thêm path để import module trong src
sys.path.append(os.path.join(os.path.dirname(__file__), 'form_engine/src'))

try:
    from form_engine.src.schemas.mau_1a import Mau1aInput, TieuChiDanhGia
    from form_engine.src.core.engine import FormEngine
except ImportError as e:
    print(f"Lỗi import: {e}. Hãy đảm bảo bạn chạy từ thư mục gốc của dự án.")
    sys.exit(1)

def main():
    print("--- FORM ENGINE: GENERATING MẪU 1A ---")
    
    # 1. Dữ liệu giả lập (Thường sẽ đến từ API/Web Form)
    input_data = {
        "cap_quan_ly": "TRƯỜNG",
        "ten_nhiem_vu": "Nghiên cứu xây dựng hệ thống quản lý văn bản thông minh",
        "hinh_thuc": "Đề tài NCKH",
        "thoi_gian_hop": "14:00 ngày 20/10/2024",
        "dia_diem": "Phòng họp 2, Khu A",
        "thanh_phan_tham_du": "Hội đồng KHCN Trường",
        "so_thanh_vien_co_mat": 7,
        "so_thanh_vien_vang_mat": 0,
        "ca_nhan_de_xuat": "TS. Nguyễn Văn A",
        "chu_tri": "PGS.TS Trần Văn B",
        "thu_ky": "ThS. Lê Thị C",
        "chu_tich": "PGS.TS Trần Văn B",
        "danh_sach_tieu_chi": [
            {"stt": 1, "noi_dung": "Tính cấp thiết", "danh_gia": "Đạt"},
            {"stt": 2, "noi_dung": "Mục tiêu nghiên cứu", "danh_gia": "Đạt"},
            {"stt": 3, "noi_dung": "Nội dung nghiên cứu", "danh_gia": "Đạt"},
            {"stt": 4, "noi_dung": "Phương pháp nghiên cứu", "danh_gia": "Đạt"}
        ],
        "ket_luan_chung": "Đề nghị thực hiện",
        "user_id": "admin_01"
    }

    # 2. Validate dữ liệu
    try:
        data_model = Mau1aInput(**input_data)
        print("✅ Data Validation: OK")
    except Exception as e:
        print("❌ Data Validation: FAILED")
        print(e)
        return

    # 3. Khởi chạy Engine
    engine = FormEngine()
    
    try:
        # Lưu ý: Cần có file template mau_1a.docx trong form_engine/templates/
        result = engine.render("mau_1a.docx", data_model.dict(), user_id=data_model.user_id)
        
        print("\n✅ XUẤT FILE THÀNH CÔNG:")
        print(f"   DOCX: {result['docx']}")
        if result['pdf']:
            print(f"   PDF:  {result['pdf']}")
        else:
            print("   PDF:  (Không tạo được do thiếu LibreOffice)")
            
    except FileNotFoundError:
        print("\n❌ LỖI: Không tìm thấy file template 'mau_1a.docx'.")
        print("   Vui lòng chạy script 'setup_template.py' để tạo template mẫu trước.")
    except Exception as e:
        print(f"\n❌ LỖI HỆ THỐNG: {e}")

if __name__ == "__main__":
    main()
