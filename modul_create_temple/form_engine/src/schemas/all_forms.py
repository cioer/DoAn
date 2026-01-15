from typing import List, Optional, Any
import datetime

# --- MOCK BASEMODEL (Để chạy được ngay) ---
class BaseModel:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
    def dict(self):
        d = {}
        for k, v in self.__dict__.items():
            if isinstance(v, list):
                d[k] = [i.dict() if hasattr(i, 'dict') else i for i in v]
            else:
                d[k] = v
        return d

# --- COMMON FIELDS ---
class BaseFormInput(BaseModel):
    def __init__(self, **kwargs):
        # Auto-fill date if missing
        now = datetime.datetime.now()
        defaults = {
            "ngay": str(now.day),
            "thang": str(now.month),
            "nam": str(now.year),
            "nam_hoc": f"{now.year}-{now.year+1}",
            "dia_diem": "Phòng họp Khoa CNTT",
            "khoa": "Công nghệ Thông tin",
            "ten_de_tai": "Nghiên cứu chuyển đổi số trong giáo dục",
            "ma_so_de_tai": "NCKH-2024-01",
            "ma_de_tai": "NCKH-2024-01", # Alias
            "ten_chu_nhiem": "TS. Nguyễn Văn A",
            "ho_ten_chu_nhiem": "TS. Nguyễn Văn A", # Alias
            "chu_nhiem": "TS. Nguyễn Văn A", # Alias
            "ten_thu_ky": "ThS. Trần Thị B",
            "ten_chu_tich": "PGS.TS. Lê Văn C",
            "qd_so": "123/QĐ-ĐHSPKT",
            "user_id": "auto_gen_batch"
        }
        # Merge defaults
        for k, v in defaults.items():
            if k not in kwargs:
                kwargs[k] = v
        super().__init__(**kwargs)

# --- SPECIFIC FORMS ---

class Form1b(BaseFormInput):
    # Phiếu đề xuất
    pass # Dùng chung fields

class Form2b(BaseFormInput):
    # Phiếu đánh giá (Có checkbox)
    def __init__(self, ket_qua_dat=True, **kwargs):
        super().__init__(**kwargs)
        # Logic Checkbox
        self.dat = "☑" if ket_qua_dat else "☐"
        self.ko_dat = "☐" if ket_qua_dat else "☑"
        
        # Checkbox "Đề nghị" (Mẫu 2b có biến box_de_nghi ?)
        self.box_de_nghi = "☑" if ket_qua_dat else "☐"
        self.box_khong_de_nghi = "☐" if ket_qua_dat else "☑"

class Form3b(BaseFormInput):
    # Biên bản họp xét chọn (Có danh sách thành viên)
    pass 

class Form4b(BaseFormInput):
    # Danh mục tổng hợp (Bảng động)
    def __init__(self, danh_sach_de_tai=None, **kwargs):
        super().__init__(**kwargs)
        self.danh_sach_de_tai = danh_sach_de_tai or []

# Generic Form cho các mẫu còn lại (5b -> 18b)
# Vì hầu hết các trường đều nằm trong BaseFormInput, ta dùng class này cho nhanh
class GenericForm(BaseFormInput):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Map các biến checkbox thông dụng nếu có
        is_pass = kwargs.get('is_pass', True)
        self.box_dat = "☑" if is_pass else "☐"
        self.box_khong_dat = "☐" if is_pass else "☑"
        self.so_phieu_dat = kwargs.get('so_phieu_dat', "5")
        self.so_phieu_khong_dat = kwargs.get('so_phieu_khong_dat', "0")
