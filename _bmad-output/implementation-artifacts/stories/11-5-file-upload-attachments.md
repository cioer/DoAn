# Story 11.5: File Upload for Attachments

Status: ready-for-dev

## Story

As a **proposal owner**,
I want **to upload and manage attachments for my proposal**,
so that **I can submit supporting documents for review**.

## Acceptance Criteria

1. **AC1: Upload button on proposal detail**
   - Given User views proposal detail page
   - When User has edit permission
   - Then User should see "Thêm đính kèm" button
   - And clicking it should open upload dialog

2. **AC2: Drag and drop upload**
   - Given Upload dialog is open
   - When User drags files onto drop zone
   - Then User should see visual feedback (highlighted area)
   - And files should be added to upload queue

3. **AC3: File picker**
   - Given Upload dialog is open
   - When User clicks "Chọn file" button
   - Then System file picker should open
   - And User can select multiple files

4. **AC4: File validation**
   - Given User selects files
   - When Files are added to queue
   - Then System should validate:
     - File type: .pdf, .doc, .docx, .xls, .xlsx, .jpg, .jpeg, .png
     - File size: max 5MB per file
     - Total size: max 50MB per proposal
   - And invalid files should show error message

5. **AC5: Upload progress**
   - Given Valid files are selected
   - When Upload starts
   - Then User should see progress bar for each file
   - And progress should update in real-time

6. **AC6: Attachment list**
   - Given Proposal has attachments
   - When User views proposal detail
   - Then User should see list of attachments
   - Each showing: filename, size, upload date, actions

7. **AC7: Download attachment**
   - Given User views attachment list
   - When User clicks download button
   - Then File should download from server
   - And filename should be preserved

8. **AC8: Delete attachment**
   - Given User is proposal owner
   - When User clicks delete button
   - Then Confirmation dialog should appear
   - And File should be removed from server and list

9. **AC9: Replace attachment**
   - Given User wants to update a file
   - When User clicks replace button
   - Then New file should upload
   - And Old file should be replaced (version history)

## Tasks / Subtasks

- [ ] **Task 1: Create upload dialog** (AC: 1, 2, 3)
  - [ ] Subtask 1.1: Create `AttachmentUpload.tsx` component
  - [ ] Subtask 1.2: Add drag & drop zone with visual feedback
  - [ ] Subtask 1.3: Add "Chọn file" button with file input
  - [ ] Subtask 1.4: Modal dialog with close button

- [ ] **Task 2: Implement file validation** (AC: 4)
  - [ ] Subtask 2.1: Create `validateFile()` utility function
  - [ ] Subtask 2.2: Check file extension against allowed types
  - [ ] Subtask 2.3: Check file size (max 5MB per file)
  - [ ] Subtask 2.4: Check total size (max 50MB)
  - [ ] Subtask 2.5: Show error messages for invalid files

- [ ] **Task 3: Implement upload progress** (AC: 5)
  - [ ] Subtask 3.1: Create `UploadProgress.tsx` component
  - [ ] Subtask 3.2: Track progress for each file
  - [ ] Subtask 3.3: Show progress bar with percentage
  - [ ] Subtask 3.4: Show success/error icons when complete

- [ ] **Task 4: API integration** (AC: 5, 6, 7, 8, 9)
  - [ ] Subtask 4.1: `uploadAttachment(proposalId, file)` function
  - [ ] Subtask 4.2: `deleteAttachment(attachmentId)` function
  - [ ] Subtask 4.3: `replaceAttachment(attachmentId, file)` function
  - [ ] Subtask 4.4: `downloadAttachment(attachmentId)` function
  - [ ] Subtask 4.5: Handle upload errors gracefully

- [ ] **Task 5: Create attachment list component** (AC: 6)
  - [ ] Subtask 5.1: Create `AttachmentList.tsx` component
  - [ ] Subtask 5.2: Display as table or card list
  - [ ] Subtask 5.3: Show file icons by type (PDF, Word, Excel, Image)
  - [ ] Subtask 5.4: Format file sizes (KB, MB)
  - [ ] Subtask 5.5: Format dates (DD/MM/YYYY)

- [ ] **Task 6: Add action buttons** (AC: 7, 8, 9)
  - [ ] Subtask 6.1: Add download button per attachment
  - [ ] Subtask 6.2: Add delete button (owner only)
  - [ ] Subtask 6.3: Add replace button (owner only)
  - [ ] Subtask 6.4: Show delete confirmation dialog

- [ ] **Task 7: Upload queue management** (AC: 2, 3, 5)
  - [ ] Subtask 7.1: Maintain upload queue state
  - [ ] Subtask 7.2: Allow removing files from queue before upload
  - [ ] Subtask 7.3: Upload files sequentially
  - [ ] Subtask 7.4: Show total progress for multiple files

- [ ] **Task 8: Integrate with proposal detail** (AC: 1)
  - [ ] Subtask 8.1: Add "Thêm đính kèm" button to proposal page
  - [ ] Subtask 8.2: Position in attachments section
  - [ ] Subtask 8.3: Check edit permission before showing button
  - [ ] Subtask 8.4: Refresh list after upload/delete

- [ ] **Task 9: E2E Testing** (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [ ] Subtask 9.1: Test upload button opens dialog
  - [ ] Subtask 9.2: Test drag & drop functionality
  - [ ] Subtask 9.3: Test file validation (type, size)
  - [ ] Subtask 9.4: Test upload progress displays
  - [ ] Subtask 9.5: Test attachment list shows uploaded files
  - [ ] Subtask 9.6: Test download attachment
  - [ ] Subtask 9.7: Test delete attachment
  - [ ] Subtask 9.8: Test invalid files show errors

## Dev Notes

### Backend API Already Exists

**Attachments Controller:** `qlnckh/apps/src/modules/attachments/attachments.controller.ts`
```typescript
// Existing endpoints:
POST /api/proposals/:id/attachments - Upload attachment
GET /api/proposals/:id/attachments - List attachments
GET /api/attachments/:id/download - Download attachment
DELETE /api/attachments/:id - Delete attachment
POST /api/attachments/:id/replace - Replace attachment
```

**File Validation Rules (from backend):**
```typescript
const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx',
  '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png'
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
```

### API Request Format

```typescript
// Upload FormData
const formData = new FormData();
formData.append('file', file);
formData.append('proposalId', proposalId);

// Upload with Axios (need to set Content-Type boundary)
await apiClient.post(`/api/proposals/${id}/attachments`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (progressEvent) => {
    const progress = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    setUploadProgress(progress);
  }
});
```

### Project Structure Notes

**Files to create/modify:**
```
qlnckh/web-apps/src/
├── components/
│   └── attachments/
│       ├── AttachmentUpload.tsx (NEW)
│       ├── AttachmentList.tsx (NEW)
│       ├── UploadProgress.tsx (NEW)
│       ├── FileIcon.tsx (NEW)
│       └── FileSize.tsx (NEW)
├── lib/
│   └── utils/
│       └── fileValidation.ts (NEW)
└── hooks/
    └── useFileUpload.ts (NEW)
```

### UI/UX Requirements

**Upload Dialog:**
```
┌─────────────────────────────────────────┐
│  Tải lên tệp đính kèm                    │
├─────────────────────────────────────────┤
│                                          │
│   ╔═════════════════════════════════════╗│
│   ║                                     ║│
│   ║   📁 Kéo thả tệp vào đây            ║│
│   ║      hoặc                           ║│
│   ║   [Chọn file]                        ║│
│   ║                                     ║│
│   ║   PDF, DOC, DOCX, XLS, XLSX,        ║│
│   ║   JPG, PNG (max 5MB mỗi file)       ║│
│   ╚═════════════════════════════════════╝│
│                                          │
│   Files to upload:                       │
│   ✓ document.pdf (2.3 MB)  [X]           │
│   ✓ budget.xlsx (1.1 MB)    [X]           │
│   ✗ large.pdf (5.2 MB) - Quá 5MB         │
│                                          │
│   [Cancel]              [Upload 2 files] │
└─────────────────────────────────────────┘
```

**Attachment List:**
```
┌─────────────────────────────────────────┐
│  Tệp đính kèm (3)                        │
├─────────────────────────────────────────┤
│  📄  research_proposal.pdf    2.3 MB    │
│      08/01/2026    [⬇️] [🔄] [🗑️]         │
│                                          │
│  📊  budget.xlsx             1.1 MB    │
│      08/01/2026    [⬇️] [🔄] [🗑️]         │
│                                          │
│  🖼️  diagram.png             450 KB    │
│      07/01/2026    [⬇️] [🔄] [🗑️]         │
│                                          │
│           [+ Thêm đính kèm]              │
└─────────────────────────────────────────┘
```

### File Icons by Type

```typescript
const FILE_ICONS = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
};
```

### File Size Formatting

```typescript
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### RBAC Requirements

**Permissions:**
- `ATTACHMENT_UPLOAD` - Upload files (proposal owner, holder)
- `ATTACHMENT_DELETE` - Delete files (proposal owner only)
- `ATTACHMENT_VIEW` - View/download (all authenticated users with proposal access)

### Testing Requirements

**E2E Test Cases:**
1. Upload button opens dialog
2. Drag & drop adds files to queue
3. File picker adds files to queue
4. Invalid file type shows error
5. File > 5MB shows error
6. Upload progress displays correctly
7. Uploaded files appear in list
8. Download button downloads file
9. Delete button removes file with confirmation

### References

- Backend Attachments: `qlnckh/apps/src/modules/attachments/`
- Upload Controller: `attachments.controller.ts:60-100`
- File Validation: `attachments.service.ts:100-150`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- File upload dialog with drag & drop
- File validation for type and size
- Upload progress indicators
- Attachment list with actions
- E2E tests passing

### File List

- `qlnckh/web-apps/src/components/attachments/AttachmentUpload.tsx` (NEW)
- `qlnckh/web-apps/src/components/attachments/AttachmentList.tsx` (NEW)
- `qlnckh/web-apps/src/components/attachments/UploadProgress.tsx` (NEW)
- `qlnckh/web-apps/src/components/attachments/FileIcon.tsx` (NEW)
- `qlnckh/web-apps/src/lib/utils/fileValidation.ts` (NEW)
- `qlnckh/web-apps/src/hooks/useFileUpload.ts` (NEW)
