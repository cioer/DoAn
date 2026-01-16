# DEV LOG: FORM ENGINE DEVELOPMENT (MẪU 1B - 10B)
*Cập nhật: 16/01/2026*

Tài liệu này ghi lại quá trình phát triển, tinh chỉnh và khắc phục lỗi khi xây dựng module sinh biểu mẫu tự động (Form Engine).

---

## QUY TẮC CHUNG (GLOBAL RULES)

**Luôn áp dụng các quy tắc sau cho MỌI biểu mẫu mới:**

### 1. Checkbox Format
```python
# Luôn dùng [x]/[ ] thay vì ☑/☐ để tránh lỗi font
CHECKBOX_CHECKED = "[x]"
CHECKBOX_UNCHECKED = "[ ]"

# Trong context
"box_dat": CHECKBOX_CHECKED,
"box_khong_dat": CHECKBOX_UNCHECKED,
```

### 2. Căn trái danh sách
```python
from form_engine.src.core.engine import set_left_align_for_lists

# Sau khi replace variables, gọi hàm này
set_left_align_for_lists(doc)  # Tự động nhận diện danh sách
# Hoặc chỉ định biến:
set_left_align_for_lists(doc, ["noi_dung_1", "noi_dung_2"])
```

### 3. Điền bảng không in đậm
```python
from form_engine.src.core.engine import fill_cell_text
from docx.enum.text import WD_ALIGN_PARAGRAPH

# Điền text vào cell, bold=False (mặc định)
fill_cell_text(cells[0], "123", WD_ALIGN_PARAGRAPH.CENTER)
fill_cell_text(cells[1], "Tên thành viên", WD_ALIGN_PARAGRAPH.LEFT)
```

### 4. Date line không ngắt dòng
```python
from form_engine.src.core.engine import get_date_line

# Tạo chuỗi ngày tháng với non-breaking space
context["diadiem_thoigian"] = get_date_line("Nam Định", "20", "01", "2024")
# Kết quả: "Nam Định, ngày 20 tháng 01 năm 2024" (không bị ngắt đôi)
```

### 5. Replace đầy đủ
```python
# Luôn replace ở: paragraphs, tables, headers, footers
for p in doc.paragraphs:
    engine.replace_text_in_element(p, context)

for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                engine.replace_text_in_element(p, context)

for section in doc.sections:
    for p in section.header.paragraphs:
        engine.replace_text_in_element(p, context)
    for p in section.footer.paragraphs:
        engine.replace_text_in_element(p, context)
```

---

## 1. Mẫu 1b (Phiếu đề xuất) - Xử lý Văn bản & Xuống dòng

### 🚩 Vấn đề gặp phải
1.  **Lỗi Gãy Tag (Split Tags):** Các biến `{{ ten_bien }}` trong file Word bị XML tách thành nhiều thẻ `<Run>` rời rạc.
2.  **Lỗi Xuống dòng:** Dữ liệu đầu vào có ký tự `\n` nhưng vào Word không xuống dòng.

### ✅ Giải pháp & Bài học
*   **Smart Replace Algorithm:** Viết hàm quét toàn bộ Paragraph, reset text và dồn vào Run đầu tiên.
*   **Newline Handling:** Tách chuỗi theo `\n`, sau đó dùng `run.add_break()` để xuống dòng cứng.

---

## 2. Mẫu 2b (Phiếu đánh giá) - Xử lý Checkbox

### 🚩 Vấn đề gặp phải
*   Lỗi font khi dùng Unicode Checkbox (`☑`) trên một số máy.
*   Yêu cầu hiển thị `[x]` hoặc chữ x trong khung vuông.

### ✅ Giải pháp
*   **Logic:** Tách biệt 2 loại checkbox:
    *   *Loại hiển thị (Read-only):* Dùng icon `☑ / ☐`.
    *   *Loại điền tay (Input):* Dùng ký tự `[x]` hoặc `x` (kết hợp với Table 1x1 trong Word).

---

## 3. Mẫu 3b (Biên bản họp) - Xử lý Clean Up & Formatting

### 🚩 Vấn đề gặp phải
1.  **Dư thừa nội dung:** Văn bản chứa cả 2 phương án "Đề nghị thực hiện" và "Không thực hiện" cùng lúc.
2.  **Format:** Danh sách thành viên cần có Bullet, Tab và canh lề đẹp.

### ✅ Giải pháp & Bài học
*   **Clean Up Logic:** Dùng thuật toán tìm paragraph chứa từ khóa ("Hoặc", "Không cho phép") và xóa bằng `p._element.getparent().remove()`.
*   **Empty String:** Khi một biến không được dùng đến (ví dụ lý do từ chối khi đã Đạt), hãy gán nó là `""` (rỗng).
*   **List Formatting:** Format chuỗi list (dùng `\t`, `\n`, `•`) ngay trong Python.

---

## 4. Mẫu 4b (Danh mục tổng hợp) - Xử lý Bảng động

### 🚩 Vấn đề gặp phải
1.  **Nhầm Bảng:** Script điền nhầm vào Bảng Header (Index 0).
2.  **Lỗi Format:** Các dòng thêm mới (`add_row`) bị mất viền, font chữ lộn xộn.

### ✅ Giải pháp
*   **Target Table:** Luôn kiểm tra Index bảng (thường là Index 1).
*   **Manual Border:** Viết hàm `set_cell_border` để can thiệp XML vẽ viền đen.
*   **Auto Count:** Biến số lượng (`so_de_tai`) tính từ `len(list)`.

---

## 5. Mẫu 5b (Biên bản sơ bộ) - Xử lý Căn lề & Header

### 🚩 Vấn đề gặp phải
1.  **Căn giữa sai:** Nội dung dài bị căn giữa theo tiêu đề.
2.  **Sót Header:** Biến `qd_so` nằm trong Header không được điền.

### ✅ Giải pháp
*   **Force Alignment:** Khi gặp các biến nội dung dài, ép kiểu `p.alignment = WD_ALIGN_PARAGRAPH.LEFT`.
*   **Deep Scan:** Loop qua cả `doc.sections[].header/footer` để replace biến.

---

## 6. Mẫu 6b (Xét chọn đề cương) - Biến thể tên biến (Typo)

### 🚩 Vấn đề gặp phải
*   **Sót biến:** Template dùng nhiều biến thể (`qd_so`, `qd_sp`).
*   **Lỗi In Đậm:** Nội dung chèn vào bị in đậm dù code đã reset font.

### ✅ Giải pháp
*   **Fallback Variables:** Luôn điền đủ các biến thể (typo/case) trong Context.
*   **Template Fix Required:** Cần mở file Template, chọn đoạn văn bản đó và nhấn Ctrl+B hai lần để reset style.

---

## 7. Mẫu 7b & Chiến lược chung - Quy chuẩn Ngày tháng (Date Line)

### 🚩 Vấn đề gặp phải
*   **Ngắt dòng xấu:** Dòng "Ngày 20 tháng 01 năm 2024" bị ngắt đôi (Ngày 20 ở dòng trên, tháng 01 rớt xuống dưới).
*   **Hack khó khăn:** Cố gắng replace từng biến lẻ `{{ngay}}`, `{{thang}}` không giải quyết được vấn đề dính dòng.

### ✅ Giải pháp (Unified Strategy)
*   **Template:** Xóa hết text cứng. Thay bằng duy nhất thẻ `{{diadiem_thoigian}}`.
*   **Code:** Tạo chuỗi có chứa **Non-breaking Space** (`\u00A0`):
    ```python
    def get_date_line(city="Nam Định", d, m, y):
        # Dùng \u00A0 thay cho Space để dính liền các cụm từ
        return f"{city},\u00A0ngày\u00A0{d}\u00A0tháng\u00A0{m}\u00A0năm\u00A0{y}"
    
    context["diadiem_thoigian"] = get_date_line("Ninh Bình", "20", "10", "2024")
    ```
*   **Lợi ích:** Dòng ngày tháng sẽ luôn đi cùng nhau, không bao giờ bị xé lẻ.

---

## 8. Mẫu 7b (Báo cáo hoàn thiện) - Thiếu biến Hội đồng

### 🚩 Vấn đề gặp phải
*   **Thiếu biến:** Template có `ten_chu_tich_hoi_dong` và `ten_thu_ky` nhưng code không cung cấp.

### ✅ Giải pháp
*   Thêm các biến bị thiếu vào context:
    ```python
    "ten_chu_tich_hoi_dong": "PGS.TS. Trần Văn B",
    "ten_thu_ky": "ThS. Lê Thị C",
    ```

---

## 9. Mẫu 8b (Đề nghị nghiệm thu) - Bảng động & Formatting

### 🚩 Vấn đề gặp phải
1.  **Thiếu biến:** `don_vi_cong_tac_chu_tich`, `don_vi_cong_tac_thu_ky`, `ten_thu_ky`.
2.  **Sai bảng:** Code đang fill bảng cuối cùng thay vì bảng hội đồng (Index 1).
3.  **STT không liền:** STT thành viên bắt đầu từ 1 thay vì 3 (vì row 1=Chủ tịch, row 2=Thư ký).
4.  **In đậm lỗi:** Text điền vào bị in đậm do kế thừa format của template.

### ✅ Giải pháp
*   **Replace đầy đủ:** Loop qua paragraphs, tables, headers, footers để replace tất cả biến:
    ```python
    for p in doc.paragraphs: engine.replace_text_in_element(p, context)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    engine.replace_text_in_element(p, context)
    ```
*   **Đúng bảng:** Sử dụng `doc.tables[1]` cho bảng hội đồng.
*   **STT đúng:** Danh sách ủy viên bắt đầu từ STT=3:
    ```python
    hoi_dong = [
        {"stt": 3, "ten": "TS. Phạm Văn C", "don_vi": "Khoa Điện"},
        {"stt": 4, "ten": "TS. Hoàng Văn D", "don_vi": "Khoa Cơ khí"},
        {"stt": 5, "ten": "ThS. Ngô Thị E", "don_vi": "Trung tâm Số"}
    ]
    ```
*   **Reset Formatting:** Helper function để điền text KHÔNG in đậm:
    ```python
    def fill_cell_text(cell, text, align=None):
        for p in cell.paragraphs:
            for run in p.runs:
                run.text = ""
        if cell.paragraphs:
            p = cell.paragraphs[0]
            p.text = text
            for run in p.runs:
                run.bold = False  # QUAN TRỌNG: Tắt bold
                run.font.name = 'Times New Roman'
            if align:
                p.alignment = align
    ```

---

## 10. Mẫu 9b (Phiếu đánh giá nghiệm thu) - Checkbox & Căn lề danh sách

### 🚩 Vấn đề gặp phải
1.  **Checkbox font error:** Dùng `☑`/`☐` bị lỗi font trên một số máy.
2.  **Sai căn lề:** Các danh sách gạch đầu dòng bị căn giữa hoặc inherit từ template.

### ✅ Giải pháp
*   **Checkbox chuẩn:** Dùng `[x]` và `[ ]` thay vì Unicode:
    ```python
    "box_dat": "[x]",
    "box_khong_dat": "[ ]",
    ```
*   **Căn trái danh sách:** Helper function để căn trái các paragraph chứa biến danh sách:
    ```python
    vars_left_align = [
        "cac_chi_tieu_chu_yeu_cac_yeu_cau_khoa_hoc_cua_ket_qua",
        "phuong_phap_nghien_cuu",
        "so_luong_chung_loai_khoi_luong_san_pham",
        "nhan_xet_ve_muc_do_hoan_thanh",
        "y_kien_khac"
    ]

    def set_left_align_for_list_vars(doc, var_list):
        for p in doc.paragraphs:
            for var in var_list:
                if var in p.text or p.text.strip().startswith('-'):
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    break
    ```

---

## 11. Mẫu 10b (Biên bản họp Hội đồng) - Block điều kiện phức tạp

### 🚩 Vấn đề gặp phải
*   **Multi-paragraph template tags:** Template có block `{{...}}` span nhiều paragraphs với 2 lựa chọn (Đạt/Không đạt).
*   **Section numbering:** Cần đánh số "8. Kết luận của Hội đồng" cho mục thứ 2 (trùng tên với mục 7.1-7.3).
*   **Multi-line content:** Nội dung danh sách có `\n` cần tách thành paragraphs riêng.

### ✅ Giải pháp
*   **Find exact match:** Template có 2 dòng "Kết luận của Hội đồng":
    *   Para 14: "Kết luận của Hội đồng:" (có dấu `:`) - Section 7
    *   Para 31: "Kết luận của Hội đồng" (không có `:`) - Section 8 → cần sửa thành "8. Kết luận của Hội đồng"
*   **Rebuild section:** Xóa toàn bộ block template giữa mục 8 và "Phiên họp kết thúc", insert lại nội dung đúng:
    ```python
    # Tìm và xóa section cũ
    section8_idx = find_paragraph(doc, "Kết luận của Hội đồng")  # không có dấu :
    end_idx = find_paragraph(doc, "Phiên họp kết thúc")

    # Đổi tên mục 8
    doc.paragraphs[section8_idx].text = "8. Kết luận của Hội đồng"

    # Xóa paragraphs giữa (từ dưới lên)
    for idx in reversed(range(section8_idx + 1, end_idx)):
        p_element = doc.paragraphs[idx]._element
        p_element.getparent().remove(p_element)

    # Insert lại nội dung đúng, xử lý multi-line strings
    texts = [
        (multi_line_content, True),  # True = có \n, cần tách
        (single_line_content, False),
    ]
    for text, is_multiline in reversed(texts):
        if is_multiline and '\n' in text:
            lines = text.split('\n')
            for line in reversed(lines):  # Insert ngược để đúng thứ tự
                new_para = insert_paragraph_before(line)
        else:
            new_para = insert_paragraph_before(text)
    ```
*   **Insert order reversed:** Khi dùng `insert_paragraph_before()`, phải insert theo thứ tự NGƯỢC để nội dung hiển thị đúng.

---

## 12. Mẫu 11b (Báo cáo hoàn thiện hồ sơ) - Multi-line lists

### 🚩 Vấn đề gặp phải
*   **Multi-line content:** Biến `{{noi_dung_da_sua}}` và `{{noi_dung_bo_sung}}` chứa danh sách với `\n`.
*   **Date line:** Template dùng biến riêng `{{ngay}}`, `{{thang}}`, `{{nam}}` thay vì `{{diadiem_thoigian}}`.

### ✅ Giải pháp
*   FormEngine tự động xử lý `\n` bằng `add_break()`.
*   `set_left_align_for_lists()` tự động căn trái các dòng bắt đầu bằng `-`.

---

## 13. Mẫu 12b (Nhận xét phản biện) - Typo variables

### 🚩 Vấn đề gặp phải
*   **Typo trong template:** `{{don_vi_nguoi_phan_dien}}` thay vì `don_vi_phan_bien`.

### ✅ Giải pháp
*   Thêm cả 2 biến thể vào context (typo và đúng).

---

## 14. Mẫu 13b (Giấy đề nghị thành lập HĐ) - Bảng động đơn giản

### 🚩 Vấn đề gặp phải
*   **Dynamic table:** Table 1 có template row cho ủy viên với biến `{{item.stt+2}}`.

### ✅ Giải pháp
*   Xóa template row và dùng `add_row()` để thêm rows cho ủy viên.
*   STT bắt đầu từ 3 (sau Chủ tịch=1, Thư ký=2).

---

## 15. Mẫu 14b (Phiếu đánh giá cấp Trường) - Checkbox table

### 🚩 Vấn đề gặp phải
*   **Checkbox trong table:** Bảng đánh giá có 9 tiêu chí, mỗi dòng có checkbox `{{dat}}` và `{{khong_dat}}`.

### ✅ Giải pháp
*   Dùng context với `CHECKBOX_CHECKED` và `CHECKBOX_UNCHECKED`.
*   Tất cả các tiêu chí dùng chung 2 biến `{{dat}}` và `{{khong_dat}}`.

---

## 16. Mẫu 18b (Đơn xin gia hạn) - Ngày tháng & Multi-line

### 🚩 Vấn đề gặp phải
*   **Date variables:** Template dùng `{{ngay}}`, `{{thang}}`, `{{nam}}`.
*   **Multi-line kết quả:** `{{da_dat_duoc_ket_qua_gi_so_voi_de_cuong}}` chứa danh sách.

### ✅ Giải pháp
*   Sử dụng FormEngine để replace - `\n` tự động được xử lý.
*   `set_left_align_for_lists()` căn trái danh sách.

---

## 17. Tổng kết Forms

| Mẫu | Tên form | Đặc điểm | Status |
|-----|----------|----------|--------|
| 1b  | Phiếu đề xuất | Basic variables | ✅ |
| 2b  | Phiếu đánh giá | Checkbox | ✅ |
| 3b  | Biên bản họp | List formatting, clean up | ✅ |
| 4b  | Danh mục tổng hợp | Dynamic table, borders | ✅ |
| 5b  | Biên bản sơ bộ | Alignment, header | ✅ |
| 6b  | Xét chọn đề cương | Typo variables | ✅ |
| 7b  | Báo cáo hoàn thiện | Missing variables | ✅ |
| 8b  | Đề nghị nghiệm thu | Bảng hội đồng, STT | ✅ |
| 9b  | Phiếu đánh giá NT | Checkbox, lists | ✅ |
| 10b | Biên bản họp HĐ | Multi-paragraph block, section numbering | ✅ |
| 11b | Báo cáo hồ sơ NT | Multi-line lists | ✅ |
| 12b | Nhận xét PB | Typo variables | ✅ |
| 13b | Giấy đề nghị HĐ | Dynamic table | ✅ |
| 14b | Phiếu đánh giá T. | Checkbox table | ✅ |
| 18b | Đơn xin gia hạn | Multi-line kết quả | ✅ |

---

## 18. Checklist Triển khai Mới

1.  **Phân tích Template:** Chạy `scan_tags.py` để lấy danh sách biến.
2.  **Sửa Template (Manual):**
    *   Thay date line bằng `{{diadiem_thoigian}}` nếu cần.
    *   Vẽ khung cho checkbox `[x]`.
    *   Gộp Mục Kết luận thành `{{KHOI_KET_LUAN}}` nếu có block điều kiện.
3.  **Code Python:**
    *   Map đủ biến thể (bao gồm cả typo như `qd_sp`, `qd_so`).
    *   Replace ở: paragraphs, tables, headers, footers.
    *   Dùng helper `fill_cell_text()` khi điền bảng để reset formatting.
    *   STT bảng hội đồng: Chủ tịch=1, Thư ký=2, Ủy viên bắt đầu từ 3.
    *   **Checkbox:** Luôn dùng `[x]` và `[ ]` thay vì `☑`/`☐` để tránh lỗi font.
    *   **Căn trái danh sách:** Các biến chứa danh sách gạch đầu dòng (`-`, `•`) cần set `p.alignment = WD_ALIGN_PARAGRAPH.LEFT`.
4.  **Chạy tất cả:** `python3 generate_all_forms.py`
