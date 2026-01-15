import sys
import os

# Add path
sys.path.append(os.path.join(os.path.dirname(__file__), 'form_engine/src'))

from form_engine.src.core.engine import FormEngine
from form_engine.src.schemas.mau_1b_2b import Mau1bInput, Mau2bInput

def main():
    print("--- BẮT ĐẦU XỬ LÝ MẪU 1B & 2B ---")
    engine = FormEngine()

    # --- 1. XỬ LÝ MẪU 1B ---
    print("\n[1] Đang xử lý Mẫu 1b (Phiếu đề xuất)...")
    data_1b = Mau1bInput(
        ten_de_tai="Nghiên cứu ứng dụng Blockchain trong quản lý điểm sinh viên",
        tinh_cap_thiet="Rất cấp thiết trong bối cảnh chuyển đổi số.",
        muc_tieu="Xây dựng hệ thống lưu trữ điểm minh bạch, không thể sửa đổi.",
        noi_dung_chinh="- Tìm hiểu Blockchain\n- Xây dựng Smart Contract\n- Viết App Client",
        ket_qua_du_kien="Phần mềm quản lý điểm demo.",
        kha_nang_ung_dung="Áp dụng tại phòng Đào tạo.",
        hieu_qua="Giảm thiểu tiêu cực, tăng tính minh bạch.",
        thoi_gian_thuc_hien="T1/2024 - T12/2024",
        kinh_phi="15.000.000 VNĐ",
        nguoi_de_xuat="TS. Phạm Văn Block",
        user_id="teacher_01"
    )
    
    try:
        # Lưu ý: Vì template 1b.docx gốc chưa có tag {{...}}, 
        # Engine sẽ render ra bản copy (và convert PDF).
        # Để thấy dữ liệu được điền, bạn cần mở form_engine/templates/1b.docx và thêm tag.
        res_1b = engine.render("1b.docx", data_1b.dict(), user_id="teacher_01")
        print(f"✅ Xong Mẫu 1b:")
        print(f"   DOCX: {res_1b['docx']}")
        print(f"   PDF:  {res_1b['pdf']}")
    except Exception as e:
        print(f"❌ Lỗi Mẫu 1b: {e}")

    # --- 2. XỬ LÝ MẪU 2B ---
    print("\n[2] Đang xử lý Mẫu 2b (Phiếu đánh giá)...")
    data_2b = Mau2bInput(
        ten_de_tai="Nghiên cứu ứng dụng Blockchain trong quản lý điểm sinh viên",
        ca_nhan_de_xuat="TS. Phạm Văn Block",
        don_vi_chu_tri="Khoa CNTT",
        dia_diem="Phòng họp Khoa CNTT",
        danh_sach_tieu_chi=[
            {"noi_dung": "Tên đề tài", "danh_gia": "Đạt"},
            {"noi_dung": "Tính cấp thiết", "danh_gia": "Đạt"},
            {"noi_dung": "Mục tiêu", "danh_gia": "Đạt"},
            {"noi_dung": "Kinh phí", "danh_gia": "Không đạt (Cần giải trình chi tiết)"}
        ],
        y_kien_khac="Cần làm rõ công nghệ sử dụng (Private hay Public Blockchain)",
        ket_luan="Đề nghị thực hiện (Sau khi chỉnh sửa)",
        nguoi_danh_gia="PGS.TS Trần Review",
        user_id="reviewer_01"
    )

    try:
        res_2b = engine.render("2b.docx", data_2b.dict(), user_id="reviewer_01")
        print(f"✅ Xong Mẫu 2b:")
        print(f"   DOCX: {res_2b['docx']}")
        print(f"   PDF:  {res_2b['pdf']}")
    except Exception as e:
        print(f"❌ Lỗi Mẫu 2b: {e}")

if __name__ == "__main__":
    main()
