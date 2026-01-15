# MOCK SCHEMA FOR 1B and 2B
from typing import List, Optional
import datetime

# --- Mock Base Classes (Use Pydantic in Prod) ---
class BaseModel:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
    def dict(self):
        d = {}
        for k, v in self.__dict__.items():
            if hasattr(v, 'dict'): d[k] = v.dict()
            elif isinstance(v, list): d[k] = [i.dict() if hasattr(i, 'dict') else i for i in v]
            else: d[k] = v
        return d

# --- SCHEMA MẪU 1B: PHIẾU ĐỀ XUẤT ---
class Mau1bInput(BaseModel):
    def __init__(self, **kwargs):
        # Default values
        if 'ngay_thang_nam' not in kwargs: 
            now = datetime.datetime.now()
            kwargs['ngay_thang_nam'] = f"Ngày {now.day} tháng {now.month} năm {now.year}"
            
        super().__init__(**kwargs)
        # Fields:
        # ten_de_tai
        # tinh_cap_thiet
        # muc_tieu
        # noi_dung_chinh
        # ket_qua_du_kien
        # kha_nang_ung_dung
        # hieu_qua
        # thoi_gian_thuc_hien
        # kinh_phi
        # nguoi_de_xuat (Signature)

# --- SCHEMA MẪU 2B: PHIẾU ĐÁNH GIÁ ---
class TieuChi2b(BaseModel):
    def __init__(self, noi_dung, danh_gia):
        self.noi_dung = noi_dung
        self.danh_gia = danh_gia # Đạt / Không đạt

class Mau2bInput(BaseModel):
    def __init__(self, **kwargs):
        if 'ngay_hop' not in kwargs: kwargs['ngay_hop'] = datetime.datetime.now().strftime("%H:%M %d/%m/%Y")
        super().__init__(**kwargs)
        
        if 'danh_sach_tieu_chi' in kwargs:
             self.danh_sach_tieu_chi = [TieuChi2b(**i) for i in kwargs['danh_sach_tieu_chi']]
        
        # Fields:
        # ten_de_tai
        # ca_nhan_de_xuat
        # don_vi_chu_tri
        # thoi_gian_hop
        # dia_diem
        # y_kien_khac
        # ket_luan (Đề nghị thực hiện / Không)
        # nguoi_danh_gia (Signature)
