# Manual Test Guide - QLNCKH

Tai liệu hướng dẫn kiểm thử thủ công dự án Quản Lý Nghiên Cứu Khoa Học (QLNCKH).

## 1. Cài đặt và Chạy dự án

Trước khi test, hãy đảm bảo hệ thống đã được cài đặt và khởi chạy chính xác.

### Yêu cầu tiên quyết
- Node.js (v20+)
- Docker & Docker Compose
- PostgresQL (chạy qua Docker)

### Các bước khởi chạy

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Khởi động Database:**
   ```bash
   docker-compose up -d
   ```

3. **Migrate và Seed dữ liệu mẫu (Quan trọng để có tài khoản test):**
   ```bash
   npm run db:migrate
   npm run seed:all
   ```

4. **Chạy Backend (API):**
   ```bash
   npx nx serve api
   ```
   *API sẽ chạy tại: http://localhost:4000/api*

5. **Chạy Frontend (Web Apps):**
   Trong một terminal mới:
   ```bash
   npx nx serve web-apps
   ```
   *Web sẽ chạy tại: http://localhost:4200*

---

## 2. Danh sách Tài khoản Test (Demo Users)

Mật khẩu chung cho tất cả tài khoản: **`Demo@123`**

| Role | Email | Tên hiển thị | Chức năng chính |
|------|-------|--------------|-----------------|
| **GIANG_VIEN** | `DT-USER-001@demo.qlnckh.edu.vn` | Nguyễn Văn A | Tạo đề tài, nộp hồ sơ, xem dashboard cá nhân. |
| **QUAN_LY_KHOA** | `DT-USER-002@demo.qlnckh.edu.vn` | Trần Thị B | Duyệt đề tài cấp Khoa, phân công phản biện cấp Khoa. |
| **THU_KY_KHOA** | `DT-USER-003@demo.qlnckh.edu.vn` | Lê Văn C | Hỗ trợ quản lý khoa, kiểm tra hồ sơ sơ bộ. |
| **PHONG_KHCN** | `DT-USER-004@demo.qlnckh.edu.vn` | Phạm Thị D | Duyệt đề tài cấp Trường, quản lý danh sách đề tài toàn trường. |
| **THU_KY_HOI_DONG** | `DT-USER-005@demo.qlnckh.edu.vn` | Hoàng Văn E | Ghi biên bản hội đồng, cập nhật kết quả đánh giá. |
| **THANH_VIEN_HD** | `DT-USER-006@demo.qlnckh.edu.vn` | Đặng Thị F | Đánh giá đề tài (nếu được phân công vào hội đồng). |
| **BAN_GIAM_HOC** | `DT-USER-007@demo.qlnckh.edu.vn` | Vũ Văn G | Xem báo cáo tổng hợp, phê duyệt cuối cùng (nếu cần). |
| **ADMIN** | `DT-USER-008@demo.qlnckh.edu.vn` | Admin System | Quản lý user, cấu hình hệ thống, import dữ liệu. |

---

## 3. Kịch bản Test theo Luồng nghiệp vụ (Workflow)

Thực hiện lần lượt các bước sau để kiểm tra luồng chính của dự án:

### Bước 1: Đăng ký đề tài (Role: GIANG_VIEN)
1. Đăng nhập bằng `DT-USER-001`.
2. Vào trang **Quản lý đề tài** (Proposals).
3. Nhấn **Thêm mới** (Create).
4. Điền thông tin đề tài và Lưu nháp (Save Draft).
5. Kiểm tra trạng thái đề tài là `DRAFT` (Nháp).
6. Nhấn **Nộp hồ sơ** (Submit) để chuyển sang cấp Khoa.
7. Trạng thái mong đợi: `FACULTY_REVIEW` (Đang xét (Khoa)).

### Bước 2: Duyệt cấp Khoa (Role: QUAN_LY_KHOA)
1. Đăng nhập bằng `DT-USER-002` (Logout tài khoản cũ trước).
2. Vào Dashboard hoặc Danh sách đề tài.
3. Tìm đề tài vừa nộp của Nguyễn Văn A.
4. Xem chi tiết -> Nhấn **Duyệt** (Approve).
5. Trạng thái mong đợi: `SCHOOL_SELECTION_REVIEW` (Đang xét (Trường)).

### Bước 3: Duyệt sơ bộ cấp Trường (Role: PHONG_KHCN)
1. Đăng nhập bằng `DT-USER-004`.
2. Tìm đề tài ở trạng thái `SCHOOL_SELECTION_REVIEW`.
3. Có thể thực hiện **Duyệt** để đưa vào hội đồng xét duyệt.
4. Trạng thái mong đợi: `OUTLINE_COUNCIL_REVIEW` (Đang xét (Hội đồng)).

### Bước 4: Xét duyệt Hội đồng (Role: THU_KY_HOI_DONG / HOI_DONG)
*Lưu ý: Cần chức năng tạo hội đồng và gán đề tài vào hội đồng trước (nếu có).*
1. Đăng nhập `DT-USER-005` (Thư ký hội đồng).
2. Cập nhật biên bản/kết quả họp hội đồng cho đề tài.
3. Nhập kết quả là **Thông qua**.
4. Trạng thái mong đợi: `APPROVED` (Đã duyệt) hoặc `IN_PROGRESS` (Đang thực hiện) tùy logic hệ thống.

### Bước 5: Nghiệm thu (Flow tương tự)
Sau khi đề tài `IN_PROGRESS` một thời gian:
1. **GIANG_VIEN** nộp báo cáo nghiệm thu -> Trạng thái `FACULTY_ACCEPTANCE_REVIEW`.
2. **QUAN_LY_KHOA** duyệt -> Trạng thái `SCHOOL_ACCEPTANCE_REVIEW`.
3. **PHONG_KHCN** duyệt -> Trạng thái `HANDOVER` hoặc `COMPLETED`.

### Các chức năng phụ trợ cần test
- **Dashboard:** Kiểm tra từng role xem Dashboard hiển thị đúng số liệu liên quan đến mình không.
- **Biểu mẫu:** Thử xuất PDF hoặc file Word (nếu có nút Export).
- **Phân quyền:**
    - Thử dùng `GIANG_VIEN` truy cập vào trang Admin -> Phải bị chặn (403 Forbidden).
    - Thử dùng `PHONG_KHCN` sửa đề tài của Giảng viên khác -> Phải bị chặn.
