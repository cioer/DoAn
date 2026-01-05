- `GET /api/auth/me` - Get current user

**Projects:**
- `GET /api/projects` - List projects (with filters)
- `POST /api/projects` - Create new project (DRAFT)
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project (DRAFT/CHANGES_REQUESTED)
- `POST /api/projects/:id/submit` - Submit project
- `POST /api/projects/:id/withdraw` - Withdraw project
- `GET /api/projects/:id/history` - Get workflow history
- `GET /api/projects/:id/available-actions` - Get allowed actions

**Approval Tasks:**
- `GET /api/tasks` - Get task inbox (with filters)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks/:id/decision` - Submit decision (APPROVE/REQUEST_CHANGES/REJECT)
- `POST /api/tasks/:id/start` - Mark task as started
- `GET /api/tasks/statistics` - Get task statistics

**Forms:**
- `GET /api/forms` - Get form template (for rendering)
- `POST /api/form-instances` - Submit form instance
- `PATCH /api/form-instances/:id` - Save draft

**Documents:**
- `GET /api/documents/:id/download` - Download document
- `POST /api/documents/generate` - Generate document from template

**Dashboard:**
- `GET /api/dashboard` - Get role-based dashboard data

**Notifications:**
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read

**Admin:**
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `POST /api/admin/users/import` - Import users from Excel
- `GET /api/admin/form-templates` - List form templates
- `POST /api/admin/form-templates` - Create form template
- `GET /api/admin/audit-logs` - Get audit logs

### A.4 Database Entities Summary

**Core Tables:**
1. `users` - User accounts
2. `roles` - Role definitions
3. `user_roles` - User-role assignments
4. `permissions` - Permission definitions
5. `role_state_permissions` - Role + State + Permission mapping

**Workflow Tables:**
6. `projects` - Main project entity
7. `project_members` - Project team members
8. `approval_tasks` - Approval task inbox (SEPARATE from projects!)
9. `workflow_logs` - Audit trail

**Form Tables:**
10. `form_templates` - Form templates
11. `form_instances` - Form submissions
12. `form_fields` - Form field definitions

**Document Tables:**
13. `document_templates` - Document templates (.docx)
14. `document_maps` - Template to form field mapping
15. `documents` - Generated documents

**Notification Tables:**
16. `notifications` - User notifications

**Settings Tables:**
17. `sla_settings` - SLA configuration
18. `withdrawal_policy` - Withdrawal rules
19. `holidays` - Public holidays for SLA calculation

---

## Appendix B: Terminology Mapping

To bridge the gap between business language and system implementation:

| Thuật ngữ thực tế | Trong hệ thống | Diễn giải |
|-------------------|----------------|----------|
| HĐ KH&ĐT (Hội đồng Khoa học và Đào tạo) | `COUNCIL_REVIEW` | State khi chờ xét chọn sơ bộ cấp Trường |
| TV phản biện / Thẩm định | `EXPERT_REVIEW` | State khi chờ thẩm định chuyên môn sâu |
| Thư ký HĐ | `THU_KY_HD` | Role code (subset of HOI_DONG) |
| Thành viên HĐ | `THANH_VIEN_HD` | Role code (subset of HOI_DONG) |
| Chủ nhiệm đề tài | `PROJECT_OWNER` | projects.owner_id (contextual, see note below) |
| Giảng viên / NCS | `GIANG_VIEN` | Base role for researchers |

**Note on PROJECT_OWNER:**
`PROJECT_OWNER` is NOT a standalone role. It is a contextual role derived from `GIANG_VIEN` where `user.id = projects.owner_id`. Only the project owner can perform owner-specific actions (EDIT_FORM in DRAFT, RESUBMIT in CHANGES_REQUESTED, SUBMIT_ACCEPTANCE in IN_PROGRESS). Other `GIANG_VIEN` users (even project members) cannot perform these actions.
| Trưởng bộ môn | `TRUONG_BO_MON` | Role code (optional, subset of QUAN_LY_KHOA) |
| Phòng KHCN | `PHONG_KHCN` | Short for Phòng Khoa học & Công nghệ |

**Note 1:** `HOI_DONG` is a generic role that includes both council members and expert reviewers. Specific permissions are determined by `state` + `action` combination.

**Note 2:** `HOI_DONG` is a logical role assigned per project and per workflow stage. It does NOT represent a permanent organizational unit. Each project has a different council composition, and members are assigned dynamically based on expertise matching the project topic.

---

**Document Version:** 2.2
**Last Updated:** 2026-01-03
**Status:** Ready for Development

**Changelog:**
- v2.2 (2026-01-03): **P2 NICE-TO-HAVE FIXES** - Fixed P2 issues from gap analysis:
  - P2-1: Standardized icon convention using lucide-react in UX design spec v1.2
- v2.1 (2026-01-03): **P1 IMPORTANT FIXES** - Fixed all P1 issues from gap analysis:
  - P1-1: Enhanced voting logic with `voting_thresholds` database table
  - P1-2: Added working calendar config with timezone support
  - P1-3: Added Nx monorepo workspace structure documentation
- v2.0 (2026-01-03): **P0 CRITICAL FIXES** - Fixed all P0 issues from gap analysis:
  - P0-1: Updated backend framework from Express to NestJS 10.x
  - P0-2: Clarified SUBMITTED as EVENT not STATE (15 canonical states)
  - P0-3: Standardized return state storage to workflow_logs.return_target_state
  - P0-4: Added idempotency_key to workflow_logs schema
- v1.3 (2026-01-02): **Wireframe Gap Analysis Updates**
  - P0: Standardized state machine (13 states with enum), added transition rules table
  - P0: Added complete Action Availability Matrix (PI vs Approver view)
  - P0: Clarified Save Draft vs Submit semantics with backend code
  - P1: Added `approval_tasks` entity (separate from projects!)
  - P1: Standardized audit log event types (20+ actions)
  - P1: Added i18n policy (100% Vietnamese for MVP)
  - P2: Clarified SLA definition (working hours, pause/resume, escalation tiers)
  - P2: Added document visibility rules matrix
  - Added Appendix A: Routes/UI Structure and API Summary
- v1.2 (2026-01-02): Added final report sub-flow, budget disbursement rules, signed document tracking
- v1.1 (2026-01-02): Added terminology mapping, PROJECT_OWNER note, HOI_DONG logical role
- v1.0 (2026-01-02): Initial release

---

## Appendix C: Regulatory Compliance
| #  | Quy định / Yêu cầu        | Nội dung quy định (tóm tắt)                   | Hệ thống đáp ứng bằng                       | Ghi chú                     |
| -- | ------------------------- | --------------------------------------------- | ------------------------------------------- | --------------------------- |
| 1  | Đề xuất đề tài            | Giảng viên/Chủ nhiệm nộp hồ sơ đăng ký đề tài | State `DRAFT` → `SUBMITTED` + Form Proposal | FormTemplate + FormInstance |
| 2  | Xét duyệt cấp Khoa        | Khoa đánh giá tính cần thiết và chuyên môn    | State `FACULTY_REVIEW`                      | RBAC khóa quyền             |
| 3  | Xét chọn cấp Trường       | HĐ KH&ĐT xét chọn đề xuất                     | State `SCHOOL_SELECTION_REVIEW`             | Không bypass Khoa           |
| 4  | Hội đồng phê duyệt        | HĐ họp và BGH ký quyết định                   | State `OUTLINE_COUNCIL_REVIEW`              | BGH chỉ quyết định          |
| 5  | Trả hồ sơ chỉnh sửa       | Yêu cầu chỉnh sửa đề cương/báo cáo            | State `CHANGES_REQUESTED`                   | Quay lại đúng cấp           |
| 6  | Nộp lại sau chỉnh sửa     | Chủ nhiệm chỉnh sửa và nộp lại                | Action `RESUBMIT`                           | Không làm lại từ đầu        |
| 7  | Triển khai đề tài         | Đề tài được thực hiện                         | State `IN_PROGRESS`                          | Theo dõi tiến độ            |
| 8  | Gia hạn (nếu cần)         | Xin gia hạn thời gian thực hiện              | State `PAUSED` + Extension Request (Mẫu 18b) | Cần duyệt Khoa + PKHCN      |
| 9  | Nghiệm thu cấp Khoa       | HĐ Khoa nghiệm thu trước                      | State `FACULTY_ACCEPTANCE_REVIEW`           | BẮT BUỘC                   |
| 10 | Nghiệm thu cấp Trường     | HĐ Trường nghiệm thu sau Khoa PASS            | State `SCHOOL_ACCEPTANCE_REVIEW`            | Cần Khoa PASS trước        |
| 11 | Bàn giao                  | Nộp biên bản bàn giao (Mẫu 17b)              | State `HANDOVER` → `COMPLETED`              | Hoàn thành quy trình        |
| 12 | Theo dõi tiến độ          | Quản lý thời gian, nhắc hạn                   | SLA + Escalation (T-2, T0, T+2)             | Không phạt tự động          |
| 10 | Quản lý trách nhiệm       | Xác định đơn vị chịu trách nhiệm              | `current_holder_id`                         | Phục vụ dashboard           |
| 11 | Điều phối nghiệp vụ       | Phòng KHCN làm đầu mối quản lý                | Role `PHONG_KHCN` + OVERRIDE                | Có audit bắt buộc           |
| 12 | Ghi nhận quyết định       | Mọi quyết định phải lưu vết                   | `workflow_logs`                             | Append-only                 |
| 13 | Hồ sơ văn bản             | Có biên bản, quyết định bằng văn bản          | Docx generation + DocumentMap               | Xuất được                   |
| 14 | Lưu trữ hồ sơ             | Phục vụ kiểm tra, thanh tra                   | FormInstance snapshot + logs                | Không sửa ngầm              |
| 15 | Nghiệm thu đề tài         | Đánh giá kết quả thực hiện                    | State `COMPLETED` + Final Report            | Có thể mở rộng              |
| 16 | Kết luận đạt / không đạt  | Chấp nhận hoặc không nghiệm thu               | `COMPLETED` / `REJECTED`                    | Theo giai đoạn cuối         |
| 17 | Chữ ký xác nhận           | Chỉ yêu cầu chữ ký tay ở sản phẩm cuối        | Metadata `signed_required`                  | Không bắt buộc mọi bước     |
| 18 | Giải ngân kinh phí        | Chi trả sau khi nghiệm thu                    | Rule gắn với `COMPLETED`                    | Ngoài scope tài chính       |
| 19 | Phân quyền rõ ràng        | Không vượt cấp, không lạm quyền               | RBAC: Role + State + Action                 | Khóa backend                |
| 20 | Minh bạch & giải trình    | Có thể truy vết khi cần                       | Audit log + Export                          | Đáp ứng thanh tra           |

