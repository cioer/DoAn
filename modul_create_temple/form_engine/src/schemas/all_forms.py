from typing import List, Optional, Any, Dict
from enum import Enum
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

# --- QUY TẮC CHUNG (GLOBAL RULES) ---
# Checkbox: LUÔN dùng [x] và [ ] thay vì ☑/☐ để tránh lỗi font
CHECKBOX_CHECKED = "[x]"
CHECKBOX_UNCHECKED = "[ ]"

# =============================================================================
# PROPOSAL STATUS ENUM - Các trạng thái của đề tài NCKH
# =============================================================================
class ProposalStatus(str, Enum):
    """Trạng thái của đề tài nghiên cứu khoa học theo quy trình"""

    # Giai đoạn Đề xuất
    DRAFT = "DRAFT"                                    # Bản nháp
    FACULTY_REVIEW = "FACULTY_REVIEW"                  # Xét chọn cấp Khoa

    # Giai đoạn Xét Trường
    SCHOOL_SELECTION = "SCHOOL_SELECTION"              # Xét chọn sơ bộ cấp Trường
    COUNCIL_REVIEW = "COUNCIL_REVIEW"                  # Hội đồng tư vấn xét chọn

    # Giai đoạn Thực hiện
    APPROVED = "APPROVED"                              # Đã duyệt, chờ thực hiện
    IN_PROGRESS = "IN_PROGRESS"                        # Đang thực hiện

    # Giai đoạn Nghiệm thu
    FACULTY_ACCEPTANCE = "FACULTY_ACCEPTANCE"          # Nghiệm thu cấp Khoa
    SCHOOL_ACCEPTANCE = "SCHOOL_ACCEPTANCE"            # Nghiệm thu cấp Trường

    # Hoàn thành
    COMPLETED = "COMPLETED"                            # Hoàn thành
    REJECTED = "REJECTED"                              # Bị từ chối

# =============================================================================
# FORM METADATA - Thông tin chi tiết về từng biểu mẫu
# =============================================================================
FORM_INFO: Dict[str, Dict[str, Any]] = {
    # --- Giai đoạn Đề xuất ---
    "1b": {
        "name": "Phiếu đề xuất",
        "template": "1b.docx",
        "phase": "PROPOSAL",
        "description": "Phiếu đề xuất thực hiện đề tài khoa học cấp Trường",
        "required_fields": ["ten_de_tai", "khoa", "tinh_cap_thiet", "muc_tieu", "noi_dung_chinh"],
        "role_create": ["GIANG_VIEN"],
        "role_approve": ["QUAN_LY_KHOA"]
    },
    "PL1": {
        "name": "Đề cương chi tiết",
        "template": "PL1.docx",
        "phase": "PROPOSAL",
        "description": "Đề cương đề tài khoa học cấp Trường (chi tiết)",
        "required_fields": ["ten_de_tai", "don_vi_chu_tri", "thoi_gian_bat_dau", "thoi_gian_ket_thuc"],
        "role_create": ["GIANG_VIEN"],
        "role_approve": ["QUAN_LY_KHOA"]
    },

    # --- Giai đoạn Xét Khoa ---
    "2b": {
        "name": "Phiếu đánh giá cấp Khoa",
        "template": "2b.docx",
        "phase": "FACULTY_REVIEW",
        "description": "Phiếu đánh giá xét chọn thực hiện đề tài",
        "required_fields": ["ten_nguoi_danh_gia", "ten_de_tai"],
        "role_create": ["THANH_VIEN_HOI_DONG"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "3b": {
        "name": "Biên bản họp cấp Khoa",
        "template": "3b.docx",
        "phase": "FACULTY_REVIEW",
        "description": "Biên bản họp xét chọn thực hiện đề tài cấp Khoa",
        "required_fields": ["thoi_gian_hop", "dia_diem", "ten_de_tai"],
        "role_create": ["THU_KY_KHOA"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "4b": {
        "name": "Danh mục tổng hợp",
        "template": "4b.docx",
        "phase": "FACULTY_REVIEW",
        "description": "Danh mục tổng hợp kết quả xét chọn đề tài",
        "required_fields": ["nam_hoc", "danh_sach_de_tai"],
        "role_create": ["THU_KY_KHOA"],
        "role_approve": ["QUAN_LY_KHOA"]
    },

    # --- Giai đoạn Xét Trường ---
    "5b": {
        "name": "Biên bản xét chọn sơ bộ",
        "template": "5b.docx",
        "phase": "SCHOOL_SELECTION",
        "description": "Biên bản họp xét chọn sơ bộ cấp Trường",
        "required_fields": ["thoi_gian_hop", "dia_diem_hop"],
        "role_create": ["PHONG_KHCN"],
        "role_approve": ["PHO_HIEU_TRUONG"]
    },
    "6b": {
        "name": "Biên bản Hội đồng tư vấn",
        "template": "6b.docx",
        "phase": "COUNCIL_REVIEW",
        "description": "Biên bản họp Hội đồng tư vấn xét chọn đề cương",
        "required_fields": ["thoi_gian_hop", "dia_diem", "ten_de_tai"],
        "role_create": ["THU_KY_HOI_DONG"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "7b": {
        "name": "Báo cáo hoàn thiện đề cương",
        "template": "7b.docx",
        "phase": "COUNCIL_REVIEW",
        "description": "Báo cáo về việc hoàn thiện đề cương đề tài",
        "required_fields": ["ten_de_tai", "nguoi_de_xuat", "noi_dung_chinh_sua"],
        "role_create": ["GIANG_VIEN"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },

    # --- Giai đoạn Nghiệm thu Khoa ---
    "8b": {
        "name": "Đề nghị lập HĐ NT Khoa",
        "template": "8b.docx",
        "phase": "FACULTY_ACCEPTANCE",
        "description": "Giấy đề nghị thành lập Hội đồng nghiệm thu cấp Khoa",
        "required_fields": ["ten_khoa", "ten_de_tai", "ma_de_tai"],
        "role_create": ["THU_KY_KHOA"],
        "role_approve": ["QUAN_LY_KHOA"]
    },
    "9b": {
        "name": "Phiếu đánh giá NT Khoa",
        "template": "9b.docx",
        "phase": "FACULTY_ACCEPTANCE",
        "description": "Phiếu đánh giá, nghiệm thu cấp Khoa",
        "required_fields": ["ten_thanh_vien", "ten_de_tai", "ma_de_tai"],
        "role_create": ["THANH_VIEN_HOI_DONG"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "10b": {
        "name": "Biên bản họp NT Khoa",
        "template": "10b.docx",
        "phase": "FACULTY_ACCEPTANCE",
        "description": "Biên bản họp Hội đồng đánh giá, nghiệm thu cấp Khoa",
        "required_fields": ["ten_de_tai", "ma_de_tai", "thoi_gian_hop"],
        "role_create": ["THU_KY_HOI_DONG"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "11b": {
        "name": "Báo cáo hoàn thiện NT Khoa",
        "template": "11b.docx",
        "phase": "FACULTY_ACCEPTANCE",
        "description": "Báo cáo về việc hoàn thiện hồ sơ nghiệm thu cấp Khoa",
        "required_fields": ["ten_de_tai", "nguoi_de_xuat"],
        "role_create": ["GIANG_VIEN"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "PL2": {
        "name": "Báo cáo tổng kết",
        "template": "PL2.docx",
        "phase": "FACULTY_ACCEPTANCE",
        "description": "Báo cáo tổng kết đề tài khoa học",
        "required_fields": ["ten_de_tai", "ma_so_de_tai", "ban_chu_nhiem"],
        "role_create": ["GIANG_VIEN"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },

    # --- Giai đoạn Nghiệm thu Trường ---
    "12b": {
        "name": "Nhận xét phản biện",
        "template": "12b.docx",
        "phase": "SCHOOL_ACCEPTANCE",
        "description": "Nhận xét phản biện đề tài khoa học cấp Trường",
        "required_fields": ["ten_de_tai", "ma_so_de_tai", "ho_ten_chu_nhiem"],
        "role_create": ["PHAN_BIEN"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "13b": {
        "name": "Đề nghị lập HĐ NT Trường",
        "template": "13b.docx",
        "phase": "SCHOOL_ACCEPTANCE",
        "description": "Giấy đề nghị thành lập Hội đồng nghiệm thu cấp Trường",
        "required_fields": ["ten_khoa", "ten_de_tai"],
        "role_create": ["THU_KY_KHOA"],
        "role_approve": ["QUAN_LY_KHOA"]
    },
    "14b": {
        "name": "Phiếu đánh giá NT Trường",
        "template": "14b.docx",
        "phase": "SCHOOL_ACCEPTANCE",
        "description": "Phiếu đánh giá, nghiệm thu cấp Trường",
        "required_fields": ["ho_ten", "ten_de_tai", "ma_so_de_tai"],
        "role_create": ["THANH_VIEN_HOI_DONG"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "15b": {
        "name": "Biên bản họp NT Trường",
        "template": "15b.docx",
        "phase": "SCHOOL_ACCEPTANCE",
        "description": "Biên bản họp Hội đồng đánh giá, nghiệm thu cấp Trường",
        "required_fields": ["ten_de_tai", "ma_so_de_tai", "thoi_gian_hop"],
        "role_create": ["THU_KY_HOI_DONG"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },
    "16b": {
        "name": "Báo cáo hoàn thiện NT Trường",
        "template": "16b.docx",
        "phase": "SCHOOL_ACCEPTANCE",
        "description": "Báo cáo về việc hoàn thiện hồ sơ nghiệm thu cấp Trường",
        "required_fields": ["ten_de_tai", "ma_so_de_tai", "don_vi_chu_tri"],
        "role_create": ["GIANG_VIEN"],
        "role_approve": ["CHU_TICH_HOI_DONG", "PHAN_BIEN"]
    },
    "PL3": {
        "name": "Nhận xét phản biện chi tiết",
        "template": "PL3.docx",
        "phase": "SCHOOL_ACCEPTANCE",
        "description": "Bản nhận xét phản biện chi tiết đề tài khoa học",
        "required_fields": ["ten_de_tai", "ma_so_de_tai", "ho_ten_phan_bien"],
        "role_create": ["PHAN_BIEN"],
        "role_approve": ["CHU_TICH_HOI_DONG"]
    },

    # --- Hoàn thành ---
    "17b": {
        "name": "Biên bản giao nhận sản phẩm",
        "template": "17b.docx",
        "phase": "COMPLETED",
        "description": "Biên bản giao nhận sản phẩm của đề tài NCKH",
        "required_fields": ["ten_de_tai", "ma_so_de_tai"],
        "role_create": ["PHONG_KHCN"],
        "role_approve": ["PHONG_QT_TB", "PHONG_KT_TC"]
    },

    # --- Đặc biệt ---
    "18b": {
        "name": "Đơn xin gia hạn",
        "template": "18b.docx",
        "phase": "IN_PROGRESS",
        "description": "Đơn xin gia hạn thời gian thực hiện đề tài",
        "required_fields": ["ten_chu_nhiem", "ten_khoa", "ten_de_tai"],
        "role_create": ["GIANG_VIEN"],
        "role_approve": ["QUAN_LY_KHOA", "PHONG_KHCN"]
    },
}

# =============================================================================
# STATUS -> FORMS MAPPING - Mapping trạng thái với các biểu mẫu cần thiết
# =============================================================================
STATUS_FORM_MAPPING: Dict[str, Dict[str, List[str]]] = {
    # Giai đoạn Đề xuất
    ProposalStatus.DRAFT.value: {
        "required": ["1b"],           # Bắt buộc
        "optional": ["PL1"],          # Tùy chọn (có thể hoàn thiện sau)
    },

    # Xét chọn cấp Khoa
    ProposalStatus.FACULTY_REVIEW.value: {
        "required": ["1b", "PL1", "2b", "3b"],
        "optional": ["4b"],           # Danh mục tổng hợp - tạo khi có nhiều đề tài
    },

    # Xét chọn sơ bộ cấp Trường
    ProposalStatus.SCHOOL_SELECTION.value: {
        "required": ["5b"],
        "optional": [],
    },

    # Hội đồng tư vấn xét chọn
    ProposalStatus.COUNCIL_REVIEW.value: {
        "required": ["6b", "7b"],
        "optional": [],
    },

    # Đã duyệt
    ProposalStatus.APPROVED.value: {
        "required": [],
        "optional": [],
    },

    # Đang thực hiện
    ProposalStatus.IN_PROGRESS.value: {
        "required": [],
        "optional": ["18b"],          # Đơn gia hạn - chỉ khi cần
    },

    # Nghiệm thu cấp Khoa
    ProposalStatus.FACULTY_ACCEPTANCE.value: {
        "required": ["8b", "9b", "10b", "11b", "PL2"],
        "optional": [],
    },

    # Nghiệm thu cấp Trường
    ProposalStatus.SCHOOL_ACCEPTANCE.value: {
        "required": ["12b", "13b", "14b", "15b", "16b"],
        "optional": ["PL3"],
    },

    # Hoàn thành
    ProposalStatus.COMPLETED.value: {
        "required": ["17b"],
        "optional": [],
    },

    # Bị từ chối
    ProposalStatus.REJECTED.value: {
        "required": [],
        "optional": [],
    },
}

# =============================================================================
# WORKFLOW TRANSITIONS - Quy tắc chuyển đổi trạng thái
# =============================================================================
WORKFLOW_TRANSITIONS: Dict[str, Dict[str, Any]] = {
    ProposalStatus.DRAFT.value: {
        "next": [ProposalStatus.FACULTY_REVIEW.value, ProposalStatus.REJECTED.value],
        "required_forms": ["1b"],
        "description": "Chuyển sang xét chọn cấp Khoa"
    },
    ProposalStatus.FACULTY_REVIEW.value: {
        "next": [ProposalStatus.SCHOOL_SELECTION.value, ProposalStatus.REJECTED.value],
        "required_forms": ["2b", "3b"],
        "min_approval_votes": 3,  # Tối thiểu 2/3 phiếu đề nghị thực hiện
        "description": "Chuyển sang xét chọn cấp Trường"
    },
    ProposalStatus.SCHOOL_SELECTION.value: {
        "next": [ProposalStatus.COUNCIL_REVIEW.value, ProposalStatus.REJECTED.value],
        "required_forms": ["5b"],
        "description": "Chuyển sang Hội đồng tư vấn"
    },
    ProposalStatus.COUNCIL_REVIEW.value: {
        "next": [ProposalStatus.APPROVED.value, ProposalStatus.REJECTED.value],
        "required_forms": ["6b", "7b"],
        "description": "Duyệt đề tài"
    },
    ProposalStatus.APPROVED.value: {
        "next": [ProposalStatus.IN_PROGRESS.value],
        "required_forms": [],
        "description": "Bắt đầu thực hiện"
    },
    ProposalStatus.IN_PROGRESS.value: {
        "next": [ProposalStatus.FACULTY_ACCEPTANCE.value],
        "required_forms": [],
        "description": "Chuyển sang nghiệm thu cấp Khoa"
    },
    ProposalStatus.FACULTY_ACCEPTANCE.value: {
        "next": [ProposalStatus.SCHOOL_ACCEPTANCE.value, ProposalStatus.IN_PROGRESS.value],
        "required_forms": ["8b", "9b", "10b", "11b"],
        "min_approval_votes": 3,
        "description": "Chuyển sang nghiệm thu cấp Trường"
    },
    ProposalStatus.SCHOOL_ACCEPTANCE.value: {
        "next": [ProposalStatus.COMPLETED.value, ProposalStatus.FACULTY_ACCEPTANCE.value],
        "required_forms": ["12b", "14b", "15b", "16b"],
        "min_approval_votes": 3,
        "description": "Hoàn thành đề tài"
    },
    ProposalStatus.COMPLETED.value: {
        "next": [],
        "required_forms": ["17b"],
        "description": "Đề tài đã hoàn thành"
    },
}

# =============================================================================
# HELPER FUNCTIONS - Các hàm tiện ích
# =============================================================================
def get_forms_for_status(status: str) -> Dict[str, List[str]]:
    """Lấy danh sách biểu mẫu theo trạng thái"""
    return STATUS_FORM_MAPPING.get(status, {"required": [], "optional": []})

def get_required_forms_for_transition(from_status: str) -> List[str]:
    """Lấy danh sách biểu mẫu bắt buộc để chuyển sang trạng thái tiếp theo"""
    transition = WORKFLOW_TRANSITIONS.get(from_status, {})
    return transition.get("required_forms", [])

def get_next_statuses(current_status: str) -> List[str]:
    """Lấy danh sách trạng thái có thể chuyển đến từ trạng thái hiện tại"""
    transition = WORKFLOW_TRANSITIONS.get(current_status, {})
    return transition.get("next", [])

def get_form_info(form_id: str) -> Dict[str, Any]:
    """Lấy thông tin chi tiết của biểu mẫu"""
    return FORM_INFO.get(form_id, {})

def get_all_forms_for_phase(phase: str) -> List[str]:
    """Lấy tất cả biểu mẫu thuộc một giai đoạn"""
    return [form_id for form_id, info in FORM_INFO.items() if info.get("phase") == phase]

def validate_transition(from_status: str, to_status: str, completed_forms: List[str]) -> Dict[str, Any]:
    """
    Kiểm tra điều kiện chuyển trạng thái
    Returns: {"valid": bool, "missing_forms": List[str], "message": str}
    """
    transition = WORKFLOW_TRANSITIONS.get(from_status, {})
    allowed_next = transition.get("next", [])

    if to_status not in allowed_next:
        return {
            "valid": False,
            "missing_forms": [],
            "message": f"Không thể chuyển từ {from_status} sang {to_status}"
        }

    required_forms = transition.get("required_forms", [])
    missing_forms = [f for f in required_forms if f not in completed_forms]

    if missing_forms:
        return {
            "valid": False,
            "missing_forms": missing_forms,
            "message": f"Thiếu biểu mẫu: {', '.join(missing_forms)}"
        }

    return {
        "valid": True,
        "missing_forms": [],
        "message": "Có thể chuyển trạng thái"
    }

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
            "user_id": "auto_gen_batch",
            # Checkbox mặc định (QUY TẮC CHUNG)
            "box_dat": CHECKBOX_CHECKED,
            "box_khong_dat": CHECKBOX_UNCHECKED,
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
        # QUY TẮC CHUNG: Dùng [x]/[ ] thay vì ☑/☐
        self.dat = CHECKBOX_CHECKED if ket_qua_dat else CHECKBOX_UNCHECKED
        self.ko_dat = CHECKBOX_UNCHECKED if ket_qua_dat else CHECKBOX_CHECKED

        # Checkbox "Đề nghị"
        self.box_de_nghi = CHECKBOX_CHECKED if ket_qua_dat else CHECKBOX_UNCHECKED
        self.box_khong_de_nghi = CHECKBOX_UNCHECKED if ket_qua_dat else CHECKBOX_CHECKED

class Form3b(BaseFormInput):
    # Biên bản họp xét chọn (Có danh sách thành viên)
    pass

class Form4b(BaseFormInput):
    # Danh mục tổng hợp (Bảng động)
    def __init__(self, danh_sach_de_tai=None, **kwargs):
        super().__init__(**kwargs)
        self.danh_sach_de_tai = danh_sach_de_tai or []

# Generic Form cho các mẫu còn lại (5b -> 18b)
class GenericForm(BaseFormInput):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # QUY TẮC CHUNG: Checkbox với [x]/[ ]
        is_pass = kwargs.get('is_pass', True)
        self.box_dat = CHECKBOX_CHECKED if is_pass else CHECKBOX_UNCHECKED
        self.box_khong_dat = CHECKBOX_UNCHECKED if is_pass else CHECKBOX_CHECKED
        self.so_phieu_dat = kwargs.get('so_phieu_dat', "5")
        self.so_phieu_khong_dat = kwargs.get('so_phieu_khong_dat', "0")
