# Báo cáo Đồ án Tốt nghiệp

## Hệ thống Quản lý Nghiên cứu Khoa học (qlNCKH)

Đồ án xây dựng hệ thống web quản lý toàn bộ vòng đời đề tài nghiên cứu khoa học cấp cơ sở, từ đăng ký → xét duyệt → thực hiện → đánh giá → nghiệm thu.

---

## Cấu trúc thư mục

```
baocao2/
├── chuong_1_tong_quan.txt           # Chương 1: Tổng quan
├── chuong_2_phan_*.txt              # Chương 2: Cơ sở lý thuyết (4 phần)
├── chuong_3_phan_*.txt              # Chương 3: Phân tích thiết kế (8 phần)
├── chuong_4_phan_*.txt              # Chương 4: Cài đặt (6 phần)
├── chuong_5_phan_*.txt              # Chương 5: Kết quả & Đánh giá (4 phần)
├── loi_cam_on.txt                   # Lời cảm ơn
├── danh_muc_tu_viet_tat.txt         # Danh mục từ viết tắt
├── tai_lieu_tham_khao.txt           # Tài liệu tham khảo
├── diagrams/                        # Biểu đồ minh họa
│   ├── *.excalidraw                 # 17 biểu đồ Excalidraw
│   └── *.mmd                        # 8 biểu đồ Mermaid
└── README.md                        # File này
```

---

## Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản |
|------------|-----------|-----------|
| **Frontend** | React + TypeScript + Vite | 19.0.0 / 7.0.0 |
| **Backend** | NestJS + TypeScript | 11.0.0 |
| **Database** | PostgreSQL + Prisma ORM | 15 / 5.22.0 |
| **Cache** | Redis | 7 |
| **Form Engine** | FastAPI + python-docx + LibreOffice | 0.109.2 / 1.1.0 / 7 |
| **Deployment** | Docker Compose + Nginx | - |

---

## Tính năng chính

### 6 nhóm chức năng

1. **Xác thực & Phân quyền** - JWT + RBAC 3 chiều (Role × State × Action)
2. **Quản lý vòng đời đề tài** - CRUD proposals với validation
3. **Máy trạng thái Workflow** - 13 trạng thái, 26 actions, 5 giai đoạn
4. **Xét duyệt cấp Khoa/Trường** - Quy trình 2 cấp với SLA tracking
5. **Quản lý Hội đồng & Đánh giá** - Thành lập hội đồng, chấm điểm
6. **Tạo tài liệu tự động** - 18 mẫu biểu (1b-18b), xuất Word/PDF

### Kiến trúc

- **Hybrid Architecture**: Modular Monolith (NestJS 23 modules) + Microservice (Form Engine Python)
- **Three-tier**: Presentation → Business → Data
- **5 lớp bảo mật**: HTTPS → JWT → RBAC 3D → Input Validation → Audit Trail

---

## Biểu đồ minh họa

### Excalidraw (17 files)

| File | Mô tả |
|------|-------|
| `2_1_state_machine_concept` | Khái niệm State Machine |
| `2_2_rbac_three_dimensions` | RBAC 3 chiều |
| `2_3_audit_trail` | Audit Trail append-only |
| `2_4_sla_working_hours` | Tính SLA giờ làm việc |
| `2_5_hybrid_architecture` | Kiến trúc Hybrid |
| `3_1_functional_groups` | 6 nhóm chức năng |
| `3_3_system_architecture` | Kiến trúc 3 tầng |
| `3_4_database_erd` | Database 21 tables |
| `3_5_workflow_states` | 13 trạng thái workflow |
| `3_6_ui_layout` | Layout giao diện |
| `3_7_security_layers` | 5 lớp bảo mật |
| `4_1_project_structure` | Cấu trúc Nx Monorepo |
| `4_2_backend_modules` | 23 modules NestJS |
| `4_4_form_engine_flow` | Luồng tạo tài liệu |
| `4_5_docker_containers` | Docker Compose |
| `5_2_functional_evaluation` | Đánh giá chức năng |
| `5_3_performance_metrics` | Đánh giá hiệu năng |

### Cách sử dụng

1. Mở file `.excalidraw` bằng [Excalidraw](https://excalidraw.com/)
2. Export sang PNG/SVG với scale 2x
3. Chèn vào Word document

---

## Kết quả đánh giá

| Tiêu chí | Mục tiêu | Kết quả |
|----------|----------|---------|
| API response time | < 500ms | 98% đạt |
| Word generation | < 5s | 100% đạt |
| PDF conversion | < 15s | 100% đạt |
| Test coverage | > 70% | Đạt |
| Chức năng | 6/6 nhóm | 100% đạt |

---

## Hướng dẫn sử dụng

### Chỉnh sửa nội dung

1. Mở file `.txt` tương ứng với chương cần sửa
2. Chỉnh sửa nội dung (đã loại bỏ dòng trống để dễ copy vào Word)
3. Copy toàn bộ nội dung vào Word document

### Chèn biểu đồ

1. Mở [excalidraw.com](https://excalidraw.com/)
2. File → Open → chọn file `.excalidraw`
3. Export image → PNG → Scale 2x
4. Chèn hình vào Word

---

## Tác giả

- **Sinh viên**: [Tên sinh viên]
- **GVHD**: [Tên giảng viên]
- **Trường**: [Tên trường]
- **Năm**: 2024-2025
