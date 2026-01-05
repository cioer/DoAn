---
stepsCompleted: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11]
inputDocuments: [
  "_bmad-output/analysis/brainstorming-session-2026-01-02.md",
  "_bmad-output/planning-artifacts/research/technical-rbac-workflow-audit-research-2026-01-02.md",
  "_bmad-output/tech-spec-nckh-system.md"
]
workflowType: 'prd'
lastStep: 11
documentCounts: {
  briefCount: 0,
  researchCount: 1,
  brainstormingCount: 1,
  projectDocsCount: 0
}
---

# Product Requirements Document - DoAn

**Author:** Coc
**Date:** 2026-01-02

---

## Executive Summary

### Tầm nhìn sản phẩm

**Hệ thống Quản lý Nghiên cứu Khoa học (NCKH) - Đại học Sư phạm Kỹ thuật Nam Định** được xây dựng để giải quyết 4 vấn đề cốt lõi của quy trình hiện tại:

1. **Không biết hồ sơ đang "kẹt" ở đâu** - Thiếu visibility về trạng thái và người chịu trách nhiệm
2. **Thất lạc/không thống nhất phiên bản** - Hồ sơ giấy/Word rời rạc, khó tra cứu
3. **Chậm tiến độ** - Không có SLA/nhắc hạn rõ ràng
4. **Báo cáo thủ công** - Phòng KHCN phải tổng hợp Excel nhiều lần

Sản phẩm biến quy trình từ **Excel + email rời rạc** thành **hệ thống có trạng thái** với:
- Workflow state machine rõ ràng
- Mọi quyết định đều có lịch sử và lý do
- Xuất văn bản/Excel đúng chuẩn
- SLA theo lịch làm việc với nhắc hạn tự động

### Vấn đề hiện tại

| Vấn đề | Impact | Root Cause |
|--------|--------|------------|
| Không biết hồ sơ ở đâu | Phòng KHCN phải "săn" hồ sơ | Thiếu trạng thái, tracking thủ công |
| Thất lạc phiên bản | Rủi ro pháp lý, khó reconciliation | Email rời rạc, không versioning |
| Chậm tiến độ | Đề tài tắc, quy trình kéo dài | Không SLA, không nhắc hạn |
| Báo cáo thủ công | Tốn thời gian, dễ sai | Không có export chuẩn |

### Giải pháp

**Hệ thống NCKH với các tính năng cốt lõi:**

- **Workflow State Machine:** 11+ trạng thái với auto-transition, SLA tracking, escalation 3 tầng
- **End-to-end lifecycle:** Xét duyệt đề tài + nghiệm thu (cấp Khoa + cấp Trường) theo quy định
- **RBAC Engine:** Role + State + Action authorization cho 5 vai trò
- **Dynamic Form System:** One-time entry, form versioning, auto-fill
- **Document Generation:** Tự sinh .docx từ template + manifest/dossier
- **Role-based Dashboards:** 5 dashboard tùy chỉnh theo vai trò
- **Audit Trail:** Mọi quyết định đều có lý do (reason codes), truy vết được
- **SLA & Notifications:** Working days (Thứ 2-6), holiday calendar, nhắc T-2/T0/T+2
- **Bulk Actions:** Phòng KHCN có thể thao tác hàng loạt

### Who Benefits Most

**Phòng KHCN** - "Xương sống vận hành":
- Nhận hồ sơ từ nhiều khoa
- Điều phối hội đồng
- Theo dõi tiến độ toàn trường
- Xuất báo cáo/quý/năm không thủ công

**Giảng viên/Chủ nhiệm đề tài** - Người chịu ảnh hưởng thứ hai:
- Biết chính xác trạng thái hồ sơ
- Nộp lại không bị quay về từ đầu
- Timeline rõ ràng với deadline

### Điều kiện thành công

Sản phẩm thành công khi:
- Mọi chuyển trạng thái/nhận xét có **lý do bắt buộc** (reason codes)
- Phòng KHCN xuất được **Excel/báo cáo** mà không tổng hợp thủ công
- Workflow có thể **reconciliation** khi có sự cố
- SLA tính đúng theo **working days** với holiday calendar
- **End-to-end lifecycle** từ xét duyệt đến nghiệm thu hoạt động mượt

### What Makes This Special

**Compliance-by-Design** - Không chỉ workflow visibility:

- Mọi quyết định có **lý do bắt buộc** (reject/override/return) với reason codes chuẩn hoá
- Văn bản sinh tự động từ dữ liệu + **manifest/dossier** để nghiệm thu/lưu trữ
- Audit trail truy vết được, phục vụ **thanh tra/đối chiếu**
- SHA-256 integrity cho documents
- **Reconciliation capability:**
  - **Mức 1 (MUST):** DB reconciliation từ backup + recompute state từ workflow_logs
  - **Mức 2-lite (RECOMMENDED):** Verify dossier (manifest hash + artifacts + document hash)

> *"Từ Excel + email rời rạc → hồ sơ có trạng thái + bằng chứng (audit + dossier) + SLA."*

### Three Wow Moments

| Persona | Wow Moment |
|---------|------------|
| **Phòng KHCN** | "Tôi biết hồ sơ nào đang kẹt ở đâu, ai giữ, quá hạn bao lâu, bấm 1 lần ra danh sách để nhắc." |
| **Giảng viên** | "Tôi biết chính xác hồ sơ đang ở bước nào, cần sửa gì, deadline nào, và nộp lại không bị quay về từ đầu." |
| **BGH** | "Tôi xem dashboard tổng quan + click-through read-only, không cần gọi điện hỏi tiến độ." |

### Governance Decisions (Locked)

| Quyết định | Chi tiết |
|------------|----------|
| **Nghiệm thu** | Sub-flow sau ACTIVE: `SUBMIT_FINAL_REPORT → FACULTY_ACCEPTANCE → (nếu cần) SCHOOL_ACCEPTANCE → COMPLETED` |
| **Holder assignment** | PKHCN assign thủ công (hệ thống gợi ý/lọc, không auto-assign go-live) |
| **Submit kết quả HĐ/TVXC** | Thư ký Hội đồng submit duy nhất (tránh multi-submit) |
| **Reason codes** | Chuẩn hoá + free-text có điều kiện (bắt buộc khi chọn "KHAC") |
| **Reconciliation** | Mức 1 MUST + Mức 2-lite RECOMMENDED (Admin restore, PKHCN verify) |
| **Working days** | Thứ 2-6 trừ holiday; holiday có cột `is_working_day` cho ngày làm bù |

## Project Classification

**Technical Type:** `web_app` + `workflow/document system`

**Domain:** `public-sector/academic operations` (Nghiệp vụ hành chính – quản trị nghiên cứu)

**Complexity:** `medium-high`
- Workflow + RBAC boundary + audit + SLA + Excel import + document integrity
- Nguy cơ nằm ở **governance**, không phải UI
- Hệ thống vỡ không phải vì code, mà vì quyền theo trạng thái, audit trail, reconciliation

**Project Context:** `greenfield` with `brownfield data`
- Dự án mới, nhưng dữ liệu/people list import từ Excel (brownfield data)
- Mapping thực tế với existing data sources

**Tech Stack:** Node.js/TypeScript, PostgreSQL, Next.js, Prisma ORM

**SLA Calculation Rules:**
- Working days: Thứ 2–Thứ 6 (không tính Thứ 7)
- Holiday calendar: PKHCN import Excel với cột `is_working_day` (hỗ trợ ngày làm bù)
- Deadline rơi vào non-working day → dời sang working day kế tiếp

---

## Success Criteria

### User Success

| Persona | Success Metric | Target | Measurement |
|---------|----------------|--------|-------------|
| **Phòng KHCN** | Holder + state rõ ràng | 100% | 100% hồ sơ có holder + state tại mọi thời điểm |
| **Phòng KHCN** | Dashboard performance | < 3 giây | Dashboard load time |
| **Phòng KHCN** | Báo cáo tự động | < 5 phút | Xuất Excel/báo cáo (vs. 2+ giờ thủ công) |
| **Giảng viên** | Completion rate | ≥ 90% | Đề tài đi từ DRAFT → ACTIVE trong SLA |
| **Giảng viên** | Resubmit không mất context | ≥ 90% | Resubmit thành công, không quay về từ đầu |
| **Giảng viên** | Transparency | ≤ 5% | Ticket/phản ánh "không biết hồ sơ ở đâu" |
| **BGH** | Dashboard adoption | Active | BGH login xem dashboard ≥ 1 lần/tuần |

**Điểm "Aha!" của User:**
- Phòng KHCN: "Tôi bấm 1 cái, biết ngay hồ sơ đang ở đâu, ai giữ, bao lâu rồi"
- Giảng viên: "Tôi không cần gọi điện hỏi, tôi tự thấy được timeline và cần sửa gì"
- BGH: "Tôi xem dashboard tổng quan, click-through chi tiết, không cần ai báo cáo"

### Business Success

**Timeline đo success:**
- **3 tháng post-launch:** Adoption + SLA + Lost-state = 0 (hệ thống "sống được")
- **12 tháng:** Hiệu quả vận hành full (báo cáo, audit, nghiệm thu)

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Workflow digitization** | 100% | 100% đề tài mới đi qua hệ thống (không còn lối rút Excel+email) |
| **SLA compliance** | ≥ 90% on-time | Đủ cho go-live, không ép 95-100% |
| **Overdue visibility** | 100% | 100% hồ sơ quá hạn phải được detect + hiển thị |
| **Lost state** | 0 incidents | Không bao giờ lost track của hồ sơ |
| **Giảng viên adoption** | ≥ 80% (3 tháng) | Hệ thống có giá trị thực |

> **Note:** Trong public sector, **visibility + escalation** quan trọng hơn con số tuyệt đối.

### Technical Success

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Workflow state integrity** | 100% | Không bao giờ lost state; source of truth = workflow_logs |
| **Audit trail completeness** | 100% | 100% quyết định có reason code (compliance) |
| **DB reconciliation** | 100% | Test recovery thành công 100% khi có sự cố |
| **Document integrity** | 100% | Hash verify thành công cho tất cả artifacts |
| **API response** | p95 < 500ms | UX acceptable |
| **Uptime** | 99.5% | Trong giờ hành chính (realistic cho on-prem) |
| **Dashboard load** | < 3 giây | Performance acceptable |
| **DB recovery time** | < 1 giờ | MUST - realistic cho team nhỏ |
| **Full recovery time** | < 4 giờ | RECOMMENDED - không over-engineering |

### Measurable Outcomes (OKRs)

| Objective | Key Result | Measurement |
|-----------|------------|-------------|
| **O1: Quy trình số hóa 100%** | KR1: 100% đề tài mới nộp qua hệ thống | Count via system vs. total proposals |
| | KR2: 0 hồ sơ "lost" trong 6 tháng đầu | Zero missing state incidents |
| **O2: Phòng KHCN tiết kiệm thời gian** | KR1: Xuất báo cáo < 5 phút (vs. 2+ giờ) | Time tracking before/after |
| | KR2: ≥ 90% SLA on-time | SLA tracking dashboard |
| | KR3: 100% overdue detect+display | Escalation effectiveness |
| **O3: Giảng viên satisfied** | KR1: ≥ 90% DRAFT→ACTIVE trong SLA | Workflow log analysis |
| | KR2: ≥ 90% resubmit không mất context | Resubmit success rate |
| | KR3: ≤ 5% ticket "không biết hồ sơ ở đâu" | Support ticket analysis |

## Product Scope

### MVP - Minimum Viable Product (Go-live)

**Core workflow (end-to-end):**
- DRAFT → FACULTY_REVIEW → COUNCIL_REVIEW → EXPERT_REVIEW → BGH_APPROVAL → ACTIVE
- **Final report + acceptance sub-flow (MUST):**
  - ACTIVE → SUBMIT_FINAL_REPORT → FACULTY_ACCEPTANCE → (nếu cần) SCHOOL_ACCEPTANCE → COMPLETED
  - 2 tầng nghiệm thu: Khoa → Trường
  - Không BI, không analytics nâng cao

**Features MUST-have:**
- 5 Role-based dashboards (basic)
- Dynamic Form System (one-time entry)
- Document Generation (.docx từ template)
- SLA tracking + notifications (T-2/T0/T+2)
- Audit trail với reason codes (chuẩn hoá)
- Excel import (people + holidays)
- Mức 1 reconciliation (DB only)
- Working days: Thứ 2-6 + holiday calendar với `is_working_day`

**Out of Scope MVP:**
- AI gợi ý thành viên hội đồng
- Advanced analytics/BI
- Mobile app
- Mức 2 reconciliation (dossier verify)
- Bulk actions nâng cao

### Growth Features (3-6 tháng post-launch)

- Mức 2 reconciliation (dossier verify)
- Bulk actions nâng cao cho PKHCN
- Advanced reporting (cross-faculty comparison)
- Performance analytics dashboard
- Email notification enhancements
- Audit log export

### Vision (12+ tháng)

- AI gợi ý thành viên hội đồng (dựa trên chuyên môn)
- BI/Analytics dashboard full
- Mobile app (responsive)
- Integration với hệ thống trường (nếu có)
- Workflow customization (admin có thể edit)

---

## User Journeys

### Journey 1: Giảng viên Minh - "Từ lo lắng đến an tâm"

**Opening Scene:**
Minh là giảng viên Khoa CNTT, vừa có ý tưởng đề tài về "AI trong giáo dục". Anh ấy lo lắng vì lần trước nộp hồ sơ, phải gọi điện 3-4 lần mới biết đề tài đang ở đâu, cuối cùng bị trễ hạn vì Khoa quên chuyển lên Phòng KHCN.

**Rising Action:**
Minh login vào hệ thống NCKH mới, thấy dashboard hiện rõ 3 đề tài của mình:
- "Ứng dụng AI" - đang ở DRAFT (chưa nộp)
- "IoT trong agriculture" - FACULTY_REVIEW, giữ bởi Thư ký Khoa, còn 2 ngày
- "Blockchain in education" - ACTIVE, đang chạy

Anh ấy bắt đầu điền form cho đề tài AI. Hệ thống auto-fill tên, email, khoa từ user profile. Anh upload file PDF bổ sung, hệ thống hiển thị "đã upload 3/5 tài liệu".

**Climax:**
Minh bấm "Nộp hồ sơ". Hệ thống hiện: "Đã nộp, đang chờ Khoa duyệt trong 3 ngày làm việc". Hai ngày sau, anh nhận email: "Đề tài đã được Khoa duyệt, chuyển sang Hội đồng trường".

Hai tuần sau, Minh nhận thông báo: "Cần bổ sung phương pháp nghiên cứu". Anh ấy lo lắng - có phải phải làm lại từ đầu? Nhưng khi vào hệ thống, anh thấy button "Nộp lại" với form đã điền sẵn, chỉ cần thêm phần "Phương pháp". Anh nộp lại, và **không bị quay về DRAFT** - hồ sơ vẫn ở COUNCIL_REVIEW.

**Resolution:**
Sáu tháng sau, đề tài AI của Minh được duyệt vào ACTIVE. Anh ấy không cần gọi điện một lần nào. Timeline hiển thị rõ ràng: DRAFT → SUBMITTED → FACULTY → COUNCIL → EXPERT → BGH → ACTIVE, với timestamp và người quyết định tại mỗi bước.

Minh nói với đồng nghiệp: *"Lần này khác hẳn, tôi biết chính xác hồ sơ mình ở đâu, cần sửa gì, và deadline khi nào."*

**Requirements Revealed:**
- User profile auto-fill
- File upload tracking (x/y files uploaded)
- Timeline visualization với state + holder + timestamp
- Resubmit không mất context (form data được preserve)
- Email notification tại mỗi transition
- Dashboard cá nhân hiển thị tất cả đề tài của user

---

### Journey 2: Chị Lan - Phòng KHCN - "Từ săn hồ sơ to dashboard"

**Opening Scene:**
Chị Lan ở Phòng KHCN, phụ trách theo dõi 87 đề tài từ 12 khoa khác nhau. Trước đây, chị phải mở Excel + check email + gọi điện cho từng khoa để hỏi: "Đề tài PRJ-001 của Khoa CNTT đang ở đâu?".

**Rising Action:**
8:30 sáng, chị Lan login vào dashboard. Hệ thống hiện ngay:
- 15 đề tài đang chờ Khoa duyệt (3 cái sắp hết hạn)
- 8 đề tài đang chờ Hội đồng
- 4 đề tài quá hạn (Khoa KT - 2 ngày, Khoa Kinh tế - 5 ngày)

Chị Lan bấm vào danh sách quá hạn, gửi email nhắc hàng loạt: "Kính gửi Khoa, các đề tài sau đã quá hạn, đề nghị xử lý trong vòng 2 ngày".

**Climax:**
10:00, Hiệu trưởng gọi: "Lan ơi, cho chị xem báo cáo tình hình đề tài toàn trường năm nay". Thay vì mất 2 giờ tổng hợp Excel như trước, chị Lan:
1. Bấm "Xuất báo cáo quý"
2. Chọn "Quý 1/2026"
3. Bấm "Tải Excel"

30 giây sau, chị có file Excel đầy đủ: số lượng theo khoa, kinh phí, trạng thái, SLA compliance.

**Resolution:**
Cuối năm, khi thanh tra, chị Lan export audit log: tất cả 87 đề tài, mỗi transition đều có lý do, timestamp, người quyết định. Thanh tra viên gật đầu: *"Hệ thống tốt, truy vết được hoàn toàn."*

Chị Lan nói: *"Tôi không còn phải 'săn' hồ sơ nữa. Tôi bấm 1 cái là biết hết."*

**Requirements Revealed:**
- Dashboard aggregate toàn trường (tổng + theo khoa + theo state)
- Overdue detection + highlighting (sắp hạn, quá hạn)
- Bulk action: gửi email nhắc hàng loạt
- Excel export: báo cáo_quý, báo_cáo_năm, theo_khoa
- Audit log export (cho thanh tra)
- Filter/Search: theo khoa, state, holder, thời gian

---

### Journey 3: Thầy Tuấn - BGH - "Dashboard tổng quan trong 5 phút"

**Opening Scene:**
Thầy Tuấn - Hiệu trưởng, bận rộn với hàng chục cuộc họp mỗi tuần. Trước đây, khi cần tình hình đề tài, ông phải gọi Phòng KHCN, chờ họ chuẩn bị báo cáo, mất cả ngày.

**Rising Action:**
Thứ 2 hàng tuần, thầy Tuấn login vào dashboard BGH (read-only). Hệ thống hiện ngay:
- Tổng số đề tài năm nay: 127
- Đã duyệt: 89 (70%)
- Đang xử lý: 35
- Đã hoàn thành: 12
- Số tiền kinh phí đã duyệt: 2.3 tỷ đồng

**Climax:**
Ông thấy Khoa KT có SLA thấp (75%), click vào để xem chi tiết. Hệ thống hiển thị:
- 5 đề tài quá hạn
- Nguyên nhân chính: Thư ký Khoa thay đổi liên tục
- Thầy Tuấn gọi Trưởng khoa Khoa KT: "Sao SLA thấp thế? Cần hỗ trợ gì không?"

**Resolution:**
Thầy Tuấn không còn phải gọi điện hỏi tiến độ. Ông nói: *"5 phút tôi biết hết tình hình trường, còn thời gian để họp với các khoa về vấn đề thực sự."*

**Requirements Revealed:**
- Read-only dashboard (không có quyền edit)
- KPI summary: tổng đề tài, trạng thái, kinh phí
- Drill-down: click vào Khoa/state để xem chi tiết
- SLA by faculty (so sánh giữa các khoa)
- Responsive mobile view (cho BGH busy, thường xem trên điện thoại)
- Timeline trend (so sánh với năm trước)

---

### Journey 4: Anh Tuấn - Admin - "Quản trị mà không can thiệp workflow"

**Opening Scene:**
Anh Tuấn là IT staff, phụ trách quản trị hệ thống NCKH. Một sáng, Phòng KHCN báo: "Sao không import được danh sách giảng viên mới?"

**Rising Action:**
Anh Tuấn login vào Admin dashboard, kiểm tra:
- System status: Online
- Database: Connected
- Error logs: "Validation failed - missing column 'email'"

Anh nhận ra file Excel import thiếu cột email. Hướng dẫn Phòng KHCN sửa file và import lại. Sau khi import thành công, hệ thống hiển thị: "150 giảng viên được import, 0 lỗi".

**Climax:**
Đêm trước go-live, anh Tuấn test reconciliation:
1. Tạo thử đề tài DRAFT
2. Submit → FACULTY → COUNCIL
3. Restore database từ backup
4. Bấm "Recompute state" từ workflow_logs
5. Hệ thống tự động khôi phục state về COUNCIL_REVIEW ✓

**Resolution:**
Anh Tuấn nói: *"Hệ thống có audit trail đầy đủ, tôi có thể khôi phục mà không lo lost data. Admin chỉ quản lý technical, không can thiệp vào workflow nghiệp vụ - đúng như thiết kế."*

**Requirements Revealed:**
- System health dashboard (status, DB connection, errors)
- Error logging + viewing
- Excel import validation + feedback (x lỗi cụ thể)
- DB backup + restore interface
- Reconciliation: recompute state từ workflow_logs
- User management (create, deactivate, reset password)
- Form template management (add, edit, deactivate)
- SLA settings configuration

---

### Journey 5: Thư ký Hương - Hội đồng - "Submit kết quả đúng 1 lần"

**Opening Scene:**
Chị Hương là thư ký Hội đồng KH&ĐT, phụ trách tổng hợp kết quả thẩm định cho 5 đề tài. Trước đây, chị phải điền form Word, gửi email, và thường bị "trùng lẫn" khi nhiều thành viên cùng submit.

**Rising Action:**
Chị Hương login, thấy danh sách 5 đề tài đang chờ Hội đồng duyệt. Chị click vào đề tài đầu tiên "AI trong giáo dục", thấy:
- Nội dung đề tài (đã auto-fill từ form proposal)
- Danh sách thành viên HĐ (đã được PKHCN assign)
- Form đánh giá (rating form)

Chị điền điểm: 8/10 nội dung, 7/10 phương pháp, 8/10 kinh phí. Chị chọn "Đạt" và nhập nhận xét: "Đề xuất phù hợp, trình BGH phê duyệt".

**Climax:**
Chị Hương bấm "Submit kết quả". Hệ thống hiện: "Đã submit, đề tài chuyển sang TVXC thẩm định". Chị không thể submit lại (đúng quy định - chỉ thư ký HĐ submit duy nhất, tránh multi-submit).

**Resolution:**
Cuối ngày, chị Hương đã xử lý xong 5/5 đề tài. Hệ thống ghi nhận tất cả decisions với lý do, timestamp. Chị nói: *"Rất rõ ràng, tôi không sợ 'bị đè' hay 'trùng lẫn' nữa."*

**Requirements Revealed:**
- Council dashboard: danh sách đề tài chờ HĐ duyệt
- Form đánh giá (rating) auto-fill context từ proposal
- Submit ONCE (chỉ thư ký HĐ submit, không ai khác)
- Read-only sau submit (không thể edit lại)
- Audit log: ghi nhận ai submit, khi nào, lý do gì

---

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---------|---------------------------|
| **Giảng viên Minh** | Form auto-fill, upload tracking, timeline visibility, resubmit không mất context |
| **Chị Lan (PKHCN)** | Dashboard aggregate, overdue detection, bulk email nhắc, Excel export, audit log |
| **Thầy Tuấn (BGH)** | Read-only dashboard, drill-down chi tiết, KPI summary, SLA by faculty, mobile view |
| **Anh Tuấn (Admin)** | System health, error logs, import validation, DB reconciliation, user management |
| **Chị Hương (Thư ký HĐ)** | Council dashboard, rating form, submit ONCE, read-only sau submit |

---

## Innovation & Novel Patterns

### Compliance-by-Design: Audit-first Architecture

**Innovation Pattern:**
Khác với các hệ thống workflow thông thường (log là afterthought), hệ thống NCKH được thiết kế với **audit-first mindset** - mọi quyết định phải có lý do và truy vết được.

**Các components:**
- **Reason codes chuẩn hoá:** Không free-text thuần, phải chọn lý do + free-text có điều kiện
- **Manifest/Dossier:** Mỗi hồ sơ có manifest SHA-256, đủ artifacts cho reconciliation
- **Workflow logs as source of truth:** Khi restore DB, recompute state từ logs (không ngược lại)

**Why this matters:**
- Thanh tra/đối chiếu: Export audit log đầy đủ
- Reconciliation: Khôi phục state khi có sự cố
- Accountability: Ai quyết định gì, khi nào, tại sao

---

### State Transparency: "No Lost Files" Guarantee

**Innovation Pattern:**
100% hồ sơ có holder + state rõ ràng tại mọi thời điểm - không bao giờ "không biết hồ sơ đang ở đâu".

**Implementation:**
- **Holder tracking:** Mỗi state có holder rõ ràng (đơn vị/role đang chịu trách nhiệm)
- **State visualization:** Timeline hiển thị toàn bộ transitions + timestamps
- **Overdue detection:** 100% hồ sơ quá hạn được detect + hiển thị

**Why this matters:**
- Phòng KHCN không còn phải "săn" hồ sơ
- Giảng viên biết chính xác timeline
- BGH có dashboard tổng quan

---

### Context Preservation: Resubmit Without Penalty

**Innovation Pattern:**
Khi bị yêu cầu sửa, hồ sơ **không quay về DRAFT** - giữ nguyên context, chỉ edit phần cần sửa.

**Implementation:**
- Form data được preserve
- State giữ nguyên (e.g., COUNCIL_REVIEW)
- Chỉ hiển thị các fields cần edit
- Versioning: Mỗi revision có version tracking

**Why this matters:**
- Giảm workload cho giảng viên (không điền lại từ đầu)
- Tránh lỗi từ việc điền lại
- Tăng completion rate

---

### Working Days Engine: Localized SLA

**Innovation Pattern:**
SLA engine hiểu working days của Việt Nam - Thứ 2-6 + holiday + ngày làm bù.

**Implementation:**
- `is_working_day` column trong holiday calendar
- Tính working days đúng (không chỉ đếm ngày calendar)
- Auto-adjust deadline khi rơi vào non-working day
- Notification T-2/T0/T+2 (skip nếu T+2 rơi vào holiday)

**Why this matters:**
- SLA realistic với work calendar của trường
- Hỗ trợ ngày làm bù (bù Thứ 7)
- Escalation đúng ngày

---

### Dual-Layer Acceptance: End-to-End Lifecycle

**Innovation Pattern:**
Nghiệm thu 2 tầng (Khoa → Trường) được implement như sub-flow trong workflow chính - không tách rời.

**Implementation:**
- ACTIVE → SUBMIT_FINAL_REPORT → FACULTY_ACCEPTANCE → SCHOOL_ACCEPTANCE → COMPLETED
- Có nhánh FINAL_REVISION_REQUIRED để trả sửa
- Phòng KHCN assign hội đồng nghiệm thu

**Why this matters:**
- End-to-end lifecycle trong một hệ thống
- Không cần "export ra Word để nghiệm thu"
- Manifest/dossier được generate tự động

---

### Market Context

**Landscape Việt Nam - Public Sector Academic Operations:**
- Hầu hết vẫn dùng Excel + email
- Các hệ thống hiện tại thường thiếu:
  - Audit trail chi tiết
  - Reconciliation capability
  - Working days engine
  - State transparency

**Our Differentiation:**
- Không phải "tech breakthrough" mà là **domain fit excellence**
- Áp dụng enterprise compliance patterns vào academic operations
- Value nằm ở **governance strength** + **practical innovation**

---

### Validation Approach

| Innovation | Validation Method |
|------------|-------------------|
| Compliance-by-Design | Test audit log export cho thanh tra giả lập |
| State Transparency | Test: 100% hồ sơ có holder + state trong DB |
| Context Preservation | Test: Resubmit 5 lần, verify data không lost |
| Working Days Engine | Test: SLA với holiday calendar + ngày làm bù |
| Reconciliation | Test: Restore DB + recompute state |
| Dual-Layer Acceptance | Test: Full workflow từ DRAFT → COMPLETED |

---

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Reason codes quá cứng** | Free-text khi chọn "KHAC" |
| **Working days engine phức tạp** | Go-live chỉ với holiday import đơn giản, nâng cao sau |
| **Reconciliation khó test** | MVP chỉ Mức 1 (DB), Mức 2 để Growth phase |
| **Context preservation tốn DB** | Chỉ preserve form data, không preserve uploaded files |
| **Dual-layer acceptance tăng complexity** | Sub-flow tối giản, không BI/analytics trong MVP |

---

## Web Application + Workflow/Document System Requirements

### Project-Type Overview

**Architecture:** Next.js SPA với SSR cho public dashboards, SPA client-side sau authentication. Hybrid approach tối ưu performance cho dashboard views (BGH, PKHCN) trong khi vẫn giữ UX mượt mà cho authenticated users.

**Core Components:**
- Workflow state machine (11+ states)
- Document generation (.docx from templates)
- Role-based dashboards (5 roles)
- RBAC engine (Role + State + Action)
- Audit trail (append-only logs)

---

### Technical Architecture Considerations

**Frontend Stack:**
- **Framework:** Next.js với App Router
- **SSR Strategy:** Server-side rendering cho public/home page + dashboard landing
- **Client-side:** SPA sau login để tối ưu UX cho workflow interactions
- **State Management:** React Context + Server State (React Query/SWR)

**Backend Stack:**
- **Runtime:** Node.js với TypeScript
- **API:** RESTful API với tRPC cho type-safe client-server communication
- **ORM:** Prisma với PostgreSQL
- **Auth:** NextAuth.js với JWT

**Document Generation:**
- **Engine:** docx-template hoặc node-docxtemplater
- **Template Storage:** File system hoặc S3-compatible storage
- **Mapping:** Data placeholders trong .docx template → replace với DB data

---

### Browser Matrix & Platform Support

**Target Browsers:**
| Browser | Version Support |
|---------|-----------------|
| Chrome | 2 phiên bản mới nhất |
| Edge | 2 phiên bản mới nhất |
| Firefox | 2 phiên bản mới nhất |
| Safari | 2 phiên bản mới nhất |

**Out of Scope:**
- IE11 (legacy browser)
- Mobile browsers (responsive cho mobile viewing, nhưng không phải primary target)

**Rationale:**
- Modern browsers đủ coverage cho user base (giảng viên, staff)
- Reduce testing burden
- Enable use of modern APIs (Fetch, ES6+, CSS Grid)

---

### Responsive Design Strategy

**Breakpoints:**
- **Desktop:** 1280px+ (primary target)
- **Laptop:** 1024-1279px
- **Tablet:** 768-1023px (secondary support)
- **Mobile:** < 768px (tertiary support - BGH dashboard only)

**Mobile Considerations:**
- BGH dashboard optimized cho mobile view (read-only, drill-down)
- Other roles: desktop-first nhưng responsive-friendly
- Không có mobile-specific features trong MVP

---

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Dashboard load** | < 3 giây | Time to Interactive (TTI) |
| **API response** | p95 < 500ms | Endpoint latency |
| **Page transition** | < 500ms | Client-side navigation |
| **Document generation** | < 10 giây | .docx file creation |
| **Excel export** | < 30 giây | Large dataset export |
| **Uptime** | 99.5% | Trong giờ hành chính |

**Optimization Strategy:**
- Code splitting per route
- Image optimization (next/image)
- Database indexing cho workflow queries
- Caching cho static data (faculties, users)

---

### SEO Strategy

**Status:** Not Required

**Rationale:**
- Internal system behind authentication
- No public content indexing needed
- No organic traffic requirements

**Minimal SEO:**
- Meta tags cho branding (title, description)
- Open Graph tags cho social shares (nếu cần)

---

### Accessibility Requirements

**Target:** WCAG 2.1 Level AA

**Key Requirements:**
- Keyboard navigation (tab index, focus states)
- Color contrast ratio 4.5:1 cho text
- Screen reader support (ARIA labels cho dashboards)
- Semantic HTML structure

**Focus Areas:**
- Form inputs có proper labels
- Error messages rõ ràng và accessible
- Dashboard data tables có headers
- Modal/dialog focus trap

**Rationale:**
- Public sector best practice
- Support cho users với disabilities (giảng viên lớn tuổi)

---

### Real-Time vs Async Strategy

**MVP: Async + Polling**

| Feature | Implementation |
|---------|----------------|
| **Notifications** | Email + in-app polling (30s interval) |
| **SLA reminders** | Cron job chạy T-2/T0/T+2 |
| **Dashboard updates** | Manual refresh hoặc auto-refresh 60s |

**Growth Phase:**
- WebSocket cho real-time notifications
- Server-Sent Events (SSE) cho dashboard updates
- Push notifications cho mobile

**Rationale:**
- Giảm complexity cho go-live
- Async đủ cho success criteria
- WebSocket có thể add sau mà không refactor architecture

---

### Document Generation Architecture

**Template Management:**
- **Storage:** File system (`/templates/`) hoặc S3
- **Format:** .docx files với placeholders `{{variable_name}}`
- **Upload:** Admin/PKHCN upload qua UI
- **Versioning:** Template version tracking (optional trong MVP)

**Generation Process:**
```
1. Fetch project data từ DB
2. Load .docx template
3. Replace placeholders với data
4. Generate manifest SHA-256
5. Store file reference trong documents table
6. Return download URL
```

**Variables Mapping:**
| Category | Variables |
|----------|-----------|
| **Project info** | name, code, faculty, leader |
| **Approval** | council_decision, approval_date, approver |
| **Budget** | total_amount, disbursement_schedule |
| **Timeline** | start_date, end_date, milestones |

**Out of Scope MVP:**
- WYSIWYG template editor
- Advanced formatting (tables, images - hỗ trợ cơ bản)
- Template preview trong system

---

### Data Retention Policy

**Workflow Logs:** Vĩnh viễn
- `workflow_logs` table: append-only, không xóa
- Mỗi record: project_id, from_state, to_state, actor, reason, timestamp
- Archive: Partition by year để optimize queries

**Audit Logs:** Vĩnh viễn
- `audit_logs` table: chỉ log bảng nhạy cảm
- Action types: CREATE, UPDATE, DELETE trên critical tables

**Document Storage:** 7 năm (quy định lưu trữ)
- File .docx, PDF exports
- Archive after project completion + 1 year
- Backup: Off-site backup hàng ngày

**Rationale:**
- Compliance cho thanh tra/đối chiếu
- Storage rẻ hơn rủi ro pháp lý
- Archive strategy cho performance

---

### Excel Import/Export Strategy

**Import:**
- **People list:** Standard Excel format từ Phòng Nhân sự
- **Holiday calendar:** PKHCN import hàng năm
- **Validation:** Row-level validation, error feedback

**Export:**
- **Reports:** Báo cáo_quý, báo_cáo_năm, theo_khoa
- **Format:** .xlsx (xlsx-poi hoặc similar)
- **Templates:** Theo chuẩn quy định trường

**Column Mapping (Holiday Import):**
| Column | Required | Description |
|--------|----------|-------------|
| date | ✓ | Ngày (YYYY-MM-DD) |
| name | ✓ | Tên ngày nghỉ |
| is_working_day | ✗ | true nếu ngày làm bù |

---

### Implementation Considerations

**Deployment:**
- **Hosting:** On-premises server (Đại học Sư phạm Kỹ thuật Nam Định)
- **Database:** PostgreSQL 14+ trên dedicated server
- **Backup:** Daily incremental + weekly full backup

**Monitoring:**
- **APM:** Sentry cho error tracking
- **Logs:** Structured JSON logs (Winston hoặc Pino)
- **Metrics:** Response time, error rate, uptime

**Security:**
- **Authentication:** JWT with refresh token
- **Authorization:** RBAC middleware (Role + State + Action)
- **Encryption:** TLS 1.3 cho transport, SHA-256 cho documents

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP + Platform MVP hybrid

- **Problem-Solving:** Solve 4 core problems (không biết hồ sơ ở đâu, thất lạc phiên bản, chậm tiến độ, báo cáo thủ công)
- **Platform:** Build foundation (RBAC engine, workflow state machine, audit trail) cho future expansion

**Resource Requirements:**
- **Team size:** 2-3 dev, 1 QA, 1 PM
- **Timeline:** 18 weeks MVP → Go-live
- **Risk level:** Medium (technical risk thấp, domain risk medium)

**MVP Success Definition:**
- 100% đề tài mới đi qua hệ thống
- ≥90% SLA on-time
- 0 lost state incidents
- Phòng KHCN xuất Excel báo cáo < 5 phút

---

### MVP Feature Set (Phase 1 - Go-live)

**Core User Journeys Supported:**
- ✅ Giảng viên: Nộp hồ sơ, track timeline, resubmit không mất context
- ✅ Phòng KHCN: Dashboard aggregate, overdue detection, Excel export, bulk email nhắc
- ✅ BGH: Read-only dashboard, drill-down, KPI summary
- ✅ Admin: System health, import validation, DB reconciliation
- ✅ Thư ký HĐ: Council dashboard, rating form, submit ONCE

**Must-Have Capabilities:**

| Category | Features |
|----------|----------|
| **Workflow** | DRAFT → FACULTY_REVIEW → COUNCIL_REVIEW → EXPERT_REVIEW → BGH_APPROVAL → ACTIVE + Final report sub-flow (FACULTY_ACCEPTANCE → SCHOOL_ACCEPTANCE → COMPLETED) |
| **RBAC** | Role + State + Action authorization cho 5 roles (Giảng viên, Quản lý Khoa, PKHCN, Hội đồng, BGH, Admin) |
| **Forms** | Dynamic Form System, one-time entry, auto-fill user profile, file upload tracking (x/y files) |
| **Documents** | .docx generation từ template, manifest SHA-256, upload template qua UI |
| **Dashboards** | 5 role-based dashboards (basic), timeline visualization, overdue detection + highlighting |
| **SLA** | Working days (Thứ 2-6), holiday calendar import, SLA tracking, notifications (T-2/T0/T+2) via cron job |
| **Audit** | Reason codes chuẩn hoá + free-text có điều kiện, workflow_logs append-only, audit log export |
| **Import/Export** | Excel import (people, holidays), Excel export (báo cáo_quý, báo_cáo_năm, theo_khoa) |
| **Reconciliation** | Mức 1 MUST (DB restore + recompute state từ workflow_logs) |
| **Notifications** | Email + in-app polling (30s interval) - NO WebSocket trong MVP |
| **Tech Stack** | Next.js SPA + SSR, Node.js/TypeScript, PostgreSQL, Prisma, NextAuth.js |

**Out of Scope MVP:**
- ❌ AI gợi ý thành viên hội đồng
- ❌ Advanced analytics/BI dashboards
- ❌ Mobile app
- ❌ Mức 2 reconciliation (dossier verify)
- ❌ Bulk actions nâng cao (cho PKHCN)
- ❌ WebSocket/real-time notifications
- ❌ WYSIWYG template editor

---

### Post-MVP Features

**Phase 2: Growth (3-6 tháng post-launch)**

| Feature | Description |
|---------|-------------|
| **Mức 2 reconciliation** | Dossier verify (manifest hash + artifacts + document hash), PKHCN verify UI |
| **Bulk actions nâng cao** | PKHCN có thể thao tác hàng loạt (assign council, send reminders) |
| **Advanced reporting** | Cross-faculty comparison, performance analytics dashboard |
| **Email enhancements** | Template customization, notification preferences |
| **Audit log export** | Full export cho thanh tra, filterable by date/type |
| **Working days nâng cao** | Hỗ trợ ngày làm bù phức tạp, multi-year calendar |

**Phase 3: Vision (12+ tháng)**

| Feature | Description |
|---------|-------------|
| **AI gợi ý thành viên HĐ** | Dựa trên chuyên môn, lịch sử tham gia, workload |
| **BI/Analytics dashboard full** | Trend analysis, prediction, drill-down sâu |
| **Mobile app responsive** | Full mobile experience cho tất cả roles |
| **Integration** | Với hệ thống trường (nếu có) |
| **Workflow customization** | Admin có thể edit workflow, add states |

---

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Mitigation |
|------|------------|
| **State machine complexity** | Test-driven development, clear state transition diagram, unit test mỗi transition |
| **Working days engine bugs** | Go-live với holiday đơn giản, unit test với edge cases (leap year, long weekends) |
| **Document generation fails** | Use existing libraries (docx-template), error handling + retry mechanism |
| **Reconciliation fails** | MVP chỉ Mức 1 (DB), test trước go-live, documented runbook |

**Market Risks:**

| Risk | Mitigation |
|------|------------|
| **User adoption thấp** | Training cho PKHCN + key users, phased rollout (1 khoa trước toàn trường) |
| **Resistance to change** | Communicate benefits rõ ràng, involve PKHCN trong design phase |
| **Compliance changes** | Configurable workflow, reason codes extensible |

**Resource Risks:**

| Risk | Contingency |
|------|-------------|
| **Team size nhỏ hơn (2 dev)** | Cut: bulk actions, advanced reporting, giữ core workflow + dashboards |
| **Timeline slip (6+ tuần)** | MVP only core workflow (DRAFT → ACTIVE), Growth features defer |
| **Budget cut** | Open-source alternatives, giảm scope (no BI, no AI) |

---

### Scope Decision Framework

**Must-Have Criteria (MVP):**
- Without this → Product fails
- Cannot be manual (users won't go back to Excel)
- Deal-breaker cho early adopters (PKHCN, Giảng viên)

**Nice-to-Have (Post-MVP):**
- Enhances but not essential
- Can be added later without breaking changes
- Advanced functionality builds on MVP

**Decision Matrix Example:**

| Feature | MVP? | Rationale |
|---------|------|-----------|
| Core workflow | ✅ MUST | Without this, product doesn't exist |
| 5 Dashboards | ✅ MUST | Each role needs view into system |
| SLA tracking | ✅ MUST | Compliance requirement |
| WebSocket real-time | ❌ NO | Async + polling đủ cho MVP |
| Bulk actions | ❌ NO | Manual OK cho MVP, enhance later |
| AI suggestions | ❌ NO | Vision feature, not needed for go-live |

---

## Functional Requirements

### 0. Invariant Rules (Critical Constraints)

*These are system invariants that MUST NOT be violated.*

- **FR0-A (State/Form Separation):** System MUST enforce separation between workflow state (`projects.state`) and form submission status (`form_instances.status`). Form status changes MUST NOT directly change workflow state.

- **FR0-B (Contextual Owner Permission):** System MUST enforce PROJECT_OWNER as contextual permission; only `projects.owner_id` can execute owner-only actions (create/edit/submit/resubmit final report).

- **FR0-C (100% Holder Visibility):** System MUST ensure every proposal always has a `holder_unit` (mandatory). `holder_user` is optional, but DRAFT defaults to PROJECT_OWNER as `holder_user` to satisfy 100% holder visibility.

- **FR0-D (Logs as Source of Truth):** System MUST maintain `workflow_logs` as append-only source of truth. Current state MUST be derivable from logs after restore/recompute.

---

### 1. User Management & Authentication

- **FR1:** System can authenticate users via username/password (local auth).

- **FR2:** System can maintain user profiles including full name, email, unit/faculty, and role.

- **FR3:** System can assign users to one of six roles: GIANG_VIEN, QUAN_LY_KHOA, PKHCN, THU_KY_HD, BGH, ADMIN.

- **FR4:** System can authorize actions based on (role + current proposal state + contextual ownership).

- **FR5 (MVP-safe Reset):** System can allow ADMIN to reset a user password (admin-assisted) and can force password change on next login. (Self-service email reset is out of MVP.)

- **FR6:** System can deactivate user accounts while preserving historical workflow/audit data.

- **FR7:** System can import user lists via Excel upload with validation feedback.

---

### 2. Workflow & State Management

- **FR8:** System supports workflow states as defined in Appendix: State Enumeration v1 (canonical).

- **FR9:** System can enforce state transitions based on predefined workflow rules (no arbitrary jumps).

- **FR10:** System can assign `holder_unit` (mandatory) and `holder_user` (optional) per state; DRAFT defaults to owner as `holder_user`.

- **FR11 (Reason Governance):** System MUST require reason code for negative/exception transitions (RETURN, REJECT, CANCEL, OVERRIDE, PAUSE/RESUME) and may keep reason optional for positive transitions (APPROVE).

- **FR12 (Context Preservation):** System can preserve form data when a proposal requires revision (resubmit does not lose context).

- **FR13:** System can allow proposal submission from DRAFT → SUBMITTED.

- **FR14:** System can auto-transition from SUBMITTED → FACULTY_REVIEW upon submission.

- **FR15 (Acceptance Sub-flow):** System can execute acceptance sub-flow after ACTIVE: ACTIVE → SUBMIT_FINAL_REPORT → FACULTY_ACCEPTANCE → (optional) SCHOOL_ACCEPTANCE → COMPLETED. The decision to include SCHOOL_ACCEPTANCE MUST be rule-based and configurable. Default for MVP: enabled unless configured otherwise.

- **FR16 (Submit ONCE):** System can allow only designated THU_KY_HD to submit council evaluation results (submit ONCE per proposal).

- **FR17 (Read-only Enforcement + Controlled Breakglass):** After council submission, the proposal becomes read-only for all roles except: PKHCN via OVERRIDE (reason required; immutable audit entry), and ADMIN for technical correction only (must be audited as TECHNICAL_ONLY).

- **FR18:** System can cancel proposals with required reason code.

- **FR19:** System can maintain append-only workflow logs of all state transitions (who/when/from/to/reason).

- **FR20 (Pause/Resume):** System can support PAUSE/RESUME transitions for ACTIVE projects (PKHCN only, reason required).

- **FR21 (Override):** System can support OVERRIDE transition with mandatory reason code and immutable audit entry (PKHCN only).

- **FR22 (Return-to-Prior-State Rule):** System can enforce revision behavior: REVISION_REQUIRED returns to the prior review state (not DRAFT) with context preserved.

---

### 3. Form & Proposal Management

- **FR23:** System can provide dynamic forms for proposal data entry.

- **FR24:** System can auto-fill user profile data into forms (name, email, unit/faculty).

- **FR25:** System can track file upload progress (x/y required files uploaded).

- **FR26:** System can validate required fields before submission and show actionable error messages.

- **FR27:** System can store form data with version tracking per revision cycle.

- **FR28:** System can allow users to save proposals as DRAFT before submission.

- **FR29:** System can display a proposal timeline on proposal detail (states + holders + timestamps + decisions).

- **FR30:** System can indicate which fields require editing during revision (highlight required changes and preserve previous inputs).

- **FR31:** System can maintain form submission status independently from workflow state (supports FR0-A).

---

### 4. Document Generation & Dossier

- **FR32:** System can generate .docx files from proposal data using uploaded templates.

- **FR33:** System can support .docx template upload by ADMIN/PKHCN (template is not editable in-system in MVP).

- **FR34:** System can map template placeholders to proposal data and generate output documents.

- **FR35:** System can generate SHA-256 hash for each generated document/artifact.

- **FR36:** System can maintain a manifest linking proposals to generated artifacts (with hashes).

- **FR37 (Retention Policy):** System can store documents per retention policy (default 7 years, configurable).

- **FR38:** System can allow users to download generated documents according to RBAC rules.

- **FR39:** System can verify document integrity via hash comparison (at least on demand / admin check).

---

### 5. Dashboard & Reporting

- **FR40:** System can provide role-based dashboards for each of the 6 roles (GIANG_VIEN, QUAN_LY_KHOA, PKHCN, THU_KY_HD, BGH, ADMIN).

- **FR41:** System can display aggregate statistics (totals by state, by unit/faculty, by period).

- **FR42:** System can display overdue proposals with visual highlighting.

- **FR43:** System can display proposals approaching deadline (warning at T-2 working days).

- **FR44:** System can allow drill-down from aggregates to proposal detail.

- **FR45:** System can provide read-only dashboard for BGH (no edit operations).

- **FR46:** System can allow filtering by unit/faculty, state, holder, and date range.

- **FR47:** System can export reports to Excel format (e.g., báo cáo_quý, báo_cáo_năm, theo_khoa) according to school's required layout.

- **FR48:** From dashboard drill-down, system can show proposal timeline and decision history (supports transparency requirement).

- **FR49:** System can provide dashboard optimized for mobile viewing (BGH dashboard priority).

- **FR50:** System can provide "My Action Items / Today's Tasks" widget for GIANG_VIEN and PKHCN.

---

### 6. SLA & Notifications

- **FR51:** System can calculate SLA deadlines based on working days (Mon–Fri), excluding holidays.

- **FR52:** System can import holiday calendar via Excel with `is_working_day` column (supports compensatory working days).

- **FR53:** System can adjust deadlines that fall on non-working days to the next working day.

- **FR54:** System can detect and flag proposals exceeding SLA deadline (overdue).

- **FR55 (Async Notifications MVP):** System can send SLA reminders at T-2, T0, T+2 (working-day aware) using cron + async delivery (no real-time). Must support email delivery. Must support in-app notification inbox (polling-based). Delivery failures must be logged and visible to ADMIN.

- **FR56:** System can allow PKHCN to send bulk reminder emails for overdue proposals.

- **FR57:** System can escalate overdue proposals at T+2 to PKHCN for intervention (must be visible on dashboard).

- **FR58:** System can track SLA compliance rate (% on-time).

- **FR59:** System can display SLA status per proposal with overdue/at-risk indicators.

---

### 7. System Administration & Audit

- **FR60:** System can provide an admin system health view (service status, DB connection, critical errors).

- **FR61 (Dual-layer Audit):** System must log: all workflow transitions in `workflow_logs` (primary audit), and all changes to sensitive tables in `audit_logs` (trigger-based, scoped).

- **FR62:** System can enforce reason code selection for reject/return/override/cancel actions.

- **FR63:** System can require free-text explanation when reason code KHAC is selected.

- **FR64:** System can export workflow/audit logs for inspection purposes (filterable by date/type/unit).

- **FR65:** System can restore database state from backup (runbook-driven).

- **FR66 (Recompute + Verify):** System can recompute proposal states from `workflow_logs` after restore and verify `projects.state == computed_state`; mismatches must be reported, and state correction must be restricted to ADMIN (audited).

- **FR67 (Validated Import + Atomic Apply):** System can validate Excel imports with row-level feedback, support dry-run summary, and apply changes atomically (all-or-nothing) when confirmed by PKHCN/ADMIN.

- **FR68:** System can maintain `workflow_logs` indefinitely (append-only, no deletion).

- **FR69:** System can provide error log viewing for ADMIN.

- **FR70:** System can allow ADMIN to manage form templates (create, upload, deactivate).

- **FR71:** System can allow ADMIN to configure SLA settings (thresholds, reminder schedule parameters).

- **FR72:** System can allow PKHCN to assign council members to proposals.

- **FR73:** System can allow PKHCN to assign expert reviewers to proposals.

- **FR74:** System can allow PKHCN to designate council secretary (THU_KY_HD) per proposal (enforces submit ONCE).

---

### Appendix: State Enumeration v1

**Primary Workflow States (11)**

| State | Description |
|-------|-------------|
| DRAFT | Initial state; owner editing |
| SUBMITTED | Submitted; auto-transition to FACULTY_REVIEW |
| FACULTY_REVIEW | Review at faculty/unit level |
| COUNCIL_REVIEW | Council review stage |
| EXPERT_REVIEW | External/internal expert appraisal |
| BGH_APPROVAL | Awaiting final approval by leadership |
| ACTIVE | Approved; project is running |
| SUBMIT_FINAL_REPORT | Owner submits final report |
| FACULTY_ACCEPTANCE | Faculty-level acceptance review |
| SCHOOL_ACCEPTANCE | School-level acceptance review (rule-based optional) |
| COMPLETED | Accepted and completed |

**Exceptional States (4)**

| State | Description |
|-------|-------------|
| REVISION_REQUIRED | Returned for revision; returns to prior state (not DRAFT) |
| CANCELLED | Cancelled (terminal) |
| REJECTED | Rejected (terminal) |
| PAUSED | Temporarily paused (PKHCN only) |

---

### Summary

| Metric | Value |
|--------|-------|
| **Total FRs** | 74 (+ 4 invariants FR0-A..D) |
| **Capability Areas** | 7 |
| **User Roles** | 6 |
| **Workflow States** | 11 primary + 4 exceptional |
| **Governance Locked** | Holder visibility, reason governance, logs-as-truth, working-days SLA, acceptance sub-flow |

---

## Non-Functional Requirements

### NFR-0. Scope Assumptions (MVP Baseline)

- **Deployment:** On-premises, single institution (no multi-tenant).
- **Primary Usage Window:** Mon–Fri, 07:30–17:00 (Vietnam local time).
- **MVP Priority:** Operational reliability + governance integrity over advanced scalability or real-time features.
- **Real-time:** Out of MVP (async jobs + polling only).

---

### 1. Performance

#### 1.1 Performance Targets (SLOs)

| Metric | Target | Measurement Notes |
|--------|--------|-------------------|
| **Dashboard initial load (BGH/PKHCN)** | < 3s | TTI, warm cache, typical dataset |
| **API latency** | p95 < 500ms | Excluding file upload/download |
| **Page transitions (client-side)** | < 500ms | Route-to-route navigation |
| **Document generation (.docx)** | < 10s | Single proposal, normal template |
| **Excel export** | < 30s | Report export with ≥1000 rows |
| **DB read queries** | p95 < 200ms | Common list/detail reads |

#### 1.2 Performance Engineering Requirements

- Route-level code splitting; avoid heavy client bundles for dashboards.
- DB indexing required for: `state`, `holder_unit`, `sla_deadline`, `created_at`, `faculty_id` and workflow timeline queries.
- Cache static reference data (faculties, roles, holiday calendar) with explicit TTL.
- Background jobs for expensive operations: exports, doc generation, reminder sends.
- Pagination required for all list APIs; no unbounded queries in UI.

#### 1.3 Performance Verification

- Lighthouse (or equivalent) for dashboard pages.
- Load test (k6/JMeter) for API latency p95; minimum scenarios: list proposals (filter by state/unit), proposal detail + timeline, SLA dashboard counts, export trigger (async job enqueue).

---

### 2. Security & Privacy (MVP-Realistic)

#### 2.1 Authentication & Session

- Local authentication (username/password) for MVP.
- Password policy: min 8 chars, force change on admin reset.
- **Session management:**
  - Access token 15 minutes, refresh token 7 days (rotation supported).
  - Idle timeout: 8 hours inactivity (configurable).

#### 2.2 Authorization

- RBAC enforcement on every API using (Role + State + Action + Owner context).
- BGH is read-only by design; enforced at API and UI.

#### 2.3 Transport & Secrets

- TLS enforced for all traffic (TLS 1.2+; prefer 1.3 where available).
- Secrets managed outside codebase (env/secret store); rotateable.

#### 2.4 Data Protection (On-prem Practical)

- Password hashing: bcrypt (cost factor ~12).
- Document integrity: SHA-256 for generated artifacts + manifest.
- "Encryption at rest" requirement MUST be implementable via one of:
  - Full-disk encryption at OS layer (recommended for on-prem), OR
  - Column-level encryption only for selected sensitive fields (optional).
- Access logging for admin actions; "TECHNICAL_ONLY" tagging where applicable.

#### 2.5 Abuse Controls (Lightweight MVP)

- Rate limiting baseline: 100 req/min/user (configurable).
- Import/export endpoints require elevated roles and audit events.
- SQL injection mitigated via parameterized queries (ORM) + input validation.

---

### 3. Reliability & Availability

#### 3.1 Availability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Uptime** | 99.5% | During business hours Mon–Fri |
| **Workflow state integrity** | 100% | State derivable from append-only workflow logs |
| **Lost-state incidents** | 0 | Within first 6 months |

#### 3.2 Backup / Restore (RTO/RPO)

| Metric | Target | Definition |
|--------|--------|------------|
| **DB restore + verify (RTO-DB)** | < 1 hour (MUST) | Restore + recompute + verify state |
| **Full system recovery (RTO-Full)** | < 4 hours (RECOMMENDED) | App + DB + storage + verification |
| **Recovery Point Objective (RPO)** | ≤ 24 hours (MVP default) | Maximum acceptable data loss window based on backup schedule |

**Backup policy (MVP):**
- Daily DB backup (nightly) + weekly full archive.
- Backup verification job must run at least weekly (restore to staging and validate).

#### 3.3 Fault Tolerance / Degradation

- If non-critical modules fail (email provider, export worker), core workflow must remain usable.
- Job retries with capped attempts and visible failure status for ADMIN.

---

### 4. Data Retention & Compliance

#### 4.1 Retention Policy

| Data | Retention |
|------|-----------|
| **workflow_logs** | Indefinite (append-only, source of truth) |
| **audit_logs** | Indefinite (compliance evidence) |
| **Generated documents** | 7 years after completion (configurable) |
| **Deactivated user accounts** | 3 years (profile retained; access disabled) |

#### 4.2 Compliance Requirements (Operational)

- Exportable logs: filter by date range, unit/faculty, user, action type, state transition.
- Reason codes mandatory for negative/exception transitions; KHAC requires free text.
- Manifest must link artifacts + hashes for verification.

---

### 5. Accessibility (WCAG 2.1 AA)

#### 5.1 Requirements

- Keyboard navigation for all essential workflows (tab order, focus visible, modal focus trap).
- Contrast ratios: 4.5:1 for normal text, 3:1 for large text.
- Screen reader compatibility: semantic HTML + ARIA labels for tables/forms/modals.
- Zoom support: usable at 200% without horizontal scrolling on primary pages.

#### 5.2 Mobile Responsiveness (MVP Focus)

- BGH dashboard: mobile-optimized read-only views.
- Minimum touch target: 44×44 px on mobile.

#### 5.3 Accessibility Verification

- Automated checks (axe/Lighthouse) on key pages.
- Manual keyboard-only walkthrough for the 3 critical journeys (GIANG_VIEN, PKHCN, BGH).

---

### 6. Scalability (Limited but Explicit)

#### 6.1 Capacity Targets (MVP)

| Dimension | Target |
|-----------|--------|
| **Concurrent users** | 50–100 |
| **Total users** | ~500 |
| **Storage growth** | ~10GB/year (documents + logs) |

#### 6.2 Scalability Strategy (MVP-Compatible)

- Partition `workflow_logs` by year if query volume grows.
- Archive completed projects after completion + 1 year (metadata kept).
- Connection pooling (cap default ~20 connections).
- Horizontal scaling / load balancing is **out of MVP**.

---

### 7. Maintainability & Observability

#### 7.1 Code Quality

- TypeScript strict mode recommended for backend and shared types.
- Lint + formatting enforced via CI.
- **Test coverage:**
  - Overall: ≥70% for critical modules (workflow transitions, RBAC, SLA calculator, recompute/verify).

#### 7.2 Documentation & Runbooks (Must-Have)

- API documentation (OpenAPI or equivalent).
- **Runbook:**
  - DB restore procedure
  - Recompute + verify state procedure
  - Import/export failure handling
  - Rollback / incident checklist

#### 7.3 Monitoring & Logging

- Structured JSON logs with correlation IDs per request.
- Error tracking (Sentry or equivalent) for uncaught exceptions.
- **Basic operational metrics:**
  - API p95 latency, error rate, job queue failures, backup success/failure.

---

### NFR Summary (Priority)

| Category | Priority | Non-negotiables |
|----------|----------|------------------|
| **Performance** | High | Dashboard < 3s; API p95 < 500ms |
| **Reliability** | High | RTO-DB < 1h; state derivable from logs; 0 lost-state |
| **Compliance/Retention** | High | Logs indefinite; docs 7 years; exportable audit |
| **Security** | Medium-High | RBAC everywhere; TLS; hashed passwords; audited admin actions |
| **Accessibility** | Medium | WCAG 2.1 AA on critical journeys |
| **Scalability** | Low | Single-school capacity targets only |

---
