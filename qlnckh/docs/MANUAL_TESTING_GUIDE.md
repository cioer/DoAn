# Hướng Dẫn Test Thủ Công Các Trạng Thái Đề Tài

## Mục Lục
1. [Tổng quan về các trạng thái](#tổng-quan-về-các-trạng-thái)
2. [Chuẩn bị môi trường test](#chuẩn-bị-môi-trường-test)
3. [Các tài khoản test](#các-tài-khoản-test)
4. [Luồng chính (Happy Path)](#luồng-chính-happy-path)
5. [Test từng trạng thái](#test-từng-trạng-thái)
6. [Lệnh cURL mẫu](#lệnh-curl-mẫu)

---

## Tổng Quan Về Các Trạng Thái

### Sơ đồ luồng workflow

```
┌──────────┐     SUBMIT      ┌─────────────────────────────────┐
│  DRAFT   │ ───────────────►│ FACULTY_COUNCIL_OUTLINE_REVIEW  │
└──────────┘                 └─────────────────────────────────┘
     │                                      │
     │ CANCEL                    APPROVE    │    RETURN
     ▼                              │       │       │
┌──────────┐                        ▼       │       ▼
│CANCELLED │          ┌─────────────────────────────────────┐
└──────────┘          │ SCHOOL_COUNCIL_OUTLINE_REVIEW       │◄─────┐
                      └─────────────────────────────────────┘      │
                                     │                              │
                          APPROVE    │    RETURN/REJECT            │
                              │      │       │                      │
                              ▼      │       ▼                      │
                      ┌──────────┐   │  ┌───────────────────┐       │
                      │ APPROVED │   │  │ CHANGES_REQUESTED │───────┘
                      └──────────┘   │  └───────────────────┘  RESUBMIT
                              │      │
                  START_PROJECT      │
                              │      │
                              ▼      │
                      ┌──────────────┐
                      │ IN_PROGRESS  │
                      └──────────────┘
                              │
                  SUBMIT_ACCEPTANCE
                              │
                              ▼
          ┌─────────────────────────────────────────┐
          │ FACULTY_COUNCIL_ACCEPTANCE_REVIEW       │
          └─────────────────────────────────────────┘
                              │
                    FACULTY_ACCEPT
                              │
                              ▼
          ┌─────────────────────────────────────────┐
          │ SCHOOL_COUNCIL_ACCEPTANCE_REVIEW        │
          └─────────────────────────────────────────┘
                              │
                         ACCEPT
                              │
                              ▼
                      ┌──────────┐
                      │ HANDOVER │
                      └──────────┘
                              │
                   HANDOVER_COMPLETE
                              │
                              ▼
                      ┌──────────┐
                      │COMPLETED │
                      └──────────┘
```

### Các trạng thái ngoại lệ

| Trạng thái | Mô tả | Ai có quyền |
|------------|-------|-------------|
| `PAUSED` | Tạm dừng (từ bất kỳ trạng thái non-terminal) | PHONG_KHCN |
| `CANCELLED` | Hủy (từ DRAFT hoặc PAUSED) | GIANG_VIEN |
| `WITHDRAWN` | Rút (từ các trạng thái review) | GIANG_VIEN |
| `REJECTED` | Từ chối | QUAN_LY_KHOA, BAN_GIAM_HOC |

---

## Chuẩn Bị Môi Trường Test

### 1. Khởi động Backend
```bash
cd /mnt/dulieu/DoAn/qlnckh
npx nx serve api
```

### 2. Khởi động Frontend (optional)
```bash
cd /mnt/dulieu/DoAn/qlnckh
npx nx serve web-apps
```

### 3. Kiểm tra database
```bash
# Kết nối PostgreSQL
psql -h localhost -U postgres -d qlnckh

# Xem danh sách đề tài
SELECT id, title, state FROM proposals LIMIT 10;
```

---

## Các Tài Khoản Test

| Email | Role | Mô tả | Quyền chính |
|-------|------|-------|-------------|
| DT-USER-001@demo.qlnckh.edu.vn | GIANG_VIEN | Giảng viên | Submit, Resubmit, Withdraw, Cancel |
| DT-USER-002@demo.qlnckh.edu.vn | QUAN_LY_KHOA | Trưởng khoa | Approve/Return Faculty, Assign Council |
| DT-USER-003@demo.qlnckh.edu.vn | THU_KY_KHOA | Thư ký khoa | Approve/Return Faculty, Assign Council |
| DT-USER-004@demo.qlnckh.edu.vn | PHONG_KHCN | Phòng KHCN | Assign Council (School), Pause/Resume |
| DT-USER-005@demo.qlnckh.edu.vn | BAN_GIAM_HOC | Ban giám hiệu | Approve/Reject Council (School) |

### Đăng nhập và lưu cookies

```bash
# Đăng nhập GIANG_VIEN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"DT-USER-001@demo.qlnckh.edu.vn","password":"demo@123"}' \
  -c /tmp/gv_cookies.txt

# Đăng nhập QUAN_LY_KHOA
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"DT-USER-002@demo.qlnckh.edu.vn","password":"demo@123"}' \
  -c /tmp/qlk_cookies.txt

# Đăng nhập PHONG_KHCN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"DT-USER-004@demo.qlnckh.edu.vn","password":"demo@123"}' \
  -c /tmp/pkhcn_cookies.txt

# Đăng nhập BAN_GIAM_HOC
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"DT-USER-005@demo.qlnckh.edu.vn","password":"demo@123"}' \
  -c /tmp/bgh_cookies.txt
```

---

## Luồng Chính (Happy Path)

### Bước 1: Tạo đề tài (DRAFT)
```bash
# Sử dụng GIANG_VIEN để tạo đề tài mới
curl -X POST http://localhost:3000/api/proposals \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nghiên cứu AI trong giáo dục",
    "description": "Ứng dụng trí tuệ nhân tạo vào việc cải thiện chất lượng giảng dạy",
    "expectedDuration": 12,
    "expectedBudget": 50000000
  }'

# Lưu proposalId để sử dụng cho các bước tiếp theo
export PROPOSAL_ID="<id-từ-response>"
```

### Bước 2: Submit đề tài (DRAFT → FACULTY_COUNCIL_OUTLINE_REVIEW)
```bash
# GIANG_VIEN submit đề tài
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/submit" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### Bước 3: Xét duyệt cấp Khoa (FACULTY_COUNCIL → SCHOOL_COUNCIL)
```bash
# QUAN_LY_KHOA approve đề tài
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/approve-faculty" \
  -b /tmp/qlk_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### Bước 4: Xét duyệt cấp Trường (SCHOOL_COUNCIL → APPROVED)
```bash
# BAN_GIAM_HOC approve đề tài
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/approve-council" \
  -b /tmp/bgh_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### Bước 5: Bắt đầu thực hiện (APPROVED → IN_PROGRESS)
```bash
# GIANG_VIEN bắt đầu dự án
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/start-project" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### Bước 6: Nộp nghiệm thu (IN_PROGRESS → FACULTY_COUNCIL_ACCEPTANCE_REVIEW)
```bash
# GIANG_VIEN nộp nghiệm thu
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/submit-acceptance" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### Bước 7: Nghiệm thu cấp Khoa (FACULTY_ACCEPTANCE → SCHOOL_ACCEPTANCE)
```bash
# QUAN_LY_KHOA nghiệm thu cấp khoa
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/accept-faculty-acceptance" \
  -b /tmp/qlk_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### Bước 8: Nghiệm thu cấp Trường (SCHOOL_ACCEPTANCE → HANDOVER)
```bash
# BAN_GIAM_HOC nghiệm thu cấp trường
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/accept-school" \
  -b /tmp/bgh_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### Bước 9: Hoàn thành (HANDOVER → COMPLETED)
```bash
# GIANG_VIEN hoàn thành bàn giao
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/finalize" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

---

## Test Từng Trạng Thái

### 1. Test SUBMIT (DRAFT → FACULTY_COUNCIL_OUTLINE_REVIEW)

| Kiểm tra | Kết quả mong đợi |
|----------|------------------|
| GIANG_VIEN submit đề tài của mình | ✅ Thành công |
| QUAN_LY_KHOA submit đề tài | ❌ Forbidden (403) |
| Submit đề tài không phải của mình | ❌ Forbidden |
| Submit đề tài đã submitted | ❌ Bad Request |

```bash
# Test negative: QUAN_LY_KHOA không thể submit
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/submit" \
  -b /tmp/qlk_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{\"proposalId\": \"${PROPOSAL_ID}\", \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"}"
# Expected: 403 Forbidden
```

### 2. Test APPROVE tại cấp Khoa (FACULTY_COUNCIL → SCHOOL_COUNCIL)

| Kiểm tra | Kết quả mong đợi |
|----------|------------------|
| QUAN_LY_KHOA approve | ✅ Thành công |
| THU_KY_KHOA approve | ✅ Thành công |
| GIANG_VIEN approve (sau fix) | ❌ Forbidden (403) |
| BAN_GIAM_HOC approve | ❌ Forbidden |

```bash
# Test negative: GIANG_VIEN không thể approve cấp khoa
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/approve-faculty" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{\"proposalId\": \"${PROPOSAL_ID}\", \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"}"
# Expected: 403 Forbidden với message "required_roles: QUAN_LY_KHOA, THU_KY_KHOA"
```

### 3. Test RETURN (Yêu cầu chỉnh sửa)

```bash
# QUAN_LY_KHOA return đề tài về chỉnh sửa
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/return-faculty" \
  -b /tmp/qlk_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\",
    \"comment\": \"Cần bổ sung mục tiêu nghiên cứu\"
  }"
# Expected: state chuyển sang CHANGES_REQUESTED
```

### 4. Test RESUBMIT (CHANGES_REQUESTED → FACULTY_COUNCIL)

```bash
# GIANG_VIEN resubmit sau khi chỉnh sửa
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/resubmit" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### 5. Test ASSIGN_COUNCIL (Phân công hội đồng)

```bash
# QUAN_LY_KHOA phân công hội đồng cấp khoa
curl -X POST "http://localhost:3000/api/councils/assign" \
  -b /tmp/qlk_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"councilId\": \"<council-uuid>\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"

# PHONG_KHCN phân công hội đồng cấp trường
curl -X POST "http://localhost:3000/api/councils/assign" \
  -b /tmp/pkhcn_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"councilId\": \"<council-uuid>\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
```

### 6. Test PAUSE/RESUME (Tạm dừng/Tiếp tục)

```bash
# PHONG_KHCN tạm dừng đề tài
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/pause" \
  -b /tmp/pkhcn_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\",
    \"comment\": \"Tạm dừng chờ bổ sung ngân sách\"
  }"
# Expected: state = PAUSED

# PHONG_KHCN tiếp tục đề tài
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/resume" \
  -b /tmp/pkhcn_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\"
  }"
# Expected: state = pre-pause state
```

### 7. Test CANCEL (Hủy đề tài)

```bash
# GIANG_VIEN hủy đề tài ở trạng thái DRAFT
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/cancel" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\",
    \"comment\": \"Hủy do thay đổi kế hoạch\"
  }"
# Expected: state = CANCELLED
```

### 8. Test WITHDRAW (Rút đề tài)

```bash
# GIANG_VIEN rút đề tài đang review
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/withdraw" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\",
    \"comment\": \"Rút đề tài để cập nhật nội dung\"
  }"
# Expected: state = WITHDRAWN
```

### 9. Test REJECT (Từ chối đề tài)

```bash
# BAN_GIAM_HOC từ chối đề tài
curl -X POST "http://localhost:3000/api/workflow/${PROPOSAL_ID}/reject" \
  -b /tmp/bgh_cookies.txt \
  -H "Content-Type: application/json" \
  -d "{
    \"proposalId\": \"${PROPOSAL_ID}\",
    \"idempotencyKey\": \"$(cat /proc/sys/kernel/random/uuid)\",
    \"comment\": \"Không phù hợp với định hướng nghiên cứu của trường\"
  }"
# Expected: state = REJECTED
```

---

## Kiểm Tra Trạng Thái Đề Tài

```bash
# Xem trạng thái hiện tại của đề tài
curl -X GET "http://localhost:3000/api/proposals/${PROPOSAL_ID}" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" | jq '.state'

# Xem lịch sử workflow
curl -X GET "http://localhost:3000/api/workflow/workflow-logs/${PROPOSAL_ID}" \
  -b /tmp/gv_cookies.txt \
  -H "Content-Type: application/json" | jq '.data'
```

---

## Bảng Tổng Hợp Quyền Theo Trạng Thái

| Trạng thái | Action | Roles được phép |
|------------|--------|-----------------|
| DRAFT | SUBMIT | GIANG_VIEN |
| DRAFT | CANCEL | GIANG_VIEN |
| FACULTY_COUNCIL_OUTLINE_REVIEW | APPROVE | QUAN_LY_KHOA, THU_KY_KHOA |
| FACULTY_COUNCIL_OUTLINE_REVIEW | RETURN | QUAN_LY_KHOA, THU_KY_KHOA |
| FACULTY_COUNCIL_OUTLINE_REVIEW | ASSIGN_COUNCIL | QUAN_LY_KHOA, THU_KY_KHOA |
| FACULTY_COUNCIL_OUTLINE_REVIEW | WITHDRAW | GIANG_VIEN |
| FACULTY_COUNCIL_OUTLINE_REVIEW | REJECT | QUAN_LY_KHOA, BAN_GIAM_HOC |
| FACULTY_COUNCIL_OUTLINE_REVIEW | PAUSE | PHONG_KHCN |
| SCHOOL_COUNCIL_OUTLINE_REVIEW | APPROVE | BAN_GIAM_HOC, GIANG_VIEN*, QUAN_LY_KHOA* |
| SCHOOL_COUNCIL_OUTLINE_REVIEW | RETURN | BAN_GIAM_HOC, GIANG_VIEN*, QUAN_LY_KHOA* |
| SCHOOL_COUNCIL_OUTLINE_REVIEW | REJECT | BAN_GIAM_HOC |
| SCHOOL_COUNCIL_OUTLINE_REVIEW | ASSIGN_COUNCIL | PHONG_KHCN |
| SCHOOL_COUNCIL_OUTLINE_REVIEW | WITHDRAW | GIANG_VIEN |
| SCHOOL_COUNCIL_OUTLINE_REVIEW | PAUSE | PHONG_KHCN |
| CHANGES_REQUESTED | RESUBMIT | GIANG_VIEN |
| CHANGES_REQUESTED | WITHDRAW | GIANG_VIEN |
| CHANGES_REQUESTED | REJECT | QUAN_LY_KHOA, BAN_GIAM_HOC |
| CHANGES_REQUESTED | PAUSE | PHONG_KHCN |
| APPROVED | START_PROJECT | GIANG_VIEN, PHONG_KHCN |
| APPROVED | PAUSE | PHONG_KHCN |
| IN_PROGRESS | SUBMIT_ACCEPTANCE | GIANG_VIEN |
| IN_PROGRESS | PAUSE | PHONG_KHCN |
| PAUSED | RESUME | PHONG_KHCN |
| PAUSED | CANCEL | GIANG_VIEN |

*Lưu ý: GIANG_VIEN và QUAN_LY_KHOA tại cấp trường chỉ có quyền nếu là thành viên hội đồng*

---

## Lưu Ý Quan Trọng

1. **Idempotency Key**: Mỗi request cần có `idempotencyKey` duy nhất để tránh duplicate actions
2. **Cookie refresh**: Access token hết hạn sau 15 phút, cần login lại hoặc dùng refresh token
3. **Terminal States**: COMPLETED, CANCELLED, REJECTED, WITHDRAWN là các trạng thái kết thúc - không thể chuyển tiếp
4. **Owner check**: Một số actions chỉ cho phép owner của đề tài thực hiện (SUBMIT, RESUBMIT, WITHDRAW)
