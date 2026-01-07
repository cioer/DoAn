# Story 6.6: ZIP Dossier Pack Export (SLA 30s, Progress, Pre-Generated Seeds)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên/Admin,
I want export ZIP trọn bộ hồ sơ dự án,
So that tôi có archive đầy đủ.

## Acceptance Criteria

1. **AC1: Export Button Visibility**
   - Given Proposal state = COMPLETED
   - When User (owner or ADMIN) mở proposal detail
   - Then UI hiển thị button "Tải xuống hồ sơ trọn bộ" (primary action)
   - And button disabled khi state ≠ COMPLETED
   - And chỉ owner hoặc ADMIN mới thấy button này

2. **AC2: ZIP Content Structure**
   - Given User click "Tải xuống hồ sơ trọn bộ"
   - When ZIP được generate thành công
   - Then ZIP chứa:
     - Folder structure theo stage:
       ```
       {code}_dossier/
       ├── 01-proposal/           # Phase A: Proposal
       │   ├── {code}_proposal.pdf
       │   ├── attachments/
       │   └── revisions/ (if any)
       ├── 02-council-evaluation/ # Phase B: Council evaluation
       │   ├── {code}_evaluation.pdf
       │   └── attachments/
       ├── 03-faculty-acceptance/# Phase C: Faculty acceptance
       │   ├── {code}_faculty_acceptance.pdf
       │   └── attachments/
       ├── 04-school-acceptance/ # Phase D: School acceptance
       │   ├── {code}_school_acceptance.pdf
       │   └── attachments/
       ├── 05-handover/          # Phase E: Handover
       │   ├── checklist.pdf
       │   └── attachments/
       └── 06-timeline/
           └── {code}_timeline.pdf
       ```

3. **AC3: SLA 30s - Fast Path (≤ 30s)**
   - Given User click "Tải xuống hồ sơ trọn bộ"
   - When ZIP generation completes ≤ 30 seconds
   - Then UI hiển thị modal với progress: "Đang tạo ZIP..."
   - And modal không đóng trong quá trình generate
   - And khi ZIP xong, UI trigger download ngay lập tức
   - And file name: "{code}_dossier.zip"
   - And modal đóng sau khi download bắt đầu

4. **AC4: SLA > 30s - Progress Path**
   - Given ZIP generation time > 30 seconds
   - When 30s elapsed nhưng ZIP chưa xong
   - Then UI update modal hiển thị: "Đang tạo ZIP... {progress}%"
   - And User có thể đóng modal (ZIP continue background)
   - And UI hiển thị toast notification: "ZIP đang được tạo..."
   - And User có thể tiếp tục làm việc khác

5. **AC5: Background Completion Notification**
   - Given ZIP đang generate background (user closed modal)
   - When ZIP hoàn thành
   - Then UI hiển thị toast: "ZIP đã sẵn sàng"
   - And toast có button "Tải xuống"
   - And clicking "Tải xuống" trigger download
   - And toast tự động dismiss sau 60s hoặc khi user click

6. **AC6: ZIP Generation Service**
   - Given Proposal state = COMPLETED
   - When ZIP generation requested
   - Then backend:
     - Return pre-generated ZIP nếu có (from cache)
     - Generate on-demand nếu chưa có
     - Stream ZIP to client (chunked transfer)
     - Set Content-Disposition header
     - Cache generated ZIP for future requests (TTL: 24h)

7. **AC7: Error Handling**
   - Given ZIP generation timeout (> 60s) hoặc error
   - When timeout/error occurs
   - Then UI hiển thị error: "Tạo ZIP thất bại. Vui lòng thử lại."
   - And "Thử lại" button available
   - And KHÔNG có email fallback (demo-first, no background email pipeline)

8. **AC8: Pre-Generated ZIPs for Seed Data**
   - Given Seed data DT-008, DT-009 (COMPLETED) đã được tạo
   - When Seed script chạy
   - Then Pre-generate ZIPs cho các completed proposals
   - And `/api/proposals/{id}/dossier-zip` trả pre-generated ZIP nếu có
   - And New proposals generate on-demand
   - And ZIPs được lưu trong `/uploads/dossiers/{proposal_id}/`

## Tasks / Subtasks

- [ ] Task 1: Backend - ZIP Generation Service (AC: #2, #6, #7)
  - [ ] Add generateDossierZip() method to DossierService
  - [ ] Fetch proposal with all related data
  - [ ] Generate PDFs for each section (reuse PDF service)
  - [ ] Fetch all attachments for each phase
  - [ ] Create folder structure by stage
  - [ ] Use archiver (or similar) for ZIP creation
  - [ ] Stream ZIP to client (chunked transfer)
  - [ ] Implement caching for generated ZIPs (Redis/file cache, TTL: 24h)
  - [ ] Handle timeout (60s max)
  - [ ] Handle errors gracefully

- [ ] Task 2: Backend - Dossier Export Endpoint (AC: #1, #6, #8)
  - [ ] Create GET /proposals/:id/dossier-zip endpoint
  - [ ] Add @UseGuards(JwtAuthGuard) for authentication
  - [ ] Add role-based access control (owner or ADMIN)
  - [ ] Check cache for pre-generated ZIP
  - [ ] Return pre-generated ZIP if available
  - [ ] Trigger on-demand generation if not cached
  - [ ] Set Content-Disposition header
  - [ ] Stream ZIP as downloadable
  - [ ] Return 403 if user is not owner or ADMIN
  - [ ] Return 404 if proposal not found

- [ ] Task 3: Backend - Progress Polling Endpoint (AC: #4, #5)
  - [ ] Create GET /proposals/:id/dossier-zip/status endpoint
  - [ ] Return ZIP generation status
  - [ ] Include progress percentage
  - [ ] Include estimated time remaining
  - [ ] Return download URL when ready
  - [ ] Use Redis for status storage (TTL: 1 hour)

- [ ] Task 4: Backend - Pre-generation for Seeds (AC: #8)
  - [ ] Add preGenerateDossierZips() to seed script
  - [ ] Find all proposals with state = COMPLETED
  - [ ] Generate ZIPs for each proposal
  - [ ] Save to `/uploads/dossiers/{proposal_id}/`
  - [ ] Store file paths in cache
  - [ ] Log pre-generation results

- [ ] Task 5: Frontend - Export Button (AC: #1)
  - [ ] Create DossierExportButton component
  - [ ] Show "Tải xuống hồ sơ trọn bộ" text
  - [ ] Disable when proposal.state ≠ COMPLETED
  - [ ] Show only for owner or ADMIN
  - [ ] Handle click to start ZIP generation

- [ ] Task 6: Frontend - Progress Modal (AC: #3, #4)
  - [ ] Create DossierExportModal component
  - [ ] Show loading state: "Đang tạo ZIP..."
  - [ ] Show progress percentage when > 30s
  - [ ] Enable modal close after 30s (background generation)
  - [ ] Display estimated time remaining
  - [ ] Handle timeout/error display

- [ ] Task 7: Frontend - Background Notification (AC: #5)
  - [ ] Implement toast notification for background completion
  - [ ] Show "ZIP đã sẵn sàng" message
  - [ ] Add "Tải xuống" button in toast
  - [ ] Auto-dismiss after 60s or on click
  - [ ] Poll status endpoint when generation in background

- [ ] Task 8: Frontend - Download Handler (AC: #3, #5)
  - [ ] Add exportDossier() API client method
  - [ ] Handle blob response
  - [ ] Trigger browser download with filename
  - [ ] Handle errors gracefully
  - [ ] Implement retry logic

- [ ] Task 9: Unit Tests (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [ ] Test ZIP generation with complete data
  - [ ] Test folder structure matches specification
  - [ ] Test endpoint validates COMPLETED state
  - [ ] Test endpoint validates user permissions
  - [ ] Test pre-generated ZIP return
  - [ ] Test on-demand generation
  - [ ] Test status endpoint returns correct progress
  - [ ] Test timeout handling
  - [ ] Test error handling

## Dev Notes

### Epic 6 Context

**Epic 6: Acceptance & Handover + Dossier Pack**
- FRs covered: FR28, FR29, FR30, FR31, FR32, FR33, FR41, FR42
- Story 6.1: Start Project (done)
- Story 6.2: Submit Faculty Acceptance Review (done)
- Story 6.3: Faculty Acceptance Vote (done)
- Story 6.4: School Acceptance Vote (done)
- Story 6.5: Handover + Dossier Pack Checklist (done)
- **Story 6.6: ZIP Dossier Pack Export (THIS STORY)** - Complete Epic 6

### Dependencies

**Depends on:**
- Story 6.5 (Handover + Dossier Pack Checklist) - Must have COMPLETED state
- Story 3.9 (Project Detail PDF Export) - Reuse PDF generation
- Story 5.6 (Evaluation PDF Export) - Reuse PDF generation
- Story 2.4 (Upload Attachments) - Access attachment files

**Enables:**
- Complete Epic 6 deliverables
- Archive complete project dossiers

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  dossier/
    dossier.controller.ts     # New: Dossier export endpoints
    dossier.service.ts        # New: ZIP generation service
    dto/
      dossier-status.dto.ts   # New: Status response DTO
  pdf/
    pdf.service.ts            # Extend for dossier PDFs
  seed/
    seed.data.ts              # Add pre-generate ZIP call
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    proposal/
      DossierExportButton.tsx  # New: Export button
      DossierExportModal.tsx   # New: Progress modal
      ProposalDetail.tsx       # Add DossierExportButton
  lib/api/
    proposals.ts                # Add exportDossier(), getDossierStatus()
```

### Epic 5 Retro Learnings to Apply

From `epic-5-retro-2026-01-07.md`:

1. **RBAC Pattern from Story 5.6:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(RolesGuard)
   @RequireRoles(UserRole.GIANG_VIEN, UserRole.ADMIN) // Owner or ADMIN
   @Get(':id/dossier-zip')
   async exportDossier(@Param('id') id: string, @CurrentUser() user: User) {
     // Also verify user.id === proposal.ownerId for GIANG_VIEN role
   }
   ```

2. **Streaming Response Pattern (for large files):**
   ```typescript
   @Get(':id/dossier-zip')
   async exportDossier(@Param('id') id: string, @Res() res: Response) {
     const zipStream = await this.dossierService.generateDossierZip(id);
     res.set({
       'Content-Type': 'application/zip',
       'Content-Disposition': `attachment; filename="${code}_dossier.zip"`,
     });
     zipStream.pipe(res);
   }
   ```

3. **Async Job Pattern (for progress tracking):**
   ```typescript
   // Use Redis for job status storage
   const jobId = uuid();
   await redis.setex(`dossier:${jobId}`, 3600, JSON.stringify({
     status: 'processing',
     progress: 0,
     proposalId,
   }));

   // Process in background, update progress
   await this.processDossierZip(jobId, proposalId);
   ```

### Architecture Compliance

**State Machine Rules (from architecture.md):**
- Only COMPLETED proposals can export dossier
- ZIP is an archive representation, not a state transition
- No state changes during export

**ZIP SLA Requirements:**
- Fast path: ≤ 30s → modal stays open, auto-download
- Slow path: > 30s → show progress, allow background, notify on complete
- Timeout: > 60s → error, allow retry
- No email fallback (demo-first decision)

**Folder Structure (Phase-based):**
```
{code}_dossier/
├── 01-proposal/           # Phase A: DRAFT → APPROVED
├── 02-council-evaluation/ # Phase B: OUTLINE_COUNCIL_REVIEW → APPROVED
├── 03-faculty-acceptance/ # Phase C: FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW
├── 04-school-acceptance/  # Phase D: SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
├── 05-handover/           # Phase E: HANDOVER → COMPLETED
└── 06-timeline/           # Full workflow history
```

**API Response Format:**
```typescript
// ZIP Download (streaming)
GET /proposals/:id/dossier-zip
200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="DT-001_dossier.zip"
<binary stream>

// Status Check
GET /proposals/:id/dossier-zip/status
200 OK
{
  success: true,
  data: {
    status: 'processing' | 'completed' | 'error',
    progress: 45, // 0-100
    downloadUrl: '/api/proposals/:id/dossier-zip',
    error?: string
  }
}
```

### Data Model

**Service Method Signatures:**
```typescript
/**
 * Generate dossier ZIP for proposal
 * @param proposalId - Proposal UUID
 * @param jobId - Job ID for progress tracking
 * @returns ZIP stream
 */
async generateDossierZip(proposalId: string, jobId?: string): Promise<Stream>

/**
 * Get dossier ZIP generation status
 * @param proposalId - Proposal UUID
 * @returns Status with progress
 */
async getDossierStatus(proposalId: string): Promise<DossierStatus>

/**
 * Pre-generate ZIPs for completed proposals (seed data)
 */
async preGenerateDossierZips(): Promise<void>
```

**Status Response:**
```typescript
export class DossierStatusDto {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  downloadUrl?: string;
  error?: string;
  createdAt?: Date;
  completedAt?: Date;
}
```

**ZIP Content Generation:**
```typescript
async generateDossierZip(proposalId: string, jobId?: string): Promise<Stream> {
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      owner: true,
      faculty: true,
      workflowLogs: { orderBy: { timestamp: 'asc' } },
      attachments: { where: { deletedAt: null } },
      evaluations: { include: { evaluator: true } },
    },
  });

  if (!proposal || proposal.state !== 'COMPLETED') {
    throw new NotFoundException('Không tìm thấy đề tài đã hoàn thành');
  }

  // Create ZIP with folder structure
  const archive = archiver('zip', { zlib: { level: 9 } });

  // 01-proposal/
  const proposalPdf = await this.pdfService.generateProposalPdf(proposalId);
  archive.append(proposalPdf, { name: '01-proposal/{code}_proposal.pdf' });

  // Attachments for proposal
  const proposalAttachments = proposal.attachments.filter(a => !a.type || a.type === 'GENERAL');
  for (const attachment of proposalAttachments) {
    const file = await this.getFileStream(attachment.fileUrl);
    archive.append(file, { name: `01-proposal/attachments/${attachment.fileName}` });
  }

  // 02-council-evaluation/
  if (proposal.evaluations.length > 0) {
    const evaluationPdf = await this.pdfService.generateEvaluationPdf(proposalId);
    archive.append(evaluationPdf, { name: '02-council-evaluation/{code}_evaluation.pdf' });
  }

  // 03-faculty-acceptance/
  if (proposal.formData?.SEC_FACULTY_ACCEPTANCE_RESULTS) {
    const facultyAcceptancePdf = await this.pdfService.generateFacultyAcceptancePdf(proposalId);
    archive.append(facultyAcceptancePdf, { name: '03-faculty-acceptance/{code}_faculty_acceptance.pdf' });

    const facultyAttachments = proposal.attachments.filter(a => a.type === 'FACULTY_ACCEPTANCE');
    for (const attachment of facultyAttachments) {
      const file = await this.getFileStream(attachment.fileUrl);
      archive.append(file, { name: `03-faculty-acceptance/attachments/${attachment.fileName}` });
    }
  }

  // 04-school-acceptance/
  if (proposal.formData?.SEC_FACULTY_ACCEPTANCE_RESULTS?.schoolDecision) {
    const schoolAcceptancePdf = await this.pdfService.generateSchoolAcceptancePdf(proposalId);
    archive.append(schoolAcceptancePdf, { name: '04-school-acceptance/{code}_school_acceptance.pdf' });
  }

  // 05-handover/
  const handoverPdf = await this.pdfService.generateHandoverPdf(proposalId);
  archive.append(handoverPdf, { name: '05-handover/checklist.pdf' });

  // 06-timeline/
  const timelinePdf = await this.pdfService.generateTimelinePdf(proposalId);
  archive.append(timelinePdf, { name: '06-timeline/{code}_timeline.pdf' });

  await archive.finalize();
  return archive;
}
```

### RBAC Authorization

**Permission Check:**
```typescript
// Owner (PROJECT_OWNER) or ADMIN can export dossier
// PROJECT_OWNER is contextual: user.id === proposal.ownerId

@UseGuards(JwtAuthGuard)
@Get(':id/dossier-zip')
async exportDossier(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Res() res: Response
) {
  const proposal = await this.prisma.proposal.findUnique({
    where: { id },
    select: { ownerId: true, state: true },
  });

  if (!proposal) {
    throw new NotFoundException('Không tìm thấy đề tài');
  }

  // Check: owner or ADMIN
  const isAdmin = user.role === UserRole.ADMIN;
  const isOwner = proposal.ownerId === user.id;

  if (!isAdmin && !isOwner) {
    throw new ForbiddenException('Bạn không có quyền tải xuống hồ sơ này');
  }

  // Proceed with export
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock PDF generation service
- Mock file system operations
- Test endpoint validates COMPLETED state
- Test endpoint validates user permissions (owner or ADMIN)
- Test ZIP folder structure
- Test pre-generated ZIP return
- Test on-demand generation
- Test status endpoint returns correct progress
- Test timeout handling

**Frontend Tests:**
- Test button visibility based on state
- Test button visibility based on ownership
- Test modal open/close behavior
- Test progress display
- Test background notification
- Test download trigger
- Test error handling

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Tải xuống hồ sơ trọn bộ" (Export button)
- "Đang tạo ZIP..." (Loading state)
- "Đang tạo ZIP... {progress}%" (Progress state)
- "ZIP đã sẵn sàng" (Ready notification)
- "Tải xuống" (Download button)
- "Tạo ZIP thất bại. Vui lòng thử lại." (Error message)
- "Thử lại" (Retry button)
- "ZIP đang được tạo..." (Background notification)
- "Bạn không có quyền tải xuống hồ sơ này" (403 error)
- "Đề tài chưa hoàn thành. Không thể xuất hồ sơ." (400 error when not COMPLETED)

### Code Patterns to Follow

**From Story 3.9 (Project Detail PDF Export):**
- Reuse PDF service for proposal document
- Same streaming pattern for large files

**From Story 5.6 (Evaluation PDF Export):**
- Reuse PDF service for evaluation document
- Similar RBAC pattern

**Async Job with Redis:**
```typescript
// Background job processing
async processDossierZip(jobId: string, proposalId: string) {
  const updateProgress = (progress: number) => {
    this.redis.setex(`dossier:${jobId}`, 3600, JSON.stringify({
      status: 'processing',
      progress,
      proposalId,
    }));
  };

  try {
    updateProgress(0);
    // Generate PDFs...
    updateProgress(25);
    // Add attachments...
    updateProgress(50);
    // Create ZIP...
    updateProgress(75);
    // Finalize...
    updateProgress(100);

    // Mark complete
    await this.redis.setex(`dossier:${jobId}`, 3600, JSON.stringify({
      status: 'completed',
      progress: 100,
      downloadUrl: `/api/proposals/${proposalId}/dossier-zip`,
    }));
  } catch (error) {
    await this.redis.setex(`dossier:${jobId}`, 3600, JSON.stringify({
      status: 'error',
      error: error.message,
    }));
  }
}
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 6-6 created via create-story workflow. Status: ready-for-dev
- Epic 5 retrospective learnings applied
- RBAC pattern for owner/ADMIN defined
- Streaming response for large files
- Async job pattern with Redis for progress
- SLA 30s fast path with modal
- SLA > 30s slow path with background + notification
- Pre-generation for seed data
- No email fallback (demo-first decision)
- Phase-based folder structure

### File List

**To Create:**
- `qlnckh/apps/src/modules/dossier/dossier.controller.ts` - Dossier export controller
- `qlnckh/apps/src/modules/dossier/dossier.service.ts` - ZIP generation service
- `qlnckh/apps/src/modules/dossier/dto/dossier-status.dto.ts` - Status DTO
- `qlnckh/apps/src/modules/dossier/dto/index.ts` - Barrel export
- `qlnckh/apps/src/modules/dossier/dossier.module.ts` - Dossier module
- `qlnckh/web-apps/src/components/proposal/DossierExportButton.tsx` - Export button
- `qlnckh/web-apps/src/components/proposal/DossierExportModal.tsx` - Progress modal

**To Modify:**
- `qlnckh/apps/src/modules/pdf/pdf.service.ts` - Extend for dossier PDFs
- `qlnckh/apps/src/app.module.ts` - Import DossierModule
- `qlnckh/apps/src/seed/seed.data.ts` - Add pre-generate ZIP call
- `qlnckh/web-apps/src/components/proposal/ProposalDetail.tsx` - Add DossierExportButton
- `qlnckh/web-apps/src/lib/api/proposals.ts` - Add exportDossier(), getDossierStatus() methods
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 5 retrospective learnings incorporated
  - RBAC pattern with owner/ADMIN defined
  - Streaming response for large files specified
  - Async job pattern with Redis for progress
  - SLA 30s fast path (modal stays open)
  - SLA > 30s slow path (background + notification)
  - Pre-generation for seed data
  - No email fallback (demo-first decision)
  - Phase-based folder structure designed
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 6.6](../../planning-artifacts/epics.md#L1880-L1926) - Full requirements
- [epic-5-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-5-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 3.9](../3-9-project-detail-pdf-export-wysiwyg-sla-10s-pre-generated-seeds.md) - PDF export pattern reference
- [Story 5.6](../5-6-evaluation-pdf-export.md) - Evaluation PDF & RBAC reference
- [Story 6.5](./6-5-handover-plus-dossier-pack-checklist.md) - Previous story with COMPLETED state
