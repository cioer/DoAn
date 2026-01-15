# MOCK VERSION FOR DEMO ONLY (Use Pydantic in Production)
from typing import List, Optional
import datetime

# Mock Field and BaseModel for demo environment without pydantic
def Field(default=..., **kwargs):
    return default

class BaseModel:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
    def dict(self):
        # Recursive dict conversion
        d = {}
        for k, v in self.__dict__.items():
            if isinstance(v, list):
                d[k] = [i.dict() if hasattr(i, 'dict') else i for i in v]
            else:
                d[k] = v
        return d

class TieuChiDanhGia(BaseModel):
    def __init__(self, stt, noi_dung, danh_gia):
        self.stt = stt
        self.noi_dung = noi_dung
        self.danh_gia = danh_gia

class Mau1aInput(BaseModel):
    def __init__(self, **kwargs):
        # Assign defaults if missing
        if 'nam' not in kwargs: kwargs['nam'] = datetime.datetime.now().year
        if 'y_kien_khac' not in kwargs: kwargs['y_kien_khac'] = "Không có"
        super().__init__(**kwargs)
        
        # Convert list dicts to objects
        if 'danh_sach_tieu_chi' in kwargs:
            self.danh_sach_tieu_chi = [TieuChiDanhGia(**item) for item in kwargs['danh_sach_tieu_chi']]
