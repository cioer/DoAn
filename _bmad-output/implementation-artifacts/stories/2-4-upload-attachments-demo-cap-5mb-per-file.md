# Story 2.4: Upload Attachments (Demo Cap 5MB/File)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Giảng viên (PROJECT_OWNER)**,
I want **upload tài liệu đính kèm (PDF, CV, budget...)**,
So that **hồ sơ của tôi đầy đủ chứng từ cần thiết**.

## Acceptance Criteria

1. **AC1: File Picker với Accept Formats** - Giảng viên đang ở màn hình Edit Proposal, khi click "Tải tài liệu lên" hoặc drag-drop file, UI hiển thị file picker accept các định dạng: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
2. **AC2: File Size Validation (Per File)** - Khi chọn file > 5MB (demo cap, configurable), UI hiển thị lỗi "File quá 5MB. Vui lòng nén hoặc chia nhỏ." và file KHÔNG được upload. Progress bar hiển thị % upload (cho file gần limit).
3. **AC3: Upload Success** - Khi chọn file hợp lệ (≤ 5MB), progress bar hiển thị từ 0% → 100%, file được lưu vào storage (local/S3), attachment record được tạo với file_name, file_url, file_size, uploaded_at, uploaded_by, và UI hiển thị file trong danh sách attachments
4. **AC4: Upload Timeout** - Khi upload progress > 30 seconds, UI hiển thị timeout error "Upload quá时限. Vui lòng thử lại." và file không được lưu
5. **AC5: Total Size Validation (Per Proposal)** - Khi total attachments size > 50MB (per proposal cap), UI hiển thị warning "Tổng dung lượng đã vượt giới hạn (50MB/proposal)"

## Tasks / Subtasks

- [x] **Task 1: Backend - Attachments Module & Database** (AC: 3, 5)
  - [x] Subtask 1.1: Create `attachments` table in Prisma schema (id, proposal_id, file_name, file_url, file_size, mime_type, uploaded_at, uploaded_by, deleted_at)
  - [x] Subtask 1.2: Create AttachmentsModule with controller, service, DTOs
  - [x] Subtask 1.3: Add POST /api/proposals/:id/attachments endpoint (multipart/form-data)
  - [x] Subtask 1.4: Add GET /api/proposals/:id/attachments endpoint (list all attachments)
  - [x] Subtask 1.5: Add file size validation (5MB per file, 50MB total per proposal)
  - [x] Subtask 1.6: Implement file storage (local: /uploads directory, with Docker volume)

- [x] **Task 2: Backend - File Upload Processing** (AC: 2, 3, 4)
  - [x] Subtask 2.1: Implement file validation (mime type check: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG)
  - [x] Subtask 2.2: Implement progress tracking via upload session or callback
  - [x] Subtask 2.3: Generate unique file names (UUID + original extension) to prevent collisions
  - [x] Subtask 2.4: Add audit event logging (ATTACHMENT_UPLOAD)
  - [x] Subtask 2.5: Set 30-second timeout for upload processing

- [x] **Task 3: Frontend - Upload Component** (AC: 1, 2, 3)
  - [x] Subtask 3.1: Create FileUpload component with drag-drop support
  - [x] Subtask 3.2: Implement file picker with accept attribute (.pdf,.doc,.docx,.xls,.xlsx,.jpg,.png)
  - [x] Subtask 3.3: Create ProgressBar component (0% → 100%)
  - [x] Subtask 3.4: Implement client-side file size validation (show error before upload)
  - [x] Subtask 3.5: Display error message "File quá 5MB..." when file > limit

- [x] **Task 4: Frontend - Attachments List Display** (AC: 3, 5)
  - [x] Subtask 4.1: Create AttachmentList component to display uploaded files
  - [x] Subtask 4.2: Display file_name, file_size (formatted), uploaded_at for each attachment
  - [x] Subtask 4.3: Add download button per attachment
  - [x] Subtask 4.4: Calculate and display total size of all attachments
  - [x] Subtask 4.5: Show warning when total size > 50MB

- [x] **Task 5: Frontend - Error Handling** (AC: 2, 4)
  - [x] Subtask 5.1: Display toast error on timeout (> 30s): "Upload quá时限. Vui lòng thử lại."
  - [x] Subtask 5.2: Handle network errors with retry option
  - [x] Subtask 5.3: Show validation errors from backend (mime type, file size)

- [x] **Task 6: Integration with Proposal Edit Page** (AC: All)
  - [x] Subtask 6.1: Add Attachments section to Proposal Edit page
  - [x] Subtask 6.2: Integrate FileUpload component with attachments API
  - [x] Subtask 6.3: Load existing attachments when page opens
  - [x] Subtask 6.4: Disable upload when proposal not in DRAFT state

- [x] **Task 7: Testing** (AC: All)
  - [x] Subtask 7.1: Unit tests for file validation (mime type, size)
  - [x] Subtask 7.2: Unit tests for total size calculation
  - [x] Subtask 7.3: Integration tests for upload flow (success + error cases)
  - [x] Subtask 7.4: E2E test for complete upload workflow

## Dev Notes

### EPIC ANALYSIS

**Epic 2: Proposal Draft + Attachments + Form Registry**
- **Objective:** Giảng viên tạo đề tài, lưu nháp với auto-save, upload tài liệu đính kèm, Form Registry chuẩn
- **FRs covered:** FR6 (Attachments - Upload tài liệu đính kèm)
- **Epic Status:** In-progress (Stories 2.1, 2.2, 2.3 completed)

**Our Story Position in Epic:**
- Story 2.1 (Form Registry) ✅ Done - Provides canonical section IDs and form templates
- Story 2.2 (Create Proposal) ✅ Done - Provides proposal CRUD with form_data structure
- Story 2.3 (Auto-Save) ✅ Done - Adds auto-save capability for DRAFT proposals
- **Story 2.4 (Upload Attachments) 🎯 Current Story** - Adds file upload capability
- Story 2.5 (Attachment CRUD) - Next story (replace, delete functionality)
- Story 2.6 (Proposal Master Record) - Finalizes Epic 2

### PREVIOUS STORY INTELLIGENCE

**Story 2.1 (Form Registry) - Done:**
- Created `FormTemplate` and `FormSection` models with canonical section IDs
- API endpoints: GET /api/form-templates, GET /api/form-templates/:id
- Seed data: MAU_01B through MAU_18B templates
- **Key file:** `apps/src/modules/form-templates/form-templates.service.ts`

**Story 2.2 (Create Proposal) - Done:**
- Created `Proposals` module with CRUD operations
- Database schema includes: `form_data` (JSON), `template_id`, `template_version`
- API endpoints: POST /api/proposals, GET /api/proposals/:id, PUT /api/proposals/:id
- FormDataValidationService validates form data against template requirements
- Proposal code generation: DT-001, DT-002, etc.
- **Key files:**
  - `apps/src/modules/proposals/proposals.service.ts`
  - `apps/src/modules/proposals/form-data-validation.service.ts`
  - `apps/src/modules/proposals/dto/proposal.dto.ts`

**Story 2.3 (Auto-Save) - Done:**
- PATCH /api/proposals/:id/auto-save endpoint
- Deep merge strategy for form_data
- Optimistic locking with `expectedUpdatedAt` parameter
- useAutoSave hook with 2-second debounce
- SaveIndicator component
- **Key learnings:**
  - Test Infrastructure Fix: Bypass NestJS DI in tests by manually creating service instances
  - Fixed race condition using atomic `$queryRaw()` with SQL `MAX()`
  - Fixed lost `this` context in array `map()` callbacks
  - Form data structure: `{ "SEC_INFO_GENERAL": { title: "..." }, "SEC_BUDGET": { ... } }`

### ARCHITECTURE COMPLIANCE

**Tech Stack:**
- Backend: NestJS 10.x + Prisma 5.x + PostgreSQL 16
- Frontend: React 18 + TypeScript 5.x + TanStack Query 5.x + shadcn/ui
- Module location: `apps/api/src/modules/attachments/` (NEW module for this story)
- File storage: Local filesystem (`/app/uploads` with Docker volume)

**Key Architectural Patterns to Follow:**

1. **API Response Format (CRITICAL):**
   ```typescript
   // Success
   { success: true, data: {...}, meta: {...} }

   // Error
   { success: false, error: { code: "ERROR_CODE", message: "...", details: [] } }
   ```

2. **Database Naming (CRITICAL):**
   - Tables/Columns: `snake_case` (file_name, file_url, file_size, uploaded_at)
   - JavaScript/TypeScript: `camelCase` (fileName, fileUrl, fileSize, uploadedAt)

3. **Use Prisma Types (REQUIRED):**
   ```typescript
   import { Attachment, Proposal } from '@prisma/client';
   // NEVER redefine types that Prisma generates
   ```

4. **RBAC Authorization:**
   - Upload endpoint: Only owner (PROJECT_OWNER context) can upload to their own DRAFT proposals
   - Use `@RequirePermissions()` or equivalent guard from Story 1.2

5. **Audit Event Logging:**
   - Log `ATTACHMENT_UPLOAD` action when file is uploaded
   - Include: proposal_id, actor_user_id, metadata: { file_name, file_size }

**SLA & State Machine Context:**
- Upload ONLY works for `ProjectState.DRAFT`
- Once proposal transitions to `FACULTY_REVIEW`, attachments become read-only

### TECHNICAL REQUIREMENTS

**Backend Implementation Details:**

**1. Attachments Table Schema:**
```prisma
model Attachment {
  id          String   @id @default(uuid())
  proposalId  String
  proposal    Proposal @relation(fields: [proposalId], references: [id])

  fileName    String   @map("file_name")
  fileUrl     String   @map("file_url")
  fileSize    Int      @map("file_size")      // in bytes
  mimeType    String   @map("mime_type")

  uploadedBy  String   @map("uploaded_by")
  uploadedAt  DateTime @default(now()) @map("uploaded_at")

  deletedAt   DateTime? @map("deleted_at")

  @@map("attachments")
}
```

**2. Upload Endpoint Design:**
```typescript
// POST /api/proposals/:id/attachments
// Content-Type: multipart/form-data
Request: FormData {
  file: File
}

Response: {
  success: true,
  data: {
    id: "uuid",
    fileName: "document.pdf",
    fileUrl: "/uploads/uuid-document.pdf",
    fileSize: 1234567,
    mimeType: "application/pdf",
    uploadedAt: "2026-01-06T10:30:00Z"
  }
}

Error: {
  success: false,
  error: {
    code: "FILE_TOO_LARGE",
    message: "File quá 5MB. Vui lòng nén hoặc chia nhỏ.",
    details: []
  }
}
```

**3. File Size Validation:**
```typescript
// Config values (should be configurable via environment)
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_TIMEOUT = 30000; // 30 seconds

// In attachments.service.ts
async uploadFile(proposalId: string, file: Express.Multer.File, userId: string) {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
  }

  // Validate total size for proposal
  const currentTotal = await this.prisma.attachment.aggregate({
    where: { proposalId, deletedAt: null },
    _sum: { fileSize: true }
  });

  if ((currentTotal._sum.fileSize || 0) + file.size > MAX_TOTAL_SIZE) {
    throw new BadRequestException('Tổng dung lượng đã vượt giới hạn (50MB/proposal)');
  }

  // ... rest of upload logic
}
```

**4. Mime Type Validation:**
```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png'
];

if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
  throw new BadRequestException('Định dạng file không được hỗ trợ.');
}
```

**Frontend Implementation Details:**

**1. FileUpload Component Pattern:**
```typescript
// apps/web/src/components/forms/FileUpload.tsx
interface FileUploadProps {
  proposalId: string;
  onUploadSuccess: (attachment: Attachment) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ proposalId, onUploadSuccess, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
      return;
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      toast.error('Định dạng file không được hỗ trợ.');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Upload with progress tracking
      const result = await uploadAttachment(proposalId, file, (progress) => {
        setProgress(progress);
      });

      onUploadSuccess(result);
      toast.success('Upload thành công');
    } catch (error) {
      if (error.code === 'TIMEOUT') {
        toast.error('Upload quá时限. Vui lòng thử lại.');
      } else {
        toast.error(error.message || 'Upload thất bại.');
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="border-2 border-dashed rounded-lg p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
        disabled={disabled || uploading}
      />
      {/* Drag-drop zone, progress bar, etc. */}
    </div>
  );
};
```

**2. ProgressBar Component:**
```typescript
// apps/web/src/components/ui/ProgressBar.tsx
interface ProgressBarProps {
  progress: number; // 0-100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
```

**3. AttachmentList Component:**
```typescript
// apps/web/src/components/forms/AttachmentList.tsx
interface AttachmentListProps {
  proposalId: string;
  attachments: Attachment[];
  totalSize: number;
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, totalSize }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const maxSize = 50 * 1024 * 1024; // 50MB
  const isOverLimit = totalSize > maxSize;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Tài liệu đính kèm</h3>
        <span className="text-sm text-gray-600">
          {formatFileSize(totalSize)} / 50 MB
        </span>
      </div>

      {isOverLimit && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded mb-2">
          ⚠️ Tổng dung lượng đã vượt giới hạn (50MB/proposal)
        </div>
      )}

      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center justify-between p-2 border-b">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {attachment.fileName}
            <span className="text-sm text-gray-500">
              ({formatFileSize(attachment.fileSize)})
            </span>
          </span>
          <Button variant="ghost" size="sm" asChild>
            <a href={attachment.fileUrl} download>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
};
```

### FILE STRUCTURE REQUIREMENTS

**Backend Module (new for this story):**
```
apps/api/src/modules/attachments/
├── attachments.controller.ts       // POST /:id/attachments, GET /:id/attachments
├── attachments.service.ts          // Upload logic, validation
├── dto/
│   ├── upload-attachment.dto.ts   // File DTO
│   └── index.ts
├── attachments.module.ts
└── attachments.service.spec.ts     // Tests
```

**Update Proposals Module:**
```
apps/api/src/modules/proposals/
├── proposals.service.ts            // Add relation to attachments
└── dto/proposal.dto.ts             // Add attachments field to response DTOs
```

**Frontend Components (new for this story):**
```
web-apps/src/
├── components/
│   └── forms/
│       ├── FileUpload.tsx          // Upload component with drag-drop
│       ├── ProgressBar.tsx         // Progress indicator
│       ├── AttachmentList.tsx      // List of uploaded files
│       └── index.ts
├── lib/
│   └── api/
│       └── attachments.ts          // Attachments API client
└── app/proposals/[id]/
    └── edit/
        └── page.tsx                // Add Attachments section
```

### TESTING REQUIREMENTS

**Unit Tests (Backend):**
```typescript
// attachments.service.spec.ts
describe('AttachmentsService', () => {
  describe('uploadFile', () => {
    it('should reject file larger than 5MB');
    it('should reject file with invalid mime type');
    it('should reject when total size exceeds 50MB');
    it('should upload valid file and create attachment record');
    it('should log ATTACHMENT_UPLOAD audit event');
    it('should generate unique file names');
  });
});
```

**Unit Tests (Frontend):**
```typescript
// FileUpload.spec.tsx
describe('FileUpload', () => {
  it('should validate file size before upload');
  it('should validate file type before upload');
  it('should show progress during upload');
  it('should call onUploadSuccess after complete');
  it('should show timeout error after 30 seconds');
});
```

**Integration Tests:**
```typescript
// upload.integration.spec.ts
describe('Upload flow', () => {
  it('should upload file and create attachment record');
  it('should list all attachments for proposal');
  it('should calculate total size correctly');
  it('should prevent upload when proposal not in DRAFT state');
});
```

### VALIDATION RULES

**File Type Validation:**
- Allowed extensions: .pdf, .doc, .docx, .xls, .xlsx, .jpg, .jpeg, .png
- Corresponding MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.

**File Size Validation:**
- Per file limit: 5MB (configurable via env var)
- Total per proposal: 50MB (configurable via env var)

**State Validation:**
- Upload only allowed when proposal.state === 'DRAFT'
- Other states should return 403 Forbidden

### ERROR HANDLING

**Error Messages (Vietnamese):**
```
File too large: "File quá 5MB. Vui lòng nén hoặc chia nhỏ."
Invalid type: "Định dạng file không được hỗ trợ."
Total size exceeded: "Tổng dung lượng đã vượt giới hạn (50MB/proposal)"
Upload timeout: "Upload quá时限. Vui lòng thử lại."
Not in draft: "Không thể tải lên khi hồ sơ không ở trạng thái nháp."
```

### DEPENDENCIES

**Prerequisites (Completed):**
- ✅ Story 1.1 (Authentication) - User auth required
- ✅ Story 1.2 (RBAC) - Owner-only access control
- ✅ Story 2.2 (Create Proposal) - Proposals module foundation
- ✅ Story 2.3 (Auto-Save) - Proposal edit page with auto-save

**Blocking:**
- Story 2.5 (Attachment CRUD) - Can replace/delete uploaded files

### REFERENCES

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.4](../planning-artifacts/epics.md) - Epic 2 stories breakdown (lines 641-680)
- [Source: _bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) - Architecture decisions
- [Source: _bmad-output/project-context.md](../project-context.md) - Project rules and patterns
- Story 2.1: Form Registry (prerequisite for form structure)
- Story 2.2: Create Proposal (proposals module foundation)
- Story 2.3: Auto-Save (proposal edit page integration)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

No issues encountered during story creation.

### Completion Notes List

#### Story Analysis (Complete)

1. **Epic 2 Context:**
   - Objective: Giảng viên tạo đề tài, lưu nháp với auto-save, upload tài liệu đính kèm
   - FR covered: FR6 (Attachments)
   - Story position: Story 2.4 (after 2.1, 2.2, 2.3; before 2.5, 2.6)

2. **Story Foundation (from epics.md):**
   - User story: Upload attachments for proposal
   - Acceptance criteria: 5 ACs covering file picker, size validation, upload success, timeout, total size
   - Tech specs: 5MB/file cap, 50MB total, 30s timeout, local/S3 storage

3. **Previous Story Intelligence:**
   - Story 2.1: Form Registry (canonical section IDs, templates)
   - Story 2.2: Create Proposal (proposals module, form_data structure)
   - Story 2.3: Auto-Save (deep merge, test patterns, form data structure)
   - Key learnings: Prisma patterns, API response format, audit logging, RBAC guards

4. **Architecture Compliance:**
   - NestJS 10.x + Prisma 5.x + PostgreSQL 16
   - React 18 + TypeScript 5.x + TanStack Query 5.x + shadcn/ui
   - API response format: { success, data, error }
   - Database naming: snake_case (DB), camelCase (JS)
   - RBAC: Owner-only for own DRAFT proposals
   - Audit logging: ATTACHMENT_UPLOAD event

5. **Technical Requirements:**
   - NEW Attachments module (not extending proposals)
   - Attachments table with relation to Proposal
   - Multipart file upload with progress tracking
   - File validation: type, size, total size
   - State validation: DRAFT only

#### Implementation Plan (Ready for Dev)

**Backend:**
- Create `apps/api/src/modules/attachments/` module
- Attachments Prisma model with Proposal relation
- POST /api/proposals/:id/attachments endpoint
- GET /api/proposals/:id/attachments endpoint
- File validation (mime type, size, total)
- Audit event logging

**Frontend:**
- FileUpload component with drag-drop
- ProgressBar component
- AttachmentList component
- Integration with Proposal Edit page
- Error handling (timeout, validation)

**Testing:**
- Unit tests for validation logic
- Integration tests for upload flow
- E2E test for complete workflow

### File List

**Backend Files to Create:**
- `apps/src/modules/attachments/attachments.module.ts`
- `apps/src/modules/attachments/attachments.controller.ts`
- `apps/src/modules/attachments/attachments.service.ts`
- `apps/src/modules/attachments/dto/upload-attachment.dto.ts`
- `apps/src/modules/attachments/dto/index.ts`
- `apps/src/modules/attachments/attachments.service.spec.ts`
- `prisma/schema.prisma` - Add Attachment model

**Frontend Files to Create:**
- `web-apps/src/components/forms/FileUpload.tsx`
- `web-apps/src/components/forms/ProgressBar.tsx`
- `web-apps/src/components/forms/AttachmentList.tsx`
- `web-apps/src/lib/api/attachments.ts`
- `web-apps/src/app/proposals/[id]/edit/page.tsx` - Update to add Attachments section

**Config Files to Update:**
- Environment variables: MAX_FILE_SIZE, MAX_TOTAL_SIZE, UPLOAD_TIMEOUT
