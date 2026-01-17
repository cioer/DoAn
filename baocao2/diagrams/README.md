# Biểu đồ Kỹ thuật - Hệ thống qlNCKH

Thư mục này chứa 8 biểu đồ kỹ thuật cho báo cáo đồ án tốt nghiệp, được tạo bằng **Mermaid** (text-based diagrams).

## 📋 Danh sách Biểu đồ

| # | File | Mô tả | Chương |
|---|------|-------|--------|
| 1 | `01_hybrid_architecture.mmd` | Kiến trúc Hybrid System (Main App + Form Engine Microservice) | Chương 2, 3 |
| 2 | `02_state_machine.mmd` | State Machine (15 states, 67 transitions) | Chương 3 |
| 3 | `03_er_diagram.mmd` | ER Diagram (21 tables, PostgreSQL schema) | Chương 3 |
| 4 | `04_3d_rbac.mmd` | 3D RBAC Authorization Matrix (Role × State × Action) | Chương 3 |
| 5 | `05_deployment_architecture.mmd` | Deployment Architecture (5 Docker containers) | Chương 4 |
| 6 | `06_cicd_pipeline.mmd` | CI/CD Pipeline (GitHub Actions) | Chương 4 |
| 7 | `07_data_flow_form_engine.mmd` | Data Flow - Form Engine Document Generation | Chương 3, 4 |
| 8 | `08_use_case_diagram.mmd` | Use Case Diagram (8 actors, 51 use cases) | Chương 3 |

---

## 🚀 Cách Render Biểu đồ

### Phương án 1: Sử dụng Script tự động (Khuyến nghị)

```bash
# Cài đặt Mermaid CLI (chỉ cần làm 1 lần)
npm install -g @mermaid-js/mermaid-cli

# Chạy script render tất cả diagrams
cd /mnt/dulieu/DoAn/baocao/diagrams
./render-diagrams.sh
```

**Kết quả:**
- PNG files → `diagrams/png/` (chất lượng cao, 2x scale, background transparent)
- SVG files → `diagrams/svg/` (vector format, lossless quality)

---

### Phương án 2: Render từng file thủ công

```bash
# Render sang PNG (high quality)
mmdc -i 01_hybrid_architecture.mmd \
     -o png/01_hybrid_architecture.png \
     -t default \
     -b transparent \
     -s 2

# Render sang SVG (vector)
mmdc -i 01_hybrid_architecture.mmd \
     -o svg/01_hybrid_architecture.svg \
     -t default \
     -b transparent
```

---

### Phương án 3: Sử dụng Docker (không cần cài npm)

```bash
# Pull Docker image
docker pull minlag/mermaid-cli

# Render PNG
docker run --rm -v $(pwd):/data minlag/mermaid-cli \
    -i /data/01_hybrid_architecture.mmd \
    -o /data/png/01_hybrid_architecture.png \
    -t default \
    -b transparent \
    -s 2

# Render SVG
docker run --rm -v $(pwd):/data minlag/mermaid-cli \
    -i /data/01_hybrid_architecture.mmd \
    -o /data/svg/01_hybrid_architecture.svg \
    -t default \
    -b transparent
```

---

### Phương án 4: Online Editor (Preview nhanh)

1. Mở https://mermaid.live
2. Copy nội dung file `.mmd`
3. Paste vào editor
4. Click "Download PNG" hoặc "Download SVG"

---

## 📝 Chỉnh sửa Biểu đồ

Các file `.mmd` là text file thuần, có thể chỉnh sửa bằng bất kỳ text editor nào:

```bash
# Mở bằng VS Code
code 01_hybrid_architecture.mmd

# Mở bằng Vim
vim 01_hybrid_architecture.mmd

# Mở bằng nano
nano 01_hybrid_architecture.mmd
```

**Syntax highlighting:**
- VS Code: Cài extension "Mermaid Markdown Syntax Highlighting"
- JetBrains IDEs: Built-in support
- Online: https://mermaid.live

---

## 🎨 Cấu hình Render

### Tùy chọn mmdc CLI:

| Option | Mô tả | Giá trị đề xuất |
|--------|-------|-----------------|
| `-t, --theme` | Theme diagram | `default`, `dark`, `forest`, `neutral` |
| `-b, --backgroundColor` | Màu nền | `transparent`, `white`, `#f0f0f0` |
| `-s, --scale` | Tỷ lệ scale (PNG) | `2` (high quality), `1` (normal) |
| `-w, --width` | Chiều rộng tối đa | `2400` (recommended) |
| `--quiet` | Ẩn log output | `true` / `false` |

### Theme so sánh:

```bash
# Default theme (blue accent)
mmdc -i diagram.mmd -o diagram-default.png -t default

# Dark theme (for dark backgrounds)
mmdc -i diagram.mmd -o diagram-dark.png -t dark

# Forest theme (green accent)
mmdc -i diagram.mmd -o diagram-forest.png -t forest

# Neutral theme (grayscale)
mmdc -i diagram.mmd -o diagram-neutral.png -t neutral
```

---

## 📖 Sử dụng trong Báo cáo

### Cách chèn vào Word/LaTeX:

**Microsoft Word:**
1. Render diagram sang PNG (high quality)
2. Insert → Picture → chọn file PNG
3. Adjust size (keep aspect ratio)
4. Add caption: "Hình X.Y: Tên biểu đồ"

**LaTeX:**
```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.9\textwidth]{diagrams/png/01_hybrid_architecture.png}
  \caption{Kiến trúc Hybrid - Hệ thống qlNCKH}
  \label{fig:hybrid-arch}
\end{figure}
```

**Markdown:**
```markdown
![Kiến trúc Hybrid](diagrams/png/01_hybrid_architecture.png)
*Hình 3.1: Kiến trúc Hybrid - Hệ thống qlNCKH*
```

---

## 🔧 Troubleshooting

### Lỗi: "mmdc: command not found"

```bash
# Solution 1: Install globally
npm install -g @mermaid-js/mermaid-cli

# Solution 2: Install locally
npm install --save-dev @mermaid-js/mermaid-cli
npx mmdc -i diagram.mmd -o diagram.png

# Solution 3: Use Docker (no npm required)
docker pull minlag/mermaid-cli
```

### Lỗi: "Puppeteer error" hoặc "Chrome not found"

```bash
# Install Chromium dependencies
sudo apt-get install -y \
    libx11-6 libx11-xcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
    libxrender1 libxss1 libxtst6 libnss3 libgdk-pixbuf2.0-0 \
    libgtk-3-0 libxshmfence1 libglu1-mesa libgles2-mesa

# Or use Docker (recommended)
```

### Diagram không hiển thị đúng

1. Kiểm tra syntax Mermaid tại https://mermaid.live
2. Xem log lỗi: chạy mmdc mà không có `--quiet`
3. Thử theme khác: `-t dark` hoặc `-t neutral`

---

## 📚 Tài liệu Tham khảo

- **Mermaid Documentation**: https://mermaid.js.org/
- **Mermaid CLI**: https://github.com/mermaid-js/mermaid-cli
- **Mermaid Live Editor**: https://mermaid.live
- **Syntax Cheat Sheet**: https://jojozhuang.github.io/tutorial/mermaid-cheat-sheet/

---

## ✅ Checklist Hoàn thành

- [x] Tạo 8 Mermaid diagrams (.mmd files)
- [x] Tạo script render tự động (`render-diagrams.sh`)
- [x] Viết README hướng dẫn
- [ ] Render tất cả diagrams sang PNG
- [ ] Render tất cả diagrams sang SVG
- [ ] Chèn diagrams vào báo cáo Word/LaTeX
- [ ] Kiểm tra chất lượng hình ảnh khi in

---

**Ngày tạo**: 17 tháng 01 năm 2025

**Công cụ**: Mermaid.js + @mermaid-js/mermaid-cli

**Tác giả**: [Tên sinh viên]
