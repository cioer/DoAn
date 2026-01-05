# Addendum: Biểu mẫu & Chữ ký số (Signature Policy)

**Version:** 1.2
**Date:** 2026-01-02
**Status:** IMPLEMENTATION READY
**Related:** `tech-spec-nckh-system.md` v1.9+

**Changelog:**
- v1.2 (2026-01-02): Form names updated to match "Cac bieu mau quy dinh NCKH 2024.pdf": MAU_01B, MAU_03B, MAU_12B
- v1.1 (2026-01-02): P1 decisions implemented (P1.1-P1.6)

---

## 1. Mục đích

Addendum này quy định chi tiết:
1. **Stage Pack Requirements**: Bộ biểu mẫu bắt buộc theo từng giai đoạn (P0-3, P1.5)
2. **Signature Policy**: Quy tắc ký và upload bản scan (P0-3)
3. **Versioning**: Quy định re-upload update-in-place (P1.3)
4. **Verification**: Ai có quyền xác thực biểu mẫu đã ký
5. **Task Rules**: Tạo task mới mỗi transition (P1.1, P1.4)

---

## 2. Stage Pack Requirements (P0-3 + P1.5: BẮT BUỘC)

### 2.1 Định nghĩa

**Stage Pack** = Bộ biểu mẫu ĐÃ KÝ (scan) cần phải có trước khi chuyển sang giai đoạn tiếp theo.

### 2.2 Mapping State → Required Forms (P1.5 Updated)

| State | Required Form Codes | Tên biểu mẫu | Ai ký | Vote Tally |
|-------|---------------------|--------------|-------|------------|
| **SUBMITTED** | `DOC_MAU_01B` | Mẫu 1b - Phiếu đề xuất nghiên cứu khoa học | PI (Chủ nhiệm) | - |
| **FACULTY_REVIEW** | `DOC_MAU_02B`, `DOC_MAU_03B` | Mẫu 2b - Phiếu đánh giá Khoa<br>Mẫu 3b - Biên bản họp đánh giá Khoa | Thư ký Khoa | ✅ |
| **SCHOOL_SELECTION_REVIEW** | `DOC_MAU_04B`, `DOC_MAU_05B` | **Mẫu 4b - Danh mục tổng hợp (PHIẾU TỔNG - A)**<br>Mẫu 5b - Biên bản họp xét chọn sơ bộ | PKHCN | ✅ |
| **OUTLINE_COUNCIL_REVIEW** | `DOC_MAU_06B` | Mẫu 6b - Biên bản HĐ tư vấn xét đề cương | HĐ KH&ĐT | ✅ |
| **CHANGES_REQUESTED** | `DOC_MAU_07B` | Mẫu 7b - Báo cáo hoàn thiện đề cương | PI | - |
| **FACULTY_ACCEPTANCE_REVIEW** | `DOC_MAU_08B`, `DOC_MAU_09B`, `DOC_MAU_10B`, `DOC_MAU_11B` | Mẫu 8b - Giấy đề nghị thành lập HĐ ĐGNT Khoa<br>Mẫu 9b - Phiếu đánh giá NT Khoa<br>Mẫu 10b - Biên bản họp HĐ ĐGNT Khoa<br>Mẫu 11b - Báo cáo hoàn thiện hồ sơ NT Khoa | HĐ Nghiệm thu Khoa | ✅ |
| **SCHOOL_ACCEPTANCE_REVIEW** | `DOC_MAU_12B`, `DOC_MAU_13B`, `DOC_MAU_14B`, `DOC_MAU_15B`, `DOC_MAU_16B` | **P1.5: Mẫu 12b - Nhận xét phản biện (PL3)**<br>Mẫu 13b - Giấy đề nghị thành lập HĐ ĐGNT Trường<br>Mẫu 14b - Phiếu đánh giá NT Trường<br>Mẫu 15b - Biên bản họp HĐ ĐGNT Trường<br>**Mẫu 16b - PHIẾU TỔNG (Báo cáo hoàn thiện)** | HĐ Nghiệm thu Trường<br>PL3 (cho Mẫu 12b) | ✅ |
| **HANDOVER** | `DOC_MAU_17B` | Mẫu 17b - Biên bản giao nhận sản phẩm | PI + Đơn vị tiếp nhận | - |
| **PAUSED** | `DOC_MAU_18B` | Mẫu 18b - Đơn xin gia hạn | PI | - |

### 2.3 Phiếu Tổng (P1.5: Có 2 giai đoạn)

**Giai đoạn A - Mẫu 4b**: Danh mục tổng hợp kết quả xét chọn sơ bộ cấp Trường

**Giai đoạn D - Mẫu 16b**: Báo cáo hoàn thiện hồ sơ nghiệm thu cấp Trường (**PHIẾU TỔNG chính**)

Cả hai phiếu tổng đều chứa:
- Danh sách đề tài được xét chọn
- Kết quả biểu quyết: Đạt / Không đạt
- Số lượng: Thông qua / Không thông qua / Tổng số
- Chữ ký: Ban chủ nhiệm HĐ KH&ĐT

**Vote Tally Storage (P1.5):**
```javascript
// Vote tally lưu trong projects metadata, không tách thành template riêng
project.metadata.vote_tallies = {
  'FACULTY_REVIEW': {
    total: 5,
    approved: 4,
    rejected: 1,
    abstained: 0,
    approved_by: ['user_id_1', 'user_id_2', ...]
  },
  'SCHOOL_ACCEPTANCE_REVIEW': {
    total: 7,
    approved: 6,
    rejected: 1,
    abstained: 0,
    approved_by: ['user_id_1', ...]
  }
};
```

---

## 3. Signature Policy (P0-3: SCAN SIGNATURE)

### 3.1 Loại chữ ký (MVP)

| Loại | Mô tả | File type | Áp dụng |
|------|--------|-----------|---------|
| **SCAN_HANDWRITTEN** | Scan chữ ký tay | PDF, JPG, PNG | Tất cả biểu mẫu (MVP) |
| DIGITAL_SIGNATURE | Chữ ký số (USB Token) | PDF signed | Phase 2+ |
| SYSTEM_GENERATED | System tạo | PDF | Quyết định hệ thống |

### 3.2 P1.2: Documents là Single Source of Truth

```javascript
// P1.2: Mọi file scan ký tay đều lưu trong documents
// Không dùng form_submissions trong MVP để tránh trùng mô hình

async function uploadSignedDocument(projectId, templateCode, file, userId) {
  const template = await db.document_templates.findUnique({
    where: { code: templateCode }
  });

  // P1.3: Update-in-place nếu đã tồn tại (cùng project + template + stage)
  const existing = await db.documents.findFirst({
    where: {
      project_id: projectId,
      template_code: templateCode,
      stage: getCurrentStage(projectId)
    }
  });

  if (existing) {
    // P1.3: Re-upload = update existing record
    const updated = await db.documents.update({
      where: { id: existing.id },
      data: {
        signed_file_url: await storage.upload(file),
        signed_uploaded_by: userId,
        signed_uploaded_at: new Date(),
        version: existing.version + 1  // Increment version
      }
    });

    // P1.3: Audit log - UI không show history
    await logWorkflowEvent({
      project_id: projectId,
      action: 'SIGNED_REPLACED',
      actor_id: userId,
      document_id: existing.id,
      metadata: {
        template_code: templateCode,
        old_version: existing.version,
        new_version: updated.version
      }
    });

    return updated;
  }

  // New upload
  return await db.documents.create({
    data: {
      project_id: projectId,
      template_code: templateCode,
      signed_file_url: await storage.upload(file),
      signed_uploaded_by: userId,
      signed_uploaded_at: new Date(),
      version: 1
    }
  });
}
```

### 3.3 Quy tắc upload

```javascript
// P0-3: Upload validation rules
const SIGNATURE_VALIDATION = {
  maxFileSize: 10 * 1024 * 1024,        // 10MB
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],

  validateSignature: (file) => {
    // Check file type
    if (!SIGNATURE_VALIDATION.allowedTypes.includes(file.mime_type)) {
      throw new ValidationError('Chỉ chấp nhận PDF, JPG, PNG');
    }

    // Check file size
    if (file.size > SIGNATURE_VALIDATION.maxFileSize) {
      throw new ValidationError('File quá lớn (tối đa 10MB)');
    }

    return true;
  }
};
```

### 3.4 Workflow Gating (P0-3: BLOCKED ACTION)

**Không thể Approve/Submit nếu thiếu Stage Pack:**

```javascript
// P0-3: assertion before EVERY APPROVE or SUBMIT
async function assertStagePackComplete(projectId, stage) {
  const requiredCodes = STAGE_PACK_REQUIREMENTS[stage];
  if (!requiredCodes || requiredCodes.length === 0) return true;

  const uploadedDocs = await db.documents.findMany({
    where: {
      project_id: projectId,
      template_code: { in: requiredCodes },
      signed_file_url: { not: null }  // Must have signed upload
    }
  });

  const uploadedCodes = uploadedDocs.map(d => d.template_code);
  const missing = requiredCodes.filter(code => !uploadedCodes.includes(code));

  if (missing.length > 0) {
    throw new StagePackIncompleteError(
      `Thiếu biểu mẫu đã ký: ${missing.join(', ')}`
    );
  }

  return true;
}
```

---

## 4. Versioning Policy (P1.3: Update-in-place)

### 4.1 P1.3: Re-upload = Update-in-place (No history UI)

```javascript
// P1.3: Quyết định - Chỉ lưu bản mới nhất, UI KHÔNG show history
// Khi upload lại cùng biểu mẫu (cùng project + template_code):

async function reuploadSignedDocument(projectId, templateCode, file, userId) {
  // Tìm document hiện tại
  const existing = await db.documents.findFirst({
    where: {
      project_id: projectId,
      template_code: templateCode
    }
  });

  if (!existing) {
    throw new NotFoundError('Không tìm thấy biểu mẫu để cập nhật');
  }

  // P1.3: Update-in-place - giữ nguyên ID, chỉ update file + metadata
  const updated = await db.documents.update({
    where: { id: existing.id },
    data: {
      signed_file_url: await storage.upload(file),  // Overwrite file
      signed_uploaded_by: userId,
      signed_uploaded_at: new Date(),
      version: existing.version + 1,  // Increment version for audit
      // P1.3: File cũ có thể xóa hoặc giữ backup (tuỳ infra)
    }
  });

  // P1.3: Audit log - UI KHÔNG hiển thị history
  await logWorkflowEvent({
    project_id: projectId,
    action: 'SIGNED_REPLACED',  // P1.3: New action type
    actor_id: userId,
    document_id: existing.id,
    metadata: {
      template_code: templateCode,
      old_version: existing.version,
      new_version: updated.version
    }
  });

  return updated;
}
```

### 4.2 UI Behavior (P1.3)

**UI KHÔNG hiển thị lịch sử phiên bản:**
- Chỉ hiển thị file mới nhất
- Không có "View History" button
- Audit trail có trong `workflow_logs` nhưng không show cho user

**Lý do (P1.3):**
- Giảm UI complexity cho MVP
- Phiếu tổng (16b) cần hiển thị giá trị latest, không cần version history
- Audit vẫn đầy đủ cho troubleshooting

---

## 5. Task Rules (P1.1 + P1.4)

### 5.1 Task Creation per Transition (P1.1)

**Quy tắc:** Mỗi khi chuyển stage → tạo task mới, task cũ đóng (DECIDED)

```javascript
// 1 project = 1 open task tại bất kỳ thời điểm
// Unique index đảm bảo điều này
CREATE UNIQUE INDEX idx_approval_tasks_one_open_per_project
ON approval_tasks(project_id)
WHERE status IN ('PENDING', 'IN_PROGRESS', 'ESCALATED');
```

**Quy trình:**
1. Approver quyết định → task hiện tại → `DECIDED`
2. Nếu APPROVE → tạo task mới cho stage kế
3. Nếu REQUEST_CHANGES → không tạo task (PI edit & resubmit)
4. Nếu REJECT → không tạo task (kết thúc)

### 5.2 Return to State (P1.4)

**P1.4:** Khi REQUEST_CHANGES → lưu `return_to_state` để PI quay về đúng stage

```javascript
// Lưu khi approver request changes
project.metadata.return_to_state = 'FACULTY_REVIEW';

// Khi PI resubmit, quay về đúng stage đó
project.state = project.metadata.return_to_state;
// Tạo task mới cho stage đó
```

---

## 5. Verification Policy

### 5.1 Ai có quyền xác thực (Verify)?

| Role | Verify quyền | Scope |
|------|--------------|-------|
| **PHONG_KHCN** | ✅ Full | Tất cả biểu mẫu |
| **QUAN_LY_KHOA** | ✅ Limited | Biểu mẫu cấp Khoa (Mẫu 2b-3b, 8b-11b) |
| **THU_KY_HOI_DONG** | ✅ Limited | Biên bản HĐ |
| **ADMIN** | ✅ Full | Tất cả (override) |
| **PI** | ❌ No | Không tự xác thực |
| **GIANG_VIEN** | ❌ No | Không có quyền |

### 5.2 Verification workflow

```javascript
// P0-4: Verify signed document
async function verifySignedDocument(documentId, verifierId) {
  const verifier = await getUser(verifierId);
  if (!canVerify(verifier.role)) {
    throw new ForbiddenError('Không có quyền xác thực biểu mẫu');
  }

  const document = await db.documents.findUnique({ where: { id: documentId } });

  // Update verification status
  const updated = await db.documents.update({
    where: { id: documentId },
    data: {
      verification_status: 'VERIFIED',
      verified_by: verifierId,
      verified_at: new Date()
    }
  });

  // Log verification event
  await logWorkflowEvent({
    project_id: document.project_id,
    action: 'SIGNED_DOCUMENT_VERIFIED',
    actor_id: verifierId,
    document_id: documentId,
    metadata: {
      template_code: document.template_code,
      verifier_role: verifier.role
    }
  });

  return updated;
}
```

---

## 6. CAP_TRUONG Only Scope (P0-5: MVP LOCK)

### 6.1 Hard constraint

```sql
-- Database level constraint
ALTER TABLE projects
ADD CONSTRAINT projects_type_check
CHECK (project_type = 'CAP_TRUONG');
```

### 6.2 Backend enforcement

```javascript
// P0-5: Project type hardcoded for MVP
const PROJECT_TYPE_MVP = 'CAP_TRUONG';

function createProject(data) {
  return db.projects.create({
    data: {
      ...data,
      project_type: PROJECT_TYPE_MVP  // Hardcoded, ignore input
    }
  });
}
```

### 6.3 UI filtering

```tsx
// P0-5: Remove "Cấp Khoa" filter from UI
// In ProjectFilter component:
const PROJECT_TYPE_OPTIONS = [
  // { value: 'CAP_KHOA', label: 'Cấp Khoa' },  // REMOVED for MVP
  { value: 'CAP_TRUONG', label: 'Cấp Trường' }
];

// Or simpler - don't show project_type filter at all
const SHOW_PROJECT_TYPE_FILTER = false;  // MVP: only CAP_TRUONG exists
```

---

## 7. Implementation Checklist

- [ ] Add `STAGE_PACK_REQUIREMENTS` constant to backend
- [ ] Implement `assertStagePackComplete()` function
- [ ] Add stage pack check before every APPROVE/SUBMIT action
- [ ] Update `documents` table with version tracking fields
- [ ] Implement re-upload with version creation
- [ ] Add verification endpoints with role checking
- [ ] Add `project_type = 'CAP_TRUONG'` constraint to DB
- [ ] Remove "Cấp Khoa" filter from UI
- [ ] Update UI ActionButton to show missing forms prompt
- [ ] Add `signed_file_url` check in `canPerformAction()`

---

## 8. Appendix: Form Template Reference

| Code | Tên tiếng Việt | File name |
|------|----------------|-----------|
| DOC_MAU_01B | Mẫu 1b - Phiếu đề xuất nghiên cứu khoa học | Mau1b_PhuieuDeXuatNCKH.docx |
| DOC_MAU_02B | Mẫu 2b - Phiếu đánh giá (cấp Khoa) | Mau2b_PhieuDanhGiaKhoa.docx |
| DOC_MAU_03B | Mẫu 3b - Biên bản họp đánh giá (cấp Khoa) | Mau3b_BienBanHopDanhGiaKhoa.docx |
| DOC_MAU_04B | Mẫu 4b - Danh mục tổng hợp (PHIẾU TỔNG) | Mau4b_DanhMucTongHop.docx |
| DOC_MAU_05B | Mẫu 5b - Biên bản họp xét chọn sơ bộ | Mau5b_BienBanHopXetChonSoboi.docx |
| DOC_MAU_06B | Mẫu 6b - Biên bản HĐ tư vấn xét đề cương | Mau6b_BienBanHoiDongTuVan.docx |
| DOC_MAU_07B | Mẫu 7b - Báo cáo hoàn thiện đề cương | Mau7b_BaoCaoHoanThienDeCuong.docx |
| DOC_MAU_08B | Mẫu 8b - Giấy đề nghị thành lập HĐ ĐGNT Khoa | Mau8b_GiayDeNghiThanhLapHD.docx |
| DOC_MAU_09B | Mẫu 9b - Phiếu đánh giá NT Khoa | Mau9b_PhieuDanhGiaNTKhoa.docx |
| DOC_MAU_10B | Mẫu 10b - Biên bản họp HĐ ĐGNT Khoa | Mau10b_BienBanHopHDNTKhoa.docx |
| DOC_MAU_11B | Mẫu 11b - Báo cáo hoàn thiện hồ sơ NT Khoa | Mau11b_BaoCaoHoanThienHoSo.docx |
| DOC_MAU_12B | Mẫu 12b - Nhận xét phản biện (Phản biện số 3) | Mau12b_NhanXetPhanBienPL3.docx |
| DOC_MAU_13B | Mẫu 13b - Giấy đề nghị thành lập HĐ ĐGNT Trường | Mau13b_GiayDeNghiThanhLapHDTruong.docx |
| DOC_MAU_14B | Mẫu 14b - Phiếu đánh giá NT Trường | Mau14b_PhieuDanhGiaNTTruong.docx |
| DOC_MAU_15B | Mẫu 15b - Biên bản họp HĐ ĐGNT Trường | Mau15b_BienBanHopHDNTTruong.docx |
| DOC_MAU_16B | Mẫu 16b - Báo cáo hoàn thiện hồ sơ NT Trường | Mau16b_BaoCaoHoanThienHoSoTruong.docx |
| DOC_MAU_17B | Mẫu 17b - Biên bản giao nhận sản phẩm | Mau17b_BienBanGiaoNhanSanPham.docx |
| DOC_MAU_18B | Mẫu 18b - Đơn xin gia hạn | Mau18b_DonXinGiaHan.docx |
