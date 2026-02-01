# Kịch Bản: Đánh Giá Hội Đồng Cấp Khoa

## 1. Tổng Quan

### 1.1 Mục tiêu
Áp dụng cơ chế đánh giá chi tiết của hội đồng cấp Trường cho cấp Khoa, với các ràng buộc:
- Hội đồng khoa chỉ chứa giảng viên **cùng khoa**
- Trưởng khoa (QUAN_LY_KHOA) hoặc Thư ký khoa (THU_KY_KHOA) tạo và quản lý hội đồng
- Mỗi thành viên hội đồng đánh giá độc lập
- Thư ký hội đồng tổng hợp kết quả

### 1.2 So sánh với cấp Trường

| Tiêu chí | Cấp Khoa | Cấp Trường |
|----------|----------|------------|
| **Trạng thái** | `FACULTY_COUNCIL_OUTLINE_REVIEW` | `SCHOOL_COUNCIL_OUTLINE_REVIEW` |
| **Ai tạo hội đồng** | QUAN_LY_KHOA, THU_KY_KHOA | PHONG_KHCN |
| **Thành viên HĐ** | Giảng viên **cùng khoa** | Giảng viên **toàn trường** |
| **Ai là thư ký** | Giảng viên trong khoa | Bất kỳ |
| **Form đánh giá** | Giống cấp Trường | Form hiện tại |

---

## 2. Luồng Nghiệp Vụ Chi Tiết

### 2.1 Sơ đồ luồng

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                LUỒNG ĐÁNH GIÁ HỘI ĐỒNG CẤP KHOA                            │
└─────────────────────────────────────────────────────────────────────────────┘

  GIANG_VIEN          QUAN_LY_KHOA/THU_KY          THÀNH VIÊN HĐ KHOA
       │                      │                           │
       │ 1. SUBMIT            │                           │
       ▼                      │                           │
  ┌─────────┐                 │                           │
  │  DRAFT  │                 │                           │
  └────┬────┘                 │                           │
       │                      │                           │
       ▼                      │                           │
  ┌──────────────────────────────────────┐                │
  │  FACULTY_COUNCIL_OUTLINE_REVIEW      │                │
  │  holderUnit: facultyId               │                │
  │  holderUser: null                    │                │
  │  councilId: null (chưa có HĐ)        │                │
  └──────────────────┬───────────────────┘                │
                     │                                    │
                     │ 2. Xem đề tài cần xét              │
                     │ 3. Tạo/Chọn hội đồng khoa          │
                     │ 4. ASSIGN_COUNCIL                  │
                     ▼                                    │
  ┌──────────────────────────────────────┐                │
  │  FACULTY_COUNCIL_OUTLINE_REVIEW      │                │
  │  holderUnit: facultyCouncilId        │◄───────────────┤
  │  holderUser: secretaryId             │                │
  │  councilId: facultyCouncilId         │                │
  └──────────────────┬───────────────────┘                │
                     │                                    │
                     │                    5. Các thành viên đánh giá
                     │                       (DRAFT → SUBMITTED)
                     │                                    │
                     │                                    ▼
                     │                    ┌───────────────────────────┐
                     │                    │  Evaluation per member:   │
                     │                    │  - score_1 (1-5)          │
                     │                    │  - score_2 (1-5)          │
                     │                    │  - comments               │
                     │                    │  - conclusion: ĐẠT/K.ĐẠT  │
                     │                    └───────────────────────────┘
                     │                                    │
                     │ 6. Thư ký tổng hợp                 │
                     │    (khi tất cả đã đánh giá)        │
                     ▼                                    │
  ┌──────────────────────────────────────┐                │
  │  Thư ký xem tổng hợp đánh giá        │◄───────────────┘
  │  - Tổng điểm trung bình              │
  │  - Số phiếu ĐẠT / KHÔNG ĐẠT          │
  │  - Nhận xét từng thành viên          │
  └──────────────────┬───────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
      APPROVE     RETURN      REJECT
         │           │           │
         ▼           ▼           ▼
  ┌──────────┐ ┌───────────┐ ┌────────┐
  │ SCHOOL_  │ │ CHANGES_  │ │REJECTED│
  │ COUNCIL  │ │ REQUESTED │ └────────┘
  └──────────┘ └───────────┘
```

---

### 2.2 Các bước chi tiết

#### Bước 1: Giảng viên nộp đề tài
- Giảng viên SUBMIT đề tài từ DRAFT
- Trạng thái chuyển sang `FACULTY_COUNCIL_OUTLINE_REVIEW`
- `holderUnit = facultyId` (khoa của giảng viên)
- `councilId = null` (chưa có hội đồng)

#### Bước 2: Trưởng khoa xem danh sách đề tài cần xét
- Trưởng khoa truy cập queue "Đang chờ tôi"
- Thấy các đề tài ở trạng thái `FACULTY_COUNCIL_OUTLINE_REVIEW`
- Filter: `holderUnit = userFacultyId AND state = FACULTY_COUNCIL_OUTLINE_REVIEW`

#### Bước 3: Tạo hoặc chọn hội đồng khoa
- **Tạo mới**: Chọn giảng viên trong khoa làm thành viên
- **Chọn có sẵn**: Chọn hội đồng khoa đã tạo trước đó
- Chỉ định thư ký hội đồng (phải là giảng viên trong khoa)

#### Bước 4: Phân công hội đồng (ASSIGN_COUNCIL)
- Gán `councilId = facultyCouncilId`
- Cập nhật `holderUnit = facultyCouncilId`
- Cập nhật `holderUser = secretaryId`
- Ghi workflow log với action = ASSIGN_COUNCIL

#### Bước 5: Thành viên hội đồng đánh giá
- Mỗi thành viên truy cập form đánh giá
- Điền điểm theo các tiêu chí (1-5)
- Ghi nhận xét
- Chọn kết luận: ĐẠT / KHÔNG ĐẠT
- Submit đánh giá (DRAFT → SUBMITTED)

#### Bước 6: Thư ký tổng hợp và quyết định
- Thư ký xem tổng hợp tất cả đánh giá
- Khi tất cả thành viên đã đánh giá:
  - Nếu đa số ĐẠT → Có thể APPROVE
  - Nếu đa số KHÔNG ĐẠT → RETURN hoặc REJECT

---

## 3. Database Schema Changes

### 3.1 Bảng Council - Thêm scope

```prisma
model Council {
  id          String   @id @default(uuid())
  name        String
  type        CouncilType
  scope       CouncilScope @default(SCHOOL)  // NEW: FACULTY or SCHOOL
  facultyId   String?                         // NEW: Required if scope=FACULTY
  secretaryId String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  faculty     Faculty?  @relation(fields: [facultyId], references: [id])
  secretary   User?     @relation("CouncilSecretary", fields: [secretaryId], references: [id])
  members     CouncilMember[]
  proposals   Proposal[]
}

enum CouncilScope {
  FACULTY   // Hội đồng cấp khoa
  SCHOOL    // Hội đồng cấp trường
}
```

### 3.2 Bảng Evaluation - Thêm level

```prisma
model Evaluation {
  id          String   @id @default(uuid())
  proposalId  String
  evaluatorId String
  level       EvaluationLevel @default(SCHOOL)  // NEW: FACULTY or SCHOOL
  state       EvaluationState @default(DRAFT)
  formData    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  proposal    Proposal @relation(fields: [proposalId], references: [id])
  evaluator   User     @relation(fields: [evaluatorId], references: [id])

  @@unique([proposalId, evaluatorId, level])  // One evaluation per member per level
}

enum EvaluationLevel {
  FACULTY   // Đánh giá cấp khoa
  SCHOOL    // Đánh giá cấp trường
}
```

---

## 4. API Endpoints

### 4.1 Council Management (Faculty Level)

#### POST /api/council/faculty
Tạo hội đồng cấp khoa

```typescript
// Request
{
  "name": "Hội đồng Khoa CNTT - Đợt 1/2026",
  "type": "OUTLINE",
  "secretaryId": "user-uuid-1",
  "memberIds": ["user-uuid-2", "user-uuid-3", "user-uuid-4"]
}

// Response
{
  "success": true,
  "data": {
    "id": "council-uuid",
    "name": "Hội đồng Khoa CNTT - Đợt 1/2026",
    "scope": "FACULTY",
    "facultyId": "faculty-uuid",
    "members": [...]
  }
}
```

**Validation:**
- User phải có role QUAN_LY_KHOA hoặc THU_KY_KHOA
- Tất cả memberIds phải thuộc cùng khoa với user
- secretaryId phải thuộc cùng khoa

#### GET /api/council/faculty
Lấy danh sách hội đồng cấp khoa (của khoa hiện tại)

```typescript
// Response
{
  "councils": [
    {
      "id": "council-uuid",
      "name": "Hội đồng Khoa CNTT - Đợt 1/2026",
      "scope": "FACULTY",
      "facultyId": "faculty-uuid",
      "members": [
        { "id": "...", "displayName": "Nguyễn Văn A", "role": "MEMBER" }
      ]
    }
  ],
  "total": 1
}
```

#### GET /api/council/faculty/eligible-members
Lấy danh sách giảng viên trong khoa có thể làm thành viên HĐ

```typescript
// Response
{
  "members": [
    {
      "id": "user-uuid",
      "displayName": "Nguyễn Văn A",
      "email": "a@example.com",
      "role": "GIANG_VIEN",
      "facultyId": "faculty-uuid"
    }
  ],
  "total": 10
}
```

**Validation:**
- Chỉ trả về users có `facultyId = user.facultyId`
- Chỉ trả về users có role GIANG_VIEN
- Loại trừ chủ nhiệm đề tài đang xét (nếu có proposalId)

---

### 4.2 Council Assignment (Faculty Level)

#### POST /api/workflow/:proposalId/assign-faculty-council
Phân công hội đồng khoa cho đề tài

```typescript
// Request
{
  "councilId": "faculty-council-uuid",
  "secretaryId": "user-uuid",
  "memberIds": ["user-uuid-1", "user-uuid-2"],
  "idempotencyKey": "unique-key"
}

// Response
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "previousState": "FACULTY_COUNCIL_OUTLINE_REVIEW",
    "currentState": "FACULTY_COUNCIL_OUTLINE_REVIEW",
    "councilId": "faculty-council-uuid",
    "holderUnit": "faculty-council-uuid",
    "holderUser": "secretary-uuid"
  }
}
```

**Validation:**
- Proposal phải ở trạng thái `FACULTY_COUNCIL_OUTLINE_REVIEW`
- Council phải có `scope = FACULTY` và `facultyId = proposal.facultyId`
- User phải có role QUAN_LY_KHOA hoặc THU_KY_KHOA
- Chủ nhiệm đề tài **không được** là thành viên hội đồng

---

### 4.3 Evaluation Endpoints (Faculty Level)

#### GET /api/evaluations/faculty/:proposalId
Lấy hoặc tạo đánh giá cấp khoa cho thành viên hội đồng

```typescript
// Response
{
  "success": true,
  "data": {
    "id": "evaluation-uuid",
    "proposalId": "proposal-uuid",
    "evaluatorId": "user-uuid",
    "level": "FACULTY",
    "state": "DRAFT",
    "formData": {
      "score_novelty": null,
      "score_feasibility": null,
      "score_methodology": null,
      "comments": "",
      "conclusion": null
    }
  }
}
```

#### PUT /api/evaluations/faculty/:proposalId
Cập nhật đánh giá cấp khoa

```typescript
// Request
{
  "formData": {
    "score_novelty": 4,
    "score_feasibility": 5,
    "score_methodology": 4,
    "comments": "Đề tài có tính mới, phương pháp phù hợp",
    "conclusion": "DAT"
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "evaluation-uuid",
    "state": "DRAFT",
    "formData": {...}
  }
}
```

#### POST /api/evaluations/faculty/:proposalId/submit
Submit đánh giá (DRAFT → SUBMITTED)

```typescript
// Request
{
  "idempotencyKey": "unique-key"
}

// Response
{
  "success": true,
  "data": {
    "id": "evaluation-uuid",
    "state": "SUBMITTED",
    "submittedAt": "2026-01-30T10:00:00Z"
  }
}
```

#### GET /api/evaluations/faculty/:proposalId/all
Lấy tất cả đánh giá của hội đồng (chỉ thư ký/trưởng khoa)

```typescript
// Response
{
  "success": true,
  "data": {
    "proposalId": "proposal-uuid",
    "councilId": "council-uuid",
    "councilName": "Hội đồng Khoa CNTT - Đợt 1/2026",
    "evaluations": [
      {
        "evaluatorId": "user-1",
        "evaluatorName": "Nguyễn Văn A",
        "state": "SUBMITTED",
        "formData": {...},
        "conclusion": "DAT"
      },
      {
        "evaluatorId": "user-2",
        "evaluatorName": "Trần Văn B",
        "state": "SUBMITTED",
        "formData": {...},
        "conclusion": "DAT"
      }
    ],
    "summary": {
      "totalMembers": 3,
      "submittedCount": 2,
      "pendingCount": 1,
      "datCount": 2,
      "khongDatCount": 0,
      "averageScores": {
        "novelty": 4.5,
        "feasibility": 4.0,
        "methodology": 4.5
      },
      "allSubmitted": false
    }
  }
}
```

---

## 5. Business Rules

### 5.1 Ràng buộc thành viên hội đồng khoa

```typescript
// Validation khi tạo/cập nhật hội đồng khoa
function validateFacultyCouncilMembers(
  councilFacultyId: string,
  memberIds: string[],
  secretaryId: string
): ValidationResult {

  const errors: string[] = [];

  for (const memberId of memberIds) {
    const user = await getUser(memberId);

    // Rule 1: Phải cùng khoa
    if (user.facultyId !== councilFacultyId) {
      errors.push(`${user.displayName} không thuộc khoa này`);
    }

    // Rule 2: Phải là giảng viên
    if (user.role !== 'GIANG_VIEN') {
      errors.push(`${user.displayName} không phải giảng viên`);
    }
  }

  // Rule 3: Tối thiểu 3 thành viên (không tính thư ký)
  const votingMembers = memberIds.filter(id => id !== secretaryId);
  if (votingMembers.length < 3) {
    errors.push('Hội đồng phải có tối thiểu 3 thành viên bỏ phiếu (không tính thư ký)');
  }

  // Rule 4: Số thành viên bỏ phiếu phải là số lẻ
  if (votingMembers.length % 2 === 0) {
    errors.push(`Số thành viên bỏ phiếu phải là số lẻ (hiện tại: ${votingMembers.length})`);
  }

  // Rule 5: Thư ký phải nằm trong danh sách thành viên
  if (!memberIds.includes(secretaryId)) {
    errors.push('Thư ký phải là thành viên của hội đồng');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * IMPORTANT: Đảm bảo số phiếu hợp lệ luôn là số lẻ
 *
 * Khi xét một đề tài cụ thể, số thành viên có quyền bỏ phiếu =
 *   Tổng thành viên - Thư ký - Chủ nhiệm đề tài (nếu có trong HĐ)
 *
 * Ví dụ:
 * - HĐ có 6 thành viên + 1 thư ký = 6 có thể bỏ phiếu
 * - Nếu chủ nhiệm đề tài trong HĐ → 5 có thể bỏ phiếu (lẻ ✓)
 * - Nếu chủ nhiệm KHÔNG trong HĐ → 6 có thể bỏ phiếu (chẵn ✗)
 *
 * Giải pháp: Khi phân công HĐ cho đề tài, kiểm tra và cảnh báo nếu
 * số phiếu hợp lệ là số chẵn.
 */
function validateCouncilForProposal(
  councilMembers: string[],
  secretaryId: string,
  proposalOwnerId: string
): { valid: boolean; warning?: string } {

  const eligibleVoters = councilMembers.filter(id =>
    id !== secretaryId && id !== proposalOwnerId
  );

  if (eligibleVoters.length < 3) {
    return {
      valid: false,
      warning: `Không đủ thành viên bỏ phiếu (cần tối thiểu 3, có ${eligibleVoters.length})`
    };
  }

  if (eligibleVoters.length % 2 === 0) {
    return {
      valid: true,  // Cho phép nhưng cảnh báo
      warning: `Số thành viên bỏ phiếu là số chẵn (${eligibleVoters.length}). Nên thêm/bớt 1 thành viên để tránh hòa.`
    };
  }

  return { valid: true };
}

// Validation khi đánh giá đề tài
function validateEvaluationPermission(
  userId: string,
  proposalOwnerId: string,
  councilSecretaryId: string,
  councilMemberIds: string[]
): ValidationResult {

  const errors: string[] = [];

  // Rule 1: Phải là thành viên hội đồng
  if (!councilMemberIds.includes(userId)) {
    errors.push('Bạn không phải thành viên hội đồng');
    return { valid: false, errors };
  }

  // Rule 2: Không được đánh giá đề tài của chính mình
  if (userId === proposalOwnerId) {
    errors.push('Bạn không thể đánh giá đề tài của chính mình');
    return { valid: false, errors };
  }

  // Rule 3: Thư ký không đánh giá, chỉ tổng hợp
  if (userId === councilSecretaryId) {
    errors.push('Thư ký không tham gia đánh giá, chỉ tổng hợp kết quả');
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
```

### 5.2 Quy tắc đánh giá

```typescript
interface EvaluationContext {
  councilMembers: string[];      // Tất cả thành viên HĐ
  secretaryId: string;           // Thư ký (không bỏ phiếu)
  proposalOwnerId: string;       // Chủ nhiệm đề tài (phiếu vô hiệu)
}

// Tính số thành viên CÓ QUYỀN bỏ phiếu
function getEligibleVoters(context: EvaluationContext): string[] {
  return context.councilMembers.filter(memberId =>
    memberId !== context.secretaryId &&      // Loại thư ký
    memberId !== context.proposalOwnerId     // Loại chủ nhiệm đề tài
  );
}

// Quy tắc kết luận đánh giá tổng hợp
function calculateFacultyEvaluationResult(
  evaluations: Evaluation[],
  context: EvaluationContext
): {
  canApprove: boolean;
  recommendation: 'APPROVE' | 'RETURN' | 'REJECT' | 'PENDING';
  reason: string;
  details: {
    eligibleVoters: number;
    submittedCount: number;
    datCount: number;
    khongDatCount: number;
    excludedMembers: { id: string; reason: string }[];
  };
} {
  const eligibleVoters = getEligibleVoters(context);
  const totalEligible = eligibleVoters.length;

  // Lọc đánh giá hợp lệ (chỉ từ thành viên có quyền bỏ phiếu)
  const validEvaluations = evaluations.filter(e =>
    eligibleVoters.includes(e.evaluatorId) &&
    e.state === 'SUBMITTED'
  );

  const submittedCount = validEvaluations.length;
  const excludedMembers = [
    { id: context.secretaryId, reason: 'Thư ký (chỉ tổng hợp)' },
    ...(context.councilMembers.includes(context.proposalOwnerId)
      ? [{ id: context.proposalOwnerId, reason: 'Chủ nhiệm đề tài (không tự đánh giá)' }]
      : [])
  ];

  // Rule 1: Tất cả thành viên hợp lệ phải đã đánh giá
  if (submittedCount < totalEligible) {
    return {
      canApprove: false,
      recommendation: 'PENDING',
      reason: `Còn ${totalEligible - submittedCount}/${totalEligible} thành viên chưa đánh giá`,
      details: {
        eligibleVoters: totalEligible,
        submittedCount,
        datCount: 0,
        khongDatCount: 0,
        excludedMembers
      }
    };
  }

  const datCount = validEvaluations.filter(e => e.formData.conclusion === 'DAT').length;
  const khongDatCount = validEvaluations.filter(e => e.formData.conclusion === 'KHONG_DAT').length;

  const details = {
    eligibleVoters: totalEligible,
    submittedCount,
    datCount,
    khongDatCount,
    excludedMembers
  };

  // Rule 2: Đa số ĐẠT → APPROVE (số lẻ nên không có hòa)
  if (datCount > totalEligible / 2) {
    return {
      canApprove: true,
      recommendation: 'APPROVE',
      reason: `${datCount}/${totalEligible} thành viên đánh giá ĐẠT`,
      details
    };
  }

  // Rule 3: Đa số KHÔNG ĐẠT → RETURN
  return {
    canApprove: false,
    recommendation: 'RETURN',
    reason: `${khongDatCount}/${totalEligible} thành viên đánh giá KHÔNG ĐẠT`,
    details
  };
}
```

**Ví dụ tính toán:**

```
Hội đồng: A, B, C, D, E (5 người)
Thư ký: A
Đề tài của: C

Thành viên bỏ phiếu hợp lệ: B, D, E (3 người - số lẻ ✓)
Loại trừ: A (thư ký), C (chủ nhiệm)

Kết quả:
- B: ĐẠT
- D: KHÔNG ĐẠT
- E: ĐẠT
→ 2/3 ĐẠT = APPROVE
```
```

### 5.3 Quyền hạn

| Action | QUAN_LY_KHOA | THU_KY_KHOA | Thư ký HĐ | GV (member) | GV (owner) |
|--------|--------------|-------------|-----------|-------------|------------|
| Tạo hội đồng khoa | ✅ | ✅ | ❌ | ❌ | ❌ |
| Phân công HĐ cho đề tài | ✅ | ✅ | ❌ | ❌ | ❌ |
| Đánh giá đề tài | ❌ | ❌ | ❌ (chỉ tổng hợp) | ✅ | ❌ (vô hiệu) |
| Xem tất cả đánh giá | ✅ | ✅ | ✅ | ❌ | ❌ |
| Tổng hợp kết quả | ✅ | ✅ | ✅ | ❌ | ❌ |
| APPROVE/RETURN/REJECT | ✅ | ✅ | ❌ | ❌ | ❌ |

**Lưu ý quan trọng:**
- **Thư ký HĐ**: Không bỏ phiếu, chỉ tổng hợp và báo cáo kết quả
- **GV (owner)**: Là thành viên HĐ nhưng phiếu vô hiệu cho đề tài của mình
- **QUAN_LY_KHOA/THU_KY_KHOA**: Quyết định cuối cùng dựa trên kết quả tổng hợp

---

## 6. UI/UX Changes

### 6.1 Trang quản lý hội đồng khoa

**Route:** `/dashboard/faculty/councils`

```
┌─────────────────────────────────────────────────────────────────────┐
│  Quản lý Hội đồng Khoa                              [+ Tạo mới]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Hội đồng Khoa CNTT - Đợt 1/2026                             │   │
│  │ Loại: Xét duyệt đề cương                                    │   │
│  │ Thư ký: Nguyễn Văn A                                        │   │
│  │ Thành viên: 5                                               │   │
│  │                                          [Sửa] [Xem] [Xóa]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Hội đồng Khoa CNTT - Đợt 2/2026                             │   │
│  │ Loại: Nghiệm thu                                            │   │
│  │ Thư ký: Trần Văn B                                          │   │
│  │ Thành viên: 4                                               │   │
│  │                                          [Sửa] [Xem] [Xóa]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Dialog tạo hội đồng khoa

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tạo Hội đồng Khoa                                           [X]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tên hội đồng: [Hội đồng Khoa CNTT - Đợt 1/2026          ]        │
│                                                                     │
│  Loại:         [▼ Xét duyệt đề cương                     ]        │
│                                                                     │
│  Thư ký:       [▼ Nguyễn Văn A                           ]        │
│                (Thư ký chỉ tổng hợp, không bỏ phiếu)               │
│                                                                     │
│  Thành viên bỏ phiếu: (Tối thiểu 3, phải là số lẻ)                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [x] Trần Văn B - tranvanb@example.com                       │   │
│  │ [x] Lê Thị C - lethic@example.com                           │   │
│  │ [x] Phạm Văn D - phamvand@example.com                       │   │
│  │ [x] Hoàng Thị E - hoangthie@example.com                     │   │
│  │ [x] Vũ Văn F - vuvanf@example.com                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Số thành viên bỏ phiếu: 5 ✓ (số lẻ)                               │
│                                                                     │
│  ℹ️ Lưu ý:                                                         │
│  • Chỉ giảng viên thuộc Khoa CNTT                                  │
│  • Khi xét đề tài, chủ nhiệm sẽ không được bỏ phiếu cho đề tài     │
│    của mình (phiếu tự động vô hiệu)                                │
│                                                                     │
│                                    [Hủy]  [Tạo hội đồng]           │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Trang phân công hội đồng cho đề tài

```
┌─────────────────────────────────────────────────────────────────────┐
│  Phân công Hội đồng Khoa                                     [X]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Đề tài: DT-2026-001 - Nghiên cứu AI trong giáo dục               │
│  Chủ nhiệm: Nguyễn Văn X                                           │
│  Khoa: Công nghệ Thông tin                                         │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Chọn hội đồng:                                                    │
│  ○ Hội đồng Khoa CNTT - Đợt 1/2026 (5 thành viên)                 │
│  ● Hội đồng Khoa CNTT - Đợt 2/2026 (4 thành viên)                 │
│  ○ [+ Tạo hội đồng mới]                                            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Thành viên hội đồng đã chọn:                                      │
│  • Trần Văn B (Thư ký)                                             │
│  • Lê Thị C                                                        │
│  • Phạm Văn D                                                      │
│  • Hoàng Thị E                                                     │
│                                                                     │
│  ⚠️ Nguyễn Văn X (chủ nhiệm đề tài) sẽ không tham gia đánh giá    │
│                                                                     │
│                                    [Hủy]  [Phân công]              │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.4 Trang đánh giá (cho thành viên HĐ)

**Trường hợp 1: Thành viên bình thường (có quyền đánh giá)**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Đánh giá Đề tài Cấp Khoa                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Đề tài: DT-2026-001 - Nghiên cứu AI trong giáo dục               │
│  Chủ nhiệm: Nguyễn Văn X                                           │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  1. Tính mới của đề tài                                            │
│     ○ 1  ○ 2  ○ 3  ● 4  ○ 5                                       │
│                                                                     │
│  2. Tính khả thi                                                   │
│     ○ 1  ○ 2  ○ 3  ○ 4  ● 5                                       │
│                                                                     │
│  3. Phương pháp nghiên cứu                                         │
│     ○ 1  ○ 2  ○ 3  ● 4  ○ 5                                       │
│                                                                     │
│  4. Nhận xét                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Đề tài có tính mới, phương pháp nghiên cứu phù hợp.        │   │
│  │ Cần bổ sung thêm về khảo sát thực tế...                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  5. Kết luận                                                       │
│     ● ĐẠT       ○ KHÔNG ĐẠT                                        │
│                                                                     │
│                          [Lưu nháp]  [Gửi đánh giá]                │
└─────────────────────────────────────────────────────────────────────┘
```

**Trường hợp 2: Chủ nhiệm đề tài (không được đánh giá)**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Đánh giá Đề tài Cấp Khoa                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Đề tài: DT-2026-001 - Nghiên cứu AI trong giáo dục               │
│  Chủ nhiệm: Nguyễn Văn X (Bạn)                                     │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  🚫 Bạn không thể đánh giá đề tài của chính mình           │   │
│  │                                                             │   │
│  │  Theo quy định, chủ nhiệm đề tài không được tham gia       │   │
│  │  bỏ phiếu đánh giá cho đề tài của mình.                    │   │
│  │                                                             │   │
│  │  Phiếu của bạn sẽ tự động được đánh dấu là VÔ HIỆU.       │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                              [Quay lại]            │
└─────────────────────────────────────────────────────────────────────┘
```

**Trường hợp 3: Thư ký hội đồng (chỉ tổng hợp)**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Đánh giá Đề tài Cấp Khoa                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Đề tài: DT-2026-001 - Nghiên cứu AI trong giáo dục               │
│  Chủ nhiệm: Nguyễn Văn X                                           │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  📋 Bạn là Thư ký Hội đồng                                  │   │
│  │                                                             │   │
│  │  Thư ký không tham gia bỏ phiếu đánh giá.                  │   │
│  │  Nhiệm vụ của bạn là tổng hợp kết quả từ các thành viên.   │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                    [Xem tổng hợp đánh giá]  [Quay lại]             │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.5 Trang tổng hợp đánh giá (cho thư ký/trưởng khoa)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tổng hợp Đánh giá Hội đồng Khoa                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Đề tài: DT-2026-001 - Nghiên cứu AI trong giáo dục               │
│  Chủ nhiệm: Nguyễn Văn X                                           │
│  Hội đồng: Hội đồng Khoa CNTT - Đợt 1/2026                         │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  THÔNG TIN BỎ PHIẾU                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Tổng thành viên HĐ: 7                                      │   │
│  │  Thành viên bỏ phiếu hợp lệ: 5                              │   │
│  │  ────────────────────────────────────                       │   │
│  │  Loại trừ:                                                  │   │
│  │    • Trần Văn A (Thư ký - chỉ tổng hợp)                     │   │
│  │    • Nguyễn Văn X (Chủ nhiệm đề tài - không tự đánh giá)    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  KẾT QUẢ BỎ PHIẾU                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Đã đánh giá: 5/5 thành viên ✓                              │   │
│  │  Kết quả: 3 ĐẠT / 2 KHÔNG ĐẠT                               │   │
│  │  Điểm trung bình:                                           │   │
│  │    • Tính mới: 4.2/5                                        │   │
│  │    • Tính khả thi: 4.5/5                                    │   │
│  │    • Phương pháp: 4.0/5                                     │   │
│  │  ──────────────────────────────────────                     │   │
│  │  Đề xuất: ✅ DUYỆT (3/5 = 60% đánh giá ĐẠT)                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  CHI TIẾT ĐÁNH GIÁ                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🗳️ PHIẾU HỢP LỆ (5)                                         │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Lê Thị B - ✅ ĐẠT                                           │   │
│  │ Điểm: 4, 5, 4 | Nhận xét: "Đề tài tốt..."         [Xem ▼]  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Phạm Văn C - ✅ ĐẠT                                         │   │
│  │ Điểm: 4, 4, 4 | Nhận xét: "Phương pháp phù hợp"   [Xem ▼]  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Hoàng Thị D - ❌ KHÔNG ĐẠT                                  │   │
│  │ Điểm: 3, 3, 3 | Nhận xét: "Cần bổ sung..."        [Xem ▼]  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Vũ Văn E - ✅ ĐẠT                                           │   │
│  │ Điểm: 5, 5, 4 | Nhận xét: "Rất tốt"               [Xem ▼]  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Đặng Thị F - ❌ KHÔNG ĐẠT                                   │   │
│  │ Điểm: 3, 2, 3 | Nhận xét: "Chưa khả thi"          [Xem ▼]  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 🚫 PHIẾU LOẠI TRỪ (2)                                       │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Trần Văn A - 📋 THƯ KÝ (không bỏ phiếu)                     │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Nguyễn Văn X - 🚫 CHỦ NHIỆM ĐỀ TÀI (phiếu vô hiệu)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│        [Yêu cầu chỉnh sửa]  [Từ chối]  [Duyệt lên cấp Trường]     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Files cần thay đổi

### 7.1 Backend

| File | Thay đổi |
|------|----------|
| `prisma/schema.prisma` | Thêm `CouncilScope`, `EvaluationLevel`, update Council và Evaluation |
| `apps/src/modules/council/council.service.ts` | Thêm methods cho faculty council |
| `apps/src/modules/council/council.controller.ts` | Thêm endpoints `/faculty/*` |
| `apps/src/modules/council/dto/council.dto.ts` | Thêm DTOs cho faculty council |
| `apps/src/modules/evaluations/evaluations.service.ts` | Support `FACULTY_COUNCIL_OUTLINE_REVIEW` state |
| `apps/src/modules/evaluations/evaluations.controller.ts` | Thêm endpoints `/faculty/*` |
| `apps/src/modules/workflow/helpers/state-machine.helper.ts` | Cập nhật transitions |
| `apps/src/modules/workflow/services/holder-assignment.service.ts` | Cập nhật holder logic |

### 7.2 Frontend

| File | Thay đổi |
|------|----------|
| `web-apps/src/app/dashboard/faculty/councils/page.tsx` | Trang quản lý HĐ khoa (mới) |
| `web-apps/src/components/council/FacultyCouncilForm.tsx` | Form tạo/sửa HĐ (mới) |
| `web-apps/src/components/council/AssignFacultyCouncilDialog.tsx` | Dialog phân công (mới) |
| `web-apps/src/components/evaluation/FacultyEvaluationForm.tsx` | Form đánh giá cấp khoa (mới) |
| `web-apps/src/components/evaluation/FacultyEvaluationSummary.tsx` | Tổng hợp đánh giá (mới) |
| `web-apps/src/components/workflow/ProposalActions.tsx` | Thêm action assign faculty council |
| `web-apps/src/lib/api/council.ts` | API calls cho faculty council |
| `web-apps/src/lib/api/evaluations.ts` | API calls cho faculty evaluation |

---

## 8. Migration Plan

### 8.1 Database Migration

```sql
-- Migration: Add faculty council support

-- 1. Add scope to Council
ALTER TABLE "Council" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'SCHOOL';
ALTER TABLE "Council" ADD COLUMN "faculty_id" TEXT;
ALTER TABLE "Council" ADD CONSTRAINT "Council_faculty_id_fkey"
  FOREIGN KEY ("faculty_id") REFERENCES "Faculty"("id");

-- 2. Add level to Evaluation
ALTER TABLE "Evaluation" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'SCHOOL';

-- 3. Update unique constraint
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_proposal_id_evaluator_id_key";
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_proposal_evaluator_level_key"
  UNIQUE ("proposal_id", "evaluator_id", "level");

-- 4. Create enum types
CREATE TYPE "CouncilScope" AS ENUM ('FACULTY', 'SCHOOL');
CREATE TYPE "EvaluationLevel" AS ENUM ('FACULTY', 'SCHOOL');
```

### 8.2 Rollback Plan

```sql
-- Rollback migration

ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_proposal_evaluator_level_key";
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_proposal_id_evaluator_id_key"
  UNIQUE ("proposal_id", "evaluator_id");
ALTER TABLE "Evaluation" DROP COLUMN "level";

ALTER TABLE "Council" DROP CONSTRAINT "Council_faculty_id_fkey";
ALTER TABLE "Council" DROP COLUMN "faculty_id";
ALTER TABLE "Council" DROP COLUMN "scope";

DROP TYPE "EvaluationLevel";
DROP TYPE "CouncilScope";
```

---

## 9. Test Cases

### 9.1 Unit Tests

```typescript
describe('FacultyCouncilService', () => {
  describe('createFacultyCouncil', () => {
    it('should create council with faculty scope', async () => {});
    it('should reject members from different faculty', async () => {});
    it('should require minimum 3 voting members (excluding secretary)', async () => {});
    it('should require odd number of voting members', async () => {});
    it('should reject even number of voting members', async () => {});
    it('should allow 3, 5, 7, 9... voting members', async () => {});
  });

  describe('assignFacultyCouncil', () => {
    it('should assign council to proposal in FACULTY_COUNCIL_OUTLINE_REVIEW', async () => {});
    it('should update holderUnit and holderUser', async () => {});
    it('should reject if proposal not in correct state', async () => {});
    it('should allow council with proposal owner as member', async () => {});
  });
});

describe('FacultyEvaluationService', () => {
  describe('createEvaluation', () => {
    it('should create evaluation with FACULTY level', async () => {});
    it('should allow only council members to evaluate', async () => {});
    it('should reject proposal owner from evaluating their own proposal', async () => {});
    it('should allow proposal owner to evaluate OTHER proposals', async () => {});
    it('should reject secretary from evaluating', async () => {});
  });

  describe('getEligibleVoters', () => {
    it('should exclude secretary from voters', async () => {});
    it('should exclude proposal owner from voters', async () => {});
    it('should return correct count of eligible voters', async () => {});
  });

  describe('getAllEvaluations', () => {
    it('should return all evaluations for secretary', async () => {});
    it('should mark owner evaluation as EXCLUDED', async () => {});
    it('should mark secretary as NON_VOTING', async () => {});
    it('should calculate summary with only valid votes', async () => {});
    it('should recommend APPROVE when majority is DAT', async () => {});
    it('should recommend RETURN when majority is KHONG_DAT', async () => {});
    it('should never have tie (odd voters)', async () => {});
  });
});
```

### 9.2 E2E Tests

```typescript
describe('Faculty Council Evaluation Flow', () => {
  it('should complete full faculty review workflow', async () => {
    // 1. GIANG_VIEN (A) submits proposal
    // 2. QUAN_LY_KHOA creates faculty council with members [A, B, C, D, E] + Secretary S
    // 3. QUAN_LY_KHOA assigns council to proposal
    // 4. Members B, C, D, E submit evaluations (A cannot evaluate own proposal)
    // 5. Secretary S views summary (shows A as excluded)
    // 6. If majority DAT → QUAN_LY_KHOA approves
    // 7. Proposal moves to SCHOOL_COUNCIL_OUTLINE_REVIEW
  });

  it('should reject proposal owner from evaluating their own proposal', async () => {
    // 1. Create proposal by user A
    // 2. Assign council including A
    // 3. A tries to evaluate → Should get 403 Forbidden
    // 4. Summary shows A as EXCLUDED
  });

  it('should allow proposal owner to evaluate OTHER proposals', async () => {
    // 1. Create proposal by user A
    // 2. Create proposal by user B (same council)
    // 3. A evaluates B's proposal → Should succeed
    // 4. B evaluates A's proposal → Should succeed
  });

  it('should reject secretary from evaluating', async () => {
    // 1. Create proposal
    // 2. Assign council with secretary S
    // 3. S tries to evaluate → Should get 403 Forbidden
    // 4. Summary shows S as NON_VOTING
  });

  it('should require odd number of voting members', async () => {
    // 1. Try to create council with 4 voting members → Should fail
    // 2. Create council with 5 voting members → Should succeed
    // 3. If owner is in council → effective voters = 5 - 1 = 4 (even) → Should warn
  });

  it('should reject members from different faculty', async () => {
    // 1. Try to add member from different faculty → Should fail
    // 2. All members must have same facultyId as proposal
  });

  it('should calculate result correctly with exclusions', async () => {
    // Council: A, B, C, D, E (5 members) + Secretary S
    // Proposal owner: A
    // Eligible voters: B, C, D, E (4 members - even, but A is excluded)
    // Wait - this is even! Need to handle this case
    // Solution: Warn when creating council if potential even voters
  });
});
```

### 9.3 Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle council where owner exclusion results in even voters', async () => {
    // Council: A, B, C, D, E, F (6 members) + Secretary S
    // If proposal owner is A → 5 voters (odd) ✓
    // If proposal owner is NOT in council → 6 voters (even) ✗
    // Solution: Require council size that ensures odd voters in all cases
  });

  it('should handle multiple proposals from same owner in queue', async () => {
    // User A has 3 proposals
    // Council evaluates all 3
    // A is excluded from all 3 evaluations
    // A can still see summary but cannot vote
  });

  it('should prevent approval before all eligible members vote', async () => {
    // 5 eligible voters
    // Only 4 have voted
    // APPROVE button should be disabled
    // Show "Còn 1/5 thành viên chưa đánh giá"
  });
});
```

---

## 10. Checklist Implement

- [ ] **Phase 1: Database**
  - [ ] Tạo migration script
  - [ ] Cập nhật Prisma schema
  - [ ] Generate Prisma client
  - [ ] Test migration trên dev

- [ ] **Phase 2: Backend - Council**
  - [ ] Implement `createFacultyCouncil()`
  - [ ] Implement `listFacultyCouncils()`
  - [ ] Implement `getEligibleFacultyMembers()`
  - [ ] Implement `assignFacultyCouncil()`
  - [ ] Add validation cho faculty constraint
  - [ ] Unit tests

- [ ] **Phase 3: Backend - Evaluation**
  - [ ] Extend `getOrCreateEvaluation()` cho FACULTY level
  - [ ] Implement `getFacultyEvaluationSummary()`
  - [ ] Add faculty-level validation
  - [ ] Unit tests

- [ ] **Phase 4: Frontend - Council Management**
  - [ ] Trang `/dashboard/faculty/councils`
  - [ ] Form tạo/sửa hội đồng
  - [ ] Dialog phân công hội đồng

- [ ] **Phase 5: Frontend - Evaluation**
  - [ ] Form đánh giá cấp khoa
  - [ ] Trang tổng hợp đánh giá
  - [ ] Integration với workflow actions

- [ ] **Phase 6: Testing**
  - [ ] E2E test full flow
  - [ ] Manual testing
  - [ ] Performance testing (nếu cần)

---

## 11. Yêu Cầu Đã Xác Nhận

| # | Yêu cầu | Quyết định |
|---|---------|------------|
| 1 | Form đánh giá | **Giống cấp trường** (cùng tiêu chí, thang điểm) |
| 2 | Số lượng thành viên | **Tối thiểu 3, phải là số lẻ** (3, 5, 7, 9...) |
| 3 | Chủ nhiệm đề tài | **Có thể là thành viên HĐ cho đề tài khác** |
| 4 | Thư ký | **Chỉ tổng hợp, không đánh giá** |
| 5 | Hội đồng dùng lại | **Có thể xét nhiều đề tài** - HĐ khoa gồm gần hết GV của khoa |
| 6 | Bắt buộc HĐ | **Luôn bắt buộc** |

### Cơ chế đặc biệt: Vô hiệu hóa phiếu chủ nhiệm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CƠ CHẾ VÔ HIỆU HÓA PHIẾU                                │
└─────────────────────────────────────────────────────────────────────────────┘

Hội đồng Khoa CNTT gồm 7 giảng viên: A, B, C, D, E, F, G

Đề tài 1 (Chủ nhiệm: A)         Đề tài 2 (Chủ nhiệm: C)
┌─────────────────────────┐     ┌─────────────────────────┐
│ Thành viên bỏ phiếu:    │     │ Thành viên bỏ phiếu:    │
│ • B ✅ ĐẠT              │     │ • A ✅ ĐẠT              │
│ • C ✅ ĐẠT              │     │ • B ❌ KHÔNG ĐẠT        │
│ • D ❌ KHÔNG ĐẠT        │     │ • D ✅ ĐẠT              │
│ • E ✅ ĐẠT              │     │ • E ✅ ĐẠT              │
│ • F ✅ ĐẠT              │     │ • F ❌ KHÔNG ĐẠT        │
│ • G ❌ KHÔNG ĐẠT        │     │ • G ✅ ĐẠT              │
│ • A 🚫 VÔ HIỆU (owner)  │     │ • C 🚫 VÔ HIỆU (owner)  │
│ ────────────────────────│     │ ────────────────────────│
│ Kết quả: 4 ĐẠT / 2 K.ĐẠT│     │ Kết quả: 4 ĐẠT / 2 K.ĐẠT│
│ → DUYỆT (đa số)         │     │ → DUYỆT (đa số)         │
└─────────────────────────┘     └─────────────────────────┘

Lưu ý:
- Chủ nhiệm KHÔNG thể submit đánh giá cho đề tài của mình
- UI sẽ ẩn form đánh giá khi xem đề tài của mình
- API trả về lỗi nếu chủ nhiệm cố gắng đánh giá đề tài của mình
```
