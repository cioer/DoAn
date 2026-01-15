# Enterprise Form Engine

Hệ thống tạo biểu mẫu tự động chuyên nghiệp (Document Generation Pipeline). Hệ thống cho phép điền dữ liệu vào các Template DOCX chuẩn, đảm bảo giữ nguyên định dạng gốc, kiểm soát chặt chẽ dữ liệu đầu vào và hỗ trợ xuất bản ra PDF với Audit Log đầy đủ.

## 🚀 Tính năng chính

*   **Template-Driven:** Sử dụng file Word (.docx) làm mẫu. Giữ nguyên 100% định dạng, font chữ, bảng biểu của văn bản gốc (theo quy định hành chính).
*   **Strict Validation:** Dữ liệu đầu vào được kiểm tra nghiêm ngặt bằng Schema (Pydantic). Hệ thống từ chối xử lý nếu thiếu trường hoặc sai định dạng.
*   **Dual Output:** Xuất đồng thời DOCX (để chỉnh sửa nếu cần) và PDF (để in ấn/ký số).
*   **Audit Logging:** Tự động ghi lại lịch sử tạo file (Ai, lúc nào, biểu mẫu nào) phục vụ truy vết.
*   **Form Engine Core:** Kiến trúc tách biệt, dễ dàng mở rộng thêm hàng trăm biểu mẫu (1a, 1b, 2a...) mà không ảnh hưởng code lõi.

---

## 📂 Cấu trúc dự án

```text
form_engine/
├── templates/              # KHO TEMPLATE (Source of Truth)
│   ├── mau_1a.docx         # File Word gốc chứa thẻ Jinja2 {{...}}
│   └── ...
├── src/
│   ├── schemas/            # KHO LUẬT DỮ LIỆU (Input Validation)
│   │   ├── mau_1a.py       # Class định nghĩa các trường dữ liệu cho Mẫu 1a
│   │   └── base.py         # Các trường chung
│   ├── core/               # ENGINE (Xử lý chính)
│   │   └── engine.py       # Logic: Load Doc -> Merge Data -> Convert PDF -> Log
│   └── utils/
├── output/                 # KẾT QUẢ
│   └── YYYY-MM-DD/         # Phân thư mục theo ngày
│       ├── mau_1a_time.docx
│       └── mau_1a_time.pdf
├── logs/                   # NHẬT KÝ HỆ THỐNG
│   └── audit.jsonl         # File log truy vết dạng JSON Lines
├── main.py                 # CLI / Entrypoint để chạy thử
└── requirements.txt        # Các thư viện Python cần thiết
```

---

## 🛠 Cài đặt & Môi trường

### 1. Yêu cầu hệ thống
*   Python 3.8+
*   **LibreOffice** (Bắt buộc để tính năng xuất PDF hoạt động).
    *   Ubuntu/Debian: `sudo apt install libreoffice`
    *   MacOS: `brew install --cask libreoffice`
    *   Windows: Cài đặt LibreOffice và thêm `soffice.exe` vào PATH.

### 2. Cài đặt thư viện Python
```bash
pip install -r requirements.txt
```
*Nội dung file requirements.txt:*
```text
docxtpl
pydantic
python-docx
```

---

## 📖 Hướng dẫn thêm Biểu mẫu mới (Workflow)

Để thêm một biểu mẫu mới (ví dụ: `Mẫu 2b`), thực hiện đúng 3 bước sau:

### Bước 1: Chuẩn bị Template (Word)
1.  Mở file Word mẫu chuẩn (`mau_2b.docx`).
2.  Xác định các vị trí cần điền dữ liệu.
3.  Thay thế nội dung tĩnh bằng cú pháp Jinja2 `{{ ten_bien }}`.
    *   *Ví dụ:* `Ngày...tháng...năm...` -> `Ngày {{ ngay }} tháng {{ thang }} năm {{ nam }}`
    *   *Ví dụ Bảng:*
        ```text
        {% for item in danh_sach %}
        {{ item.stt }} | {{ item.ten }} | {{ item.ket_qua }}
        {% endfor %}
        ```
4.  Lưu file vào thư mục `form_engine/templates/mau_2b.docx`.

### Bước 2: Định nghĩa Schema (Python)
Tạo file `form_engine/src/schemas/mau_2b.py`:

```python
from pydantic import BaseModel, Field
from typing import List

class ChiTiet(BaseModel):
    stt: int
    ten: str
    ket_qua: str

class Mau2bInput(BaseModel):
    ngay: int
    thang: int
    nam: int
    nguoi_ky: str = Field(..., description="Tên người ký")
    danh_sach: List[ChiTiet]
    user_id: str # Để ghi log
```

### Bước 3: Tích hợp vào Logic (Backend)
Sử dụng Engine để gọi biểu mẫu này:

```python
from form_engine.src.core.engine import FormEngine
from form_engine.src.schemas.mau_2b import Mau2bInput

# 1. Nhận data từ FE/API
raw_data = { ... }

# 2. Validate
try:
    input_data = Mau2bInput(**raw_data)
except Exception as e:
    return "Lỗi dữ liệu: " + str(e)

# 3. Render
engine = FormEngine()
paths = engine.render("mau_2b.docx", input_data.dict(), user_id=input_data.user_id)

print(paths['docx']) # Trả về đường dẫn file
print(paths['pdf'])
```

---

## ⚠️ Lưu ý Quan trọng (Production Note)

Hiện tại code trong thư mục `src/schemas/mau_1a.py` đang ở chế độ **Mock** (Giả lập) để chạy demo trong môi trường không có thư viện.

**Khi triển khai thật (Production):**
1.  Mở file `src/schemas/mau_1a.py`.
2.  Xóa class `BaseModel` và `Field` tự viết (Mock).
3.  Uncomment (mở lại) dòng `from pydantic import BaseModel, Field`.
4.  Đảm bảo đã cài `pip install pydantic`.

---

## 🔍 Audit Log
Mọi thao tác xuất file đều được ghi vào `form_engine/logs/audit.jsonl` với cấu trúc:
```json
{
  "docx": "path/to/file.docx",
  "pdf": "path/to/file.pdf",
  "timestamp": "2024-05-20T10:00:00",
  "user": "admin_user",
  "template": "mau_1a.docx"
}
```
Sử dụng dữ liệu này để thống kê hoặc truy vết khi có sự cố.
