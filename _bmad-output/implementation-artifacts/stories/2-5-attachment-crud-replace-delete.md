# Story 2.5: Attachment CRUD (Replace, Delete)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Giảng viên (PROJECT_OWNER)**,
I want **thay thế hoặc xóa tài liệu đã upload**,
So that **tôi có thể cập nhật hồ sơ khi có version mới**.

## Acceptance Criteria

1. **AC1: Replace Attachment (DRAFT only)** - ✅ Done - Giảng viên đang ở màn hình Edit Proposal (DRAFT state), khi click button "Thay thế" trên attachment, UI hiển thị file picker, sau khi chọn file mới: file cũ bị xóa khỏi storage, file mới được upload, attachment record được update với file_url mới
2. **AC2: Delete Attachment (DRAFT only)** - ✅ Done - Giảng viên đang ở màn hình Edit Proposal (DRAFT state), khi click button "Xóa" trên attachment, UI hiển thị confirm dialog, sau khi confirm: file bị xóa khỏi storage, attachment record bị soft delete
3. **AC3: Edit Prevention (Non-DRAFT)** - ✅ Done - Khi proposal đã submit (không còn DRAFT), nếu user cố thay thế/xóa attachment, UI hiển thị lỗi "Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa."

## Tasks / Subtasks

- [x] **Task 1: Backend - Replace Endpoint** (AC: 1)
  - [x] Subtask 1.1: Add PUT /api/proposals/:id/attachments/:attachmentId endpoint
  - [x] Subtask 1.2: Validate proposal state = DRAFT before allowing replace
  - [x] Subtask 1.3: Delete old file from storage
  - [x] Subtask 1.4: Upload and save new file
  - [x] Subtask 1.5: Update attachment record with new file_url, file_size, mime_type, uploaded_at
  - [x] Subtask 1.6: Log audit event (ATTACHMENT_REPLACE)

- [x] **Task 2: Backend - Delete Endpoint** (AC: 2, 3)
  - [x] Subtask 2.1: Add DELETE /api/proposals/:id/attachments/:attachmentId endpoint
  - [x] Subtask 2.2: Validate proposal state = DRAFT before allowing delete
  - [x] Subtask 2.3: Soft delete attachment record (set deleted_at timestamp)
  - [x] Subtask 2.4: Delete file from storage
  - [x] Subtask 2.5: Log audit event (ATTACHMENT_DELETE)

- [x] **Task 3: Backend - Error Handling** (AC: 3)
  - [x] Subtask 3.1: Return 403 with error code when proposal not in DRAFT state
  - [x] Subtask 3.2: Return 404 when attachment not found or already deleted
  - [x] Subtask 3.3: Return 403 when user is not the proposal owner
  - [x] Subtask 3.4: Handle storage deletion errors gracefully

- [x] **Task 4: Frontend - Replace Button & Flow** (AC: 1)
  - [x] Subtask 4.1: Add "Thay thế" button to each attachment item in AttachmentList
  - [x] Subtask 4.2: Show button only when proposal.state === 'DRAFT'
  - [x] Subtask 4.3: Trigger file picker on click
  - [x] Subtask 4.4: Show upload progress during replace operation
  - [x] Subtask 4.5: Update attachment list on success (refresh file info)

- [x] **Task 5: Frontend - Delete Button & Confirmation** (AC: 2)
  - [x] Subtask 5.1: Add "Xóa" button to each attachment item in AttachmentList
  - [x] Subtask 5.2: Show confirmation dialog with message: "Bạn có chắc muốn xóa tài liệu này?"
  - [x] Subtask 5.3: Call delete API on confirm
  - [x] Subtask 5.4: Remove attachment from list on success
  - [x] Subtask 5.5: Show toast notification on success/error

- [x] **Task 6: Frontend - State-Based UI Gating** (AC: 3)
  - [x] Subtask 6.1: Hide replace/delete buttons when proposal.state !== 'DRAFT'
  - [x] Subtask 6.2: Show read-only message when user hovers over disabled actions
  - [x] Subtask 6.3: Display error dialog if replace/delete attempted on non-DRAFT proposal
  - [x] Subtask 6.4: Suggest contacting admin for post-submission changes

- [x] **Task 7: Testing** (AC: All)
  - [x] Subtask 7.1: Unit tests for replace endpoint (file swap, storage cleanup)
  - [x] Subtask 7.2: Unit tests for delete endpoint (soft delete, storage cleanup)
  - [x] Subtask 7.3: Unit tests for state validation (DRAFT only)
  - [x] Subtask 7.4: Unit tests for RBAC (owner-only)
  - [x] Subtask 7.5: Integration tests for complete replace flow
  - [x] Subtask 7.6: Integration tests for complete delete flow
  - [x] Subtask 7.7: E2E test for replace then delete workflow

## Dev Notes

### EPIC ANALYSIS

**Epic 2: Proposal Draft + Attachments + Form Registry**
- **Objective:** Giảng viên tạo đề tài, lưu nháp với auto-save, upload tài liệu đính kèm, Form Registry chuẩn
- **FRs covered:** FR6 (Attachments - Replace/Delete functionality)
- **Epic Status:** In-progress (Stories 2.1, 2.2, 2.3, 2.4 completed)

**Our Story Position in Epic:**
- Story 2.1 (Form Registry) ✅ Done - Provides canonical section IDs and form templates
- Story 2.2 (Create Proposal) ✅ Done - Provides proposal CRUD with form_data structure
- Story 2.3 (Auto-Save) ✅ Done - Adds auto-save capability for DRAFT proposals
- Story 2.4 (Upload Attachments) ✅ Done - Adds file upload capability with Attachments module
- **Story 2.5 (Attachment CRUD) 🎯 Current Story** - Adds replace and delete functionality
- Story 2.6 (Proposal Master Record) - Next story (finalizes Epic 2)

### STORY FOUNDATION (from epics.md)

**User Story Statement:**
- As a Giảng viên (PROJECT_OWNER)
- I want thay thế hoặc xóa tài liệu đã upload
- So that tôi có thể cập nhật hồ sơ khi có version mới

**Acceptance Criteria (from epics.md lines 683-712):**
1. Replace: Click "Thay thế" → file picker opens → old file deleted from storage → new file uploaded → attachment record updated
2. Delete: Click "Xóa" → confirm dialog → file deleted from storage → soft delete record
3. State validation: Non-DRAFT proposals show error "Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa."

### PREVIOUS STORY INTELLIGENCE

**Story 2.4 (Upload Attachments) - Done:**
- Created `attachments` table with Prisma schema
- Created AttachmentsModule with controller, service, DTOs
- POST /api/proposals/:id/attachments endpoint (upload)
- GET /api/proposals/:id/attachments endpoint (list)
- File size validation (5MB per file, 50MB total per proposal)
- Local file storage at `/app/uploads` with Docker volume
- **Key files:**
  - `apps/src/modules/attachments/attachments.controller.ts`
  - `apps/src/modules/attachments/attachments.service.ts`
  - `apps/src/modules/attachments/dto/upload-attachment.dto.ts`
  - `web-apps/src/components/forms/FileUpload.tsx`
  - `web-apps/src/components/forms/AttachmentList.tsx`
  - `web-apps/src/lib/api/attachments.ts`

**Key Learnings from Story 2.4:**
- Use `Express.Multer.File` for file handling in NestJS
- File naming: `UUID + original extension` to prevent collisions
- Client-side validation before upload (file size, type)
- Progress tracking via `axios` progress callbacks
- TanStack Query mutations for API calls
- Toast notifications for user feedback

**Story 2.3 (Auto-Save) - Done:**
- Deep merge strategy for form_data updates
- Optimistic locking with `expectedUpdatedAt` parameter
- Race condition fix using atomic `$queryRaw()` with SQL `MAX()`

### ARCHITECTURE COMPLIANCE

**Tech Stack:**
- Backend: NestJS 10.x + Prisma 5.x + PostgreSQL 16
- Frontend: React 18 + TypeScript 5.x + TanStack Query 5.x + shadcn/ui
- Module location: `apps/api/src/modules/attachments/` (EXTEND existing module from Story 2.4)
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
   - Tables/Columns: `snake_case` (deleted_at for soft delete)
   - JavaScript/TypeScript: `camelCase` (deletedAt)

3. **Use Prisma Types (REQUIRED):**
   ```typescript
   import { Attachment, Proposal, ProjectState } from '@prisma/client';
   ```

4. **RBAC Authorization:**
   - Replace/Delete endpoints: Only owner (PROJECT_OWNER context) can modify their own DRAFT proposals
   - Use `@RequirePermissions()` or equivalent guard from Story 1.2

5. **Audit Event Logging:**
   - Log `ATTACHMENT_REPLACE` action when file is replaced
   - Log `ATTACHMENT_DELETE` action when file is deleted
   - Include: proposal_id, attachment_id, actor_user_id, metadata: { old_file_name, new_file_name }

6. **Soft Delete Pattern:**
   - Use `deletedAt` timestamp for soft delete (NOT hard delete from DB)
   - Physical file deletion from storage is still required
   - Filter out `deletedAt != null` in GET requests

**SLA & State Machine Context:**
- Replace/Delete ONLY works for `ProjectState.DRAFT`
- Once proposal transitions to `FACULTY_REVIEW` or beyond, attachments become immutable
- Error code: `PROPOSAL_NOT_DRAFT` for non-DRAFT proposals

### TECHNICAL REQUIREMENTS

**Backend Implementation Details:**

**1. Replace Endpoint Design:**
```typescript
// PUT /api/proposals/:id/attachments/:attachmentId
// Content-Type: multipart/form-data
Request: FormData {
  file: File
}

Response: {
  success: true,
  data: {
    id: "uuid",
    fileName: "new-document.pdf",
    fileUrl: "/uploads/uuid-new-document.pdf",
    fileSize: 1234567,
    mimeType: "application/pdf",
    uploadedAt: "2026-01-06T10:30:00Z"
  }
}

Error: {
  success: false,
  error: {
    code: "PROPOSAL_NOT_DRAFT",
    message: "Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.",
    details: []
  }
}
```

**2. Delete Endpoint Design:**
```typescript
// DELETE /api/proposals/:id/attachments/:attachmentId

Response: {
  success: true,
  data: {
    id: "uuid",
    deletedAt: "2026-01-06T10:30:00Z"
  }
}

Error: {
  success: false,
  error: {
    code: "ATTACHMENT_NOT_FOUND",
    message: "Tài liệu không tồn tại hoặc đã bị xóa.",
    details: []
  }
}
```

**3. Replace Service Logic:**
```typescript
// In attachments.service.ts
async replaceAttachment(
  proposalId: string,
  attachmentId: string,
  newFile: Express.Multer.File,
  userId: string
) {
  // 1. Validate proposal exists and is DRAFT
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId }
  });

  if (!proposal) {
    throw new NotFoundException('Proposal not found');
  }

  if (proposal.state !== ProjectState.DRAFT) {
    throw new ForbiddenException(
      'Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.'
    );
  }

  // 2. Find existing attachment
  const attachment = await this.prisma.attachment.findUnique({
    where: { id: attachmentId }
  });

  if (!attachment || attachment.deletedAt) {
    throw new NotFoundException('Tài liệu không tồn tại hoặc đã bị xóa.');
  }

  // 3. Validate new file
  if (newFile.size > MAX_FILE_SIZE) {
    throw new BadRequestException('File quá 5MB. Vui lòng nén hoặc chia nhỏ.');
  }

  // 4. Delete old file from storage
  await this.storageService.deleteFile(attachment.fileUrl);

  // 5. Upload new file
  const newFileUrl = await this.storageService.saveFile(newFile);

  // 6. Update attachment record
  const updated = await this.prisma.attachment.update({
    where: { id: attachmentId },
    data: {
      fileUrl: newFileUrl,
      fileName: newFile.originalname,
      fileSize: newFile.size,
      mimeType: newFile.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date()
    }
  });

  // 7. Log audit event
  await this.auditService.log({
    action: 'ATTACHMENT_REPLACE',
    entityId: proposalId,
    entityType: 'proposal',
    actorId: userId,
    metadata: {
      attachmentId,
      oldFileName: attachment.fileName,
      newFileName: newFile.originalname
    }
  });

  return updated;
}
```

**4. Delete Service Logic:**
```typescript
// In attachments.service.ts
async deleteAttachment(
  proposalId: string,
  attachmentId: string,
  userId: string
) {
  // 1. Validate proposal is DRAFT
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId }
  });

  if (proposal.state !== ProjectState.DRAFT) {
    throw new ForbiddenException(
      'Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa.'
    );
  }

  // 2. Find attachment
  const attachment = await this.prisma.attachment.findUnique({
    where: { id: attachmentId }
  });

  if (!attachment || attachment.deletedAt) {
    throw new NotFoundException('Tài liệu không tồn tại hoặc đã bị xóa.');
  }

  // 3. Soft delete attachment record
  const deleted = await this.prisma.attachment.update({
    where: { id: attachmentId },
    data: { deletedAt: new Date() }
  });

  // 4. Delete physical file from storage
  await this.storageService.deleteFile(attachment.fileUrl);

  // 5. Log audit event
  await this.auditService.log({
    action: 'ATTACHMENT_DELETE',
    entityId: proposalId,
    entityType: 'proposal',
    actorId: userId,
    metadata: {
      attachmentId,
      fileName: attachment.fileName
    }
  });

  return deleted;
}
```

**Frontend Implementation Details:**

**1. Updated AttachmentList Component:**
```typescript
// web-apps/src/components/forms/AttachmentList.tsx
interface AttachmentListProps {
  proposalId: string;
  proposalState: string;
  attachments: Attachment[];
  totalSize: number;
  onReplace: (attachmentId: string, file: File) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
}

const AttachmentList: React.FC<AttachmentListProps> = ({
  proposalId,
  proposalState,
  attachments,
  totalSize,
  onReplace,
  onDelete
}) => {
  const isDraft = proposalState === 'DRAFT';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>();

  const handleReplaceClick = (attachmentId: string) => {
    setSelectedAttachmentId(attachmentId);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedAttachmentId) {
      await onReplace(selectedAttachmentId, file);
      setSelectedAttachmentId(undefined);
    }
  };

  const handleDeleteClick = async (attachmentId: string, fileName: string) => {
    const confirmed = await confirmDialog({
      title: 'Xóa tài liệu',
      message: `Bạn có chắc muốn xóa "${fileName}"?`
    });

    if (confirmed) {
      await onDelete(attachmentId);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
      />

      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{attachment.fileName}</span>
            <span className="text-sm text-gray-500">
              ({formatFileSize(attachment.fileSize)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Download button - always available */}
            <Button variant="ghost" size="sm" asChild>
              <a href={attachment.fileUrl} download>
                <Download className="h-4 w-4" />
              </a>
            </Button>

            {/* Replace button - DRAFT only */}
            {isDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReplaceClick(attachment.id)}
                title="Thay thế tài liệu"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {/* Delete button - DRAFT only */}
            {isDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(attachment.id, attachment.fileName)}
                title="Xóa tài liệu"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* Show tooltip for non-DRAFT */}
            {!isDraft && (
              <Tooltip content="Không thể sửa sau khi nộp">
                <Lock className="h-4 w-4 text-gray-400" />
              </Tooltip>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

**2. Replace Mutation:**
```typescript
// web-apps/src/lib/api/attachments.ts
export const useReplaceAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, attachmentId, file }: {
      proposalId: string;
      attachmentId: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.put(
        `/api/proposals/${proposalId}/attachments/${attachmentId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      toast.success('Thay thế tài liệu thành công');
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.code === 'PROPOSAL_NOT_DRAFT') {
        toast.error(error.response.data.error.message);
      } else {
        toast.error('Thay thế tài liệu thất bại');
      }
    }
  });
};
```

**3. Delete Mutation:**
```typescript
// web-apps/src/lib/api/attachments.ts
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proposalId, attachmentId }: {
      proposalId: string;
      attachmentId: string;
    }) => {
      const response = await axios.delete(
        `/api/proposals/${proposalId}/attachments/${attachmentId}`
      );

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      toast.success('Xóa tài liệu thành công');
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.code === 'PROPOSAL_NOT_DRAFT') {
        toast.error(error.response.data.error.message);
      } else {
        toast.error('Xóa tài liệu thất bại');
      }
    }
  });
};
```

### FILE STRUCTURE REQUIREMENTS

**Update Existing Attachments Module:**
```
apps/api/src/modules/attachments/
├── attachments.controller.ts       // ADD: PUT /:id/attachments/:attachmentId, DELETE /:id/attachments/:attachmentId
├── attachments.service.ts          // ADD: replaceAttachment(), deleteAttachment()
├── dto/
│   ├── upload-attachment.dto.ts    // Existing
│   ├── replace-attachment.dto.ts   // NEW: File DTO for replace
│   └── index.ts
├── attachments.module.ts           // UPDATE: Add File upload field for PUT
└── attachments.service.spec.ts     // ADD: tests for replace, delete
```

**Add Storage Service (if not exists):**
```
apps/api/src/modules/storage/
├── storage.service.ts              // NEW: File storage operations (save, delete)
├── storage.module.ts
└── storage.service.spec.ts
```

**Update Frontend Components:**
```
web-apps/src/
├── components/
│   └── forms/
│       ├── AttachmentList.tsx      // UPDATE: Add replace/delete buttons
│       └── ConfirmDialog.tsx       // NEW: Reusable confirmation dialog
├── lib/
│   └── api/
│       └── attachments.ts          // UPDATE: Add replaceAttachment, deleteAttachment
```

### TESTING REQUIREMENTS

**Unit Tests (Backend):**
```typescript
// attachments.service.spec.ts
describe('AttachmentsService', () => {
  describe('replaceAttachment', () => {
    it('should reject when proposal is not in DRAFT state');
    it('should reject when attachment not found');
    it('should delete old file and save new file');
    it('should update attachment record with new file info');
    it('should log ATTACHMENT_REPLACE audit event');
    it('should validate new file size');
  });

  describe('deleteAttachment', () => {
    it('should reject when proposal is not in DRAFT state');
    it('should reject when attachment not found');
    it('should soft delete attachment record');
    it('should delete physical file from storage');
    it('should log ATTACHMENT_DELETE audit event');
  });
});
```

**Unit Tests (Frontend):**
```typescript
// AttachmentList.spec.tsx
describe('AttachmentList', () => {
  it('should show replace/delete buttons when proposal is DRAFT');
  it('should hide replace/delete buttons when proposal is not DRAFT');
  it('should call onReplace when replace button clicked');
  it('should show confirmation dialog before delete');
  it('should call onDelete after confirmation');
});

// ConfirmDialog.spec.tsx
describe('ConfirmDialog', () => {
  it('should display title and message');
  it('should call onConfirm when confirm button clicked');
  it('should call onCancel when cancel button clicked');
});
```

**Integration Tests:**
```typescript
// attachment-crud.integration.spec.ts
describe('Attachment CRUD flow', () => {
  it('should upload, then replace, then delete attachment');
  it('should prevent replace when proposal submitted');
  it('should prevent delete when proposal submitted');
  it('should update total size after replace');
  it('should update total size after delete');
  it('should only owner can replace/delete their attachments');
});
```

**E2E Test:**
```typescript
// attachment-crud.e2e.spec.ts
describe('Attachment CRUD E2E', () => {
  it('should complete full replace workflow', async ({ page }) => {
    // Login as PROJECT_OWNER
    // Navigate to proposal edit (DRAFT)
    // Upload initial file
    // Click replace button
    // Select new file
    // Verify file info updated
    // Verify old file deleted from storage
  });

  it('should complete full delete workflow', async ({ page }) => {
    // Login as PROJECT_OWNER
    // Navigate to proposal edit (DRAFT)
    // Upload file
    // Click delete button
    // Confirm deletion
    // Verify file removed from list
    // Verify file deleted from storage
  });

  it('should show error when trying to edit submitted proposal', async ({ page }) => {
    // Submit proposal (state becomes FACULTY_REVIEW)
    // Try to replace attachment
    // Verify error message shown
    // Verify replace button hidden/disabled
  });
});
```

### VALIDATION RULES

**State Validation:**
- Replace/Delete ONLY allowed when `proposal.state === 'DRAFT'`
- All other states return 403 with code `PROPOSAL_NOT_DRAFT`

**Ownership Validation:**
- Only proposal owner can replace/delete attachments
- Non-owners receive 403 Forbidden

**File Validation (for replace):**
- New file must pass same validation as upload (size, mime type)
- 5MB per file limit applies to replacement file
- 50MB total limit still applies after replacement

**Error Codes:**
| Code | Message | HTTP Status |
|------|---------|-------------|
| `PROPOSAL_NOT_DRAFT` | "Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa." | 403 |
| `ATTACHMENT_NOT_FOUND` | "Tài liệu không tồn tại hoặc đã bị xóa." | 404 |
| `FORBIDDEN` | "Bạn không có quyền thực hiện hành động này." | 403 |
| `FILE_TOO_LARGE` | "File quá 5MB. Vui lòng nén hoặc chia nhỏ." | 400 |

### ERROR HANDLING

**Error Messages (Vietnamese):**
```
Not draft: "Không thể sửa sau khi nộp. Vui lòng liên hệ admin nếu cần sửa."
Not found: "Tài liệu không tồn tại hoặc đã bị xóa."
Forbidden: "Bạn không có quyền thực hiện hành động này."
File too large: "File quá 5MB. Vui lòng nén hoặc chia nhỏ."
Storage error: "Lỗi khi lưu trữ file. Vui lòng thử lại."
```

**User Feedback:**
- Success: Toast notification "Thay thế tài liệu thành công" or "Xóa tài liệu thành công"
- Error: Toast with specific error message from API
- Confirmation: Modal dialog before delete
- Progress: Show progress bar during replace operation

### DEPENDENCIES

**Prerequisites (Completed):**
- ✅ Story 1.1 (Authentication) - User auth required
- ✅ Story 1.2 (RBAC) - Owner-only access control
- ✅ Story 2.2 (Create Proposal) - Proposals module foundation
- ✅ Story 2.3 (Auto-Save) - Proposal edit page with auto-save
- ✅ Story 2.4 (Upload Attachments) - Attachments module with upload

**Storage Service Requirements:**
- New `StorageService` for file operations (save, delete)
- Handles local filesystem operations at `/app/uploads`
- Graceful error handling for missing files

**Blocking:**
- Story 2.6 (Proposal Master Record) - Completes Epic 2

### REFERENCES

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.5](../planning-artifacts/epics.md) - Epic 2 stories breakdown (lines 683-712)
- [Source: _bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) - Architecture decisions
- [Source: _bmad-output/project-context.md](../project-context.md) - Project rules and patterns
- Story 2.4: Upload Attachments (prerequisite with attachments module foundation)
- Story 2.3: Auto-Save (optimistic locking patterns)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

No issues encountered during story creation.

### Completion Notes List

#### Story Analysis (Complete)

1. **Epic 2 Context:**
   - Objective: Giảng viên tạo đề tài, lưu nháp với auto-save, upload tài liệu đính kèm
   - FR covered: FR6 (Attachments CRUD)
   - Story position: Story 2.5 (after 2.1-2.4; before 2.6)

2. **Story Foundation (from epics.md):**
   - User story: Replace or delete uploaded attachments
   - Acceptance criteria: 3 ACs covering replace, delete, and state-based prevention
   - Key constraint: Only DRAFT proposals allow modification

3. **Previous Story Intelligence:**
   - Story 2.4: Upload Attachments (attachments module, file storage, validation patterns)
   - Story 2.3: Auto-Save (optimistic locking, race condition fixes)
   - Key learnings: Multer file handling, TanStack Query mutations, soft delete pattern

4. **Architecture Compliance:**
   - Extend existing Attachments module (not create new)
   - Soft delete pattern with `deletedAt` timestamp
   - State validation: DRAFT only for modifications
   - RBAC: Owner-only access control
   - Audit logging: ATTACHMENT_REPLACE, ATTACHMENT_DELETE

#### Implementation Plan (Ready for Dev)

**Backend:**
- PUT /api/proposals/:id/attachments/:attachmentId endpoint (replace)
- DELETE /api/proposals/:id/attachments/:attachmentId endpoint (delete)
- Storage service for file operations (save, delete)
- State validation (DRAFT check)
- Audit event logging

**Frontend:**
- Update AttachmentList with replace/delete buttons
- ConfirmDialog component for delete confirmation
- Replace/Delete mutations with TanStack Query
- State-based UI gating (hide buttons for non-DRAFT)
- Progress indicator for replace operation

**Testing:**
- Unit tests for replace/delete logic
- Unit tests for state validation
- Integration tests for full CRUD workflow
- E2E test for replace then delete scenario

### File List

**Backend Files to Update:**
- `apps/src/modules/attachments/attachments.controller.ts` - ADD replace/delete endpoints
- `apps/src/modules/attachments/attachments.service.ts` - ADD replaceAttachment(), deleteAttachment()
- `apps/src/modules/attachments/dto/replace-attachment.dto.ts` - NEW file DTO
- `apps/src/modules/attachments/dto/index.ts` - UPDATE exports
- `apps/src/modules/attachments/attachments.module.ts` - UPDATE for file field on PUT
- `apps/src/modules/attachments/attachments.service.spec.ts` - ADD tests

**Backend Files to Create:**
- `apps/src/modules/storage/storage.service.ts` - NEW: File storage operations
- `apps/src/modules/storage/storage.module.ts` - NEW: Storage module
- `apps/src/modules/storage/storage.service.spec.ts` - NEW: Storage tests

**Frontend Files to Update:**
- `web-apps/src/components/forms/AttachmentList.tsx` - ADD replace/delete buttons
- `web-apps/src/lib/api/attachments.ts` - ADD replaceAttachment, deleteAttachment

**Frontend Files to Create:**
- `web-apps/src/components/forms/ConfirmDialog.tsx` - NEW: Reusable confirmation dialog
