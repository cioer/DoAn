# 📘 API SPECIFICATION - HỆ THỐNG QUẢN LÝ ĐỀ TÀI NGHIÊN CỨU KHOA HỌC

**Project:** Quản lý Đề tài Nghiên cứu Khoa học (QLNCKH)
**Backend:** NestJS + Prisma + PostgreSQL
**Frontend:** React + TypeScript
**Base URL:** `http://localhost:3000/api`

---

## 📋 MỤC LỤC

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Authentication](#authentication)
3. [User Roles](#user-roles)
4. [Proposal States](#proposal-states)
5. [API Endpoints](#api-endpoints)
6. [Data Models](#data-models)
7. [Error Codes](#error-codes)
8. [Frontend Integration Guide](#frontend-integration-guide)

---

## 🎯 TỔNG QUAN HỆ THỐNG

Hệ thống quản lý **đề tài nghiên cứu khoa học** với quy trình luân chuyển qua nhiều bước:

```
DRAFT → FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW
→ APPROVED → IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
→ HANDOVER → COMPLETED
```

**Các điểm quan trọng:**
- **15 states** khác nhau trong lifecycle
- **8 user roles** với permissions khác nhau
- **Workflow transitions** có validation và audit log
- **PDF generation** tự động từ đề tài
- **File attachments** với validation
- **SLA tracking** cho mỗi state

---

## 🔐 AUTHENTICATION

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "giangvien@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "email": "giangvien@example.com",
      "displayName": "Nguyễn Văn A",
      "role": "GIANG_VIEN",
      "facultyId": "faculty-uuid",
      "faculty": {
        "id": "faculty-uuid",
        "name": "Khoa CNTT",
        "code": "CNTT"
      }
    }
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email hoặc mật khẩu không đúng"
  }
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "giangvien@example.com",
    "displayName": "Nguyễn Văn A",
    "role": "GIANG_VIEN",
    "facultyId": "faculty-uuid",
    "permissions": ["PROPOSAL_CREATE", "PROPOSAL_EDIT", "EXPORT_PROPOSAL_PDF"]
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

---

## 👥 USER ROLES

| Role | Mô tả | Permissions chính |
|------|-------|-------------------|
| **GIANG_VIEN** | Giảng viên / PI (Project Owner) | Tạo, sửa, xóa đề tài DRAFT; Nộp, nộp lại, rút đề tài; Nộp nghiệm thu; Bàn giao; Export PDF |
| **QUAN_LY_KHOA** | Quản lý Khoa | Duyệt/trả về cấp Khoa; Nghiệm thu cấp Khoa; Xem đề tài khoa |
| **THU_KY_KHOA** | Thư ký Khoa | Giống QUAN_LY_KHOA |
| **PHONG_KHCN** | Phòng Khoa học Công nghệ | Phân bổ HD; Nghiệm thu Trường; Pause/resume; Dashboard; Export; Quản lý templates |
| **THU_KY_HOI_DONG** | Thư ký Hội đồng | Tạo, nộp phiếu đánh giá; Nghiệm thu Trường |
| **THANH_TRUNG** | Thành viên Hội đồng | Từ chối đề tài |
| **BAN_GIAM_HOC** | Ban Giám hiệu | Duyệt/trả về Hội đồng; Chấp nhận nghiệm thu Trường |
| **ADMIN** | Quản trị hệ thống | Tất cả quyền hạn; Quản lý users; System health; Full dump export |

---

## 🔄 PROPOSAL STATES

### State Enum

```typescript
enum ProjectState {
  DRAFT = 'DRAFT',                              // Nháp
  FACULTY_REVIEW = 'FACULTY_REVIEW',          // Đang xét Khoa
  SCHOOL_SELECTION_REVIEW = 'SCHOOL_SELECTION_REVIEW', // Phân bổ Hội đồng
  OUTLINE_COUNCIL_REVIEW = 'OUTLINE_COUNCIL_REVIEW',   // Xét duyệt Hội đồng
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',    // Yêu cầu sửa
  APPROVED = 'APPROVED',                      // Đã duyệt
  IN_PROGRESS = 'IN_PROGRESS',                // Đang thực hiện
  FACULTY_ACCEPTANCE_REVIEW = 'FACULTY_ACCEPTANCE_REVIEW', // Nghiệm thu Khoa
  SCHOOL_ACCEPTANCE_REVIEW = 'SCHOOL_ACCEPTANCE_REVIEW',   // Nghiệm thu Trường
  HANDOVER = 'HANDOVER',                      // Bàn giao
  COMPLETED = 'COMPLETED',                    // Hoàn thành
  CANCELLED = 'CANCELLED',                    // Đã hủy
  REJECTED = 'REJECTED',                      // Đã từ chối
  WITHDRAWN = 'WITHDRAWN',                    // Đã rút
  PAUSED = 'PAUSED'                           // Đã tạm dừng
}
```

### State Transition Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         PROPOSAL LIFECYCLE                      │
└─────────────────────────────────────────────────────────────────┘

  DRAFT
    │
    │ SUBMIT (GIANG_VIEN owner)
    ↓
  FACULTY_REVIEW ◄───────────────────────────┐
    │                                         │
    │ APPROVE_FACULTY (QUAN_LY_KHOA)         │
    ↓                                         │
  SCHOOL_SELECTION_REVIEW                      │
    │                                         │ RESUBMIT (GIANG_VIEN)
    │ ASSIGN_COUNCIL (PHONG_KHCN)            │
    ↓                                         │
  OUTLINE_COUNCIL_REVIEW                      │
    │                                         │
    ├─→ APPROVE_COUNCIL (BGH)                │
    │   ↓                                     │
    │ APPROVED                                │
    │   │                                     │
    │   │ START_PROJECT (GIANG_VIEN)         │
    │   ↓                                     │
    │ IN_PROGRESS                              │
    │   │                                     │
    │   │ SUBMIT_FACULTY_ACCEPTANCE          │
    │   ↓                                     │
    │ FACULTY_ACCEPTANCE_REVIEW               │
    │   │                                     │
    │   ├─→ FACULTY_ACCEPT (QUAN_LY_KHOA)    │
    │   │   ↓                                 │
    │   │ SCHOOL_ACCEPTANCE_REVIEW            │
    │   │   │                                 │
    │   │   ├─→ SCHOOL_ACCEPT (BGH)           │
    │   │   │   ↓                             │
    │   │   │ HANDOVER                        │
    │   │   │   │                             │
    │   │   │ COMPLETE_HANDOVER (GIANG_VIEN) │
    │   │   │   ↓                             │
    │   │   │ COMPLETED ◄─────────────────────┘
    │   │   │
    │   └─→ RETURN_FACULTY (QUAN_LY_KHOA)    │
    │       ↓                                 │
    │   CHANGES_REQUESTED ◄───────────────────┤
    │                                         │
  ├─→ RETURN_FACULTY (QUAN_LY_KHOA)          │
  │   RETURN_COUNCIL (BGH)                   │
  │   RETURN_SCHOOL (PHONG_KHCN)             │
  │     ↓                                     │
  └───→ CHANGES_REQUESTED ────────────────────┘

  EXCEPTION STATES (Terminal):
  - CANCELLED (from DRAFT - GIANG_VIEN)
  - WITHDRAWN (before APPROVED - GIANG_VIEN)
  - REJECTED (any review state - Reviewers)
  - PAUSED (from IN_PROGRESS - PHONG_KHCN only)
    └─→ RESUME → IN_PROGRESS
```

---

## 📡 API ENDPOINTS

## 1. PROPOSALS

### 1.1 Create Proposal

```http
POST /api/proposals
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "DT2026001",
  "title": "Nghiên cứu AI trong y học",
  "facultyId": "faculty-uuid",
  "templateId": "template-uuid",
  "formData": {
    "SEC_INFO_GENERAL": {
      "researchField": "Công nghệ thông tin",
      "duration": 24,
      "budget": 50000000
    },
    "SEC_BUDGET": {
      "personnel": 30000000,
      "equipment": 15000000,
      "materials": 5000000
    }
  },
  "attachmentIds": ["attachment-uuid-1", "attachment-uuid-2"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "proposal-uuid",
    "code": "DT2026001",
    "title": "Nghiên cứu AI trong y học",
    "state": "DRAFT",
    "ownerId": "user-uuid",
    "facultyId": "faculty-uuid",
    "templateId": "template-uuid",
    "formData": { ... },
    "createdAt": "2026-01-11T00:00:00.000Z",
    "updatedAt": "2026-01-11T00:00:00.000Z",
    "owner": {
      "id": "user-uuid",
      "displayName": "Nguyễn Văn A",
      "email": "giangvien@example.com"
    },
    "faculty": {
      "id": "faculty-uuid",
      "name": "Khoa CNTT",
      "code": "CNTT"
    },
    "attachments": [
      {
        "id": "attachment-uuid-1",
        "fileName": "document.pdf",
        "fileUrl": "/uploads/uuid-document.pdf",
        "fileSize": 1048576,
        "mimeType": "application/pdf",
        "uploadedAt": "2026-01-11T00:00:00.000Z"
      }
    ]
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "code",
        "message": "Mã đề tài đã tồn tại"
      }
    ]
  }
}
```

### 1.2 List Proposals

```http
GET /api/proposals?page=1&limit=20&state=DRAFT&facultyId=faculty-uuid&search=AI
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `page` (optional, default: 1) - Số trang
- `limit` (optional, default: 20) - Số item/trang
- `state` (optional) - Filter theo state
- `facultyId` (optional) - Filter theo khoa
- `search` (optional) - Tìm kiếm theo code/title
- `sort` (optional, default: createdAt) - Field để sort
- `order` (optional, default: desc) - asc/desc

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "proposal-uuid",
        "code": "DT2026001",
        "title": "Nghiên cứu AI trong y học",
        "state": "DRAFT",
        "createdAt": "2026-01-11T00:00:00.000Z",
        "slaDeadline": "2026-01-25T17:00:00.000Z",
        "owner": {
          "id": "user-uuid",
          "displayName": "Nguyễn Văn A",
          "email": "giangvien@example.com"
        },
        "faculty": {
          "id": "faculty-uuid",
          "name": "Khoa CNTT",
          "code": "CNTT"
        }
      }
    ],
    "meta": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### 1.3 Get Proposal Detail

```http
GET /api/proposals/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "proposal-uuid",
    "code": "DT2026001",
    "title": "Nghiên cứu AI trong y học",
    "state": "DRAFT",
    "formData": { ... },
    "holderUnit": null,
    "holderUser": null,
    "slaDeadline": null,
    "createdAt": "2026-01-11T00:00:00.000Z",
    "updatedAt": "2026-01-11T00:00:00.000Z",
    "owner": {
      "id": "user-uuid",
      "displayName": "Nguyễn Văn A",
      "email": "giangvien@example.com",
      "faculty": {
        "id": "faculty-uuid",
        "name": "Khoa CNTT"
      }
    },
    "faculty": {
      "id": "faculty-uuid",
      "name": "Khoa CNTT",
      "code": "CNTT"
    },
    "template": {
      "id": "template-uuid",
      "name": "Mẫu đề cương",
      "type": "PROPOSAL_OUTLINE"
    },
    "attachments": [ ... ],
    "workflowLogs": [
      {
        "id": "log-uuid",
        "action": "CREATE",
        "fromState": null,
        "toState": "DRAFT",
        "actorName": "Nguyễn Văn A",
        "timestamp": "2026-01-11T00:00:00.000Z"
      }
    ]
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "PROPOSAL_NOT_FOUND",
    "message": "Đề tài không tồn tại"
  }
}
```

### 1.4 Update Proposal

```http
PUT /api/proposals/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:** (Same as Create Proposal, but all fields optional)

**Response (200):**
```json
{
  "success": true,
  "data": { ... } (same as Get Proposal Detail)
}
```

**Permission:** Chỉ owner có thể update proposal ở state DRAFT

**Error (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền sửa đề tài này"
  }
}
```

### 1.5 Delete Proposal (Soft Delete)

```http
DELETE /api/proposals/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Đã xóa đề tài"
  }
}
```

**Permission:** Chỉ owner có thể xóa proposal ở state DRAFT

### 1.6 Auto Save Proposal

```http
PATCH /api/proposals/:id/auto-save
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "formData": {
    "SEC_BUDGET": {
      "personnel": 35000000,
      "equipment": 10000000
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "proposal-uuid",
    "formData": { ... },
    "updatedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

---

## 2. WORKFLOW TRANSITIONS

### 2.1 Submit Proposal

```http
POST /api/workflow/:proposalId/submit
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid-for-idempotency"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "DRAFT",
    "toState": "FACULTY_REVIEW",
    "action": "SUBMIT",
    "holderUnit": "faculty-uuid",
    "slaDeadline": "2026-01-25T17:00:00.000Z",
    "workflowLog": {
      "id": "log-uuid",
      "action": "SUBMIT",
      "fromState": "DRAFT",
      "toState": "FACULTY_REVIEW",
      "actorName": "Nguyễn Văn A",
      "timestamp": "2026-01-11T00:00:00.000Z"
    }
  }
}
```

**Permission:** GIANG_VIEN (owner only)

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Không thể nộp đề tài ở trạng thái hiện tại"
  }
}
```

### 2.2 Approve Faculty

```http
POST /api/workflow/:proposalId/approve-faculty
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "comment": "Đề tài tốt, cho phép duyệt"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "FACULTY_REVIEW",
    "toState": "SCHOOL_SELECTION_REVIEW",
    "action": "APPROVE_FACULTY",
    "holderUnit": "PHONG_KHCN",
    "slaDeadline": "2026-02-08T17:00:00.000Z"
  }
}
```

**Permission:** QUAN_LY_KHOA, THU_KY_KHOA

### 2.3 Return Faculty (Request Changes)

```http
POST /api/workflow/:proposalId/return-faculty
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "returnTargetState": "DRAFT",
  "reason": "Cần bổ sung thêm thông tin về ngân sách",
  "returnSections": ["SEC_BUDGET", "SEC_TIMELINE"],
  "comment": "Vui lòng chi tiết hơn phần ngân sách"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "FACULTY_REVIEW",
    "toState": "CHANGES_REQUESTED",
    "action": "RETURN_FACULTY",
    "holderUnit": "faculty-uuid",
    "holderUser": "user-uuid",
    "returnTargetState": "DRAFT",
    "returnSections": ["SEC_BUDGET", "SEC_TIMELINE"]
  }
}
```

**Permission:** QUAN_LY_KHOA, THU_KY_KHOA

### 2.4 Resubmit

```http
POST /api/workflow/:proposalId/resubmit
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "comment": "Đã bổ sung đầy đủ thông tin"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "CHANGES_REQUESTED",
    "toState": "FACULTY_REVIEW",
    "action": "RESUBMIT",
    "holderUnit": "faculty-uuid",
    "slaDeadline": "2026-02-08T17:00:00.000Z"
  }
}
```

**Permission:** GIANG_VIEN (owner only)

**Note:** System tự động đọc `return_target_state` từ workflow log gần nhất để chuyển về đúng state.

### 2.5 Approve Council

```http
POST /api/workflow/:proposalId/approve-council
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "comment": "Đề tài đạt yêu cầu, cho phép thực hiện"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "OUTLINE_COUNCIL_REVIEW",
    "toState": "APPROVED",
    "action": "APPROVE_COUNCIL",
    "holderUnit": null,
    "slaDeadline": null
  }
}
```

**Permission:** BAN_GIAM_HOC

### 2.6 Assign Council

```http
POST /api/workflow/:proposalId/assign-council
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "councilId": "council-uuid",
  "secretaryId": "secretary-user-uuid",
  "comment": "Phân bổ hội đồng xét duyệt"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "SCHOOL_SELECTION_REVIEW",
    "toState": "OUTLINE_COUNCIL_REVIEW",
    "action": "ASSIGN_COUNCIL",
    "councilId": "council-uuid",
    "holderUnit": "council-uuid",
    "holderUser": "secretary-user-uuid",
    "slaDeadline": "2026-02-22T17:00:00.000Z"
  }
}
```

**Permission:** PHONG_KHCN

### 2.7 Start Project

```http
POST /api/proposals/:proposalId/start
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "APPROVED",
    "toState": "IN_PROGRESS",
    "action": "START_PROJECT",
    "holderUnit": null,
    "holderUser": "owner-uuid",
    "slaDeadline": null
  }
}
```

**Permission:** GIANG_VIEN (owner only)

### 2.8 Submit Faculty Acceptance

```http
POST /api/proposals/:proposalId/faculty-acceptance
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "results": "Đã hoàn thành các mục tiêu đề ra",
  "products": "3 bài báo khoa học, 1 phần mềm",
  "attachmentIds": ["attachment-uuid-1", "attachment-uuid-2"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "IN_PROGRESS",
    "toState": "FACULTY_ACCEPTANCE_REVIEW",
    "action": "SUBMIT_FACULTY_ACCEPTANCE",
    "holderUnit": "faculty-uuid",
    "slaDeadline": "2026-03-07T17:00:00.000Z",
    "facultyAcceptanceData": {
      "results": "Đã hoàn thành các mục tiêu đề ra",
      "products": "3 bài báo khoa học, 1 phần mềm",
      "submittedAt": "2026-01-11T00:00:00.000Z"
    }
  }
}
```

**Permission:** GIANG_VIEN (owner only)

### 2.9 Faculty Acceptance Decision

```http
POST /api/proposals/:proposalId/faculty-acceptance-decision
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "decision": "DAT",
  "comment": "Đề tài đạt yêu cầu, cho phép nghiệm thu cấp Trường"
}
```

**Response (200 - decision: DAT):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "FACULTY_ACCEPTANCE_REVIEW",
    "toState": "SCHOOL_ACCEPTANCE_REVIEW",
    "action": "FACULTY_ACCEPT",
    "holderUnit": "PHONG_KHCN",
    "slaDeadline": "2026-03-21T17:00:00.000Z"
  }
}
```

**Response (200 - decision: KHONG_DAT):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "FACULTY_ACCEPTANCE_REVIEW",
    "toState": "IN_PROGRESS",
    "action": "FACULTY_REJECT",
    "holderUnit": null,
    "holderUser": "owner-uuid",
    "comment": "Cần bổ sung kết quả nghiên cứu"
  }
}
```

**Permission:** QUAN_LY_KHOA

### 2.10 Complete Handover

```http
POST /api/proposals/:proposalId/complete-handover
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "handoverChecklist": {
    "documents": true,
    "products": true,
    "budgetSettlement": true,
    "notes": "Đã bàn giao đầy đủ"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "HANDOVER",
    "toState": "COMPLETED",
    "action": "HANDOVER_COMPLETE",
    "completedAt": "2026-01-11T00:00:00.000Z",
    "handoverChecklist": {
      "documents": true,
      "products": true,
      "budgetSettlement": true,
      "notes": "Đã bàn giao đầy đủ"
    }
  }
}
```

**Permission:** GIANG_VIEN (owner only)

### 2.11 Cancel Proposal

```http
POST /api/workflow/:proposalId/cancel
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "reason": "Thay đổi hướng nghiên cứu"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "DRAFT",
    "toState": "CANCELLED",
    "action": "CANCEL",
    "cancelledAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** GIANG_VIEN (owner only), state DRAFT only

### 2.12 Withdraw Proposal

```http
POST /api/workflow/:proposalId/withdraw
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "reason": "Thay đổi hướng nghiên cứu"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "FACULTY_REVIEW",
    "toState": "WITHDRAWN",
    "action": "WITHDRAW",
    "withdrawnAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** GIANG_VIEN (owner only), before APPROVED only

### 2.13 Reject Proposal

```http
POST /api/workflow/:proposalId/reject
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "reason": "Đề tài không đạt yêu cầu",
  "reasonCode": "SCIENTIFIC_MERIT"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "FACULTY_REVIEW",
    "toState": "REJECTED",
    "action": "REJECT",
    "rejectedAt": "2026-01-11T00:00:00.000Z",
    "rejectedById": "user-uuid"
  }
}
```

**Permission:** QUAN_LY_KHOA, PHONG_KHCN, THU_KY_HOI_DONG, THANH_TRUNG, BGH

### 2.14 Pause Proposal

```http
POST /api/workflow/:proposalId/pause
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "reason": "Tạm ngừng do thiếu kinh phí",
  "expectedResumeAt": "2026-03-01T00:00:00.000Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "IN_PROGRESS",
    "toState": "PAUSED",
    "action": "PAUSE",
    "prePauseState": "IN_PROGRESS",
    "prePauseHolderUnit": null,
    "prePauseHolderUser": "owner-uuid",
    "pausedAt": "2026-01-11T00:00:00.000Z",
    "expectedResumeAt": "2026-03-01T00:00:00.000Z"
  }
}
```

**Permission:** PHONG_KHCN only

### 2.15 Resume Proposal

```http
POST /api/workflow/:proposalId/resume
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid",
  "comment": "Đã có kinh phí tiếp tục"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "fromState": "PAUSED",
    "toState": "IN_PROGRESS",
    "action": "RESUME",
    "holderUnit": null,
    "holderUser": "owner-uuid",
    "resumedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** PHONG_KHCN only

---

## 3. ATTACHMENTS (FILE UPLOAD)

### 3.1 Upload File

```http
POST /api/proposals/:proposalId/attachments
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
file: [binary]
```

**Query Parameters:**
- `uploadDir` (optional, default: /app/uploads) - Directory to save file
- `maxFileSize` (optional, default: 5242880) - Max file size in bytes (5MB)
- `maxTotalSize` (optional, default: 52428800) - Max total size in bytes (50MB)
- `uploadTimeout` (optional, default: 30000) - Upload timeout in ms

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "attachment-uuid",
    "proposalId": "proposal-uuid",
    "fileName": "uuid-document.pdf",
    "originalFileName": "document.pdf",
    "fileUrl": "/uploads/uuid-document.pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "uploadedBy": "user-uuid",
    "uploadedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** GIANG_VIEN (owner only), state DRAFT only

**Error (400) - File too large:**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File quá 5MB. Vui lòng nén hoặc chia nhỏ."
  }
}
```

**Error (400) - Invalid file type:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Định dạng file không được hỗ trợ."
  }
}
```

**Supported MIME Types:**
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `image/jpeg`
- `image/png`

### 3.2 List Attachments

```http
GET /api/proposals/:proposalId/attachments
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "attachment-uuid-1",
      "proposalId": "proposal-uuid",
      "fileName": "uuid-document.pdf",
      "originalFileName": "document.pdf",
      "fileUrl": "/uploads/uuid-document.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "uploadedBy": "user-uuid",
      "uploadedAt": "2026-01-11T00:00:00.000Z",
      "uploadedByUser": {
        "id": "user-uuid",
        "displayName": "Nguyễn Văn A"
      }
    }
  ],
  "totalSize": 3145728,
  "totalFiles": 3
}
```

### 3.3 Replace File

```http
PUT /api/proposals/:proposalId/attachments/:attachmentId
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
file: [binary]
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "attachment-uuid",
    "proposalId": "proposal-uuid",
    "fileName": "uuid-new-document.pdf",
    "originalFileName": "new-document.pdf",
    "fileUrl": "/uploads/uuid-new-document.pdf",
    "fileSize": 2097152,
    "mimeType": "application/pdf",
    "uploadedBy": "user-uuid",
    "uploadedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** GIANG_VIEN (owner only), state DRAFT only

### 3.4 Delete File (Soft Delete)

```http
DELETE /api/proposals/:proposalId/attachments/:attachmentId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "attachment-uuid",
    "deletedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** GIANG_VIEN (owner only), state DRAFT only

---

## 4. PDF EXPORT

### 4.1 Generate Proposal PDF

```http
GET /api/proposals/:id/pdf
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="DT2026001-Proposal.pdf"

[Binary PDF Data]
```

**Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "PROPOSAL_NOT_FOUND",
    "message": "Đề tài không tồn tại"
  }
}
```

### 4.2 Generate Revision PDF

```http
GET /api/proposals/:id/revision-pdf
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="DT2026001-Revision-Request.pdf"

[Binary PDF Data]
```

**Note:** Chỉ dùng khi proposal ở state CHANGES_REQUESTED

### 4.3 Generate Evaluation PDF

```http
GET /api/proposals/:id/evaluation-pdf
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="DT2026001-Evaluation.pdf"

[Binary PDF Data]
```

**Permission:** THU_KY_HOI_DONG, PHONG_KHCN, ADMIN

### 4.4 Export Proposal (GIANG_VIEN)

```http
GET /api/proposals/:id/export?mode=summary&includeEvaluation=true
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `mode` (optional, default: summary) - `summary` | `full` | `with_evaluation`
  - `summary`: PDF tóm tắt
  - `full`: PDF đầy đủ
  - `with_evaluation`: PDF đầy đủ + kết quả đánh giá
- `includeEvaluation` (optional, default: false) - Include evaluation results

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="DT2026001-Proposal.pdf"

[Binary PDF Data]
```

**Permission:** GIANG_VIEN (owner only)

---

## 5. EVALUATIONS

### 5.1 Get or Create Evaluation

```http
GET /api/evaluations/:proposalId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "evaluation-uuid",
    "proposalId": "proposal-uuid",
    "state": "DRAFT",
    "formData": {
      "criteria1": 8,
      "criteria2": 7,
      "criteria3": 9,
      "comment": "Đề tài tốt"
    },
    "evaluatorId": "secretary-uuid",
    "evaluator": {
      "id": "secretary-uuid",
      "displayName": "Thư ký Hội đồng",
      "email": "secretary@example.com"
    },
    "proposal": {
      "id": "proposal-uuid",
      "code": "DT2026001",
      "title": "Nghiên cứu AI trong y học"
    },
    "createdAt": "2026-01-11T00:00:00.000Z",
    "updatedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Note:** Nếu chưa có evaluation, hệ thống tự động tạo evaluation ở state DRAFT

**Permission:** THU_KY_HOI_DONG (evaluator only)

### 5.2 Update Evaluation

```http
PATCH /api/evaluations/:proposalId
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "formData": {
    "criteria1": 9,
    "criteria2": 8,
    "criteria3": 9,
    "comment": "Đề tài xuất sắc"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "evaluation-uuid",
    "proposalId": "proposal-uuid",
    "state": "DRAFT",
    "formData": { ... },
    "updatedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** THU_KY_HOI_DONG (evaluator only), state DRAFT only

### 5.3 Submit Evaluation

```http
POST /api/evaluations/:proposalId/submit
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "idempotencyKey": "unique-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "evaluationId": "evaluation-uuid",
    "proposalId": "proposal-uuid",
    "fromState": "DRAFT",
    "toState": "FINALIZED",
    "proposalFromState": "OUTLINE_COUNCIL_REVIEW",
    "proposalToState": "APPROVED",
    "finalizedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** THU_KY_HOI_DONG (evaluator only)

**Side Effect:** Tự động chuyển proposal từ OUTLINE_COUNCIL_REVIEW → APPROVED

### 5.4 Get Evaluation Results

```http
GET /api/evaluations/:proposalId/results
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "evaluation": {
      "id": "evaluation-uuid",
      "proposalId": "proposal-uuid",
      "state": "FINALIZED",
      "formData": { ... },
      "finalizedAt": "2026-01-11T00:00:00.000Z"
    },
    "proposal": {
      "id": "proposal-uuid",
      "code": "DT2026001",
      "title": "Nghiên cứu AI trong y học",
      "state": "APPROVED"
    },
    "evaluator": {
      "displayName": "Thư ký Hội đồng"
    },
    "council": {
      "id": "council-uuid",
      "name": "Hội đồng Khoa học"
    }
  }
}
```

**Permission:** GIANG_VIEN (proposal owner only)

---

## 6. WORKFLOW LOGS & QUEUE

### 6.1 Get Workflow Logs

```http
GET /api/workflow/workflow-logs/:proposalId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `limit` (optional, default: 50) - Số log trả về

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid-1",
      "proposalId": "proposal-uuid",
      "action": "CREATE",
      "fromState": null,
      "toState": "DRAFT",
      "actorId": "user-uuid",
      "actorName": "Nguyễn Văn A",
      "actorRole": "GIANG_VIEN",
      "comment": null,
      "returnTargetState": null,
      "returnSections": null,
      "timestamp": "2026-01-10T00:00:00.000Z"
    },
    {
      "id": "log-uuid-2",
      "proposalId": "proposal-uuid",
      "action": "SUBMIT",
      "fromState": "DRAFT",
      "toState": "FACULTY_REVIEW",
      "actorId": "user-uuid",
      "actorName": "Nguyễn Văn A",
      "actorRole": "GIANG_VIEN",
      "comment": null,
      "timestamp": "2026-01-11T00:00:00.000Z"
    },
    {
      "id": "log-uuid-3",
      "proposalId": "proposal-uuid",
      "action": "APPROVE_FACULTY",
      "fromState": "FACULTY_REVIEW",
      "toState": "SCHOOL_SELECTION_REVIEW",
      "actorId": "reviewer-uuid",
      "actorName": "Trần Văn B",
      "actorRole": "QUAN_LY_KHOA",
      "comment": "Đề tài tốt, cho phép duyệt",
      "timestamp": "2026-01-11T01:00:00.000Z"
    }
  ]
}
```

### 6.2 Get Queue

```http
GET /api/workflow/queue?filter=my-queue
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `filter` (required) - `my-queue` | `my-proposals` | `all` | `overdue` | `upcoming`
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Filter Descriptions:**
- `my-queue`: Các đề tài đang chờ user duyệt (holder_user = current user)
- `my-proposals`: Các đề tài của user (owner_id = current user)
- `all`: Tất cả đề tài
- `overdue`: Các đề tài quá hạn SLA
- `upcoming`: Các đề tài sắp quá hạn SLA (trong 3 ngày tới)

**Response (200) - filter: my-queue:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "proposal-uuid",
        "code": "DT2026002",
        "title": "Nghiên cứu Blockchain",
        "state": "FACULTY_REVIEW",
        "owner": {
          "id": "owner-uuid",
          "displayName": "Lê Văn C",
          "email": "lecan@example.com"
        },
        "holderUnit": "faculty-uuid",
        "holderUser": "current-user-uuid",
        "slaDeadline": "2026-01-15T17:00:00.000Z",
        "daysUntilDeadline": 4,
        "isOverdue": false,
        "createdAt": "2026-01-10T00:00:00.000Z"
      }
    ],
    "meta": {
      "total": 12,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

## 7. COUNCILS

### 7.1 List Councils

```http
GET /api/councils?type=OUTLINE
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `type` (optional) - Filter theo loại hội đồng
  - `OUTLINE` - Hội đồng xét duyệt đề cương
  - `ACCEPTANCE` - Hội đồng nghiệm thu
  - `EXTENSION` - Hội đồng gia hạn

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "council-uuid",
      "name": "Hội đồng Khoa học",
      "type": "OUTLINE",
      "description": "Hội đồng xét duyệt đề cương cấp Khoa",
      "isActive": true,
      "members": [
        {
          "id": "member-uuid-1",
          "userId": "user-uuid-1",
          "role": "CHAIR",
          "user": {
            "displayName": "PGS. TS. Nguyễn Văn X",
            "email": "nguyenx@example.com"
          }
        },
        {
          "id": "member-uuid-2",
          "userId": "user-uuid-2",
          "role": "SECRETARY",
          "user": {
            "displayName": "ThS. Trần Văn Y",
            "email": "trany@example.com"
          }
        },
        {
          "id": "member-uuid-3",
          "userId": "user-uuid-3",
          "role": "MEMBER",
          "user": {
            "displayName": "TS. Lê Văn Z",
            "email": "lez@example.com"
          }
        }
      ]
    }
  ]
}
```

### 7.2 List Available Members

```http
GET /api/councils/members
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "displayName": "PGS. TS. Nguyễn Văn X",
      "email": "nguyenx@example.com",
      "role": "HOI_DONG",
      "faculty": {
        "id": "faculty-uuid",
        "name": "Khoa CNTT"
      }
    }
  ]
}
```

**Permission:** User có role HOI_DONG hoặc THANH_TRUNG

### 7.3 Get Council Detail

```http
GET /api/councils/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "council-uuid",
    "name": "Hội đồng Khoa học",
    "type": "OUTLINE",
    "description": "Hội đồng xét duyệt đề cương cấp Khoa",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "members": [ ... ]
  }
}
```

---

## 8. USERS

### 8.1 List Users

```http
GET /api/users?page=1&limit=20&role=GIANG_VIEN&facultyId=faculty-uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `role` (optional) - Filter theo role
- `facultyId` (optional) - Filter theo khoa
- `search` (optional) - Tìm kiếm theo name/email

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user-uuid",
        "email": "giangvien@example.com",
        "displayName": "Nguyễn Văn A",
        "role": "GIANG_VIEN",
        "facultyId": "faculty-uuid",
        "isActive": true,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "faculty": {
          "id": "faculty-uuid",
          "name": "Khoa CNTT",
          "code": "CNTT"
        }
      }
    ],
    "meta": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

**Permission:** ADMIN, PHONG_KHCN

### 8.2 Create User

```http
POST /api/users
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "displayName": "Nguyễn Văn B",
  "role": "GIANG_VIEN",
  "facultyId": "faculty-uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-user-uuid",
    "email": "newuser@example.com",
    "displayName": "Nguyễn Văn B",
    "role": "GIANG_VIEN",
    "facultyId": "faculty-uuid",
    "isActive": true,
    "createdAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** ADMIN only

### 8.3 Get User Detail

```http
GET /api/users/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "giangvien@example.com",
    "displayName": "Nguyễn Văn A",
    "role": "GIANG_VIEN",
    "facultyId": "faculty-uuid",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-11T00:00:00.000Z",
    "faculty": {
      "id": "faculty-uuid",
      "name": "Khoa CNTT",
      "code": "CNTT"
    },
    "permissions": ["PROPOSAL_CREATE", "PROPOSAL_EDIT", "EXPORT_PROPOSAL_PDF"]
  }
}
```

### 8.4 Update User

```http
PATCH /api/users/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "displayName": "Nguyễn Văn A (Updated)",
  "role": "QUAN_LY_KHOA",
  "facultyId": "another-faculty-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "giangvien@example.com",
    "displayName": "Nguyễn Văn A (Updated)",
    "role": "QUAN_LY_KHOA",
    "facultyId": "another-faculty-uuid",
    "updatedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** ADMIN only

### 8.5 Delete User (Soft Delete)

```http
DELETE /api/users/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "deletedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** ADMIN only

---

## 9. DASHBOARD

### 9.1 Get PKHCN/ADMIN Dashboard

```http
GET /api/dashboard
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalProposals": 456,
      "draft": 23,
      "inReview": 67,
      "approved": 156,
      "inProgress": 89,
      "completed": 98,
      "overdue": 23
    },
    "byState": {
      "DRAFT": 23,
      "FACULTY_REVIEW": 15,
      "SCHOOL_SELECTION_REVIEW": 8,
      "OUTLINE_COUNCIL_REVIEW": 12,
      "CHANGES_REQUESTED": 32,
      "APPROVED": 45,
      "IN_PROGRESS": 89,
      "FACULTY_ACCEPTANCE_REVIEW": 11,
      "SCHOOL_ACCEPTANCE_REVIEW": 7,
      "HANDOVER": 5,
      "COMPLETED": 98,
      "CANCELLED": 34,
      "REJECTED": 56,
      "WITHDRAWN": 12,
      "PAUSED": 9
    },
    "byFaculty": [
      {
        "facultyId": "faculty-uuid",
        "facultyName": "Khoa CNTT",
        "total": 89,
        "completed": 23,
        "inProgress": 34,
        "overdue": 8
      }
    ],
    "overdueList": [
      {
        "id": "proposal-uuid",
        "code": "DT2026005",
        "title": "Nghiên cứu AI trong y học",
        "state": "FACULTY_REVIEW",
        "ownerName": "Nguyễn Văn A",
        "facultyName": "Khoa CNTT",
        "holderName": "Trần Văn B",
        "slaDeadline": "2026-01-05T17:00:00.000Z",
        "daysOverdue": 6
      }
    ]
  }
}
```

**Permission:** PHONG_KHCN, ADMIN

### 9.2 Remind Overdue

```http
POST /api/dashboard/remind-overdue
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "proposalIds": ["proposal-uuid-1", "proposal-uuid-2"],
  "message": "Nhắc nhở: Đề tài của bạn đã quá hạn SLA"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sent": 2,
    "failed": 0,
    "results": [
      {
        "proposalId": "proposal-uuid-1",
        "email": "owner@example.com",
        "status": "sent"
      },
      {
        "proposalId": "proposal-uuid-2",
        "email": "owner2@example.com",
        "status": "sent"
      }
    ]
  }
}
```

**Permission:** PHONG_KHCN, ADMIN

### 9.3 Get Researcher Dashboard (GIANG_VIEN)

```http
GET /api/dashboard/researcher
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "myProposals": {
      "total": 12,
      "draft": 2,
      "inReview": 3,
      "approved": 4,
      "inProgress": 2,
      "changesRequested": 1,
      "completed": 0
    },
    "myQueue": [],
    "recentActivity": [
      {
        "proposalId": "proposal-uuid",
        "proposalCode": "DT2026001",
        "action": "SUBMIT",
        "timestamp": "2026-01-10T00:00:00.000Z",
        "actorName": "Nguyễn Văn A",
        "comment": null
      }
    ],
    "upcomingDeadlines": [
      {
        "proposalId": "proposal-uuid",
        "proposalCode": "DT2026001",
        "proposalTitle": "Nghiên cứu AI",
        "state": "IN_PROGRESS",
        "deadline": "2026-03-15T17:00:00.000Z",
        "daysUntilDeadline": 63
      }
    ]
  }
}
```

**Permission:** GIANG_VIEN

### 9.4 Get System Health (ADMIN)

```http
GET /api/dashboard/health
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "database": {
      "status": "healthy",
      "latency": "5ms"
    },
    "redis": {
      "status": "healthy",
      "latency": "2ms"
    },
    "totalUsers": 150,
    "totalProposals": 456,
    "activeSessions": 23
  }
}
```

**Permission:** ADMIN only

---

## 10. DOCUMENT TEMPLATES

### 10.1 List Templates

```http
GET /api/form-templates
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `type` (optional) - Filter theo loại
- `isActive` (optional, default: true) - Chỉ lấy template đang active

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "template-uuid",
      "name": "Mẫu đề cương chuẩn",
      "type": "PROPOSAL_OUTLINE",
      "description": "Mẫu đề cương đề tài cấp ĐH",
      "version": "2.0",
      "isActive": true,
      "sections": [
        {
          "id": "section-uuid",
          "sectionId": "SEC_INFO_GENERAL",
          "name": "Thông tin chung",
          "order": 1,
          "isRequired": true
        }
      ],
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Permission:** ADMIN, PHONG_KHCN

### 10.2 Get Active Template by Type

```http
GET /api/form-templates/active/:type
Authorization: Bearer YOUR_JWT_TOKEN
```

**URL Parameters:**
- `type` - `PROPOSAL_OUTLINE` | `EVALUATION_FORM` | `FINAL_REPORT` | `FACULTY_ACCEPTANCE` | `SCHOOL_ACCEPTANCE` | `HANDOVER_CHECKLIST`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "template-uuid",
    "name": "Mẫu đề cương chuẩn",
    "type": "PROPOSAL_OUTLINE",
    "sections": [ ... ]
  }
}
```

### 10.3 Get Template Detail

```http
GET /api/form-templates/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "template-uuid",
    "name": "Mẫu đề cương chuẩn",
    "type": "PROPOSAL_OUTLINE",
    "description": "Mẫu đề cương đề tài cấp ĐH",
    "version": "2.0",
    "isActive": true,
    "sections": [
      {
        "id": "section-uuid",
        "sectionId": "SEC_INFO_GENERAL",
        "name": "Thông tin chung",
        "description": "Thông tin về đề tài",
        "order": 1,
        "isRequired": true,
        "schema": {
          "type": "object",
          "properties": {
            "researchField": { "type": "string" },
            "duration": { "type": "number" }
          }
        }
      }
    ]
  }
}
```

---

## 11. DOCUMENTS (DOCX GENERATION)

### 11.1 Generate Document from Template

```http
POST /documents/proposals/:proposalId/generate
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "templateType": "PROPOSAL_OUTLINE"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "document-uuid",
    "proposalId": "proposal-uuid",
    "templateId": "template-uuid",
    "templateType": "PROPOSAL_OUTLINE",
    "fileUrl": "/documents/uuid-document.docx",
    "sha256": "abc123def456...",
    "createdAt": "2026-01-11T00:00:00.000Z",
    "downloadUrl": "/api/documents/document-uuid/download"
  }
}
```

### 11.2 Download Document

```http
GET /documents/:id/download
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="DT2026001-Proposal.docx"

[Binary DOCX Data]
```

### 11.3 Verify Document Integrity

```http
POST /documents/:id/verify
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documentId": "document-uuid",
    "isValid": true,
    "currentSha256": "abc123def456...",
    "storedSha256": "abc123def456...",
    "verifiedAt": "2026-01-11T00:00:00.000Z"
  }
}
```

**Permission:** ADMIN only

---

## 12. AUDIT LOGS

### 12.1 List Audit Logs

```http
GET /api/audit?entityType=PROPOSAL&entityId=proposal-uuid&action=SUBMIT
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `entityType` (optional) - Filter theo loại entity (PROPOSAL, USER, COUNCIL, etc.)
- `entityId` (optional) - Filter theo ID của entity
- `action` (optional) - Filter theo action
- `actorId` (optional) - Filter theo người thực hiện
- `fromDate` (optional) - Filter từ ngày (ISO 8601)
- `toDate` (optional) - Filter đến ngày (ISO 8601)
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "audit-uuid",
        "action": "AUDIT_ACTION",
        "actorUserId": "user-uuid",
        "actorName": "Nguyễn Văn A",
        "actorRole": "GIANG_VIEN",
        "entityType": "PROPOSAL",
        "entityId": "proposal-uuid",
        "changes": {
          "before": { "state": "DRAFT" },
          "after": { "state": "FACULTY_REVIEW" }
        },
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2026-01-11T00:00:00.000Z"
      }
    ],
    "meta": {
      "total": 1234,
      "page": 1,
      "limit": 50,
      "totalPages": 25
    }
  }
}
```

### 12.2 Get Entity Audit Timeline

```http
GET /api/audit/timeline?entityType=PROPOSAL&entityId=proposal-uuid
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-uuid",
      "action": "SUBMIT",
      "actorName": "Nguyễn Văn A",
      "timestamp": "2026-01-11T00:00:00.000Z",
      "changes": {
        "before": { "state": "DRAFT" },
        "after": { "state": "FACULTY_REVIEW" }
      }
    },
    {
      "id": "audit-uuid-2",
      "action": "APPROVE_FACULTY",
      "actorName": "Trần Văn B",
      "timestamp": "2026-01-11T01:00:00.000Z",
      "changes": {
        "before": { "state": "FACULTY_REVIEW" },
        "after": { "state": "SCHOOL_SELECTION_REVIEW" }
      }
    }
  ]
}
```

---

## 13. DEMO (Testing Only)

### 13.1 Get Demo Config

```http
GET /api/demo/config
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "availablePersonas": [
      {
        "role": "GIANG_VIEN",
        "name": "Giảng viên",
        "description": "Chủ nhiệm đề tài"
      },
      {
        "role": "QUAN_LY_KHOA",
        "name": "Quản lý Khoa",
        "description": "Duyệt đề tài cấp Khoa"
      },
      {
        "role": "PHONG_KHCN",
        "name": "Phòng KHCN",
        "description": "Quản lý đề tài cấp Trường"
      }
    ],
    "currentPersona": {
      "role": "GIANG_VIEN",
      "userId": "demo-user-uuid"
    }
  }
}
```

### 13.2 Switch Persona

```http
POST /api/demo/switch-persona
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "QUAN_LY_KHOA",
  "facultyId": "faculty-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-token-for-quan_ly_khoa",
    "refreshToken": "new-refresh-token",
    "user": {
      "id": "demo-user-uuid",
      "email": "quanly.khoa@example.com",
      "displayName": "Demo Quản lý Khoa",
      "role": "QUAN_LY_KHOA",
      "facultyId": "faculty-uuid"
    }
  }
}
```

### 13.3 Reset Demo Data

```http
POST /api/demo/reset
Content-Type: application/json
```

**Request Body:**
```json
{
  "confirm": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Đã reset dữ liệu demo"
  }
}
```

---

## 📊 DATA MODELS

### Proposal Model

```typescript
interface Proposal {
  id: string;
  code: string;
  title: string;
  state: ProjectState;
  formData: Record<string, any>;
  holderUnit: string | null;  // Unit đang xử lý (facultyId, councilId, "PHONG_KHCN", etc.)
  holderUser: string | null;  // User đang xử lý
  slaDeadline: Date | null;
  ownerId: string;
  facultyId: string;
  templateId: string | null;
  councilId: string | null;

  // Acceptance data
  facultyAcceptanceData?: {
    results: string;
    products: string;
    attachmentIds: string[];
    submittedAt: Date;
  };

  schoolAcceptanceData?: {
    results: string;
    products: string;
    attachmentIds: string[];
    submittedAt: Date;
  };

  handoverChecklist?: {
    documents: boolean;
    products: boolean;
    budgetSettlement: boolean;
    notes: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Canceled/Withdrawn/Rejected/Paused
  canceledAt: Date | null;
  withdrawnAt: Date | null;
  rejectedAt: Date | null;
  rejectedById: string | null;
  pausedAt: Date | null;
  prePauseState: ProjectState | null;
  prePauseHolderUnit: string | null;
  prePauseHolderUser: string | null;

  // Relations
  owner: User;
  faculty: Faculty;
  template: FormTemplate | null;
  council: Council | null;
  attachments: Attachment[];
  workflowLogs: WorkflowLog[];
}
```

### User Model

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  facultyId: string | null;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Relations
  faculty: Faculty | null;
  ownedProposals: Proposal[];
  councilMemberships: CouncilMember[];
}
```

### WorkflowLog Model

```typescript
interface WorkflowLog {
  id: string;
  proposalId: string;
  action: WorkflowAction;
  fromState: ProjectState | null;
  toState: ProjectState;
  actorId: string;
  actorName: string;
  actorRole: string;
  comment: string | null;

  // Return data
  returnTargetState: ProjectState | null;
  returnSections: string[] | null;
  returnReason: string | null;

  timestamp: Date;

  // Relations
  proposal: Proposal;
}
```

### Evaluation Model

```typescript
interface Evaluation {
  id: string;
  proposalId: string;
  state: EvaluationState; // DRAFT | FINALIZED
  formData: Record<string, any>;
  evaluatorId: string;

  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  proposal: Proposal;
  evaluator: User;
}
```

### Attachment Model

```typescript
interface Attachment {
  id: string;
  proposalId: string;
  fileName: string;  // Unique filename with UUID prefix
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;

  uploadedAt: Date;
  deletedAt: Date | null;

  // Relations
  proposal: Proposal;
  uploader: User;
}
```

---

## ❌ ERROR CODES

| Error Code | HTTP Status | Description |
|------------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |
| `INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu không đúng |
| `UNAUTHORIZED` | 401 | Chưa đăng nhập hoặc token hết hạn |
| `FORBIDDEN` | 403 | Không có quyền thực hiện hành động |
| `PROPOSAL_NOT_FOUND` | 404 | Đề tài không tồn tại |
| `USER_NOT_FOUND` | 404 | User không tồn tại |
| `INVALID_STATE_TRANSITION` | 400 | Không thể chuyển state như yêu cầu |
| `PROPOSAL_NOT_DRAFT` | 400 | Đề tài không ở trạng thái NHÁP |
| `FILE_TOO_LARGE` | 400 | File quá lớn (max 5MB) |
| `TOTAL_SIZE_EXCEEDED` | 400 | Tổng dung lượng quá lớn (max 50MB) |
| `INVALID_FILE_TYPE` | 400 | Định dạng file không được hỗ trợ |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Thiếu idempotency key |
| `IDEMPOTENCY_KEY_ALREADY_USED` | 409 | Idempotency key đã được sử dụng |
| `DUPLICATE_PROPOSAL_CODE` | 400 | Mã đề tài đã tồn tại |
| `COMPLETED` | 400 | Cannot modify completed proposal |

---

## 🔑 PERMISSIONS

### Permission Matrix

| Action | GIANG_VIEN | QUAN_LY_KHOA | THU_KY_KHOA | PHONG_KHCN | THU_KY_HOI_DONG | THANH_TRUNG | BGH | ADMIN |
|--------|-----------|-------------|-------------|------------|-----------------|------------|-----|-------|
| **Create Proposal** | ✅ (self) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Edit Proposal (DRAFT)** | ✅ (owner only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Delete Proposal (DRAFT)** | ✅ (owner only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Submit Proposal** | ✅ (owner only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Approve Faculty** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Return Faculty** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Approve Council** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Return Council** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Assign Council** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Start Project** | ✅ (owner only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Submit Acceptance** | ✅ (owner only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Faculty Accept Decision** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **School Accept Decision** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Complete Handover** | ✅ (owner only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Cancel Proposal** | ✅ (owner only, DRAFT) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Withdraw Proposal** | ✅ (owner only, before APPROVED) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reject Proposal** | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pause Proposal** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Resume Proposal** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Upload Attachment** | ✅ (owner only, DRAFT) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Delete Attachment** | ✅ (owner only, DRAFT) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Export PDF (All)** | ✅ (owner only) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Export Evaluation PDF** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Create Evaluation** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Update Evaluation** | ❌ | ❌ | ❌ | ❌ | ✅ (own only, DRAFT) | ❌ | ❌ | ✅ |
| **Submit Evaluation** | ❌ | ❌ | ❌ | ❌ | ✅ (own only) | ❌ | ❌ | ✅ |
| **View Evaluation Results** | ✅ (owner only) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Manage Users** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Manage Templates** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **View Dashboard** | ✅ (personal only) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **View Audit Logs** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## 🎨 FRONTEND INTEGRATION GUIDE

### Authentication Flow

```typescript
// 1. Login
const login = async (email: string, password: string) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const { data } = await response.json();

  // Save tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data.user;
};

// 2. Create API client with auth
const apiClient = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`http://localhost:3000${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  // Handle 401 - refresh token
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetch(`http://localhost:3000${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
          ...options.headers
        }
      });
    }
  }

  return response;
};
```

### Proposal List with Filters

```typescript
interface ProposalListParams {
  page?: number;
  limit?: number;
  state?: ProjectState;
  facultyId?: string;
  search?: string;
}

const fetchProposals = async (params: ProposalListParams) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.state) queryParams.set('state', params.state);
  if (params.facultyId) queryParams.set('facultyId', params.facultyId);
  if (params.search) queryParams.set('search', params.search);

  const response = await apiClient(`/api/proposals?${queryParams}`);
  const { data } = await response.json();

  return data;
};
```

### Create Proposal

```typescript
interface CreateProposalDto {
  code: string;
  title: string;
  facultyId: string;
  templateId: string;
  formData: Record<string, any>;
  attachmentIds?: string[];
}

const createProposal = async (proposal: CreateProposalDto) => {
  const response = await apiClient('/api/proposals', {
    method: 'POST',
    body: JSON.stringify(proposal)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const { data } = await response.json();
  return data;
};
```

### Submit Proposal

```typescript
const submitProposal = async (proposalId: string) => {
  const idempotencyKey = crypto.randomUUID();

  const response = await apiClient(`/api/workflow/${proposalId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey })
  });

  const { data } = await response.json();
  return data;
};
```

### Upload Attachment

```typescript
const uploadAttachment = async (proposalId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient(`/api/proposals/${proposalId}/attachments`, {
    method: 'POST',
    headers: {
      // Don't set Content-Type for FormData - browser will set it with boundary
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const { data } = await response.json();
  return data;
};
```

### Download PDF

```typescript
const downloadProposalPdf = async (proposalId: string, filename: string) => {
  const response = await apiClient(`/api/proposals/${proposalId}/pdf`);

  if (!response.ok) {
    throw new Error('Failed to download PDF');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
```

### Workflow State Machine Hook

```typescript
import { useState, useCallback } from 'react';

interface WorkflowTransitionOptions {
  idempotencyKey?: string;
  comment?: string;
  returnTargetState?: ProjectState;
  returnSections?: string[];
  returnReason?: string;
  reason?: string;
  expectedResumeAt?: string;
  decision?: 'DAT' | 'KHONG_DAT';
}

const useWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transition = useCallback(async (
    proposalId: string,
    action: string,
    options: WorkflowTransitionOptions = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = options.idempotencyKey || crypto.randomUUID();

      const response = await apiClient(`/api/workflow/${proposalId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ idempotencyKey, ...options })
      });

      if (!response.ok) {
        const { error: err } = await response.json();
        throw new Error(err.message);
      }

      const { data } = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    submit: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'submit', opts),
    approveFaculty: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'approve-faculty', opts),
    returnFaculty: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'return-faculty', opts),
    resubmit: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'resubmit', opts),
    approveCouncil: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'approve-council', opts),
    returnCouncil: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'return-council', opts),
    assignCouncil: (id: string, opts: WorkflowTransitionOptions) =>
      transition(id, 'assign-council', opts),
    startProject: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'start', opts),
    cancel: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'cancel', opts),
    withdraw: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'withdraw', opts),
    reject: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'reject', opts),
    pause: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'pause', opts),
    resume: (id: string, opts?: WorkflowTransitionOptions) =>
      transition(id, 'resume', opts)
  };
};
```

### Real-time Updates with WebSocket

```typescript
const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      // Handle different message types
      switch (message.type) {
        case 'PROPOSAL_UPDATED':
          // Refresh proposal list
          break;
        case 'NEW_NOTIFICATION':
          // Show notification
          break;
        case 'WORKFLOW_TRANSITION':
          // Update proposal state
          break;
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  return { socket, connected };
};
```

---

## 📝 SUMMARY

This API specification provides complete documentation for building a frontend for the Vietnamese research proposal management system.

**Key Points:**
- 90+ API endpoints across 13 modules
- JWT authentication with refresh tokens
- Role-based access control (8 roles)
- 15-state workflow with full audit trail
- PDF generation, file uploads, evaluations
- Real-time updates via WebSocket
- Comprehensive error handling

**For frontend development:**
1. Use the authentication flow to manage tokens
2. Follow the state machine for workflow transitions
3. Implement proper permission checks based on user role
4. Handle idempotency for all state-changing operations
5. Use the provided TypeScript interfaces for type safety

**Next Steps:**
- Import this spec into tools like Postman, Insomnia, or Swagger
- Set up authentication first, then implement proposal CRUD
- Add workflow transitions following the state diagram
- Implement file uploads and PDF downloads
- Add real-time updates with WebSocket

---

**Generated:** 2026-01-11
**Backend Version:** Based on current codebase
**Contact:** For questions, refer to the source code in `/mnt/dulieu/DoAn/qlnckh/apps/src`
